/* 
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT: ADVANCED MANAGERS (Table, Category, Menu) (managers.js)             ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

// --- TABLE MANAGER LOGIC ---
let tblViewMode = 'tables'; 
let currentTableEdit = null;   
let currentSectionEdit = null; 
let currentZoneEdit = null;    

function openTableManager() {
    if(!hasPerm('editMenu')) return showCustomAlert("Denied", "Requires Admin or Manager privilege.");
    document.getElementById('slide-out-menu').classList.remove('active');
    document.getElementById('table-manager-modal').classList.add('active');
    switchTblTab('tables', document.querySelector('#table-manager-modal .mod-tab-btn.active') || document.querySelector('#table-manager-modal .mod-tab-btn'));
}

function switchTblTab(tabId, btn) {
    tblViewMode = tabId;
    document.querySelectorAll('#table-manager-modal .mod-tab-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    document.getElementById('view-tbl-tables').style.display = tabId === 'tables' ? 'grid' : 'none';
    document.getElementById('view-tbl-sections').style.display = tabId === 'sections' ? 'grid' : 'none';
    document.getElementById('view-tbl-zones').style.display = tabId === 'zones' ? 'grid' : 'none';
    
    if (tabId === 'tables' || tabId === 'sections') populateTblManagerDropdowns();

    resetCurrentTblForm();
    renderTblManagerList(document.getElementById('tbl-search-input').value || '');
}

function populateTblManagerDropdowns() {
    const tZone = document.getElementById('adv-tbl-zone');
    tZone.innerHTML = '';
    tableLayout.forEach(z => tZone.appendChild(new Option(z.name, z.id)));
    initializeCustomSelect('adv-tbl-zone');
    
    tZone.removeEventListener('change', updateTableSectionDropdown);
    tZone.addEventListener('change', updateTableSectionDropdown);
    updateTableSectionDropdown();

    const sZone = document.getElementById('adv-sec-zone');
    sZone.innerHTML = '';
    tableLayout.forEach(z => sZone.appendChild(new Option(z.name, z.id)));
    initializeCustomSelect('adv-sec-zone');
}

function updateTableSectionDropdown() {
    const zoneId = document.getElementById('adv-tbl-zone').value;
    const secSelect = document.getElementById('adv-tbl-section');
    secSelect.innerHTML = '';
    const zone = tableLayout.find(z => z.id === zoneId);
    if(zone && zone.sections) {
        zone.sections.forEach((s, idx) => secSelect.appendChild(new Option(s.name, idx)));
    }
    initializeCustomSelect('adv-tbl-section');
}

function getFlattenedTables() {
    let list =[];
    tableLayout.forEach((z, zIdx) => {
        z.sections.forEach((s, sIdx) => {
            s.tables.forEach(t => {
                const tName = typeof t === 'string' ? t : t.name;
                const tSort = typeof t === 'string' ? 0 : (t.sortOrder || 0);
                list.push({ zoneId: z.id, zoneName: z.name, sectionIdx: sIdx, sectionName: s.name, tableName: tName, sortOrder: tSort });
            });
        });
    });
    return list;
}
function getFlattenedSections() {
    let list =[];
    tableLayout.forEach((z) => {
        z.sections.forEach((s, sIdx) => list.push({ zoneId: z.id, zoneName: z.name, secIdx: sIdx, sectionName: s.name, prefix: s.prefix }));
    });
    return list;
}

function renderTblManagerList(term) {
    const body = document.getElementById('tbl-manager-list-body'); body.innerHTML = '';
    const query = term.toLowerCase();

    if (tblViewMode === 'tables') {
        const allTables = getFlattenedTables();
        const filtered = allTables.filter(t => t.tableName.toLowerCase().includes(query));
        if(filtered.length === 0) return body.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">No tables found.</div>';
        
        filtered.forEach(t => {
            const isSel = currentTableEdit && currentTableEdit.originalName === t.tableName ? 'selected' : '';
            body.innerHTML += `
                <div class="modern-list-item ${isSel}" onclick="loadTblTable('${t.zoneId}', ${t.sectionIdx}, '${t.tableName}', ${t.sortOrder}, this)">
                    <div class="li-main"><span class="li-name">${t.tableName}</span><div class="li-meta"><span class="li-badge">${t.zoneName}</span><span class="li-badge" style="background:var(--col-primary-light); color:var(--col-primary);">${t.sectionName}</span><span class="li-badge" style="background:rgba(0,0,0,0.1);">Pos: ${t.sortOrder}</span></div></div>
                </div>`;
        });
    } else if (tblViewMode === 'sections') {
        const allSecs = getFlattenedSections();
        const filtered = allSecs.filter(s => s.sectionName.toLowerCase().includes(query));
        if(filtered.length === 0) return body.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">No sections found.</div>';
        
        filtered.forEach(s => {
            const isSel = currentSectionEdit && currentSectionEdit.zoneId === s.zoneId && currentSectionEdit.secIdx === s.secIdx ? 'selected' : '';
            body.innerHTML += `
                <div class="modern-list-item ${isSel}" onclick="loadTblSection('${s.zoneId}', ${s.secIdx}, this)">
                    <div class="li-main"><span class="li-name">${s.sectionName} ${s.prefix ? `[${s.prefix}]` : ''}</span><div class="li-meta"><span class="li-badge">${s.zoneName}</span></div></div>
                </div>`;
        });
    } else {
        const filtered = tableLayout.filter(z => z.name.toLowerCase().includes(query) || z.id.toLowerCase().includes(query));
        if(filtered.length === 0) return body.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">No zones found.</div>';
        
        filtered.forEach(z => {
            const isSel = currentZoneEdit === z.id ? 'selected' : '';
            body.innerHTML += `
                <div class="modern-list-item ${isSel}" onclick="loadTblZone('${z.id}', this)">
                    <div class="li-main"><span class="li-name">${z.name}</span><div class="li-meta"><span class="li-badge">${z.id}</span><span class="li-badge" style="background:rgba(0,0,0,0.1);">${z.sections.length} Sections</span></div></div>
                </div>`;
        });
    }
}

function loadTblTable(zoneId, sectionIdx, tableName, sortOrder, elem) {
    document.querySelectorAll('#tbl-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected')); if(elem) elem.classList.add('selected');
    currentTableEdit = { zoneId, sectionIdx, originalName: tableName };
    document.getElementById('adv-tbl-name').value = tableName;
    document.getElementById('adv-tbl-sort').value = sortOrder || 0;
    document.getElementById('adv-tbl-zone').value = zoneId; initializeCustomSelect('adv-tbl-zone');
    updateTableSectionDropdown();
    document.getElementById('adv-tbl-section').value = sectionIdx; initializeCustomSelect('adv-tbl-section');
    document.getElementById('btn-delete-tbl-master').style.display = 'block';
}

function loadTblSection(zoneId, secIdx, elem) {
    document.querySelectorAll('#tbl-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected')); if(elem) elem.classList.add('selected');
    currentSectionEdit = { zoneId, secIdx };
    const s = tableLayout.find(x => x.id === zoneId).sections[secIdx];
    document.getElementById('adv-sec-name').value = s.name;
    document.getElementById('adv-sec-prefix').value = s.prefix || '';
    document.getElementById('adv-sec-zone').value = zoneId; initializeCustomSelect('adv-sec-zone');
    document.getElementById('btn-delete-tbl-master').style.display = 'block';
}

function loadTblZone(zoneId, elem) {
    document.querySelectorAll('#tbl-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected')); if(elem) elem.classList.add('selected');
    currentZoneEdit = zoneId;
    const z = tableLayout.find(x => x.id === zoneId);
    document.getElementById('adv-zone-name').value = z.name;
    document.getElementById('adv-zone-id').value = z.id;
    document.getElementById('adv-zone-id').disabled = true;
    document.getElementById('btn-delete-tbl-master').style.display = 'block';
}

function resetCurrentTblForm() {
    document.querySelectorAll('#tbl-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
    document.getElementById('btn-delete-tbl-master').style.display = 'none';

    if (tblViewMode === 'tables') {
        currentTableEdit = null;
        document.getElementById('adv-tbl-name').value = '';
        document.getElementById('adv-tbl-sort').value = '';
        if(tableLayout.length > 0) {
            document.getElementById('adv-tbl-zone').value = tableLayout[0].id;
            initializeCustomSelect('adv-tbl-zone'); updateTableSectionDropdown();
        }
    } else if (tblViewMode === 'sections') {
        currentSectionEdit = null;
        document.getElementById('adv-sec-name').value = ''; document.getElementById('adv-sec-prefix').value = '';
        if(tableLayout.length > 0) { document.getElementById('adv-sec-zone').value = tableLayout[0].id; initializeCustomSelect('adv-sec-zone'); }
    } else {
        currentZoneEdit = null;
        document.getElementById('adv-zone-name').value = ''; document.getElementById('adv-zone-id').value = '';
        document.getElementById('adv-zone-id').disabled = false;
    }
}

function saveTblMaster() {
    if (tblViewMode === 'tables') saveTableItem();
    else if (tblViewMode === 'sections') saveSectionItem();
    else if (tblViewMode === 'zones') saveZoneItem();
}

function deleteTblMaster() {
    if (tblViewMode === 'tables') deleteTableItem();
    else if (tblViewMode === 'sections') deleteSectionItem();
    else if (tblViewMode === 'zones') deleteZoneItem();
}

function finalizeTblSave(msg) {
    localStorage.setItem('pos_layout_v2', JSON.stringify(tableLayout));
    showToast(msg);
    resetCurrentTblForm();
    renderTblManagerList(document.getElementById('tbl-search-input').value);
    buildDynamicZones(); renderAllTables(); updateDataLists();
}

function saveTableItem() {
    const newName = document.getElementById('adv-tbl-name').value.trim();
    const sortOrder = parseInt(document.getElementById('adv-tbl-sort').value) || 0;
    const targetZoneId = document.getElementById('adv-tbl-zone').value;
    const targetSectionIdx = parseInt(document.getElementById('adv-tbl-section').value);

    if(!newName) return showCustomAlert("Validation", "Please provide a valid Table Name.");
    if(!targetZoneId) return showCustomAlert("Validation", "You must select a Zone.");
    if(isNaN(targetSectionIdx)) return showCustomAlert("Validation", "You must select a Section.");

    const allTables = getFlattenedTables();
    const duplicateTbl = allTables.find(t => t.tableName.toLowerCase() === newName.toLowerCase());
    
    if (currentTableEdit) {
        if(newName.toLowerCase() !== currentTableEdit.originalName.toLowerCase() && duplicateTbl) {
            return showCustomAlert("Duplicate Error", `Table "${newName}" already exists.`);
        }
        if (newName !== currentTableEdit.originalName && app.orders[currentTableEdit.originalName]) {
            app.orders[newName] = app.orders[currentTableEdit.originalName]; delete app.orders[currentTableEdit.originalName];
            localStorage.setItem('savedOrders', JSON.stringify(app.orders));
        }
        const oldZone = tableLayout.find(z => z.id === currentTableEdit.zoneId);
        oldZone.sections[currentTableEdit.sectionIdx].tables = oldZone.sections[currentTableEdit.sectionIdx].tables.filter(t => {
            return (typeof t === 'string' ? t : t.name) !== currentTableEdit.originalName;
        });
    } else {
        if(duplicateTbl) return showCustomAlert("Duplicate Error", `Table "${newName}" already exists.`);
    }
    
    tableLayout.find(z => z.id === targetZoneId).sections[targetSectionIdx].tables.push({ name: newName, sortOrder: sortOrder });
    finalizeTblSave(currentTableEdit ? "Table Updated" : "Table Added");
}

function saveSectionItem() {
    const name = document.getElementById('adv-sec-name').value.trim();
    const prefix = document.getElementById('adv-sec-prefix').value.trim();
    const zoneId = document.getElementById('adv-sec-zone').value;

    if(!name || !zoneId) return showCustomAlert("Validation", "Section Name and Zone required.");

    const allSecs = getFlattenedSections();
    const duplicateSec = allSecs.find(s => s.sectionName.toLowerCase() === name.toLowerCase());

    if(currentSectionEdit) {
        const currentSec = tableLayout.find(x => x.id === currentSectionEdit.zoneId).sections[currentSectionEdit.secIdx];
        if(name.toLowerCase() !== currentSec.name.toLowerCase() && duplicateSec) {
            return showCustomAlert("Duplicate Error", `Section "${name}" already exists.`);
        }

        if(currentSectionEdit.zoneId !== zoneId) {
            const oldZone = tableLayout.find(x => x.id === currentSectionEdit.zoneId);
            const sec = oldZone.sections.splice(currentSectionEdit.secIdx, 1)[0];
            sec.name = name; sec.prefix = prefix;
            tableLayout.find(x => x.id === zoneId).sections.push(sec);
        } else {
            const sec = tableLayout.find(x => x.id === zoneId).sections[currentSectionEdit.secIdx];
            sec.name = name; sec.prefix = prefix;
        }
    } else {
        if(duplicateSec) return showCustomAlert("Duplicate Error", `Section "${name}" already exists.`);
        tableLayout.find(x => x.id === zoneId).sections.push({ name, prefix, tables:[] });
    }
    finalizeTblSave(currentSectionEdit ? "Section Updated" : "Section Added");
}

function saveZoneItem() {
    const name = document.getElementById('adv-zone-name').value.trim();
    const id = document.getElementById('adv-zone-id').value.trim();
    if(!name || !id) return showCustomAlert("Validation", "Zone Name and ID required.");

    const duplicateNameZone = tableLayout.find(x => x.name.toLowerCase() === name.toLowerCase());

    if(currentZoneEdit) {
        const currentZone = tableLayout.find(x => x.id === currentZoneEdit);
        if (name.toLowerCase() !== currentZone.name.toLowerCase() && duplicateNameZone) {
             return showCustomAlert("Duplicate Error", `A zone named "${name}" already exists.`);
        }
        currentZone.name = name;
    } else {
        if(duplicateNameZone) return showCustomAlert("Duplicate Error", `A zone named "${name}" already exists.`);
        if(tableLayout.find(x => x.id.toLowerCase() === id.toLowerCase())) return showCustomAlert("Duplicate Error", "A zone with this ID already exists.");
        tableLayout.push({ id, name, sections:[] });
    }
    finalizeTblSave(currentZoneEdit ? "Zone Updated" : "Zone Added");
}

function deleteTableItem() {
    if(!currentTableEdit) return;
    if(app.orders[currentTableEdit.originalName] && app.orders[currentTableEdit.originalName].items.length > 0) return showCustomAlert("Denied", "Table has active order. Close it first.");
    const z = tableLayout.find(x => x.id === currentTableEdit.zoneId);
    z.sections[currentTableEdit.sectionIdx].tables = z.sections[currentTableEdit.sectionIdx].tables.filter(t => {
        return (typeof t === 'string' ? t : t.name) !== currentTableEdit.originalName;
    });
    delete app.orders[currentTableEdit.originalName]; localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    finalizeTblSave("Table Deleted");
}

function deleteSectionItem() {
    if(!currentSectionEdit) return;
    const z = tableLayout.find(x => x.id === currentSectionEdit.zoneId);
    const s = z.sections[currentSectionEdit.secIdx];
    if(s.tables && s.tables.length > 0) return showCustomAlert("Denied", `Delete all ${s.tables.length} tables inside this section first.`);
    z.sections.splice(currentSectionEdit.secIdx, 1);
    finalizeTblSave("Section Deleted");
}

function deleteZoneItem() {
    if(!currentZoneEdit) return;
    const z = tableLayout.find(x => x.id === currentZoneEdit);
    if(z.sections && z.sections.length > 0) return showCustomAlert("Denied", `Delete all ${z.sections.length} sections inside this zone first.`);
    tableLayout = tableLayout.filter(x => x.id !== currentZoneEdit);
    finalizeTblSave("Zone Deleted");
}

// --- CATEGORY MANAGER LOGIC ---
let currentCatEditId = null;

function openCategoryManager() {
    if(!hasPerm('editMenu')) return showCustomAlert("Denied", "Requires Admin or Manager privilege to edit Menu.");
    document.getElementById('slide-out-menu').classList.remove('active');
    document.getElementById('cat-manager-modal').classList.add('active');
    renderCategoryManagerList('');
    resetCategoryForm();
}

function renderCategoryManagerList(term) {
    const body = document.getElementById('cat-manager-list-body');
    body.innerHTML = '';
    const filtered = menuCategories.filter(c => c.name.toLowerCase().includes(term.toLowerCase()) || c.id.toLowerCase().includes(term.toLowerCase()));
    
    if (filtered.length === 0) {
        body.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">No categories found.</div>'; return;
    }

    filtered.forEach(c => {
        body.innerHTML += `
            <div class="modern-list-item ${currentCatEditId === c.id ? 'selected' : ''}" onclick="loadCategoryItem('${c.id}', this)">
                <div class="li-main"><span class="li-name">${c.name}</span><div class="li-meta"><span class="li-badge">${c.id}</span></div></div>
                <i class="fas fa-chevron-right" style="color: var(--text-secondary); font-size: 0.8rem;"></i>
            </div>`;
    });
}

function loadCategoryItem(id, elem) {
    document.querySelectorAll('#cat-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected')); if(elem) elem.classList.add('selected');
    const c = menuCategories.find(x => x.id === id); if(!c) return;
    currentCatEditId = id;
    document.getElementById('adv-cat-name').value = c.name;
    document.getElementById('adv-cat-id').value = c.id; document.getElementById('adv-cat-id').disabled = true; 
    document.getElementById('btn-delete-cat').style.display = 'block';
}

function resetCategoryForm() {
    currentCatEditId = null;
    document.querySelectorAll('#cat-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
    document.getElementById('adv-cat-name').value = '';
    document.getElementById('adv-cat-id').value = ''; document.getElementById('adv-cat-id').disabled = false;
    document.getElementById('btn-delete-cat').style.display = 'none';
}

function saveCategoryItem() {
    const name = document.getElementById('adv-cat-name').value.trim();
    const id = document.getElementById('adv-cat-id').value.trim();
    if(!name || !id) return showCustomAlert("Validation Error", "Please provide both Category Name and Category ID.");

    const duplicateNameCat = menuCategories.find(x => x.name.toLowerCase() === name.toLowerCase());

    if(currentCatEditId) {
        const currentCat = menuCategories.find(x => x.id === currentCatEditId);
        if(name.toLowerCase() !== currentCat.name.toLowerCase() && duplicateNameCat) {
            return showCustomAlert("Duplicate Error", `A category named "${name}" already exists.`);
        }
        const idx = menuCategories.findIndex(x => x.id === currentCatEditId); menuCategories[idx].name = name;
    } else {
        if(duplicateNameCat) return showCustomAlert("Duplicate Error", `A category named "${name}" already exists.`);
        if(menuCategories.find(x => x.id.toLowerCase() === id.toLowerCase())) return showCustomAlert("Duplicate ID", "A category with this ID already exists.");
        menuCategories.push({ id, name });
    }
    localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
    renderCategoryManagerList(document.getElementById('cat-search-input').value);
    showToast("Category Saved!"); renderCategories(); updateDataLists();
}

function deleteCategoryItem() {
    if(!currentCatEditId) return;
    const itemsInCat = menuItems.filter(i => i.category === currentCatEditId);
    if(itemsInCat.length > 0) return showCustomAlert("Cannot Delete", `There are ${itemsInCat.length} items using this category. Move or delete them first.`);
    menuCategories = menuCategories.filter(x => x.id !== currentCatEditId);
    localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
    resetCategoryForm(); renderCategoryManagerList(document.getElementById('cat-search-input').value);
    showToast("Category Deleted"); renderCategories(); updateDataLists();
}

// --- ADVANCED MENU MANAGER LOGIC ---
let currentEditId = null;

function openAdvancedMenuManager() { 
    if(!hasPerm('editMenu')) return showCustomAlert("Denied", "Requires Admin or Manager privilege to edit Menu.");
    document.getElementById('slide-out-menu').classList.remove('active'); 
    document.getElementById('advanced-menu-modal').classList.add('active'); 
    populateCatSelect(); renderManagerList(''); 
}

function populateCatSelect() { 
    const s = document.getElementById('adv-item-cat'); s.innerHTML=''; 
    menuCategories.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; s.appendChild(o); }); 
    initializeCustomSelect('adv-item-cat'); initializeCustomSelect('adv-item-status');
}

function renderManagerList(term) {
    const body = document.getElementById('manager-list-body'); body.innerHTML = '';
    const filtered = menuItems.filter(i => i.name.toLowerCase().includes(term.toLowerCase()) || (i.code && i.code.toLowerCase().includes(term.toLowerCase())));
    
    if (filtered.length === 0) return body.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary); font-size: 0.9rem;">No items found.</div>';

    filtered.forEach(i => {
        const statusClass = i.status === 'available' ? 'status-available' : 'status-disabled';
        const statusText = i.status === 'available' ? 'Active' : 'Hidden';
        body.innerHTML += `
            <div class="modern-list-item ${currentEditId === i.id ? 'selected' : ''}" onclick="loadManagerItem(${i.id}, this)">
                <div class="li-main"><span class="li-name">${i.name} ${i.code ? ` <span style="color:var(--text-secondary);font-size:0.75rem;font-weight:500;">[${i.code}]</span>` : ''}</span><div class="li-meta"><span class="li-badge">${i.category.toUpperCase()}</span><span class="li-badge ${statusClass}">${statusText}</span><span class="li-badge">Pos: ${i.sortOrder || 0}</span></div></div>
                <div class="li-price">${i.price}</div>
            </div>`;
    });
}

function loadManagerItem(id, elem) {
    document.querySelectorAll('#manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected')); if(elem) elem.classList.add('selected');
    const i = menuItems.find(x => x.id === id); if(!i) return; 
    currentEditId = id;
    document.getElementById('adv-item-name').value = i.name; 
    document.getElementById('adv-item-alt-name').value = i.altName || '';
    document.getElementById('adv-item-price').value = i.price;
    document.getElementById('adv-item-sort').value = i.sortOrder || 0;
    document.getElementById('adv-item-cat').value = i.category; 
    document.getElementById('adv-item-status').value = i.status || 'available'; 
    initializeCustomSelect('adv-item-cat'); initializeCustomSelect('adv-item-status');
    document.getElementById('adv-item-code').value = i.code || '';
    document.getElementById('adv-ask-price').checked = i.askPrice || false;
    document.getElementById('adv-ask-qty').checked = i.askQty || false;
    document.getElementById('adv-img-base64').value = i.imgData || '';
    
    const imgCard = document.getElementById('adv-img-card'); const imgPreview = document.getElementById('adv-img-preview');
    if(i.imgData) { imgPreview.src = i.imgData; imgPreview.style.display = 'block'; imgCard.classList.add('has-image'); } 
    else { imgPreview.src = ''; imgPreview.style.display = 'none'; imgCard.classList.remove('has-image'); }

    // Load Variants
    const vContainer = document.getElementById('adv-variants-list');
    vContainer.innerHTML = '';
    if(i.variants && i.variants.length > 0) {
        i.variants.forEach(v => addVariantField(v.vName, v.vPrice));
    }
}

function resetManagerForm() { 
    currentEditId = null; 
    document.querySelectorAll('#manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
    document.getElementById('adv-item-name').value = ''; document.getElementById('adv-item-alt-name').value = ''; 
    document.getElementById('adv-item-price').value = ''; document.getElementById('adv-item-sort').value = ''; 
    document.getElementById('adv-item-code').value = ''; 
    document.getElementById('adv-ask-price').checked = false; 
    document.getElementById('adv-ask-qty').checked = false; 
    document.getElementById('adv-img-base64').value = ''; document.getElementById('adv-img-input').value = ''; 
    document.getElementById('adv-item-status').value = 'available'; 
    if(document.getElementById('adv-item-cat').options.length > 0) document.getElementById('adv-item-cat').selectedIndex = 0;
    initializeCustomSelect('adv-item-cat'); initializeCustomSelect('adv-item-status');

    const imgCard = document.getElementById('adv-img-card'); document.getElementById('adv-img-preview').style.display = 'none'; 
    imgCard.classList.remove('has-image'); document.getElementById('adv-img-preview').src = '';
    document.getElementById('adv-variants-list').innerHTML = '';
}

function addVariantField(vName = '', vPrice = '') {
    const container = document.getElementById('adv-variants-list');
    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.gap = '10px'; row.className = 'variant-row';
    row.innerHTML = `
        <input type="text" class="modern-input var-name" placeholder="Variant Name (e.g. Half)" value="${vName}" style="flex:2;">
        <input type="number" class="modern-input var-price" placeholder="Price" value="${vPrice}" style="flex:1;">
        <button class="icon-btn-sm" style="color:var(--col-danger); width:45px; height:45px;" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(row);
}

function saveManagerItem() {
    const name = document.getElementById('adv-item-name').value; 
    const price = parseFloat(document.getElementById('adv-item-price').value);
    const sortOrder = parseInt(document.getElementById('adv-item-sort').value) || 0;
    
    if(!name || isNaN(price)) return showCustomAlert("Validation Error", "Please provide a valid Product Name and Selling Price.");

    let variants =[];
    document.querySelectorAll('.variant-row').forEach(row => {
        let n = row.querySelector('.var-name').value.trim();
        let p = parseFloat(row.querySelector('.var-price').value);
        if(n && !isNaN(p)) variants.push({vName: n, vPrice: p});
    });

    const data = {
        id: currentEditId || Date.now(), name: name, price: price, sortOrder: sortOrder, category: document.getElementById('adv-item-cat').value, code: document.getElementById('adv-item-code').value, 
        status: document.getElementById('adv-item-status').value, imgData: document.getElementById('adv-img-base64').value, altName: document.getElementById('adv-item-alt-name').value, 
        askPrice: document.getElementById('adv-ask-price').checked, askQty: document.getElementById('adv-ask-qty').checked, variants: variants
    };

    if(currentEditId) { const idx = menuItems.findIndex(x => x.id === currentEditId); menuItems[idx] = {...menuItems[idx], ...data}; } else { menuItems.push(data); }
    localStorage.setItem('pos_menu_items', JSON.stringify(menuItems)); 
    renderManagerList(document.getElementById('manager-search-input').value); 
    showToast("Product Saved Successfully!"); resetManagerForm(); updateDataLists();
    if(document.getElementById('items-section').classList.contains('active')) renderMenu();
}

function previewImage(input) { 
    if (input.files && input.files[0]) { 
        var r = new FileReader(); 
        r.onload = function(e) { 
            const imgCard = document.getElementById('adv-img-card'); const imgPreview = document.getElementById('adv-img-preview');
            imgPreview.src = e.target.result; imgPreview.style.display = 'block'; 
            imgCard.classList.add('has-image'); document.getElementById('adv-img-base64').value = e.target.result; 
        }; r.readAsDataURL(input.files[0]); 
    } 
}

function removeAdvImage(event) {
    event.stopPropagation(); 
    document.getElementById('adv-img-base64').value = ''; document.getElementById('adv-img-preview').src = '';
    document.getElementById('adv-img-preview').style.display = 'none'; document.getElementById('adv-img-input').value = ''; document.getElementById('adv-img-card').classList.remove('has-image');
}

function switchAdvTab(t, btn) { 
    document.querySelectorAll('.manager-form-content.tab-content').forEach(d => d.style.display = 'none'); 
    document.getElementById('tab-' + t).style.display = 'block'; 
    document.querySelectorAll('#advanced-menu-modal .mod-tab-btn').forEach(b => b.classList.remove('active')); if(btn) btn.classList.add('active'); 
}