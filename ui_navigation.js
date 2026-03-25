// ui_navigation.js – Dynamic Zone Navigation & Section Switching
// Version: 2.0 – Integrated with Inventory Management (seeding, rendering)

// ============================================================================
// BUILD DYNAMIC ZONES (HEADER BUTTONS AND SECTION CONTAINERS)
// ============================================================================
function buildDynamicZones() {
    const navContainer = document.getElementById('main-nav-buttons');
    navContainer.innerHTML = '';
    const wrapper = document.getElementById('dynamic-zones-wrapper');
    wrapper.innerHTML = '';

    // Active Orders button
    const activeOrdersBtn = document.createElement('button');
    activeOrdersBtn.className = 'nav-btn';
    activeOrdersBtn.id = 'active-orders-btn';
    activeOrdersBtn.innerHTML = `<i class="fas fa-list"></i> Active`;
    activeOrdersBtn.onclick = () => showSection('active-orders');
    navContainer.appendChild(activeOrdersBtn);

    // Zone buttons
    tableLayout.forEach((zone, index) => {
        const btn = document.createElement('button');
        btn.className = `nav-btn ${index === 0 ? 'active' : ''}`;
        btn.onclick = () => showSection(zone.id);

        let icon = 'fa-chair';
        if (zone.name.toLowerCase().includes('take')) icon = 'fa-hotdog';
        else if (zone.name.toLowerCase().includes('del')) icon = 'fa-motorcycle';
        else if (zone.name.toLowerCase().includes('roof') || zone.name.toLowerCase().includes('out')) icon = 'fa-cloud-sun';

        btn.innerHTML = `<i class="fas ${icon}"></i> ${zone.name}`;
        navContainer.appendChild(btn);

        const sec = document.createElement('div');
        sec.className = `section ${index === 0 ? 'active' : ''}`;
        sec.id = `${zone.id}-section`;

        if (zone.name.toLowerCase() !== 'dine in') {
            const h2 = document.createElement('h2');
            h2.style.marginBottom = '20px';
            h2.textContent = zone.name;
            sec.appendChild(h2);
        }

        const container = document.createElement('div');
        container.className = 'tables-scroll-container';
        container.id = `${zone.id}-container`;
        sec.appendChild(container);
        wrapper.appendChild(sec);
    });

    // Menu button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'nav-btn';
    menuBtn.onclick = () => showSection('items');
    menuBtn.innerHTML = `<i class="fas fa-utensils"></i> Menu`;
    navContainer.appendChild(menuBtn);

    // Inventory button (new)
    const inventoryBtn = document.createElement('button');
    inventoryBtn.className = 'nav-btn';
    inventoryBtn.onclick = () => showSection('inventory');
    inventoryBtn.innerHTML = `<i class="fas fa-boxes"></i> Inventory`;
    navContainer.appendChild(inventoryBtn);

    // Hamburger
    const hamBtn = document.createElement('button');
    hamBtn.className = 'nav-btn icon-only';
    hamBtn.id = 'hamburger-btn';
    hamBtn.title = 'Settings & Menu';
    hamBtn.innerHTML = `<i class="fas fa-bars"></i>`;
    hamBtn.onclick = () => document.getElementById('slide-out-menu').classList.add('active');
    navContainer.appendChild(hamBtn);
}

