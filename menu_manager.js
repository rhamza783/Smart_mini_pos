// menu_manager.js – Advanced Menu Item Management (with Recipe Integration)
// Version: 2.0 – Integrated with Inventory Recipe Manager

let currentEditId = null;
window.currentEditId = null;

// ============================================================================
// OPEN MENU MANAGER MODAL
// ============================================================================
function openAdvancedMenuManager() {
    if (!hasPerm('editMenu')) return showCustomAlert("Denied", "Requires Admin or Manager privilege to edit Menu.");
    document.getElementById('slide-out-menu').classList.remove('active');
    document.getElementById('advanced-menu-modal').classList.add('active');
    populateCatSelect();
    renderManagerList('');
    autoModernizeUI();
}

// ============================================================================
// POPULATE CATEGORY DROPDOWN
// ============================================================================
function populateCatSelect() {
    const s = document.getElementById('adv-item-cat');
    s.innerHTML = '';

    const sortedCategories = [...menuCategories].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

    sortedCategories.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        s.appendChild(o);
    });
    initializeCustomSelect('adv-item-cat');
    initializeCustomSelect('adv-item-status');
}

// ============================================================================
// RENDER MANAGER LIST (LEFT PANEL)
// ============================================================================
function renderManagerList(term) {
    const body = document.getElementById('manager-list-body');
    body.innerHTML = '';
    const filtered = menuItems.filter(i =>
        String(i.name).toLowerCase().includes(term.toLowerCase()) ||
        (i.code && String(i.code).toLowerCase().includes(term.toLowerCase()))
    );

    if (filtered.length === 0) return body.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary); font-size: 0.9rem;">No items found.</div>';

    filtered.forEach(i => {
        const statusClass = i.status === 'available' ? 'status-available' : 'status-disabled';
        const statusText = i.status === 'available' ? 'Active' : 'Hidden';
        body.innerHTML += `
            <div class="modern-list-item ${currentEditId === i.id ? 'selected' : ''}" onclick="loadManagerItem('${i.id}', this)">
                <div class="li-main"><span class="li-name">${i.name} ${i.code ? ` <span style="color:var(--text-secondary);font-size:0.75rem;font-weight:500;">[${i.code}]</span>` : ''}</span><div class="li-meta"><span class="li-badge">${i.category.toUpperCase()}</span><span class="li-badge ${statusClass}">${statusText}</span><span class="li-badge">Pos: ${i.sortOrder || 0}</span></div></div>
                <div class="li-price">${i.price}</div>
            </div>`;
    });
}

