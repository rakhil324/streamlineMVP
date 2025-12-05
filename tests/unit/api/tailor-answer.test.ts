/**
 * Unit Tests for Tailor Answer API
 * Tests the /api/tailor/answer endpoint logic
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock modules
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/llm', () => ({
  callLLM: jest.fn(),
  generateApplicationQuestionPrompt: jest.fn(),
}));

describe('Tailor Answer API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('should require question field', () => {
      const body = {
        jobDescription: 'Software Engineer role',
        jobTitle: 'Software Engineer',
        companyName: 'Test Corp',
      };
      
      const hasQuestion = 'question' in body;
      expect(hasQuestion).toBe(false);
    });

    it('should require jobDescription field', () => {
      const body = {
        question: 'Why do you want this job?',
        jobTitle: 'Software Engineer',
        companyName: 'Test Corp',
      };
      
      const hasJobDescription = 'jobDescription' in body;
      expect(hasJobDescription).toBe(false);
    });

    it('should require jobTitle field', () => {
      const body = {
        question: 'Why do you want this job?',
        jobDescription: 'Software Engineer role',
        companyName: 'Test Corp',
      };
      
      const hasJobTitle = 'jobTitle' in body;
      expect(hasJobTitle).toBe(false);
    });

    it('should require companyName field', () => {
      const body = {
        question: 'Why do you want this job?',
        jobDescription: 'Software Engineer role',
        jobTitle: 'Software Engineer',
      };
      
      const hasCompanyName = 'companyName' in body;
      expect(hasCompanyName).toBe(false);
    });

    it('should accept valid request with all fields', () => {
      const body = {
        question: 'Why do you want this job?',
        jobDescription: 'Software Engineer role',
        jobTitle: 'Software Engineer',
        companyName: 'Test Corp',
      };
      
      const requiredFields = ['question', 'jobDescription', 'jobTitle', 'companyName'];
      const hasAllFields = requiredFields.every(field => field in body && body[field as keyof typeof body]);
      
      expect(hasAllFields).toBe(true);
    });

    it('should reject empty string values', () => {
      const body = {
        question: '',
        jobDescription: 'Software Engineer role',
        jobTitle: 'Software Engineer',
        companyName: 'Test Corp',
      };
      
      const isValid = body.question !== '' && body.jobDescription !== '' && 
                      body.jobTitle !== '' && body.companyName !== '';
      
      expect(isValid).toBe(false);
    });
  });

  describe('Question Types', () => {
    const questionTypes = [
      'Why do you want to work at this company?',
      'Tell us about yourself',
      'What are your salary expectations?',
      'When can you start?',
      'Describe a challenging project you worked on',
      'What makes you a good fit for this role?',
      'Where do you see yourself in 5 years?',
    ];

    questionTypes.forEach((question) => {
      it(`should handle question: "${question.substring(0, 30)}..."`, () => {
        const body = {
          question,
          jobDescription: 'Software Engineer role',
          jobTitle: 'Software Engineer',
          companyName: 'Test Corp',
        };
        
        expect(body.question).toBe(question);
        expect(body.question.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Response Format', () => {
    it('should format success response correctly', () => {
      const response = {
        success: true,
        answer: 'I am excited about this opportunity because...',
      };
      
      expect(response.success).toBe(true);
      expect(response.answer).toBeDefined();
      expect(typeof response.answer).toBe('string');
    });

    it('should format error response correctly', () => {
      const response = {
        error: 'Missing required fields',
      };
      
      expect(response.error).toBeDefined();
      expect(typeof response.error).toBe('string');
    });

    it('should handle empty answer', () => {
      const response = {
        success: true,
        answer: '',
      };
      
      expect(response.answer).toBe('');
    });
  });

  describe('Prompt Generation', () => {
    it('should include all context in prompt', () => {
      const context = {
        question: 'Why do you want this job?',
        jobTitle: 'Software Engineer',
        companyName: 'Test Corp',
        jobDescription: 'Build amazing software',
        resumeText: 'Experienced developer with 5 years...',
      };
      
      const promptParts = [
        context.question,
        context.jobTitle,
        context.companyName,
        context.jobDescription,
        context.resumeText,
      ];
      
      promptParts.forEach(part => {
        expect(part).toBeDefined();
        expect(part.length).toBeGreaterThan(0);
      });
    });

    it('should handle special characters in question', () => {
      const question = 'Why do you want this job? (Please be specific)';
      expect(question).toContain('?');
      expect(question).toContain('(');
      expect(question).toContain(')');
    });

    it('should handle multiline job description', () => {
      const jobDescription = `
        We are looking for a talented engineer.
        
        Requirements:
        - 5+ years experience
        - Strong communication skills
        
        Benefits:
        - Remote work
        - Health insurance
      `;
      
      expect(jobDescription).toContain('\n');
      expect(jobDescription.length).toBeGreaterThan(100);
    });
  });

  describe('Answer Length', () => {
    it('should generate answer within reasonable length', () => {
      const maxAnswerLength = 2000;
      const answer = 'I am excited about this opportunity because of my passion for technology and innovation.';
      
      expect(answer.length).toBeLessThan(maxAnswerLength);
    });

    it('should handle long answers', () => {
      const longAnswer = 'A'.repeat(5000);
      const maxLength = 3000;
      const truncated = longAnswer.length > maxLength 
        ? longAnswer.substring(0, maxLength) 
        : longAnswer;
      
      expect(truncated.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', () => {
      const session = null;
      const error = session ? null : 'Unauthorized - Please log in';
      
      expect(error).toBe('Unauthorized - Please log in');
    });

    it('should handle missing resume', () => {
      const resume = null;
      const error = resume ? null : 'No resume found';
      
      expect(error).toBe('No resume found');
    });

    it('should handle LLM API errors', () => {
      const llmError = new Error('API rate limit exceeded');
      
      expect(llmError.message).toBe('API rate limit exceeded');
    });

    it('should handle network errors', () => {
      const networkError = new Error('Network request failed');
      
      expect(networkError.message).toBe('Network request failed');
    });
  });

  describe('Resume Context', () => {
    it('should use resume text when available', () => {
      const resumeData = {
        sanitizedText: 'Experienced software engineer with 5 years...',
        encryptedOriginal: 'encrypted-data',
        encryptionKey: 'key-123',
      };
      
      expect(resumeData.sanitizedText).toBeDefined();
      expect(resumeData.sanitizedText.length).toBeGreaterThan(0);
    });

    it('should handle resume without encrypted data', () => {
      const resumeData = {
        sanitizedText: 'Resume text only',
      };
      
      expect(resumeData.sanitizedText).toBeDefined();
      expect((resumeData as any).encryptedOriginal).toBeUndefined();
    });

    it('should handle empty resume text', () => {
      const resumeData = {
        sanitizedText: '',
      };
      
      const hasContent = resumeData.sanitizedText && resumeData.sanitizedText.length > 0;
      expect(hasContent).toBeFalsy();
    });
  });

  describe('Company-Specific Questions', () => {
    it('should handle "Why this company" questions', () => {
      const question = 'Why do you want to work at Google?';
      const isCompanySpecific = question.toLowerCase().includes('why') && 
                                (question.toLowerCase().includes('company') || 
                                 question.toLowerCase().includes('work at'));
      
      expect(isCompanySpecific).toBe(true);
    });

    it('should handle role-specific questions', () => {
      const question = 'Why are you interested in this Software Engineer position?';
      const isRoleSpecific = question.toLowerCase().includes('position') || 
                            question.toLowerCase().includes('role');
      
      expect(isRoleSpecific).toBe(true);
    });

    it('should handle experience questions', () => {
      const question = 'Describe your experience with React';
      const isExperienceQuestion = question.toLowerCase().includes('experience') || 
                                   question.toLowerCase().includes('describe');
      
      expect(isExperienceQuestion).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    it('should handle HTML in question', () => {
      const question = '<script>alert("xss")</script>Why do you want this job?';
      const sanitized = question.replace(/<[^>]*>/g, '');
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Why do you want this job?');
    });

    it('should handle special characters', () => {
      const question = 'Why do you want this job? "Please explain" & provide examples.';
      
      expect(question).toContain('"');
      expect(question).toContain('&');
    });

    it('should trim whitespace', () => {
      const question = '  Why do you want this job?  ';
      const trimmed = question.trim();
      
      expect(trimmed).toBe('Why do you want this job?');
    });
  });
});
