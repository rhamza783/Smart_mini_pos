/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: dynamic_prompt.js – Custom Price/Qty/Password/Text Prompt Modal      ║
║         (UPDATED: No memory, handles 0 correctly, text mode)               ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

let pendingPromptCallback = null;
let currentPromptItem = null;

function openCustomPrompt(title, item, defaultPrice, defaultQty, mode, callback) {
  console.log('openCustomPrompt called', { title, item, defaultPrice, defaultQty, mode });
  
  const modal = document.getElementById('custom-prompt-modal');
  if (!modal) {
    console.error('Custom prompt modal not found!');
    showCustomAlert('Error', 'Prompt modal missing. Please refresh.');
    return;
  }
  
  document.getElementById('prompt-title').textContent = title;
  const inputPrice = document.getElementById('prompt-input-price');
  const inputQty = document.getElementById('prompt-input-qty');
  const priceGroup = document.getElementById('prompt-price-group');
  const qtyGroup = document.getElementById('prompt-qty-group');
  
  if (!inputPrice || !inputQty || !priceGroup || !qtyGroup) {
    console.error('Prompt input elements missing!');
    showCustomAlert('Error', 'Prompt UI missing. Please refresh.');
    return;
  }
  
  currentPromptItem = item;
  
  // Reset visibility
  priceGroup.style.display = 'flex';
  qtyGroup.style.display = 'flex';
  inputPrice.type = 'number';
  inputQty.type = 'number';
  document.querySelector('#prompt-price-group label').textContent = `Price (${appSettings.property.currency})`;
  document.querySelector('#prompt-qty-group label').textContent = `Quantity / Weight`;
  
  // Handle different modes
  if (mode === 'password') {
    inputPrice.type = 'password';
    inputPrice.value = '';
    document.querySelector('#prompt-price-group label').textContent = `Enter Manager PIN`;
    inputPrice.placeholder = '••••';
    qtyGroup.style.display = 'none';
  } else if (mode === 'text') {
    // For text notes, we repurpose the price input as a text field
    inputPrice.type = 'text';
    inputPrice.value = defaultPrice ? defaultPrice : ''; // defaultPrice could be existing note
    inputPrice.placeholder = 'Enter note...';
    document.querySelector('#prompt-price-group label').textContent = `Note`;
    qtyGroup.style.display = 'none';
  } else {
    // Normal price/qty mode
    if (mode === 'price' || mode === 'both') {
      inputPrice.value = (defaultPrice !== undefined && defaultPrice !== null) ? defaultPrice : '';
      inputPrice.placeholder = (defaultPrice !== undefined && defaultPrice !== null) ? defaultPrice : '0';
    } else {
      inputPrice.value = '';
      inputPrice.placeholder = '0';
    }
    
    if (mode === 'qty' || mode === 'both') {
      inputQty.value = (defaultQty !== undefined && defaultQty !== null) ? defaultQty : '';
      inputQty.placeholder = (defaultQty !== undefined && defaultQty !== null) ? defaultQty : '1';
    } else {
      inputQty.value = '';
      inputQty.placeholder = '1';
    }
  }
  
  pendingPromptCallback = callback;
  modal.classList.add('active');
  
  // Focus the appropriate field after a tiny delay
  setTimeout(() => {
    if (mode === 'password') {
      inputPrice.focus();
      inputPrice.select();
    } else if (mode === 'text') {
      inputPrice.focus();
      inputPrice.select();
    } else if (mode === 'qty' || mode === 'both') {
      inputQty.focus();
      inputQty.select();
    } else if (mode === 'price') {
      inputPrice.focus();
      inputPrice.select();
    }
  }, 100);
  
  // Enter key handlers
  inputPrice.onkeydown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'both' && qtyGroup.style.display !== 'none') {
        inputQty.focus();
        inputQty.select();
      } else {
        document.getElementById('prompt-confirm-btn').click();
      }
    }
  };
  inputQty.onkeydown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'both' && priceGroup.style.display !== 'none') {
        inputPrice.focus();
        inputPrice.select();
      } else {
        document.getElementById('prompt-confirm-btn').click();
      }
    }
  };
}

function closePrompt() {
  const modal = document.getElementById('custom-prompt-modal');
  if (modal) modal.classList.remove('active');
  pendingPromptCallback = null;
  currentPromptItem = null;
}

// Set confirm button handler once
document.addEventListener('DOMContentLoaded', () => {
  const confirmBtn = document.getElementById('prompt-confirm-btn');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (pendingPromptCallback) {
        const inputPrice = document.getElementById('prompt-input-price');
        const inputQty = document.getElementById('prompt-input-qty');
        const priceGroup = document.getElementById('prompt-price-group');
        const qtyGroup = document.getElementById('prompt-qty-group');
        
        if (!inputPrice || !inputQty) {
          closePrompt();
          return;
        }
        
        let result;
        if (inputPrice.type === 'password') {
          result = { price: inputPrice.value, qty: null, text: null };
        } else if (inputPrice.type === 'text') {
          result = { price: null, qty: null, text: inputPrice.value };
        } else {
          const priceValue = priceGroup.style.display !== 'none' && inputPrice.value !== '' ? parseFloat(inputPrice.value) : null;
          const qtyValue = qtyGroup.style.display !== 'none' && inputQty.value !== '' ? parseFloat(inputQty.value) : null;
          result = {
            price: priceValue,
            qty: qtyValue,
            text: null
          };
        }
        pendingPromptCallback(result);
      }
      closePrompt();
    };
  } else {
    console.error('Confirm button not found!');
  }
});