// Content script that runs on Greenhouse pages

// Field mapping: Greenhouse field labels/names -> profile data keys
const FIELD_MAPPINGS = {
  // Name fields
  'first name': 'firstName',
  'firstname': 'firstName',
  'fname': 'firstName',
  'last name': 'lastName',
  'lastname': 'lastName',
  'lname': 'lastName',
  'full name': 'fullName',
  'name': 'fullName',
  
  // Contact fields
  'email': 'email',
  'email address': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'telephone': 'phone',
  'mobile': 'phone',
  'location': 'location',
  'address': 'location',
  'city': 'location',
  
  // Education fields
  'school': 'education.school',
  'university': 'education.school',
  'college': 'education.school',
  'degree': 'education.degree',
  'graduation date': 'education.graduationDate',
  'gpa': 'education.gpa',
  
  // Experience fields
  'current company': 'experience.company',
  'company': 'experience.company',
  'employer': 'experience.company',
  'job title': 'experience.title',
  'title': 'experience.title',
  'position': 'experience.title',
  'current title': 'experience.title',
  
  
  // Resume/CV file upload fields
  'resume': 'resumeFile',
  'cv': 'resumeFile',
  'curriculum vitae': 'resumeFile',
  'resume file': 'resumeFile',
  'cv file': 'resumeFile',
  'upload resume': 'resumeFile',
  'upload cv': 'resumeFile',
  'attach resume': 'resumeFile',
  'attach cv': 'resumeFile',
  
  // Cover letter file upload fields (more specific patterns)
  'cover letter': 'coverLetterFile',
  'coverletter': 'coverLetterFile',
  'cover letter file': 'coverLetterFile',
  'upload cover letter': 'coverLetterFile',
  'attach cover letter': 'coverLetterFile',
  'motivation letter': 'coverLetterFile',
  // Note: 'letter' is too generic and handled separately in matchFieldToProfile
};

// Normalize text for matching (lowercase, remove special chars)
function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

// Get nested value from object using dot notation
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Find form fields on the page
function findFormFields() {
  const fields = [];
  
  // Find all input, select, and textarea elements
  const inputs = document.querySelectorAll('input, select, textarea');
  
  inputs.forEach((input) => {
    // Skip hidden, submit, button, checkbox, and radio inputs (but include file inputs)
    if (input.type === 'hidden' || input.type === 'submit' || 
        input.type === 'button' || input.type === 'checkbox' || 
        input.type === 'radio') {
      return;
    }
    
    // Get field identifier (label, placeholder, name, id)
    const label = findLabel(input);
    const placeholder = input.placeholder || '';
    const name = input.name || '';
    const id = input.id || '';
    
    // Also check for aria-label and title attributes
    const ariaLabel = input.getAttribute('aria-label') || '';
    const title = input.getAttribute('title') || '';
    
    // Check parent elements for labels (for custom React components)
    let parentLabel = '';
    let parent = input.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      const parentText = parent.textContent || '';
      if (parentText.length < 200 && parentText.length > 0) {
        parentLabel = parentText.trim();
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
    
    const identifiers = [label, placeholder, name, id, ariaLabel, title, parentLabel]
      .filter(Boolean)
      .map(normalizeText);
    
    fields.push({
      element: input,
      label: label || placeholder || name || id || ariaLabel || title || 'Unknown',
      identifiers,
      type: input.tagName.toLowerCase(),
      inputType: input.type || 'text',
    });
  });
  
  return fields;
}

// Find label for an input element
function findLabel(input) {
  // Try to find associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) {
      const text = label.textContent.trim();
      if (text) return text;
    }
  }
  
  // Try to find parent label
  const parentLabel = input.closest('label');
  if (parentLabel) {
    const text = parentLabel.textContent.trim();
    if (text) return text;
  }
  
  // Try to find nearby label (previous sibling or parent's previous sibling)
  let prev = input.previousElementSibling;
  while (prev && prev !== document.body) {
    if (prev.tagName === 'LABEL') {
      const text = prev.textContent.trim();
      if (text) return text;
    }
    // Also check for text nodes or divs with label-like content
    if (prev.textContent && prev.textContent.trim().length > 0 && prev.textContent.trim().length < 200) {
      const text = prev.textContent.trim();
      if (text && !text.includes('<') && !text.includes('{')) {
        return text;
      }
    }
    prev = prev.previousElementSibling;
  }
  
  // Try to find label in parent container
  const container = input.closest('div, fieldset, form, section');
  if (container) {
    // Look for label element
    const label = container.querySelector('label');
    if (label) {
      const text = label.textContent.trim();
      if (text) return text;
    }
    
    // Look for text content before the input (common in custom React components)
    const allText = container.textContent || '';
    const inputIndex = allText.indexOf(input.value || '');
    if (inputIndex > 0) {
      const beforeText = allText.substring(0, inputIndex).trim();
      // Get the last sentence or question before the input
      const sentences = beforeText.split(/[.!?]/);
      if (sentences.length > 0) {
        const lastSentence = sentences[sentences.length - 1].trim();
        if (lastSentence.length > 10 && lastSentence.length < 200) {
          return lastSentence;
        }
      }
    }
  }
  
  // Check for aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();
  
  // Check for aria-labelledby
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) {
      const text = labelElement.textContent.trim();
      if (text) return text;
    }
  }
  
  return '';
}

// Fill a select/dropdown field
function fillSelectField(element, value) {
  // Don't process __AUTO_DETECT__ - this should be handled by fillWorkAuthorizationField directly
  if (!value || value === '__AUTO_DETECT__') return false;
  
  try {
    const options = Array.from(element.options);
    const normalizedValue = normalizeText(value);
    
    // Special handling for work authorization fields
    const labelText = findLabel(element)?.toLowerCase() || '';
    const isWorkAuthField = element.id?.toLowerCase().includes('authoriz') ||
                           element.name?.toLowerCase().includes('authoriz') ||
                           element.id?.toLowerCase().includes('sponsorship') ||
                           element.name?.toLowerCase().includes('sponsorship') ||
                           labelText.includes('authoriz') ||
                           labelText.includes('sponsorship') ||
                           labelText.includes('visa') ||
                           (labelText.includes('work') && (labelText.includes('us') || labelText.includes('united states')));
    
    if (isWorkAuthField) {
      return fillWorkAuthorizationField(element, options);
    }
    
    // Try exact match first
    let option = options.find(opt => 
      normalizeText(opt.text) === normalizedValue || 
      normalizeText(opt.value) === normalizedValue
    );
    
    // Try partial match
    if (!option) {
      option = options.find(opt => 
        normalizeText(opt.text).includes(normalizedValue) ||
        normalizedValue.includes(normalizeText(opt.text))
      );
    }
    
    // Try case-insensitive match
    if (!option) {
      option = options.find(opt => 
        opt.text.toLowerCase() === value.toLowerCase() ||
        opt.value.toLowerCase() === value.toLowerCase()
      );
    }
    
    if (option && option.value) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      // Trigger React/other framework updates
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      nativeInputValueSetter.call(element, option.value);
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  } catch (error) {
    console.error('Error filling select field:', error);
    return false;
  }
  
  return false;
}

