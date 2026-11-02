# Kost Rapi

Product documentation: [short product brief](docs/product-brief.md) · [detailed requirements](docs/requirements.md).

Browser-local prototype for managing a family kost. Bahasa Indonesia, IDR, responsive layout. Includes rooms and tenants, monthly and 12-month rent ledgers with charge/paid/balance columns, explicit total term pricing spread across months, 1/3/6/12-month tenure with renewal deadlines, independent collection, payment-verification, and renewal queues, multiple editable WhatsApp templates, receipt attachment and manual payment verification, and JSON export.

The landing page is at `/`; the interactive prototype is at `/app.html`. Readable project documents are at `/brief.html` and `/requirements.html`. After editing Markdown, run `python3 scripts/render-docs.py` to update their web versions and downloads.

Run locally (requires Python 3 and Make; no dependency installation needed):

```sh
make dev
```

Open http://127.0.0.1:4173/app.html for the manager, or http://127.0.0.1:4173/ for the landing page. Stop with Ctrl+C and refresh the browser after editing files; there is no automatic reload.

To choose another port, use `make dev PORT=5173`. Browser data is tied to the host and port, so changing either opens a separate local dataset.

Data is stored in localStorage on this browser and origin. The Cloudflare deployment has a shared login gate; the local Python preview has no authentication. No shared database, background jobs, automatic WhatsApp delivery, bank reconciliation, or receipt OCR. Sample phone numbers must be replaced before sending. Click-to-chat opens WhatsApp; sending remains manual. Payment reviews are tracked per transfer, with allocations to covered months; receipts are limited to 1 MB each, subject to browser storage limits. A single transfer can cover 1–12 consecutive months and is allocated to covered monthly views using the agreed term pricing; overlapping coverage is blocked. Confirming or reversing a transfer updates all covered months. Existing browser records and custom template text are migrated in memory without replacing stored data. Agreed total term prices are saved with effective dates; renewal price changes preserve earlier monthly charges. Legacy room prices retain their previous monthly meaning during migration, and recorded transfers are preserved. Whole-rupiah rounding is allocated to early months so totals reconcile. Renewal decisions, explicit successor agreements, confirmed departures, and historical unpaid obligations are supported. Proration, installments, overpayments, and refunds are not implemented. Receipts require human bank verification. This is a feedback prototype, not production financial storage.

Verify billing and workflow rules with `node scripts/test-billing.cjs` and `node scripts/test-workflows.cjs`.

Source: `dist/index.html`, `dist/app.html`, `dist/style.css`, `dist/billing.js`, `dist/workflows.js`, `dist/workflow-ui.js`, `dist/app.js`.

Deploy on Cloudflare by importing `mfaarabi/sadabot` (branch `master`): build command `npm run build`, deploy command `npm run deploy`, root directory `/`. See [Cloudflare deployment instructions](docs/cloudflare-deployment.md) for the password gate and dashboard setup.
