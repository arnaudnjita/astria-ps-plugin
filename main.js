/**
 * main.js - Astria Nano-Banana V2 Authentic Photoshop Controller
 * Unified AI Prompt Card with Masked Smart Object Layer Separation
 */

// Safe environment detection for Photoshop UXP and browser/preview contexts
let photoshop = {};
let uxp = {};
try {
  if (typeof require !== "undefined") {
    photoshop = require("photoshop");
    uxp = require("uxp");
  } else if (typeof window !== "undefined" && window.photoshop) {
    photoshop = window.photoshop;
    uxp = window.uxp || {};
  }
} catch (e) {
  console.warn("Photoshop environment not detected; running in mock/preview mode.", e);
}

const app = photoshop.app || {};
const core = photoshop.core || {};
const action = photoshop.action || {};
const imaging = photoshop.imaging || {};
const storage = uxp.storage || {};

// Import API module
let apiModule = {};
try {
  if (typeof require !== "undefined") {
    apiModule = require("./api.js");
  }
} catch (e) {}
if (!apiModule || !apiModule.TOP_6_IMAGE_MODELS) {
  if (typeof window !== "undefined" && window.AstriaAPI) {
    apiModule = window.AstriaAPI;
  }
}

const {
  TOP_6_IMAGE_MODELS = [
    { id: "openai/gpt-image-2.5-sunburst", name: "GPT Image 2.5 Sunburst" },
    { id: "google/gemini-nano-banana-2.1", name: "Nano Banana 2.1" },
    { id: "black-forest-labs/flux-3-image", name: "FLUX 3 Image" }
  ],
  generateImage,
  calculateClosestAspectRatio,
  fetchAllImageModels,
} = apiModule;

// Safe Storage abstraction
const safeStorage = {
  getItem: (key) => {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  },
  setItem: (key, val) => {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(key, val);
    } catch (e) {}
  }
};

// Application State
let state = {
  apiKey: "",
  prompt: "Replace the earring",
  negativePrompt: "blurry, low quality, distorted, artifacts",
  model: "openai/gpt-image-2.5-sunburst",
  modelDisplayName: "GPT Image 2.5 Sunburst",
  count: 1,
  resolution: "2K",
  quality: "Medium",
  layerSeparation: true,
  referenceImageBase64: null,
  isSelectionActive: false,
  selectionBounds: null,
  isGenerating: false,
  history: [],
};

// UI Elements cache
let el = {};

/**
 * Bootstraps the application immediately or on DOMContentLoaded
 */
