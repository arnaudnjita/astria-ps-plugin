/**
 * main.js - Core Photoshop Interaction & UI Controller for AI Generative Fill
 * Backend: OpenRouter API with Nano Banana V2 Layer Separation
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
};

// UI Elements Cache
let el = {};

const SVG_EYE_OPEN = "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z";
const SVG_EYE_CLOSED = "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z";

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
    apiKeyInput: document.getElementById("apiKeyInput"),
    toggleApiKeyBtn: document.getElementById("toggleApiKeyBtn"),
    eyeIconPath: document.querySelector("#eyeIcon path"),
    saveKeyBadge: document.getElementById("saveKeyBadge"),
    modelSelect: document.getElementById("modelSelect"),
    otherModelsOptGroup: document.getElementById("otherModelsOptGroup"),
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
    docStatusContent: document.getElementById("docStatusContent"),
    refreshStatusBtn: document.getElementById("refreshStatusBtn"),
    generateBtn: document.getElementById("generateBtn"),
    generateSpinner: document.getElementById("generateSpinner"),
    sparkleBtnIcon: document.getElementById("sparkleBtnIcon"),
    generateBtnText: document.getElementById("generateBtnText"),
    statusMessage: document.getElementById("statusMessage"),
    progressBar: document.getElementById("progressBar"),
    progressBarTrack: document.getElementById("progressBarTrack"),
    presetTags: document.querySelectorAll(".preset-tag"),
    // Modal elements
    modelsModal: document.getElementById("modelsModal"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    modelSearchInput: document.getElementById("modelSearchInput"),
    modalFilterPills: document.getElementById("modalFilterPills"),
    modalModelList: document.getElementById("modalModelList"),
    modelsCountBadge: document.getElementById("modelsCountBadge"),
  };
}

/**
 * Attach UI event handlers
 */
