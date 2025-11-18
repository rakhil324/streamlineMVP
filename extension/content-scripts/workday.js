/**
 * Workday-specific content script
 * Handles form detection and autofill for Workday ATS
 */

class WorkdayHandler {
  constructor() {
    this.atsType = 'workday';
    this.fields = {};
    this.isAutofilling = false;
    
    this.init();
  }

  init() {
    // Wait for Workday's dynamic content
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }

    // Listen for autofill messages from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Workday content script received message:', message.type);
      
      if (message.type === 'AUTOFILL_DATA') {
        console.log('Starting autofill with data:', message.data);
        // Run autofill asynchronously
        this.autofill(message.data).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          console.error('Autofill error:', error);
          sendResponse({ success: false, error: error.message });
        });
        return true; // Keep channel open for async response
      } else if (message.type === 'EXTRACT_JOB_DESCRIPTION') {
        const jobInfo = this.extractJobDescription();
        sendResponse({ success: true, ...jobInfo });
        return true;
      }
      return false;
    });
    
    // Listen for custom autofill event from injected script
    document.addEventListener('simplifyAutofill', async (event) => {
      const storageKey = event.detail?.storageKey;
      if (!storageKey) return;
      
      console.log('Received autofill event, storage key:', storageKey);
      
      try {
        // Get autofill data from storage
        const result = await chrome.storage.local.get([storageKey]);
        const autofillData = result[storageKey];
        
        if (autofillData) {
          console.log('Got autofill data from storage:', autofillData);
          // Run autofill
          const fillResult = await this.autofill(autofillData);
          
          // Store result
          await chrome.storage.local.set({
            [`autofill_result_${storageKey}`]: fillResult || { success: true, filledCount: 0 }
          });
        }
      } catch (error) {
        console.error('Error in autofill event handler:', error);
      }
    });
    
    // Also check storage periodically for autofill requests (fallback)
    // Check for any active autofill requests
    setInterval(async () => {
      try {
        // Get all storage keys
        const allStorage = await chrome.storage.local.get(null);
        
        // Find active autofill keys
        for (const key in allStorage) {
          if (key.startsWith('autofill_active_')) {
            const activeKey = allStorage[key];
            if (activeKey && !this.isAutofilling) {
              const autofillData = allStorage[activeKey];
              
              if (autofillData) {
                console.log('Found autofill request in storage, executing...');
                const fillResult = await this.autofill(autofillData);
                
                await chrome.storage.local.set({
                  [`autofill_result_${activeKey}`]: fillResult || { success: true, filledCount: 0 }
                });
                
                // Clear active flag
                await chrome.storage.local.remove([key]);
                break; // Only process one at a time
              }
            }
          }
        }
      } catch (error) {
        // Silently fail - this is just a fallback
      }
    }, 1000);
  }

  setup() {
    // Workday uses data-automation-id attributes extensively
    this.detectFields();
    
    // Observe for dynamic form loading (Workday is very dynamic)
    this.observeWorkdayChanges();
  }

  detectFields() {
    // Wait a bit for Workday's React components to render
    setTimeout(() => {
      const form = document.querySelector('form[data-automation-id="jobApplication"]') ||
                   document.querySelector('form') ||
                   document.body;

      // Workday-specific field detection - try multiple selectors
      this.fields = {
        firstName: this.findField([
          'input[data-automation-id="firstName"]',
          'input[data-automation-id*="firstName"]',
          'input[name*="firstName" i]',
          'input[name*="first" i][name*="name" i]',
          'input[aria-label*="first" i][aria-label*="name" i]',
          'input[placeholder*="first" i]',
        ]),
        lastName: this.findField([
          'input[data-automation-id="lastName"]',
          'input[data-automation-id*="lastName"]',
          'input[name*="lastName" i]',
          'input[name*="last" i][name*="name" i]',
          'input[aria-label*="last" i][aria-label*="name" i]',
          'input[placeholder*="last" i]',
        ]),
        email: this.findField([
          'input[data-automation-id="email"]',
          'input[data-automation-id*="email"]',
          'input[type="email"]',
          'input[name*="email" i]',
          'input[aria-label*="email" i]',
          'input[placeholder*="email" i]',
        ]),
        phone: this.findField([
          'input[data-automation-id="phone"]',
          'input[data-automation-id*="phone"]',
          'input[type="tel"]',
          'input[name*="phone" i]',
          'input[aria-label*="phone" i]',
          'input[placeholder*="phone" i]',
        ]),
        location: this.findField([
          'input[data-automation-id="location"]',
          'input[data-automation-id*="location"]',
          'input[name*="location" i]',
          'input[name*="city" i]',
          'input[aria-label*="location" i]',
          'input[aria-label*="city" i]',
          'input[placeholder*="location" i]',
          'input[placeholder*="city" i]',
        ]),
        resume: this.findField([
          'input[type="file"][accept*="pdf"]',
          'input[type="file"][accept*="doc"]',
          'input[type="file"]',
          'input[data-automation-id*="resume"]',
          'input[data-automation-id*="cv"]',
        ]),
        coverLetter: this.findField([
          'textarea[name*="cover" i]',
          'textarea[data-automation-id*="cover" i]',
          'textarea[aria-label*="cover" i]',
        ]),
      };

      console.log('Workday fields detected:', Object.keys(this.fields).filter(key => this.fields[key] !== null));

      // Notify background about detected fields
      this.notifyDetection();
    }, 2000); // Workday needs time to render
  }

  findField(selectors) {
    for (const selector of selectors) {
      try {
        const field = document.querySelector(selector);
        if (field) {
          // Check if visible (not hidden by CSS)
          const style = window.getComputedStyle(field);
          const isVisible = field.offsetParent !== null && 
                           style.display !== 'none' && 
                           style.visibility !== 'hidden' &&
                           style.opacity !== '0';
          
          if (isVisible && !field.disabled && !field.readOnly) {
            return {
              element: field,
              selector: selector,
              type: field.type || field.tagName.toLowerCase(),
            };
          }
        }
      } catch (e) {
        // Invalid selector, skip
        console.warn('Invalid selector:', selector, e);
      }
    }
    return null;
  }

  observeWorkdayChanges() {
    const observer = new MutationObserver(() => {
      // Re-detect fields when DOM changes significantly
      if (!this.isAutofilling) {
        this.detectFields();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-automation-id'],
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
            element: f.element.tagName,
          })),
          url: window.location.href,
        },
      });
    }
  }

  async autofill(data) {
    if (this.isAutofilling) {
      console.log('Autofill already in progress, skipping...');
      return;
    }
    this.isAutofilling = true;

    console.log('Workday autofill started with data:', data);
    console.log('Detected fields:', this.fields);

    try {
      // Re-detect fields in case they weren't found initially
      if (Object.keys(this.fields).length === 0 || Object.values(this.fields).every(f => f === null)) {
        console.log('No fields detected, re-detecting...');
        this.detectFields();
        // Wait for fields to be detected
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      let filledCount = 0;

      // Fill text fields
      if (data.firstName && this.fields.firstName) {
        this.fillField(this.fields.firstName.element, data.firstName);
        filledCount++;
        console.log('Filled firstName:', data.firstName);
      } else if (data.firstName) {
        console.warn('firstName data provided but field not found');
      }
      
      if (data.lastName && this.fields.lastName) {
        this.fillField(this.fields.lastName.element, data.lastName);
        filledCount++;
        console.log('Filled lastName:', data.lastName);
      } else if (data.lastName) {
        console.warn('lastName data provided but field not found');
      }
      
      if (data.email && this.fields.email) {
        this.fillField(this.fields.email.element, data.email);
        filledCount++;
        console.log('Filled email:', data.email);
      } else if (data.email) {
        console.warn('email data provided but field not found');
      }
      
      if (data.phone && this.fields.phone) {
        this.fillField(this.fields.phone.element, data.phone);
        filledCount++;
        console.log('Filled phone:', data.phone);
      } else if (data.phone) {
        console.warn('phone data provided but field not found');
      }
      
      if (data.location && this.fields.location) {
        this.fillField(this.fields.location.element, data.location);
        filledCount++;
        console.log('Filled location:', data.location);
      } else if (data.location) {
        console.warn('location data provided but field not found');
      }

      // Handle file upload (resume)
      if (data.resume && this.fields.resume) {
        await this.handleFileUpload(this.fields.resume.element, data.resume);
        filledCount++;
        console.log('Filled resume');
      }

      // Handle textarea (cover letter)
      if (data.coverLetter && this.fields.coverLetter) {
        this.fillField(this.fields.coverLetter.element, data.coverLetter);
        filledCount++;
        console.log('Filled coverLetter');
      }

      // Trigger input events for Workday's React listeners
      this.triggerEvents();

      console.log(`Autofill complete. Filled ${filledCount} fields.`);

      // Notify background of completion
      chrome.runtime.sendMessage({
        type: 'AUTOFILL_COMPLETE',
        data: {
          atsType: this.atsType,
          filledFields: Object.keys(this.fields).filter(key => this.fields[key] && data[key]),
          filledCount: filledCount,
        },
      }).catch(() => {
        // Ignore errors if background isn't listening
      });

      return { success: true, filledCount: filledCount };
    } catch (error) {
      console.error('Workday autofill error:', error);
      return { success: false, error: error.message, filledCount: 0 };
    } finally {
      this.isAutofilling = false;
    }
  }

  fillField(element, value) {
    if (!element) return;

    // Focus the field
    element.focus();

    // Set value
    element.value = value;

    // Trigger events that Workday expects
    const events = ['input', 'change', 'blur'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });

    // For React-controlled inputs, also set the value property directly
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
      // If fileData is a File object
      if (fileData instanceof File) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(fileData);
        fileInput.files = dataTransfer.files;
      } else if (fileData.url) {
        // Fetch file from URL and create File object
        const response = await fetch(fileData.url);
        const blob = await response.blob();
        const file = new File([blob], fileData.name || 'resume.pdf', { type: blob.type });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
      }

      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

    } catch (error) {
      console.error('File upload error:', error);
    }
  }

  triggerEvents() {
    // Trigger a global change event to ensure Workday's state updates
    setTimeout(() => {
      const event = new Event('change', { bubbles: true });
      document.dispatchEvent(event);
    }, 100);
  }

  /**
   * Extract job description from Workday page
   */
  extractJobDescription() {
    let jobDescription = '';
    let jobTitle = '';
    let companyName = '';

    // Extract job title
    const titleSelectors = [
      '[data-automation-id="jobPostingHeader"] h2',
      '[data-automation-id="jobTitle"]',
      'h1[data-automation-id*="title"]',
      'h2[data-automation-id*="title"]',
      'h1.job-title',
      'h2.job-title',
    ];
    
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        jobTitle = element.innerText || element.textContent || '';
        if (jobTitle) break;
      }
    }

    // Extract company name
    const companySelectors = [
      '[data-automation-id="jobPostingCompany"]',
      '[data-automation-id*="company"]',
      '.company-name',
      'a[data-automation-id*="company"]',
    ];
    
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        companyName = element.innerText || element.textContent || '';
        if (companyName) break;
      }
    }

    // Extract from URL if not found (e.g., salesforce.wd12.myworkdayjobs.com)
    if (!companyName) {
      const hostnameParts = window.location.hostname.split('.');
      if (hostnameParts.length > 0 && !hostnameParts[0].includes('myworkday')) {
        companyName = hostnameParts[0].charAt(0).toUpperCase() + hostnameParts[0].slice(1);
      }
    }

    // Try various Workday selectors for job description
    const descriptionSelectors = [
      '[data-automation-id="jobPostingDescription"]',
      '[data-automation-id="jobPostingHeader"]',
      '.job-posting-description',
      '[role="main"]',
      '.jobdescription',
      'div[data-automation-id*="description"]',
    ];

    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        jobDescription = element.innerText || element.textContent || '';
        if (jobDescription.length > 100) {
          break; // Found a substantial description
        }
      }
    }

    // If not found, try to get from page meta or title
    if (!jobDescription || jobDescription.length < 50) {
      const title = document.title || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
      jobDescription = `${title} ${metaDescription}`.trim();
    }

    // Extract job title from page title if not found
    if (!jobTitle) {
      const pageTitle = document.title || '';
      // Workday titles often have format "Job Title - Company"
      const titleMatch = pageTitle.match(/(.+?)\s*-\s*(.+?)$/);
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

// Initialize Workday handler
console.log('Workday content script loaded');
const workdayHandler = new WorkdayHandler();
console.log('Workday handler initialized');

