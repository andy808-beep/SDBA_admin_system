// lib/__tests__/api-errors.test.ts
// Tests for lib/api-errors.ts

import { ApiError, handleApiError, ApiErrors } from '../api-errors';
import { NextResponse } from 'next/server';
import { z } from 'zod';

describe('ApiError', () => {
  it('should create an ApiError with message and status code', () => {
    const error = new ApiError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ApiError');
  });

  it('should create an ApiError with default status code 500', () => {
    const error = new ApiError('Test error');
    expect(error.statusCode).toBe(500);
  });

  it('should create an ApiError with code', () => {
    const error = new ApiError('Test error', 400, 'BAD_REQUEST');
    expect(error.code).toBe('BAD_REQUEST');
  });
});

describe('handleApiError', () => {
  it('should handle ApiError instances', () => {
    const error = new ApiError('Custom error', 400, 'BAD_REQUEST');
    const response = handleApiError(error);

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(400);
    
    // Note: NextResponse.json() returns a Response, not a JSON object
    // We can't easily test the body without async/await, but we can test status
  });

  it('should handle Zod validation errors', () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    
    if (!result.success) {
      const response = handleApiError(result.error);
      expect(response.status).toBe(422);
    }
  });

  it('should handle generic Error instances', () => {
    const error = new Error('Generic error');
    const response = handleApiError(error);
    expect(response.status).toBe(500);
  });

  it('should handle non-Error values', () => {
    const response = handleApiError('String error');
    expect(response.status).toBe(500);
  });

  it('should handle null/undefined', () => {
    const response1 = handleApiError(null);
    expect(response1.status).toBe(500);

    const response2 = handleApiError(undefined);
    expect(response2.status).toBe(500);
  });
});

describe('ApiErrors', () => {
  it('should create forbidden error', () => {
    const error = ApiErrors.forbidden();
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Forbidden');
  });

  it('should create forbidden error with custom message', () => {
    const error = ApiErrors.forbidden('Access denied');
    expect(error.message).toBe('Access denied');
  });

  it('should create notFound error', () => {
    const error = ApiErrors.notFound();
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
  });

  it('should create notFound error with custom message', () => {
    const error = ApiErrors.notFound('User not found');
    expect(error.message).toBe('User not found');
  });

  it('should create conflict error', () => {
    const error = ApiErrors.conflict();
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('Conflict');
  });

  it('should create conflict error with custom message and code', () => {
    const error = ApiErrors.conflict('Duplicate entry', 'DUPLICATE');
    expect(error.message).toBe('Duplicate entry');
    expect(error.code).toBe('DUPLICATE');
  });

  it('should create badRequest error', () => {
    const error = ApiErrors.badRequest();
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Bad request');
  });

  it('should create badRequest error with custom message', () => {
    const error = ApiErrors.badRequest('Invalid input');
    expect(error.message).toBe('Invalid input');
  });

  it('should create unauthorized error', () => {
    const error = ApiErrors.unauthorized();
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Unauthorized');
  });

  it('should create unauthorized error with custom message', () => {
    const error = ApiErrors.unauthorized('Invalid credentials');
    expect(error.message).toBe('Invalid credentials');
  });

  it('should create internalServerError', () => {
    const error = ApiErrors.internalServerError();
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('Internal server error');
  });

  it('should create internalServerError with custom message', () => {
    const error = ApiErrors.internalServerError('Database connection failed');
    expect(error.message).toBe('Database connection failed');
  });
});

