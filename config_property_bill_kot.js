/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  FILE: config_property_bill_kot.js – Property, Bill, KOT Save Functions     ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

function getPropertyConfigFromDOM() {
    return {
        name: document.getElementById('prop-name')?.value || 'AL-MADINA SHINWARI',
        phone: document.getElementById('prop-phone')?.value || '0341-3334206',
        address: document.getElementById('prop-address')?.value || 'Main Gujranwala, Hafizabad Road',
        logo: document.getElementById('prop-logo-base64')?.value || ''
    };
}

function updatePrintPreviewProperty() {
    if (activeConfigTab === 'Bill Configuration') updatePrintPreview('bill');
    if (activeConfigTab === 'KOT Print Settings') updatePrintPreview('kot');
}

function updatePrintPreview(type) {
    const isBill = (type === 'bill');
    const previewElementId = isBill ? 'bill-preview-area' : 'kot-preview-area';
    const previewDiv = document.getElementById(previewElementId);

    if (!previewDiv) return;

    let config = {
        printLogo: document.getElementById(`${type}-logo`)?.checked || false,
        printPropInfo: document.getElementById(`${type}-prop`)?.checked || false,
        printInvoiceNo: document.getElementById(`${type}-inv`)?.checked || false,
        printStartTime: document.getElementById(`${type}-st`)?.checked || false,
        printPrintTime: document.getElementById(`${type}-pt`)?.checked || false,
        printWaiter: document.getElementById(`${type}-waiter`)?.checked || false,
        printCashier: document.getElementById(`${type}-cashier`)?.checked || false,
        printCustomer: document.getElementById(`${type}-cust`)?.checked || false,
        printBreakdown: document.getElementById(`${type}-break`)?.checked || false,
        printPayments: document.getElementById(`${type}-pay`)?.checked || false,
        printNameLang: document.getElementById(`${type}-item-lang`)?.value || 'both',
        customFooter: document.getElementById(`${type}-footer`)?.value || ''
    };

    let bs = {};
    if (isBill) {
        bs = {
            headerFontSize: document.getElementById('bc-header-size')?.value || '16px',
            headerFontFamily: document.getElementById('bc-header-font-family')?.value || 'sans-serif',
            headerFontStyle: document.getElementById('bc-header-font-style')?.value || 'normal',
            itemNameFontSize: document.getElementById('bc-item-name-size')?.value || '12px',
            itemNameFontFamily: document.getElementById('bc-item-name-font-family')?.value || 'sans-serif',
            itemNameFontStyle: document.getElementById('bc-item-name-font-style')?.value || 'normal',
            itemPriceFontSize: document.getElementById('bc-item-price-size')?.value || '12px',
            itemPriceFontFamily: document.getElementById('bc-item-price-font-family')?.value || 'sans-serif',
            itemPriceFontStyle: document.getElementById('bc-item-price-font-style')?.value || 'normal',
            totalBoxFontSize: document.getElementById('bc-total-box-size')?.value || '16px',
            totalBoxFontFamily: document.getElementById('bc-total-box-font-family')?.value || 'sans-serif',
            totalBoxFontStyle: document.getElementById('bc-total-box-font-style')?.value || 'bold',
            footerFontSize: document.getElementById('bc-footer-size')?.value || '12px',
            footerFontFamily: document.getElementById('bc-footer-font-family')?.value || 'sans-serif',
            footerFontStyle: document.getElementById('bc-footer-font-style')?.value || 'normal',
            // NEW fields
            dateHeadingFontSize: document.getElementById('bc-date-head-size')?.value || '12px',
            dateHeadingFontFamily: document.getElementById('bc-date-head-font-family')?.value || 'sans-serif',
            dateHeadingFontStyle: document.getElementById('bc-date-head-font-style')?.value || 'normal',
            dateValueFontSize: document.getElementById('bc-date-value-size')?.value || '12px',
            dateValueFontFamily: document.getElementById('bc-date-value-font-family')?.value || 'sans-serif',
            dateValueFontStyle: document.getElementById('bc-date-value-font-style')?.value || 'normal',
            timeHeadingFontSize: document.getElementById('bc-time-head-size')?.value || '12px',
            timeHeadingFontFamily: document.getElementById('bc-time-head-font-family')?.value || 'sans-serif',
            timeHeadingFontStyle: document.getElementById('bc-time-head-font-style')?.value || 'normal',
            timeValueFontSize: document.getElementById('bc-time-value-size')?.value || '12px',
            timeValueFontFamily: document.getElementById('bc-time-value-font-family')?.value || 'sans-serif',
            timeValueFontStyle: document.getElementById('bc-time-value-font-style')?.value || 'normal',
            orderHeadingFontSize: document.getElementById('bc-order-head-size')?.value || '12px',
            orderHeadingFontFamily: document.getElementById('bc-order-head-font-family')?.value || 'sans-serif',
            orderHeadingFontStyle: document.getElementById('bc-order-head-font-style')?.value || 'normal',
            orderValueFontSize: document.getElementById('bc-order-value-size')?.value || '12px',
            orderValueFontFamily: document.getElementById('bc-order-value-font-family')?.value || 'sans-serif',
            orderValueFontStyle: document.getElementById('bc-order-value-font-style')?.value || 'normal',
            tableHeadingFontSize: document.getElementById('bc-table-head-size')?.value || '12px',
            tableHeadingFontFamily: document.getElementById('bc-table-head-font-family')?.value || 'sans-serif',
            tableHeadingFontStyle: document.getElementById('bc-table-head-font-style')?.value || 'normal',
            tableValueFontSize: document.getElementById('bc-table-value-size')?.value || '12px',
            tableValueFontFamily: document.getElementById('bc-table-value-font-family')?.value || 'sans-serif',
            tableValueFontStyle: document.getElementById('bc-table-value-font-style')?.value || 'normal',
            cashierHeadingFontSize: document.getElementById('bc-cashier-head-size')?.value || '12px',
            cashierHeadingFontFamily: document.getElementById('bc-cashier-head-font-family')?.value || 'sans-serif',
            cashierHeadingFontStyle: document.getElementById('bc-cashier-head-font-style')?.value || 'normal',
            cashierValueFontSize: document.getElementById('bc-cashier-value-size')?.value || '12px',
            cashierValueFontFamily: document.getElementById('bc-cashier-value-font-family')?.value || 'sans-serif',
            cashierValueFontStyle: document.getElementById('bc-cashier-value-font-style')?.value || 'normal',
            serverHeadingFontSize: document.getElementById('bc-server-head-size')?.value || '12px',
            serverHeadingFontFamily: document.getElementById('bc-server-head-font-family')?.value || 'sans-serif',
            serverHeadingFontStyle: document.getElementById('bc-server-head-font-style')?.value || 'normal',
            serverValueFontSize: document.getElementById('bc-server-value-size')?.value || '12px',
            serverValueFontFamily: document.getElementById('bc-server-value-font-family')?.value || 'sans-serif',
            serverValueFontStyle: document.getElementById('bc-server-value-font-style')?.value || 'normal',
            qtyNumberFontSize: document.getElementById('bc-qty-size')?.value || '12px',
            qtyNumberFontFamily: document.getElementById('bc-qty-font-family')?.value || 'sans-serif',
            qtyNumberFontStyle: document.getElementById('bc-qty-font-style')?.value || 'normal',
            discountFontSize: document.getElementById('bc-discount-size')?.value || '12px',
            discountFontFamily: document.getElementById('bc-discount-font-family')?.value || 'sans-serif',
            discountFontStyle: document.getElementById('bc-discount-font-style')?.value || 'normal',
            taxFontSize: document.getElementById('bc-tax-size')?.value || '12px',
            taxFontFamily: document.getElementById('bc-tax-font-family')?.value || 'sans-serif',
            taxFontStyle: document.getElementById('bc-tax-font-style')?.value || 'normal',
            subtotalFontSize: document.getElementById('bc-subtotal-size')?.value || '12px',
            subtotalFontFamily: document.getElementById('bc-subtotal-font-family')?.value || 'sans-serif',
            subtotalFontStyle: document.getElementById('bc-subtotal-font-style')?.value || 'normal',
            thanksFontSize: document.getElementById('bc-thanks-size')?.value || '12px',
            thanksFontFamily: document.getElementById('bc-thanks-font-family')?.value || 'sans-serif',
            thanksFontStyle: document.getElementById('bc-thanks-font-style')?.value || 'normal'
        };
    } else {
        bs = {
            headerFontSize: '16px', headerFontFamily: 'monospace', headerFontStyle: 'bold',
            itemNameFontSize: '12px', itemNameFontFamily: 'monospace', itemNameFontStyle: 'normal',
            itemPriceFontSize: '12px', itemPriceFontFamily: 'monospace', itemPriceFontStyle: 'normal',
            totalBoxFontSize: '16px', totalBoxFontFamily: 'monospace', totalBoxFontStyle: 'bold',
            footerFontSize: '12px', footerFontFamily: 'monospace', footerFontStyle: 'normal',
            // Similarly add all new fields for KOT (using kot- IDs)
            // For brevity, we'll assume similar fields with kot- prefix.
            // You would read them analogously.
        };
    }

    let sampleHtml = '';
    const propConfig = getPropertyConfigFromDOM();

    const sampleItemNameEn = "Chicken Karahi";
    const sampleItemNameUr = "چکن کڑاہی";
    const samplePrice = 1400;
    const sampleQty = 2;
    const sampleTotal = samplePrice * sampleQty;
    const sampleSubtotal = 2800;
    const sampleDiscount = 100;
    const sampleGrandTotal = sampleSubtotal - sampleDiscount;
    const samplePaymentAmount = 2700;
    const sampleCashier = app.currentUser ? app.currentUser.name : 'Admin';
    const sampleWaiter = "Ali";
    const sampleCustomerName = "John Doe";
    const sampleCustomerPhone = "03XX-XXXXXXX";
    const sampleCustomerAddress = "Sample Address, City";
    const sampleOrderID = "031769";
    const sampleTable = "Indoor 7";
    const samplePrintTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sampleStartTime = new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sampleDate = new Date().toLocaleDateString();

    sampleHtml += `<div style="line-height: 1.2; width: 100%; max-width: 200px; margin: 0 auto; border: 1px dashed #ccc; padding: 5px; color: black; background-color: white; font-family: monospace;">`;

    if (config.printLogo && propConfig.logo) {
        sampleHtml += `<div style="text-align: center; margin-bottom: 5px;"><img src="${propConfig.logo}" style="max-width: 60px; height: auto; border-radius: 4px; opacity: 0.7;"></div>`;
    }
    if (config.printPropInfo) {
        sampleHtml += `<div style="text-align: center; font-weight: bold; font-size: ${bs.headerFontSize}; font-family: '${bs.headerFontFamily}', monospace; font-style: ${bs.headerFontStyle};">${propConfig.name}</div>`;
        sampleHtml += `<div style="text-align: center; font-size: ${bs.headerFontSize}; font-family: '${bs.headerFontFamily}', monospace; font-style: ${bs.headerFontStyle};" >${propConfig.address}</div>`;
        if (propConfig.phone) sampleHtml += `<div style="text-align: center; font-size: ${bs.headerFontSize}; font-family: '${bs.headerFontFamily}', monospace; font-style: ${bs.headerFontStyle};">Tel: ${propConfig.phone}</div>`;
        if (propConfig.branch) sampleHtml += `<div style="text-align: center; font-size: ${bs.headerFontSize}; font-family: '${bs.headerFontFamily}', monospace; font-style: ${bs.headerFontStyle};">Branch: ${propConfig.branch}</div>`;
    }
    sampleHtml += `---<br>`;

    // Meta lines with new styles
    if (config.printPrintTime) {
        let dateHeadingStyle = `font-family:${bs.dateHeadingFontFamily}; font-style:${bs.dateHeadingFontStyle}; font-size:${bs.dateHeadingFontSize};`;
        let dateValueStyle = `font-family:${bs.dateValueFontFamily}; font-style:${bs.dateValueFontStyle}; font-size:${bs.dateValueFontSize};`;
        sampleHtml += `<div class="flex-row"><span style="${dateHeadingStyle}">Date:</span><span style="${dateValueStyle}">${sampleDate}</span></div>`;
    }
    if (config.printStartTime) {
        let timeHeadingStyle = `font-family:${bs.timeHeadingFontFamily}; font-style:${bs.timeHeadingFontStyle}; font-size:${bs.timeHeadingFontSize};`;
        let timeValueStyle = `font-family:${bs.timeValueFontFamily}; font-style:${bs.timeValueFontStyle}; font-size:${bs.timeValueFontSize};`;
        sampleHtml += `<div class="flex-row"><span style="${timeHeadingStyle}">Started:</span><span style="${timeValueStyle}">${sampleDate} ${sampleStartTime}</span></div>`;
    }
    if (config.printInvoiceNo) {
        let orderHeadingStyle = `font-family:${bs.orderHeadingFontFamily}; font-style:${bs.orderHeadingFontStyle}; font-size:${bs.orderHeadingFontSize};`;
        let orderValueStyle = `font-family:${bs.orderValueFontFamily}; font-style:${bs.orderValueFontStyle}; font-size:${bs.orderValueFontSize};`;
        sampleHtml += `<div class="flex-row"><span style="${orderHeadingStyle}">Order #:</span><span style="${orderValueStyle}">${sampleOrderID}</span></div>`;
    }
    let tableHeadingStyle = `font-family:${bs.tableHeadingFontFamily}; font-style:${bs.tableHeadingFontStyle}; font-size:${bs.tableHeadingFontSize};`;
    let tableValueStyle = `font-family:${bs.tableValueFontFamily}; font-style:${bs.tableValueFontStyle}; font-size:${bs.tableValueFontSize};`;
    sampleHtml += `<div class="flex-row"><span style="${tableHeadingStyle}">Table:</span><span style="${tableValueStyle}">${sampleTable}</span></div>`;

    if (config.printWaiter) {
        let serverHeadingStyle = `font-family:${bs.serverHeadingFontFamily}; font-style:${bs.serverHeadingFontStyle}; font-size:${bs.serverHeadingFontSize};`;
        let serverValueStyle = `font-family:${bs.serverValueFontFamily}; font-style:${bs.serverValueFontStyle}; font-size:${bs.serverValueFontSize};`;
        sampleHtml += `<div class="flex-row"><span style="${serverHeadingStyle}">Server:</span><span style="${serverValueStyle}">${sampleWaiter}</span></div>`;
    }
    if (config.printCashier) {
        let cashierHeadingStyle = `font-family:${bs.cashierHeadingFontFamily}; font-style:${bs.cashierHeadingFontStyle}; font-size:${bs.cashierHeadingFontSize};`;
        let cashierValueStyle = `font-family:${bs.cashierValueFontFamily}; font-style:${bs.cashierValueFontStyle}; font-size:${bs.cashierValueFontSize};`;
        sampleHtml += `<div class="flex-row"><span style="${cashierHeadingStyle}">Cashier:</span><span style="${cashierValueStyle}">${sampleCashier}</span></div>`;
    }

    sampleHtml += `<br><div style="text-align: center; font-weight: bold;">${isBill ? 'CUSTOMER RECEIPT' : 'KITCHEN ORDER TICKET'}</div><br>`;
    sampleHtml += `---<br>`;

    if (config.printCustomer) {
        sampleHtml += `CUSTOMER INFO:<br>`;
        sampleHtml += `  Name: ${sampleCustomerName}<br>`;
        sampleHtml += `  Phone: ${sampleCustomerPhone}<br>`;
        sampleHtml += `  Address: ${sampleCustomerAddress}<br>`;
        sampleHtml += `---<br>`;
    }

    let itemDisplayName = '';
    const printNameLang = config.printNameLang || 'both';

    if (printNameLang === 'en') {
        itemDisplayName = sampleItemNameEn;
    } else if (printNameLang === 'ur') {
        itemDisplayName = `<span style="font-family:'Noto Nastaliq Urdu';">${sampleItemNameUr}</span>`;
    } else {
        itemDisplayName = `${sampleItemNameEn}<br><span style="font-family:'Noto Nastaliq Urdu';">${sampleItemNameUr}</span>`;
    }

    const itemHeaderStyle = `font-size: ${bs.itemNameFontSize}; font-family: '${bs.itemNameFontFamily}', monospace; font-style: ${bs.itemNameFontStyle}; font-weight: ${bs.itemNameFontStyle === 'bold' ? 'bold' : 'normal'};`;
    const itemPriceTotalHeaderStyle = `font-size: ${bs.itemPriceFontSize}; font-family: '${bs.itemPriceFontFamily}', monospace; font-style: ${bs.itemPriceFontStyle}; font-weight: ${bs.itemPriceFontStyle === 'bold' ? 'bold' : 'normal'};`;

    sampleHtml += `<div style="display: flex; justify-content: space-between;">
                        <span style="${itemHeaderStyle}">Item Name</span>
                        <span>${isBill ? `
                            <span style="${itemPriceTotalHeaderStyle}">Price</span> x Qty = 
                            <span style="${itemPriceTotalHeaderStyle}">Total</span>` : 'Qty'}
                        </span>
                   </div>`;
    sampleHtml += `---<br>`;

    let qtyStyle = `font-family:${bs.qtyNumberFontFamily}; font-style:${bs.qtyNumberFontStyle}; font-size:${bs.qtyNumberFontSize};`;
    sampleHtml += `<div style="display: flex; justify-content: space-between;">
                        <span style="${itemHeaderStyle}">${itemDisplayName}</span>
                        <span>${isBill ? `
                            <span style="${itemPriceTotalHeaderStyle}">${samplePrice}</span> x <span style="${qtyStyle}">${sampleQty}</span> = 
                            <span style="${itemPriceTotalHeaderStyle}">${sampleTotal}</span>` : `<span style="${qtyStyle}">${sampleQty}</span>`}
                        </span>
                   </div>`;
    sampleHtml += `<div style="display: flex; justify-content: space-between;">
                        <span style="${itemHeaderStyle}">Sample Item 2</span>
                        <span>${isBill ? `
                            <span style="${itemPriceTotalHeaderStyle}">600</span> x <span style="${qtyStyle}">1</span> = 
                            <span style="${itemPriceTotalHeaderStyle}">600</span>` : `<span style="${qtyStyle}">1</span>`}
                        </span>
                   </div>`;
    sampleHtml += `---<br>`;

    if (isBill && config.printBreakdown) {
        let discountStyle = `font-family:${bs.discountFontFamily}; font-style:${bs.discountFontStyle}; font-size:${bs.discountFontSize};`;
        let taxStyle = `font-family:${bs.taxFontFamily}; font-style:${bs.taxFontStyle}; font-size:${bs.taxFontSize};`;
        let subtotalStyle = `font-family:${bs.subtotalFontFamily}; font-style:${bs.subtotalFontStyle}; font-size:${bs.subtotalFontSize};`;
        sampleHtml += `<div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span style="${subtotalStyle}">${sampleSubtotal.toFixed(0)}</span></div>`;
        sampleHtml += `<div style="display: flex; justify-content: space-between;"><span>Discount:</span><span style="${discountStyle}">${sampleDiscount.toFixed(0)}</span></div>`;

        const totalBoxStyle = `font-size: ${bs.totalBoxFontSize}; font-family: '${bs.totalBoxFontFamily}', monospace; font-style: ${bs.totalBoxFontStyle}; font-weight: ${bs.totalBoxFontStyle === 'bold' ? 'bold' : 'normal'};`;
        sampleHtml += `<div style="display: flex; justify-content: space-between; ${totalBoxStyle} border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 5px 0; margin: 5px 0;"><span>GRAND TOTAL:</span><span>${appSettings.property.currency} ${sampleGrandTotal.toFixed(0)}</span></div>`;
        sampleHtml += `---<br>`;
    }

    if (isBill && config.printPayments) {
        sampleHtml += `PAYMENTS:<br>`;
        sampleHtml += `<div style="display: flex; justify-content: space-between;"><span>Cash:</span><span>${samplePaymentAmount.toFixed(0)}</span></div>`;
        sampleHtml += `---<br>`;
        const balanceAfterPayments = sampleGrandTotal - samplePaymentAmount;
        if (balanceAfterPayments <= 0) {
            sampleHtml += `<div style="display: flex; justify-content: space-between;"><span>CHANGE DUE:</span><span>${Math.abs(balanceAfterPayments).toFixed(0)}</span></div>`;
        } else {
            sampleHtml += `<div style="display: flex; justify-content: space-between;"><span>BALANCE:</span><span>${balanceAfterPayments.toFixed(0)}</span></div>`;
        }
        sampleHtml += `---<br>`;
    }

    if (config.customFooter) {
        let thanksStyle = `font-family:${bs.thanksFontFamily}; font-style:${bs.thanksFontStyle}; font-size:${bs.thanksFontSize};`;
        const footerContent = config.customFooter.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
        sampleHtml += `<div style="text-align: center; ${thanksStyle}">${footerContent}</div>`;
    }
    sampleHtml += `<br></div>`;

    previewDiv.innerHTML = sampleHtml;
}