function boot() {
  try {
    console.log("Nano-Banana: Initializing UI...");
    initUI();
    attachEventListeners();
    attachDelegatedListeners();
    loadSettings();
    refreshPhotoshopContext();
    console.log("Nano-Banana: Ready & Fully Responsive!");
  } catch (err) {
    console.error("Nano-Banana boot error:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

/**
 * Cache all DOM elements
 */
function initUI() {
  el = {
    // Header & Drawers
    btnHistoryToggle: document.getElementById("btnHistoryToggle"),
    historyDrawer: document.getElementById("historyDrawer"),
    historyList: document.getElementById("historyList"),
    btnClearHistory: document.getElementById("btnClearHistory"),
    btnSettingsToggle: document.getElementById("btnSettingsToggle"),
    settingsDrawer: document.getElementById("settingsDrawer"),
    apiKeyInput: document.getElementById("apiKeyInput"),
    btnToggleKeyVisibility: document.getElementById("btnToggleKeyVisibility"),
    layerSeparationToggle: document.getElementById("layerSeparationToggle"),
    negativePromptInput: document.getElementById("negativePromptInput"),
    saveIndicator: document.getElementById("saveIndicator"),

    // Image Tray
    refThumbnailCard: document.getElementById("refThumbnailCard"),
    refThumbnailImg: document.getElementById("refThumbnailImg"),
    btnRemoveThumb: document.getElementById("btnRemoveThumb"),
    btnAddImage: document.getElementById("btnAddImage"),
    fileInput: document.getElementById("fileInput"),

    // Prompt & Palette
    promptInput: document.getElementById("promptInput"),
    btnTogglePalette: document.getElementById("btnTogglePalette"),
    stylePaletteDrawer: document.getElementById("stylePaletteDrawer"),
    styleChips: document.querySelectorAll(".style-chip"),

    // Result Banner
    resultBanner: document.getElementById("resultBanner"),
    resultText: document.getElementById("resultText"),

    // Bottom Toolbar Pills
    btnModelPill: document.getElementById("btnModelPill"),
    labelCurrentModel: document.getElementById("labelCurrentModel"),
    modelMenu: document.getElementById("modelMenu"),
    btnCountPill: document.getElementById("btnCountPill"),
    labelCount: document.getElementById("labelCount"),
    countMenu: document.getElementById("countMenu"),
    btnResPill: document.getElementById("btnResPill"),
    labelRes: document.getElementById("labelRes"),
    resMenu: document.getElementById("resMenu"),
    btnQualityPill: document.getElementById("btnQualityPill"),
    labelQuality: document.getElementById("labelQuality"),
    qualityMenu: document.getElementById("qualityMenu"),

    // Action Button
    btnSendAction: document.getElementById("btnSendAction"),
    sendSpinner: document.getElementById("sendSpinner"),
    sendArrow: document.getElementById("sendArrow"),
    sendCaret: document.getElementById("sendCaret"),

    // Custom Model Modal
    customModelModal: document.getElementById("customModelModal"),
    customModelInput: document.getElementById("customModelInput"),
    btnCancelCustom: document.getElementById("btnCancelCustom"),
    btnApplyCustom: document.getElementById("btnApplyCustom"),
  };
}

/**
 * Safe helper to attach event listener
 */
function safeListen(element, event, handler) {
  if (element && typeof element.addEventListener === "function") {
    try {
      element.addEventListener(event, handler);
      return true;
    } catch (e) {
      console.warn("safeListen error:", e);
    }
  }
  return false;
}

/**
 * Toggles a drawer element open/close with direct style & class manipulation
 */
function toggleDrawer(drawerEl) {
  if (!drawerEl) return;
  const isVisible = drawerEl.style.display === "block" || drawerEl.classList.contains("open");
  drawerEl.style.display = isVisible ? "none" : "block";
  if (isVisible) {
    drawerEl.classList.remove("open");
  } else {
    drawerEl.classList.add("open");
  }
}

/**
 * Toggles a dropdown menu open/close
 */
function toggleMenu(menuEl) {
  if (!menuEl) return;
  const isVisible = menuEl.style.display === "block" || menuEl.classList.contains("open");
  closeAllMenus();
  if (!isVisible) {
    menuEl.style.display = "block";
    menuEl.classList.add("open");
  }
}

function closeAllMenus() {
  document.querySelectorAll(".pill-menu").forEach((m) => {
    m.style.display = "none";
    m.classList.remove("open");
  });
}

/**
 * Attach UI direct event handlers
 */
function attachEventListeners() {
  // Toggle Settings Drawer (Avatar S)
  safeListen(el.btnSettingsToggle, "click", (e) => {
    e.stopPropagation();
    closeAllMenus();
    toggleDrawer(el.settingsDrawer);
    if (el.historyDrawer) {
      el.historyDrawer.style.display = "none";
      el.historyDrawer.classList.remove("open");
    }
    if (el.settingsDrawer && el.settingsDrawer.style.display === "block" && el.apiKeyInput) {
      el.apiKeyInput.focus();
    }
  });

  // Toggle API Key Visibility
  safeListen(el.btnToggleKeyVisibility, "click", () => {
    if (!el.apiKeyInput) return;
    const isPass = el.apiKeyInput.type === "password";
    el.apiKeyInput.type = isPass ? "text" : "password";
    el.btnToggleKeyVisibility.textContent = isPass ? "🔒" : "👁";
  });

  // API Key input
  safeListen(el.apiKeyInput, "input", (e) => {
    state.apiKey = e.target.value.trim();
    safeStorage.setItem("openrouter_api_key", state.apiKey);
    showSaveIndicator();
  });

  // Layer separation switch
  safeListen(el.layerSeparationToggle, "change", (e) => {
    state.layerSeparation = e.target.checked;
    safeStorage.setItem("nano_layer_sep", state.layerSeparation ? "1" : "0");
  });

  // Negative prompt
  safeListen(el.negativePromptInput, "input", (e) => {
    state.negativePrompt = e.target.value.trim();
    safeStorage.setItem("nano_neg_prompt", state.negativePrompt);
  });

  // Toggle History Drawer
  safeListen(el.btnHistoryToggle, "click", (e) => {
    e.stopPropagation();
    closeAllMenus();
    toggleDrawer(el.historyDrawer);
    if (el.settingsDrawer) {
      el.settingsDrawer.style.display = "none";
      el.settingsDrawer.classList.remove("open");
    }
    renderHistoryList();
  });

  // Clear History
  safeListen(el.btnClearHistory, "click", () => {
    state.history = [];
    safeStorage.setItem("nano_history", "[]");
    renderHistoryList();
  });

  // Image Upload / Add Image
  safeListen(el.btnAddImage, "click", () => {
    if (el.fileInput) el.fileInput.click();
  });

  safeListen(el.fileInput, "change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setReferenceImage(evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  });

  // Remove Thumbnail
  safeListen(el.btnRemoveThumb, "click", (e) => {
    e.stopPropagation();
    clearReferenceImage();
  });

  // Prompt Textarea
  safeListen(el.promptInput, "input", (e) => {
    state.prompt = e.target.value;
  });

  // Style Palette Toggle
  safeListen(el.btnTogglePalette, "click", (e) => {
    e.stopPropagation();
    toggleDrawer(el.stylePaletteDrawer);
  });

  // Style Chips
  if (el.styleChips && el.promptInput) {
    el.styleChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const text = chip.dataset.style;
        const cur = el.promptInput.value.trim();
        el.promptInput.value = cur ? `${cur}, ${text}` : text;
        state.prompt = el.promptInput.value;
        el.promptInput.focus();
      });
    });
  }

  // Model Pill Dropdown
  safeListen(el.btnModelPill, "click", (e) => {
    e.stopPropagation();
    toggleMenu(el.modelMenu);
  });

  if (el.modelMenu) {
    el.modelMenu.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const modelId = item.dataset.model;
        if (modelId === "custom") {
          openCustomModelModal();
        } else {
          selectModel(modelId, item.textContent.trim());
        }
        closeAllMenus();
      });
    });
  }

  // Variations Count Pill Dropdown
  safeListen(el.btnCountPill, "click", (e) => {
    e.stopPropagation();
    toggleMenu(el.countMenu);
  });

  if (el.countMenu) {
    el.countMenu.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const countVal = parseInt(item.dataset.count, 10) || 1;
        state.count = countVal;
        if (el.labelCount) el.labelCount.textContent = countVal;
        el.countMenu.querySelectorAll(".menu-item").forEach((m) => m.classList.remove("active"));
        item.classList.add("active");
        closeAllMenus();
      });
    });
  }

  // Resolution Pill Dropdown
  safeListen(el.btnResPill, "click", (e) => {
    e.stopPropagation();
    toggleMenu(el.resMenu);
  });

  if (el.resMenu) {
    el.resMenu.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const resVal = item.dataset.res;
        state.resolution = resVal;
        if (el.labelRes) el.labelRes.textContent = resVal.toUpperCase();
        el.resMenu.querySelectorAll(".menu-item").forEach((m) => m.classList.remove("active"));
        item.classList.add("active");
        closeAllMenus();
      });
    });
  }

  // Quality Pill Dropdown
  safeListen(el.btnQualityPill, "click", (e) => {
    e.stopPropagation();
    toggleMenu(el.qualityMenu);
  });

  if (el.qualityMenu) {
    el.qualityMenu.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const qVal = item.dataset.quality;
        state.quality = qVal;
        if (el.labelQuality) el.labelQuality.textContent = qVal;
        el.qualityMenu.querySelectorAll(".menu-item").forEach((m) => m.classList.remove("active"));
        item.classList.add("active");
        closeAllMenus();
      });
    });
  }

  // Custom Model Modal Buttons
  safeListen(el.btnCancelCustom, "click", () => {
    if (el.customModelModal) el.customModelModal.classList.remove("open");
  });

  safeListen(el.btnApplyCustom, "click", () => {
    if (!el.customModelInput) return;
    const slug = el.customModelInput.value.trim();
    if (slug) {
      selectModel(slug, slug.split("/")[1] || slug);
    }
    if (el.customModelModal) el.customModelModal.classList.remove("open");
  });

  // Main Action: Run Generative Edit (White ↑ ▾ Button)
  safeListen(el.btnSendAction, "click", (e) => {
    e.preventDefault();
    handleRunGeneration();
  });
}