function attachEventListeners() {
  // OpenRouter API Key handling
  el.apiKeyInput.addEventListener("input", (e) => {
    state.apiKey = e.target.value.trim();
    localStorage.setItem("openrouter_api_key", state.apiKey);
    showKeySavedIndicator();
  });

  // Toggle API key visibility using SVG
  el.toggleApiKeyBtn.addEventListener("click", () => {
    const isPass = el.apiKeyInput.type === "password";
    el.apiKeyInput.type = isPass ? "text" : "password";
    if (el.eyeIconPath) {
      el.eyeIconPath.setAttribute("d", isPass ? SVG_EYE_CLOSED : SVG_EYE_OPEN);
    }
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

  // Preset prompt chips
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

  // Main Action: Generate to New Layer
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
  el.saveKeyBadge.classList.add("visible");
  setTimeout(() => {
    el.saveKeyBadge.classList.remove("visible");
  }, 1800);
}

/**
 * Loads image models catalog for modal
 */
async function loadModelsCatalog() {
  try {
    state.allModels = await fetchAllImageModels();
    if (el.modelsCountBadge) {
      el.modelsCountBadge.textContent = `${state.allModels.length} Models`;
    }
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
      <div style="text-align: center; padding: 24px 10px; color: var(--text-tertiary); font-size: 11px;">
        No models found matching "${state.searchQuery}".<br>
        <span style="font-size: 10px; color: var(--accent-blue); cursor: pointer;" id="btnUseCustomSearch">Use "${state.searchQuery}" as custom slug</span>
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
      <div class="model-info-block">
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

  // If not found in default list, add to Other Models optgroup
  if (!found && modelId !== "custom") {
    el.otherModelsOptGroup.style.display = "block";
    const displayName = modelName || modelId;
    const newOption = document.createElement("option");
    newOption.value = modelId;
    newOption.textContent = `${displayName}`;
    newOption.selected = true;
    el.otherModelsOptGroup.appendChild(newOption);
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
        <div class="status-indicator warning"></div>
        <div class="status-text">
          <strong>No Active Document</strong>
          <span>Open or create an image in Photoshop</span>
        </div>
      `;
      return;
    }

    if (env.hasSelection) {
      const b = env.bounds;
      el.docStatusContent.innerHTML = `
        <div class="status-indicator active"></div>
        <div class="status-text">
          <strong>Selection Active (${b.width} × ${b.height}px)</strong>
          <span>Area: [${b.left}, ${b.top}] to [${b.right}, ${b.bottom}]</span>
        </div>
      `;
    } else {
      el.docStatusContent.innerHTML = `
        <div class="status-indicator active-muted"></div>
        <div class="status-text">
          <strong>Document Ready (${env.doc.width} × ${env.doc.height}px)</strong>
          <span>Full canvas targeted (or make a selection)</span>
        </div>
      `;
    }
  } catch (err) {
    el.docStatusContent.innerHTML = `
      <div class="status-indicator warning"></div>
      <div class="status-text">
        <strong>Status Check</strong>
        <span>${err.message || err}</span>
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

        // Encode image data directly to PNG format
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
 * aligns it to original bounds, and applies Layer Separation (smart mask)
 * matching the Nano Banana V2 workflow.
 * Wrapped in photoshop.core.executeAsModal.
 */
async function insertAndAlignGeneratedImage(resultBytes, bounds, hasSelection, promptText) {
  await core.executeAsModal(
    async (context) => {
      const doc = app.activeDocument;
      if (!doc) throw new Error("No active document found in Photoshop.");

      // 1. Write the PNG buffer to a temporary file in UXP storage
      const tempFolder = await storage.localFileSystem.getTemporaryFolder();
      const tempFileName = `astria_gen_${Date.now()}.png`;
      const tempFile = await tempFolder.createFile(tempFileName, { overwrite: true });

      const rawBuffer = resultBytes.buffer ? resultBytes.buffer : resultBytes;
      await tempFile.write(rawBuffer, { format: storage.formats.binary });
      const sessionToken = storage.localFileSystem.createSessionToken(tempFile);

      // 2. Nano Banana V2 Layer Separation: If an active selection exists,
      // backup selection to temporary alpha channel before clearing for placement
      let backedUpSelection = false;
      const tempChannelName = `__AI_Mask_${Date.now()}`;
      if (hasSelection) {
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
          placedLayer.name = `AI Gen: ${cleanPrompt.slice(0, 24)}${cleanPrompt.length > 24 ? "..." : ""}`;
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
            // Restore selection from backup channel
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

            // Create Layer Mask revealing the exact selection shape
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

            // Clean up temporary alpha channel
            await action.batchPlay(
              [
                {
                  _obj: "delete",
                  _target: [{ _ref: "channel", _name: tempChannelName }],
                },
              ],
              { synchronousExecution: true }
            );

            // Clear selection marquee when done
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

      // 6. Clean up temporary file
      try {
        await tempFile.delete();
      } catch (e) {
        // Best effort cleanup
      }
    },
    { commandName: "AI Generative Fill: Layer Separation" }
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
      throw new Error("Custom model selected, but no model slug was entered. Please enter a model slug like 'openai/gpt-image-2'.");
    }
    return custom;
  }
  return selected;
}

/**
 * Primary workflow executor triggered by 'Generate to New Layer'
 */
async function handleGenerateAction() {
  if (state.isGenerating) return;

  const apiKey = el.apiKeyInput.value.trim();
  const prompt = el.promptText.value.trim();
  const negativePrompt = el.negativePromptText.value.trim();
  const aspectRatioMode = el.aspectRatioSelect.value;

  // Validation
  if (!apiKey) {
    showStatus("Please enter your OpenRouter API key (sk-or-...).", "error");
    el.apiKeyInput.focus();
    return;
  }

  if (!prompt) {
    showStatus("Please enter a description / prompt for the generation.", "error");
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
    showStatus("Analyzing Photoshop document and selection...", "info", 10);
    const env = await checkPhotoshopEnvironment();
    if (!env.hasDoc) {
      throw new Error("No active document in Photoshop. Please open an image or create a canvas first.");
    }

    const { doc, hasSelection, bounds } = env;

    // Step 2: If selection exists, export selected area pixels as PNG bytes
    let selectionBase64 = null;
    if (hasSelection) {
      showStatus(`Exporting selected region (${bounds.width}×${bounds.height}px)...`, "info", 25);
      selectionBase64 = await exportSelectedAreaAsPng(doc, bounds);
    }

    // Step 3: Determine Aspect Ratio
    let effectiveAspectRatio = "1:1";
    if (aspectRatioMode === "auto") {
      effectiveAspectRatio = calculateClosestAspectRatio(bounds.width, bounds.height);
    } else {
      effectiveAspectRatio = aspectRatioMode;
    }

    // Step 4: Send request to OpenRouter API
    showStatus(`Sending request to OpenRouter (${effectiveModel}, ${effectiveAspectRatio})...`, "info", 45);

    const apiResult = await generateImage({
      apiKey,
      prompt,
      negativePrompt,
      model: effectiveModel,
      aspectRatio: effectiveAspectRatio,
      referenceImageBase64: state.referenceImageBase64,
      selectionImageBase64: selectionBase64,
    });

    // Step 5: Insert generated image, align bounds, and apply Layer Separation
    showStatus("Applying Layer Separation & alignment in Photoshop...", "info", 80);

    await insertAndAlignGeneratedImage(apiResult.bytes, bounds, hasSelection, prompt);

    showStatus("Generation complete! Layer created with non-destructive layer mask.", "success", 100);
    refreshDocStatus();
  } catch (err) {
    console.error("Generative Fill Error:", err);
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
    if (el.sparkleBtnIcon) el.sparkleBtnIcon.style.display = "none";
    if (el.generateSpinner) el.generateSpinner.style.display = "inline-block";
    el.generateBtnText.textContent = "Generating...";
    if (el.progressBarTrack) el.progressBarTrack.style.display = "block";
  } else {
    if (el.generateSpinner) el.generateSpinner.style.display = "none";
    if (el.sparkleBtnIcon) el.sparkleBtnIcon.style.display = "inline-block";
    el.generateBtnText.textContent = "Generate to New Layer";
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
