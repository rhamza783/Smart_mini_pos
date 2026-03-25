/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: category_manager.js – Menu Category Management                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

let currentCatEditId = null;

function openCategoryManager() {
  if (!hasPerm('editMenu')) return showCustomAlert("Denied", "Requires Admin or Manager privilege to edit Menu.");
  document.getElementById('slide-out-menu').classList.remove('active');
  document.getElementById('cat-manager-modal').classList.add('active');
  renderCategoryManagerList('');
  resetCategoryForm();
  autoModernizeUI();
}

function renderCategoryManagerList(term) {
  const body = document.getElementById('cat-manager-list-body');
  body.innerHTML = '';
  const filtered = menuCategories.filter(c => c.name.toLowerCase().includes(term.toLowerCase()) || c.id.toLowerCase().includes(term.toLowerCase()));
  
  if (filtered.length === 0) {
    body.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">No categories found.</div>';
    return;
  }
  
  filtered.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  
  filtered.forEach(c => {
    body.innerHTML += `
            <div class="modern-list-item ${currentCatEditId === c.id ? 'selected' : ''}" onclick="loadCategoryItem('${c.id}', this)">
                <div class="li-main"><span class="li-name">${c.name}</span><div class="li-meta"><span class="li-badge">${c.id}</span><span class="li-badge" style="background:rgba(0,0,0,0.1);">Pos: ${c.sortOrder || 0}</span></div></div>
                <i class="fas fa-chevron-right" style="color: var(--text-secondary); font-size: 0.8rem;"></i>
            </div>`;
  });
}

function loadCategoryItem(id, elem) {
  document.querySelectorAll('#cat-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
  if (elem) elem.classList.add('selected');
  const c = menuCategories.find(x => x.id === id);
  if (!c) return;
  currentCatEditId = id;
  document.getElementById('adv-cat-name').value = c.name;
  document.getElementById('adv-cat-id').value = c.id;
  document.getElementById('adv-cat-id').disabled = true;
  document.getElementById('adv-cat-sort').value = c.sortOrder || 0;
  document.getElementById('btn-delete-cat').style.display = 'block';
}

function resetCategoryForm() {
  currentCatEditId = null;
  document.querySelectorAll('#cat-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
  document.getElementById('adv-cat-name').value = '';
  document.getElementById('adv-cat-id').value = '';
  document.getElementById('adv-cat-id').disabled = false;
  document.getElementById('adv-cat-sort').value = '';
  document.getElementById('btn-delete-cat').style.display = 'none';
}

function saveCategoryItem() {
  const name = document.getElementById('adv-cat-name').value.trim();
  const id = document.getElementById('adv-cat-id').value.trim();
  let newSortOrder = parseInt(document.getElementById('adv-cat-sort').value) || 0;
  if (!name || !id) return showCustomAlert("Validation Error", "Please provide both Category Name and Category ID.");
  
  let tempMenuCategories = [...menuCategories];
  
  if (currentCatEditId) {
    const existingCatIdx = tempMenuCategories.findIndex(x => x.id === currentCatEditId);
    if (existingCatIdx === -1) {
      return showCustomAlert("Error", "Category not found for editing.");
    }
    
    const currentCat = tempMenuCategories[existingCatIdx];
    
    const duplicateNameCat = tempMenuCategories.find(
      c => c.id !== currentCatEditId && c.name.toLowerCase() === name.toLowerCase()
    );
    if (name.toLowerCase() !== currentCat.name.toLowerCase() && duplicateNameCat) {
      return showCustomAlert("Duplicate Error", `A category named "${name}" already exists.`);
    }
    
    const duplicateIdCat = tempMenuCategories.find(
      c => c.id !== currentCatEditId && c.id.toLowerCase() === id.toLowerCase()
    );
    if (id.toLowerCase() !== currentCat.id.toLowerCase() && duplicateIdCat) {
      return showCustomAlert("Duplicate ID", `A category with ID "${id}" already exists.`);
    }
    
    tempMenuCategories[existingCatIdx] = {
      ...tempMenuCategories[existingCatIdx],
      name,
      id,
      sortOrder: newSortOrder
    };
  } else {
    const duplicateNameCat = tempMenuCategories.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (duplicateNameCat) {
      return showCustomAlert("Duplicate Error", `A category named "${name}" already exists.`);
    }
    
    const duplicateIdCat = tempMenuCategories.find(x => x.id.toLowerCase() === id.toLowerCase());
    if (duplicateIdCat) {
      return showCustomAlert("Duplicate ID", `A category with this ID already exists.`);
    }
    tempMenuCategories.push({ id, name, sortOrder: newSortOrder });
  }
  
  menuCategories = tempMenuCategories;
  menuCategories.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  
  localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
  renderCategoryManagerList(document.getElementById('cat-search-input').value);
  showToast("Category Saved!");
  renderCategories();
  updateDataLists();
}

function deleteCategoryItem() {
  if (!currentCatEditId) return;
  const itemsInCat = menuItems.filter(i => i.category === currentCatEditId);
  if (itemsInCat.length > 0) return showCustomAlert("Cannot Delete", `There are ${itemsInCat.length} items using this category. Move or delete them first.`);
  menuCategories = menuCategories.filter(x => x.id !== currentCatEditId);
  localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
  resetCategoryForm();
  renderCategoryManagerList(document.getElementById('cat-search-input').value);
  showToast("Category Deleted");
  renderCategories();
  updateDataLists();
}

function resetMenuCategories() {
  menuCategories = JSON.parse(JSON.stringify(defaultCats));
  localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
  showToast("Menu categories reset to default.");
  resetCategoryForm();
  renderCategoryManagerList('');
  renderCategories();
  updateDataLists();
}