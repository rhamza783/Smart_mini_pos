# Inventory Management System – Test Checklist

## Overview
This checklist covers all inventory features integrated into the AL-MADINA SHINWARI POS system. Use it to verify that every component works as expected in a production environment.

---

## Phase 1 – Foundation (Stock Register & Ingredients)

### 1.1 Ingredient CRUD
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Add new ingredient | Ingredient appears in stock register; can be selected in other modules | [ ] |
| Edit ingredient (name, unit, category, threshold, cost) | Changes persist after refresh; audit log entry created | [ ] |
| Archive ingredient | Ingredient disappears from active lists; can be restored | [ ] |
| Attempt to archive ingredient used in recipe | Error message shown; archive prevented | [ ] |
| Add ingredient with duplicate name | Error message; duplicate not allowed | [ ] |

### 1.2 Stock Register Display
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| View stock table | All ingredients displayed with current quantity, unit, threshold, status badge | [ ] |
| Search/filter stock table | Filter works by name, category, barcode | [ ] |
| Refresh button | Reloads data correctly | [ ] |
| Low stock badge appears | Yellow/orange badge for items below threshold | [ ] |
| Critical (zero) stock badge appears | Red badge for zero stock | [ ] |

### 1.3 Stock Adjustment
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Increase stock (positive delta) | Stock increases; movement logged with type MANUAL | [ ] |
| Decrease stock (negative delta) | Stock decreases; movement logged; Manager PIN required | [ ] |
| Attempt to decrease below zero | Error message; stock not changed | [ ] |
| Adjust stock with reason | Reason saved in movement log | [ ] |
| Inline quantity click opens adjustment prompt | Prompt appears with current stock pre-filled | [ ] |

### 1.4 Movement History
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| View movement history for ingredient | Shows all movements with timestamp, delta, type, reason, user | [ ] |
| History includes purchases, sales, wastage, manual adjustments | All types appear correctly | [ ] |

---

## Phase 2 – Recipes & Auto-Deduction

### 2.1 Recipe (BOM) Management
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Select menu item in recipe tab | Recipe editor displays existing ingredients (if any) | [ ] |
| Add ingredient to recipe | Ingredient added with quantity and unit | [ ] |
| Remove ingredient from recipe | Ingredient removed; UI updates | [ ] |
| Save recipe with multiple ingredients | Recipe stored; can be loaded again | [ ] |
| Delete recipe | Recipe removed; confirmation prompt shown | [ ] |
| Link from Menu Manager to Inventory | Click “Edit Recipe” in menu item form opens inventory recipe tab with item selected | [ ] |

### 2.2 Auto-Deduction on Sale
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Close order with items that have recipes | Stock deducted according to recipe quantities × item quantity | [ ] |
| Multiple quantities of same item | Deduction multiplies ingredient quantities correctly | [ ] |
| Item without recipe | No deduction; no error | [ ] |
| Deal item with children | Each child item’s recipe deducted individually | [ ] |
| Insufficient stock for any ingredient | Order prevented; error message shown | [ ] |
| After deduction, low stock alert triggers | Toast notification and audit log entry created | [ ] |

---

## Phase 3 – Purchases, Wastage & Suppliers

### 3.1 Purchase Orders
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Create purchase order with items | PO created with status “pending” | [ ] |
| View pending purchase orders | List shows pending approvals | [ ] |
| Approve purchase order (Manager PIN) | Stock increased; movement type PURCHASE; ingredient cost updated if price differs; supplier price history recorded | [ ] |
| Reject purchase order with reason | PO status becomes “rejected”; stock unchanged | [ ] |
| Price anomaly warning | Warning shown if price > threshold above average | [ ] |
| Create purchase order from reorder suggestions | Pre-filled items; submit creates PO | [ ] |

### 3.2 Suppliers
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Add supplier | Supplier appears in list | [ ] |
| Edit supplier | Changes saved | [ ] |
| Archive supplier | Supplier removed from active lists | [ ] |
| View supplier price history | Price trend displayed (via slide‑over) | [ ] |

### 3.3 Wastage
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Declare wastage with reason | Wastage record created with status “pending” | [ ] |
| Approve wastage (Manager PIN) | Stock decreased; movement type WASTAGE; audit log entry | [ ] |
| Reject wastage with reason | Wastage record status “rejected”; stock unchanged | [ ] |
| Attempt to declare wastage exceeding stock | Error message; submission prevented | [ ] |

---

## Phase 4 – Physical Count & Variance

### 4.1 Physical Count Session
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Start new physical count session | Session created; all ingredients listed with expected stock | [ ] |
| Enter physical quantities | Quantities saved; progress bar updates | [ ] |
| Cancel count session | Session cancelled; no stock changes | [ ] |
| Submit count session (Manager PIN) | Variance calculated; stock adjusted for differences; variance report created | [ ] |
| View count details after submission | Shows each ingredient’s expected, physical, variance, severity | [ ] |

### 4.2 Variance Reports
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| View variance reports list | Reports displayed with date, items counted, critical count, total gap | [ ] |
| View report details | Shows detailed variance per ingredient with severity badges | [ ] |
| Export variance report to CSV | CSV file downloaded with all variance data | [ ] |
| Critical variance triggers alert | Notification appears; audit log entry | [ ] |

---

## Phase 5 – Reorder Suggestions & Analytics

