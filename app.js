// app.js – Core State & Data Initialization (with Full Inventory Integration)
// Version: 3.0 – Includes all inventory features (ingredients, stock, recipes, purchases, wastage, suppliers, physical counts, variance, reorder suggestions, barcode, Dexie, export/import, sync, PIN)

// ============================================================================
// GLOBAL APP OBJECT
// ============================================================================
const defaultZones = [
    { id: 'dinein', name: 'Dine In', sections: [] },
    { id: 'takeaway', name: 'Take Away', sections: [] },
    { id: 'delivery', name: 'Delivery', sections: [] }
];

let tableLayout = JSON.parse(localStorage.getItem('pos_layout_v2')) || defaultZones;

tableLayout.forEach(z => {
    z.sections.forEach(s => {
        if (s.tables && s.tables.length > 0 && typeof s.tables[0] === 'string') {
            s.tables = s.tables.map((tName, idx) => ({ name: tName, sortOrder: idx + 1 }));
        }
        s.tables.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
});

const defaultMenu = [];
let menuItems = JSON.parse(localStorage.getItem('pos_menu_items')) || defaultMenu;

menuItems.forEach(item => {
    if (item.lastCustomPrice === undefined) item.lastCustomPrice = item.price;
    if (item.lastCustomQty === undefined) item.lastCustomQty = 1;
});

const defaultCats = [
    { id: 'other', name: 'OTHER', sortOrder: 5 },
    { id: 'menuitems', name: 'MENU ITEMS', sortOrder: 6 }
];
let menuCategories = JSON.parse(localStorage.getItem('pos_menu_cats')) || defaultCats;

defaultCats.forEach(defaultCat => {
    if (!menuCategories.find(c => c.id === defaultCat.id)) {
        menuCategories.push(defaultCat);
    }
});
menuCategories.sort((a,b) => (a.sortOrder || 999) - (b.sortOrder || 999));

// Deals global array
let appDeals = JSON.parse(localStorage.getItem('pos_deals')) || [];

// Default table display settings for each zone
const defaultTableDisplay = {
    tableBtnAutoSize: false,
    tableBtnWidth: '100px',
    tableBtnHeight: '70px',
    tableBtnMinItemWidth: '80px',
    tableBtnGap: '15px',
    tableBtnColumnGap: '15px',
    tableGroupLineStyle: 'solid',
    tableGroupLineThickness: '1px',
    tableGroupLineColor: 'rgba(0,0,0,0.1)',
    tableGroupHGap: '15px',
    tableGroupVGap: '15px',
    tableButtonBorderRadius: '8px',
    tableGroupContentPadding: '15px',
    tableButtonPartitionLineSpacing: '15px',
    tableGroupHeaderFontSize: '0.85rem',
    tableFontSize: '0.85rem',
    uiFont: {
        tableFamily: 'Inter', tableStyle: 'normal',
        tableHeaderFamily: 'Inter', tableHeaderStyle: 'normal'
    },
    askForClient: true,
    askForWaiter: true
};

// Default active orders display settings for each zone
const defaultActiveOrdersDisplay = {
    tileAutoSize: false,
    tileWidth: '100px',
    tileHeight: '70px',
    tileMinItemWidth: '80px',
    tileGap: '15px',
    tileColumnGap: '15px',
    groupLineStyle: 'solid',
    groupLineThickness: '1px',
    groupLineColor: 'rgba(0,0,0,0.1)',
    groupHGap: '15px',
    groupVGap: '15px',
    tileBorderRadius: '8px',
    groupContentPadding: '15px',
    partitionGapTop: '15px',
    partitionGapBottom: '25px',
    groupHPadding: '15px',
    tableNameFontSize: '0.9rem',
    timerFontSize: '0.8rem',
    groupHeaderFontSize: '0.85rem',
    uiFont: {
        tableNameFamily: 'Inter', tableNameStyle: 'normal',
        timerFamily: 'Inter', timerStyle: 'normal',
        groupHeaderFamily: 'Inter', groupHeaderStyle: 'normal'
    }
};

let app = {
    table: null, pendingTable: null,
    orders: JSON.parse(localStorage.getItem('savedOrders')) || {},
    history: JSON.parse(localStorage.getItem('orderHistory')) || [],
    deletedOrders: JSON.parse(localStorage.getItem('deletedOrders')) || [],
    clients: JSON.parse(localStorage.getItem('pos_clients')) || [],
    reconciliationHistory: JSON.parse(localStorage.getItem('pos_reconciliationHistory')) || [],
    reservations: JSON.parse(localStorage.getItem('pos_reservations')) || [],
    employees: JSON.parse(localStorage.getItem('pos_employees')) || [],
    timeEntries: JSON.parse(localStorage.getItem('pos_timeEntries')) || [],
    inventoryAlerts: JSON.parse(localStorage.getItem('pos_inventory_alerts')) || [],
    currentOrder: [],
    currentCat: menuCategories.length > 0 ? menuCategories[0].id : '',
    waiters: [],
    discountType: 'fixed', timerInterval: null, tempPayments: [],
    isReadOnly: false, editMode: false, currentUser: null,
    lastReconciliation: parseInt(localStorage.getItem('pos_lastReconciliation')) || 0,
    currentShiftStart: parseInt(localStorage.getItem('pos_shiftStart')) || Date.now()
};

// ============================================================================
// APP SETTINGS – with full inventory configuration
// ============================================================================
let appSettings = JSON.parse(localStorage.getItem('pos_app_settings')) || {
    property: {
        name: 'AL-MADINA SHINWARI',
        phone: '0341-3334206, 0343-8484346',
        address: 'Main Gujranwala, Hafizabad Road',
        currency: 'PKR',
        logo: '',
        branch: '',
        openingTime: '00:00',
        closingTime: '23:59'
    },
    preferences: {
        theme: 'default',
        fontFamily: 'Inter',
        fontStyle: 'normal',
        cartPosition: 'right',
        menuLang: 'both',
        cartItemLang: 'both',
        tableFontSize: '0.85rem',
        paymentFontSize: '1.2rem',
        itemFontSize: '0.85rem',
        priceFontSize: '0.75rem',
        catFontSize: '0.75rem',
        cartHeadFontSize: '0.65rem',
        cartItemFontSize: '0.75rem',
        dashNumFontSize: '1.2rem',
        menuBtnWidth: '120px',
        menuBtnHeight: '80px',
        menuBtnAutoSize: false,
        menuBtnGap: '12px',
        menuBtnColumnGap: '12px',
        menuBtnMinItemWidth: '100px',
        showPricesOnMenu: true,
        uiFont: {
            tableFamily: 'Inter', tableStyle: 'normal',
            tableHeaderFamily: 'Inter', tableHeaderStyle: 'normal',
            itemFamily: 'Inter', itemStyle: 'normal',
            priceFamily: 'Inter', priceStyle: 'normal',
            catFamily: 'Inter', catStyle: 'normal',
            cartHeadFamily: 'Inter', cartHeadStyle: 'normal',
            cartItemFamily: 'Inter', cartItemStyle: 'normal',
            paymentFamily: 'Inter', paymentStyle: 'normal',
            dashNumFamily: 'Inter', dashNumStyle: 'normal'
        }
    },
    tableDisplay: {
        dinein: { ...defaultTableDisplay },
        takeaway: { ...defaultTableDisplay },
        delivery: { ...defaultTableDisplay }
    },
    activeOrdersDisplay: {
        groupByZone: true,
        dinein: { ...defaultActiveOrdersDisplay },
        takeaway: { ...defaultActiveOrdersDisplay },
        delivery: { ...defaultActiveOrdersDisplay }
    },
    reservation: {
        defaultDuration: 90,
        beforeMargin: 30,
        afterMargin: 30,
        allowOverbooking: false
    },
    loyalty: {
        pointsPerCurrency: 10,
        redeemRate: 100,
        minRedeem: 500
    },
    receiptTemplate: {
        header: "{{logo}}\n{{restaurant_name}}\n{{address}}\n{{phone}}",
        items: "{{item_name}} x{{qty}}   {{item_total}}\n",
        footer: "{{subtotal}}\n{{discount}}\nTOTAL: {{total}}\n{{thanks}}"
    },
    kotConfig: {
        css: '',
        customFooter: '*** Kitchen Order Ticket ***',
        printLogo: false,
        printPropInfo: false,
        printInvoiceNo: true,
        printStartTime: true,
        printPrintTime: true,
        printWaiter: true,
        printCashier: false,
        printCustomer: false,
        printBreakdown: false,
        printPayments: false,
        printNameLang: 'both',
        format: '',
        printStyles: {
            headerFontFamily: 'sans-serif',
            headerFontStyle: 'normal',
            headerFontSize: '16px',
            itemNameFontFamily: 'sans-serif',
            itemNameFontStyle: 'normal',
            itemNameFontSize: '12px',
            itemPriceFontFamily: 'sans-serif',
            itemPriceFontStyle: 'normal',
            itemPriceFontSize: '12px',
            totalBoxFontFamily: 'sans-serif',
            totalBoxFontStyle: 'bold',
            totalBoxFontSize: '16px',
            footerFontFamily: 'sans-serif',
            footerFontStyle: 'normal',
            footerFontSize: '12px',
            dateHeadingFontFamily: 'sans-serif',
            dateHeadingFontStyle: 'normal',
            dateHeadingFontSize: '12px',
            dateValueFontFamily: 'sans-serif',
            dateValueFontStyle: 'normal',
            dateValueFontSize: '12px',
            timeHeadingFontFamily: 'sans-serif',
            timeHeadingFontStyle: 'normal',
            timeHeadingFontSize: '12px',
            timeValueFontFamily: 'sans-serif',
            timeValueFontStyle: 'normal',
            timeValueFontSize: '12px',
            orderHeadingFontFamily: 'sans-serif',
            orderHeadingFontStyle: 'normal',
            orderHeadingFontSize: '12px',
            orderValueFontFamily: 'sans-serif',
            orderValueFontStyle: 'normal',
            orderValueFontSize: '12px',
            tableHeadingFontFamily: 'sans-serif',
            tableHeadingFontStyle: 'normal',
            tableHeadingFontSize: '12px',
            tableValueFontFamily: 'sans-serif',
            tableValueFontStyle: 'normal',
            tableValueFontSize: '12px',
            cashierHeadingFontFamily: 'sans-serif',
            cashierHeadingFontStyle: 'normal',
            cashierHeadingFontSize: '12px',
            cashierValueFontFamily: 'sans-serif',
            cashierValueFontStyle: 'normal',
            cashierValueFontSize: '12px',
            serverHeadingFontFamily: 'sans-serif',
            serverHeadingFontStyle: 'normal',
            serverHeadingFontSize: '12px',
            serverValueFontFamily: 'sans-serif',
            serverValueFontStyle: 'normal',
            serverValueFontSize: '12px',
            qtyNumberFontFamily: 'sans-serif',
            qtyNumberFontStyle: 'normal',
            qtyNumberFontSize: '12px',
            discountFontFamily: 'sans-serif',
            discountFontStyle: 'normal',
            discountFontSize: '12px',
            taxFontFamily: 'sans-serif',
            taxFontStyle: 'normal',
            taxFontSize: '12px',
            subtotalFontFamily: 'sans-serif',
            subtotalFontStyle: 'normal',
            subtotalFontSize: '12px',
            thanksFontFamily: 'sans-serif',
            thanksFontStyle: 'normal',
            thanksFontSize: '12px'
        }
    },
    billConfig: {
        css: '',
        customFooter: '*** Thank You ***<br>Software by: Hamza Younas',
        printLogo: true,
        printPropInfo: true,
        printInvoiceNo: true,
        printStartTime: true,
        printPrintTime: true,
        printWaiter: true,
        printCashier: true,
        printCustomer: true,
        printBreakdown: true,
        printPayments: true,
        printNameLang: 'both',
        printStyles: {
            headerFontFamily: 'sans-serif',
            headerFontStyle: 'normal',
            headerFontSize: '16px',
            itemNameFontFamily: 'sans-serif',
            itemNameFontStyle: 'normal',
            itemNameFontSize: '12px',
            itemPriceFontFamily: 'sans-serif',
            itemPriceFontStyle: 'normal',
            itemPriceFontSize: '12px',
            totalBoxFontFamily: 'sans-serif',
            totalBoxFontStyle: 'bold',
            totalBoxFontSize: '16px',
            footerFontFamily: 'sans-serif',
            footerFontStyle: 'normal',
            footerFontSize: '12px',
            dateHeadingFontFamily: 'sans-serif',
            dateHeadingFontStyle: 'normal',
            dateHeadingFontSize: '12px',
            dateValueFontFamily: 'sans-serif',
            dateValueFontStyle: 'normal',
            dateValueFontSize: '12px',
            timeHeadingFontFamily: 'sans-serif',
            timeHeadingFontStyle: 'normal',
            timeHeadingFontSize: '12px',
            timeValueFontFamily: 'sans-serif',
            timeValueFontStyle: 'normal',
            timeValueFontSize: '12px',
            orderHeadingFontFamily: 'sans-serif',
            orderHeadingFontStyle: 'normal',
            orderHeadingFontSize: '12px',
            orderValueFontFamily: 'sans-serif',
            orderValueFontStyle: 'normal',
            orderValueFontSize: '12px',
            tableHeadingFontFamily: 'sans-serif',
            tableHeadingFontStyle: 'normal',
            tableHeadingFontSize: '12px',
            tableValueFontFamily: 'sans-serif',
            tableValueFontStyle: 'normal',
            tableValueFontSize: '12px',
            cashierHeadingFontFamily: 'sans-serif',
            cashierHeadingFontStyle: 'normal',
            cashierHeadingFontSize: '12px',
            cashierValueFontFamily: 'sans-serif',
            cashierValueFontStyle: 'normal',
            cashierValueFontSize: '12px',
            serverHeadingFontFamily: 'sans-serif',
            serverHeadingFontStyle: 'normal',
            serverHeadingFontSize: '12px',
            serverValueFontFamily: 'sans-serif',
            serverValueFontStyle: 'normal',
            serverValueFontSize: '12px',
            qtyNumberFontFamily: 'sans-serif',
            qtyNumberFontStyle: 'normal',
            qtyNumberFontSize: '12px',
            discountFontFamily: 'sans-serif',
            discountFontStyle: 'normal',
            discountFontSize: '12px',
            taxFontFamily: 'sans-serif',
            taxFontStyle: 'normal',
            taxFontSize: '12px',
            subtotalFontFamily: 'sans-serif',
            subtotalFontStyle: 'normal',
            subtotalFontSize: '12px',
            thanksFontFamily: 'sans-serif',
            thanksFontStyle: 'normal',
            thanksFontSize: '12px'
        }
    },
    paymentMethods: JSON.parse(localStorage.getItem('pos_paymentMethods')) || ['Cash', 'Udhaar', 'Account', 'Advance'],
    shortcuts: [
        { id: 'toggleSideMenu', name: 'Toggle Side Menu', defaultKey: 'F1', currentKey: 'F1', perm: '', action: 'document.getElementById("slide-out-menu").classList.toggle("active");' },
        { id: 'focusSearch', name: 'Focus Search', defaultKey: 'F2', currentKey: 'F2', perm: '', action: 'focusActiveSectionSearch();' },
        { id: 'openCustomerModal', name: 'Open Customer Info', defaultKey: 'F4', currentKey: 'F4', perm: 'createOrder', action: 'openCustomerModal();' },
        { id: 'openDiscountModal', name: 'Open Discount', defaultKey: 'F5', currentKey: 'F5', perm: 'applyDiscount', action: 'openDiscountModal();' },
        { id: 'printKOT', name: 'Print KOT', defaultKey: 'F7', currentKey: 'F7', perm: 'createOrder', action: 'printBill(true);' },
        { id: 'printBill', name: 'Print Bill', defaultKey: 'F8', currentKey: 'F8', perm: 'createOrder', action: 'printBill(false);' },
        { id: 'openPaymentModal', name: 'Open Payment / Close Order', defaultKey: 'F9', currentKey: 'F9', perm: 'createOrder', action: 'openPaymentModal();' },
        { id: 'performLogout', name: 'Logout / Change Shift', defaultKey: 'F10', currentKey: 'F10', perm: '', action: 'performLogout();' }
    ],
    // INVENTORY SETTINGS (full)
    inventory: {
        lowStockThreshold: 5,
        varianceWarningPct: 3,
        varianceCriticalPct: 10,
        priceAnomalyPct: 10,
        autoReorder: false
    }
};

// Migration: ensure inventory settings exist
if (!appSettings.inventory) {
    appSettings.inventory = {
        lowStockThreshold: 5,
        varianceWarningPct: 3,
        varianceCriticalPct: 10,
        priceAnomalyPct: 10,
        autoReorder: false
    };
}

// ============================================================================
// WORKERS & ROLES (with inventory permissions)
// ============================================================================
let appWorkers = JSON.parse(localStorage.getItem('pos_workers'));
if (!appWorkers || appWorkers.length === 0 || !appWorkers.some(w => w.role === 'Admin')) {
    appWorkers = [
        { name: 'Admin', role: 'Admin', login: 'admin', pass: 'admin', phone: '' }
    ];
    localStorage.setItem('pos_workers', JSON.stringify(appWorkers));
}

let appRoles = JSON.parse(localStorage.getItem('pos_roles')) || [
    {
        name: 'Admin',
        perms: {
            editRoles: true, createOrder: true, transferTable: true, transferWaiter: true,
            splitOrder: true, applyDiscount: true, applyTax: true, refund: true,
            deleteActiveOrder: true, wipeHistory: true, manageClients: true,
            manageAccounts: true, manageVouchers: true, viewDashboard: true,
            viewReports: true, viewHistory: true, reprintOrder: true, editMenu: true,
            modifyPrinted: true,
            // Inventory permissions
            manageInventory: true, approvePurchase: true, approveWastage: true,
            manageSuppliers: true, viewVariance: true, editRecipe: true
        }
    },
    {
        name: 'Manager',
        perms: {
            editRoles: false, createOrder: true, transferTable: true, transferWaiter: true,
            splitOrder: true, applyDiscount: true, applyTax: true, refund: true,
            deleteActiveOrder: true, wipeHistory: false, manageClients: true,
            manageAccounts: true, manageVouchers: true, viewDashboard: true,
            viewReports: true, viewHistory: true, reprintOrder: true, editMenu: true,
            modifyPrinted: false,
            manageInventory: true, approvePurchase: true, approveWastage: true,
            manageSuppliers: true, viewVariance: true, editRecipe: true
        }
    },
    {
        name: 'Cashier',
        perms: {
            editRoles: false, createOrder: true, transferTable: true, transferWaiter: true,
            splitOrder: true, applyDiscount: false, applyTax: false, refund: false,
            deleteActiveOrder: false, wipeHistory: false, manageClients: true,
            manageAccounts: true, manageVouchers: true, viewDashboard: false,
            viewReports: false, viewHistory: true, reprintOrder: true, editMenu: false,
            modifyPrinted: false,
            manageInventory: false, approvePurchase: false, approveWastage: false,
            manageSuppliers: false, viewVariance: false, editRecipe: false
        }
    },
    {
        name: 'Waiter',
        perms: {
            editRoles: false, createOrder: true, transferTable: false, transferWaiter: false,
            splitOrder: false, applyDiscount: false, applyTax: false, refund: false,
            deleteActiveOrder: false, wipeHistory: false, manageClients: false,
            manageAccounts: false, manageVouchers: false, viewDashboard: false,
            viewReports: false, viewHistory: false, reprintOrder: false, editMenu: false,
            modifyPrinted: false,
            manageInventory: false, approvePurchase: false, approveWastage: false,
            manageSuppliers: false, viewVariance: false, editRecipe: false
        }
    }
];

function hasPerm(permName) {
    if (!app.currentUser) return false;
    if (app.currentUser.role === 'Admin') return true;
    const role = appRoles.find(r => r.name === app.currentUser.role);
    return role && role.perms[permName];
}

function updateAppWaitersList() {
    const w = appWorkers.filter(wrk => wrk.role === 'Waiter').map(wrk => wrk.name);
    app.waiters = w.length > 0 ? w : ['Staff'];
}
updateAppWaitersList();

// ============================================================================
// EXPORT/IMPORT EXTENSIONS (inventory data is handled separately in inventory_data.js)
// ============================================================================
function backupSystem(silent = false) {
    const data = {
        layout: tableLayout,
        menu: menuItems,
        cats: menuCategories,
        history: app.history,
        clients: app.clients,
        settings: appSettings,
        workers: appWorkers,
        roles: appRoles,
        reconciliationHistory: app.reconciliationHistory,
        deals: appDeals,
        employees: app.employees,
        reservations: app.reservations,
        // Note: inventory data is backed up separately via inv_exportInventoryData
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "pos_backup_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    if (!silent) document.getElementById('slide-out-menu').classList.remove('active');
}

function restoreSystem(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.layout) {
                tableLayout = data.layout;
                localStorage.setItem('pos_layout_v2', JSON.stringify(tableLayout));
            }
            if (data.menu) {
                menuItems = data.menu;
                localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
            }
            if (data.cats) {
                menuCategories = data.cats;
                localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
            }
            if (data.history) {
                app.history = data.history;
                localStorage.setItem('orderHistory', JSON.stringify(app.history));
            }
            if (data.clients) {
                app.clients = data.clients;
                localStorage.setItem('pos_clients', JSON.stringify(app.clients));
            }
            if (data.settings) {
                appSettings = data.settings;
                localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
            }
            if (data.workers) {
                appWorkers = data.workers;
                localStorage.setItem('pos_workers', JSON.stringify(appWorkers));
            }
            if (data.roles) {
                appRoles = data.roles;
                localStorage.setItem('pos_roles', JSON.stringify(appRoles));
            }
            if (data.reconciliationHistory) {
                app.reconciliationHistory = data.reconciliationHistory;
                localStorage.setItem('pos_reconciliationHistory', JSON.stringify(app.reconciliationHistory));
            }
            if (data.deals) {
                appDeals = data.deals;
                localStorage.setItem('pos_deals', JSON.stringify(appDeals));
            }
            if (data.employees) {
                app.employees = data.employees;
                localStorage.setItem('pos_employees', JSON.stringify(app.employees));
            }
            if (data.reservations) {
                app.reservations = data.reservations;
                localStorage.setItem('pos_reservations', JSON.stringify(app.reservations));
            }
            showCustomAlert("Success", "Restore Successful! Reloading...");
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            showCustomAlert("Error", "Invalid Backup File");
        }
    };
    reader.readAsText(file);
    document.getElementById('slide-out-menu').classList.remove('active');
}