/**
 * Universal Click Delegation: Guarantees clicks always work in UXP webview
 */
function attachDelegatedListeners() {
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target) return;

    // S Avatar Settings button
    if (target.closest("#btnSettingsToggle")) {
      e.stopPropagation();
      closeAllMenus();
      const drawer = document.getElementById("settingsDrawer");
      toggleDrawer(drawer);
      const history = document.getElementById("historyDrawer");
      if (history) { history.style.display = "none"; history.classList.remove("open"); }
      return;
    }

    // History button
    if (target.closest("#btnHistoryToggle")) {
      e.stopPropagation();
      closeAllMenus();
      const drawer = document.getElementById("historyDrawer");
      toggleDrawer(drawer);
      const settings = document.getElementById("settingsDrawer");
      if (settings) { settings.style.display = "none"; settings.classList.remove("open"); }
      renderHistoryList();
      return;
    }

    // Model Pill
    if (target.closest("#btnModelPill")) {
      e.stopPropagation();
      toggleMenu(document.getElementById("modelMenu"));
      return;
    }

    // Variations Count Pill
    if (target.closest("#btnCountPill")) {
      e.stopPropagation();
      toggleMenu(document.getElementById("countMenu"));
      return;
    }

    // Resolution Pill
    if (target.closest("#btnResPill")) {
      e.stopPropagation();
      toggleMenu(document.getElementById("resMenu"));
      return;
    }

    // Quality Pill
    if (target.closest("#btnQualityPill")) {
      e.stopPropagation();
      toggleMenu(document.getElementById("qualityMenu"));
      return;
    }

    // Style Palette Toggle
    if (target.closest("#btnTogglePalette")) {
      e.stopPropagation();
      toggleDrawer(document.getElementById("stylePaletteDrawer"));
      return;
    }

    // Add Image card
    if (target.closest("#btnAddImage")) {
      const fileInput = document.getElementById("fileInput");
      if (fileInput) fileInput.click();
      return;
    }

    // Remove Thumbnail button
    if (target.closest("#btnRemoveThumb")) {
      e.stopPropagation();
      clearReferenceImage();
      return;
    }

    // Send Action Button (White ↑ ▾ button)
    if (target.closest("#btnSendAction")) {
      e.preventDefault();
      handleRunGeneration();
      return;
    }

    // Close open menus if clicked outside
    if (!target.closest(".pill-dropdown-wrap")) {
      closeAllMenus();
    }
  });

  // Window focus auto-refreshes Photoshop context
  window.addEventListener("focus", () => {
    refreshPhotoshopContext();
  });
}

