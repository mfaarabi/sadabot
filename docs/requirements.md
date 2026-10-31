# Kost Rapi — Product Requirements

For a quick overview, start with the [product brief](product-brief.md). This document expands it into scope, user stories, acceptance criteria, and decisions to validate.

Status: Draft for family review  
Last updated: 2026-10-30
Primary user: The family member managing the kost  
Delivery approach: Small web prototype, tested and refined with the primary user

## 1. Problem

The family manages a kost and needs to remember when each tenant's rent is due, contact the tenant, and track whether rent has been paid. Relying on memory and chat history makes it easy to miss a reminder or lose track of payment status.

The product should make it clear who needs attention, prepare the correct reminder for that tenant, and record payment after a transfer receipt is received and reviewed.

## 2. Desired outcomes

- The manager can see which rent payments are due soon, due today, or overdue.
- The manager does not need to remember to open the website every day to discover reminders.
- Each reminder contains the correct recipient, room, billing period, amount, and due date.
- The manager spends less time composing and sending repetitive messages.
- The manager can distinguish an unpaid bill, a received receipt, and a confirmed payment.
- The family can refine the workflow through short prototype and feedback cycles.

## 3. Confirmed needs and proposed defaults

### Confirmed by the user

- A simple website is the starting point.
- The product needs tenant, room, and due-date management.
- Rent reminders should ideally be sent to tenants automatically through WhatsApp.
- If direct WhatsApp integration is difficult, the product should at least send the manager the prepared message and recipient so she can send it herself.
- The product needs a way to mark payments as done after receiving a transfer receipt.
- Prototyping and frequent feedback are central to development.
- The manager can choose from multiple chat templates, including asking whether a tenant wants to keep or change their rental term.
- Rental terms support 3, 6, and 12 months, with deadlines calculated from the term start. Monthly terms remain supported.
- A payment covering several months must appear in each covered monthly payment view.

### Proposed defaults — subject to validation

- Interface language: Bahasa Indonesia; currency: Indonesian rupiah.
- Rent is priced per month; a tenancy has a 1/3/6/12-month term. The current term start and term length determine renewal deadlines.
- Reminder timing starts three days before the due date.
- Only the manager uses the initial product; tenants continue using WhatsApp.
- The manager verifies that funds arrived before marking a payment paid.
- The first operational release supports one kost and full-month allocations. Partial-month payments, discounts, and overpayments still require agreed rules.

These defaults are working assumptions, not requirements already approved by the family.

## 4. Scope and release stages

| Stage | Purpose | Included | Completion condition |
| --- | --- | --- | --- |
| Interactive prototype | Validate the workflow | Sample tenants and rooms; term-based due dates; selectable templates; reminder queue; WhatsApp handoff; multi-month payment allocation; receipt attachment; manual payment confirmation | The manager can walk through the main tasks and give specific feedback |
| Operational MVP | Solve the remembering problem reliably | Durable shared data; protected manager access; scheduled reminders; delivery to the manager through an agreed channel; recipient and message handoff; payment records and receipts | A due reminder reaches the manager while the site is closed, and payment state reliably suppresses unnecessary reminders |
| WhatsApp automation | Reduce manual sending further | Direct scheduled tenant delivery, if the supported integration is practical; delivery status and failure recovery | A reminder reaches the intended tenant once, with observable success or failure |

Direct WhatsApp automation is the preferred outcome. Reliable delivery of a prepared reminder to the manager is an acceptable MVP fallback. The prototype's on-screen queue alone does not satisfy the remembering requirement.

## 5. Main workflow

1. The manager creates a room with its rent amount.
2. The manager assigns a tenant, WhatsApp number, tenancy start date, current term start, and a 1/3/6/12-month term to the room.
3. The system creates a rent obligation for each applicable billing period.
4. At the configured reminder time, the system checks whether the obligation is still unpaid.
5. The system either sends the tenant a WhatsApp reminder or notifies the manager with the recipient and prepared message.
6. If sending manually, the manager reviews the message, opens WhatsApp, sends it, and records that it was sent.
7. After receiving a transfer receipt, the manager attaches it to the correct rent obligation.
8. The manager checks the payment and marks the obligation paid, or leaves it awaiting verification.
9. The system stops further rent reminders for a confirmed paid obligation.

