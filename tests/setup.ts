/**
 * Jest Test Setup
 * Global setup for all tests
 */

import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock console.error to reduce noise in tests (can be overridden per test)
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Helper to create mock request
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}) {
  const { method = 'GET', url = 'http://localhost:3000', body, headers = {} } = options;
  
  return {
    method,
    url,
    headers: new Headers(headers),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

// Helper to create mock session
export function createMockSession(overrides = {}) {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

