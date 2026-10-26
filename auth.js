/**
 * Authentication Service Module.
 * Integrates Supabase Auth with seamless fallback to Demo Profile switching and login state.
 */

import { db } from './db.js';
import { CONFIG } from './config.js';
import { INITIAL_PROFILES } from './mockData.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.initAuth();
  }

  async initAuth() {
    const isExplicitlyLoggedOut = localStorage.getItem('slf_logged_out') === 'true';

    if (db.isLive && db.supabase) {
      try {
        const { data: { session } } = await db.supabase.auth.getSession();
        if (session?.user && !isExplicitlyLoggedOut) {
          await this.loadSupabaseProfile(session.user);
          return;
        }

        db.supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user && localStorage.getItem('slf_logged_out') !== 'true') {
            await this.loadSupabaseProfile(session.user);
          } else {
            this.currentUser = null;
            this.notify();
          }
        });
      } catch (err) {
        console.warn('[Auth] Supabase auth check error:', err);
      }
    }

    if (isExplicitlyLoggedOut) {
      this.currentUser = null;
      this.notify();
      return;
    }

    // Default to Alice Chen in demo mode for instant interactivity
    const savedDemoUser = localStorage.getItem('slf_current_demo_user');
    const profiles = JSON.parse(localStorage.getItem('slf_profiles') || JSON.stringify(INITIAL_PROFILES));
    this.currentUser = profiles.find(p => p.id === savedDemoUser) || profiles[0];
    localStorage.setItem('slf_current_demo_user', this.currentUser.id);
    this.notify();
  }

  async loadSupabaseProfile(user) {
    try {
      const { data, error } = await db.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        this.currentUser = { ...user, ...data };
      } else {
        this.currentUser = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`
        };
      }
    } catch {
      this.currentUser = { id: user.id, email: user.email, full_name: user.email };
    }
    this.notify();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  onAuthChange(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  }

  notify() {
    for (const cb of this.listeners) {
      try {
        cb(this.currentUser);
      } catch (err) {
        console.error('[Auth] Error in auth listener callback:', err);
      }
    }
  }

  async signIn(email, password) {
    localStorage.removeItem('slf_logged_out');

    if (db.isLive && db.supabase) {
      const { data, error } = await db.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await this.loadSupabaseProfile(data.user);
      return data.user;
    }

    // Demo Mode sign-in check
    const profiles = JSON.parse(localStorage.getItem('slf_profiles') || JSON.stringify(INITIAL_PROFILES));
    const matched = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      this.currentUser = matched;
      localStorage.setItem('slf_current_demo_user', matched.id);
      this.notify();
      return matched;
    }

    // Auto-create demo profile if not found
    const newProfile = {
      id: 'usr_' + Date.now(),
      full_name: email.split('@')[0],
      email: email,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`
    };
    profiles.push(newProfile);
    localStorage.setItem('slf_profiles', JSON.stringify(profiles));
    this.currentUser = newProfile;
    localStorage.setItem('slf_current_demo_user', newProfile.id);
    this.notify();
    return newProfile;
  }

  async signUp(email, password, fullName, phone = '') {
    localStorage.removeItem('slf_logged_out');

    if (db.isLive && db.supabase) {
      const { data, error } = await db.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone }
        }
      });
      if (error) throw error;
      return data.user;
    }

    // Demo Mode sign-up
    const profiles = JSON.parse(localStorage.getItem('slf_profiles') || JSON.stringify(INITIAL_PROFILES));
    const newProfile = {
      id: 'usr_' + Date.now(),
      full_name: fullName || email.split('@')[0],
      email: email,
      phone: phone || '+1 (555) 000-0000',
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${fullName || email}`
    };
    profiles.push(newProfile);
    localStorage.setItem('slf_profiles', JSON.stringify(profiles));
    this.currentUser = newProfile;
    localStorage.setItem('slf_current_demo_user', newProfile.id);
    this.notify();
    return newProfile;
  }

  async signOut() {
    localStorage.setItem('slf_logged_out', 'true');
    localStorage.removeItem('slf_current_demo_user');
    
    if (db.isLive && db.supabase) {
      try {
        await db.supabase.auth.signOut();
      } catch (err) {
        console.warn('[Auth] Supabase signOut error:', err);
      }
    }
    this.currentUser = null;
    this.notify();
  }

  switchDemoUser(userId) {
    localStorage.removeItem('slf_logged_out');
    const profiles = JSON.parse(localStorage.getItem('slf_profiles') || JSON.stringify(INITIAL_PROFILES));
    const found = profiles.find(p => p.id === userId);
    if (found) {
      this.currentUser = found;
      localStorage.setItem('slf_current_demo_user', found.id);
      this.notify();
    }
  }

  loginDemoUser(userId) {
    this.switchDemoUser(userId);
  }

  getAllDemoUsers() {
    return JSON.parse(localStorage.getItem('slf_profiles') || JSON.stringify(INITIAL_PROFILES));
  }
}

export const auth = new AuthService();
