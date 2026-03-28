/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: pos_menu.js – Menu Categories, Items Rendering, and Item Addition     ║
║         (Fixed Variant + Modifier chaining logic and modal crashes)          ║
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

// ============================================================================
// ============================================================================
// IMPROVED ITEM CLICK & ADD LOGIC (FIXED CHAINING)
// ============================================================================

/**
 * Adds an item to the order. Handles variants, modifiers, and askPrice/askQty in sequence.
 * @param {Object} item - The menu item object.
 */
function addToOrder(item) {
  if (app.isReadOnly) return;

  // Helper to safely call a modal function and handle errors.
  const safeOpenModal = (modalFunc, ...args) => {
    if (typeof modalFunc !== 'function') {
      console.error(`Modal function is not defined: ${modalFunc}`);
      showCustomAlert('System Error', 'Cannot open options. Please contact support.');
      return false;
    }
    try {
      modalFunc(...args);
      return true;
    } catch (err) {
      console.error('Error opening modal:', err);
      showCustomAlert('System Error', 'Failed to open options. Please try again.');
      return false;
    }
  };

  // --------------------------------------------------------------
  // 1. Item has variants -> open variant modal first
  // --------------------------------------------------------------
  if (item.variants && item.variants.length > 0) {
    console.log('[addToOrder] Item has variants, opening variant modal:', item.name);
    const variantCallback = (selectedVariant) => {
      console.log('[addToOrder] Variant selected:', selectedVariant);
      if (!selectedVariant) {
        console.log('[addToOrder] Variant selection cancelled');
        return;
      }

      const finalName = `${item.name} (${selectedVariant.vName})`;
      const finalPrice = selectedVariant.vPrice;

      // ----------------------------------------------------------
      // 2. After variant, check for modifiers
      // ----------------------------------------------------------
      if (item.modifiers && item.modifiers.length > 0) {
        console.log('[addToOrder] Item has modifiers, opening modifier modal');
        const modifierCallback = (selectedModifiers) => {
          console.log('[addToOrder] Modifiers selected:', selectedModifiers);
          // Modifier modal may return null if cancelled
          if (selectedModifiers === null) {
            console.log('[addToOrder] Modifier selection cancelled');
            return;
          }
          processItemAdd(item, finalName, finalPrice, selectedModifiers || []);
        };
        safeOpenModal(openModifierModal, item, finalPrice, modifierCallback);
      } else {
        console.log('[addToOrder] No modifiers, adding directly');
        processItemAdd(item, finalName, finalPrice, []);
      }
    };
    safeOpenModal(openVariantModal, item, variantCallback);
    return;
  }

  // --------------------------------------------------------------
  // 3. No variants, but has modifiers -> open modifier modal
  // --------------------------------------------------------------
  if (item.modifiers && item.modifiers.length > 0) {
    console.log('[addToOrder] Item has modifiers, opening modifier modal');
    const modifierCallback = (selectedModifiers) => {
      console.log('[addToOrder] Modifiers selected:', selectedModifiers);
      if (selectedModifiers === null) return;
      processItemAdd(item, item.name, item.price, selectedModifiers || []);
    };
    safeOpenModal(openModifierModal, item, item.price, modifierCallback);
    return;
  }

  // --------------------------------------------------------------
  // 4. Standard item (no variants, no modifiers)
  // --------------------------------------------------------------
  console.log('[addToOrder] Standard item, adding directly');
  processItemAdd(item, item.name, item.price, []);
}

/**
 * Handles askPrice/askQty prompts if needed, then finalizes the addition.
 * @param {Object} item - Original menu item.
 * @param {string} finalName - Display name (may include variant).
 * @param {number} finalPrice - Base price (without modifiers).
 * @param {Array} selectedModifiers - Array of modifier objects.
 */
function processItemAdd(item, finalName, finalPrice, selectedModifiers) {
  // Determine mode for custom prompt
  let mode = '';
  if (item.askPrice && item.askQty) mode = 'both';
  else if (item.askPrice) mode = 'price';
  else if (item.askQty) mode = 'qty';

  if (mode !== '') {
    console.log(`[processItemAdd] Asking for custom ${mode} for ${finalName}`);
    openCustomPrompt(`Enter details for ${finalName}:`, item, finalPrice, 1, mode, (result) => {
      if (result.price === null && result.qty === null) return; // cancelled
      const userPrice = result.price !== null ? result.price : finalPrice;
      const userQty = result.qty !== null ? result.qty : 1;

      const isPriceValid = !isNaN(userPrice) &&
        (userPrice > 0 || (userPrice === 0 && item && item.price === 0 && item.askPrice) || mode === 'qty');
      const isQtyValid = !isNaN(userQty) && userQty > 0;

      if (!isPriceValid) return showCustomAlert("Invalid Price", "Please enter a valid price.");
      if (!isQtyValid && mode !== 'price') return showCustomAlert("Invalid Quantity", "Please enter a valid quantity.");

      finishAddToOrder(item, finalName, userPrice, userQty, selectedModifiers);
    });
  } else {
    finishAddToOrder(item, finalName, finalPrice, 1, selectedModifiers);
  }
}

/**
 * Pushes the final order item into app.currentOrder.
 * Handles merging for non‑modifier items.
 * @param {Object} baseItem - Original menu item.
 * @param {string} finalName - Display name.
 * @param {number} finalPrice - Base price (with variant, without modifiers).
 * @param {number} qty - Quantity.
 * @param {Array} selectedModifiers - Array of modifier objects.
 */
function finishAddToOrder(baseItem, finalName, finalPrice, qty, selectedModifiers) {
  console.log(`[finishAddToOrder] Adding ${qty} x ${finalName} (price: ${finalPrice}) with ${selectedModifiers.length} modifiers`);

  // If the item has modifiers, push a unique row (cannot merge because modifiers differ)
  if (selectedModifiers && selectedModifiers.length > 0) {
    const modExtra = selectedModifiers.reduce((s, m) => s + (m.price * (m.qty || 1)), 0);
    const itemTotalPrice = finalPrice + modExtra;

    app.currentOrder.push({
      id: baseItem.id,
      name: finalName,
      altName: baseItem.altName,
      price: itemTotalPrice,
      basePrice: finalPrice,
      qty: qty,
      total: itemTotalPrice * qty,
      printedQty: 0,
      modifiers: selectedModifiers,
      itemNote: ''
    });

    saveToLocal();
    renderOrderList();
    return;
  }

  // No modifiers: try to merge with an identical existing row
  const existing = app.currentOrder.find(i =>
    i.name === finalName &&
    i.price === finalPrice &&
    (!i.modifiers || i.modifiers.length === 0)
  );

  if (existing) {
    existing.qty += qty;
    existing.total = existing.qty * existing.price;
  } else {
    app.currentOrder.push({
      id: baseItem.id,
      name: finalName,
      altName: baseItem.altName,
      price: finalPrice,
      basePrice: finalPrice,
      qty: qty,
      total: finalPrice * qty,
      printedQty: 0,
      modifiers: [],
      itemNote: ''
    });
  }

  saveToLocal();
  renderOrderList();
}