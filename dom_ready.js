/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: dom_ready.js – DOMContentLoaded Initialization                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

document.addEventListener('DOMContentLoaded', () => {
  if (typeof buildDynamicZones === 'function') buildDynamicZones();
  if (typeof renderAllTables === 'function') renderAllTables();
  if (typeof renderCategories === 'function') renderCategories();
  if (typeof updateDataLists === 'function') updateDataLists();
  
  if (typeof applyAdvancedCSSVariables === 'function') applyAdvancedCSSVariables();
  
  setInterval(() => {
    if (typeof updateTableButtons === 'function') updateTableButtons();
  }, 60000);
});