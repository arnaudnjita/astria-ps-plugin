/**
 * api.js - OpenRouter Image Generation API Client for Adobe Photoshop UXP
 *
 * Endpoint: https://openrouter.ai/api/v1/images
 */

const OPENROUTER_IMAGES_ENDPOINT = "https://openrouter.ai/api/v1/images";
const OPENROUTER_MODELS_ENDPOINT = "https://openrouter.ai/api/v1/images/models";
const APP_REFERER = "https://astria.ai/photoshop-plugin";
const APP_TITLE = "Astria AI Generative Fill (Photoshop UXP)";

/**
 * Top 6 curated image generation models for high consistency & quality
 */
const TOP_6_IMAGE_MODELS = [
  {
    id: "openai/gpt-image-2.5-sunburst",
    name: "GPT Image 2.5 Sunburst",
    badge: "Trending",
    provider: "OpenAI"
  },
  {
    id: "google/gemini-nano-banana-2.1",
    name: "Google: Nano Banana 2.1 (Fast & Consistent)",
    badge: "Recommended",
    provider: "Google"
  },
  {
    id: "black-forest-labs/flux-3-image",
    name: "Black Forest Labs: FLUX 3 Image (Photoreal)",
    badge: "Photoreal",
    provider: "FLUX"
  },
  {
    id: "openai/gpt-image-2",
    name: "OpenAI: GPT Image 2 (High Adherence)",
    badge: "Quality",
    provider: "OpenAI"
  },
  {
    id: "bytedance-seed/seedream-5-0-pro",
    name: "ByteDance: Seedream 5.0 Pro (Artistic Detail)",
    badge: "Vivid",
    provider: "ByteDance"
  },
  {
    id: "krea/k3-edit",
    name: "Krea: K3 Edit (Inpainting & Generative Fill)",
    badge: "Inpaint",
    provider: "Krea"
  },
  {
    id: "recraft/recraft-v4.1",
    name: "Recraft: Recraft v4.1 (Design & Precision)",
    badge: "Design",
    provider: "Recraft"
  }
];

/**
 * Maps pixel dimensions (e.g. selection or canvas bounds) to the closest supported
 * aspect ratio ("1:1", "3:4", "4:3", "9:16", "16:9").
 *
 * @param {number} width
 * @param {number} height
 * @returns {string} Closest standard aspect ratio
 */
function calculateClosestAspectRatio(width, height) {
  if (!width || !height || width <= 0 || height <= 0) {
    return "1:1";
  }
  const ratio = width / height;

  const supported = [
    { name: "16:9", val: 16 / 9 },
    { name: "4:3",  val: 4 / 3 },
    { name: "1:1",  val: 1.0 },
    { name: "3:4",  val: 3 / 4 },
    { name: "9:16", val: 9 / 16 },
  ];

  let closest = supported[0];
  let minDiff = Math.abs(ratio - supported[0].val);

  for (let i = 1; i < supported.length; i++) {
    const diff = Math.abs(ratio - supported[i].val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = supported[i];
    }
  }

  return closest.name;
}

/**
 * Converts a Base64 string into a Uint8Array byte buffer.
 *
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function base64ToUint8Array(base64String) {
  const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, "").trim();
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Ensures image data has the data:image/png;base64 data URL prefix.
 *
 * @param {string} str
 * @returns {string}
 */
function ensureDataUrlPrefix(str) {
  if (!str) return "";
  if (str.startsWith("data:")) {
    return str;
  }
  return `data:image/png;base64,${str}`;
}

/**
 * Fetches all available image models from OpenRouter API with bundled catalog fallback
 *
 * @returns {Promise<Array<{ id: string, name: string, description?: string }>>}
 */
