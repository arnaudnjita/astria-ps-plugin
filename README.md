# Astria Nano-Banana Pro (Re-engineered with OpenRouter AI)

A 100% authentic Photoshop plugin re-engineered using REA (Reverse Engineer Anything) from the official Astria Nano-Banana CCX package (`v2.0.56`). Retains the exact sleek UI and UX from the demo video while routing all image generation models through **OpenRouter's Unified Image Generation API**.

---

## ✨ Highlights & Architecture

- **Pixel-Perfect Authentic UI**: Runs the genuine Nano-Banana Pro v2 React 18, Radix UI, Lucide icons, and Tailwind styling inside an embedded Photoshop `<webview>` panel.
- **Astria OAuth Decoupled**: Completely bypasses Astria cloud authentication. No Astria account or subscription required.
- **Direct OpenRouter Integration**: Powered by `https://openrouter.ai/api/v1/images` with instant API key storage in UXP Secure Storage.
- **Top 6 Premier Image Models + 60+ Extended Catalog**:
  1. **GPT Image 2.5 Sunburst** (`openai/gpt-image-2.5`)
  2. **Nano-Banana 2.1 Pro** (`google/gemini-2.0-flash-exp:free`)
  3. **FLUX.3 Pro** (`black-forest-labs/flux-1.1-pro`)
  4. **Seedream 5.0 Pro** (`bytedance-seed/seedream-4.5`)
  5. **Recraft V4.1 Vector & 2D** (`recraft/recraft-20b`)
  6. **Krea 3.0 Realtime Edit** (`krea/k3-edit`)
  - *Extended*: GPT Image 2, Riverflow 2.6 Pro, Midjourney v6.1, SD 3.5 Large, and more!
- **Photoshop Non-Destructive Workflow**:
  - Automatically captures document selection bounds and aspect ratios.
  - Places generated images as non-destructive **Smart Objects**.
  - Applies automated **Reveal Selection Layer Masks** matching Photoshop's native Generative Fill.
  - Names layer with prompt description and records full prompt history.

---

## 📁 Repository Structure

```
Astria PS Plugin/
├── manifest.json              # UXP Manifest v5 (<webview> with localAndRemote bridge)
├── index.html                 # Photoshop UXP Host document mounting the WebView
├── style.css                  # Host view styles
├── webview/                   # Authentic React 18 + Tailwind frontend
│   ├── index.html             # WebView entrypoint
│   └── assets/
│       ├── app.js             # React bundle with Radix UI, Lucide, OpenRouter dialog
│       └── index.css          # Tailwind & dark theme styling
├── webviewBridge.min.js       # Protocol 1 RPC bridge connecting WebView to Photoshop
├── geminiSdk.min.js           # OpenRouter image generation engine & key management
├── auth.min.js                # Instant authentication provider
├── main.min.js                # Photoshop imaging, selection bounds, Smart Object placement
├── layeredComposition.min.js  # Layered mask & composition planner
├── promptHistory.min.js       # Starred prompts and prompt history manager
└── icons/                     # High-DPI dark and light toolbar icons
```

---

## 🚀 Quick Setup & Usage in Photoshop

### 1. Requirements
* **Adobe Photoshop 2024–2026** (v24.0+).
* **Adobe UXP Developer Tool (UDT)** (available free via Creative Cloud Desktop under *Apps > Developer tools*).
* An **OpenRouter API Key** from [openrouter.ai/keys](https://openrouter.ai/keys).

### 2. Loading the Plugin
1. Open the **Adobe UXP Developer Tool (UDT)**.
2. Click **Add Plugin** in the top right.
3. Select `manifest.json` located in `Astria PS Plugin/manifest.json`.
4. In UDT, find **Astria Nano-Banana**, click `•••`, and choose **Load** (or **Reload**).
5. In Photoshop, open **Plugins > Astria Nano-Banana > Astria Nano-Banana**.
6. Dock the panel anywhere in your Photoshop workspace.

### 3. Generating Images
1. On first load, paste your OpenRouter API Key (`sk-or-v1-...`) in the key dialog and click **Save key**.
2. Make any selection on your canvas (using Rectangular Marquee `M` or Lasso `L`).
3. (Optional) Drag reference images into the reference tray or click **Add image**.
4. Type your prompt (e.g., *"Replace the earring with an ornate diamond drop earring"*).
5. Click the white generate pill button **`↑`** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. The generated image will appear in your document as a **masked Smart Object**!
