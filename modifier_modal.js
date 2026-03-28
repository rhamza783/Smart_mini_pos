/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: modifier_modal.js – Modifier Selection Modal                          ║
║  Version: 4.1 – Added safety checks to prevent crashes                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function openModifierModal(item, basePrice, callback) {
  const modal = document.getElementById('modifier-modal');
  const list  = document.getElementById('modifier-list');

  if (!modal || !list) {
      console.error("Modifier modal HTML elements not found!");
      return;
  }

  document.getElementById('modifier-title').textContent = item.name;
  list.innerHTML = '';

  let selections =[];

  function calcExtra() {
    return selections.reduce((s, m) => s + (m.price * m.qty), 0);
  }

  function refreshSummary() {
    const grand = basePrice + calcExtra();
    let bar = document.getElementById('mod-summary-bar');
    if (!bar) return;

    if (selections.length === 0) {
      bar.innerHTML = `
        <span style="color:var(--text-secondary); font-size:0.82rem; flex:1;">Tap any option below to add it</span>
        <span style="font-weight:800; font-size:1rem; color:var(--col-primary); white-space:nowrap;">
          ${appSettings.property.currency} ${grand.toFixed(0)}
        </span>`;
    } else {
      const tags = selections.map(s => {
        const qtyBadge = s.qty > 1
          ? `<span style="background:rgba(255,255,255,0.35); border-radius:8px; padding:0 5px; font-size:0.7rem; margin-left:3px;">x${s.qty}</span>`
          : '';
        return `<span style="background:var(--col-primary); color:#fff; border-radius:20px; padding:3px 10px;
                font-size:0.75rem; font-weight:700; white-space:nowrap; display:inline-flex; align-items:center; gap:2px;">
                ${s.optionName}${qtyBadge}</span>`;
      }).join(' ');
      bar.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:4px; flex:1;">${tags}</div>
        <span style="font-weight:800; font-size:1.05rem; color:var(--col-primary); white-space:nowrap; margin-left:8px;">
          ${appSettings.property.currency} ${grand.toFixed(0)}
        </span>`;
    }
  }

  // ── SAFETY CHECK: Only build groups if modifiers actually exist ──────────
  if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
      item.modifiers.forEach((group, gIdx) => {

        const groupHeader = document.createElement('div');
        groupHeader.style.cssText = `font-size:0.72rem; font-weight:800; color:var(--col-primary);
          text-transform:uppercase; letter-spacing:1px; margin:16px 0 8px;
          padding-bottom:4px; border-bottom:2px solid var(--col-primary-light);`;
        groupHeader.textContent = group.groupName;
        list.appendChild(groupHeader);

        const chipGrid = document.createElement('div');
        chipGrid.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px;';

        if(group.options && Array.isArray(group.options)) {
            group.options.forEach(opt => {
              const isFree  = !opt.price || opt.price === 0;
              const priceLabel = isFree ? 'Free' : `+${appSettings.property.currency} ${opt.price}`;

              const chip = document.createElement('div');
              chip.style.cssText = `
                display:flex; flex-direction:column; align-items:center;
                border-radius:12px; border:2px solid var(--col-primary-light);
                background:var(--bg-app); transition:all 0.15s; overflow:hidden;
                box-shadow:var(--neumorph-out-sm); min-width:82px; cursor:pointer;`;

              const labelArea = document.createElement('div');
              labelArea.style.cssText = `
                display:flex; flex-direction:column; align-items:center; justify-content:center;
                padding:10px 12px; width:100%; box-sizing:border-box;`;
              labelArea.innerHTML = `
                <span class="mod-chip-name" style="font-weight:700; font-size:0.83rem; color:var(--text-primary); text-align:center;">${opt.name}</span>
                <span class="mod-chip-price" style="font-size:0.7rem; color:var(--col-success); margin-top:2px;">${priceLabel}</span>`;

              const qtyRow = document.createElement('div');
              qtyRow.className = 'mod-qty-row';
              qtyRow.style.cssText = `
                display:none; align-items:center; justify-content:space-between;
                width:100%; background:rgba(0,0,0,0.12); padding:4px 8px;
                box-sizing:border-box;`;
              qtyRow.innerHTML = `
                <button class="mod-qty-btn mod-minus" style="width:22px; height:22px; border-radius:6px; border:none; background:rgba(255,255,255,0.25); color:#fff; font-size:1rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;">−</button>
                <span class="mod-qty-val" style="color:#fff; font-weight:800; font-size:0.85rem; min-width:18px; text-align:center;">1</span>
                <button class="mod-qty-btn mod-plus" style="width:22px; height:22px; border-radius:6px; border:none; background:rgba(255,255,255,0.25); color:#fff; font-size:1rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;">+</button>`;

              chip.appendChild(labelArea);
              chip.appendChild(qtyRow);
              chipGrid.appendChild(chip);

              const setSelected = (active) => {
                if (active) {
                  chip.style.background   = 'var(--col-primary)';
                  chip.style.borderColor  = 'var(--col-primary)';
                  chip.style.boxShadow    = 'none';
                  labelArea.querySelector('.mod-chip-name').style.color  = '#fff';
                  labelArea.querySelector('.mod-chip-price').style.color = 'rgba(255,255,255,0.8)';
                  qtyRow.style.display = 'flex';
                } else {
                  chip.style.background   = 'var(--bg-app)';
                  chip.style.borderColor  = 'var(--col-primary-light)';
                  chip.style.boxShadow    = 'var(--neumorph-out-sm)';
                  labelArea.querySelector('.mod-chip-name').style.color  = 'var(--text-primary)';
                  labelArea.querySelector('.mod-chip-price').style.color = 'var(--col-success)';
                  qtyRow.style.display = 'none';
                  qtyRow.querySelector('.mod-qty-val').textContent = '1';
                }
              };

              const getSel = () => selections.find(
                s => s.groupName === group.groupName && s.optionName === opt.name
              );

              labelArea.onclick = (e) => {
                e.stopPropagation();
                const existing = getSel();
                if (existing) {
                  selections = selections.filter(s => !(s.groupName === group.groupName && s.optionName === opt.name));
                  setSelected(false);
                } else {
                  selections.push({ groupName: group.groupName, optionName: opt.name, price: parseFloat(opt.price) || 0, qty: 1 });
                  setSelected(true);
                }
                refreshSummary();
              };

              qtyRow.querySelector('.mod-minus').onclick = (e) => {
                e.stopPropagation();
                const sel = getSel();
                if (!sel) return;
                if (sel.qty <= 1) {
                  selections = selections.filter(s => !(s.groupName === group.groupName && s.optionName === opt.name));
                  setSelected(false);
                } else {
                  sel.qty--;
                  qtyRow.querySelector('.mod-qty-val').textContent = sel.qty;
                }
                refreshSummary();
              };

              qtyRow.querySelector('.mod-plus').onclick = (e) => {
                e.stopPropagation();
                const sel = getSel();
                if (!sel) return;
                sel.qty++;
                qtyRow.querySelector('.mod-qty-val').textContent = sel.qty;
                refreshSummary();
              };
            });
        }
        list.appendChild(chipGrid);
      });
  } else {
      // If the item has NO modifiers, instantly skip this modal and return empty array
      console.warn("Item has no modifiers, skipping modal.");
      if (typeof closeModal === "function") closeModal('modifier-modal');
      callback([]);
      return;
  }

  // ── SUMMARY BAR ───────────────────────────────────────────────────────────
  let bar = document.getElementById('mod-summary-bar');
  const confirmBtn = document.getElementById('modifier-confirm');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'mod-summary-bar';
    bar.style.cssText = `
      display:flex; align-items:center; justify-content:space-between; gap:8px;
      background:var(--bg-app); box-shadow:var(--neumorph-in-sm);
      border-radius:12px; padding:12px 16px; margin:18px 0 6px; flex-wrap:wrap;`;
    confirmBtn.parentElement.insertBefore(bar, confirmBtn);
  }
  refreshSummary();

  // ── SKIP / NO EXTRAS ──────────────────────────────────────────────────────
  let skipBtn = document.getElementById('modifier-skip');
  if (!skipBtn) {
    skipBtn = document.createElement('button');
    skipBtn.id = 'modifier-skip';
    skipBtn.className = 'btn-modern';
    skipBtn.style.cssText = 'background:var(--bg-app); color:var(--text-secondary); font-size:0.85rem; margin-right:8px;';
    confirmBtn.parentElement.insertBefore(skipBtn, confirmBtn);
  }
  skipBtn.textContent = 'No Extras';
  skipBtn.onclick = () => { closeModal('modifier-modal'); callback([]); };

  // ── CONFIRM ───────────────────────────────────────────────────────────────
  confirmBtn.onclick = () => { closeModal('modifier-modal'); callback(selections); };

  modal.classList.add('active');
}
