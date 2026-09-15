// const THAFHEEM_API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://thafheem.net/thafheem-api';

// class BookmarkService {
//   // Provide a persistent guest id for unauthenticated users
//   static getGuestUserId() {
//     try {
//       const key = 'thafheem_guest_user_id';
//       let guestId = localStorage.getItem(key);
//       if (!guestId) {
//         guestId = `guest_${Math.random().toString(36).slice(2)}_${Date.now()}`;
//         localStorage.setItem(key, guestId);
//       }
//       return guestId;
//     } catch (_) {
//       // In environments without localStorage, fallback to a constant id
//       return 'guest_user';
//     }
//   }

//   static getEffectiveUserId(user) {
//     return user?.uid || this.getGuestUserId();
//   }
//   // Fallback to localStorage if API is not available
//   static getLocalStorageKey(userId) {
//     return `bookmarks_${userId}`;
//   }

//   static getLocalBookmarks(userId) {
//     try {
//       const stored = localStorage.getItem(this.getLocalStorageKey(userId));
//       return stored ? JSON.parse(stored) : [];
//     } catch (error) {
//       console.error('Error reading local bookmarks:', error);
//       return [];
//     }
//   }

//   static saveLocalBookmarks(userId, bookmarks) {
//     try {
//       localStorage.setItem(this.getLocalStorageKey(userId), JSON.stringify(bookmarks));
//     } catch (error) {
//       console.error('Error saving local bookmarks:', error);
//     }
//   }

//   // Get user bookmarks
//   static async getBookmarks(userId, bookmarkType = 'translation') {
//     try {
//       const response = await fetch(`${THAFHEEM_API_BASE}/bookmarks?userId=${userId}&bkType=${bookmarkType}`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });

//       if (!response.ok) {
//         // Fallback to localStorage if API fails
//         // Filter local bookmarks by type when using fallback
//         const all = this.getLocalBookmarks(userId);
//         return Array.isArray(all)
//           ? all.filter(b => (bookmarkType ? b.bookmarkType === bookmarkType : true))
//           : [];
//       }

//       const data = await response.json();
      
//       // Handle different response formats
//       if (Array.isArray(data)) {
//         return data;
//       } else if (data.bookmarks && Array.isArray(data.bookmarks)) {
//         return data.bookmarks;
//       } else if (data.data && Array.isArray(data.data)) {
//         return data.data;
//       }
      
//       return [];
//     } catch (error) {
//       console.error('Error fetching bookmarks, using localStorage fallback:', error);
//       // Fallback to localStorage (filtered by type)
//       const all = this.getLocalBookmarks(userId);
//       return Array.isArray(all)
//         ? all.filter(b => (bookmarkType ? b.bookmarkType === bookmarkType : true))
//         : [];
//     }
//   }

//   // Add bookmark
//   static async addBookmark(userId, surahId, verseId, bookmarkType = 'translation', surahName = '', verseText = '') {
//     const bookmarkData = {
//       id: `${userId}_${surahId}_${verseId}_${Date.now()}`,
//       userId: userId,
//       surahId: parseInt(surahId),
//       verseId: parseInt(verseId),
//       bookmarkType: bookmarkType,
//       surahName: surahName,
//       verseText: verseText,
//       createdAt: new Date().toISOString()
//     };

//     try {
//       const response = await fetch(`${THAFHEEM_API_BASE}/bookmarks`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(bookmarkData),
//       });

//       if (!response.ok) {
//         // Fallback to localStorage
//         const localBookmarks = this.getLocalBookmarks(userId);
//         localBookmarks.push(bookmarkData);
//         this.saveLocalBookmarks(userId, localBookmarks);
//         return bookmarkData;
//       }

//       const data = await response.json();
//       return data;
//     } catch (error) {
//       console.error('Error adding bookmark, using localStorage fallback:', error);
//       // Fallback to localStorage
//       const localBookmarks = this.getLocalBookmarks(userId);
//       localBookmarks.push(bookmarkData);
//       this.saveLocalBookmarks(userId, localBookmarks);
//       return bookmarkData;
//     }
//   }

