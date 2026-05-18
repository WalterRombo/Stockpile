/* ═══════════════════════════════════════════════════════════
   recipes.js — Recipe library module
   Depends on: db.js, app.js
   ═══════════════════════════════════════════════════════════ */
(() => {

  const UNITS = [
    '', 'g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup',
    'can', 'bottle', 'bunch', 'piece', 'pinch', 'handful',
    'slice', 'clove', 'sprig', 'head', 'fillet',
  ];

  const ALL_TAGS = ['VG', 'GF', 'DF', 'Raw', 'LF', 'HP', 'Quick', 'Batch'];
  const TAG_NAMES = {
    VG:'Vegan', GF:'Gluten-free', DF:'Dairy-free',
    Raw:'Raw', LF:'Low-fat', HP:'High-protein',
    Quick:'Quick (<30m)', Batch:'Batch cook',
  };

  let searchQuery = '';
  let activeFilter = '';

  /* ── Build view ─────────────────────────────────────────── */
  function buildView() {
    const el = document.getElementById('view-recipes');
    el.innerHTML = `
      <div class="view-header">
        <div class="view-header-left">
          <h1 class="view-title">Recipes</h1>
          <span class="view-subtitle" id="rec-subtitle"></span>
        </div>
        <button class="btn-primary" id="btn-add-recipe">
          <i class="ti ti-plus"></i> New recipe
        </button>
      </div>

      <div class="search-bar">
        <i class="ti ti-search"></i>
        <input type="search" id="rec-search" placeholder="Search recipes…" />
      </div>

      <div class="tab-bar" id="rec-filter-bar">
        <button class="tab-pill active" data-tag="">All</button>
        ${ALL_TAGS.map(t => `<button class="tab-pill" data-tag="${t}">${t} · ${TAG_NAMES[t]}</button>`).join('')}
      </div>

      <div class="recipe-grid" id="recipe-grid"></div>
    `;

    el.querySelector('#btn-add-recipe').addEventListener('click', () => openRecipeForm(null));
    el.querySelector('#rec-search').addEventListener('input', e => { searchQuery = e.target.value; renderGrid(); });
    el.querySelectorAll('#rec-filter-bar .tab-pill').forEach(btn =>
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.tag;
        el.querySelectorAll('#rec-filter-bar .tab-pill').forEach(b => b.classList.toggle('active', b.dataset.tag === activeFilter));
        renderGrid();
      })
    );
  }

  /* ── Recipe grid ────────────────────────────────────────── */
  async function renderGrid() {
    let recipes = await DB.Recipes.getAll();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      recipes = recipes.filter(r => r.name.toLowerCase().includes(q) ||
        r.ingredients?.some(i => i.name.toLowerCase().includes(q)));
    }
    if (activeFilter) {
      recipes = recipes.filter(r => r.tags?.includes(activeFilter));
    }

    document.getElementById('rec-subtitle').textContent =
      `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`;

    const grid = document.getElementById('recipe-grid');
    if (!recipes.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <i class="ti ti-book-2"></i>
          <h3>${searchQuery || activeFilter ? 'No matches' : 'No recipes yet'}</h3>
          <p>${searchQuery || activeFilter ? 'Try adjusting your search or filter.' : 'Tap "New recipe" to add your first one.'}</p>
        </div>`;
      return;
    }

    grid.innerHTML = recipes.map(r => `
      <article class="recipe-card" data-id="${r.id}" tabindex="0" role="button" aria-label="View ${escHtml(r.name)}">
        <div class="recipe-thumb">
          <i class="ti ti-bowl-spoon"></i>
          <div class="recipe-thumb-tags">
            ${(r.tags || []).map(t => `<span class="recipe-tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="recipe-body">
          <div class="recipe-title">${escHtml(r.name)}</div>
          <div class="recipe-meta">
            ${r.prepTime || r.cookTime ? `<span><i class="ti ti-clock"></i> ${(r.prepTime||0)+(r.cookTime||0)} min</span>` : ''}
            <span><i class="ti ti-users"></i> ${r.servings || '?'}</span>
            <span style="margin-left:auto;color:var(--green-700);">${(r.ingredients||[]).length} ingredients</span>
          </div>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('.recipe-card').forEach(card => {
      card.addEventListener('click', async () => {
        const r = await DB.Recipes.get(+card.dataset.id);
        openRecipeDetail(r);
      });
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') card.click(); });
    });
  }

  /* ── Recipe detail modal ────────────────────────────────── */
  function openRecipeDetail(r) {
    const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
    const html = `
      <div class="recipe-detail-header">
        <div class="recipe-detail-title">${escHtml(r.name)}</div>
        <div class="recipe-detail-meta">
          ${totalTime ? `<span><i class="ti ti-clock"></i> ${totalTime} min</span>` : ''}
          <span><i class="ti ti-users"></i> Serves ${r.servings || '?'}</span>
          ${(r.tags||[]).map(t=>`<span style="background:rgba(255,255,255,.15);padding:1px 7px;border-radius:3px;font-size:11px;">${TAG_NAMES[t]||t}</span>`).join('')}
        </div>
      </div>

      <div style="padding:0 2px;">
        <div class="recipe-section-title">Ingredients</div>
        <div>
          ${(r.ingredients || []).map(i => `
            <div class="ingredient-row">
              <span class="ingredient-qty">${i.qty ?? ''}</span>
              <span class="ingredient-unit">${escHtml(i.unit || '')}</span>
              <span>${escHtml(i.name)}${i.notes ? ` <span style="color:var(--stone-500);font-size:12px;">(${escHtml(i.notes)})</span>` : ''}</span>
            </div>
          `).join('')}
        </div>

        ${(r.steps || []).length ? `
          <div class="recipe-section-title">Method</div>
          <div>
            ${r.steps.map((s, idx) => `
              <div class="step-row">
                <div class="step-num">${idx + 1}</div>
                <div>${escHtml(s)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${r.notes ? `
          <div class="recipe-section-title">Notes</div>
          <p style="font-size:14px;color:var(--stone-700);line-height:1.6;background:var(--green-50);border-radius:var(--radius-md);padding:10px 12px;">${escHtml(r.notes)}</p>
        ` : ''}

        <div class="form-footer">
          <button class="btn-ghost" id="rd-close">Close</button>
          <button class="btn-ghost" id="rd-delete" style="color:var(--red-700);">
            <i class="ti ti-trash"></i> Delete
          </button>
          <button class="btn-primary" id="rd-edit">
            <i class="ti ti-pencil"></i> Edit
          </button>
        </div>
      </div>
    `;

    App.openModal(r.name, html);
    document.getElementById('rd-close').addEventListener('click', App.closeModal);
    document.getElementById('rd-edit').addEventListener('click', () => {
      App.closeModal();
      openRecipeForm(r);
    });
    document.getElementById('rd-delete').addEventListener('click', async () => {
      if (!confirm(`Delete recipe "${r.name}"?`)) return;
      await DB.Recipes.delete(r.id);
      App.closeModal();
      App.showToast('Recipe deleted', 'success');
      renderGrid();
    });
  }

  /* ── Add / Edit recipe form ─────────────────────────────── */
  function openRecipeForm(recipe) {
    const isEdit = !!recipe;
    let ingredients = recipe?.ingredients?.length
      ? recipe.ingredients.map(i => ({ ...i }))
      : [{ name: '', qty: '', unit: '', notes: '' }];
    let steps = recipe?.steps?.length
      ? [...recipe.steps]
      : [''];
    let selectedTags = new Set(recipe?.tags || []);

    function ingredientRowHTML(ing, idx) {
      return `
        <div class="ingredient-builder-row" data-ing="${idx}">
          <input class="form-input ing-name" type="text" placeholder="Ingredient" value="${escHtml(ing.name || '')}" />
          <input class="form-input ing-qty" type="number" min="0" step="any" placeholder="Qty" value="${ing.qty ?? ''}" />
          <select class="form-select ing-unit">
            ${UNITS.map(u => `<option value="${u}"${ing.unit === u ? ' selected' : ''}>${u || '—'}</option>`).join('')}
          </select>
          <button class="remove-row-btn btn-del-ing" aria-label="Remove ingredient">
            <i class="ti ti-trash"></i>
          </button>
        </div>`;
    }

    function stepRowHTML(step, idx) {
      return `
        <div class="step-builder-row" data-step="${idx}">
          <div class="step-builder-num">${idx + 1}</div>
          <textarea class="form-textarea step-text" rows="2" placeholder="Step ${idx + 1}…">${escHtml(step || '')}</textarea>
          <button class="remove-row-btn btn-del-step" aria-label="Remove step">
            <i class="ti ti-trash"></i>
          </button>
        </div>`;
    }

    const html = `
      <div class="form-group">
        <label class="form-label" for="rf-name">Recipe name *</label>
        <input class="form-input" id="rf-name" type="text" placeholder="e.g. Spiced Lentil Dahl"
          value="${recipe ? escHtml(recipe.name) : ''}" />
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label" for="rf-servings">Servings</label>
          <input class="form-input" id="rf-servings" type="number" min="1" placeholder="4"
            value="${recipe?.servings ?? ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="rf-prep">Prep (min)</label>
          <input class="form-input" id="rf-prep" type="number" min="0" placeholder="10"
            value="${recipe?.prepTime ?? ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="rf-cook">Cook (min)</label>
          <input class="form-input" id="rf-cook" type="number" min="0" placeholder="30"
            value="${recipe?.cookTime ?? ''}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tags</label>
        <div class="tag-chips" id="rf-tags">
          ${ALL_TAGS.map(t => `
            <button type="button" class="tag-chip${selectedTags.has(t) ? ' on' : ''}" data-tag="${t}">
              ${t} · ${TAG_NAMES[t]}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="form-group">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <label class="form-label" style="margin:0;">Ingredients</label>
          <button class="btn-secondary" id="rf-add-ing" style="font-size:12px;padding:4px 9px;">
            <i class="ti ti-plus"></i> Add
          </button>
        </div>
        <div class="ingredient-builder" id="rf-ing-list">
          ${ingredients.map((ing, i) => ingredientRowHTML(ing, i)).join('')}
        </div>
      </div>

      <div class="form-group">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <label class="form-label" style="margin:0;">Method steps</label>
          <button class="btn-secondary" id="rf-add-step" style="font-size:12px;padding:4px 9px;">
            <i class="ti ti-plus"></i> Add step
          </button>
        </div>
        <div id="rf-step-list">
          ${steps.map((s, i) => stepRowHTML(s, i)).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="rf-notes">Notes / tips</label>
        <textarea class="form-textarea" id="rf-notes" rows="3" placeholder="Substitutions, storage, serving ideas…">${recipe ? escHtml(recipe.notes || '') : ''}</textarea>
      </div>

      <div class="form-footer">
        <button class="btn-ghost" id="rf-cancel">Cancel</button>
        <button class="btn-primary" id="rf-save">
          <i class="ti ti-check"></i> ${isEdit ? 'Save changes' : 'Save recipe'}
        </button>
      </div>
    `;

    App.openModal(isEdit ? 'Edit recipe' : 'New recipe', html);

    /* Tag toggles */
    document.querySelectorAll('#rf-tags .tag-chip').forEach(chip =>
      chip.addEventListener('click', () => {
        const t = chip.dataset.tag;
        if (selectedTags.has(t)) { selectedTags.delete(t); chip.classList.remove('on'); }
        else { selectedTags.add(t); chip.classList.add('on'); }
      })
    );

    /* Add ingredient */
    document.getElementById('rf-add-ing').addEventListener('click', () => {
      const list = document.getElementById('rf-ing-list');
      const idx = list.querySelectorAll('.ingredient-builder-row').length;
      list.insertAdjacentHTML('beforeend', ingredientRowHTML({ name:'', qty:'', unit:'', notes:'' }, idx));
      bindDelIng();
    });

    function bindDelIng() {
      document.querySelectorAll('.btn-del-ing').forEach(btn => {
        btn.onclick = () => {
          btn.closest('.ingredient-builder-row').remove();
          // Renumber handled on save
        };
      });
    }
    bindDelIng();

    /* Add step */
    document.getElementById('rf-add-step').addEventListener('click', () => {
      const list = document.getElementById('rf-step-list');
      const idx = list.querySelectorAll('.step-builder-row').length;
      list.insertAdjacentHTML('beforeend', stepRowHTML('', idx));
      bindDelStep();
    });

    function bindDelStep() {
      document.querySelectorAll('.btn-del-step').forEach(btn => {
        btn.onclick = () => btn.closest('.step-builder-row').remove();
      });
    }
    bindDelStep();

    document.getElementById('rf-cancel').addEventListener('click', App.closeModal);

    document.getElementById('rf-save').addEventListener('click', async () => {
      const name = document.getElementById('rf-name').value.trim();
      if (!name) { App.showToast('Please enter a recipe name', 'error'); return; }

      const ingRows = document.querySelectorAll('#rf-ing-list .ingredient-builder-row');
      const collectedIngredients = [];
      ingRows.forEach(row => {
        const n = row.querySelector('.ing-name').value.trim();
        if (!n) return;
        collectedIngredients.push({
          name:  n,
          qty:   parseFloat(row.querySelector('.ing-qty').value) || null,
          unit:  row.querySelector('.ing-unit').value,
          notes: '',
        });
      });

      const stepRows = document.querySelectorAll('#rf-step-list .step-text');
      const collectedSteps = Array.from(stepRows)
        .map(t => t.value.trim())
        .filter(Boolean);

      const record = {
        ...(recipe || {}),
        name,
        servings:  parseInt(document.getElementById('rf-servings').value) || null,
        prepTime:  parseInt(document.getElementById('rf-prep').value) || null,
        cookTime:  parseInt(document.getElementById('rf-cook').value) || null,
        tags:      [...selectedTags],
        ingredients: collectedIngredients,
        steps:       collectedSteps,
        notes:       document.getElementById('rf-notes').value.trim(),
        updatedAt:   Date.now(),
      };
      if (!isEdit) record.createdAt = Date.now();

      await DB.Recipes.save(record);
      App.closeModal();
      App.showToast(isEdit ? 'Recipe updated' : `${name} saved`, 'success');
      renderGrid();
    });
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Lifecycle ──────────────────────────────────────────── */
  document.addEventListener('viewchange', e => { if (e.detail === 'recipes') renderGrid(); });
  document.addEventListener('datachanged', () => { if (document.getElementById('view-recipes').classList.contains('active')) renderGrid(); });

  buildView();

})();
