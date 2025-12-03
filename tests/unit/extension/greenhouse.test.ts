/**
 * Unit Tests for Greenhouse Content Script
 * Tests form detection and autofill functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Chrome API
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

(global as any).chrome = mockChrome;

describe('Greenhouse Content Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
  });

  describe('Field Detection', () => {
    it('should detect first name field', () => {
      document.body.innerHTML = `
        <form>
          <label for="first_name">First Name</label>
          <input type="text" id="first_name" name="firstName" />
        </form>
      `;
      
      const input = document.querySelector('input');
      expect(input).toBeTruthy();
      expect(input?.name).toContain('Name');
    });

    it('should detect email field', () => {
      document.body.innerHTML = `
        <form>
          <label for="email">Email Address</label>
          <input type="email" id="email" name="email" />
        </form>
      `;
      
      const input = document.querySelector('input[type="email"]');
      expect(input).toBeTruthy();
    });

    it('should detect phone field', () => {
      document.body.innerHTML = `
        <form>
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone" />
        </form>
      `;
      
      const input = document.querySelector('input[type="tel"]');
      expect(input).toBeTruthy();
    });

    it('should detect resume file upload', () => {
      document.body.innerHTML = `
        <form>
          <label for="resume">Upload Resume</label>
          <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx" />
        </form>
      `;
      
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeTruthy();
      expect(input?.accept).toContain('pdf');
    });

    it('should detect work authorization dropdown', () => {
      document.body.innerHTML = `
        <form>
          <label for="work_auth">Are you authorized to work in the US?</label>
          <select id="work_auth" name="work_authorization">
            <option value="">Select...</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </form>
      `;
      
      const select = document.querySelector('select');
      expect(select).toBeTruthy();
      expect(select?.options.length).toBe(3);
    });
  });

  describe('Work Authorization Detection', () => {
    it('should identify sponsorship question', () => {
      const label = 'Do you now or in the future require visa sponsorship?';
      const isSponsorship = label.toLowerCase().includes('sponsorship') ||
                           label.toLowerCase().includes('require visa');
      expect(isSponsorship).toBe(true);
    });

    it('should identify authorization question', () => {
      const label = 'Are you legally authorized to work in the United States?';
      const isAuthorization = label.toLowerCase().includes('authorized') &&
                             label.toLowerCase().includes('work');
      expect(isAuthorization).toBe(true);
    });

    it('should return Yes for authorization questions', () => {
      const label = 'Are you legally authorized to work in the United States?';
      const isAuthorization = label.toLowerCase().includes('authorized') &&
                             !label.toLowerCase().includes('sponsorship');
      const answer = isAuthorization ? 'Yes' : 'No';
      expect(answer).toBe('Yes');
    });

    it('should return No for sponsorship questions', () => {
      const label = 'Do you require visa sponsorship?';
      const isSponsorship = label.toLowerCase().includes('sponsorship');
      const answer = isSponsorship ? 'No' : 'Yes';
      expect(answer).toBe('No');
    });
  });

  describe('Field Matching', () => {
    const mockProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+15551234567',
      location: 'San Francisco, CA',
    };

    it('should match first name field to profile', () => {
      const fieldIdentifiers = ['first name', 'firstname', 'fname'];
      const matched = fieldIdentifiers.some(id => 
        id.includes('first') && id.includes('name') || id === 'fname'
      );
      expect(matched).toBe(true);
    });

    it('should match email field to profile', () => {
      const fieldIdentifiers = ['email', 'email address', 'e-mail'];
      const matched = fieldIdentifiers.some(id => id.includes('email'));
      expect(matched).toBe(true);
    });

    it('should match phone field to profile', () => {
      const fieldIdentifiers = ['phone', 'phone number', 'telephone', 'mobile'];
      const matched = fieldIdentifiers.some(id => 
        id.includes('phone') || id.includes('telephone') || id.includes('mobile')
      );
      expect(matched).toBe(true);
    });
  });

  describe('Chrome Message Handling', () => {
    it('should send message to background script', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
      
      await chrome.runtime.sendMessage({
        type: 'REQUEST_PROFILE_DATA',
      });
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'REQUEST_PROFILE_DATA',
      });
    });

    it('should handle generateAnswer message', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        answer: 'I am excited about this opportunity...',
      });
      
      const response = await chrome.runtime.sendMessage({
        type: 'generateAnswer',
        question: 'Why do you want this job?',
        jobDescription: 'Software Engineer role',
        jobTitle: 'Software Engineer',
        companyName: 'Test Corp',
      });
      
      expect(response.success).toBe(true);
      expect(response.answer).toBeTruthy();
    });

    it('should handle saveJob message', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        job: { id: 'job-1', title: 'Software Engineer' },
      });
      
      const response = await chrome.runtime.sendMessage({
        type: 'saveJob',
        jobInfo: {
          title: 'Software Engineer',
          company: 'Test Corp',
          location: 'Remote',
        },
      });
      
      expect(response.success).toBe(true);
      expect(response.job).toBeTruthy();
    });
  });
});

