(() => {
  const data = JSON.parse(document.getElementById('document-data').textContent);
  const navigation = document.getElementById('navigation');
  const header = document.querySelector('.app-header');
  const search = document.getElementById('search');
  const results = document.getElementById('search-results');
  const paletteSelect = document.getElementById('chart-palette');
  const pageNavigator = document.getElementById('page-navigator');
  const previousPage = document.getElementById('page-previous');
  const nextPage = document.getElementById('page-next');
  const pagePosition = document.getElementById('page-position');
  const chartPalettes = {
    fujitsu: ['#e6002d', '#0097a9', '#f2a900', '#5b6770', '#7a6fac'],
    contrast: ['#0072b2', '#d55e00', '#009e73', '#cc79a7', '#f0e442'],
    ocean: ['#006d77', '#2783a5', '#83c5be', '#e29578', '#335c67']
  };
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  function savedPalette() {
    try {
      const value = localStorage.getItem('docforge-chart-palette');
      return chartPalettes[value] ? value : 'fujitsu';
    } catch {
      return 'fujitsu';
    }
  }

  function closeGroups(returnFocus = false) {
    const active = navigation.querySelector('.nav-toggle[aria-expanded="true"]');
    navigation.querySelectorAll('.nav-group.open').forEach(group => group.classList.remove('open'));
    navigation.querySelectorAll('.nav-toggle').forEach(toggle => toggle.setAttribute('aria-expanded', 'false'));
    if (returnFocus) active?.focus();
  }

  function bindGroups() {
    navigation.querySelectorAll('.nav-toggle').forEach(toggle => {
      const group = toggle.closest('.nav-group');
      const menu = group.querySelector('.nav-menu');
      const open = () => {
        group.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        const trigger = toggle.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(trigger.left, window.innerWidth - 328))}px`;
        menu.style.top = `${Math.round(trigger.bottom + 2)}px`;
      };
      toggle.addEventListener('click', () => {
        const shouldOpen = !group.classList.contains('open');
        closeGroups();
        if (shouldOpen) open();
      });
      toggle.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown') return;
        event.preventDefault();
        closeGroups();
        open();
        menu.querySelector('a')?.focus();
      });
      menu.addEventListener('keydown', event => {
        const links = [...menu.querySelectorAll('a')];
        const index = links.indexOf(document.activeElement);
        const next = event.key === 'ArrowDown' ? (index + 1) % links.length
          : event.key === 'ArrowUp' ? (index + links.length - 1) % links.length
            : -1;
        if (index < 0 || next < 0) return;
        event.preventDefault();
        links[next].focus();
      });
    });
  }

  function measureHeader() {
    const height = Math.round(header.getBoundingClientRect().height);
    if (height > 0) document.documentElement.style.setProperty('--header-height', `${height}px`);
  }

  function createSectionTabs(section) {
    const headings = [...section.querySelectorAll(':scope > h3')];
    if (!headings.length) return;
    const list = document.createElement('div');
    list.className = 'tab-list';
    list.setAttribute('role', 'tablist');
    const panels = [];
    headings.forEach((heading, index) => {
      const panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.id = `${section.id}-${index + 1}-panel`;
      panel.setAttribute('role', 'tabpanel');
      panel.tabIndex = 0;
      panel.hidden = index !== 0;
      let next = heading.nextSibling;
      panel.appendChild(heading);
      while (next && next !== headings[index + 1] && next.parentNode === section) {
        const sibling = next.nextSibling;
        panel.appendChild(next);
        next = sibling;
      }
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.id = `${section.id}-${index + 1}-tab`;
      tab.className = 'tab-button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      tab.setAttribute('aria-selected', String(index === 0));
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.textContent = heading.textContent;
      panel.setAttribute('aria-labelledby', tab.id);
      list.appendChild(tab);
      panels.push(panel);
    });
    section.append(list, ...panels);
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const activate = index => tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    list.addEventListener('click', event => {
      const tab = event.target.closest('[role="tab"]');
      if (tab) activate(tabs.indexOf(tab));
    });
    list.addEventListener('keydown', event => {
      const index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      activate(next);
      tabs[next].focus();
    });
  }

  function updatePageNavigator(section) {
    if (data.navigation?.mode !== 'pages' || !pageNavigator) {
      pageNavigator?.setAttribute('hidden', '');
      return;
    }
    const index = data.sections.findIndex(item => item.id === section?.id);
    const previous = data.sections[index - 1];
    const next = data.sections[index + 1];
    const group = data.navigation.groups?.find(item => item.sections.includes(section?.id));
    const groupLabel = group?.label?.[document.documentElement.lang] || group?.label?.en || group?.id || 'Publication';
    const setStep = (link, item, prefix) => {
      link.classList.toggle('is-disabled', !item);
      if (item) {
        link.href = `#${item.id}`;
        link.removeAttribute('aria-disabled');
        link.setAttribute('aria-label', `${prefix}: ${item.title}`);
      } else {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        link.setAttribute('aria-label', `${prefix} page unavailable`);
      }
    };
    pageNavigator.hidden = false;
    pagePosition.innerHTML = `<span>${escapePageText(groupLabel)}</span><strong>${index + 1} of ${data.sections.length} · ${escapePageText(data.sections[index]?.title || '')}</strong>`;
    setStep(previousPage, previous, 'Previous page');
    setStep(nextPage, next, 'Next page');
  }

  function escapePageText(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function revealHashTarget(target) {
    const panel = target?.closest('[role="tabpanel"]');
    if (!panel) return;
    const tabList = panel.parentElement.querySelector('[role="tablist"]');
    const selectedTab = tabList?.querySelector(`[aria-controls="${panel.id}"]`);
    if (!selectedTab) return;
    tabList.querySelectorAll('[role="tab"]').forEach(tab => {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
  }

  function updateNavigation() {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const section = target?.closest('.publication-section') || document.querySelector('.publication-section');
    if (data.navigation?.mode === 'pages') {
      document.querySelectorAll('.publication-section').forEach(item => { item.hidden = item !== section; });
    }
    revealHashTarget(target);
    updatePageNavigator(section);
    navigation.querySelectorAll('a').forEach(link => {
      link.toggleAttribute('aria-current', link.getAttribute('href') === `#${section?.id}`);
    });
    navigation.querySelectorAll('.nav-group').forEach(group => {
      group.classList.toggle('has-current', Boolean(group.querySelector('[aria-current]')));
    });
  }

  function updateSearch() {
    const query = search.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    results.hidden = !query;
    if (!query) return;
    for (const section of document.querySelectorAll('.publication-section')) {
      const text = section.textContent.replace(/\s+/g, ' ').trim();
      const position = text.toLocaleLowerCase().indexOf(query);
      if (position < 0) continue;
      const link = document.createElement('a');
      link.href = `#${section.id}`;
      const title = document.createElement('strong');
      title.textContent = data.sections.find(item => item.id === section.id).title;
      const excerpt = document.createElement('span');
      excerpt.textContent = text.slice(Math.max(0, position - 50), position + query.length + 120);
      link.append(title, excerpt);
      results.appendChild(link);
    }
    if (!results.children.length) results.textContent = 'No results found.';
  }

  const chartInstances = [];
  const diagramInstances = [];
  const nativeVisuals = [];
  let activePalette = savedPalette();

  function tableData(table) {
    const headers = [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim());
    const rows = [...table.querySelectorAll('tbody tr')].map(row =>
      [...row.querySelectorAll('td')].map(cell => cell.textContent.trim()));
    return { headers, rows };
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createArchitecture(panel, table) {
    const data = tableData(table);
    const frame = element('div', 'architecture-frame');
    const stack = element('div', 'architecture-stack');
    const rail = element('aside', 'architecture-rail');
    data.rows.forEach((row, index) => {
      const [name, description, placement = 'Stack', note = ''] = row;
      const band = element('section', 'architecture-band');
      band.style.setProperty('--band-color', `var(--visual-${index % 5 + 1})`);
      band.style.setProperty('--band-ink', index === 3 || activePalette === 'contrast' ? '#ffffff' : 'var(--visual-band-ink)');
      band.append(element('h4', '', name), element('p', '', description));
      if (note) band.append(element('span', 'architecture-note', note));
      (placement.toLocaleLowerCase() === 'side' ? rail : stack).appendChild(band);
    });
    frame.append(stack, rail);
    panel.replaceChildren(element('div', 'visual-kicker', 'Solution architecture'), frame);
  }

  function createSalesRoadmap(panel, table) {
    const data = tableData(table);
    const frame = element('div', 'roadmap-frame');
    const header = element('div', 'roadmap-header');
    header.append(element('span', 'roadmap-eyebrow', 'Illustrative transformation plan'), element('h4', '', 'From current state to measurable business outcomes'));
    const track = element('div', 'roadmap-track');
    data.rows.forEach((row, index) => {
      const [phase, objective, activities, outcome, timing] = row;
      const card = element('section', 'roadmap-phase');
      card.style.setProperty('--phase-color', `var(--visual-${index % 5 + 1})`);
      card.append(element('span', 'roadmap-phase-number', String(index + 1).padStart(2, '0')), element('h4', '', phase), element('strong', 'roadmap-objective', objective), element('p', '', activities), element('span', 'roadmap-timing', timing), element('div', 'roadmap-outcome', outcome));
      track.appendChild(card);
    });
    const footer = element('div', 'roadmap-footer');
    footer.append(element('strong', '', 'Customer decision gates'), element('span', '', 'Align outcomes, approve investment, confirm readiness, then scale with evidence.'));
    frame.append(header, track, footer);
    panel.replaceChildren(frame);
  }

  function createNativeVisuals() {
    for (const panel of document.querySelectorAll('.native-visual[data-visual]')) {
      const table = panel.nextElementSibling;
      if (table?.tagName !== 'TABLE') continue;
      if (panel.dataset.visual === 'architecture') createArchitecture(panel, table);
      if (panel.dataset.visual === 'sales-roadmap') createSalesRoadmap(panel, table);
      nativeVisuals.push(panel);
    }
  }

  function chartData(table) {
    const headers = [...table.querySelectorAll('thead th')].map(cell => cell.textContent.trim());
    const rows = [...table.querySelectorAll('tbody tr')].map(row => {
      const cells = [...row.querySelectorAll('td')].map(cell => cell.textContent.trim());
      const values = cells.slice(1).map(value => Number(value.replace(',', '.')));
      return { label: cells[0] || '', values };
    });
    if (headers.length < 2 || !rows.length || rows.some(row => row.values.length !== headers.length - 1 || row.values.some(value => !Number.isFinite(value)))) return null;
    return { headers, rows };
  }

  function chartOption(type, data) {
    const categories = data.rows.map(row => row.label);
    const seriesNames = data.headers.slice(1);
    const seriesValues = seriesNames.map((_, index) => data.rows.map(row => row.values[index]));
    const palette = chartPalettes[activePalette];
    const base = {
      animation: !reducedMotion,
      animationDuration: 650,
      animationEasing: 'cubicOut',
      animationDurationUpdate: 420,
      animationEasingUpdate: 'cubicOut',
      aria: { enabled: true },
      color: palette,
      textStyle: { fontFamily: 'Segoe UI, sans-serif', color: '#eaf2f5' },
      tooltip: { trigger: type === 'radar' || type === 'donut' || type === 'funnel' ? 'item' : 'axis', backgroundColor: 'rgba(10, 24, 33, 0.96)', borderColor: palette[1], textStyle: { color: '#ffffff' } }
    };
    if (type === 'radar') {
      const maximum = Math.max(...data.rows.flatMap(row => row.values));
      return {
        ...base,
        legend: { bottom: 0, data: seriesNames, textStyle: { color: '#eaf2f5' } },
        radar: { indicator: categories.map(name => ({ name, max: Math.ceil(maximum * 1.15), color: '#eaf2f5' })), radius: '62%', axisName: { color: '#eaf2f5' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)' } }, splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.06)'] } }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.24)' } } },
        series: [{ type: 'radar', data: seriesNames.map((name, index) => ({ name, value: data.rows.map(row => row.values[index]) })) }]
      };
    }
    if (type === 'donut') {
      return {
        ...base,
        legend: { bottom: 0, textStyle: { color: '#eaf2f5' } },
        series: [{ type: 'pie', radius: ['42%', '72%'], avoidLabelOverlap: true, label: { color: '#ffffff', formatter: '{b}: {c}' }, labelLine: { lineStyle: { color: 'rgba(255,255,255,0.55)' } }, data: categories.map((name, index) => ({ name, value: data.rows[index].values[0] })) }]
      };
    }
    if (type === 'funnel') {
      return {
        ...base,
        legend: { bottom: 0, textStyle: { color: '#eaf2f5' } },
        series: [{ type: 'funnel', left: '12%', top: 18, bottom: 48, width: '76%', sort: 'descending', gap: 4, label: { position: 'inside', color: '#ffffff' }, data: categories.map((name, index) => ({ name, value: data.rows[index].values[0] })) }]
      };
    }
    if (type === 'scatter') {
      return {
        ...base,
        grid: { top: 24, right: 28, bottom: 48, left: 52 },
        xAxis: { type: 'value', name: seriesNames[0], nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: '#eaf2f5' }, axisLabel: { color: '#c7d7dd' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } } },
        yAxis: { type: 'value', name: seriesNames[1], nameLocation: 'middle', nameGap: 38, nameTextStyle: { color: '#eaf2f5' }, axisLabel: { color: '#c7d7dd' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } } },
        series: [{ type: 'scatter', symbolSize: 18, data: data.rows.map(row => ({ value: row.values, name: row.label })) }]
      };
    }
    if (type === 'heatmap') {
      const allValues = data.rows.flatMap(row => row.values);
      return {
        ...base,
        tooltip: { position: 'top' },
        grid: { top: 20, right: 20, bottom: 56, left: 76 },
        xAxis: { type: 'category', data: seriesNames, axisLabel: { color: '#eaf2f5' }, splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.025)', 'rgba(255,255,255,0.055)'] } } },
        yAxis: { type: 'category', data: categories, axisLabel: { color: '#eaf2f5' }, splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.025)', 'rgba(255,255,255,0.055)'] } } },
        visualMap: { min: Math.min(...allValues), max: Math.max(...allValues), orient: 'horizontal', left: 'center', bottom: 0, textStyle: { color: '#eaf2f5' }, inRange: { color: [palette[4], palette[0]] } },
        series: [{ type: 'heatmap', label: { show: true }, data: data.rows.flatMap((row, rowIndex) => row.values.map((value, columnIndex) => [columnIndex, rowIndex, value])) }]
      };
    }
    const isHorizontal = type === 'bar' || type === 'stacked-bar';
    return {
      ...base,
      legend: seriesNames.length > 1 ? { bottom: 0, data: seriesNames, textStyle: { color: '#eaf2f5' } } : undefined,
      grid: { top: 20, right: 28, bottom: seriesNames.length > 1 ? 48 : 36, left: 52, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: isHorizontal
        ? { type: 'value', axisLabel: { color: '#c7d7dd' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } } }
        : { type: 'category', data: categories, axisLabel: { color: '#eaf2f5' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.24)' } } },
      yAxis: isHorizontal
        ? { type: 'category', data: categories, axisLabel: { color: '#eaf2f5' }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.24)' } } }
        : { type: 'value', axisLabel: { color: '#c7d7dd' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } } },
      series: seriesNames.map((name, index) => ({
        name,
        type: type === 'stacked-bar' ? 'bar' : type === 'area' ? 'line' : type,
        data: seriesValues[index],
        stack: type === 'stacked-bar' || type === 'area' ? 'total' : undefined,
        areaStyle: type === 'area' ? { opacity: 0.25 } : undefined,
        symbolSize: 8,
        showBackground: isHorizontal,
        backgroundStyle: isHorizontal ? { color: 'rgba(255,255,255,0.07)' } : undefined,
        itemStyle: { borderRadius: isHorizontal ? [0, 2, 2, 0] : 0 }
      }))
    };
  }

  function createCharts() {
    if (typeof echarts === 'undefined') return;
    for (const panel of document.querySelectorAll('.chart-panel[data-chart]')) {
      const table = panel.nextElementSibling;
      const data = table?.tagName === 'TABLE' ? chartData(table) : null;
      if (!data) continue;
      const type = panel.dataset.chart;
      panel.setAttribute('role', 'img');
      panel.setAttribute('aria-label', `${type.replace('-', ' ')} chart based on ${data.headers.join(', ')} in the following data table`);
      const chart = echarts.init(panel, null, { renderer: 'svg' });
      chart.setOption(chartOption(type, data));
      chartInstances.push({ chart, type, data });
    }
  }

  function diagramTheme() {
    const primary = chartPalettes[activePalette];
    return {
      theme: 'base',
      themeVariables: {
        primaryColor: primary[0],
        primaryTextColor: '#ffffff',
        primaryBorderColor: primary[0],
        lineColor: primary[3],
        secondaryColor: primary[1],
        secondaryTextColor: '#ffffff',
        secondaryBorderColor: primary[1],
        tertiaryColor: primary[2],
        tertiaryTextColor: '#173048',
        tertiaryBorderColor: primary[2],
        clusterBkg: '#eef3f6',
        clusterBorder: primary[3],
        actorBkg: primary[0],
        actorBorder: primary[0],
        actorTextColor: '#ffffff',
        signalColor: primary[3],
        signalTextColor: '#263746',
        noteBkgColor: primary[2],
        noteBorderColor: primary[2],
        noteTextColor: '#173048',
        gantt1: primary[0],
        gantt2: primary[1],
        gantt3: primary[2],
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '14px'
      },
      flowchart: { htmlLabels: true, curve: 'basis', nodeSpacing: 34, rankSpacing: 52 },
      gantt: { barHeight: 24, fontSize: 12, leftPadding: 120, useMaxWidth: true },
      securityLevel: 'strict',
      startOnLoad: false
    };
  }

  function scrollToHashTarget() {
    if (typeof document === 'undefined' || !document.documentElement?.isConnected) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    target?.scrollIntoView?.({ block: 'start' });
  }

  async function prepareDiagrams() {
    if (typeof mermaid === 'undefined') return;
    for (const code of document.querySelectorAll('pre > code.language-mermaid')) {
      const source = code.textContent.trim();
      const pre = code.parentElement;
      const wrapper = document.createElement('div');
      wrapper.className = 'diagram-panel';
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      diagram.textContent = source;
      wrapper.appendChild(diagram);
      pre.replaceWith(wrapper);
      diagramInstances.push({ element: diagram, source });
    }
    await renderDiagrams();
    scrollToHashTarget();
  }

  async function renderDiagrams(force = false) {
    if (typeof mermaid === 'undefined' || !diagramInstances.length) return;
    mermaid.initialize(diagramTheme());
    for (const instance of diagramInstances) {
      const section = instance.element.closest('.publication-section');
      if (section?.hidden || (!force && instance.renderedPalette === activePalette)) continue;
      instance.element.className = 'mermaid';
      instance.element.replaceChildren(document.createTextNode(instance.source));
      instance.element.removeAttribute('data-processed');
      try {
        await mermaid.run({ nodes: [instance.element] });
        instance.renderedPalette = activePalette;
      } catch (error) {
        instance.element.className = 'diagram-source diagram-error';
        instance.element.textContent = instance.source;
        instance.element.setAttribute('role', 'img');
        instance.element.setAttribute('aria-label', 'Diagram could not be rendered; source is shown below');
      }
    }
  }

  function updateVisualTheme(name) {
    const colors = chartPalettes[name];
    colors.forEach((color, index) => document.documentElement.style.setProperty(`--visual-${index + 1}`, color));
    document.documentElement.style.setProperty('--visual-canvas', name === 'fujitsu' ? 'linear-gradient(145deg, #12212b, #20404d)' : name === 'contrast' ? 'linear-gradient(145deg, #101d2a, #28201d)' : 'linear-gradient(145deg, #10292e, #293b43)');
    document.documentElement.style.setProperty('--visual-band-ink', name === 'contrast' ? '#ffffff' : '#173048');
  }

  function updateChartPalette(name) {
    if (!chartPalettes[name]) return;
    activePalette = name;
    document.body.dataset.chartPalette = name;
    paletteSelect.value = name;
    updateVisualTheme(name);
    chartInstances.forEach(({ chart, type, data }) => chart.setOption(chartOption(type, data), { notMerge: false }));
    void renderDiagrams(true);
    try {
      localStorage.setItem('docforge-chart-palette', name);
    } catch {}
  }

  function resizeCharts() {
    chartInstances.forEach(({ chart }) => chart.resize());
  }

  for (const sectionId of data.navigation?.tabSections || []) {
    const section = document.getElementById(sectionId);
    if (section) createSectionTabs(section);
  }
  updateNavigation();
  updateChartPalette(activePalette);
  createCharts();
  createNativeVisuals();
  void prepareDiagrams();
  paletteSelect.addEventListener('change', () => updateChartPalette(paletteSelect.value));
  bindGroups();
  measureHeader();
  window.addEventListener('resize', () => {
    measureHeader();
    resizeCharts();
  });
  window.addEventListener('beforeprint', resizeCharts);
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(measureHeader);
    observer.observe(header);
    observer.observe(navigation);
  }
  window.addEventListener('hashchange', async () => {
    updateNavigation();
    resizeCharts();
    await renderDiagrams();
    scrollToHashTarget();
  });
  search.addEventListener('input', updateSearch);
  search.addEventListener('keydown', event => { if (event.key === 'Escape') { results.hidden = true; search.blur(); } });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-group')) closeGroups();
    if (!event.target.closest('.search-control, .search-results')) results.hidden = true;
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeGroups(true); });
  document.getElementById('print-button').addEventListener('click', () => window.print());
})();