//   // Add an Ayah-wise interpretation bookmark
//   static async addAyahInterpretationBookmark(userId, surahId, verseId, surahName, verseText = '') {
//     try {
//       const bookmarkData = {
//         userId,
//         surahId,
//         verseId,
//         surahName,
//         verseText,
//         type: 'interpretation',
//         timestamp: new Date().toISOString()
//       };
  
//       // Try API first (without Content-Type header to avoid CORS issue)
//       const response = await fetch(`${API_BASE_URL}/bookmarks`, {
//         method: 'POST',
//         body: JSON.stringify(bookmarkData)
//       });
  
//       if (!response.ok) {
//         throw new Error('API bookmark failed');
//       }
  
//       return await response.json();
//     } catch (error) {
//       console.warn('API bookmark failed, using local storage:', error);
//       // Fallback to local storage
//       return this.addLocalBookmark(userId, {
//         ...bookmarkData,
//         id: `local-${Date.now()}`
//       });
//     }
//   }

//   // Add a block bookmark (single record representing a range)
//   static async addBlockBookmark(userId, surahId, fromAyah, toAyah, surahName = '') {
//     const bookmarkData = {
//       id: `${userId}_${surahId}_${fromAyah}_${toAyah}_${Date.now()}`,
//       userId: userId,
//       surahId: parseInt(surahId),
//       verseId: parseInt(fromAyah),
//       bookmarkType: 'block',
//       surahName: surahName && surahName.trim() ? surahName : `Surah ${surahId}`,
//       blockFrom: parseInt(fromAyah),
//       blockTo: parseInt(toAyah),
//       createdAt: new Date().toISOString()
//     };

//     try {
//       const response = await fetch(`${THAFHEEM_API_BASE}/bookmarks`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(bookmarkData),
//       });

//       if (!response.ok) {
//         // Fallback to localStorage
//         const localBookmarks = this.getLocalBookmarks(userId);
//         localBookmarks.push(bookmarkData);
//         this.saveLocalBookmarks(userId, localBookmarks);
//         return bookmarkData;
//       }

//       const data = await response.json();
//       return data;
//     } catch (error) {
//       console.error('Error adding block bookmark, using localStorage fallback:', error);
//       const localBookmarks = this.getLocalBookmarks(userId);
//       localBookmarks.push(bookmarkData);
//       this.saveLocalBookmarks(userId, localBookmarks);
//       return bookmarkData;
//     }
//   }

//   // Delete bookmark
//   static async deleteBookmark(bookmarkId, userId = null) {
//     try {
//       const response = await fetch(`${THAFHEEM_API_BASE}/bookmarks/delete/${bookmarkId}`, {
//         method: 'DELETE',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });

//       if (!response.ok) {
//         // Fallback to localStorage
//         if (userId) {
//           const localBookmarks = this.getLocalBookmarks(userId);
//           const filteredBookmarks = localBookmarks.filter(bookmark => bookmark.id !== bookmarkId);
//           this.saveLocalBookmarks(userId, filteredBookmarks);
//         }
//         return { success: true };
//       }

//       return { success: true };
//     } catch (error) {
//       console.error('Error deleting bookmark, using localStorage fallback:', error);
//       // Fallback to localStorage
//       if (userId) {
//         const localBookmarks = this.getLocalBookmarks(userId);
//         const filteredBookmarks = localBookmarks.filter(bookmark => bookmark.id !== bookmarkId);
//         this.saveLocalBookmarks(userId, filteredBookmarks);
//       }
//       return { success: true };
//     }
//   }

//   // Check if verse is bookmarked
//   static async isBookmarked(userId, surahId, verseId, bookmarkType = 'translation') {
//     try {
//       const bookmarks = await this.getBookmarks(userId, bookmarkType);
//       return bookmarks.some(bookmark => 
//         bookmark.surahId === parseInt(surahId) && bookmark.verseId === parseInt(verseId)
//       );
//     } catch (error) {
//       console.error('Error checking bookmark status:', error);
//       return false;
//     }
//   }
// }

// export default BookmarkService;

// Removed USE_API - all services now use API only