## 6. User stories and acceptance criteria

### US-01 — Manage rooms

As the manager, I want to maintain a list of rooms and rent amounts so that I know what can be rented and how much to collect.

Acceptance criteria:

- I can create and edit a room's unique name or number, monthly rent, and optional notes.
- Rent must be a positive amount in rupiah.
- I can see whether a room is occupied or available.
- Assigning a tenant updates the room's occupancy.
- Changing a room's price does not silently change historical bills or confirmed payments.

### US-02 — Manage tenants and tenancies

As the manager, I want to maintain tenant contact and tenancy details so that reminders go to the correct person for the correct room.

Acceptance criteria:

- I can create and edit a tenant's name and WhatsApp number.
- I can assign an available room and record the move-in date, current term start, and rental term (1/3/6/12 months).
- I can find a tenant by name or room.
- Invalid or missing required contact details are highlighted before saving.
- Indonesian phone numbers entered with `08` or `+62` are normalized for WhatsApp handoff.
- The system prevents conflicting active room assignments under the initial one-tenancy-per-room assumption.
- Ending a tenancy stops future billing and reminders without deleting its history.

### US-03 — Track rent by billing period

As the manager, I want a separate rent record for each billing period so that each payment marks exactly the months it covers.

Acceptance criteria:

- Each obligation identifies the tenancy, billing period, due date, amount due, and payment state.
- I can browse current and previous billing periods.
- A tenancy has a term of 1, 3, 6, or 12 months and an explicit total price for the whole term. The form previews the monthly charge and next renewal deadline.
- The total term price is divided across its months; it is never treated as a monthly price and multiplied again. For example, Rp6,000,000 for six months means Rp1,000,000 charged per month.
- Contract prices are saved with their effective start dates so renewal price changes preserve earlier monthly charges.
- Renewal dates retain the original due day, clamped to the end of shorter months.
- When changing tenure at renewal, the manager records the new term start; earlier payment coverage and amounts are preserved.
- One payment can cover 1–12 consecutive calendar months, beginning in the selected month. The payment stores its total transfer once and allocates equal monthly shares.
- Every covered month displays the same payment record as paid or awaiting verification, as applicable.
- The monthly ledger has separate charge, verified paid allocation, and outstanding balance columns. The whole transfer is shown only in payment details, not repeated in monthly rows.
- A 12-month ledger shows consecutive months side by side, including across year boundaries; selecting a month opens its payment record.
- Monthly totals include only that month’s share, not the whole transfer. The ledger represents rent allocation, not cash received on the transfer date.
- Charges are visible before payment. A verified prepaid transfer offsets each covered month’s charge; an unverified receipt does not.
- Whole-rupiah rounding differences are allocated to the earliest months, so the sum of monthly shares equals the term or transfer total exactly.
- Overlapping payment coverage for the same tenant is rejected, including unverified payments.
- Payment details opened from any covered month show total transfer, full coverage range, and that month’s allocation.
- If a due day does not exist in a month, the proposed default is the last day of that month.
- Unpaid obligations remain visible after their billing month ends.
- The system does not generate obligations outside the tenancy's applicable dates.
- Rules for the first month, final month, and proration must be agreed before real billing begins.

### US-04 — See what needs attention

As the manager, I want a clear overview of outstanding rent so that I know whom to follow up with first.

Acceptance criteria:

- I can distinguish due soon, due today, overdue, awaiting verification, and paid obligations.
- The reminder queue shows tenant, room, billing period, amount, and due date.
- I can filter the queue by urgency and see overdue obligations across billing periods.
- Confirmed paid obligations are excluded from the reminder queue.
- The overview shows collected and outstanding amounts without counting unverified receipts as collected funds.

### US-05 — Prepare a personalized reminder

As the manager, I want a reusable message template so that I do not need to compose the same reminder repeatedly.

Acceptance criteria:

