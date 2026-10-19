# Image of one bench cell: a Linux environment of its own (filesystem, /tmp, processes)
# with the agent CLIs at the versions under test. A suite adds its project's dependencies.
FROM node:24-bookworm
ARG CLAUDE_CODE_VERSION
ARG CODEX_VERSION
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ripgrep python3 jq procps less unzip zsh ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} @openai/codex@${CODEX_VERSION} \
 && npm cache clean --force
RUN mkdir -p /work && chown node:node /work
USER node
# Homes of the CLIs, created by node so that a bind-mounted auth file does not leave them to root.
RUN mkdir -p /home/node/.claude /home/node/.codex /home/node/.agents/skills
WORKDIR /work
