/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: config_preferences_ui.js – Save Functions for UI Preferences         ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function saveConfigPreferencesGeneral() {
  const p = appSettings.preferences;
  p.theme = document.getElementById('pref-theme').value;
  p.cartPosition = document.getElementById('pref-cart-pos').value;
  p.fontFamily = document.getElementById('pref-font').value;
  p.fontStyle = document.getElementById('pref-font-style').value;
  
  p.paymentFontSize = document.getElementById('pref-pay').value;
  p.dashNumFontSize = document.getElementById('pref-dash-num').value;
  p.uiFont.paymentFamily = document.getElementById('pref-pay-font-family').value;
  p.uiFont.paymentStyle = document.getElementById('pref-pay-font-style').value;
  p.uiFont.dashNumFamily = document.getElementById('pref-dash-num-font-family').value;
  p.uiFont.dashNumStyle = document.getElementById('pref-dash-num-font-style').value;
  
  localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
  if (typeof applyPreferences === 'function') applyPreferences();
  showToast("General UI Preferences Applied");
}

function saveConfigPreferencesCartMenu() {
  const p = appSettings.preferences;
  const uiFont = p.uiFont || {};
  
  p.cartItemLang = document.getElementById('pref-cart-item-lang').value;
  p.cartItemSpacing = document.getElementById('pref-cart-spacing').value;
  
  const saveCols = ['Name', 'Price', 'Qty', 'Total'];
  saveCols.forEach(col => {
    const lowerCol = col.toLowerCase();
    
    p[`cartHead${col}Size`] = document.getElementById(`pref-cart-head-${lowerCol}-size`).value;
    uiFont[`cartHead${col}Family`] = document.getElementById(`pref-cart-head-${lowerCol}-font-family`).value;
    uiFont[`cartHead${col}Style`] = document.getElementById(`pref-cart-head-${lowerCol}-font-style`).value;
    
    p[`cartItem${col}Size`] = document.getElementById(`pref-cart-item-${lowerCol}-size`).value;
    uiFont[`cartItem${col}Family`] = document.getElementById(`pref-cart-item-${lowerCol}-font-family`).value;
    uiFont[`cartItem${col}Style`] = document.getElementById(`pref-cart-item-${lowerCol}-font-style`).value;
  });
  
  p.uiFont = uiFont;
  localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
  if (typeof applyPreferences === 'function') applyPreferences();
  if (typeof applyAdvancedCSSVariables === 'function') applyAdvancedCSSVariables();
  showToast("Cart Display Preferences Applied");
}

function saveConfigPreferencesMenu() {
  const p = appSettings.preferences;
  const uiFont = p.uiFont || {};
  
  p.menuBtnAutoSize = document.getElementById('pref-btn-auto').checked;
  p.menuBtnWidth = document.getElementById('pref-btn-width').value;
  p.menuBtnHeight = document.getElementById('pref-btn-height').value;
  p.menuBtnMinItemWidth = document.getElementById('pref-btn-min-width').value;
  p.menuBtnGap = document.getElementById('pref-btn-gap').value;
  p.menuBtnColumnGap = document.getElementById('pref-btn-column-gap').value;
  p.showPricesOnMenu = document.getElementById('pref-show-prices').checked;
  p.menuLang = document.getElementById('pref-menu-lang').value;
  p.catFontSize = document.getElementById('pref-cat').value;
  p.itemFontSize = document.getElementById('pref-item').value;
  p.priceFontSize = document.getElementById('pref-price').value;
  
  uiFont.catFamily = document.getElementById('pref-cat-font-family').value;
  uiFont.catStyle = document.getElementById('pref-cat-font-style').value;
  uiFont.itemFamily = document.getElementById('pref-item-font-family').value;
  uiFont.itemStyle = document.getElementById('pref-item-font-style').value;
  uiFont.priceFamily = document.getElementById('pref-price-font-family').value;
  uiFont.priceStyle = document.getElementById('pref-price-font-style').value;
  
  p.uiFont = uiFont;
  
  localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
  if (typeof applyPreferences === 'function') applyPreferences();
  showToast("Menu Item Display Preferences Applied");
}

function saveConfigPreferencesTable() {
  const p = appSettings.preferences;
  const uiFont = p.uiFont || {};
  
  p.tableBtnAutoSize = document.getElementById('pref-tbl-btn-auto').checked;
  p.tableBtnWidth = document.getElementById('pref-tbl-btn-width').value;
  p.tableBtnHeight = document.getElementById('pref-tbl-btn-height').value;
  p.tableBtnMinItemWidth = document.getElementById('pref-tbl-btn-min-width').value;
  p.tableBtnGap = document.getElementById('pref-tbl-btn-gap').value;
  p.tableBtnColumnGap = document.getElementById('pref-tbl-btn-column-gap').value;
  p.tableFontSize = document.getElementById('pref-table').value;
  
  p.tableGroupVGap = document.getElementById('pref-tbl-group-v-gap')?.value || '15px';
  p.tableGroupHGap = document.getElementById('pref-tbl-group-h-gap')?.value || '15px';
  p.tableGroupLineStyle = document.getElementById('pref-tbl-group-line-style')?.value || 'solid';
  p.tableGroupLineThickness = document.getElementById('pref-tbl-group-line-thickness')?.value || '1px';
  p.tableGroupLineColor = document.getElementById('pref-tbl-group-line-color')?.value || 'rgba(0,0,0,0.1)';
  p.tableButtonBorderRadius = document.getElementById('pref-tbl-btn-border-radius')?.value || '8px';
  
  p.tablePartitionGapTop = document.getElementById('pref-tbl-partition-gap-top')?.value || '15px';
  p.tablePartitionGapBottom = document.getElementById('pref-tbl-partition-gap-bottom')?.value || '25px';
  p.tableGroupHPadding = document.getElementById('pref-tbl-group-h-padding')?.value || '15px';
  
  uiFont.tableFamily = document.getElementById('pref-table-font-family').value;
  uiFont.tableStyle = document.getElementById('pref-table-font-style').value;
  
  p.tableGroupHeaderFontSize = document.getElementById('pref-tbl-head-font-size')?.value || '0.85rem';
  uiFont.tableHeaderFamily = document.getElementById('pref-tbl-head-font-family')?.value || 'Inter';
  uiFont.tableHeaderStyle = document.getElementById('pref-tbl-head-font-style')?.value || 'normal';
  
  p.uiFont = uiFont;
  
  localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
  if (typeof applyPreferences === 'function') applyPreferences();
  if (typeof applyAdvancedCSSVariables === 'function') applyAdvancedCSSVariables();
  showToast("Table Display Preferences Applied");
  if (typeof renderAllTables === 'function') renderAllTables();
}