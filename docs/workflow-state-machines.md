# Kost Rapi — proposed workflow state machines

Status: Implemented in the local prototype; working defaults await manager review.  
Date: 30 October 2026  
Related: [Navigation proposal](ux-navigation-proposal.md)

Model three independent workflows: a rent obligation, a transfer, and a term-end renewal decision. A tenant can have work in all three at once. Monthly ledger allocations are accounting entries, not separate collection or review tasks.

## 1. Rent collection

One obligation represents the total agreed price for one rental term. Its monthly charges retain their effective-dated agreement and sum to that total.

Persist the contact stage (`not_contacted` or `contacted`), confirmed message events, and an optional next follow-up date. Derive the displayed collection state from these records and current payment allocations. Do not persist a second independent “paid” flag.

Evaluate the following rules in order:

| Condition | Displayed state | Queue behavior |
| --- | --- | --- |
| Verified allocations cover the obligation in full | Settled | Remove from active collection |
| Remaining balance is fully covered by transfers needing review or deferred | Under review | Pause reminders; link to the existing transfer reviews |
| A balance remains uncovered and its follow-up date has arrived | Perlu tindak lanjut | Show once in collection |
| A balance remains uncovered and a message was confirmed sent | Menunggu pembayaran | Show once in collection |
| A balance remains uncovered, reminder window is open, and no message was confirmed sent | Perlu dihubungi | Show once in collection |
| Otherwise | Outside reminder window | Keep accessible through records/ledger |

“Under review” and “Settled” explain the obligation's condition; they do not need additional collection tabs. Due soon, due today, and overdue are date-derived badges on the same obligation. A follow-up date can become due independently of the rent due date.

| Event | Guard | Result |
| --- | --- | --- |
| Open WhatsApp / prepare a message | Valid recipient and message | No state change |
| Confirm message sent | Manager explicitly confirms sending | Append message event; mark contacted; save chosen next follow-up date |
| Record transfer | Valid amount and explicit allocation to obligations | Recompute covered and uncovered balances; create one transfer review |
| Verify / reject / reopen a transfer | See transfer rules below | Recompute collection state from all transfers |
| Reschedule follow-up | Unsettled obligation; valid date | Save the date; recompute the relevant collection tab |

Partial payments reduce the balance without settling the obligation. A pending transfer pauses collection only for its allocated amount: a small pending transfer must not hide a larger uncovered balance. The reminder should clearly distinguish the uncovered amount from money still being checked. Keep one collection row per obligation, with links to all related transfers.

After rejection or verification undo, preserve the prior contact history and schedule. If the rejected/reopened amount leaves an uncovered balance, recommend immediate follow-up unless another pending transfer covers it. This recommendation needs manager review before implementation.

## 2. Transfer verification

One transfer has one review state and an explicit allocation across one or more obligations/months. A transfer covering six months appears once in verification; its allocations link back to that transfer.

| Current state | Event | Next state | Guard / effect |
| --- | --- | --- | --- |
| No transfer | Save for review | `needs_review` | Positive amount, transfer date, tenant, and valid allocations |
| No transfer | Confirm funds received | `verified` | Same validation plus explicit bank-confirmation action |
| `needs_review` | Defer | `deferred` | Require reason; optionally save review date |
| `deferred` | Resume review | `needs_review` | Preserve deferral history |
| `needs_review` / `deferred` | Confirm funds received | `verified` | Explicit confirmation; atomically apply every allocation |
| `needs_review` / `deferred` | Reject | `rejected` | Require reason; release pending coverage; retain receipt and decision |
| `verified` | Undo verification | `needs_review` | Explicit action with reason; atomically reverse verified allocations |
| `rejected` | Reopen review | `needs_review` | Explicit correction with reason; revalidate allocations |

Undo verification means “check this transfer again,” so it resumes pending coverage and pauses reminders for that amount. If funds were never received, the manager must reject it to release that coverage. Do not both reopen and silently treat the transfer as rejected.

The active queue contains `needs_review` and `deferred` across all months. “Riwayat” is a view of completed reviews and review events, not a state. Verified/rejected transfers appear there; a reopened transfer returns to the active queue while its earlier decisions remain in history.

Allocation rules:

