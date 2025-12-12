// app/api/admin/__tests__/list.test.ts
// Integration tests for GET /api/admin/list

import { GET } from '../list/route';
import { checkAdmin } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabaseServer';
import { createTestRequestWithQuery, mockAdminUser, getJsonResponse } from '@/lib/test-utils';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/supabaseServer');

const mockCheckAdmin = checkAdmin as jest.MockedFunction<typeof checkAdmin>;
const mockSupabaseServer = supabaseServer as jest.Mocked<typeof supabaseServer>;

describe('GET /api/admin/list', () => {
  const adminUser = mockAdminUser();
  const mockRegistrationData = [
    {
      id: 'reg-1',
      season: 2025,
      event_type: 'tn',
      division_code: 'M',
      category: 'men_open',
      option_choice: 'Option 1',
      team_code: 'S25-M001',
      team_name: 'Test Team',
      org_name: 'Test Org',
      org_address: '123 Test St',
      team_manager_1: 'Manager 1',
      email_1: 'manager1@test.com',
      mobile_1: '1234567890',
      status: 'pending',
      approved_by: null,
      approved_at: null,
      created_at: '2025-01-01T00:00:00Z',
    },
  ];

  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default Supabase query builder mock
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };
    
    mockSupabaseServer.from = jest.fn().mockReturnValue(mockQuery);
    (mockQuery.range as jest.Mock).mockResolvedValue({
      data: mockRegistrationData,
      error: null,
      count: 1,
    });
  });

  describe('authentication', () => {
    it('should return 403 when user is not authenticated', async () => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: false,
        user: null,
      });

      const req = createTestRequestWithQuery({});

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(403);
      expect(body).toMatchObject({
        ok: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
    });

    it('should return 403 when user is not admin', async () => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: false,
        user: {
          id: 'user-id',
          email: 'user@example.com',
        } as any,
      });

      const req = createTestRequestWithQuery({});

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(403);
      expect(body).toMatchObject({
        ok: false,
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should use default pagination when not specified', async () => {
      const req = createTestRequestWithQuery({});

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        page: 1,
        pageSize: 50,
      });
    });

    it('should use custom page and pageSize', async () => {
      const req = createTestRequestWithQuery({
        page: '2',
        pageSize: '25',
      });

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        page: 2,
        pageSize: 25,
      });
    });

    it('should enforce minimum page of 1', async () => {
      const req = createTestRequestWithQuery({
        page: '0',
      });

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        page: 1,
      });
    });

    it('should enforce maximum pageSize of 100', async () => {
      const req = createTestRequestWithQuery({
        pageSize: '200',
      });

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        pageSize: 100,
      });
    });

    it('should enforce minimum pageSize of 1', async () => {
      const req = createTestRequestWithQuery({
        pageSize: '0',
      });

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        pageSize: 1,
      });
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should filter by status', async () => {
      const req = createTestRequestWithQuery({
        status: 'pending',
      });

      await GET(req);

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('should filter by event type', async () => {
      const req = createTestRequestWithQuery({
        event: 'tn',
      });

      await GET(req);

      expect(mockQuery.eq).toHaveBeenCalledWith('event_type', 'tn');
    });

    it('should filter by season', async () => {
      const req = createTestRequestWithQuery({
        season: '2025',
      });

      await GET(req);

      expect(mockQuery.eq).toHaveBeenCalledWith('season', 2025);
    });

    it('should ignore invalid season parameter', async () => {
      const req = createTestRequestWithQuery({
        season: 'invalid',
      });

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
      });
    });

    it('should not filter when status is "all"', async () => {
      const req = createTestRequestWithQuery({
        status: 'all',
      });

      await GET(req);

      expect(mockQuery.eq).not.toHaveBeenCalledWith('status', expect.anything());
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should search by team name, org name, email, or team code', async () => {
      const req = createTestRequestWithQuery({
        q: 'Test Team',
      });

      await GET(req);

      expect(mockQuery.or).toHaveBeenCalledWith(
        expect.stringContaining('team_name.ilike')
      );
    });

    it('should escape special characters in search query', async () => {
      const req = createTestRequestWithQuery({
        q: "Test'%\"Team",
      });

      await GET(req);

      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('should not search when q is empty', async () => {
      const req = createTestRequestWithQuery({
        q: '',
      });

      await GET(req);

      expect(mockQuery.or).not.toHaveBeenCalled();
    });
  });

  describe('response transformation', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should transform response items correctly', async () => {
      const req = createTestRequestWithQuery({});

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        items: [
          {
            id: 'reg-1',
            season: 2025,
            event_type: 'tn',
            division_code: 'M',
            category: 'men_open',
            option_choice: 'Option 1',
            team_code: 'S25-M001',
            team_name: 'Test Team',
            org_name: 'Test Org',
            org_address: '123 Test St',
            manager_name: 'Manager 1',
            manager_email: 'manager1@test.com',
            manager_mobile: '1234567890',
            status: 'pending',
            approved_by: null,
            approved_at: null,
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
      });
    });

    it('should handle empty results', async () => {
      const emptyMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(emptyMockQuery as any);

      const req = createTestRequestWithQuery({});

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        ok: true,
        total: 0,
        items: [],
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should return 400 for database query errors', async () => {
      const errorMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
          count: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(errorMockQuery as any);

      const req = createTestRequestWithQuery({});

      const response = await GET(req);
      const body = await getJsonResponse(response);

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        ok: false,
        error: 'Query failed',
      });
    });
  });
});