function openCustomModelModal() {
  if (el.customModelModal) {
    el.customModelModal.classList.add("open");
    if (el.customModelInput) {
      el.customModelInput.value = state.model.startsWith("custom:") ? state.model.replace("custom:", "") : "";
      el.customModelInput.focus();
    }
  }
}

function selectModel(modelId, displayName) {
  state.model = modelId;
  state.modelDisplayName = displayName;
  if (el.labelCurrentModel) {
    el.labelCurrentModel.textContent = displayName;
  }
  safeStorage.setItem("nano_model", modelId);
  safeStorage.setItem("nano_model_name", displayName);

  if (el.modelMenu) {
    el.modelMenu.querySelectorAll(".menu-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.model === modelId);
    });
  }
}

function setReferenceImage(dataUrl) {
  state.referenceImageBase64 = dataUrl;
  if (el.refThumbnailImg) el.refThumbnailImg.src = dataUrl;
  if (el.refThumbnailCard) el.refThumbnailCard.style.display = "block";
}

function clearReferenceImage() {
  state.referenceImageBase64 = null;
  if (el.fileInput) el.fileInput.value = "";
  if (el.refThumbnailImg) el.refThumbnailImg.src = "";
  if (el.refThumbnailCard) el.refThumbnailCard.style.display = "none";
}

