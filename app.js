/**
 * Main Application Orchestrator & Event Controller.
 */

import { db } from './db.js';
import { auth } from './auth.js';
import { CONFIG } from './config.js';
import { 
  findMatchesFor, 
  findAllPairMatches 
} from './matching.js';
import { 
  renderItemCard, 
  renderSmartMatchCard, 
  renderClaimCard, 
  openModal, 
  closeModal, 
  showToast, 
  timeAgo, 
  escapeHtml 
} from './ui.js';

class App {
  constructor() {
    this.currentTab = 'all';
    this.allItems = [];
    this.currentClaimTargetItemId = null;
    this.selectedImageFile = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupAuthObserver();
    await this.refreshAll();
  }

  setupAuthObserver() {
    auth.onAuthChange(async (user) => {
      this.updateUserNavUI(user);
      await this.refreshNotifications();
      if (this.currentTab === 'claims' || this.currentTab === 'my-items') {
        await this.renderCurrentView();
      }
    });
  }

  updateUserNavUI(user) {
    const avatarEl = document.getElementById('navUserAvatar');
    const nameEl = document.getElementById('navUserName');
    const roleEl = document.getElementById('navUserRole');
    const demoSwitcher = document.getElementById('demoUserSwitcher');
    const userMenuWrapper = document.getElementById('userMenuWrapper');
    const navLoginBtn = document.getElementById('navLoginBtn');

    if (user) {
      if (userMenuWrapper) userMenuWrapper.style.display = 'flex';
      if (navLoginBtn) navLoginBtn.style.display = 'none';

      if (avatarEl) avatarEl.src = user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email || 'User'}`;
      if (nameEl) nameEl.textContent = user.full_name || user.email || 'Campus User';
      if (roleEl) roleEl.textContent = db.isLive ? 'Supabase User' : 'Demo Account';

      if (demoSwitcher) {
        const demoUsers = auth.getAllDemoUsers();
        demoSwitcher.innerHTML = demoUsers.map(u => `
          <option value="${u.id}" ${u.id === user.id ? 'selected' : ''}>
            ${escapeHtml(u.full_name)} (${u.email})
          </option>
        `).join('');
      }
    } else {
      if (userMenuWrapper) userMenuWrapper.style.display = 'none';
      if (navLoginBtn) navLoginBtn.style.display = 'inline-flex';
    }
  }

  async refreshAll() {
    await this.loadItems();
    await this.refreshNotifications();
    this.updateStats();
  }

  async loadItems() {
    try {
      this.allItems = await db.getItems();
      await this.renderCurrentView();
    } catch (err) {
      console.error('Failed to load items:', err);
      showToast('Error loading items from store', 'error');
    }
  }

  updateStats() {
    const totalLost = this.allItems.filter(i => i.type === 'lost' && i.status !== 'resolved').length;
    const totalFound = this.allItems.filter(i => i.type === 'found' && i.status !== 'resolved').length;
    const totalResolved = this.allItems.filter(i => i.status === 'resolved').length;

    const elLost = document.getElementById('statLostCount');
    const elFound = document.getElementById('statFoundCount');
    const elResolved = document.getElementById('statResolvedCount');

    if (elLost) elLost.textContent = totalLost;
    if (elFound) elFound.textContent = totalFound;
    if (elResolved) elResolved.textContent = totalResolved;

    // Update tab badges
    const pairs = findAllPairMatches(this.allItems, 45);
    const matchBadge = document.getElementById('smartMatchesBadge');
    if (matchBadge) matchBadge.textContent = pairs.length;
  }

  async renderCurrentView() {
    const container = document.getElementById('viewContainer');
    if (!container) return;

    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    const selectedStatus = statusFilter ? statusFilter.value : 'all';

    const currentUser = auth.getCurrentUser();

    // 1. SMART MATCHES TAB
    if (this.currentTab === 'matches') {
      const pairs = findAllPairMatches(this.allItems, 45);
      if (pairs.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="sparkles"></i></div>
            <h3>No Automatic Matches Found Yet</h3>
            <p>Our smart matching algorithm monitors newly reported lost and found items. When similarities in category, text, or location are detected, they appear here.</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="smart-matches-container">
            ${pairs.map(p => renderSmartMatchCard(p)).join('')}
          </div>
        `;
      }
      this.finishRendering();
      return;
    }

    // 2. CLAIMS PORTAL TAB
    if (this.currentTab === 'claims') {
      if (!currentUser) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="shield-alert"></i></div>
            <h3>Sign in to Access the Claims Portal</h3>
            <p>You can track claims you submitted or review incoming claims on items you found.</p>
          </div>
        `;
        this.finishRendering();
        return;
      }

      const allClaims = await db.getClaims();
      const myFiledClaims = allClaims.filter(c => c.claimant_id === currentUser.id);
      const incomingClaims = allClaims.filter(c => c.items && c.items.user_id === currentUser.id);

      container.innerHTML = `
        <div class="claims-container">
          <div style="margin-bottom: 12px;">
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">Incoming Claims on Your Found Items</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Review proof submitted by owners to release their items.</p>
          </div>
          ${incomingClaims.length === 0 
            ? '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 12px; background: #fff; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">No incoming claims currently pending review.</p>'
            : incomingClaims.map(c => renderClaimCard(c, currentUser.id)).join('')}

          <div style="margin: 28px 0 12px;">
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">Claims You Submitted</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Track status updates from finders on items you reported as yours.</p>
          </div>
          ${myFiledClaims.length === 0 
            ? '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 12px; background: #fff; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">You have not filed any claims yet.</p>'
            : myFiledClaims.map(c => renderClaimCard(c, currentUser.id)).join('')}
        </div>
      `;
      this.finishRendering();
      return;
    }

    // 3. ITEMS FEEDS (All, Lost, Found, My Posts)
    let filtered = [...this.allItems];

    if (this.currentTab === 'lost') {
      filtered = filtered.filter(i => i.type === 'lost');
    } else if (this.currentTab === 'found') {
      filtered = filtered.filter(i => i.type === 'found');
    } else if (this.currentTab === 'my-items') {
      if (!currentUser) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="user"></i></div>
            <h3>Please Sign In</h3>
            <p>Log in or select a demo account above to view your reported items.</p>
          </div>
        `;
        this.finishRendering();
        return;
      }
      filtered = filtered.filter(i => i.user_id === currentUser.id);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(i => i.category === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(i => i.status === selectedStatus);
    }

    if (query) {
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query) ||
        i.location.toLowerCase().includes(query)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
          <h3>No Items Match Your Filters</h3>
          <p>Try clearing search keywords or changing category filters.</p>
        </div>
      `;
    } else {
      const cardsHtml = filtered.map(item => {
        const matches = findMatchesFor(item, this.allItems, 50);
        const topScore = matches.length > 0 ? matches[0].score : 0;
        return renderItemCard(item, matches.length, topScore);
      }).join('');

      container.innerHTML = `<div class="items-grid">${cardsHtml}</div>`;
    }

    this.finishRendering();
  }

  finishRendering() {
    if (window.lucide) window.lucide.createIcons();
    this.bindDynamicCardEvents();
  }

  bindDynamicCardEvents() {
    // Details Buttons
    document.querySelectorAll('.view-item-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.openItemDetailsModal(id);
      };
    });

    // Claim Buttons
    document.querySelectorAll('.claim-item-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.openClaimModal(id);
      };
    });

    // Approve Claim Buttons
    document.querySelectorAll('.approve-claim-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const claimId = btn.getAttribute('data-id');
        btn.disabled = true;
        try {
          await db.updateClaimStatus(claimId, 'approved');
          showToast('Claim approved and item resolved!', 'success');
          await this.refreshAll();
        } catch {
          showToast('Failed to approve claim', 'error');
          btn.disabled = false;
        }
      };
    });

    // Reject Claim Buttons
    document.querySelectorAll('.reject-claim-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const claimId = btn.getAttribute('data-id');
        btn.disabled = true;
        try {
          await db.updateClaimStatus(claimId, 'rejected');
          showToast('Claim rejected.', 'info');
          await this.refreshAll();
        } catch {
          showToast('Failed to reject claim', 'error');
          btn.disabled = false;
        }
      };
    });
  }

  async openItemDetailsModal(itemId) {
    const item = await db.getItemById(itemId);
    if (!item) return;

    const modalBody = document.getElementById('itemDetailsBody');
    const modalTitle = document.getElementById('itemDetailsTitle');
    if (!modalBody || !modalTitle) return;

    modalTitle.textContent = item.title;

    // Check matches
    const matches = findMatchesFor(item, this.allItems, 45);

    modalBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="position: relative; border-radius: var(--radius-md); overflow: hidden; max-height: 280px; background: #000;">
          <img src="${escapeHtml(item.image_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800')}" 
               style="width: 100%; height: 260px; object-fit: cover;" 
               alt="${escapeHtml(item.title)}" />
          <span class="item-type-badge ${item.type}">${item.type}</span>
          <span class="item-status-pill ${item.status}">${item.status}</span>
        </div>

        <div>
          <span class="item-category-tag">${escapeHtml(item.category)}</span>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin-top: 8px;">${escapeHtml(item.title)}</h2>
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-top: 8px; line-height: 1.6;">
            ${escapeHtml(item.description)}
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--bg-card-subtle); padding: 14px; border-radius: var(--radius-md);">
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Location</span>
            <strong style="font-size: 0.875rem;">${escapeHtml(item.location)}</strong>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Reported Date</span>
            <strong style="font-size: 0.875rem;">${new Date(item.item_date).toLocaleDateString()}</strong>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Contact Info</span>
            <strong style="font-size: 0.875rem;">${escapeHtml(item.contact_info || 'Available via portal')}</strong>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Reporter</span>
            <strong style="font-size: 0.875rem;">${escapeHtml(item.profiles?.full_name || 'Campus Member')}</strong>
          </div>
        </div>

        ${matches.length > 0 ? `
          <div style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 14px;">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <i data-lucide="sparkles" style="color: var(--primary);"></i> Smart AI Suggested Matches:
            </h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${matches.slice(0, 3).map(m => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                  <div>
                    <strong style="font-size: 0.875rem;">${escapeHtml(m.candidate.title)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(m.candidate.location)}</div>
                  </div>
                  <span class="match-score-pill ${m.score >= 70 ? 'high' : 'medium'}" style="font-size: 0.75rem; padding: 3px 8px;">
                    ${m.score}% match
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
          ${item.type === 'found' && item.status !== 'resolved' ? `
            <button class="btn btn-primary" id="modalClaimBtn">
              <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i> Claim Item
            </button>
          ` : ''}
          <button class="btn btn-outline" onclick="document.getElementById('itemDetailsModal').classList.remove('active'); document.body.style.overflow=''">
            Close
          </button>
        </div>
      </div>
    `;

    const modalClaimBtn = document.getElementById('modalClaimBtn');
    if (modalClaimBtn) {
      modalClaimBtn.onclick = () => {
        closeModal('itemDetailsModal');
        this.openClaimModal(item.id);
      };
    }

    openModal('itemDetailsModal');
  }

  openClaimModal(itemId) {
    const item = this.allItems.find(i => i.id === itemId);
    if (!item) return;

    this.currentClaimTargetItemId = itemId;
    const targetTitleEl = document.getElementById('claimItemTitleTarget');
    if (targetTitleEl) targetTitleEl.textContent = item.title;

    const messageInput = document.getElementById('claimMessageInput');
    if (messageInput) messageInput.value = '';

    openModal('claimModal');
  }

  async submitClaim() {
    const messageInput = document.getElementById('claimMessageInput');
    const message = messageInput ? messageInput.value.trim() : '';

    if (!message) {
      showToast('Please provide a description or proof of ownership', 'error');
      return;
    }

    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      showToast('Please sign in to file a claim', 'error');
      setTimeout(() => window.location.href = 'login.html', 1000);
      return;
    }

    try {
      await db.createClaim({
        itemId: this.currentClaimTargetItemId,
        claimantId: currentUser.id,
        message
      });

      closeModal('claimModal');
      showToast('Claim submitted successfully! Finder notified.', 'success');
      this.currentTab = 'claims';
      this.updateActiveTabUI();
      await this.refreshAll();
    } catch (err) {
      console.error(err);
      showToast('Failed to submit claim', 'error');
    }
  }

  async submitReportItem(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="reportType"]:checked')?.value || 'lost';
    const title = document.getElementById('reportTitle').value.trim();
    const category = document.getElementById('reportCategory').value;
    const location = document.getElementById('reportLocation').value.trim();
    const item_date = document.getElementById('reportDate').value;
    const description = document.getElementById('reportDescription').value.trim();
    const contact_info = document.getElementById('reportContact').value.trim();

    if (!title || !description || !location || !item_date) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      showToast('Please sign in to submit a report', 'error');
      setTimeout(() => window.location.href = 'login.html', 1000);
      return;
    }

    const submitBtn = document.getElementById('submitReportBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Publishing...';
    }

    try {
      let image_url = null;
      if (this.selectedImageFile) {
        image_url = await db.uploadImage(this.selectedImageFile);
      }

      await db.createItem({
        user_id: currentUser.id,
        type,
        title,
        description,
        category,
        location,
        item_date,
        image_url,
        contact_info
      });

      closeModal('reportModal');
      document.getElementById('reportForm').reset();
      this.selectedImageFile = null;
      const preview = document.getElementById('dropzonePreview');
      if (preview) preview.style.display = 'none';

      showToast(`Your ${type.toUpperCase()} item has been published!`, 'success');
      await this.refreshAll();
    } catch (err) {
      console.error(err);
      showToast('Failed to create item', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
      }
    }
  }

  async refreshNotifications() {
    const user = auth.getCurrentUser();
    const badge = document.getElementById('notifCountBadge');
    const listContainer = document.getElementById('notifList');

    if (!user) {
      if (badge) badge.style.display = 'none';
      if (listContainer) listContainer.innerHTML = '<div class="notif-empty">Log in to view notifications</div>';
      return;
    }

    const notifs = await db.getNotifications(user.id);
    const unread = notifs.filter(n => !n.read_at);

    if (badge) {
      if (unread.length > 0) {
        badge.style.display = 'flex';
        badge.textContent = unread.length;
      } else {
        badge.style.display = 'none';
      }
    }

    if (listContainer) {
      if (notifs.length === 0) {
        listContainer.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      } else {
        listContainer.innerHTML = notifs.map(n => `
          <div class="notif-item ${!n.read_at ? 'unread' : ''}" data-id="${n.id}">
            <div class="notif-msg">${escapeHtml(n.message)}</div>
            <div class="notif-time">${timeAgo(n.created_at)}</div>
          </div>
        `).join('');

        // Bind clicks on notifications
        listContainer.querySelectorAll('.notif-item').forEach(item => {
          item.onclick = async () => {
            const notifId = item.getAttribute('data-id');
            await db.markNotificationRead(notifId);
            this.currentTab = 'claims';
            this.updateActiveTabUI();
            await this.refreshAll();
            document.getElementById('notificationsDropdown').classList.remove('active');
          };
        });
      }
    }
  }

  updateActiveTabUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === this.currentTab);
    });
  }

  bindEvents() {
    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        this.currentTab = btn.getAttribute('data-tab');
        this.updateActiveTabUI();
        this.renderCurrentView();
      };
    });

    // Search and Filters
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.oninput = () => this.renderCurrentView();
    }

    const catFilter = document.getElementById('categoryFilter');
    if (catFilter) {
      catFilter.onchange = () => this.renderCurrentView();
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.onchange = () => this.renderCurrentView();
    }

    // Modal Triggers
    const reportBtn = document.getElementById('openReportModalBtn');
    if (reportBtn) {
      reportBtn.onclick = () => {
        if (!auth.getCurrentUser()) {
          showToast('Please sign in or choose a profile to report an item', 'info');
          setTimeout(() => window.location.href = 'login.html', 800);
          return;
        }
        const dateInput = document.getElementById('reportDate');
        if (dateInput && !dateInput.value) {
          dateInput.value = new Date().toISOString().split('T')[0];
        }
        openModal('reportModal');
      };
    }

    const settingsBtn = document.getElementById('openSettingsBtn');
    if (settingsBtn) {
      settingsBtn.onclick = () => {
        document.getElementById('settingSupabaseUrl').value = CONFIG.getUrl();
        document.getElementById('settingSupabaseKey').value = CONFIG.getAnonKey();
        document.getElementById('settingForceDemo').checked = CONFIG.isDemoMode();
        openModal('settingsModal');
      };
    }

    // Notification Dropdown Toggle
    const notifBtn = document.getElementById('notifBellBtn');
    const notifDropdown = document.getElementById('notificationsDropdown');
    if (notifBtn && notifDropdown) {
      notifBtn.onclick = (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('active');
      };

      document.addEventListener('click', (e) => {
        if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
          notifDropdown.classList.remove('active');
        }
      });
    }

    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
      markAllReadBtn.onclick = async () => {
        const u = auth.getCurrentUser();
        if (u) {
          await db.markAllNotificationsRead(u.id);
          await this.refreshNotifications();
          showToast('All notifications marked as read', 'info');
        }
      };
    }

    // Modal Close Buttons
    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(btn => {
      btn.onclick = () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) closeModal(modal.id);
      };
    });

    // Close on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.onclick = (e) => {
        if (e.target === modal) closeModal(modal.id);
      };
    });

    // Report Form Submit
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      reportForm.onsubmit = (e) => this.submitReportItem(e);
    }

    // Image Upload Dropzone
    const dropzone = document.getElementById('imageDropzone');
    const fileInput = document.getElementById('imageFileInput');
    const preview = document.getElementById('dropzonePreview');
    const dropzoneText = document.getElementById('dropzoneText');

    if (dropzone && fileInput) {
      dropzone.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleImageFile(e.target.files[0], preview, dropzoneText);
        }
      };

      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
      };

      dropzone.ondragleave = () => {
        dropzone.style.borderColor = 'var(--border-color)';
      };

      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleImageFile(e.dataTransfer.files[0], preview, dropzoneText);
        }
      };
    }

    // Claim Submit
    const submitClaimBtn = document.getElementById('submitClaimBtn');
    if (submitClaimBtn) {
      submitClaimBtn.onclick = () => this.submitClaim();
    }

    // Demo Profile Switcher
    const demoSwitcher = document.getElementById('demoUserSwitcher');
    if (demoSwitcher) {
      demoSwitcher.onchange = (e) => {
        auth.switchDemoUser(e.target.value);
        showToast(`Switched active user to ${auth.getCurrentUser().full_name}`, 'info');
      };
    }

    // Sign Out Button
    const navSignOutBtn = document.getElementById('navSignOutBtn');
    if (navSignOutBtn) {
      navSignOutBtn.onclick = async (e) => {
        e.stopPropagation();
        await auth.signOut();
        showToast('Signed out. You are now browsing as a guest.', 'info');
        await this.refreshAll();
      };
    }

    // Settings Modal Save
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
      saveSettingsBtn.onclick = () => {
        const url = document.getElementById('settingSupabaseUrl').value;
        const key = document.getElementById('settingSupabaseKey').value;
        const forceDemo = document.getElementById('settingForceDemo').checked;

        CONFIG.saveCredentials(url, key);
        CONFIG.setDemoMode(forceDemo);
        closeModal('settingsModal');
        showToast('Settings saved! Reloading data connection...', 'success');
        setTimeout(() => window.location.reload(), 600);
      };
    }

    const resetDataBtn = document.getElementById('resetDemoDataBtn');
    if (resetDataBtn) {
      resetDataBtn.onclick = () => {
        db.resetDemoStore();
        closeModal('settingsModal');
        showToast('Demo store reset to default seed data!', 'success');
        setTimeout(() => window.location.reload(), 500);
      };
    }
  }

  handleImageFile(file, previewEl, textEl) {
    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewEl) {
        previewEl.src = e.target.result;
        previewEl.style.display = 'block';
      }
      if (textEl) {
        textEl.textContent = `Selected: ${file.name}`;
      }
    };
    reader.readAsDataURL(file);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.lostAndFoundApp = new App();
});
