(function () {
  'use strict';

  const ALGO_CONFIG = {
    FCFS:  { name: 'FCFS',   fullName: 'First-Come, First-Served',   color: '#2563eb', desc: 'Arrival Order' },
    SSTF:  { name: 'SSTF',   fullName: 'Shortest Seek Time First',   color: '#059669', desc: 'Closest Request' },
    SCAN:  { name: 'SCAN',   fullName: 'Elevator Algorithm',         color: '#d97706', desc: 'Elevator (End)' },
    CSCAN: { name: 'C-SCAN', fullName: 'Circular SCAN',              color: '#dc2626', desc: 'Circular (Jump)' },
    LOOK:  { name: 'LOOK',   fullName: 'Look Elevator',              color: '#7c3aed', desc: 'Furthest (No Jump)' }
  };
  const ALL_ALGOS = ['FCFS', 'SSTF', 'SCAN', 'CSCAN', 'LOOK'];
  let selectedAlgos = new Set(ALL_ALGOS);

  const $ = id => document.getElementById(id);
  const qInput = $('requestQueueInput'), hInput = $('initialHeadInput'), sInput = $('diskSizeInput'), dirInput = $('headDirectionSelect');
  const errBanner = $('errorBanner'), errMsg = $('errorMessage'), countBadge = $('algoCountBadge');
  const bestName = $('bestAlgoName'), bestVal = $('bestSeekVal'), worstName = $('worstAlgoName'), worstVal = $('worstSeekVal');
  const chartSvg = $('barChartSvg'), cardsGrid = $('sequenceCardsGrid'), effText = $('efficiencyText');

  function init() {
    $('algoSelectorList').querySelectorAll('.algo-choice').forEach(el => {
      el.addEventListener('click', () => toggleAlgo(el.dataset.algo));
      el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleAlgo(el.dataset.algo); } });
    });
    $('btnSelectAll').addEventListener('click', () => { ALL_ALGOS.forEach(k => selectedAlgos.add(k)); updateSelectionUI(); run(); });
    $('startBtn').addEventListener('click', run);
    $('resetBtn').addEventListener('click', reset);
    $('loadDefaultBtn').addEventListener('click', reset);
    $('dismissAlertBtn').addEventListener('click', () => errBanner.style.display = 'none');
    [qInput, hInput, sInput, dirInput].forEach(el => el.addEventListener('input', run));
    updateSelectionUI();
    run();
  }

  function toggleAlgo(key) {
    if (selectedAlgos.has(key)) {
      if (selectedAlgos.size <= 1) return showErr('At least 1 algorithm must remain selected.');
      selectedAlgos.delete(key);
    } else {
      selectedAlgos.add(key);
    }
    updateSelectionUI();
    run();
  }

  function updateSelectionUI() {
    countBadge.textContent = `${selectedAlgos.size}/5 Selected`;
    document.querySelectorAll('.algo-choice').forEach(el => {
      const active = selectedAlgos.has(el.dataset.algo);
      el.classList.toggle('selected', active);
      el.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  function showErr(msg) { errMsg.textContent = msg; errBanner.style.display = 'flex'; }
  function clearErr() { errBanner.style.display = 'none'; errMsg.textContent = ''; }

  function parseInputs() {
    clearErr();
    const size = parseInt(sInput.value.trim(), 10), maxTrack = size - 1, head = parseInt(hInput.value.trim(), 10);
    if (isNaN(size) || size < 10) return showErr('Disk Tracks must be at least 10.');
    if (isNaN(head) || head < 0 || head > maxTrack) return showErr(`Initial Head must be between 0 and ${maxTrack}.`);
    const tokens = qInput.value.split(',').map(s => s.trim()).filter(Boolean);
    const reqs = [], seen = new Set();
    for (const t of tokens) {
      const val = Number(t);
      if (isNaN(val) || !Number.isInteger(val) || val < 0 || val > maxTrack) return showErr(`Invalid track "${t}". Must be 0-${maxTrack}.`);
      if (!seen.has(val)) { seen.add(val); reqs.push(val); }
    }
    if (!reqs.length) return showErr('Request queue cannot be empty.');
    return { reqs, head, maxTrack, dir: dirInput.value };
  }

  function computeFCFS(reqs, head) {
    let cur = head, seek = 0, steps = [];
    reqs.forEach(r => { const d = Math.abs(r - cur); seek += d; steps.push({ from: cur, to: r, seek: d, label: `${r}` }); cur = r; });
    return { totalSeek: seek, steps, order: reqs.slice() };
  }

  function computeSSTF(reqs, head, dir) {
    let cur = head, seek = 0, steps = [], pending = [...reqs], order = [];
    while (pending.length) {
      let b = 0, minD = Math.abs(pending[0] - cur);
      for (let i = 1; i < pending.length; i++) {
        const d = Math.abs(pending[i] - cur);
        if (d < minD || (d === minD && dir === 'high' && pending[i] > pending[b])) { minD = d; b = i; }
      }
      const t = pending.splice(b, 1)[0];
      seek += minD; steps.push({ from: cur, to: t, seek: minD, label: `${t}` });
      cur = t; order.push(t);
    }
    return { totalSeek: seek, steps, order };
  }

  function computeSCAN(reqs, head, maxTrack, dir) {
    let cur = head, seek = 0, steps = [];
    const R = reqs.filter(r => r >= head).sort((a, b) => a - b);
    const L = reqs.filter(r => r < head).sort((a, b) => b - a);
    const add = (to, bound) => { const d = Math.abs(to - cur); seek += d; steps.push({ from: cur, to, seek: d, bound, label: bound ? `${to} (End)` : `${to}` }); cur = to; };
    if (dir === 'high') {
      R.forEach(r => add(r, false));
      if (L.length) { if (cur !== maxTrack) add(maxTrack, true); L.forEach(r => add(r, false)); }
    } else {
      L.forEach(r => add(r, false));
      if (R.length) { if (cur !== 0) add(0, true); R.sort((a, b) => a - b).forEach(r => add(r, false)); }
    }
    return { totalSeek: seek, steps, order: steps.filter(s => !s.bound).map(s => s.to) };
  }

  function computeCSCAN(reqs, head, maxTrack, dir) {
    let cur = head, seek = 0, steps = [];
    const R = reqs.filter(r => r >= head).sort((a, b) => a - b);
    const L = reqs.filter(r => r < head).sort((a, b) => a - b);
    const add = (to, bound, jmp) => { const d = Math.abs(to - cur); seek += d; steps.push({ from: cur, to, seek: d, bound, label: bound ? (jmp ? `${to} (Jump)` : `${to} (End)`) : `${to}` }); cur = to; };
    if (dir === 'high') {
      R.forEach(r => add(r, false));
      if (L.length) {
        if (cur !== maxTrack) add(maxTrack, true, false);
        seek += maxTrack; steps.push({ from: maxTrack, to: 0, seek: maxTrack, bound: true, label: '0 (Jump)' }); cur = 0;
        L.forEach(r => add(r, false));
      }
    } else {
      const Ld = reqs.filter(r => r <= head).sort((a, b) => b - a);
      const Rd = reqs.filter(r => r > head).sort((a, b) => b - a);
      Ld.forEach(r => add(r, false));
      if (Rd.length) {
        if (cur !== 0) add(0, true, false);
        seek += maxTrack; steps.push({ from: 0, to: maxTrack, seek: maxTrack, bound: true, label: `${maxTrack} (Jump)` }); cur = maxTrack;
        Rd.forEach(r => add(r, false));
      }
    }
    return { totalSeek: seek, steps, order: steps.filter(s => !s.bound).map(s => s.to) };
  }

  function computeLOOK(reqs, head, dir) {
    let cur = head, seek = 0, steps = [];
    const R = reqs.filter(r => r >= head).sort((a, b) => a - b);
    const L = reqs.filter(r => r < head).sort((a, b) => b - a);
    const add = to => { const d = Math.abs(to - cur); seek += d; steps.push({ from: cur, to, seek: d, label: `${to}` }); cur = to; };
    if (dir === 'high') { R.forEach(add); if (L.length) L.forEach(add); }
    else { L.forEach(add); if (R.length) R.sort((a, b) => a - b).forEach(add); }
    return { totalSeek: seek, steps, order: steps.map(s => s.to) };
  }

  function run() {
    const p = parseInputs();
    if (!p) return;
    const results = [];
    ALL_ALGOS.forEach(k => {
      if (!selectedAlgos.has(k)) return;
      let res;
      if (k === 'FCFS') res = computeFCFS(p.reqs, p.head);
      else if (k === 'SSTF') res = computeSSTF(p.reqs, p.head, p.dir);
      else if (k === 'SCAN') res = computeSCAN(p.reqs, p.head, p.maxTrack, p.dir);
      else if (k === 'CSCAN') res = computeCSCAN(p.reqs, p.head, p.maxTrack, p.dir);
      else if (k === 'LOOK') res = computeLOOK(p.reqs, p.head, p.dir);
      results.push({ key: k, cfg: ALGO_CONFIG[k], seek: res.totalSeek, steps: res.steps, order: res.order });
    });
    if (!results.length) return;

    let minS = Math.min(...results.map(r => r.seek)), maxS = Math.max(...results.map(r => r.seek));
    results.forEach(r => { r.isBest = results.length > 1 && r.seek === minS; r.isWorst = results.length > 1 && r.seek === maxS && !r.isBest; });

    $('currentStatusBadge').textContent = `${results.length} Evaluated`;
    updateHighlights(results, minS, maxS);
    renderChart(results, maxS);
    renderCards(results, p.head, minS);
  }

  function updateHighlights(results, minS, maxS) {
    if (results.length === 1) {
      $('highlightsRow').style.display = 'none'; $('singleAlgoBanner').style.display = 'flex';
      $('singleEvalDetails').textContent = `${results[0].cfg.fullName}: ${results[0].seek} cylinders head movement.`;
      return;
    }
    $('singleAlgoBanner').style.display = 'none'; $('highlightsRow').style.display = 'grid';
    const best = results.find(r => r.seek === minS), worst = results.find(r => r.seek === maxS);
    bestName.textContent = best.cfg.name; bestName.style.color = best.cfg.color; bestVal.textContent = `${best.seek} cyl`;
    worstName.textContent = worst.cfg.name; worstName.style.color = worst.cfg.color; worstVal.textContent = `${worst.seek} cyl`;
    const diff = maxS - minS;
    effText.textContent = diff === 0 ? `All selected algorithms have identical head movement (${minS} cyl).` : `${best.cfg.name} saves ${diff} cylinders (${((diff / maxS) * 100).toFixed(1)}% reduction) compared to ${worst.cfg.name}.`;
  }

  function renderChart(results, maxS) {
    chartSvg.innerHTML = '';
    const W = 840, H = 360, mL = 65, mR = 40, mT = 50, mB = 55, pW = W - mL - mR, pH = H - mT - mB;
    const step = maxS <= 100 ? 25 : maxS <= 350 ? 50 : 100;
    const yMax = Math.max(Math.ceil((maxS * 1.25) / step) * step, step);
    const ns = 'http://www.w3.org/2000/svg';

    for (let i = 0; i <= 5; i++) {
      const v = Math.round((yMax / 5) * i), y = mT + pH - (v / yMax) * pH;
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', mL); l.setAttribute('y1', y); l.setAttribute('x2', mL + pW); l.setAttribute('y2', y); l.setAttribute('class', 'chart-grid-line');
      chartSvg.appendChild(l);
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', mL - 10); t.setAttribute('y', y + 4); t.setAttribute('text-anchor', 'end'); t.setAttribute('class', 'chart-axis-label'); t.textContent = `${v}`;
      chartSvg.appendChild(t);
    }
    const bLine = document.createElementNS(ns, 'line');
    bLine.setAttribute('x1', mL); bLine.setAttribute('y1', mT + pH); bLine.setAttribute('x2', mL + pW); bLine.setAttribute('y2', mT + pH); bLine.setAttribute('class', 'chart-axis-line');
    chartSvg.appendChild(bLine);

    const slot = pW / results.length, barW = Math.min(84, Math.max(38, slot * 0.52));
    results.forEach((item, i) => {
      const cx = mL + (i + 0.5) * slot, bH = (item.seek / yMax) * pH, bY = mT + pH - bH;
      const g = document.createElementNS(ns, 'g');

      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', cx - barW / 2); r.setAttribute('y', bY); r.setAttribute('width', barW); r.setAttribute('height', bH);
      r.setAttribute('rx', 5); r.setAttribute('fill', item.cfg.color); r.setAttribute('class', 'chart-bar-rect');
      if (item.isBest) { r.setAttribute('stroke', '#059669'); r.setAttribute('stroke-width', '2.5'); }
      else if (item.isWorst) { r.setAttribute('stroke', '#dc2626'); r.setAttribute('stroke-width', '2.5'); }
      g.appendChild(r);

      const val = document.createElementNS(ns, 'text');
      val.setAttribute('x', cx); val.setAttribute('y', bY - 8); val.setAttribute('class', 'chart-val-label'); val.textContent = `${item.seek} cyl`;
      g.appendChild(val);

      if (item.isBest || item.isWorst) {
        const bg = document.createElementNS(ns, 'rect');
        bg.setAttribute('x', cx - (item.isBest ? 34 : 38)); bg.setAttribute('y', bY - 36); bg.setAttribute('width', item.isBest ? 68 : 76); bg.setAttribute('height', 22);
        bg.setAttribute('rx', 11); bg.setAttribute('class', item.isBest ? 'chart-badge-best' : 'chart-badge-worst');
        g.appendChild(bg);
        const bt = document.createElementNS(ns, 'text');
        bt.setAttribute('x', cx); bt.setAttribute('y', bY - 21); bt.setAttribute('class', 'chart-badge-text'); bt.textContent = item.isBest ? '★ BEST' : '▲ WORST';
        g.appendChild(bt);
      }

      const lbl = document.createElementNS(ns, 'text');
      lbl.setAttribute('x', cx); lbl.setAttribute('y', mT + pH + 20); lbl.setAttribute('class', 'chart-algo-label'); lbl.setAttribute('fill', item.cfg.color); lbl.textContent = item.cfg.name;
      g.appendChild(lbl);
      const sub = document.createElementNS(ns, 'text');
      sub.setAttribute('x', cx); sub.setAttribute('y', mT + pH + 35); sub.setAttribute('class', 'chart-algo-sublabel'); sub.textContent = item.cfg.desc;
      g.appendChild(sub);

      chartSvg.appendChild(g);
    });
  }

  function renderCards(results, head, minS) {
    cardsGrid.innerHTML = '';
    const sorted = [...results].sort((a, b) => a.seek - b.seek);
    sorted.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'algo-seq-card';
      const rankClass = item.isBest ? 'rank-best' : item.isWorst ? 'rank-worst' : '';
      const rankText = item.isBest ? '#1 Best' : item.isWorst ? `#${idx + 1} Worst` : `#${idx + 1}`;
      const diffText = item.seek === minS ? '★ Baseline (Best)' : `+${item.seek - minS} cyl (+${(((item.seek - minS) / minS) * 100).toFixed(0)}%)`;

      let pills = `<span class="seq-step-pill initial">Head: ${head}</span>`;
      item.steps.forEach(s => {
        pills += `<span class="seq-step-arrow">→</span><span class="seq-step-pill ${s.bound ? 'bound' : ''}">${s.label}</span>`;
      });

      card.innerHTML = `
        <div class="seq-card-header">
          <span class="seq-algo-pill" style="background:${item.cfg.color}">${item.cfg.name}</span>
          <span class="seq-rank-badge ${rankClass}">${rankText}</span>
        </div>
        <div class="seq-seek-info">
          <div class="seq-total-val">${item.seek} cyl</div>
          <div class="seq-overhead-val" style="color:${item.seek === minS ? '#059669' : ''}">${diffText}</div>
        </div>
        <div class="seq-order-pills">${pills}</div>
      `;
      cardsGrid.appendChild(card);
    });
  }

  function reset() {
    qInput.value = '98, 183, 37, 122, 14, 124, 65, 67';
    hInput.value = '53';
    sInput.value = '200';
    dirInput.value = 'high';
    selectedAlgos = new Set(ALL_ALGOS);
    updateSelectionUI();
    clearErr();
    run();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