- I can choose among payment reminder, renewal confirmation, and overdue follow-up templates.
- I can create, name, edit, and delete saved templates, retaining at least one template.
- Existing custom template text is retained when upgrading the prototype.
- Templates support tenant name, room, billing period/range, total term rent, due date, tenure, and current term end date.
- A renewal template asks whether the tenant wants to keep the same term or change to 3, 6, or 12 months. It can be prepared even when the current term is already paid.
- Changing the selected template regenerates the draft; the manager can edit it before sending.
- The system fills the message from the selected obligation and shows the recipient's name and number.
- I can review and edit the prepared message before manual sending.
- I can copy the prepared message.
- Missing required recipient or billing data prevents automatic delivery and surfaces a clear action to fix it.

### US-06 — Send manually through WhatsApp

As the manager, I want to open the correct WhatsApp chat with a prepared message so that sending requires minimal effort.

Acceptance criteria:

- The handoff uses the selected tenant's normalized number and the reviewed message.
- Opening WhatsApp does not itself mark the reminder delivered or sent.
- I can explicitly record that I sent the message.
- The system records the obligation, recipient, chosen template, actual edited message, and time of that confirmation.
- I can see earlier reminder attempts before deciding to follow up again.
- The interface clearly distinguishes manual confirmation from integration-reported delivery.

### US-07 — Receive reminders without opening the website

As the manager, I want the system to notify me when rent needs follow-up so that I do not have to remember to check the website.

Acceptance criteria:

- Reminders run on a schedule while the website is closed.
- The manager's notification channel and destination are configured and tested before activation.
- A notification includes the tenant's name, WhatsApp number, room, billing period, amount, due date, and prepared message, or an authenticated link to those details.
- Where supported, the notification provides a direct WhatsApp handoff.
- The system rechecks payment and tenancy status before delivering a reminder.
- A scheduled run does not send the same planned reminder twice, including during retries.
- The manager can see failed attempts and retry them after fixing the cause.
- Timing uses the kost's configured timezone; Asia/Jakarta is the initial proposed default.
- A receipt awaiting verification appears in the manager's review queue; the proposed default is to pause tenant follow-ups until it is reviewed.

### US-08 — Send WhatsApp reminders automatically

As the manager, I want eligible reminders delivered directly to tenants so that routine follow-up needs less manual work.

Priority: Preferred integration; feasibility and release timing to be confirmed.

Acceptance criteria:

- The integration uses a supported WhatsApp sending mechanism.
- The manager can review the message template and reminder schedule before enabling automatic delivery.
- Sending respects the current obligation, payment state, tenancy status, and configured timing.
- The system records attempts and the sending provider's reported statuses.
- A failed attempt is visible and can fall back to manager-assisted sending.
- Retries do not create duplicate reminders.
- Automatic sending can be disabled without losing records or manual reminder functionality.

### US-09 — Record a transfer receipt

As the manager, I want to attach a received transfer receipt to the correct bill so that payment evidence is easy to find.

Acceptance criteria:

- I can select the tenant, first covered month, and number of months paid; enter the transfer date and total amount; add a note; and attach a receipt.
- The form defaults to the tenant’s term and calculates the expected total as the sum of agreed monthly ledger charges, showing each month’s allocation before saving.
- The prototype supports 1–12 months and requires the total transfer to match the sum of the agreed charges for those months.
- A receipt is attached once to the transfer and is accessible from each covered month.
- Accepted file types and size limits are shown before upload; invalid files produce a clear error.
- I can open the attached receipt while reviewing the payment.
- Saving a receipt creates an awaiting-verification state and does not silently confirm that funds arrived.
- Payment evidence survives a refresh and, in the operational MVP, is available to authorized managers on other devices.
- Manual attachment is sufficient initially; automatic receipt ingestion from WhatsApp is not required for the MVP.

### US-10 — Confirm or correct a payment

As the manager, I want to confirm payment after reviewing the transfer so that the rent record reflects what has actually been received.

Acceptance criteria:

- I can mark a rent obligation paid after checking the transfer.
- Confirmation records the amount, transfer date, confirmation time, and confirming manager.
- Confirmed payment updates the collected total and stops subsequent rent reminders for that obligation.
- I can correct an accidental confirmation without deleting its receipt or correction history.
- Confirming or reversing a multi-month payment updates every month covered by that transfer. The interface explains that the action affects the full coverage range.
- A duplicate submission does not count the same payment twice.
- An unmatched amount is flagged for review rather than silently treated as full payment.
- Multi-month transfers use agreed monthly charges, divided from the total term price with whole-rupiah rounding when necessary. Partial payments, overpayments, and discounts remain outside the prototype until allocation rules are agreed.

