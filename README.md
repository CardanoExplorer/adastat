# 💎 AdaStat.net Cardano Blockchain Explorer Monorepo

Welcome to the official monorepo for **AdaStat** — a high-performance Cardano Blockchain Explorer. This repository contains both the server-side logic and the user interface, organized into a manageable full-stack architecture.

## 📂 Repository Structure

The project is divided into two main components:

### 1. [Backend API](./backend)

A high-performance Node.js service built with **Fastify** and **TypeScript**.

- **Purpose:** Handles data retrieval from the PostgreSQL database (populated by the AdaStat Indexer), manages WebSocket connections, and provides a scalable API for the explorer.
- **Key Features:** Multi-network support (Mainnet, Preprod, Preview), database read/write splitting, and built-in clustering for high availability.
- **Documentation:** See the [Backend README](./backend/README.md).

### 2. [Frontend UI](./frontend)

The client-facing web application.

- **Purpose:** Provides a fast, intuitive, and responsive interface for users to browse blocks, transactions, epochs, and stake pools.
- **Key Features:** Real-time updates via WebSockets, deep integration with the AdaStat API, and built-in support for IPFS/Arweave content.
- **Documentation:** See the [Frontend README](./frontend/README.md).

---

## 🚀 Quick Start

To get the entire stack running locally, follow these steps:

### 1. Clone the Repository

```bash
git clone git@github.com:CardanoExplorer/adastat.git
cd adastat
```

### 2. Setup the Backend

Navigate to the backend directory, install dependencies, and configure your environment variables (refer to the backend README for `.env` details).

```bash
cd backend
pnpm install
# Configure your .env file
pnpm run watch
```

### 3. Setup the Frontend

Open a new terminal, navigate to the frontend directory, install dependencies, and point it to your local backend API.

```bash
cd frontend
pnpm install
# Configure your .env variables
pnpm run dev
```

---

## 🛠 Core Requirements

- **Node.js:** v22.x or higher (required for native environment file support).
- **Package Manager:** pnpm.
- **PostgreSQL:** v16+.

## 🏗 System Architecture

The AdaStat ecosystem relies on three main layers:

1.  **The Frontend:** (This Repo) Visualizes the data for the end-user.
2.  **The Backend:** (This Repo) Provides an optimized API layer and real-time event streaming.
3.  **The Indexer:** (External) Scans the Cardano blockchain and populates the database.

## 📜 License & Author

- **License:** Apache-2.0.
- **Team:** AdaStat Team ([adastat.net](https://adastat.net)).