// Check if field is a work authorization question
function isWorkAuthorizationQuestion(field) {
  const label = field.label?.toLowerCase() || '';
  const id = field.element.id?.toLowerCase() || '';
  const name = field.element.name?.toLowerCase() || '';
  const placeholder = field.element.placeholder?.toLowerCase() || '';
  
  // Also check all identifiers from the field object (includes parent text, aria-labels, etc.)
  const allIdentifiers = field.identifiers?.join(' ') || '';
  
  // Check all identifiers for work authorization keywords
  const allText = [label, id, name, placeholder, allIdentifiers].join(' ');
  
  const isMatch = allText.includes('authoriz') ||
         allText.includes('sponsorship') ||
         allText.includes('visa') ||
         (allText.includes('work') && (allText.includes('us') || allText.includes('united states'))) ||
         allText.includes('legally authorized') ||
         allText.includes('require visa') ||
         allText.includes('visa sponsorship') ||
         allText.includes('do you now or in the future require') ||
         allText.includes('are you legally authorized') ||
         allText.includes('are you legally') ||
         (allText.includes('legally') && allText.includes('authorized'));
  
  if (isMatch) {
    console.log('Streamline: isWorkAuthorizationQuestion matched', {
      label: field.label,
      allText: allText.substring(0, 200) // First 200 chars for debugging
    });
  }
  
  return isMatch;
}

// Determine target value for work authorization questions
function getWorkAuthorizationValue(field) {
  const label = field.label?.toLowerCase() || '';
  const id = field.element.id?.toLowerCase() || '';
  const name = field.element.name?.toLowerCase() || '';
  const placeholder = field.element.placeholder?.toLowerCase() || '';
  
  // Also check all identifiers from the field object (includes parent text, aria-labels, etc.)
  const allIdentifiers = field.identifiers?.join(' ') || '';
  
  // Check all identifiers for work authorization keywords
  const allText = [label, id, name, placeholder, allIdentifiers].join(' ');
  
  // Sponsorship question -> "No"
  // Match: "Do you now or in the future require visa sponsorship to continue working in the United States?"
  if (allText.includes('require visa') || 
      allText.includes('sponsorship') ||
      allText.includes('do you now or in the future require')) {
    return 'No';
  }
  
  // Authorization question -> "Yes"
  // Match: "Are you legally authorized to work in the United States?"
  // Also match variations like "Are you legally authorized" or just "legally authorized"
  if (allText.includes('legally authorized') || 
      allText.includes('authorized to work') ||
      allText.includes('are you legally authorized') ||
      (allText.includes('legally') && allText.includes('authorized')) ||
      (allText.includes('authorized') && allText.includes('work') && (allText.includes('united states') || allText.includes('us')))) {
    return 'Yes';
  }
  
  return null;
}

