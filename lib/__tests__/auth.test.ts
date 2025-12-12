// lib/__tests__/auth.test.ts
// Comprehensive unit tests for lib/auth.ts authentication utilities

import { isAdminUser, checkAdmin } from '../auth';
import type { AdminUser } from '@/types/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env } from '../env';
import { logger } from '../logger';

// Mock external dependencies
jest.mock('next/headers');
jest.mock('@supabase/ssr');
jest.mock('../env');
jest.mock('../logger');

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockEnv = env as jest.Mocked<typeof env>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('isAdminUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('null and undefined inputs', () => {
    it('should return false for null user', () => {
      expect(isAdminUser(null)).toBe(false);
    });

    it('should return false for undefined user', () => {
      expect(isAdminUser(undefined)).toBe(false);
    });
  });

  describe('admin via app_metadata.role (singular)', () => {
    it('should return true when user has admin role in app_metadata.role', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { role: 'admin' },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should return false when app_metadata.role is not "admin"', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { role: 'user' },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when app_metadata.role is undefined', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: {},
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });
  });

  describe('admin via app_metadata.roles (array)', () => {
    it('should return true when user has admin in app_metadata.roles array', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should return true when user has admin in app_metadata.roles with other roles', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { roles: ['user', 'admin', 'moderator'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should return false when app_metadata.roles does not include "admin"', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { roles: ['user', 'moderator'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when app_metadata.roles is empty array', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { roles: [] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when user has only non-admin roles like ["user", "viewer"]', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { roles: ['user', 'viewer'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when app_metadata.roles is undefined', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: {},
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });
  });

  describe('admin via user_metadata.role (singular)', () => {
    it('should return true when user has admin role in user_metadata.role', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { role: 'admin' },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should return false when user_metadata.role is not "admin"', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { role: 'user' },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when user_metadata.role is undefined', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: {},
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });
  });

  describe('admin via user_metadata.roles (array)', () => {
    it('should return true when user has admin in user_metadata.roles array', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { roles: ['admin'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should return true when user has admin in user_metadata.roles with other roles', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { roles: ['user', 'admin'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should return false when user_metadata.roles does not include "admin"', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { roles: ['user'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when user_metadata.roles is empty array', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { roles: [] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when user has only non-admin roles like ["user", "viewer"]', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { roles: ['user', 'viewer'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should prefer app_metadata.roles over user_metadata.roles when both exist', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'] },
        user_metadata: { roles: ['user'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should return false when user_metadata.roles is undefined', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: {},
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });
  });

  describe('admin via user_metadata.is_admin', () => {
    it('should return true when user has is_admin: true in user_metadata', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { is_admin: true },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should return false when user_metadata.is_admin is false', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: { is_admin: false },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when user_metadata.is_admin is undefined', () => {
      const user: AdminUser = {
        id: '1',
        user_metadata: {},
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });
  });

  describe('user with no admin privileges', () => {
    it('should return false when user has no admin privileges', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { roles: ['user'] },
        user_metadata: { role: 'user' },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when user has minimal required fields only', () => {
      const user: AdminUser = {
        id: '1',
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });
  });

  describe('edge cases and null metadata', () => {
    it('should return false when app_metadata is null', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: null,
        user_metadata: null,
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when user_metadata is null', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: {},
        user_metadata: null,
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return false when both app_metadata and user_metadata are null', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: null,
        user_metadata: null,
      } as AdminUser;
      expect(isAdminUser(user)).toBe(false);
    });

    it('should return true when multiple admin indicators are present', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'], role: 'admin' },
        user_metadata: { roles: ['admin'], role: 'admin', is_admin: true },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should handle fallback from app_metadata to user_metadata for roles', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: {},
        user_metadata: { roles: ['admin'] },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });

    it('should handle fallback from app_metadata to user_metadata for role', () => {
      const user: AdminUser = {
        id: '1',
        app_metadata: {},
        user_metadata: { role: 'admin' },
      } as AdminUser;
      expect(isAdminUser(user)).toBe(true);
    });
  });
});

describe('checkAdmin', () => {
  let mockRequest: NextRequest;
  let mockSupabaseClient: any;
  let mockCookieStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      nextUrl: new URL('http://localhost:3000/admin'),
    } as NextRequest;

    // Setup mock cookie store with getAll method
    mockCookieStore = {
      getAll: jest.fn(() => [
        { name: 'sb-access-token', value: 'test-token' },
        { name: 'sb-refresh-token', value: 'refresh-token' },
      ]),
      set: jest.fn(),
    };
    mockCookies.mockResolvedValue(mockCookieStore as any);

    // Setup mock env
    mockEnv.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
    };
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  describe('successful admin check', () => {
    it('should return isAdmin: true and user when user is admin', async () => {
      const adminUser: AdminUser = {
        id: '1',
        email: 'admin@example.com',
        app_metadata: { roles: ['admin'] },
      } as AdminUser;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
        error: null,
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(true);
      expect(result.user).toEqual(adminUser);
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(mockCookies).toHaveBeenCalled();
    });

    it('should call getAll() method from cookieStore', async () => {
      const adminUser: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'] },
      } as AdminUser;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
        error: null,
      });

      // Mock createServerClient to actually call getAll
      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Simulate Supabase calling getAll internally
        options.cookies.getAll();
        return {
          auth: {
            getUser: mockSupabaseClient.auth.getUser,
          },
        } as any;
      });

      await checkAdmin(mockRequest);

      // Verify getAll was called (this covers line 38)
      expect(mockCookieStore.getAll).toHaveBeenCalled();
    });
  });

  describe('non-admin user check', () => {
    it('should return isAdmin: false and user when user is not admin', async () => {
      const regularUser: AdminUser = {
        id: '1',
        email: 'user@example.com',
        app_metadata: { roles: ['user'] },
      } as AdminUser;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: regularUser },
        error: null,
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(false);
      expect(result.user).toEqual(regularUser);
    });

    it('should return isAdmin: false for user with no roles', async () => {
      const userWithoutRoles: AdminUser = {
        id: '1',
        app_metadata: {},
        user_metadata: {},
      } as AdminUser;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithoutRoles },
        error: null,
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(false);
      expect(result.user).toEqual(userWithoutRoles);
    });
  });

  describe('unauthenticated user check', () => {
    it('should return isAdmin: false and user: null when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(false);
      expect(result.user).toBe(null);
    });

    it('should return isAdmin: false and user: null when user is undefined', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: undefined },
        error: null,
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(false);
      expect(result.user).toBe(null);
    });
  });

  describe('Supabase error handling', () => {
    it('should return isAdmin: false and user: null when Supabase returns error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error', status: 401 },
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(false);
      expect(result.user).toBe(null);
    });

    it('should handle exceptions and return isAdmin: false, user: null', async () => {
      const networkError = new Error('Network error');
      mockSupabaseClient.auth.getUser.mockRejectedValue(networkError);

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(false);
      expect(result.user).toBe(null);
      expect(mockLogger.error).toHaveBeenCalledWith('checkAdmin error:', networkError);
    });

    it('should handle Supabase client creation errors', async () => {
      mockCreateServerClient.mockImplementation(() => {
        throw new Error('Failed to create Supabase client');
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(false);
      expect(result.user).toBe(null);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'checkAdmin error:',
        expect.any(Error)
      );
    });
  });

  describe('cookie operations', () => {
    it('should use cookies from the request', async () => {
      const adminUser: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'] },
      } as AdminUser;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
        error: null,
      });

      await checkAdmin(mockRequest);

      expect(mockCookies).toHaveBeenCalled();
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
    });

    it('should handle cookie setting errors gracefully', async () => {
      const adminUser: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'] },
      } as AdminUser;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
        error: null,
      });

      // Mock cookieStore.set to throw an error when called
      const cookieSetError = new Error('Cookie set error');
      mockCookieStore.set = jest.fn(() => {
        throw cookieSetError;
      });

      // Mock createServerClient to actually call setAll with cookies
      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Simulate Supabase calling setAll with cookies
        setTimeout(() => {
          try {
            options.cookies.setAll([{ name: 'test', value: 'test', options: {} }]);
          } catch (err) {
            // Error is caught in the implementation
          }
        }, 0);

        return {
          auth: {
            getUser: mockSupabaseClient.auth.getUser,
          },
        } as any;
      });

      // The function should still work even if cookie setting fails
      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(true);
      expect(result.user).toEqual(adminUser);
      
      // Give time for async cookie setting
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify that the error was caught and logged
      expect(mockLogger.warn).toHaveBeenCalledWith('Cookie set error:', cookieSetError);
    });

    it('should handle multiple cookie setting errors', async () => {
      const adminUser: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'] },
      } as AdminUser;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
        error: null,
      });

      let callCount = 0;
      mockCookieStore.set = jest.fn(() => {
        callCount++;
        throw new Error(`Cookie set error ${callCount}`);
      });

      mockCreateServerClient.mockImplementation((url, key, options) => {
        setTimeout(() => {
          try {
            options.cookies.setAll([
              { name: 'cookie1', value: 'value1', options: {} },
              { name: 'cookie2', value: 'value2', options: {} },
            ]);
          } catch (err) {
            // Error is caught in the implementation
          }
        }, 0);

        return {
          auth: {
            getUser: mockSupabaseClient.auth.getUser,
          },
        } as any;
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(true);
      expect(result.user).toEqual(adminUser);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should log warnings for cookie errors
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle empty cookie array in setAll', async () => {
      const adminUser: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'] },
      } as AdminUser;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
        error: null,
      });

      mockCreateServerClient.mockImplementation((url, key, options) => {
        // Simulate Supabase calling setAll with empty array
        setTimeout(() => {
          try {
            options.cookies.setAll([]);
          } catch (err) {
            // Error is caught in the implementation
          }
        }, 0);

        return {
          auth: {
            getUser: mockSupabaseClient.auth.getUser,
          },
        } as any;
      });

      const result = await checkAdmin(mockRequest);

      expect(result.isAdmin).toBe(true);
      expect(result.user).toEqual(adminUser);
    });
  });

  describe('environment configuration', () => {
    it('should use environment variables from env module', async () => {
      const adminUser: AdminUser = {
        id: '1',
        app_metadata: { roles: ['admin'] },
      } as AdminUser;

      mockEnv.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.supabase.co';
      mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'custom-anon-key';

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: adminUser },
        error: null,
      });

      await checkAdmin(mockRequest);

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://custom.supabase.co',
        'custom-anon-key',
        expect.any(Object)
      );
    });
  });
});
