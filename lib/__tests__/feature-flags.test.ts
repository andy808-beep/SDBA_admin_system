// lib/__tests__/feature-flags.test.ts
// Tests for feature flags system

import {
  isFeatureEnabled,
  getFeatureFlagResult,
  getAllFeatureFlags,
  getFeatureFlag,
  updateFeatureFlag,
  getFeatureFlagAuditLog,
  FEATURE_FLAGS,
} from "../feature-flags";
import { supabaseServer } from "../supabaseServer";

// Mock supabaseServer
jest.mock("../supabaseServer", () => ({
  supabaseServer: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
}));

// Mock logger
jest.mock("../logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock request-context
jest.mock("../request-context", () => ({
  getRequestId: jest.fn(() => "test-request-id"),
}));

describe("Feature Flags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isFeatureEnabled", () => {
    it("should return true when feature is enabled", async () => {
      (supabaseServer.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await isFeatureEnabled(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(result).toBe(true);
      expect(supabaseServer.rpc).toHaveBeenCalledWith("is_feature_enabled", {
        p_flag_key: FEATURE_FLAGS.ENABLE_RATE_LIMITING,
        p_user_id: null,
        p_user_email: null,
      });
    });

    it("should return false when feature is disabled", async () => {
      (supabaseServer.rpc as jest.Mock).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await isFeatureEnabled(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(result).toBe(false);
    });

    it("should return false on error (fail closed)", async () => {
      (supabaseServer.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await isFeatureEnabled(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(result).toBe(false);
    });

    it("should pass user context when provided", async () => {
      (supabaseServer.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      await isFeatureEnabled(FEATURE_FLAGS.ENABLE_RATE_LIMITING, "user-id", "user@example.com");
      expect(supabaseServer.rpc).toHaveBeenCalledWith("is_feature_enabled", {
        p_flag_key: FEATURE_FLAGS.ENABLE_RATE_LIMITING,
        p_user_id: "user-id",
        p_user_email: "user@example.com",
      });
    });
  });

  describe("getFeatureFlagResult", () => {
    it("should return not_found when flag doesn't exist", async () => {
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getFeatureFlagResult(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("not_found");
    });

    it("should return globally_disabled when flag is disabled", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          enabled: false,
          rollout_percentage: 100,
          enabled_for_users: [],
          enabled_for_emails: [],
        },
        error: null,
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getFeatureFlagResult(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe("globally_disabled");
    });

    it("should return user_allowlist when user is in allowlist", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          enabled: true,
          rollout_percentage: 50,
          enabled_for_users: ["user-id"],
          enabled_for_emails: [],
        },
        error: null,
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getFeatureFlagResult(FEATURE_FLAGS.ENABLE_RATE_LIMITING, "user-id");
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("user_allowlist");
    });

    it("should return globally_enabled when rollout is 100%", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          enabled: true,
          rollout_percentage: 100,
          enabled_for_users: [],
          enabled_for_emails: [],
        },
        error: null,
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);
      (supabaseServer.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await getFeatureFlagResult(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe("globally_enabled");
    });
  });

  describe("getAllFeatureFlags", () => {
    it("should return all feature flags", async () => {
      const mockFlags = [
        {
          id: "1",
          flag_key: FEATURE_FLAGS.ENABLE_RATE_LIMITING,
          enabled: true,
        },
        {
          id: "2",
          flag_key: FEATURE_FLAGS.ENABLE_EMAIL_NOTIFICATIONS,
          enabled: false,
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockFlags,
        error: null,
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          order: mockOrder,
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getAllFeatureFlags();
      expect(result).toEqual(mockFlags);
      expect(mockOrder).toHaveBeenCalledWith("flag_key", { ascending: true });
    });

    it("should return empty array on error", async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          order: mockOrder,
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getAllFeatureFlags();
      expect(result).toEqual([]);
    });
  });

  describe("getFeatureFlag", () => {
    it("should return feature flag by key", async () => {
      const mockFlag = {
        id: "1",
        flag_key: FEATURE_FLAGS.ENABLE_RATE_LIMITING,
        enabled: true,
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockFlag,
        error: null,
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getFeatureFlag(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(result).toEqual(mockFlag);
    });

    it("should return null when flag not found", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getFeatureFlag(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(result).toBeNull();
    });
  });

  describe("updateFeatureFlag", () => {
    it("should update feature flag and log audit", async () => {
      const currentFlag = {
        id: "1",
        flag_key: FEATURE_FLAGS.ENABLE_RATE_LIMITING,
        enabled: false,
        rollout_percentage: 0,
      };

      const updatedFlag = {
        ...currentFlag,
        enabled: true,
        rollout_percentage: 50,
      };

      // Mock getFeatureFlag
      const mockSingleGet = jest.fn().mockResolvedValue({
        data: currentFlag,
        error: null,
      });

      // Mock update
      const mockSingleUpdate = jest.fn().mockResolvedValue({
        data: updatedFlag,
        error: null,
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockImplementation((...args) => {
              // First call is get, second is update
              if (mockSingleGet.mock.calls.length === 0) {
                return mockSingleGet(...args);
              }
              return mockSingleUpdate(...args);
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: mockSingleUpdate,
            })),
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);
      (supabaseServer.rpc as jest.Mock).mockResolvedValue({
        data: "audit-id",
        error: null,
      });

      const result = await updateFeatureFlag(
        FEATURE_FLAGS.ENABLE_RATE_LIMITING,
        { enabled: true, rollout_percentage: 50 },
        "admin-user-id"
      );

      expect(result).toEqual(updatedFlag);
      expect(supabaseServer.rpc).toHaveBeenCalledWith("log_feature_flag_change", expect.any(Object));
    });

    it("should return null when flag not found", async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await updateFeatureFlag(
        FEATURE_FLAGS.ENABLE_RATE_LIMITING,
        { enabled: true },
        "admin-user-id"
      );

      expect(result).toBeNull();
    });
  });

  describe("getFeatureFlagAuditLog", () => {
    it("should return audit log entries", async () => {
      const mockAuditLog = [
        {
          id: "1",
          flag_key: FEATURE_FLAGS.ENABLE_RATE_LIMITING,
          action: "enabled",
          changed_at: "2025-01-01T00:00:00Z",
        },
      ];

      const mockLimit = jest.fn().mockResolvedValue({
        data: mockAuditLog,
        error: null,
      });

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: mockLimit,
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      const result = await getFeatureFlagAuditLog();
      expect(result).toEqual(mockAuditLog);
    });

    it("should filter by flag key when provided", async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockEq = jest.fn(() => ({
        order: jest.fn(() => ({
          limit: mockLimit,
        })),
      }));

      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: mockEq,
          order: jest.fn(() => ({
            limit: mockLimit,
          })),
        })),
      }));

      (supabaseServer.from as jest.Mock).mockImplementation(mockFrom);

      await getFeatureFlagAuditLog(FEATURE_FLAGS.ENABLE_RATE_LIMITING);
      expect(mockEq).toHaveBeenCalledWith("flag_key", FEATURE_FLAGS.ENABLE_RATE_LIMITING);
    });
  });
});