function showSaveIndicator() {
  if (!el.saveIndicator) return;
  el.saveIndicator.style.opacity = "1";
  setTimeout(() => {
    if (el.saveIndicator) el.saveIndicator.style.opacity = "0";
  }, 1600);
}

/**
 * Load settings from safeStorage
 */
function loadSettings() {
  const savedKey = safeStorage.getItem("openrouter_api_key") || "";
  if (savedKey) {
    state.apiKey = savedKey;
    if (el.apiKeyInput) el.apiKeyInput.value = savedKey;
  } else if (el.settingsDrawer) {
    el.settingsDrawer.style.display = "block";
    el.settingsDrawer.classList.add("open");
  }

  const savedModel = safeStorage.getItem("nano_model");
  const savedModelName = safeStorage.getItem("nano_model_name");
  if (savedModel) {
    selectModel(savedModel, savedModelName || savedModel.split("/")[1] || savedModel);
  }

  const savedSep = safeStorage.getItem("nano_layer_sep");
  if (savedSep !== null && el.layerSeparationToggle) {
    state.layerSeparation = savedSep === "1";
    el.layerSeparationToggle.checked = state.layerSeparation;
  }

  const savedNeg = safeStorage.getItem("nano_neg_prompt");
  if (savedNeg && el.negativePromptInput) {
    state.negativePrompt = savedNeg;
    el.negativePromptInput.value = savedNeg;
  }

  try {
    const rawHist = safeStorage.getItem("nano_history");
    if (rawHist) state.history = JSON.parse(rawHist);
  } catch (e) {}
}

/**
 * Query Photoshop document and selection
 */
async function refreshPhotoshopContext() {
  let doc = null;
  try {
    if (app && app.documents && app.documents.length > 0) {
      doc = app.activeDocument;
    }
  } catch (e) {
    doc = null;
  }

  if (!doc) {
    setResultBanner("No active document in Photoshop. Open an image to begin.", "info");
    return;
  }

  // Check selection via batchPlay
  let selBounds = null;
  try {
    if (action && typeof action.batchPlay === "function") {
      const res = await action.batchPlay(
        [
          {
            _obj: "get",
            _target: [
              { _property: "selection" },
              { _ref: "document", _id: doc.id },
            ],
          },
        ],
        { synchronousExecution: true }
      );

      if (res && res[0] && res[0].selection) {
        const s = res[0].selection;
        const left = Math.round(s.left?._value ?? s.left ?? 0);
        const top = Math.round(s.top?._value ?? s.top ?? 0);
        const right = Math.round(s.right?._value ?? s.right ?? doc.width);
        const bottom = Math.round(s.bottom?._value ?? s.bottom ?? doc.height);
        selBounds = {
          left, top, right, bottom,
          width: Math.max(1, right - left),
          height: Math.max(1, bottom - top),
        };
      }
    }
  } catch (e) {}

  if (selBounds) {
    state.isSelectionActive = true;
    state.selectionBounds = selBounds;

    // Auto-preview cropped selection thumbnail in tray if no manual reference image
    if (!state.referenceImageBase64) {
      try {
        const previewPng = await exportSelectedAreaAsPng(doc, selBounds);
        if (previewPng) {
          if (el.refThumbnailImg) el.refThumbnailImg.src = `data:image/png;base64,${previewPng}`;
          if (el.refThumbnailCard) el.refThumbnailCard.style.display = "block";
        }
      } catch (e) {}
    }

    setResultBanner(`Selection active (${selBounds.width} × ${selBounds.height}px). Ready for Smart Object edit.`, "success");
  } else {
    state.isSelectionActive = false;
    state.selectionBounds = { left: 0, top: 0, right: doc.width, bottom: doc.height, width: doc.width, height: doc.height };
    if (!state.referenceImageBase64 && el.refThumbnailCard) {
      el.refThumbnailCard.style.display = "none";
    }
    setResultBanner("Result added to Photoshop as a masked Smart Object.", "success");
  }
}

