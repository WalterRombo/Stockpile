/* ═══════════════════════════════════════════════════════════
   inventory.js — Inventory module
   Depends on: db.js, app.js
   ═══════════════════════════════════════════════════════════ */
(() => {

  const LOCATIONS = [
    { key: 'fridge',   label: 'Fridge',    icon: 'ti-temperature-snow' },
    { key: 'freezer',  label: 'Freezer',   icon: 'ti-snowflake' },
    { key: 'dry',      label: 'Dry goods', icon: 'ti-archive' },
    { key: 'spices',   label: 'Spices',    icon: 'ti-leaf' },
    { key: 'drinks',   label: 'Drinks',    icon: 'ti-droplet' },
    { key: 'other',    label: 'Other',     icon: 'ti-box' },
  ];

  const UNITS = [
    '', 'g', 'kg', 'ml', 'L', 'tsp', 'tbsp',
    'cup', 'cans', 'bottles', 'blocks', 'loaf',
    'bunch', 'piece', 'jar', 'bag', 'box', 'pack',
  ];

  const LOCATION_ICONS = Object.fromEntries(LOCATIONS.map(l => [l.key, l.icon]));

  let currentLocation = 'fridge';
  let searchQuery = '';

  /* ── Expiry helpers ─────────────────────────────────────── */
  function expiryStatus(dateStr) {
    if (!dateStr) return { label: '', cls: '' };
    const diff = Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
    if (diff < 0)  return { label: `Expired ${Math.abs(diff)}d ago`, cls: 'badge-exp' };
    if (diff === 0) return { label: 'Expires today', cls: 'badge-warn' };
    if (diff <= 3)  return { label: `Expires in ${diff}d`, cls: 'badge-warn' };
    return { label: `Good until ${new Date(dateStr).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`, cls: 'badge-ok' };
  }

  /* ── Build view HTML ────────────────────────────────────── */
  function buildView() {
    const el = document.getElementById('view-inventory');
    el.innerHTML = `
      <div class="view-header">
        <div class="view-header-left">
          <h1 class="view-title">Inventory</h1>
          <span class="view-subtitle" id="inv-subtitle"></span>
        </div>
        <button class="btn-primary" id="btn-add-item">
          <i class="ti ti-plus"></i> Add item
        </button>
      </div>

      <div class="stat-grid" id="inv-stats"></div>

      <div class="tab-bar" id="inv-tabs">
        ${LOCATIONS.map(loc => `
          <button class="tab-pill${loc.key === currentLocation ? ' active' : ''}" data-loc="${loc.key}">
            <i class="ti ${loc.icon}"></i>${loc.label}
          </button>
        `).join('')}
      </div>

      <div class="search-bar">
        <i class="ti ti-search"></i>
        <input type="search" id="inv-search" placeholder="Search items…" value="${searchQuery}" />
      </div>

      <ul id="inv-list" aria-label="Inventory items"></ul>
    `;

    el.querySelector('#btn-add-item').addEventListener('click', () => openItemForm(null));
    el.querySelector('#inv-search').addEventListener('input', e => { searchQuery = e.target.value; renderList(); });
    el.querySelectorAll('.tab-pill').forEach(btn =>
      btn.addEventListener('click', () => { currentLocation = btn.dataset.loc; render(); })
    );
  }

  /* ── Stats bar ──────────────────────────────────────────── */
  async function renderStats() {
    const all = await DB.Items.getAll();
    const today = Date.now();
    const expiring = all.filter(i => {
      if (!i.expiryDate) return false;
      const diff = Math.ceil((new Date(i.expiryDate) - today) / 86400000);
      return diff >= 0 && diff <= 3;
    });
    const expired = all.filter(i => i.expiryDate && new Date(i.expiryDate) < today);

    document.getElementById('inv-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total items</div>
        <div class="stat-value">${all.length}</div>
        <div class="stat-sub">${LOCATIONS.length} locations</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Expiring soon</div>
        <div class="stat-value">${expiring.length}</div>
        <div class="stat-sub warn">within 3 days</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Expired</div>
        <div class="stat-value">${expired.length}</div>
        <div class="stat-sub warn">remove or use up</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This location</div>
        <div class="stat-value" id="stat-loc-count">—</div>
        <div class="stat-sub" id="stat-loc-label"></div>
      </div>
    `;
    document.getElementById('inv-subtitle').textContent =
      `${all.length} items across ${LOCATIONS.length} locations`;
  }

  /* ── Item list ──────────────────────────────────────────── */
  async function renderList() {
    const items = await DB.Items.getAll(currentLocation);
    const filtered = searchQuery
      ? items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : items;

    const locCount = document.getElementById('stat-loc-count');
    const locLabel = document.getElementById('stat-loc-label');
    if (locCount) locCount.textContent = items.length;
    if (locLabel) locLabel.textContent = LOCATIONS.find(l => l.key === currentLocation)?.label || '';

    const list = document.getElementById('inv-list');
    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="ti ${LOCATION_ICONS[currentLocation] || 'ti-box'}"></i>
          <h3>${searchQuery ? 'No results' : 'Nothing here yet'}</h3>
          <p>${searchQuery ? 'Try a different search.' : 'Tap "Add item" to stock this location.'}</p>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(item => {
      const exp = expiryStatus(item.expiryDate);
      return `
        <li class="inv-item" data-id="${item.id}">
          <div class="inv-icon"><i class="ti ${LOCATION_ICONS[item.location] || 'ti-box'}"></i></div>
          <div style="flex:1;min-width:0;">
            <div class="inv-name">${escHtml(item.name)}</div>
            ${exp.label ? `<span class="inv-badge ${exp.cls}">${exp.label}</span>` : ''}
            ${item.notes ? `<div style="font-size:11px;color:var(--stone-500);margin-top:2px;">${escHtml(item.notes)}</div>` : ''}
          </div>
          <div class="inv-qty">
            <div class="inv-qty-val">${item.qty ?? ''}</div>
            <div class="inv-qty-unit">${escHtml(item.unit || '')}</div>
          </div>
          <div class="inv-actions">
            <button class="icon-btn dark btn-edit-item" aria-label="Edit ${escHtml(item.name)}">
              <i class="ti ti-pencil"></i>
            </button>
            <button class="icon-btn dark btn-del-item" aria-label="Delete ${escHtml(item.name)}" style="color:var(--red-700);">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </li>`;
    }).join('');

    list.querySelectorAll('.btn-edit-item').forEach(btn =>
      btn.addEventListener('click', async e => {
        const id = +e.target.closest('.inv-item').dataset.id;
        const item = await DB.Items.get(id);
        openItemForm(item);
      })
    );
    list.querySelectorAll('.btn-del-item').forEach(btn =>
      btn.addEventListener('click', async e => {
        const li = e.target.closest('.inv-item');
        const id = +li.dataset.id;
        const item = await DB.Items.get(id);
        if (!confirm(`Delete "${item.name}"?`)) return;
        await DB.Items.delete(id);
        App.showToast(`${item.name} removed`, 'success');
        render();
      })
    );
  }

  async function render() {
    await renderStats();
    await renderList();
    // Sync active tab highlight
    document.querySelectorAll('#inv-tabs .tab-pill').forEach(b =>
      b.classList.toggle('active', b.dataset.loc === currentLocation)
    );
  }

  /* ── Add / Edit form ────────────────────────────────────── */
  function openItemForm(item) {
    const isEdit = !!item;
    const html = `
      <div class="form-group">
        <label class="form-label" for="f-name">Item name *</label>
        <input class="form-input" id="f-name" type="text" placeholder="e.g. Oat milk"
          value="${item ? escHtml(item.name) : ''}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="f-qty">Quantity</label>
          <input class="form-input" id="f-qty" type="number" min="0" step="any"
            placeholder="1" value="${item?.qty ?? ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="f-unit">Unit</label>
          <select class="form-select" id="f-unit">
            ${UNITS.map(u => `<option value="${u}"${item?.unit === u ? ' selected' : ''}>${u || '—'}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-loc">Location *</label>
        <select class="form-select" id="f-loc">
          ${LOCATIONS.map(l => `<option value="${l.key}"${(item?.location || currentLocation) === l.key ? ' selected' : ''}>${l.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-expiry">Expiry date</label>
        <input class="form-input" id="f-expiry" type="date" value="${item?.expiryDate || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="f-notes">Notes</label>
        <input class="form-input" id="f-notes" type="text" placeholder="Optional notes"
          value="${item ? escHtml(item.notes || '') : ''}" />
      </div>
      <div class="form-footer">
        <button class="btn-ghost" id="f-cancel">Cancel</button>
        <button class="btn-primary" id="f-save"><i class="ti ti-check"></i> ${isEdit ? 'Save changes' : 'Add item'}</button>
      </div>
    `;

    App.openModal(isEdit ? 'Edit item' : 'Add item', html);

    document.getElementById('f-cancel').addEventListener('click', App.closeModal);
    document.getElementById('f-save').addEventListener('click', async () => {
      const name = document.getElementById('f-name').value.trim();
      if (!name) { App.showToast('Please enter a name', 'error'); return; }
      const record = {
        ...(item || {}),
        name,
        qty:        parseFloat(document.getElementById('f-qty').value) || null,
        unit:       document.getElementById('f-unit').value,
        location:   document.getElementById('f-loc').value,
        expiryDate: document.getElementById('f-expiry').value,
        notes:      document.getElementById('f-notes').value.trim(),
        updatedAt:  Date.now(),
      };
      if (!isEdit) record.createdAt = Date.now();
      await DB.Items.save(record);
      App.closeModal();
      App.showToast(isEdit ? 'Item updated' : `${name} added`, 'success');
      currentLocation = record.location;
      render();
    });
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Lifecycle ──────────────────────────────────────────── */
  document.addEventListener('viewchange', e => { if (e.detail === 'inventory') render(); });
  document.addEventListener('datachanged', () => { if (document.getElementById('view-inventory').classList.contains('active')) render(); });

  buildView();

})();
