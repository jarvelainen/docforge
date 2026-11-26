import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectImageReferences, escapeHtml, renderProjectDocuments } from './core/render.mjs';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(packageDirectory, '..', '..');

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function resolveProjectDirectory(project) {
  if (!/^[a-z][a-z0-9-]*$/.test(project)) throw new Error('Project name must be a lowercase slug');
  return project === 'starter'
    ? path.join(packageDirectory, '..', 'starter')
    : path.join(rootDirectory, 'projects', project);
}

async function readProjectFile(projectDirectory, relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) throw new Error('Document paths must be relative to the project');
  const projectRoot = await realpath(projectDirectory);
  const file = await realpath(path.resolve(projectRoot, relativePath));
  const relative = path.relative(projectRoot, file);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) throw new Error(`Document path escapes project: ${relativePath}`);
  return readFile(file, 'utf8');
}

async function embedImage(projectDirectory, reference) {
  if (/^(?:https?:|data:)/i.test(reference)) throw new Error(`Hero and content images must be local for offline output: ${reference}`);
  let root;
  let file;
  if (reference.startsWith('package:')) {
    root = path.resolve(packageDirectory, 'assets');
    file = await realpath(path.resolve(root, reference.slice('package:'.length)));
  } else {
    if (path.isAbsolute(reference)) throw new Error(`Image paths must be relative to the project: ${reference}`);
    root = await realpath(projectDirectory);
    file = await realpath(path.resolve(root, reference));
  }
  const relative = path.relative(root, file);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) throw new Error(`Image path escapes its asset root: ${reference}`);
  const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
  const mime = mimeTypes[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image type: ${reference}`);
  const image = await readFile(file);
  return `data:${mime};base64,${image.toString('base64')}`;
}

function renderTemplate(template, values) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template placeholder ${key}`);
    return values[key];
  });
}

function renderNavigation(sections, config) {
  const language = config.defaultLanguage;
  const groups = config.navigation?.groups || [];
  const starts = new Map(groups.map(group => [group.sections[0], group]));
  let html = '';
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const group = starts.get(section.id);
    if (!group) {
      html += `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`;
      continue;
    }
    const children = sections.slice(index, index + group.sections.length);
    const label = escapeHtml(group.label[language] || group.label.en || group.id);
    const menuId = `nav-menu-${escapeHtml(group.id)}`;
    html += `<div class="nav-group" data-group="${escapeHtml(group.id)}"><button type="button" class="nav-toggle" aria-expanded="false" aria-controls="${menuId}">${label}</button><div class="nav-menu" id="${menuId}">${children.map(item => `<a href="#${escapeHtml(item.id)}">${escapeHtml(item.title)}</a>`).join('')}</div></div>`;
    index += children.length - 1;
  }
  return html;
}

export async function loadProject(project) {
  const projectDirectory = resolveProjectDirectory(project);
  const config = await readJson(path.join(projectDirectory, 'project.json'));
  if (!['report', 'sales', 'offer'].includes(config.layout)) throw new Error('layout must be report, sales, or offer');
  if (!config.languages || !config.languages[config.defaultLanguage]) throw new Error('default language must be configured');
  const locale = config.languages[config.defaultLanguage];
  const documents = await Promise.all(locale.documents.map(async document => ({
    id: document.id,
    source: await readProjectFile(projectDirectory, document.file)
  })));
  return { projectDirectory, config, locale, documents };
}

export async function buildProject(project) {
  const { projectDirectory, config, locale, documents } = await loadProject(project);
  if (config.layout !== 'report') throw new Error(`${config.layout} layout is reserved but not implemented yet`);
  const imageReferences = [...new Set(documents.flatMap(document => collectImageReferences(document.source)))];
  const imageAssets = new Map(await Promise.all(imageReferences.map(async reference => [reference, await embedImage(projectDirectory, reference)])));
  const sections = renderProjectDocuments(documents, imageAssets);
  if (!sections.length) throw new Error('Project has no H2 publication sections');
  const [template, styles, chartLibrary, diagramLibrary, script] = await Promise.all([
    readFile(path.join(packageDirectory, 'templates', 'document.html'), 'utf8'),
    readFile(path.join(packageDirectory, 'layouts', 'report', 'report.css'), 'utf8'),
    readFile(path.resolve(rootDirectory, 'node_modules', 'echarts', 'dist', 'echarts.min.js'), 'utf8'),
    readFile(path.resolve(rootDirectory, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'), 'utf8'),
    readFile(path.join(packageDirectory, 'core', 'app.js'), 'utf8')
  ]);
  let brandMark = '';
  if (config.brand?.asset) {
    const assetReference = config.brand.asset;
    if (!assetReference.startsWith('package:')) throw new Error('Brand assets must use package: or a project-relative asset path');
    const assetPath = path.resolve(packageDirectory, 'assets', assetReference.slice('package:'.length));
    const packageAssets = path.resolve(packageDirectory, 'assets');
    const relativeAsset = path.relative(packageAssets, assetPath);
    if (relativeAsset.startsWith(`..${path.sep}`) || relativeAsset === '..') throw new Error('Brand asset path escapes package assets');
    const image = await readFile(assetPath);
    brandMark = `<img class="brand-logo" src="data:image/png;base64,${image.toString('base64')}" alt="">`;
  }
  const content = sections.map(section => `<section class="publication-section" id="${escapeHtml(section.id)}">${section.html}</section>`).join('\n');
  const data = JSON.stringify({
    navigation: config.navigation || { mode: 'continuous' },
    sections: sections.map(({ id, title }) => ({ id, title }))
  }).replace(/[<>&\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const html = renderTemplate(template, {
    LANG: escapeHtml(config.defaultLanguage),
    TITLE: escapeHtml(locale.title),
    LAYOUT: escapeHtml(config.layout),
    STYLES: styles,
    BRAND: escapeHtml(config.brand?.name || locale.title),
    BRAND_MARK: brandMark,
    FIRST_SECTION: escapeHtml(sections[0].id),
    NAVIGATION: renderNavigation(sections, config),
    CONTENT: content,
    DATA: data,
    CHART_LIBRARY: chartLibrary.replace(/<\/script/gi, '<\\/script'),
    DIAGRAM_LIBRARY: diagramLibrary.replace(/<\/script/gi, '<\\/script'),
    SCRIPT: script
  });
  const outputDirectory = path.join(projectDirectory, 'output');
  await mkdir(outputDirectory, { recursive: true });
  const output = path.join(outputDirectory, `${project}.html`);
  await writeFile(output, `<!-- Generated from Markdown. Edit content and rebuild. -->\n${html}`, 'utf8');
  return { output, html, sections };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const project = process.argv[2] || 'starter';
  buildProject(project).then(result => console.log(`Built ${result.output}`)).catch(error => {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  });
}