// Use new Thafheem API for bookmarks (no more legacy dependency)
const BOOKMARK_API_BASE = import.meta.env.DEV
  ? '/api/bookmarks'
  : `${import.meta.env.VITE_API_BASE_URL || 'https://thafheemapi.thafheem.net'}/api`;

// Normalise language codes — ThemeContext uses 'E' for English; backend expects 'en'.
const LANG_NORMALIZE = { E: 'en', english: 'en', malayalam: 'mal', ml: 'mal',
  bangla: 'bn', bengali: 'bn', hindi: 'hi', tamil: 'ta', urdu: 'ur' };
const normalizeLang = (lang) => {
  if (!lang) return null;
  return LANG_NORMALIZE[lang] || LANG_NORMALIZE[lang.toLowerCase()] || lang;
};

class BookmarkService {
  // Provide a persistent guest id for unauthenticated users
  static getGuestUserId() {
    try {
      const key = 'thafheem_guest_user_id';
      let guestId = localStorage.getItem(key);
      if (!guestId) {
        guestId = `guest_${Math.random().toString(36).slice(2)}_${Date.now()}`;
        localStorage.setItem(key, guestId);
      }
      return guestId;
    } catch (_) {
      return 'guest_user';
    }
  }

  static getEffectiveUserId(user) {
    return user?.uid || this.getGuestUserId();
  }

  static getLocalStorageKey(userId) {
    return `bookmarks_${userId}`;
  }

