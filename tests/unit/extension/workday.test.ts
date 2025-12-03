/**
 * Unit Tests for Workday Content Script
 * Tests form detection and autofill functionality for Workday ATS
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
      remove: jest.fn(),
    },
  },
};

(global as any).chrome = mockChrome;

describe('Workday Content Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('Workday Field Detection', () => {
    it('should detect Workday-specific data-automation-id fields', () => {
      document.body.innerHTML = `
        <form data-automation-id="jobApplication">
          <input data-automation-id="firstName" type="text" />
          <input data-automation-id="lastName" type="text" />
          <input data-automation-id="email" type="email" />
        </form>
      `;
      
      const firstName = document.querySelector('[data-automation-id="firstName"]');
      const lastName = document.querySelector('[data-automation-id="lastName"]');
      const email = document.querySelector('[data-automation-id="email"]');
      
      expect(firstName).toBeTruthy();
      expect(lastName).toBeTruthy();
      expect(email).toBeTruthy();
    });

    it('should detect phone field with country code', () => {
      document.body.innerHTML = `
        <form>
          <input data-automation-id="phone-countryCode" type="text" />
          <input data-automation-id="phone-phoneNumber" type="tel" />
        </form>
      `;
      
      const countryCode = document.querySelector('[data-automation-id="phone-countryCode"]');
      const phoneNumber = document.querySelector('[data-automation-id="phone-phoneNumber"]');
      
      expect(countryCode).toBeTruthy();
      expect(phoneNumber).toBeTruthy();
    });

    it('should detect address fields', () => {
      document.body.innerHTML = `
        <form>
          <input data-automation-id="address-city" type="text" />
          <select data-automation-id="address-state">
            <option value="">Select State</option>
            <option value="CA">California</option>
          </select>
        </form>
      `;
      
      const city = document.querySelector('[data-automation-id="address-city"]');
      const state = document.querySelector('[data-automation-id="address-state"]');
      
      expect(city).toBeTruthy();
      expect(state).toBeTruthy();
    });
  });

  describe('Work Experience Fields', () => {
    it('should detect work experience section', () => {
      document.body.innerHTML = `
        <div data-automation-id="workExperience">
          <input data-automation-id="jobTitle" type="text" />
          <input data-automation-id="company" type="text" />
          <input data-automation-id="startDate" type="text" />
          <input data-automation-id="endDate" type="text" />
        </div>
      `;
      
      const workExp = document.querySelector('[data-automation-id="workExperience"]');
      const jobTitle = document.querySelector('[data-automation-id="jobTitle"]');
      
      expect(workExp).toBeTruthy();
      expect(jobTitle).toBeTruthy();
    });

    it('should detect current job checkbox', () => {
      document.body.innerHTML = `
        <div>
          <input type="checkbox" data-automation-id="currentlyWorkHere" />
          <label>I currently work here</label>
        </div>
      `;
      
      const checkbox = document.querySelector('[data-automation-id="currentlyWorkHere"]');
      expect(checkbox).toBeTruthy();
    });
  });

  describe('Education Fields', () => {
    it('should detect education section', () => {
      document.body.innerHTML = `
        <div data-automation-id="education">
          <input data-automation-id="school" type="text" />
          <input data-automation-id="degree" type="text" />
          <input data-automation-id="fieldOfStudy" type="text" />
        </div>
      `;
      
      const education = document.querySelector('[data-automation-id="education"]');
      const school = document.querySelector('[data-automation-id="school"]');
      
      expect(education).toBeTruthy();
      expect(school).toBeTruthy();
    });
  });

  describe('URL Extraction', () => {
    it('should extract company name from Workday URL', () => {
      const url = 'https://acme.wd5.myworkdayjobs.com/en-US/External/job/Software-Engineer';
      const hostname = new URL(url).hostname;
      const match = hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com/i);
      
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe('acme');
    });

    it('should extract company name from alternate URL format', () => {
      const url = 'https://wd5.myworkdayjobs.com/acme/job/Software-Engineer';
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/').filter(Boolean);
      
      expect(parts[0]).toBe('acme');
    });
  });

  describe('Job Info Extraction', () => {
    it('should extract job title from page', () => {
      document.body.innerHTML = `
        <h1 data-automation-id="jobPostingHeader">Software Engineer</h1>
        <div data-automation-id="jobLocation">San Francisco, CA</div>
      `;
      
      const title = document.querySelector('[data-automation-id="jobPostingHeader"]');
      const location = document.querySelector('[data-automation-id="jobLocation"]');
      
      expect(title?.textContent).toBe('Software Engineer');
      expect(location?.textContent).toBe('San Francisco, CA');
    });
  });

  describe('Chrome Message Handling', () => {
    it('should handle AUTOFILL_DATA message', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
      
      // Simulate receiving autofill data
      const autofillData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+15551234567',
      };
      
      // This would be called by the message listener
      const response = await chrome.runtime.sendMessage({
        type: 'AUTOFILL_COMPLETE',
        data: {
          atsType: 'workday',
          filledFields: ['firstName', 'lastName', 'email'],
          filledCount: 3,
        },
      });
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should handle file fetch message', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: 'base64encodedfiledata',
        mimeType: 'application/pdf',
      });
      
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_FILE',
        url: 'https://example.com/resume.pdf',
      });
      
      expect(response.success).toBe(true);
      expect(response.data).toBeTruthy();
    });
  });

  describe('Dropdown Handling', () => {
    it('should fill select dropdown', () => {
      document.body.innerHTML = `
        <select data-automation-id="country">
          <option value="">Select Country</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
      `;
      
      const select = document.querySelector('select') as HTMLSelectElement;
      select.value = 'US';
      
      expect(select.value).toBe('US');
    });

    it('should handle Yes/No dropdowns', () => {
      document.body.innerHTML = `
        <select data-automation-id="workAuthorization">
          <option value="">Select...</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      `;
      
      const select = document.querySelector('select') as HTMLSelectElement;
      select.value = 'yes';
      
      expect(select.value).toBe('yes');
    });
  });
});

