# **Project Description: Automated Rent Payment Reminder System**

## **Overview**

The **Automated Rent Payment Reminder System** is an automation tool that automates rent payment reminders via WhatsApp. It reads tenant data from a spreadsheet, sends personalized reminders based on due dates, and allows tenants to confirm payments. If payment is not received, the system escalates reminders and sends a final warning after 7 days. Designed for landlords, it reduces manual effort and ensures timely rent collection.

---

## **Key Features**

1. **[WIP] Spreadsheet Integration**: Reads and updates tenant data (name, room number, due date, payment status).
2. **[WIP] WhatsApp Notifications**: Sends reminders at 7 days, 3 days, due date, and daily for 7 days post-due.
3. **[WIP] Payment Confirmation**: Tenants confirm payment via "I have transferred," suppressing further reminders.
4. **Notification Logic**: Re-enables reminders if payment is unverified or the next rent cycle begins.
5. **[WIP] Scheduled Execution**: Runs daily via task schedulers (e.g., `cron`, Windows Task Scheduler).

---

## **Technical Stack**

- **Language**: Go
- **APIs**: WhatsApp Business API
- **Spreadsheet Format**: Google Sheets

---

## **Benefits**

- **Time-Saving**: Automates reminders, reducing manual effort.
- **Improved Communication**: Sends timely, personalized reminders.
- **Payment Tracking**: Tracks and suppresses notifications after payment confirmation.
- **Scalable**: Handles multiple tenants and properties effortlessly.

---

## **Future Enhancements**

1. Web interface for landlord management.
2. Payment gateway integration for automatic status updates.
3. Multi-channel notifications (SMS, email).
4. Analytics and reporting for payment trends.
