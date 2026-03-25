// pos_checkout.js – Payment, Printing, Waiter, Transfer, Merge
// Version: 2.0 – Integrated with Inventory Management (stock deduction on order close)

// ============================================================================
// PAYMENT MODAL & METHODS
// ============================================================================
function renderDynamicPaymentMethods() {
    const methodGrid = document.getElementById('dynamic-payment-grid');
    if (methodGrid) {
        methodGrid.innerHTML = '';
        appSettings.paymentMethods.forEach((m, i) => {
            methodGrid.innerHTML += `<button class="method-option ${i === 0 ? 'active' : ''}" onclick="selectMethod('${m}')">${m}</button>`;
        });
        if (appSettings.paymentMethods.length > 0) document.getElementById('selected-pay-method').value = appSettings.paymentMethods[0];
    }
}

function openPaymentModal() {
    if (app.isReadOnly) return;
    if (!app.table || app.currentOrder.length === 0) return showToast('Empty Order');

    if (app.orders[app.table].clientId) {
        const c = app.clients.find(x => x.id === app.orders[app.table].clientId);
        if (c && c.isBlocked) return showCustomAlert("Client Blocked", "This client has been restricted by management. You cannot process this order.");
    }

    const t = getOrderTotals();
    document.getElementById('payment-modal').classList.add('active');
    renderDynamicPaymentMethods();
    document.getElementById('pay-total-due').textContent = t.total.toFixed(0);

    // Load existing payments from the order, or initialize with full amount as cash
    const existingPayments = app.orders[app.table].payments || [];
    if (existingPayments.length === 0) {
        // No existing payments – default to full amount in cash
        app.tempPayments = [{ method: appSettings.paymentMethods[0] || 'Cash', amount: t.total }];
    } else {
        // Use existing payments (they might include advance)
        app.tempPayments = JSON.parse(JSON.stringify(existingPayments)); // deep copy
    }

    renderPaymentState();

    // Show loyalty points if client is linked
    const loyaltySection = document.getElementById('loyalty-section');
    if (loyaltySection) {
        if (app.orders[app.table].clientId) {
            const client = app.clients.find(c => c.id === app.orders[app.table].clientId);
            if (client && client.loyaltyPoints > appSettings.loyalty.minRedeem) {
                const pointsValue = Math.floor(client.loyaltyPoints / appSettings.loyalty.redeemRate);
                loyaltySection.innerHTML = `
                    <div style="margin:10px 0; padding:10px; background:var(--bg-app); border-radius:10px;">
                        <span>Points: ${client.loyaltyPoints} (≈ ${appSettings.property.currency} ${pointsValue})</span>
                        <button class="btn-modern" style="margin-left:10px;" onclick="redeemLoyaltyPoints()">Use Points</button>
                    </div>
                `;
            } else {
                loyaltySection.innerHTML = '';
            }
        } else {
            loyaltySection.innerHTML = '';
        }
    }

    // Set up input focus and keydown handler
    const payInput = document.getElementById('pay-input-amount');
    if (payInput) {
        payInput.removeEventListener('focus', payInputFocusHandler);
        payInput.removeEventListener('keydown', payInputKeydownHandler);
        payInput.addEventListener('focus', payInputFocusHandler);
        payInput.addEventListener('keydown', payInputKeydownHandler);
    }
}

// Focus handler: select all text
function payInputFocusHandler(e) {
    e.target.select();
}

// Keydown handler: Enter key adds payment or finishes
function payInputKeydownHandler(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const bal = parseFloat(document.getElementById('pay-balance').textContent) || 0;
        if (bal <= 0) {
            finishOrder();
        } else {
            addPaymentRow();
        }
    }
}

function selectMethod(m) {
    document.querySelectorAll('.method-option').forEach(b => b.classList.remove('active'));
    Array.from(document.querySelectorAll('.method-option')).find(e => e.textContent === m).classList.add('active');
    document.getElementById('selected-pay-method').value = m;
}

