/**
 * main.js - Core Photoshop Interaction & UI Controller for Nano Banana Pro V2
 * Backend: OpenRouter API with Nano Banana Layer Separation
 */

const photoshop = require("photoshop");
const { app, core, action, imaging } = photoshop;
const uxp = require("uxp");
const { storage } = uxp;

// Import API functions
let apiModule;
try {
  apiModule = require("./api.js");
} catch (e) {
  apiModule = window.AstriaAPI;
}
const {
  TOP_6_IMAGE_MODELS,
  generateImage,
  calculateClosestAspectRatio,
  fetchAllImageModels,
} = apiModule;

// State management
let state = {
  apiKey: "",
  prompt: "",
  negativePrompt: "",
  model: "google/gemini-nano-banana-2.1",
  customModel: "",
  aspectRatioMode: "auto",
  referenceImageBase64: null,
  isGenerating: false,
  allModels: [],
  activeFilter: "all",
  searchQuery: "",
  activeMode: "inpaint",
  layerSeparation: true,
};

// UI Elements Cache
let el = {};

document.addEventListener("DOMContentLoaded", () => {
  initUI();
  attachEventListeners();
  loadSavedSettings();
  refreshDocStatus();
  loadModelsCatalog();
});

/**
 * Cache DOM elements
 */
