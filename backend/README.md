# 💎 AdaStat.net Cardano Blockchain Explorer - Backend API

This is the backend service for the AdaStat.net Cardano Blockchain Explorer. It is a high-performance Node.js application built with Fastify and TypeScript, featuring built-in clustering, multi-network support, and a scalable database architecture.

## 🚀 Features

- **Cluster Management**: Utilizes the Node.js cluster module for high availability and automatic worker restarts upon failure.
- **Multi-Network Support**: Pre-configured network parameters for Cardano Mainnet, Preprod, and Preview.
- **Database Scaling**: Support for a Primary database (for write operations and event triggers) and a Secondary database (for read-only queries).
- **Zero-Downtime Reloads**: Supports graceful worker recycling via `SIGUSR2` signals.

## 🛠 Prerequisites

Before running the backend, ensure you have the following installed and configured:

- **Node.js**: v22.x or higher (required for native `--env-file` support).
- **Package Manager**: **pnpm** is recommended (due to specific native dependency configurations).
- **PostgreSQL**: v16+ (Both Primary and optional Secondary instances).
- **AdaStat Indexer**: (Required) This backend depends on the data populated by the [AdaStat Indexer](https://github.com/CardanoExplorer/adastat-indexer). You must set up and run the indexer first to ensure the database schema and data are ready.

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

**Key Configuration Options:**

- `PORT`: Server port (default: 7828).
- `DB_HOST`: Primary database host for write operations and event listening.
- `SECONDARY_DB_HOST`: Read-only database host (defaults to Primary if not provided).
- `ALLOWED_ORIGINS`: Allowed WebSocket and website origins.

_Note: Network-specific constants (like Epoch lengths and Mithril aggregators) can be found in `.env.mainnet`, `.env.preprod`, and `.env.preview`._

## 🏃 Running the Application

### Development

Start the server in watch mode with debug logging enabled:

```bash
pnpm run watch
```

**Pro Tip:** In development mode, you can type `r` in the terminal to manually trigger a worker restart.

### Production

Build the project:

```bash
pnpm run build
```

Start the production server:

```bash
pnpm run start
```

### Other Commands

- `pnpm run test`: Run unit tests.
- `pnpm run lint`: Check and fix code style.
- `pnpm run debug`: Run with `LOG_LEVEL=debug`.
- `pnpm run trace`: Run with `LOG_LEVEL=trace`.

## 🏗 Architecture & Reliability

### Clustering

The application uses a Primary/Worker model:

- **Primary Process**: Manages worker health. If a worker crashes, the Primary process restarts it.
- **Crash Protection**: To prevent infinite loops, the application will exit if it crashes more than 4 times within a 10-second window.
- **Hot Reload**: Sending a `SIGUSR2` signal to the master process will fork a new worker and gracefully kill the old one.

### Database Logic

- **Primary DB**: The application connects to this instance to handle event triggers via `pg-listen`.
- **Secondary DB**: Designed for heavy `SELECT` queries to reduce the load on your primary database.

## 📜 License & Author

- **License**: Apache-2.0.
- **Author**: AdaStat Team ([adastat.net](https://adastat.net)).