// ============================================================================
// LOAD MENU ITEM INTO FORM
// ============================================================================
function loadManagerItem(id, elem) {
    document.querySelectorAll('#manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
    if (elem) elem.classList.add('selected');

    const i = menuItems.find(x => x.id == id);
    if (!i) {
        console.error("Item not found for ID:", id);
        resetManagerForm();
        return;
    }

    currentEditId = i.id;
    window.currentEditId = i.id;
    document.getElementById('adv-item-name').value = i.name;
    document.getElementById('adv-item-alt-name').value = i.altName || '';
    document.getElementById('adv-item-price').value = i.price;
    document.getElementById('adv-item-sort').value = i.sortOrder || 0;
    document.getElementById('adv-item-cat').value = i.category;
    document.getElementById('adv-item-status').value = i.status || 'available';
    initializeCustomSelect('adv-item-cat');
    initializeCustomSelect('adv-item-status');
    document.getElementById('adv-item-code').value = i.code || '';
    document.getElementById('adv-ask-price').checked = i.askPrice || false;
    document.getElementById('adv-ask-qty').checked = i.askQty || false;
    document.getElementById('adv-img-base64').value = i.imgData || '';

    const imgCard = document.getElementById('adv-img-card');
    const imgPreview = document.getElementById('adv-img-preview');
    if (i.imgData) {
        imgPreview.src = i.imgData;
        imgPreview.style.display = 'block';
        imgCard.classList.add('has-image');
    } else {
        imgPreview.src = '';
        imgPreview.style.display = 'none';
        imgCard.classList.remove('has-image');
    }

    const vContainer = document.getElementById('adv-variants-list');
    vContainer.innerHTML = '';
    if (i.variants && i.variants.length > 0) {
        i.variants.forEach(v => addVariantField(v.vName, v.vPrice));
    }

    // Load modifiers
    const mContainer = document.getElementById('adv-modifiers-list');
    mContainer.innerHTML = '';
    if (i.modifiers && i.modifiers.length > 0) {
        i.modifiers.forEach(group => {
            addModifierGroupFromData(group);
        });
    }

    document.getElementById('btn-delete-item').style.display = 'block';
}

// ============================================================================
// RESET FORM (CLEAR FIELDS)
// ============================================================================
function resetManagerForm() {
    currentEditId = null;
    window.currentEditId = null;
    document.querySelectorAll('#manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
    document.getElementById('adv-item-name').value = '';
    document.getElementById('adv-item-alt-name').value = '';
    document.getElementById('adv-item-price').value = '';
    document.getElementById('adv-item-sort').value = '';
    document.getElementById('adv-item-code').value = '';
    document.getElementById('adv-ask-price').checked = false;
    document.getElementById('adv-ask-qty').checked = false;
    document.getElementById('adv-img-base64').value = '';
    document.getElementById('adv-img-input').value = '';
    document.getElementById('adv-item-status').value = 'available';
    if (document.getElementById('adv-item-cat').options.length > 0) document.getElementById('adv-item-cat').selectedIndex = 0;
    initializeCustomSelect('adv-item-cat');
    initializeCustomSelect('adv-item-status');

    const imgCard = document.getElementById('adv-img-card');
    document.getElementById('adv-img-preview').style.display = 'none';
    imgCard.classList.remove('has-image');
    document.getElementById('adv-img-preview').src = '';
    document.getElementById('adv-variants-list').innerHTML = '';
    document.getElementById('adv-modifiers-list').innerHTML = '';
    document.getElementById('btn-delete-item').style.display = 'none';
}

// ============================================================================
// VARIANT FIELDS
// ============================================================================
function addVariantField(vName = '', vPrice = '') {
    const container = document.getElementById('adv-variants-list');
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.className = 'variant-row';
    row.innerHTML = `
        <input type="text" class="modern-input var-name" placeholder="Variant Name (e.g. Half)" value="${vName}" style="flex:2;">
        <input type="number" class="modern-input var-price" placeholder="Price" value="${vPrice}" style="flex:1;">
        <button class="icon-btn-sm" style="color:var(--col-danger); width:45px; height:45px;" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(row);
}

// ============================================================================
// MODIFIER GROUPS
// ============================================================================
function addModifierGroup() {
    const container = document.getElementById('adv-modifiers-list');
    const groupDiv = document.createElement('div');
    groupDiv.className = 'modifier-group';
    groupDiv.style.cssText = 'margin-bottom:15px; background:var(--bg-app); border-radius:12px; padding:12px; box-shadow:var(--neumorph-in-sm);';
    groupDiv.innerHTML = `
        <div style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
            <input type="text" class="modern-input mod-group-name" placeholder="Group name (e.g. Extras, Sauce, Spice Level)" style="flex:1;">
            <button class="icon-btn-sm" style="color:var(--col-danger); flex-shrink:0;" onclick="this.closest('.modifier-group').remove()" title="Remove group"><i class="fas fa-trash"></i></button>
        </div>
        <div class="mod-options-list" style="display:flex; flex-direction:column; gap:6px;"></div>
        <button class="btn-modern" style="background:var(--col-primary-light); color:var(--col-primary); font-size:0.75rem; padding:6px 12px; margin-top:8px; border:none;" onclick="addModifierOption(this)">
            <i class="fas fa-plus"></i> Add Option
        </button>
    `;
    container.appendChild(groupDiv);
    // Auto-add first option row
    addModifierOption(groupDiv.querySelector('button[onclick*="addModifierOption"]'));
}

function addModifierGroupFromData(group) {
    const container = document.getElementById('adv-modifiers-list');
    const groupDiv = document.createElement('div');
    groupDiv.className = 'modifier-group';
    groupDiv.style.cssText = 'margin-bottom:15px; background:var(--bg-app); border-radius:12px; padding:12px; box-shadow:var(--neumorph-in-sm);';
    let optionsHtml = '';
    group.options.forEach(opt => {
        optionsHtml += `
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="modern-input mod-opt-name" placeholder="Option name (e.g. Achaar)" value="${opt.name}" style="flex:2;">
                <input type="number" class="modern-input mod-opt-price" placeholder="Extra price (0 = free)" value="${opt.price}" style="flex:1; min-width:80px;">
                <button class="icon-btn-sm" style="color:var(--col-danger); flex-shrink:0;" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
            </div>
        `;
    });
    groupDiv.innerHTML = `
        <div style="display:flex; gap:8px; margin-bottom:10px; align-items:center;">
            <input type="text" class="modern-input mod-group-name" placeholder="Group name" value="${group.groupName}" style="flex:1;">
            <button class="icon-btn-sm" style="color:var(--col-danger); flex-shrink:0;" onclick="this.closest('.modifier-group').remove()" title="Remove group"><i class="fas fa-trash"></i></button>
        </div>
        <div class="mod-options-list" style="display:flex; flex-direction:column; gap:6px;">${optionsHtml}</div>
        <button class="btn-modern" style="background:var(--col-primary-light); color:var(--col-primary); font-size:0.75rem; padding:6px 12px; margin-top:8px; border:none;" onclick="addModifierOption(this)">
            <i class="fas fa-plus"></i> Add Option
        </button>
    `;
    container.appendChild(groupDiv);
}

function addModifierOption(btn) {
    const optionsList = btn.previousElementSibling;
    const optionDiv = document.createElement('div');
    optionDiv.style.cssText = 'display:flex; gap:8px; align-items:center;';
    optionDiv.innerHTML = `
        <input type="text" class="modern-input mod-opt-name" placeholder="Option name (e.g. Achaar)" style="flex:2;">
        <input type="number" class="modern-input mod-opt-price" placeholder="Extra price (0 = free)" style="flex:1; min-width:80px;" value="0">
        <button class="icon-btn-sm" style="color:var(--col-danger); flex-shrink:0;" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    optionsList.appendChild(optionDiv);
}

// ============================================================================
// SAVE MENU ITEM (CREATE / UPDATE)
// ============================================================================
function saveManagerItem() {
    const name = document.getElementById('adv-item-name').value.trim();
    const price = parseFloat(document.getElementById('adv-item-price').value);
    let newSortOrder = parseInt(document.getElementById('adv-item-sort').value) || 0;
    const category = document.getElementById('adv-item-cat').value;

    if (!name || isNaN(price)) return showCustomAlert("Validation Error", "Please provide a valid Product Name and Selling Price.");

    let variants = [];
    document.querySelectorAll('.variant-row').forEach(row => {
        let n = row.querySelector('.var-name').value.trim();
        let p = parseFloat(row.querySelector('.var-price').value);
        if (n && !isNaN(p)) variants.push({ vName: n, vPrice: p });
    });

    let modifiers = [];
    document.querySelectorAll('.modifier-group').forEach(group => {
        const groupName = group.querySelector('.mod-group-name').value.trim();
        const options = [];
        group.querySelectorAll('.mod-options-list .mod-opt-name').forEach((optInput, idx) => {
            const optName = optInput.value.trim();
            const optPrice = parseFloat(group.querySelectorAll('.mod-opt-price')[idx]?.value) || 0;
            if (optName) options.push({ name: optName, price: optPrice });
        });
        if (groupName && options.length > 0) {
            modifiers.push({ groupName, maxSelect: 999, options }); // 999 = unlimited
        }
    });

    const newItemData = {
        id: currentEditId || `ITEM-${Date.now()}`,
        name: name,
        price: price,
        sortOrder: newSortOrder,
        category: category,
        code: document.getElementById('adv-item-code').value.trim(),
        status: document.getElementById('adv-item-status').value,
        imgData: document.getElementById('adv-img-base64').value,
        altName: document.getElementById('adv-item-alt-name').value.trim(),
        askPrice: document.getElementById('adv-ask-price').checked,
        askQty: document.getElementById('adv-ask-qty').checked,
        variants: variants,
        modifiers: modifiers,
        lastCustomPrice: price,
        lastCustomQty: 1
    };

    let workingMenuItems = [...menuItems];

    if (currentEditId) {
        workingMenuItems = workingMenuItems.filter(item => item.id != currentEditId);
    }

    const duplicateName = workingMenuItems.find(
        item => item.category === category && item.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicateName) {
        return showCustomAlert("Duplicate Error", `An item named "${name}" already exists in the category "${category.toUpperCase()}".`);
    }

    if (currentEditId) {
        const existingIdx = menuItems.findIndex(x => x.id == currentEditId);
        if (existingIdx !== -1) {
            menuItems[existingIdx] = { ...menuItems[existingIdx], ...newItemData };
        } else {
            menuItems.push(newItemData);
        }
    } else {
        menuItems.push(newItemData);
    }

    menuItems.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
    menuItems = menuItems.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));

    localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
    renderManagerList(document.getElementById('manager-search-input').value);
    showToast("Product Saved Successfully!");
    resetManagerForm();
    updateDataLists();
    if (document.getElementById('items-section').classList.contains('active')) renderMenu();
}

