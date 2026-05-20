/* ═══════════════════════════════════════════════════════════
   shopping.js — Shopping list module
   Depends on: db.js, app.js
   ═══════════════════════════════════════════════════════════ */
(() => {

  const CATEGORIES = [
    { key: 'fresh',    label: 'Fresh produce',      icon: 'ti-leaf',      keywords: ['tomato','lettuce','spinach','kale','courgette','pepper','onion','garlic','ginger','lemon','lime','avocado','mushroom','broccoli','cauliflower','carrot','celery','cucumber','beetroot','herbs','coriander','basil','parsley','spring onion','leek','cabbage','fennel','asparagus','pea','bean','corn'] },
    { key: 'fridge',   label: 'Fridge & dairy',     icon: 'ti-temperature-snow', keywords: ['milk','yogurt','butter','cream','cheese','tofu','tempeh','egg','oat milk','almond milk','soy milk','coconut yogurt','vegan butter','kefir','kombucha'] },
    { key: 'freezer',  label: 'Freezer',             icon: 'ti-snowflake', keywords: ['frozen','edamame','peas','sweetcorn','berries','mango'] },
    { key: 'dry',      label: 'Dry goods & tins',   icon: 'ti-archive',   keywords: ['rice','pasta','lentil','chickpea','bean','flour','oat','quinoa','couscous','noodle','bread','cracker','cereal','tin','can','coconut milk','stock','broth','tomato','sauce','oil','vinegar','soy','tamari','miso'] },
    { key: 'spices',   label: 'Spices & condiments',icon: 'ti-leaf',      keywords: ['spice','cumin','turmeric','paprika','cinnamon','coriander','cardamom','pepper','salt','chilli','garam','masala','yeast','mustard','ketchup','mayo','sriracha','tahini','pesto','harissa'] },
    { key: 'drinks',   label: 'Drinks',              icon: 'ti-droplet',   keywords: ['water','juice','tea','coffee','wine','beer','kombucha','soda'] },
    { key: 'other',    label: 'Other',               icon: 'ti-shopping-bag', keywords: [] },
  ];

  function categorise(name) {
    const n = name.toLowerCase();
    for (const cat of CATEGORIES) {
      if (cat.keywords.some(k => n.includes(k))) return cat.key;
    }
    return 'other';
  }

  /* ── Build view ─────────────────────────────────────────── */
  function buildView() {
    const el = document.getElementById('view-shopping');
    el.innerHTML = `
      <div class="view-header">
        <div class="view-header-left">
          <h1 class="view-title">Shopping</h1>
          <span class="view-subtitle" id="sh-subtitle"></span>
        </div>
        <button class="btn-primary" id="btn-add-sh">
          <i class="ti ti-plus"></i> Add item
        </button>
      </div>

      <div class="sh-banner" id="sh-banner"></div>

      <div class="sh-toolbar">
        <button class="btn-secondary" id="btn-sh-uncheck">
          <i class="ti ti-refresh"></i> Uncheck all
        </button>
        <button class="btn-secondary" id="btn-sh-remove-checked">
          <i class="ti ti-trash"></i> Remove checked
        </button>
        <button class="btn-ghost" id="btn-sh-ocado">
          <i class="ti ti-external-link"></i> Ocado
        </button>
      </div>

      <div id="sh-list"></div>
    `;

    el.querySelector('#btn-add-sh').addEventListener('click', () => openAddModal());
    el.querySelector('#btn-sh-uncheck').addEventListener('click', uncheckAll);
    el.querySelector('#btn-sh-remove-checked').addEventListener('click', removeChecked);
    el.querySelector('#btn-sh-ocado').addEventListener('click', openOcado);
  }

  /* ── Render ─────────────────────────────────────────────── */
  async function render() {
    const items = await DB.Shopping.getAll();
    const total   = items.length;
    const checked = items.filter(i => i.checked).length;
    const instock = items.filter(i => i.inStock).length;

    /* Subtitle */
    document.getElementById('sh-subtitle').textContent =
      total ? `${total - checked} remaining · ${checked} checked off` : 'Empty — generate from meal plan or add manually';

    /* Banner */
    const banner = document.getElementById('sh-banner');
    if (!total) {
      banner.innerHTML = `
        <div class="sh-empty-banner">
          <i class="ti ti-calendar-week"></i>
          <div>
            <div class="sh-empty-banner-title">No items yet</div>
            <div class="sh-empty-banner-sub">Go to Meal Plan and tap <strong>Build list</strong> to auto-generate from this week's recipes, or add items manually above.</div>
          </div>
        </div>`;
    } else if (instock > 0) {
      banner.innerHTML = `
        <div class="sh-info-banner">
          <i class="ti ti-info-circle"></i>
          <span><strong>${instock}</strong> item${instock > 1 ? 's' : ''} already in your inventory — marked below</span>
        </div>`;
    } else {
      banner.innerHTML = '';
    }

    /* Group by category */
    const grouped = {};
    CATEGORIES.forEach(c => { grouped[c.key] = []; });
    items.forEach(item => {
      const cat = categorise(item.name);
      grouped[cat].push(item);
    });

    const list = document.getElementById('sh-list');
    if (!total) { list.innerHTML = ''; return; }

    list.innerHTML = CATEGORIES.map(cat => {
      const catItems = grouped[cat.key];
      if (!catItems.length) return '';
      return `
        <div class="sh-category">
          <div class="sh-cat-header">
            <i class="ti ${cat.icon}"></i>${cat.label}
            <span class="sh-cat-count">${catItems.length}</span>
          </div>
          ${catItems.map(item => `
            <div class="sh-item${item.checked ? ' checked' : ''}${item.inStock ? ' in-stock' : ''}" data-id="${item.id}">
              <button class="sh-checkbox${item.checked ? ' on' : ''}" data-id="${item.id}" aria-label="${item.checked ? 'Uncheck' : 'Check'} ${escHtml(item.name)}">
                ${item.checked ? '<i class="ti ti-check"></i>' : ''}
              </button>
              <div class="sh-item-body">
                <span class="sh-item-name">${escHtml(item.name)}</span>
                ${item.inStock ? '<span class="sh-in-stock-badge">In stock</span>' : ''}
                ${item.source ? `<span class="sh-item-source">${escHtml(item.source)}</span>` : ''}
              </div>
              <div class="sh-item-right">
                ${item.qty ? `<span class="sh-item-qty">${item.qty}${item.unit ? ' ' + item.unit : ''}</span>` : ''}
                <button class="icon-btn dark sh-del-btn" data-id="${item.id}" aria-label="Remove ${escHtml(item.name)}">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>`;
    }).join('');

    /* Checkbox toggles */
    list.querySelectorAll('.sh-checkbox').forEach(btn =>
      btn.addEventListener('click', async () => {
        const id   = +btn.dataset.id;
        const item = await DB.Shopping.getAll().then(all => all.find(i => i.id === id));
        if (!item) return;
        await DB.Shopping.save({ ...item, checked: !item.checked });
        render();
      })
    );

    /* Delete buttons */
    list.querySelectorAll('.sh-del-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        await DB.Shopping.delete(+btn.dataset.id);
        App.showToast('Item removed');
        render();
      })
    );
  }

  /* ── Add item manually ──────────────────────────────────── */
  function openAddModal() {
    const UNITS = ['','g','kg','ml','L','tsp','tbsp','cup','cans','bottles','bunch','piece','jar','bag','box'];
    const html = `
      <div class="form-group">
        <label class="form-label" for="sh-name">Item name *</label>
        <input class="form-input" id="sh-name" type="text" placeholder="e.g. Cherry tomatoes" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="sh-qty">Quantity</label>
          <input class="form-input" id="sh-qty" type="number" min="0" step="any" placeholder="1" />
        </div>
        <div class="form-group">
          <label class="form-label" for="sh-unit">Unit</label>
          <select class="form-select" id="sh-unit">
            ${UNITS.map(u => `<option value="${u}">${u || '—'}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-footer">
        <button class="btn-ghost" id="sh-cancel">Cancel</button>
        <button class="btn-primary" id="sh-save"><i class="ti ti-plus"></i> Add to list</button>
      </div>
    `;
    App.openModal('Add item', html);
    document.getElementById('sh-cancel').addEventListener('click', App.closeModal);
    document.getElementById('sh-save').addEventListener('click', async () => {
      const name = document.getElementById('sh-name').value.trim();
      if (!name) { App.showToast('Please enter an item name', 'error'); return; }
      await DB.Shopping.save({
        name,
        qty:     parseFloat(document.getElementById('sh-qty').value) || null,
        unit:    document.getElementById('sh-unit').value,
        checked: false,
        inStock: false,
        source:  '',
        addedAt: Date.now(),
      });
      App.closeModal();
      App.showToast(`${name} added`, 'success');
      render();
    });
  }

  /* ── Toolbar actions ────────────────────────────────────── */
  async function uncheckAll() {
    const items = await DB.Shopping.getAll();
    for (const item of items) {
      if (item.checked) await DB.Shopping.save({ ...item, checked: false });
    }
    App.showToast('All items unchecked');
    render();
  }

  async function removeChecked() {
    const items = await DB.Shopping.getAll();
    const checked = items.filter(i => i.checked);
    if (!checked.length) { App.showToast('No checked items to remove'); return; }
    if (!confirm(`Remove ${checked.length} checked item${checked.length > 1 ? 's' : ''}?`)) return;
    for (const item of checked) await DB.Shopping.delete(item.id);
    App.showToast(`${checked.length} item${checked.length > 1 ? 's' : ''} removed`, 'success');
    render();
  }

  async function openOcado() {
    const items  = await DB.Shopping.getAll();
    const needed = items.filter(i => !i.checked && !i.inStock);
    if (!needed.length) {
      App.showToast('No unchecked items to search for');
      return;
    }
    /* Deep-link: Ocado search for first unchecked item as a starting point.
       Full basket API requires Ocado partner access — this is the v1 approach. */
    const query  = needed.map(i => i.name).join(', ');
    const search = encodeURIComponent(needed[0].name);
    App.openModal('Send to Ocado', `
      <p style="font-size:14px;color:var(--stone-700);line-height:1.7;margin-bottom:14px;">
        Ocado doesn't yet offer a public basket API, so Stockpile will open a search for each item.
        Your list has <strong>${needed.length} items</strong> to buy:
      </p>
      <div style="background:var(--green-50);border-radius:var(--radius-md);padding:10px 14px;font-size:13px;color:var(--stone-700);margin-bottom:16px;max-height:180px;overflow-y:auto;line-height:1.8;">
        ${needed.map(i => `${escHtml(i.name)}${i.qty ? ` — ${i.qty}${i.unit ? ' '+i.unit : ''}` : ''}`).join('<br>')}
      </div>
      <p style="font-size:12px;color:var(--stone-500);margin-bottom:16px;">
        Tap below to open Ocado search for the first item. You can copy the full list above to paste into Ocado's search bar.
      </p>
      <div class="form-footer">
        <button class="btn-ghost" id="oc-cancel">Cancel</button>
        <button class="btn-primary" id="oc-open">
          <i class="ti ti-external-link"></i> Open Ocado search
        </button>
      </div>
    `);
    document.getElementById('oc-cancel').addEventListener('click', App.closeModal);
    document.getElementById('oc-open').addEventListener('click', () => {
      window.open(`https://www.ocado.com/search?entry=${search}`, '_blank');
      App.closeModal();
    });
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Lifecycle ──────────────────────────────────────────── */
  document.addEventListener('viewchange', e => { if (e.detail === 'shopping') render(); });
  document.addEventListener('datachanged', () => {
    if (document.getElementById('view-shopping').classList.contains('active')) render();
  });

  buildView();

})();
