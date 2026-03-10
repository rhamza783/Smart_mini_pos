/* 
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT: STATE & DATA INITIALIZATION (state.js)                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

const defaultZones =[
    { id: 'dinein', name: 'Dine In', sections:[ { name: 'Indoor Hall', prefix: 'Ind', tables:[{name:'Ind 1', sortOrder:1}, {name:'Ind 2', sortOrder:2}, {name:'Ind 3', sortOrder:3}, {name:'Ind 4', sortOrder:4}, {name:'Ind 5', sortOrder:5}, {name:'Ind 6', sortOrder:6}] }, { name: 'Outdoor', prefix: 'Out', tables:[{name:'Out 1', sortOrder:1}, {name:'Out 2', sortOrder:2}, {name:'Out 3', sortOrder:3}] } ] },
    { id: 'takeaway', name: 'Take Away', sections:[ { name: 'Points', prefix: 'Take', tables:[{name:'Take 1', sortOrder:1}, {name:'Take 2', sortOrder:2}, {name:'Take 3', sortOrder:3}, {name:'Take 4', sortOrder:4}] } ] },
    { id: 'delivery', name: 'Delivery', sections:[ { name: 'Riders', prefix: 'Del', tables:[{name:'Del 1', sortOrder:1}, {name:'Del 2', sortOrder:2}, {name:'Del 3', sortOrder:3}] } ] }
];

let tableLayout = JSON.parse(localStorage.getItem('pos_layout_v2')) || defaultZones;

tableLayout.forEach(z => {
    z.sections.forEach(s => {
        if(s.tables && s.tables.length > 0 && typeof s.tables[0] === 'string') {
            s.tables = s.tables.map((tName, idx) => ({ name: tName, sortOrder: idx + 1 }));
        }
        s.tables.sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    });
});

const defaultMenu =[
    { id: 1, name: 'Chicken Karahi', altName: 'چکن کڑاہی', category: 'karahi', price: 1800, status: 'available', sortOrder: 1, variants:[{vName: 'Full', vPrice: 1800}, {vName: 'Half', vPrice: 1000}] },
    { id: 51, name: 'Tea', altName: 'چائے', category: 'other', price: 70, status: 'available', sortOrder: 3 },
    { id: 54, name: 'Roti', altName: 'روٹی', category: 'other', price: 15, status: 'available', sortOrder: 4, askQty: true },
    { id: 41, name: '1 Ltr Drink', category: 'drinks', price: 100, status: 'available', sortOrder: 5 },
    { id: 43, name: 'Reg Drink', category: 'drinks', price: 70, status: 'available', sortOrder: 6 },
    { id: 22, name: 'Tikka (KG)', category: 'bbq', pricePerKg: 900, status: 'available', askPrice: true, askQty: true, sortOrder: 7 }
];
let menuItems = JSON.parse(localStorage.getItem('pos_menu_items')) || defaultMenu;

const defaultCats =[ { id: 'karahi', name: 'KARAHI' }, { id: 'drinks', name: 'DRINKS' }, { id: 'regular', name: 'SALAN' }, { id: 'bbq', name: 'BBQ' }, { id: 'other', name: 'OTHER' } ];
let menuCategories = JSON.parse(localStorage.getItem('pos_menu_cats')) || defaultCats;

let app = {
    table: null, pendingTable: null,
    orders: JSON.parse(localStorage.getItem('savedOrders')) || {},
    history: JSON.parse(localStorage.getItem('orderHistory')) ||[],
    deletedOrders: JSON.parse(localStorage.getItem('deletedOrders')) ||[],
    clients: JSON.parse(localStorage.getItem('pos_clients')) ||[], 
    currentOrder:[], currentCat: 'karahi',
    waiters:[], 
    discountType: 'fixed', timerInterval: null, tempPayments:[],
    isReadOnly: false, editMode: false, currentUser: null,
    lastDayEnd: parseInt(localStorage.getItem('pos_lastDayEnd')) || 0, // Track when day ended
    currentShiftStart: parseInt(localStorage.getItem('pos_shiftStart')) || Date.now() // Track shift time
};

// --- ADVANCED CONFIGURATION & PREFERENCES ---
let appSettings = JSON.parse(localStorage.getItem('pos_app_settings')) || {
    property: { name: 'AL-MADINA SHINWARI', phone: '0341-3334206, 0343-8484346', address: 'Main Gujranwala, Hafizabad Road', currency: 'PKR', logo: '', branch: '', openingTime: '00:00', closingTime: '23:59' },
    preferences: { 
        theme: 'default', fontFamily: 'Inter', fontStyle: 'normal', cartPosition: 'right', menuLang: 'both',
        tableFontSize: '0.85rem', paymentFontSize: '1.2rem', itemFontSize: '0.85rem', priceFontSize: '0.75rem', 
        catFontSize: '0.75rem', cartHeadFontSize: '0.65rem', cartItemFontSize: '0.75rem', dashNumFontSize: '1.2rem'
    },
    paymentMethods:['Cash', 'JazzCash', 'Easypaisa', 'Bank', 'Udhaar', 'Staff'],
    billConfig: { 
        css: '', customFooter: '*** Thank You ***<br>Software by: Hamza Younas',
        printLogo: true, printPropInfo: true, printInvoiceNo: true, printStartTime: true, printPrintTime: true,
        printWaiter: true, printCashier: true, printCustomer: true, urduItems: true, printBreakdown: true, printPayments: true
    },
    kotConfig: { format: '' }
};

let appWorkers = JSON.parse(localStorage.getItem('pos_workers'));
if (!appWorkers || appWorkers.length === 0) {
    appWorkers =[
        { name: 'Ali', role: 'Waiter', login: '', pass: '', phone: '' },
        { name: 'Ahmed', role: 'Waiter', login: '', pass: '', phone: '' },
        { name: 'Bilal', role: 'Waiter', login: '', pass: '', phone: '' },
        { name: 'Staff', role: 'Waiter', login: '', pass: '', phone: '' },
        { name: 'Cashier', role: 'Cashier', login: 'cashier', pass: '1234', phone: '' },
        { name: 'Admin', role: 'Admin', login: 'admin', pass: 'admin', phone: '' }
    ];
    localStorage.setItem('pos_workers', JSON.stringify(appWorkers));
}

let appRoles = JSON.parse(localStorage.getItem('pos_roles')) ||[
    { name: 'Admin', perms: { editRoles: true, createOrder: true, transferTable: true, transferWaiter: true, splitOrder: true, applyDiscount: true, applyTax: true, refund: true, deleteActiveOrder: true, wipeHistory: true, manageClients: true, manageAccounts: true, manageVouchers: true, viewDashboard: true, viewReports: true, viewHistory: true, reprintOrder: true, editMenu: true, modifyPrinted: true } },
    { name: 'Manager', perms: { editRoles: false, createOrder: true, transferTable: true, transferWaiter: true, splitOrder: true, applyDiscount: true, applyTax: true, refund: true, deleteActiveOrder: true, wipeHistory: false, manageClients: true, manageAccounts: true, manageVouchers: true, viewDashboard: true, viewReports: true, viewHistory: true, reprintOrder: true, editMenu: true, modifyPrinted: false } },
    { name: 'Cashier', perms: { editRoles: false, createOrder: true, transferTable: true, transferWaiter: true, splitOrder: true, applyDiscount: false, applyTax: false, refund: false, deleteActiveOrder: false, wipeHistory: false, manageClients: true, manageAccounts: true, manageVouchers: true, viewDashboard: false, viewReports: false, viewHistory: true, reprintOrder: true, editMenu: false, modifyPrinted: false } },
    { name: 'Waiter', perms: { editRoles: false, createOrder: true, transferTable: false, transferWaiter: false, splitOrder: false, applyDiscount: false, applyTax: false, refund: false, deleteActiveOrder: false, wipeHistory: false, manageClients: false, manageAccounts: false, manageVouchers: false, viewDashboard: false, viewReports: false, viewHistory: false, reprintOrder: false, editMenu: false, modifyPrinted: false } }
];

function hasPerm(permName) {
    if(!app.currentUser) return false;
    if(app.currentUser.role === 'Admin') return true;
    const role = appRoles.find(r => r.name === app.currentUser.role);
    return role && role.perms[permName];
}

function updateAppWaitersList() {
    const w = appWorkers.filter(wrk => wrk.role === 'Waiter').map(wrk => wrk.name);
    if(w.length > 0) app.waiters = w;
    else app.waiters =['Ali', 'Ahmed', 'Bilal', 'Staff']; 
}
updateAppWaitersList();