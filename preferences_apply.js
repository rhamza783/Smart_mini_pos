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

applyPreferences();