FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ripgrep \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --global --force pnpm@11.18.0

RUN install -d -o node -g node /home/node/.vscode-server