// ============================================================================
// DELETE MENU ITEM
// ============================================================================
function deleteMenuItem() {
    if (!currentEditId) return;
    openConfirm("Delete Product", "Are you sure you want to permanently delete this product? This cannot be undone.", () => {
        menuItems = menuItems.filter(item => item.id != currentEditId);
        localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
        showToast("Product Deleted");
        resetManagerForm();
        renderManagerList('');
        if (document.getElementById('items-section').classList.contains('active')) renderMenu();
        updateDataLists();
    });
}

// ============================================================================
// IMAGE PREVIEW & REMOVAL
// ============================================================================
function previewImage(input) {
    if (input.files && input.files[0]) {
        var r = new FileReader();
        r.onload = function(e) {
            const imgCard = document.getElementById('adv-img-card');
            const imgPreview = document.getElementById('adv-img-preview');
            imgPreview.src = e.target.result;
            imgPreview.style.display = 'block';
            imgCard.classList.add('has-image');
            document.getElementById('adv-img-base64').value = e.target.result;
        };
        r.readAsDataURL(input.files[0]);
    }
}

function removeAdvImage(event) {
    event.stopPropagation();
    document.getElementById('adv-img-base64').value = '';
    document.getElementById('adv-img-preview').src = '';
    document.getElementById('adv-img-preview').style.display = 'none';
    document.getElementById('adv-img-input').value = '';
    document.getElementById('adv-img-card').classList.remove('has-image');
}