// ============================================================================
// SHOW SECTION (CORE NAVIGATION)
// ============================================================================
function showSection(id) {
    // Permission checks
    if (!app.currentUser && (id === 'dashboard' || id === 'reports' || id === 'config' || id === 'history' || id === 'clients' || id === 'reconciliation-history' || id === 'shortcuts' || id === 'inventory')) {
        showToast("Please login first");
        return;
    }
    if (id === 'dashboard' && !hasPerm('viewDashboard')) return showCustomAlert("Denied", "You don't have permission to view Dashboard.");
    if (id === 'reports' && !hasPerm('viewReports')) return showCustomAlert("Denied", "You don't have permission to view Reports.");
    if (id === 'history' && !hasPerm('viewHistory')) return showCustomAlert("Denied", "You don't have permission to view History.");
    if (id === 'clients' && !hasPerm('manageClients')) return showCustomAlert("Denied", "You don't have permission to view Clients.");
    if (id === 'reconciliation-history' && !hasPerm('viewReports')) return showCustomAlert("Denied", "You don't have permission to view Reconciliation History.");
    if (id === 'shortcuts' && !hasPerm('editRoles')) return showCustomAlert("Denied", "You don't have permission to view Shortcuts configuration.");
    if (id === 'inventory' && !hasPerm('manageInventory')) return showCustomAlert("Denied", "You don't have permission to manage Inventory.");

    // Active Orders section handling
    if (id === 'active-orders') {
        if (!hasPerm('viewDashboard')) {
            return showCustomAlert("Denied", "You don't have permission to view active orders.");
        }
        renderActiveOrders();
    }

    // Set default dates when opening history
    if (id === 'history') {
        if (typeof setDefaultHistoryDates === 'function') setDefaultHistoryDates();
        if (typeof renderHistory === 'function') renderHistory();
    }

    // Handle dashboard auto‑refresh
    if (id === 'dashboard') {
        if (typeof setDefaultDashboardDates === 'function') setDefaultDashboardDates();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof startDashboardAutoRefresh === 'function') startDashboardAutoRefresh();
    } else {
        // Stop auto‑refresh when leaving dashboard
        if (typeof stopDashboardAutoRefresh === 'function') stopDashboardAutoRefresh();
    }

    // Exit read‑only mode for non‑special sections
    if (id !== 'history' && id !== 'reports' && id !== 'clients' && id !== 'config' && id !== 'dashboard' && id !== 'reconciliation-history' && id !== 'shortcuts' && id !== 'active-orders' && id !== 'inventory') {
        if (typeof exitReadOnlyMode === 'function') exitReadOnlyMode();
    }

    // Deactivate all sections and nav buttons
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // Activate the target section
    const target = document.getElementById(id + '-section');
    if (target) target.classList.add('active');

    // Show/hide cart based on section
    if ((id === 'items' && app.table)) {
        document.body.classList.remove('hide-cart');
    } else {
        document.body.classList.add('hide-cart');
    }

    // Special handling for certain sections
    if (id === 'items' && !app.table && !app.isReadOnly) {
        showToast("Select a Table First!");
        showSection(tableLayout[0].id);
        return;
    }
    if (id === 'items') {
        if (typeof renderCategories === 'function') renderCategories();
        if (typeof renderMenu === 'function') renderMenu();
    }
    if (id === 'clients') {
        if (typeof renderClientsList === 'function') renderClientsList();
        if (typeof renderCrmDashboard === 'function') renderCrmDashboard();
    }
    if (id === 'reports') {
        if (typeof renderReportMenu === 'function') {
            renderReportMenu();
            runReport();
        }
    }
    if (id === 'config') {
        if (typeof renderConfigMenu === 'function') renderConfigMenu();
    }
    if (id === 'reconciliation-history') {
        if (typeof renderReconciliationHistory === 'function') renderReconciliationHistory();
    }
    if (id === 'inventory') {
        // Initialize inventory module
        if (typeof inv_seedDefaultIngredients === 'function') inv_seedDefaultIngredients();
        if (typeof renderInventorySection === 'function') renderInventorySection();
        if (typeof inv_startSync === 'function') inv_startSync(60);
    }

    // Close side menu and highlight the active nav button
    document.getElementById('slide-out-menu').classList.remove('active');
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(`'${id}'`)) {
            btn.classList.add('active');
        }
    });
}