/**
 * Set Result / Status banner text and state
 */
function setResultBanner(text, type = "success") {
  if (!el.resultBanner || !el.resultText) return;
  el.resultText.textContent = text;
  el.resultBanner.className = `result-banner ${type}`;
}

/**
 * Executes the generation and masked Smart Object placement
 */
async function handleRunGeneration() {
  if (state.isGenerating) return;

  const apiKeyInput = document.getElementById("apiKeyInput");
  const promptInput = document.getElementById("promptInput");

  const apiKey = (apiKeyInput ? apiKeyInput.value : state.apiKey).trim();
  const prompt = (promptInput ? promptInput.value : state.prompt).trim();

  // Validate API Key
  if (!apiKey) {
    setResultBanner("Please provide your OpenRouter API key (click 'S' avatar at top-right).", "error");
    const drawer = document.getElementById("settingsDrawer");
    if (drawer) {
      drawer.style.display = "block";
      drawer.classList.add("open");
    }
    if (apiKeyInput) apiKeyInput.focus();
    return;
  }

  // Validate Prompt
  if (!prompt) {
    setResultBanner("Please enter an edit prompt (e.g. 'Replace the earring').", "error");
    if (promptInput) promptInput.focus();
    return;
  }

  setLoading(true);

  try {
    setResultBanner(`Generating with ${state.modelDisplayName}...`, "info");

    // 1. Check Photoshop Document
    let doc = null;
    try {
      if (app && app.documents && app.documents.length > 0) {
        doc = app.activeDocument;
      }
    } catch (e) {
      doc = null;
    }

    if (!doc) {
      throw new Error("No active document in Photoshop. Please open an image first.");
    }

    // 2. Read Selection pixels if available
    let selectionBase64 = null;
    const bounds = state.selectionBounds || { left: 0, top: 0, right: doc.width, bottom: doc.height, width: doc.width, height: doc.height };
    if (state.isSelectionActive) {
      selectionBase64 = await exportSelectedAreaAsPng(doc, bounds);
    }

    // 3. Aspect Ratio calculation
    let effectiveAspectRatio = "1:1";
    if (state.resolution === "auto" || state.isSelectionActive) {
      effectiveAspectRatio = calculateClosestAspectRatio(bounds.width, bounds.height);
    }

    // 4. Call OpenRouter API
    if (typeof generateImage !== "function") {
      throw new Error("API module not loaded. Please reload the plugin in UDT.");
    }

    const apiResult = await generateImage({
      apiKey,
      prompt,
      negativePrompt: state.negativePrompt,
      model: state.model,
      aspectRatio: effectiveAspectRatio,
      referenceImageBase64: state.referenceImageBase64,
      selectionImageBase64: selectionBase64,
    });

    // 5. Place Smart Object with Layer Separation (Automated Layer Mask)
    setResultBanner("Placing Smart Object and creating Layer Mask...", "info");
    await insertAndAlignGeneratedImage(apiResult.bytes, bounds, state.isSelectionActive, prompt, state.layerSeparation);

    // 6. Update Success Banner
    setResultBanner("Result added to Photoshop as a masked Smart Object.", "success");

    // 7. Add to History
    addHistoryItem(prompt, state.modelDisplayName, apiResult.base64);
  } catch (err) {
    console.error("Generation error:", err);
    setResultBanner(err.message || String(err), "error");
  } finally {
    setLoading(false);
  }
}

