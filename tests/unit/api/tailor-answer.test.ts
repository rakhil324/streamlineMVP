/**
 * Unit Tests for Tailor Answer API
 * Tests the /api/tailor/answer endpoint functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Mock the LLM module
jest.mock('@/lib/llm', () => ({
  callLLM: jest.fn(),
  generateApplicationQuestionPrompt: jest.fn(),
}));

// Mock encryption
jest.mock('@/lib/encryption', () => ({
  decrypt: jest.fn(),
}));

import { auth } from '@/lib/auth';
import fs from 'fs/promises';
import { callLLM, generateApplicationQuestionPrompt } from '@/lib/llm';
import { decrypt } from '@/lib/encryption';

describe('Tailor Answer API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module cache to get fresh imports
    jest.resetModules();
  });

  describe('POST /api/tailor/answer', () => {
    it('should return 401 when user is not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      
      const { POST } = await import('@/app/api/tailor/answer/route');
      
      const request = new Request('http://localhost:3000/api/tailor/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Why do you want this job?',
          jobDescription: 'Software Engineer role',
          jobTitle: 'Software Engineer',
          companyName: 'Test Corp',
        }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 400 when required fields are missing', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      const { POST } = await import('@/app/api/tailor/answer/route');
      
      const request = new Request('http://localhost:3000/api/tailor/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Why do you want this job?',
          // Missing jobDescription, jobTitle, companyName
        }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 404 when user has no resume', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      // No resume file
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
      
      const { POST } = await import('@/app/api/tailor/answer/route');
      
      const request = new Request('http://localhost:3000/api/tailor/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Why do you want this job?',
          jobDescription: 'Software Engineer role',
          jobTitle: 'Software Engineer',
          companyName: 'Test Corp',
        }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toContain('resume');
    });

    it('should generate answer successfully when all data is available', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
      });
      
      // Mock resume data
      const resumeData = {
        resume: {
          sanitizedText: 'Experienced software engineer with 5 years...',
          encryptedOriginal: 'encrypted-data',
          encryptionKey: 'key',
        },
      };
      
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(resumeData));
      (decrypt as jest.Mock).mockReturnValue('Full resume text with details...');
      (generateApplicationQuestionPrompt as jest.Mock).mockReturnValue('Generated prompt');
      (callLLM as jest.Mock).mockResolvedValue({
        content: 'I am excited about this opportunity because...',
      });
      
      // Set environment variable for LLM
      process.env.LLM_API_KEY = 'test-api-key';
      
      const { POST } = await import('@/app/api/tailor/answer/route');
      
      const request = new Request('http://localhost:3000/api/tailor/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Why do you want this job?',
          jobDescription: 'Software Engineer role at innovative company',
          jobTitle: 'Software Engineer',
          companyName: 'Test Corp',
        }),
      });
      
      const response = await POST(request as any);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.answer).toContain('excited');
    });
  });
});