### US-11 — Keep records protected and recoverable

As the family, we want reliable access to rent records so that device loss or an accidental edit does not erase our working history.

Acceptance criteria for the operational MVP:

- Tenant details and payment evidence require authorized manager access.
- Records are stored durably and remain available across the family's authorized devices.
- The manager can export core records in a documented format.
- A backup and recovery process is defined and tested before operational use.
- Saving, uploading, and delivery failures are visible; the interface does not claim success when persistence or delivery failed.
- Payment confirmations and corrections retain a basic audit history.

## 7. Minimum data model

| Entity | Minimum information |
| --- | --- |
| Property | Name, timezone |
| Room | ID, unique room label within property, default monthly rent, notes |
| Tenant | ID, name, WhatsApp number |
| Tenancy | ID, tenant, room, start/end dates, current term start, term length, total term price, effective-dated price agreements, recurring due rule |
| Rent obligation | ID, tenancy, billing period, due date, amount due, state |
| Payment | ID, tenant/obligation, first covered month, number of covered months, total transfer, monthly allocation, transfer date, verification state, notes, confirmation details |
| Receipt | ID, payment, file reference, file metadata |
| Reminder | ID, obligation, recipient, rendered message, scheduled time, channel, attempt status, sent/delivery timestamps |
| Settings | Message template, reminder timing, manager notification destination, automatic-sending preference |

Keep rent obligations separate from payments and reminder attempts. A receipt is evidence associated with a payment, not proof by itself that the rent is settled.

## 8. State and business rules

### Payment state

`Unpaid → Awaiting verification → Paid`

- A payment may be confirmed directly when the manager has already verified the transfer.
- A mistaken confirmation can return to awaiting verification, retaining a correction record.
- Due soon and overdue describe the obligation's timing; they are not payment verification states.

### Reminder state

`Scheduled → Prepared → Manually confirmed sent / Provider accepted → Delivered, if reported`

- Failures are recorded separately and can be retried.
- Opening a chat, provider acceptance, and confirmed delivery are different events.
- Reminder history remains available after payment.

### Proposed scheduling defaults

- First reminder: three days before the due date.
- Reminder on the due date: to be confirmed.
- Overdue follow-up cadence and sending hours: to be confirmed.
- No reminders after payment confirmation or after the relevant tenancy has ended.
- No repeated automatic attempts without deduplication and an explicit retry policy.

## 9. Experience requirements

- Optimize the main tasks for a phone, while keeping desktop usable.
- Use clear Bahasa Indonesia and rupiah formatting unless feedback suggests otherwise.
- Make tenant, room, amount, billing period, and payment state visible before a consequential action.
- Keep the reminder and receipt workflows short and understandable without technical knowledge.
- Clearly label sample data, manual actions, and features that are not connected yet.
- Provide readable text, labeled controls, keyboard navigation, and clear validation errors.

## 10. Current prototype versus operational requirements

The current implementation is a feedback tool, not a completed operational MVP.

| Capability | Current prototype | Still needed for operational use |
| --- | --- | --- |
| Rooms and tenants | Create/edit, renewal answers, explicit successor agreements, confirmed departure and room release | Retained room assignment history and exception handling |
| Rent periods | Monthly/12-month ledgers, total term pricing, effective-dated agreements, unresolved cross-period collection; explicit term creation | Shared durable records and exception handling |
| Reminder preparation | Separate collection/renewal queues; editable templates; WhatsApp handoff; manual sent history; optional follow-up dates | Validate three-day collection and 30-day renewal windows; complete delivery history |
| Reminder automation | On-screen queue only | Background scheduler and manager notifications; optional direct tenant delivery |
| Payments | Shared multi-month entry; review/defer/reject, confirmation, undo/correction history; overlap prevention | Durable storage, manager attribution, refunds and agreed exception handling |
| Receipts | Browser-local image attachment, up to 1 MB per file | Protected shared storage and recovery |
| Data | Browser localStorage; JSON export | Shared database, backup, and tested recovery |
| Access | Private hosted site | Confirm family access and application-level authorization needs |

