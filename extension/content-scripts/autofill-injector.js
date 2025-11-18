/**
 * Autofill injector - injected directly into page to fill forms
 * This script is injected by the background script with autofill data
 */

(function() {
  // Get autofill data from window (set by background script)
  const autofillData = window.__autofillData__;
  
  if (!autofillData) {
    console.error('No autofill data provided');
    return { success: false, error: 'No autofill data' };
  }
  
  console.log('Autofill injector started with data:', autofillData);
  
  let filledCount = 0;
  
  // Helper function to find and fill a field
  function fillField(selectors, value) {
    if (!value) return false;
    
    for (const selector of selectors) {
      try {
        const field = document.querySelector(selector);
        if (field && field.offsetParent !== null) {
          const style = window.getComputedStyle(field);
          if (style.display !== 'none' && 
              style.visibility !== 'hidden' &&
              style.opacity !== '0' &&
              !field.disabled && 
              !field.readOnly) {
            
            // Focus the field
            field.focus();
            
            // Set value
            field.value = value;
            
            // Trigger events for React
            const events = ['input', 'change', 'blur'];
            events.forEach(eventType => {
              const event = new Event(eventType, { bubbles: true, cancelable: true });
              field.dispatchEvent(event);
            });
            
            // For React-controlled inputs
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;
            
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(field, value);
              const inputEvent = new Event('input', { bubbles: true });
              field.dispatchEvent(inputEvent);
            }
            
            field.blur();
            console.log('✅ Filled field:', selector, 'with value:', value);
            return true;
          }
        }
      } catch (e) {
        console.warn('Error with selector:', selector, e);
      }
    }
    return false;
  }
  
  // Fill firstName
  if (fillField([
    'input[data-automation-id="firstName"]',
    'input[data-automation-id*="firstName"]',
    'input[name*="firstName" i]',
    'input[name*="first" i][name*="name" i]',
    'input[aria-label*="first" i][aria-label*="name" i]',
    'input[placeholder*="first" i]',
  ], autofillData.firstName)) filledCount++;
  
  // Fill lastName
  if (fillField([
    'input[data-automation-id="lastName"]',
    'input[data-automation-id*="lastName"]',
    'input[name*="lastName" i]',
    'input[name*="last" i][name*="name" i]',
    'input[aria-label*="last" i][aria-label*="name" i]',
    'input[placeholder*="last" i]',
  ], autofillData.lastName)) filledCount++;
  
  // Fill email
  if (fillField([
    'input[data-automation-id="email"]',
    'input[data-automation-id*="email"]',
    'input[type="email"]',
    'input[name*="email" i]',
    'input[aria-label*="email" i]',
    'input[placeholder*="email" i]',
  ], autofillData.email)) filledCount++;
  
  // Fill phone
  if (fillField([
    'input[data-automation-id="phone"]',
    'input[data-automation-id*="phone"]',
    'input[type="tel"]',
    'input[name*="phone" i]',
    'input[aria-label*="phone" i]',
    'input[placeholder*="phone" i]',
  ], autofillData.phone)) filledCount++;
  
  // Fill location
  if (fillField([
    'input[data-automation-id="location"]',
    'input[data-automation-id*="location"]',
    'input[name*="location" i]',
    'input[name*="city" i]',
    'input[aria-label*="location" i]',
    'input[aria-label*="city" i]',
    'input[placeholder*="location" i]',
    'input[placeholder*="city" i]',
  ], autofillData.location)) filledCount++;
  
  // Trigger global change event
  setTimeout(() => {
    const event = new Event('change', { bubbles: true });
    document.dispatchEvent(event);
  }, 100);
  
  console.log('✅ Autofill complete. Filled', filledCount, 'fields.');
  
  const result = { success: true, filledCount: filledCount };
  window.__autofillResult__ = result;
  return result;
})();

