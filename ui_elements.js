// ui_elements.js – UI Helpers, Custom Selects, Font Lists, Observers
// Version: 2.0 (clean & fully functional)

const availableFontFamilies = [
    { value: 'Inter', text: 'Inter (Default)' },
    { value: 'Roboto', text: 'Roboto' },
    { value: 'Poppins', text: 'Poppins' },
    { value: 'Montserrat', text: 'Montserrat' },
    { value: "'Noto Nastaliq Urdu'", text: 'Noto Nastaliq Urdu' },
    { value: 'sans-serif', text: 'Generic Sans-Serif' },
    { value: 'serif', text: 'Generic Serif' },
    { value: 'monospace', text: 'Generic Monospace' }
];

const fontFamilies = availableFontFamilies;
const fontStyles = [
    { value: 'normal', text: 'Normal' },
    { value: 'italic', text: 'Italic' },
    { value: 'bold', text: 'Bold' }
];

function renderFontSelect(idPrefix, currentFamily, currentStyle) {
    let familyOptions = fontFamilies.map(f => `<option value="${f.value}" ${currentFamily === f.value ? 'selected' : ''}>${f.text}</option>`).join('');
    let styleOptions = fontStyles.map(s => `<option value="${s.value}" ${currentStyle === s.value ? 'selected' : ''}>${s.text}</option>`).join('');

    let onchangeHandler = '';
    if (typeof activeConfigTab !== 'undefined' && activeConfigTab === 'Bill Configuration') {
        onchangeHandler = `onchange="updatePrintPreview('bill')"`;
    } else if (typeof activeConfigTab !== 'undefined' && activeConfigTab === 'KOT Print Settings') {
        onchangeHandler = `onchange="updatePrintPreview('kot')"`;
    } else {
        onchangeHandler = `onchange="applyPreferences(); applyAdvancedCSSVariables();"`;
    }

    return `
        <div class="modern-input-group">
            <label>Font Family</label>
            <select id="${idPrefix}-font-family" class="modern-input" ${onchangeHandler}>${familyOptions}</select>
        </div>
        <div class="modern-input-group">
            <label>Font Style</label>
            <select id="${idPrefix}-font-style" class="modern-input" ${onchangeHandler}>${styleOptions}</select>
        </div>
    `;
}

function initializeCustomSelect(selectId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;

    const existingWrapper = selectElement.nextElementSibling;
    if (existingWrapper && existingWrapper.classList.contains('custom-select-wrapper')) existingWrapper.remove();

    selectElement.style.display = 'none';
    selectElement.classList.add('modernized');

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    const display = document.createElement('div');
    display.className = 'custom-select-display';

    const updateDisplay = () => {
        const selectedText = selectElement.options[selectElement.selectedIndex]?.text || 'Select...';
        display.innerHTML = `<span>${selectedText}</span> <i class="fas fa-chevron-down" style="font-size:0.8rem;color:var(--text-secondary);"></i>`;
    };
    updateDisplay();

    const list = document.createElement('div');
    list.className = 'custom-select-list';

    const renderOptions = () => {
        list.innerHTML = '';
        Array.from(selectElement.options).forEach(option => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-select-option' + (option.selected ? ' selected' : '');

            optDiv.innerHTML = `
                <span style="font-weight: ${option.selected ? '800' : '500'};">${option.text}</span>
                <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${option.selected ? 'var(--col-primary)' : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; transition: 0.2s; flex-shrink: 0;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${option.selected ? 'var(--col-primary)' : 'transparent'}; transition: 0.2s;"></div>
                </div>
            `;

            optDiv.onclick = (e) => {
                e.stopPropagation();
                selectElement.value = option.value;

                updateDisplay();
                renderOptions();

                list.classList.remove('show');
                display.classList.remove('active');

                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            };
            list.appendChild(optDiv);
        });
    };
    renderOptions();

    selectElement.addEventListener('change', () => {
        updateDisplay();
        renderOptions();
    });

    display.onclick = (e) => {
        e.stopPropagation();
        const isShowing = list.classList.contains('show');
        document.querySelectorAll('.custom-select-list').forEach(l => l.classList.remove('show'));
        document.querySelectorAll('.custom-select-display').forEach(d => d.classList.remove('active'));

        if (!isShowing) {
            list.classList.add('show');
            display.classList.add('active');
        }
    };

    wrapper.appendChild(display);
    wrapper.appendChild(list);
    selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);
}

