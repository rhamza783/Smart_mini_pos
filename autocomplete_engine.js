/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: autocomplete_engine.js – Universal Smart Autocomplete Engine         ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

window.suggestClients = function() {};

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
    }
  }
  if (searchInput) {
    searchInput.focus();
    if (searchInput.select) searchInput.select();
  } else {
    showToast("No search input found in current section.");
  }
}

function initSmartAutocompletes() {
  const fields = [
    { id: 'nc-name', field: 'name', type: 'clients', parentPrefix: 'nc-' },
    { id: 'nc-phone', field: 'phone', type: 'clients', parentPrefix: 'nc-' },
    { id: 'nc-address', field: 'address', type: 'clients', parentPrefix: 'nc-' },
    { id: 'cust-name', field: 'name', type: 'clients', parentPrefix: 'cust-' },
    { id: 'cust-phone', field: 'phone', type: 'clients', parentPrefix: 'cust-' },
    { id: 'cust-address', field: 'address', type: 'clients', parentPrefix: 'cust-' },
    { id: 'adv-tbl-name', field: 'tableName', type: 'tables' },
    { id: 'adv-cat-name', field: 'name', type: 'categories' },
    { id: 'adv-item-name', field: 'name', type: 'items' }
  ];
  
  fields.forEach(config => {
    const inputEl = document.getElementById(config.id);
    if (!inputEl) return;
    
    inputEl.removeAttribute('list');
    inputEl.setAttribute('autocomplete', 'off');
    
    if (inputEl.hasAttribute('data-ac-bound')) return;
    inputEl.setAttribute('data-ac-bound', 'true');
    
    const wrapper = inputEl.parentNode;
    if (!wrapper || !wrapper.classList.contains('ac-wrapper')) {
      console.error(`Autocomplete wrapper missing for input: ${config.id}`);
      return;
    }
    
    const sugBox = document.createElement('div');
    sugBox.className = 'custom-select-list';
    sugBox.style.width = '100%';
    sugBox.style.top = 'calc(100% + 5px)';
    sugBox.style.zIndex = '3500';
    wrapper.appendChild(sugBox);
    
    inputEl.addEventListener('input', () => {
      const val = inputEl.value.trim().toLowerCase();
      if (!val) { sugBox.classList.remove('show'); return; }
      
      let matches = [];
      let seen = new Set();
      let sourceArray = [];
      
      if (config.type === 'clients') sourceArray = app.clients;
      else if (config.type === 'tables' && typeof getFlattenedTables === 'function') sourceArray = getFlattenedTables();
      else if (config.type === 'categories') sourceArray = menuCategories;
      else if (config.type === 'items') sourceArray = menuItems;
      
      for (let item of sourceArray) {
        let textVal = item[config.field];
        if (textVal && textVal.toString().toLowerCase().includes(val)) {
          if (!seen.has(textVal)) {
            seen.add(textVal);
            matches.push(item);
            if (matches.length >= 4) break;
          }
        }
      }
      
      if (matches.length === 0) { sugBox.classList.remove('show'); return; }
      
      sugBox.innerHTML = '';
      matches.forEach(item => {
        const opt = document.createElement('div');
        opt.className = 'custom-select-option';
        opt.style.display = 'flex';
        opt.style.flexDirection = 'column';
        opt.style.alignItems = 'flex-start';
        opt.style.padding = '10px 15px';
        
        let mainText = item[config.field];
        let subText = '';
        
        if (config.type === 'clients') {
          subText = `${item.name} | ${item.phone}`;
          if (item.company) subText += ` | ${item.company}`;
        }
        
        opt.innerHTML = `<span style="font-weight:800; font-size:0.95rem;">${mainText}</span>`;
        if (subText) opt.innerHTML += `<span style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px;">${subText}</span>`;
        
        opt.onclick = (e) => {
          e.stopPropagation();
          
          if (config.type === 'clients') {
            const prefix = config.parentPrefix;
            document.getElementById(prefix + 'name').value = item.name || '';
            document.getElementById(prefix + 'phone').value = item.phone || '';
            document.getElementById(prefix + 'address').value = item.address || '';
            
            if (prefix === 'cust-' && document.getElementById('cart-client-select')) {
              document.getElementById('cart-client-select').value = item.id;
              initializeCustomSelect('cart-client-select');
            }
          } else if (config.type === 'tables') {
            inputEl.value = item.tableName;
          } else if (config.type === 'categories') {
            inputEl.value = item.name;
          } else if (config.type === 'items') {
            inputEl.value = item.name;
          }
          
          sugBox.classList.remove('show');
        };
        sugBox.appendChild(opt);
      });
      sugBox.classList.add('show');
    });
  });
}