function initUI() {
  el = {
    settingsToggleBtn: document.getElementById("settingsToggleBtn"),
    settingsDrawer: document.getElementById("settingsDrawer"),
    apiKeyInput: document.getElementById("apiKeyInput"),
    toggleApiKeyBtn: document.getElementById("toggleApiKeyBtn"),
    saveKeyBadge: document.getElementById("saveKeyBadge"),
    modelSelect: document.getElementById("modelSelect"),
    moreModelsBtn: document.getElementById("moreModelsBtn"),
    customModelContainer: document.getElementById("customModelContainer"),
    customModelInput: document.getElementById("customModelInput"),
    aspectRatioSelect: document.getElementById("aspectRatioSelect"),
    promptText: document.getElementById("promptText"),
    negativePromptText: document.getElementById("negativePromptText"),
    refImageInput: document.getElementById("refImageInput"),
    refUploadArea: document.getElementById("refUploadArea"),
    refPreviewContainer: document.getElementById("refPreviewContainer"),
    refPreviewImg: document.getElementById("refPreviewImg"),
    clearRefBtn: document.getElementById("clearRefBtn"),
    layerSeparationToggle: document.getElementById("layerSeparationToggle"),
    docStatusContent: document.getElementById("docStatusContent"),
    refreshStatusBtn: document.getElementById("refreshStatusBtn"),
    generateBtn: document.getElementById("generateBtn"),
    generateSpinner: document.getElementById("generateSpinner"),
    generateBtnText: document.getElementById("generateBtnText"),
    statusMessage: document.getElementById("statusMessage"),
    progressBar: document.getElementById("progressBar"),
    progressBarTrack: document.getElementById("progressBarTrack"),
    presetTags: document.querySelectorAll(".chip-tag"),
    modeTabs: document.querySelectorAll(".mode-tab"),
    // Modal elements
    modelsModal: document.getElementById("modelsModal"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    modelSearchInput: document.getElementById("modelSearchInput"),
    modalFilterPills: document.getElementById("modalFilterPills"),
    modalModelList: document.getElementById("modalModelList"),
  };
}

/**
 * Attach UI event handlers
 */
function attachEventListeners() {
  // Settings drawer toggle
  el.settingsToggleBtn.addEventListener("click", () => {
    el.settingsDrawer.classList.toggle("open");
    if (el.settingsDrawer.classList.contains("open")) {
      el.apiKeyInput.focus();
    }
  });

  // OpenRouter API Key handling
  el.apiKeyInput.addEventListener("input", (e) => {
    state.apiKey = e.target.value.trim();
    localStorage.setItem("openrouter_api_key", state.apiKey);
    showKeySavedIndicator();
  });

  // Toggle API key visibility
  el.toggleApiKeyBtn.addEventListener("click", () => {
    const isPass = el.apiKeyInput.type === "password";
    el.apiKeyInput.type = isPass ? "text" : "password";
  });

  // Workflow mode switcher
  el.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      el.modeTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeMode = tab.dataset.mode;

      if (state.activeMode === "inpaint") {
        el.generateBtnText.textContent = "🍌 Run Nano Banana Edit";
      } else if (state.activeMode === "generate") {
        el.generateBtnText.textContent = "✨ Generate New Layer";
      } else if (state.activeMode === "separation") {
        el.generateBtnText.textContent = "✂️ Run Layer Separation";
        if (!el.promptText.value.trim()) {
          el.promptText.value = "Isolate and separate subjects and elements into clean layered groups";
        }
      }
    });
  });

  // Layer separation switch
  el.layerSeparationToggle.addEventListener("change", (e) => {
    state.layerSeparation = e.target.checked;
  });

  // Model selection & Custom model visibility toggle
  el.modelSelect.addEventListener("change", (e) => {
    const selected = e.target.value;
    state.model = selected;
    if (selected === "custom") {
      el.customModelContainer.classList.add("visible");
      el.customModelInput.focus();
    } else {
      el.customModelContainer.classList.remove("visible");
    }
    localStorage.setItem("openrouter_model", selected);
  });

  el.customModelInput.addEventListener("input", (e) => {
    state.customModel = e.target.value.trim();
    localStorage.setItem("openrouter_custom_model", state.customModel);
  });

  el.aspectRatioSelect.addEventListener("change", (e) => {
    state.aspectRatioMode = e.target.value;
    localStorage.setItem("openrouter_aspect_ratio", e.target.value);
  });

  // More Models Explorer Modal trigger
  el.moreModelsBtn.addEventListener("click", () => {
    openModelsModal();
  });

  el.closeModalBtn.addEventListener("click", () => {
    closeModelsModal();
  });

  el.modelsModal.addEventListener("click", (e) => {
    if (e.target === el.modelsModal) {
      closeModelsModal();
    }
  });

  // Modal search
  el.modelSearchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderFilteredModels();
  });

  // Modal filter pills
  el.modalFilterPills.querySelectorAll(".filter-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      el.modalFilterPills.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.activeFilter = pill.dataset.filter;
      renderFilteredModels();
    });
  });

  // Reference Image Upload
  el.refUploadArea.addEventListener("click", () => {
    el.refImageInput.click();
  });

  el.refImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      loadReferenceImageFile(file);
    }
  });

  el.clearRefBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearReferenceImage();
  });

  // Quick modifier chips
  el.presetTags.forEach((tag) => {
    tag.addEventListener("click", () => {
      const textToAppend = tag.dataset.prompt || tag.textContent.trim();
      const current = el.promptText.value.trim();
      if (!current) {
        el.promptText.value = textToAppend;
      } else {
        el.promptText.value = `${current}, ${textToAppend}`;
      }
      el.promptText.focus();
    });
  });

  // Refresh document and selection status
  el.refreshStatusBtn.addEventListener("click", () => {
    refreshDocStatus();
  });

  // Window focus auto-refreshes document status
  window.addEventListener("focus", () => {
    refreshDocStatus();
  });

  // Main Action: Run Nano Banana Edit
  el.generateBtn.addEventListener("click", () => {
    handleGenerateAction();
  });
}

/**
 * Load settings from localStorage
 */
function loadSavedSettings() {
  const savedKey = localStorage.getItem("openrouter_api_key") || localStorage.getItem("gemini_api_key") || "";
  if (savedKey) {
    state.apiKey = savedKey;
    el.apiKeyInput.value = savedKey;
  } else {
    // If no key yet, open settings drawer automatically on first launch
    el.settingsDrawer.classList.add("open");
  }

  const savedModel = localStorage.getItem("openrouter_model") || "google/gemini-nano-banana-2.1";
  if (savedModel) {
    selectModelInDropdown(savedModel);
  }

  const savedCustom = localStorage.getItem("openrouter_custom_model") || "";
  if (savedCustom) {
    state.customModel = savedCustom;
    el.customModelInput.value = savedCustom;
  }

  const savedRatio = localStorage.getItem("openrouter_aspect_ratio");
  if (savedRatio) {
    state.aspectRatioMode = savedRatio;
    el.aspectRatioSelect.value = savedRatio;
  }
}

function showKeySavedIndicator() {
  if (!el.saveKeyBadge) return;
  el.saveKeyBadge.textContent = "Saved";
  el.saveKeyBadge.style.opacity = "1";
  setTimeout(() => {
    el.saveKeyBadge.style.opacity = "0";
  }, 1800);
}