### 5.1 Reorder Suggestions
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Dashboard shows top 5 reorder suggestions | Items with low stock and consumption displayed | [ ] |
| Reorder suggestions tab shows all items | Full list with current stock, avg daily consumption, suggested qty | [ ] |
| Select items and create purchase order | PO created with selected items and suggested quantities | [ ] |
| Auto-reorder (if enabled) | Critical items automatically generate PO | [ ] |

### 5.2 Inventory Dashboard
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Dashboard displays total stock value, low stock count, critical count | Numbers accurate | [ ] |
| Low stock alerts section shows items below threshold | Correct list; Restock button navigates to stock register | [ ] |
| Recent variance reports shown | Links to variance reports | [ ] |
| Buttons to start count, view stock, add ingredient, export | All functional | [ ] |

### 5.3 Analytics (Consumption, Turnover)
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Get theoretical consumption for period | Correct total consumed based on sales | [ ] |
| Calculate stock turnover rate | Reasonable value for selected ingredient | [ ] |

---

## Phase 6 – Barcode Scanning & Offline Storage

### 6.1 Barcode Scanning
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Scan barcode from stock register adjustment | Camera opens; scans barcode; ingredient found → opens adjustment prompt | [ ] |
| Scan barcode from ingredient form | Camera opens; barcode fills field | [ ] |
| Scan unknown barcode | Prompt to create new ingredient with that barcode | [ ] |
| Manual barcode entry fallback | Text input appears if camera unavailable | [ ] |
| Barcode detection on mobile | Works with rear camera; focus detection | [ ] |

### 6.2 Offline Storage (IndexedDB / Dexie.js)
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| After migration, data stored in IndexedDB | LocalStorage keys migrated; app reads from DB | [ ] |
| App works offline | All inventory operations work without internet (no external API calls) | [ ] |
| Reload page | Data persists | [ ] |

---

## Phase 7 – Export/Import & Sync

### 7.1 Export/Import
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Export inventory data from settings | JSON file downloaded with all inventory tables | [ ] |
| Import inventory data | Data replaced after confirmation; UI refreshes | [ ] |
| Export stock report to CSV | CSV with ingredients, current stock, value, status | [ ] |
| Export variance report to CSV | CSV with variance details | [ ] |

### 7.2 Real‑time Sync (Multi‑terminal)
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Open two tabs, make stock adjustment in one | Other tab shows “Inventory synced” notification; data updated | [ ] |
| Broadcast after purchase approval | Other terminals refresh data | [ ] |

---

## Phase 8 – Security & Permissions

### 8.1 Manager PIN Verification
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Negative stock adjustment | PIN modal appears; correct PIN allows; incorrect shows error | [ ] |
| Approve purchase order | PIN required | [ ] |
| Approve wastage | PIN required | [ ] |
| Submit physical count | PIN required | [ ] |
| Void/override actions (from POS) | Reuses existing verifyManagerPIN | [ ] |

### 8.2 Role Permissions
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Admin sees inventory tab, can edit all | Tab visible; all operations allowed | [ ] |
| Manager sees inventory tab, can edit but cannot delete | Tab visible; delete/archive disabled | [ ] |
| Cashier does not see inventory tab | Tab hidden; direct URL access blocked | [ ] |

---

## Phase 9 – UI & Responsiveness

### 9.1 Inventory UI
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Inventory tab in main navigation | Button appears in header; clicking loads inventory section | [ ] |
| Tabs (Stock, Recipes, Purchases, etc.) | Each tab renders correct content | [ ] |
| Forms (add/edit ingredient, purchase order, wastage) | Slide‑over modals appear; all fields present | [ ] |
| Tables sortable/filterable | Search inputs work | [ ] |
| Responsive design on mobile | Tabs become horizontal scroll; tables scrollable | [ ] |

### 9.2 Theming & Styling
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| All inventory screens follow neumorphic design | Shadows, backgrounds match rest of POS | [ ] |
| Dark theme applies | Colors adapt correctly | [ ] |
| Status badges (low, critical, ok) | Consistent colors with POS alerts | [ ] |

---

## Phase 10 – Edge Cases & Stress Testing

### 10.1 Negative Stock Prevention
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Try to deduct more than available | Error message; stock unchanged | [ ] |
| Bulk deduction from multiple items with one insufficient | Entire order prevented; rollback | [ ] |
| Manual adjustment negative with PIN | Blocked if not enough stock | [ ] |

### 10.2 Large Data Handling
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| 500+ ingredients | Stock table renders with acceptable performance | [ ] |
| 10,000+ movements | Movement history loads quickly; pagination works | [ ] |
| Physical count with many items | Entries saved; variance calculation timely | [ ] |

### 10.3 Concurrent Modifications
| Test Case | Expected Result | Pass/Fail |
|-----------|-----------------|-----------|
| Two users adjust same stock | Last write wins (offline); audit logs both | [ ] |
| Physical count started while another active | Error: session already active | [ ] |

---

## Final Sign‑Off

| Item | Status |
|------|--------|
| All test cases executed | [ ] |
| No critical bugs remaining | [ ] |
| Performance acceptable | [ ] |
| Documentation complete | [ ] |
| Ready for production | [ ] |

---

**Tested by:** _________________________  
**Date:** _________________________  
**Version:** 3.0 (Final Integrated Inventory)