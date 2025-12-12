// app/api/admin/__tests__/approve.test.ts
// Integration tests for POST /api/admin/approve

import { POST } from '../approve/route';
import { checkAdmin } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabaseServer';
import { createTestRequest, mockAdminUser, getJsonResponse } from '@/lib/test-utils';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/supabaseServer');

const mockCheckAdmin = checkAdmin as jest.MockedFunction<typeof checkAdmin>;
const mockSupabaseServer = supabaseServer as jest.Mocked<typeof supabaseServer>;

describe('POST /api/admin/approve', () => {
  const adminUser = mockAdminUser();
  const validRegistrationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTeamMetaId = 'team-meta-id-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default Supabase RPC mock
    mockSupabaseServer.rpc = jest.fn();
  });

  describe('authentication', () => {
    it('should return 403 when user is not authenticated', async () => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: false,
        user: null,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(403);
      expect(body).toMatchObject({
        ok: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
      expect(mockSupabaseServer.rpc).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', async () => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: false,
        user: {
          id: 'user-id',
          email: 'user@example.com',
        } as any,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(403);
      expect(body).toMatchObject({
        ok: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should return 422 for invalid UUID format', async () => {
      const req = createTestRequest('POST', {
        registration_id: 'invalid-uuid',
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(422);
      expect(body).toMatchObject({
        ok: false,
        error: 'Invalid input',
      });
      expect(body).toHaveProperty('detail');
      expect(mockSupabaseServer.rpc).not.toHaveBeenCalled();
    });

    it('should return 422 for missing registration_id', async () => {
      const req = createTestRequest('POST', {}, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(422);
      expect(body).toMatchObject({
        ok: false,
        error: 'Invalid input',
      });
    });

    it('should accept optional notes parameter', async () => {
      mockSupabaseServer.rpc!.mockResolvedValue({
        data: mockTeamMetaId,
        error: null,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
        notes: 'Approved with notes',
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        team_meta_id: mockTeamMetaId,
      });
      expect(mockSupabaseServer.rpc).toHaveBeenCalledWith('approve_registration', {
        reg_id: validRegistrationId,
        admin_user_id: adminUser.id,
        notes: 'Approved with notes',
      });
    });
  });

  describe('successful approval', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should successfully approve registration with valid data', async () => {
      mockSupabaseServer.rpc!.mockResolvedValue({
        data: mockTeamMetaId,
        error: null,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        team_meta_id: mockTeamMetaId,
      });
      expect(mockSupabaseServer.rpc).toHaveBeenCalledWith('approve_registration', {
        reg_id: validRegistrationId,
        admin_user_id: adminUser.id,
        notes: null,
      });
    });

    it('should pass null for notes when not provided', async () => {
      mockSupabaseServer.rpc!.mockResolvedValue({
        data: mockTeamMetaId,
        error: null,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
      }, 'http://localhost:3000/api/admin/approve');

      await POST(req);

      expect(mockSupabaseServer.rpc).toHaveBeenCalledWith(
        'approve_registration',
        expect.objectContaining({
          notes: null,
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should return 409 when registration not found', async () => {
      mockSupabaseServer.rpc!.mockResolvedValue({
        data: null,
        error: {
          message: 'Registration not found or not pending',
          code: 'P0001',
        } as any,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(409);
      expect(body).toMatchObject({
        ok: false,
        error: 'Registration already processed or not found',
        code: 'ALREADY_PROCESSED',
      });
    });

    it('should return 409 when registration already processed', async () => {
      mockSupabaseServer.rpc!.mockResolvedValue({
        data: null,
        error: {
          message: 'Registration not found or not pending',
          code: 'P0001',
        } as any,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(409);
      expect(body).toMatchObject({
        ok: false,
        code: 'ALREADY_PROCESSED',
      });
    });

    it('should return 409 when error message contains "already_processed"', async () => {
      mockSupabaseServer.rpc!.mockResolvedValue({
        data: null,
        error: {
          message: 'Registration already_processed',
          code: 'P0001',
        } as any,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(409);
      expect(body).toMatchObject({
        ok: false,
        code: 'ALREADY_PROCESSED',
      });
    });

    it('should return 500 for other database errors', async () => {
      mockSupabaseServer.rpc!.mockResolvedValue({
        data: null,
        error: {
          message: 'Database connection failed',
          code: '08006',
        } as any,
      });

      const req = createTestRequest('POST', {
        registration_id: validRegistrationId,
      }, 'http://localhost:3000/api/admin/approve');

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(500);
      expect(body).toMatchObject({
        ok: false,
        error: 'Database connection failed',
      });
    });

    it('should handle JSON parse errors', async () => {
      const req = new NextRequest(new URL('http://localhost:3000/api/admin/approve'), {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(500);
      expect(body).toMatchObject({
        ok: false,
      });
    });
  });
});