/**
 * Toggle UI loading state
 */
function setLoading(loading) {
  state.isGenerating = loading;
  const sendBtn = document.getElementById("btnSendAction");
  const spinner = document.getElementById("sendSpinner");
  const arrow = document.getElementById("sendArrow");
  const caret = document.getElementById("sendCaret");

  if (sendBtn) sendBtn.disabled = loading;

  if (loading) {
    if (spinner) spinner.style.display = "inline-block";
    if (arrow) arrow.style.display = "none";
    if (caret) caret.style.display = "none";
  } else {
    if (spinner) spinner.style.display = "none";
    if (arrow) arrow.style.display = "inline";
    if (caret) caret.style.display = "inline";
  }
}

/**
 * Export selection area pixels as PNG using imaging.getPixels
 */
async function exportSelectedAreaAsPng(doc, bounds) {
  if (!core || !core.executeAsModal) return null;
  let base64Png = null;

  await core.executeAsModal(
    async () => {
      let pixels = null;
      try {
        pixels = await imaging.getPixels({
          documentID: doc.id,
          sourceBounds: {
            left: bounds.left,
            top: bounds.top,
            right: bounds.right,
            bottom: bounds.bottom,
          },
          colorSpace: "RGB",
          componentSize: 8,
        });

        if (pixels && pixels.imageData) {
          base64Png = await imaging.encodeImageData({
            imageData: pixels.imageData,
            base64: true,
            format: "png",
          });
        }
      } finally {
        if (pixels && pixels.imageData) {
          try {
            pixels.imageData.dispose();
          } catch (e) {}
        }
      }
    },
    { commandName: "Export Selection Pixels" }
  );

  return base64Png;
}

/**
 * Insert generated image as Smart Object and apply Layer Separation (Mask)
 */
