import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { buildProject, loadProject } from '../../packages/engine/build.mjs';

test('starter builds as a self-contained report publication', async () => {
  const loaded = await loadProject('starter');
  assert.equal(loaded.config.layout, 'report');
  assert.deepEqual(loaded.config.supportedLayouts, ['report', 'sales', 'offer']);
  const result = await buildProject('starter');
  assert.equal(result.sections.length, 9);
  assert.doesNotMatch(result.html, /<(?:script|link|img)[^>]+(?:src|href)="https?:\/\//i);
  assert.match(result.html, /class="app-header"/);
  assert.match(result.html, /class="nav-toggle" aria-expanded="false" aria-controls="nav-menu-overview"/);
  assert.match(result.html, /class="option-grid"/);
  assert.match(result.html, /class="callout callout-info"/);
  assert.match(result.html, /class="hero-band"/);
  assert.match(result.html, /class="hero-band"[\s\S]*?<img src="data:image\/png;base64,/);
  assert.match(result.html, /<pre><code class="language-yaml">platform:/);
    assert.match(result.html, /<th>Operational responsibility<\/th>/);  assert.match(result.html, /class="chart-panel" data-chart="bar"/);
  assert.match(result.html, /class="brand-logo" src="data:image\/png;base64,/);
  assert.match(result.html, /class="brand-title">DocForge Starter Publication/);
  const html = await readFile(result.output, 'utf8');
  assert.equal(html, `<!-- Generated from Markdown. Edit content and rebuild. -->\n${result.html}`);
});

test('starter report exposes pages, dropdown, tabs, and search runtime', async () => {
  const result = await buildProject('starter');
  const dom = new JSDOM(result.html, {
    runScripts: 'dangerously',
    url: 'https://example.test/#starter-0',
    beforeParse(window) {
      const context = new Proxy({
        measureText: text => ({ width: String(text).length * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
        getLineDash: () => [],
        isPointInPath: () => true
      }, { get: (target, property) => property in target ? target[property] : () => {} });
      window.HTMLCanvasElement.prototype.getContext = () => context;
    }
  });
  try {
    const { document, KeyboardEvent, Event } = dom.window;
    const sections = [...document.querySelectorAll('.publication-section')];
    assert.deepEqual(sections.map(section => section.hidden), [false, true, true, true, true, true, true, true, true]);
    assert.equal(document.getElementById('page-navigator').hidden, false);
    assert.equal(document.getElementById('page-previous').getAttribute('aria-disabled'), 'true');
    assert.equal(document.getElementById('page-next').getAttribute('href'), '#starter-1');
    assert.match(document.getElementById('page-position').textContent, /1 of 9.*Introduction/);
    assert.equal(document.querySelectorAll('.nav-group').length, 2);
    const toggle = document.querySelector('.nav-toggle');
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(toggle.textContent, 'DocForge Starter Publication');
    assert.equal(toggle.closest('.nav-group').querySelectorAll('.nav-menu a').length, 3);
    assert.deepEqual([...toggle.closest('.nav-group').querySelectorAll('.nav-menu a')].map(link => link.textContent), ['Introduction', 'Components', 'Navigation and search']);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    const tabs = [...document.querySelectorAll('#starter-0 [role="tab"]')];
    const panels = [...document.querySelectorAll('#starter-0 [role="tabpanel"]')];
    assert.deepEqual(tabs.map(tab => tab.textContent), ['Decision', 'Decision model', 'Outcome', 'Details']);
    assert.deepEqual(panels.map(panel => panel.hidden), [false, true, true, true]);
    tabs[2].click();
    assert.deepEqual(panels.map(panel => panel.hidden), [true, true, false, true]);
    document.location.hash = '#starter-2';
    dom.window.dispatchEvent(new Event('hashchange'));
    const navigationTabs = [...document.querySelectorAll('#starter-2 [role="tab"]')];
    const navigationPanels = [...document.querySelectorAll('#starter-2 [role="tabpanel"]')];
    assert.deepEqual(navigationTabs.map(tab => tab.textContent), ['Page hierarchy', 'Page tabs', 'Search behavior']);
    navigationTabs[1].click();
    assert.deepEqual(navigationPanels.map(panel => panel.hidden), [true, false, true]);
    assert.equal(document.getElementById('page-previous').getAttribute('href'), '#starter-1');
    assert.equal(document.getElementById('page-next').getAttribute('href'), '#starter-3');
    assert.match(document.getElementById('page-position').textContent, /3 of 9.*Navigation and search/);
    document.location.hash = '#starter-4';
    dom.window.dispatchEvent(new Event('hashchange'));
    assert.deepEqual(sections.map(section => section.hidden), [true, true, true, true, false, true, true, true, true]);
    const dataPage = document.getElementById('starter-4');
    assert.equal(dataPage.querySelectorAll('.chart-panel svg').length, 1);
    assert.match(dataPage.querySelector('.chart-panel').getAttribute('aria-label'), /North|Value|bar chart/i);
    assert.equal(dataPage.querySelectorAll('table tbody tr').length, 4);
    document.location.hash = '#starter-6';
    dom.window.dispatchEvent(new Event('hashchange'));
    const gallery = document.getElementById('starter-6');
    assert.equal(gallery.querySelectorAll('.chart-card').length, 9);
    assert.equal(gallery.querySelectorAll('.chart-panel svg').length, 9);
    assert.deepEqual([...gallery.querySelectorAll('.chart-panel')].map(chart => chart.dataset.chart), [
      'bar', 'line', 'area', 'stacked-bar', 'radar', 'donut', 'scatter', 'heatmap', 'funnel'
    ]);
    assert.equal(gallery.querySelectorAll('table').length, 9);
    const diagrams = document.getElementById('starter-7');
    assert.equal(diagrams.hidden, true);
    assert.equal(diagrams.querySelectorAll('.diagram-card').length, 5);
    assert.equal(diagrams.querySelectorAll('.diagram-panel').length, 3);
    assert.deepEqual([...diagrams.querySelectorAll('.mermaid')].map(item => item.textContent.trim().split('\n')[0]), [
      'flowchart LR', 'flowchart TB', 'sequenceDiagram'
    ]);
    assert.equal(diagrams.querySelectorAll('[data-visual="architecture"] .architecture-band').length, 5);
    assert.equal(diagrams.querySelectorAll('[data-visual="sales-roadmap"] .roadmap-phase').length, 4);
    assert.equal(diagrams.querySelectorAll('.architecture-rail .architecture-band').length, 1);
    const chooser = document.getElementById('starter-8');
    assert.equal(chooser.querySelectorAll('.option-card a[href^="#starter-"]').length, 7);
    assert.deepEqual([...chooser.querySelectorAll('.option-card a')].map(link => link.getAttribute('href')), [
      '#starter-3-know-what-needs-attention-before-the-next-infrastructure-investment',
      '#starter-5-code',
      '#starter-6-bar-comparison',
      '#starter-7-horizontal-flow',
      '#starter-7-swimlane-handoffs',
      '#starter-7-layered-solution-architecture',
      '#starter-7-sales-transformation-roadmap'
    ]);
    assert.ok([...chooser.querySelectorAll('.option-card a')].every(link => document.getElementById(link.hash.slice(1))));
    document.location.hash = '#starter-0-outcome';
    dom.window.dispatchEvent(new Event('hashchange'));
    assert.equal(document.querySelector('#starter-0 [aria-controls="starter-0-3-panel"]').getAttribute('aria-selected'), 'true');
    assert.equal(document.getElementById('starter-0-3-panel').hidden, false);
    const showcaseToggle = document.querySelector('[aria-controls="nav-menu-showcase"]');
    assert.equal(showcaseToggle.closest('.nav-group').querySelectorAll('.nav-menu a').length, 6);
    document.location.hash = '#starter-8';
    dom.window.dispatchEvent(new Event('hashchange'));
    assert.equal(document.getElementById('page-previous').getAttribute('href'), '#starter-7');
    assert.equal(document.getElementById('page-next').getAttribute('aria-disabled'), 'true');
    assert.match(document.getElementById('page-position').textContent, /9 of 9.*Choose a component/);
    const palette = document.getElementById('chart-palette');
    palette.value = 'contrast';
    palette.dispatchEvent(new Event('change'));
    assert.equal(document.body.dataset.chartPalette, 'contrast');
    const chart = dom.window.echarts.getInstanceByDom(gallery.querySelector('.chart-panel'));
    assert.deepEqual([...chart.getOption().color], ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#f0e442']);
    assert.equal(chart.getOption().animation, true);
    assert.equal(chart.getOption().animationDurationUpdate, 420);
    const search = document.getElementById('search');
    search.value = 'navigation';
    search.dispatchEvent(new Event('input'));
    assert.ok(document.querySelectorAll('#search-results a').length > 0);
  } finally {
    dom.window.close();
  }
});
