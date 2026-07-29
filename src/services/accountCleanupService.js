const THAFHEEM_API_BASE = import.meta.env.DEV
  ? '/api/thafheem'
  : (import.meta.env.VITE_API_BASE_URL || 'https://thafheem.net/thafheem-api');

const buildCleanupEndpoints = (uid) => [
  `${THAFHEEM_API_BASE}/users/${encodeURIComponent(uid)}/data`
];

class AccountCleanupService {
  static clearLocalUserData(userId) {
    if (!userId) {
      return;
    }

    try {
      const removablePrefixes = ['bookmarks_', 'favorites_', 'reading_progress_'];
      const removableKeys = [];

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) {
          continue;
        }

        const hasUserSuffix = key.endsWith(userId);
        const hasKnownPrefix = removablePrefixes.some((prefix) => key.startsWith(prefix));

        if (hasUserSuffix || (hasKnownPrefix && key.includes(userId))) {
          removableKeys.push(key);
        }
      }

      removableKeys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error while clearing local user data:', error);
    }
  }

  static async cleanupRemoteUserData(userId, idToken) {
    const endpoints = buildCleanupEndpoints(userId);
    let remoteAttempts = 0;
    let remoteSuccesses = 0;

    await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        remoteAttempts += 1;
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
          }
        });

        if (response.ok) {
          remoteSuccesses += 1;
        }
      })
    );

    return { remoteAttempts, remoteSuccesses };
  }

  static async cleanupDeletedAccountData(userId, idToken) {
    if (!userId) {
      return { success: false, reason: 'missing_user_id' };
    }

    this.clearLocalUserData(userId);

    try {
      const { remoteAttempts, remoteSuccesses } = await this.cleanupRemoteUserData(userId, idToken);

      return {
        success: true,
        remoteAttempts,
        remoteSuccesses,
        partial: remoteAttempts > 0 && remoteSuccesses === 0
      };
    } catch (error) {
      console.error('Remote cleanup failed after account deletion:', error);
      return {
        success: true,
        remoteAttempts: 0,
        remoteSuccesses: 0,
        partial: true,
        error: error.message
      };
    }
  }
}

export default AccountCleanupService;
