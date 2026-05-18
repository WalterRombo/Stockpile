# Stockpile 🥬

Kitchen inventory tracker, recipe library, and (soon) meal planner + shopping list generator.
A progressive web app (PWA) — works offline, installable on mobile and desktop.

---

## Project structure

```
stockpile/
├── index.html              # App shell — nav, modal, views
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline cache)
├── css/
│   └── app.css             # Design tokens + all component styles
├── js/
│   ├── db.js               # IndexedDB data layer (all stores)
│   ├── app.js              # Router, modal, toast, SW registration
│   ├── inventory.js        # Inventory module ✅
│   └── recipes.js          # Recipe library module ✅
│   # ── Coming next ──────────────────────────────
│   # mealplan.js           # Weekly meal planner
│   # shopping.js           # Smart shopping list
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

### Adding the Meal Plan module (when ready)
1. Drop `js/mealplan.js` into the `js/` folder.
2. In `index.html`, uncomment the three `<!-- MEAL PLAN -->` blocks (sidebar button, view section, script tag).
3. Push to `main` — GitHub Actions deploys automatically.

### Adding the Shopping module
Same pattern — uncomment the `<!-- SHOPPING -->` blocks and drop in `js/shopping.js`.

---

## Deploy to GitHub Pages

### First time setup

1. **Create a new GitHub repository** (public or private with Pages enabled on a paid plan).

2. **Initialise and push:**
   ```bash
   cd stockpile
   git init
   git add .
   git commit -m "feat: initial Stockpile build — inventory + recipes"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/stockpile.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repo → **Settings** → **Pages**
   - Under *Source*, select **GitHub Actions**
   - Save

4. The workflow in `.github/workflows/deploy.yml` will run automatically on every push to `main`.
   Your app will be live at:
   ```
   https://YOUR_USERNAME.github.io/stockpile/
   ```

### Subsequent deployments
```bash
git add .
git commit -m "your message"
git push
```
The Actions workflow re-deploys within ~60 seconds.

---

## Local development

No build step needed — plain HTML/CSS/JS.

```bash
# Python (built-in)
cd stockpile
python3 -m http.server 3000

# Node (if preferred)
npx serve .
```
Open `http://localhost:3000` — the service worker requires HTTPS in production but works on localhost.

---

## Data

All data is stored locally in **IndexedDB** — nothing leaves the device.
The app seeds demo data (inventory items + 3 recipes) on first run so you can explore immediately.

**Settings → Clear all data** wipes everything and resets to empty.

---

## PWA installation

| Platform | How to install |
|---|---|
| **iOS Safari** | Share → Add to Home Screen |
| **Android Chrome** | Menu → Add to Home Screen (or install prompt) |
| **Chrome / Edge desktop** | Address bar install icon → Install |

Once installed, the app works fully offline after the first load.

---

## Roadmap

- [x] Inventory module with location tabs + expiry tracking
- [x] Recipe library with ingredient builder + method steps
- [ ] Meal planner — weekly grid, drag recipes into slots
- [ ] Smart shopping list — diff meal plan vs inventory
- [ ] Ocado deep-link / basket export
- [ ] Barcode scanning for quick inventory add
- [ ] Recipe import from URL
