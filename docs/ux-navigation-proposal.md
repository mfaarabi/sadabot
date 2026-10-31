# Kost Rapi — Action-based UX and Sitemap Proposal

Status: Implemented in the local prototype; awaiting manager walkthrough  
Date: 30 October 2026  
Scope: Browser-local prototype. GitHub source synchronization is authorized; no Site deployment.

## Recommendation

Organize daily work around the manager's next action. Give each major action its own queue, with status tabs inside that page, plus one overview that summarizes the work.

Use three action pages: **Tagih sewa**, **Verifikasi pembayaran**, and **Perpanjangan sewa**. Keep the ledger and room/tenant records as supporting pages. Avoid a separate top-level page for every status: that would create more navigation and split related work across too many places.

This is a design recommendation based on the current prototype and the family's stated workflow. It still needs a walkthrough with the manager; it is not a claim of usability research already completed.

## What is confusing today

- A payment is entered from the ledger but reviewed from the overview. There is no dedicated verification destination.
- The overview includes operational lists, making it compete with the pages where work is performed.
- Renewal is handled by choosing a chat template and editing tenant data, rather than by following an explicit renewal workflow.
- The month selector applies across pages. An unresolved task can disappear when a different month is selected.
- Status, urgency, and record type are mixed. “Overdue” describes a due date; “awaiting verification” describes a transfer; “renewal pending” describes a tenancy.

## Proposed sitemap

```text
Kost Rapi — manager workspace
├── Ringkasan
│   └── Queue counts, urgent items, and links to filtered action pages
│
├── Tindakan                                      [navigation group, not a page]
│   ├── Tagih sewa
│   │   ├── Perlu dihubungi
│   │   ├── Menunggu pembayaran
│   │   └── Perlu tindak lanjut
│   │
│   ├── Verifikasi pembayaran
│   │   ├── Perlu diperiksa
│   │   ├── Ditunda
│   │   └── Riwayat
│   │
│   └── Perpanjangan sewa
│       ├── Perlu ditanya
│       ├── Menunggu jawaban
│       └── Siap diperbarui
│
├── Catatan                                       [navigation group, not a page]
│   ├── Ledger sewa
│   │   ├── Bulan ini                             [view mode]
│   │   └── 12 bulan                              [view mode]
│   └── Penghuni & kamar
│       ├── Penghuni                              [tab]
│       │   └── Detail penghuni / riwayat sewa
│       └── Kamar                                 [tab]
│
└── Pengaturan pesan
    └── Saved templates and message variables
```

The marketing landing page and the brief/requirements documents remain outside the manager's daily navigation. The manager's application entry point opens Ringkasan.

## Page responsibilities

| Page | Manager's question | Main action | Status or view organization |
| --- | --- | --- | --- |
| Ringkasan | What needs my attention today? | Open the relevant queue | Verification, collection, and renewal counts; concise financial summary |
| Tagih sewa | Who should I contact about unpaid rent? | Prepare and send a reminder | Perlu dihubungi / Menunggu pembayaran / Perlu tindak lanjut |
| Verifikasi pembayaran | Which transfers need checking? | Confirm funds arrived | Perlu diperiksa / Ditunda / Riwayat |
| Perpanjangan sewa | Whose rental term needs a decision? | Ask, record the answer, then renew | Perlu ditanya / Menunggu jawaban / Siap diperbarui |
| Ledger sewa | What is charged, paid, and outstanding each month? | Inspect a monthly allocation or its source transfer | Bulan ini / 12 bulan |
| Penghuni & kamar | Who lives where, and what was agreed? | Add or edit a tenant, room, or agreement | Penghuni / Kamar |
| Pengaturan pesan | What wording should we reuse? | Create or edit a message template | Template list and editor |

## Work queue rules

### Tagih sewa

The unit of work is an unpaid rent bill or term, not an individual monthly ledger allocation. A six-month obligation produces one collection task rather than six duplicate messages.

- **Perlu dihubungi:** unpaid, eligible under the agreed reminder window, with no recorded contact for that obligation.
- **Menunggu pembayaran:** the manager explicitly confirmed sending the reminder; payment or its evidence has not yet arrived.
- **Perlu tindak lanjut:** the manager's follow-up date has arrived and the obligation is still unpaid, with no transfer awaiting review.
- Use due-date filters or badges for **Segera jatuh tempo**, **Jatuh tempo hari ini**, and **Terlambat**. These are urgency indicators, not additional top-level pages.
- Primary row action: **Siapkan pesan** or **Kirim tindak lanjut**.
- Secondary row action: **Catat pembayaran** when the tenant has sent payment information.
- Opening WhatsApp does not advance the task. The manager must confirm that the message was sent.
- When recording a sent message, offer an explicit next follow-up date. A default cadence remains a decision for the family.

### Verifikasi pembayaran

The unit of work is one transfer, including its full coverage range. A transfer paying six months appears once in this queue.

