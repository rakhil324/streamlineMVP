/**
 * API Testing Utilities
 * Helper functions for testing API routes
 */

import { NextRequest, NextResponse } from 'next/server';

export interface MockRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Create a mock NextRequest for API testing
 */
export function createMockNextRequest(options: MockRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  // Create request init
  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
    (init.headers as Headers).set('Content-Type', 'application/json');
  }

  return new NextRequest(urlObj.toString(), init as any);
}

/**
 * Extract JSON from NextResponse
 */
export async function getResponseJson(response: NextResponse): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Create a mock user session
 */
export function createMockSession(overrides: Partial<{
  id: string;
  email: string;
  name: string;
  image: string;
}> = {}) {
  return {
    user: {
      id: overrides.id || 'test-user-123',
      email: overrides.email || 'test@example.com',
      name: overrides.name || 'Test User',
      image: overrides.image,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create mock profile data
 */
export function createMockProfile(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  education: any[];
  experience: any[];
}> = {}) {
  return {
    firstName: overrides.firstName || 'John',
    lastName: overrides.lastName || 'Doe',
    email: overrides.email || 'john.doe@example.com',
    phone: overrides.phone || '+15551234567',
    location: overrides.location || 'San Francisco, CA',
    linkedIn: overrides.linkedIn || 'https://linkedin.com/in/johndoe',
    education: overrides.education || [
      {
        school: 'Stanford University',
        degree: 'BS Computer Science',
        years: '2018-2022',
      },
    ],
    experience: overrides.experience || [
      {
        title: 'Software Engineer',
        company: 'Google',
        duration: '2022-Present',
      },
    ],
  };
}

/**
 * Create mock job data
 */
export function createMockJob(overrides: Partial<{
  id: string;
  title: string;
  company: string;
  location: string;
  status: string;
  appliedDate: string;
  jobUrl: string;
}> = {}) {
  return {
    id: overrides.id || `job-${Date.now()}`,
    title: overrides.title || 'Software Engineer',
    company: overrides.company || 'Test Company',
    location: overrides.location || 'Remote',
    status: overrides.status || 'Applied',
    appliedDate: overrides.appliedDate || new Date().toISOString().split('T')[0],
    jobUrl: overrides.jobUrl || 'https://example.com/jobs/123',
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(data: any, options: { status?: number; ok?: boolean } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  };
}