function addPaymentRow() {
    const amt = parseFloat(document.getElementById('pay-input-amount').value);
    const m = document.getElementById('selected-pay-method').value;
    if (!amt || amt <= 0) return showToast('Enter Amount');
    app.tempPayments.push({ method: m, amount: amt });
    // Save to order immediately so it persists
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
    if (bal > 0) {
        inputEl.value = bal.toFixed(0);
        setTimeout(() => {
            if (document.getElementById('payment-modal').classList.contains('active')) {
                inputEl.focus();
                inputEl.select();
            }
        }, 50);
    } else {
        inputEl.value = '';
        inputEl.placeholder = '0';
    }
}

function removePaymentRow(idx) {
    app.tempPayments.splice(idx, 1);
    // Update order's payments
    app.orders[app.table].payments = [...app.tempPayments];
    localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    renderPaymentState();
}

function redeemLoyaltyPoints() {
    const client = app.clients.find(c => c.id === app.orders[app.table].clientId);
    if (!client) return;
    const maxDiscount = Math.floor(client.loyaltyPoints / appSettings.loyalty.redeemRate);
    openCustomPrompt('Redeem points', null, maxDiscount, 0, 'price', (result) => {
        if (result.price === null) return;
        const discount = Math.min(result.price, maxDiscount);
        const pointsUsed = discount * appSettings.loyalty.redeemRate;
        client.loyaltyPoints -= pointsUsed;
        if (!client.pointsHistory) client.pointsHistory = [];
        client.pointsHistory.push({
            date: new Date().toLocaleString(),
            change: -pointsUsed,
            reason: 'Redeemed for discount',
            orderId: app.orders[app.table].id
        });
        // Add a payment row for 'Loyalty' discount (negative amount to reduce total)
        app.tempPayments.push({ method: 'Loyalty', amount: -discount });
        // Save order payments
        app.orders[app.table].payments = [...app.tempPayments];
        localStorage.setItem('savedOrders', JSON.stringify(app.orders));
        localStorage.setItem('pos_clients', JSON.stringify(app.clients));
        renderPaymentState();
    });
}

