// lib/test-utils.ts
// Test utilities for API route integration tests

import { NextRequest } from 'next/server';
import type { AdminUser } from '@/types/auth';

/**
 * Mock authenticated admin user for testing
 */
export function mockAdminUser(): AdminUser {
  return {
    id: 'admin-user-id-123',
    email: 'admin@example.com',
    app_metadata: { roles: ['admin'] },
  } as AdminUser;
}

/**
 * Mock non-admin user for testing
 */
export function mockRegularUser(): AdminUser {
  return {
    id: 'user-id-456',
    email: 'user@example.com',
    app_metadata: { roles: ['user'] },
  } as AdminUser;
}

/**
 * Create a Next.js request object for testing
 */
export function createTestRequest(
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
  url: string = 'http://localhost:3000/api/admin/test',
  headers: Record<string, string> = {}
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url), requestInit);
}

/**
 * Create a test request with query parameters
 */
export function createTestRequestWithQuery(
  queryParams: Record<string, string>,
  url: string = 'http://localhost:3000/api/admin/list'
): NextRequest {
  const urlObj = new URL(url);
  Object.entries(queryParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });
  return new NextRequest(urlObj);
}

/**
 * Extract JSON response body from NextResponse
 */
export async function getJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Extract text response body from NextResponse
 */
export async function getTextResponse(response: Response): Promise<string> {
  return await response.text();
}

/**
 * Mock Supabase RPC response
 */
export function mockSupabaseRpcResponse<T>(data: T | null, error: Error | null = null) {
  return {
    data,
    error,
  };
}

/**
 * Mock Supabase query builder chain
 */
export function createMockSupabaseQueryBuilder() {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    rpc: jest.fn(),
  };
  return mockQuery;
}

