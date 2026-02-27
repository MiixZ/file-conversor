# 🔄 File Conversor

A **livian** file conversion web application built with [Astro 5](https://astro.build), [React 19](https://react.dev), and TypeScript. Convert images, archives, and documents — for **free**, directly in your browser with **server-side** processing.

## ✨ Features

- **Image conversion** — JPG, PNG, WebP, AVIF, GIF, TIFF, BMP, HEIF/HEIC
- **Archive conversion** — ZIP ↔ TAR.GZ
- **Document conversion** — DOCX → PDF
- **Drag-and-drop** file upload with multi-file support
- **Batch conversion** — convert multiple files at once
- **Server Islands** (Astro 5 `server:defer`) — progressive loading of the supported formats panel
- **Private** — files are never stored, logs are never kept
- **50 MB** file size limit per file

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro 5](https://astro.build) (SSR, Server Islands) |
| UI | [React 19](https://react.dev) (client island) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Language | TypeScript |
| Server Adapter | [@astrojs/node](https://docs.astro.build/en/guides/integrations-guide/node/) (standalone) |
| Image Processing | [Sharp](https://sharp.pixelplumbing.com/) |
| Archive Handling | [Archiver](https://www.npmjs.com/package/archiver) + [JSZip](https://stuk.github.io/jszip/) + [tar](https://www.npmjs.com/package/tar) |
| Document Conversion | [Mammoth](https://github.com/mwilliamson/mammoth.js) + [PDFKit](https://pdfkit.org/) |

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build

```bash
npm run build
```

### Preview (production build)

```bash
npm run preview
```

## 📂 Project Structure

```
file-conversor/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── FileConverter.tsx       # React client island (drag-drop, conversion UI)
│   │   └── SupportedFormats.astro  # Astro Server Island (server:defer)
│   ├── layouts/
│   │   └── Layout.astro            # Base HTML layout
│   ├── lib/
│   │   ├── formats.ts              # Supported format map & conversion groups
│   │   └── converters/
│   │       ├── image.ts            # Sharp-based image conversion
│   │       ├── archive.ts          # ZIP ↔ TAR.GZ conversion
│   │       └── document.ts         # DOCX → PDF (Mammoth + PDFKit)
│   ├── pages/
│   │   ├── index.astro             # Main page
│   │   └── api/
│   │       └── convert.ts          # POST /api/convert endpoint
│   └── styles/
│       └── global.css              # Tailwind v4 theme
├── astro.config.ts
├── tsconfig.json
└── package.json
```

## 🏝 Server Islands

The **Supported Formats** panel at the bottom of the page is rendered as an [Astro Server Island](https://docs.astro.build/en/guides/server-islands/) using the `server:defer` directive. This means:

1. The main page (file converter) loads immediately.
2. The server island is fetched asynchronously after initial page load.
3. A fallback placeholder is shown while the island loads.
4. Once rendered server-side, the island replaces the placeholder.

This pattern allows the primary conversion UI to be interactive instantly, while secondary information (like available formats and server capabilities) is deferred.

## 🔒 Privacy

All conversions happen on the server in memory. No files are written to permanent storage. Converted output is streamed directly back to the browser.

## 📋 Supported Conversions

### Images
| From | To |
|------|----|
| JPG / JPEG | PNG, WebP, AVIF, GIF, TIFF |
| PNG | JPG, WebP, AVIF, GIF, TIFF |
| WebP | JPG, PNG, AVIF, GIF, TIFF |
| AVIF | JPG, PNG, WebP |
| GIF | JPG, PNG, WebP |
| TIFF | JPG, PNG, WebP |
| BMP | JPG, PNG, WebP |
| HEIF / HEIC | JPG, PNG, WebP |

### Archives
| From | To |
|------|-----|
| ZIP | TAR.GZ |
| TAR.GZ / TGZ | ZIP |

### Documents
| From | To |
|------|-----|
| DOCX | PDF |

> **Note:** DOCX → PDF conversion extracts plain text content. Complex formatting (tables, images, headers/footers) is simplified.

## 📄 License

[MIT](LICENSE)

