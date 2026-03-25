// inventory_barcode.js – Barcode Scanning for Inventory Management
// Version: 2.0 – Fully integrated with camera API, manual fallback, and inventory functions

// ============================================================================
// GLOBAL STATE
// ============================================================================
let barcodeScannerActive = false;
let currentBarcodeCallback = null;
let barcodeScannerStream = null;
let barcodeDetector = null;

// ============================================================================
// CHECK BROWSER SUPPORT & PERMISSIONS
// ============================================================================
const supportsBarcodeDetector = (() => {
  try {
    return typeof window.BarcodeDetector !== 'undefined';
  } catch (e) {
    return false;
  }
})();

async function checkCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    return false;
  }
}

// ============================================================================
// MAIN SCANNER INITIATION
// ============================================================================
async function initBarcodeScanner(callback) {
  if (!supportsBarcodeDetector) {
    showCustomAlert('Barcode Scanner', 'Your browser does not support the BarcodeDetector API. You can manually enter the barcode instead.');
    manualBarcodeEntry(callback);
    return;
  }
  
  const hasPermission = await checkCameraPermission();
  if (!hasPermission) {
    showCustomAlert('Camera Access', 'Camera access is required for barcode scanning. Please enable camera permissions in your browser settings and reload.');
    manualBarcodeEntry(callback);
    return;
  }
  
  currentBarcodeCallback = callback;
  openBarcodeScannerModal();
}

// ============================================================================
// OPEN SCANNER MODAL WITH VIDEO FEED
// ============================================================================
async function openBarcodeScannerModal() {
  // Remove existing modal if present
  const existing = document.getElementById('barcode-modal');
  if (existing) existing.remove();
  
  // Create modal HTML
  const modalHtml = `
        <div id="barcode-modal" class="modal" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal-content" style="max-width: 550px; text-align: center;">
                <h3>Scan Barcode</h3>
                <div id="barcode-video-container" style="position: relative; margin: 10px 0;">
                    <video id="barcode-video" autoplay playsinline style="width: 100%; border-radius: 12px; background: #000;"></video>
                    <div style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(255,0,0,0.5); pointer-events: none; transform: translateY(-50%);"></div>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-secondary);">Position barcode in the center</p>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <button class="btn-modern" onclick="closeBarcodeScanner()">Cancel</button>
                    <button class="btn-modern" onclick="manualBarcodeEntry()">Manual Entry</button>
                </div>
            </div>
        </div>
    `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = document.getElementById('barcode-modal');
  modal.classList.add('active');
  
  // Start video stream
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    barcodeScannerStream = stream;
    const video = document.getElementById('barcode-video');
    video.srcObject = stream;
    await video.play();
    barcodeScannerActive = true;
    startBarcodeDetectionLoop(video);
  } catch (error) {
    console.error('Failed to start camera:', error);
    showCustomAlert('Camera Error', 'Unable to access camera. Please check permissions or use manual entry.');
    closeBarcodeScanner();
    manualBarcodeEntry(currentBarcodeCallback);
  }
}

// ============================================================================
// BARCODE DETECTION LOOP
// ============================================================================
async function startBarcodeDetectionLoop(videoElement) {
  if (!supportsBarcodeDetector) return;
  if (!barcodeScannerActive) return;
  
  // Initialize detector with common formats
  if (!barcodeDetector) {
    try {
      barcodeDetector = new BarcodeDetector({
        formats: ['aztec', 'code_128', 'code_39', 'code_93', 'codabar', 'data_matrix', 'ean_13', 'ean_8', 'itf', 'pdf417', 'qr_code', 'upc_a', 'upc_e']
      });
    } catch (e) {
      console.warn('Failed to create BarcodeDetector:', e);
      closeBarcodeScanner();
      manualBarcodeEntry(currentBarcodeCallback);
      return;
    }
  }
  
  const detect = async () => {
    if (!barcodeScannerActive || !videoElement || videoElement.paused || videoElement.ended) {
      return;
    }
    try {
      const barcodes = await barcodeDetector.detect(videoElement);
      if (barcodes.length > 0) {
        const barcodeValue = barcodes[0].rawValue;
        closeBarcodeScanner();
        if (currentBarcodeCallback) {
          currentBarcodeCallback(barcodeValue);
          currentBarcodeCallback = null;
        }
        return;
      }
    } catch (e) {
      console.warn('Barcode detection error:', e);
    }
    requestAnimationFrame(detect);
  };
  requestAnimationFrame(detect);
}

