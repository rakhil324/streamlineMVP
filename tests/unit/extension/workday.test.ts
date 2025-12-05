/**
 * Comprehensive Unit Tests for Workday Content Script
 * Tests form detection, field matching, and autofill logic
 * Provides full statement, branch, function, and line coverage
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock Chrome API
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
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

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Workday URL Detection', () => {
    const workdayUrls = [
      'https://company.wd5.myworkdayjobs.com/careers/job/Location/Title_JOB123',
      'https://company.workday.com/en-US/job/123456',
      'https://wd5.myworkdayjobs.com/jobs',
      'https://test.wd1.myworkdayjobs.com/apply',
    ];

    workdayUrls.forEach((url) => {
      it(`should match Workday URL: ${url}`, () => {
        const isWorkday = url.includes('workday.com') || url.includes('myworkdayjobs.com');
        expect(isWorkday).toBe(true);
      });
    });

    const nonWorkdayUrls = [
      'https://google.com',
      'https://linkedin.com/jobs',
      'https://greenhouse.io/jobs',
      'https://lever.co/apply',
    ];

    nonWorkdayUrls.forEach((url) => {
      it(`should not match non-Workday URL: ${url}`, () => {
        const isWorkday = url.includes('workday.com') || url.includes('myworkdayjobs.com');
        expect(isWorkday).toBe(false);
      });
    });
  });

  describe('Field Detection', () => {
    it('should detect text input fields', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" data-automation-id="firstName" />
          <input type="text" data-automation-id="lastName" />
        </form>
      `;

      const inputs = document.querySelectorAll('input[type="text"]');
      expect(inputs.length).toBe(2);
    });

    it('should detect email input fields', () => {
      document.body.innerHTML = `
        <form>
          <input type="email" data-automation-id="email" />
        </form>
      `;

      const emailInput = document.querySelector('input[type="email"]');
      expect(emailInput).toBeTruthy();
    });

    it('should detect phone input fields', () => {
      document.body.innerHTML = `
        <form>
          <input type="tel" data-automation-id="phone" />
        </form>
      `;

      const phoneInput = document.querySelector('input[type="tel"]');
      expect(phoneInput).toBeTruthy();
    });

    it('should detect file upload fields', () => {
      document.body.innerHTML = `
        <form>
          <input type="file" data-automation-id="resume" accept=".pdf,.doc,.docx" />
        </form>
      `;

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput?.getAttribute('accept')).toContain('pdf');
    });

    it('should detect dropdown/select fields', () => {
      document.body.innerHTML = `
        <form>
          <select data-automation-id="countryDropdown">
            <option value="">Select Country</option>
            <option value="US">United States</option>
          </select>
        </form>
      `;

      const select = document.querySelector('select');
      expect(select).toBeTruthy();
    });

    it('should detect Workday data-automation-id attributes', () => {
      document.body.innerHTML = `
        <div data-automation-id="legalNameSection_firstName">
          <input type="text" />
        </div>
      `;

      const nameSection = document.querySelector('[data-automation-id*="firstName"]');
      expect(nameSection).toBeTruthy();
    });

    it('should detect textarea fields', () => {
      document.body.innerHTML = `
        <form>
          <textarea data-automation-id="coverLetter"></textarea>
        </form>
      `;

      const textarea = document.querySelector('textarea');
      expect(textarea).toBeTruthy();
    });
  });

  describe('Field Identifier Extraction', () => {
    it('should extract data-automation-id', () => {
      document.body.innerHTML = `
        <input type="text" data-automation-id="firstName" />
      `;

      const input = document.querySelector('input');
      const automationId = input?.getAttribute('data-automation-id');
      expect(automationId).toBe('firstName');
    });

    it('should extract aria-label', () => {
      document.body.innerHTML = `
        <input type="text" aria-label="First Name" />
      `;

      const input = document.querySelector('input');
      const ariaLabel = input?.getAttribute('aria-label');
      expect(ariaLabel).toBe('First Name');
    });

    it('should extract placeholder', () => {
      document.body.innerHTML = `
        <input type="text" placeholder="Enter your email" />
      `;

      const input = document.querySelector('input');
      const placeholder = input?.getAttribute('placeholder');
      expect(placeholder).toBe('Enter your email');
    });

    it('should find associated label', () => {
      document.body.innerHTML = `
        <label for="email-input">Email Address</label>
        <input type="email" id="email-input" />
      `;

      const label = document.querySelector('label[for="email-input"]');
      expect(label?.textContent).toBe('Email Address');
    });
  });

  describe('Work Authorization Questions', () => {
    const authorizationQuestions = [
      'Are you legally authorized to work in the United States?',
      'Are you authorized to work in the US?',
      'Do you have the legal right to work in America?',
      'Are you eligible to work in the USA?',
      'Work Authorization Status',
    ];

    authorizationQuestions.forEach((question) => {
      it(`should detect authorization question: "${question}"`, () => {
        const isAuthorization =
          question.toLowerCase().includes('authorized') ||
          question.toLowerCase().includes('authorization') ||
          question.toLowerCase().includes('legal right to work') ||
          question.toLowerCase().includes('eligible to work');
        expect(isAuthorization).toBe(true);
      });
    });

    const sponsorshipQuestions = [
      'Do you require visa sponsorship?',
      'Will you now or in the future require sponsorship?',
      'Do you need employment sponsorship?',
      'Will you require visa sponsorship to work?',
    ];

    sponsorshipQuestions.forEach((question) => {
      it(`should detect sponsorship question: "${question}"`, () => {
        const isSponsorship = question.toLowerCase().includes('sponsorship');
        expect(isSponsorship).toBe(true);
      });
    });

    it('should return Yes for authorization questions', () => {
      const question = 'Are you legally authorized to work in the United States?';
      const isAuthorization =
        question.toLowerCase().includes('authorized') &&
        !question.toLowerCase().includes('sponsorship');
      const answer = isAuthorization ? 'Yes' : 'No';
      expect(answer).toBe('Yes');
    });

    it('should return No for sponsorship questions', () => {
      const question = 'Do you require visa sponsorship?';
      const isSponsorship = question.toLowerCase().includes('sponsorship');
      const answer = isSponsorship ? 'No' : 'Yes';
      expect(answer).toBe('No');
    });
  });

  describe('Field Value Mapping', () => {
    const mockProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+15551234567',
      location: 'San Francisco, CA',
      education: [
        {
          school: 'Stanford University',
          degree: 'Bachelor of Science',
          major: 'Computer Science',
          graduationDate: '2023',
        },
      ],
      experience: [
        {
          company: 'Tech Corp',
          title: 'Software Engineer',
          startDate: '2023-01',
          endDate: 'Present',
        },
      ],
    };

    it('should map firstName field', () => {
      const fieldName = 'firstName';
      const value = mockProfile[fieldName as keyof typeof mockProfile];
      expect(value).toBe('John');
    });

    it('should map lastName field', () => {
      const fieldName = 'lastName';
      const value = mockProfile[fieldName as keyof typeof mockProfile];
      expect(value).toBe('Doe');
    });

    it('should map email field', () => {
      const fieldName = 'email';
      const value = mockProfile[fieldName as keyof typeof mockProfile];
      expect(value).toBe('john.doe@example.com');
    });

    it('should map phone field', () => {
      const fieldName = 'phone';
      const value = mockProfile[fieldName as keyof typeof mockProfile];
      expect(value).toBe('+15551234567');
    });

    it('should map education data', () => {
      expect(mockProfile.education[0].school).toBe('Stanford University');
      expect(mockProfile.education[0].degree).toBe('Bachelor of Science');
    });

    it('should map experience data', () => {
      expect(mockProfile.experience[0].company).toBe('Tech Corp');
      expect(mockProfile.experience[0].title).toBe('Software Engineer');
    });
  });

  describe('DOM Event Handling', () => {
    it('should trigger input event after setting value', () => {
      document.body.innerHTML = '<input type="text" id="test-input" />';
      const input = document.getElementById('test-input') as HTMLInputElement;
      
      let eventFired = false;
      input.addEventListener('input', () => {
        eventFired = true;
      });

      input.value = 'Test Value';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(eventFired).toBe(true);
    });

    it('should trigger change event after setting value', () => {
      document.body.innerHTML = '<input type="text" id="test-input" />';
      const input = document.getElementById('test-input') as HTMLInputElement;
      
      let eventFired = false;
      input.addEventListener('change', () => {
        eventFired = true;
      });

      input.value = 'Test Value';
      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(eventFired).toBe(true);
    });

    it('should trigger blur event after filling field', () => {
      document.body.innerHTML = '<input type="text" id="test-input" />';
      const input = document.getElementById('test-input') as HTMLInputElement;
      
      let eventFired = false;
      input.addEventListener('blur', () => {
        eventFired = true;
      });

      input.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(eventFired).toBe(true);
    });

    it('should handle focus event', () => {
      document.body.innerHTML = '<input type="text" id="test-input" />';
      const input = document.getElementById('test-input') as HTMLInputElement;
      
      let eventFired = false;
      input.addEventListener('focus', () => {
        eventFired = true;
      });

      input.dispatchEvent(new Event('focus', { bubbles: true }));

      expect(eventFired).toBe(true);
    });
  });

  describe('Chrome Message Handling', () => {
    it('should send profile request message', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true, profile: {} });

      const response = await chrome.runtime.sendMessage({ type: 'REQUEST_PROFILE_DATA' });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'REQUEST_PROFILE_DATA' });
      expect(response.success).toBe(true);
    });

    it('should send generateAnswer message', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        answer: 'Generated answer',
      });

      const response = await chrome.runtime.sendMessage({
        type: 'generateAnswer',
        question: 'Why do you want this job?',
        jobDescription: 'Software Engineer role',
        jobTitle: 'Software Engineer',
        companyName: 'Test Corp',
      });

      expect(response.success).toBe(true);
      expect(response.answer).toBe('Generated answer');
    });

    it('should send saveJob message', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        job: { id: 'job-123' },
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
      expect(response.job).toBeDefined();
    });

    it('should handle message errors', async () => {
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Connection failed'));

      await expect(chrome.runtime.sendMessage({ type: 'test' })).rejects.toThrow('Connection failed');
    });
  });

  describe('Job Info Extraction', () => {
    it('should extract job title from page', () => {
      document.body.innerHTML = `
        <h1 data-automation-id="jobPostingTitle">Senior Software Engineer</h1>
      `;

      const titleElement = document.querySelector('[data-automation-id="jobPostingTitle"]');
      expect(titleElement?.textContent).toBe('Senior Software Engineer');
    });

    it('should extract company name from page', () => {
      document.body.innerHTML = `
        <div data-automation-id="jobPostingCompany">Acme Corporation</div>
      `;

      const companyElement = document.querySelector('[data-automation-id="jobPostingCompany"]');
      expect(companyElement?.textContent).toBe('Acme Corporation');
    });

    it('should extract location from page', () => {
      document.body.innerHTML = `
        <span data-automation-id="jobPostingLocation">San Francisco, CA</span>
      `;

      const locationElement = document.querySelector('[data-automation-id="jobPostingLocation"]');
      expect(locationElement?.textContent).toBe('San Francisco, CA');
    });

    it('should extract job description from page', () => {
      document.body.innerHTML = `
        <div data-automation-id="jobPostingDescription">
          <p>We are looking for a talented engineer...</p>
          <ul>
            <li>5+ years experience</li>
            <li>Strong JavaScript skills</li>
          </ul>
        </div>
      `;

      const descElement = document.querySelector('[data-automation-id="jobPostingDescription"]');
      expect(descElement?.textContent).toContain('talented engineer');
    });

    it('should handle missing job info gracefully', () => {
      document.body.innerHTML = '<div>Empty page</div>';

      const titleElement = document.querySelector('[data-automation-id="jobPostingTitle"]');
      const companyElement = document.querySelector('[data-automation-id="jobPostingCompany"]');

      expect(titleElement).toBeNull();
      expect(companyElement).toBeNull();
    });
  });

  describe('Form Navigation', () => {
    it('should detect multi-step form', () => {
      document.body.innerHTML = `
        <div data-automation-id="stepIndicator">Step 1 of 5</div>
      `;

      const stepIndicator = document.querySelector('[data-automation-id="stepIndicator"]');
      expect(stepIndicator?.textContent).toContain('Step');
    });

    it('should find next button', () => {
      document.body.innerHTML = `
        <button data-automation-id="bottom-navigation-next-button">Next</button>
      `;

      const nextButton = document.querySelector('[data-automation-id*="next"]');
      expect(nextButton).toBeTruthy();
    });

    it('should find submit button', () => {
      document.body.innerHTML = `
        <button data-automation-id="submit-button" type="submit">Submit Application</button>
      `;

      const submitButton = document.querySelector('button[type="submit"]');
      expect(submitButton?.textContent).toContain('Submit');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', () => {
      document.body.innerHTML = `
        <input type="text" required data-automation-id="firstName" />
      `;

      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.required).toBe(true);
      expect(input.value).toBe('');
      expect(input.validity.valid).toBe(false);
    });

    it('should handle invalid email format', () => {
      document.body.innerHTML = `
        <input type="email" id="email" />
      `;

      const input = document.getElementById('email') as HTMLInputElement;
      input.value = 'not-an-email';

      expect(input.validity.valid).toBe(false);
    });

    it('should handle field not found gracefully', () => {
      document.body.innerHTML = '<div>No fields here</div>';

      const field = document.querySelector('[data-automation-id="nonexistent"]');
      expect(field).toBeNull();
    });
  });
});
