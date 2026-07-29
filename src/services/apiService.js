// API Service
// Centralized service for making API calls to the backend
// Handles error handling and fallback logic

import { API_BASE_URL, API_BASE_PATH } from '../config/apiConfig.js';

class ApiService {
  constructor() {
    this.requestQueue = new Map(); // Prevent duplicate requests
  }

  // Make API request with deduplication
  async makeRequest(endpoint, params = {}, options = {}) {
    const cacheKey = this.generateCacheKey(endpoint, params);

    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    // Create request promise
    const requestPromise = this._makeActualRequest(endpoint, params, options);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const data = await requestPromise;
      return data;
    } finally {
      // Remove from request queue
      this.requestQueue.delete(cacheKey);
    }
  }

  // Generate cache key for API requests
  generateCacheKey(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}${paramString ? `?${paramString}` : ''}`;
  }

  // Actual API request implementation
  async _makeActualRequest(endpoint, params = {}, options = {}) {
    const basePath = API_BASE_PATH || `${API_BASE_URL}/api/v1`;
    const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${basePath}${sanitizedEndpoint}`;
    
    // Build URL with query parameters
    const url = new URL(fullUrl);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const finalUrl = url.toString();
    
    // Log in production for debugging (can be removed later)
    if (import.meta.env.PROD) {
      console.log(`[apiService] 🌐 Making request to: ${finalUrl}`);
    }

    try {
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `API request failed: ${response.status} ${response.statusText} - ${errorText}`;
        console.error(`[apiService] ❌ Request failed: ${finalUrl}`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 200), // Limit error text length
        });
        throw new Error(errorMessage);
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.warn(`[apiService] ⚠️ Non-JSON response from ${finalUrl}:`, contentType);
        // Try to parse as JSON anyway (some APIs don't set content-type correctly)
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error(`Invalid JSON response from API: ${text.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Enhanced error logging for production debugging
      if (import.meta.env.PROD) {
        console.error(`[apiService] ❌ Network/Parse error for ${finalUrl}:`, {
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
        });
      }
      throw error;
    }
  }

  // Get translation for specific ayah
  async getTranslation(language, surah, ayah) {
    return this.makeRequest(`/${language}/translation/${surah}/${ayah}`);
  }

  // Get all translations for a surah
  async getSurahTranslations(language, surah, params = {}) {
    return this.makeRequest(`/${language}/surah/${surah}`, params);
  }

  // Get interpretation/explanation for specific ayah
  async getInterpretation(language, surah, ayah, explanationNo = null) {
    // For English blockwise: use /api/english/interpretation/{surahId}/{explanationNo}
    const endpoint = (language === 'english' && explanationNo)
      ? `/${language}/interpretation/${surah}/${explanationNo}`
      : `/${language}/interpretation/${surah}/${ayah}`;
    const params = (language === 'english' && explanationNo) ? {} : (explanationNo ? { explanationNo } : {});
    return this.makeRequest(endpoint, params);
  }

  // Get word-by-word data for specific ayah
  async getWordByWord(language, surah, ayah) {
    return this.makeRequest(`/${language}/word-by-word/${surah}/${ayah}`);
  }

  // Get Urdu footnote
  async getUrduFootnote(footnoteId) {
    return this.makeRequest(`/urdu/footnote/${footnoteId}`);
  }

  // Get English footnote
  async getEnglishFootnote(footnoteId) {
    return this.makeRequest(`/english/footnote/${footnoteId}`);
  }

  // Get Malayalam footnote
  async getMalayalamFootnote(footnoteId) {
    return this.makeRequest(`/malayalam/footnote/${footnoteId}`);
  }

  // Get Arabic text
  async getArabicText(surah, ayah) {
    return this.makeRequest(`/arabic/text/${surah}/${ayah}`);
  }

  // Check language health
  async checkLanguageHealth(language) {
    return this.makeRequest(`/${language}/health`);
  }
}

// Export singleton instance
export default new ApiService();
