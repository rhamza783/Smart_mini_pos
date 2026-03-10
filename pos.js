/* 
╔══════════════════════════════════════════════════════════════════════════════╗
║  SCRIPT: CORE POS LOGIC, CART, CHECKOUT & PRINTING (pos.js)                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function renderAllTables() {
    tableLayout.forEach((zone) => {
        const container = document.getElementById(zone.id + '-container');
        if (!container) return;
        container.innerHTML = '';
        zone.sections.forEach((section) => {
            const groupDiv = document.createElement('div'); groupDiv.className = 'table-group';
            const header = document.createElement('div'); header.className = 'table-group-header';
            header.innerHTML = `<span>${section.name}</span> <div class="header-line"></div>`;
            groupDiv.appendChild(header);
            const rowDiv = document.createElement('div'); rowDiv.className = 'fit-row';
            
            // Sort tables before rendering
            section.tables.sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));

            section.tables.forEach((tObj) => {
                const tName = typeof tObj === 'string' ? tObj : tObj.name;
                const btn = document.createElement('button'); btn.className = 'table-btn empty'; btn.setAttribute('data-table', tName);
                btn.textContent = tName; btn.onclick = () => selectTable(tName);
                rowDiv.appendChild(btn);
            });
            groupDiv.appendChild(rowDiv); container.appendChild(groupDiv);
        });
    });
    updateTableButtons();
}

function selectTable(tableName, fromWaiterSelect = false) {
    if(typeof exitReadOnlyMode === 'function') exitReadOnlyMode();
    if(!hasPerm('createOrder') && !app.orders[tableName]) return showCustomAlert("Denied", "You do not have permission to create orders.");

    const orderExists = app.orders[tableName] && app.orders[tableName].items.length > 0;
    let isDineIn = false;
    let isTakeawayOrDelivery = false;
    
    if(tableLayout.length > 0) {
        tableLayout.forEach(zone => {
            if(zone.name.toLowerCase().includes('take') || zone.name.toLowerCase().includes('delivery')) {
                zone.sections.forEach(s => { s.tables.forEach(t => { if((typeof t === 'string' ? t : t.name) === tableName) isTakeawayOrDelivery = true; }); });
            } else {
                zone.sections.forEach(s => { s.tables.forEach(t => { if((typeof t === 'string' ? t : t.name) === tableName) isDineIn = true; }); });
            }
        });
    }

    if (isDineIn && !orderExists && !fromWaiterSelect) {
        app.pendingTable = tableName; openWaiterModal(true); return;
    }

    if (isTakeawayOrDelivery && !orderExists && !fromWaiterSelect) {
        app.table = tableName;
        if(!app.orders[tableName]) {
            app.orders[tableName] = { id: Date.now().toString().slice(-6), items:[], startTime: Date.now(), persons: 1, waiter: 'Staff', discount: 0, discType: 'fixed', customer: { name: '', phone: '', address: '' }, clientId: null };
        }
        document.body.classList.remove('hide-cart');
        loadTableData(); renderOrderList(); showSection('items'); startTimer();
        if(typeof openCustomerModal === 'function') openCustomerModal();
        return;
    }

    app.table = tableName;
    if(!app.orders[tableName]) {
        app.orders[tableName] = { id: Date.now().toString().slice(-6), items:[], startTime: Date.now(), persons: 1, waiter: 'Staff', discount: 0, discType: 'fixed', customer: { name: '', phone: '', address: '' }, clientId: null };
    }
    
    document.body.classList.remove('hide-cart');

    loadTableData(); renderOrderList(); showSection('items'); startTimer();
}

function loadTableData() {
    const data = app.orders[app.table];
    app.currentOrder = data.items;
    app.discountType = data.discType || 'fixed';
    document.getElementById('current-table-display').textContent = app.table;
    document.getElementById('order-id-display').textContent = 'Ord #' + data.id;
    document.getElementById('start-time-display').textContent = formatOrderTime(data.startTime);
    const discInput = document.getElementById('input-discount');
    if(discInput) discInput.value = data.discount || 0;
    document.getElementById('btn-waiter').innerHTML = `<i class="fas fa-user-tie"></i> ${data.waiter || "Staff"}`;
    
    const clientDisp = document.getElementById('cart-client-display');
    if(data.clientId) {
        const cl = app.clients.find(c => c.id === data.clientId);
        if(cl) { 
            if(cl.isBlocked) {
                clientDisp.innerHTML = `Client: ${cl.name} <span style="color:var(--col-danger); font-weight:900;">[BLOCKED]</span>`; 
                document.getElementById('cart-close-btn').disabled = true;
                document.getElementById('cart-close-btn').style.opacity = '0.5';
            } else {
                clientDisp.textContent = `Client: ${cl.name} (${cl.company || cl.phone})`; 
                document.getElementById('cart-close-btn').disabled = false;
                document.getElementById('cart-close-btn').style.opacity = '1';
            }
            clientDisp.style.display = 'block'; 
        }
    } else { 
        clientDisp.style.display = 'none'; 
        document.getElementById('cart-close-btn').disabled = false;
        document.getElementById('cart-close-btn').style.opacity = '1';
    }
}

function renderCategories() {
    const container = document.getElementById('menu-cat-container'); container.innerHTML = '';
    menuCategories.forEach(cat => {
        const btn = document.createElement('button'); btn.className = `pos-cat-btn ${app.currentCat === cat.id ? 'active' : ''}`;
        btn.textContent = cat.name; btn.onclick = (e) => { app.currentCat = cat.id; renderCategories(); renderMenu(); };
        container.appendChild(btn);
    });
}

function renderMenu() {
    const container = document.getElementById('menu-items-container'); container.innerHTML = '';
    const items = menuItems.filter(i => i.category === app.currentCat && i.status !== 'disabled');
    
    // Sort by sortOrder dynamically
    items.sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));

    const prefLang = appSettings.preferences.menuLang || 'both';

    items.forEach(item => {
        const btn = document.createElement('button'); btn.className = 'pos-item-btn';
        let priceTxt = item.pricePerKg ? 'Per Kg' : item.price;
        if (item.variants && item.variants.length > 0) priceTxt = 'Options';

        let html = ''; if(item.imgData) html += `<img src="${item.imgData}" alt="icon">`;
        
        // Bilingual logic
        let showEn = (prefLang === 'both' || prefLang === 'en');
        let showUr = (prefLang === 'both' || prefLang === 'ur') && item.altName;
        
        let nameHtml = '';
        if (showEn) nameHtml += item.name;
        if (showEn && showUr) nameHtml += `<br>`;
        if (showUr) nameHtml += `<span style="font-family:'Noto Nastaliq Urdu'; font-weight:400;">${item.altName}</span>`;

        html += `<span class="pos-item-name">${nameHtml}</span><span class="pos-item-price">${priceTxt}</span>`;
        btn.innerHTML = html;
        btn.onclick = () => { if(!app.isReadOnly) addToOrder(item); };
        container.appendChild(btn);
    });
}

// MODIFIED: Variant & Custom Prompts Engine
function addToOrder(item) {
    if(app.isReadOnly) return;
    
    let finalPrice = item.price;
    let finalName = item.name;
    
    // 1. Check for Modular Variants First
    if(item.variants && item.variants.length > 0) {
        openVariantModal(item, (selectedVariant) => {
            if(selectedVariant) {
                finalName = `${item.name} (${selectedVariant.vName})`;
                finalPrice = selectedVariant.vPrice;
            }
            processItemAdd(item, finalName, finalPrice);
        });
        return;
    }

    processItemAdd(item, finalName, finalPrice);
}

function openVariantModal(item, callback) {
    const modal = document.getElementById('variant-modal');
    const list = document.getElementById('variant-list');
    document.getElementById('variant-title').textContent = `Options for ${item.name}`;
    list.innerHTML = '';
    
    item.variants.forEach(v => {
        const btn = document.createElement('button');
        btn.className = 'btn-modern';
        btn.style.cssText = "padding:15px; font-size:1rem; font-weight:700; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); box-shadow:var(--neumorph-out-sm); border:none;";
        btn.innerHTML = `<span>${v.vName}</span> <span style="color:var(--col-primary);">PKR ${v.vPrice}</span>`;
        btn.onclick = () => {
            closeModal('variant-modal');
            callback(v);
        };
        list.appendChild(btn);
    });
    modal.classList.add('active');
}

function processItemAdd(item, finalName, finalPrice) {
    // 2. Ask Price Check
    if(item.askPrice || item.pricePerKg) {
        openCustomPrompt(`Enter custom price for ${finalName}:`, finalPrice, (userPrice) => {
            if(userPrice === null || userPrice === '') return;
            let parsedPrice = parseFloat(userPrice); 
            if(isNaN(parsedPrice)) return showCustomAlert("Invalid Price", "The price you entered is not valid.");
            checkAskQty(item, finalName, parsedPrice);
        });
    } else {
        checkAskQty(item, finalName, finalPrice);
    }
}

function checkAskQty(item, finalName, finalPrice) {
    // 3. Ask Qty Check (Loose Roti / Grams)
    if(item.askQty) {
        openCustomPrompt(`Enter exact quantity/weight for ${finalName}:`, 1, (userQty) => {
            if(userQty === null || userQty === '') return;
            let parsedQty = parseFloat(userQty); 
            if(isNaN(parsedQty) || parsedQty <= 0) return showCustomAlert("Invalid Qty", "The quantity entered is not valid.");
            finishAddToOrder(item, finalName, finalPrice, parsedQty);
        });
    } else {
        finishAddToOrder(item, finalName, finalPrice, 1);
    }
}

function finishAddToOrder(baseItem, finalName, finalPrice, qty) {
    const existing = app.currentOrder.find(i => i.name === finalName && i.price === finalPrice);
    if(existing) { 
        existing.qty += qty; 
        existing.total = existing.qty * existing.price; 
    } else { 
        app.currentOrder.push({ 
            id: baseItem.id, 
            name: finalName, 
            altName: baseItem.altName, // Pass altName for bilingual printing
            price: finalPrice, 
            qty: qty, 
            total: finalPrice * qty, 
            printedQty: 0 
        }); 
    }
    saveToLocal(); renderOrderList();
}

function renderOrderList() {
    const list = document.getElementById('order-items-list'); list.innerHTML = '';
    if (app.isReadOnly && document.getElementById('ro-banner')) list.appendChild(document.getElementById('ro-banner'));
    if(app.currentOrder.length === 0) {
        const msg = document.createElement('p'); msg.style.textAlign = 'center'; msg.style.color = 'var(--text-secondary)'; msg.style.marginTop = '30px'; msg.style.fontSize = '0.85rem'; msg.style.fontStyle = 'italic';
        msg.textContent = app.isReadOnly ? "No items" : "Select a Table to start"; list.appendChild(msg);
    } else {
        app.currentOrder.forEach((item, idx) => {
            const div = document.createElement('div'); div.className = 'order-item';
            const lockIcon = (item.printedQty > 0 && !app.isReadOnly) ? '<i class="fas fa-lock" title="Printed" style="color:var(--col-danger); font-size:0.7rem; margin-left:4px;"></i>' : '';
            div.innerHTML = `
                <div class="item-name"><span class="item-bullet"></span> ${item.name} ${lockIcon}</div>
                <div class="item-unit-price">${item.price}</div>
                <div class="item-qty"><button class="qty-btn" onclick="changeQty(${idx}, -1)">-</button><span class="qty-val">${item.qty}</span><button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button></div>
                <div class="item-total">${item.total.toFixed(0)}</div>`;
            list.appendChild(div);
        });
    }
    if (!app.isReadOnly) updateTotals();
}

function changeQty(idx, delta) {
    if(app.isReadOnly) return;
    const item = app.currentOrder[idx];
    
    // ADMIN LOCK CHECK: Prevent decreasing printed quantities
    if (delta < 0 && item.printedQty > 0) {
        if(!hasPerm('modifyPrinted')) {
            return showCustomAlert("Item Locked", "This item has already been printed to the kitchen. Administrator authorization required to decrease or remove it.");
        }
    }

    if (delta < 0 && item.qty <= 1) { 
        openConfirm('Remove Item?', `Are you sure you want to remove ${item.name} from the order?`, () => {
            app.currentOrder.splice(idx, 1);
            saveToLocal(); renderOrderList();
        });
        return;
    } else {
        item.qty += delta;
    }
    if(app.currentOrder[idx]) app.currentOrder[idx].total = app.currentOrder[idx].qty * app.currentOrder[idx].price;
    saveToLocal(); renderOrderList();
}

function getOrderTotals() {
    const subtotal = app.currentOrder.reduce((a,b)=>a+b.total,0);
    const discInput = document.getElementById('input-discount');
    const discVal = discInput ? (parseFloat(discInput.value) || 0) : 0;
    let discountAmt = (app.discountType === 'percent') ? subtotal * (discVal / 100) : discVal;
    return { sub: subtotal, disc: discountAmt, total: subtotal - discountAmt };
}

function updateTotals() {
    if(app.isReadOnly) return;
    const totals = getOrderTotals();
    document.getElementById('subtotal-display').textContent = totals.sub.toFixed(0);
    document.getElementById('discount-display-txt').textContent = `Disc: ${totals.disc.toFixed(0)}`;
    document.getElementById('total-display').textContent = `PKR ${totals.total.toFixed(0)}`;
    if(app.table && app.orders[app.table]) {
        app.orders[app.table].discount = parseFloat(document.getElementById('input-discount').value) || 0;
        localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    }
    updateTableButtons();
}

function saveToLocal() { 
    if(app.table && !app.isReadOnly) { 
        app.orders[app.table].items = app.currentOrder; 
        localStorage.setItem('savedOrders', JSON.stringify(app.orders)); 
    } 
}

function formatOrderTime(ts) { 
    const d = new Date(ts); 
    return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); 
}

function updateTableButtons() {
    document.querySelectorAll('.table-btn').forEach(btn => {
        const tName = btn.getAttribute('data-table');
        if(app.orders[tName] && app.orders[tName].items.length > 0) {
            btn.classList.add('occupied');
            const mins = Math.floor((Date.now() - app.orders[tName].startTime)/60000);
            btn.innerHTML = `${tName}<br><span class="timer-display">${mins} min</span>`;
        } else { 
            btn.classList.remove('occupied'); btn.innerHTML = tName; 
        }
    });
}

function startTimer() {
    if(app.timerInterval) clearInterval(app.timerInterval);
    app.timerInterval = setInterval(() => {
        if(app.isReadOnly || !app.table || !app.orders[app.table]) return;
        const diff = Math.floor((Date.now() - app.orders[app.table].startTime) / 1000);
        let display = diff < 60 ? diff+"s" : diff < 3600 ? Math.floor(diff/60)+":"+(diff%60).toString().padStart(2,'0') : Math.floor(diff/3600)+"h";
        document.getElementById('serv-time-display').textContent = display;
    }, 1000);
}

function clearOrder() { 
    if(app.isReadOnly || !app.table) return;
    if(!hasPerm('deleteActiveOrder')) return showCustomAlert("Denied", "You do not have permission to delete/clear active orders.");
    openConfirm("Clear Order", "Are you sure you want to completely clear this order? All items will be removed.", () => {
        app.currentOrder =[]; saveToLocal(); renderOrderList(); 
    });
}

// --- CHECKOUT & PAYMENT ---
function renderDynamicPaymentMethods() {
    const methodGrid = document.getElementById('dynamic-payment-grid');
    if(methodGrid) {
        methodGrid.innerHTML = '';
        appSettings.paymentMethods.forEach((m, i) => {
            methodGrid.innerHTML += `<button class="method-option ${i===0?'active':''}" onclick="selectMethod('${m}')">${m}</button>`;
        });
        if(appSettings.paymentMethods.length > 0) document.getElementById('selected-pay-method').value = appSettings.paymentMethods[0];
    }
}

function openPaymentModal() {
    if(app.isReadOnly) return; 
    if(!app.table || app.currentOrder.length === 0) return showToast('Empty Order');
    
    // Block validation
    if (app.orders[app.table].clientId) {
        const c = app.clients.find(x => x.id === app.orders[app.table].clientId);
        if (c && c.isBlocked) return showCustomAlert("Client Blocked", "This client has been restricted by management. You cannot process this order.");
    }

    const t = getOrderTotals(); 
    document.getElementById('payment-modal').classList.add('active');
    renderDynamicPaymentMethods();
    document.getElementById('pay-total-due').textContent = t.total.toFixed(0);
    app.tempPayments =[{ method: appSettings.paymentMethods[0] || 'Cash', amount: t.total }]; 
    renderPaymentState();
}

function selectMethod(m) { 
    document.querySelectorAll('.method-option').forEach(b => b.classList.remove('active')); 
    Array.from(document.querySelectorAll('.method-option')).find(e => e.textContent === m).classList.add('active'); 
    document.getElementById('selected-pay-method').value = m; 
}

function addPaymentRow() {
    const amt = parseFloat(document.getElementById('pay-input-amount').value); const m = document.getElementById('selected-pay-method').value;
    if(!amt || amt <= 0) return showToast('Enter Amount');
    app.tempPayments.push({ method: m, amount: amt }); renderPaymentState(); document.getElementById('pay-input-amount').value = '';
}

function renderPaymentState() {
    const due = parseFloat(document.getElementById('pay-total-due').textContent); 
    const list = document.getElementById('payment-rows-container'); 
    list.innerHTML = '';
    let paid = 0; 
    
    app.tempPayments.forEach((p, idx) => { 
        paid += p.amount; 
        list.innerHTML += `<div class="payment-row-item"><span>${p.method}</span><span>${p.amount} <i class="fas fa-times" style="color:var(--col-danger);cursor:pointer;margin-left:8px;" onclick="app.tempPayments.splice(${idx},1);renderPaymentState()"></i></span></div>`; 
    });
    
    const bal = due - paid; 
    document.getElementById('pay-total-paid').textContent = paid.toFixed(0); 
    document.getElementById('pay-balance').textContent = bal.toFixed(0);
    document.getElementById('btn-finish-order').disabled = bal > 0; 
    
    const inputEl = document.getElementById('pay-input-amount');
    inputEl.value = bal > 0 ? bal : '';
    
    // Frictionless Auto-Select Focus
    setTimeout(() => {
        if (bal > 0 && document.getElementById('payment-modal').classList.contains('active')) {
            inputEl.focus();
            inputEl.select(); 
        }
    }, 50);
}

function finishOrder() {
    const totals = getOrderTotals(); const ord = app.orders[app.table];
    
    // UDHAAR STRICT VALIDATION FIX
    let udhaarAmt = app.tempPayments.filter(p => p.method === 'Udhaar').reduce((a, b) => a + b.amount, 0);
    const linkedClientId = document.getElementById('cart-client-select') ? document.getElementById('cart-client-select').value : ord.clientId;
    
    if (udhaarAmt > 0 && (!linkedClientId || linkedClientId === "")) {
        showCustomAlert("Action Required", "You must link an existing client to use Udhaar/Credit payment. Please select a client from Customer details.");
        return; // Halt process
    }

    ord.clientId = linkedClientId; // Ensure synchronization

    // Client Ledger Updates
    if (ord.clientId) {
        const c = app.clients.find(x => x.id === ord.clientId);
        if (c) {
            c.totalOrders++;
            c.totalDiscount += parseFloat(document.getElementById('input-discount').value) || 0;
            c.totalPurchasing = (c.totalPurchasing || 0) + totals.total; 
            
            if(!c.favorites) c.favorites = {};
            app.currentOrder.forEach(item => {
                c.favorites[item.name] = (c.favorites[item.name] || 0) + item.qty;
            });

            if (udhaarAmt > 0) {
                c.balance += udhaarAmt;
                c.ledger.push({ date: new Date().toLocaleString(), action: 'Purchase (Udhaar)', amt: udhaarAmt, folio: ord.id });
            }
            localStorage.setItem('pos_clients', JSON.stringify(app.clients));
            if(typeof renderClientsList === 'function') renderClientsList(); 
        }
    }

    const cashierName = app.currentUser ? app.currentUser.name : 'Unknown';

    app.history.push({
        id: ord.id, table: app.table, sub: totals.sub, total: totals.total, date: new Date().toLocaleString(),
        startTimeRaw: ord.startTime, duration: document.getElementById('serv-time-display').textContent,
        persons: ord.persons, waiter: ord.waiter, customer: ord.customer, clientId: ord.clientId, discountVal: parseFloat(document.getElementById('input-discount').value)||0,
        items:[...app.currentOrder], payments:[...app.tempPayments],
        cashier: cashierName 
    });
    localStorage.setItem('orderHistory', JSON.stringify(app.history));
    
    printBill(false, app.tempPayments); 
    
    delete app.orders[app.table]; localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    app.table = null; app.currentOrder =[]; document.getElementById('current-table-display').textContent = '--';
    document.getElementById('order-items-list').innerHTML = ''; document.getElementById('total-display').textContent = 'PKR 0';
    document.getElementById('cart-client-display').style.display = 'none'; 
    
    document.body.classList.add('hide-cart');

    updateTableButtons(); closeModal('payment-modal'); showSection(tableLayout[0].id); showToast('Order Closed');
}

// MODIFIED: Advanced Toggle Engine for KOT/Receipt
function printBill(isDraft = true, payments =[]) {
    if(app.currentOrder.length === 0) return;
    let ordId, tbl, waiter, customer;
    if(app.isReadOnly) {
        ordId = document.getElementById('order-id-display').textContent.replace('Ord #', '').trim();
        tbl = document.getElementById('current-table-display').textContent.replace(' (Hist)', '');
        waiter = document.getElementById('btn-waiter').textContent.trim();
        customer = { name: document.getElementById('cust-name').value, phone: document.getElementById('cust-phone').value, address: document.getElementById('cust-address').value };
    } else {
         ordId = app.orders[app.table].id; tbl = app.table; waiter = app.orders[app.table].waiter; customer = app.orders[app.table].customer || {};
         app.currentOrder.forEach(i => { if(!i.printedQty || i.qty > i.printedQty) i.printedQty = i.qty; }); saveToLocal(); renderOrderList();
    }

    const bc = appSettings.billConfig;

    document.getElementById('dynamic-print-styles').innerHTML = bc.css;
    document.getElementById('dynamic-print-footer').innerHTML = isDraft ? '' : bc.customFooter;

    let logoHtml = (bc.printLogo && appSettings.property.logo && !isDraft) ? `<img src="${appSettings.property.logo}" style="max-width: 150px; height: auto; margin-bottom: 10px; border-radius: 8px;">` : '';
    
    let headerHtml = logoHtml;
    if(bc.printPropInfo && !isDraft) {
        headerHtml += `
            <div class="bold" style="font-size: 16px; margin-bottom: 5px;">${appSettings.property.name}</div>
            <div>${appSettings.property.address}</div>
            <div>${appSettings.property.branch ? 'Branch: ' + appSettings.property.branch : ''}</div>
            <div>Tel: ${appSettings.property.phone}</div>
        `;
    }
    document.getElementById('print-header-config').innerHTML = headerHtml;
    document.getElementById('sep-header').style.display = headerHtml ? 'block' : 'none';

    let metaHtml = '';
    if(bc.printPrintTime) metaHtml += `<div class="flex-row"><span>Date:</span> <span>${new Date().toLocaleString()}</span></div>`;
    if(bc.printStartTime && !isDraft) metaHtml += `<div class="flex-row"><span>Started:</span> <span>${new Date(app.orders[app.table]?.startTime || Date.now()).toLocaleString()}</span></div>`;
    if(bc.printInvoiceNo) metaHtml += `<div class="flex-row"><span>Order #:</span> <span>${ordId}</span></div>`;
    metaHtml += `<div class="flex-row"><span>Table:</span> <span>${tbl}</span></div>`;
    if(bc.printWaiter) metaHtml += `<div class="flex-row"><span>Server:</span> <span>${waiter}</span></div>`;
    if(bc.printCashier && !isDraft && app.currentUser) metaHtml += `<div class="flex-row"><span>Cashier:</span> <span>${app.currentUser.name}</span></div>`;
    
    metaHtml += `<div style="margin-top:5px; font-weight:bold; text-align:center;">${isDraft ? '(KOT / Kitchen Order)' : '(Customer Receipt)'}</div>`;
    document.getElementById('rec-meta-body').innerHTML = metaHtml;

    let custHtml = "";
    if(bc.printCustomer && (customer.name || customer.phone || customer.address)) {
        custHtml += `<div class="customer-box"><div class="bold" style="margin-bottom: 5px;">CUSTOMER INFO:</div>`;
        if(customer.name) custHtml += `<div class="flex-row"><span>Name:</span> <span>${customer.name}</span></div>`;
        if(customer.phone) custHtml += `<div class="flex-row"><span>Cell:</span> <span>${customer.phone}</span></div>`;
        if(customer.address) custHtml += `<div class="flex-row"><span>Addr:</span> <span style="text-align:right; max-width:60%;">${customer.address}</span></div>`;
        custHtml += `</div>`;
    }
    document.getElementById('rec-customer-body').innerHTML = custHtml;

    // Toggle Amount Column in Header
    document.getElementById('th-amt').style.display = isDraft ? 'none' : 'table-cell';

    const tbody = document.getElementById('receipt-body'); tbody.innerHTML = '';
    app.currentOrder.forEach(i => { 
        let itemName = i.name;
        if(bc.urduItems && i.altName) {
            itemName += `<br><span style="font-family:'Noto Nastaliq Urdu'; font-weight:normal;">${i.altName}</span>`;
        }
        let row = `<tr><td class="item-name-cell">${itemName}</td><td class="text-center">${i.qty}</td>`;
        if(!isDraft) row += `<td class="text-right">${i.total.toFixed(0)}</td>`;
        row += `</tr>`;
        tbody.innerHTML += row; 
    });

    const subtotal = app.currentOrder.reduce((a,b)=>a+b.total,0);
    let disc = 0, total = 0;
    if(app.isReadOnly) { total = parseFloat(document.getElementById('total-display').textContent.replace('PKR ','')); disc = subtotal - total; }
    else { const t = getOrderTotals(); disc = t.disc; total = t.total; }

    if(isDraft || !bc.printBreakdown) {
        document.getElementById('rec-calculations').innerHTML = '';
        document.getElementById('sep-footer').style.display = 'none';
    } else {
        document.getElementById('sep-footer').style.display = 'block';
        document.getElementById('rec-calculations').innerHTML = `<div class="flex-row"><span>Subtotal:</span><span>${subtotal.toFixed(0)}</span></div><div class="flex-row"><span>Discount:</span><span>${disc.toFixed(0)}</span></div><div class="total-box">TOTAL: ${appSettings.property.currency} ${total.toFixed(0)}</div>`;
    }

    let payHtml = "";
    if(!isDraft && payments.length > 0 && bc.printPayments) {
        payHtml += `<div style="font-weight:bold; margin-bottom:5px; text-decoration: underline;">PAYMENTS:</div>`;
        payments.forEach(p => { payHtml += `<div class="flex-row"><span>${p.method}:</span><span>${p.amount}</span></div>`; });
        const paid = payments.reduce((a,b)=>a+b.amount,0);
        payHtml += `<div class="sep-dashed"></div><div class="flex-row bold" style="font-size:15px;"><span>Total Paid:</span><span>${paid.toFixed(0)}</span></div>`;
        if(paid >= total) payHtml += `<div class="flex-row bold" style="font-size:15px;"><span>Change Due:</span><span>${(paid - total).toFixed(0)}</span></div>`;
        else payHtml += `<div class="flex-row bold" style="font-size:15px; color:black;"><span>Balance:</span><span>${(total - paid).toFixed(0)}</span></div>`;
    }
    document.getElementById('rec-payment-breakdown').innerHTML = payHtml;
    
    window.print();
}

// --- WAITER, TRANSFER & MERGE ---
function openWaiterModal(isNew = false) {
    const list = document.getElementById('waiter-list'); list.innerHTML = '';
    app.waiters.forEach(w => {
        const btn = document.createElement('button'); btn.textContent = w;
        btn.style.cssText = "padding:12px; border:none; border-radius:10px; background:var(--bg-app); box-shadow:var(--neumorph-out-sm); cursor:pointer; font-weight:700; color:var(--text-secondary);";
        btn.onclick = () => {
            if(isNew) {
                app.table = app.pendingTable;
                app.orders[app.table] = { id: Date.now().toString().slice(-6), items:[], startTime: Date.now(), persons: 1, waiter: w, discount: 0, discType: 'fixed', customer: { name: '', phone: '', address: '' }, clientId: null };
                document.body.classList.remove('hide-cart'); 
                loadTableData(); renderOrderList(); showSection('items'); startTimer();
            } else {
                if(!hasPerm('transferWaiter')) return showCustomAlert("Denied", "No permission to transfer waiter.");
                app.orders[app.table].waiter = w; saveToLocal(); loadTableData();
            }
            closeModal('waiter-modal');
        };
        list.appendChild(btn);
    });
    document.getElementById('waiter-modal').classList.add('active');
}

function openTransferModal() {
    if (!app.table || !app.orders[app.table]) return showToast("No active order");
    if (!hasPerm('transferTable')) return showCustomAlert("Denied", "You don't have permission to transfer tables.");
    const container = document.getElementById('transfer-list'); container.innerHTML = '';
    let count = 0;
    tableLayout.forEach(zone => {
        const zoneTitle = document.createElement('div'); zoneTitle.className = 'transfer-group-title'; zoneTitle.style.gridColumn = '1 / -1'; zoneTitle.textContent = zone.name;
        let zoneHasTables = false;
        zone.sections.forEach(sec => {
            sec.tables.forEach(tObj => {
                const tName = typeof tObj === 'string' ? tObj : tObj.name;
                if (tName !== app.table && (!app.orders[tName] || app.orders[tName].items.length === 0)) {
                    if(!zoneHasTables) { container.appendChild(zoneTitle.cloneNode(true)); zoneHasTables = true; }
                    const btn = document.createElement('button'); btn.className = 'transfer-btn'; btn.textContent = tName;
                    btn.onclick = () => executeTransfer(tName); container.appendChild(btn); count++;
                }
            });
        });
    });
    if (count === 0) container.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:0.8rem;color:var(--text-secondary)">No empty tables available.</p>';
    document.getElementById('transfer-modal').classList.add('active');
}

function executeTransfer(targetName) {
    openConfirm("Transfer Table", `Move order from ${app.table} to ${targetName}?`, () => {
        app.orders[targetName] = app.orders[app.table]; delete app.orders[app.table];
        saveToLocal(); closeModal('transfer-modal'); selectTable(targetName); showToast(`Transferred to ${targetName}`); renderAllTables();
    });
}

function openMergeModal() {
    if (!app.table || !app.orders[app.table]) return showToast("No active order");
    if (!hasPerm('transferTable')) return showCustomAlert("Denied", "You don't have permission to merge tables.");
    const activeTables = Object.keys(app.orders).filter(t => t !== app.table && app.orders[t].items.length > 0);
    const container = document.getElementById('merge-list'); container.innerHTML = '';
    if (activeTables.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:0.8rem;color:var(--text-secondary)">No other active tables to merge with.</p>';
    } else {
        activeTables.forEach(tName => {
            const btn = document.createElement('button'); btn.className = 'transfer-btn';
            btn.innerHTML = `<strong style="font-size:0.9rem;">${tName}</strong><br><span style="font-size:0.7rem; color:var(--col-primary);">#${app.orders[tName].id}</span>`;
            btn.onclick = () => executeMerge(tName); container.appendChild(btn);
        });
    }
    document.getElementById('merge-modal').classList.add('active');
}

function executeMerge(targetName) {
    openConfirm("Merge Tables", `Merge ${app.table} INTO ${targetName}?\nThis will clear ${app.table} and move items to ${targetName}.`, () => {
        const sourceOrder = app.orders[app.table]; const targetOrder = app.orders[targetName];
        targetOrder.items =[...targetOrder.items, ...sourceOrder.items];
        if (sourceOrder.customer.name || sourceOrder.customer.address) {
            const sourceNote = `[From ${app.table}: ${sourceOrder.customer.name || ''} ${sourceOrder.customer.address || ''}]`;
            targetOrder.customer.address = (targetOrder.customer.address || '') + ' ' + sourceNote;
        }
        delete app.orders[app.table]; saveToLocal(); closeModal('merge-modal'); renderAllTables(); selectTable(targetName); showToast(`Merged into ${targetName}`);
    });
}