async function fetchAllImageModels() {
  try {
    const res = await fetch(OPENROUTER_MODELS_ENDPOINT);
    if (res.ok) {
      const json = await res.json();
      const list = json.data || json;
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    console.warn("Dynamic models fetch failed, using cached list:", err);
  }

  // Fallback list of models
  return [
    { id: "google/gemini-nano-banana-2.1", name: "Google: Nano Banana 2.1" },
    { id: "black-forest-labs/flux-3-image", name: "Black Forest Labs: FLUX 3 Image" },
    { id: "black-forest-labs/flux-3-image-klein", name: "Black Forest Labs: FLUX 3 Image Klein" },
    { id: "openai/gpt-image-2", name: "OpenAI: GPT Image 2" },
    { id: "openai/gpt-image-2.5-flare", name: "OpenAI: GPT Image 2.5 Flare" },
    { id: "openai/gpt-image-2.5-sunburst", name: "OpenAI: GPT Image 2.5 Sunburst" },
    { id: "bytedance-seed/seedream-5-0-pro", name: "ByteDance Seed: Seedream 5.0 Pro" },
    { id: "bytedance-seed/seedream-5-0-flash", name: "ByteDance Seed: Seedream 5.0 Flash" },
    { id: "krea/k3-edit", name: "Krea: K3 Edit" },
    { id: "krea/krea-2-large", name: "Krea: Krea 2 Large" },
    { id: "recraft/recraft-v4.1", name: "Recraft: Recraft V4.1" },
    { id: "recraft/recraft-v4.1-flash", name: "Recraft: Recraft V4.1 Flash" },
    { id: "recraft/recraft-v4-vector", name: "Recraft: Recraft V4 Vector" },
    { id: "qwen/qwen-image-2.1-pro", name: "Qwen: Qwen Image 2.1 Pro" },
    { id: "qwen/qwen-image-2.1-turbo", name: "Qwen: Qwen Image 2.1 Turbo" },
    { id: "sourceful/riverflow-v2.6-pro", name: "Sourceful: Riverflow V2.6 Pro" },
    { id: "tencent/hy-image-v3.5-preview", name: "Tencent: Hy Image 3.5 Preview" },
    { id: "x-ai/grok-imagine-image-2.0", name: "xAI: Grok Imagine Image 2.0" },
    { id: "microsoft/mai-image-2.6", name: "Microsoft: MAI Image 2.6" },
    { id: "google/gemini-3.1-flash-image", name: "Google: Gemini 3.1 Flash Image" }
  ];
}

/**
 * Calls OpenRouter's Image Generation API (POST /api/v1/images).
 *
 * @param {Object} options
 * @param {string} options.apiKey - OpenRouter API key (sk-or-...)
 * @param {string} options.prompt - Main image generation prompt
 * @param {string} [options.negativePrompt] - Negative prompt
 * @param {string} [options.model="google/gemini-nano-banana-2.1"] - Selected model slug
 * @param {string} [options.aspectRatio="1:1"] - Preferred aspect ratio
 * @param {string} [options.referenceImageBase64] - Optional user reference image
 * @param {string} [options.selectionImageBase64] - Optional selection area pixels image
 * @returns {Promise<{ bytes: Uint8Array, base64: string, mediaType: string }>}
 */
async function generateImage({
  apiKey,
  prompt,
  negativePrompt = "",
  model = "google/gemini-nano-banana-2.1",
  aspectRatio = "1:1",
  referenceImageBase64 = null,
  selectionImageBase64 = null,
}) {
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new Error(
      "Missing OpenRouter API Key. Please provide a valid OpenRouter key in the panel settings."
    );
  }

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error("Prompt is required. Please describe the image you wish to generate.");
  }

  const trimmedKey = apiKey.trim();
  let fullPrompt = prompt.trim();
  if (negativePrompt && negativePrompt.trim() !== "") {
    fullPrompt += `\nNegative prompt (avoid): ${negativePrompt.trim()}`;
  }

  // Normalization for legacy / alias model IDs
  let effectiveModel = model.trim();
  if (effectiveModel === "google/nano-banana-2-flash-image" || effectiveModel === "google/nano-banana") {
    effectiveModel = "google/gemini-nano-banana-2.1";
  }

  // Determine conditioning/reference image if available
  const contextImage = referenceImageBase64 || selectionImageBase64;
  const inputReferences = [];
  if (contextImage) {
    inputReferences.push(ensureDataUrlPrefix(contextImage));
  }

  // Construct request payload according to OpenRouter's /api/v1/images schema
  const payload = {
    model: effectiveModel,
    prompt: fullPrompt,
    n: 1,
  };

  if (aspectRatio && aspectRatio !== "auto") {
    payload.aspect_ratio = aspectRatio;
  }

  if (inputReferences.length > 0) {
    payload.input_references = inputReferences;
  }

  const headers = {
    "Authorization": `Bearer ${trimmedKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": APP_REFERER,
    "X-Title": APP_TITLE,
  };

  let response;
  try {
    response = await fetch(OPENROUTER_IMAGES_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    throw new Error(
      `Network connection failed: ${netErr.message || netErr}. Check your connection and UXP manifest permissions.`
    );
  }

  const responseText = await response.text();
  let json;
  try {
    json = JSON.parse(responseText);
  } catch (parseErr) {
    throw new Error(
      `Invalid response from OpenRouter (HTTP ${response.status}): ${responseText.slice(0, 200)}`
    );
  }

  // Handle errors from OpenRouter
  if (!response.ok) {
    const errorDetails = json.error?.message || json.error || `HTTP ${response.status}`;
    
    // If input_references caused an error on a model that doesn't support them, retry once with text-only
    if (payload.input_references && response.status === 400 && String(errorDetails).toLowerCase().includes("reference")) {
      console.warn("Model does not support input_references, retrying with text prompt only...");
      return await generateImage({
        apiKey,
        prompt,
        negativePrompt,
        model: effectiveModel,
        aspectRatio,
        referenceImageBase64: null,
        selectionImageBase64: null,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication Failed (${response.status}): Invalid OpenRouter API Key. Please verify your key at https://openrouter.ai/keys.`
      );
    } else if (response.status === 402) {
      throw new Error(
        "Insufficient OpenRouter Credits (402). Please top up your account balance at https://openrouter.ai/credits."
      );
    } else if (response.status === 429) {
      throw new Error(
        "OpenRouter Rate Limit Exceeded (429). Please wait a moment before trying again."
      );
    }

    throw new Error(`OpenRouter API Error: ${errorDetails}`);
  }

  // Parse result image data
  const data = json.data;
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error("OpenRouter did not return any image data. Please check your prompt and model.");
  }

  const firstItem = data[0];

  // Case 1: OpenRouter returned base64 image data
  if (firstItem.b64_json) {
    const b64 = firstItem.b64_json;
    const mediaType = firstItem.media_type || "image/png";
    const bytes = base64ToUint8Array(b64);
    return {
      bytes,
      base64: b64,
      mediaType,
    };
  }

  // Case 2: OpenRouter returned an image URL
  if (firstItem.url) {
    try {
      const imgRes = await fetch(firstItem.url);
      const imgBuffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(imgBuffer);
      return {
        bytes,
        base64: "",
        mediaType: firstItem.media_type || "image/png",
      };
    } catch (urlErr) {
      throw new Error(`Failed to download generated image from returned URL: ${urlErr.message}`);
    }
  }

  throw new Error("Unrecognized image data format in OpenRouter response.");
}

// Export for CommonJS (UXP require) and global browser environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TOP_6_IMAGE_MODELS,
    generateImage,
    calculateClosestAspectRatio,
    base64ToUint8Array,
    ensureDataUrlPrefix,
    fetchAllImageModels,
  };
}
if (typeof window !== "undefined") {
  window.AstriaAPI = {
    TOP_6_IMAGE_MODELS,
    generateImage,
    calculateClosestAspectRatio,
    base64ToUint8Array,
    ensureDataUrlPrefix,
    fetchAllImageModels,
  };
}