// Fill dropdown field (for React Select or custom dropdowns)
async function fillDropdownField(inputElement, targetValue, field) {
  console.log('Streamline: fillDropdownField called', {
    element: inputElement,
    targetValue: targetValue,
    className: inputElement.className,
    id: inputElement.id
  });
  
  return new Promise((resolve) => {
    try {
      const inputId = inputElement?.id || '';
      
      // Find the dropdown container (parent element)
      const container = inputElement.closest('.select') || 
                       inputElement.closest('[class*="Select"]') ||
                       inputElement.closest('[class*="select"]') ||
                       inputElement.parentElement;
      
      // Try to find and click the dropdown arrow/indicator button
      let dropdownButton = null;
      if (container) {
        // Get input position to find elements on the right side
        const inputRect = inputElement.getBoundingClientRect();
        
        // Look for common dropdown indicator elements
        dropdownButton = container.querySelector('[class*="indicator"]') ||
                         container.querySelector('[class*="arrow"]') ||
                         container.querySelector('[class*="chevron"]') ||
                         container.querySelector('[class*="dropdown"]') ||
                         container.querySelector('[class*="Dropdown"]');
        
        // Look for SVG icons (common for dropdown arrows)
        if (!dropdownButton) {
          const svgs = container.querySelectorAll('svg');
          for (const svg of svgs) {
            const svgRect = svg.getBoundingClientRect();
            // Check if SVG is positioned on the right side of the input
            if (svgRect.left >= inputRect.right - 50 && svgRect.right <= inputRect.right + 50) {
              dropdownButton = svg.closest('button') || svg.closest('[role="button"]') || svg.parentElement;
              if (dropdownButton) break;
            }
          }
        }
        
        // Look for clickable elements on the right side
        if (!dropdownButton) {
          const clickables = container.querySelectorAll('button, [role="button"], div[tabindex], span[tabindex]');
          for (const clickable of clickables) {
            const clickableRect = clickable.getBoundingClientRect();
            // Check if element is positioned on the right side of the input
            if (clickableRect.left >= inputRect.right - 60 && 
                clickableRect.top >= inputRect.top - 10 && 
                clickableRect.bottom <= inputRect.bottom + 10) {
              dropdownButton = clickable;
              break;
            }
          }
        }
        
        // Also try to find a button or clickable element in the container
        if (!dropdownButton) {
          const buttons = container.querySelectorAll('button, [role="button"]');
          for (const btn of buttons) {
            const btnText = (btn.textContent || '').toLowerCase();
            if (btnText === '' || btnText.includes('select') || btnText.includes('open')) {
              dropdownButton = btn;
              break;
            }
          }
        }
      }
      
      // Click the dropdown button if found, otherwise click the input
      if (dropdownButton) {
        console.log('Streamline: Clicking dropdown arrow/button');
        dropdownButton.click();
      } else {
        console.log('Streamline: Clicking input element');
        inputElement.focus();
        inputElement.click();
      }
      
      // If the input is searchable, try typing to filter
      const isSearchable = inputElement.type === 'text' || 
                          inputElement.getAttribute('role') === 'combobox' ||
                          inputElement.getAttribute('aria-autocomplete') === 'list';
      
      if (isSearchable && targetValue) {
        // Wait a bit for dropdown to open, then type to filter
        setTimeout(() => {
          inputElement.focus();
          
          // Clear and set the value to filter
          inputElement.value = '';
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Set the full value at once to filter options
          inputElement.value = targetValue;
          
          // Dispatch keyboard events to simulate typing
          const targetLower = targetValue.toLowerCase();
          for (let i = 0; i < targetLower.length; i++) {
            const char = targetLower[i];
            inputElement.dispatchEvent(new KeyboardEvent('keydown', { 
              key: char, 
              code: `Key${char.toUpperCase()}`,
              bubbles: true,
              cancelable: true 
            }));
            inputElement.dispatchEvent(new KeyboardEvent('keypress', { 
              key: char,
              bubbles: true,
              cancelable: true 
            }));
          }
          
          // Dispatch input event with the full value
          inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          
          // Dispatch keyup events
          for (let i = 0; i < targetLower.length; i++) {
            const char = targetLower[i];
            inputElement.dispatchEvent(new KeyboardEvent('keyup', { 
              key: char,
              bubbles: true,
              cancelable: true 
            }));
          }
          
          console.log('Streamline: Typed filter value:', targetValue);
        }, 400);
      }
      
      // Wait for dropdown to appear
      const checkForDropdown = (attempts = 0) => {
        if (attempts > 50) { // Increased from 30 to 50 to allow more time for filtering
          console.log('Streamline: Timeout waiting for dropdown');
          resolve(false);
          return;
        }
        
        let dropdown = null;
        
        // Look by ID pattern (React Select uses react-select-{id}-listbox)
        if (inputId) {
          const expectedDropdownId = `react-select-${inputId}-listbox`;
          dropdown = document.getElementById(expectedDropdownId);
          if (dropdown && dropdown.getAttribute('role') === 'listbox') {
            console.log('Streamline: Found dropdown by ID');
          } else {
            dropdown = null;
          }
        }
        
        // Look for visible listbox - prioritize by ID match, then by proximity
        if (!dropdown) {
          const listboxes = document.querySelectorAll('[role="listbox"]');
          let bestMatch = null;
          let bestScore = 0;
          
          for (const lb of listboxes) {
            if (lb === inputElement || lb.tagName === 'INPUT' || lb.tagName === 'LABEL') {
              continue;
            }
            
            const style = window.getComputedStyle(lb);
            const isVisible = style.display !== 'none' && 
                            style.visibility !== 'hidden' && 
                            style.opacity !== '0';
            
            if (isVisible) {
              const options = lb.querySelectorAll('[role="option"]');
              if (options.length > 0) {
                const lbId = lb.id || '';
                let score = 0;
                
                // Check if dropdown ID matches input ID (highest priority)
                if (inputId) {
                  if (lbId.includes(inputId) || lbId.includes(`react-select-${inputId}`)) {
                    score = 100; // Highest priority
                  }
                }
                
                // Check proximity to input element
                const rect = lb.getBoundingClientRect();
                const inputRect = inputElement.getBoundingClientRect();
                const distance = Math.abs(rect.top - inputRect.bottom);
                if (distance < 200) {
                  score += 50; // High priority if very close
                } else if (distance < 500) {
                  score += 10; // Lower priority if further
                }
                
                // Check if dropdown is controlled by this input (aria-controls, aria-owns)
                const ariaControls = inputElement.getAttribute('aria-controls');
                const ariaOwns = inputElement.getAttribute('aria-owns');
                if (ariaControls && lbId === ariaControls) {
                  score = 200; // Highest priority - explicit relationship
                }
                if (ariaOwns && lbId === ariaOwns) {
                  score = 200; // Highest priority - explicit relationship
                }
                
                if (score > bestScore) {
                  bestScore = score;
                  bestMatch = lb;
                }
              }
            }
          }
          
          if (bestMatch && bestScore > 0) {
            dropdown = bestMatch;
            console.log('Streamline: Found dropdown by proximity/ID match, score:', bestScore);
          }
        }
        
        if (!dropdown || dropdown.tagName === 'INPUT' || dropdown.tagName === 'LABEL') {
          setTimeout(() => checkForDropdown(attempts + 1), 100);
          return;
        }
        
        // Find the target option
        const options = dropdown.querySelectorAll('[role="option"]');
        let targetOption = null;
        
        const targetLower = targetValue.toLowerCase();
        
        // Helper function to extract text from option (tries multiple methods)
        const getOptionText = (opt) => {
          // Try multiple ways to get the text
          let text = opt.textContent || opt.innerText || '';
          
          // If no text, try aria-label
          if (!text || text.trim() === '') {
            text = opt.getAttribute('aria-label') || '';
          }
          
          // If still no text, try finding text in child elements (React Select sometimes nests text)
          if (!text || text.trim() === '') {
            const textNode = opt.querySelector('[class*="option"], [class*="label"], span, div');
            if (textNode) {
              text = textNode.textContent || textNode.innerText || '';
            }
          }
          
          // If still no text, try data attributes
          if (!text || text.trim() === '') {
            text = opt.getAttribute('data-label') || opt.getAttribute('data-value') || '';
          }
          
          return text.trim();
        };
        
        // Log all available options for debugging
        const allOptionTexts = Array.from(options).map(opt => getOptionText(opt));
        console.log('Streamline: Searching through', options.length, 'options for:', targetValue);
        console.log('Streamline: Available options:', allOptionTexts);
        
        // First pass: exact match (case-insensitive)
        for (const opt of options) {
          const optText = getOptionText(opt).toLowerCase();
          
          if (optText === targetLower) {
            targetOption = opt;
            console.log('Streamline: Found exact match:', optText);
            break;
          }
        }
        
        // Second pass: single letter match for Yes/No
        if (!targetOption && (targetLower === 'yes' || targetLower === 'no')) {
          for (const opt of options) {
            const optText = getOptionText(opt).toLowerCase();
            if ((targetLower === 'yes' && optText === 'y') || 
                (targetLower === 'no' && optText === 'n')) {
              targetOption = opt;
              console.log('Streamline: Found single letter match:', optText);
              break;
            }
          }
        }
        
        // Third pass: starts with match (for "Yes" matching "Yes, I am..." etc.)
        if (!targetOption) {
          for (const opt of options) {
            const optText = getOptionText(opt).toLowerCase();
            if (optText.startsWith(targetLower) || targetLower.startsWith(optText)) {
              targetOption = opt;
              console.log('Streamline: Found starts with match:', optText);
              break;
            }
          }
        }
        
        // Fourth pass: includes match
        if (!targetOption) {
          for (const opt of options) {
            const optText = getOptionText(opt).toLowerCase();
            if (optText.includes(targetLower) || targetLower.includes(optText)) {
              targetOption = opt;
              console.log('Streamline: Found includes match:', optText);
              break;
            }
          }
        }
        
        // Fifth pass: for Yes/No, try matching first word only (handles "Yes, I am authorized" -> "Yes")
        if (!targetOption && (targetLower === 'yes' || targetLower === 'no')) {
          for (const opt of options) {
            const optText = getOptionText(opt).toLowerCase();
            const firstWord = optText.split(/[\s,;:]/)[0]; // Get first word, split on common separators
            if (firstWord === targetLower) {
              targetOption = opt;
              console.log('Streamline: Found first word match:', optText, '->', firstWord);
              break;
            }
          }
        }
        
        if (targetOption) {
          // Scroll option into view if needed
          targetOption.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          
          // Small delay before clicking
          setTimeout(() => {
            targetOption.click();
            
            setTimeout(() => {
              inputElement.dispatchEvent(new Event('input', { bubbles: true }));
              inputElement.dispatchEvent(new Event('change', { bubbles: true }));
              inputElement.blur();
              console.log('Streamline: Successfully selected option:', targetValue);
              resolve(true);
            }, 200);
          }, 100);
        } else {
          console.log('Streamline: Option not found, retrying...', {
            targetValue: targetValue,
            optionsCount: options.length,
            sampleOptions: Array.from(options).slice(0, 5).map(o => o.textContent || o.innerText)
          });
          setTimeout(() => checkForDropdown(attempts + 1), 150);
        }
      };
      
      // Wait longer if we're typing to filter, to allow filtering to complete
      setTimeout(() => checkForDropdown(), isSearchable ? 800 : 300);
      
    } catch (error) {
      console.error('Streamline: Error filling dropdown field', error);
      resolve(false);
    }
  });
}

