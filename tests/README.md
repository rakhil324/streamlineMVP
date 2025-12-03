# Automated Testing Guide

This directory contains comprehensive automated tests for the Streamline AI application, including unit tests, E2E tests, and extension tests.

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npm run playwright:install

# Run all tests
npm run test:all

# Start interactive test server
npm run test:server
```

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all Jest tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:extension` | Run extension tests only |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run test:e2e:headed` | Run E2E tests in visible browser |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate code coverage report |
| `npm run test:server` | Start web-based test runner |

## Test Structure

```
tests/
├── setup.ts                     # Jest global setup
├── test-server.ts              # Web-based test runner
├── README.md                   # This file
├── unit/                       # Unit tests
│   ├── api/                    # API route tests
│   │   ├── jobs.test.ts
│   │   └── tailor-answer.test.ts
│   └── extension/              # Extension logic tests
│       ├── greenhouse.test.ts
│       └── workday.test.ts
├── e2e/                        # End-to-end tests
│   ├── home.spec.ts            # Home page tests
│   ├── auth.spec.ts            # Authentication tests
│   └── tracker.spec.ts         # Job tracker tests
└── utils/                      # Test utilities
    ├── api-test-utils.ts
    └── extension-test-utils.ts
```

## Unit Tests (Jest)

Unit tests verify individual functions and API routes in isolation.

### API Tests
Located in `tests/unit/api/`, these test the Next.js API routes:

- **jobs.test.ts**: Tests for `/api/jobs` endpoint
  - Authentication checks
  - Job creation validation
  - Duplicate detection
  - Error handling

- **tailor-answer.test.ts**: Tests for `/api/tailor/answer` endpoint
  - AI answer generation
  - Resume requirement validation
  - LLM integration

### Extension Tests
Located in `tests/unit/extension/`, these test the Chrome extension content scripts:

- **greenhouse.test.ts**: Greenhouse ATS autofill tests
  - Field detection
  - Work authorization handling
  - Profile matching
  - Chrome API integration

- **workday.test.ts**: Workday ATS autofill tests
  - Data-automation-id field detection
  - Complex form handling
  - URL parsing
  - Job info extraction

### Writing Unit Tests

```typescript
import { describe, it, expect, jest } from '@jest/globals';

describe('MyFeature', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

## E2E Tests (Playwright)

End-to-end tests simulate real user interactions in a browser.

### Available Tests

- **home.spec.ts**: Tests home page loading and navigation
- **auth.spec.ts**: Tests login, signup, and protected routes
- **tracker.spec.ts**: Tests job tracking functionality

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('should load page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

### Running E2E Tests

```bash
# Headless mode
npm run test:e2e

# With browser visible
npm run test:e2e:headed

# With Playwright UI
npm run test:e2e:ui
```

## Test Server

The test server provides a web interface for running and viewing test results.

```bash
npm run test:server
```

Open http://localhost:3001 in your browser to:
- Run all tests with one click
- View detailed results
- Filter by test type
- See error details

## Test Utilities

### API Test Utilities (`tests/utils/api-test-utils.ts`)

```typescript
import { createMockNextRequest, createMockSession } from '@/tests/utils/api-test-utils';

// Create mock request
const request = createMockNextRequest({
  method: 'POST',
  body: { title: 'Test Job', company: 'Test Corp' },
});

// Create mock session
const session = createMockSession({
  email: 'test@example.com',
});
```

### Extension Test Utilities (`tests/utils/extension-test-utils.ts`)

```typescript
import { createMockChrome, createMockForm } from '@/tests/utils/extension-test-utils';

// Create mock Chrome API
const chrome = createMockChrome();
(global as any).chrome = chrome;

// Create mock form
const form = createMockForm([
  { type: 'text', name: 'firstName', label: 'First Name' },
  { type: 'email', name: 'email', label: 'Email' },
]);
document.body.appendChild(form);
```

## Coverage Reports

Generate code coverage reports:

```bash
npm run test:coverage
```

Coverage reports are saved to the `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view detailed coverage.

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Mock external dependencies**: Use mocks for APIs, Chrome runtime, etc.
3. **Test edge cases**: Include tests for error conditions
4. **Use descriptive names**: Test names should describe the expected behavior
5. **Keep tests fast**: Unit tests should run in milliseconds

## Debugging Tests

### Jest
```bash
# Run specific test file
npx jest tests/unit/api/jobs.test.ts

# Run with verbose output
npx jest --verbose

# Debug with Node
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright
```bash
# Debug mode
npx playwright test --debug

# Generate trace
npx playwright test --trace on
```

## CI/CD Integration

Tests can be run in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install chromium

- name: Run tests
  run: npm run test:all
```

## Troubleshooting

### Tests timing out
- Increase timeout in jest.config.js or test file
- Check for async operations that don't resolve

### E2E tests failing
- Ensure dev server is running
- Check if selectors have changed
- Run with `--headed` to see what's happening

### Mock not working
- Ensure mock is set up before importing module
- Use `jest.resetModules()` between tests if needed