function initModernDatePickers() {
    if (typeof flatpickr !== 'undefined') {
        const buildCustomHeader = function(selectedDates, dateStr, instance) {
            const headerContainer = instance.monthNav;
            headerContainer.style.position = 'relative';

            const monthSpan = headerContainer.querySelector('.cur-month');
            const yearInput = instance.currentYearElement;

            yearInput.setAttribute('readonly', 'readonly');
            yearInput.style.cursor = 'pointer';

            const yearWrapper = yearInput.parentNode;
            yearWrapper.querySelectorAll('.arrowUp, .arrowDown').forEach(a => a.style.display = 'none');

            const updateMonthChevron = () => {
                if (!monthSpan.querySelector('.fa-chevron-down')) {
                    monthSpan.innerHTML += ` <i class="fas fa-chevron-down" style="font-size:0.7rem; margin-left:3px; color:var(--col-primary);"></i>`;
                }
            };
            updateMonthChevron();
            instance.config.onMonthChange.push(updateMonthChevron);

            const monthList = document.createElement('div');
            monthList.className = 'custom-select-list fp-custom-dropdown';
            monthList.style.cssText = 'position:absolute; width:140px; z-index:9999; text-align:left; box-shadow:0 10px 25px rgba(0,0,0,0.2);';

            instance.l10n.months.longhand.forEach((m, idx) => {
                let opt = document.createElement('div');
                opt.className = 'custom-select-option';
                opt.textContent = m;
                opt.onclick = function(e) {
                    e.stopPropagation();
                    instance.changeMonth(idx, false);
                    monthList.classList.remove('show');
                    updateMonthChevron();
                };
                monthList.appendChild(opt);
            });

            const yearList = document.createElement('div');
            yearList.className = 'custom-select-list fp-custom-dropdown';
            yearList.style.cssText = 'position:absolute; width:100px; max-height:220px; z-index:9999; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); overflow-y:auto;';

            for (let i = 2020; i <= 2050; i++) {
                let opt = document.createElement('div');
                opt.className = 'custom-select-option';
                opt.textContent = i;
                opt.onclick = function(e) {
                    e.stopPropagation();
                    instance.changeYear(i);
                    yearList.classList.remove('show');
                };
                yearList.appendChild(opt);
            }

            headerContainer.appendChild(monthList);
            headerContainer.appendChild(yearList);

            monthSpan.onclick = function(e) {
                e.stopPropagation();
                document.querySelectorAll('.fp-custom-dropdown').forEach(d => d.classList.remove('show'));

                const spanRect = monthSpan.getBoundingClientRect();
                const headerRect = headerContainer.getBoundingClientRect();
                monthList.style.left = (spanRect.left - headerRect.left + (spanRect.width / 2)) + 'px';
                monthList.style.transform = 'translateX(-50%)';
                monthList.style.top = (spanRect.bottom - headerRect.top + 5) + 'px';

                monthList.classList.add('show');

                Array.from(monthList.children).forEach(c => {
                    c.style.background = c.textContent === instance.l10n.months.longhand[instance.currentMonth] ? 'var(--col-primary-light)' : '';
                    c.style.color = c.textContent === instance.l10n.months.longhand[instance.currentMonth] ? 'var(--col-primary)' : 'var(--text-primary)';
                    c.style.fontWeight = c.textContent === instance.l10n.months.longhand[instance.currentMonth] ? '800' : '500';
                });
            };

            yearInput.onclick = function(e) {
                e.stopPropagation();
                document.querySelectorAll('.fp-custom-dropdown').forEach(d => d.classList.remove('show'));

                const yearRect = yearWrapper.getBoundingClientRect();
                const headerRect = headerContainer.getBoundingClientRect();
                yearList.style.left = (yearRect.left - headerRect.left + (yearRect.width / 2)) + 'px';
                yearList.style.transform = 'translateX(-50%)';
                yearList.style.top = (yearRect.bottom - headerRect.top + 5) + 'px';

                yearList.classList.add('show');

                let activeOpt = Array.from(yearList.children).find(c => c.textContent == instance.currentYear);
                if (activeOpt) {
                    Array.from(yearList.children).forEach(c => { c.style.background = ''; c.style.color = 'var(--text-primary)'; c.style.fontWeight = '500'; });
                    activeOpt.style.background = 'var(--col-primary-light)';
                    activeOpt.style.color = 'var(--col-primary)';
                    activeOpt.style.fontWeight = '800';

                    setTimeout(() => {
                        yearList.scrollTop = activeOpt.offsetTop - (yearList.clientHeight / 2) + (activeOpt.clientHeight / 2);
                    }, 10);
                }
            };
        };

        flatpickr("input[type='date']:not(.flatpickr-input)", {
            dateFormat: "Y-m-d",
            disableMobile: true,
            monthSelectorType: "static",
            onReady: buildCustomHeader
        });

        flatpickr("input[type='time']:not(.flatpickr-input)", {
            enableTime: true, noCalendar: true, dateFormat: "h:i K", time_24hr: false, disableMobile: true
        });

        flatpickr("input[type='datetime-local']:not(.flatpickr-input)", {
            enableTime: true, dateFormat: "Y-m-d h:i K", time_24hr: false, disableMobile: true, monthSelectorType: "static",
            onReady: buildCustomHeader
        });
    }
}

