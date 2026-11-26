# DocForge authoring instructions

## First response to a new author

Confirm the project goal and publication channel before editing content. Determine whether the deliverable is `report`, `sales`, or `offer`. Ask the author to identify the supplied source material, target audience, configured languages, customer or product branding, and required output formats.

If a project has not been created, guide the author to run:

```powershell
npm.cmd run scaffold -- <project-name>
```

Then work inside `projects/<project>/`. Never edit generated `output/` files.

## Source and content ownership

- Preserve originals under `projects/<project>/source-material/`.
- Treat authored Markdown under `projects/<project>/content/` as the publication source of truth.
- Put project-specific processed assets under `projects/<project>/assets/`.
- Keep shared Fujitsu brand resources under `assets/brand/fujitsu/`.
- Do not invent facts, prices, dates, approvals, translations, risks, benefits, customer references, or product claims.
- Convert supplied Word/PDF material without silently resolving ambiguity. Record unresolved questions for human review.

## Authoring workflow

1. Review the source material and extract the document outline.
2. Ask focused questions about audience, channel, language, navigation, branding, and publication constraints.
3. Create or update the project manifest.
4. Convert and organize approved Markdown content.
5. Apply DocForge presentation markers only after the content is correct.
6. Build the selected project with the project-specific command.
7. Run automated tests and inspect the publication at desktop and mobile sizes.
8. Report checks completed and unresolved factual or approval questions.

## Presentation rules

- Report: factual, readable, searchable, and structured for reference.
- Sales: presentation-oriented customer conversation with progressive detail.
- Offer: commercial scope, deliverables, options, assumptions, pricing, terms, validity, responsibilities, and acceptance steps.
- Do not mix channel conventions without explicit author approval.
- Preserve accessibility: semantic headings, readable contrast, keyboard controls, descriptive image text, and data tables for charts.

## Standalone distribution

Every publication must remain one self-contained offline HTML file. Do not introduce runtime network references, CDNs, local sibling assets, or remote fonts. Embed required images, fonts, styles, and scripts during build. Keep images optimized to WebP where practical and report final output size.

## Commands

```powershell
npm.cmd run scaffold -- <project-name>
npm.cmd run build -- <project-name>
npm.cmd test
```

Run tests from the DocForge repository root. Build only the project currently being edited.