- Allocations must sum exactly to the transfer amount. If overpayments/credit are supported later, record the excess explicitly rather than dropping it or forcing it into rent.
- Pending and verified allocations must not double-cover the same outstanding amount. Reopening an old transfer must revalidate coverage if a replacement payment has already settled it.
- Rejected transfers contribute no pending or verified coverage.
- Prevent double submission from creating duplicate verification effects. Repeated confirmation of an already verified transfer has no accounting effect.
- Correcting a verified amount or coverage requires reopening first. Retain the previous values in the audit trail.
- A missing receipt does not imply rejection: the existing payment-entry proposal allows a receipt when available. Verification still requires checking the bank transfer.

## 3. Renewal decision

One renewal record belongs to the ending agreement, not to the tenant globally. Create at most one successor agreement from it. Payment status does not change the renewal state.

| Current state | Event | Next state | Guard / effect |
| --- | --- | --- | --- |
| Outside window | Renewal window opens | `needs_asking` | Derived from ending agreement date and configured window |
| `needs_asking` | Confirm question sent | `awaiting_answer` | Explicit sent confirmation; record message and optional follow-up date |
| `needs_asking` / `awaiting_answer` | Record agreement to continue | `ready_to_renew` | Record answer; an unsolicited answer is allowed |
| `needs_asking` / `awaiting_answer` / `ready_to_renew` | Record non-renewal | `move_out_planned` | Save decision and planned end date; create no next-term charges |
| `ready_to_renew` | Save next agreement | `renewed` | Valid start date, 1/3/6/12-month term, and total agreed price; prevent unintended overlap or duplicate successor |
| `move_out_planned` | Confirm departure | `closed` | Explicit departure date and release of room occupancy |
| `move_out_planned` | Tenant changes decision | `ready_to_renew` | Explicit revised answer before departure |
| `ready_to_renew` | Answer becomes undecided | `awaiting_answer` | Record revised answer; preserve history |

`needs_asking`, `awaiting_answer`, and `ready_to_renew` map to the three proposed tabs. `move_out_planned` must remain visible as unresolved work until departure is recorded; its placement in the navigation is an open decision. `renewed` and `closed` belong in history.

Renewal creates a new agreement and obligation; it does not mark either term paid. Departure does not erase outstanding rent. Changing an already saved successor requires agreement correction, not replaying the renewal action. Cancelling a successor with payments or charges needs a separate correction policy before implementation.

## Cross-workflow examples to validate

| Scenario | Expected behavior |
| --- | --- |
| Six-month term costs Rp6m; one Rp6m transfer submitted | One collection obligation, one review item, six Rp1m monthly allocations; collection paused |
| Same transfer verified, then verification undone | All six allocations reverse together; one review item returns; collection stays paused pending review |
| Reopened transfer rejected | Pending coverage released; remaining debt returns to collection with the rejection reason |
| Rp2m of Rp6m submitted for review | One review item; collection still shows the Rp4m uncovered balance |
| Paid term is ending | No collection task; renewal task remains |
| New term saved while old rent is unpaid | Separate old and new obligations; old debt remains collectible |
| Old transfer reopened after replacement payment settles rent | Block conflicting allocations until corrected; do not double-pay the ledger |
| Tenant declines renewal but still owes rent | Move-out work and collection coexist; no automatic successor agreement |
| Ledger month changes | No change to action queues or their unresolved counts |

## Decisions before implementation

1. Choose reminder/renewal windows and whether a next follow-up date is required after confirming a message. Without one, a contacted obligation stays in “Menunggu pembayaran.”
2. Validate whether deferred reviews need a separate tab and a scheduled return date. Deferral must remain visible in unresolved counts.
3. Agree on immediate collection follow-up after rejection and how reminders describe partially pending amounts.
4. Decide where planned departures are completed, and how to correct a successor agreement after it has been saved.
5. Confirm partial payments and overpayments policy. If the first implementation supports full obligations only, explicitly reject unsupported amounts in the form.

Local implementation choices: collection window is three days; renewal window is 30 days; follow-up dates are optional; deferred reviews stay in their own tab without automatic rescheduling; rejection schedules collection follow-up today. Planned departures have a separate tab. New agreements retain the original due day through short months. Full-month allocations only are accepted; the partial-payment examples above remain design targets. Overpayments and refunds are unsupported. Departure keeps the exit month's charge in full and blocks closure while an active transfer covers later months. Correction retains the transfer ID and decision history; a verified transfer must be reopened before correction.

All workflow records remain browser-local. These behaviors need a walkthrough with the manager before operational use.
