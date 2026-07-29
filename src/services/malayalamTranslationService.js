// Malayalam Translation Service
// Fetches Malayalam translations from MySQL database via API

import { API_BASE_PATH } from '../config/apiConfig.js';
import apiService from './apiService.js';

class MalayalamTranslationService {
  constructor() {
    this.language = 'malayalam';
    this.apiBasePath = API_BASE_PATH;
    this.pendingRequests = new Map();
    this.cache = new Map();
    this.cacheEnabled = true;
    this.cacheTtl = 300000; // 5 minutes
  }

  generateCacheKey(method, params) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${method}${paramString ? `?${paramString}` : ''}`;
  }

  isCacheValid(timestamp) {
    return Date.now() - timestamp < this.cacheTtl;
  }

  getCachedData(cacheKey) {
    if (!this.cacheEnabled) return null;
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

  setCachedData(cacheKey, data) {
    if (!this.cacheEnabled) return;
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  async getAyahTranslation(surahId, ayahNumber) {
    const cacheKey = this.generateCacheKey('getAyahTranslation', { surahId, ayahNumber });
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this._getAyahTranslationInternal(surahId, ayahNumber, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async _getAyahTranslationInternal(surahId, ayahNumber, cacheKey) {
    try {
      const response = await apiService.getTranslation(this.language, surahId, ayahNumber);
      const translation = response?.translation_text ?? response?.translation ?? null;

      if (!translation) {
        console.warn(`⚠️ No Malayalam translation returned for ${surahId}:${ayahNumber}`);
        return null;
      }

      this.setCachedData(cacheKey, translation);
      return translation;
    } catch (error) {
      console.error(`❌ Malayalam translation API failed for ${surahId}:${ayahNumber}:`, error);
      throw error;
    }
  }

  async getSurahTranslations(surahId, options = {}) {
    const hasPagination = options && (options.page !== undefined || options.limit !== undefined);
    const page = Number.isInteger(options.page) && options.page > 0 ? options.page : 1;
    const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 40;
    const cacheKey = this.generateCacheKey('getSurahTranslations', hasPagination ? { surahId, page, limit } : { surahId });
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this._getSurahTranslationsInternal(surahId, cacheKey, { page, limit, hasPagination });
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async _getSurahTranslationsInternal(surahId, cacheKey, { page, limit, hasPagination }) {
    try {
      const params = hasPagination ? { page, limit } : {};
      const endpoint = `/malayalam/quranaya/${surahId}`;
      
      // Log request details in production for debugging
      if (import.meta.env.PROD) {
        console.log(`[MalayalamService] 🔄 Fetching translations for surah ${surahId}`, {
          endpoint,
          params,
          hasPagination,
          apiBasePath: this.apiBasePath,
        });
      }
      
      let response;
      try {
        response = await apiService.makeRequest(endpoint, params);
      } catch (apiError) {
        // Enhanced error logging for production
        console.error(`[MalayalamService] ❌ API request failed for surah ${surahId}:`, {
          endpoint,
          params,
          error: apiError.message,
          errorName: apiError.name,
          apiBasePath: this.apiBasePath,
        });
        throw apiError;
      }
      
      // Log response details in production
      if (import.meta.env.PROD) {
        console.log(`[MalayalamService] 📦 Response received for surah ${surahId}`, {
          isArray: Array.isArray(response),
          hasTranslations: !!response?.translations,
          translationsCount: Array.isArray(response?.translations) ? response.translations.length : 0,
          hasPagination: !!response?.pagination,
          responseType: typeof response,
          responsePreview: response && typeof response === 'object' ? Object.keys(response).slice(0, 5) : null,
        });
      }

      // Helper function to map rows to translation format
      const mapRowToTranslation = (row) => ({
        number: row.ayaid,
        ArabicText: row.AyaHText || '',
        Translation: row.AudioText || '',
        AudioIntrerptn: row.AudioIntrerptn || '',
        TransUrl: row.TransUrl || '',
        InterPtnUrl: row.InterPtnUrl || '',
        QAudioUrl: row.QAudioUrl || '',
        ASuraName: row.ASuraName || '',
      });

      if (hasPagination) {
        // Handle paginated response - API may return { translations: [...], pagination: {...} } or array directly
        let translations = [];
        let pagination = null;

        if (Array.isArray(response)) {
          // API returned array directly (backward compatibility or API issue)
          console.warn(`⚠️ Malayalam quranaya API returned array instead of paginated object for surah ${surahId}. Converting...`);
          translations = response.map(mapRowToTranslation);
          // Create basic pagination info since API didn't provide it
          pagination = {
            page: page,
            limit: limit,
            total: response.length,
            hasNext: response.length === limit,
            hasPrev: page > 1,
          };
        } else if (response && Array.isArray(response.translations)) {
          // Proper paginated format
          translations = response.translations.map(mapRowToTranslation);
          pagination = response.pagination || null;
        } else if (response && response.error) {
          // API returned an error
          console.error(`❌ Malayalam quranaya API error for surah ${surahId}:`, response.error, response.message);
          throw new Error(response.message || response.error || 'Failed to fetch Malayalam translations');
        } else {
          // Unexpected response format
          console.error(`❌ Unexpected response format from Malayalam quranaya API for surah ${surahId}:`, response);
          throw new Error('Unexpected response format from API');
        }

        const result = {
          translations,
          pagination,
        };
        this.setCachedData(cacheKey, result);
        return result;
      }

      // Non-paginated: response is an array of rows
      const rows = Array.isArray(response) ? response : [];
      if (rows.length === 0 && response && !Array.isArray(response)) {
        console.warn(`⚠️ Malayalam quranaya API returned non-array response for surah ${surahId}:`, response);
      }
      const translations = rows.map(mapRowToTranslation);

      this.setCachedData(cacheKey, translations);
      return translations;
    } catch (error) {
      console.error(`❌ Malayalam surah translation API failed for ${surahId}:`, error);
      throw error;
    }
  }

  async getInterpretation(surahId, ayahNumber, interpretationNo = null) {
    const cacheKey = this.generateCacheKey('getInterpretation', { surahId, ayahNumber, interpretationNo });
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this._getInterpretationInternal(surahId, ayahNumber, interpretationNo, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async _getInterpretationInternal(surahId, ayahNumber, interpretationNo, cacheKey) {
    try {
      const response = await apiService.getInterpretation(this.language, surahId, ayahNumber, interpretationNo);
      const interpretations = Array.isArray(response?.explanations) ? response.explanations : [];

      this.setCachedData(cacheKey, interpretations);
      return interpretations;
    } catch (error) {
      console.error(`❌ Malayalam interpretation API failed for ${surahId}:${ayahNumber}:`, error);
      throw error;
    }
  }

  async getWordByWordData(surahId, ayahNumber) {
    const cacheKey = this.generateCacheKey('getWordByWordData', { surahId, ayahNumber });
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this._getWordByWordDataInternal(surahId, ayahNumber, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async _getWordByWordDataInternal(surahId, ayahNumber, cacheKey) {
    try {
      const response = await apiService.getWordByWord(this.language, surahId, ayahNumber);
      const words = Array.isArray(response?.words) ? response.words : [];

      if (words.length === 0) {
        console.warn(`⚠️ No Malayalam word-by-word data for ${surahId}:${ayahNumber}`);
        return null;
      }

      const formattedWords = words.map((word, index) => ({
        id: word.WordId || word.id || index + 1,
        position: word.WordId || word.id || index + 1,
        audio_url: word.audio_url || null,
        char_type_name: word.char_type_name || 'word',
        code_v1: word.code_v1 || '',
        code_v2: word.code_v2 || '',
        line_number: word.line_number || 1,
        page_number: word.page_number || 1,
        text_uthmani: word.text_uthmani || word.WordPhrase || '',
        text_simple: word.text_simple || word.WordPhrase || '',
        translation: {
          text: word.MalMeaning || word.WordMeaning || word.translation?.text || '',
          language_name: 'Malayalam',
          resource_name: 'Thafheem Malayalam Word Database',
        },
        transliteration: {
          text: word.transliteration?.text || word.WordPhrase || '',
          language_name: 'English',
        },
      }));

      const result = {
        text_uthmani: response?.text_uthmani || '',
        words: formattedWords,
        translations: response?.translations || [],
      };

      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`❌ Malayalam word-by-word API failed for ${surahId}:${ayahNumber}:`, error);
      throw error;
    }
  }

  // Get word-by-word data with Arabic text
  async getWordByWordDataWithArabic(surahId, ayahNumber) {
    try {
      const malayalamData = await this.getWordByWordData(surahId, ayahNumber);
      if (!malayalamData) {
        console.warn(`⚠️ No Malayalam data found for ${surahId}:${ayahNumber}, falling back to English`);
        return await this.getEnglishFallback(surahId, ayahNumber);
      }

      // Fetch Arabic text from our API
      try {
        const arabicData = await apiService.getArabicText(surahId, ayahNumber);
        return {
          ...malayalamData,
          text_uthmani: arabicData.text_uthmani || malayalamData.text_uthmani,
          text_simple: arabicData.text_simple || malayalamData.text_simple
        };
      } catch (arabicError) {
        console.warn('⚠️ Could not fetch Arabic text, using Malayalam data only');
      }

      return malayalamData;
    } catch (error) {
      console.error(`❌ Error fetching Malayalam word-by-word with Arabic for ${surahId}:${ayahNumber}:`, error);
      throw error;
    }
  }

  async getEnglishFallback(surahId, ayahNumber) {
    try {
      const response = await apiService.getWordByWord('english', surahId, ayahNumber);
      const words = Array.isArray(response?.words) ? response.words : [];
      
      if (words.length === 0) {
        return null;
      }

      const formattedWords = words.map((word, index) => ({
        id: word.WordId || word.id || index + 1,
        position: word.WordId || word.id || index + 1,
        text_uthmani: word.text_uthmani || word.WordPhrase || '',
        text_simple: word.text_simple || word.WordPhrase || '',
        translation: {
          text: word.EngMeaning || word.WordMeaning || word.translation?.text || '',
          language_name: 'English',
          resource_name: 'Thafheem English Word Database',
        },
      }));

      return {
        text_uthmani: response?.text_uthmani || '',
        words: formattedWords,
        translations: response?.translations || [],
      };
    } catch (error) {
      console.error(`❌ English fallback failed for ${surahId}:${ayahNumber}:`, error);
      return null;
    }
  }

  async getFootnote(footnoteId) {
    const cacheKey = this.generateCacheKey('getFootnote', { footnoteId });
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiService.getMalayalamFootnote(footnoteId);
      const footnote = response?.footnote_text || '';
      this.setCachedData(cacheKey, footnote);
      return footnote;
    } catch (error) {
      console.error(`❌ Malayalam footnote API failed for ${footnoteId}:`, error);
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export default new MalayalamTranslationService();





