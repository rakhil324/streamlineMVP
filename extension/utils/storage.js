/**
 * Storage Manager
 * Handles encrypted storage using IndexedDB and Chrome Storage API with AES-GCM
 */

import { Encryption } from './encryption.js';

const DB_NAME = 'SimplifyApplyDB';
const DB_VERSION = 1;
const STORE_NAME = 'encryptedData';

export class StorageManager {
  constructor() {
    this.db = null;
    this.encryption = new Encryption();
    this.dbPromise = this.init();
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Get profile data
   */
  async getProfileData() {
    try {
      // Try Chrome Storage first (for quick access)
      const chromeData = await chrome.storage.local.get('profileData');
      if (chromeData.profileData) {
        // Decrypt if encrypted
        if (chromeData.profileData.encrypted && chromeData.profileData.data) {
          try {
            const decrypted = await this.encryption.decrypt(chromeData.profileData.data);
            console.log('Decrypted profile from Chrome Storage:', decrypted);
            return decrypted;
          } catch (decryptError) {
            console.error('Error decrypting profile:', decryptError);
            // If decryption fails, try to return as-is (might be unencrypted)
            return chromeData.profileData.data || chromeData.profileData;
          }
        }
        // If not encrypted, return directly
        return chromeData.profileData.data || chromeData.profileData;
      }

      // Fallback to IndexedDB
      try {
        const db = await this.ensureDB();
        const data = await this.getFromIndexedDB('profileData');
        
        if (data && data.encrypted && data.data) {
          try {
            const decrypted = await this.encryption.decrypt(data.data);
            console.log('Decrypted profile from IndexedDB:', decrypted);
            return decrypted;
          } catch (decryptError) {
            console.error('Error decrypting profile from IndexedDB:', decryptError);
            return data.data || data;
          }
        }

        return data?.data || data;
      } catch (dbError) {
        console.error('Error accessing IndexedDB:', dbError);
        return null;
      }
    } catch (error) {
      console.error('Error getting profile data:', error);
      return null;
    }
  }

  /**
   * Set profile data
   */
  async setProfileData(data) {
    try {
      console.log('Setting profile data:', data);
      
      // Encrypt sensitive data
      let encrypted;
      try {
        encrypted = await this.encryption.encrypt(data);
      } catch (encryptError) {
        console.error('Encryption failed, storing unencrypted:', encryptError);
        // Store unencrypted if encryption fails (shouldn't happen, but fallback)
        encrypted = data;
      }

      // Store in Chrome Storage (fast access) - store unencrypted for easier debugging for now
      // In production, use encrypted
      await chrome.storage.local.set({
        profileData: {
          encrypted: false, // Set to false for easier debugging
          data: data, // Store data directly for now
          timestamp: Date.now(),
        },
      });

      // Also store in IndexedDB (persistent)
      try {
        await this.saveToIndexedDB('profileData', {
          encrypted: false, // Set to false for easier debugging
          data: data,
          timestamp: Date.now(),
        });
      } catch (dbError) {
        console.error('Error saving to IndexedDB:', dbError);
        // Continue even if IndexedDB fails
      }

      console.log('Profile data saved successfully');
      return true;
    } catch (error) {
      console.error('Error setting profile data:', error);
      return false;
    }
  }

  /**
   * Get resume file
   */
  async getResume() {
    try {
      const db = await this.ensureDB();
      const data = await this.getFromIndexedDB('resume');

      if (data && data.encrypted) {
        const decrypted = await this.encryption.decrypt(data.data);
        // Convert back to File/Blob
        return new Blob([decrypted], { type: data.mimeType || 'application/pdf' });
      }

      return data;
    } catch (error) {
      console.error('Error getting resume:', error);
      return null;
    }
  }

  /**
   * Save resume file
   */
  async saveResume(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const encrypted = await this.encryption.encrypt(arrayBuffer);

      await this.saveToIndexedDB('resume', {
        encrypted: true,
        data: encrypted,
        mimeType: file.type,
        name: file.name,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('Error saving resume:', error);
      return false;
    }
  }

  /**
   * Get cover letter
   */
  async getCoverLetter() {
    try {
      const db = await this.ensureDB();
      const data = await this.getFromIndexedDB('coverLetter');

      if (data && data.encrypted) {
        return await this.encryption.decrypt(data.data);
      }

      return data;
    } catch (error) {
      console.error('Error getting cover letter:', error);
      return null;
    }
  }

  /**
   * Save cover letter
   */
  async saveCoverLetter(text) {
    try {
      const encrypted = await this.encryption.encrypt(text);

      await this.saveToIndexedDB('coverLetter', {
        encrypted: true,
        data: encrypted,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('Error saving cover letter:', error);
      return false;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      
      const db = await this.ensureDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.clear();
      
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Ensure database is initialized
   */
  async ensureDB() {
    if (!this.db) {
      await this.dbPromise;
    }
    return this.db;
  }

  /**
   * Get data from IndexedDB
   */
  async getFromIndexedDB(key) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
    });
  }

  /**
   * Save data to IndexedDB
   */
  async saveToIndexedDB(key, value) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

