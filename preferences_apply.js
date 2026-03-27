/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: preferences_apply.js – Apply Theme, Layout, Typography                ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function applyPreferences() {
  document.body.setAttribute('data-theme', appSettings.preferences.theme || 'default');
  
  if (appSettings.preferences.cartPosition === 'left') {
    document.body.classList.add('cart-left');
  } else {
    document.body.classList.remove('cart-left');
  }
  
  let styleTag = document.getElementById('dynamic-preferences');
  if (styleTag) {
    const p = appSettings.preferences;
    const uiFont = p.uiFont || {};
    
    styleTag.innerHTML = `
            body { 
                font-family: '${p.fontFamily || 'Inter'}', sans-serif !important; 
                font-style: ${p.fontStyle || 'normal'} !important; 
            }
            .table-btn { 
                font-size: ${p.tableFontSize || '0.85rem'} !important;
                font-family: ${uiFont.tableFamily || 'Inter'}, sans-serif !important;
                font-style: ${uiFont.tableStyle || 'normal'} !important;
            }
            .pos-item-name { 
                font-size: ${p.itemFontSize || '0.85rem'} !important; 
                font-family: ${uiFont.itemFamily || 'Inter'}, sans-serif !important;
                font-style: ${uiFont.itemStyle || 'normal'} !important;
            }
            .pos-item-price { 
                font-size: ${p.priceFontSize || '0.75rem'} !important; 
                font-family: ${uiFont.priceFamily || 'Inter'}, sans-serif !important;
                font-style: ${uiFont.priceStyle || 'normal'} !important;
            }
            .pos-cat-btn { 
                font-size: ${p.catFontSize || '0.75rem'} !important; 
                font-family: ${uiFont.catFamily || 'Inter'}, sans-serif !important;
                font-style: ${uiFont.catStyle || 'normal'} !important;
            }
            .order-list-header { 
                font-size: ${p.cartHeadFontSize || '0.65rem'} !important; 
                font-family: ${uiFont.cartHeadFamily || 'Inter'}, sans-serif !important;
                font-style: ${uiFont.cartHeadStyle || 'normal'} !important;
            }
            .order-item { 
                font-size: ${p.cartItemFontSize || '0.75rem'} !important; 
                font-family: ${uiFont.cartItemFamily || 'Inter'}, sans-serif !important;
                font-style: ${uiFont.cartItemStyle || 'normal'} !important;
            }
            .pay-info-val { 
                font-size: ${p.paymentFontSize || '1.2rem'} !important; 
                font-family: ${uiFont.paymentFamily || 'Inter'}, sans-serif !important;
                font-style: ${uiFont.paymentStyle || 'normal'} !important;
            }
            .pay-info-val#hist-active-total, .pay-info-val#hist-closed-total, .pay-info-box .pay-info-val {
                font-size: ${p.dashNumFontSize || '1.2rem'} !important;
                font-family: ${uiFont.dashNumFamily || 'Inter'}, sans-serif !important;
                font-style: ${uiFont.dashNumStyle || 'normal'} !important;
            }
        `;
    
    styleTag.innerHTML += `
            :root {
                --menu-btn-width: ${p.menuBtnWidth || '120px'};
                --menu-btn-height: ${p.menuBtnHeight || '80px'};
                --menu-btn-gap: ${p.menuBtnGap || '12px'};
                --menu-btn-column-gap: ${p.menuBtnColumnGap || '12px'};
                --menu-btn-min-item-width: ${p.menuBtnMinItemWidth || '100px'};

                --table-btn-width: ${p.tableBtnWidth || '100px'};
                --table-btn-height: ${p.tableBtnHeight || '70px'};
                --table-btn-gap: ${p.tableBtnGap || '15px'};
                --table-btn-column-gap: ${p.tableBtnColumnGap || '15px'};
                --table-btn-min-item-width: ${p.tableBtnMinItemWidth || '80px'};

                --table-group-content-vertical-padding: ${p.tableGroupContentVerticalPadding || '15px'};
            }
        `;
  }
  
  const menuGridContainer = document.getElementById('menu-items-container');
  if (menuGridContainer) {
    if (appSettings.preferences.menuBtnAutoSize) {
      menuGridContainer.classList.add('auto-size');
    } else {
      menuGridContainer.classList.remove('auto-size');
    }
    if (!appSettings.preferences.showPricesOnMenu) {
      menuGridContainer.classList.add('hide-price');
    } else {
      menuGridContainer.classList.remove('hide-price');
    }
  }
  
  document.querySelectorAll('.fit-row').forEach(row => {
    if (appSettings.preferences.tableBtnAutoSize) {
      row.classList.add('auto-size');
    } else {
      row.classList.remove('auto-size');
    }
  });
  
  document.getElementById('app-header-title').textContent = appSettings.property.name + ' POS';
}

