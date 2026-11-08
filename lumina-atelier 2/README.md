# 🌬️ Lumina Atelier — Virtual Wardrobe Stylist

An AI-powered virtual try-on fashion app built with React, TypeScript, Vite, and Tailwind CSS.

## ✨ Features

- 📸 Upload a photo or use your camera as the "Neural Mirror"
- 👗 Browse a curated wardrobe (Women's & Men's)
- 🤖 **Virtual try-on** using Google Gemini image generation
- 🔍 AI clothing detection (Gemini Vision) — "AI Magic Tag"
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

### 2. Configure your API key

Copy `.env.example` to `.env.local` and add your key:

```env
VITE_GEMINI_API_KEY=your_gemini_key_here
```

Get a key at https://aistudio.google.com/apikey

- **AI Magic Tag** (clothing detection) works on Google's free tier.
- **Virtual try-on** uses an image-generation model, which Google lists as paid tier only (a few cents per image). Enable billing on your key to use it.

> Never commit `.env.local`. Keys starting with `VITE_` are visible in the browser, so don't put your key in a public deployment.

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
        ├── storeService.ts      ← Inventory + IDB
        └── geminiService.ts     ← Gemini analysis + try-on
```

---

## 🎯 How to Use

1. **Upload your photo** — Click "Import Photo" or "Open Lens" (camera)
2. **Browse the Archive** — Scroll down, pick Men's or Women's section
3. **Select a garment** — Click any item card to add to your outfit
4. **Click "Invoke Couture"** — AI generates your try-on result
5. **Save to history** — Results auto-save to your Memoirs

### AI Magic Tag
When adding a new item, upload a garment photo and hover over it — click **"AI Magic Tag"** to auto-fill name, color, category and description using Gemini Vision.

---

## 🔧 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Bundler | Vite 6 |
| Try-On AI | Google Gemini image model |
| Analysis AI | Google Gemini (vision) |
| Persistence | IndexedDB (idb-keyval) |
| Icons | Lucide React |

---

## 🔒 Privacy

Photos you upload are sent to Google's Gemini API to generate results. Don't upload photos you don't want processed by a third party.
