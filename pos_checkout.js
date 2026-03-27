/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: pos_checkout.js – Payment, Printing, Waiter, Transfer, Merge         ║
║  Version: 5.2 – Final UI Enhanced Edition                                   ║
║  Software by: Hamza Younas                                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

// ============================================================================
// PAYMENT MODAL & METHODS
// ============================================================================

function renderDynamicPaymentMethods() {
    const methodGrid = document.getElementById('dynamic-payment-grid');
    if (!methodGrid) return;
    methodGrid.innerHTML = '';
    appSettings.paymentMethods.forEach((m, i) => {
        methodGrid.innerHTML += `<button class="method-option ${i === 0 ? 'active' : ''}" onclick="selectMethod('${m}')">${m}</button>`;
    });
    if (appSettings.paymentMethods.length > 0) document.getElementById('selected-pay-method').value = appSettings.paymentMethods[0];
}

function openPaymentModal() {
    if (app.isReadOnly) return;
    if (!app.table || app.currentOrder.length === 0) return showToast('Empty Order');
    const totals = getOrderTotals();
    document.getElementById('payment-modal').classList.add('active');
    renderDynamicPaymentMethods();
    document.getElementById('pay-total-due').textContent = totals.total.toFixed(0);
    const existingPayments = app.orders[app.table].payments || [];
    app.tempPayments = existingPayments.length > 0 ? JSON.parse(JSON.stringify(existingPayments)) : [{ method: appSettings.paymentMethods[0] || 'Cash', amount: totals.total }];
    renderPaymentState();
    const payInput = document.getElementById('pay-input-amount');
    if (payInput) {
        payInput.onfocus = (e) => e.target.select();
        payInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const bal = parseFloat(document.getElementById('pay-balance').textContent) || 0;
                if (bal <= 0) finishOrder(); else addPaymentRow();
            }
        };
    }
}

