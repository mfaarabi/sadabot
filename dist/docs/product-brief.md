# Kost Rapi — Product Brief

Draft for discussion · 30 October 2026 · About a 2-minute read

## What we want to solve

Managing the family's kost means remembering when rent is due, messaging each tenant, and checking who has paid. Kost Rapi should reduce that mental load through a simple website that keeps the records and prepares timely reminders.

The primary user is the family member managing the kost. Tenants can continue using WhatsApp; they do not need another app.

## What the first usable version should do

| Need | Expected result |
| --- | --- |
| Manage rooms and tenants | Keep room assignments, rent amounts, contact numbers, and 1/3/6/12-month rental terms together, with a total term price, monthly allocation, and calculated renewal deadlines. |
| Know who needs attention | Clearly show upcoming rent, overdue rent, payments awaiting review, and paid rent. |
| Remember to follow up | Send reminders even when the website is closed. Ideally message tenants through WhatsApp; otherwise notify the manager with the recipient and a ready-to-send message. |
| Choose the right message | Select or customize payment, overdue, and renewal templates, including asking whether a tenant wants to keep or change their term. |
| Track payments | Record a transfer covering several months and attach its receipt once. Use a monthly or 12-month ledger to show each month’s charge, paid share, and balance. Confirm payment after review. |
| Keep reliable records | Preserve payment history and let authorized family members access the same records on their devices. |

## How it should feel

Add a tenant and due date → receive a timely reminder → send the prepared message → receive and review a transfer receipt → mark the rent paid → stop further reminders for that bill.

The website should work comfortably on the manager's phone, with clear wording and few steps.

## What we have today

The local interactive prototype has separate collection, verification, and renewal queues, with one shared payment-entry form. It supports follow-up dates, deferred/rejected review, verification undo, renewal answers, and confirmed departure while retaining unpaid obligations. New terms require an explicit saved agreement. It also provides room and tenant management, multiple WhatsApp templates, receipt attachment, and manual payment confirmation using sample data. A total term price is spread across its months: Rp6,000,000 over six months means Rp1,000,000 charged per month. The ledger shows the charge, paid share, and balance for each month; the full transfer stays in its details.

It currently saves changes only in the browser. It does **not** yet send background notifications, automatically message tenants, or share records between devices. The next milestone is reliable reminders and shared records, refined through the manager's feedback.

## Decisions to make together

- When should reminders arrive, and how often should overdue rent be followed up?
- If automatic WhatsApp sending is unavailable, where should the manager receive prepared reminders?
- Are due dates fixed each month or based on the move-in date?
- Do partial payments, utilities, or discounts need support? Full-month payments covering several months are now supported.
- Is a receipt enough to confirm payment, or should the manager check the bank account first?

Working defaults to review: Bahasa Indonesia, rupiah, rent priced per month with selectable rental terms, and a first reminder three days before the due date. Automatic receipt reading, bank reconciliation, and tenant accounts are outside the initial scope.

## How we will know it works

The manager can complete the reminder and payment workflow on her usual phone without help. A reminder reaches her or the tenant while the website is closed, with the correct recipient, amount, and due date. Once payment is confirmed, that bill no longer triggers reminders.

We will start with a small pilot and improve the workflow through short feedback sessions.

For the full scope, user stories, acceptance criteria, and remaining questions, read the [detailed requirements](requirements.md). This brief summarizes that document; it does not add separate requirements.