/**
 * Loads image models catalog for modal
 */
async function loadModelsCatalog() {
  try {
    state.allModels = await fetchAllImageModels();
  } catch (err) {
    console.warn("Error loading models catalog:", err);
  }
}

/**
 * Open the models explorer modal
 */
function openModelsModal() {
  el.modelsModal.classList.add("open");
  el.modelSearchInput.value = "";
  state.searchQuery = "";
  el.modelSearchInput.focus();
  renderFilteredModels();
}

function closeModelsModal() {
  el.modelsModal.classList.remove("open");
}

/**
 * Render filtered model list inside modal
 */
function renderFilteredModels() {
  const container = el.modalModelList;
  container.innerHTML = "";

  const list = state.allModels.length > 0 ? state.allModels : TOP_6_IMAGE_MODELS;

  const filtered = list.filter((m) => {
    const id = m.id.toLowerCase();
    const name = (m.name || m.id).toLowerCase();

    // Provider filter
    if (state.activeFilter !== "all") {
      if (!id.includes(state.activeFilter) && !name.includes(state.activeFilter)) {
        return false;
      }
    }

    // Search query filter
    if (state.searchQuery) {
      if (!id.includes(state.searchQuery) && !name.includes(state.searchQuery)) {
        return false;
      }
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px 10px; color: var(--text-secondary); font-size: 11px;">
        No models found matching "${state.searchQuery}".<br>
        <span style="font-size: 10px; color: var(--banana-yellow); cursor: pointer; text-decoration: underline;" id="btnUseCustomSearch">Use "${state.searchQuery}" as custom slug</span>
      </div>
    `;
    const btn = document.getElementById("btnUseCustomSearch");
    if (btn) {
      btn.addEventListener("click", () => {
        selectCustomModel(state.searchQuery);
        closeModelsModal();
      });
    }
    return;
  }

  filtered.forEach((model) => {
    const isSelected = state.model === model.id;
    const card = document.createElement("div");
    card.className = `model-item-card ${isSelected ? "selected" : ""}`;

    const providerName = model.id.split("/")[0] || "model";

    card.innerHTML = `
      <div style="display: flex; flex-direction: column; overflow: hidden;">
        <span class="model-item-name">${escapeHtml(model.name || model.id)}</span>
        <span class="model-item-id">${escapeHtml(model.id)}</span>
      </div>
      <span class="model-item-badge">${escapeHtml(providerName)}</span>
    `;

    card.addEventListener("click", () => {
      selectModelInDropdown(model.id, model.name);
      closeModelsModal();
    });

    container.appendChild(card);
  });
}

/**
 * Select a model in the dropdown, dynamically appending if not in default options
 */
function selectModelInDropdown(modelId, modelName = null) {
  state.model = modelId;
  localStorage.setItem("openrouter_model", modelId);

  // Check if already an existing option
  let found = false;
  for (let i = 0; i < el.modelSelect.options.length; i++) {
    if (el.modelSelect.options[i].value === modelId) {
      el.modelSelect.selectedIndex = i;
      found = true;
      break;
    }
  }

  // If not found in default list, create and append a clean option
  if (!found && modelId !== "custom") {
    const displayName = modelName || modelId;
    const newOption = document.createElement("option");
    newOption.value = modelId;
    newOption.textContent = `${displayName}`;
    newOption.selected = true;
    el.modelSelect.appendChild(newOption);
  }

  if (modelId === "custom") {
    el.customModelContainer.classList.add("visible");
  } else {
    el.customModelContainer.classList.remove("visible");
  }
}

function selectCustomModel(customSlug) {
  state.model = "custom";
  state.customModel = customSlug;
  el.modelSelect.value = "custom";
  el.customModelContainer.classList.add("visible");
  el.customModelInput.value = customSlug;
  localStorage.setItem("openrouter_model", "custom");
  localStorage.setItem("openrouter_custom_model", customSlug);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Handle reference image loading from file input
 */
function loadReferenceImageFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target.result;
    state.referenceImageBase64 = dataUrl;
    el.refPreviewImg.src = dataUrl;
    el.refPreviewContainer.style.display = "block";
    el.refUploadArea.style.display = "none";
  };
  reader.readAsDataURL(file);
}

function clearReferenceImage() {
  state.referenceImageBase64 = null;
  el.refImageInput.value = "";
  el.refPreviewImg.src = "";
  el.refPreviewContainer.style.display = "none";
  el.refUploadArea.style.display = "block";
}

/**
 * Checks if active document and selection exist in Photoshop
 */
async function checkPhotoshopEnvironment() {
  const doc = app.activeDocument;
  if (!doc) {
    return {
      hasDoc: false,
      hasSelection: false,
      doc: null,
      bounds: null,
      message: "No active document open in Photoshop.",
    };
  }

  let selInfo = { hasSelection: false, bounds: null };

  // Query selection property using batchPlay
  try {
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
      const width = Math.max(1, right - left);
      const height = Math.max(1, bottom - top);

      selInfo = {
        hasSelection: true,
        bounds: { left, top, right, bottom, width, height },
      };
    }
  } catch (e) {
    // Selection doesn't exist via batchPlay property
  }

  // Fallback to DOM selection bounds
  if (!selInfo.hasSelection && doc.selection) {
    try {
      const b = doc.selection.bounds;
      if (b) {
        const top = Math.round(b.top ?? b[0]);
        const left = Math.round(b.left ?? b[1]);
        const bottom = Math.round(b.bottom ?? b[2]);
        const right = Math.round(b.right ?? b[3]);
        selInfo = {
          hasSelection: true,
          bounds: {
            left,
            top,
            right,
            bottom,
            width: Math.max(1, right - left),
            height: Math.max(1, bottom - top),
          },
        };
      }
    } catch (e) {
      // No active selection
    }
  }

  return {
    hasDoc: true,
    hasSelection: selInfo.hasSelection,
    doc,
    bounds: selInfo.bounds || {
      left: 0,
      top: 0,
      right: doc.width,
      bottom: doc.height,
      width: doc.width,
      height: doc.height,
    },
  };
}

/**
 * Updates status indicator box in panel UI
 */
async function refreshDocStatus() {
  if (!el.docStatusContent) return;
  try {
    const env = await checkPhotoshopEnvironment();
    if (!env.hasDoc) {
      el.docStatusContent.innerHTML = `
        <div class="status-dot warning"></div>
        <div class="status-info">
          <span class="status-title">No Document Active</span>
          <span class="status-desc">Open an image in Photoshop to begin</span>
        </div>
      `;
      return;
    }

    if (env.hasSelection) {
      const b = env.bounds;
      el.docStatusContent.innerHTML = `
        <div class="status-dot active"></div>
        <div class="status-info">
          <span class="status-title">Selection Active (${b.width} × ${b.height}px)</span>
          <span class="status-desc">Target: [${b.left}, ${b.top}] to [${b.right}, ${b.bottom}]</span>
        </div>
      `;
    } else {
      el.docStatusContent.innerHTML = `
        <div class="status-dot idle"></div>
        <div class="status-info">
          <span class="status-title">Full Canvas Active (${env.doc.width} × ${env.doc.height}px)</span>
          <span class="status-desc">Use Marquee/Lasso to target specific region</span>
        </div>
      `;
    }
  } catch (err) {
    el.docStatusContent.innerHTML = `
      <div class="status-dot warning"></div>
      <div class="status-info">
        <span class="status-title">Status Check</span>
        <span class="status-desc">${err.message || err}</span>
      </div>
    `;
  }
}

/**
 * Exports selected area pixels as PNG bytes using photoshop.imaging
 * Wraps state access in executeAsModal
 */
async function exportSelectedAreaAsPng(doc, bounds) {
  let base64Png = null;

  await core.executeAsModal(
    async (context) => {
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

        if (!pixels || !pixels.imageData) {
          throw new Error("Unable to read image pixels from Photoshop document.");
        }

        base64Png = await imaging.encodeImageData({
          imageData: pixels.imageData,
          base64: true,
          format: "png",
        });
      } finally {
        if (pixels && pixels.imageData) {
          try {
            pixels.imageData.dispose();
          } catch (e) {
            console.warn("Error disposing imageData:", e);
          }
        }
      }
    },
    { commandName: "Export Selected Area Pixels" }
  );

  return base64Png;
}

/**
 * Creates a new layer above the current layer, inserts the generated image,
 * aligns it to original bounds, and applies Nano Banana V2 Layer Separation.
 * Wrapped in photoshop.core.executeAsModal.
 */
async function insertAndAlignGeneratedImage(resultBytes, bounds, hasSelection, promptText, applySeparation) {
  await core.executeAsModal(
    async (context) => {
      const doc = app.activeDocument;
      if (!doc) throw new Error("No active document found in Photoshop.");

      // 1. Write the PNG buffer to a temporary file in UXP storage
      const tempFolder = await storage.localFileSystem.getTemporaryFolder();
      const tempFileName = `nanobanana_${Date.now()}.png`;
      const tempFile = await tempFolder.createFile(tempFileName, { overwrite: true });

      const rawBuffer = resultBytes.buffer ? resultBytes.buffer : resultBytes;
      await tempFile.write(rawBuffer, { format: storage.formats.binary });
      const sessionToken = storage.localFileSystem.createSessionToken(tempFile);

      // 2. Nano Banana V2 Layer Separation: Backup selection to temporary channel
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
        } catch (e) {
          console.warn("Could not backup selection channel:", e);
        }
      }

      // Clear selection marquee so placeEvent places cleanly without auto-cropping
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
      } catch (err) {}

      // 3. BatchPlay: Place the generated image file as a new layer
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

      // The placed layer is now the active layer
      const placedLayer = doc.activeLayers[0];
      if (placedLayer) {
        try {
          const cleanPrompt = promptText.trim().replace(/[\r\n]+/g, " ");
          placedLayer.name = `Nano Banana: ${cleanPrompt.slice(0, 24)}${cleanPrompt.length > 24 ? "..." : ""}`;
        } catch (e) {}

        // 4. BatchPlay: Align and scale to original selection bounds
        if (bounds && bounds.width && bounds.height) {
          const layerBounds = placedLayer.bounds;
          const curW = Math.max(1, layerBounds.right - layerBounds.left);
          const curH = Math.max(1, layerBounds.bottom - layerBounds.top);

          const scaleX = (bounds.width / curW) * 100;
          const scaleY = (bounds.height / curH) * 100;

          const targetCenterX = bounds.left + bounds.width / 2;
          const targetCenterY = bounds.top + bounds.height / 2;
          const curCenterX = layerBounds.left + curW / 2;
          const curCenterY = layerBounds.top + curH / 2;

          const deltaX = targetCenterX - curCenterX;
          const deltaY = targetCenterY - curCenterY;

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
                  _horizontal: { _unit: "pixelsUnit", _value: deltaX },
                  _vertical: { _unit: "pixelsUnit", _value: deltaY },
                },
                width: { _unit: "percentUnit", _value: scaleX },
                height: { _unit: "percentUnit", _value: scaleY },
              },
            ],
            { synchronousExecution: true }
          );
        }

        // 5. Nano Banana V2 Layer Separation: Re-apply selection & create automated Layer Mask
        if (backedUpSelection) {
          try {
            await action.batchPlay(
              [
                {
                  _obj: "set",
                  _target: [{ _ref: "channel", _property: "selection" }],
                  to: { _ref: "channel", _name: tempChannelName },
                },
              ],
              { synchronousExecution: true }
            );

            await action.batchPlay(
              [
                {
                  _obj: "make",
                  null: { _ref: "layerMask" },
                  at: { _enum: "ordinal", _value: "target" },
                  using: { _enum: "userMaskSet", _value: "revealSelection" },
                },
              ],
              { synchronousExecution: true }
            );

            await action.batchPlay(
              [
                {
                  _obj: "delete",
                  _target: [{ _ref: "channel", _name: tempChannelName }],
                },
              ],
              { synchronousExecution: true }
            );

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
          } catch (maskErr) {
            console.warn("Layer separation mask error:", maskErr);
          }
        }
      }

      // Clean up temp file
      try {
        await tempFile.delete();
      } catch (e) {}
    },
    { commandName: "Nano Banana: Edit with Layer Separation" }
  );
}

/**
 * Resolves the effective model slug from dropdown or custom input
 */
function getSelectedModelSlug() {
  const selected = el.modelSelect.value;
  if (selected === "custom") {
    const custom = el.customModelInput.value.trim();
    if (!custom) {
      throw new Error("Custom model selected, but no model slug was entered.");
    }
    return custom;
  }
  return selected;
}

/**
 * Primary workflow executor triggered by 'Run Nano Banana Edit'
 */
async function handleGenerateAction() {
  if (state.isGenerating) return;

  const apiKey = el.apiKeyInput.value.trim();
  const prompt = el.promptText.value.trim();
  const negativePrompt = el.negativePromptText.value.trim();
  const aspectRatioMode = el.aspectRatioSelect.value;
  const applySeparation = el.layerSeparationToggle.checked;

  // Validation
  if (!apiKey) {
    showStatus("Please enter your OpenRouter API key in settings (⚙️ icon at top right).", "error");
    el.settingsDrawer.classList.add("open");
    el.apiKeyInput.focus();
    return;
  }

  if (!prompt) {
    showStatus("Please enter an edit prompt describing what to change.", "error");
    el.promptText.focus();
    return;
  }

  let effectiveModel;
  try {
    effectiveModel = getSelectedModelSlug();
  } catch (modelErr) {
    showStatus(modelErr.message, "error");
    el.customModelInput.focus();
    return;
  }

  setLoading(true);

  try {
    // Step 1: Check document and selection
    showStatus("Reading Photoshop canvas & active selection...", "info", 10);
    const env = await checkPhotoshopEnvironment();
    if (!env.hasDoc) {
      throw new Error("No active document in Photoshop. Please open an image first.");
    }

    const { doc, hasSelection, bounds } = env;

    // Step 2: Export selected area pixels
    let selectionBase64 = null;
    if (hasSelection) {
      showStatus(`Exporting selection context (${bounds.width}×${bounds.height}px)...`, "info", 25);
      selectionBase64 = await exportSelectedAreaAsPng(doc, bounds);
    }

    // Step 3: Aspect Ratio
    let effectiveAspectRatio = "1:1";
    if (aspectRatioMode === "auto") {
      effectiveAspectRatio = calculateClosestAspectRatio(bounds.width, bounds.height);
    } else {
      effectiveAspectRatio = aspectRatioMode;
    }

    // Step 4: OpenRouter API Call
    showStatus(`Calling ${effectiveModel.split("/")[1] || effectiveModel}...`, "info", 45);

    const apiResult = await generateImage({
      apiKey,
      prompt,
      negativePrompt,
      model: effectiveModel,
      aspectRatio: effectiveAspectRatio,
      referenceImageBase64: state.referenceImageBase64,
      selectionImageBase64: selectionBase64,
    });

    // Step 5: Placement & Layer Separation
    showStatus("Placing Smart Object & applying Layer Separation...", "info", 80);

    await insertAndAlignGeneratedImage(apiResult.bytes, bounds, hasSelection, prompt, applySeparation);

    showStatus("Complete! Non-destructive edit layer created.", "success", 100);
    refreshDocStatus();
  } catch (err) {
    console.error("Nano Banana Edit Error:", err);
    showStatus(err.message || String(err), "error");
  } finally {
    setLoading(false);
  }
}

/**
 * Update UI Loading state
 */
function setLoading(loading) {
  state.isGenerating = loading;
  el.generateBtn.disabled = loading;
  if (loading) {
    if (el.generateSpinner) el.generateSpinner.style.display = "inline-block";
    el.generateBtnText.textContent = "Processing Edit...";
    if (el.progressBarTrack) el.progressBarTrack.style.display = "block";
  } else {
    if (el.generateSpinner) el.generateSpinner.style.display = "none";
    if (state.activeMode === "inpaint") {
      el.generateBtnText.textContent = "🍌 Run Nano Banana Edit";
    } else {
      el.generateBtnText.textContent = "✨ Generate New Layer";
    }
    setTimeout(() => {
      if (el.progressBarTrack) el.progressBarTrack.style.display = "none";
      if (el.progressBar) el.progressBar.style.width = "0%";
    }, 2000);
  }
}

/**
 * Display status message and progress percentage
 */
function showStatus(msg, type = "info", progressPercent = null) {
  el.statusMessage.textContent = msg;
  el.statusMessage.className = `status-msg ${type}`;
  el.statusMessage.style.display = "block";

  if (progressPercent !== null && el.progressBar) {
    if (el.progressBarTrack) el.progressBarTrack.style.display = "block";
    el.progressBar.style.width = `${progressPercent}%`;
  }
}
