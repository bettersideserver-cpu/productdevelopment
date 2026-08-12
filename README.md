# Real Estate Inventory System — Dummy Project

A GitHub Pages-ready prototype for an SVG floor-plan inventory system.

## What is included

- `index.html` — building/floor selection
- `floor-01.html`, `floor-02.html`, `floor-03.html` — dummy SVG floor plans
- `admin.html` — inventory admin panel
- `js/config.js` — Supabase configuration
- `js/db.js` — database adapter with Demo Mode + Supabase mode
- `js/floor.js` — floor SVG coloring, hover tooltip and realtime updates
- `js/admin.js` — admin inventory editor
- `js/demo-data.js` — dummy inventory data
- `supabase.sql` — PostgreSQL schema, seed data and RLS
- `css/styles.css` — shared styling

## Demo Mode

The project starts in Demo Mode so it works immediately without a Supabase account.

Open `index.html` through a local web server. For example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

Open `admin.html` and a floor page in separate browser tabs. Change a unit status and save it. The demo uses `localStorage` + `BroadcastChannel` to simulate shared updates between tabs.

## Supabase Mode

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase.sql`.
4. Open `js/config.js`.
5. Set `USE_SUPABASE = true`.
6. Add your project URL and publishable key.
7. Enable Realtime for the `units` table.
8. Create an authenticated admin user before allowing production writes.

Supabase's browser client uses the project URL and publishable key; never put a secret/service-role key in GitHub/browser code.

## SVG ID convention

Use:

`FLOOR_UNITTYPE_UNITNUMBER`

Examples:

- `F01_APARTMENT_A101`
- `F01_APARTMENT_A102`
- `F01_SHOP_S001`
- `F02_OFFICE_B201`

The floor page uses the exact SVG `id` to match the corresponding database row.

## Intended production flow

SVG -> `svg_id` -> database unit -> status -> color + tooltip

Admin change -> database update -> Realtime event -> open floor page updates without refresh.


## Dynamic status legend

The floor-selection `index.html` now loads active status categories from the same database/demo store used by the admin panel. Adding a status in Admin will therefore make it appear automatically in the index legend after the page is refreshed.