async function insertAndAlignGeneratedImage(resultBytes, bounds, hasSelection, promptText, applySeparation) {
  if (!core || !core.executeAsModal) return;

  await core.executeAsModal(
    async () => {
      const doc = app.activeDocument;
      if (!doc) return;

      // 1. Write binary buffer to UXP temporary storage file
      const tempFolder = await storage.localFileSystem.getTemporaryFolder();
      const tempFileName = `nanobanana_${Date.now()}.png`;
      const tempFile = await tempFolder.createFile(tempFileName, { overwrite: true });

      const rawBuffer = resultBytes.buffer ? resultBytes.buffer : resultBytes;
      await tempFile.write(rawBuffer, { format: storage.formats.binary });
      const sessionToken = storage.localFileSystem.createSessionToken(tempFile);

      // 2. Duplicate selection to temporary alpha channel for Layer Masking
      let backedUpSelection = false;
      const tempChannelName = `__NanoBanana_Mask_${Date.now()}`;
      if (hasSelection && applySeparation) {
        try {
          await action.batchPlay(
            [
              {
                _obj: "duplicate",
                _target: [{ _ref: "channel", _property: "selection" }],
                name: tempChannelName,
              },
            ],
            { synchronousExecution: true }
          );
          backedUpSelection = true;
        } catch (e) {}
      }

      // Clear active marquee so placeEvent places cleanly
      try {
        await action.batchPlay(
          [
            {
              _obj: "set",
              _target: [{ _ref: "channel", _property: "selection" }],
              to: { _enum: "ordinal", _value: "none" },
            },
          ],
          { synchronousExecution: true }
        );
      } catch (e) {}

      // 3. BatchPlay placeEvent: Places PNG as a Smart Object Layer
      await action.batchPlay(
        [
          {
            _obj: "placeEvent",
            null: {
              _path: sessionToken,
              _kind: "local",
            },
            freeTransformCenterState: {
              _enum: "quadCenterState",
              _value: "QCSAverage",
            },
            linked: false,
          },
        ],
        { synchronousExecution: true }
      );

      // Rename layer to prompt text
      const placedLayer = doc.activeLayers[0];
      if (placedLayer) {
        try {
          const cleanPrompt = promptText.trim().replace(/[\r\n]+/g, " ");
          placedLayer.name = `Nano Banana: ${cleanPrompt.slice(0, 24)}`;
        } catch (e) {}

        // 4. Transform and align to selection bounds
        if (bounds && bounds.width && bounds.height) {
          const lBounds = placedLayer.bounds;
          const curW = Math.max(1, lBounds.right - lBounds.left);
          const curH = Math.max(1, lBounds.bottom - lBounds.top);

          const scaleX = (bounds.width / curW) * 100;
          const scaleY = (bounds.height / curH) * 100;

          const targetCenterX = bounds.left + bounds.width / 2;
          const targetCenterY = bounds.top + bounds.height / 2;
          const curCenterX = lBounds.left + curW / 2;
          const curCenterY = lBounds.top + curH / 2;

          await action.batchPlay(
            [
              {
                _obj: "transform",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                freeTransformCenterState: {
                  _enum: "quadCenterState",
                  _value: "QCSAverage",
                },
                offset: {
                  _horizontal: { _unit: "pixelsUnit", _value: targetCenterX - curCenterX },
                  _vertical: { _unit: "pixelsUnit", _value: targetCenterY - curCenterY },
                },
                width: { _unit: "percentUnit", _value: scaleX },
                height: { _unit: "percentUnit", _value: scaleY },
              },
            ],
            { synchronousExecution: true }
          );
        }

        // 5. Restore selection and create automated Layer Mask
        if (backedUpSelection) {
          try {
            await action.batchPlay(
              [
                {
                  _obj: "set",
                  _target: [{ _ref: "channel", _property: "selection" }],
                  to: { _ref: "channel", _name: tempChannelName },
                },
                {
                  _obj: "make",
                  null: { _ref: "layerMask" },
                  at: { _enum: "ordinal", _value: "target" },
                  using: { _enum: "userMaskSet", _value: "revealSelection" },
                },
                {
                  _obj: "delete",
                  _target: [{ _ref: "channel", _name: tempChannelName }],
                },
                {
                  _obj: "set",
                  _target: [{ _ref: "channel", _property: "selection" }],
                  to: { _enum: "ordinal", _value: "none" },
                },
              ],
              { synchronousExecution: true }
            );
          } catch (maskErr) {
            console.warn("Mask creation error:", maskErr);
          }
        }
      }

      // Cleanup temp file
      try {
        await tempFile.delete();
      } catch (e) {}
    },
    { commandName: "Nano Banana: Masked Smart Object Placement" }
  );
}

/**
 * Session generation history tracking
 */
function addHistoryItem(prompt, modelName, thumbB64) {
  const item = {
    id: Date.now(),
    prompt,
    modelName,
    thumb: thumbB64 ? `data:image/png;base64,${thumbB64}` : null,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  state.history.unshift(item);
  if (state.history.length > 20) state.history.pop();
  safeStorage.setItem("nano_history", JSON.stringify(state.history));
  renderHistoryList();
}

function renderHistoryList() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;
  if (!state.history || state.history.length === 0) {
    historyList.innerHTML = '<div class="empty-history">No generations yet in this session.</div>';
    return;
  }

  historyList.innerHTML = "";
  state.history.forEach((h) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      ${h.thumb ? `<img src="${h.thumb}" class="history-thumb" />` : '<div class="history-thumb"></div>'}
      <div class="history-info">
        <span class="history-prompt">${escapeHtml(h.prompt)}</span>
        <span class="history-time">${escapeHtml(h.modelName)} • ${h.time}</span>
      </div>
    `;
    div.addEventListener("click", () => {
      const promptInput = document.getElementById("promptInput");
      if (promptInput) {
        promptInput.value = h.prompt;
        state.prompt = h.prompt;
      }
      const historyDrawer = document.getElementById("historyDrawer");
      if (historyDrawer) {
        historyDrawer.style.display = "none";
        historyDrawer.classList.remove("open");
      }
    });
    historyList.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
