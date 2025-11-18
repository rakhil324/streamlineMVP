/**
 * Greenhouse-specific content script
 * Handles form detection and autofill for Greenhouse ATS
 */

class GreenhouseHandler {
  constructor() {
    this.atsType = 'greenhouse';
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
    this.observeGreenhouseChanges();
  }

  detectFields() {
    const form = document.querySelector('#application_form') || document.querySelector('form');
    if (!form) {
      // Greenhouse forms load dynamically
      setTimeout(() => this.detectFields(), 1000);
      return;
    }

    this.fields = {
      firstName: this.findField(['input#first_name', 'input[name="first_name"]']),
      lastName: this.findField(['input#last_name', 'input[name="last_name"]']),
      email: this.findField(['input#email', 'input[type="email"]']),
      phone: this.findField(['input#phone', 'input[type="tel"]']),
      location: this.findField(['input[name*="location"]', 'input[name*="city"]']),
      resume: this.findField(['input[type="file"][name*="resume"]']),
      coverLetter: this.findField(['textarea#cover_letter', 'textarea[name*="cover"]']),
      linkedin: this.findField(['input[name*="linkedin"]', 'input[id*="linkedin"]']),
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

  observeGreenhouseChanges() {
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
      // Fill standard fields
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

      // Greenhouse may need special handling for dropdowns
      this.handleDropdowns(data);

      // Trigger events
      this.triggerEvents();

      chrome.runtime.sendMessage({
        type: 'AUTOFILL_COMPLETE',
        data: {
          atsType: this.atsType,
          filledFields: Object.keys(this.fields).filter(key => this.fields[key] && data[key]),
        },
      });

    } catch (error) {
      console.error('Greenhouse autofill error:', error);
    } finally {
      this.isAutofilling = false;
    }
  }

  fillField(element, value) {
    if (!element) return;

    element.focus();
    element.value = value;

    // Greenhouse uses standard events
    ['input', 'change', 'blur'].forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });

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

  handleDropdowns(data) {
    // Greenhouse often uses custom dropdowns
    // This is a placeholder for dropdown handling logic
    // Would need to detect and interact with Greenhouse's custom dropdown components
  }

  triggerEvents() {
    setTimeout(() => {
      const event = new Event('change', { bubbles: true });
      document.dispatchEvent(event);
    }, 100);
  }
}

// Initialize Greenhouse handler
const greenhouseHandler = new GreenhouseHandler();