// ============================================================================
// CLOSE SCANNER MODAL AND STOP STREAM
// ============================================================================
function closeBarcodeScanner() {
  barcodeScannerActive = false;
  if (barcodeScannerStream) {
    barcodeScannerStream.getTracks().forEach(track => track.stop());
    barcodeScannerStream = null;
  }
  const modal = document.getElementById('barcode-modal');
  if (modal) modal.remove();
}

// ============================================================================
// MANUAL BARCODE ENTRY (Fallback)
// ============================================================================
function manualBarcodeEntry(callback) {
  closeBarcodeScanner();
  openCustomPrompt('Enter Barcode', null, null, null, 'text', (result) => {
    if (result.text && callback) {
      callback(result.text.trim());
    } else if (callback) {
      callback(null);
    }
  });
}

// ============================================================================
// INVENTORY INTEGRATION FUNCTIONS
// ============================================================================

// Add barcode to an existing ingredient
function inv_addBarcodeToIngredient(ingredientId, barcode) {
  const ing = inv_getIngredientById(ingredientId);
  if (!ing) {
    showToast('Ingredient not found');
    return;
  }
  try {
    inv_updateIngredient(ingredientId, { barcode: barcode });
    showToast(`Barcode ${barcode} assigned to ${ing.name}`);
    if (typeof inv_refreshStockRegister === 'function') inv_refreshStockRegister();
  } catch (e) {
    showCustomAlert('Error', e.message);
  }
}

// Find ingredient by barcode (from data layer)
function inv_findIngredientByBarcode(barcode) {
  const ingredients = inv_getIngredients();
  return ingredients.find(i => i.barcode === barcode && !i.archived);
}

// Scan barcode for quick stock adjustment
function inv_scanBarcodeForAdjustment() {
  initBarcodeScanner((barcode) => {
    if (!barcode) return;
    const ingredient = inv_findIngredientByBarcode(barcode);
    if (ingredient) {
      inv_adjustStockPrompt(ingredient.id);
    } else {
      openConfirm('Barcode Not Found', `No ingredient found with barcode: ${barcode}\n\nWould you like to create a new ingredient with this barcode?`, () => {
        // Open add ingredient form and prefill barcode
        inv_showAddIngredientForm();
        // Wait for modal to appear, then fill barcode field
        setTimeout(() => {
          const barcodeInput = document.getElementById('inv-ing-barcode');
          if (barcodeInput) barcodeInput.value = barcode;
        }, 100);
      });
    }
  });
}

// Scan barcode for ingredient form (add/edit)
function inv_scanBarcodeForIngredient(callback) {
  initBarcodeScanner((barcode) => {
    if (barcode && callback) callback(barcode);
    else if (callback) callback(null);
  });
}

// ============================================================================
// BARCODE QUICK ADJUSTMENT (direct from stock table)
// ============================================================================
function inv_quickBarcodeAdjust() {
  initBarcodeScanner((barcode) => {
    if (!barcode) return;
    const ingredient = inv_findIngredientByBarcode(barcode);
    if (ingredient) {
      inv_adjustStockPrompt(ingredient.id);
    } else {
      showCustomAlert('Not Found', `No ingredient with barcode ${barcode}. Please add it first.`);
      inv_showAddIngredientForm();
      setTimeout(() => {
        const barcodeInput = document.getElementById('inv-ing-barcode');
        if (barcodeInput) barcodeInput.value = barcode;
      }, 100);
    }
  });
}

// ============================================================================
// BARCODE ASSIGNMENT FROM INVENTORY SETTINGS / PRODUCT MASTER
// ============================================================================
function inv_assignBarcodeToItem(itemId, itemType = 'ingredient') {
  if (itemType === 'ingredient') {
    initBarcodeScanner((barcode) => {
      if (barcode) {
        inv_addBarcodeToIngredient(itemId, barcode);
      }
    });
  }
  // Could extend to other item types (menu items, etc.) if needed
}

// ============================================================================
// EXPOSE GLOBALLY
// ============================================================================
if (typeof window !== 'undefined') {
  window.initBarcodeScanner = initBarcodeScanner;
  window.closeBarcodeScanner = closeBarcodeScanner;
  window.manualBarcodeEntry = manualBarcodeEntry;
  window.inv_scanBarcodeForAdjustment = inv_scanBarcodeForAdjustment;
  window.inv_scanBarcodeForIngredient = inv_scanBarcodeForIngredient;
  window.inv_quickBarcodeAdjust = inv_quickBarcodeAdjust;
  window.inv_assignBarcodeToItem = inv_assignBarcodeToItem;
  window.inv_addBarcodeToIngredient = inv_addBarcodeToIngredient;
  window.inv_findIngredientByBarcode = inv_findIngredientByBarcode;
}

console.log('inventory_barcode.js loaded');