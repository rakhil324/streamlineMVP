/**
 * Form Detector
 * Detects form fields on any page and identifies ATS type
 */

class FormDetector {
  constructor() {
    this.atsType = null;
    this.detectedFields = [];
    this.formContainer = null;
  }

  /**
   * Initialize form detection
   */
  init() {
    // Detect ATS type from URL
    this.detectedATS();
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.detectForms());
    } else {
      this.detectForms();
    }

    // Listen for dynamic form additions
    this.observeFormChanges();
  }

  /**
   * Detect ATS type from URL and page characteristics
   */
  detectedATS() {
    const hostname = window.location.hostname.toLowerCase();
    const url = window.location.href.toLowerCase();

    if (hostname.includes('workday.com') || hostname.includes('myworkdayjobs.com') || hostname.endsWith('.myworkdayjobs.com')) {
      this.atsType = 'workday';
    } else if (hostname.includes('greenhouse.io')) {
      this.atsType = 'greenhouse';
    } else if (hostname.includes('lever.co') || hostname.includes('jobs.lever.co')) {
      this.atsType = 'lever';
    } else {
      // Try to detect from page content
      this.atsType = this.detectATSFromContent();
    }
  }

  /**
   * Detect ATS from page content/metadata
   */
  detectATSFromContent() {
    // Check for ATS-specific identifiers in DOM
    if (document.querySelector('[data-automation-id*="workday"]') || 
        document.querySelector('form[action*="workday"]')) {
      return 'workday';
    }
    
    if (document.querySelector('#application_form') || 
        document.querySelector('[data-gtm-form-interact-id]')) {
      // Greenhouse has specific GTM attributes
      return 'greenhouse';
    }
    
    if (document.querySelector('form[action*="lever"]') ||
        document.querySelector('[data-lever-field]')) {
      return 'lever';
    }

    return 'generic';
  }

  /**
   * Detect all form fields on the page
   */
  detectForms() {
    const forms = document.querySelectorAll('form');
    
    if (forms.length === 0) {
      // Check for dynamically loaded forms
      setTimeout(() => this.detectForms(), 1000);
      return;
    }

    forms.forEach(form => {
      const fields = this.extractFields(form);
      this.detectedFields.push(...fields);
    });

    if (this.detectedFields.length > 0) {
      this.notifyBackground();
    }
  }

  /**
   * Extract fields from a form element
   */
  extractFields(form) {
    const fields = [];
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      // Skip hidden and disabled fields
      if (input.type === 'hidden' || input.disabled) {
        return;
      }

      const field = {
        id: input.id || input.name || this.generateFieldId(input),
        name: input.name || input.id,
        type: input.type || input.tagName.toLowerCase(),
        label: this.getFieldLabel(input),
        placeholder: input.placeholder,
        required: input.required || input.hasAttribute('aria-required'),
        selector: this.getUniqueSelector(input),
        value: input.value,
      };

      fields.push(field);
    });

    return fields;
  }

  /**
   * Get label text for a field
   */
  getFieldLabel(field) {
    // Try explicit label association
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent.trim();
    }

    // Try parent label
    let parent = field.parentElement;
    while (parent && parent.tagName !== 'BODY') {
      if (parent.tagName === 'LABEL') {
        return parent.textContent.trim();
      }
      parent = parent.parentElement;
    }

    // Try aria-label
    if (field.getAttribute('aria-label')) {
      return field.getAttribute('aria-label');
    }

    // Try placeholder as fallback
    return field.placeholder || '';
  }

  /**
   * Generate unique selector for a field
   */
  getUniqueSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.name) {
      return `[name="${element.name}"]`;
    }
    
    // Generate path-based selector
    const path = [];
    let current = element;
    while (current && current.tagName !== 'BODY') {
      let selector = current.tagName.toLowerCase();
      if (current.className) {
        const classes = current.className.split(' ').filter(c => c).join('.');
        if (classes) selector += `.${classes}`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  /**
   * Generate a unique ID for a field if it doesn't have one
   */
  generateFieldId(field) {
    const prefix = field.type || 'field';
    const random = Math.random().toString(36).substring(2, 9);
    return `simplify_${prefix}_${random}`;
  }

  /**
   * Observe DOM changes for dynamically added forms
   */
  observeFormChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'FORM' || node.querySelector('form')) {
              shouldRecheck = true;
            }
          }
        });
      });

      if (shouldRecheck) {
        setTimeout(() => this.detectForms(), 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Notify background script about detected forms
   */
  notifyBackground() {
    chrome.runtime.sendMessage({
      type: 'DETECT_FORMS',
      data: {
        atsType: this.atsType,
        fields: this.detectedFields,
        url: window.location.href,
        title: document.title,
      },
    });
  }

  /**
   * Extract job description from page
   */
  extractJobDescription() {
    let jobDescription = '';
    let jobTitle = '';
    let companyName = '';

    // Extract job title
    const titleSelectors = [
      'h1.job-title',
      'h2.job-title',
      'h1[data-automation-id*="title"]',
      'h2[data-automation-id*="title"]',
      'h1',
      'h2',
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.innerText || element.textContent || '';
        if (text.length < 100 && text.length > 5) {
          jobTitle = text;
          break;
        }
      }
    }

    // Extract company name
    const companySelectors = [
      '.company-name',
      '[data-automation-id*="company"]',
      'a.company',
      '.job-company',
    ];
    
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        companyName = element.innerText || element.textContent || '';
        if (companyName) break;
      }
    }

    // Try common job description selectors
    const descriptionSelectors = [
      '[data-automation-id*="description"]',
      '[data-automation-id*="jobPosting"]',
      '.job-description',
      '.job-posting-description',
      '[role="main"]',
      'article',
      '.content',
    ];

    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.innerText || element.textContent || '';
        if (text.length > jobDescription.length) {
          jobDescription = text;
        }
      }
    }

    // Fallback to page title and meta
    if (!jobDescription || jobDescription.length < 50) {
      const title = document.title || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
      jobDescription = `${title} ${metaDescription}`.trim();
    }

    // Extract from page title if not found
    if (!jobTitle) {
      const pageTitle = document.title || '';
      const titleMatch = pageTitle.match(/(.+?)\s*[-|]\s*(.+?)$/);
      if (titleMatch) {
        jobTitle = titleMatch[1].trim();
        if (!companyName) {
          companyName = titleMatch[2].trim();
        }
      } else {
        jobTitle = pageTitle;
      }
    }

    return {
      jobDescription: jobDescription.trim(),
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
    };
  }
}

// Initialize detector
const detector = new FormDetector();
detector.init();

// Listen for job description extraction requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB_DESCRIPTION') {
    const jobInfo = detector.extractJobDescription();
    sendResponse({ success: true, ...jobInfo });
  }
  return true;
});