// Fill work authorization field with smart matching
function fillWorkAuthorizationField(element, options) {
  console.log('Streamline: fillWorkAuthorizationField called', {
    optionsCount: options.length,
    options: options.map(opt => ({ text: opt.text, value: opt.value }))
  });
  
  // Filter out empty/placeholder options
  const validOptions = options.filter(opt => 
    opt && 
    opt.value !== undefined && 
    opt.value !== null &&
    opt.value !== '' && 
    opt.value !== '0' &&
    opt.text &&
    !normalizeText(opt.text).includes('select') &&
    !normalizeText(opt.text).includes('choose') &&
    !normalizeText(opt.text).includes('please')
  );
  
  if (validOptions.length === 0) {
    console.log('Streamline: No valid options found');
    return false;
  }
  
  // For "Are you legally authorized to work in the United States?" - default to "Yes"
  // For "Do you require visa sponsorship?" - default to "No" (most common)
  const labelText = findLabel(element)?.toLowerCase() || '';
  const isSponsorshipQuestion = labelText.includes('sponsorship') || labelText.includes('require visa');
  
  // Common patterns for "authorized" / "Yes" options
  const yesPatterns = [
    /^yes$/i,
    /^y$/i,
    /authorized/i,
    /eligible/i,
    /citizen/i,
    /permanent resident/i,
    /green card/i,
    /us citizen/i,
    /no sponsorship/i,
    /don't need/i,
    /do not need/i,
    /not require/i,
  ];
  
  // Common patterns for "not authorized" / "No" options
  const noPatterns = [
    /^no$/i,
    /^n$/i,
    /not authorized/i,
    /not eligible/i,
    /require sponsorship/i,
    /need sponsorship/i,
    /will require/i,
    /visa/i,
    /h-1b/i,
    /h1b/i,
  ];
  
  // For sponsorship questions, prefer "No" first; for authorization questions, prefer "Yes"
  let option;
  if (isSponsorshipQuestion) {
    // Try "No" first for sponsorship questions
    option = validOptions.find(opt => {
      const text = normalizeText(opt.text);
      return noPatterns.some(pattern => pattern.test(text));
    });
    
    // Then try "Yes" if "No" not found
    if (!option) {
      option = validOptions.find(opt => {
        const text = normalizeText(opt.text);
        return yesPatterns.some(pattern => pattern.test(text));
      });
    }
  } else {
    // For authorization questions, try "Yes" first
    option = validOptions.find(opt => {
      const text = normalizeText(opt.text);
      return yesPatterns.some(pattern => pattern.test(text));
    });
    
    // Then try "No" if "Yes" not found
    if (!option) {
      option = validOptions.find(opt => {
        const text = normalizeText(opt.text);
        return noPatterns.some(pattern => pattern.test(text));
      });
    }
  }
  
  // Fallback: use first valid option
  if (!option) {
    option = validOptions[0];
  }
  
  if (option && option.value !== undefined && option.value !== null) {
    console.log('Streamline: Selected option', { text: option.text, value: option.value });
    
    try {
      element.value = option.value;
      element.selectedIndex = Array.from(element.options).indexOf(option);
      
      // Trigger events
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      
      // Trigger React/other framework updates
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, option.value);
      }
      
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      
      // Force focus/blur to trigger validation
      element.focus();
      element.blur();
      
      console.log('Streamline: Successfully filled work authorization field');
      return true;
    } catch (error) {
      console.error('Streamline: Error filling work authorization field', error);
      return false;
    }
  }
  
  console.log('Streamline: No option found to select');
  return false;
}

// Check if a field is a work authorization field
function isWorkAuthorizationField(field) {
  const label = field.label?.toLowerCase() || '';
  const id = field.element.id?.toLowerCase() || '';
  const name = field.element.name?.toLowerCase() || '';
  const placeholder = field.element.placeholder?.toLowerCase() || '';
  
  // Also check all identifiers from the field object (includes parent text, aria-labels, etc.)
  const allIdentifiers = field.identifiers?.join(' ') || '';
  
  // Check all identifiers for work authorization keywords
  const allText = [label, id, name, placeholder, allIdentifiers].join(' ');
  
  const isMatch = allText.includes('authoriz') ||
         allText.includes('sponsorship') ||
         allText.includes('visa') ||
         (allText.includes('work') && (allText.includes('us') || allText.includes('united states'))) ||
         allText.includes('legally authorized') ||
         allText.includes('require visa') ||
         allText.includes('visa sponsorship') ||
         allText.includes('do you now or in the future require') ||
         allText.includes('are you legally authorized') ||
         allText.includes('are you legally') ||
         (allText.includes('legally') && allText.includes('authorized'));
  
  if (isMatch) {
    console.log('Streamline: isWorkAuthorizationField matched', {
      label: field.label,
      allText: allText.substring(0, 200) // First 200 chars for debugging
    });
  }
  
  return isMatch;
}

// Check if field is a country dropdown
function isCountryField(field) {
  const identifiers = field.identifiers.join(' ').toLowerCase();
  const label = field.label?.toLowerCase() || '';
  
  const countryKeywords = [
    'country',
    'country of residence',
    'nationality',
    'citizenship country',
    'country code',
    'select country',
    'choose country'
  ];
  
  return countryKeywords.some(keyword => 
    identifiers.includes(keyword) || label.includes(keyword)
  );
}

// Check if a field is a standard profile field (name, email, phone, address, LinkedIn)
function isStandardProfileField(field, profile) {
  const match = matchFieldToProfile(field, profile);
  if (match) {
    // Check if it's a standard field (not file uploads)
    const standardFields = ['firstName', 'lastName', 'fullName', 'email', 'phone', 'location'];
    return standardFields.includes(match.profileKey);
  }
  
  // Also check for LinkedIn explicitly
  const q = (field.label || '').toLowerCase();
  if (q.includes('linkedin') || q.includes('linked in')) {
    return true;
  }
  
  return false;
}

