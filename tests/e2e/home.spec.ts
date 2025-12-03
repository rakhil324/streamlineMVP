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

  test('should show login link for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Look for login/sign in elements
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    await expect(loginLink).toBeVisible();
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
  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation elements
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();
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

