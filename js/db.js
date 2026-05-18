/* ═══════════════════════════════════════════════════════════
   db.js  — IndexedDB data layer for Stockpile
   Exposes: window.DB
   ═══════════════════════════════════════════════════════════ */
(() => {
  const DB_NAME    = 'stockpile-db';
  const DB_VERSION = 1;

  let _db = null;

  /* ── Open / upgrade ─────────────────────────────────────── */
  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const db = e.target.result;

        /* Inventory items */
        if (!db.objectStoreNames.contains('items')) {
          const store = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
          store.createIndex('location', 'location', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }

        /* Recipes */
        if (!db.objectStoreNames.contains('recipes')) {
          const store = db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
          store.createIndex('name', 'name', { unique: false });
        }

        /* Meal plan — slot for future module
           key: "YYYY-Www-day-meal" e.g. "2025-W20-1-dinner" */
        if (!db.objectStoreNames.contains('mealplan')) {
          db.createObjectStore('mealplan', { keyPath: 'slotKey' });
        }

        /* Shopping list — slot for future module */
        if (!db.objectStoreNames.contains('shopping')) {
          db.createObjectStore('shopping', { keyPath: 'id', autoIncrement: true });
        }
      };

      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  /* ── Generic helpers ────────────────────────────────────── */
  function tx(stores, mode = 'readonly') {
    return _db.transaction(stores, mode);
  }

  function promisify(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function getAll(storeName, indexName, query) {
    return open().then(() => {
      const t = tx(storeName);
      const store = t.objectStore(storeName);
      const source = indexName ? store.index(indexName) : store;
      return promisify(source.getAll(query));
    });
  }

  function get(storeName, key) {
    return open().then(() =>
      promisify(tx(storeName).objectStore(storeName).get(key))
    );
  }

  function put(storeName, record) {
    return open().then(() =>
      promisify(tx(storeName, 'readwrite').objectStore(storeName).put(record))
    );
  }

  function del(storeName, key) {
    return open().then(() =>
      promisify(tx(storeName, 'readwrite').objectStore(storeName).delete(key))
    );
  }

  function clear(storeName) {
    return open().then(() =>
      promisify(tx(storeName, 'readwrite').objectStore(storeName).clear())
    );
  }

  /* ── INVENTORY API ──────────────────────────────────────── */
  const Items = {
    getAll: (location) => location
      ? getAll('items', 'location', location)
      : getAll('items'),
    get:    (id)     => get('items', id),
    save:   (item)   => put('items', item),
    delete: (id)     => del('items', id),
    clear:  ()       => clear('items'),
  };

  /* ── RECIPES API ────────────────────────────────────────── */
  const Recipes = {
    getAll: () => getAll('recipes'),
    get:    (id)     => get('recipes', id),
    save:   (recipe) => put('recipes', recipe),
    delete: (id)     => del('recipes', id),
    clear:  ()       => clear('recipes'),
  };

  /* ── MEAL PLAN API (stub — ready for mealplan.js) ────────── */
  const MealPlan = {
    getSlot:  (key)    => get('mealplan', key),
    setSlot:  (slot)   => put('mealplan', slot),    /* slot must have .slotKey */
    getAll:   ()       => getAll('mealplan'),
    clear:    ()       => clear('mealplan'),
  };

  /* ── SHOPPING API (stub — ready for shopping.js) ─────────── */
  const Shopping = {
    getAll: () => getAll('shopping'),
    save:   (item) => put('shopping', item),
    delete: (id)   => del('shopping', id),
    clear:  ()     => clear('shopping'),
  };

  /* ── Seed demo data (first run) ─────────────────────────── */
  async function seedIfEmpty() {
    const existing = await Items.getAll();
    if (existing.length > 0) return;

    const demoItems = [
      { name:'Oat milk',       location:'fridge',   qty:1.2,  unit:'L',      expiryDate:'2025-05-17', notes:'' },
      { name:'Silken tofu',    location:'fridge',   qty:2,    unit:'blocks',  expiryDate:'2025-05-18', notes:'' },
      { name:'Mixed greens',   location:'fridge',   qty:200,  unit:'g',       expiryDate:'2025-05-16', notes:'' },
      { name:'Vegan butter',   location:'fridge',   qty:180,  unit:'g',       expiryDate:'2025-06-03', notes:'' },
      { name:'Lemon',          location:'fridge',   qty:3,    unit:'',        expiryDate:'',           notes:'' },
      { name:'Edamame',        location:'freezer',  qty:500,  unit:'g',       expiryDate:'',           notes:'' },
      { name:'GF bread',       location:'freezer',  qty:1,    unit:'loaf',    expiryDate:'',           notes:'' },
      { name:'Frozen peas',    location:'freezer',  qty:800,  unit:'g',       expiryDate:'',           notes:'' },
      { name:'Brown rice',     location:'dry',      qty:1.5,  unit:'kg',      expiryDate:'',           notes:'' },
      { name:'GF pasta',       location:'dry',      qty:400,  unit:'g',       expiryDate:'',           notes:'' },
      { name:'Tinned tomatoes',location:'dry',      qty:4,    unit:'cans',    expiryDate:'',           notes:'' },
      { name:'Chickpeas',      location:'dry',      qty:2,    unit:'cans',    expiryDate:'',           notes:'' },
      { name:'Quinoa',         location:'dry',      qty:250,  unit:'g',       expiryDate:'',           notes:'' },
      { name:'Smoked paprika', location:'spices',   qty:1,    unit:'jar',     expiryDate:'',           notes:'' },
      { name:'Cumin',          location:'spices',   qty:1,    unit:'jar',     expiryDate:'',           notes:'' },
      { name:'Turmeric',       location:'spices',   qty:1,    unit:'jar',     expiryDate:'',           notes:'' },
      { name:'Nutritional yeast',location:'spices', qty:120,  unit:'g',       expiryDate:'',           notes:'' },
      { name:'Sparkling water',location:'drinks',   qty:6,    unit:'bottles', expiryDate:'',           notes:'' },
      { name:'Kombucha',       location:'drinks',   qty:3,    unit:'bottles', expiryDate:'2025-05-18', notes:'' },
    ];

    const demoRecipes = [
      {
        name: 'Roasted Chickpea & Quinoa Bowl',
        servings: 2, prepTime: 10, cookTime: 30,
        tags: ['VG','GF'],
        ingredients: [
          { name:'Chickpeas',       qty:1,   unit:'can',  notes:'drained and rinsed' },
          { name:'Quinoa',          qty:150, unit:'g',    notes:'' },
          { name:'Smoked paprika',  qty:1,   unit:'tsp',  notes:'' },
          { name:'Olive oil',       qty:2,   unit:'tbsp', notes:'' },
          { name:'Mixed greens',    qty:80,  unit:'g',    notes:'' },
          { name:'Lemon',           qty:1,   unit:'',     notes:'juiced' },
        ],
        steps: [
          'Preheat oven to 200°C. Drain and dry chickpeas thoroughly.',
          'Toss chickpeas with olive oil and smoked paprika. Roast for 25–30 minutes until crispy.',
          'Cook quinoa according to packet instructions.',
          'Assemble bowl with quinoa, greens, and roasted chickpeas. Dress with lemon juice.',
        ],
        notes: 'Swap chickpeas for cannellini beans for variety.',
      },
      {
        name: 'Lemon Tofu Stir-Fry',
        servings: 2, prepTime: 10, cookTime: 20,
        tags: ['VG','GF'],
        ingredients: [
          { name:'Silken tofu',     qty:200, unit:'g',    notes:'pressed and cubed' },
          { name:'Brown rice',      qty:150, unit:'g',    notes:'' },
          { name:'Edamame',         qty:100, unit:'g',    notes:'shelled' },
          { name:'Lemon',           qty:1,   unit:'',     notes:'zest and juice' },
          { name:'Tamari',          qty:2,   unit:'tbsp', notes:'' },
          { name:'Sesame oil',      qty:1,   unit:'tbsp', notes:'' },
        ],
        steps: [
          'Cook brown rice and keep warm.',
          'Press tofu and cube. Pan-fry in sesame oil until golden on all sides.',
          'Add edamame, tamari, lemon zest, and juice. Toss and cook 2 minutes.',
          'Serve over brown rice.',
        ],
        notes: 'Firm tofu works better if you want more texture.',
      },
      {
        name: 'Spiced Lentil Dahl',
        servings: 4, prepTime: 10, cookTime: 40,
        tags: ['VG','GF'],
        ingredients: [
          { name:'Red lentils',     qty:300, unit:'g',    notes:'rinsed' },
          { name:'Tinned tomatoes', qty:1,   unit:'can',  notes:'' },
          { name:'Coconut milk',    qty:1,   unit:'can',  notes:'' },
          { name:'Cumin',           qty:2,   unit:'tsp',  notes:'' },
          { name:'Turmeric',        qty:1,   unit:'tsp',  notes:'' },
          { name:'Smoked paprika',  qty:1,   unit:'tsp',  notes:'' },
          { name:'Olive oil',       qty:1,   unit:'tbsp', notes:'' },
        ],
        steps: [
          'Heat oil in a large pan. Add cumin and fry 30 seconds until fragrant.',
          'Add turmeric and paprika, stir for 30 seconds.',
          'Add lentils, tomatoes, coconut milk, and 200ml water. Stir well.',
          'Simmer on low heat for 30–35 minutes, stirring occasionally, until lentils are fully soft.',
          'Season and serve with rice or GF bread.',
        ],
        notes: 'Freezes very well — make a double batch.',
      },
    ];

    for (const item of demoItems) await Items.save(item);
    for (const recipe of demoRecipes) await Recipes.save(recipe);
  }

  /* ── Clear all stores ───────────────────────────────────── */
  async function clearAll() {
    await Items.clear();
    await Recipes.clear();
    await MealPlan.clear();
    await Shopping.clear();
  }

  /* Expose */
  window.DB = { open, seedIfEmpty, clearAll, Items, Recipes, MealPlan, Shopping };
})();