function finishOrder() {
    const totals = getOrderTotals();
    const ord = app.orders[app.table];

    let udhaarAmt = app.tempPayments.filter(p => p.method === 'Udhaar').reduce((a, b) => a + b.amount, 0);
    const linkedClientId = app.orders[app.table].clientId;

    if (udhaarAmt > 0 && (!linkedClientId || linkedClientId === "")) {
        showCustomAlert("Action Required", "You must link an existing client to use Udhaar/Credit payment. Please select a client from Customer details.");
        return;
    }

    if (linkedClientId) {
        const c = app.clients.find(x => x.id === linkedClientId);
        if (c) {
            c.totalOrders++;
            c.totalDiscount += parseFloat(app.orders[app.table].discount || 0);
            c.totalPurchasing = (c.totalPurchasing || 0) + totals.total;

            if (!c.favorites) c.favorites = {};
            app.currentOrder.forEach(item => {
                if (item.type === 'deal') {
                    c.favorites[item.name] = (c.favorites[item.name] || 0) + item.qty;
                } else {
                    c.favorites[item.name] = (c.favorites[item.name] || 0) + item.qty;
                }
            });

            if (udhaarAmt > 0) {
                c.balance += udhaarAmt;
                c.ledger.push({ date: new Date().toLocaleString(), action: 'Purchase (Udhaar)', amt: udhaarAmt, folio: ord.id });
            }

            // Loyalty points earned
            const pointsEarned = Math.floor(totals.total * appSettings.loyalty.pointsPerCurrency);
            c.loyaltyPoints = (c.loyaltyPoints || 0) + pointsEarned;
            if (!c.pointsHistory) c.pointsHistory = [];
            c.pointsHistory.push({
                date: new Date().toLocaleString(),
                change: pointsEarned,
                reason: 'Purchase',
                orderId: ord.id
            });

            localStorage.setItem('pos_clients', JSON.stringify(app.clients));
            if (typeof renderClientsList === 'function') renderClientsList();
            if (typeof renderCrmDashboard === 'function') renderCrmDashboard();
        }
    }

    const cashierName = app.currentUser ? app.currentUser.name : 'Unknown';

    // ========== INVENTORY DEDUCTION (before saving history) ==========
    let stockDeductionSuccess = true;
    if (typeof deductStockForOrder === 'function') {
        try {
            const result = deductStockForOrder(app.currentOrder);
            if (result === false) {
                stockDeductionSuccess = false;
                showCustomAlert("Stock Error", "Insufficient stock for one or more items. Order cannot be closed.");
                return;
            }
        } catch (e) {
            console.error("Stock deduction error:", e);
            stockDeductionSuccess = false;
            showCustomAlert("Stock Error", "Failed to deduct stock. Order not closed.");
            return;
        }
    }

    // Save to history
    app.history.push({
        id: ord.id,
        table: app.table,
        sub: totals.sub,
        total: totals.total,
        date: new Date().toLocaleString(),
        startTimeRaw: ord.startTime,
        duration: document.getElementById('serv-time-display').textContent,
        persons: ord.persons,
        waiter: ord.waiter,
        customer: ord.customer,
        clientId: ord.clientId,
        discountVal: parseFloat(app.orders[app.table].discount) || 0,
        items: [...app.currentOrder],
        payments: [...app.tempPayments],
        cashier: cashierName,
        notes: ord.notes || ''
    });
    localStorage.setItem('orderHistory', JSON.stringify(app.history));

    printBill(false, app.tempPayments);

    delete app.orders[app.table];
    localStorage.setItem('savedOrders', JSON.stringify(app.orders));
    app.table = null;
    app.currentOrder = [];
    document.getElementById('current-table-display').textContent = '--';
    document.getElementById('order-items-list').innerHTML = '';
    document.getElementById('total-display').textContent = 'PKR 0';
    document.getElementById('cart-client-display').style.display = 'none';

    document.body.classList.add('hide-cart');

    updateTableButtons();
    closeModal('payment-modal');
    showToast('Order Closed');

    let targetZoneId = 'dinein';
    const dineInZone = tableLayout.find(z => z.id === 'dinein');
    if (!dineInZone && tableLayout.length > 0) {
        targetZoneId = tableLayout[0].id;
    }
    showSection(targetZoneId);
}