- **Perlu diperiksa:** a transfer has been recorded but not verified.
- **Ditunda:** the manager deliberately deferred the check and recorded a reason. It remains visible and included in unresolved counts.
- **Riwayat:** confirmed payments and review decisions, searchable by tenant and transfer date.
- Primary row action: **Periksa pembayaran**, opening the transfer amount, all covered months, receipt, and notes together.
- Primary confirmation: **Dana masuk · tandai lunas**.
- If the receipt or transfer does not match, record the reason and explicitly return the affected obligation to follow-up; do not silently mark it paid.
- A saved receipt awaiting review pauses collection follow-ups for its covered obligation.
- Confirming the transfer settles all its monthly allocations. Reversing confirmation updates all covered months and preserves the review history.
- This queue includes unresolved transfers from every billing month. It must not depend on the ledger's selected month.

### Perpanjangan sewa

The unit of work is a tenancy's upcoming term end, independent of whether the current rent is paid.

- **Perlu ditanya:** a term is ending within the agreed renewal window, and no renewal question has been confirmed sent.
- **Menunggu jawaban:** the manager confirmed sending the renewal question but has not recorded a decision.
- **Siap diperbarui:** the tenant agreed to continue, and the manager needs to save the new start, tenure, and total price.
- Primary actions progress from **Tanya kelanjutan** to **Catat jawaban** to **Perbarui sewa**.
- A decision not to continue branches to an explicit end-of-tenancy action. Do not create another term or its future charges automatically.
- Renewing is not proof of payment. A new agreement creates the next obligation; collection and verification follow their own workflow.
- Paid tenants may still need renewal follow-up. Do not suppress renewal tasks because a payment is marked paid.

## One shared action: Catat pembayaran

Provide an obvious **Catat pembayaran** entry point in the application header and in the collection queue. Use the same form everywhere.

1. Select the tenant, starting month, and months covered.
2. Review the total transfer and its monthly allocation.
3. Enter the transfer date and attach the receipt, if available.
4. Choose **Simpan untuk diperiksa** or, after verifying the bank transfer, **Dana masuk · tandai lunas**.
5. After saving for review, show **Tersimpan di Verifikasi pembayaran** with a link to open that queue.

This removes the need to know that payment entry previously lived inside the ledger. A confirmed payment belongs in history; an unverified payment belongs in the review queue.

## Overview behavior

Ringkasan is the single overview, not another place to maintain complete lists.

- Put unresolved payment reviews first, followed by urgent collection and upcoming renewal tasks.
- Show a count and a direct queue link for each action, including an honest empty state when there is nothing to do.
- Optionally show up to three urgent tasks across queues, linking to their canonical action page.
- Keep the monthly financial summary small and link to the ledger for detail.
- Label money clearly: monthly rent allocation differs from cash received on a transfer date.
- Operational counts use today's queue state across periods, while any monthly finance summary clearly states its own period.

## Shared details and record ownership

These are shared forms or detail panels, not additional sidebar destinations:

- Draft message and template chooser.
- Record payment and attach receipt.
- Review transfer and its complete allocation.
- Record renewal answer and edit the next agreement.
- Tenant detail with current room, agreement, messages, and payment history.

Keep one underlying record for each bill, transfer, tenancy, and message. The same records can be linked from several pages; do not duplicate them to create a new status.

A tenant does not have one global workflow status. For example, a tenant can have a fully paid current term and still require a renewal answer. Counts must refer to the action's work item, with enough tenant/room/period context to distinguish it.

## Mobile navigation

Show **Ringkasan**, **Tagih**, **Verifikasi**, **Perpanjang**, and **Lainnya** in the bottom navigation. Put Ledger sewa, Penghuni & kamar, and Pengaturan pesan under Lainnya. Keep the full page names in headers and accessible labels.

Avoid hidden settings as in the current collapsed sidebar. Use the same page responsibilities on desktop and mobile.

## Proposed behavior versus existing functionality

The current prototype already has reminder drafts, manual sent confirmation, receipt entry, verification, agreement editing, and monthly allocation. This proposal reorganizes those actions.

Dedicated queue pages, optional follow-up dates, deferred/rejected verification, renewal answers, and end-of-tenancy handling are now available in the local prototype. Collection starts three days before the due date; renewal starts 30 days before term end. Planned departures have a separate tab. Full-month payments are supported; partial payments and overpayments remain unsupported. A new term requires an explicit saved agreement; it is not generated automatically. Nothing in this proposal implies that background sending or notification delivery is already connected.

## Questions for the next walkthrough

- Does the manager naturally separate collecting rent from asking about renewal, or prefer one conversation covering both?
- How early should renewal questions appear, and when should unanswered messages return for follow-up?
- Is Ditunda a useful daily distinction, or should a review simply stay in Perlu diperiksa with a note until completed?
- Can the manager find Catat pembayaran and the resulting verification item without opening the ledger?
- Can she distinguish a paid term awaiting renewal from an unpaid bill awaiting payment?

Walk through these questions with sample cases before changing the application navigation.

## Design reference

See [proposed workflow state machines](workflow-state-machines.md) for events, guards, derived collection states, verification undo, and renewal branches. It records the rules and exceptions used in the local prototype; timing and labels still need validation with the manager.

[Nielsen Norman Group: 8 Design Guidelines for Complex Applications](https://www.nngroup.com/articles/complex-application-design/) supports reducing interface clutter, allowing flexible task sequences, retaining context, and keeping supporting details easy to reach. The specific navigation and status labels above are a proposal tailored to this project's workflow; they have not yet been validated with the manager.
