/**
 * Encryption Utility
 * Provides AES-GCM encryption for sensitive data
 */

export class Encryption {
  constructor() {
    // Derive encryption key from user's auth token or generate one
    this.key = null;
    this.keyPromise = this.initKey();
  }

  /**
   * Initialize or derive encryption key
   */
  async initKey() {
    // Try to get existing key from Chrome Storage
    const stored = await chrome.storage.local.get('encryptionKey');
    
    if (stored.encryptionKey) {
      // Import existing key
      const keyData = this.base64ToArrayBuffer(stored.encryptionKey);
      this.key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      return;
    }

    // Generate new key
    this.key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    // Export and store key
    const exportedKey = await crypto.subtle.exportKey('raw', this.key);
    const base64Key = this.arrayBufferToBase64(exportedKey);
    await chrome.storage.local.set({ encryptionKey: base64Key });
  }

  /**
   * Encrypt data
   */
  async encrypt(data) {
    // Ensure key is initialized
    if (!this.key) {
      await this.keyPromise;
    }

    // Convert data to ArrayBuffer if needed
    let dataBuffer;
    if (typeof data === 'string') {
      dataBuffer = new TextEncoder().encode(data);
    } else if (data instanceof ArrayBuffer) {
      dataBuffer = data;
    } else {
      dataBuffer = new TextEncoder().encode(JSON.stringify(data));
    }

    // Generate random IV (initialization vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.key,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Return as base64 string
    return this.arrayBufferToBase64(combined.buffer);
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData) {
    // Ensure key is initialized
    if (!this.key) {
      await this.keyPromise;
    }

    // Convert base64 to ArrayBuffer
    const combined = this.base64ToArrayBuffer(encryptedData);
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.key,
      encrypted
    );

    // Try to decode as string, fallback to ArrayBuffer
    try {
      return new TextDecoder().decode(decrypted);
    } catch {
      return decrypted;
    }
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

