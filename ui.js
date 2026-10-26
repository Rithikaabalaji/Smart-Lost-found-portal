/**
 * UI Rendering and DOM Component Management Module.
 */

import { auth } from './auth.js';

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function timeAgo(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Shows an animated toast notification
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/**
 * Renders an Item Card
 */
export function renderItemCard(item, matchCount = 0, topMatchScore = 0) {
  const isLost = item.type === 'lost';
  const currentUser = auth.getCurrentUser();
  const isOwner = currentUser && item.user_id === currentUser.id;

  const defaultImage = isLost
    ? 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80';

  const displayImage = item.image_url || defaultImage;
  const statusLabel = item.status === 'open' 
    ? 'Open' 
    : item.status === 'pending_claim' 
      ? 'Pending Claim' 
      : 'Resolved';

  return `
    <div class="item-card" data-item-id="${item.id}">
      <div class="item-card-media">
        <img class="item-card-img" src="${escapeHtml(displayImage)}" alt="${escapeHtml(item.title)}" loading="lazy" />
        <span class="item-type-badge ${item.type}">${item.type}</span>
        <span class="item-status-pill ${item.status}">${statusLabel}</span>
      </div>

      <div class="item-card-body">
        <div class="item-meta-top">
          <span class="item-category-tag">${escapeHtml(item.category)}</span>
          <span class="item-date-text">${new Date(item.item_date).toLocaleDateString()}</span>
        </div>

        <h3 class="item-title">${escapeHtml(item.title)}</h3>
        <p class="item-description">${escapeHtml(item.description)}</p>

        <div class="item-location">
          <i data-lucide="map-pin" style="width: 15px; height: 15px;"></i>
          <span>${escapeHtml(item.location)}</span>
        </div>

        ${matchCount > 0 ? `
          <div class="smart-match-alert-badge" title="Potential match auto-detected by AI similarity engine">
            <i data-lucide="sparkles" style="width: 13px; height: 13px;"></i>
            <span>${topMatchScore}% Smart Match Found</span>
          </div>
        ` : ''}

        <div class="item-card-footer">
          <div class="item-reporter">
            <img class="reporter-avatar" src="${escapeHtml(item.profiles?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + item.user_id)}" alt="avatar" />
            <span>${escapeHtml(item.profiles?.full_name || 'Anonymous')}</span>
          </div>

          <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline btn-sm view-item-btn" data-id="${item.id}" title="View details">
              Details
            </button>
            ${!isOwner && item.type === 'found' && item.status !== 'resolved' ? `
              <button class="btn btn-primary btn-sm claim-item-btn" data-id="${item.id}">
                Claim
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the Smart Matches Pair View
 */
export function renderSmartMatchCard(match) {
  const { lostItem, foundItem, score, confidence, reasons } = match;

  const scoreClass = score >= 75 ? 'high' : 'medium';

  return `
    <div class="match-pair-card">
      <div class="match-pair-header">
        <div class="match-score-pill ${scoreClass}">
          <i data-lucide="sparkles" style="width: 18px; height: 18px;"></i>
          <span>${score}% Match Confidence (${confidence})</span>
        </div>

        <div class="match-reasons-list">
          ${reasons.map(r => `<span class="reason-chip">${escapeHtml(r)}</span>`).join('')}
        </div>
      </div>

      <div class="match-comparison-grid">
        <!-- Lost item summary -->
        <div class="match-item-snippet">
          <img class="snippet-img" src="${escapeHtml(lostItem.image_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=300')}" alt="Lost" />
          <div class="snippet-info">
            <span class="item-type-badge lost" style="position: static; display: inline-block; padding: 2px 8px; font-size: 0.65rem; margin-bottom: 4px;">LOST</span>
            <h4>${escapeHtml(lostItem.title)}</h4>
            <p>${escapeHtml(lostItem.description)}</p>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
              Reported by ${escapeHtml(lostItem.profiles?.full_name || 'Owner')} at ${escapeHtml(lostItem.location)}
            </div>
          </div>
        </div>

        <div class="match-divider-icon">
          <i data-lucide="arrow-left-right" style="width: 20px; height: 20px;"></i>
        </div>

        <!-- Found item summary -->
        <div class="match-item-snippet">
          <img class="snippet-img" src="${escapeHtml(foundItem.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300')}" alt="Found" />
          <div class="snippet-info">
            <span class="item-type-badge found" style="position: static; display: inline-block; padding: 2px 8px; font-size: 0.65rem; margin-bottom: 4px;">FOUND</span>
            <h4>${escapeHtml(foundItem.title)}</h4>
            <p>${escapeHtml(foundItem.description)}</p>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
              Found by ${escapeHtml(foundItem.profiles?.full_name || 'Finder')} at ${escapeHtml(foundItem.location)}
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button class="btn btn-outline view-item-btn" data-id="${foundItem.id}">
          Inspect Found Item
        </button>
        <button class="btn btn-primary claim-item-btn" data-id="${foundItem.id}">
          <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
          Claim This Found Match
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders a single Claim record
 */
export function renderClaimCard(claim, currentUserId) {
  const isItemOwner = claim.items && claim.items.user_id === currentUserId;
  const isClaimant = claim.claimant_id === currentUserId;

  return `
    <div class="claim-card" data-claim-id="${claim.id}">
      <div class="claim-card-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img style="width: 44px; height: 44px; border-radius: var(--radius-sm); object-fit: cover;" 
               src="${escapeHtml(claim.items?.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=150')}" 
               alt="Item" />
          <div>
            <h4 style="font-size: 1rem; font-weight: 700;">${escapeHtml(claim.items?.title || 'Unknown Item')}</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              Claimed by: <strong>${escapeHtml(claim.claimant?.full_name || 'Anonymous User')}</strong> (${escapeHtml(claim.claimant?.email || '')})
            </span>
          </div>
        </div>

        <div class="claim-status-badge ${claim.status}">
          ${claim.status}
        </div>
      </div>

      <div class="claim-message-box">
        <strong>Proof & Message from Claimant:</strong>
        <p style="margin-top: 4px;">${escapeHtml(claim.message)}</p>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
        <span>Submitted ${timeAgo(claim.created_at)}</span>

        ${isItemOwner && claim.status === 'pending' ? `
          <div class="claim-actions">
            <button class="btn btn-danger btn-sm reject-claim-btn" data-id="${claim.id}">
              <i data-lucide="x" style="width: 15px; height: 15px;"></i> Reject
            </button>
            <button class="btn btn-success btn-sm approve-claim-btn" data-id="${claim.id}">
              <i data-lucide="check" style="width: 15px; height: 15px;"></i> Approve & Release
            </button>
          </div>
        ` : ''}

        ${isClaimant && !isItemOwner ? `
          <span style="font-weight: 600; color: ${claim.status === 'approved' ? 'var(--found-color)' : 'var(--text-secondary)'};">
            ${claim.status === 'approved' ? 'Claim verified! You can coordinate retrieval.' : 'Awaiting finder review.'}
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Modal helper functions
 */
export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.lucide) window.lucide.createIcons();
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}
