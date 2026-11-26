# DocForge

DocForge builds polished, searchable, self-contained offline publications from structured Markdown projects.

## Repository Structure

- `packages/engine/`: redistributable build, rendering, layout, export, CLI, and asset-embedding package.
- `packages/starter/`: redistributable canonical scaffold for new projects.
- `projects/`: local publication projects and project-specific content/assets; excluded from package distribution.
- `assets/`: development source assets and unpackaged brand resources.
- `packages/engine/assets/brand/fujitsu/`: Fujitsu reference library included with the engine package.
- `tools/`: repository maintenance commands used during development; not distributed as the engine package.
- `tests/behavior/`: functional and build-contract tests; not distributed.
- `tests/visual/`: geometry, screenshot, responsive, print, and overflow checks; not distributed.
- `docs/`: architecture, specifications, and operating guidance; selectively distributed.

## Start Here for Authors

Open this repository in VS Code, open Copilot Chat, and run `/start-project`. Follow [docs/AUTHOR_QUICK_START.md](docs/AUTHOR_QUICK_START.md) for the complete author workflow and review responsibilities.

## Distribution Contract

A DocForge build produces one standalone HTML file. CSS, JavaScript, fonts, and required assets are embedded. The generated publication must not require accompanying files, a server, a CDN, or network access at runtime.

Configured raster images are optimized to WebP during the build. Project-specific source material and raw assets remain outside generated output.
