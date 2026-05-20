/* ═══════════════════════════════════════════════════════════
   mealplan.js — Weekly meal planner module
   Depends on: db.js, app.js
   ═══════════════════════════════════════════════════════════ */
(() => {

  const MEALS   = ['breakfast', 'lunch', 'dinner'];
  const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
  const MEAL_ICONS  = { breakfast: 'ti-coffee', lunch: 'ti-salad', dinner: 'ti-tools-kitchen-2' };
  const DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  /* ISO week helpers */
  function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return { week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), year: d.getUTCFullYear() };
  }

  function getMondayOfWeek(year, week) {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
    return monday;
  }

  function weekKey(year, week) {
    return `${year}-W${String(week).padStart(2,'0')}`;
  }

  function slotKey(year, week, dayIdx, meal) {
    return `${weekKey(year,week)}-${dayIdx}-${meal}`;
  }

  function formatDateRange(monday) {
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const fmt = d => d.toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'UTC' });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }

  /* State */
  let { week, year } = getISOWeek(new Date());
  let slotData   = {};   /* slotKey → { recipeId, recipeName, freeText } */
  let allRecipes = [];

  /* ── Build view ─────────────────────────────────────────── */
  function buildView() {
    const el = document.getElementById('view-mealplan');
    el.innerHTML = `
      <div class="view-header">
        <div class="view-header-left">
          <h1 class="view-title">Meal plan</h1>
          <span class="view-subtitle" id="mp-daterange"></span>
        </div>
        <button class="btn-primary" id="btn-gen-shopping">
          <i class="ti ti-shopping-cart"></i> Build list
        </button>
      </div>

      <div class="mp-week-nav">
        <button class="icon-btn dark" id="mp-prev" aria-label="Previous week">
          <i class="ti ti-chevron-left"></i>
        </button>
        <span class="mp-week-label" id="mp-week-label"></span>
        <button class="icon-btn dark" id="mp-next" aria-label="Next week">
          <i class="ti ti-chevron-right"></i>
        </button>
      </div>

      <div id="mp-grid"></div>

      <div class="mp-legend">
        <span><i class="ti ti-info-circle"></i> Tap any slot to assign a recipe or add a note</span>
      </div>
    `;

    el.querySelector('#mp-prev').addEventListener('click', () => {
      week--; if (week < 1) { year--; week = 52; } render();
    });
    el.querySelector('#mp-next').addEventListener('click', () => {
      week++; if (week > 52) { year++; week = 1; } render();
    });
    el.querySelector('#btn-gen-shopping').addEventListener('click', generateShoppingList);
  }

  /* ── Render ─────────────────────────────────────────────── */
  async function render() {
    allRecipes = await DB.Recipes.getAll();

    /* Load all slots for this week */
    const allSlots = await DB.MealPlan.getAll();
    slotData = {};
    const prefix = weekKey(year, week);
    allSlots.forEach(s => { if (s.slotKey.startsWith(prefix)) slotData[s.slotKey] = s; });

    const monday = getMondayOfWeek(year, week);
    document.getElementById('mp-daterange').textContent = formatDateRange(monday);
    document.getElementById('mp-week-label').textContent = `Week ${week}, ${year}`;

    const grid = document.getElementById('mp-grid');
    grid.innerHTML = DAYS.map((day, dayIdx) => {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + dayIdx);
      const dateStr = date.toLocaleDateString('en-GB', { day:'numeric', month:'short', timeZone:'UTC' });
      const isToday = date.toDateString() === new Date().toDateString();

      return `
        <div class="mp-day-card${isToday ? ' today' : ''}">
          <div class="mp-day-header">
            <span class="mp-day-name">${day}</span>
            <span class="mp-day-date">${dateStr}</span>
          </div>
          <div class="mp-slots">
            ${MEALS.map(meal => {
              const key  = slotKey(year, week, dayIdx, meal);
              const slot = slotData[key];
              const filled = slot && (slot.recipeName || slot.freeText);
              return `
                <button class="mp-slot${filled ? ' filled' : ''}" data-key="${key}" data-day="${dayIdx}" data-meal="${meal}" aria-label="${MEAL_LABELS[meal]} for ${day}">
                  <span class="mp-slot-label"><i class="ti ${MEAL_ICONS[meal]}"></i>${MEAL_LABELS[meal]}</span>
                  <span class="mp-slot-value">${filled
                    ? escHtml(slot.recipeName || slot.freeText)
                    : '<span class="mp-slot-empty">+ Add</span>'
                  }</span>
                </button>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.mp-slot').forEach(btn =>
      btn.addEventListener('click', () => openSlotModal(
        btn.dataset.key, +btn.dataset.day, btn.dataset.meal
      ))
    );
  }

  /* ── Slot modal ─────────────────────────────────────────── */
  function openSlotModal(key, dayIdx, meal) {
    const existing = slotData[key] || {};
    const day = DAYS[dayIdx];

    const html = `
      <p class="mp-modal-context">${day} · ${MEAL_LABELS[meal]}</p>

      <div class="form-group">
        <label class="form-label" for="sl-recipe">Choose a recipe</label>
        <select class="form-select" id="sl-recipe">
          <option value="">— no recipe —</option>
          ${allRecipes.map(r =>
            `<option value="${r.id}" ${existing.recipeId === r.id ? 'selected' : ''}>${escHtml(r.name)}</option>`
          ).join('')}
        </select>
      </div>

      <div class="mp-divider"><span>or</span></div>

      <div class="form-group">
        <label class="form-label" for="sl-free">Free text / note</label>
        <input class="form-input" id="sl-free" type="text"
          placeholder="e.g. Leftovers, eating out…"
          value="${escHtml(existing.freeText || '')}" />
      </div>

      <div class="form-footer">
        ${existing.recipeName || existing.freeText
          ? `<button class="btn-danger" id="sl-clear"><i class="ti ti-trash"></i> Clear slot</button>`
          : ''
        }
        <button class="btn-ghost" id="sl-cancel">Cancel</button>
        <button class="btn-primary" id="sl-save"><i class="ti ti-check"></i> Save</button>
      </div>
    `;

    App.openModal(`${day} ${MEAL_LABELS[meal]}`, html);

    /* Selecting a recipe clears free text and vice versa */
    document.getElementById('sl-recipe').addEventListener('change', e => {
      if (e.target.value) document.getElementById('sl-free').value = '';
    });
    document.getElementById('sl-free').addEventListener('input', e => {
      if (e.target.value) document.getElementById('sl-recipe').value = '';
    });

    document.getElementById('sl-cancel').addEventListener('click', App.closeModal);

    document.getElementById('sl-clear')?.addEventListener('click', async () => {
      await DB.MealPlan.setSlot({ slotKey: key, recipeId: null, recipeName: '', freeText: '' });
      App.closeModal();
      App.showToast('Slot cleared');
      render();
    });

    document.getElementById('sl-save').addEventListener('click', async () => {
      const recipeId  = parseInt(document.getElementById('sl-recipe').value) || null;
      const freeText  = document.getElementById('sl-free').value.trim();
      const recipe    = recipeId ? allRecipes.find(r => r.id === recipeId) : null;
      await DB.MealPlan.setSlot({
        slotKey: key,
        recipeId,
        recipeName: recipe?.name || '',
        freeText: recipeId ? '' : freeText,
      });
      App.closeModal();
      App.showToast('Meal saved', 'success');
      render();
    });
  }

  /* ── Generate shopping list ─────────────────────────────── */
  async function generateShoppingList() {
    /* Collect all recipe IDs planned this week */
    const recipeIds = Object.values(slotData)
      .filter(s => s.recipeId)
      .map(s => s.recipeId);

    if (!recipeIds.length) {
      App.showToast('No recipes planned this week — add some meals first', 'error');
      return;
    }

    /* Aggregate ingredients across all planned recipes */
    const ingredientMap = {};
    for (const id of recipeIds) {
      const recipe = allRecipes.find(r => r.id === id);
      if (!recipe?.ingredients) continue;
      for (const ing of recipe.ingredients) {
        const mapKey = `${ing.name.toLowerCase()}|${ing.unit}`;
        if (ingredientMap[mapKey]) {
          ingredientMap[mapKey].qty = (ingredientMap[mapKey].qty || 0) + (ing.qty || 0);
        } else {
          ingredientMap[mapKey] = { ...ing, source: recipe.name };
        }
      }
    }

    /* Diff against inventory */
    const inventory   = await DB.Items.getAll();
    const invMap      = {};
    inventory.forEach(i => { invMap[i.name.toLowerCase()] = i; });

    /* Clear existing shopping list and rebuild */
    await DB.Shopping.clear();
    for (const ing of Object.values(ingredientMap)) {
      const inStock = invMap[ing.name.toLowerCase()];
      await DB.Shopping.save({
        name:     ing.name,
        qty:      ing.qty,
        unit:     ing.unit,
        checked:  false,
        inStock:  !!inStock,
        source:   ing.source,
        addedAt:  Date.now(),
      });
    }

    App.showToast('Shopping list generated!', 'success');
    /* Switch to shopping view */
    setTimeout(() => App.switchView('shopping'), 600);
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Lifecycle ──────────────────────────────────────────── */
  document.addEventListener('viewchange', e => { if (e.detail === 'mealplan') render(); });
  document.addEventListener('datachanged', () => {
    if (document.getElementById('view-mealplan').classList.contains('active')) render();
  });

  buildView();

})();