// ============================================================================
// TAB SWITCHING (General / Recipe) – Recipe tab links to Inventory
// ============================================================================
function switchAdvTab(t, btn) {
    document.querySelectorAll('.manager-form-content.tab-content').forEach(d => d.style.display = 'none');
    document.getElementById('tab-' + t).style.display = 'block';
    document.querySelectorAll('#advanced-menu-modal .mod-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// ============================================================================
// RESET MENU ITEMS TO DEFAULT (if defaultMenu is defined)
// ============================================================================
function resetMenuItems() {
    if (typeof defaultMenu !== 'undefined' && defaultMenu.length) {
        menuItems = JSON.parse(JSON.stringify(defaultMenu));
        menuItems.forEach(item => {
            if (item.lastCustomPrice === undefined) item.lastCustomPrice = item.price;
            if (item.lastCustomQty === undefined) item.lastCustomQty = 1;
        });
        localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
        showToast("Menu items reset to default.");
        resetManagerForm();
        renderManagerList('');
        if (document.getElementById('items-section').classList.contains('active')) renderMenu();
        updateDataLists();
    } else {
        showCustomAlert("Error", "No default menu defined.");
    }
}

// ============================================================================
// EXPORT MENU TO CSV
// ============================================================================
function exportMenuCSV() {
    if (menuItems.length === 0) {
        const template = "id,name,category,price,status,sortOrder,altName,code,askPrice,askQty,variants,modifiers,lastCustomPrice,lastCustomQty\nITEM-001,Sample Item,other,100,available,1,,SAMPLE-SKU,FALSE,FALSE,Full:100|Half:60,\"Extra Cheese:50|Mushrooms:40\",100,1";
        downloadFile(template, "menu_template.csv", "text/csv");
        return;
    }
    let csv = "id,name,category,price,status,sortOrder,altName,code,askPrice,askQty,variants,modifiers,lastCustomPrice,lastCustomQty\n";
    menuItems.forEach(i => {
        const escapeCsvField = (field) => {
            if (field === null || field === undefined) return '';
            let s = String(field);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        const safeId = escapeCsvField(i.id);
        const safeName = escapeCsvField(i.name);
        const safeCategory = escapeCsvField(i.category);
        const safePrice = i.price;
        const safeStatus = escapeCsvField(i.status);
        const safeSortOrder = i.sortOrder || 0;
        const safeAltName = escapeCsvField(i.altName);
        const safeCode = escapeCsvField(i.code);
        const safeAskPrice = i.askPrice ? 'TRUE' : 'FALSE';
        const safeAskQty = i.askQty ? 'TRUE' : 'FALSE';
        const variantString = i.variants && i.variants.length > 0
            ? escapeCsvField(i.variants.map(v => `${v.vName}:${v.vPrice}`).join('|'))
            : '';
        const modifierString = i.modifiers && i.modifiers.length > 0
            ? escapeCsvField(i.modifiers.map(g => g.groupName + '[' + g.maxSelect + ']' + g.options.map(o => o.name + ':' + o.price).join(',')).join(';'))
            : '';
        const safeLastCustomPrice = i.lastCustomPrice || i.price;
        const safeLastCustomQty = i.lastCustomQty || 1;

        csv += `${safeId},${safeName},${safeCategory},${safePrice},${safeStatus},${safeSortOrder},${safeAltName},${safeCode},${safeAskPrice},${safeAskQty},${variantString},${modifierString},${safeLastCustomPrice},${safeLastCustomQty}\n`;
    });
    downloadFile(csv, `menu_backup_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
}

// ============================================================================
// IMPORT MENU FROM CSV
// ============================================================================
function handleMenuImport(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        if (rows.length < 2) return showCustomAlert("Error", "CSV is empty or invalid format.");

        const parseCSVLine = (line) => {
            const result = [];
            let inQuote = false;
            let currentField = '';
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuote && line[i + 1] === '"') {
                        currentField += '"';
                        i++;
                    } else {
                        inQuote = !inQuote;
                    }
                } else if (char === ',' && !inQuote) {
                    result.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            result.push(currentField.trim());
            return result;
        };

        const headers = parseCSVLine(rows[0]).map(h => h.toLowerCase());
        let updates = 0, newItems = 0;
        let processedItems = [];

        for (let i = 1; i < rows.length; i++) {
            const cols = parseCSVLine(rows[i]);
            if (cols.length === 0) continue;
            if (cols.length < headers.length) {
                console.warn(`Skipping malformed CSV row ${i + 1}: "${rows[i]}"`);
                continue;
            }

            const getItemProperty = (headerName) => {
                const headerIndex = headers.indexOf(headerName.toLowerCase());
                return headerIndex !== -1 ? cols[headerIndex] : undefined;
            };

            let itemObj = {
                id: getItemProperty('id') || `ITEM-${Date.now()}-${i}`,
                name: getItemProperty('name') || '',
                category: getItemProperty('category') || 'other',
                price: parseFloat(getItemProperty('price')) || 0,
                status: getItemProperty('status') || 'available',
                sortOrder: parseInt(getItemProperty('sortorder')) || 0,
                altName: getItemProperty('altname') || '',
                code: getItemProperty('code') || '',
                askPrice: (getItemProperty('askprice') || 'FALSE').toUpperCase() === 'TRUE',
                askQty: (getItemProperty('askqty') || 'FALSE').toUpperCase() === 'TRUE',
                variants: [],
                modifiers: [],
                lastCustomPrice: parseFloat(getItemProperty('lastcustomprice')) || parseFloat(getItemProperty('price')) || 0,
                lastCustomQty: parseFloat(getItemProperty('lastcustomqty')) || 1
            };

            const variantsStr = getItemProperty('variants');
            if (variantsStr) {
                itemObj.variants = variantsStr.split('|')
                    .map(v => {
                        const parts = v.split(':');
                        return parts.length === 2 ? { vName: parts[0].trim(), vPrice: parseFloat(parts[1]) || 0 } : null;
                    })
                    .filter(v => v !== null);
            }

            const modifiersStr = getItemProperty('modifiers');
            if (modifiersStr) {
                itemObj.modifiers = modifiersStr.split(';').map(g => {
                    const match = g.match(/(.+?)\[(\d+)\](.+)/);
                    if (match) {
                        const groupName = match[1].trim();
                        const maxSelect = parseInt(match[2]);
                        const optionsStr = match[3];
                        const options = optionsStr.split(',').map(opt => {
                            const [name, price] = opt.split(':');
                            return { name: name.trim(), price: parseFloat(price) || 0 };
                        }).filter(o => o.name);
                        return { groupName, maxSelect, options };
                    }
                    return null;
                }).filter(g => g !== null);
            }

            const validStatuses = ['available', 'disabled'];
            if (!validStatuses.includes(itemObj.status)) {
                itemObj.status = 'available';
            }

            let rawItemCategory = itemObj.category;
            const sanitizedCategory = rawItemCategory.toLowerCase().replace(/[^a-z0-9]/g, '');
            itemObj.category = sanitizedCategory;

            if (!menuCategories.find(c => c.id === sanitizedCategory)) {
                if (sanitizedCategory) {
                    menuCategories.push({ id: sanitizedCategory, name: rawItemCategory.toUpperCase(), sortOrder: 99 });
                }
            }

            const existing = menuItems.find(mi => mi.id == itemObj.id);
            if (existing) updates++;
            else newItems++;
            processedItems.push(itemObj);
        }

        pendingImportData = { type: 'menu', data: processedItems };
        document.getElementById('import-summary-text').innerHTML = `
            <strong>Menu File Analyzed:</strong><br><br>
            <span style="color:var(--col-success); font-weight:bold;">${updates}</span> existing items will be updated.<br>
            <span style="color:var(--col-primary); font-weight:bold;">${newItems}</span> new items will be added.
        `;
        document.getElementById('import-confirm-btn').onclick = executeSmartImport;
        document.getElementById('import-summary-modal').classList.add('active');
        input.value = '';
    };
    reader.readAsText(file);
}

// ============================================================================
// OPEN INVENTORY RECIPE MANAGER FOR CURRENT MENU ITEM
// ============================================================================
function openInventoryForRecipe(menuItemId) {
    if (!menuItemId) {
        showCustomAlert("No Item Selected", "Please select a menu item first.");
        return;
    }
    // Switch to inventory section
    showSection('inventory');
    // Wait for inventory section to load, then switch to recipe tab and load the recipe for this item
    setTimeout(() => {
        if (typeof inv_switchTab === 'function') {
            inv_switchTab('recipes');
            setTimeout(() => {
                const itemSelect = document.getElementById('inv-recipe-item-select');
                if (itemSelect) {
                    itemSelect.value = menuItemId;
                    inv_loadRecipeForMenuItem(menuItemId);
                }
            }, 150);
        } else {
            showCustomAlert("Inventory Module", "Inventory module not loaded. Please ensure inventory scripts are included.");
        }
    }, 200);
}

// ============================================================================
// GLOBAL EXPORTS (to ensure functions are accessible from HTML)
// ============================================================================
window.openAdvancedMenuManager = openAdvancedMenuManager;
window.populateCatSelect = populateCatSelect;
window.renderManagerList = renderManagerList;
window.loadManagerItem = loadManagerItem;
window.resetManagerForm = resetManagerForm;
window.addVariantField = addVariantField;
window.addModifierGroup = addModifierGroup;
window.addModifierGroupFromData = addModifierGroupFromData;
window.addModifierOption = addModifierOption;
window.saveManagerItem = saveManagerItem;
window.deleteMenuItem = deleteMenuItem;
window.previewImage = previewImage;
window.removeAdvImage = removeAdvImage;
window.switchAdvTab = switchAdvTab;
window.resetMenuItems = resetMenuItems;
window.exportMenuCSV = exportMenuCSV;
window.handleMenuImport = handleMenuImport;
window.openInventoryForRecipe = openInventoryForRecipe;