# 🛒 Smart Mini POS - Advanced LocalStorage Point of Sale

![Status](https://img.shields.io/badge/Status-Active-brightgreen.svg)
![Tech Stack](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20Vanilla%20JS-orange.svg)
![Database](https://img.shields.io/badge/Database-LocalStorage-blue.svg)

**Smart Mini POS** is a lightning-fast, highly advanced, serverless Point of Sale (POS) system built entirely with HTML, CSS, and Vanilla JavaScript. It requires zero backend setup, operating entirely in the browser using `localStorage`.

Despite being a frontend-only application, it features complex logic usually reserved for enterprise systems, including a modular variant engine, bi-directional discount calculators, advanced CRM (Udhaar/Credit tracking), granular role-based security, and dynamic receipt/KOT generation.

---

## 🔥 Deep Feature Breakdown (What's in the code)

### 🍔 Advanced Menu & Variant Engine
*   **Modular Variants:** Create items with multiple sub-options (e.g., *Chicken Karahi -> Full: 1800 | Half: 1000*). Clicking a base item opens a sleek variant selection modal.
*   **Dynamic Prompts:** Toggle `askPrice` (Open Market Price) or `askQty` (for items sold by weight/grams like loose Roti or BBQ) to trigger a unified custom Numpad modal.
*   **Bilingual Support:** Store and print item names in both English and Urdu (Nastaliq font supported). UI toggles allow showing English, Urdu, or both on the POS grid.
*   **Smart CSV Import/Export:** Bulk import menu items via CSV. The engine correctly parses a 7th column for pipe-separated variants (`Full:1800|Half:1000`).

### 🖨️ Dynamic Print Engine (KOT vs. Final Bill)
*   **Independent Checklists:** Separate configuration tabs for **Kitchen Order Tickets (KOT)** and **Customer Bills**. 
*   **Granular Toggles:** Choose exactly what prints via Apple-style toggle switches: Logo, Property Info, Invoice Number, Start/Print Time, Waiter Name, Cashier Name, Urdu Items, and Payment Breakdowns.
*   **Custom Receipt CSS & HTML Footers:** Inject raw CSS or HTML directly from the settings panel to format thermal prints perfectly.

### 👥 CRM & "Udhaar" (Credit) Book
*   **Smart Autocomplete:** Frictionless customer lookup. Type a name or number, and a beautiful floating dropdown auto-fills the entire cart profile instantly.
*   **Ledger & Debt Tracking:** Dedicated CRM dashboard showing top debtors. Processes "Udhaar" (Credit) payments safely, automatically updating the client's balance and ledger history.
*   **Strict Validations:** The system strictly blocks Udhaar payments if a valid client profile isn't linked, and prevents blocked clients from being billed.

### 🔒 Security & Role-Based Access Control (RBAC)
*   **Manager PIN Overrides:** If an item has already been printed to the kitchen (`printedQty > 0`), the system locks the `-` (decrease) button. Deleting the item requires an Admin/Manager to enter their PIN via a secure popup.
*   **Apple-Style Permissions:** 15+ granular permissions (e.g., Transfer Tables, Wipe History, Apply Discounts) managed via modern UI toggles for Admin, Manager, Cashier, and Waiter roles.

### 🎨 Highly Customizable UI Engine
*   **Granular Typography:** Change the exact CSS `rem` sizes for Category Tabs, Menu Items, Cart Headers, Totals, and Dashboard Numbers directly from the UI.
*   **Auto-Sizing Buttons:** Toggle between strict Grid sizes (e.g., 120px by 80px) or Auto-Sizing buttons that dynamically wrap around long item names.
*   **Multiple Neumorphic/Flat Themes:** Switch instantly between Default, Dark, Neon, Ocean, Sunset, Emerald, and Minimalist themes. Cart can be docked Left or Right.

### 📊 Cash Reconciliation & Shift Management
*   **Shift Z-Reading:** Generates a beautiful breakdown of cash vs. card vs. credit collected *per cashier* during the current shift.
*   **Blind Reconciliation:** Prompts the cashier to enter their counted drawer cash, then reveals the system's expected cash and calculates the exact over/short difference.
*   **Non-Destructive Day End:** Finalizing the day auto-triggers a JSON backup download, resets shift tracking, and clears the active screen without wiping historical metrics.
*   **Bulk History Eraser:** Admin-only tool to permanently wipe historical order data strictly between two specific `datetime-local` ranges.

---

## 📁 Codebase Architecture

The project is heavily modularized to keep the Vanilla JS maintainable:

*   `index.html` - The single-page app skeleton, modals, and thermal print layout structure.
*   `styles.css` - Custom CSS variables, theme engines, Flatpickr overrides, and Apple-style toggles.
*   `state.js` - Central data store schema, default layouts, and `localStorage` initialization.
*   `ui.js` - Global UI functions, dynamic preferences injection, Smart Autocomplete logic, and custom dropdown logic.
*   `pos.js` - The core cart engine, variant handling, Manager PIN overrides, pricing math, and dual-print logic (KOT/Bill).
*   `managers.js` - Table/Zone mapping and the Menu Catalog builder (with dynamic variant row creation).
*   `crm.js` - Customer ledger rendering, profile editing, and the top-debtors dashboard.
*   `dashboard-history.js` - Order history viewing, restoring to read-only carts, bulk deletion, and Chart.js integration.
*   `config.js` - RBAC mapping, Receipt Checklist parsing, and Smart Backup/Restore execution.

---

## 🚀 How to Run

1. Clone the repository.
2. Open `index.html` in any modern web browser (Chrome, Edge, Safari).
3. **Login Credentials:**
   * **ID:** `admin`
   * **Password:** `admin`
4. The system will instantly cache to your browser's local storage. No server required.
