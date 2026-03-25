/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: pos_discount.js – Discount Modal and Calculations                     ║
║         (Added Enter key support)                                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function openDiscountModal() {
  if (!app.table || app.currentOrder.length === 0) return showToast('No active order to discount');
  if (!hasPerm('applyDiscount')) return showCustomAlert("Denied", "You do not have permission to apply discounts.");
  
  const currentOrderData = app.orders[app.table];
  const subtotal = getOrderTotals().sub;
  
  document.getElementById('modal-disc-current-total').textContent = `${appSettings.property.currency} ${subtotal.toFixed(0)}`;
  
  if (currentOrderData.discType === 'percent') {
    document.getElementById('modal-disc-percent').value = currentOrderData.discount;
    document.getElementById('modal-disc-fixed').value = '';
  } else {
    document.getElementById('modal-disc-fixed').value = currentOrderData.discount;
    document.getElementById('modal-disc-percent').value = '';
  }
  
  calculateModalDiscount(currentOrderData.discount, currentOrderData.discType);
  document.getElementById('discount-modal').classList.add('active');
  setupEnterKeyOnModal('discount-modal', '.save');
}

function calculateModalDiscount(value, type) {
  const subtotal = getOrderTotals().sub;
  let discountAmount = 0;
  let percentInput = document.getElementById('modal-disc-percent');
  let fixedInput = document.getElementById('modal-disc-fixed');
  
  const rawValue = parseFloat(value) || 0;
  
  const isPercentInputActive = document.activeElement === percentInput;
  const isFixedInputActive = document.activeElement === fixedInput;
  
  if (type === 'percent') {
    if (rawValue > 0 && rawValue <= 100) {
      discountAmount = subtotal * (rawValue / 100);
      if (!isFixedInputActive) fixedInput.value = discountAmount.toFixed(0);
    } else {
      discountAmount = 0;
      if (!isFixedInputActive) fixedInput.value = '';
    }
  } else {
    if (rawValue > 0 && rawValue <= subtotal) {
      discountAmount = rawValue;
      if (subtotal > 0 && !isPercentInputActive) percentInput.value = ((rawValue / subtotal) * 100).toFixed(2);
      else if (subtotal === 0 && !isPercentInputActive) percentInput.value = 0;
    } else {
      discountAmount = 0;
      if (!isPercentInputActive) percentInput.value = '';
    }
  }
  
  if (discountAmount > subtotal) {
    discountAmount = subtotal;
    if (type === 'fixed') {
      fixedInput.value = subtotal.toFixed(0);
      if (subtotal > 0) percentInput.value = 100;
    } else if (type === 'percent') {
      percentInput.value = 100;
      fixedInput.value = subtotal.toFixed(0);
    }
  }
  
  document.getElementById('modal-disc-new-total').textContent = `${appSettings.property.currency} ${(subtotal - discountAmount).toFixed(0)}`;
}

function applyModalDiscount() {
  if (!app.table) return;
  
  const percentVal = parseFloat(document.getElementById('modal-disc-percent').value);
  const fixedVal = parseFloat(document.getElementById('modal-disc-fixed').value);
  const subtotal = getOrderTotals().sub;
  
  if (percentVal > 0 && percentVal <= 100) {
    app.orders[app.table].discount = percentVal;
    app.orders[app.table].discType = 'percent';
  } else if (fixedVal > 0 && fixedVal <= subtotal) {
    app.orders[app.table].discount = fixedVal;
    app.orders[app.table].discType = 'fixed';
  } else {
    app.orders[app.table].discount = 0;
    app.orders[app.table].discType = 'fixed';
  }
  
  updateTotals();
  closeModal('discount-modal');
  showToast("Discount Applied!");
}