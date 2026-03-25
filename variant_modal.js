/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: variant_modal.js – Variant Selection Modal for Menu Items            ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function openVariantModal(item, callback) {
  const modal = document.getElementById('variant-modal');
  const list = document.getElementById('variant-list');
  document.getElementById('variant-title').textContent = `Options for ${item.name}`;
  list.innerHTML = '';
  
  item.variants.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'btn-modern';
    btn.style.cssText = "padding:15px; font-size:1rem; font-weight:700; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); box-shadow:var(--neumorph-out-sm); border:none; width:100%; margin-bottom:10px;";
    btn.innerHTML = `<span>${v.vName}</span> <span style="color:var(--col-primary);">${appSettings.property.currency} ${v.vPrice}</span>`;
    btn.onclick = () => {
      closeModal('variant-modal');
      callback(v);
    };
    list.appendChild(btn);
  });
  modal.classList.add('active');
}