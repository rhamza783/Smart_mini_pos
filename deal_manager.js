/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: deal_manager.js – Independent Deal Manager with Product List         ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

console.log("deal_manager.js loaded");

// Global array to store deals
if (typeof appDeals === 'undefined') {
  window.appDeals = JSON.parse(localStorage.getItem('pos_deals')) || [];
}

let currentDealEditId = null;
let currentDealComponents = []; // temporary components for the deal being edited

// Open the deal manager modal
window.openDealManager = function() {
  console.log("openDealManager called");
  if (!hasPerm('editMenu')) return showCustomAlert("Denied", "Requires Admin or Manager privilege.");
  document.getElementById('slide-out-menu').classList.remove('active');
  
  const modal = document.getElementById('deal-manager-modal');
  if (!modal) {
    showCustomAlert("Error", "Deal Manager modal not found.");
    return;
  }
  modal.classList.add('active');
  
  renderDealList('');
  resetDealForm();
  renderProductList('');
};

// Render left side product list with green plus buttons
function renderProductList(term) {
  const container = document.getElementById('deal-product-list');
  if (!container) return;
  container.innerHTML = '';
  
  const filtered = menuItems.filter(item =>
    item.status !== 'disabled' &&
    (item.name.toLowerCase().includes(term.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(term.toLowerCase())))
  );
  
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">No products found.</div>';
    return;
  }
  
  filtered.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  
  filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'deal-product-item';
    div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid rgba(0,0,0,0.05);';
    div.innerHTML = `
            <div style="flex:2;">
                <div style="font-weight:700; color:var(--text-primary);">${item.name}</div>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${item.code || ''}</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-weight:800; color:var(--col-success);">${appSettings.property.currency} ${item.price}</span>
                <button class="btn-add-to-deal" style="background:var(--col-success); color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; display:flex; align-items:center; justify-content:center;" onclick="addToDeal('${item.id}')">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    container.appendChild(div);
  });
}

// Add product to current deal components
window.addToDeal = function(itemId) {
  const item = menuItems.find(i => i.id == itemId);
  if (!item) return;
  
  // Check if already in components
  const existing = currentDealComponents.find(c => c.id === itemId);
  if (existing) {
    existing.qty++;
  } else {
    currentDealComponents.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: 1
    });
  }
  renderDealComponents();
};

// Remove component from deal
function removeFromDeal(index) {
  currentDealComponents.splice(index, 1);
  renderDealComponents();
}

// Update component quantity
function updateComponentQty(index, delta) {
  if (currentDealComponents[index]) {
    currentDealComponents[index].qty += delta;
    if (currentDealComponents[index].qty < 1) {
      currentDealComponents.splice(index, 1);
    }
    renderDealComponents();
  }
}

// Render right side deal components
function renderDealComponents() {
  const container = document.getElementById('deal-components-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (currentDealComponents.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">No items added to this deal yet.</div>';
    return;
  }
  
  currentDealComponents.forEach((comp, idx) => {
    const div = document.createElement('div');
    div.className = 'deal-component-row';
    div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid rgba(0,0,0,0.05);';
    div.innerHTML = `
            <div style="flex:2;">
                <div style="font-weight:600;">${comp.name}</div>
                <div style="font-size:0.7rem; color:var(--text-secondary);">${appSettings.property.currency} ${comp.price} each</div>
            </div>
            <div style="display:flex; align-items:center; gap:5px;">
                <button class="qty-btn" style="width:25px; height:25px;" onclick="updateComponentQty(${idx}, -1)">-</button>
                <span style="min-width:20px; text-align:center;">${comp.qty}</span>
                <button class="qty-btn" style="width:25px; height:25px;" onclick="updateComponentQty(${idx}, 1)">+</button>
                <button class="icon-btn-sm" style="color:var(--col-danger);" onclick="removeFromDeal(${idx})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    container.appendChild(div);
  });
}

// Render list of existing deals (left side list)
window.renderDealList = function(term) {
  const body = document.getElementById('deal-list-body');
  if (!body) return;
  body.innerHTML = '';
  const filtered = appDeals.filter(d => d.name.toLowerCase().includes(term.toLowerCase()));
  if (filtered.length === 0) {
    body.innerHTML = '<div style="text-align:center; padding:20px;">No deals found.</div>';
    return;
  }
  filtered.forEach(d => {
    body.innerHTML += `
            <div class="modern-list-item" onclick="loadDeal('${d.id}')">
                <div class="li-main">
                    <span class="li-name">${d.name}</span>
                    <div class="li-meta">${appSettings.property.currency} ${d.price.toFixed(2)} · ${d.items.length} items</div>
                </div>
            </div>`;
  });
};

// Load deal for editing
window.loadDeal = function(id) {
  const deal = appDeals.find(d => d.id === id);
  if (!deal) return;
  currentDealEditId = id;
  document.getElementById('deal-name').value = deal.name;
  document.getElementById('deal-price').value = deal.price;
  
  // Convert deal.items (which are stored as {id, qty}) to currentDealComponents with full details
  currentDealComponents = deal.items.map(comp => {
    const menuItem = menuItems.find(m => m.id == comp.id);
    return {
      id: comp.id,
      name: menuItem ? menuItem.name : 'Unknown',
      price: menuItem ? menuItem.price : 0,
      qty: comp.qty
    };
  });
  
  renderDealComponents();
  document.getElementById('btn-delete-deal').style.display = 'block';
};

// Reset form for new deal
window.resetDealForm = function() {
  currentDealEditId = null;
  currentDealComponents = [];
  document.getElementById('deal-name').value = '';
  document.getElementById('deal-price').value = '';
  renderDealComponents();
  document.getElementById('btn-delete-deal').style.display = 'none';
};

// Save deal
window.saveDeal = function() {
  const name = document.getElementById('deal-name').value.trim();
  const price = parseFloat(document.getElementById('deal-price').value);
  if (!name || isNaN(price)) return showCustomAlert("Error", "Name and price are required.");
  
  if (currentDealComponents.length === 0) return showCustomAlert("Error", "Add at least one item to the deal.");
  
  const items = currentDealComponents.map(comp => ({
    id: comp.id,
    qty: comp.qty
  }));
  
  const dealData = {
    id: currentDealEditId || 'DEAL-' + Date.now(),
    name: name,
    price: price,
    items: items,
    status: 'available',
    sortOrder: 0
  };
  
  if (currentDealEditId) {
    const idx = appDeals.findIndex(d => d.id === currentDealEditId);
    if (idx !== -1) appDeals[idx] = dealData;
  } else {
    appDeals.push(dealData);
  }
  
  localStorage.setItem('pos_deals', JSON.stringify(appDeals));
  showToast("Deal saved.");
  renderDealList('');
  resetDealForm();
};

// Delete deal
window.deleteDeal = function() {
  if (!currentDealEditId) return;
  openConfirm("Delete Deal", "Are you sure you want to delete this deal?", () => {
    appDeals = appDeals.filter(d => d.id !== currentDealEditId);
    localStorage.setItem('pos_deals', JSON.stringify(appDeals));
    showToast("Deal deleted.");
    renderDealList('');
    resetDealForm();
  });
};

// Search in product list
document.getElementById('deal-product-search')?.addEventListener('input', function(e) {
  renderProductList(e.target.value);
});

// Search in deal list
document.getElementById('deal-list-search')?.addEventListener('input', function(e) {
  renderDealList(e.target.value);
});