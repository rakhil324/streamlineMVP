/**
 * ATS-Specific Detector
 * Provides ATS-specific field detection and mapping
 */

// ATS-specific selectors and patterns
const ATS_PATTERNS = {
  workday: {
    // Workday-specific selectors
    formSelectors: [
      'form[data-automation-id="jobPosting"]',
      'form[data-automation-id="jobApplication"]',
      'div[data-automation-id="jobPosting"] form',
    ],
    fieldPatterns: {
      firstName: [
        '[data-automation-id="firstName"]',
        'input[name*="firstName"]',
        'input[name*="first_name"]',
        'input[id*="firstName"]',
      ],
      lastName: [
        '[data-automation-id="lastName"]',
        'input[name*="lastName"]',
        'input[name*="last_name"]',
        'input[id*="lastName"]',
      ],
      email: [
        '[data-automation-id="email"]',
        'input[type="email"]',
        'input[name*="email"]',
      ],
      phone: [
        '[data-automation-id="phone"]',
        'input[type="tel"]',
        'input[name*="phone"]',
      ],
      resume: [
        'input[type="file"][accept*="pdf"]',
        'input[type="file"][accept*="doc"]',
        'input[type="file"][name*="resume"]',
        'input[type="file"][name*="cv"]',
      ],
      coverLetter: [
        'textarea[name*="cover"]',
        'textarea[name*="letter"]',
        'textarea[id*="cover"]',
      ],
    },
  },

  greenhouse: {
    formSelectors: [
      '#application_form',
      'form#application_form',
      'form[action*="greenhouse"]',
    ],
    fieldPatterns: {
      firstName: [
        'input#first_name',
        'input[name="first_name"]',
        'input[id*="first_name"]',
      ],
      lastName: [
        'input#last_name',
        'input[name="last_name"]',
        'input[id*="last_name"]',
      ],
      email: [
        'input#email',
        'input[type="email"]',
        'input[name="email"]',
      ],
      phone: [
        'input#phone',
        'input[type="tel"]',
        'input[name="phone"]',
      ],
      resume: [
        'input[type="file"][name*="resume"]',
        'input[type="file"][id*="resume"]',
      ],
      coverLetter: [
        'textarea#cover_letter',
        'textarea[name*="cover"]',
      ],
    },
  },

  lever: {
    formSelectors: [
      'form[action*="lever"]',
      'form.application-form',
      'form[method="post"]',
    ],
    fieldPatterns: {
      firstName: [
        'input[name*="firstName"]',
        'input[name*="first_name"]',
        'input[id*="firstName"]',
      ],
      lastName: [
        'input[name*="lastName"]',
        'input[name*="last_name"]',
        'input[id*="lastName"]',
      ],
      email: [
        'input[type="email"]',
        'input[name*="email"]',
      ],
      phone: [
        'input[type="tel"]',
        'input[name*="phone"]',
      ],
      resume: [
        'input[type="file"]',
      ],
      coverLetter: [
        'textarea[name*="cover"]',
        'textarea[name*="message"]',
      ],
    },
  },
};

/**
 * ATS Detector Class
 */
class ATSDetector {
  constructor(atsType) {
    this.atsType = atsType;
    this.patterns = ATS_PATTERNS[atsType] || ATS_PATTERNS.workday;
  }

  /**
   * Find form container
   */
  findFormContainer() {
    for (const selector of this.patterns.formSelectors) {
      const form = document.querySelector(selector);
      if (form) {
        return form;
      }
    }
    
    // Fallback to first form on page
    return document.querySelector('form');
  }

  /**
   * Find field using ATS-specific patterns
   */
  findField(fieldType) {
    const patterns = this.patterns.fieldPatterns[fieldType];
    if (!patterns) return null;

    for (const pattern of patterns) {
      const field = document.querySelector(pattern);
      if (field) {
        return field;
      }
    }

    return null;
  }

  /**
   * Get all mappable fields
   */
  getAllFields() {
    const fields = {};
    const fieldTypes = Object.keys(this.patterns.fieldPatterns);

    fieldTypes.forEach(type => {
      const field = this.findField(type);
      if (field) {
        fields[type] = {
          element: field,
          selector: this.getUniqueSelector(field),
          type: type,
        };
      }
    });

    return fields;
  }

  /**
   * Get unique selector for element
   */
  getUniqueSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.name) return `[name="${element.name}"]`;
    
    const path = [];
    let current = element;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.className) {
        const classes = current.className.split(' ').filter(c => c).join('.');
        if (classes) selector += `.${classes}`;
      }
      path.unshift(selector);
      current = current.parentElement;
      
      if (path.length > 5) break; // Limit depth
    }
    return path.join(' > ');
  }
}

// Export for use in other content scripts
if (typeof window !== 'undefined') {
  window.ATSDetector = ATSDetector;
  window.ATS_PATTERNS = ATS_PATTERNS;
}

