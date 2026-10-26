/**
 * Configuration for Supabase Backend and App Defaults.
 * Allows runtime configuration via localStorage (UI settings modal)
 * or static credentials for deployment.
 */

const STORAGE_KEY_URL = 'smart_lost_found_supabase_url';
const STORAGE_KEY_KEY = 'smart_lost_found_supabase_key';
const STORAGE_KEY_DEMO = 'smart_lost_found_force_demo';

export const CONFIG = {
  // Hardcode credentials here for fixed deployment if preferred
  defaultUrl: '',
  defaultAnonKey: '',

  getUrl() {
    return localStorage.getItem(STORAGE_KEY_URL) || this.defaultUrl || '';
  },

  getAnonKey() {
    return localStorage.getItem(STORAGE_KEY_KEY) || this.defaultAnonKey || '';
  },

  isDemoMode() {
    const forced = localStorage.getItem(STORAGE_KEY_DEMO);
    if (forced !== null) return forced === 'true';
    // If no valid URL or Key is provided, automatically fall back to demo mode
    return !this.getUrl() || !this.getAnonKey();
  },

  saveCredentials(url, key) {
    if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
    else localStorage.removeItem(STORAGE_KEY_URL);

    if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    else localStorage.removeItem(STORAGE_KEY_KEY);
  },

  setDemoMode(isDemo) {
    localStorage.setItem(STORAGE_KEY_DEMO, String(isDemo));
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    localStorage.removeItem(STORAGE_KEY_DEMO);
  }
};
