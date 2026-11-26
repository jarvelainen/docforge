import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function plainText(tokens) {
  return marked.Parser.parseInline(tokens).replace(/<[^>]*>/g, '').trim();
}

function headingSlug(value) {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

function prepareMarkers(source) {
  return source
    .replaceAll('<!-- cards:start -->', '<div class="option-grid">')
    .replaceAll('<!-- cards:end -->', '</div>')
    .replaceAll('<!-- card:start -->', '<div class="option-card">')
    .replaceAll('<!-- card:end -->', '</div>')
    .replaceAll(/<!-- callout:(info|warning|success|danger):start -->/g, '<div class="callout callout-$1">')
    .replaceAll('<!-- callout:end -->', '</div>')
    .replaceAll('<!-- hero:start -->', '<div class="hero-band">')
    .replaceAll('<!-- hero:end -->', '</div>')
    .replaceAll('<!-- charts:start -->', '<div class="chart-gallery">')
    .replaceAll('<!-- charts:end -->', '</div>')
    .replaceAll('<!-- chart-card:start -->', '<article class="chart-card">')
    .replaceAll('<!-- chart-card:end -->', '</article>')
    .replaceAll('<!-- diagrams:start -->', '<div class="diagram-gallery">')
    .replaceAll('<!-- diagrams:end -->', '</div>')
    .replaceAll('<!-- diagram-card:start -->', '<article class="diagram-card">')
    .replaceAll('<!-- diagram-card:end -->', '</article>')
    .replaceAll('<!-- visual:architecture -->', '<div class="native-visual architecture-visual" data-visual="architecture"></div>')
    .replaceAll('<!-- visual:sales-roadmap -->', '<div class="native-visual sales-roadmap-visual" data-visual="sales-roadmap"></div>')
    .replaceAll(/<!-- chart:(bar|line|area|stacked-bar|radar|donut|scatter|heatmap|funnel) -->/g, '<div class="chart-panel" data-chart="$1"></div>');
}

export function collectImageReferences(source) {
  const references = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (value.type === 'image' && typeof value.href === 'string') references.add(value.href);
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  };
  marked.lexer(source).forEach(visit);
  return [...references];
}

function safeRender(tokens, imageAssets = new Map(), sectionId = '') {
  const renderer = new marked.Renderer();
  const usedHeadingIds = new Set();
  renderer.heading = token => {
    const depth = token.depth;
    const text = marked.Parser.parseInline(token.tokens);
    if (depth < 3) return `<h${depth}>${text}</h${depth}>`;
    const base = `${sectionId}-${headingSlug(plainText(token.tokens))}`;
    let id = base;
    let duplicate = 2;
    while (usedHeadingIds.has(id)) id = `${base}-${duplicate++}`;
    usedHeadingIds.add(id);
    return `<h${depth} id="${escapeHtml(id)}">${text}</h${depth}>`;
  };
  renderer.image = token => {
    const source = imageAssets.get(token.href) || token.href;
    const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
    return `<img src="${escapeHtml(source)}" alt="${escapeHtml(token.text || '')}"${title}>`;
  };
  return sanitizeHtml(marked.Parser.parse(tokens, { renderer }), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['section', 'div', 'article', 'img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'loading', 'width', 'height'],
      div: ['class', 'data-chart', 'data-visual'],
      article: ['class'],
      h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'],
      code: ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedSchemesByTag: { img: ['data'] }
  });
}

export function renderProjectDocuments(projectDocuments, imageAssets = new Map()) {
  const sections = [];
  for (const document of projectDocuments) {
    const tokens = marked.lexer(prepareMarkers(document.source), { gfm: true });
    let current = null;
    let projectIndex = 0;
    for (const token of tokens) {
      if (token.type === 'heading' && token.depth === 1) {
        continue;
      }
      if (token.type === 'heading' && token.depth === 2) {
        if (current) sections.push(current);
        current = {
          id: `${document.id}-${projectIndex++}`,
          title: plainText(token.tokens),
          tokens: [token]
        };
      } else if (current) {
        current.tokens.push(token);
      }
    }
    if (current) sections.push(current);
  }
  return sections.map(section => ({
    id: section.id,
    title: section.title,
    html: safeRender(section.tokens, imageAssets, section.id),
    tabs: section.tokens
      .filter(token => token.type === 'heading' && token.depth === 3)
      .map(token => plainText(token.tokens))
  }));
}
