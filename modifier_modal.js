/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: modifier_modal.js – Modifier Selection Modal for Menu Items          ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function openModifierModal(item, callback) {
  const modal = document.getElementById('modifier-modal');
  const list = document.getElementById('modifier-list');
  document.getElementById('modifier-title').textContent = `Options for ${item.name}`;
  list.innerHTML = '';
  let selections = [];
  
  item.modifiers.forEach((group, gIdx) => {
    const groupDiv = document.createElement('div');
    groupDiv.style.marginBottom = '15px';
    groupDiv.style.border = '1px solid var(--border-color)';
    groupDiv.style.borderRadius = '8px';
    groupDiv.style.padding = '10px';
    
    const header = document.createElement('h4');
    header.style.margin = '0 0 8px 0';
    header.style.color = 'var(--col-primary)';
    header.textContent = `${group.groupName} (max ${group.maxSelect})`;
    groupDiv.appendChild(header);
    
    group.options.forEach(opt => {
      const optId = `mod-${gIdx}-${opt.name.replace(/\s+/g, '-')}`;
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.marginBottom = '5px';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = optId;
      checkbox.value = opt.name;
      checkbox.dataset.price = opt.price;
      checkbox.dataset.group = gIdx;
      checkbox.style.marginRight = '8px';
      
      const label = document.createElement('label');
      label.htmlFor = optId;
      label.innerHTML = `${opt.name} <span style="color:var(--col-success);">(+${appSettings.property.currency} ${opt.price})</span>`;
      
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      groupDiv.appendChild(wrapper);
    });
    
    list.appendChild(groupDiv);
  });
  
  document.getElementById('modifier-confirm').onclick = () => {
    selections = [];
    document.querySelectorAll('#modifier-list input:checked').forEach(cb => {
      const group = item.modifiers[parseInt(cb.dataset.group)];
      selections.push({
        groupName: group.groupName,
        optionName: cb.value,
        price: parseFloat(cb.dataset.price)
      });
    });
    
    // Check max per group
    let valid = true;
    item.modifiers.forEach((group, idx) => {
      const count = selections.filter(s => s.groupName === group.groupName).length;
      if (count > group.maxSelect) {
        showCustomAlert('Too many selections', `You can only select up to ${group.maxSelect} from "${group.groupName}".`);
        valid = false;
      }
    });
    
    if (valid) {
      closeModal('modifier-modal');
      callback(selections);
    }
  };
  
  modal.classList.add('active');
  setupEnterKeyOnModal('modifier-modal', '#modifier-confirm');
}