// ============================================================================
// ACTIVE ORDERS – VERTICAL HEADINGS WITH PER‑ZONE SETTINGS
// ============================================================================
function renderActiveOrders() {
    const container = document.getElementById('active-orders-groups');
    if (!container) return;
    container.innerHTML = '';

    const globalSettings = appSettings.activeOrdersDisplay || { groupByZone: true };
    const zoneOrder = ['dinein', 'takeaway', 'delivery'];
    const zoneDisplayNames = { dinein: 'Dine In', takeaway: 'Take Away', delivery: 'Delivery' };
    const tablesByZone = {};
    zoneOrder.forEach(zoneId => { tablesByZone[zoneId] = []; });

    tableLayout.forEach(zone => {
        if (!tablesByZone[zone.id]) return;
        zone.sections.forEach(section => {
            section.tables.forEach(tObj => {
                const tName = typeof tObj === 'string' ? tObj : tObj.name;
                const order = app.orders[tName];
                if (order && order.items && order.items.length > 0) {
                    const subtotal = order.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
                    const discount = Number(order.discount) || 0;
                    const total = subtotal - discount;
                    const elapsedMinutes = Math.floor((Date.now() - order.startTime) / 60000);
                    tablesByZone[zone.id].push({ name: tName, total, minutes: elapsedMinutes });
                }
            });
        });
    });

    let grandTotal = 0;
    zoneOrder.forEach(zoneId => {
        tablesByZone[zoneId].forEach(t => { grandTotal += t.total; });
    });
    document.getElementById('active-orders-total').textContent = `${appSettings.property.currency} ${grandTotal.toFixed(0)}`;

    let anyOrders = false;
    zoneOrder.forEach(zoneId => { if (tablesByZone[zoneId].length > 0) anyOrders = true; });
    if (!anyOrders) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:20px;">No active orders.</p>';
        return;
    }

    if (globalSettings.groupByZone) {
        zoneOrder.forEach(zoneId => {
            const tables = tablesByZone[zoneId];
            if (tables.length === 0) return;

            const zoneSettings = appSettings.activeOrdersDisplay?.[zoneId] || {};
            const wrapper = document.createElement('div');
            wrapper.className = 'active-zone-wrapper';
            // Apply group visual settings
            wrapper.style.gap = zoneSettings.groupHGap || '15px';
            wrapper.style.marginBottom = zoneSettings.partitionGapBottom || '25px';
            wrapper.style.borderBottom = `${zoneSettings.groupLineThickness || '1px'} ${zoneSettings.groupLineStyle || 'solid'} ${zoneSettings.groupLineColor || 'rgba(0,0,0,0.1)'}`;

            const headingDiv = document.createElement('div');
            headingDiv.className = 'active-zone-vertical-heading';
            headingDiv.style.padding = `0 ${zoneSettings.groupHPadding || '15px'}`;
            headingDiv.style.fontSize = zoneSettings.groupHeaderFontSize || '0.85rem';
            headingDiv.style.fontFamily = zoneSettings.uiFont?.groupHeaderFamily || 'Inter';
            headingDiv.style.fontStyle = zoneSettings.uiFont?.groupHeaderStyle || 'normal';
            headingDiv.innerHTML = `<span>${zoneDisplayNames[zoneId]}</span>`;
            wrapper.appendChild(headingDiv);

            const grid = document.createElement('div');
            grid.className = 'active-zone-grid';
            if (zoneSettings.tileAutoSize) {
                grid.style.gridTemplateColumns = `repeat(auto-fit, minmax(${zoneSettings.tileMinItemWidth || '80px'}, 1fr))`;
            } else {
                grid.style.gridTemplateColumns = `repeat(auto-fill, ${zoneSettings.tileWidth || '100px'})`;
            }
            grid.style.gap = `${zoneSettings.tileGap || '15px'} ${zoneSettings.tileColumnGap || '15px'}`;

            tables.sort((a, b) => a.name.localeCompare(b.name));
            tables.forEach(t => {
                const tile = document.createElement('div');
                tile.className = 'active-order-tile';
                tile.style.borderRadius = zoneSettings.tileBorderRadius || '8px';
                if (!zoneSettings.tileAutoSize) {
                    tile.style.width = zoneSettings.tileWidth || '100px';
                    tile.style.height = zoneSettings.tileHeight || '70px';
                }
                tile.style.padding = '10px 5px';
                tile.innerHTML = `
                    <div class="table-name" style="font-size:${zoneSettings.tableNameFontSize || '0.9rem'}; font-family:${zoneSettings.uiFont?.tableNameFamily || 'Inter'}; font-style:${zoneSettings.uiFont?.tableNameStyle || 'normal'};">${t.name}</div>
                    <div class="timer" style="font-size:${zoneSettings.timerFontSize || '0.8rem'}; font-family:${zoneSettings.uiFont?.timerFamily || 'Inter'}; font-style:${zoneSettings.uiFont?.timerStyle || 'normal'};">${t.minutes} min</div>
                `;
                tile.onclick = () => { selectTable(t.name); showSection('items'); };
                grid.appendChild(tile);
            });
            wrapper.appendChild(grid);
            container.appendChild(wrapper);
        });
    } else {
        // Flat list – use dinein settings as default
        const defaultSettings = appSettings.activeOrdersDisplay?.dinein || {};
        const grid = document.createElement('div');
        grid.className = 'active-zone-grid';
        if (defaultSettings.tileAutoSize) {
            grid.style.gridTemplateColumns = `repeat(auto-fit, minmax(${defaultSettings.tileMinItemWidth || '80px'}, 1fr))`;
        } else {
            grid.style.gridTemplateColumns = `repeat(auto-fill, ${defaultSettings.tileWidth || '100px'})`;
        }
        grid.style.gap = `${defaultSettings.tileGap || '15px'} ${defaultSettings.tileColumnGap || '15px'}`;

        const allTables = [];
        zoneOrder.forEach(zoneId => allTables.push(...tablesByZone[zoneId]));
        allTables.sort((a, b) => a.name.localeCompare(b.name));
        allTables.forEach(t => {
            const tile = document.createElement('div');
            tile.className = 'active-order-tile';
            tile.style.borderRadius = defaultSettings.tileBorderRadius || '8px';
            if (!defaultSettings.tileAutoSize) {
                tile.style.width = defaultSettings.tileWidth || '100px';
                tile.style.height = defaultSettings.tileHeight || '70px';
            }
            tile.innerHTML = `
                <div class="table-name" style="font-size:${defaultSettings.tableNameFontSize || '0.9rem'}; font-family:${defaultSettings.uiFont?.tableNameFamily || 'Inter'}; font-style:${defaultSettings.uiFont?.tableNameStyle || 'normal'};">${t.name}</div>
                <div class="timer" style="font-size:${defaultSettings.timerFontSize || '0.8rem'}; font-family:${defaultSettings.uiFont?.timerFamily || 'Inter'}; font-style:${defaultSettings.uiFont?.timerStyle || 'normal'};">${t.minutes} min</div>
            `;
            tile.onclick = () => { selectTable(t.name); showSection('items'); };
            grid.appendChild(tile);
        });
        container.appendChild(grid);
    }
}

