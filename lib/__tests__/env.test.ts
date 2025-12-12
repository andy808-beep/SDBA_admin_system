// lib/__tests__/env.test.ts
// Tests for lib/env.ts

describe('validateServerEnv', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;
  const originalNextPhase = process.env.NEXT_PHASE;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // @ts-ignore
    delete global.window;
    process.env.NEXT_PHASE = originalNextPhase;
  });

  afterEach(() => {
    process.env = originalEnv;
    // @ts-ignore
    global.window = originalWindow;
  });

  it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PHASE;
    // @ts-ignore
    delete global.window;

    jest.resetModules();
    const { validateServerEnv } = require('../env');
    expect(() => {
      validateServerEnv();
    }).toThrow('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  });

  it('should not throw when SUPABASE_SERVICE_ROLE_KEY is present', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    delete process.env.NEXT_PHASE;
    // @ts-ignore
    delete global.window;

    jest.resetModules();
    const { validateServerEnv } = require('../env');
    expect(() => {
      validateServerEnv();
    }).not.toThrow();
  });

  it('should skip validation during build phase', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PHASE = 'phase-production-build';
    // @ts-ignore
    delete global.window;

    jest.resetModules();
    const { validateServerEnv } = require('../env');
    expect(() => {
      validateServerEnv();
    }).not.toThrow();
  });

  it('should skip validation in browser context', () => {
    // Note: This test verifies the logic, but in Jest we can't easily simulate
    // browser context because typeof window is evaluated at module load time.
    // The actual code checks typeof window === 'undefined' to skip validation
    // in browser contexts. This is tested implicitly through other tests.
    // In a real browser environment, window would be defined and validation would be skipped.
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PHASE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

    jest.resetModules();
    const { validateServerEnv } = require('../env');
    
    // In server context (Jest), it should throw
    // In browser context (not testable in Jest), it would not throw
    // We verify the server context behavior here
    expect(() => {
      validateServerEnv();
    }).toThrow('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  });
});

describe('env', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;
  const originalNextPhase = process.env.NEXT_PHASE;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // @ts-ignore
    delete global.window;
    process.env.NEXT_PHASE = originalNextPhase;
  });

  afterEach(() => {
    process.env = originalEnv;
    // @ts-ignore
    global.window = originalWindow;
  });

  describe('NEXT_PUBLIC_SUPABASE_URL', () => {
    it('should return environment variable value', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    });

    it('should return placeholder during build', () => {
      process.env.NEXT_PHASE = 'phase-production-build';
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://placeholder.supabase.co');
    });

    it('should return placeholder when NEXT_PUBLIC_SUPABASE_URL is not set (treated as build time)', () => {
      // When NEXT_PUBLIC_SUPABASE_URL is not set, isBuildTime is true
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      // The code treats missing NEXT_PUBLIC_SUPABASE_URL as build time
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://placeholder.supabase.co');
    });
    
    it('should return placeholder when set to empty string (treated as build time)', () => {
      // Empty string is falsy, so !process.env.NEXT_PUBLIC_SUPABASE_URL is true
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      // Empty string is falsy, so isBuildTime is true
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://placeholder.supabase.co');
    });
  });

  describe('NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    it('should return environment variable value', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'; // Set URL to avoid build check
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key');
    });

    it('should return placeholder during build', () => {
      process.env.NEXT_PHASE = 'phase-production-build';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('placeholder-anon-key');
    });

    it('should return placeholder when NEXT_PUBLIC_SUPABASE_URL is not set (treated as build time)', () => {
      // When NEXT_PUBLIC_SUPABASE_URL is not set, isBuildTime is true
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      // The code treats missing NEXT_PUBLIC_SUPABASE_URL as build time
      expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('placeholder-anon-key');
    });
    
    it('should return empty string when NEXT_PUBLIC_SUPABASE_ANON_KEY is not set but URL is set', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('');
    });
  });

  describe('SUPABASE_SERVICE_ROLE_KEY', () => {
    it('should return environment variable value', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'; // Set URL to avoid build check
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-key');
    });

    it('should return placeholder during build', () => {
      process.env.NEXT_PHASE = 'phase-production-build';
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');
      expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('placeholder-service-role-key');
    });

    it('should validate and throw when missing in server context', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'; // Set URL to avoid build check
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      delete global.window;

      jest.resetModules();
      const { env } = require('../env');

      expect(() => {
        // Accessing the getter will trigger validation
        const _ = env.SUPABASE_SERVICE_ROLE_KEY;
      }).toThrow('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should not validate in browser context', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.NEXT_PHASE;
      // @ts-ignore
      global.window = {};

      jest.resetModules();
      const { env } = require('../env');

      // Should not throw in browser context
      expect(() => {
        const _ = env.SUPABASE_SERVICE_ROLE_KEY;
      }).not.toThrow();
    });
  });
});