// ============================================================================
// PRINT BILL (Enhanced with receipt template and granular styles)
// ============================================================================
function printBill(isKOT = true, payments = []) {
    if (app.currentOrder.length === 0) {
        showToast("No items in order to print.");
        return;
    }

    let ordId, tbl, waiter, customer, orderNotes;
    if (app.isReadOnly) {
        ordId = document.getElementById('order-id-display').textContent.replace('Ord #', '').trim();
        tbl = document.getElementById('current-table-display').textContent.replace(' (Hist)', '');
        waiter = document.getElementById('btn-waiter').textContent.trim();
        customer = app.orders[app.table]?.customer || {};
        orderNotes = app.orders[app.table]?.notes || '';
    } else {
        ordId = app.orders[app.table].id;
        tbl = app.table;
        waiter = app.orders[app.table].waiter;
        customer = app.orders[app.table].customer || {};
        orderNotes = app.orders[app.table]?.notes || '';
        if (!app.isReadOnly) {
            app.currentOrder.forEach(i => {
                if (!i.printedQty || i.qty > i.printedQty) i.printedQty = i.qty;
            });
            saveToLocal();
            renderOrderList();
        }
    }

    const config = isKOT ? appSettings.kotConfig : appSettings.billConfig;
    const currentOrderData = app.orders[app.table] || {};

    // Flatten deals into components
    let printedItems = [];
    app.currentOrder.forEach(item => {
        if (item.type === 'deal') {
            item.children.forEach(child => {
                printedItems.push({
                    id: child.id,
                    name: child.name,
                    altName: '',
                    price: child.price,
                    qty: child.qty * item.qty,
                    total: child.price * child.qty * item.qty,
                    printedQty: 0,
                    itemNote: child.itemNote || ''
                });
            });
        } else {
            printedItems.push(item);
        }
    });

    // Build dynamic CSS with granular styles
    const printStyles = config.printStyles || {};
    let dynamicPrintCSS = `
        #print-header-config .bold, #print-header-config div { 
            font-family: ${printStyles.headerFontFamily || 'sans-serif'} !important; 
            font-style: ${printStyles.headerFontStyle || 'normal'} !important; 
            font-size: ${printStyles.headerFontSize || '16px'} !important; 
        }
        #receipt-body .item-name-cell { 
            font-family: ${printStyles.itemNameFontFamily || 'sans-serif'} !important; 
            font-style: ${printStyles.itemNameFontStyle || 'normal'} !important; 
            font-size: ${printStyles.itemNameFontSize || '12px'} !important; 
        }
        #receipt-body .price-total-cell {
            font-family: ${printStyles.itemPriceFontFamily || 'sans-serif'} !important; 
            font-style: ${printStyles.itemPriceFontStyle || 'normal'} !important; 
            font-size: ${printStyles.itemPriceFontSize || '12px'} !important; 
        }
        #rec-calculations .total-box { 
            font-family: ${printStyles.totalBoxFontFamily || 'sans-serif'} !important; 
            font-style: ${printStyles.totalBoxFontStyle || 'bold'} !important; 
            font-size: ${printStyles.totalBoxFontSize || '16px'} !important; 
        }
        #dynamic-print-footer { 
            font-family: ${printStyles.footerFontFamily || 'sans-serif'} !important; 
            font-style: ${printStyles.footerFontStyle || 'normal'} !important; 
            font-size: ${printStyles.footerFontSize || '12px'} !important; 
        }
        /* Granular styles */
        .date-heading, .time-heading, .order-heading, .table-heading, .cashier-heading, .server-heading {
            font-family: ${printStyles.dateHeadingFontFamily || 'sans-serif'} !important;
            font-style: ${printStyles.dateHeadingFontStyle || 'normal'} !important;
            font-size: ${printStyles.dateHeadingFontSize || '12px'} !important;
        }
        .date-value, .time-value, .order-value, .table-value, .cashier-value, .server-value {
            font-family: ${printStyles.dateValueFontFamily || 'sans-serif'} !important;
            font-style: ${printStyles.dateValueFontStyle || 'normal'} !important;
            font-size: ${printStyles.dateValueFontSize || '12px'} !important;
        }
        .qty-number {
            font-family: ${printStyles.qtyNumberFontFamily || 'sans-serif'} !important;
            font-style: ${printStyles.qtyNumberFontStyle || 'normal'} !important;
            font-size: ${printStyles.qtyNumberFontSize || '12px'} !important;
        }
        .discount-amount, .tax-amount, .subtotal-amount {
            font-family: ${printStyles.discountFontFamily || 'sans-serif'} !important;
            font-style: ${printStyles.discountFontStyle || 'normal'} !important;
            font-size: ${printStyles.discountFontSize || '12px'} !important;
        }
        .thanks-note {
            font-family: ${printStyles.thanksFontFamily || 'sans-serif'} !important;
            font-style: ${printStyles.thanksFontStyle || 'normal'} !important;
            font-size: ${printStyles.thanksFontSize || '12px'} !important;
        }
    `;

    document.getElementById('dynamic-print-styles').innerHTML = config.css + dynamicPrintCSS;

    // Use receipt template if available and not KOT
    let headerHtml, metaHtml, custHtml, itemsHtml, calculationsHtml, payHtml, footerHtml;

    if (!isKOT && appSettings.receiptTemplate) {
        // Template-based receipt
        const template = appSettings.receiptTemplate;
        const data = {
            logo: appSettings.property.logo ? `<img src="${appSettings.property.logo}" style="max-width:150px;">` : '',
            restaurant_name: appSettings.property.name,
            address: appSettings.property.address,
            phone: appSettings.property.phone,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            order_id: ordId,
            items: printedItems,
            subtotal: totals.sub.toFixed(0),
            discount: totals.disc.toFixed(0),
            tax: '0',
            total: totals.total.toFixed(0),
            payments: payments,
            thanks: config.customFooter
        };
        headerHtml = renderTemplate(template.header, data);
        itemsHtml = '';
        printedItems.forEach(item => {
            itemsHtml += renderTemplate(template.items, {
                item_name: item.name,
                item_price: item.price,
                item_qty: item.qty,
                item_total: item.total
            });
        });
        footerHtml = renderTemplate(template.footer, data);
        document.getElementById('print-header-config').innerHTML = headerHtml;
        document.getElementById('rec-meta-body').innerHTML = '';
        document.getElementById('rec-customer-body').innerHTML = '';
        document.getElementById('receipt-body').innerHTML = itemsHtml;
        document.getElementById('rec-calculations').innerHTML = '';
        document.getElementById('rec-payment-breakdown').innerHTML = '';
        document.getElementById('dynamic-print-footer').innerHTML = footerHtml;
        window.print();
        return;
    }

    // Original non-template receipt (fallback)
    // Header (logo & property info)
    let logoHtml = (config.printLogo && appSettings.property.logo) ? `<img src="${appSettings.property.logo}" style="max-width: 150px; height: auto; margin-bottom: 10px; border-radius: 8px;">` : '';

    headerHtml = logoHtml;
    if (config.printPropInfo) {
        headerHtml += `
            <div class="bold" style="font-size: ${printStyles.headerFontSize}; font-family: ${printStyles.headerFontFamily}; font-style: ${printStyles.headerFontStyle};">${appSettings.property.name}</div>
            <div style="font-size: ${printStyles.headerFontSize}; font-family: ${printStyles.headerFontFamily}; font-style: ${printStyles.headerFontStyle};">${appSettings.property.address}</div>
            <div style="font-size: ${printStyles.headerFontSize}; font-family: ${printStyles.headerFontFamily}; font-style: ${printStyles.headerFontStyle};">${appSettings.property.branch ? 'Branch: ' + appSettings.property.branch : ''}</div>
            <div style="font-size: ${printStyles.headerFontSize}; font-family: ${printStyles.headerFontFamily}; font-style: ${printStyles.headerFontStyle};">Tel: ${appSettings.property.phone}</div>
        `;
    }
    document.getElementById('print-header-config').innerHTML = headerHtml;
    document.getElementById('sep-header').style.display = headerHtml ? 'block' : 'none';

    // Meta info (date, time, order#, table, waiter, cashier) with classes
    metaHtml = '';
    if (config.printPrintTime) {
        metaHtml += `<div class="flex-row"><span class="date-heading">Date:</span><span class="date-value">${new Date().toLocaleString()}</span></div>`;
    }
    if (config.printStartTime) {
        metaHtml += `<div class="flex-row"><span class="time-heading">Started:</span><span class="time-value">${new Date(currentOrderData.startTime || Date.now()).toLocaleString()}</span></div>`;
    }
    if (config.printInvoiceNo) {
        metaHtml += `<div class="flex-row"><span class="order-heading">Order #:</span><span class="order-value">${ordId}</span></div>`;
    }
    metaHtml += `<div class="flex-row"><span class="table-heading">Table:</span><span class="table-value">${tbl}</span></div>`;
    if (config.printWaiter) {
        metaHtml += `<div class="flex-row"><span class="server-heading">Server:</span><span class="server-value">${waiter}</span></div>`;
    }
    if (config.printCashier && app.currentUser) {
        metaHtml += `<div class="flex-row"><span class="cashier-heading">Cashier:</span><span class="cashier-value">${app.currentUser.name}</span></div>`;
    }
    if (orderNotes) {
        metaHtml += `<div class="flex-row"><span>Notes:</span><span>${orderNotes}</span></div>`;
    }
    metaHtml += `<div style="margin-top:5px; font-weight:bold; text-align:center;">${isKOT ? '(KOT / Kitchen Order)' : '(Customer Receipt)'}</div>`;
    document.getElementById('rec-meta-body').innerHTML = metaHtml;

    // Customer info
    custHtml = "";
    if (config.printCustomer && (customer.name || customer.phone || customer.address)) {
        custHtml += `<div class="customer-box"><div class="bold" style="margin-bottom: 5px;">CUSTOMER INFO:</div>`;
        if (customer.name) custHtml += `<div class="flex-row"><span>Name:</span><span>${customer.name}</span></div>`;
        if (customer.phone) custHtml += `<div class="flex-row"><span>Cell:</span><span>${customer.phone}</span></div>`;
        if (customer.address) custHtml += `<div class="flex-row"><span>Addr:</span><span style="text-align:right; max-width:60%;">${customer.address}</span></div>`;
        custHtml += `</div>`;
    }
    document.getElementById('rec-customer-body').innerHTML = custHtml;

    // Table header
    const thAmt = document.getElementById('th-amt');
    if (thAmt) thAmt.style.display = (isKOT && !config.printBreakdown && !config.printPayments) ? 'none' : 'table-cell';

    // Item rows
    const tbody = document.getElementById('receipt-body');
    tbody.innerHTML = '';

    printedItems.forEach(i => {
        let itemName = '';
        const printNameLang = config.printNameLang || 'both';

        if (printNameLang === 'en') {
            itemName = i.name;
        } else if (printNameLang === 'ur' && i.altName && i.altName.trim() !== '') {
            itemName = `<span style="font-family:'Noto Nastaliq Urdu';">${i.altName}</span>`;
        } else if (printNameLang === 'both') {
            itemName = i.name;
            if (i.altName && i.altName.trim() !== '') {
                itemName += `<br><span style="font-family:'Noto Nastaliq Urdu';">${i.altName}</span>`;
            }
        }
        if (itemName.trim() === '') {
            itemName = i.name;
        }

        let row = `<td><td class="item-name-cell">${itemName}`;
        if (i.itemNote) {
            row += `<br><span style="font-size:0.7rem; color:gray;">Note: ${i.itemNote}</span>`;
        }
        row += `<\/td>`;
        if (isKOT && !config.printBreakdown && !config.printPayments) {
            // KOT minimal: only name and qty
            row += `<td class="text-center qty-number">${i.qty}<\/td>`;
        } else {
            row += `<td class="text-center qty-number">${i.qty}<\/td>`;
            row += `<td class="text-right price-total-cell">${i.total.toFixed(0)}<\/td>`;
        }
        row += `<\/tr>`;
        tbody.innerHTML += row;
    });

    // Calculations
    const subtotal = app.currentOrder.reduce((a, b) => a + b.total, 0);
    let disc = 0, total = 0;
    if (app.isReadOnly) {
        total = parseFloat(document.getElementById('total-display').textContent.replace(appSettings.property.currency + ' ', ''));
        disc = subtotal - total;
    } else {
        const t = getOrderTotals();
        disc = t.disc;
        total = t.total;
    }

    if (!config.printBreakdown) {
        document.getElementById('rec-calculations').innerHTML = '';
        document.getElementById('sep-footer').style.display = 'none';
    } else {
        document.getElementById('sep-footer').style.display = 'block';
        document.getElementById('rec-calculations').innerHTML = `
            <div class="flex-row"><span>Subtotal:</span><span class="subtotal-amount">${subtotal.toFixed(0)}</span></div>
            <div class="flex-row"><span>Discount:</span><span class="discount-amount">${disc.toFixed(0)}</span></div>
            <div class="total-box">TOTAL: ${appSettings.property.currency} ${total.toFixed(0)}</div>
        `;
    }

    // Payment breakdown
    payHtml = "";
    if (!isKOT && payments.length > 0 && config.printPayments) {
        payHtml += `<div style="font-weight:bold; margin-bottom:5px; text-decoration: underline;">PAYMENTS:</div>`;
        payments.forEach(p => { payHtml += `<div class="flex-row"><span>${p.method}:</span><span>${p.amount.toFixed(0)}</span></div>`; });
        const paid = payments.reduce((a, b) => a + b.amount, 0);
        payHtml += `<div class="sep-dashed"></div><div class="flex-row bold" style="font-size:15px;"><span>Total Paid:</span><span>${paid.toFixed(0)}</span></div>`;

        const balanceAfterPayments = total - paid;
        if (balanceAfterPayments <= 0) {
            payHtml += `<div class="flex-row bold" style="font-size:15px;"><span>Change Due:</span><span>${Math.abs(balanceAfterPayments).toFixed(0)}</span></div>`;
        } else {
            payHtml += `<div class="flex-row bold" style="font-size:15px;"><span>Balance:</span><span>${balanceAfterPayments.toFixed(0)}</span></div>`;
        }
    }
    document.getElementById('rec-payment-breakdown').innerHTML = payHtml;

    // Apply thanks style to footer
    document.getElementById('dynamic-print-footer').className = 'thanks-note';
    document.getElementById('dynamic-print-footer').innerHTML = config.customFooter;

    window.print();
}