The workflow changes are local only; the published prototype remains at its previous version. Limitations include no prorated exit-month charges, refunds, partial payments or discounted-payment allocation, no automatic receipt reading, and no notification delivery while the site is closed. Planned departure stops later charges when departure is confirmed; unresolved old rent remains in collection. Local browser storage is not the intended long-term storage design.

## 11. Decisions to validate with the manager

| Question | Why it matters |
| --- | --- |
| How many rooms, properties, and managers are involved? | Sets scope and access needs. |
| Is the due date a fixed day each month, based on move-in date, or something else? | Determines the billing rule. |
| Can one room have multiple tenants or recipients? | Determines tenancy and reminder targeting. |
| When should reminders arrive, and how often should overdue tenants be followed up? | Determines scheduling and avoids excessive messaging. |
| If direct tenant WhatsApp sending is unavailable, where should the manager receive reminders? | The fallback must reach her without opening the website. |
| Should receipts awaiting verification pause follow-ups? | Prevents unwanted messages while preserving visibility of unconfirmed funds. |
| Is receipt arrival enough to mark paid, or must bank receipt be checked first? | Confirms the proposed manual-verification policy. |
| Are there partial payments, deposits, utilities, or discounts? | Multi-month transfers are supported; these exceptions still need allocation rules. |
| What happens for mid-month move-in, move-out, and rent changes? | Prevents incorrect obligations. |
| What bank/payment details should a reminder include? | Completes the message content. |
| How does the manager currently receive and organize receipts? | Determines whether manual attachment is practical. |
| What existing records need importing? | Determines onboarding effort and migration needs. |

## 12. Prototype feedback plan

Ask the manager to complete these tasks on her usual phone:

1. Add a room and a tenant with a due date.
2. Find a tenant whose rent is due and prepare a reminder.
3. Review the recipient and wording, then explain how she would send it.
4. Record a received receipt and distinguish it from a confirmed payment.
5. Confirm payment and check that the tenant no longer needs a rent reminder.
6. Correct an accidental payment confirmation.
7. Describe how she expects to hear about tomorrow's reminders while the website is closed.
8. Set a 3/6/12-month tenure and check the calculated renewal deadline.
9. Choose the renewal chat template and check the personalized term question.
10. Enter a six-month term price of Rp6,000,000 and verify Rp1,000,000 charged in each monthly ledger column before payment.
11. Record and confirm that six-month transfer, browse all covered months, and verify Rp1,000,000 paid and Rp0 remaining in each.
12. Change the renewal price and confirm that earlier monthly charges remain unchanged.

Use sample numbers during testing; sending actual tenant messages is unnecessary for workflow validation.

For each session, record:

- Task attempted and whether it was completed without help.
- Confusing wording, missing information, and unnecessary steps.
- Any mismatch with the family's actual billing or payment process.
- The proposed change, its priority, and how it will be checked in the next session.

## 13. MVP completion criteria

The operational MVP is ready when:

- The manager can maintain real rooms, tenants, and tenancy due rules.
- Rent obligations are correct for the agreed billing cases and retain their history.
- A scheduled reminder reaches the agreed recipient while the website is closed.
- The recipient, amount, billing period, and due date match the underlying obligation.
- The manual WhatsApp fallback is usable if direct integration is unavailable.
- A received receipt can be reviewed and payment confirmation stops future reminders.
- Failed delivery, duplicate runs, incorrect confirmation, and persistence failures have been exercised.
- Authorized family members can use the same records on their devices.
- Backup and recovery have been checked.
- The primary manager has completed the main workflow on her phone and accepted it for a small real-world pilot.

## 14. Deferred unless feedback changes priority

- Tenant accounts or a tenant-facing portal.
- Automatic receipt OCR and bank reconciliation.
- Accounting, tax reporting, and expense management.
- Online payment collection.
- Maintenance requests and other property-management workflows.
- Advanced multi-property administration.

Direct WhatsApp sending remains a preferred product capability; it is not a prerequisite for the fallback MVP if the manager reliably receives prepared reminders.