// ============================================================================
// SMART IMPORT (for menu/tables) – keep existing
// ============================================================================
let pendingImportData = null;

function executeSmartImport() {
    closeModal('import-summary-modal');
    if (!pendingImportData) return;
    if (pendingImportData.type === 'menu') {
        pendingImportData.data.forEach(newItem => {
            const existingIdx = menuItems.findIndex(mi => mi.id == newItem.id);
            if (existingIdx !== -1) {
                menuItems[existingIdx] = { ...menuItems[existingIdx], ...newItem };
            } else {
                menuItems.push(newItem);
            }
            if (!menuCategories.find(c => c.id === newItem.category)) {
                if (newItem.category) {
                    menuCategories.push({ id: newItem.category, name: newItem.category.toUpperCase(), sortOrder: 99 });
                }
            }
        });
        localStorage.setItem('pos_menu_items', JSON.stringify(menuItems));
        localStorage.setItem('pos_menu_cats', JSON.stringify(menuCategories));
        if (typeof renderManagerList === 'function') renderManagerList('');
        showToast("Menu Import Successful!");
    } else if (pendingImportData.type === 'tables') {
        const newLayout = pendingImportData.data;
        newLayout.forEach(newZone => {
            let exZone = tableLayout.find(z => z.id === newZone.id);
            if (!exZone) {
                tableLayout.push(newZone);
            } else {
                newZone.sections.forEach(newSec => {
                    let exSec = exZone.sections.find(s => s.name === newSec.name);
                    if (!exSec) {
                        exZone.sections.push(newSec);
                    } else {
                        newSec.tables.forEach(newTbl => {
                            const tblName = typeof newTbl === 'string' ? newTbl : newTbl.name;
                            const exists = exSec.tables.find(t => (typeof t === 'string' ? t : t.name) === tblName);
                            if (!exists) exSec.tables.push(newTbl);
                        });
                    }
                });
            }
        });
        localStorage.setItem('pos_layout_v2', JSON.stringify(tableLayout));
        if (typeof renderTblManagerList === 'function') renderTblManagerList('');
        if (typeof renderAllTables === 'function') renderAllTables();
        showToast("Tables Imported & Merged!");
    }
    pendingImportData = null;
    if (typeof updateDataLists === 'function') updateDataLists();
}

// ============================================================================
// ADDITIONAL HELPER FUNCTIONS (preserve existing ones)
// ============================================================================
function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

// ============================================================================
// Ensure inventory data functions are accessible globally (they are in inventory_data.js)
// Also, set up any needed initial inventory seeding
// ============================================================================
// The inventory_data.js will seed default ingredients if empty. No need to call here.

// ============================================================================
// EXPOSE GLOBALS (keep existing)
// ============================================================================
window.app = app;
window.appSettings = appSettings;
window.tableLayout = tableLayout;
window.menuItems = menuItems;
window.menuCategories = menuCategories;
window.appDeals = appDeals;
window.appWorkers = appWorkers;
window.appRoles = appRoles;
window.hasPerm = hasPerm;
window.updateAppWaitersList = updateAppWaitersList;
window.backupSystem = backupSystem;
window.restoreSystem = restoreSystem;
window.executeSmartImport = executeSmartImport;
window.downloadFile = downloadFile;
window.pendingImportData = pendingImportData;

// Also expose the inventory settings for other scripts
if (typeof window !== 'undefined') {
    window.inventorySettings = appSettings.inventory;
}

console.log("app.js loaded (inventory integrated)");