// Helper to render template with placeholders
function renderTemplate(template, data) {
    let output = template;
    // Replace simple placeholders
    output = output.replace(/{{logo}}/g, data.logo || '');
    output = output.replace(/{{restaurant_name}}/g, data.restaurant_name || '');
    output = output.replace(/{{address}}/g, data.address || '');
    output = output.replace(/{{phone}}/g, data.phone || '');
    output = output.replace(/{{date}}/g, data.date || '');
    output = output.replace(/{{time}}/g, data.time || '');
    output = output.replace(/{{order_id}}/g, data.order_id || '');
    output = output.replace(/{{item_name}}/g, data.item_name || '');
    output = output.replace(/{{item_price}}/g, data.item_price || '');
    output = output.replace(/{{item_qty}}/g, data.item_qty || '');
    output = output.replace(/{{item_total}}/g, data.item_total || '');
    output = output.replace(/{{subtotal}}/g, data.subtotal || '');
    output = output.replace(/{{discount}}/g, data.discount || '');
    output = output.replace(/{{tax}}/g, data.tax || '');
    output = output.replace(/{{total}}/g, data.total || '');
    output = output.replace(/{{thanks}}/g, data.thanks || '');
    return output;
}

// ============================================================================
// WAITER MODAL
// ============================================================================
function openWaiterModal(isNew = false, zoneSettings = null) {
    const list = document.getElementById('waiter-list');
    list.innerHTML = '';
    app.waiters.forEach(w => {
        const btn = document.createElement('button');
        btn.innerHTML = formatWorkerName(w);
        btn.style.cssText = "padding:12px; border:none; border-radius:10px; background:var(--bg-app); box-shadow:var(--neumorph-out-sm); cursor:pointer; font-weight:700; color:var(--text-secondary);";
        btn.onclick = () => {
            if (isNew) {
                app.table = app.pendingTable;
                app.orders[app.table] = { 
                    id: Date.now().toString().slice(-6), 
                    items: [], 
                    startTime: Date.now(), 
                    persons: 1, 
                    waiter: w, 
                    discount: 0, 
                    discType: 'fixed', 
                    customer: { name: '', phone: '', address: '' }, 
                    clientId: null,
                    notes: ''
                };
                document.body.classList.remove('hide-cart');
                loadTableData();
                renderOrderList();
                showSection('items');
                startTimer();
                // After loading, check if we should ask for client
                if (zoneSettings && zoneSettings.askForClient) {
                    openCustomerModal();
                }
            } else {
                if (!hasPerm('transferWaiter')) return showCustomAlert("Denied", "No permission to transfer waiter.");
                app.orders[app.table].waiter = w;
                saveToLocal();
                loadTableData();
            }
            closeModal('waiter-modal');
        };
        list.appendChild(btn);
    });
    document.getElementById('waiter-modal').classList.add('active');
}

