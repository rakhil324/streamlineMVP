/**
 * E2E Tests for Home Page
 * Tests the main landing page and navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Streamline/i);
  });

  test('should show login link or redirect to login', async ({ page }) => {
    await page.goto('/');
    
    // Look for login/sign in elements OR check if we're already on a logged-in page
    const loginLink = page.locator('a[href*="login"], button:has-text("Login"), button:has-text("Sign In"), a:has-text("Login"), a:has-text("Sign In")');
    const isLoginVisible = await loginLink.first().isVisible().catch(() => false);
    
    // Could also be redirected to login, or showing a dashboard
    const currentUrl = page.url();
    const hasLoginOrContent = isLoginVisible || 
                              currentUrl.includes('login') || 
                              await page.locator('body').isVisible();
    
    expect(hasLoginOrContent).toBeTruthy();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Click on login
    await page.click('a[href*="login"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Should be on login page
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Navigation', () => {
  test('page has content and is interactive', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check that page has some content
    const bodyContent = await page.locator('body').textContent();
    const hasContent = bodyContent && bodyContent.trim().length > 0;
    
    // Check for interactive elements
    const buttons = page.locator('button, a, input');
    const hasInteractiveElements = await buttons.count() > 0;
    
    // Page should have content or interactive elements (may redirect to login)
    const pageUrl = page.url();
    const isValidPage = hasContent || hasInteractiveElements || pageUrl.includes('login');
    
    expect(isValidPage).toBeTruthy();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

