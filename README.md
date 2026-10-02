# Receipt Studio

An offline-first receipt and invoice generator built with React, Vite, TypeScript, Tailwind CSS, shadcn-style UI primitives, React Hook Form, Zod, Zustand, Dexie, vite-plugin-pwa, html-to-image, jsPDF, and Lucide.

## Run locally

```bash
npm install
npm run dev
```

For a production build and local preview:

```bash
npm run build
npm run preview
```

Install the app from Chrome or Edge after serving the production build over HTTPS or localhost. Open it once while online so its service worker can cache the application shell. After that, receipts, templates, settings, and exports work offline.

## Local receipt folder

Open **Settings → Receipt workspace folder** and choose a folder in Documents or another local location. The app creates one `.receipt.json` file for each receipt and keeps business settings in `Receipt Studio Workspace.json`. Editing, duplicating, and deleting receipts updates those local computer files. IndexedDB is used only as the fast offline working cache.

The folder permission is a browser security requirement. Chrome or Edge may ask the user to reconnect the folder after a browser restart. The files remain on the computer even if the app cache is cleared; choosing the same folder imports them again.

To share the application with clients, deploy the `dist` folder to any HTTPS static host and share that URL. Each client installs the PWA from the browser and chooses their own local receipt folder.

## Deploy to Vercel

Import the repository in Vercel. The included `vercel.json` supplies the single-page app fallback and production security headers. Vercel can use the standard settings automatically (`npm run build`, output directory `dist`).

No receipt or customer data is sent to Vercel by the application. Data stays in the browser cache and, when connected, in the folder selected by the client.

## Security checks

- Uploaded logos are limited to validated PNG, JPEG, and WebP files under 1.5 MB.
- Receipt documents, workspace profiles, and JSON backups are fully schema-validated before being stored.
- Oversized or malformed local documents are ignored and never replace valid cached data.
- Vercel responses use a restrictive Content Security Policy and related browser security headers.
- GitHub Actions runs a clean install, production dependency audit, TypeScript check, and production build.
- Dependabot checks npm dependencies weekly.

Run the same release checks locally with:

```bash
npm audit --omit=dev --audit-level=high
npm run build
```

## Data and architecture

- `src/db/dexie.ts` owns the IndexedDB cache and numbering transaction.
- `src/lib/workspace/receiptFolder.ts` reads and writes the durable receipt documents in the user-selected computer folder.
- `src/features/receipts/services/receiptService.ts` creates, duplicates, and saves structured receipts.
- `src/lib/calculations/money.ts` is the single money calculation source, using integer cents.
- `src/features/receipts/components/ReceiptDocument.tsx` renders the live preview and all export formats.
- `src/lib/export/receiptExport.tsx` captures the receipt alone and generates PNG, JPG, and multi-page PDF files.
- Zustand manages navigation; Dexie remains the persistent source of truth.

Drafts save after a short pause in editing. A small recovery snapshot protects changes made immediately before a refresh. When a receipt folder is connected, every saved edit is also written to its local receipt document.