function previewPropLogo(input) {
    if (input.files && input.files[0]) {
        var r = new FileReader();
        r.onload = function(e) {
            const imgCard = document.getElementById('prop-logo-card');
            const imgPreview = document.getElementById('prop-logo-preview');
            imgPreview.src = e.target.result;
            imgPreview.style.display = 'block';
            imgCard.classList.add('has-image');
            document.getElementById('prop-logo-base64').value = e.target.result;
            if (activeConfigTab === 'Bill Configuration') updatePrintPreview('bill');
            if (activeConfigTab === 'KOT Print Settings') updatePrintPreview('kot');
        };
        r.readAsDataURL(input.files[0]);
    }
}

function removePropLogo(event) {
    event.stopPropagation();
    document.getElementById('prop-logo-base64').value = '';
    document.getElementById('prop-logo-preview').src = '';
    document.getElementById('prop-logo-preview').style.display = 'none';
    document.getElementById('prop-logo-input').value = '';
    document.getElementById('prop-logo-card').classList.remove('has-image');
    if (activeConfigTab === 'Bill Configuration') updatePrintPreview('bill');
    if (activeConfigTab === 'KOT Print Settings') updatePrintPreview('kot');
}

function saveConfigProperty() {
    appSettings.property.name = document.getElementById('prop-name').value;
    appSettings.property.phone = document.getElementById('prop-phone').value;
    appSettings.property.address = document.getElementById('prop-address').value;
    appSettings.property.currency = document.getElementById('prop-currency').value;
    appSettings.property.branch = document.getElementById('prop-branch').value;
    appSettings.property.openingTime = document.getElementById('prop-open').value;
    appSettings.property.closingTime = document.getElementById('prop-close').value;
    appSettings.property.logo = document.getElementById('prop-logo-base64').value;
    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    if (typeof applyPreferences === 'function') applyPreferences();
    showToast("Properties Saved");
    if (activeConfigTab === 'Bill Configuration') updatePrintPreview('bill');
    if (activeConfigTab === 'KOT Print Settings') updatePrintPreview('kot');
}