// ============================================================================
// applyAdvancedCSSVariables — applies per-zone table settings to DOM containers
// This is the missing link that makes Table Display Settings actually work.
// Called whenever a zone-specific setting changes or renderAllTables() runs.
// ============================================================================
function applyAdvancedCSSVariables() {
  if (typeof tableLayout === 'undefined' || !Array.isArray(tableLayout)) return;

  tableLayout.forEach(zone => {
    const container = document.getElementById(`${zone.id}-container`);
    if (!container) return;

    // Map zone name → settings key (dinein / takeaway / delivery)
    const n = (zone.name || '').toLowerCase();
    let key = 'dinein';
    if (n.includes('take') || n.includes('parcel') || n.includes('pickup') || n.includes('carry')) key = 'takeaway';
    else if (n.includes('del') || n.includes('rider') || n.includes('dispatch')) key = 'delivery';

    const zs = (appSettings.tableDisplay && appSettings.tableDisplay[key]) || {};

    // Helper: set CSS variable only when value is present
    const sv = (prop, val) => { if (val) container.style.setProperty(prop, val); };

    sv('--table-btn-width',         zs.tableBtnWidth);
    sv('--table-btn-height',        zs.tableBtnHeight);
    sv('--table-btn-gap',           zs.tableBtnGap);
    sv('--table-btn-column-gap',    zs.tableBtnColumnGap);
    sv('--table-btn-min-item-width',zs.tableBtnMinItemWidth);
    sv('--table-button-border-radius', zs.tableButtonBorderRadius);
    sv('--table-group-line-style',  zs.tableGroupLineStyle);
    sv('--table-group-line-thickness', zs.tableGroupLineThickness);
    sv('--table-group-line-color',  zs.tableGroupLineColor);
    sv('--table-group-h-gap',       zs.tableGroupHPadding);

    // Auto-size rows
    container.querySelectorAll('.fit-row').forEach(row => {
      if (zs.tableBtnAutoSize) row.classList.add('auto-size');
      else row.classList.remove('auto-size');
    });

    // Per-zone typography on table buttons
    if (zs.tableFontSize || (zs.uiFont && zs.uiFont.tableFamily)) {
      container.querySelectorAll('.table-btn').forEach(btn => {
        if (zs.tableFontSize) btn.style.fontSize = zs.tableFontSize;
        if (zs.uiFont && zs.uiFont.tableFamily) btn.style.fontFamily = `${zs.uiFont.tableFamily}, sans-serif`;
        if (zs.uiFont && zs.uiFont.tableStyle) btn.style.fontStyle = zs.uiFont.tableStyle;
      });
    }

    // Per-zone typography on group/section headers
    if (zs.tableGroupHeaderFontSize || (zs.uiFont && zs.uiFont.tableHeaderFamily)) {
      container.querySelectorAll('.section-label, .table-group-header').forEach(lbl => {
        if (zs.tableGroupHeaderFontSize) lbl.style.fontSize = zs.tableGroupHeaderFontSize;
        if (zs.uiFont && zs.uiFont.tableHeaderFamily) lbl.style.fontFamily = `${zs.uiFont.tableHeaderFamily}, sans-serif`;
        if (zs.uiFont && zs.uiFont.tableHeaderStyle) lbl.style.fontStyle = zs.uiFont.tableHeaderStyle;
      });
    }
  });
}
window.applyAdvancedCSSVariables = applyAdvancedCSSVariables;

applyPreferences();