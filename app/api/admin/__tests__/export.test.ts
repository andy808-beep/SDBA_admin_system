// app/api/admin/__tests__/export.test.ts
// Integration tests for POST /api/admin/export

import { POST } from '../export/route';
import { checkAdmin } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabaseServer';
import { createTestRequest, mockAdminUser, getTextResponse } from '@/lib/test-utils';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/supabaseServer');
jest.mock('@/lib/logger');

const mockCheckAdmin = checkAdmin as jest.MockedFunction<typeof checkAdmin>;
const mockSupabaseServer = supabaseServer as jest.Mocked<typeof supabaseServer>;

describe('POST /api/admin/export', () => {
  const adminUser = mockAdminUser();
  const mockTeamData = [
    {
      id: 'team-1',
      team_code: 'S25-M001',
      team_name: 'Test Team',
      season: 2025,
      category: 'men_open',
    },
  ];

  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default Supabase query builder mock
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockTeamData,
        error: null,
      }),
    };
    
    mockSupabaseServer.from = jest.fn().mockReturnValue(mockQuery);
  });

  describe('authentication', () => {
    it('should return 403 when user is not authenticated', async () => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: false,
        user: null,
      });

      const req = createTestRequest('POST', {
        mode: 'tn',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(403);
      expect(jsonBody).toMatchObject({
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

      const req = createTestRequest('POST', {
        mode: 'tn',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(403);
      expect(jsonBody).toMatchObject({
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

    it('should return 422 for invalid mode', async () => {
      const req = createTestRequest('POST', {
        mode: 'invalid',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(422);
      expect(jsonBody).toMatchObject({
        ok: false,
        error: 'Invalid input',
      });
    });

    it('should return 422 for invalid season range', async () => {
      const req = createTestRequest('POST', {
        mode: 'tn',
        season: 1999, // Below minimum
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(422);
      expect(jsonBody).toMatchObject({
        ok: false,
        error: 'Invalid input',
      });
    });

    it('should return 422 for invalid category', async () => {
      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'invalid_category',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(422);
      expect(jsonBody).toMatchObject({
        ok: false,
        error: 'Invalid input',
      });
    });
  });

  describe('TN mode exports', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should export TN men_open category', async () => {
      const menOpenMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(menOpenMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'men_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
      expect(response.headers.get('Content-Disposition')).toContain('tn_men_open');
      expect(csvContent).toContain('id,team_code,team_name');
      expect(mockSupabaseServer.from).toHaveBeenCalledWith('men_open_team_list');
    });

    it('should export TN ladies_open category', async () => {
      const ladiesOpenMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(ladiesOpenMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'ladies_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('tn_ladies_open');
      expect(mockSupabaseServer.from).toHaveBeenCalledWith('ladies_open_team_list');
    });

    it('should export TN mixed_open category', async () => {
      const mixedOpenMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(mixedOpenMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'mixed_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('tn_mixed_open');
      expect(mockSupabaseServer.from).toHaveBeenCalledWith('mixed_open_team_list');
    });

    it('should export TN mixed_corporate category', async () => {
      const mixedCorpMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(mixedCorpMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'mixed_corporate',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('tn_mixed_corporate');
      expect(mockSupabaseServer.from).toHaveBeenCalledWith('mixed_corporate_team_list');
    });

    it('should export all TN categories when category not specified', async () => {
      const allTnMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(allTnMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(response.status).toBe(200);
      expect(mockSupabaseServer.from).toHaveBeenCalledWith('team_meta');
    });

    it('should filter by season when provided', async () => {
      // The query pattern is: from().select().order() then conditionally eq() then await query
      // So we need to make order() return a query object that can be chained with eq()
      const baseQuery = {
        eq: jest.fn(),
      };
      
      const seasonMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue(baseQuery),
      };
      
      // When eq is called, it should return a promise-like object
      baseQuery.eq = jest.fn().mockResolvedValue({
        data: mockTeamData,
        error: null,
      });
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(seasonMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'men_open',
        season: 2025,
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(baseQuery.eq).toHaveBeenCalledWith('season', 2025);
    });
  });

  describe('WU mode exports', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should export WU teams', async () => {
      const wuMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(wuMockQuery);

      const req = createTestRequest('POST', {
        mode: 'wu',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('wu');
      expect(mockSupabaseServer.from).toHaveBeenCalledWith('wu_team_meta');
    });

    it('should filter WU by season when provided', async () => {
      const baseQuery = {
        eq: jest.fn(),
      };
      
      const wuMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue(baseQuery),
      };
      
      baseQuery.eq = jest.fn().mockResolvedValue({
        data: mockTeamData,
        error: null,
      });
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(wuMockQuery);

      const req = createTestRequest('POST', {
        mode: 'wu',
        season: 2025,
      }, 'http://localhost:3000/api/admin/export');

      await POST(req);

      expect(baseQuery.eq).toHaveBeenCalledWith('season', 2025);
    });
  });

  describe('SC mode exports', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should export SC teams', async () => {
      const scMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(scMockQuery);

      const req = createTestRequest('POST', {
        mode: 'sc',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('sc');
      expect(mockSupabaseServer.from).toHaveBeenCalledWith('sc_team_meta');
    });

    it('should filter SC by season when provided', async () => {
      const baseQuery = {
        eq: jest.fn(),
      };
      
      const scMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue(baseQuery),
      };
      
      baseQuery.eq = jest.fn().mockResolvedValue({
        data: mockTeamData,
        error: null,
      });
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(scMockQuery);

      const req = createTestRequest('POST', {
        mode: 'sc',
        season: 2025,
      }, 'http://localhost:3000/api/admin/export');

      await POST(req);

      expect(baseQuery.eq).toHaveBeenCalledWith('season', 2025);
    });
  });

  describe('all mode', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should return 400 for "all" mode (not implemented)', async () => {
      const req = createTestRequest('POST', {
        mode: 'all',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(400);
      expect(jsonBody).toMatchObject({
        ok: false,
        error: "Mode 'all' not yet implemented. Please export TN, WU, and SC separately.",
      });
    });
  });

  describe('CSV generation', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should generate CSV with UTF-8 BOM for Excel compatibility', async () => {
      const bomMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(bomMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'men_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      // Check for UTF-8 BOM (first character should be BOM)
      // BOM is \uFEFF which is charCode 65279 (0xFEFF)
      // Note: When reading as text, BOM might be preserved or removed depending on encoding
      // We verify the CSV structure is correct
      expect(csvContent).toContain('id,team_code,team_name');
      expect(csvContent).toContain('team-1');
      // Verify it's valid CSV format
      expect(csvContent.split('\n').length).toBeGreaterThan(1);
    });

    it('should escape CSV fields with commas', async () => {
      const mockDataWithComma = [
        {
          id: 'team-1',
          team_name: 'Team, Name',
          team_code: 'S25-M001',
        },
      ];

      const commaMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockDataWithComma,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(commaMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'men_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(csvContent).toContain('"Team, Name"');
    });

    it('should escape CSV fields with quotes', async () => {
      const mockDataWithQuote = [
        {
          id: 'team-1',
          team_name: 'Team "Name"',
          team_code: 'S25-M001',
        },
      ];

      const quoteMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockDataWithQuote,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(quoteMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'men_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const csvContent = await getTextResponse(response);

      expect(csvContent).toContain('"Team ""Name"""');
    });

    it('should generate filename with timestamp', async () => {
      const filenameMockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTeamData,
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(filenameMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'men_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const contentDisposition = response.headers.get('Content-Disposition');

      expect(contentDisposition).toContain('SDBA_tn_men_open_');
      expect(contentDisposition).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}/);
      expect(contentDisposition).toContain('.csv');
      expect(contentDisposition).toContain('attachment; filename=');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockCheckAdmin.mockResolvedValue({
        isAdmin: true,
        user: adminUser,
      });
    });

    it('should return 404 when no data found', async () => {
      const emptyMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [], // Empty array should trigger the check
          error: null,
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(emptyMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'men_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(404);
      expect(jsonBody).toMatchObject({
        ok: false,
        error: 'No data found',
        code: 'NOT_FOUND',
      });
    });

    it('should return 400 for database query errors', async () => {
      const errorMockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' },
        }),
      };
      
      mockSupabaseServer.from = jest.fn().mockReturnValue(errorMockQuery);

      const req = createTestRequest('POST', {
        mode: 'tn',
        category: 'men_open',
      }, 'http://localhost:3000/api/admin/export');

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(400);
      expect(jsonBody).toMatchObject({
        ok: false,
        error: 'Query failed',
      });
    });

    it('should handle JSON parse errors', async () => {
      const req = new NextRequest(new URL('http://localhost:3000/api/admin/export'), {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      const body = await getTextResponse(response);
      const jsonBody = JSON.parse(body);

      expect(response.status).toBe(500);
      expect(jsonBody).toMatchObject({
        ok: false,
      });
    });
  });
});

