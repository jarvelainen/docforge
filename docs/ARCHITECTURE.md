# DocForge Architecture

## Boundaries

- `packages/engine/core/`: distributable domain-neutral build and rendering modules.
- `packages/engine/layouts/report/`: distributable report presentation components.
- `packages/engine/layouts/sales/`: distributable sales-presentation components.
- `packages/engine/layouts/offer/`: distributable commercial-offer components for scope, options, pricing, assumptions, terms, and acceptance-oriented content.
- `packages/engine/templates/`: distributable HTML templates and inline application bootstrap.
- `packages/engine/bin/`: distributable command-line entry points.
- `packages/engine/assets/`: approved assets required by the distributed engine, including the supplied Fujitsu library at `brand/fujitsu/`.
- `packages/starter/`: distributable canonical project scaffold.
- `assets/brand/fujitsu/`: development-side brand staging and sources not yet selected for package distribution.
- `projects/<project>/assets/`: project-specific processed assets.
- `projects/<project>/source-material/`: original or supplied material.
- `projects/<project>/content/`: authored publication source of truth.
- `projects/<project>/output/`: generated standalone publications.

## Contract

A project manifest configures one publication without modifying engine code. Layout components own presentation. Markdown owns publication content. Source material is retained for traceability. Tests validate both behavior and visual geometry before projects are migrated or distributed.
