// backup_restore.js – System Backup, Restore, Import/Export Utilities
// Version: 2.0 – Fully integrated with Inventory Management

// ============================================================================
// GLOBAL IMPORT DATA STORAGE (from app.js)
// ============================================================================
// pendingImportData is declared in app.js – do NOT redeclare it here

// ============================================================================
// HELPER: DOWNLOAD FILE
// ============================================================================
function downloadFile(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ============================================================================
// BACKUP SYSTEM (includes all POS data + inventory)
// ============================================================================
function backupSystem(silent = false) {
  // Gather all data from localStorage and global objects
  const data = {
    // Core POS data
    layout: tableLayout,
    menu: menuItems,
    cats: menuCategories,
    history: app.history,
    clients: app.clients,
    settings: appSettings,
    workers: appWorkers,
    roles: appRoles,
    reconciliationHistory: app.reconciliationHistory,
    deals: appDeals,
    employees: app.employees,
    reservations: app.reservations,
    
    // Inventory data (directly from localStorage or via functions)
    inv_ingredients: inv_getIngredients(),
    inv_recipes: inv_getRecipes(),
    inv_stock: inv_getStockLevels(),
    inv_movements: inv_getMovements(),
    inv_purchases: inv_getPurchases(),
    inv_suppliers: inv_getSuppliers(),
    inv_wastage: inv_getWastage(),
    inv_physical_counts: inv_getPhysicalCounts(),
    inv_variance_reports: inv_getVarianceReports(),
    inv_audit: inv_getAuditLog()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "pos_backup_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
  
  if (!silent) document.getElementById('slide-out-menu').classList.remove('active');
  if (typeof showToast === 'function') showToast("Backup created successfully", "ok");
}

// ============================================================================
// RESTORE SYSTEM (import all data from backup file)
// ============================================================================
function restoreSystem(input) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // Validate basic structure
      if (!data.layout && !data.menu && !data.settings) {
        throw new Error("Invalid backup file format");
      }
      
      // Restore core POS data
      if (data.layout) {
        tableLayout = data.layout;
        localStorage.setItem('pos_layout_v2', JSON.stringify(tableLayout));
      }
      if (data.menu) {
        menuItems = data.menu;
        localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
      }
      if (data.cats) {
        menuCategories = data.cats;
        localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
      }
      if (data.history) {
        app.history = data.history;
        localStorage.setItem('orderHistory', JSON.stringify(app.history));
      }
      if (data.clients) {
        app.clients = data.clients;
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
      }
      if (data.settings) {
        appSettings = data.settings;
        localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
      }
      if (data.workers) {
        appWorkers = data.workers;
        localStorage.setItem('pos_workers', JSON.stringify(appWorkers));
      }
      if (data.roles) {
        appRoles = data.roles;
        localStorage.setItem('pos_roles', JSON.stringify(appRoles));
      }
      if (data.reconciliationHistory) {
        app.reconciliationHistory = data.reconciliationHistory;
        localStorage.setItem('pos_reconciliationHistory', JSON.stringify(app.reconciliationHistory));
      }
      if (data.deals) {
        appDeals = data.deals;
        localStorage.setItem('pos_deals', JSON.stringify(appDeals));
      }
      if (data.employees) {
        app.employees = data.employees;
        localStorage.setItem('pos_employees', JSON.stringify(app.employees));
      }
      if (data.reservations) {
        app.reservations = data.reservations;
        localStorage.setItem('pos_reservations', JSON.stringify(app.reservations));
      }
      
      // Restore inventory data
      if (data.inv_ingredients) {
        inv_saveIngredients(data.inv_ingredients);
      }
      if (data.inv_recipes) {
        inv_saveRecipes(data.inv_recipes);
      }
      if (data.inv_stock) {
        inv_saveStockLevels(data.inv_stock);
      }
      if (data.inv_movements) {
        inv_saveMovements(data.inv_movements);
      }
      if (data.inv_purchases) {
        inv_savePurchases(data.inv_purchases);
      }
      if (data.inv_suppliers) {
        inv_saveSuppliers(data.inv_suppliers);
      }
      if (data.inv_wastage) {
        inv_saveWastage(data.inv_wastage);
      }
      if (data.inv_physical_counts) {
        inv_savePhysicalCounts(data.inv_physical_counts);
      }
      if (data.inv_variance_reports) {
        inv_saveVarianceReports(data.inv_variance_reports);
      }
      if (data.inv_audit) {
        inv_saveAuditLog(data.inv_audit);
      }
      
      // After restore, re-initialize any dependent state
      if (typeof updateAppWaitersList === 'function') updateAppWaitersList();
      if (typeof updateDataLists === 'function') updateDataLists();
      if (typeof applyPreferences === 'function') applyPreferences();
      if (typeof renderAllTables === 'function') renderAllTables();
      if (typeof renderMenu === 'function' && document.getElementById('items-section').classList.contains('active')) renderMenu();
      
      showCustomAlert("Success", "Restore Successful! Reloading...");
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      console.error("Restore error:", err);
      showCustomAlert("Error", "Invalid Backup File: " + err.message);
    }
  };
  reader.readAsText(file);
  document.getElementById('slide-out-menu').classList.remove('active');
}

