# 🌬️ Lumina Atelier — Virtual Wardrobe Stylist

An AI-powered virtual try-on fashion app built with React, TypeScript, Vite, and Tailwind CSS.

## ✨ Features

- 📸 Upload a photo or use your camera as the "Neural Mirror"
- 👗 Browse a curated wardrobe (Women's & Men's)
- 🤖 **Real virtual try-on** using Replicate's IDM-VTON model
- 🔍 AI clothing detection (Claude Vision) — "AI Magic Tag"
- 🌙 Dark/Light mode toggle
- 🗄️ Style history with IndexedDB persistence
- 🎙️ Voice search support
- ➕ Add/edit/delete garments with full variant support

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API Keys

Edit `.env.local` and fill in your keys:

```env
VITE_REPLICATE_API_TOKEN=r8_your_token_here
VITE_ANTHROPIC_API_KEY=sk-ant-your_key_here
```

**Get your keys:**
- 🔑 **Replicate** (virtual try-on): https://replicate.com/account/api-tokens — Free account, pay per use (~$0.005/run)
- 🔑 **Anthropic** (AI clothing analysis): https://console.anthropic.com/settings/keys

### 3. Run the app

```bash
npm run dev
```

Open http://localhost:3000

---

## 📁 Project Structure

```
lumina-atelier/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.local          ← Add your API keys here
└── src/
    ├── App.tsx          ← Main app component
    ├── types.ts         ← TypeScript types
    ├── index.tsx        ← React entry point
    ├── index.css        ← Tailwind CSS
    ├── env.d.ts         ← Vite env types
    └── services/
        ├── replicateService.ts  ← IDM-VTON try-on
        ├── storeService.ts      ← Inventory + IDB
        └── geminiService.ts     ← Claude AI analysis
```

---

## 🎯 How to Use

1. **Upload your photo** — Click "Import Photo" or "Open Lens" (camera)
2. **Browse the Archive** — Scroll down, pick Men's or Women's section
3. **Select a garment** — Click any item card to add to your outfit
4. **Click "Invoke Couture"** — AI generates your try-on result
5. **Save to history** — Results auto-save to your Memoirs

### AI Magic Tag
When adding a new item, upload a garment photo and hover over it — click **"AI Magic Tag"** to auto-fill name, color, category and description using Claude Vision.

---

## 🔧 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Bundler | Vite 6 |
| Try-On AI | Replicate IDM-VTON |
| Analysis AI | Anthropic Claude Sonnet |
| Persistence | IndexedDB (idb-keyval) |
| Icons | Lucide React |
