# Astria AI Generative Fill for Adobe Photoshop (UXP)

A native Adobe Photoshop UXP panel plugin replicating an AI generative-fill workflow (similar to Nano Banana Pro 2) powered by **OpenRouter's Image Generation API**.

---

## ✨ Features

- **OpenRouter Image Generation API**: Targets `https://openrouter.ai/api/v1/images` using unified standard request shapes, bearer token authentication, and app identification headers (`HTTP-Referer`, `X-Title`).
- **Flexible Model Selection**:
  - `google/nano-banana-2-flash-image` (default)
  - `google/nano-banana`
  - `openai/gpt-image-2`
  - **Custom Model**: Type any supported OpenRouter image model slug directly (e.g. `black-forest-labs/flux-1-schnell`).
- **Native Photoshop Marquee Selection Detection**: Automatically detects active document dimensions and bounding box coordinates of any active selection (Rectangular Marquee, Lasso, etc.).
- **Photoshop Imaging API**: Extracts selected pixel regions directly via `photoshop.imaging.getPixels` and compresses them to PNG format via `encodeImageData` for image-to-image conditioning.
- **Smart Placement & Alignment**: Uses `photoshop.action.batchPlay` and `placeEvent` inside `photoshop.core.executeAsModal` to create a new layer above the active layer and mathematically scale and align it to the original selection bounds.
- **Reference Image Support**: Upload local reference/conditioning images (`input_references`) or automatically condition generation using the active selection.
- **Aspect Ratio Auto-Calculation**: Dynamically calculates the optimal aspect ratio (`1:1`, `4:3`, `3:4`, `16:9`, `9:16`) based on the active selection dimensions.
- **Photoshop Dark Mode UI**: Styled to match Photoshop's native workspace with live document status, prompt presets, API key obfuscation, and progress feedback.

---

## 📁 Project Structure

```
Astria PS Plugin/
├── manifest.json       # UXP Manifest v5 configured for PS >= 24.0, domain: https://openrouter.ai
├── index.html          # Clean dark-mode panel interface with OpenRouter model selector
├── styles.css          # Photoshop-native dark UI styling & animations
├── main.js             # Core Photoshop workflow logic, batchPlay & executeAsModal
├── api.js              # OpenRouter API client (POST https://openrouter.ai/api/v1/images)
├── icons/              # Plugin icons for Photoshop panel toolbar
│   ├── icon-23.png
│   └── icon-48.png
└── README.md           # Documentation and setup guide
```

---

## 🚀 Quick Start Guide (How to Load in Photoshop)

### Prerequisites

1. **Adobe Photoshop 2023 or newer** (v24.0+).
2. **Adobe UXP Developer Tool (UDT)**:
   - Install the free **UXP Developer Tool** from the Creative Cloud Desktop app (under *Apps > Categories > Developer tools*).
3. **OpenRouter API Key**:
   - Get your API key from [OpenRouter Keys](https://openrouter.ai/keys).

### Loading the Plugin

1. Launch **Adobe Photoshop**.
2. Open the **UXP Developer Tool (UDT)**.
3. Click **Add Plugin** in the top right.
4. Select the `manifest.json` file inside this directory (`Astria PS Plugin/manifest.json`).
5. In UDT, find **Astria AI Generative Fill**, click the `•••` actions menu, and select **Load** (or **Watch** during development).
6. In Photoshop, open the panel via:
   **Plugins > Astria AI Generative Fill > AI Generative Fill**
7. Dock the panel anywhere in your Photoshop workspace.

---

## 🎨 How to Use

1. **Enter API Key**: Paste your OpenRouter API key (`sk-or-v1-...`) in the top field. It is saved in `localStorage`.
2. **Select Model**: Choose from `google/nano-banana-2-flash-image`, `google/nano-banana`, `openai/gpt-image-2`, or choose **Custom model...** to enter your own model slug.
3. **Open an Image**: Open any photo or create a canvas in Photoshop.
4. **Make a Selection**: Use the **Rectangular Marquee Tool (M)** or **Lasso Tool (L)** to select an area you want to fill or modify.
   - The panel indicator will reflect the active selection coordinates (e.g. `Selection Active (512 × 512px)`).
5. **Enter Prompt**: Describe what you want generated.
6. **Click '✨ Generate to New Layer'**:
   - The plugin exports the selected area pixels via `photoshop.imaging`.
   - Sends the request to `https://openrouter.ai/api/v1/images`.
   - Creates a new layer above your active layer via `batchPlay`.
   - Aligns and scales the generated image to fit the bounding box.
