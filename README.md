# Kost Rapi

Product documentation: [short product brief](docs/product-brief.md) · [detailed requirements](docs/requirements.md).

Browser-local prototype for managing a family kost. Bahasa Indonesia, IDR, responsive layout. Includes rooms and tenants, calendar-month rent allocation, 1/3/6/12-month tenure with renewal deadlines, an H−3 reminder queue, multiple editable WhatsApp templates, receipt attachment and manual payment verification, and JSON export.

The landing page is at `/`; the interactive prototype is at `/app.html`. Readable project documents are at `/brief.html` and `/requirements.html`. After editing Markdown, run `python3 scripts/render-docs.py` to update their web versions and downloads.

Run `python3 -m http.server 5173 --directory dist`, then open http://localhost:5173.

Data is stored in localStorage on this browser and origin. No authentication, shared database, background jobs, automatic WhatsApp delivery, bank reconciliation, or receipt OCR. Sample phone numbers must be replaced before sending. Click-to-chat opens WhatsApp; sending remains manual. Payment state is tracked per tenant and month; receipts are limited to 1 MB each, subject to browser storage limits. A single transfer can cover 1–12 consecutive months and is allocated equally to covered monthly views; overlapping coverage is blocked. Confirming or reversing a transfer updates all covered months. Existing browser records and custom template text are migrated in memory without replacing stored data. Current room rent is used for unpaid periods; historical price schedules, proration, installments, move-outs, and arrears carryover are not implemented. Receipts require human bank verification. This is a feedback prototype, not production financial storage.

Verify billing rules with `node scripts/test-billing.cjs`.

Source: `dist/index.html`, `dist/app.html`, `dist/style.css`, `dist/billing.js`, `dist/app.js`.