// ============================================================================
// TRANSFER MODAL
// ============================================================================
function openTransferModal() {
    if (!app.table || !app.orders[app.table]) return showToast("No active order");
    if (!hasPerm('transferTable')) return showCustomAlert("Denied", "You don't have permission to transfer tables.");
    const container = document.getElementById('transfer-list');
    container.innerHTML = '';
    let count = 0;
    tableLayout.forEach(zone => {
        const zoneTitle = document.createElement('div');
        zoneTitle.className = 'transfer-group-title';
        zoneTitle.style.gridColumn = '1 / -1';
        zoneTitle.textContent = zone.name;

        let zoneHasTables = false;
        zone.sections.forEach(sec => {
            sec.tables.forEach(tObj => {
                const tName = typeof tObj === 'string' ? tObj : tObj.name;
                if (tName !== app.table && (!app.orders[tName] || app.orders[tName].items.length === 0)) {
                    if (!zoneHasTables) { container.appendChild(zoneTitle.cloneNode(true)); zoneHasTables = true; }
                    const btn = document.createElement('button');
                    btn.className = 'transfer-btn';
                    btn.textContent = tName;
                    btn.onclick = () => executeTransfer(tName);
                    container.appendChild(btn);
                    count++;
                }
            });
        });
    });
    if (count === 0) container.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:0.8rem;color:var(--text-secondary)">No empty tables available.</p>';
    document.getElementById('transfer-modal').classList.add('active');
}