// ============================================================================
// DETERMINE ZONE FOR A GIVEN TABLE NAME (used by other features)
// ============================================================================
function getZoneForTable(tableName) {
    for (let zone of tableLayout) {
        for (let section of zone.sections) {
            for (let t of section.tables) {
                const tName = typeof t === 'string' ? t : t.name;
                if (tName === tableName) return zone;
            }
        }
    }
    return null;
}

// ============================================================================
// UPDATE DATA LISTS (CUSTOM SELECTS, DROPDOWNS)
// ============================================================================
function updateDataLists() {
    const clientSelect = document.getElementById('cart-client-select');
    if (clientSelect && clientSelect.classList.contains('modernized')) {
        if (typeof populateClientDropdown === 'function') populateClientDropdown();
        if (typeof initializeCustomSelect === 'function') initializeCustomSelect('cart-client-select');
    }

    const workerRoleSelect = document.getElementById('w-role');
    if (workerRoleSelect && workerRoleSelect.classList.contains('modernized')) {
        if (typeof initializeCustomSelect === 'function') initializeCustomSelect('w-role');
    }

    const advItemCat = document.getElementById('adv-item-cat');
    if (advItemCat && advItemCat.classList.contains('modernized')) {
        const s = document.getElementById('adv-item-cat');
        s.innerHTML = '';
        const sortedCategories = [...menuCategories].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
        sortedCategories.forEach(c => {
            const o = document.createElement('option');
            o.value = c.id;
            o.textContent = c.name;
            s.appendChild(o);
        });
        if (typeof initializeCustomSelect === 'function') initializeCustomSelect('adv-item-cat');
    }

    const advTblZone = document.getElementById('adv-tbl-zone');
    if (advTblZone && advTblZone.classList.contains('modernized')) {
        const tZone = document.getElementById('adv-tbl-zone');
        tZone.innerHTML = '';
        tableLayout.forEach(z => tZone.appendChild(new Option(z.name, z.id)));
        if (typeof initializeCustomSelect === 'function') initializeCustomSelect('adv-tbl-zone');
        if (typeof updateTableSectionDropdown === 'function') updateTableSectionDropdown();
        const sZone = document.getElementById('adv-sec-zone');
        sZone.innerHTML = '';
        tableLayout.forEach(z => sZone.appendChild(new Option(z.name, z.id)));
        if (typeof initializeCustomSelect === 'function') initializeCustomSelect('adv-sec-zone');
    }
}

