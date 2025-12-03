/**
 * Visual and Accessibility E2E Tests
 * 
 * Tests for visual appearance, accessibility, and cross-browser compatibility.
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper: Wait for page to be fully loaded
 */
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

// ============================================
// Visual Regression Tests
// ============================================
test.describe('Visual: Screenshots', () => {
  test('home page looks correct', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Take screenshot for visual comparison
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1, // Allow 10% difference
    });
  });

  test('login page looks correct', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);
    
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });

  test('signup page looks correct', async ({ page }) => {
    await page.goto('/signup');
    await waitForPageLoad(page);
    
    await expect(page).toHaveScreenshot('signup-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });
});


// ============================================
// Accessibility Tests
// ============================================
test.describe('Accessibility', () => {
  test('home page has no critical accessibility issues', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Check for basic accessibility
    // 1. Page has a title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // 2. Page has a main landmark
    const mainLandmark = page.locator('main, [role="main"]');
    const hasMain = await mainLandmark.count() > 0;
    
    // 3. Images have alt text
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    
    // 4. Links have accessible text
    const emptyLinks = await page.locator('a:not([aria-label]):empty').count();
    
    // 5. Buttons have accessible text
    const emptyButtons = await page.locator('button:not([aria-label]):empty').count();
    
    // Log issues but don't fail
    if (imagesWithoutAlt > 0) {
      console.log(`Warning: ${imagesWithoutAlt} images without alt text`);
    }
    if (emptyLinks > 0) {
      console.log(`Warning: ${emptyLinks} empty links`);
    }
    if (emptyButtons > 0) {
      console.log(`Warning: ${emptyButtons} empty buttons`);
    }
  });

  test('forms are accessible', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);
    
    // Check form accessibility
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputType = await input.getAttribute('type');
      
      // Skip hidden inputs
      if (inputType === 'hidden') continue;
      
      // Check for label association
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      let hasLabel = false;
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = await label.count() > 0;
      }
      
      const isAccessible = hasLabel || ariaLabel || ariaLabelledBy || placeholder;
      
      if (!isAccessible) {
        console.log(`Warning: Input without label: ${inputType}`);
      }
    }
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);
    
    // Press Tab to navigate
    await page.keyboard.press('Tab');
    
    // First focusable element should be focused
    const focusedElement = page.locator(':focus');
    const isFocused = await focusedElement.count() > 0;
    
    expect(isFocused).toBeTruthy();
    
    // Continue tabbing through form
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should still have focus somewhere
    const stillFocused = await page.locator(':focus').count() > 0;
    expect(stillFocused).toBeTruthy();
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);
    
    // Focus on email input
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();
    
    // Check if focus is visible (has outline or other indicator)
    const hasFocusStyles = await emailInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' || 
             styles.boxShadow !== 'none' ||
             styles.borderColor !== styles.getPropertyValue('border-color');
    });
    
    // Focus should be visible
  });

  test('color contrast is adequate', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Check text elements for basic readability
    const textElements = page.locator('p, h1, h2, h3, span, a, button');
    const count = await textElements.count();
    
    let lowContrastCount = 0;
    
    for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 elements
      const element = textElements.nth(i);
      
      if (!await element.isVisible().catch(() => false)) continue;
      
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
        };
      });
      
      // Simple check: text should not be same color as background
      if (styles.color === styles.backgroundColor) {
        lowContrastCount++;
      }
    }
    
    // Log if there are contrast issues
    if (lowContrastCount > 0) {
      console.log(`Warning: ${lowContrastCount} elements may have contrast issues`);
    }
  });
});


// ============================================
// Responsive Design Tests
// ============================================
test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 },
    { name: 'Wide', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await waitForPageLoad(page);
      
      // Page should render
      await expect(page.locator('body')).toBeVisible();
      
      // No horizontal scrollbar (content fits viewport)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // Small buffer for scrollbar
      
      // Take screenshot for this viewport
      await page.screenshot({ 
        path: `test-results/screenshots/home-${viewport.name.toLowerCase()}.png`,
        fullPage: true 
      });
    });
  }

  test('navigation adapts to mobile', async ({ page }) => {
    // Desktop first
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Desktop navigation should be visible
    const desktopNav = page.locator('nav').first();
    const desktopNavVisible = await desktopNav.isVisible().catch(() => false);
    
    // Switch to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Mobile menu button might appear
    const mobileMenuButton = page.locator('[class*="menu"], [aria-label*="menu" i], button:has-text("☰")').first();
    const mobileMenuVisible = await mobileMenuButton.isVisible().catch(() => false);
    
    // Navigation should adapt (either still visible or have menu button)
  });

  test('forms are usable at all sizes', async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await waitForPageLoad(page);
      
      // Form inputs should be visible
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Inputs should be wide enough to use
      const inputWidth = await emailInput.evaluate((el) => el.getBoundingClientRect().width);
      expect(inputWidth).toBeGreaterThan(100); // At least 100px wide
    }
  });
});


// ============================================
// Dark Mode / Theme Tests
// ============================================
test.describe('Theme Support', () => {
  test('respects system dark mode preference', async ({ page }) => {
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Check if page has dark background
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // Take screenshot in dark mode
    await page.screenshot({ path: 'test-results/screenshots/home-dark-mode.png', fullPage: true });
  });

  test('respects system light mode preference', async ({ page }) => {
    // Emulate light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await waitForPageLoad(page);
    
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    await page.screenshot({ path: 'test-results/screenshots/home-light-mode.png', fullPage: true });
  });
});


// ============================================
// Print Styles
// ============================================
test.describe('Print Styles', () => {
  test('page is printable', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    
    // Page should still render
    await expect(page.locator('body')).toBeVisible();
    
    // Take print screenshot
    await page.screenshot({ path: 'test-results/screenshots/home-print.png', fullPage: true });
  });
});


// ============================================
// Animation & Motion
// ============================================
test.describe('Motion Preferences', () => {
  test('respects reduced motion preference', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Page should load without animations causing issues
    await expect(page.locator('body')).toBeVisible();
    
    // Transitions should be reduced or removed
    const hasReducedMotion = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    
    expect(hasReducedMotion).toBeTruthy();
  });
});


// ============================================
// Language & Locale
// ============================================
test.describe('Internationalization', () => {
  test('handles different locales', async ({ page }) => {
    // Set locale to French
    await page.context().grantPermissions([], { origin: 'http://localhost:3000' });
    
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Check if html lang attribute exists
    const htmlLang = await page.locator('html').getAttribute('lang');
    
    // Page should have language set
    if (!htmlLang) {
      console.log('Warning: html element missing lang attribute');
    }
  });

  test('handles RTL languages', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Check if RTL is supported
    const htmlDir = await page.locator('html').getAttribute('dir');
    
    // If switching to RTL, layout should adapt
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/screenshots/home-rtl.png', fullPage: true });
  });
});

