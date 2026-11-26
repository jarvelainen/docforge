---
name: start-project
description: "Start a new DocForge publication. Use when an author wants to scaffold a report, sales, or offer project; convert Word, PDF, or other source material; configure the manifest; prepare the first build; and review the standalone publication."
---

# Start a New DocForge Project

Use this workflow when an author starts a publication in the DocForge workspace.

## Interview First

Ask concise questions to establish:

- project name;
- publication channel: `report`, `sales`, or `offer`;
- supplied source files;
- audience;
- languages;
- customer or product branding;
- required Word, print/PDF, or other outputs.

Do not begin editing until the channel and source of truth are confirmed.

## Scaffold and Configure

1. Create the project with `npm.cmd run scaffold -- <project-name>` when it does not exist.
2. Update `projects/<project-name>/project.json` so the ID, title, channel, languages, and documents match the project.
3. Preserve supplied originals under `source-material/`.
4. Put authored Markdown under `content/<language>/`.
5. Put processed project-specific visual assets under `assets/`.

## Convert and Author

1. Extract the source outline before converting detailed content.
2. Convert in small, reviewable steps.
3. Preserve approved wording, numbers, units, dates, terms, and references.
4. Do not invent or silently resolve factual, contractual, translation, approval, or branding questions.
5. Apply presentation markers after the content is correct and the selected channel is confirmed.

## Build and Review

1. Build only the current project: `npm.cmd run build -- <project-name>`.
2. Run `npm.cmd test` from the repository root.
3. Inspect desktop and mobile output, navigation, search, links, images, print/PDF, and Word export as applicable.
4. Confirm the HTML is standalone and requires no runtime network access.
5. Report files created, checks completed, unresolved source questions, and the next author action.

Never edit generated `output/` files directly. Keep decisions and unresolved questions visible in the conversation.
