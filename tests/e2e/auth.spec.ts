/**
 * E2E Tests for Authentication
 * Tests login, signup, and session management
 */

import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await expect(submitButton).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Should show an error message or stay on login page
    await page.waitForTimeout(1000);
    
    // Either we're still on login page or there's an error message
    const currentUrl = page.url();
    const hasError = await page.locator('text=/error|invalid|incorrect/i').isVisible().catch(() => false);
    
    expect(currentUrl.includes('login') || hasError).toBeTruthy();
  });

  test('should have link to signup page', async ({ page }) => {
    await page.goto('/login');
    
    // Look for signup link
    const signupLink = page.locator('a[href*="signup"], a:has-text("Sign Up"), a:has-text("Register"), a:has-text("Create")');
    await expect(signupLink).toBeVisible();
  });
});

test.describe('Signup Page', () => {
  test('should display signup form', async ({ page }) => {
    await page.goto('/signup');
    
    // Check for name input (optional)
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]');
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create")');
    await expect(submitButton).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/signup');
    
    // Fill in invalid email
    await page.fill('input[type="email"], input[name="email"]', 'notanemail');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should show validation error (browser or custom)
    await page.waitForTimeout(500);
    
    // Check if email field has validation error
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    
    expect(isInvalid).toBeTruthy();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users from tracker page', async ({ page }) => {
    await page.goto('/tracker');
    
    // Should redirect to login or show login prompt
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    const hasLoginPrompt = await page.locator('text=/login|sign in/i').isVisible().catch(() => false);
    
    expect(currentUrl.includes('login') || hasLoginPrompt).toBeTruthy();
  });

  test('should redirect unauthenticated users from profile page', async ({ page }) => {
    await page.goto('/profile');
    
    // Should redirect to login or show login prompt
    await page.waitForTimeout(1000);
    
    const currentUrl = page.url();
    const hasLoginPrompt = await page.locator('text=/login|sign in/i').isVisible().catch(() => false);
    
    expect(currentUrl.includes('login') || hasLoginPrompt).toBeTruthy();
  });
});

