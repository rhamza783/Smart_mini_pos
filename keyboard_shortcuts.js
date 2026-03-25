// keyboard_shortcuts.js – Global Keyboard Shortcut Handling
// Version: 2.0 – Integrated with Inventory Quick Adjustment (Shift+S)

// ============================================================================
// HELPER: Parse keyboard event into string (e.g., "Ctrl+Shift+F")
// ============================================================================
function parseKeyEvent(e) {
  let parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  let key = e.key;
  if (key === 'Control') key = 'Ctrl';
  if (key === 'Shift') key = 'Shift';
  if (key === 'Alt') key = 'Alt';
  if (key === 'Meta') key = 'Win';
  if (key.length === 1 && key.match(/[a-z]/i)) {
    key = key.toUpperCase();
  } else if (key === ' ') {
    key = 'Space';
  }
  
  if (!parts.includes(key)) {
    if (!['Ctrl', 'Shift', 'Alt', 'Win'].includes(key) || !e.getModifierState(key)) {
      parts.push(key);
    }
  }
  
  const sortedParts = parts.sort((a, b) => {
    const order = { 'Ctrl': 1, 'Shift': 2, 'Alt': 3, 'Win': 4 };
    return (order[a] || 99) - (order[b] || 99);
  });
  
  return sortedParts.join('+');
}

// ============================================================================
// FOCUS SEARCH INPUT IN ACTIVE SECTION
// ============================================================================
function focusActiveSectionSearch() {
  const activeSection = document.querySelector('.section.active');
  let searchInput = null;
  if (activeSection) {
    if (activeSection.id === 'history-section') searchInput = document.getElementById('hist-search');
    else if (activeSection.id === 'clients-section') searchInput = document.getElementById('cl-search');
    else if (activeSection.id === 'reports-section') searchInput = document.getElementById('rep-table-search');
    else if (activeSection.id === 'reconciliation-history-section') searchInput = document.getElementById('recon-hist-search');
    else if (activeSection.id === 'config-section') {
      const activeConfigContent = document.getElementById('conf-content-body');
      if (activeConfigContent && activeConfigContent.querySelector('.modern-search-input input')) {
        searchInput = activeConfigContent.querySelector('.modern-search-input input');
      }
    } else if (activeSection.id === 'inventory-section') {
      // Try to focus search in inventory stock table if visible
      const stockSearch = document.getElementById('inv-stock-search');
      if (stockSearch && stockSearch.offsetParent !== null) {
        searchInput = stockSearch;
      } else {
        const purchasesSearch = document.getElementById('inv-po-search');
        if (purchasesSearch && purchasesSearch.offsetParent !== null) searchInput = purchasesSearch;
        else {
          const wastageSearch = document.getElementById('inv-wastage-search');
          if (wastageSearch && wastageSearch.offsetParent !== null) searchInput = wastageSearch;
          else {
            const supplierSearch = document.getElementById('inv-supplier-search');
            if (supplierSearch && supplierSearch.offsetParent !== null) searchInput = supplierSearch;
            else {
              const auditSearch = document.getElementById('inv-audit-search');
              if (auditSearch && auditSearch.offsetParent !== null) searchInput = auditSearch;
            }
          }
        }
      }
    }
  }
  if (searchInput) {
    searchInput.focus();
    if (searchInput.select) searchInput.select();
  } else {
    showToast("No search input found in current section.");
  }
}

// ============================================================================
// MAIN SHORTCUT HANDLER
// ============================================================================
function performKeyboardShortcut(e) {
  // Prevent default for function keys to avoid browser actions
  if (e.key.startsWith('F')) {
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
    if (e.key !== 'F2' && isInput) { /* allow input field F-keys to pass through normally */ }
    else { e.preventDefault(); }
  }
  
  // Special shortcut: Shift + S for quick stock adjustment (inventory)
  if (e.shiftKey && e.key === 'S') {
    e.preventDefault();
    const activeSection = document.querySelector('.section.active');
    if (activeSection && activeSection.id === 'inventory-section') {
      if (typeof inv_quickAdjustPrompt === 'function') {
        inv_quickAdjustPrompt();
      } else {
        showToast('Inventory module not ready', 'err');
      }
    } else {
      showToast('Switch to Inventory section first', 'info');
    }
    return;
  }
  
  const currentKey = parseKeyEvent(e);
  
  for (const shortcut of appSettings.shortcuts) {
    if (currentKey === shortcut.currentKey) {
      if (shortcut.perm && !hasPerm(shortcut.perm)) {
        showCustomAlert("Denied", `You do not have permission to perform "${shortcut.name}".`);
        return;
      }
      try {
        if (shortcut.id === 'focusSearch') {
          focusActiveSectionSearch();
        } else if (shortcut.id === 'printKOT' || shortcut.id === 'printBill') {
          if (!app.table || app.currentOrder.length === 0) {
            showToast('No active order to print.');
            return;
          }
          if (shortcut.id === 'printKOT') printBill(true);
          else printBill(false);
        } else if (shortcut.id === 'openPaymentModal') {
          if (!app.table || app.currentOrder.length === 0) {
            showToast('Empty Order, cannot open payment modal.');
            return;
          }
          openPaymentModal();
        } else {
          eval(shortcut.action);
        }
      } catch (err) {
        console.error(`Error executing shortcut action for ${shortcut.name}:`, err, shortcut.action);
        showCustomAlert("Shortcut Error", `Failed to execute action for "${shortcut.name}". See console for details.`);
      }
      return;
    }
  }
}

// ============================================================================
// ATTACH EVENT LISTENER
// ============================================================================
document.addEventListener('keydown', performKeyboardShortcut);