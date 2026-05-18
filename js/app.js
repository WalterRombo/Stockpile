/* ═══════════════════════════════════════════════════════════
   app.js — Core shell: router, modal, toast, SW registration
   ═══════════════════════════════════════════════════════════ */
(() => {

  /* ── Service Worker ─────────────────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () =>
      navigator.serviceWorker.register('/sw.js').catch(console.warn)
    );
  }

  /* ── Router ─────────────────────────────────────────────── */
  const views   = document.querySelectorAll('.view');
  const navBtns = document.querySelectorAll('[data-view]');

  function switchView(viewId) {
    views.forEach(v => v.classList.toggle('active', v.id === 'view-' + viewId));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    // Notify modules so they can refresh
    document.dispatchEvent(new CustomEvent('viewchange', { detail: viewId }));
    // Persist last view
    sessionStorage.setItem('sp-view', viewId);
  }

  navBtns.forEach(btn =>
    btn.addEventListener('click', () => switchView(btn.dataset.view))
  );

  /* ── Modal ──────────────────────────────────────────────── */
  const overlay  = document.getElementById('modal-overlay');
  const card     = document.getElementById('modal-card');
  const titleEl  = document.getElementById('modal-title');
  const bodyEl   = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close');

  function openModal(title, contentHTML) {
    titleEl.textContent = title;
    bodyEl.innerHTML = contentHTML;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    // Focus first focusable element
    const first = card.querySelector('input, select, textarea, button:not(.modal-close)');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    bodyEl.innerHTML = '';
    document.dispatchEvent(new Event('modalclosed'));
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });

  /* ── Toast ──────────────────────────────────────────────── */
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = '', duration = 2800) {
    const el = document.createElement('div');
    el.className = `toast${type ? ' ' + type : ''}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, duration - 300);
    setTimeout(() => el.remove(), duration);
  }

  /* ── Settings wiring ────────────────────────────────────── */
  document.getElementById('btn-clear-data')?.addEventListener('click', async () => {
    if (!confirm('Delete ALL inventory and recipe data? This cannot be undone.')) return;
    await DB.clearAll();
    showToast('All data cleared', 'success');
    document.dispatchEvent(new Event('datachanged'));
  });

  /* ── Expose globals ─────────────────────────────────────── */
  window.App = { openModal, closeModal, showToast, switchView };

  /* ── Init ───────────────────────────────────────────────── */
  async function init() {
    await DB.open();
    await DB.seedIfEmpty();
    // Restore last view or default
    const last = sessionStorage.getItem('sp-view') || 'inventory';
    switchView(last);
  }

  init().catch(console.error);

})();