function autoModernizeUI() {
    document.querySelectorAll('select:not(.modernized)').forEach(sel => {
        if (!sel.id) sel.id = 'temp-sel-' + Math.random().toString(36).substr(2, 9);
        initializeCustomSelect(sel.id);
    });
    initSmartAutocompletes();
    initModernDatePickers();
}

const uiObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) autoModernizeUI();
    });
});
uiObserver.observe(document.body, { childList: true, subtree: true });

document.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-select-list:not(.ac-wrapper .custom-select-list)').forEach(l => l.classList.remove('show'));
    document.querySelectorAll('.custom-select-display').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.fp-custom-dropdown').forEach(d => d.classList.remove('show'));
    if (!e.target.closest('.ac-wrapper')) {
        document.querySelectorAll('.ac-wrapper .custom-select-list').forEach(box => box.classList.remove('show'));
    }
});

// ============================================================================
// NEW: Format worker name with Urdu font if it contains Arabic/Urdu characters
// ============================================================================
function formatWorkerName(name) {
    if (!name) return name;
    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(name)) {
        return `<span style="font-family: 'Noto Nastaliq Urdu', serif;">${name}</span>`;
    }
    return name;
}

// ============================================================================
// NEW: Setup Enter key to trigger primary button in a modal
// ============================================================================
function setupEnterKeyOnModal(modalId, buttonSelector = '.save, .btn-modern-save, #confirm-ok-btn, #prompt-confirm-btn') {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modal.dataset.enterKeySetup === 'true') return;
    modal.dataset.enterKeySetup = 'true';

    const inputs = modal.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const button = modal.querySelector(buttonSelector);
                if (button) button.click();
            }
        });
    });
}