function executeTransfer(targetName) {
    openConfirm("Transfer Table", `Move order from ${app.table} to ${targetName}?`, () => {
        const oldTableName = app.table;

        app.orders[targetName] = app.orders[oldTableName];
        delete app.orders[oldTableName];
        localStorage.setItem('savedOrders', JSON.stringify(app.orders));

        closeModal('confirm-modal');
        closeModal('transfer-modal');

        app.table = targetName;
        loadTableData();
        renderOrderList();
        renderAllTables();
        showToast(`Order successfully moved to ${targetName}`);
    });
}

// ============================================================================
// MERGE MODAL
// ============================================================================
function openMergeModal() {
    if (!app.table || !app.orders[app.table]) return showToast("No active order");
    if (!hasPerm('transferTable')) return showCustomAlert("Denied", "You don't have permission to merge tables.");
    const activeTables = Object.keys(app.orders).filter(t => t !== app.table && app.orders[t].items.length > 0);
    const container = document.getElementById('merge-list');
    container.innerHTML = '';
    if (activeTables.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:0.8rem;color:var(--text-secondary)">No other active tables to merge with.</p>';
    } else {
        activeTables.forEach(tName => {
            const btn = document.createElement('button');
            btn.className = 'transfer-btn';
            btn.innerHTML = `<strong style="font-size:0.9rem;">${tName}</strong><br><span style="font-size:0.7rem; color:var(--col-primary);">#${app.orders[tName].id}</span>`;
            btn.onclick = () => executeMerge(tName);
            container.appendChild(btn);
        });
    }
    document.getElementById('merge-modal').classList.add('active');
}

function executeMerge(targetName) {
    openConfirm("Merge Tables", `Merge ${app.table} INTO ${targetName}?\nThis will clear ${app.table} and move items to ${targetName}.`, () => {
        const sourceOrder = app.orders[app.table];
        const targetOrder = app.orders[targetName];

        const oldTableName = app.table;

        targetOrder.items = [...targetOrder.items, ...sourceOrder.items];

        if (sourceOrder.customer.name || sourceOrder.customer.address) {
            if (!targetOrder.customer.name && !targetOrder.customer.address) {
                targetOrder.customer = { ...sourceOrder.customer };
            } else {
                const sourceNote = `[From ${oldTableName}: ${sourceOrder.customer.name || ''} ${sourceOrder.customer.address || ''}]`;
                targetOrder.customer.address = (targetOrder.customer.address || '') + ' ' + sourceNote;
            }
        }

        delete app.orders[oldTableName];
        localStorage.setItem('savedOrders', JSON.stringify(app.orders));

        closeModal('confirm-modal');
        closeModal('merge-modal');

        app.table = targetName;
        loadTableData();
        renderOrderList();
        renderAllTables();
        showToast(`Order successfully merged into ${targetName}`);
    });
}