/**
 * Comprehensive Unit Tests for Encryption Module
 * Tests all encryption, decryption, key generation, and hashing functions
 * Provides full statement, branch, function, and line coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { encrypt, decrypt, generateSecureKey, hash } from '@/lib/encryption';

describe('Encryption Module', () => {
  describe('encrypt()', () => {
    it('should encrypt text successfully', () => {
      const plaintext = 'Hello, World!';
      const password = 'test-password-123';
      
      const encrypted = encrypt(plaintext, password);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different ciphertext for same input (due to random salt/IV)', () => {
      const plaintext = 'Same text';
      const password = 'same-password';
      
      const encrypted1 = encrypt(plaintext, password);
      const encrypted2 = encrypt(plaintext, password);
      
      // Should be different due to random salt and IV
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt empty string', () => {
      const plaintext = '';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should encrypt long text', () => {
      const plaintext = 'A'.repeat(10000);
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      
      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(plaintext.length);
    });

    it('should encrypt text with special characters', () => {
      const plaintext = 'Special: émojis 🎉, symbols @#$%, unicode: 日本語';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
    });

    it('should encrypt text with newlines and whitespace', () => {
      const plaintext = 'Line 1\nLine 2\r\nLine 3\tTabbed';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      
      expect(encrypted).toBeDefined();
    });

    it('should produce base64 encoded output', () => {
      const plaintext = 'Test data';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      
      // Base64 should only contain valid characters
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      expect(encrypted).toMatch(base64Regex);
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted text correctly', () => {
      const plaintext = 'Hello, World!';
      const password = 'test-password-123';
      
      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt empty string', () => {
      const plaintext = '';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long text', () => {
      const plaintext = 'B'.repeat(10000);
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt text with special characters', () => {
      const plaintext = 'Special: émojis 🎉, symbols @#$%, unicode: 日本語';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt text with newlines', () => {
      const plaintext = 'Line 1\nLine 2\r\nLine 3';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error with wrong password', () => {
      const plaintext = 'Secret data';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      const encrypted = encrypt(plaintext, correctPassword);
      
      expect(() => {
        decrypt(encrypted, wrongPassword);
      }).toThrow();
    });

    it('should throw error with corrupted ciphertext', () => {
      const plaintext = 'Test data';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      const corrupted = encrypted.slice(0, -10) + 'corrupted!';
      
      expect(() => {
        decrypt(corrupted, password);
      }).toThrow();
    });

    it('should throw error with invalid base64', () => {
      const password = 'test-password';
      const invalidData = 'not-valid-base64!!!@@@';
      
      expect(() => {
        decrypt(invalidData, password);
      }).toThrow();
    });

    it('should throw error with truncated data', () => {
      const plaintext = 'Test data';
      const password = 'test-password';
      
      const encrypted = encrypt(plaintext, password);
      const truncated = encrypted.slice(0, 50);
      
      expect(() => {
        decrypt(truncated, password);
      }).toThrow();
    });
  });

  describe('generateSecureKey()', () => {
    it('should generate a secure key', () => {
      const key = generateSecureKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateSecureKey();
      const key2 = generateSecureKey();
      const key3 = generateSecureKey();
      
      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });

    it('should generate base64 encoded key', () => {
      const key = generateSecureKey();
      
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      expect(key).toMatch(base64Regex);
    });

    it('should generate key of sufficient length', () => {
      const key = generateSecureKey();
      
      // 32 bytes = 256 bits, base64 encoded should be ~44 chars
      expect(key.length).toBeGreaterThanOrEqual(40);
    });

    it('should generate key that can be used for encryption', () => {
      const key = generateSecureKey();
      const plaintext = 'Test data';
      
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('hash()', () => {
    it('should hash data correctly', () => {
      const data = 'Hello, World!';
      
      const hashed = hash(data);
      
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce consistent hash for same input', () => {
      const data = 'Same data';
      
      const hash1 = hash(data);
      const hash2 = hash(data);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const data1 = 'Data 1';
      const data2 = 'Data 2';
      
      const hash1 = hash(data1);
      const hash2 = hash(data2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty string', () => {
      const data = '';
      
      const hashed = hash(data);
      
      expect(hashed).toBeDefined();
      expect(hashed.length).toBe(64);
    });

    it('should produce hex output', () => {
      const data = 'Test';
      
      const hashed = hash(data);
      
      const hexRegex = /^[0-9a-f]+$/;
      expect(hashed).toMatch(hexRegex);
    });

    it('should hash special characters', () => {
      const data = 'émojis 🎉 unicode: 日本語';
      
      const hashed = hash(data);
      
      expect(hashed).toBeDefined();
      expect(hashed.length).toBe(64);
    });

    it('should be sensitive to small changes (avalanche effect)', () => {
      const data1 = 'Hello';
      const data2 = 'hello'; // Only case difference
      
      const hash1 = hash(data1);
      const hash2 = hash(data2);
      
      expect(hash1).not.toBe(hash2);
      
      // Count differing characters (should be many due to avalanche effect)
      let differences = 0;
      for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) differences++;
      }
      expect(differences).toBeGreaterThan(30); // Most chars should differ
    });
  });

  describe('End-to-End Encryption Flow', () => {
    it('should handle complete encrypt-decrypt cycle', () => {
      const originalData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-123-4567',
      };
      
      const password = generateSecureKey();
      const jsonData = JSON.stringify(originalData);
      
      const encrypted = encrypt(jsonData, password);
      const decrypted = decrypt(encrypted, password);
      const restored = JSON.parse(decrypted);
      
      expect(restored).toEqual(originalData);
    });

    it('should handle multiple encryption operations', () => {
      const password = generateSecureKey();
      const items = ['item1', 'item2', 'item3', 'item4', 'item5'];
      
      const encryptedItems = items.map(item => encrypt(item, password));
      const decryptedItems = encryptedItems.map(enc => decrypt(enc, password));
      
      expect(decryptedItems).toEqual(items);
    });

    it('should work with very long passwords', () => {
      const plaintext = 'Test data';
      const longPassword = 'p'.repeat(1000);
      
      const encrypted = encrypt(plaintext, longPassword);
      const decrypted = decrypt(encrypted, longPassword);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should work with unicode passwords', () => {
      const plaintext = 'Test data';
      const unicodePassword = '密码🔐パスワード';
      
      const encrypted = encrypt(plaintext, unicodePassword);
      const decrypted = decrypt(encrypted, unicodePassword);
      
      expect(decrypted).toBe(plaintext);
    });
  });
});