// ============================================================================
// SMART AUTOCOMPLETE ENGINE (Must be defined)
// ============================================================================
function initSmartAutocompletes() {
    const fields = [
        { id: 'nc-name', field: 'name', type: 'clients', parentPrefix: 'nc-' },
        { id: 'nc-phone', field: 'phone', type: 'clients', parentPrefix: 'nc-' },
        { id: 'nc-address', field: 'address', type: 'clients', parentPrefix: 'nc-' },
        { id: 'cust-name', field: 'name', type: 'clients', parentPrefix: 'cust-' },
        { id: 'cust-phone', field: 'phone', type: 'clients', parentPrefix: 'cust-' },
        { id: 'cust-address', field: 'address', type: 'clients', parentPrefix: 'cust-' },
        { id: 'adv-tbl-name', field: 'tableName', type: 'tables' },
        { id: 'adv-cat-name', field: 'name', type: 'categories' },
        { id: 'adv-item-name', field: 'name', type: 'items' }
    ];

    fields.forEach(config => {
        const inputEl = document.getElementById(config.id);
        if (!inputEl) return;

        inputEl.removeAttribute('list');
        inputEl.setAttribute('autocomplete', 'off');

        if (inputEl.hasAttribute('data-ac-bound')) return;
        inputEl.setAttribute('data-ac-bound', 'true');

        const wrapper = inputEl.parentNode;
        if (!wrapper || !wrapper.classList.contains('ac-wrapper')) return;

        const sugBox = document.createElement('div');
        sugBox.className = 'custom-select-list';
        sugBox.style.width = '100%';
        sugBox.style.top = 'calc(100% + 5px)';
        sugBox.style.zIndex = '3500';
        wrapper.appendChild(sugBox);

        inputEl.addEventListener('input', () => {
            const val = inputEl.value.trim().toLowerCase();
            if (!val) { sugBox.classList.remove('show'); return; }

            let matches = [];
            let seen = new Set();
            let sourceArray = [];

            if (config.type === 'clients') sourceArray = app.clients;
            else if (config.type === 'tables' && typeof getFlattenedTables === 'function') sourceArray = getFlattenedTables();
            else if (config.type === 'categories') sourceArray = menuCategories;
            else if (config.type === 'items') sourceArray = menuItems;

            for (let item of sourceArray) {
                let textVal = item[config.field];
                if (textVal && textVal.toString().toLowerCase().includes(val)) {
                    if (!seen.has(textVal)) {
                        seen.add(textVal);
                        matches.push(item);
                        if (matches.length >= 4) break;
                    }
                }
            }

            if (matches.length === 0) { sugBox.classList.remove('show'); return; }

            sugBox.innerHTML = '';
            matches.forEach(item => {
                const opt = document.createElement('div');
                opt.className = 'custom-select-option';
                opt.style.display = 'flex';
                opt.style.flexDirection = 'column';
                opt.style.alignItems = 'flex-start';
                opt.style.padding = '10px 15px';

                let mainText = item[config.field];
                let subText = '';

                if (config.type === 'clients') {
                    subText = `${item.name} | ${item.phone}`;
                    if (item.company) subText += ` | ${item.company}`;
                }

                opt.innerHTML = `<span style="font-weight:800; font-size:0.95rem;">${mainText}</span>`;
                if (subText) opt.innerHTML += `<span style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px;">${subText}</span>`;

                opt.onclick = (e) => {
                    e.stopPropagation();

                    if (config.type === 'clients') {
                        const prefix = config.parentPrefix;
                        document.getElementById(prefix + 'name').value = item.name || '';
                        document.getElementById(prefix + 'phone').value = item.phone || '';
                        document.getElementById(prefix + 'address').value = item.address || '';

                        if (prefix === 'cust-' && document.getElementById('cart-client-select')) {
                            document.getElementById('cart-client-select').value = item.id;
                            initializeCustomSelect('cart-client-select');
                        }
                    } else if (config.type === 'tables') {
                        inputEl.value = item.tableName;
                    } else if (config.type === 'categories') {
                        inputEl.value = item.name;
                    } else if (config.type === 'items') {
                        inputEl.value = item.name;
                    }

                    sugBox.classList.remove('show');
                };
                sugBox.appendChild(opt);
            });
            sugBox.classList.add('show');
        });
    });
}