// ============================================================================
// APPLY ADVANCED CSS VARIABLES (from preferences)
// ============================================================================
window.applyAdvancedCSSVariables = function() {
    if (typeof appSettings === 'undefined') return;
    const p = appSettings.preferences || {};
    const root = document.documentElement;

    const getVal = (id, prefKey, defaultVal, isFont = false) => {
        const el = document.getElementById(id);
        if (el) return el.value || defaultVal;
        const source = isFont ? (p.uiFont || {}) : p;
        return source[prefKey] || defaultVal;
    };

    root.style.setProperty('--ui-font-table-header-size', getVal('pref-tbl-head-font-size', 'tableGroupHeaderFontSize', '0.85rem'));
    root.style.setProperty('--ui-font-table-header-family', getVal('pref-tbl-head-font-family', 'tableHeaderFamily', 'Inter', true));
    root.style.setProperty('--ui-font-table-header-style', getVal('pref-tbl-head-font-style', 'tableHeaderStyle', 'normal', true));

    root.style.setProperty('--table-group-content-horizontal-padding', getVal('pref-tbl-group-h-padding', 'tableGroupHPadding', '15px'));
    root.style.setProperty('--table-partition-gap-top', getVal('pref-tbl-partition-gap-top', 'tablePartitionGapTop', '15px'));
    root.style.setProperty('--table-partition-gap-bottom', getVal('pref-tbl-partition-gap-bottom', 'tablePartitionGapBottom', '25px'));
    root.style.setProperty('--table-group-h-gap', getVal('pref-tbl-group-h-gap', 'tableGroupHGap', '15px'));

    root.style.setProperty('--table-group-line-style', getVal('pref-tbl-group-line-style', 'tableGroupLineStyle', 'solid'));
    root.style.setProperty('--table-group-line-thickness', getVal('pref-tbl-group-line-thickness', 'tableGroupLineThickness', '1px'));
    root.style.setProperty('--table-group-line-color', getVal('pref-tbl-group-line-color', 'tableGroupLineColor', 'rgba(0,0,0,0.1)'));

    root.style.setProperty('--table-btn-gap', getVal('pref-tbl-btn-gap', 'tableBtnGap', '15px'));
    root.style.setProperty('--table-btn-column-gap', getVal('pref-tbl-btn-column-gap', 'tableBtnColumnGap', '15px'));
    root.style.setProperty('--table-btn-width', getVal('pref-tbl-btn-width', 'tableBtnWidth', '100px'));
    root.style.setProperty('--table-btn-height', getVal('pref-tbl-btn-height', 'tableBtnHeight', '70px'));
    root.style.setProperty('--table-btn-min-item-width', getVal('pref-tbl-btn-min-width', 'tableBtnMinItemWidth', '80px'));
    root.style.setProperty('--table-button-border-radius', getVal('pref-tbl-btn-border-radius', 'tableButtonBorderRadius', '8px'));

    root.style.setProperty('--cart-item-spacing', getVal('pref-cart-spacing', 'cartItemSpacing', '2px'));

    const cartColumns = ['name', 'price', 'qty', 'total'];
    cartColumns.forEach(col => {
        let CapCol = col.charAt(0).toUpperCase() + col.slice(1);

        root.style.setProperty(`--ui-font-cart-head-${col}-size`, getVal(`pref-cart-head-${col}-size`, `cartHead${CapCol}Size`, '0.65rem'));
        root.style.setProperty(`--ui-font-cart-head-${col}-family`, getVal(`pref-cart-head-${col}-font-family`, `cartHead${CapCol}Family`, 'Inter', true));
        root.style.setProperty(`--ui-font-cart-head-${col}-style`, getVal(`pref-cart-head-${col}-font-style`, `cartHead${CapCol}Style`, 'normal', true));

        root.style.setProperty(`--ui-font-cart-item-${col}-size`, getVal(`pref-cart-item-${col}-size`, `cartItem${CapCol}Size`, col === 'total' ? '0.8rem' : '0.75rem'));
        root.style.setProperty(`--ui-font-cart-item-${col}-family`, getVal(`pref-cart-item-${col}-font-family`, `cartItem${CapCol}Family`, 'Inter', true));
        root.style.setProperty(`--ui-font-cart-item-${col}-style`, getVal(`pref-cart-item-${col}-font-style`, `cartItem${CapCol}Style`, 'normal', true));
    });
};

// ============================================================================
// AUTO‑CLOSE SIDE MENU WHEN ANYTHING INSIDE IT IS CLICKED
// ============================================================================
document.addEventListener('click', function(e) {
    const menu = document.getElementById('slide-out-menu');
    if (!menu) return;
    if (menu.contains(e.target)) {
        menu.classList.remove('active');
    }
});