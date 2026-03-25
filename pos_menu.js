/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: pos_menu.js – Menu Categories, Items Rendering, and Item Addition    ║
║         (Added modifier support, Urdu names, tooltips)                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

let currentTooltip = null;
let currentTooltipItemData = null;

function renderCategories() {
  const container = document.getElementById('menu-cat-container');
  container.innerHTML = '';
  
  const sortedCategories = [...menuCategories].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  
  sortedCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `pos-cat-btn ${app.currentCat === cat.id ? 'active' : ''}`;
    btn.textContent = cat.name;
    btn.onclick = (e) => {
      app.currentCat = cat.id;
      renderCategories();
      renderMenu();
    };
    btn.style.fontFamily = `var(--ui-font-cat-family, ${appSettings.preferences.uiFont.catFamily})`;
    btn.style.fontStyle = `var(--ui-font-cat-style, ${appSettings.preferences.uiFont.catStyle})`;
    container.appendChild(btn);
  });
  
  // Add Deals category if any deals exist
  if (typeof appDeals !== 'undefined' && appDeals.length > 0) {
    const dealBtn = document.createElement('button');
    dealBtn.className = `pos-cat-btn ${app.currentCat === 'deals' ? 'active' : ''}`;
    dealBtn.textContent = '🔥 Deals';
    dealBtn.onclick = () => {
      app.currentCat = 'deals';
      renderCategories();
      renderDeals();
    };
    container.appendChild(dealBtn);
  }
}

function renderMenu() {
  if (app.currentCat === 'deals') {
    renderDeals();
    return;
  }
  const container = document.getElementById('menu-items-container');
  container.innerHTML = '';
  const items = menuItems.filter(i => i.category === app.currentCat && i.status !== 'disabled');
  
  items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  
  const prefLang = appSettings.preferences.menuLang || 'both';
  
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'pos-item-btn';
    
    // Determine price text – only variants trigger "Options"
    let priceTxt = item.price;
    if (item.variants && item.variants.length > 0) {
      priceTxt = 'Options';
    } else if (item.askPrice) {
      priceTxt = 'Ask Price';
    } else if (item.pricePerKg) {
      priceTxt = 'Per Kg';
    }
    
    let nameHtml = '';
    let showEn = (prefLang === 'both' || prefLang === 'en');
    let showUr = (prefLang === 'both' || prefLang === 'ur') && item.altName;
    
    if (showEn) nameHtml += item.name;
    if (showEn && showUr && item.altName.trim() !== '') nameHtml += `<br>`;
    if (showUr) nameHtml += `<span style="font-family:'Noto Nastaliq Urdu'; font-weight:400;">${item.altName}</span>`;
    
    btn.innerHTML = `
      ${item.imgData ? `<img src="${item.imgData}" alt="icon">` : ''}
      <span class="pos-item-name" style="font-family:var(--ui-font-item-family, ${appSettings.preferences.uiFont.itemFamily}); font-style:var(--ui-font-item-style, ${appSettings.preferences.uiFont.itemStyle});">${nameHtml}</span>
      ${appSettings.preferences.showPricesOnMenu ? `<span class="pos-item-price" style="font-family:var(--ui-font-price-family, ${appSettings.preferences.uiFont.priceFamily}); font-style:var(--ui-font-price-style, ${appSettings.preferences.uiFont.priceStyle});">${priceTxt}</span>` : ''}
    `;
    
    btn.onclick = () => {
      if (!app.isReadOnly) addToOrder(item);
    };
    
    btn.addEventListener('mouseover', (e) => showMenuItemTooltip(e, item));
    btn.addEventListener('mouseout', hideMenuItemTooltip);
    
    container.appendChild(btn);
  });
}

function renderDeals() {
  const container = document.getElementById('menu-items-container');
  container.innerHTML = '';
  if (typeof appDeals === 'undefined') return;
  const activeDeals = appDeals.filter(d => d.status !== 'disabled');
  if (activeDeals.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No active deals.</p>';
    return;
  }
  activeDeals.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  activeDeals.forEach(deal => {
    const btn = document.createElement('button');
    btn.className = 'pos-item-btn';
    btn.innerHTML = `
      <span class="pos-item-name">${deal.name}</span>
      <span class="pos-item-price">${appSettings.property.currency} ${deal.price.toFixed(2)}</span>
    `;
    btn.onclick = () => {
      if (!app.isReadOnly) addDealToOrder(deal);
    };
    container.appendChild(btn);
  });
}

function createOrGetTooltip() {
  if (!currentTooltip) {
    currentTooltip = document.createElement('div');
    currentTooltip.className = 'menu-item-tooltip';
    document.body.appendChild(currentTooltip);
  }
  return currentTooltip;
}

