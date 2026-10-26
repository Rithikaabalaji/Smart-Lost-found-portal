/**
 * Unified Database and Storage Service Layer.
 * Manages Supabase client queries and seamlessly falls back to
 * a LocalStorage mock database when running in demo/offline mode.
 */

import { CONFIG } from './config.js';
import { INITIAL_ITEMS, INITIAL_CLAIMS, INITIAL_NOTIFICATIONS, INITIAL_PROFILES } from './mockData.js';

class DatabaseService {
  constructor() {
    this.supabase = null;
    this.isLive = false;
    this.initClient();
    this.ensureLocalStore();
  }

  /**
   * Initializes Supabase JS client if credentials are configured
   */
  initClient() {
    const url = CONFIG.getUrl();
    const key = CONFIG.getAnonKey();

    if (url && key && window.supabase && !CONFIG.isDemoMode()) {
      try {
        this.supabase = window.supabase.createClient(url, key);
        this.isLive = true;
        console.log('[Database] Connected to live Supabase backend:', url);
        return;
      } catch (err) {
        console.warn('[Database] Failed to initialize Supabase client:', err);
      }
    }
    this.isLive = false;
    console.log('[Database] Running in Demo / Offline LocalStore Mode');
  }

  /**
   * Seeds localStorage if not present
   */
  ensureLocalStore() {
    if (!localStorage.getItem('slf_items')) {
      localStorage.setItem('slf_items', JSON.stringify(INITIAL_ITEMS));
    }
    if (!localStorage.getItem('slf_claims')) {
      localStorage.setItem('slf_claims', JSON.stringify(INITIAL_CLAIMS));
    }
    if (!localStorage.getItem('slf_notifications')) {
      localStorage.setItem('slf_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    }
    if (!localStorage.getItem('slf_profiles')) {
      localStorage.setItem('slf_profiles', JSON.stringify(INITIAL_PROFILES));
    }
  }

  resetDemoStore() {
    localStorage.setItem('slf_items', JSON.stringify(INITIAL_ITEMS));
    localStorage.setItem('slf_claims', JSON.stringify(INITIAL_CLAIMS));
    localStorage.setItem('slf_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem('slf_profiles', JSON.stringify(INITIAL_PROFILES));
  }

  // --- ITEMS API ---

  async getItems(filters = {}) {
    if (this.isLive) {
      try {
        let query = this.supabase
          .from('items')
          .select('*, profiles:user_id(id, full_name, email, avatar_url, phone)')
          .order('created_at', { ascending: false });

        if (filters.type && filters.type !== 'all') {
          query = query.eq('type', filters.type);
        }
        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters.userId) {
          query = query.eq('user_id', filters.userId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('[Database] Supabase getItems error, falling back to local store:', err);
      }
    }

    // LocalStore fallback
    let items = JSON.parse(localStorage.getItem('slf_items') || '[]');
    const profiles = JSON.parse(localStorage.getItem('slf_profiles') || '[]');

    // Attach profile info
    items = items.map(item => ({
      ...item,
      profiles: profiles.find(p => p.id === item.user_id) || {
        full_name: 'Campus User',
        email: 'user@campus.edu',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      }
    }));

    if (filters.type && filters.type !== 'all') {
      items = items.filter(i => i.type === filters.type);
    }
    if (filters.category && filters.category !== 'all') {
      items = items.filter(i => i.category === filters.category);
    }
    if (filters.status && filters.status !== 'all') {
      items = items.filter(i => i.status === filters.status);
    }
    if (filters.userId) {
      items = items.filter(i => i.user_id === filters.userId);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q)
      );
    }

    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async getItemById(id) {
    if (this.isLive) {
      try {
        const { data, error } = await this.supabase
          .from('items')
          .select('*, profiles:user_id(id, full_name, email, avatar_url, phone)')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('[Database] Supabase getItemById error:', err);
      }
    }

    const items = await this.getItems();
    return items.find(i => i.id === id) || null;
  }

  async createItem(itemData) {
    if (this.isLive) {
      try {
        const { data, error } = await this.supabase
          .from('items')
          .insert([itemData])
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database] Failed to insert item in Supabase:', err);
        throw err;
      }
    }

    const items = JSON.parse(localStorage.getItem('slf_items') || '[]');
    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      status: 'open',
      created_at: new Date().toISOString(),
      ...itemData
    };
    items.unshift(newItem);
    localStorage.setItem('slf_items', JSON.stringify(items));
    return newItem;
  }

  async updateItem(id, updates) {
    if (this.isLive) {
      try {
        const { data, error } = await this.supabase
          .from('items')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database] Failed to update item:', err);
        throw err;
      }
    }

    const items = JSON.parse(localStorage.getItem('slf_items') || '[]');
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('slf_items', JSON.stringify(items));
      return items[idx];
    }
    return null;
  }

  async deleteItem(id) {
    if (this.isLive) {
      try {
        const { error } = await this.supabase.from('items').delete().eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('[Database] Failed to delete item:', err);
        throw err;
      }
    }

    let items = JSON.parse(localStorage.getItem('slf_items') || '[]');
    items = items.filter(i => i.id !== id);
    localStorage.setItem('slf_items', JSON.stringify(items));
    return true;
  }

  // --- CLAIMS API ---

  async getClaims(filters = {}) {
    if (this.isLive) {
      try {
        let query = this.supabase
          .from('claims')
          .select(`
            *,
            items:item_id (id, title, category, type, location, image_url, status, user_id),
            claimant:claimant_id (id, full_name, email, avatar_url, phone)
          `)
          .order('created_at', { ascending: false });

        if (filters.claimantId) {
          query = query.eq('claimant_id', filters.claimantId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('[Database] Supabase getClaims error:', err);
      }
    }

    let claims = JSON.parse(localStorage.getItem('slf_claims') || '[]');
    const items = JSON.parse(localStorage.getItem('slf_items') || '[]');
    const profiles = JSON.parse(localStorage.getItem('slf_profiles') || '[]');

    claims = claims.map(c => ({
      ...c,
      items: items.find(i => i.id === c.item_id) || null,
      claimant: profiles.find(p => p.id === c.claimant_id) || { full_name: 'Anonymous' }
    }));

    if (filters.claimantId) {
      claims = claims.filter(c => c.claimant_id === filters.claimantId);
    }
    if (filters.ownerId) {
      claims = claims.filter(c => c.items && c.items.user_id === filters.ownerId);
    }

    return claims.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async createClaim({ itemId, claimantId, message }) {
    if (this.isLive) {
      try {
        const { data, error } = await this.supabase
          .from('claims')
          .insert([{ item_id: itemId, claimant_id: claimantId, message, status: 'pending' }])
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database] Failed to create claim in Supabase:', err);
        throw err;
      }
    }

    const claims = JSON.parse(localStorage.getItem('slf_claims') || '[]');
    const newClaim = {
      id: 'claim_' + Date.now(),
      item_id: itemId,
      claimant_id: claimantId,
      message,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    claims.unshift(newClaim);
    localStorage.setItem('slf_claims', JSON.stringify(claims));

    // Update item status to pending_claim
    await this.updateItem(itemId, { status: 'pending_claim' });

    // Send notification to item owner
    const item = await this.getItemById(itemId);
    const profiles = JSON.parse(localStorage.getItem('slf_profiles') || '[]');
    const claimant = profiles.find(p => p.id === claimantId);

    if (item) {
      await this.createNotification({
        userId: item.user_id,
        message: `${claimant?.full_name || 'A user'} submitted a claim on: "${item.title}"`,
        linkUrl: '#claims'
      });
    }

    return newClaim;
  }

  async updateClaimStatus(claimId, status) {
    if (this.isLive) {
      try {
        const { data, error } = await this.supabase
          .from('claims')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', claimId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database] Failed to update claim status:', err);
        throw err;
      }
    }

    const claims = JSON.parse(localStorage.getItem('slf_claims') || '[]');
    const idx = claims.findIndex(c => c.id === claimId);
    if (idx !== -1) {
      claims[idx].status = status;
      claims[idx].updated_at = new Date().toISOString();
      localStorage.setItem('slf_claims', JSON.stringify(claims));

      const claim = claims[idx];
      const item = await this.getItemById(claim.item_id);

      // If approved, mark item as resolved
      if (status === 'approved' && item) {
        await this.updateItem(item.id, { status: 'resolved' });
      }

      // Notify the claimant
      if (item) {
        await this.createNotification({
          userId: claim.claimant_id,
          message: `Your claim on "${item.title}" was ${status.toUpperCase()} by the finder.`,
          linkUrl: '#claims'
        });
      }

      return claims[idx];
    }
    return null;
  }

  // --- NOTIFICATIONS API ---

  async getNotifications(userId) {
    if (this.isLive) {
      try {
        const { data, error } = await this.supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('[Database] Supabase getNotifications error:', err);
      }
    }

    const notifs = JSON.parse(localStorage.getItem('slf_notifications') || '[]');
    return notifs
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async createNotification({ userId, message, linkUrl = '#claims' }) {
    if (this.isLive) {
      try {
        const { data, error } = await this.supabase
          .from('notifications')
          .insert([{ user_id: userId, message, link_url: linkUrl, read_at: null }])
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('[Database] Failed to create notification:', err);
      }
    }

    const notifs = JSON.parse(localStorage.getItem('slf_notifications') || '[]');
    const newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      user_id: userId,
      message,
      read_at: null,
      link_url: linkUrl,
      created_at: new Date().toISOString()
    };
    notifs.unshift(newNotif);
    localStorage.setItem('slf_notifications', JSON.stringify(notifs));
    return newNotif;
  }

  async markNotificationRead(id) {
    if (this.isLive) {
      try {
        await this.supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', id);
        return true;
      } catch (err) {
        console.error('[Database] Failed to mark notification read:', err);
      }
    }

    const notifs = JSON.parse(localStorage.getItem('slf_notifications') || '[]');
    const n = notifs.find(item => item.id === id);
    if (n) {
      n.read_at = new Date().toISOString();
      localStorage.setItem('slf_notifications', JSON.stringify(notifs));
    }
    return true;
  }

  async markAllNotificationsRead(userId) {
    if (this.isLive) {
      try {
        await this.supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('read_at', null);
        return true;
      } catch (err) {
        console.error('[Database] Failed to mark all notifications read:', err);
      }
    }

    const notifs = JSON.parse(localStorage.getItem('slf_notifications') || '[]');
    notifs.forEach(n => {
      if (n.user_id === userId && !n.read_at) {
        n.read_at = new Date().toISOString();
      }
    });
    localStorage.setItem('slf_notifications', JSON.stringify(notifs));
    return true;
  }

  // --- STORAGE / IMAGE UPLOADS ---

  async uploadImage(file) {
    if (!file) return null;

    if (this.isLive) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `items/${fileName}`;

        const { error: uploadError } = await this.supabase.storage
          .from('lost-found-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = this.supabase.storage
          .from('lost-found-images')
          .getPublicUrl(filePath);

        return data.publicUrl;
      } catch (err) {
        console.warn('[Database] Storage upload failed on Supabase, falling back to base64 DataURL:', err);
      }
    }

    // Fallback: Read as base64 DataURL for Demo / Offline mode
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
}

export const db = new DatabaseService();