// Generate LLM-based answer via API
async function generateLLMAnswer(questionText, jobInfo, resumeData) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'generateAnswer',
      question: questionText,
      jobDescription: jobInfo.jobDescription,
      jobTitle: jobInfo.jobTitle || 'Position',
      companyName: jobInfo.companyName || 'Company',
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to generate answer');
    }
    
    return response.answer;
  } catch (error) {
    console.error('Error generating LLM answer:', error);
    throw error;
  }
}

// Match field to profile data
function matchFieldToProfile(field, profile) {
  // Check if it's a file input for resume/CV or cover letter
  if (field.element.type === 'file') {
    const allIdentifiers = field.identifiers.join(' ').toLowerCase();
    
    // Check for resume/CV patterns first
    const resumePatterns = [
      'resume', 'cv', 'curriculum vitae', 'resume file', 
      'cv file', 'upload resume', 'upload cv', 'attach resume', 'attach cv'
    ];
    for (const pattern of resumePatterns) {
      if (allIdentifiers.includes(pattern) || field.identifiers.some(id => id.includes(pattern))) {
        if (!allIdentifiers.includes('cover letter') && 
            !allIdentifiers.includes('coverletter') && 
            !allIdentifiers.includes('motivation letter')) {
          return { profileKey: 'resumeFile', value: '__RESUME_FILE__' };
        }
      }
    }
    
    // Check for cover letter patterns
    const coverLetterPatterns = [
      'cover letter', 'coverletter', 'cover letter file', 
      'upload cover letter', 'attach cover letter', 'motivation letter'
    ];
    for (const pattern of coverLetterPatterns) {
      if (allIdentifiers.includes(pattern) || field.identifiers.some(id => id.includes(pattern))) {
        return { profileKey: 'coverLetterFile', value: '__COVER_LETTER_FILE__' };
      }
    }
  }
  
  // Regular field matching
  for (const identifier of field.identifiers) {
    for (const [pattern, profileKey] of Object.entries(FIELD_MAPPINGS)) {
      if (identifier.includes(pattern) || pattern.includes(identifier)) {
        // Skip file fields
        if (profileKey === 'resumeFile' || profileKey === 'coverLetterFile') continue;
        
        const value = getNestedValue(profile, profileKey);
        if (value) {
          return { profileKey, value };
        }
      }
    }
  }
  return null;
}

// Fill a form field
function fillField(element, value) {
  // Don't set __AUTO_DETECT__ as a value - this is a special marker
  if (!value || value === '__AUTO_DETECT__') return false;
  
  try {
    const tagName = element.tagName.toLowerCase();
    const inputType = element.type?.toLowerCase();
    
    if (tagName === 'input') {
      if (inputType === 'file') {
        // File inputs are handled separately
        return false;
      } else if (inputType === 'text' || inputType === 'email' || inputType === 'tel' || !inputType) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    } else if (tagName === 'textarea') {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } else if (tagName === 'select') {
      return fillSelectField(element, value);
    }
  } catch (error) {
    console.error('Error filling field:', error);
    return false;
  }
  
  return false;
}

// Fill a file input field with resume file
async function fillFileField(element, resumeFile) {
  try {
    if (element.type !== 'file') {
      return false;
    }
    
    // Create a FileList with the resume file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(resumeFile);
    element.files = dataTransfer.files;
    
    // Trigger change event
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('Streamline: Successfully attached resume file:', resumeFile.name);
    return true;
  } catch (error) {
    console.error('Error filling file field:', error);
    return false;
  }
}

// Fetch resume file from API (via background script to handle CORS)
async function fetchResumeFile() {
  try {
    // Request resume file from background script
    const response = await chrome.runtime.sendMessage({ action: 'fetchResumeFile' });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch resume file');
    }
    
    // Reconstruct File from buffer
    const buffer = new Uint8Array(response.buffer).buffer;
    const blob = new Blob([buffer], { type: response.fileType || 'text/plain' });
    const file = new File([blob], response.fileName, { type: response.fileType || 'text/plain' });
    
    return file;
  } catch (error) {
    console.error('Error fetching resume file:', error);
    throw error;
  }
}

// Fetch cover letter file from API (via background script to handle CORS)
async function fetchCoverLetterFile() {
  try {
    // Request cover letter file from background script
    const response = await chrome.runtime.sendMessage({ action: 'fetchCoverLetterFile' });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch cover letter file');
    }
    
    // Reconstruct File from buffer
    const buffer = new Uint8Array(response.buffer).buffer;
    const blob = new Blob([buffer], { type: response.fileType || 'text/plain' });
    const file = new File([blob], response.fileName, { type: response.fileType || 'text/plain' });
    
    return file;
  } catch (error) {
    console.error('Error fetching cover letter file:', error);
    throw error;
  }
}

// Extract job information from Greenhouse page
function extractJobInfo() {
  let jobTitle = '';
  let companyName = '';
  let jobDescription = '';
  
  // Try to find job title - common selectors on Greenhouse pages
  const titleSelectors = [
    'h1',
    '[data-testid="job-title"]',
    '.job-title',
    'h2',
    'h3'
  ];
  
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent && element.textContent.trim().length > 0) {
      const text = element.textContent.trim();
      // Check if it looks like a job title (not too long, not navigation)
      if (text.length < 100 && !text.includes('Menu') && !text.includes('Sign')) {
        jobTitle = text;
        break;
      }
    }
  }
  
  // Try to find company name
  const companySelectors = [
    '[data-testid="company-name"]',
    '.company-name',
    'a[href*="/company/"]',
    'h2',
    'h3'
  ];
  
  for (const selector of companySelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      const text = element.textContent.trim();
      if (text.length < 50 && text !== jobTitle) {
        companyName = text;
        break;
      }
    }
  }
  
  // Try to find job description
  const descriptionSelectors = [
    '[data-testid="job-description"]',
    '.job-description',
    '[id*="description"]',
    '[class*="description"]',
    'section',
    'div[class*="content"]'
  ];
  
  for (const selector of descriptionSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent || '';
      // Look for substantial text blocks that might be job descriptions
      if (text.length > 200 && text.length < 10000) {
        // Check if it contains job-related keywords
        const lowerText = text.toLowerCase();
        if (lowerText.includes('responsibilities') || 
            lowerText.includes('requirements') || 
            lowerText.includes('qualifications') ||
            lowerText.includes('about') ||
            lowerText.includes('role') ||
            lowerText.includes('position')) {
          jobDescription = text.trim();
          break;
        }
      }
    }
    if (jobDescription) break;
  }
  
  // Fallback: try to get text from main content area
  if (!jobDescription) {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
    if (mainContent) {
      const text = mainContent.textContent || '';
      if (text.length > 200) {
        jobDescription = text.substring(0, 5000).trim(); // Limit to 5000 chars
      }
    }
  }
  
  console.log('Streamline: Extracted job info', {
    jobTitle: jobTitle || 'Not found',
    companyName: companyName || 'Not found',
    descriptionLength: jobDescription.length
  });
  
  return { jobTitle, companyName, jobDescription };
}

