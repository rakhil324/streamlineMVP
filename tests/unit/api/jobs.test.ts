/**
 * Unit Tests for Jobs API
 * Tests the /api/jobs endpoint functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

import { auth } from '@/lib/auth';
import fs from 'fs/promises';

describe('Jobs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/jobs', () => {
    it('should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      
      // Import dynamically to get fresh module with mocks
      const { GET } = await import('@/app/api/jobs/route');
      
      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'GET',
      });
      
      const response = await GET(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return empty array when user has no jobs', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
      
      const { GET } = await import('@/app/api/jobs/route');
      
      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'GET',
      });
      
      const response = await GET(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobs).toEqual([]);
    });

    it('should return jobs when user has saved jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          title: 'Software Engineer',
          company: 'Test Corp',
          status: 'Applied',
        },
      ];
      
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockJobs));
      
      const { GET } = await import('@/app/api/jobs/route');
      
      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'GET',
      });
      
      const response = await GET(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].title).toBe('Software Engineer');
    });
  });

  describe('POST /api/jobs', () => {
    it('should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      
      const { POST } = await import('@/app/api/jobs/route');
      
      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Job', company: 'Test Corp' }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 400 when title is missing', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      const { POST } = await import('@/app/api/jobs/route');
      
      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: 'Test Corp' }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 400 when company is missing', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      const { POST } = await import('@/app/api/jobs/route');
      
      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Job' }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should create a new job successfully', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      const { POST } = await import('@/app/api/jobs/route');
      
      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Software Engineer',
          company: 'Test Corp',
          location: 'Remote',
        }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.job.title).toBe('Software Engineer');
      expect(data.job.company).toBe('Test Corp');
      expect(data.job.status).toBe('Applied');
    });

    it('should return existing job if already saved', async () => {
      const existingJob = {
        id: 'job-1',
        title: 'Software Engineer',
        company: 'Test Corp',
        status: 'Applied',
      };
      
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([existingJob]));
      
      const { POST } = await import('@/app/api/jobs/route');
      
      const request = new Request('http://localhost:3000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Software Engineer',
          company: 'Test Corp',
        }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('already exists');
    });
  });
});

