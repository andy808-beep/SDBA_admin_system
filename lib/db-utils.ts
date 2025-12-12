// lib/db-utils.ts
// Database query utilities for performance monitoring and optimization

import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { trackDatabaseQuery } from "./instrumentation/server";

/**
 * Query timeout configuration (in milliseconds)
 */
export const QUERY_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Slow query threshold (in milliseconds)
 * Queries taking longer than this will be logged
 */
export const SLOW_QUERY_THRESHOLD_MS = 100;

/**
 * Execute a database query with performance monitoring
 * @param queryFn - Function that returns a Supabase query promise
 * @param queryName - Name of the query for logging
 * @param tableName - Name of the table being queried
 * @returns Query result
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any; count?: number | null }>,
  queryName: string,
  tableName?: string
): Promise<{ data: T | null; error: any; count?: number | null }> {
  const startTime = performance.now();

  try {
    // Execute query with timeout
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout: ${queryName}`)), QUERY_TIMEOUT_MS)
      ),
    ]);

    const executionTime = performance.now() - startTime;

    // Log slow queries in development
    if (process.env.NODE_ENV === "development" && executionTime > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`Slow query detected: ${queryName}`, {
        executionTime: `${executionTime.toFixed(2)}ms`,
        table: tableName,
        threshold: `${SLOW_QUERY_THRESHOLD_MS}ms`,
      });
    }

    // Track query performance in Sentry
    if (executionTime > SLOW_QUERY_THRESHOLD_MS) {
      await trackDatabaseQuery(
        async () => result,
        queryName,
        tableName
      );
    }

    // Log query execution time in development
    if (process.env.NODE_ENV === "development") {
      logger.debug(`Query executed: ${queryName}`, {
        executionTime: `${executionTime.toFixed(2)}ms`,
        table: tableName,
        hasError: !!result.error,
        rowCount: result.count ?? (Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0),
      });
    }

    return result;
  } catch (error) {
    const executionTime = performance.now() - startTime;
    logger.error(`Query failed: ${queryName}`, {
      executionTime: `${executionTime.toFixed(2)}ms`,
      table: tableName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Build a paginated query with proper range limits
 * @param query - Supabase query builder
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Query with range applied
 */
export function applyPagination<T>(
  query: any,
  page: number,
  pageSize: number
): any {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return query.range(from, to);
}

/**
 * Validate pagination parameters
 * @param page - Page number
 * @param pageSize - Page size
 * @returns Validated pagination parameters
 */
export function validatePagination(
  page: number | string | null,
  pageSize: number | string | null
): { page: number; pageSize: number } {
  const validatedPage = Math.max(1, parseInt(String(page || "1"), 10));
  const validatedPageSize = Math.min(100, Math.max(1, parseInt(String(pageSize || "50"), 10)));

  return {
    page: validatedPage,
    pageSize: validatedPageSize,
  };
}

/**
 * Escape special characters for PostgREST ILIKE queries
 * @param input - Input string to escape
 * @returns Escaped string safe for ILIKE
 */
export function escapeIlikePattern(input: string): string {
  return input.replace(/[%'"_\\]/g, (char) => {
    if (char === "%") return "\\%";
    if (char === "'") return "''";
    if (char === '"') return '""';
    if (char === "_") return "\\_";
    if (char === "\\") return "\\\\";
    return char;
  });
}

/**
 * Build search filter for multiple columns
 * @param query - Supabase query builder
 * @param searchTerm - Search term
 * @param columns - Array of column names to search
 * @returns Query with search filter applied
 */
export function applySearchFilter(
  query: any,
  searchTerm: string,
  columns: string[]
): any {
  if (!searchTerm || columns.length === 0) {
    return query;
  }

  const escapedTerm = escapeIlikePattern(searchTerm);
  const searchPattern = `%${escapedTerm}%`;

  // Build OR condition for multiple columns
  const conditions = columns.map((col) => `${col}.ilike.${searchPattern}`).join(",");
  return query.or(conditions);
}

/**
 * Cache configuration for query results
 */
export interface QueryCacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string; // Cache key
}

/**
 * Simple in-memory cache for query results
 * Note: For production, consider using Redis or similar
 */
class QueryCache {
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private readonly maxSize = 100; // Maximum number of cached entries

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any, ttl: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// Global query cache instance
const queryCache = new QueryCache();

/**
 * Execute a query with caching
 * @param queryFn - Function that returns a Supabase query promise
 * @param cacheConfig - Cache configuration
 * @param queryName - Name of the query for logging
 * @param tableName - Name of the table being queried
 * @returns Query result (from cache or database)
 */
export async function executeCachedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any; count?: number | null }>,
  cacheConfig: QueryCacheConfig,
  queryName: string,
  tableName?: string
): Promise<{ data: T | null; error: any; count?: number | null }> {
  // Check cache first
  const cached = queryCache.get(cacheConfig.key);
  if (cached !== null) {
    if (process.env.NODE_ENV === "development") {
      logger.debug(`Cache hit: ${queryName}`, { key: cacheConfig.key, table: tableName });
    }
    return { data: cached, error: null };
  }

  // Execute query
  const result = await executeQuery(queryFn, queryName, tableName);

  // Cache successful results
  if (!result.error && result.data !== null) {
    queryCache.set(cacheConfig.key, result.data, cacheConfig.ttl);
  }

  return result;
}

/**
 * Invalidate cache entries for a table
 * Call this after mutations (INSERT, UPDATE, DELETE)
 * @param tableName - Name of the table
 */
export function invalidateCache(tableName: string): void {
  // In a simple implementation, we clear all cache
  // In production, you might want to implement more granular invalidation
  queryCache.clear();
  if (process.env.NODE_ENV === "development") {
    logger.debug(`Cache invalidated for table: ${tableName}`);
  }
}

/**
 * Get query statistics for monitoring
 * @returns Query cache statistics
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
} {
  // Access private cache through a getter method
  return {
    size: (queryCache as any).cache.size,
    maxSize: (queryCache as any).maxSize,
  };
}

