/**
 * Lever-specific content script
 * Handles form detection and autofill for Lever ATS
 */

class LeverHandler {
  constructor() {
    this.atsType = 'lever';
    this.fields = {};
    this.isAutofilling = false;
    
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }

    // Listen for autofill messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AUTOFILL_DATA') {
        this.autofill(message.data);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  setup() {
    this.detectFields();
    this.observeLeverChanges();
  }

  detectFields() {
    const form = document.querySelector('form[action*="lever"]') ||
                 document.querySelector('form.application-form') ||
                 document.querySelector('form');
    
    if (!form) {
      setTimeout(() => this.detectFields(), 1000);
      return;
    }

    this.fields = {
      firstName: this.findField(['input[name*="firstName"]', 'input[name*="first_name"]', 'input[id*="firstName"]']),
      lastName: this.findField(['input[name*="lastName"]', 'input[name*="last_name"]', 'input[id*="lastName"]']),
      email: this.findField(['input[type="email"]', 'input[name*="email"]']),
      phone: this.findField(['input[type="tel"]', 'input[name*="phone"]']),
      location: this.findField(['input[name*="location"]', 'input[name*="city"]']),
      resume: this.findField(['input[type="file"]']),
      coverLetter: this.findField(['textarea[name*="cover"]', 'textarea[name*="message"]']),
      linkedin: this.findField(['input[name*="linkedin"]']),
      website: this.findField(['input[name*="website"]', 'input[name*="portfolio"]']),
    };

    this.notifyDetection();
  }

  findField(selectors) {
    for (const selector of selectors) {
      const field = document.querySelector(selector);
      if (field && field.offsetParent !== null) {
        return {
          element: field,
          selector: selector,
          type: field.type || field.tagName.toLowerCase(),
        };
      }
    }
    return null;
  }

  observeLeverChanges() {
    const observer = new MutationObserver(() => {
      if (!this.isAutofilling) {
        this.detectFields();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  notifyDetection() {
    const detectedFields = Object.values(this.fields).filter(f => f !== null);
    
    if (detectedFields.length > 0) {
      chrome.runtime.sendMessage({
        type: 'DETECT_FORMS',
        data: {
          atsType: this.atsType,
          fields: detectedFields.map(f => ({
            selector: f.selector,
            type: f.type,
          })),
          url: window.location.href,
        },
      });
    }
  }

  async autofill(data) {
    if (this.isAutofilling) return;
    this.isAutofilling = true;

    try {
      // Fill text fields
      const fieldMap = {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phone: 'phone',
        location: 'location',
        linkedin: 'linkedin',
        website: 'website',
      };

      Object.entries(fieldMap).forEach(([dataKey, fieldKey]) => {
        if (data[dataKey] && this.fields[fieldKey]) {
          this.fillField(this.fields[fieldKey].element, data[dataKey]);
        }
      });

      // Handle file upload
      if (data.resume && this.fields.resume) {
        await this.handleFileUpload(this.fields.resume.element, data.resume);
      }

      // Handle cover letter
      if (data.coverLetter && this.fields.coverLetter) {
        this.fillField(this.fields.coverLetter.element, data.coverLetter);
      }

      // Trigger events
      this.triggerEvents();

      chrome.runtime.sendMessage({
        type: 'AUTOFILL_COMPLETE',
        data: {
          atsType: this.atsType,
          filledFields: Object.keys(this.fields).filter(key => this.fields[key] && data[key]),
        },
      });

      // Save job to application tracker
      await this.saveJobToTracker();

    } catch (error) {
      console.error('Lever autofill error:', error);
    } finally {
      this.isAutofilling = false;
    }
  }

  extractJobInfo() {
    let jobTitle = '';
    let companyName = '';
    let jobDescription = '';
    let location = '';

    // Try to find job title - common selectors on Lever pages
    const titleSelectors = [
      'h1.posting-headline',
      'h1',
      '.posting-headline h2',
      '[data-qa="posting-title"]',
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        const text = element.textContent.trim();
        if (text.length < 100 && !text.includes('Apply')) {
          jobTitle = text;
          break;
        }
      }
    }

    // Try to find company name from URL or page
    const hostname = window.location.hostname;
    const leverMatch = hostname.match(/jobs\.lever\.co\/([^\/]+)/);
    if (leverMatch) {
      companyName = leverMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Also check for company name in meta or page elements
    const companySelectors = [
      '.company-name',
      '[data-qa="company-name"]',
      'meta[property="og:site_name"]',
    ];

    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.getAttribute('content') || element.textContent || '';
        if (text.trim()) {
          companyName = text.trim();
          break;
        }
      }
    }

    // Try to find location
    const locationSelectors = [
      '.location',
      '[data-qa="posting-location"]',
      '.posting-categories .location',
    ];

    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        location = element.textContent.trim();
        break;
      }
    }

    // Try to find job description
    const descriptionSelectors = [
      '.posting-page .content',
      '.posting-description',
      '[data-qa="posting-description"]',
    ];

    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        jobDescription = element.textContent.trim().substring(0, 2000);
        break;
      }
    }

    console.log('Lever: Extracted job info', { jobTitle, companyName, location });

    return { jobTitle, companyName, location, jobDescription };
  }

  async saveJobToTracker() {
    try {
      const jobInfo = this.extractJobInfo();

      if (!jobInfo.jobTitle || !jobInfo.companyName) {
        console.log('Lever: Not enough job info to save to tracker');
        return;
      }

      console.log('Lever: Saving job to application tracker...');
      const saveResponse = await chrome.runtime.sendMessage({
        type: 'saveJob',
        jobInfo: {
          title: jobInfo.jobTitle,
          company: jobInfo.companyName,
          location: jobInfo.location || '',
          description: jobInfo.jobDescription || '',
          jobUrl: window.location.href,
        },
      });

      if (saveResponse && saveResponse.success) {
        console.log('Lever: Job saved to tracker successfully');
        this.showNotification('Application tracked!', 'success');
      } else {
        console.warn('Lever: Failed to save job to tracker:', saveResponse?.error);
      }
    } catch (error) {
      console.warn('Lever: Error saving job to tracker:', error);
    }
  }

  showNotification(message, type = 'info') {
    const existing = document.getElementById('lever-autofill-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'lever-autofill-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 400px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 4000);
  }

  fillField(element, value) {
    if (!element) return;

    element.focus();
    element.value = value;

    // Lever uses standard DOM events
    ['input', 'change', 'blur'].forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });

    // For React-based forms
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
    }

    element.blur();
  }

  async handleFileUpload(fileInput, fileData) {
    if (!fileInput || !fileData) return;

    try {
      if (fileData instanceof File) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(fileData);
        fileInput.files = dataTransfer.files;
      } else if (fileData.url) {
        const response = await fetch(fileData.url);
        const blob = await response.blob();
        const file = new File([blob], fileData.name || 'resume.pdf', { type: blob.type });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
      }

      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

    } catch (error) {
      console.error('File upload error:', error);
    }
  }

  triggerEvents() {
    setTimeout(() => {
      const event = new Event('change', { bubbles: true });
      document.dispatchEvent(event);
    }, 100);
  }
}

// Initialize Lever handler
const leverHandler = new LeverHandler();

