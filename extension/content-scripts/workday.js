/**
 * Workday-specific content script
 * Handles form detection and autofill for Workday ATS
 */

class WorkdayHandler {
  constructor() {
    this.atsType = 'workday';
    this.fields = {};
    this.isAutofilling = false;
    this.containerPrefixCache = new WeakMap();
    
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
      console.log('🔵 ========== AUTOFILL EVENT RECEIVED ==========');
      console.log('Storage key:', storageKey);
      
      if (!storageKey) {
        console.warn('⚠️ No storage key provided in autofill event');
        return;
      }
      
      try {
        // Get autofill data from storage
        console.log('Fetching autofill data from storage...');
        const result = await chrome.storage.local.get([storageKey]);
        const autofillData = result[storageKey];
        
        console.log('Autofill data retrieved:', autofillData);
        
        if (autofillData) {
          console.log('✅ Got autofill data from storage, starting autofill...');
          // Run autofill
          const fillResult = await this.autofill(autofillData);
          console.log('Autofill completed with result:', fillResult);
          
          // Store result
          await chrome.storage.local.set({
            [`autofill_result_${storageKey}`]: fillResult || { success: true, filledCount: 0 }
          });
          console.log('Autofill result stored');
        } else {
          console.warn('⚠️ No autofill data found in storage for key:', storageKey);
        }
      } catch (error) {
        console.error('❌ Error in autofill event handler:', error);
        console.error('Error stack:', error.stack);
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
                console.log('🔵 ========== FALLBACK: Found autofill request in storage ==========');
                console.log('Active key:', activeKey);
                console.log('Autofill data:', autofillData);
                console.log('Executing autofill...');
                
                const fillResult = await this.autofill(autofillData);
                console.log('Autofill result:', fillResult);
                
                await chrome.storage.local.set({
                  [`autofill_result_${activeKey}`]: fillResult || { success: true, filledCount: 0 }
                });
                
                // Clear active flag
                await chrome.storage.local.remove([key]);
                console.log('Cleared active autofill flag');
                break; // Only process one at a time
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in autofill fallback check:', error);
      }
    }, 1000);
  }

  setup() {
    // Workday uses data-automation-id attributes extensively
    this.detectFields();
    
    // Observe for dynamic form loading (Workday is very dynamic)
    this.observeWorkdayChanges();
    
    // Check if we're on a job posting page (not the apply page)
    // If so, extract and save job info so we capture the description
    this.checkAndSaveJobPosting();
  }
  
  /**
   * Check if we're on a job posting page and save the job info
   * This captures the job description before the user clicks apply
   */
  async checkAndSaveJobPosting() {
    const currentUrl = window.location.href;
    console.log('Workday: checkAndSaveJobPosting called, URL:', currentUrl);
    
    // Only run on job posting pages, not on apply pages
    if (currentUrl.includes('/apply/') || currentUrl.includes('/applyManually')) {
      console.log('Workday: On apply page, skipping auto-save (will save after autofill)');
      return;
    }
    
    // Check if this looks like a Workday job posting page
    if (!currentUrl.includes('/job/')) {
      console.log('Workday: Not a job posting page, skipping auto-save');
      return;
    }
    
    console.log('Workday: Detected job posting page, will extract and save job info');
    
    // Wait for Workday's dynamic content to load
    await this.waitForPageContent();
    
    // Extract job info from the job posting page
    const jobInfo = this.extractJobInfo();
    console.log('Workday: Extracted job info from posting page:', jobInfo);
    
    // Only save if we got meaningful data
    if (jobInfo.jobTitle && jobInfo.companyName) {
      console.log('Workday: Saving job info from posting page');
      await this.saveJobToTracker(jobInfo);
    } else {
      console.log('Workday: Could not extract sufficient job info from posting page');
    }
  }
  
  /**
   * Wait for Workday page content to load
   */
  waitForPageContent() {
    return new Promise((resolve) => {
      console.log('Workday: Waiting for page content to load...');
      setTimeout(() => {
        const checkContent = (attempts = 0) => {
          const hasTitle = document.title && document.title.length > 10;
          const hasJobContent = document.querySelector('[data-automation-id*="jobPosting"]') ||
                               document.querySelector('.job-description') ||
                               document.querySelector('article') ||
                               document.body.textContent.length > 1000;
          
          console.log('Workday: Content check attempt', attempts);
          
          if (hasTitle && (hasJobContent || attempts > 5)) {
            console.log('Workday: Page content loaded');
            resolve();
          } else if (attempts < 10) {
            setTimeout(() => checkContent(attempts + 1), 500);
          } else {
            resolve();
          }
        };
        checkContent();
      }, 1500);
    });
  }

  detectFields() {
    // Wait a bit for Workday's React components to render
    // Workday forms can take time to load, so we'll try multiple times
    const attemptDetection = (attempt = 1, maxAttempts = 5) => {
      const form = document.querySelector('form[data-automation-id="jobApplication"]') ||
                   document.querySelector('form') ||
                   document.body;

      // Workday-specific field detection - try multiple selectors
      this.fields = {
        firstName: this.findField([
          'input[data-automation-id="firstName"]',
          'input[data-automation-id*="firstName"]',
          'input[data-automation-id*="first-name"]',
          'input[data-automation-id*="firstname"]',
          'input[name*="firstName" i]',
          'input[name*="first-name" i]',
          'input[name*="firstname" i]',
          'input[name*="first" i][name*="name" i]',
          'input[aria-label*="first" i][aria-label*="name" i]',
          'input[aria-label*="First Name" i]',
          'input[placeholder*="first" i]',
          'input[placeholder*="First Name" i]',
          'input[id*="firstName" i]',
          'input[id*="first-name" i]',
          'input[id*="firstname" i]',
          // Try finding by label text
          'label:has-text("First Name") + input, label:has-text("First Name") ~ input',
          // Try finding input near a label containing "First Name"
          'input[aria-labelledby]',
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
        state: this.findField([
          'select[data-automation-id*="state" i]',
          'select[name*="state" i]',
          'select[id*="state" i]',
          'input[data-automation-id*="state" i]',
          'input[name*="state" i]',
          'input[id*="state" i]',
          'input[aria-label*="state" i]',
          'input[aria-label*="province" i]',
          // Workday pattern: address--state
          'input[id*="address" i][id*="state" i]',
          'select[id*="address" i][id*="state" i]',
          'input[name*="address" i][name*="state" i]',
          'select[name*="address" i][name*="state" i]',
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

      const detectedFields = Object.keys(this.fields).filter(key => this.fields[key] !== null);
      console.log(`Workday fields detected (attempt ${attempt}/${maxAttempts}):`, detectedFields);

      // If we found some fields or this is our last attempt, notify
      if (detectedFields.length > 0 || attempt >= maxAttempts) {
        this.notifyDetection();
      } else if (attempt < maxAttempts) {
        // Try again after a delay
        setTimeout(() => attemptDetection(attempt + 1, maxAttempts), 1000);
      }
    };

    // Start detection after initial delay
    setTimeout(() => attemptDetection(1, 5), 1000); // Start after 1 second, retry up to 5 times
  }

  findField(selectors) {
    for (const selector of selectors) {
      try {
        // Handle special selectors
        if (selector.includes(':has-text')) {
          // Find by label text - search for labels containing the text
          const labels = Array.from(document.querySelectorAll('label'));
          for (const label of labels) {
            const labelText = (label.textContent || label.innerText || '').toLowerCase();
            if (labelText.includes('first name') && selector.includes('First Name')) {
              // Try to find associated input
              const inputId = label.getAttribute('for');
              if (inputId) {
                const field = document.getElementById(inputId);
                if (field && this.isFieldValid(field)) {
                  return {
                    element: field,
                    selector: `label[for="${inputId}"]`,
                    type: field.type || field.tagName.toLowerCase(),
                  };
                }
              }
              // Try finding input within or after label
              const input = label.querySelector('input') || label.nextElementSibling;
              if (input && this.isFieldValid(input)) {
                return {
                  element: input,
                  selector: 'label + input',
                  type: input.type || input.tagName.toLowerCase(),
                };
              }
            }
          }
          continue;
        }
        
        const field = document.querySelector(selector);
        if (field && this.isFieldValid(field)) {
          return {
            element: field,
            selector: selector,
            type: field.type || field.tagName.toLowerCase(),
          };
        }
      } catch (e) {
        // Invalid selector, skip
        console.warn('Invalid selector:', selector, e);
      }
    }
    
    // Additional fallback: search all inputs and check their labels/aria-labels
    if (selectors.some(s => s.includes('firstName') || s.includes('first'))) {
      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      for (const input of allInputs) {
        if (!this.isFieldValid(input)) continue;
        
        // Check various attributes
        const automationId = input.getAttribute('data-automation-id') || '';
        const name = input.getAttribute('name') || '';
        const id = input.getAttribute('id') || '';
        const ariaLabel = input.getAttribute('aria-label') || '';
        const placeholder = input.getAttribute('placeholder') || '';
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        // Check if any attribute suggests this is a first name field
        const searchText = `${automationId} ${name} ${id} ${ariaLabel} ${placeholder}`.toLowerCase();
        if (searchText.includes('first') && (searchText.includes('name') || searchText.includes('firstname'))) {
          return {
            element: input,
            selector: 'fallback-search',
            type: input.type || 'text',
          };
        }
        
        // Check aria-labelledby
        if (ariaLabelledBy) {
          const labelElement = document.getElementById(ariaLabelledBy);
          if (labelElement) {
            const labelText = (labelElement.textContent || labelElement.innerText || '').toLowerCase();
            if (labelText.includes('first') && labelText.includes('name')) {
              return {
                element: input,
                selector: `aria-labelledby="${ariaLabelledBy}"`,
                type: input.type || 'text',
              };
            }
          }
        }
      }
    }
    
    return null;
  }

  isFieldValid(field) {
    if (!field) return false;
    
    // Check if visible (not hidden by CSS)
    const style = window.getComputedStyle(field);
    const isVisible = field.offsetParent !== null && 
                     style.display !== 'none' && 
                     style.visibility !== 'hidden' &&
                     style.opacity !== '0';
    
    return isVisible && !field.disabled && !field.readOnly;
  }

  /**
   * Helper: derive a field group prefix from an element id (e.g. workExperience-23--)
   */
  getFieldGroupPrefixFromId(id) {
    if (!id) return null;
    if (id.includes('--')) {
      const [prefix] = id.split('--');
      return `${prefix}--`;
    }
    const dashParts = id.split('-');
    if (dashParts.length >= 2) {
      return `${dashParts.slice(0, 2).join('-')}-`;
    }
    return null;
  }

  /**
   * Helper: get field group prefix from an element
   */
  getFieldGroupPrefix(element) {
    if (!element) return null;
    return this.getFieldGroupPrefixFromId(element.id);
  }

  /**
   * Helper: cache & return a container's field group prefix
   */
  getContainerFieldPrefix(container) {
    if (!container) return null;
    if (this.containerPrefixCache.has(container)) {
      return this.containerPrefixCache.get(container);
    }
    
    let prefix = null;
    const sampleField = container.querySelector('[id*="--"]') || container.querySelector('input[id], select[id], textarea[id]');
    if (sampleField) {
      prefix = this.getFieldGroupPrefix(sampleField);
    }
    
    this.containerPrefixCache.set(container, prefix);
    return prefix;
  }

  /**
   * Helper: expand a minimal container to include other inputs that share the same id prefix
   */
  expandContainerFromField(field) {
    if (!field) return null;
    
    const prefix = this.getFieldGroupPrefix(field);
    let container = field.closest('[data-automation-id], [role="group"], fieldset, section, form, article, div');
    let depth = 0;
    
    while (container && depth < 8) {
      if (prefix) {
        const relatedSelector = [
          `input[id^="${prefix}"]`,
          `textarea[id^="${prefix}"]`,
          `select[id^="${prefix}"]`,
          `button[id^="${prefix}"]`,
          `div[id^="${prefix}"]`
        ].join(', ');
        const relatedCount = container.querySelectorAll(relatedSelector).length;
        if (relatedCount >= 3) {
          return container;
        }
      } else {
        const fieldCount = container.querySelectorAll('input, textarea, select').length;
        if (fieldCount >= 3) {
          return container;
        }
      }
      
      container = container.parentElement;
      depth += 1;
    }
    
    return field.closest('section, form, fieldset') || field.parentElement || document.body;
  }

  /**
   * Helper: get or infer a container prefix and cache it
   */
  getOrInferContainerPrefix(container) {
    if (!container) return null;
    let prefix = this.getContainerFieldPrefix(container);
    if (!prefix) {
      const probe = container.querySelector('input[id], select[id], textarea[id], button[id], div[id]');
      if (probe) {
        prefix = this.getFieldGroupPrefix(probe);
        if (prefix) {
          this.containerPrefixCache.set(container, prefix);
        }
      }
    }
    return prefix;
  }

  /**
   * Helper: normalize assorted metadata strings for keyword matching
   */
  normalizeFieldMetadata(...parts) {
    return parts
      .filter(Boolean)
      .map(part => part
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_\-]+/g, ' ')
        .trim()
        .toLowerCase()
      )
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Helper: score how likely an element belongs to a work experience section
   */
  scoreExperienceField(element) {
    if (!element) return -Infinity;
    const metadata = this.normalizeFieldMetadata(
      element.id,
      element.name,
      element.getAttribute('aria-label'),
      element.getAttribute('data-automation-id'),
      element.placeholder
    );
    if (!metadata) return -Infinity;

    let score = 0;
    const prefix = (this.getFieldGroupPrefix(element) || '').toLowerCase();

    const strongTerms = [
      'work experience',
      'workexperience',
      'employment',
      'employment history',
      'job history',
      'work history'
    ];
    const keywords = [
      'experience',
      'employment',
      'job',
      'position',
      'employer',
      'company',
      'role',
      'title'
    ];
    const penalties = ['network', 'linkedin', 'social'];

    if (prefix.includes('workexperience') || prefix.includes('employmentHistory'.toLowerCase())) {
      score += 3;
    }

    if (strongTerms.some(term => metadata.includes(term))) {
      score += 3;
    }

    keywords.forEach(keyword => {
      if (metadata.includes(keyword)) {
        score += 1;
      }
    });

    if (penalties.some(term => metadata.includes(term))) {
      score -= 4;
    }

    return score;
  }

  /**
   * Helper: set a native value on an input/textarea without triggering recursive dropdown logic
   */
  setNativeInputValue(element, value) {
    if (!element) return;
    const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  }

  /**
   * Helper: format month number to two digits (defaults to January if invalid)
   */
  formatMonth(monthNumber, fallback = '01') {
    if (!monthNumber) return fallback;
    const num = parseInt(monthNumber, 10);
    if (Number.isNaN(num) || num < 1 || num > 12) return fallback;
    return num.toString().padStart(2, '0');
  }

  /**
   * Helper: parse duration text like "Jan 2020 – Present"
   */
  parseDurationRange(duration) {
    if (!duration || typeof duration !== 'string') return null;
    
    const normalized = duration.replace(/\u2013|\u2014/g, '-');
    const [startRaw, endRaw] = normalized.split(/\s*-\s*/);
    
    const monthMap = {
      january: '01', jan: '01',
      february: '02', feb: '02',
      march: '03', mar: '03',
      april: '04', apr: '04',
      may: '05',
      june: '06', jun: '06',
      july: '07', jul: '07',
      august: '08', aug: '08',
      september: '09', sept: '09', sep: '09',
      october: '10', oct: '10',
      november: '11', nov: '11',
      december: '12', dec: '12'
    };
    
    const parsePart = (part, isEnd = false) => {
      if (!part) return {};
      const lower = part.trim().toLowerCase();
      const isPresent = /present|current|now/.test(lower);
      const today = new Date();
      
      let month = null;
      for (const key of Object.keys(monthMap)) {
        if (lower.includes(key)) {
          month = monthMap[key];
          break;
        }
      }
      
      const yearMatch = part.match(/(19|20)\d{2}/);
      let year = yearMatch ? yearMatch[0] : null;
      
      if (isPresent) {
        month = this.formatMonth(today.getMonth() + 1, isEnd ? '12' : '01');
        year = today.getFullYear().toString();
      }
      
      return {
        month: month || (isEnd ? '12' : '01'),
        year,
        isPresent
      };
    };
    
    const startPart = parsePart(startRaw || duration, false);
    const endPart = endRaw ? parsePart(endRaw, true) : { isPresent: false };
    
    return {
      startMonth: startPart.month,
      startYear: startPart.year,
      endMonth: endPart.month,
      endYear: endPart.year,
      endIsPresent: !!endPart.isPresent
    };
  }

  /**
   * Helper: resolve degree dropdown value based on degree + field of study
   */
  resolveDegreeDropdownValue(degree, fieldOfStudy) {
    const field = (fieldOfStudy || '').toLowerCase();
    
    // Normalize degree string - remove apostrophes and extra spaces
    const normalizedDegree = (degree || '').toLowerCase().replace(/[']/g, '').replace(/\s+/g, ' ').trim();
    
    console.log(`  📋 Resolving degree: "${degree}" (normalized: "${normalizedDegree}"), field: "${fieldOfStudy}"`);
    
    if (normalizedDegree.includes('bachelor')) {
      // Determine if it's Bachelor of Arts or Bachelor of Science
      // Check both the degree string and field of study for "science" indicators
      const isScience = normalizedDegree.includes('science') || 
                       field.includes('science') || 
                       field.includes('computer') ||
                       field.includes('engineering') ||
                       field.includes('technology');
      const isArts = normalizedDegree.includes('art') || field.includes('art');
      
      const result = isArts ? 'Bachelor of Arts' : 'Bachelor of Science';
      console.log(`  ✅ Resolved to: "${result}"`);
      return result;
    }
    if (normalizedDegree.includes('master')) {
      if (normalizedDegree.includes('business')) {
        return 'Master of Business Administration';
      }
      const isArts = normalizedDegree.includes('art') || field.includes('art');
      return isArts ? 'Master of Arts' : 'Master of Science';
    }
    if (normalizedDegree.includes('associate')) {
      const isArts = normalizedDegree.includes('art') || field.includes('art');
      return isArts ? 'Associate of Arts' : 'Associate of Science';
    }
    
    console.log(`  ⚠️ No match found, returning original: "${degree}"`);
    return degree || fieldOfStudy || '';
  }

  /**
   * Helper: resolve field of study dropdown value for known synonyms
   */
  resolveFieldOfStudyValue(fieldOfStudy) {
    if (!fieldOfStudy) return '';
    const normalized = fieldOfStudy.toLowerCase();
    if (normalized.includes('computer')) {
      return 'Computer and Information Science';
    }
    return fieldOfStudy;
  }

  /**
   * Helper: simple delay utility
   */
  async delay(ms = 200) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: search globally for fields that share a prefix (e.g. workExperience-23--)
   */
  findFieldGloballyWithPrefix(selectors, prefix) {
    if (!prefix) return null;
    
    for (const selector of selectors) {
      let candidates = [];
      try {
        candidates = Array.from(document.querySelectorAll(selector));
      } catch (error) {
        console.log(`      ⚠️ Global selector "${selector}" failed:`, error.message);
        continue;
      }
      
      const match = candidates.find(field => {
        const id = field.id || '';
        if (!id.startsWith(prefix)) return false;
        const isButtonOrDiv = field.tagName === 'BUTTON' || field.tagName === 'DIV';
        const isValid = isButtonOrDiv ? (field.offsetParent !== null && !field.disabled) : this.isFieldValid(field);
        return isValid;
      });
      
      if (match) {
        console.log(`      ✅ Found field globally with prefix "${prefix}" using selector "${selector}"`);
        return match;
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

  /**
   * Extract job information from Workday page
   */
  extractJobInfo() {
    let jobTitle = '';
    let companyName = '';
    let jobDescription = '';
    let location = '';

    console.log('Workday: Extracting job info...');
    
    // PRIORITY 0: Extract job title from URL (most reliable - doesn't change dynamically)
    // URL pattern: /job/Location/JobTitle_JobID
    // Example: /job/San-Jose/XMLNAME-2026-Intern---Generative-AI-Software-Engineer_R162233
    const urlPath = window.location.pathname;
    console.log('Workday: URL path:', urlPath);
    
    const jobPathMatch = urlPath.match(/\/job\/([^\/]+)\/([^\/]+)/);
    if (jobPathMatch) {
      const locationFromUrl = jobPathMatch[1];
      let titleFromUrl = jobPathMatch[2];
      
      console.log('Workday: Raw title from URL:', titleFromUrl);
      
      // Clean up the title:
      // 1. Remove job ID suffix (e.g., _R162233)
      titleFromUrl = titleFromUrl.replace(/_[A-Z0-9]+$/, '');
      
      // 2. Remove XMLNAME- prefix if present
      titleFromUrl = titleFromUrl.replace(/^XMLNAME-/i, '');
      
      // 3. Replace --- with " - " (used for separators in the title)
      titleFromUrl = titleFromUrl.replace(/---/g, ' - ');
      
      // 4. Replace remaining single hyphens with spaces
      titleFromUrl = titleFromUrl.replace(/-/g, ' ');
      
      // 5. Clean up extra spaces
      titleFromUrl = titleFromUrl.replace(/\s+/g, ' ').trim();
      
      if (titleFromUrl.length > 5) {
        jobTitle = titleFromUrl;
        console.log('Workday: Extracted title from URL:', jobTitle);
      }
      
      // Also extract location from URL
      if (locationFromUrl) {
        location = locationFromUrl.replace(/-/g, ' ').trim();
        console.log('Workday: Extracted location from URL:', location);
      }
    }
    
    // PRIORITY 1: Extract job title from page title (if URL didn't work or title is generic)
    const pageTitle = document.title || '';
    console.log('Workday: Page title:', pageTitle);
    
    // Only use page title if URL extraction failed and page title is not generic
    const genericTitles = ['careers', 'jobs', 'apply', 'workday', 'home', 'search'];
    const isGenericTitle = genericTitles.some(g => pageTitle.toLowerCase() === g || pageTitle.toLowerCase().startsWith(g + ' '));
    
    // Only use page title if URL extraction didn't work AND page title is not generic
    if (!jobTitle && pageTitle && !isGenericTitle) {
      // Try to extract job title from page title
      // Common formats: "Job Title | Company" or "Job Title - Company" or just "Job Title"
      
      // First check if it contains a separator (|, -, –)
      const separatorMatch = pageTitle.match(/^(.+?)\s*[\|\–]\s*(.+?)$/);
      if (separatorMatch && separatorMatch[1].length > 3) {
        const firstPart = separatorMatch[1].trim();
        const secondPart = separatorMatch[2].trim();
        
        // Check if the second part looks like company name or part of job title
        const jobKeywords = ['engineer', 'software', 'developer', 'intern', 'manager', 'analyst', 'specialist', 'architect', 'designer', 'scientist', 'ai', 'ml'];
        const secondPartLower = secondPart.toLowerCase();
        const isJobRelated = jobKeywords.some(keyword => secondPartLower.includes(keyword));
        
        if (isJobRelated) {
          // Both parts are job title (e.g., "2026 Intern | Generative AI Software Engineer")
          jobTitle = pageTitle.replace(/\s*[\|\–]\s*/g, ' - ').trim();
          console.log('Workday: Using combined page title as job title:', jobTitle);
        } else {
          // First part is title, second is company
          jobTitle = firstPart;
          if (!companyName) {
            companyName = secondPart;
          }
          console.log('Workday: Extracted title from page title separator:', jobTitle);
        }
      }
      // Check for hyphen separator (but not en-dash)
      else if (pageTitle.includes(' - ')) {
        const parts = pageTitle.split(' - ');
        if (parts.length >= 2) {
          // Check if this looks like "Title - Company" or "Full Job Title"
          const firstPart = parts[0].trim();
          const restParts = parts.slice(1).join(' - ').trim();
          
          // If the parts after first hyphen contain job keywords, use full title
          const jobKeywords = ['engineer', 'software', 'developer', 'intern', 'manager', 'analyst', 'specialist', 'architect', 'designer', 'scientist', 'ai', 'ml', 'generative'];
          const restLower = restParts.toLowerCase();
          const isJobRelated = jobKeywords.some(keyword => restLower.includes(keyword));
          
          if (isJobRelated) {
            // Full title includes the rest (e.g., "2026 Intern - Generative AI Software Engineer")
            jobTitle = pageTitle;
            console.log('Workday: Using full page title as job title:', jobTitle);
          } else {
            // First part is title
            jobTitle = firstPart;
            console.log('Workday: Extracted title before hyphen:', jobTitle);
          }
        }
      }
      // No separator found, use the whole title if it looks reasonable
      else if (pageTitle.length > 5 && pageTitle.length < 200 && 
               !pageTitle.toLowerCase().includes('sign') && 
               !pageTitle.toLowerCase().includes('menu')) {
        jobTitle = pageTitle;
        console.log('Workday: Using full page title (no separator):', jobTitle);
      }
    } else if (!jobTitle && isGenericTitle) {
      console.log('Workday: Skipping generic page title:', pageTitle);
    }

    // PRIORITY 2: Try DOM selectors if page title didn't work
    if (!jobTitle) {
      const titleSelectors = [
        'h1[data-automation-id="jobPostingHeader"]',
        'h1[data-automation-id="jobTitle"]',
        'h1',
        '[data-automation-id="jobTitle"]',
        '.css-14o6bo2', // Common Workday job title class
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          const text = element.textContent.trim();
          if (text.length > 0 && text.length < 200 && !text.includes('Sign') && !text.includes('Menu')) {
            jobTitle = text;
            console.log('Workday: Found title via DOM selector:', selector);
            break;
          }
        }
      }
    }

    // Try to find company name from page or URL
    const companySelectors = [
      '[data-automation-id="companyName"]',
      '.company-name',
    ];

    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        companyName = element.textContent.trim();
        break;
      }
    }

    // Fallback: extract company from URL (e.g., company.wd5.myworkdayjobs.com)
    if (!companyName) {
      const hostname = window.location.hostname;
      const match = hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com/i) ||
                   hostname.match(/^([^.]+)\.workday\.com/i);
      if (match) {
        companyName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    }

    // Try to find location
    const locationSelectors = [
      '[data-automation-id="location"]',
      '[data-automation-id="jobLocation"]',
    ];

    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        location = element.textContent.trim();
        break;
      }
    }

    // Universal approach: Get all paragraph/text elements and join with newlines
    // This preserves formatting and works across all Workday pages
    
    // Try to find the job posting content container first
    const contentSelectors = [
      '[data-automation-id="jobPostingDescription"]',
      '[data-automation-id="jobPostingDetails"]', 
      '[data-automation-id*="jobPosting"]',
      '[data-automation-id*="description"]',
      'article',
      '[role="main"]',
      'main'
    ];
    
    let contentContainer = null;
    for (const selector of contentSelectors) {
      const el = document.querySelector(selector);
      if (el && el.innerText && el.innerText.length > 200) {
        contentContainer = el;
        console.log('Workday: Found content container with selector:', selector);
        break;
      }
    }
    
    if (!contentContainer) {
      contentContainer = document.body;
      console.log('Workday: Using document.body as fallback');
    }
    
    // Get all text-containing elements (paragraphs, divs, list items, etc.)
    const textElements = contentContainer.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, div > span, [data-automation-id]');
    const textParts = [];
    const seenText = new Set(); // Avoid duplicates
    
    for (const el of textElements) {
      // Skip if element has many child elements (it's a container, not content)
      if (el.children.length > 3 && el.tagName === 'DIV') continue;
      
      // Get direct text content
      let text = '';
      
      // For elements with mostly text content, get innerText
      if (el.children.length === 0 || el.tagName === 'P' || el.tagName === 'LI' || el.tagName.startsWith('H')) {
        text = (el.innerText || el.textContent || '').trim();
      } else {
        // For other elements, only get direct text nodes
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
          }
        }
        text = text.trim();
      }
      
      // Skip empty, very short, or navigation-like text
      if (!text || text.length < 10) continue;
      if (seenText.has(text)) continue;
      
      // Skip common navigation/UI elements
      const lowerText = text.toLowerCase();
      const skipPhrases = ['skip to', 'sign in', 'search for jobs', 'apply', 'back to'];
      if (skipPhrases.some(phrase => lowerText.startsWith(phrase))) continue;
      
      seenText.add(text);
      textParts.push(text);
    }
    
    if (textParts.length > 0) {
      jobDescription = textParts.join('\n\n');
      console.log('Workday: Extracted', textParts.length, 'text sections');
    } else {
      // Ultimate fallback: just get innerText from container
      jobDescription = (contentContainer.innerText || '').trim();
      console.log('Workday: Using raw innerText fallback');
    }
    
    // Limit length
    jobDescription = jobDescription.substring(0, 8000);
    console.log('Workday: Final job description length:', jobDescription.length);
    
    if (!jobDescription) {
      console.log('Workday: Could not find job description');
    }

    console.log('Workday: Extracted job info', {
      jobTitle: jobTitle || 'Not found',
      companyName: companyName || 'Not found',
      location: location || 'Not found',
      descriptionLength: jobDescription.length
    });

    return { jobTitle, companyName, jobDescription, location };
  }

  /**
   * Save job to application tracker via background script
   */
  async saveJobToTracker(jobInfo) {
    try {
      if (!jobInfo.jobTitle || !jobInfo.companyName) {
        console.log('Workday: Missing job info, skipping tracker save');
        return;
      }

      console.log('Workday: Saving job to application tracker...');
      const response = await chrome.runtime.sendMessage({
        type: 'saveJob',
        jobInfo: {
          title: jobInfo.jobTitle,
          company: jobInfo.companyName,
          location: jobInfo.location || '',
          description: jobInfo.jobDescription || '',
          jobUrl: window.location.href
        }
      });

      if (response && response.success) {
        console.log('Workday: Job saved to tracker successfully');
      } else {
        console.warn('Workday: Failed to save job to tracker:', response?.error);
      }
    } catch (error) {
      console.warn('Workday: Error saving job to tracker:', error);
    }
  }

  /**
   * Generate AI answer for essay questions
   */
  async generateLLMAnswer(questionText, jobInfo) {
    try {
      if (!questionText) {
        console.log('Workday: No question text provided');
        return '';
      }

      console.log('Workday: Generating AI answer for question:', questionText.substring(0, 100));

      // Call AI API through background script
      const response = await chrome.runtime.sendMessage({
        type: 'generateAnswer',
        question: questionText,
        jobDescription: jobInfo.jobDescription || '',
        jobTitle: jobInfo.jobTitle || '',
        companyName: jobInfo.companyName || ''
      });

      if (response && response.success && response.answer) {
        console.log('Workday: AI generated answer (first 100 chars):', response.answer.substring(0, 100));
        return response.answer;
      } else {
        console.warn('Workday: AI answer generation failed:', response?.error);
        return '';
      }
    } catch (error) {
      console.error('Workday: Error generating AI answer:', error);
      return '';
    }
  }

  async autofill(data) {
    if (this.isAutofilling) {
      console.log('Autofill already in progress, skipping...');
      return;
    }
    this.isAutofilling = true;

    console.log('🔵 ========== WORKDAY AUTOFILL DEBUG START ==========');
    console.log('📥 Autofill data received:', JSON.stringify(data, null, 2));
    console.log('🔍 Detected fields:', this.fields);
    
    // Debug: Log all detected fields with their details
    Object.keys(this.fields).forEach(key => {
      const field = this.fields[key];
      if (field) {
        console.log(`  ✓ ${key}:`, {
          selector: field.selector,
          type: field.type,
          element: field.element,
          currentValue: field.element?.value || 'empty',
          id: field.element?.id || 'no-id',
          name: field.element?.name || 'no-name',
          'data-automation-id': field.element?.getAttribute('data-automation-id') || 'no-automation-id',
          'aria-label': field.element?.getAttribute('aria-label') || 'no-aria-label',
          placeholder: field.element?.placeholder || 'no-placeholder',
          visible: field.element?.offsetParent !== null,
          disabled: field.element?.disabled,
          readOnly: field.element?.readOnly
        });
      } else {
        console.log(`  ✗ ${key}: NOT FOUND`);
      }
    });
    
    // Debug: Search for all input fields on the page
    console.log('🔍 Searching for ALL input fields on page...');
    const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    console.log(`Found ${allInputs.length} total input elements`);
    allInputs.forEach((input, index) => {
      if (input.offsetParent !== null) { // Only visible inputs
        const label = input.closest('label')?.textContent?.trim() || 
                     document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ||
                     input.getAttribute('aria-label') ||
                     input.placeholder ||
                     'no-label';
        console.log(`  Input ${index + 1}:`, {
          tag: input.tagName,
          type: input.type,
          id: input.id || 'no-id',
          name: input.name || 'no-name',
          'data-automation-id': input.getAttribute('data-automation-id') || 'no-automation-id',
          label: label.substring(0, 50),
          value: input.value || 'empty',
          required: input.required,
          'aria-required': input.getAttribute('aria-required')
        });
      }
    });
    
    // Debug: Look specifically for "City" field
    console.log('🔍 Searching specifically for CITY field...');
    const citySelectors = [
      'input[data-automation-id*="city" i]',
      'input[name*="city" i]',
      'input[id*="city" i]',
      'input[aria-label*="city" i]',
      'input[placeholder*="city" i]'
    ];
    citySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.offsetParent !== null) {
          console.log(`  Found potential City field with selector "${selector}":`, {
            element: el,
            value: el.value || 'empty',
            id: el.id,
            name: el.name,
            'data-automation-id': el.getAttribute('data-automation-id'),
            'aria-label': el.getAttribute('aria-label'),
            required: el.required
          });
        }
      });
    });

    try {
      // Re-detect fields in case they weren't found initially
      if (Object.keys(this.fields).length === 0 || Object.values(this.fields).every(f => f === null)) {
        console.log('No fields detected, re-detecting...');
        this.detectFields();
        // Wait for fields to be detected
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      let filledCount = 0;

      // Fill text fields - wait for each to complete
      if (data.firstName && this.fields.firstName) {
        console.log(`🔵 Attempting to fill firstName with value: "${data.firstName}"`);
        console.log(`  Field element:`, this.fields.firstName.element);
        console.log(`  Current value before fill: "${this.fields.firstName.element.value || 'empty'}"`);
        const filled = await this.fillField(this.fields.firstName.element, data.firstName);
        console.log(`  Fill result: ${filled}`);
        console.log(`  Value after fill: "${this.fields.firstName.element.value || 'empty'}"`);
        if (filled) {
          filledCount++;
          console.log('✅ Filled firstName:', data.firstName);
        } else {
          console.warn('⚠️ Failed to fill firstName field');
        }
      } else if (data.firstName) {
        console.warn('firstName data provided but field not found. Available fields:', Object.keys(this.fields));
        // Try to re-detect fields
        this.detectFields();
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.fields.firstName) {
          const filled = await this.fillField(this.fields.firstName.element, data.firstName);
          if (filled) {
            filledCount++;
            console.log('✅ Filled firstName after re-detection:', data.firstName);
          }
        }
      }
      
      if (data.lastName && this.fields.lastName) {
        const filled = await this.fillField(this.fields.lastName.element, data.lastName);
        if (filled) {
          filledCount++;
          console.log('✅ Filled lastName:', data.lastName);
        }
      } else if (data.lastName) {
        console.warn('lastName data provided but field not found');
      }
      
      if (data.email && this.fields.email) {
        const filled = await this.fillField(this.fields.email.element, data.email);
        if (filled) {
          filledCount++;
          console.log('✅ Filled email:', data.email);
        }
      } else if (data.email) {
        console.warn('email data provided but field not found');
      }
      
      if (data.phone && this.fields.phone) {
        // Format phone number to (xxx) xxx-xxxx format
        const formattedPhone = this.formatPhoneNumber(data.phone);
        console.log(`🔵 Formatting phone: "${data.phone}" -> "${formattedPhone}"`);
        const filled = await this.fillField(this.fields.phone.element, formattedPhone);
        if (filled) {
          filledCount++;
          console.log('✅ Filled phone:', formattedPhone);
        }
      } else if (data.phone) {
        console.warn('phone data provided but field not found');
        // Try to find phone field dynamically
        const phoneField = this.findField([
          'input[data-automation-id*="phone" i]',
          'input[name*="phone" i]',
          'input[type="tel"]',
        ]);
        if (phoneField) {
          const formattedPhone = this.formatPhoneNumber(data.phone);
          const filled = await this.fillField(phoneField.element, formattedPhone);
          if (filled) {
            filledCount++;
            console.log('✅ Filled phone (found dynamically):', formattedPhone);
          }
        }
      }
      
      // Handle location - might need to split into city, state, etc.
      if (data.location) {
        console.log(`🔵 Attempting to fill location with value: "${data.location}"`);
        
        // Parse location string (e.g., "Ashburn, VA, USA" or "Ashburn, Virginia" -> city: "Ashburn", state: "VA" or "Virginia")
        const locationParts = data.location.split(',').map(p => p.trim());
        const city = locationParts[0] || '';
        let state = locationParts[1] || '';
        
        // If state is a full name (e.g., "Virginia"), we'll try to match it in the dropdown
        // The dropdown matching logic will handle both abbreviations and full names
        
        // First try the location field - check if it's a city field
        if (this.fields.location) {
          const fieldElement = this.fields.location.element;
          const fieldId = fieldElement.id || '';
          const fieldName = fieldElement.name || '';
          
          // Check if this is a city field (case-insensitive)
          const isCityField = fieldId.toLowerCase().includes('city') || 
                             fieldName.toLowerCase().includes('city') ||
                             fieldId === 'address--city' || // Common Workday pattern
                             fieldName === 'city';
          
          console.log(`  Found location field:`, this.fields.location.element);
          console.log(`  Field ID: "${fieldId}", Field Name: "${fieldName}"`);
          console.log(`  Is city field: ${isCityField}`);
          
          // If it's a city field, extract just the city name
          let valueToFill = data.location;
          if (isCityField) {
            // Extract city from location (e.g., "Ashburn, VA, USA" -> "Ashburn")
            valueToFill = city;
            console.log(`  ✅ Extracted city: "${valueToFill}" from location: "${data.location}"`);
          } else {
            console.log(`  ⚠️ Not detected as city field, using full location string: "${valueToFill}"`);
          }
          
          const filled = await this.fillField(this.fields.location.element, valueToFill);
          if (filled) {
            filledCount++;
            console.log(`✅ Filled ${isCityField ? 'city' : 'location'}:`, valueToFill);
          } else {
            console.warn(`⚠️ Failed to fill ${isCityField ? 'city' : 'location'} field`);
          }
        } else {
          console.warn('⚠️ location field not found in detected fields');
          
          // Try to find city field specifically
          console.log('🔍 Searching for City field...');
          const cityField = this.findField([
            'input[data-automation-id*="city" i]',
            'input[name*="city" i]',
            'input[id*="city" i]',
            'input[aria-label*="city" i]',
            'input[placeholder*="city" i]'
          ]);
          
          if (cityField) {
            console.log('✅ Found City field:', cityField);
            // Extract city from location (e.g., "Ashburn, VA, USA" -> "Ashburn")
            const cityValue = city;
            console.log(`  Extracted city: "${cityValue}" from location: "${data.location}"`);
            const filled = await this.fillField(cityField.element, cityValue);
            if (filled) {
              filledCount++;
              console.log('✅ Filled city:', cityValue);
            }
          } else {
            console.warn('⚠️ City field also not found');
            
            // Try to find any field that might be related to location
            const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
            for (const input of allInputs) {
              if (input.offsetParent === null) continue; // Skip hidden
              
              const label = input.closest('label')?.textContent?.trim() || 
                           document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ||
                           input.getAttribute('aria-label') ||
                           input.placeholder ||
                           '';
              
              const searchText = `${label} ${input.id} ${input.name} ${input.getAttribute('data-automation-id')}`.toLowerCase();
              
              if (searchText.includes('city') || searchText.includes('location') || searchText.includes('address')) {
                console.log(`  Found potential location-related field:`, {
                  element: input,
                  label: label,
                  id: input.id,
                  name: input.name,
                  'data-automation-id': input.getAttribute('data-automation-id'),
                  required: input.required
                });
                
                // Try filling it
                const cityValue = city;
                const filled = await this.fillField(input, cityValue);
                if (filled) {
                  filledCount++;
                  console.log(`✅ Filled location-related field with: "${cityValue}"`);
                  break;
                }
              }
            }
          }
        }
        
        // Fill State field if available (prioritize select/dropdown)
        if (state) {
          console.log(`🔵 Attempting to fill state with value: "${state}"`);
          // First check if we have a detected state field
          if (this.fields.state) {
            console.log(`  State field type: ${this.fields.state.element.tagName}`);
            const stateElement = this.fields.state.element;
            
            // If it's a SELECT, use fillSelectDropdown
            if (stateElement.tagName === 'SELECT') {
              console.log('  State field is a SELECT element, using fillSelectDropdown');
              const filled = await this.fillSelectDropdown(stateElement, state);
              if (filled) {
                filledCount++;
                console.log('✅ Filled state via select dropdown:', state);
              } else {
                console.warn('⚠️ Failed to fill state select dropdown');
              }
            } else {
              // Try regular fill first
              const filled = await this.fillField(stateElement, state);
              if (filled) {
                filledCount++;
                console.log('✅ Filled state:', state);
              } else {
                // If standard fillField didn't work, try custom dropdown approach
                console.log('  Standard fillField failed, trying custom dropdown approach...');
                const customFilled = await this.fillCustomDropdown(stateElement, state);
                if (customFilled) {
                  filledCount++;
                  console.log('✅ Filled state via custom dropdown:', state);
                } else {
                  console.warn('⚠️ All state fill methods failed');
                }
              }
            }
          } else {
            // Try to find state field dynamically (prioritize select elements, but also check inputs/divs)
            console.log('🔍 Searching for State field...');
            const stateField = this.findField([
              'select[data-automation-id*="state" i]',
              'select[name*="state" i]',
              'select[id*="state" i]',
              'input[data-automation-id*="state" i]',
              'input[name*="state" i]',
              'input[id*="state" i]',
              'input[aria-label*="state" i]',
              'input[aria-label*="province" i]',
              'div[data-automation-id*="state" i]',
              'button[data-automation-id*="state" i]',
            ]);
            
            if (stateField) {
              console.log('✅ Found State field:', stateField);
              console.log(`  State field type: ${stateField.element.tagName}`);
              const stateElement = stateField.element;
              
              // If it's a SELECT, use fillSelectDropdown
              if (stateElement.tagName === 'SELECT') {
                console.log('  State field is a SELECT element, using fillSelectDropdown');
                const filled = await this.fillSelectDropdown(stateElement, state);
                if (filled) {
                  filledCount++;
                  console.log('✅ Filled state via select dropdown:', state);
                } else {
                  console.warn('⚠️ Failed to fill state select dropdown');
                }
              } else {
                // Try regular fill first
                const filled = await this.fillField(stateElement, state);
                if (filled) {
                  filledCount++;
                  console.log('✅ Filled state:', state);
                } else {
                  // Try custom dropdown approach
                  console.log('  Standard fillField failed, trying custom dropdown approach...');
                  const customFilled = await this.fillCustomDropdown(stateElement, state);
                  if (customFilled) {
                    filledCount++;
                    console.log('✅ Filled state via custom dropdown:', state);
                  } else {
                    console.warn('⚠️ All state fill methods failed');
                  }
                }
              }
            } else {
              console.warn('⚠️ State field not found with standard selectors');
              
              // Try to find state field by looking near the city field
              if (this.fields.location) {
                const cityField = this.fields.location.element;
                console.log('🔍 City field found:', { id: cityField.id, name: cityField.name });
                
                // Try multiple container strategies
                let cityContainer = cityField.closest('div[class*="input"], div[class*="field"], fieldset, form') || 
                                   cityField.closest('div') || 
                                   cityField.parentElement;
                
                // Also try finding the form or a larger container
                const form = cityField.closest('form');
                if (form) {
                  console.log('  Found form container');
                  cityContainer = form;
                } else {
                  // Look for a common parent that might contain both city and state
                  let current = cityField.parentElement;
                  for (let i = 0; i < 10 && current; i++) {
                    const children = current.querySelectorAll('input, select');
                    if (children.length >= 2) {
                      console.log(`  Found container with ${children.length} input/select elements`);
                      cityContainer = current;
                      break;
                    }
                    current = current.parentElement;
                  }
                }
                
                console.log('  Using container:', cityContainer?.tagName, cityContainer?.className);
                
                if (cityContainer) {
                  console.log('🔍 Searching for State field near city field...');
                  
                  // Look for state field in the same container or nearby
                  const nearbyStateSelectors = [
                    'input[id*="state" i]',
                    'input[name*="state" i]',
                    'select[id*="state" i]',
                    'select[name*="state" i]',
                    'input[aria-label*="state" i]',
                    'select[aria-label*="state" i]',
                    'div[data-automation-id*="state" i]',
                    'button[data-automation-id*="state" i]',
                    // Workday pattern: address--state
                    'input[id*="address" i][id*="state" i]',
                    'input[name*="address" i][name*="state" i]',
                    // Look for any input/select after city field
                    'input[type="text"]',
                    'select',
                    'input[readonly]',
                    'input[aria-haspopup="listbox"]'
                  ];
                  
                  let stateFieldFound = false;
                  for (const selector of nearbyStateSelectors) {
                    if (stateFieldFound) break;
                    const elements = cityContainer.querySelectorAll(selector);
                    for (const el of elements) {
                      // Skip if it's the city field itself
                      if (el === cityField) continue;
                      
                      // Check if it's visible and looks like a state field
                      if (el.offsetParent !== null && !el.disabled) {
                        const id = (el.id || '').toLowerCase();
                        const name = (el.name || '').toLowerCase();
                        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                        const dataAutomationId = (el.getAttribute('data-automation-id') || '').toLowerCase();
                        
                        // Check if it contains state-related keywords
                        if (id.includes('state') || name.includes('state') || 
                            ariaLabel.includes('state') || dataAutomationId.includes('state') ||
                            id.includes('province') || name.includes('province') ||
                            ariaLabel.includes('province') || dataAutomationId.includes('province')) {
                          
                          console.log(`✅ Found State field near city: ${el.tagName} id="${el.id}" name="${el.name}"`);
                          const stateField = {
                            element: el,
                            selector: selector,
                            type: el.type || el.tagName.toLowerCase()
                          };
                          
                          const stateElement = stateField.element;
                          
                          // If it's a SELECT, use fillSelectDropdown
                          if (stateElement.tagName === 'SELECT') {
                            const filled = await this.fillSelectDropdown(stateElement, state);
                            if (filled) {
                              filledCount++;
                              console.log('✅ Filled state via select dropdown (found near city):', state);
                              stateFieldFound = true;
                              break;
                            }
                          } else {
                            const filled = await this.fillField(stateElement, state);
                            if (filled) {
                              filledCount++;
                              console.log('✅ Filled state (found near city):', state);
                              stateFieldFound = true;
                              break;
                            } else {
                              // Try custom dropdown approach
                              const customFilled = await this.fillCustomDropdown(stateElement, state);
                              if (customFilled) {
                                filledCount++;
                                console.log('✅ Filled state via custom dropdown (found near city):', state);
                                stateFieldFound = true;
                                break;
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  
                  // If still not found, try finding by position
                  if (!stateFieldFound) {
                    // Also try finding by position - state is often right after city
                    const allInputs = Array.from(cityContainer.querySelectorAll('input, select'));
                    console.log(`  Found ${allInputs.length} total input/select elements in container`);
                    const cityIndex = allInputs.indexOf(cityField);
                    console.log(`  City field is at index ${cityIndex}`);
                    
                    if (cityIndex >= 0 && cityIndex < allInputs.length - 1) {
                      // Check the next few inputs after city (expand to check more fields)
                      for (let i = cityIndex + 1; i < Math.min(cityIndex + 5, allInputs.length); i++) {
                        if (stateFieldFound) break;
                        const nextField = allInputs[i];
                        if (nextField.offsetParent !== null && !nextField.disabled && nextField !== cityField) {
                          const fieldId = nextField.id || '';
                          const fieldName = nextField.name || '';
                          const ariaLabel = nextField.getAttribute('aria-label') || '';
                          const isReadonly = nextField.readOnly;
                          const hasPopup = nextField.getAttribute('aria-haspopup') === 'listbox';
                          const isSelect = nextField.tagName === 'SELECT';
                          
                          console.log(`🔍 Checking field after city (index ${i}): ${nextField.tagName} id="${fieldId}" name="${fieldName}" readonly=${isReadonly} hasPopup=${hasPopup}`);
                          
                          // If it's a select or readonly input, it's likely a dropdown (state field)
                          // Also check if it's not a postal code or other address field
                          const isNotOtherField = !fieldId.toLowerCase().includes('postal') && 
                                                  !fieldId.toLowerCase().includes('zip') &&
                                                  !fieldId.toLowerCase().includes('country') &&
                                                  !fieldName.toLowerCase().includes('postal') &&
                                                  !fieldName.toLowerCase().includes('zip') &&
                                                  !ariaLabel.toLowerCase().includes('postal') &&
                                                  !ariaLabel.toLowerCase().includes('zip');
                          
                          if ((isSelect || (nextField.tagName === 'INPUT' && (isReadonly || hasPopup))) && isNotOtherField) {
                            console.log(`✅ Found potential State field (dropdown after city): ${nextField.tagName} id="${fieldId}"`);
                            // If it's a SELECT, use fillSelectDropdown
                            if (nextField.tagName === 'SELECT') {
                              const filled = await this.fillSelectDropdown(nextField, state);
                              if (filled) {
                                filledCount++;
                                console.log('✅ Filled state via select dropdown (dropdown after city):', state);
                                stateFieldFound = true;
                                break;
                              }
                            } else {
                              const filled = await this.fillField(nextField, state);
                              if (filled) {
                                filledCount++;
                                console.log('✅ Filled state (dropdown after city):', state);
                                stateFieldFound = true;
                                break;
                              } else {
                                const customFilled = await this.fillCustomDropdown(nextField, state);
                                if (customFilled) {
                                  filledCount++;
                                  console.log('✅ Filled state via custom dropdown (dropdown after city):', state);
                                  stateFieldFound = true;
                                  break;
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  
                  if (!stateFieldFound) {
                    console.warn('⚠️ State field still not found after all search strategies');
                  }
                }
              }
            }
          }
        }
      }

      // Handle work experience entries
      console.log('🔵 ========== WORK EXPERIENCE SECTION ==========');
      console.log('  Experience data:', data.experience);
      console.log('  Is array?', Array.isArray(data.experience));
      console.log('  Length:', data.experience?.length);
      if (data.experience && Array.isArray(data.experience) && data.experience.length > 0) {
        console.log('🔵 Attempting to fill work experience entries...');
        const experienceFilled = await this.fillWorkExperience(data.experience);
        filledCount += experienceFilled;
        console.log(`✅ Filled ${experienceFilled} work experience entries`);
      } else {
        console.warn('⚠️ No experience data to fill or invalid format');
      }

      // Handle education entries
      console.log('🔵 ========== EDUCATION SECTION ==========');
      console.log('  Education data:', data.education);
      console.log('  Is array?', Array.isArray(data.education));
      console.log('  Length:', data.education?.length);
      if (data.education && Array.isArray(data.education) && data.education.length > 0) {
        console.log('🔵 Attempting to fill education entries...');
        const educationFilled = await this.fillEducation(data.education);
        filledCount += educationFilled;
        console.log(`✅ Filled ${educationFilled} education entries`);
      } else {
        console.warn('⚠️ No education data to fill or invalid format');
      }

      // Handle file upload (resume) - try multiple locations
      console.log('🔵 ========== RESUME UPLOAD SECTION ==========');
      console.log('  Resume data:', data.resume);
      console.log('  Resume type:', typeof data.resume);
      if (data.resume) {
        console.log('🔵 Attempting to upload resume...');
        const resumeUploaded = await this.handleResumeUpload(data.resume);
        if (resumeUploaded) {
          filledCount++;
          console.log('✅ Resume uploaded successfully');
        } else {
          console.warn('⚠️ Resume upload failed or resume field not found');
        }
      } else {
        console.warn('⚠️ No resume data provided');
      }

      // Handle textarea (cover letter)
      if (data.coverLetter && this.fields.coverLetter) {
        const filled = await this.fillField(this.fields.coverLetter.element, data.coverLetter);
        if (filled) {
          filledCount++;
          console.log('✅ Filled coverLetter');
        }
      }

      // Wait a bit for all fields to be processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // CRITICAL: Re-update React state for all filled fields one more time
      // Also focus/blur each field to trigger validation
      console.log('🔵 Re-updating React state for all filled fields...');
      const fieldsToUpdate = [
        { key: 'firstName', data: data.firstName },
        { key: 'lastName', data: data.lastName },
        { key: 'phone', data: data.phone ? this.formatPhoneNumber(data.phone) : null },
        { key: 'location', data: data.location }
      ];
      
      for (const fieldInfo of fieldsToUpdate) {
        if (fieldInfo.data && this.fields[fieldInfo.key]) {
          const field = this.fields[fieldInfo.key];
          let valueToUse = fieldInfo.data;
          
          // Special handling for location
          if (fieldInfo.key === 'location' && typeof valueToUse === 'string') {
            const locationParts = valueToUse.split(',').map(p => p.trim());
            const city = locationParts[0] || '';
            const fieldElement = field.element;
            const fieldId = fieldElement.id || '';
            const fieldName = fieldElement.name || '';
            const isCityField = fieldId.toLowerCase().includes('city') || 
                               fieldName.toLowerCase().includes('city') ||
                               fieldId === 'address--city' ||
                               fieldName === 'city';
            valueToUse = isCityField ? city : valueToUse;
          }
          
          // Focus the field
          field.element.focus();
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Update React state
          this.updateReactState(field.element, valueToUse);
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Trigger input event
          field.element.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: valueToUse
          }));
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Trigger change event
          field.element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Blur to trigger validation
          field.element.blur();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Update React state one more time after blur
          this.updateReactState(field.element, valueToUse);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Trigger input events for Workday's React listeners
      this.triggerEvents();

      // Additional wait to ensure validation completes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify critical fields were filled (especially firstName)
      if (data.firstName && this.fields.firstName) {
        // Wait longer for React to process
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const currentValue = this.fields.firstName.element.value || '';
        console.log('First Name field value after fill:', currentValue);
        
        if (!currentValue || currentValue.trim() === '') {
          console.warn('⚠️ First Name field appears empty after fill. Attempting re-fill...');
          // Try one more time with a different approach
          await this.fillField(this.fields.firstName.element, data.firstName);
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // Field has value, ensure React state is updated
          console.log('First Name has value, updating React state...');
          this.updateReactState(this.fields.firstName.element, data.firstName);
          
          // Wait a bit for state update
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Trigger validation manually
          console.log('Triggering validation for firstName field...');
          this.fields.firstName.element.focus();
          
          // Trigger multiple events to ensure validation runs
          const events = ['input', 'change', 'blur'];
          events.forEach(eventType => {
            this.fields.firstName.element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
          });
          
          // Also try triggering form validation
          const form = this.fields.firstName.element.closest('form');
          if (form) {
            form.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            form.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          }
          
          // Wait a bit more
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Final validation trigger - click outside or trigger form validation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // CRITICAL: One final pass to update React state for all fields
      console.log('🔵 Final React state update pass...');
      Object.keys(this.fields).forEach(key => {
        const field = this.fields[key];
        if (field && field.element && data[key]) {
          let valueToUse = data[key];
          
          // Special handling for phone - format it
          if (key === 'phone' && typeof valueToUse === 'string') {
            valueToUse = this.formatPhoneNumber(valueToUse);
          }
          
          // Special handling for location
          if (key === 'location' && typeof valueToUse === 'string') {
            const locationParts = valueToUse.split(',').map(p => p.trim());
            const city = locationParts[0] || '';
            const fieldElement = field.element;
            const fieldId = fieldElement.id || '';
            const fieldName = fieldElement.name || '';
            const isCityField = fieldId.toLowerCase().includes('city') || 
                               fieldName.toLowerCase().includes('city') ||
                               fieldId === 'address--city' ||
                               fieldName === 'city';
            valueToUse = isCityField ? city : valueToUse;
          }
          
          this.updateReactState(field.element, valueToUse);
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Try to find and trigger Workday's validation
      this.triggerWorkdayValidation();
      
      // Wait one more time for validation to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(`✅ Autofill complete. Filled ${filledCount} fields.`);
      
      // Final debug: Check all field values
      console.log('🔵 Final field values check:');
      Object.keys(this.fields).forEach(key => {
        const field = this.fields[key];
        if (field && field.element) {
          const value = field.element.value || '';
          const expected = data[key] || '';
          const match = value === expected || (value.length > 0 && expected.length > 0);
          console.log(`  ${match ? '✅' : '❌'} ${key}: "${value}" ${match ? '' : `(expected: "${expected}")`}`);
        }
      });
      
      // Check for any required fields that might be empty and try to fill them
      console.log('🔵 Checking for required empty fields...');
      const allInputs = Array.from(document.querySelectorAll('input[required], input[aria-required="true"]'));
      for (const input of allInputs) {
        if (input.offsetParent === null) continue; // Skip hidden
        const value = input.value || '';
        if (!value || value.trim() === '') {
          const label = input.closest('label')?.textContent?.trim() || 
                       document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ||
                       input.getAttribute('aria-label') ||
                       input.placeholder ||
                       'unknown';
          
          console.warn(`  ⚠️ Required field is empty:`, {
            label: label,
            id: input.id,
            name: input.name,
            'data-automation-id': input.getAttribute('data-automation-id'),
            element: input
          });
          
          // Try to fill based on field name/id
          const fieldId = input.id || '';
          const fieldName = input.name || '';
          const searchText = `${fieldId} ${fieldName} ${label}`.toLowerCase();
          
          let valueToFill = null;
          
          // Address Line 1 - Only fill if we have a full address, not just city/state
          if (searchText.includes('address') && (searchText.includes('line') || searchText.includes('addressline1'))) {
            // Don't fill Address Line 1 if location is just city/state (e.g., "Ashburn, Virginia")
            // Only fill if it looks like a full address (contains street number or street name indicators)
            if (data.location) {
              const locationLower = data.location.toLowerCase();
              // Check if it looks like a full address (has street number, street name, etc.)
              const hasStreetNumber = /\d+/.test(data.location.split(',')[0]);
              const hasStreetName = /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|place|pl)\b/i.test(data.location);
              
              // Only fill if it appears to be a full address
              if (hasStreetNumber || hasStreetName) {
                // Extract just the street address part (first part before comma)
                const addressParts = data.location.split(',');
                valueToFill = addressParts[0].trim();
              } else {
                // It's just city/state, don't fill Address Line 1
                console.log(`  ⚠️ Location "${data.location}" appears to be city/state only, skipping Address Line 1`);
                valueToFill = null;
              }
            }
          }
          // State field
          else if (searchText.includes('state') && !searchText.includes('address')) {
            // Extract state from location (e.g., "Ashburn, VA, USA" -> "VA" or "Ashburn, Virginia" -> "Virginia")
            if (data.location) {
              const parts = data.location.split(',').map(p => p.trim());
              if (parts.length >= 2) {
                // State is usually the second part (could be "VA" or "Virginia")
                valueToFill = parts[1];
                // Remove country if present (e.g., "VA, USA" -> "VA")
                if (parts.length > 2 && parts[2].toLowerCase() === 'usa') {
                  // Already have the state part
                }
              }
            }
          }
          // Postal Code / Zip Code
          else if (searchText.includes('postal') || searchText.includes('zip')) {
            // Try to extract from location (e.g., "Ashburn, VA 20147, USA")
            const parts = data.location?.split(',') || [];
            if (parts.length >= 2) {
              // Look for zip code pattern in the parts
              const zipMatch = parts.find(p => /\d{5}/.test(p.trim()));
              if (zipMatch) {
                valueToFill = zipMatch.trim().match(/\d{5}(-\d{4})?/)?.[0] || '';
              }
            }
          }
          // Country Phone Code
          else if (searchText.includes('country') && searchText.includes('phone')) {
            // Extract country code from phone number (e.g., "+15713513185" -> "1")
            if (data.phone && data.phone.startsWith('+')) {
              const match = data.phone.match(/^\+(\d+)/);
              if (match) {
                valueToFill = match[1];
              }
            }
          }
          // Email field
          else if (searchText.includes('email') && data.email) {
            valueToFill = data.email;
          }
          
          if (valueToFill) {
            console.log(`  🔵 Attempting to fill "${label}" with: "${valueToFill}"`);
            const filled = await this.fillField(input, valueToFill);
            if (filled) {
              filledCount++;
              console.log(`  ✅ Filled "${label}" with: "${valueToFill}"`);
            }
          }
        }
      }
      
      console.log('🔵 ========== WORKDAY AUTOFILL DEBUG END ==========');

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

      // Automatically save job to application tracker
      if (filledCount > 0) {
        const jobInfo = this.extractJobInfo();
        await this.saveJobToTracker(jobInfo);
      }

      return { success: true, filledCount: filledCount };
    } catch (error) {
      console.error('Workday autofill error:', error);
      return { success: false, error: error.message, filledCount: 0 };
    } finally {
      this.isAutofilling = false;
    }
  }

  async fillField(element, value) {
    if (!element || !value) {
      console.warn(`⚠️ fillField called with invalid params: element=${!!element}, value="${value}"`);
      return false;
    }

    console.log(`🔵 fillField called for element:`, {
      tag: element.tagName,
      type: element.type,
      id: element.id,
      name: element.name,
      'data-automation-id': element.getAttribute('data-automation-id'),
      currentValue: element.value || 'empty',
      valueToSet: value
    });

    // Handle select elements (dropdowns) differently
    if (element.tagName === 'SELECT') {
      return await this.fillSelectDropdown(element, value);
    }
    
    // Identify fields that are KNOWN to be dropdowns (only these should use dropdown logic)
    const elementId = element.id?.toLowerCase() || '';
    const elementName = element.name?.toLowerCase() || '';
    const elementLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    const elementAutomationId = element.getAttribute('data-automation-id')?.toLowerCase() || '';
    
    // List of fields that are CONFIRMED dropdowns in Workday
    const isKnownDropdownField = 
      // State/Province fields
      elementId.includes('state') ||
      elementName.includes('state') ||
      elementAutomationId.includes('state') ||
      elementLabel.includes('state') ||
      elementLabel.includes('province') ||
      // Education: Field of Study
      elementId.includes('fieldofstudy') ||
      elementId.includes('field') && elementId.includes('study') ||
      // Education: Degree
      elementId.includes('degree') ||
      elementName.includes('degree') ||
      // Country fields
      elementId.includes('country') ||
      elementName.includes('country');
    
    // ONLY use dropdown logic for known dropdown fields
    if ((element.tagName === 'INPUT' || element.tagName === 'BUTTON' || element.tagName === 'DIV') && isKnownDropdownField) {
      console.log('  ✅ Detected known dropdown field - using dropdown approach');
      const customDropdownResult = await this.fillCustomDropdown(element, value);
      if (customDropdownResult) {
        return customDropdownResult;
      }
      // If dropdown failed for known dropdown field, try typing as fallback
      console.warn('  ⚠️ Dropdown fill failed for known dropdown field, trying typing fallback');
    } else if (element.tagName === 'INPUT') {
      // For regular INPUT fields, skip dropdown logic entirely and go straight to typing
      console.log('  📝 Regular input field - skipping dropdown logic, going straight to typing');
    }

    try {
      // Method 1: Simulate actual user typing (most reliable for React)
      console.log('  → Trying Method 1: Typing simulation...');
      const typedSuccess = await this.simulateTyping(element, value);
      if (typedSuccess) {
        console.log('  ✅ Field filled via typing simulation');
        // Ensure React state is updated after typing
        await new Promise(resolve => setTimeout(resolve, 200));
        this.updateReactState(element, value);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const finalValue = element.value || '';
        console.log(`  Final value: "${finalValue}"`);
        
        // Verify React state was updated by checking if value persists
        if (finalValue === value || finalValue.length > 0) {
          return true;
        }
      }
      console.log('  ✗ Typing simulation failed or value not persisted');
      
      // Method 2: Direct React state update + events
      console.log('  → Trying Method 2: Direct React update...');
      const directSuccess = await this.fillFieldDirect(element, value);
      if (directSuccess) {
        console.log('  ✅ Field filled via direct method');
        // Ensure React state is updated
        await new Promise(resolve => setTimeout(resolve, 200));
        this.updateReactState(element, value);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const finalValue = element.value || '';
        console.log(`  Final value: "${finalValue}"`);
        
        if (finalValue === value || finalValue.length > 0) {
          return true;
        }
      }
      console.log('  ✗ Direct method failed or value not persisted');
      
      // Method 3: Force React state update + events
      console.log('  → Trying Method 3: Force React state update...');
      element.focus();
      
      // Update React state FIRST
      this.updateReactState(element, value);
      
      // Wait for React to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Set DOM value
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, value);
      } else {
        element.value = value;
      }
      
      // Update value tracker
      if (element._valueTracker) {
        element._valueTracker.setValue('');
        element._valueTracker.setValue(value);
      }
      
      // Trigger events in sequence
      element.dispatchEvent(new Event('focus', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 50));
      
      element.dispatchEvent(new InputEvent('input', { 
        bubbles: true, 
        cancelable: true,
        inputType: 'insertText',
        data: value
      }));
      await new Promise(resolve => setTimeout(resolve, 50));
      
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update React state again after events
      this.updateReactState(element, value);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Final React state update
      this.updateReactState(element, value);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const finalValue = element.value || '';
      const success = finalValue === value || finalValue.length > 0;
      console.log(`  ${success ? '✅' : '✗'} Method 3 ${success ? 'succeeded' : 'failed'}, final value: "${finalValue}"`);
      return success;
    } catch (error) {
      console.error('❌ Error in fillField:', error);
      return false;
    }
  }

  // Simulate actual user typing character by character
  async simulateTyping(element, value) {
    return new Promise((resolve) => {
      try {
        element.focus();
        element.select();
        
        // Clear existing value - get setter in outer scope
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(element, '');
        } else {
          element.value = '';
        }
        
        // Trigger clear events
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        
        // Wait a bit, then type each character
        setTimeout(() => {
          let index = 0;
          const typeNextChar = () => {
            if (index >= value.length) {
              // Done typing, ensure value is set correctly
              const setter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
              )?.set;
              
              if (setter) {
                setter.call(element, value);
              } else {
                element.value = value;
              }
              
              // Update React's value tracker if it exists
              if (element._valueTracker) {
                element._valueTracker.setValue('');
                element._valueTracker.setValue(value);
              }
              
              // CRITICAL: Update React state BEFORE triggering events
              this.updateReactState(element, value);
              
              // Wait a bit for React state to update
              setTimeout(() => {
                // Trigger final events in proper sequence
                element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                
                // Wait a bit, then trigger change
                setTimeout(() => {
                  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                  
                  // Trigger one more input event with InputEvent
                  setTimeout(() => {
                    const finalInputEvent = new InputEvent('input', {
                      bubbles: true,
                      cancelable: true,
                      inputType: 'insertText',
                      data: value
                    });
                    element.dispatchEvent(finalInputEvent);
                    
                    // Update React state one more time after events
                    this.updateReactState(element, value);
                    
                    // Wait a bit more then blur
                    setTimeout(() => {
                      element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
                      
                      // Keep focus for a moment to ensure validation sees the value
                      setTimeout(() => {
                        element.blur();
                        
                        // Final React state update and verification
                        setTimeout(() => {
                          // Final React state update
                          this.updateReactState(element, value);
                          
                          // Trigger one final change event to ensure validation runs
                          element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                          
                          const finalValue = element.value || '';
                          console.log('Typing simulation complete. Value:', finalValue, 'Expected:', value);
                          resolve(finalValue === value || finalValue.length > 0);
                        }, 200);
                      }, 150);
                    }, 150);
                  }, 100);
                }, 100);
              }, 100);
              return;
            }
            
            const char = value[index];
            
            // Set value up to current character
            const currentValue = value.substring(0, index + 1);
            
            // Create and dispatch keyboard events for this character FIRST
            const keydownEvent = new KeyboardEvent('keydown', {
              bubbles: true,
              cancelable: true,
              key: char,
              code: this.getKeyCode(char),
              charCode: char.charCodeAt(0),
              keyCode: char.charCodeAt(0)
            });
            
            const keypressEvent = new KeyboardEvent('keypress', {
              bubbles: true,
              cancelable: true,
              key: char,
              code: this.getKeyCode(char),
              charCode: char.charCodeAt(0),
              keyCode: char.charCodeAt(0)
            });
            
            const inputEvent = new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertText',
              data: char
            });
            
            const keyupEvent = new KeyboardEvent('keyup', {
              bubbles: true,
              cancelable: true,
              key: char,
              code: this.getKeyCode(char),
              charCode: char.charCodeAt(0),
              keyCode: char.charCodeAt(0)
            });
            
            element.dispatchEvent(keydownEvent);
            element.dispatchEvent(keypressEvent);
            
            // Set value AFTER keydown/keypress but BEFORE input event
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(element, currentValue);
            } else {
              element.value = currentValue;
            }
            
            element.dispatchEvent(inputEvent);
            element.dispatchEvent(keyupEvent);
            
            index++;
            // Type next character after a small delay
            setTimeout(typeNextChar, 20);
          };
          
          typeNextChar();
        }, 50);
      } catch (error) {
        console.error('Error in simulateTyping:', error);
        resolve(false);
      }
    });
  }

  getKeyCode(char) {
    if (char === ' ') return 'Space';
    if (char.length === 1 && /[a-zA-Z]/.test(char)) {
      return `Key${char.toUpperCase()}`;
    }
    return char;
  }

  // Fill standard <select> dropdown
  async fillSelectDropdown(selectElement, value) {
    try {
      console.log(`🔵 Filling SELECT dropdown. Looking for value: "${value}"`);
      console.log(`  Select has ${selectElement.options.length} options`);
      
      // Get state mapping for better matching
      const stateMap = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
        'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
        'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
        'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
        'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
        'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
        'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
        'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
        'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
        'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
        'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
      };
      
      // Build search terms - try both abbreviation and full name
      const searchTerms = [value];
      if (value.length === 2) {
        const stateName = stateMap[value.toUpperCase()];
        if (stateName) {
          searchTerms.push(stateName);
        }
      } else {
        // If it's a state name, also try abbreviation
        for (const [abbr, stateName] of Object.entries(stateMap)) {
          if (stateName.toLowerCase() === value.toLowerCase() || 
              stateName.toLowerCase().includes(value.toLowerCase()) ||
              value.toLowerCase().includes(stateName.toLowerCase())) {
            searchTerms.push(abbr);
            break;
          }
        }
      }
      
      console.log(`  Search terms:`, searchTerms);
      
      // Try to find matching option
      let option = null;
      let optionIndex = -1;
      
      // Strategy 1: Exact match on value
      for (let i = 0; i < selectElement.options.length; i++) {
        const opt = selectElement.options[i];
        for (const term of searchTerms) {
          if (opt.value === term || opt.value.toLowerCase() === term.toLowerCase()) {
            option = opt;
            optionIndex = i;
            console.log(`  ✅ Found exact value match: "${opt.value}" at index ${i}`);
            break;
          }
        }
        if (option) break;
      }
      
      // Strategy 2: Exact match on text
      if (!option) {
        for (let i = 0; i < selectElement.options.length; i++) {
          const opt = selectElement.options[i];
          const optText = opt.text.trim();
          for (const term of searchTerms) {
            if (optText === term || optText.toLowerCase() === term.toLowerCase()) {
              option = opt;
              optionIndex = i;
              console.log(`  ✅ Found exact text match: "${optText}" at index ${i}`);
              break;
            }
          }
          if (option) break;
        }
      }
      
      // Strategy 3: Partial match (contains)
      if (!option) {
        for (let i = 0; i < selectElement.options.length; i++) {
          const opt = selectElement.options[i];
          const optText = opt.text.toLowerCase().trim();
          const optValue = opt.value.toLowerCase().trim();
          for (const term of searchTerms) {
            const termLower = term.toLowerCase();
            if (optText.includes(termLower) || optValue.includes(termLower) ||
                termLower.includes(optText) || termLower.includes(optValue)) {
              option = opt;
              optionIndex = i;
              console.log(`  ✅ Found partial match: "${opt.text}" (value: "${opt.value}") at index ${i}`);
              break;
            }
          }
          if (option) break;
        }
      }
      
      // Strategy 4: Word boundary match
      if (!option) {
        for (let i = 0; i < selectElement.options.length; i++) {
          const opt = selectElement.options[i];
          const optText = opt.text.toLowerCase();
          for (const term of searchTerms) {
            const regex = new RegExp(`\\b${term.toLowerCase()}\\b`, 'i');
            if (regex.test(optText)) {
              option = opt;
              optionIndex = i;
              console.log(`  ✅ Found word boundary match: "${opt.text}" at index ${i}`);
              break;
            }
          }
          if (option) break;
        }
      }
      
      if (!option) {
        console.warn('⚠️ Could not find matching option');
        console.log('  Available options (first 30):', Array.from(selectElement.options).slice(0, 30).map((opt, idx) => ({
          index: idx,
          value: opt.value,
          text: opt.text,
          selected: opt.selected
        })));
        return false;
      }
      
      console.log(`  ✅ Selected option: index=${optionIndex}, value="${option.value}", text="${option.text}"`);
      
      // Method 1: Set selectedIndex (most reliable)
      selectElement.selectedIndex = optionIndex;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Method 2: Set value
      selectElement.value = option.value;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Method 3: Update React state
      this.updateReactState(selectElement, option.value);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Method 4: Trigger events
      selectElement.focus();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Create and dispatch change event
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      selectElement.dispatchEvent(changeEvent);
      
      // Also try InputEvent
      const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
      selectElement.dispatchEvent(inputEvent);
      
      // Update React state again
      this.updateReactState(selectElement, option.value);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Blur to trigger validation
      selectElement.blur();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Final React state update
      this.updateReactState(selectElement, option.value);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify
      const finalValue = selectElement.value;
      const finalIndex = selectElement.selectedIndex;
      
      if (finalValue === option.value || finalIndex === optionIndex) {
        console.log(`✅ Successfully selected dropdown option. Final: value="${finalValue}", index=${finalIndex}`);
        return true;
      } else {
        console.warn(`⚠️ Selection may not have worked. Expected: "${option.value}" (index ${optionIndex}), Got: "${finalValue}" (index ${finalIndex})`);
        // Try one more time
        selectElement.selectedIndex = optionIndex;
        selectElement.value = option.value;
        this.updateReactState(selectElement, option.value);
        return selectElement.value === option.value || selectElement.selectedIndex === optionIndex;
      }
    } catch (error) {
      console.error('❌ Error filling select dropdown:', error);
      return false;
    }
  }

  // Fill custom dropdown (div-based, React components)
  async fillCustomDropdown(element, value) {
    try {
      console.log(`🔵 Attempting to fill custom dropdown for element:`, element.tagName, element.id || element.className);
      
      // Look for a hidden select element nearby
      const parent = element.closest('div, form, fieldset') || document.body;
      const hiddenSelect = parent.querySelector('select[style*="display: none"], select[style*="display:none"], select.hidden');
      
      if (hiddenSelect && hiddenSelect.tagName === 'SELECT') {
        console.log('  Found hidden select element, using it instead');
        return await this.fillSelectDropdown(hiddenSelect, value);
      }
      
      // Workday-specific: Look for the parent container that might contain the dropdown
      // Workday often wraps inputs in divs with specific classes
      // Try multiple selectors separately since we can't use wildcards in class selectors
      let workdayContainer = element.closest('[data-automation-id]');
      if (!workdayContainer) {
        // Try to find container with class containing "input" or "select"
        const parent = element.parentElement;
        if (parent) {
          const parentClass = parent.className || '';
          if (typeof parentClass === 'string' && (parentClass.includes('input') || parentClass.includes('select'))) {
            workdayContainer = parent;
          } else {
            // Look for ancestor with matching class
            let current = parent;
            for (let i = 0; i < 5 && current; i++) {
              const className = current.className || '';
              if (typeof className === 'string' && (className.includes('input') || className.includes('select') || className.includes('css-'))) {
                workdayContainer = current;
                break;
              }
              current = current.parentElement;
            }
          }
        }
      }
      
      // Try to find dropdown trigger - could be the input itself, a button, or a parent container
      let trigger = element;
      
      if (element.tagName === 'INPUT') {
        // For Workday, the input might be readonly and clicking it opens the dropdown
        // Or there might be a button/icon next to it
        const parentContainer = element.parentElement;
        
        // Look for a button or clickable element in the same container
        if (parentContainer) {
          const button = parentContainer.querySelector('button, [role="button"], [aria-haspopup="listbox"]');
          if (button) {
            trigger = button;
            console.log('  Found button trigger in parent container');
          } else {
            // The input itself might be the trigger
            trigger = element;
          }
        }
        
        // Also check for next sibling button
        const nextButton = element.nextElementSibling;
        if (nextButton && (nextButton.tagName === 'BUTTON' || nextButton.getAttribute('role') === 'button')) {
          trigger = nextButton;
          console.log('  Found button trigger as next sibling');
        }
      }
      
      // Click to open dropdown - try multiple approaches
      console.log('  Clicking to open dropdown...');
      
      // First, focus the element
      element.focus();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Then click the trigger
      trigger.click();
      await new Promise(resolve => setTimeout(resolve, 200)); // Optimized for speed
      
        // For INPUT elements, type the value to filter options, then press Enter
        if (element.tagName === 'INPUT') {
          console.log(`  📝 Typing value into input field: "${value}"`);
          
          // Clear the input first
          this.setNativeInputValue(element, '');
          element.dispatchEvent(new Event('input', { bubbles: true }));
          await this.delay(100);
          
          // Type the value to filter the dropdown
          this.setNativeInputValue(element, value);
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          await this.delay(300); // Wait for dropdown to filter
          
          // Press Enter to select the first/matched option
          console.log(`  ⏎ Pressing Enter to select option`);
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          element.dispatchEvent(enterEvent);
          
          // Also dispatch keyup for completeness
          const enterUpEvent = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          element.dispatchEvent(enterUpEvent);
          
          await this.delay(200); // Wait for selection to complete
          
          // Verify the selection worked
          const finalValue = element.value;
          console.log(`  ✅ Final value after Enter: "${finalValue}"`);
          
          if (finalValue && finalValue.toLowerCase().includes(value.toLowerCase().substring(0, 10))) {
            console.log(`  ✅ Successfully selected option by typing and pressing Enter`);
            return true;
          } else {
            console.log(`  ⚠️ Enter selection may not have worked, falling back to click method`);
            // Continue to click method below as fallback
          }
        }
      
      // Look for dropdown menu/options - expanded list for Workday
      const dropdownSelectors = [
        // Workday-specific selectors
        '[data-automation-id*="dropdown"]',
        '[data-automation-id*="menu"]',
        '[data-automation-id*="listbox"]',
        '[data-automation-id*="option"]',
        // Standard selectors
        '[role="listbox"]',
        '[role="menu"]',
        '.dropdown-menu',
        '.select-menu',
        'ul[role="listbox"]',
        'div[role="listbox"]',
        // Workday might use specific class patterns
        '[class*="menu"]',
        '[class*="dropdown"]',
        '[class*="listbox"]',
        '[class*="option"]',
        // Look for any visible popup/menu near the element
        '[aria-expanded="true"]',
        '[aria-hidden="false"]'
      ];
      
      let dropdownMenu = null;
      
      // First, try to find dropdown near the element
      if (workdayContainer) {
        for (const selector of dropdownSelectors) {
          const menus = workdayContainer.querySelectorAll(selector);
          for (const menu of menus) {
            if (menu.offsetParent !== null || window.getComputedStyle(menu).display !== 'none') {
              dropdownMenu = menu;
              console.log(`  Found dropdown menu with selector: ${selector} (near element)`);
              break;
            }
          }
          if (dropdownMenu) break;
        }
      }
      
      // If not found, search globally
      if (!dropdownMenu) {
        for (const selector of dropdownSelectors) {
          const menus = document.querySelectorAll(selector);
          for (const menu of menus) {
            const style = window.getComputedStyle(menu);
            if (menu.offsetParent !== null && 
                style.display !== 'none' && 
                style.visibility !== 'hidden' &&
                style.opacity !== '0') {
              dropdownMenu = menu;
              console.log(`  Found dropdown menu with selector: ${selector} (global)`);
              break;
            }
          }
          if (dropdownMenu) break;
        }
      }
      
      // Last resort: find any visible list/menu
      if (!dropdownMenu) {
        const allMenus = document.querySelectorAll('[role="listbox"], [role="menu"], [aria-expanded="true"]');
        for (const menu of allMenus) {
          const style = window.getComputedStyle(menu);
          if (menu.offsetParent !== null && 
              style.display !== 'none' && 
              style.visibility !== 'hidden') {
            dropdownMenu = menu;
            console.log('  Found visible dropdown menu (fallback)');
            break;
          }
        }
      }
      
      if (dropdownMenu) {
        // Find option in the menu - expanded selector list for Workday
        const optionSelectors = [
          '[role="option"]',
          'li[role="option"]',
          'div[role="option"]',
          'li',
          'div[data-value]',
          'button[role="option"]',
          '[data-automation-id*="option"]',
          '[class*="option"]',
          // Workday might use specific patterns
          'div[aria-selected]',
          'li[aria-selected]'
        ];
        
        const collectOptions = () => {
          for (const selector of optionSelectors) {
            // Get ALL options from dropdown (not just visible ones in viewport)
            const found = Array.from(dropdownMenu.querySelectorAll(selector));
            if (found.length > 0) {
              console.log(`  Found ${found.length} initial options using selector: ${selector}`);
              return { options: found, selector };
            }
          }
          return { options: [], selector: null };
        };
        
        let { options, selector: optionSelector } = collectOptions();
        let attempt = 0;
        while (options.length === 0 && attempt < 5) {
          await this.delay(200);
          const result = collectOptions();
          options = result.options;
          optionSelector = result.selector;
          attempt++;
        }
        
        if (options.length === 0) {
          // Try global search
          for (const selector of optionSelectors) {
            const globalOptions = Array.from(document.querySelectorAll(selector));
            if (globalOptions.length > 0) {
              console.log(`  Found ${globalOptions.length} global options with selector: ${selector}`);
              options = globalOptions;
              optionSelector = selector;
              break;
            }
          }
        }
        
        console.log(`  📊 Initial options collected: ${options.length}`);
        
        // CRITICAL: Workday uses virtual scrolling - only renders ~24 options at a time
        // We need to scroll through the dropdown to load ALL options
        if (dropdownMenu && options.length > 0 && options.length < 100) {
          console.log(`  🔄 Scrolling through dropdown to load all options...`);
          
          const allOptions = new Set(options); // Use Set to avoid duplicates
          let previousCount = options.length;
          let scrollAttempts = 0;
          const maxScrollAttempts = 20; // Limit scrolling to prevent infinite loops
          
          while (scrollAttempts < maxScrollAttempts) {
            // Scroll down in the dropdown
            dropdownMenu.scrollTop += 200; // Scroll down 200px
            await this.delay(150); // Wait for new options to render
            
            // Collect new options
            const newOptions = Array.from(dropdownMenu.querySelectorAll(optionSelector));
            newOptions.forEach(opt => allOptions.add(opt));
            
            // Check if we found new options
            if (allOptions.size === previousCount) {
              // No new options found, we might have reached the end
              scrollAttempts++;
              if (scrollAttempts >= 3) {
                console.log(`  ✅ Reached end of dropdown after ${scrollAttempts} attempts with no new options`);
                break;
              }
            } else {
              console.log(`  📈 Options: ${previousCount} → ${allOptions.size} (+${allOptions.size - previousCount})`);
              previousCount = allOptions.size;
              scrollAttempts = 0; // Reset counter when we find new options
            }
          }
          
          options = Array.from(allOptions);
          console.log(`  ✅ Total options after scrolling: ${options.length}`);
        }
        
        console.log(`  📊 Final options collected: ${options.length} (including all loaded options)`);
        
        // Build search terms (same as select dropdown)
        const stateMap = {
          'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
          'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
          'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
          'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
          'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
          'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
          'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
          'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
          'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
          'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
          'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
          'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
          'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
        };
        
        const searchTerms = [value.trim()];
        const valueUpper = value.trim().toUpperCase();
        const valueLower = value.trim().toLowerCase();
        
        // Handle state abbreviations
        if (valueUpper.length === 2 && stateMap[valueUpper]) {
          searchTerms.push(stateMap[valueUpper]);
        } else {
          // If it's a full state name, also try abbreviation
          for (const [abbr, stateName] of Object.entries(stateMap)) {
            if (stateName.toLowerCase() === valueLower || 
                valueLower.includes(stateName.toLowerCase()) ||
                stateName.toLowerCase().includes(valueLower)) {
              searchTerms.push(abbr);
              break;
            }
          }
        }
        
        // Add common variations for degree/field matching
        // Handle "Bachelor of Science" variations
        if (valueLower.includes('bachelor') && valueLower.includes('science')) {
          searchTerms.push('Bachelor of Science');
          searchTerms.push('Bachelors of Science');
          searchTerms.push('Bachelor\'s of Science');
          searchTerms.push('BS');
          searchTerms.push('B.S.');
        }
        // Handle "Bachelor of Arts" variations
        else if (valueLower.includes('bachelor') && valueLower.includes('art')) {
          searchTerms.push('Bachelor of Arts');
          searchTerms.push('Bachelors of Arts');
          searchTerms.push('Bachelor\'s of Arts');
          searchTerms.push('BA');
          searchTerms.push('B.A.');
        }
        // Handle generic Bachelor degree
        else if (valueLower.includes('bachelor')) {
          searchTerms.push('Bachelor of Science');
          searchTerms.push('Bachelors of Science');
          searchTerms.push('Bachelor of Arts');
          searchTerms.push('Bachelors of Arts');
        }
        
        // Handle "Computer and Information Science" variations
        if (valueLower.includes('computer') && (valueLower.includes('science') || valueLower.includes('information'))) {
          searchTerms.push('Computer and Information Science');
          searchTerms.push('Computer Science');
          searchTerms.push('Computer and Information Sciences');
          searchTerms.push('Information Science');
        }
        
        // Handle Master's degrees
        if (valueLower.includes('master')) {
          if (valueLower.includes('business')) {
            searchTerms.push('Master of Business Administration');
            searchTerms.push('MBA');
          } else if (valueLower.includes('science')) {
            searchTerms.push('Master of Science');
            searchTerms.push('Masters of Science');
            searchTerms.push('MS');
            searchTerms.push('M.S.');
          } else if (valueLower.includes('art')) {
            searchTerms.push('Master of Arts');
            searchTerms.push('Masters of Arts');
            searchTerms.push('MA');
            searchTerms.push('M.A.');
          }
        }
        
        console.log(`  Searching for option with terms:`, searchTerms);
        console.log(`  Found ${options.length} visible options in dropdown`);
        
        // Log all option texts to help debug
        const allOptionTexts = Array.from(options).map(opt => (opt.textContent || opt.innerText || '').trim()).filter(t => t.length > 0);
        console.log(`  All ${allOptionTexts.length} option texts:`, allOptionTexts);
        
        // Find matching option - CRITICAL: Match against visible filtered options
        let matchingOption = null;
        let bestMatchScore = 0;
        
        for (const option of options) {
          const optionText = (option.textContent || option.innerText || '').trim();
          const optionValue = option.getAttribute('data-value') || 
                             option.getAttribute('value') || 
                             option.getAttribute('data-automation-id') ||
                             optionText;
          
          // Normalize for comparison
          const optionTextLower = optionText.toLowerCase();
          const optionValueLower = optionValue.toLowerCase();
          
          // Skip empty options or options with just whitespace
          if (!optionText || optionText.length === 0 || optionText.length < 2) continue;
          
          for (const term of searchTerms) {
            const termLower = term.toLowerCase();
            let score = 0;
            
            // Special handling for year values (e.g., "2024")
            const isYear = /^\d{4}$/.test(term);
            
            // Exact match (highest priority)
            if (optionTextLower === termLower || optionValueLower === termLower) {
              score = 100;
              console.log(`  ✅ EXACT match found!`);
            }
            // For years, check if option contains the year (e.g., "2024" in "2024-2025")
            else if (isYear && (optionText.includes(term) || optionValue.includes(term))) {
              score = 95; // Very high score for year matches
            }
            // Word-by-word match for multi-word terms (e.g., "Computer and Information Science")
            // ONLY if no exact match was found
            else if (termLower.includes(' ') && optionTextLower.includes(' ')) {
              const termWords = termLower.split(' ').filter(w => w.length > 2); // Ignore short words like "and", "of"
              const optionWords = optionTextLower.split(' ').filter(w => w.length > 2);
              
              // Count how many term words are found in option words (EXACT word matches only)
              let matchedWords = [];
              const matchCount = termWords.filter(tw => {
                const found = optionWords.some(ow => ow === tw); // Exact word match
                if (found) matchedWords.push(tw);
                return found;
              }).length;
              
              // CRITICAL: Require ALL major words to match exactly
              // "Computer and Information Science" → ["computer", "information", "science"]
              // Should ONLY match if option contains ALL these words
              const requiredMatches = termWords.length;
              
              if (matchCount === requiredMatches) {
                score = 95; // Very high score only if ALL words match exactly
                console.log(`  🎯 Perfect multi-word match: ALL ${matchCount}/${requiredMatches} words matched exactly: [${matchedWords.join(', ')}]`);
              } else if (matchCount >= requiredMatches - 1 && termWords.length >= 4) {
                // Allow one word missing only if there are 4+ words
                score = 70;
                console.log(`  ⚠️ Partial multi-word match: ${matchCount}/${requiredMatches} words matched: [${matchedWords.join(', ')}]`);
              } else if (matchCount > 0) {
                // Some words match but not enough
                score = 0; // Don't match - not enough words
                console.log(`  ❌ Insufficient match: only ${matchCount}/${requiredMatches} words matched: [${matchedWords.join(', ')}]`);
              }
            }
            // Starts with match (high priority)
            else if (optionTextLower.startsWith(termLower) || optionValueLower.startsWith(termLower)) {
              score = 80;
            }
            // Contains match (medium priority)
            else if (optionTextLower.includes(termLower) || optionValueLower.includes(termLower)) {
              score = 50;
            }
            // Term contains option text (lower priority - for filtered results)
            else if (termLower.includes(optionTextLower) && optionTextLower.length > 3) {
              score = 30;
            }
            
            if (score > bestMatchScore) {
              bestMatchScore = score;
              matchingOption = option;
              console.log(`  📊 New best match (score ${score}): "${optionText}" (value: "${optionValue}")`);
            }
          }
        }
        
        if (matchingOption) {
          const optionText = (matchingOption.textContent || matchingOption.innerText || '').trim();
          const optionValue = matchingOption.getAttribute('data-value') || matchingOption.getAttribute('value') || optionText;
          console.log(`  ✅ Selected option: "${optionText}" (value: "${optionValue}", score: ${bestMatchScore})`);
        }
        
        if (matchingOption) {
          // Get the option value before clicking
          const optionValue = matchingOption.getAttribute('data-value') || 
                             matchingOption.getAttribute('value') || 
                             matchingOption.textContent.trim();
          
          console.log(`  🔵 About to click option with value: "${optionValue}"`);
          
          // CRITICAL: Scroll the option into view if it's not visible in viewport
          // This is necessary for off-screen options in long dropdowns
          try {
            matchingOption.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
            await new Promise(resolve => setTimeout(resolve, 150)); // Wait for scroll
          } catch (e) {
            console.warn('  ⚠️ Could not scroll option into view:', e.message);
          }
          
          // Click the option - optimized for speed
          try {
            // Trigger mousedown + mouseup + click in rapid succession
            const mouseDownEvent = new MouseEvent('mousedown', { 
              bubbles: true, 
              cancelable: true, 
              view: window,
              button: 0
            });
            matchingOption.dispatchEvent(mouseDownEvent);
            
            const mouseUpEvent = new MouseEvent('mouseup', { 
              bubbles: true, 
              cancelable: true, 
              view: window,
              button: 0
            });
            matchingOption.dispatchEvent(mouseUpEvent);
            
            // Click the option (main action)
            matchingOption.click();
            console.log('  ✅ Clicked option');
            
            // Single wait after all clicks
            await new Promise(resolve => setTimeout(resolve, 150));
          } catch (e) {
            console.warn('  ⚠️ Click failed with error:', e.message);
            // Try fallback click
            matchingOption.click();
            await new Promise(resolve => setTimeout(resolve, 150));
          }
          
          // Update the input field value directly (critical for Workday)
          if (element.tagName === 'INPUT') {
            console.log(`  🔵 Setting input value to: "${optionValue}"`);
            
            // Set value using native setter
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;
            
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(element, optionValue);
            } else {
              element.value = optionValue;
            }
            
            // Update React state (without clearing first)
            this.updateReactState(element, optionValue);
            
            // Trigger events in quick succession
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
            
            console.log(`  🔵 Input value after set: "${element.value}"`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 100)); // Reduced wait
          
          // Verify the value was set
          const finalValue = element.value || element.textContent || '';
          console.log(`  🔍 Final verification: Expected="${optionValue}", Got="${finalValue}"`);
          
          if (finalValue.toLowerCase().includes(value.toLowerCase()) || 
              value.toLowerCase().includes(finalValue.toLowerCase()) ||
              finalValue.toLowerCase().includes(optionValue.toLowerCase()) ||
              optionValue.toLowerCase().includes(finalValue.toLowerCase())) {
            console.log('✅ Successfully selected from custom dropdown');
            return true;
          } else {
            console.log(`⚠️ Value verification uncertain. Expected: "${value}" or "${optionValue}", Got: "${finalValue}"`);
            // Still return true as we did click the option - Workday dropdowns sometimes don't update the input immediately
            return true;
          }
        } else {
          console.warn('⚠️ Could not find matching option in custom dropdown');
          console.log('  Search terms used:', searchTerms);
          const availableOptions = Array.from(options).map(opt => ({
            text: (opt.textContent || opt.innerText || '').trim(),
            value: opt.getAttribute('data-value') || opt.getAttribute('value') || 'none',
            visible: opt.offsetParent !== null
          }));
          console.log('  Available options (all):', availableOptions);
          
          // Log first 5 option texts for quick debugging
          console.log('  First 5 option texts:', availableOptions.slice(0, 5).map(o => o.text));
          
          // Try scrolling the dropdown to load more options
          console.log('  📜 No match found in visible options, trying to scroll dropdown...');
          if (dropdownMenu) {
            // Scroll to bottom to potentially load more options
            dropdownMenu.scrollTop = dropdownMenu.scrollHeight;
            await this.delay(300); // Wait for more options to load
            
            // Re-collect options after scrolling
            const moreOptions = [];
            for (const selector of optionSelectors) {
              const found = Array.from(dropdownMenu.querySelectorAll(selector)).filter(opt => {
                const style = window.getComputedStyle(opt);
                return opt.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden';
              });
              if (found.length > 0) {
                moreOptions.push(...found);
                break;
              }
            }
            
            if (moreOptions.length > options.length) {
              console.log(`  📜 Found ${moreOptions.length - options.length} more options after scrolling`);
              options = moreOptions;
              
              // Try matching again with new options
              for (const option of options) {
                const optionText = (option.textContent || option.innerText || '').trim();
                const optionTextLower = optionText.toLowerCase();
                
                for (const term of searchTerms) {
                  const termLower = term.toLowerCase();
                  if (optionTextLower === termLower || optionTextLower.includes(termLower)) {
                    matchingOption = option;
                    console.log(`  ✅ Found match after scrolling: "${optionText}"`);
                    break;
                  }
                }
                if (matchingOption) break;
              }
            }
          }
          
          // Try a more lenient match for year fields
          if (!matchingOption && searchTerms.length > 0 && searchTerms[0].match(/^\d{4}$/)) {
            console.log('  🔍 Detected year value, trying lenient match...');
            const yearToFind = searchTerms[0];
            for (const option of options) {
              const optionText = (option.textContent || option.innerText || '').trim();
              // Match if option text contains the year anywhere
              if (optionText.includes(yearToFind)) {
                matchingOption = option;
                console.log(`  ✅ Found year match via lenient search: "${optionText}"`);
                break;
              }
            }
            
            // If we found a match via lenient search, process it
            if (matchingOption) {
              const optionText = (matchingOption.textContent || matchingOption.innerText || '').trim();
              const optionValue = matchingOption.getAttribute('data-value') || matchingOption.getAttribute('value') || optionText;
              console.log(`  📋 Using lenient match result: "${optionText}"`);
              
              // Jump to the click logic
              // Click the option - optimized for speed
              try {
                const mouseDownEvent = new MouseEvent('mousedown', { 
                  bubbles: true, 
                  cancelable: true, 
                  view: window,
                  button: 0
                });
                matchingOption.dispatchEvent(mouseDownEvent);
                
                const mouseUpEvent = new MouseEvent('mouseup', { 
                  bubbles: true, 
                  cancelable: true, 
                  view: window,
                  button: 0
                });
                matchingOption.dispatchEvent(mouseUpEvent);
                
                matchingOption.click();
                console.log('  ✅ Clicked option (lenient match)');
                
                await new Promise(resolve => setTimeout(resolve, 150));
              } catch (e) {
                console.warn('  ⚠️ Click failed:', e.message);
                matchingOption.click();
                await new Promise(resolve => setTimeout(resolve, 150));
              }
              
              // Update the input field if applicable
              if (element.tagName === 'INPUT') {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  'value'
                )?.set;
                
                if (nativeInputValueSetter) {
                  nativeInputValueSetter.call(element, optionValue);
                } else {
                  element.value = optionValue;
                }
                
                this.updateReactState(element, optionValue);
                element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
              }
              
              await new Promise(resolve => setTimeout(resolve, 100));
              console.log('✅ Successfully selected from custom dropdown (lenient match)');
              return true;
            }
          }
        }
      } else {
        console.warn('⚠️ Could not find dropdown menu after clicking');
        // Debug: log what's visible
        console.log('  Debug: Checking for any visible menus...');
        const allPossibleMenus = document.querySelectorAll('[role="listbox"], [role="menu"], [aria-expanded]');
        console.log(`  Found ${allPossibleMenus.length} potential menu elements`);
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error filling custom dropdown:', error);
      return false;
    }
  }

  // Format phone number to (xxx) xxx-xxxx format
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it starts with country code (e.g., 1), remove it
    let phoneDigits = digits;
    if (digits.length === 11 && digits.startsWith('1')) {
      phoneDigits = digits.substring(1);
    }
    
    // Format as (xxx) xxx-xxxx
    if (phoneDigits.length === 10) {
      return `(${phoneDigits.substring(0, 3)}) ${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6)}`;
    }
    
    // If not 10 digits, return original (might be international format)
    return phone;
  }

  // Update React's internal state directly - ULTRA AGGRESSIVE version for Workday
  updateReactState(element, value) {
    try {
      // First, ensure the DOM value is set
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, value);
      } else {
        element.value = value;
      }
      
      // Update React's value tracker (critical for controlled components)
      // IMPORTANT: Don't set to empty string first - causes delete/refill behavior
      if (element._valueTracker) {
        try {
          // Only set the target value, don't clear first
          element._valueTracker.setValue(value);
        } catch (e) {
          console.warn('  Value tracker update failed:', e.message);
        }
      }
      
      // Get React fiber node - try all possible keys
      const reactKeys = Object.keys(element).filter(key => 
        key.startsWith('__reactFiber') || 
        key.startsWith('__reactInternalInstance') ||
        key.startsWith('__reactContainer')
      );
      
      let foundHandler = false;
      
      // Try each React key
      for (const reactKey of reactKeys) {
        const fiberNode = element[reactKey];
        if (!fiberNode) continue;
        
        // Walk up the fiber tree to find the component with onChange handler
        let current = fiberNode;
        
        // First pass: Find onChange handlers
        for (let i = 0; i < 30 && current && !foundHandler; i++) {
          // Check memoizedProps for onChange
          if (current.memoizedProps) {
            // Try onChange
            if (current.memoizedProps.onChange && typeof current.memoizedProps.onChange === 'function') {
              foundHandler = true;
              
              // Set value on element
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(element, value);
              } else {
                element.value = value;
              }
              
              // Create native event first
              const nativeEvent = new Event('input', { bubbles: true, cancelable: true });
              
              // Create comprehensive synthetic event
              const syntheticEvent = {
                target: element,
                currentTarget: element,
                bubbles: true,
                cancelable: true,
                defaultPrevented: false,
                eventPhase: 2,
                isTrusted: false,
                nativeEvent: nativeEvent,
                preventDefault: () => {},
                stopPropagation: () => {},
                timeStamp: Date.now(),
                type: 'change',
                persist: () => {}
              };
              
              // Make value accessible on target (multiple ways)
              Object.defineProperty(syntheticEvent.target, 'value', {
                value: value,
                writable: true,
                enumerable: true,
                configurable: true
              });
              
              Object.defineProperty(syntheticEvent.currentTarget, 'value', {
                value: value,
                writable: true,
                enumerable: true,
                configurable: true
              });
              
              // Also set on nativeEvent.target
              Object.defineProperty(nativeEvent, 'target', {
                value: element,
                writable: true,
                enumerable: true,
                configurable: true
              });
              
              try {
                // Call onChange handler
                current.memoizedProps.onChange(syntheticEvent);
                console.log('✅ Updated React state via onChange handler');
                
                // Also try onInput, onBlur, onFocus
                if (current.memoizedProps.onInput) {
                  current.memoizedProps.onInput(syntheticEvent);
                }
                if (current.memoizedProps.onBlur) {
                  current.memoizedProps.onBlur(syntheticEvent);
                }
              } catch (e) {
                console.warn('Error calling React onChange:', e);
              }
            }
            
            // Try alternative prop names
            const altProps = ['onValueChange', 'onFieldChange', 'handleChange', 'handleInput'];
            for (const propName of altProps) {
              if (current.memoizedProps[propName] && typeof current.memoizedProps[propName] === 'function') {
                try {
                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(element, value);
                  } else {
                    element.value = value;
                  }
                  
                  const syntheticEvent = {
                    target: element,
                    currentTarget: element,
                    value: value,
                    bubbles: true,
                    cancelable: true
                  };
                  
                  current.memoizedProps[propName](syntheticEvent);
                  console.log(`✅ Updated React state via ${propName} handler`);
                  foundHandler = true;
                } catch (e) {
                  // Ignore
                }
              }
            }
          }
          
          // Check alternateProps (for React 18+)
          if (current.alternateProps) {
            if (current.alternateProps.onChange && typeof current.alternateProps.onChange === 'function') {
              try {
                if (nativeInputValueSetter) {
                  nativeInputValueSetter.call(element, value);
                } else {
                  element.value = value;
                }
                
                const syntheticEvent = {
                  target: element,
                  currentTarget: element,
                  value: value,
                  bubbles: true,
                  cancelable: true
                };
                
                current.alternateProps.onChange(syntheticEvent);
                console.log('✅ Updated React state via alternateProps.onChange');
                foundHandler = true;
              } catch (e) {
                // Ignore
              }
            }
          }
          
          // Check child nodes (for cases where the input is wrapped)
          if (current.child) {
            let child = current.child;
            for (let j = 0; j < 10 && child; j++) {
              if (child.memoizedProps && child.memoizedProps.onChange) {
                try {
                  if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(element, value);
                  } else {
                    element.value = value;
                  }
                  
                  const nativeEvent = new Event('input', { bubbles: true, cancelable: true });
                  const syntheticEvent = {
                    target: element,
                    currentTarget: element,
                    bubbles: true,
                    cancelable: true,
                    defaultPrevented: false,
                    eventPhase: 2,
                    isTrusted: false,
                    nativeEvent: nativeEvent,
                    preventDefault: () => {},
                    stopPropagation: () => {},
                    timeStamp: Date.now(),
                    type: 'change',
                    persist: () => {}
                  };
                  
                  Object.defineProperty(syntheticEvent.target, 'value', {
                    value: value,
                    writable: true,
                    enumerable: true,
                    configurable: true
                  });
                  
                  child.memoizedProps.onChange(syntheticEvent);
                  console.log('✅ Updated React state via child onChange handler');
                  foundHandler = true;
                } catch (e) {
                  // Ignore
                }
              }
              child = child.sibling;
            }
          }
          
          // Move to parent
          current = current.return;
        }
        
        // Second pass: Try to update state directly for class components
        if (!foundHandler) {
          current = fiberNode;
          for (let i = 0; i < 30 && current; i++) {
            if (current.stateNode) {
              // Try setState for class components
              if (current.stateNode.setState && typeof current.stateNode.setState === 'function') {
                try {
                  const props = current.memoizedProps || {};
                  const name = element.name || element.id || '';
                  
                  if (name) {
                    const stateUpdate = {};
                    stateUpdate[name] = value;
                    current.stateNode.setState(stateUpdate);
                    console.log('✅ Updated React class component state via setState');
                    foundHandler = true;
                    break;
                  }
                } catch (e) {
                  // Ignore
                }
              }
              
              // Try direct state manipulation
              if (current.stateNode.state && typeof current.stateNode.state === 'object') {
                try {
                  const name = element.name || element.id || '';
                  if (name && current.stateNode.state.hasOwnProperty(name)) {
                    current.stateNode.state[name] = value;
                    // Force re-render
                    if (current.stateNode.forceUpdate) {
                      current.stateNode.forceUpdate();
                      console.log('✅ Updated React state directly and forced update');
                      foundHandler = true;
                      break;
                    }
                  }
                } catch (e) {
                  // Ignore
                }
              }
            }
            current = current.return;
          }
        }
        
        // Third pass: Try to find form-level handlers
        if (!foundHandler) {
          current = fiberNode;
          for (let i = 0; i < 30 && current; i++) {
            // Look for form context or form handlers
            if (current.memoizedState) {
              // Try to find form state
              let state = current.memoizedState;
              while (state) {
                if (state.memoizedState && typeof state.memoizedState === 'object') {
                  const name = element.name || element.id || '';
                  if (name && state.memoizedState[name] !== undefined) {
                    try {
                      // Try to update through dispatch or setState
                      if (state.updateQueue) {
                        // This might be a reducer-based state
                        console.log('Found potential reducer state, attempting update');
                      }
                    } catch (e) {
                      // Ignore
                    }
                  }
                }
                state = state.next;
              }
            }
            current = current.return;
          }
        }
      }
      
      // Final fallback: Try to trigger React's event system directly
      if (!foundHandler) {
        // Use React's event system if available
        const reactEvent = new Event('input', { bubbles: true, cancelable: true });
        Object.defineProperty(reactEvent, 'target', { value: element, enumerable: true });
        element.dispatchEvent(reactEvent);
        
        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        Object.defineProperty(changeEvent, 'target', { value: element, enumerable: true });
        element.dispatchEvent(changeEvent);
      }
      
    } catch (error) {
      console.warn('Could not update React state:', error);
    }
  }

  // Direct method: Update React state and trigger all events
  async fillFieldDirect(element, value) {
    return new Promise((resolve) => {
      try {
        element.focus();
        
        // Update value using native setter FIRST
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(element, value);
        } else {
          element.value = value;
        }
        
        // Get React fiber node if available and call onChange
        const reactKey = Object.keys(element).find(key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance'));
        if (reactKey) {
          const fiberNode = element[reactKey];
          if (fiberNode) {
            // Try to find the React component and update its state
            let current = fiberNode;
            for (let i = 0; i < 10 && current; i++) {
              if (current.memoizedProps && current.memoizedProps.onChange) {
                // Found a React component with onChange handler
                // Create a proper synthetic event
                const syntheticEvent = {
                  target: element,
                  currentTarget: element,
                  bubbles: true,
                  cancelable: true,
                  defaultPrevented: false,
                  eventPhase: 2,
                  isTrusted: false,
                  nativeEvent: new Event('input'),
                  preventDefault: () => {},
                  stopPropagation: () => {},
                  timeStamp: Date.now(),
                  type: 'change'
                };
                
                // Ensure element.value is set before calling onChange
                if (nativeInputValueSetter) {
                  nativeInputValueSetter.call(element, value);
                } else {
                  element.value = value;
                }
                
                // Set the value on the synthetic event target
                Object.defineProperty(syntheticEvent.target, 'value', {
                  value: value,
                  writable: true,
                  enumerable: true,
                  configurable: true
                });
                
                // Also set it on currentTarget
                Object.defineProperty(syntheticEvent.currentTarget, 'value', {
                  value: value,
                  writable: true,
                  enumerable: true,
                  configurable: true
                });
                
                try {
                  current.memoizedProps.onChange(syntheticEvent);
                  console.log('✅ Called React onChange handler with value:', value);
                } catch (e) {
                  console.warn('Could not call React onChange:', e);
                }
              }
              current = current.return;
            }
          }
        }
        
        // Update React's value tracker if it exists
        if (element._valueTracker) {
          element._valueTracker.setValue(value);
        }
        
        // Trigger comprehensive set of events
        const events = [
          new Event('focus', { bubbles: true, cancelable: true }),
          new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }),
          new Event('change', { bubbles: true, cancelable: true }),
          new Event('blur', { bubbles: true, cancelable: true })
        ];
        
        events.forEach(event => {
          element.dispatchEvent(event);
        });
        
        // Also try React's synthetic event system
        const reactEvent = new Event('input', { bubbles: true, cancelable: true });
        Object.defineProperty(reactEvent, 'target', { value: element, enumerable: true });
        Object.defineProperty(reactEvent, 'currentTarget', { value: element, enumerable: true });
        element.dispatchEvent(reactEvent);
        
        setTimeout(() => {
          element.blur();
          setTimeout(() => {
            const finalValue = element.value || '';
            resolve(finalValue === value);
          }, 100);
        }, 50);
      } catch (error) {
        console.error('Error in fillFieldDirect:', error);
        resolve(false);
      }
    });
  }

  /**
   * Fill work experience entries
   * Workday typically has "Add Experience" buttons and forms for each entry
   */
  async fillWorkExperience(experienceArray) {
    let filledCount = 0;
    const usedExperiencePrefixes = new Set();
    
    try {
      console.log(`🔵 ========== FILL WORK EXPERIENCE START ==========`);
      console.log(`  Processing ${experienceArray.length} work experience entries...`);
      console.log('  Full experience array:', JSON.stringify(experienceArray, null, 2));
      
      // Debug: Log all buttons on the page
      console.log('  🔍 Searching for "Add Experience" buttons...');
      const allButtons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      console.log(`  Found ${allButtons.length} total buttons/links on page`);
      const addButtons = allButtons.filter(btn => {
        const text = (btn.textContent || btn.innerText || '').toLowerCase();
        return text.includes('add') && (text.includes('experience') || text.includes('work'));
      });
      console.log(`  Found ${addButtons.length} potential "Add Experience" buttons:`, addButtons.map(b => ({
        text: (b.textContent || b.innerText || '').trim(),
        id: b.id,
        'data-automation-id': b.getAttribute('data-automation-id'),
        visible: b.offsetParent !== null
      })));
      
      // Debug: Log all experience-related elements
      console.log('  🔍 Searching for experience-related elements...');
      const experienceElements = Array.from(document.querySelectorAll('[data-automation-id*="experience" i], [id*="experience" i], [class*="experience" i]'));
      console.log(`  Found ${experienceElements.length} experience-related elements`);
      experienceElements.slice(0, 10).forEach((el, idx) => {
        console.log(`    ${idx + 1}. ${el.tagName} id="${el.id}" class="${el.className}" data-automation-id="${el.getAttribute('data-automation-id')}"`);
      });
      
      for (let i = 0; i < experienceArray.length; i++) {
        const exp = experienceArray[i];
        console.log(`\n  ========== Processing experience ${i + 1}/${experienceArray.length} ==========`);
        console.log(`  Experience data:`, JSON.stringify(exp, null, 2));
        
        // Look for existing experience forms or "Add Experience" button
        const addButtonSelectors = [
          'button[data-automation-id*="add" i][data-automation-id*="experience" i]',
          'button[data-automation-id*="addExperience"]',
          'button[aria-label*="add" i][aria-label*="experience" i]',
          'button:has-text("Add Experience")',
          'button:has-text("Add Work Experience")',
          'a[data-automation-id*="add" i][data-automation-id*="experience" i]',
          // Generic add buttons near experience section
          'button[data-automation-id*="add"]',
        ];
        
        // Check if we need to click "Add Experience" button
        let experienceForm = null;
        let addButton = null;
        
        console.log(`  🔍 Looking for "Add Experience" button (entry ${i + 1})...`);
        for (const selector of addButtonSelectors) {
          try {
            if (selector.includes(':has-text')) {
              // Find by text content
              const buttons = Array.from(document.querySelectorAll('button, a'));
              addButton = buttons.find(btn => {
                const text = (btn.textContent || btn.innerText || '').toLowerCase();
                return text.includes('add') && text.includes('experience');
              });
              if (addButton) {
                console.log(`    Found button by text search: "${(addButton.textContent || addButton.innerText || '').trim()}"`);
              }
            } else {
              const found = document.querySelector(selector);
              if (found) {
                console.log(`    Found element with selector "${selector}":`, {
                  tag: found.tagName,
                  id: found.id,
                  text: (found.textContent || found.innerText || '').trim().substring(0, 50),
                  visible: found.offsetParent !== null,
                  disabled: found.disabled
                });
                if (found.offsetParent !== null && !found.disabled) {
                  addButton = found;
                }
              }
            }
            
            if (addButton && addButton.offsetParent !== null && !addButton.disabled) {
              console.log(`  ✅ Found "Add Experience" button with selector: ${selector}`);
              break;
            }
          } catch (e) {
            console.log(`    Selector "${selector}" failed:`, e.message);
          }
        }
        
        if (!addButton && i > 0) {
          console.warn(`  ⚠️ Could not find "Add Experience" button for entry ${i + 1}`);
        }
        
        // Find the experience form/container first
        // Workday often has multiple experience forms, we want the last/empty one
        console.log(`  🔍 Looking for experience form/container...`);
        const experienceSelectors = [
          '[data-automation-id*="experience"]',
          '[data-automation-id*="workExperience"]',
          '.experience-form',
          '.work-experience',
        ];
        
        let experienceForms = [];
        for (const selector of experienceSelectors) {
          const forms = Array.from(document.querySelectorAll(selector));
          const visibleForms = forms.filter(f => f.offsetParent !== null);
          console.log(`    Selector "${selector}": found ${forms.length} total, ${visibleForms.length} visible`);
          experienceForms.push(...visibleForms);
        }
        
        console.log(`  Found ${experienceForms.length} total visible experience forms`);
        
        // Always try to find and click "Add Experience" button if needed
        // For first entry, click if no forms exist. For subsequent entries, always click.
        const needsAddButton = (i === 0 && experienceForms.length === 0) || i > 0;
        
        if (needsAddButton) {
          // Re-find the add button fresh (it might have moved or changed)
          console.log(`  🔍 Searching for "Add Experience" button (entry ${i + 1}, needsButton=${needsAddButton})...`);
          addButton = null;
          
          // Try to find the button again - search for various button text patterns
          const allButtons = Array.from(document.querySelectorAll('button, a[role="button"], a'));
          const potentialAddButtons = allButtons.filter(btn => {
            const text = (btn.textContent || btn.innerText || '').toLowerCase();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            const automationId = (btn.getAttribute('data-automation-id') || '').toLowerCase();
            
            return (
              (text.includes('add') && (text.includes('experience') || text.includes('work'))) ||
              (ariaLabel.includes('add') && (ariaLabel.includes('experience') || ariaLabel.includes('work'))) ||
              (automationId.includes('add') && (automationId.includes('experience') || automationId.includes('work'))) ||
              text.includes('add another') ||
              text.includes('add experience') ||
              (automationId.includes('add') && text === 'add')
            ) &&
            btn.offsetParent !== null && 
            !btn.disabled &&
            !btn.hasAttribute('aria-hidden');
          });
          
          console.log(`  Found ${potentialAddButtons.length} potential "Add Experience" buttons`);
          potentialAddButtons.forEach((btn, idx) => {
            console.log(`    ${idx + 1}. "${(btn.textContent || btn.innerText || '').trim()}" id="${btn.id}" visible=${btn.offsetParent !== null}`);
          });
          
          if (potentialAddButtons.length > 0) {
            // Use the first visible, enabled button
            addButton = potentialAddButtons[0];
            console.log(`  ✅ Found "Add Experience" button, clicking for entry ${i + 1}...`);
            addButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer for form to appear
            
            // Re-find experience forms after clicking
            experienceForms = [];
            for (const selector of experienceSelectors) {
              const forms = Array.from(document.querySelectorAll(selector));
              const visibleForms = forms.filter(f => f.offsetParent !== null);
              experienceForms.push(...visibleForms);
            }
            console.log(`  Forms after clicking: ${experienceForms.length}`);
          } else {
            console.warn('  ⚠️ Could not find "Add Experience" button - will try to use existing forms');
          }
        }
        
        // Get the experience form - for first entry use first form, for subsequent entries use the last/empty one
        if (experienceForms.length > 0) {
          let selectedForm = null;
          for (const form of experienceForms) {
            const prefix = this.getOrInferContainerPrefix(form);
            if (!prefix || !usedExperiencePrefixes.has(prefix)) {
              selectedForm = form;
              if (prefix) {
                usedExperiencePrefixes.add(prefix);
                console.log(`  📛 Tracking experience prefix: ${prefix}`);
              }
              break;
            }
          }
          
          if (!selectedForm) {
            selectedForm = experienceForms[Math.min(i, experienceForms.length - 1)];
            const fallbackPrefix = this.getOrInferContainerPrefix(selectedForm);
            if (fallbackPrefix) {
              usedExperiencePrefixes.add(fallbackPrefix);
              console.log(`  📛 Using fallback experience prefix: ${fallbackPrefix}`);
            }
          }
          
          experienceForm = selectedForm;
          console.log(`  ✅ Using experience form ${experienceForms.indexOf(selectedForm) + 1} of ${experienceForms.length} (entry ${i + 1})`);
          console.log(`    Form details:`, {
            tag: experienceForm.tagName,
            id: experienceForm.id,
            class: experienceForm.className,
            'data-automation-id': experienceForm.getAttribute('data-automation-id')
          });
        } else {
          console.log(`  ⚠️ No experience forms found with standard selectors, trying fallback...`);
          // Fallback: look for form fields that might be experience-related
          console.log(`    Searching all inputs for experience-related fields...`);
          const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
          console.log(`    Total inputs on page: ${allInputs.length}`);
          const experienceInputs = allInputs.filter(input => {
            const id = (input.id || '').toLowerCase();
            const name = (input.name || '').toLowerCase();
            const label = (input.getAttribute('aria-label') || '').toLowerCase();
            const automationId = (input.getAttribute('data-automation-id') || '').toLowerCase();
            const isExperienceRelated = (id.includes('experience') || id.includes('work') || 
                   name.includes('experience') || name.includes('work') ||
                   label.includes('experience') || label.includes('work') ||
                   automationId.includes('experience') || automationId.includes('work')) &&
                   input.offsetParent !== null;
            return isExperienceRelated;
          });
          
          console.log(`    Found ${experienceInputs.length} experience-related input fields`);
          experienceInputs.slice(0, 5).forEach((input, idx) => {
            console.log(`      ${idx + 1}. ${input.tagName} id="${input.id}" name="${input.name}" aria-label="${input.getAttribute('aria-label')}"`);
          });
          
          if (experienceInputs.length > 0) {
            // Find common parent and expand it to include all related fields
            // CRITICAL: Filter out non-experience fields (like socialNetworkAccounts)
            const validExperienceInputs = experienceInputs.filter(input => {
              const id = (input.id || '').toLowerCase();
              const name = (input.name || '').toLowerCase();
              // Must contain "experience" or "work" and NOT contain other sections
              return (id.includes('experience') || id.includes('work') || 
                     name.includes('experience') || name.includes('work')) &&
                     !id.includes('social') && !id.includes('network') && 
                     !id.includes('education') && !id.includes('skill');
            });
            
            console.log(`    Filtered to ${validExperienceInputs.length} valid experience inputs (from ${experienceInputs.length} total)`);
            
            if (validExperienceInputs.length === 0) {
              console.warn('    ⚠️ No valid experience inputs found after filtering');
              continue;
            }
            
            let seedInput = null;
            for (let idx = validExperienceInputs.length - 1; idx >= 0; idx--) {
              const candidate = validExperienceInputs[idx];
              const prefix = this.getFieldGroupPrefix(candidate);
              if (!prefix || !usedExperiencePrefixes.has(prefix)) {
                seedInput = candidate;
                if (prefix) {
                  usedExperiencePrefixes.add(prefix);
                  console.log(`  📛 Using new experience prefix from input: ${prefix}`);
                }
                break;
              }
            }
            seedInput = seedInput || validExperienceInputs[validExperienceInputs.length - 1];
            
            const expandedContainer = this.expandContainerFromField(seedInput);
            experienceForm = expandedContainer || seedInput.closest('div, fieldset, form') || document.body;
            if (expandedContainer) {
              console.log(`  ✅ Expanded experience container to include related fields (${experienceForm.tagName})`);
            } else {
              console.log(`  ✅ Found experience form via input fields (container: ${experienceForm.tagName})`);
            }
            
            const prefix = this.getFieldGroupPrefix(seedInput);
            if (prefix) {
              this.containerPrefixCache.set(experienceForm, prefix);
              console.log(`    📛 Using experience field prefix: ${prefix}`);
            }
          } else {
            // Last resort: look for any input fields that might be in an experience section
            console.log(`    Last resort: checking all visible inputs for title/company fields...`);
            const titleInputs = allInputs.filter(input => {
              const id = (input.id || '').toLowerCase();
              const name = (input.name || '').toLowerCase();
              return (id.includes('title') || id.includes('position') || 
                     name.includes('title') || name.includes('position')) &&
                     input.offsetParent !== null;
            });
            console.log(`    Found ${titleInputs.length} title/position fields`);
            if (titleInputs.length > 0) {
              experienceForm = titleInputs[0].closest('div, fieldset, form') || document.body;
              console.log(`  ✅ Using form container found via title field`);
            }
          }
        }
        
        if (!experienceForm) {
          console.error(`  ❌ Could not find experience form for entry ${i + 1} - SKIPPING`);
          continue;
        }
        
        const experiencePrefix = this.getOrInferContainerPrefix(experienceForm);
        if (experiencePrefix) {
          usedExperiencePrefixes.add(experiencePrefix);
          console.log(`  🔗 Experience prefix for this form: ${experiencePrefix}`);
        }
        
        // Debug: Log all inputs in the form
        const formInputs = Array.from(experienceForm.querySelectorAll('input, textarea, select'));
        console.log(`  📋 Form contains ${formInputs.length} input/textarea/select elements`);
        formInputs.slice(0, 10).forEach((input, idx) => {
          console.log(`    ${idx + 1}. ${input.tagName} id="${input.id}" name="${input.name}" type="${input.type}" placeholder="${input.placeholder || ''}"`);
        });
        
        // Fill experience fields
        const title = exp.title || exp.position || '';
        const company = exp.company || exp.employer || '';
        const duration = exp.duration || exp.period || exp.years || '';
        const description = exp.description || exp.responsibilities || '';
        
        // Find and fill job title
        if (title) {
          console.log(`  🔍 Looking for job title field with value: "${title}"`);
          const titleField = this.findFieldInContainer(experienceForm, [
            'input[id*="title" i]',
            'input[name*="title" i]',
            'input[id*="position" i]',
            'input[name*="position" i]',
            'input[aria-label*="title" i]',
            'input[aria-label*="position" i]',
            'input[data-automation-id*="title" i]',
            'input[data-automation-id*="position" i]',
          ]);
          
          if (titleField) {
            console.log(`  ✅ Found title field:`, {
              id: titleField.id,
              name: titleField.name,
              type: titleField.type,
              'data-automation-id': titleField.getAttribute('data-automation-id'),
              currentValue: titleField.value || 'empty'
            });
            const filled = await this.fillField(titleField, title);
            
            // Wait and verify the value persisted
            await new Promise(resolve => setTimeout(resolve, 500));
            const verifyValue = titleField.value || '';
            console.log(`  🔍 Title field value after fill: "${verifyValue}"`);
            
            if (filled && verifyValue && verifyValue.trim().length > 0) {
              console.log(`  ✅ Filled job title: "${title}" (verified: "${verifyValue}")`);
              filledCount++;
            } else if (filled) {
              console.warn(`  ⚠️ Fill reported success but value is empty, retrying...`);
              // Retry with direct method
              this.setNativeInputValue(titleField, title);
              this.updateReactState(titleField, title);
              await new Promise(resolve => setTimeout(resolve, 300));
              const retryValue = titleField.value || '';
              if (retryValue && retryValue.trim().length > 0) {
                console.log(`  ✅ Retry successful: "${retryValue}"`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ Failed to fill job title field after retry`);
              }
            } else {
              console.warn(`  ⚠️ Failed to fill job title field`);
            }
          } else {
            console.warn(`  ⚠️ Could not find job title field`);
          }
        } else {
          console.warn(`  ⚠️ No title data provided for experience entry ${i + 1}`);
        }
        
        // Find and fill company
        if (company) {
          console.log(`  🔍 Looking for company field with value: "${company}"`);
          const companyField = this.findFieldInContainer(experienceForm, [
            'input[id*="company" i]',
            'input[name*="company" i]',
            'input[id*="employer" i]',
            'input[name*="employer" i]',
            'input[aria-label*="company" i]',
            'input[aria-label*="employer" i]',
            'input[data-automation-id*="company" i]',
            'input[data-automation-id*="employer" i]',
          ]);
          
          if (companyField) {
            console.log(`  ✅ Found company field:`, {
              id: companyField.id,
              name: companyField.name,
              type: companyField.type,
              currentValue: companyField.value || 'empty'
            });
            const filled = await this.fillField(companyField, company);
            
            // Wait and verify the value persisted
            await new Promise(resolve => setTimeout(resolve, 500));
            const verifyValue = companyField.value || '';
            console.log(`  🔍 Company field value after fill: "${verifyValue}"`);
            
            if (filled && verifyValue && verifyValue.trim().length > 0) {
              console.log(`  ✅ Filled company: "${company}" (verified: "${verifyValue}")`);
              filledCount++;
            } else if (filled) {
              console.warn(`  ⚠️ Fill reported success but value is empty, retrying...`);
              // Retry with direct method
              this.setNativeInputValue(companyField, company);
              this.updateReactState(companyField, company);
              await new Promise(resolve => setTimeout(resolve, 300));
              const retryValue = companyField.value || '';
              if (retryValue && retryValue.trim().length > 0) {
                console.log(`  ✅ Retry successful: "${retryValue}"`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ Failed to fill company field after retry`);
              }
            } else {
              console.warn(`  ⚠️ Failed to fill company field`);
            }
          } else {
            console.warn(`  ⚠️ Could not find company field`);
          }
        } else {
          console.warn(`  ⚠️ No company data provided for experience entry ${i + 1}`);
        }
        
        // Find and fill duration/date range
        if (duration) {
          console.log(`  🔍 Looking for date fields with duration: "${duration}"`);
          const dateFields = this.findDateFieldsInContainer(experienceForm, experiencePrefix);
          
          console.log(`  📋 Date fields found:`, {
            hasStartDate: !!dateFields.startDate,
            hasEndDate: !!dateFields.endDate,
            startDateTag: dateFields.startDate?.tagName,
            startDateId: dateFields.startDate?.id,
            startDateName: dateFields.startDate?.name,
            startDateValue: dateFields.startDate?.value,
            endDateTag: dateFields.endDate?.tagName,
            endDateId: dateFields.endDate?.id,
            endDateName: dateFields.endDate?.name,
            endDateValue: dateFields.endDate?.value,
            startMonthId: dateFields.startMonth?.id,
            startYearId: dateFields.startYear?.id,
            endMonthId: dateFields.endMonth?.id,
            endYearId: dateFields.endYear?.id
          });
          
          const parsedDates = this.parseDurationRange(duration);
          let structuredFilled = false;
          let structuredLog = [];
          
          // Define fillDatePart as arrow function to access structuredFilled from outer scope
          const fillDatePart = async (label, field, value) => {
            if (!field || !value) {
              console.log(`    ⏭️ Skipping ${label} - field or value missing`);
              return false;
            }
            
            console.log(`  📅 Filling ${label} with value: "${value}"`);
            console.log(`    Field details: ${field.tagName} id="${field.id}" type="${field.type}" name="${field.name}"`);
            
            // CRITICAL: For date fields, we need to click/focus them first to activate any date pickers
            console.log(`    🖱️ Clicking/focusing ${label} field first...`);
            field.focus();
            field.click();
            await new Promise(resolve => setTimeout(resolve, 300)); // Wait for any date picker to appear
            
            // Use the same fillField method that works for title and company
            const filled = await this.fillField(field, value);
            
            // Wait and verify the value persisted (same as title/company)
            await new Promise(resolve => setTimeout(resolve, 500));
            const verifyValue = field.value || '';
            console.log(`    ✅ ${label} final value after fillField: "${verifyValue}"`);
            
            if (filled && verifyValue && verifyValue.trim().length > 0) {
              structuredFilled = true;
              structuredLog.push(`${label}=${verifyValue}`);
              filledCount++;
              console.log(`    ✅ Successfully filled ${label}`);
              
              // Trigger blur to ensure validation runs
              field.blur();
              await new Promise(resolve => setTimeout(resolve, 200));
              
              return true;
            } else if (filled) {
              console.warn(`    ⚠️ Fill reported success but value is empty, retrying with direct method...`);
              // Retry with direct method (same as title/company)
              field.focus();
              this.setNativeInputValue(field, value);
              this.updateReactState(field, value);
              
              // Trigger all events manually
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              
              await new Promise(resolve => setTimeout(resolve, 300));
              const retryValue = field.value || '';
              console.log(`    🔍 ${label} value after retry: "${retryValue}"`);
              
              if (retryValue && retryValue.trim().length > 0) {
                console.log(`    ✅ Retry successful: "${retryValue}"`);
                structuredFilled = true;
                structuredLog.push(`${label}=${retryValue}`);
                filledCount++;
                
                // Trigger blur to ensure validation runs
                field.blur();
                await new Promise(resolve => setTimeout(resolve, 200));
                
                return true;
              } else {
                console.warn(`    ❌ Failed to fill ${label} after retry`);
                return false;
              }
            } else {
              console.warn(`    ❌ Failed to fill ${label} - fillField returned false`);
              return false;
            }
          };
          
          if (parsedDates) {
            console.log(`  📅 Parsed dates:`, parsedDates);
            
            // Try structured fields first (separate month/year fields)
            if (dateFields.startMonth || dateFields.startYear || dateFields.endMonth || dateFields.endYear) {
              console.log(`  📋 Using structured date fields (separate month/year)`);
              await fillDatePart('startMonth', dateFields.startMonth, parsedDates.startMonth);
              await fillDatePart('startYear', dateFields.startYear, parsedDates.startYear);
              await fillDatePart('endMonth', dateFields.endMonth, parsedDates.endMonth);
              await fillDatePart('endYear', dateFields.endYear, parsedDates.endYear);
            }
            // Fallback: try single date fields (startDate/endDate) with full date format
            else if (dateFields.startDate || dateFields.endDate) {
              console.log(`  📋 Using single date fields (startDate/endDate)`);
              
              // Format: MM/YYYY or just YYYY depending on field type
              const startDateValue = parsedDates.startMonth && parsedDates.startYear 
                ? `${parsedDates.startMonth}/${parsedDates.startYear}`
                : parsedDates.startYear;
              
              const endDateValue = parsedDates.endMonth && parsedDates.endYear
                ? `${parsedDates.endMonth}/${parsedDates.endYear}`
                : parsedDates.endYear;
              
              if (dateFields.startDate && startDateValue) {
                await fillDatePart('startDate', dateFields.startDate, startDateValue);
              }
              
              if (dateFields.endDate && endDateValue) {
                await fillDatePart('endDate', dateFields.endDate, endDateValue);
              }
            } else {
              console.warn(`  ⚠️ No date fields found (neither structured nor single fields)`);
            }
          }
          
          if (structuredFilled) {
            console.log(`  ✅ Filled structured date parts: ${structuredLog.join(', ')}`);
          } else if (dateFields.startDate && dateFields.endDate) {
            // Fallback to legacy approach
            const dateMatch = duration.match(/(\d{4})\s*[–-]\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              const startYear = dateMatch[1];
              const endYear = dateMatch[2].toLowerCase() === 'present' || dateMatch[2].toLowerCase() === 'current' 
                ? new Date().getFullYear().toString() 
                : dateMatch[2];
              
              console.log(`  Parsed dates: start="${startYear}", end="${endYear}"`);
              
              const startDateEl = dateFields.startDate;
              const endDateEl = dateFields.endDate;
              
              const fillDateElement = async (el, value) => {
                if (!el) return;
                if (el.tagName === 'BUTTON' || el.tagName === 'DIV') {
                  const clickable = el.tagName === 'BUTTON' ? el : (el.querySelector('button') || el);
                  clickable.click();
                  await this.delay(300);
                  await this.fillCustomDropdown(clickable, value);
                } else if (el.tagName === 'SELECT') {
                  await this.fillSelectDropdown(el, value);
                } else {
                  const success = await this.fillField(el, value);
                  if (!success) {
                    await this.fillCustomDropdown(el, value);
                  }
                }
              };
              
              await fillDateElement(startDateEl, startYear);
              await fillDateElement(endDateEl, endYear);
              
              console.log(`  ✅ Filled dates: ${startYear} - ${endYear}`);
              filledCount++;
            } else {
              const durationField = this.findFieldInContainer(experienceForm, [
                'input[id*="duration" i]',
                'input[name*="duration" i]',
                'input[id*="period" i]',
                'input[name*="period" i]',
                'input[id*="date" i]',
                'input[name*="date" i]',
              ]);
              
              if (durationField) {
                await this.fillField(durationField, duration);
                console.log(`  ✅ Filled duration: "${duration}"`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ Could not find date/duration fields`);
              }
            }
          } else {
            const durationField = this.findFieldInContainer(experienceForm, [
              'input[id*="duration" i]',
              'input[name*="duration" i]',
              'input[id*="period" i]',
              'input[name*="period" i]',
              'input[id*="date" i]',
              'input[name*="date" i]',
            ]);
            
            if (durationField) {
              await this.fillField(durationField, duration);
              console.log(`  ✅ Filled duration: "${duration}"`);
              filledCount++;
            } else {
              console.warn(`  ⚠️ Could not find date/duration fields`);
            }
          }
          
          if (parsedDates?.endIsPresent) {
            const currentCheckbox = experienceForm.querySelector('input[type="checkbox"][id*="currentlyWorkHere" i]') ||
              experienceForm.querySelector('input[type="checkbox"][name*="currentlyWorkHere" i]');
            if (currentCheckbox && !currentCheckbox.checked) {
              currentCheckbox.click();
              currentCheckbox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              console.log('  ✅ Marked "I currently work here" checkbox');
            }
          }
        }
        
        // Find and fill description/responsibilities
        if (description) {
          const descField = this.findFieldInContainer(experienceForm, [
            'textarea[id*="description" i]',
            'textarea[name*="description" i]',
            'textarea[id*="responsibilities" i]',
            'textarea[name*="responsibilities" i]',
            'textarea[aria-label*="description" i]',
            'textarea[data-automation-id*="description" i]',
          ]);
          
          if (descField) {
            await this.fillField(descField, description);
            console.log(`  ✅ Filled description`);
            filledCount++;
          }
        }
        
        // Wait between entries
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`🔵 ========== FILL WORK EXPERIENCE END ==========`);
      console.log(`  Total fields filled: ${filledCount}`);
      return filledCount;
    } catch (error) {
      console.error('❌ Error filling work experience:', error);
      console.error('  Error stack:', error.stack);
      return filledCount;
    }
  }

  /**
   * Fill education entries
   * Similar to work experience but for education
   */
  async fillEducation(educationArray) {
    let filledCount = 0;
    
    try {
      console.log(`🔵 ========== FILL EDUCATION START ==========`);
      console.log(`  Processing ${educationArray.length} education entries...`);
      console.log('  Full education array:', JSON.stringify(educationArray, null, 2));
      
      // Debug: Log all buttons on the page
      console.log('  🔍 Searching for "Add Education" buttons...');
      const allButtons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      const addButtons = allButtons.filter(btn => {
        const text = (btn.textContent || btn.innerText || '').toLowerCase();
        return text.includes('add') && text.includes('education');
      });
      console.log(`  Found ${addButtons.length} potential "Add Education" buttons:`, addButtons.map(b => ({
        text: (b.textContent || b.innerText || '').trim(),
        id: b.id,
        'data-automation-id': b.getAttribute('data-automation-id'),
        visible: b.offsetParent !== null
      })));
      
      // Debug: Log all education-related elements
      console.log('  🔍 Searching for education-related elements...');
      const educationElements = Array.from(document.querySelectorAll('[data-automation-id*="education" i], [id*="education" i], [class*="education" i]'));
      console.log(`  Found ${educationElements.length} education-related elements`);
      educationElements.slice(0, 10).forEach((el, idx) => {
        console.log(`    ${idx + 1}. ${el.tagName} id="${el.id}" class="${el.className}"`);
      });
      
      for (let i = 0; i < educationArray.length; i++) {
        const edu = educationArray[i];
        console.log(`\n  ========== Processing education ${i + 1}/${educationArray.length} ==========`);
        console.log(`  Education data:`, JSON.stringify(edu, null, 2));
        
        // Look for "Add Education" button
        const addButtonSelectors = [
          'button[data-automation-id*="add" i][data-automation-id*="education" i]',
          'button[data-automation-id*="addEducation"]',
          'button[aria-label*="add" i][aria-label*="education" i]',
          'button:has-text("Add Education")',
          'a[data-automation-id*="add" i][data-automation-id*="education" i]',
          'button[data-automation-id*="add"]',
        ];
        
        let addButton = null;
        for (const selector of addButtonSelectors) {
          try {
            if (selector.includes(':has-text')) {
              const buttons = Array.from(document.querySelectorAll('button, a'));
              addButton = buttons.find(btn => {
                const text = (btn.textContent || btn.innerText || '').toLowerCase();
                return text.includes('add') && text.includes('education');
              });
            } else {
              addButton = document.querySelector(selector);
            }
            
            if (addButton && addButton.offsetParent !== null && !addButton.disabled) {
              console.log(`  Found "Add Education" button`);
              break;
            }
          } catch (e) {
            // Invalid selector, continue
          }
        }
        
        // Click add button if needed
        if (addButton && i > 0) {
          console.log('  Clicking "Add Education" button...');
          addButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Find education form
        const educationSelectors = [
          '[data-automation-id*="education"]',
          '.education-form',
        ];
        
        let educationForms = [];
        for (const selector of educationSelectors) {
          const forms = Array.from(document.querySelectorAll(selector));
          educationForms.push(...forms.filter(f => f.offsetParent !== null));
        }
        
        let educationForm = null;
        let educationPrefix = null;
        if (educationForms.length > 0) {
          educationForm = educationForms[educationForms.length - 1];
          educationPrefix = this.getOrInferContainerPrefix(educationForm);
          console.log(`  Found education form (${educationForms.length} total)`);
          if (educationPrefix) {
            console.log(`    📛 Education field prefix: ${educationPrefix}`);
          }
        } else {
          // Fallback: find by input fields
          const allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
          const educationInputs = allInputs.filter(input => {
            const id = (input.id || '').toLowerCase();
            const name = (input.name || '').toLowerCase();
            return (id.includes('education') || id.includes('school') || id.includes('degree') ||
                   name.includes('education') || name.includes('school') || name.includes('degree')) &&
                   input.offsetParent !== null;
          });
          
          if (educationInputs.length > 0) {
            const expandedContainer = this.expandContainerFromField(educationInputs[0]);
            educationForm = expandedContainer || educationInputs[0].closest('div, fieldset, form') || document.body;
            console.log(`  Found education form via input fields (${educationForm.tagName})`);
            
            const prefix = this.getFieldGroupPrefix(educationInputs[0]);
            if (prefix) {
              this.containerPrefixCache.set(educationForm, prefix);
              educationPrefix = prefix;
              console.log(`    📛 Using education field prefix: ${prefix}`);
            }
          }
        }
        
        if (!educationPrefix) {
          educationPrefix = this.getOrInferContainerPrefix(educationForm);
          if (educationPrefix) {
            console.log(`    📛 Inferred education prefix: ${educationPrefix}`);
          }
        }
        
        if (!educationForm) {
          console.warn(`  ⚠️ Could not find education form for entry ${i + 1}`);
          continue;
        }
        
        // Fill education fields
        const school = edu.school || edu.name || edu.institution || '';
        const degreeRaw = edu.degree || edu.field || edu.major || '';
        const years = edu.years || edu.duration || edu.period || '';
        
        // Parse degree: "Bachelor's, Computer Science" -> degree="Bachelor's" fieldOfStudy="Computer Science"
        let degree = degreeRaw;
        let extractedFieldOfStudy = edu.fieldOfStudy || '';
        
        if (degreeRaw && degreeRaw.includes(',')) {
          const parts = degreeRaw.split(',').map(p => p.trim());
          degree = parts[0]; // "Bachelor's" or "Bachelor's of Science"
          extractedFieldOfStudy = parts[1] || extractedFieldOfStudy; // "Computer Science"
          console.log(`  📋 Parsed degree: "${degree}", field of study: "${extractedFieldOfStudy}"`);
        }
        
        // Fill school name
        if (school) {
          const schoolField = this.findFieldInContainer(educationForm, [
            'input[id*="school" i]',
            'input[name*="school" i]',
            'input[id*="institution" i]',
            'input[name*="institution" i]',
            'input[id*="university" i]',
            'input[name*="university" i]',
            'input[aria-label*="school" i]',
            'input[data-automation-id*="school" i]',
          ]);
          
          if (schoolField) {
            console.log(`  ✅ Found school field:`, {
              id: schoolField.id,
              name: schoolField.name,
              type: schoolField.type,
              currentValue: schoolField.value || 'empty'
            });
            
            const filled = await this.fillField(schoolField, school);
            
            // Wait and verify the value persisted
            await new Promise(resolve => setTimeout(resolve, 300));
            const verifyValue = schoolField.value || '';
            console.log(`  🔍 School field value after fill: "${verifyValue}"`);
            
            if (filled && verifyValue && verifyValue.trim().length > 0) {
              console.log(`  ✅ Filled school: "${school}" (verified: "${verifyValue}")`);
              filledCount++;
            } else if (filled) {
              console.warn(`  ⚠️ Fill reported success but value is empty, retrying...`);
              // Retry with direct method
              this.setNativeInputValue(schoolField, school);
              this.updateReactState(schoolField, school);
              await new Promise(resolve => setTimeout(resolve, 200));
              const retryValue = schoolField.value || '';
              if (retryValue && retryValue.trim().length > 0) {
                console.log(`  ✅ Retry successful: "${retryValue}"`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ Failed to fill school field after retry`);
              }
            } else {
              console.warn(`  ⚠️ Failed to fill school field`);
            }
          } else {
            console.warn(`  ⚠️ Could not find school field`);
          }
        }
        
        // Fill field of study (use extracted value from degree parsing above)
        const fieldOfStudy = extractedFieldOfStudy || edu.fieldOfStudy || '';
        if (fieldOfStudy) {
          console.log(`  🔍 Looking for field of study field with value: "${fieldOfStudy}"`);
          const fieldOfStudyField = this.findFieldInContainer(educationForm, [
            'input[id*="fieldOfStudy" i]',
            'input[id*="field" i]',
            'input[name*="fieldOfStudy" i]',
            'input[name*="field" i]',
            'input[aria-label*="field" i]',
            'input[data-automation-id*="field" i]',
          ]);
          
          if (fieldOfStudyField) {
            console.log(`  ✅ Found field of study field:`, {
              id: fieldOfStudyField.id,
              name: fieldOfStudyField.name,
              type: fieldOfStudyField.type,
              currentValue: fieldOfStudyField.value || 'empty'
            });
            
            // Resolve "Computer Science" to "Computer and Information Science" for Workday dropdown
            const fieldValue = this.resolveFieldOfStudyValue(fieldOfStudy);
            console.log(`  📋 Resolved field of study: "${fieldOfStudy}" -> "${fieldValue}"`);
            
            // Try custom dropdown first (most reliable for Workday)
            let fieldFilled = await this.fillCustomDropdown(fieldOfStudyField, fieldValue);
            
            // Verify the value persisted
            await new Promise(resolve => setTimeout(resolve, 300));
            const verifyValue = fieldOfStudyField.value || '';
            console.log(`  🔍 Field of study value after fill: "${verifyValue}"`);
            
            if (fieldFilled && verifyValue && verifyValue.trim().length > 0) {
              console.log(`  ✅ Filled field of study: "${fieldValue}" (verified: "${verifyValue}")`);
              filledCount++;
            } else {
              console.warn(`  ⚠️ Custom dropdown fill failed or value empty, trying fallback...`);
              // Fallback: try regular fillField
              fieldFilled = await this.fillField(fieldOfStudyField, fieldOfStudy);
              await new Promise(resolve => setTimeout(resolve, 300));
              const retryValue = fieldOfStudyField.value || '';
              
              if (fieldFilled && retryValue && retryValue.trim().length > 0) {
                console.log(`  ✅ Filled field of study via fallback: "${retryValue}"`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ All methods failed to fill field of study field`);
              }
            }
          } else {
            console.warn(`  ⚠️ Could not find field of study field`);
          }
        }
        
        // Fill degree
        if (degree) {
          console.log(`  🔍 Looking for degree field with value: "${degree}"`);
          // Degree field can be a button, select, or input in Workday
          // Try searching in the entire document if not found in container
          let degreeField = this.findFieldInContainer(educationForm, [
            'button[id*="degree" i]',
            'button[data-automation-id*="degree" i]',
            'select[id*="degree" i]',
            'select[name*="degree" i]',
            'input[id*="degree" i]',
            'input[name*="degree" i]',
            'input[id*="field" i]',
            'input[name*="field" i]',
            'input[id*="major" i]',
            'input[name*="major" i]',
            'input[aria-label*="degree" i]',
            'input[data-automation-id*="degree" i]',
          ]);
          
          // If not found in container, try searching globally with education ID pattern
          if (!degreeField) {
            console.log('    Degree field not found in container, searching globally...');
            const allDegreeButtons = Array.from(document.querySelectorAll('button[id*="degree" i]'));
            const matchingButton = allDegreeButtons.find(btn => {
              const id = btn.id.toLowerCase();
              // Match education-X--degree pattern
              return id.includes('education') && id.includes('degree') && btn.offsetParent !== null;
            });
            if (matchingButton) {
              degreeField = matchingButton;
              console.log(`    Found degree button globally: ${degreeField.id}`);
            }
          }
          
          if (degreeField) {
            console.log(`  ✅ Found degree field:`, {
              tag: degreeField.tagName,
              id: degreeField.id,
              name: degreeField.name,
              type: degreeField.type
            });
            
            // Resolve degree value for Workday dropdown (e.g., "Bachelor's" -> "Bachelor of Science")
            const degreeValue = this.resolveDegreeDropdownValue(degree, extractedFieldOfStudy);
            console.log(`  📋 Resolved degree: "${degree}" -> "${degreeValue}"`);
            
            // If it's a button, click it first to open dropdown, then use custom dropdown fill
            if (degreeField.tagName === 'BUTTON') {
              console.log('  Degree field is a BUTTON, clicking to open dropdown...');
              // Don't click yet - let fillCustomDropdown handle it
              // degreeField.click();
              // await new Promise(resolve => setTimeout(resolve, 500));
              
              // Now try to fill using custom dropdown logic (which will click the button)
              const dropdownFilled = await this.fillCustomDropdown(degreeField, degreeValue);
              
              // Verify the value was set
              await new Promise(resolve => setTimeout(resolve, 300));
              const verifyText = degreeField.textContent || degreeField.innerText || '';
              console.log(`  🔍 Degree button text after fill: "${verifyText}"`);
              
              if (dropdownFilled && verifyText && verifyText.trim().length > 0) {
                console.log(`  ✅ Filled degree via button dropdown: "${degreeValue}" (verified: "${verifyText}")`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ Failed to fill degree button dropdown, trying again...`);
                // Retry once more
                const retryFilled = await this.fillCustomDropdown(degreeField, degreeValue);
                await new Promise(resolve => setTimeout(resolve, 300));
                const retryText = degreeField.textContent || degreeField.innerText || '';
                if (retryFilled && retryText && retryText.trim().length > 0) {
                  console.log(`  ✅ Retry successful: "${retryText}"`);
                  filledCount++;
                } else {
                  console.warn(`  ⚠️ Degree button fill failed after retry`);
                }
              }
            } else if (degreeField.tagName === 'SELECT') {
              const filled = await this.fillSelectDropdown(degreeField, degreeValue);
              if (filled) {
                console.log(`  ✅ Filled degree via select dropdown: "${degreeValue}"`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ Failed to fill degree select dropdown`);
              }
            } else {
              // Try regular fill first
              let filled = await this.fillCustomDropdown(degreeField, degreeValue);
              if (!filled) {
                filled = await this.fillField(degreeField, degreeValue);
              }
              if (!filled) {
                this.setNativeInputValue(degreeField, degreeValue);
                filled = true;
              }
              
              if (filled) {
                console.log(`  ✅ Filled degree: "${degreeValue}"`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ Failed to fill degree field`);
              }
            }
          } else {
            console.warn(`  ⚠️ Could not find degree field`);
          }
        }
        
        // Fill years/duration
        if (years) {
          console.log(`  🔍 Looking for date/year fields with value: "${years}"`);
          const dateFields = this.findDateFieldsInContainer(educationForm, educationPrefix);
          
          console.log(`  Date fields found:`, {
            hasStartDate: !!dateFields.startDate,
            hasEndDate: !!dateFields.endDate,
            startDateId: dateFields.startDate?.id,
            endDateId: dateFields.endDate?.id
          });
          
          if (dateFields.startDate && dateFields.endDate) {
            const dateMatch = years.match(/(\d{4})\s*[–-]\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              const startYear = dateMatch[1];
              const endYear = dateMatch[2].toLowerCase() === 'present' || dateMatch[2].toLowerCase() === 'current'
                ? new Date().getFullYear().toString()
                : dateMatch[2];
              
              console.log(`  Parsed education dates: start="${startYear}", end="${endYear}"`);
              
              // Fill start date - handle buttons, divs, selects, and inputs
              const startDateEl = dateFields.startDate;
              console.log(`  🔍 Start date element:`, {
                tag: startDateEl.tagName,
                id: startDateEl.id,
                name: startDateEl.name
              });
              
              let startFilled = false;
              if (startDateEl.tagName === 'BUTTON' || startDateEl.tagName === 'DIV') {
                console.log(`  Education start date is a ${startDateEl.tagName}, using custom dropdown`);
                startFilled = await this.fillCustomDropdown(startDateEl, startYear);
              } else if (startDateEl.tagName === 'SELECT') {
                console.log('  Education start date is a SELECT, using fillSelectDropdown');
                startFilled = await this.fillSelectDropdown(startDateEl, startYear);
              } else if (startDateEl.tagName === 'INPUT') {
                console.log('  Education start date is an INPUT, trying fillField');
                startFilled = await this.fillField(startDateEl, startYear);
                if (!startFilled) {
                  console.log('  Education start date fillField failed, trying direct set');
                  this.setNativeInputValue(startDateEl, startYear);
                  startFilled = true;
                }
              }
              
              // Verify start date was set
              await new Promise(resolve => setTimeout(resolve, 200));
              const startValue = startDateEl.value || startDateEl.textContent || startDateEl.innerText || '';
              console.log(`  🔍 Start date value after fill: "${startValue}"`);
              if (startFilled && startValue.includes(startYear)) {
                console.log(`  ✅ Start date filled: ${startYear}`);
              } else {
                console.warn(`  ⚠️ Start date may not have filled correctly`);
              }
              
              // Fill end date - handle buttons, divs, selects, and inputs
              const endDateEl = dateFields.endDate;
              console.log(`  🔍 End date element:`, {
                tag: endDateEl.tagName,
                id: endDateEl.id,
                name: endDateEl.name
              });
              
              let endFilled = false;
              if (endDateEl.tagName === 'BUTTON' || endDateEl.tagName === 'DIV') {
                console.log(`  Education end date is a ${endDateEl.tagName}, using custom dropdown`);
                endFilled = await this.fillCustomDropdown(endDateEl, endYear);
              } else if (endDateEl.tagName === 'SELECT') {
                console.log('  Education end date is a SELECT, using fillSelectDropdown');
                endFilled = await this.fillSelectDropdown(endDateEl, endYear);
              } else if (endDateEl.tagName === 'INPUT') {
                console.log('  Education end date is an INPUT, trying fillField');
                endFilled = await this.fillField(endDateEl, endYear);
                if (!endFilled) {
                  console.log('  Education end date fillField failed, trying direct set');
                  this.setNativeInputValue(endDateEl, endYear);
                  endFilled = true;
                }
              }
              
              // Verify end date was set
              await new Promise(resolve => setTimeout(resolve, 200));
              const endValue = endDateEl.value || endDateEl.textContent || endDateEl.innerText || '';
              console.log(`  🔍 End date value after fill: "${endValue}"`);
              if (endFilled && endValue.includes(endYear)) {
                console.log(`  ✅ End date filled: ${endYear}`);
              } else {
                console.warn(`  ⚠️ End date may not have filled correctly`);
              }
              
              if (startFilled || endFilled) {
                console.log(`  ✅ Filled education dates: ${startYear} - ${endYear}`);
                filledCount++;
              } else {
                console.warn(`  ⚠️ Failed to fill education dates`);
              }
            } else {
              console.warn(`  ⚠️ Could not parse date format: "${years}"`);
            }
          } else {
            const yearsField = this.findFieldInContainer(educationForm, [
              'select[id*="year" i]',
              'select[name*="year" i]',
              'input[id*="year" i]',
              'input[name*="year" i]',
              'input[id*="duration" i]',
              'input[name*="duration" i]',
            ]);
            
            if (yearsField) {
              if (yearsField.tagName === 'SELECT') {
                await this.fillSelectDropdown(yearsField, years);
              } else {
                await this.fillField(yearsField, years);
              }
              console.log(`  ✅ Filled years: "${years}"`);
              filledCount++;
            } else {
              console.warn(`  ⚠️ Could not find year/duration fields`);
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`🔵 ========== FILL EDUCATION END ==========`);
      console.log(`  Total fields filled: ${filledCount}`);
      return filledCount;
    } catch (error) {
      console.error('❌ Error filling education:', error);
      console.error('  Error stack:', error.stack);
      return filledCount;
    }
  }

  /**
   * Helper: Find field in a specific container
   */
  findFieldInContainer(container, selectors) {
    if (!container) {
      console.log('    ⚠️ findFieldInContainer: No container provided');
      return null;
    }
    
    console.log(`    🔍 Searching in container: ${container.tagName} id="${container.id}"`);
    
    for (const selector of selectors) {
      try {
        const field = container.querySelector(selector);
        if (field) {
          // For buttons and divs, we don't need to check isFieldValid the same way
          const isButtonOrDiv = field.tagName === 'BUTTON' || field.tagName === 'DIV';
          const isValid = isButtonOrDiv ? (field.offsetParent !== null && !field.disabled) : this.isFieldValid(field);
          
          console.log(`      Found element with selector "${selector}":`, {
            tag: field.tagName,
            id: field.id,
            name: field.name,
            type: field.type,
            visible: field.offsetParent !== null,
            disabled: field.disabled,
            readOnly: field.readOnly,
            valid: isValid
          });
          
          if (isValid) {
            console.log(`      ✅ Field is valid, returning it`);
            return field;
          } else {
            console.log(`      ⏭️ Field found but not valid (hidden/disabled/readonly)`);
          }
        }
      } catch (e) {
        console.log(`      ⚠️ Selector "${selector}" failed:`, e.message);
      }
    }
    
    const prefix = this.getContainerFieldPrefix(container);
    if (prefix) {
      console.log(`    🔁 No valid field in container. Trying global search with prefix "${prefix}"...`);
      const globalField = this.findFieldGloballyWithPrefix(selectors, prefix);
      if (globalField) {
        const isButtonOrDiv = globalField.tagName === 'BUTTON' || globalField.tagName === 'DIV';
        const isValid = isButtonOrDiv ? (globalField.offsetParent !== null && !globalField.disabled) : this.isFieldValid(globalField);
        if (isValid) {
          console.log(`    ✅ Global search succeeded with field id="${globalField.id}"`);
          return globalField;
        }
      }
    }
    
    console.log(`    ⚠️ No valid field found with any selector`);
    return null;
  }

  /**
   * Helper: Find date fields (start/end) in container
   */
  findDateFieldsInContainer(container, prefix = null) {
    const result = { 
      startDate: null, 
      endDate: null,
      startMonth: null,
      startYear: null,
      endMonth: null,
      endYear: null
    };
    
    if (!container) {
      console.log('    ⚠️ findDateFieldsInContainer: No container provided');
      return result;
    }
    
    console.log('    🔍 Finding date fields in container...');
    const pickVisible = (elements = []) => {
      for (const el of elements) {
        if (this.isFieldValid(el)) return el;
      }
      return null;
    };
    
    // Look for start date fields - PRIORITIZE INPUT fields over DIVs (DIVs are just labels)
    const startSelectors = [
      // "From" fields first (exact match for the error message)
      'input[id*="from" i][id*="input" i]',
      'input[id*="from" i]',
      'input[name*="from" i]',
      'input[aria-label*="from" i]',
      'input[data-automation-id*="from" i]',
      // First year attended
      'input[id*="firstYearAttended" i][id*="input" i]', // Workday pattern: education-X--firstYearAttended-dateSectionYear-input
      'input[id*="firstYear" i]',
      // Start date variations
      'input[id*="start" i][id*="year" i]',
      'input[id*="start" i][id*="date" i]',
      'input[name*="start" i][name*="date" i]',
      'input[aria-label*="start" i]',
      'input[data-automation-id*="start" i]',
      // Button and select elements
      'button[id*="from" i]',
      'button[id*="start" i][id*="date" i]',
      'button[id*="start" i][id*="year" i]',
      'button[id*="first" i][id*="year" i]',
      'select[id*="from" i]',
      'select[name*="from" i]',
      'select[id*="start" i][id*="date" i]',
      'select[id*="start" i][id*="year" i]',
      'select[name*="start" i][name*="date" i]',
      '[data-automation-id*="from" i]',
      '[data-automation-id*="first" i][data-automation-id*="year" i]',
      // DIVs last as fallback only
      'div[id*="from" i]',
      'div[id*="start" i][id*="date" i]',
      'div[id*="firstYearAttended" i]',
      'div[id*="first" i][id*="year" i]',
    ];
    
    // Look for end date fields - PRIORITIZE INPUT fields over DIVs (DIVs are just labels)
    const endSelectors = [
      // "To" fields first (exact match for potential error message)
      'input[id*="to" i][id*="input" i]',
      'input[id*="to" i]',
      'input[name*="to" i]',
      'input[aria-label*="to" i]',
      'input[data-automation-id*="to" i]',
      // Last year attended
      'input[id*="lastYearAttended" i][id*="input" i]', // Workday pattern: education-X--lastYearAttended-dateSectionYear-input
      'input[id*="lastYear" i]',
      // End date variations
      'input[id*="end" i][id*="year" i]',
      'input[id*="end" i][id*="date" i]',
      'input[name*="end" i][name*="date" i]',
      'input[aria-label*="end" i]',
      'input[data-automation-id*="end" i]',
      'input[aria-label*="present" i]',
      // Button and select elements
      'button[id*="to" i]',
      'button[id*="end" i][id*="date" i]',
      'button[id*="end" i][id*="year" i]',
      'button[id*="last" i][id*="year" i]',
      'select[id*="to" i]',
      'select[name*="to" i]',
      'select[id*="end" i][id*="date" i]',
      'select[id*="end" i][id*="year" i]',
      'select[name*="end" i][name*="date" i]',
      '[data-automation-id*="to" i]',
      '[data-automation-id*="last" i][data-automation-id*="year" i]',
      // DIVs last as fallback only
      'div[id*="to" i]',
      'div[id*="end" i][id*="date" i]',
      'div[id*="lastYearAttended" i]',
      'div[id*="last" i][id*="year" i]',
    ];
    
    result.startDate = this.findFieldInContainer(container, startSelectors);
    result.endDate = this.findFieldInContainer(container, endSelectors);
    
    const prefixedLookup = (suffixes = []) => {
      if (!prefix) return null;
      for (const suffix of suffixes) {
        const candidate = document.getElementById(`${prefix}${suffix}`);
        if (candidate && this.isFieldValid(candidate)) {
          return candidate;
        }
      }
      return null;
    };
    
    result.startMonth = prefixedLookup([
      'startDate-dateSectionMonth-input',
      'startDate-dateSectionMonth',
      'from-dateSectionMonth-input'
    ]) || pickVisible(container.querySelectorAll('input[id*="start"][id*="month" i], input[id*="from"][id*="month" i]'));
    
    result.startYear = prefixedLookup([
      'startDate-dateSectionYear-input',
      'startDate-dateSectionYear',
      'firstYearAttended-dateSectionYear-input'
    ]) || pickVisible(container.querySelectorAll('input[id*="start"][id*="year" i], input[id*="from"][id*="year" i], input[id*="firstYear" i]'));
    
    result.endMonth = prefixedLookup([
      'endDate-dateSectionMonth-input',
      'endDate-dateSectionMonth',
      'to-dateSectionMonth-input'
    ]) || pickVisible(container.querySelectorAll('input[id*="end"][id*="month" i], input[id*="to"][id*="month" i], input[id*="last"][id*="month" i]'));
    
    result.endYear = prefixedLookup([
      'endDate-dateSectionYear-input',
      'endDate-dateSectionYear',
      'lastYearAttended-dateSectionYear-input'
    ]) || pickVisible(container.querySelectorAll('input[id*="end"][id*="year" i], input[id*="to"][id*="year" i], input[id*="last"][id*="year" i]'));
    
    console.log('    Date fields result:', {
      hasStartDate: !!result.startDate,
      hasEndDate: !!result.endDate,
      startDateTag: result.startDate?.tagName,
      endDateTag: result.endDate?.tagName,
      startDateId: result.startDate?.id,
      endDateId: result.endDate?.id,
      startMonthId: result.startMonth?.id,
      startYearId: result.startYear?.id,
      endMonthId: result.endMonth?.id,
      endYearId: result.endYear?.id
    });
    
    return result;
  }

  /**
   * Handle resume upload - improved to search on any page
   */
  async handleResumeUpload(resumeData) {
    try {
      console.log(`🔵 ========== HANDLE RESUME UPLOAD START ==========`);
      console.log('  Resume data:', resumeData);
      console.log('  Resume data type:', typeof resumeData);
      console.log('  Is File?', resumeData instanceof File);
      console.log('  Is Blob?', resumeData instanceof Blob);
      
      // Track which file input we've already uploaded to (to prevent duplicates)
      const uploadedInputs = new Set();
      
      // First try the detected resume field
      console.log('  🔍 Checking detected resume field...');
      if (this.fields.resume && this.fields.resume.element) {
        console.log('  ✅ Found resume field in detected fields:', {
          id: this.fields.resume.element.id,
          name: this.fields.resume.element.name,
          type: this.fields.resume.element.type
        });
        await this.handleFileUpload(this.fields.resume.element, resumeData);
        uploadedInputs.add(this.fields.resume.element); // Mark as uploaded
        console.log('  ✅ Resume uploaded via detected field');
        return true;
      } else {
        console.log('  ⚠️ No resume field in detected fields');
      }
      
      // Search for resume file input on the page
      console.log('  🔍 Searching for resume file inputs on page...');
      const allFileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      console.log(`  Found ${allFileInputs.length} total file inputs on page`);
      
      allFileInputs.forEach((input, idx) => {
        const id = (input.id || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const label = (input.getAttribute('aria-label') || '').toLowerCase();
        const automationId = (input.getAttribute('data-automation-id') || '').toLowerCase();
        console.log(`    ${idx + 1}. id="${input.id}" name="${input.name}" aria-label="${label}" data-automation-id="${automationId}" visible=${input.offsetParent !== null} disabled=${input.disabled}`);
      });
      
      const resumeSelectors = [
        'input[type="file"][accept*="pdf" i]',
        'input[type="file"][accept*="doc" i]',
        'input[type="file"]',
        'input[data-automation-id*="resume" i]',
        'input[data-automation-id*="cv" i]',
        'input[id*="resume" i]',
        'input[name*="resume" i]',
        'input[aria-label*="resume" i]',
        'input[aria-label*="cv" i]',
      ];
      
      for (const selector of resumeSelectors) {
        console.log(`  🔍 Trying selector: "${selector}"`);
        const fileInputs = Array.from(document.querySelectorAll(selector));
        console.log(`    Found ${fileInputs.length} elements with this selector`);
        
        for (const fileInput of fileInputs) {
          // Check if it's actually a resume field
          const id = (fileInput.id || '').toLowerCase();
          const name = (fileInput.name || '').toLowerCase();
          const label = (fileInput.getAttribute('aria-label') || '').toLowerCase();
          const automationId = (fileInput.getAttribute('data-automation-id') || '').toLowerCase();
          
          console.log(`    Checking file input: id="${fileInput.id}" name="${fileInput.name}" visible=${fileInput.offsetParent !== null} disabled=${fileInput.disabled}`);
          
          // Skip if it's clearly not a resume field (e.g., cover letter, other documents)
          if (id.includes('cover') || name.includes('cover') || label.includes('cover') ||
              id.includes('transcript') || name.includes('transcript') || label.includes('transcript')) {
            console.log(`      ⏭️ Skipping - appears to be cover letter or transcript`);
            continue;
          }
          
          // Check if it looks like a resume field
          const looksLikeResume = id.includes('resume') || name.includes('resume') || 
                                 label.includes('resume') || automationId.includes('resume') ||
                                 id.includes('cv') || name.includes('cv') || 
                                 label.includes('cv') || automationId.includes('cv') ||
                                 (!id.includes('cover') && !name.includes('cover') && 
                                  !id.includes('transcript') && !name.includes('transcript'));
          
          if (looksLikeResume) {
            // Check if we've already uploaded to this input
            if (uploadedInputs.has(fileInput)) {
              console.log(`      ⏭️ Skipping - already uploaded to this input`);
              continue;
            }
            
            // For file inputs, even if hidden, we can still set files programmatically
            if (fileInput.offsetParent === null || fileInput.disabled) {
              console.log(`      ⚠️ File input is hidden/disabled, attempting to make it accessible...`);
              
              // Try to find a button that triggers the file input
              const parent = fileInput.parentElement;
              const triggerButton = parent?.querySelector('button, [role="button"]');
              
              if (triggerButton) {
                console.log(`      Found trigger button, clicking it...`);
                triggerButton.click();
                await new Promise(resolve => setTimeout(resolve, 500));
              } else {
                // Try to make the input temporarily accessible
                const originalDisplay = fileInput.style.display;
                fileInput.style.display = 'block';
                fileInput.style.visibility = 'visible';
                fileInput.style.position = 'absolute';
                fileInput.style.opacity = '0';
                fileInput.style.width = '1px';
                fileInput.style.height = '1px';
                console.log(`      Made file input accessible programmatically`);
              }
            }
            
            console.log(`  ✅ Found resume file input: id="${fileInput.id}" name="${fileInput.name}"`);
            await this.handleFileUpload(fileInput, resumeData);
            uploadedInputs.add(fileInput); // Mark as uploaded to prevent duplicates
            console.log('  ✅ Resume uploaded successfully');
            return true;
          } else {
            console.log(`      ⏭️ Skipping - doesn't look like resume field`);
          }
        }
      }
      
      console.warn('  ⚠️ No resume file input found on page');
      console.log(`🔵 ========== HANDLE RESUME UPLOAD END ==========`);
      return false;
    } catch (error) {
      console.error('❌ Error in handleResumeUpload:', error);
      console.error('  Error stack:', error.stack);
      return false;
    }
  }

  async handleFileUpload(fileInput, fileData) {
    if (!fileInput || !fileData) {
      console.warn('handleFileUpload: Missing fileInput or fileData');
      return;
    }

    try {
      let file = null;
      
      // If fileData is a File object
      if (fileData instanceof File) {
        file = fileData;
        console.log('  Using File object directly');
      }
      // If fileData is a chrome-extension:// URL (local extension file)
      else if (typeof fileData === 'string' && fileData.startsWith('chrome-extension://')) {
        console.log('  Loading local extension file:', fileData);
        try {
          const response = await fetch(fileData);
          if (!response.ok) {
            throw new Error(`Failed to fetch local file: ${response.statusText}`);
          }
          const blob = await response.blob();
          const filename = fileData.split('/').pop() || 'resume.pdf';
          file = new File([blob], filename, { type: blob.type || 'application/pdf' });
          console.log(`  Local file loaded successfully (${blob.size} bytes)`);
        } catch (error) {
          console.error('  Error loading local file:', error);
          throw error;
        }
      }
      // If fileData is a string URL - use background script to avoid CORS
      else if (typeof fileData === 'string' && (fileData.startsWith('http') || fileData.startsWith('blob:'))) {
        console.log('  Fetching file from URL via background script:', fileData);
        try {
          // Use background script to fetch the file (avoids CORS)
          const response = await chrome.runtime.sendMessage({
            type: 'FETCH_FILE',
            url: fileData
          });
          
          if (response && response.success && response.data) {
            // Convert base64 to blob
            const base64Data = response.data;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: response.mimeType || 'application/pdf' });
            file = new File([blob], 'resume.pdf', { type: blob.type || 'application/pdf' });
            console.log(`  File fetched successfully via background script (${blob.size} bytes)`);
          } else {
            throw new Error(response?.error || 'Failed to fetch file via background script');
          }
        } catch (fetchError) {
          console.error('  Error fetching file via background script:', fetchError);
          // Fallback: try direct fetch (may fail due to CORS)
          try {
            const response = await fetch(fileData);
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.statusText}`);
            }
            const blob = await response.blob();
            file = new File([blob], 'resume.pdf', { type: blob.type || 'application/pdf' });
            console.log('  File fetched successfully (direct fetch)');
          } catch (directFetchError) {
            console.error('  Direct fetch also failed:', directFetchError);
            throw new Error(`Failed to fetch file: ${directFetchError.message}`);
          }
        }
      }
      // If fileData is an object with url property - use background script to avoid CORS
      else if (fileData && typeof fileData === 'object' && fileData.url) {
        console.log('  Fetching file from URL via background script:', fileData.url);
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'FETCH_FILE',
            url: fileData.url
          });
          
          if (response && response.success && response.data) {
            const base64Data = response.data;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: response.mimeType || 'application/pdf' });
            file = new File([blob], fileData.name || 'resume.pdf', { type: blob.type || 'application/pdf' });
            console.log(`  File fetched successfully via background script (${blob.size} bytes)`);
          } else {
            throw new Error(response?.error || 'Failed to fetch file via background script');
          }
        } catch (fetchError) {
          console.error('  Error fetching file via background script:', fetchError);
          throw new Error(`Failed to fetch file: ${fetchError.message}`);
        }
      }
      // If fileData is a Blob
      else if (fileData instanceof Blob) {
        file = new File([fileData], 'resume.pdf', { type: fileData.type || 'application/pdf' });
        console.log('  Using Blob object');
      }
      else {
        console.warn('  Unsupported fileData type:', typeof fileData, fileData);
        return;
      }

      if (!file) {
        console.error('  Failed to create file object');
        return;
      }

      // Set the file on the input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      console.log('  File set on input:', file.name, file.type, file.size);

      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      fileInput.dispatchEvent(changeEvent);
      
      // Also trigger input event for React
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      fileInput.dispatchEvent(inputEvent);
      
      // Update React state if possible
      this.updateReactState(fileInput, file.name);
      
      console.log('  ✅ File upload events triggered');

    } catch (error) {
      console.error('❌ File upload error:', error);
      throw error;
    }
  }

  triggerEvents() {
    // Trigger a global change event to ensure Workday's state updates
    setTimeout(() => {
      const event = new Event('change', { bubbles: true });
      document.dispatchEvent(event);
    }, 100);
  }

  triggerWorkdayValidation() {
    try {
      // Try to find Workday's validation trigger
      // Workday often uses data-automation-id attributes
      const form = document.querySelector('form[data-automation-id="jobApplication"]') || 
                   document.querySelector('form');
      
      if (form) {
        // Trigger comprehensive validation events on the form
        const events = ['input', 'change', 'blur', 'focus'];
        events.forEach(eventType => {
          form.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
        
        // Try to find submit button and trigger validation
        const submitButton = form.querySelector('button[type="submit"]') || 
                            form.querySelector('button[data-automation-id*="submit"]') ||
                            form.querySelector('button[data-automation-id*="next"]') ||
                            form.querySelector('button[data-automation-id*="continue"]') ||
                            form.querySelector('button[data-automation-id*="save"]');
        
        if (submitButton) {
          // Trigger validation by focusing and blurring the button
          submitButton.focus();
          setTimeout(() => {
            submitButton.blur();
          }, 100);
          
          // Also try to trigger click event (but prevent default)
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          // Don't actually click, just trigger validation
          submitButton.dispatchEvent(clickEvent);
        }
      }
      
      // Also try to trigger validation on all filled fields one more time
      Object.values(this.fields).forEach(field => {
        if (field && field.element) {
          // Focus and blur to trigger validation
          field.element.focus();
          setTimeout(() => {
            field.element.blur();
            // Trigger all validation events
            ['input', 'change', 'blur'].forEach(eventType => {
              field.element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
            });
          }, 50);
        }
      });
      
      // Try to find and trigger Workday's internal validation
      // Workday might have a global validation function
      if (window.Workday && window.Workday.validate) {
        try {
          window.Workday.validate();
        } catch (e) {
          // Ignore
        }
      }
      
      // Try to find validation functions in React components
      const allInputs = Array.from(document.querySelectorAll('input[required], input[aria-required="true"]'));
      allInputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
          // Trigger validation for filled required fields
          input.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
          input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }
      });
      
      console.log('✅ Triggered Workday validation');
    } catch (error) {
      console.warn('Could not trigger Workday validation:', error);
    }
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
console.log('🔵 ========== WORKDAY CONTENT SCRIPT LOADED ==========');
console.log('Script location:', window.location.href);
console.log('Document ready state:', document.readyState);

const workdayHandler = new WorkdayHandler();
console.log('✅ Workday handler initialized');

// Debug: Log when page is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM Content Loaded');
  });
} else {
  console.log('✅ DOM already loaded');
}

// Debug: Log window load
window.addEventListener('load', () => {
  console.log('✅ Window fully loaded');
});


