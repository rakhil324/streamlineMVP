/**
 * API Client
 * Handles communication with the backend API over HTTPS
 */

// Default API endpoint - should be configured based on environment
// Note: In Chrome extensions, we can't use process.env, so set this directly
// You can change this to your backend URL: 'https://your-backend-url.com/api'
const API_BASE_URL = 'http://localhost:3000/api';

export class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.authToken = null;
    this.authPromise = this.initAuth();
  }

  /**
   * Initialize authentication token
   */
  async initAuth() {
    const stored = await chrome.storage.local.get(['authToken', 'isAuthenticated']);
    if (stored.isAuthenticated && stored.authToken) {
      this.authToken = stored.authToken;
    }
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    // Ensure auth is initialized
    await this.authPromise;

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  /**
   * Get ATS field mapping
   */
  async getMapping(atsType, fields) {
    try {
      return await this.request('/mapping', {
        method: 'POST',
        body: JSON.stringify({
          atsType,
          fields: fields.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
            label: f.label,
          })),
        }),
      });
    } catch (error) {
      console.error('Failed to get mapping:', error);
      throw error;
    }
  }

  /**
   * Tailor application data for a specific job
   */
  async tailorApplication(data) {
    try {
      return await this.request('/tailor/application', {
        method: 'POST',
        body: JSON.stringify({
          profile: data.profile,
          fields: data.fields,
          jobDescription: data.jobDescription,
          atsType: data.atsType,
        }),
      });
    } catch (error) {
      console.error('Failed to tailor application:', error);
      throw error;
    }
  }

  /**
   * Log application submission
   */
  async logApplication(data) {
    try {
      return await this.request('/applications/log', {
        method: 'POST',
        body: JSON.stringify({
          url: data.url,
          atsType: data.atsType,
          company: data.company,
          position: data.position,
          submittedAt: data.submittedAt || new Date().toISOString(),
          fieldCount: data.fieldCount,
        }),
      });
    } catch (error) {
      console.error('Failed to log application:', error);
      throw error;
    }
  }

  /**
   * Sync profile data from backend
   */
  async syncProfile() {
    try {
      const response = await this.request('/profile', {
        method: 'GET',
      });
      // Return full response including authenticated status
      return response;
    } catch (error) {
      console.error('Failed to sync profile:', error);
      // Don't throw - let caller handle fallback
      throw error;
    }
  }

  /**
   * Tailor resume for a job
   */
  async tailorResume(jobDescription, jobTitle, companyName, resumeText) {
    try {
      const response = await this.request('/tailor/resume', {
        method: 'POST',
        body: JSON.stringify({
          resumeText: resumeText,
          jobDescription,
          jobTitle,
          companyName,
        }),
      });
      
      return response;
    } catch (error) {
      console.error('Failed to tailor resume:', error);
      throw error;
    }
  }

  /**
   * Upload resume file
   */
  async uploadResume(file) {
    try {
      const formData = new FormData();
      formData.append('resume', file);

      await this.initAuth();

      const headers = {};
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${this.baseURL}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload resume:', error);
      throw error;
    }
  }

  /**
   * Get tailored resume for a job
   */
  async getTailoredResume(jobId) {
    try {
      return await this.request(`/tailor/resume`, {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
    } catch (error) {
      console.error('Failed to get tailored resume:', error);
      throw error;
    }
  }

  /**
   * Get tailored cover letter for a job
   */
  async getTailoredCoverLetter(jobId) {
    try {
      return await this.request(`/tailor/cover-letter`, {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
    } catch (error) {
      console.error('Failed to get tailored cover letter:', error);
      throw error;
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
    chrome.storage.local.set({
      authToken: token,
      isAuthenticated: true,
    });
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.authToken = null;
    chrome.storage.local.set({
      authToken: null,
      isAuthenticated: false,
    });
  }
}

