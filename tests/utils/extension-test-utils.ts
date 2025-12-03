/**
 * Extension Testing Utilities
 * Helper functions for testing Chrome extension functionality
 */

/**
 * Create a mock Chrome runtime API
 */
export function createMockChromeRuntime() {
  const messageListeners: ((message: any, sender: any, sendResponse: (response: any) => void) => boolean | void)[] = [];
  
  return {
    sendMessage: jest.fn((message: any, callback?: (response: any) => void) => {
      // Default successful response
      const response = { success: true };
      if (callback) callback(response);
      return Promise.resolve(response);
    }),
    onMessage: {
      addListener: jest.fn((listener) => {
        messageListeners.push(listener);
      }),
      removeListener: jest.fn((listener) => {
        const index = messageListeners.indexOf(listener);
        if (index > -1) messageListeners.splice(index, 1);
      }),
    },
    lastError: null,
    // Helper to simulate incoming message
    simulateMessage: (message: any, sender: any = {}) => {
      return new Promise((resolve) => {
        messageListeners.forEach(listener => {
          listener(message, sender, resolve);
        });
      });
    },
  };
}

/**
 * Create a mock Chrome storage API
 */
export function createMockChromeStorage() {
  let storage: Record<string, any> = {};
  
  return {
    local: {
      get: jest.fn((keys: string | string[] | null) => {
        if (keys === null) return Promise.resolve({ ...storage });
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: storage[keys] });
        }
        const result: Record<string, any> = {};
        keys.forEach(key => {
          if (key in storage) result[key] = storage[key];
        });
        return Promise.resolve(result);
      }),
      set: jest.fn((items: Record<string, any>) => {
        Object.assign(storage, items);
        return Promise.resolve();
      }),
      remove: jest.fn((keys: string | string[]) => {
        const keysArray = typeof keys === 'string' ? [keys] : keys;
        keysArray.forEach(key => delete storage[key]);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage = {};
        return Promise.resolve();
      }),
    },
    // Helper to set initial storage state
    setInitialState: (state: Record<string, any>) => {
      storage = { ...state };
    },
    // Helper to get current storage state
    getState: () => ({ ...storage }),
  };
}

/**
 * Create a mock Chrome tabs API
 */
export function createMockChromeTabs() {
  let tabs: any[] = [
    {
      id: 1,
      url: 'https://example.com',
      title: 'Example Page',
      active: true,
    },
  ];
  
  return {
    query: jest.fn((queryInfo: any) => {
      let result = [...tabs];
      if (queryInfo.active !== undefined) {
        result = result.filter(t => t.active === queryInfo.active);
      }
      if (queryInfo.currentWindow) {
        // Return all tabs for simplicity
      }
      return Promise.resolve(result);
    }),
    get: jest.fn((tabId: number) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) return Promise.resolve(tab);
      return Promise.reject(new Error('Tab not found'));
    }),
    create: jest.fn((createProperties: any) => {
      const newTab = { id: tabs.length + 1, ...createProperties };
      tabs.push(newTab);
      return Promise.resolve(newTab);
    }),
    update: jest.fn((tabId: number, updateProperties: any) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) Object.assign(tab, updateProperties);
      return Promise.resolve(tab);
    }),
    sendMessage: jest.fn(),
    // Helper to set tabs
    setTabs: (newTabs: any[]) => {
      tabs = newTabs;
    },
  };
}

/**
 * Create a mock Chrome scripting API
 */
export function createMockChromeScripting() {
  return {
    executeScript: jest.fn(({ target, func, args, world }) => {
      // Execute the function with args in a sandboxed way
      try {
        const result = func(...(args || []));
        return Promise.resolve([{ result }]);
      } catch (error) {
        return Promise.reject(error);
      }
    }),
  };
}

/**
 * Create complete mock Chrome API
 */
export function createMockChrome() {
  const runtime = createMockChromeRuntime();
  const storage = createMockChromeStorage();
  const tabs = createMockChromeTabs();
  const scripting = createMockChromeScripting();
  
  return {
    runtime,
    storage,
    tabs,
    scripting,
    // Helper to reset all mocks
    resetAll: () => {
      jest.clearAllMocks();
      storage.local.clear();
    },
  };
}

/**
 * Create mock DOM elements for form testing
 */
export function createMockForm(fields: Array<{
  type: string;
  name: string;
  id?: string;
  label?: string;
  options?: string[];
}>) {
  const form = document.createElement('form');
  
  fields.forEach(field => {
    const wrapper = document.createElement('div');
    
    if (field.label) {
      const label = document.createElement('label');
      label.textContent = field.label;
      label.htmlFor = field.id || field.name;
      wrapper.appendChild(label);
    }
    
    let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    if (field.type === 'select' && field.options) {
      input = document.createElement('select');
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.toLowerCase();
        option.textContent = opt;
        input.appendChild(option);
      });
    } else if (field.type === 'textarea') {
      input = document.createElement('textarea');
    } else {
      input = document.createElement('input');
      (input as HTMLInputElement).type = field.type;
    }
    
    input.name = field.name;
    if (field.id) input.id = field.id;
    
    wrapper.appendChild(input);
    form.appendChild(wrapper);
  });
  
  return form;
}

/**
 * Simulate filling a form field
 */
export function fillField(
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: string
) {
  if (element instanceof HTMLSelectElement) {
    const option = Array.from(element.options).find(
      opt => opt.value === value || opt.textContent === value
    );
    if (option) {
      element.value = option.value;
    }
  } else {
    element.value = value;
  }
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Check if a form is filled correctly
 */
export function validateFormFill(
  form: HTMLFormElement,
  expectedValues: Record<string, string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [name, expectedValue] of Object.entries(expectedValues)) {
    const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
    
    if (!field) {
      errors.push(`Field "${name}" not found`);
      continue;
    }
    
    if (field.value !== expectedValue) {
      errors.push(`Field "${name}" has value "${field.value}" but expected "${expectedValue}"`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