// ============================================================================
// SMART IMPORT (Menu or Tables from CSV/JSON with conflict resolution)
// ============================================================================
function executeSmartImport() {
  closeModal('import-summary-modal');
  if (!pendingImportData) return;
  
  if (pendingImportData.type === 'menu') {
    // Import menu items (from CSV)
    pendingImportData.data.forEach(newItem => {
      const existingIdx = menuItems.findIndex(mi => mi.id == newItem.id);
      if (existingIdx !== -1) {
        menuItems[existingIdx] = { ...menuItems[existingIdx], ...newItem };
      } else {
        menuItems.push(newItem);
      }
      // Ensure category exists
      if (!menuCategories.find(c => c.id === newItem.category)) {
        if (newItem.category) {
          menuCategories.push({ id: newItem.category, name: newItem.category.toUpperCase(), sortOrder: 99 });
        }
      }
    });
    // Re-sort and renumber sortOrder
    menuItems.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
    menuItems = menuItems.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    menuCategories.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
    
    localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
    localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
    if (typeof renderManagerList === 'function') renderManagerList('');
    showToast("Menu Import Successful!");
    if (document.getElementById('items-section').classList.contains('active')) renderMenu();
    updateDataLists();
  } else if (pendingImportData.type === 'tables') {
    // Import tables layout (JSON)
    const newLayout = pendingImportData.data;
    newLayout.forEach(newZone => {
      let exZone = tableLayout.find(z => z.id === newZone.id);
      if (!exZone) {
        tableLayout.push(newZone);
      } else {
        newZone.sections.forEach(newSec => {
          let exSec = exZone.sections.find(s => s.name === newSec.name);
          if (!exSec) {
            exZone.sections.push(newSec);
          } else {
            newSec.tables.forEach(newTbl => {
              const tblName = typeof newTbl === 'string' ? newTbl : newTbl.name;
              const exists = exSec.tables.find(t => (typeof t === 'string' ? t : t.name) === tblName);
              if (!exists) exSec.tables.push(newTbl);
            });
          }
        });
      }
    });
    // Normalize table objects (ensure they are objects with sortOrder)
    tableLayout.forEach(zone => {
      zone.sections.forEach(section => {
        section.tables = section.tables.map((t, idx) => {
          if (typeof t === 'string') return { name: t, sortOrder: idx + 1 };
          return { ...t, sortOrder: t.sortOrder || idx + 1 };
        }).sort((a, b) => a.sortOrder - b.sortOrder);
      });
    });
    localStorage.setItem('pos_layout_v2', JSON.stringify(tableLayout));
    if (typeof renderTblManagerList === 'function') renderTblManagerList('');
    if (typeof renderAllTables === 'function') renderAllTables();
    showToast("Tables Imported & Merged!");
    updateDataLists();
  }
  
  pendingImportData = null;
}

// ============================================================================
// EXPOSE GLOBALLY
// ============================================================================
if (typeof window !== 'undefined') {
  window.backupSystem = backupSystem;
  window.restoreSystem = restoreSystem;
  window.downloadFile = downloadFile;
  window.executeSmartImport = executeSmartImport;
}