function selectMethod(m) {
    document.querySelectorAll('.method-option').forEach(b => b.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.method-option')).find(e => e.textContent === m);
    if (btn) btn.classList.add('active');
    document.getElementById('selected-pay-method').value = m;
}

function addPaymentRow() {
    const amt = parseFloat(document.getElementById('pay-input-amount').value);
    const m = document.getElementById('selected-pay-method').value;
    if (!amt || amt <= 0) return showToast('Enter Amount');
    app.tempPayments.push({ method: m, amount: amt });
    app.orders[app.table].payments = [...app.tempPayments];
    localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    renderPaymentState();
}

function renderPaymentState() {
    const due = parseFloat(document.getElementById('pay-total-due').textContent);
    const list = document.getElementById('payment-rows-container');
    list.innerHTML = '';
    let paid = 0;
    app.tempPayments.forEach((p, idx) => {
        paid += p.amount;
        list.innerHTML += `<div class="payment-row-item"><span>${p.method}</span><span>${appSettings.property.currency} ${p.amount.toFixed(0)} <i class="fas fa-times" style="color:var(--col-danger);cursor:pointer;margin-left:8px;" onclick="removePaymentRow(${idx})"></i></span></div>`;
    });
    const bal = due - paid;
    document.getElementById('pay-total-paid').textContent = paid.toFixed(0);
    document.getElementById('pay-balance').textContent = bal.toFixed(0);
    document.getElementById('btn-finish-order').disabled = bal > 0;
    const inputEl = document.getElementById('pay-input-amount');
    if (bal > 0) { inputEl.value = bal.toFixed(0); setTimeout(() => inputEl.select(), 50); } else { inputEl.value = ''; }
}

function removePaymentRow(idx) {
    app.tempPayments.splice(idx, 1);
    app.orders[app.table].payments = [...app.tempPayments];
    renderPaymentState();
}

// ============================================================================
// UI-DRIVEN PRINT ENGINE (NO TEMPLATES)
// ============================================================================

function printBill(isKOT = true, payments = []) {
    if (app.currentOrder.length === 0) return showToast("No items to print.");

    const config = isKOT ? appSettings.kotConfig : appSettings.billConfig;
    const s = config.printStyles;
    const prop = appSettings.property;
    
    let ord, tblName;
    if (app.isReadOnly) {
        const histId = document.getElementById('order-id-display').textContent.replace('Ord #', '').trim();
        ord = app.history.find(h => h.id == histId);
        tblName = ord.table;
    } else {
        ord = app.orders[app.table];
        tblName = app.table;
    }
    const totals = getOrderTotals();

    const styleTag = document.getElementById('dynamic-print-styles');
    styleTag.innerHTML = `
        #receipt-print-area { width: 100%; color: #000; background: #fff; display: block; }
        .p-center { text-align: center; }
        .p-flex { display: flex; justify-content: space-between; align-items: flex-start; }
        .p-sep { border-bottom: 1px dashed #000; margin: 8px 0; }
        
        /* Legacy unified header fallback */
        .f-header { font-size: ${s.headerFontSize || '16px'}; font-family: ${s.headerFontFamily || 'sans-serif'}; font-weight: ${s.headerFontStyle === 'bold' ? 'bold' : 'normal'}; }

        /* Separate Restaurant Name / Address / Phone */
        .f-rest-name  { font-size: ${s.restaurantNameFontSize  || s.headerFontSize  || '18px'}; font-family: '${s.restaurantNameFontFamily  || s.headerFontFamily  || 'sans-serif'}', sans-serif; font-weight: ${(s.restaurantNameFontStyle  || 'bold') === 'bold' ? 'bold' : 'normal'}; font-style: ${(s.restaurantNameFontStyle  || 'bold') !== 'bold' ? (s.restaurantNameFontStyle  || 'normal') : 'normal'}; }
        .f-rest-addr  { font-size: ${s.restaurantAddrFontSize  || s.headerFontSize  || '12px'}; font-family: '${s.restaurantAddrFontFamily  || s.headerFontFamily  || 'sans-serif'}', sans-serif; font-weight: ${(s.restaurantAddrFontStyle  || 'normal') === 'bold' ? 'bold' : 'normal'}; font-style: ${(s.restaurantAddrFontStyle  || 'normal') !== 'bold' ? (s.restaurantAddrFontStyle  || 'normal') : 'normal'}; }
        .f-rest-phone { font-size: ${s.restaurantPhoneFontSize || s.headerFontSize  || '12px'}; font-family: '${s.restaurantPhoneFontFamily || s.headerFontFamily  || 'sans-serif'}', sans-serif; font-weight: ${(s.restaurantPhoneFontStyle || 'normal') === 'bold' ? 'bold' : 'normal'}; font-style: ${(s.restaurantPhoneFontStyle || 'normal') !== 'bold' ? (s.restaurantPhoneFontStyle || 'normal') : 'normal'}; }
        
        /* REQ 1: ITEM NAME LEFT ALIGNED */
        .f-item-name { font-size: ${s.itemNameFontSize || '12px'}; font-family: ${s.itemNameFontFamily || 'sans-serif'}; font-weight: ${s.itemNameFontStyle === 'bold' ? 'bold' : 'normal'}; text-align: left; }
        .urdu { font-family: 'Noto Nastaliq Urdu', serif !important; direction: rtl; text-align: left; display: block; line-height: 1.8; }
        
        .f-item-price { font-size: ${s.itemPriceFontSize || '12px'}; font-family: ${s.itemPriceFontFamily || 'sans-serif'}; font-weight: ${s.itemPriceFontStyle === 'bold' ? 'bold' : 'normal'}; }
        .f-total-box { font-size: ${s.totalBoxFontSize || '16px'}; font-family: ${s.totalBoxFontFamily || 'sans-serif'}; font-weight: ${s.totalBoxFontStyle || 'bold'}; border-top:2px solid #000; border-bottom:2px solid #000; padding:5px 0; margin:10px 0; }
        .f-footer { font-size: ${s.footerFontSize || '12px'}; font-family: ${s.footerFontFamily || 'sans-serif'}; font-weight: ${s.footerFontStyle === 'bold' ? 'bold' : 'normal'}; }
        
        .f-date-h   { font-size: ${s.dateHeadingFontSize   || '12px'}; font-family: ${s.dateHeadingFontFamily   || 'sans-serif'}; font-weight: ${s.dateHeadingFontStyle   === 'bold' ? 'bold' : 'normal'}; }
        .f-date-v   { font-size: ${s.dateValueFontSize      || '12px'}; font-family: ${s.dateValueFontFamily      || 'sans-serif'}; font-weight: ${s.dateValueFontStyle      === 'bold' ? 'bold' : 'normal'}; }
        .f-order-h  { font-size: ${s.orderHeadingFontSize   || '12px'}; font-family: ${s.orderHeadingFontFamily   || 'sans-serif'}; font-weight: ${s.orderHeadingFontStyle   === 'bold' ? 'bold' : 'normal'}; }
        .f-order-v  { font-size: ${s.orderValueFontSize     || '12px'}; font-family: ${s.orderValueFontFamily     || 'sans-serif'}; font-weight: ${s.orderValueFontStyle     === 'bold' ? 'bold' : 'normal'}; }
        .f-table-h  { font-size: ${s.tableHeadingFontSize   || '12px'}; font-family: ${s.tableHeadingFontFamily   || 'sans-serif'}; font-weight: ${s.tableHeadingFontStyle   === 'bold' ? 'bold' : 'normal'}; }
        .f-table-v  { font-size: ${s.tableValueFontSize     || '12px'}; font-family: ${s.tableValueFontFamily     || 'sans-serif'}; font-weight: ${s.tableValueFontStyle     === 'bold' ? 'bold' : 'normal'}; }
        .f-server-h { font-size: ${s.serverHeadingFontSize  || '12px'}; font-family: ${s.serverHeadingFontFamily  || 'sans-serif'}; font-weight: ${s.serverHeadingFontStyle  === 'bold' ? 'bold' : 'normal'}; }
        .f-server-v { font-size: ${s.serverValueFontSize    || '12px'}; font-family: ${s.serverValueFontFamily    || 'sans-serif'}; font-weight: ${s.serverValueFontStyle    === 'bold' ? 'bold' : 'normal'}; }
        .f-cashier-h{ font-size: ${s.cashierHeadingFontSize || '12px'}; font-family: ${s.cashierHeadingFontFamily || 'sans-serif'}; font-weight: ${s.cashierHeadingFontStyle === 'bold' ? 'bold' : 'normal'}; }
        .f-cashier-v{ font-size: ${s.cashierValueFontSize   || '12px'}; font-family: ${s.cashierValueFontFamily   || 'sans-serif'}; font-weight: ${s.cashierValueFontStyle   === 'bold' ? 'bold' : 'normal'}; }
        .f-qty      { font-size: ${s.qtyNumberFontSize      || '12px'}; font-family: ${s.qtyNumberFontFamily      || 'sans-serif'}; font-weight: ${s.qtyNumberFontStyle      === 'bold' ? 'bold' : 'normal'}; }
        .f-disc     { font-size: ${s.discountFontSize       || '12px'}; font-family: ${s.discountFontFamily       || 'sans-serif'}; }
        .f-subt     { font-size: ${s.subtotalFontSize       || '12px'}; font-family: ${s.subtotalFontFamily       || 'sans-serif'}; }
        .f-thanks   { font-size: ${s.thanksFontSize         || '12px'}; font-family: ${s.thanksFontFamily         || 'sans-serif'}; font-weight: ${s.thanksFontStyle         === 'bold' ? 'bold' : 'normal'}; display: block; margin-top: 6px; }
    `;

    let headerHtml = `<div class="p-center">`;
    if (config.printLogo && prop.logo) {
        const logoW = config.logoWidth || prop.logoWidth || s.logoWidth || '80px';
        headerHtml += `<img src="${prop.logo}" style="width:${logoW}; max-width:100%; height:auto; margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;"><br>`;
    }
    if (config.printPropInfo) {
        headerHtml += `<div class="f-rest-name">${prop.name}</div>`;
        headerHtml += `<div class="f-rest-addr">${prop.address}</div>`;
        if (prop.phone) headerHtml += `<div class="f-rest-phone">Tel: ${prop.phone}</div>`;
        if (prop.branch) headerHtml += `<div class="f-rest-addr">Branch: ${prop.branch}</div>`;
    }
    headerHtml += `</div>`;
    document.getElementById('print-header-config').innerHTML = headerHtml;

    let metaHtml = `<div class="p-sep"></div>`;
    
    /* REQ 3: ORDER START AND END TIME */
    if (ord.startTime || ord.startTimeRaw) {
        const sTime = ord.startTime || ord.startTimeRaw;
        metaHtml += `<div class="p-flex"><span class="f-date-h">Order Start:</span><span class="f-date-v">${new Date(sTime).toLocaleString()}</span></div>`;
    }
    metaHtml += `<div class="p-flex"><span class="f-date-h">Order Print:</span><span class="f-date-v">${new Date().toLocaleString()}</span></div>`;

    if (config.printInvoiceNo) metaHtml += `<div class="p-flex"><span class="f-order-h">Order #:</span><span class="f-order-v">${ord.id}</span></div>`;
    metaHtml += `<div class="p-flex"><span class="f-table-h">Table:</span><span class="f-table-v">${tblName}</span></div>`;
    if (config.printWaiter) metaHtml += `<div class="p-flex"><span class="f-server-h">Server:</span><span class="f-server-v">${ord.waiter || "Staff"}</span></div>`;
    if (config.printCashier && app.currentUser) metaHtml += `<div class="p-flex"><span class="f-cashier-h">Cashier:</span><span class="f-cashier-v">${app.currentUser.name}</span></div>`;
    metaHtml += `<div class="p-center" style="font-weight:bold; margin-top:5px;">*** ${isKOT ? 'KITCHEN ORDER' : 'CUSTOMER RECEIPT'} ***</div>`;
    document.getElementById('rec-meta-body').innerHTML = metaHtml;

    let custHtml = '';
    if (config.printCustomer && ord.customer && (ord.customer.name || ord.customer.phone)) {
        custHtml = `<div class="p-sep"></div><div style="font-size:0.9em;"><b>CUSTOMER:</b> ${ord.customer.name || 'Walk-in'}<br>Phone: ${ord.customer.phone || '--'}</div>`;
    }
    document.getElementById('rec-customer-body').innerHTML = custHtml;

    const lang = config.printNameLang || 'both';
    
    /* REQ 2: HEADING CHANGED TO "ITEM" */
    let itemsHtml = `<table style="width:100%; border-collapse:collapse; margin-top:10px;">
                        <thead><tr style="border-bottom:1px solid #000; font-size:11px;">
                            <th align="left">Item</th>
                            <th align="center">Qty</th>
                            <th align="right">Amount</th>
                        </tr></thead><tbody>`;
    
    ord.items.forEach(i => {
        let nameDisplay = "";
        if (lang === 'en' || lang === 'both') nameDisplay += `<div class="f-item-name">${i.name}</div>`;
        if ((lang === 'ur' || lang === 'both') && i.altName) nameDisplay += `<div class="urdu">${i.altName}</div>`;
        
        itemsHtml += `<tr style="border-bottom:0.5px solid #eee;">
                        <td style="padding:5px 0;" align="left">${nameDisplay}</td>
                        <td align="center" class="f-qty">${i.qty}</td>
                        <td align="right" class="f-item-price">${i.total.toFixed(0)}</td>
                      </tr>`;
    });
    itemsHtml += `</tbody></table>`;
    document.getElementById('receipt-body').innerHTML = itemsHtml;

    let calcHtml = `<div class="p-sep"></div>`;
    if (config.printBreakdown && !isKOT) {
        calcHtml += `<div class="p-flex"><span class="f-subt">Subtotal:</span><span class="f-subt">${totals.sub.toFixed(0)}</span></div>`;
        calcHtml += `<div class="p-flex"><span class="f-disc">Discount:</span><span class="f-disc">-${totals.disc.toFixed(0)}</span></div>`;
    }
    calcHtml += `<div class="f-total-box p-flex"><span>GRAND TOTAL:</span><span>${prop.currency} ${totals.total.toFixed(0)}</span></div>`;
    document.getElementById('rec-calculations').innerHTML = calcHtml;

    let payHtml = '';
    const actualPayments = payments.length > 0 ? payments : (ord.payments || []);
    if (!isKOT && config.printPayments && actualPayments.length > 0) {
        payHtml = `<div style="font-size:0.85em; margin-top:5px;"><b>PAYMENTS:</b><br>`;
        actualPayments.forEach(p => {
            payHtml += `<div class="p-flex"><span>${p.method}</span><span>${p.amount.toFixed(0)}</span></div>`;
        });
        const paid = actualPayments.reduce((a,b)=>a+b.amount,0);
        payHtml += `<div class="p-flex" style="font-weight:bold; border-top:1px solid #ccc; margin-top:3px;"><span>Paid</span><span>${paid.toFixed(0)}</span></div>`;
        payHtml += `</div>`;
    }
    document.getElementById('rec-payment-breakdown').innerHTML = payHtml;

    /* REQ 4: FOOTER — uses thanksFontSize from bill/KOT settings */
    const footerNote = config.customFooter || '';
    document.getElementById('dynamic-print-footer').innerHTML = `
        <div class="p-center">
            <span class="f-thanks">${footerNote || '*** Thank You ***'}</span>
            <span class="f-footer" style="display:block; margin-top:4px;">Software by: Hamza Younas</span>
        </div>
    `;

    window.print();

    if (!app.isReadOnly && !isKOT) {
        app.currentOrder.forEach(i => { if (!i.printedQty || i.qty > i.printedQty) i.printedQty = i.qty; });
        saveToLocal();
    }
}

// ============================================================================
// ORDER CLOSING LOGIC
// ============================================================================

function finishOrder() {
    const totals = getOrderTotals();
    const ord = app.orders[app.table];
    let udhaar = app.tempPayments.filter(p => p.method === 'Udhaar').reduce((a, b) => a + b.amount, 0);

    if (udhaar > 0 && !ord.clientId) return showCustomAlert("Error", "You must link a Client Profile to use Udhaar.");

    if (typeof deductStockForOrder === 'function') {
        if (deductStockForOrder(app.currentOrder) === false) return;
    }

    app.history.push({
        id: ord.id, table: app.table, sub: totals.sub, total: totals.total,
        discountVal: totals.disc, date: new Date().toLocaleString(),
        startTimeRaw: ord.startTime, waiter: ord.waiter, customer: ord.customer,
        clientId: ord.clientId, items: JSON.parse(JSON.stringify(app.currentOrder)),
        payments: [...app.tempPayments], cashier: (app.currentUser ? app.currentUser.name : 'Admin')
    });

    localStorage.setItem('orderHistory', JSON.stringify(app.history));
    printBill(false, app.tempPayments);

    delete app.orders[app.table];
    localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    app.table = null; app.currentOrder = [];
    document.body.classList.add('hide-cart');
    updateTableButtons();
    closeModal('payment-modal');
    showSection('dinein');
    showToast('Order Finalized');
}

// ============================================================================
// UTILITIES
// ============================================================================

function openWaiterModal(isNew = false, zoneSettings = null) {
    const list = document.getElementById('waiter-list');
    list.innerHTML = '';
    app.waiters.forEach(w => {
        const btn = document.createElement('button');
        btn.className = 'list-item-btn';
        btn.innerHTML = formatWorkerName(w);
        btn.onclick = () => {
            if (isNew) {
                app.table = app.pendingTable;
                app.orders[app.table] = { id: Date.now().toString().slice(-6), items: [], startTime: Date.now(), waiter: w, customer: {}, discount: 0, discType: 'fixed', payments: [] };
                document.body.classList.remove('hide-cart');
                loadTableData(); renderOrderList(); showSection('items');
                if (zoneSettings && zoneSettings.askForClient) openCustomerModal();
            } else {
                app.orders[app.table].waiter = w;
                loadTableData();
            }
            closeModal('waiter-modal');
        };
        list.appendChild(btn);
    });
    document.getElementById('waiter-modal').classList.add('active');
}

function openTransferModal() {
    if (!app.table) return;
    const grid = document.getElementById('transfer-list');
    grid.innerHTML = '';
    tableLayout.forEach(z => z.sections.forEach(s => s.tables.forEach(t => {
        const n = typeof t === 'string' ? t : t.name;
        if (n !== app.table && !app.orders[n]) {
            const btn = document.createElement('button');
            btn.className = 'transfer-btn'; btn.textContent = n;
            btn.onclick = () => {
                app.orders[n] = app.orders[app.table];
                delete app.orders[app.table];
                app.table = n;
                localStorage.setItem('savedOrders', JSON.stringify(app.orders));
                renderAllTables(); loadTableData(); closeModal('transfer-modal');
            };
            grid.appendChild(btn);
        }
    })));
    document.getElementById('transfer-modal').classList.add('active');
}

function openMergeModal() {
    if (!app.table) return;
    const active = Object.keys(app.orders).filter(t => t !== app.table && app.orders[t].items.length > 0);
    const container = document.getElementById('merge-list');
    container.innerHTML = '';
    active.forEach(n => {
        const btn = document.createElement('button');
        btn.className = 'transfer-btn'; btn.textContent = n;
        btn.onclick = () => {
            app.orders[n].items = [...app.orders[n].items, ...app.orders[app.table].items];
            delete app.orders[app.table];
            app.table = n;
            localStorage.setItem('savedOrders', JSON.stringify(app.orders));
            renderAllTables(); loadTableData(); closeModal('merge-modal');
        };
        container.appendChild(btn);
    });
    document.getElementById('merge-modal').classList.add('active');
}