// Tailor resume using API
async function tailorResume(resumeData, jobInfo) {
  try {
    console.log('Streamline: Tailoring resume...');
    const response = await chrome.runtime.sendMessage({
      action: 'tailorResume',
      resumeData: resumeData,
      jobInfo: jobInfo
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to tailor resume');
    }
    
    // Convert PDF base64 to File
    const pdfBase64 = response.pdf;
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], 'tailored-resume.pdf', { type: 'application/pdf' });
    
    console.log('Streamline: Resume tailored successfully');
    return file;
  } catch (error) {
    console.error('Error tailoring resume:', error);
    throw error;
  }
}

// Tailor cover letter using API
async function tailorCoverLetter(resumeData, coverLetterData, jobInfo) {
  try {
    console.log('Streamline: Tailoring cover letter...');
    const response = await chrome.runtime.sendMessage({
      action: 'tailorCoverLetter',
      resumeData: resumeData,
      coverLetterData: coverLetterData,
      jobInfo: jobInfo
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to tailor cover letter');
    }
    
    // Convert PDF base64 to File
    const pdfBase64 = response.pdf;
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([blob], 'tailored-cover-letter.pdf', { type: 'application/pdf' });
    
    console.log('Streamline: Cover letter tailored successfully');
    return file;
  } catch (error) {
    console.error('Error tailoring cover letter:', error);
    throw error;
  }
}

// Main autofill function
async function autofillForm() {
  try {
    // Request profile data from background script
    const response = await chrome.runtime.sendMessage({ action: 'fetchProfile' });
    
    if (!response.success) {
      showNotification('Error: ' + response.error, 'error');
      return;
    }
    
    const profile = response.profile;
    if (!profile) {
      showNotification('No profile data found. Please upload a resume in your profile.', 'error');
      return;
    }
    
    // Find all form fields
    const fields = findFormFields();
    
    if (fields.length === 0) {
      showNotification('No form fields found on this page.', 'warning');
      return;
    }
    
    // Fill fields
    let filledCount = 0;
    const filledFields = [];
    let resumeFile = null;
    let coverLetterFile = null;
    
    // Check if we need to fetch resume file or cover letter file
    // Do this BEFORE processing fields to ensure we have the files ready
    const resumeFields = [];
    const coverLetterFields = [];
    
    fields.forEach(field => {
      if (field.element.type === 'file') {
        const match = matchFieldToProfile(field, profile);
        if (match && match.profileKey === 'resumeFile') {
          resumeFields.push(field);
        } else if (match && match.profileKey === 'coverLetterFile') {
          coverLetterFields.push(field);
        }
      }
    });
    
    console.log('Streamline: Found resume fields:', resumeFields.length, 'cover letter fields:', coverLetterFields.length);
    
    // Extract job information from the page
    const jobInfo = extractJobInfo();
    
    // ============================================
    // TAILORING FEATURE FLAG
    // ============================================
    // DISABLED: Resume and cover letter tailoring is currently disabled due to rate limiting
    // TO RE-ENABLE: Change the value below from `false` to `true`
    // Location: Line ~976 in chrome-extension/content.js
    const ENABLE_TAILORING = false;
    // ============================================
    
    const shouldTailor = ENABLE_TAILORING && jobInfo.jobDescription.length > 100; // Only tailor if we found a job description
    
    if (shouldTailor) {
      showNotification('Tailoring documents for this job...', 'info');
    }
    
    // Fetch original files first (needed for tailoring)
    let originalResumeFile = null;
    let originalCoverLetterFile = null;
    let resumeData = null;
    let coverLetterData = null;
    
    if (resumeFields.length > 0) {
      try {
        console.log('Streamline: Resume field(s) detected, fetching resume data...');
        // Get resume data for tailoring
        const resumeResponse = await chrome.runtime.sendMessage({ action: 'fetchResumeData' });
        if (resumeResponse.success) {
          resumeData = resumeResponse.data;
          originalResumeFile = await fetchResumeFile();
          console.log('Streamline: Resume data fetched');
        }
      } catch (error) {
        console.error('Streamline: Failed to fetch resume data:', error);
        showNotification('Warning: Could not fetch resume. ' + error.message, 'warning');
      }
    }
    
    if (coverLetterFields.length > 0) {
      try {
        console.log('Streamline: Cover letter field(s) detected, fetching cover letter data...');
        // Get cover letter data for tailoring
        const coverLetterResponse = await chrome.runtime.sendMessage({ action: 'fetchCoverLetterData' });
        if (coverLetterResponse.success) {
          coverLetterData = coverLetterResponse.data;
          originalCoverLetterFile = await fetchCoverLetterFile();
          console.log('Streamline: Cover letter data fetched');
        }
      } catch (error) {
        console.error('Streamline: Failed to fetch cover letter data:', error);
        showNotification('Warning: Could not fetch cover letter. ' + error.message, 'warning');
      }
    }
    
    // Tailor documents if we have job info and documents
    // NOTE: Tailoring is controlled by ENABLE_TAILORING flag above
    if (shouldTailor && (resumeData || coverLetterData)) {
      try {
        if (resumeData && resumeFields.length > 0) {
          console.log('Streamline: Tailoring resume for job...');
          resumeFile = await tailorResume(resumeData, jobInfo);
          showNotification('Resume tailored successfully!', 'success');
        } else if (resumeFields.length > 0) {
          // Use original if tailoring failed or not available
          resumeFile = originalResumeFile;
        }
        
        if (coverLetterData && coverLetterFields.length > 0) {
          console.log('Streamline: Tailoring cover letter for job...');
          coverLetterFile = await tailorCoverLetter(resumeData, coverLetterData, jobInfo);
          showNotification('Cover letter tailored successfully!', 'success');
        } else if (coverLetterFields.length > 0) {
          // Use original if tailoring failed or not available
          coverLetterFile = originalCoverLetterFile;
        }
      } catch (error) {
        console.error('Streamline: Tailoring failed, using original files:', error);
        showNotification('Warning: Could not tailor documents. Using originals. ' + error.message, 'warning');
        // Fallback to original files
        resumeFile = originalResumeFile;
        coverLetterFile = originalCoverLetterFile;
      }
    } else {
      // No tailoring (ENABLE_TAILORING is false), use original files
      resumeFile = originalResumeFile;
      coverLetterFile = originalCoverLetterFile;
    }
    
    console.log('Streamline: Found fields', fields.length);
    
    // Separate dropdown fields from regular fields to process them sequentially
    const dropdownFields = [];
    const regularFields = [];
    
    fields.forEach((field) => {
      const isNativeSelect = field.type === 'select' || field.element.tagName === 'SELECT';
      const isCustomSelect = field.element.tagName === 'INPUT' && (
        field.element.getAttribute('role') === 'combobox' ||
        field.element.getAttribute('aria-haspopup') === 'listbox' ||
        field.element.className?.includes('select') || 
        field.element.closest('.select') ||
        field.element.closest('[class*="Select"]') ||
        field.element.closest('[class*="react-select"]') ||
        field.element.id?.includes('select') ||
        field.element.getAttribute('aria-controls') ||
        field.element.getAttribute('aria-owns')
      );
      
      if (isWorkAuthorizationQuestion(field) || isCountryField(field) || isCustomSelect || isNativeSelect) {
        dropdownFields.push(field);
      } else {
        regularFields.push(field);
      }
    });
    
    // Process regular fields first (text inputs, etc.) - standard profile fields only
    regularFields.forEach((field) => {
      console.log('Streamline: Checking field', {
        label: field.label,
        type: field.type,
        identifiers: field.identifiers
      });
      
      // Check if it's a LinkedIn field
      const q = (field.label || '').toLowerCase();
      if ((q.includes('linkedin') || q.includes('linked in')) && 
          (field.type === 'input' || field.type === 'textarea')) {
        // Use LinkedIn from profile if available, otherwise skip (will be handled by LLM later)
        const linkedInUrl = profile.linkedIn || '';
        if (linkedInUrl && fillField(field.element, linkedInUrl)) {
          filledCount++;
          filledFields.push(field.label);
          console.log('Streamline: Filled LinkedIn field:', linkedInUrl);
        }
        return; // Skip further processing
      }
      
      const match = matchFieldToProfile(field, profile);
      if (match) {
        console.log('Streamline: Matched field', {
          label: field.label,
          type: field.type,
          profileKey: match.profileKey,
          value: match.value
        });
        
        // Special handling for resume file upload
        if (match.profileKey === 'resumeFile' && field.element.type === 'file') {
          if (resumeFile) {
            fillFileField(field.element, resumeFile).then((filled) => {
              if (filled) {
                filledCount++;
                filledFields.push(field.label);
                console.log('Streamline: Successfully attached resume file to:', field.label, 'File:', resumeFile.name);
              }
            });
          } else {
            console.log('Streamline: Resume field detected but no resume file available:', field.label);
          }
          return; // Skip other processing for file fields
        }
        
        // Special handling for cover letter file upload
        if (match.profileKey === 'coverLetterFile' && field.element.type === 'file') {
          if (coverLetterFile) {
            fillFileField(field.element, coverLetterFile).then((filled) => {
              if (filled) {
                filledCount++;
                filledFields.push(field.label);
                console.log('Streamline: Successfully attached cover letter file to:', field.label, 'File:', coverLetterFile.name);
              }
            });
          } else {
            console.log('Streamline: Cover letter field detected but no cover letter file available:', field.label);
          }
          return; // Skip other processing for file fields
        }
        
        // Only fill standard profile fields (name, email, phone, location) - skip others for LLM
        const standardFields = ['firstName', 'lastName', 'fullName', 'email', 'phone', 'location'];
        if (standardFields.includes(match.profileKey)) {
          if (fillField(field.element, match.value)) {
            filledCount++;
            filledFields.push(field.label);
          }
        }
      }
    });
    
    // Process dropdown fields sequentially with delays to avoid conflicts
    const processDropdownField = async (field, index) => {
      // Wait before processing to allow previous dropdowns to close
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between dropdowns
      }
      
      // Close any open dropdowns before opening a new one
      const openDropdowns = document.querySelectorAll('[role="listbox"][style*="display"]:not([style*="display: none"])');
      openDropdowns.forEach(dd => {
        // Try to close by clicking outside or pressing Escape
        document.body.click();
      });
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for dropdowns to close
      
      console.log('Streamline: Checking field', {
        label: field.label,
        type: field.type,
        identifiers: field.identifiers
      });
      
      const isNativeSelect = field.type === 'select' || field.element.tagName === 'SELECT';
      const isCustomSelect = field.element.tagName === 'INPUT' && (
        field.element.getAttribute('role') === 'combobox' ||
        field.element.getAttribute('aria-haspopup') === 'listbox' ||
        field.element.className?.includes('select') || 
        field.element.closest('.select') ||
        field.element.closest('[class*="Select"]') ||
        field.element.closest('[class*="react-select"]') ||
        field.element.id?.includes('select') ||
        field.element.getAttribute('aria-controls') ||
        field.element.getAttribute('aria-owns')
      );
      
      if (isWorkAuthorizationQuestion(field)) {
        console.log('Streamline: Work authorization question detected', {
          label: field.label,
          isNativeSelect: isNativeSelect,
          isCustomSelect: isCustomSelect,
          tagName: field.element.tagName,
          role: field.element.getAttribute('role'),
          ariaHaspopup: field.element.getAttribute('aria-haspopup'),
          className: field.element.className
        });
        
        const targetValue = getWorkAuthorizationValue(field);
        console.log('Streamline: Target value for work authorization:', targetValue);
        
        if (targetValue) {
          if (isNativeSelect) {
            // Native select
            const options = Array.from(field.element.options);
            const targetLower = targetValue.toLowerCase();
            
            // Try exact match first for Yes/No
            let targetOption = options.find(opt => {
              const optText = (opt.text || opt.textContent || '').toLowerCase().trim();
              return optText === targetLower;
            });
            
            // If no exact match, try single letter (y/n)
            if (!targetOption && (targetLower === 'yes' || targetLower === 'no')) {
              targetOption = options.find(opt => {
                const optText = (opt.text || opt.textContent || '').toLowerCase().trim();
                return (targetLower === 'yes' && optText === 'y') || 
                       (targetLower === 'no' && optText === 'n');
              });
            }
            
            // Fallback to includes matching
            if (!targetOption) {
              targetOption = options.find(opt => {
                const optText = (opt.text || opt.textContent || '').toLowerCase().trim();
                return optText.includes(targetLower) || targetLower.includes(optText);
              });
            }
            
            if (targetOption) {
              field.element.value = targetOption.value;
              field.element.selectedIndex = Array.from(field.element.options).indexOf(targetOption);
              
              // Trigger events
              field.element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
              field.element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              
              // Trigger React/other framework updates
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(field.element, targetOption.value);
              }
              
              field.element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              
              // Force focus/blur to trigger validation
              field.element.focus();
              field.element.blur();
              
              filledCount++;
              filledFields.push(field.label);
              console.log('Streamline: Successfully filled work authorization (native select):', field.label, 'with value:', targetOption.text);
            } else {
              console.log('Streamline: Could not find option for work authorization (native select):', targetValue, 'Available options:', options.map(o => o.text));
            }
          } else {
            // Try as custom React Select (even if not detected, it might still be one)
            console.log('Streamline: Attempting to fill as React Select dropdown');
            const filled = await fillDropdownField(field.element, targetValue, field);
              if (filled) {
                filledCount++;
                filledFields.push(field.label);
                console.log('Streamline: Successfully filled work authorization (React Select):', field.label);
              } else {
                console.log('Streamline: Failed to fill work authorization (React Select):', field.label);
              }
          }
        }
        return; // Skip other processing for work authorization fields
      }
      
      // Handle country field
      if (isCountryField(field)) {
        // Extract country from location string
        const extractCountry = (location) => {
          if (!location) return 'United States';
          
          const locationLower = location.toLowerCase();
          
          // US state abbreviations (all 50 states + DC)
          const usStates = ['al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 
                           'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md', 
                           'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 
                           'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 
                           'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc'];
          
          // Check if location contains US state abbreviation
          const hasUSState = usStates.some(state => {
            const regex = new RegExp(`\\b${state}\\b`, 'i');
            return regex.test(locationLower);
          });
          
          // Check for explicit US country mentions
          if (hasUSState || 
              locationLower.includes('united states') || 
              locationLower.includes('usa') || 
              locationLower.includes('u.s.a') ||
              locationLower.includes('u.s.') ||
              locationLower.includes('us')) {
            return 'United States';
          }
          
          // Try to extract country from comma-separated location (City, State, Country format)
          const parts = location.split(',').map(p => p.trim());
          if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].toLowerCase();
            // If last part is a state abbreviation, it's US
            if (usStates.includes(lastPart)) {
              return 'United States';
            }
            // Otherwise, use the last part as country (capitalize it)
            return parts[parts.length - 1];
          }
          
          // Default to United States
          return 'United States';
        };
        
        const countryValue = extractCountry(profile.location);
        console.log('Streamline: Country field detected, location:', profile.location, 'extracted country:', countryValue);
        
        if (isNativeSelect) {
          if (fillSelectField(field.element, countryValue)) {
            filledCount++;
            filledFields.push(field.label);
          }
        } else if (isCustomSelect) {
          const filled = await fillDropdownField(field.element, countryValue, field);
              if (filled) {
                filledCount++;
                filledFields.push(field.label);
          }
        }
        return;
      }
      
      const match = matchFieldToProfile(field, profile);
      if (match) {
        console.log('Streamline: Matched field', {
          label: field.label,
          type: field.type,
          profileKey: match.profileKey,
          value: match.value
        });
        
        // Handle other dropdowns
        if (isNativeSelect) {
          // Other native select - use fillSelectField
          if (fillSelectField(field.element, match.value)) {
            filledCount++;
            filledFields.push(field.label);
          }
        } else if (isCustomSelect) {
          // Other custom React Select - use fillDropdownField
          const filled = await fillDropdownField(field.element, match.value, field);
            if (filled) {
              filledCount++;
              filledFields.push(field.label);
            }
        } else if (fillField(field.element, match.value)) {
          // Regular text input or textarea
          filledCount++;
          filledFields.push(field.label);
        }
      }
    };
    
    // Process all dropdown fields sequentially
    for (let i = 0; i < dropdownFields.length; i++) {
      await processDropdownField(dropdownFields[i], i);
    }
    
    // Process text/textarea fields that need answers (after dropdowns to avoid conflicts)
    const textFieldsToFill = [];
    regularFields.forEach(field => {
      // Check if it's a text field with a question label
      if ((field.type === 'input' && (field.element.type === 'text' || !field.element.type)) || 
          field.type === 'textarea') {
        const label = field.label || '';
        // Skip if already filled or if it's a standard profile field (those are handled above)
        if (label && !filledFields.includes(label) && 
            !isStandardProfileField(field, profile) && // Not a standard profile field
            label.length > 5) { // Has some content
          textFieldsToFill.push(field);
        }
      }
    });
    
    // Process text fields that need LLM answers (everything except standard fields)
    for (const field of textFieldsToFill) {
      const questionText = field.label || '';
      
      // Skip if empty or too short
      if (!questionText || questionText.length < 5) continue;
      
      try {
        console.log('Streamline: Generating LLM answer for:', questionText);
        showNotification('Generating answer...', 'info');
        
        // Get resume data for LLM
        const resumeResponse = await chrome.runtime.sendMessage({ action: 'fetchResumeData' });
        if (!resumeResponse.success) {
          console.log('Streamline: Could not fetch resume data, skipping LLM answer');
          continue;
        }
        
        // Generate LLM answer for this question
        const answer = await generateLLMAnswer(questionText, jobInfo, resumeResponse.data);
        console.log('Streamline: Generated LLM answer:', answer.substring(0, 100));
        
        // Fill the field if we have an answer (and it's not empty)
        if (answer && answer.trim() !== '') {
          if (fillField(field.element, answer)) {
            filledCount++;
            filledFields.push(field.label);
            console.log('Streamline: Successfully filled text field:', field.label);
          }
        }
      } catch (error) {
        console.error('Streamline: Error filling text field:', field.label, error);
        // Continue with other fields even if one fails
      }
    }
    
    if (filledCount > 0) {
      showNotification(`Successfully filled ${filledCount} field(s): ${filledFields.join(', ')}`, 'success');
    } else {
      showNotification('No matching fields found to fill.', 'warning');
    }
  } catch (error) {
    console.error('Autofill error:', error);
    showNotification('Error: ' + error.message, 'error');
  }
}