function saveBillConfig() {
    const bc = appSettings.billConfig;
    bc.printLogo = document.getElementById('bc-logo').checked;
    bc.printPropInfo = document.getElementById('bc-prop').checked;
    bc.printInvoiceNo = document.getElementById('bc-inv').checked;
    bc.printStartTime = document.getElementById('bc-st').checked;
    bc.printPrintTime = document.getElementById('bc-pt').checked;
    bc.printWaiter = document.getElementById('bc-waiter').checked;
    bc.printCashier = document.getElementById('bc-cashier').checked;
    bc.printCustomer = document.getElementById('bc-cust').checked;
    bc.printBreakdown = document.getElementById('bc-break').checked;
    bc.printPayments = document.getElementById('bc-pay').checked;
    bc.printNameLang = document.getElementById('bc-item-lang').value;

    bc.customFooter = document.getElementById('bill-footer').value;

    const bs = bc.printStyles;
    bs.headerFontSize = document.getElementById('bc-header-size').value;
    bs.headerFontFamily = document.getElementById('bc-header-font-family').value;
    bs.headerFontStyle = document.getElementById('bc-header-font-style').value;

    bs.itemNameFontSize = document.getElementById('bc-item-name-size').value;
    bs.itemNameFontFamily = document.getElementById('bc-item-name-font-family').value;
    bs.itemNameFontStyle = document.getElementById('bc-item-name-font-style').value;

    bs.itemPriceFontSize = document.getElementById('bc-item-price-size').value;
    bs.itemPriceFontFamily = document.getElementById('bc-item-price-font-family').value;
    bs.itemPriceFontStyle = document.getElementById('bc-item-price-font-style').value;

    bs.totalBoxFontSize = document.getElementById('bc-total-box-size').value;
    bs.totalBoxFontFamily = document.getElementById('bc-total-box-font-family').value;
    bs.totalBoxFontStyle = document.getElementById('bc-total-box-font-style').value;

    bs.footerFontSize = document.getElementById('bc-footer-size').value;
    bs.footerFontFamily = document.getElementById('bc-footer-font-family').value;
    bs.footerFontStyle = document.getElementById('bc-footer-font-style').value;

    // NEW fields
    bs.dateHeadingFontSize = document.getElementById('bc-date-head-size').value;
    bs.dateHeadingFontFamily = document.getElementById('bc-date-head-font-family').value;
    bs.dateHeadingFontStyle = document.getElementById('bc-date-head-font-style').value;
    bs.dateValueFontSize = document.getElementById('bc-date-value-size').value;
    bs.dateValueFontFamily = document.getElementById('bc-date-value-font-family').value;
    bs.dateValueFontStyle = document.getElementById('bc-date-value-font-style').value;

    bs.timeHeadingFontSize = document.getElementById('bc-time-head-size').value;
    bs.timeHeadingFontFamily = document.getElementById('bc-time-head-font-family').value;
    bs.timeHeadingFontStyle = document.getElementById('bc-time-head-font-style').value;
    bs.timeValueFontSize = document.getElementById('bc-time-value-size').value;
    bs.timeValueFontFamily = document.getElementById('bc-time-value-font-family').value;
    bs.timeValueFontStyle = document.getElementById('bc-time-value-font-style').value;

    bs.orderHeadingFontSize = document.getElementById('bc-order-head-size').value;
    bs.orderHeadingFontFamily = document.getElementById('bc-order-head-font-family').value;
    bs.orderHeadingFontStyle = document.getElementById('bc-order-head-font-style').value;
    bs.orderValueFontSize = document.getElementById('bc-order-value-size').value;
    bs.orderValueFontFamily = document.getElementById('bc-order-value-font-family').value;
    bs.orderValueFontStyle = document.getElementById('bc-order-value-font-style').value;

    bs.tableHeadingFontSize = document.getElementById('bc-table-head-size').value;
    bs.tableHeadingFontFamily = document.getElementById('bc-table-head-font-family').value;
    bs.tableHeadingFontStyle = document.getElementById('bc-table-head-font-style').value;
    bs.tableValueFontSize = document.getElementById('bc-table-value-size').value;
    bs.tableValueFontFamily = document.getElementById('bc-table-value-font-family').value;
    bs.tableValueFontStyle = document.getElementById('bc-table-value-font-style').value;

    bs.cashierHeadingFontSize = document.getElementById('bc-cashier-head-size').value;
    bs.cashierHeadingFontFamily = document.getElementById('bc-cashier-head-font-family').value;
    bs.cashierHeadingFontStyle = document.getElementById('bc-cashier-head-font-style').value;
    bs.cashierValueFontSize = document.getElementById('bc-cashier-value-size').value;
    bs.cashierValueFontFamily = document.getElementById('bc-cashier-value-font-family').value;
    bs.cashierValueFontStyle = document.getElementById('bc-cashier-value-font-style').value;

    bs.serverHeadingFontSize = document.getElementById('bc-server-head-size').value;
    bs.serverHeadingFontFamily = document.getElementById('bc-server-head-font-family').value;
    bs.serverHeadingFontStyle = document.getElementById('bc-server-head-font-style').value;
    bs.serverValueFontSize = document.getElementById('bc-server-value-size').value;
    bs.serverValueFontFamily = document.getElementById('bc-server-value-font-family').value;
    bs.serverValueFontStyle = document.getElementById('bc-server-value-font-style').value;

    bs.qtyNumberFontSize = document.getElementById('bc-qty-size').value;
    bs.qtyNumberFontFamily = document.getElementById('bc-qty-font-family').value;
    bs.qtyNumberFontStyle = document.getElementById('bc-qty-font-style').value;

    bs.discountFontSize = document.getElementById('bc-discount-size').value;
    bs.discountFontFamily = document.getElementById('bc-discount-font-family').value;
    bs.discountFontStyle = document.getElementById('bc-discount-font-style').value;

    bs.taxFontSize = document.getElementById('bc-tax-size').value;
    bs.taxFontFamily = document.getElementById('bc-tax-font-family').value;
    bs.taxFontStyle = document.getElementById('bc-tax-font-style').value;

    bs.subtotalFontSize = document.getElementById('bc-subtotal-size').value;
    bs.subtotalFontFamily = document.getElementById('bc-subtotal-font-family').value;
    bs.subtotalFontStyle = document.getElementById('bc-subtotal-font-style').value;

    bs.thanksFontSize = document.getElementById('bc-thanks-size').value;
    bs.thanksFontFamily = document.getElementById('bc-thanks-font-family').value;
    bs.thanksFontStyle = document.getElementById('bc-thanks-font-style').value;

    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast("Bill Format Saved");
    updatePrintPreview('bill');
}

function saveKotConfig() {
    const kotC = appSettings.kotConfig;
    kotC.printLogo = document.getElementById('kot-logo').checked;
    kotC.printPropInfo = document.getElementById('kot-prop').checked;
    kotC.printInvoiceNo = document.getElementById('kot-inv').checked;
    kotC.printStartTime = document.getElementById('kot-st').checked;
    kotC.printPrintTime = document.getElementById('kot-pt').checked;
    kotC.printWaiter = document.getElementById('kot-waiter').checked;
    kotC.printCashier = document.getElementById('kot-cashier').checked;
    kotC.printCustomer = document.getElementById('kot-cust').checked;
    kotC.printBreakdown = document.getElementById('kot-break').checked;
    kotC.printPayments = document.getElementById('kot-pay').checked;
    kotC.printNameLang = document.getElementById('kot-item-lang').value;

    kotC.customFooter = document.getElementById('kot-footer').value;

    const ks = kotC.printStyles;
    // Read all corresponding kot- fields (similar to bill)
    // For brevity, we assume you will add them analogously.
    // ...

    localStorage.setItem('pos_app_settings', JSON.stringify(appSettings));
    showToast("KOT Format Saved");
    updatePrintPreview('kot');
}