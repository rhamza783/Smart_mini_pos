/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: table_manager.js – Table, Section, Zone Management                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

let tblViewMode = 'tables';
let currentTableEdit = null;
let currentSectionEdit = null;
let currentZoneEdit = null;

function openTableManager() {
    if (!hasPerm('editMenu')) return showCustomAlert("Denied", "Requires Admin or Manager privilege.");
    document.getElementById('slide-out-menu').classList.remove('active');
    document.getElementById('table-manager-modal').classList.add('active');
    switchTblTab('tables', document.querySelector('#table-manager-modal .mod-tab-btn.active') || document.querySelector('#table-manager-modal .mod-tab-btn'));
}

function switchTblTab(tabId, btn) {
    tblViewMode = tabId;
    document.querySelectorAll('#table-manager-modal .mod-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.getElementById('view-tbl-tables').style.display = tabId === 'tables' ? 'grid' : 'none';
    document.getElementById('view-tbl-sections').style.display = tabId === 'sections' ? 'grid' : 'none';
    document.getElementById('view-tbl-zones').style.display = tabId === 'zones' ? 'grid' : 'none';

    if (tabId === 'tables' || tabId === 'sections') populateTblManagerDropdowns();

    resetCurrentTblForm();
    renderTblManagerList(document.getElementById('tbl-search-input').value || '');
    autoModernizeUI();
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
    if (zone && zone.sections) {
        zone.sections.forEach((s, idx) => secSelect.appendChild(new Option(s.name, idx)));
    }
    initializeCustomSelect('adv-tbl-section');
}

function getFlattenedTables() {
    let list = [];
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
    let list = [];
    tableLayout.forEach((z) => {
        z.sections.forEach((s, sIdx) => list.push({ zoneId: z.id, zoneName: z.name, secIdx: sIdx, sectionName: s.name, prefix: s.prefix }));
    });
    return list;
}

function renderTblManagerList(term) {
    const body = document.getElementById('tbl-manager-list-body');
    body.innerHTML = '';
    const query = term.toLowerCase();

    if (tblViewMode === 'tables') {
        const allTables = getFlattenedTables();
        const filtered = allTables.filter(t => t.tableName.toLowerCase().includes(query));
        if (filtered.length === 0) return body.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">No tables found.</div>';

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
        if (filtered.length === 0) return body.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">No sections found.</div>';

        filtered.forEach(s => {
            const isSel = currentSectionEdit && currentSectionEdit.zoneId === s.zoneId && currentSectionEdit.secIdx === s.secIdx ? 'selected' : '';
            body.innerHTML += `
                <div class="modern-list-item ${isSel}" onclick="loadTblSection('${s.zoneId}', ${s.secIdx}, this)">
                    <div class="li-main"><span class="li-name">${s.sectionName} ${s.prefix ? `[${s.prefix}]` : ''}</span><div class="li-meta"><span class="li-badge">${s.zoneName}</span></div></div>
                </div>`;
        });
    } else {
        const filtered = tableLayout.filter(z => z.name.toLowerCase().includes(query) || z.id.toLowerCase().includes(query));
        if (filtered.length === 0) return body.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-size: 0.9rem;">No zones found.</div>';

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
    document.querySelectorAll('#tbl-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
    if (elem) elem.classList.add('selected');
    currentTableEdit = { zoneId, sectionIdx, originalName: tableName };
    document.getElementById('adv-tbl-name').value = tableName;
    document.getElementById('adv-tbl-sort').value = sortOrder || 0;
    document.getElementById('adv-tbl-zone').value = zoneId;
    initializeCustomSelect('adv-tbl-zone');
    updateTableSectionDropdown();
    document.getElementById('adv-tbl-section').value = sectionIdx;
    initializeCustomSelect('adv-tbl-section');
    document.getElementById('btn-delete-tbl-master').style.display = 'block';
}

function loadTblSection(zoneId, secIdx, elem) {
    document.querySelectorAll('#tbl-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
    if (elem) elem.classList.add('selected');
    currentSectionEdit = { zoneId, secIdx };
    const s = tableLayout.find(x => x.id === zoneId).sections[secIdx];
    document.getElementById('adv-sec-name').value = s.name;
    document.getElementById('adv-sec-prefix').value = s.prefix || '';
    document.getElementById('adv-sec-zone').value = zoneId;
    initializeCustomSelect('adv-sec-zone');
    document.getElementById('btn-delete-tbl-master').style.display = 'block';
}

function loadTblZone(zoneId, elem) {
    document.querySelectorAll('#tbl-manager-list-body .modern-list-item').forEach(el => el.classList.remove('selected'));
    if (elem) elem.classList.add('selected');
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
        if (tableLayout.length > 0) {
            document.getElementById('adv-tbl-zone').value = tableLayout[0].id;
            initializeCustomSelect('adv-tbl-zone');
            updateTableSectionDropdown();
        }
    } else if (tblViewMode === 'sections') {
        currentSectionEdit = null;
        document.getElementById('adv-sec-name').value = '';
        document.getElementById('adv-sec-prefix').value = '';
        if (tableLayout.length > 0) {
            document.getElementById('adv-sec-zone').value = tableLayout[0].id;
            initializeCustomSelect('adv-sec-zone');
        }
    } else {
        currentZoneEdit = null;
        document.getElementById('adv-zone-name').value = '';
        document.getElementById('adv-zone-id').value = '';
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
    buildDynamicZones();
    renderAllTables();
    updateDataLists();
}

function saveTableItem() {
    const newName = document.getElementById('adv-tbl-name').value.trim();
    let newSortOrder = parseInt(document.getElementById('adv-tbl-sort').value) || 0;
    const targetZoneId = document.getElementById('adv-tbl-zone').value;
    const targetSectionIdx = parseInt(document.getElementById('adv-tbl-section').value);

    if (!newName) return showCustomAlert("Validation", "Please provide a valid Table Name.");
    if (!targetZoneId) return showCustomAlert("Validation", "You must select a Zone.");
    if (isNaN(targetSectionIdx)) return showCustomAlert("Validation", "You must select a Section.");

    const targetZone = tableLayout.find(z => z.id === targetZoneId);
    const targetSection = targetZone.sections[targetSectionIdx];

    let tablesInContext = targetSection.tables.filter(t => (typeof t === 'string' ? t : t.name) !== (currentTableEdit?.originalName || ''));

    const duplicateTbl = tablesInContext.find(t => (typeof t === 'string' ? t : t.name).toLowerCase() === newName.toLowerCase());

    if (currentTableEdit) {
        if (newName.toLowerCase() !== currentTableEdit.originalName.toLowerCase() && duplicateTbl) {
            return showCustomAlert("Duplicate Error", `Table "${newName}" already exists in this section.`);
        }
        if (newName !== currentTableEdit.originalName && app.orders[currentTableEdit.originalName]) {
            app.orders[newName] = app.orders[currentTableEdit.originalName];
            delete app.orders[currentTableEdit.originalName];
            localStorage.setItem('savedOrders', JSON.stringify(app.orders));
        }
    } else {
        if (duplicateTbl) return showCustomAlert("Duplicate Error", `Table "${newName}" already exists in this section.`);
    }

    tablesInContext.push({ name: newName, sortOrder: newSortOrder });
    tablesInContext.sort((a, b) => a.sortOrder - b.sortOrder);
    targetSection.tables = tablesInContext.map((t, idx) => ({ name: (typeof t === 'string' ? t : t.name), sortOrder: idx + 1 }));

    finalizeTblSave(currentTableEdit ? "Table Updated" : "Table Added");
}

function saveSectionItem() {
    const name = document.getElementById('adv-sec-name').value.trim();
    const prefix = document.getElementById('adv-sec-prefix').value.trim();
    const zoneId = document.getElementById('adv-sec-zone').value;

    if (!name || !zoneId) return showCustomAlert("Validation", "Section Name and Zone required.");

    const targetZone = tableLayout.find(x => x.id === zoneId);
    let sectionsInContext = targetZone.sections.filter(s => s !== (currentSectionEdit ? targetZone.sections[currentSectionEdit.secIdx] : null));

    const duplicateSec = sectionsInContext.find(s => s.name.toLowerCase() === name.toLowerCase());

    if (currentSectionEdit) {
        const currentSec = targetZone.sections[currentSectionEdit.secIdx];
        if (name.toLowerCase() !== currentSec.name.toLowerCase() && duplicateSec) {
            return showCustomAlert("Duplicate Error", `Section "${name}" already exists in this zone.`);
        }
        currentSec.name = name;
        currentSec.prefix = prefix;
    } else {
        if (duplicateSec) return showCustomAlert("Duplicate Error", `Section "${name}" already exists in this zone.`);
        targetZone.sections.push({ name, prefix, tables: [] });
    }

    targetZone.sections.sort((a, b) => a.name.localeCompare(b.name));

    finalizeTblSave(currentSectionEdit ? "Section Updated" : "Section Added");
}

function saveZoneItem() {
    const name = document.getElementById('adv-zone-name').value.trim();
    const id = document.getElementById('adv-zone-id').value.trim();
    if (!name || !id) return showCustomAlert("Validation", "Zone Name and ID required.");

    let zonesInContext = tableLayout.filter(z => z.id !== (currentZoneEdit || ''));

    const duplicateNameZone = zonesInContext.find(x => x.name.toLowerCase() === name.toLowerCase());
    const duplicateIdZone = zonesInContext.find(x => x.id.toLowerCase() === id.toLowerCase());

    if (currentZoneEdit) {
        const currentZone = tableLayout.find(x => x.id === currentZoneEdit);
        if (name.toLowerCase() !== currentZone.name.toLowerCase() && duplicateNameZone) {
            return showCustomAlert("Duplicate Error", `A zone named "${name}" already exists.`);
        }
        if (id.toLowerCase() !== currentZone.id.toLowerCase() && duplicateIdZone) {
            return showCustomAlert("Duplicate Error", `A zone with ID "${id}" already exists.`);
        }
        currentZone.name = name;
    } else {
        if (duplicateNameZone) return showCustomAlert("Duplicate Error", `A zone named "${name}" already exists.`);
        if (duplicateIdZone) return showCustomAlert("Duplicate Error", `A zone with ID "${id}" already exists.`);
        tableLayout.push({ id, name, sections: [] });
    }

    tableLayout.sort((a, b) => a.name.localeCompare(b.name));

    finalizeTblSave(currentZoneEdit ? "Zone Updated" : "Zone Added");
}

function deleteTableItem() {
    if (!currentTableEdit) return;
    if (app.orders[currentTableEdit.originalName] && app.orders[currentTableEdit.originalName].items.length > 0) return showCustomAlert("Denied", "Table has active order. Close it first.");
    const z = tableLayout.find(x => x.id === currentTableEdit.zoneId);
    z.sections[currentTableEdit.sectionIdx].tables = z.sections[currentTableEdit.sectionIdx].tables.filter(t => {
        return (typeof t === 'string' ? t : t.name) !== currentTableEdit.originalName;
    });
    delete app.orders[currentTableEdit.originalName];
    localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    finalizeTblSave("Table Deleted");
}

function deleteSectionItem() {
    if (!currentSectionEdit) return;
    const z = tableLayout.find(x => x.id === currentSectionEdit.zoneId);
    const s = z.sections[currentSectionEdit.secIdx];
    if (s.tables && s.tables.length > 0) return showCustomAlert("Denied", `Delete all ${s.tables.length} tables inside this section first.`);
    z.sections.splice(currentSectionEdit.secIdx, 1);
    finalizeTblSave("Section Deleted");
}

function deleteZoneItem() {
    if (!currentZoneEdit) return;
    const z = tableLayout.find(x => x.id === currentZoneEdit);
    if (z.sections && z.sections.length > 0) return showCustomAlert("Denied", `Delete all ${z.sections.length} sections inside this zone first.`);
    tableLayout = tableLayout.filter(x => x.id !== currentZoneEdit);
    finalizeTblSave("Zone Deleted");
}

function resetTableLayout() {
    tableLayout = JSON.parse(JSON.stringify(defaultZones));
    localStorage.setItem('pos_layout_v2', JSON.stringify(tableLayout));
    showToast("Table layout reset to default.");
    resetCurrentTblForm();
    renderTblManagerList('');
    buildDynamicZones();
    renderAllTables();
    updateDataLists();
}

function exportTablesJSON() {
    const json = JSON.stringify(tableLayout, null, 2);
    downloadFile(json, `tables_backup_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
}

function handleTablesImport(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Format");

            pendingImportData = { type: 'tables', data: data };
            document.getElementById('import-summary-text').innerHTML = `
                <strong>Table File Analyzed:</strong><br><br>
                Found ${data.length} Zones in the file.<br>
                System will intelligently merge new sections and tables into your existing layout.
            `;
            document.getElementById('import-confirm-btn').onclick = executeSmartImport;
            document.getElementById('import-summary-modal').classList.add('active');
        } catch (err) {
            showCustomAlert("Error", "Invalid JSON format for Tables.");
        }
        input.value = '';
    };
    reader.readAsText(file);
}