function showMenuItemTooltip(event, item) {
  const targetButton = event.currentTarget;
  const buttonRect = targetButton.getBoundingClientRect();
  
  if (!item.price && !item.code && !item.askPrice && !item.askQty && !(item.variants && item.variants.length > 0) && !item.modifiers) {
    return;
  }
  
  const tooltip = createOrGetTooltip();
  let priceText = '';
  
  if (item.variants && item.variants.length > 0) {
    priceText = 'Options available';
  } else if (item.modifiers && item.modifiers.length > 0) {
    priceText = 'Modifiers available';
  } else if (item.askPrice) {
    priceText = 'Ask for price';
  } else if (item.pricePerKg) {
    priceText = 'Per Kg';
  } else {
    priceText = `${appSettings.property.currency} ${item.price}`;
  }
  
  tooltip.innerHTML = `
    <span class="tooltip-price">${priceText}</span>
    ${item.code ? `<span class="tooltip-code">Code: ${item.code}</span>` : ''}
  `;
  
  currentTooltipItemData = item;
  
  tooltip.style.visibility = 'hidden';
  tooltip.classList.add('show');
  
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  
  const left = buttonRect.left + (buttonRect.width / 2) - (tooltipWidth / 2);
  const top = buttonRect.bottom + 10;
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.visibility = 'visible';
}

function hideMenuItemTooltip() {
  if (currentTooltip) {
    currentTooltip.classList.remove('show');
    currentTooltipItemData = null;
    currentTooltip.style.visibility = 'hidden';
  }
}

function addToOrder(item) {
  if (app.isReadOnly) return;
  
  // Check for modifiers first
  if (item.modifiers && item.modifiers.length > 0) {
    openModifierModal(item, (selectedModifiers) => {
      const finalPrice = item.price + selectedModifiers.reduce((sum, m) => sum + m.price, 0);
      const finalName = item.name;
      processItemAdd(item, finalName, finalPrice, selectedModifiers);
    });
    return;
  }
  
  if (item.variants && item.variants.length > 0) {
    openVariantModal(item, (selectedVariant) => {
      if (selectedVariant) {
        const finalName = `${item.name} (${selectedVariant.vName})`;
        const finalPrice = selectedVariant.vPrice;
        processItemAdd(item, finalName, finalPrice, []);
      }
    });
    return;
  }
  
  processItemAdd(item, item.name, item.price, []);
}

function processItemAdd(item, finalName, finalPrice, selectedModifiers) {
  let mode = '';
  if (item.askPrice && item.askQty) mode = 'both';
  else if (item.askPrice) mode = 'price';
  else if (item.askQty) mode = 'qty';
  
  if (mode !== '') {
    openCustomPrompt(`Enter details for ${finalName}:`, item, finalPrice, 1, mode, (result) => {
      if (result.price === null && result.qty === null) return;
      const userPrice = result.price !== null ? result.price : finalPrice;
      const userQty = result.qty !== null ? result.qty : 1;
      
      const isPriceValid = !isNaN(userPrice) &&
        (userPrice > 0 || (userPrice === 0 && item && item.price === 0 && item.askPrice) || mode === 'qty');
      
      const isQtyValid = !isNaN(userQty) && userQty > 0;
      
      if (!isPriceValid) {
        return showCustomAlert("Invalid Price", "Please enter a valid price (must be greater than 0 unless item is configured for 0-price with 'Ask for price' enabled).");
      }
      if (!isQtyValid && mode !== 'price') {
        return showCustomAlert("Invalid Quantity", "Please enter a valid quantity (must be greater than 0).");
      }
      
      finishAddToOrder(item, finalName, userPrice, userQty, selectedModifiers);
    });
  } else {
    finishAddToOrder(item, finalName, finalPrice, 1, selectedModifiers);
  }
}

function finishAddToOrder(baseItem, finalName, finalPrice, qty, selectedModifiers) {
  const existing = app.currentOrder.find(i => i.name === finalName && i.price === finalPrice);
  if (existing) {
    existing.qty += qty;
    existing.total = existing.qty * existing.price;
    if (selectedModifiers.length > 0) {
      // For simplicity, we'll treat modifiers as part of the item – if same modifiers exist, we could combine,
      // but we'll just add as new item to avoid complexity.
      app.currentOrder.push({
        id: baseItem.id,
        name: finalName,
        altName: baseItem.altName,
        price: finalPrice,
        qty: qty,
        total: finalPrice * qty,
        printedQty: 0,
        modifiers: selectedModifiers,
        itemNote: ''
      });
    }
  } else {
    app.currentOrder.push({
      id: baseItem.id,
      name: finalName,
      altName: baseItem.altName,
      price: finalPrice,
      qty: qty,
      total: finalPrice * qty,
      printedQty: 0,
      modifiers: selectedModifiers,
      itemNote: ''
    });
  }
  saveToLocal();
  renderOrderList();
}