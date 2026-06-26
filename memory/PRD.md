# StitchLog Suite v5 — Bayne Edition · PRD

## Original problem statement
Build a factory floor production logging system for a garment workshop with: worker PIN kiosk + admin id/password login, deterministic time-to-cost engine, leave classification, concurrency caps, tabular log matrix, financial reports with CSV export, all persisted in localStorage (5 keys, no backend).

## User choices (verbatim)
- Deploy as the standard /app/frontend React app.
- localStorage / web-based local-domain only (no backend).
- Fix the syntax errors from the source paste.
- Add beyond the spec where useful.
- Refresh the design (new visual identity).

## Architecture
- Single-file React component at `/app/frontend/src/App.js` (no router, no backend calls).
- `index.css` loads Cabinet Grotesk (Fontshare) + IBM Plex Sans/Mono (Google Fonts).
- Two-mode theming: tactile off-white "paper" for admin, high-contrast "ink" black for worker terminal.
- 5 localStorage keys: `sl_emp_v5`, `sl_prod_v5`, `sl_jobs_v5`, `sl_lv_v5`, `sl_hol_v5`.
- `lucide-react` icons (already installed).

## Implemented (Jun 2026)
- Editorial split-screen landing (Worker Terminal ↔ Admin Vault).
- Admin login (admin1/password123 · admin2/supervisordash) + worker PIN kiosk.
- Admin sidebar nav: Overview / Personnel / Lots / Calendar / Daily work done / Audit & ledger / Data vault.
- Personnel CRUD with inline edit, role pill, active toggle, kiosk PIN.
- Productions CRUD with status pill cycling (Active → Only Packing Pending → Completed).
- Calendar / holidays manager with Sunday auto-off notice.
- Job Cards workspace ("Daily work done"):
  - Cascading Product → Batch selectors.
  - Categories: Production / General / R&D / Leave.
  - HH:MM dual-select TimePicker.
  - Open / close card flow with shift-window + collision + cap validation.
  - Leave logging with auto-classification (Full / Half / Hourly).
  - 09:00–21:00 timeline gap audit chips.
  - Tabular log matrix with ₹ outlay column **hidden for workers**.
  - Lunch (13:00–14:00) auto-excluded from net minutes.
- Reports / Audit:
  - Cost ledger per production with admin override (TimePicker + "⚠ Corrected" badge).
  - Lots matrix dashboard with date+status filters and CSV export.
  - Exceptions panel with unlogged-gap and leaves register.
- KPI dashboard tiles + today snapshot panel.

## Beyond-spec additions
- **Data Vault**: full JSON backup export, restore-from-file, and wipe-&-reseed.
- **Admin daily summary card** on jobcards (net minutes + outlay per worker for the chosen date).
- **Today snapshot** on dashboard (outlay today, net minutes, leaves today).
- Distinct two-mode theming (paper / ink) replacing the original slate+teal aesthetic.

## Testing (iteration_1)
Smoke pass: landing CTAs, admin login (good + bad), KPI tiles, full sidebar nav, Employees CRUD with persistence (all 5 localStorage keys present), logout. One naming-mismatch noted on worker identity select (functionally working). Remaining QA paths deferred — happy to expand on request.

## Test credentials
- Admin: admin1 / password123 · admin2 / supervisordash
- Worker PINs: Arun Kumar 1234 · Sarah Thomas 5678 · Rahul Vignesh 1111 · Priya Lakshmi 2222

## Backlog (P1/P2)
- Optional FastAPI+Mongo backend mirror for multi-device sync.
- Biometric (face/fingerprint) kiosk login on top of PIN.
- Per-worker monthly attendance & payroll PDF export.
- Material-cost layer on top of labor cost in per-piece reporting.
- Live shipping/Amazon FBA generation hook.
