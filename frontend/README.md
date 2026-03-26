# 💎 AdaStat.net Cardano Blockchain Explorer - User Interface

A modern and fast Single Page Application (SPA) for the Cardano Blockchain Explorer, built with **Vue 3** and **Vite**. It provides real-time insights into all the Cardano Blockhain data.

## 🚀 Tech Stack

- **Framework:** Vue 3 (Composition API) with Vue Router and TypeScript.
- **Bundler:** Vite 7 with LightningCSS and Terser for heavy production minification.
- **Styling:** Tailwind CSS v4.
- **Visualizations:** Chart.js, Vue-ECharts, D3-hierarchy, and Matter-js.

## 🛠 Prerequisites

- **Node.js:** v22.x or higher.
- **Package Manager:** **pnpm** is recommended (due to specific native dependency configurations).

## ⚙️ Setup & Configuration

Install dependencies:

```bash
pnpm install
```

**Environment Variables:**

Create a `.env` file in the root of the backend directory. You can use `.env.example` as a starting template:

```bash
cp .env.example .env
```

## 🏃 Running the Application

### Development

You can run the development server for any specific network by passing the mode flag:

- **Mainnet (Default):** _pnpm run dev_
- **Preprod Testnet:** _pnpm run dev:preprod_
- **Preview Testnet:** _pnpm run dev:preview_

> **Note:** To clear the cache and force Vite to re-bundle optimize dependencies, append "-force" to the commands (e.g., _pnpm run dev-force:preprod_). The local server will run on **http://localhost:5173** by default.

### Production

The build process automatically runs TypeScript type-checking and compiles files with heavy minification and asset sorting (outputs are organized into subfolders like _js/_, _css/_, _images/_, and _fonts/_).

- **Build for Mainnet:** _pnpm run build_
- **Build for Preprod:** _pnpm run build:preprod_
- **Build for Preview:** _pnpm run build:preview_

To locally preview your production build run:
_pnpm run preview_ (or _preview:preprod_ / _preview:preview_)

### Code Quality and Linting

Keep the codebase clean using built-in formatting tools:

- **Type checking:** _pnpm run type-check_
- **Linting & auto-fixing:** _pnpm run lint_
- **Code formatting:** _pnpm run format_

## 🧩 Customizing Proxy & Environment

You can easily adjust development ports and backend proxy targets in your root **.env** file:

- **HOST** and **PORT** — Customize your local dev server host/port.
- **PROXY_API_TARGET** — Target URL for REST API forwarding (Defaults to _http://localhost:5172_).
- **PROXY_SOCKET_TARGET** — Target URL for WebSocket forwarding (Defaults to _ws://localhost:5172_).

## 📜 License & Author

- **License**: Apache-2.0.
- **Author**: AdaStat Team ([adastat.net](https://adastat.net)).