// Show notification to user
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.getElementById('streamline-autofill-notification');
  if (existing) existing.remove();
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'streamline-autofill-notification';
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
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Create autofill button
function createAutofillButton() {
  // Remove existing button if it exists
  const existing = document.getElementById('streamline-autofill-button');
  if (existing) existing.remove();
  
  // Create button
  const button = document.createElement('button');
  button.id = 'streamline-autofill-button';
  button.textContent = '🚀 Autofill with Streamline';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    transition: all 0.2s;
  `;
  
  button.onmouseover = () => {
    button.style.background = '#2563eb';
    button.style.transform = 'scale(1.05)';
  };
  button.onmouseout = () => {
    button.style.background = '#3b82f6';
    button.style.transform = 'scale(1)';
  };
  
  button.onclick = () => {
    button.textContent = '⏳ Filling...';
    button.disabled = true;
    autofillForm().finally(() => {
      button.textContent = '🚀 Autofill with Streamline';
      button.disabled = false;
    });
  };
  
  document.body.appendChild(button);
}

// Initialize when page loads
function init() {
  console.log('Streamline: Content script loaded');
  
  // Wait a bit for page to be ready
  setTimeout(() => {
    createAutofillButton();
    console.log('Streamline: Autofill button created');
  }, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-create button if page content changes (for SPAs)
const observer = new MutationObserver(() => {
  if (!document.getElementById('streamline-autofill-button')) {
    setTimeout(createAutofillButton, 500);
  }
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
} else {
  // Wait for body to exist
  const bodyObserver = new MutationObserver(() => {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      bodyObserver.disconnect();
    }
  });
  bodyObserver.observe(document.documentElement, {
    childList: true,
  });
}