  static getLocalBookmarks(userId) {
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading local bookmarks:', error);
      return [];
    }
  }

  static saveLocalBookmarks(userId, bookmarks) {
    try {
      localStorage.setItem(this.getLocalStorageKey(userId), JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Error saving local bookmarks:', error);
    }
  }

  // Get user bookmarks
  static async getBookmarks(userId, bookmarkType = 'translation') {
    try {
      const response = await fetch(`${BOOKMARK_API_BASE}/bookmarks?userId=${userId}&bkType=${bookmarkType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Silently fall back to localStorage for expected errors (404, 401) in development
        const all = this.getLocalBookmarks(userId);
        return Array.isArray(all)
          ? all.filter(b => (bookmarkType ? b.bookmarkType === bookmarkType : true))
          : [];
      }

      const data = await response.json();
      
      const normalize = (list) => list.map(b => ({ ...b, language: normalizeLang(b.language) }));

      if (Array.isArray(data)) {
        return normalize(data);
      } else if (data.bookmarks && Array.isArray(data.bookmarks)) {
        return normalize(data.bookmarks);
      } else if (data.data && Array.isArray(data.data)) {
        return normalize(data.data);
      }
      
      return [];
    } catch (error) {
      // Only log unexpected errors (not network errors in development)
      if (import.meta.env.PROD || (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError'))) {
        console.error('Error fetching bookmarks, using localStorage fallback:', error);
      }
      const all = this.getLocalBookmarks(userId);
      return Array.isArray(all)
        ? all.filter(b => (bookmarkType ? b.bookmarkType === bookmarkType : true))
        : [];
    }
  }

  // Add bookmark
  static async addBookmark(userId, surahId, verseId, bookmarkType = 'translation', surahName = '', verseText = '', language = 'en') {
    const bookmarkData = {
      id: `${userId}_${surahId}_${verseId}_${Date.now()}`,
      userId: userId,
      surahId: parseInt(surahId),
      verseId: parseInt(verseId),
      bookmarkType: bookmarkType,
      surahName: surahName,
      verseText: verseText,
      language: normalizeLang(language),
      createdAt: new Date().toISOString()
    };

    // Write to localStorage immediately as a local cache
    const localBookmarks = this.getLocalBookmarks(userId);
    localBookmarks.push(bookmarkData);
    this.saveLocalBookmarks(userId, localBookmarks);

    try {
      const response = await fetch(`${BOOKMARK_API_BASE}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookmarkData),
      });

      if (!response.ok) {
        return bookmarkData; // localStorage already updated above
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding bookmark, using localStorage fallback:', error);
      return bookmarkData; // localStorage already updated above
    }
  }

  // Add an Ayah-wise interpretation bookmark
  static async addAyahInterpretationBookmark(userId, surahId, verseId, surahName, verseText = '') {
    // Define bookmarkData OUTSIDE the try block so it's accessible in catch
    const bookmarkData = {
      id: `${userId}_${surahId}_${verseId}_interpretation_${Date.now()}`,
      userId,
      surahId: parseInt(surahId),
      verseId: parseInt(verseId),
      surahName,
      verseText,
      bookmarkType: 'interpretation',
      createdAt: new Date().toISOString()
    };

    try {
      // Try API first (without Content-Type header to avoid CORS issue)
      const response = await fetch(`${BOOKMARK_API_BASE}/bookmarks`, {
        method: 'POST',
        body: JSON.stringify(bookmarkData)
      });

      if (!response.ok) {
        throw new Error('API bookmark failed');
      }

      return await response.json();
    } catch (error) {
      console.warn('API bookmark failed, using local storage:', error);
      // Fallback to local storage
      const localBookmarks = this.getLocalBookmarks(userId);
      localBookmarks.push(bookmarkData);
      this.saveLocalBookmarks(userId, localBookmarks);
      return bookmarkData;
    }
  }

  // Add a block-wise interpretation bookmark
  static async addBlockInterpretationBookmark(userId, surahId, range, surahName, interpretationNo = 1, language = 'en') {
    const bookmarkData = {
      id: `${userId}_${surahId}_${range}_block_${Date.now()}`,
      userId,
      surahId: parseInt(surahId),
      range,
      surahName,
      bookmarkType: 'block-interpretation',
      interpretationNo,
      language,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${BOOKMARK_API_BASE}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookmarkData)
      });

      if (!response.ok) {
        // Fallback to localStorage if API fails (401, 403, etc.)
        const localBookmarks = this.getLocalBookmarks(userId);
        localBookmarks.push(bookmarkData);
        this.saveLocalBookmarks(userId, localBookmarks);
        return bookmarkData;
      }

      return await response.json();
    } catch (error) {
      console.warn('API bookmark failed, using local storage:', error);
      // Fallback to local storage
      const localBookmarks = this.getLocalBookmarks(userId);
      localBookmarks.push(bookmarkData);
      this.saveLocalBookmarks(userId, localBookmarks);
      return bookmarkData;
    }
  }

  // Add a block bookmark (single record representing a range)
  static async addBlockBookmark(userId, surahId, fromAyah, toAyah, surahName = '') {
    const bookmarkData = {
      id: `${userId}_${surahId}_${fromAyah}_${toAyah}_${Date.now()}`,
      userId: userId,
      surahId: parseInt(surahId),
      verseId: parseInt(fromAyah),
      bookmarkType: 'block',
      surahName: surahName && surahName.trim() ? surahName : `Surah ${surahId}`,
      blockFrom: parseInt(fromAyah),
      blockTo: parseInt(toAyah),
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${BOOKMARK_API_BASE}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookmarkData),
      });

      if (!response.ok) {
        const localBookmarks = this.getLocalBookmarks(userId);
        localBookmarks.push(bookmarkData);
        this.saveLocalBookmarks(userId, localBookmarks);
        return bookmarkData;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding block bookmark, using localStorage fallback:', error);
      const localBookmarks = this.getLocalBookmarks(userId);
      localBookmarks.push(bookmarkData);
      this.saveLocalBookmarks(userId, localBookmarks);
      return bookmarkData;
    }
  }

  // Delete bookmark
  static async deleteBookmark(bookmarkId, userId = null) {
    // Remove from localStorage immediately
    if (userId) {
      const localBookmarks = this.getLocalBookmarks(userId);
      this.saveLocalBookmarks(userId, localBookmarks.filter(b => b.id !== bookmarkId));
    }

    try {
      // userId is required by the API: it scopes the DELETE to the owning row so
      // a bare integer id can't be used to remove someone else's bookmark.
      const url = `${BOOKMARK_API_BASE}/bookmarks/delete/${bookmarkId}`
        + (userId ? `?userId=${encodeURIComponent(userId)}` : '');

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // localStorage is already updated, so the UI stays correct on this
        // device; log it so a server-side delete that silently stops working
        // is visible instead of looking like success.
        console.warn(`Bookmark delete rejected by API (${response.status}); kept local removal only.`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting bookmark, using localStorage fallback:', error);
      return { success: true }; // localStorage already updated above
    }
  }

  // Check if verse is bookmarked in a specific language
  static async isBookmarked(userId, surahId, verseId, bookmarkType = 'translation', language = null) {
    try {
      const bookmarks = await this.getBookmarks(userId, bookmarkType);
      return bookmarks.some(bookmark => {
        const surahMatch = bookmark.surahId === parseInt(surahId);
        const verseMatch = bookmark.verseId === parseInt(verseId);
        const langMatch = !language || normalizeLang(bookmark.language) === normalizeLang(language);
        return surahMatch && verseMatch && langMatch;
      });
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }

  // Get favorite surahs/chapters
  static async getFavoriteSurahs(userId) {
    try {
      const response = await fetch(`${BOOKMARK_API_BASE}/favorites?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Silently fall back to localStorage for expected errors (404, 401) in development
        return this.getLocalFavoriteSurahs(userId);
      }

      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      // Keep localStorage in sync so fallback reads are always warm
      this.saveLocalFavoriteSurahs(userId, list);
      return list;
    } catch (error) {
      // Only log unexpected errors (not network errors in development)
      if (import.meta.env.PROD || (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError'))) {
        console.error('Error fetching favorites, using localStorage fallback:', error);
      }
      return this.getLocalFavoriteSurahs(userId);
    }
  }

  // Add favorite surah
  static async addFavoriteSurah(userId, surahId, surahName = '') {
    const favoriteData = {
      id: `${userId}_surah_${surahId}_${Date.now()}`,
      userId: userId,
      surahId: parseInt(surahId),
      surahName: surahName,
      createdAt: new Date().toISOString()
    };

    // Always write to localStorage immediately as a local cache
    this.addLocalFavoriteSurah(userId, favoriteData);

    try {
      const response = await fetch(`${BOOKMARK_API_BASE}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(favoriteData),
      });

      if (!response.ok) {
        return favoriteData; // localStorage already updated above
      }

      return await response.json();
    } catch (error) {
      // Only log unexpected errors (not network errors in development)
      if (import.meta.env.PROD || (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError'))) {
        console.error('Error adding favorite, using localStorage fallback:', error);
      }
      return favoriteData; // localStorage already updated above
    }
  }

  // Delete favorite surah
  static async deleteFavoriteSurah(userId, surahId) {
    // Always remove from localStorage immediately
    this.removeLocalFavoriteSurah(userId, surahId);

    try {
      const response = await fetch(`${BOOKMARK_API_BASE}/favorites/${userId}/${surahId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { success: true }; // localStorage already updated above
      }

      return { success: true };
    } catch (error) {
      // Only log unexpected errors (not network errors in development)
      if (import.meta.env.PROD || (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError'))) {
        console.error('Error deleting favorite, using localStorage fallback:', error);
      }
      return { success: true }; // localStorage already updated above
    }
  }

  // Check if surah is favorited
  static async isFavorited(userId, surahId) {
    try {
      const favorites = await this.getFavoriteSurahs(userId);
      return favorites.some(fav => fav.surahId === parseInt(surahId));
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  // Local storage methods for favorites
  static getLocalFavoriteSurahs(userId) {
    try {
      const stored = localStorage.getItem(`favorites_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading local favorites:', error);
      return [];
    }
  }

  static saveLocalFavoriteSurahs(userId, favorites) {
    try {
      localStorage.setItem(`favorites_${userId}`, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving local favorites:', error);
    }
  }

  static addLocalFavoriteSurah(userId, favoriteData) {
    const favorites = this.getLocalFavoriteSurahs(userId);
    favorites.push(favoriteData);
    this.saveLocalFavoriteSurahs(userId, favorites);
  }

  static removeLocalFavoriteSurah(userId, surahId) {
    const favorites = this.getLocalFavoriteSurahs(userId);
    const filtered = favorites.filter(fav => fav.surahId !== parseInt(surahId));
    this.saveLocalFavoriteSurahs(userId, filtered);
  }
}

export default BookmarkService;