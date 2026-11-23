(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const db = JSON.parse($('database').textContent);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const groups = [
    {id:'serve_f', name:'发球'},
    {id:'return_f', name:'正手接发'},
    {id:'return_b', name:'反手接发'}
  ];
  const section = document.createElement('section');
  section.className = 'panel guided-entry';
  section.id = 'guidedAssessment';
  section.innerHTML = `<h2>跟着步骤完成自评</h2><p>先测一组，逐项查看方法、记录10次尝试，再确认分数。</p><div class="bar">${groups.map(group => `<button class="primary" data-guide-group="${group.id}">${group.name} · 4项</button>`).join('')}</div><div id="guidedBody" hidden></div>`;
  document.querySelector('.public-intro').append(section);
  let dimensions = [], index = 0;
  const evidence = {};

  function render() {
    const dimension = dimensions[index];
    const body = $('guidedBody');
    const rated = window.YKPublicGet().draft.dimensionScores || {};
    body.hidden = false;
    body.innerHTML = `<div class="guided-heading"><p>第 ${index + 1} / ${dimensions.length} 项 · 已评 ${dimensions.filter(item => rated[item.id] != null).length} 项</p><button class="secondary" id="guideExit">返回完整评分表</button></div>
      <h3>${escape(dimension.name_zh)}</h3><p>${escape(dimension.name_en)}</p>
      <div class="guided-method"><h4>先做测试</h4><p>${escape(dimension.scoring.test_protocol.zh)}<span class="rubric-en">${escape(dimension.scoring.test_protocol.en)}</span></p><h4>怎样算达标</h4><p>${escape(dimension.scoring.success_criteria.zh)}<span class="rubric-en">${escape(dimension.scoring.success_criteria.en)}</span></p></div>
      <div id="guideControl"></div>
      <fieldset class="guided-count"><legend>根据测试次数查看参考档位（选填）</legend>
      <label class="field">10次中达标几次？<input id="guideCount" type="number" min="0" max="10" step="1" placeholder="0–10"></label>
      ${dimension.key === 'variation' ? '<div class="bar"><label class="field">方案A达标次数<input id="guideA" type="number" min="0" max="5" step="1"></label><label class="field">方案B达标次数<input id="guideB" type="number" min="0" max="5" step="1"></label></div><p>两种方案各测5次，A和B的达标次数相加应等于总达标数。</p>' : ''}
      <button class="secondary" id="guideSuggest">查看参考档位</button><p id="guideSuggestion" role="status"></p><button class="secondary" id="guideApply" hidden>采用参考分</button></fieldset>
      <p id="guideStatus" role="status"></p><div class="bar"><button class="secondary" id="guidePrevious" ${index === 0 ? 'disabled' : ''}>上一项</button><button class="secondary" id="guideSkip">跳过，保留已有分数</button><button class="primary" id="guideNext">${index === dimensions.length - 1 ? '确认并查看结果' : '确认，下一项'}</button></div>`;
    window.YKPublicGuided.render(dimension.id, $('guideControl'));
    const recorded = evidence[dimension.id] || {};
    for (const field of ['Count','A','B']) if ($('guide' + field)) $('guide' + field).value = recorded[field] ?? '';
    let suggestion = null;
    const invalidate = () => {
      suggestion = null;
      $('guideApply').hidden = true;
      $('guideSuggestion').textContent = '';
      evidence[dimension.id] = Object.fromEntries(['Count','A','B'].filter(field => $('guide' + field)).map(field => [field, $('guide' + field).value]));
    };
    for (const field of ['Count','A','B']) if ($('guide' + field)) $('guide' + field).oninput = invalidate;
    $('guideSuggest').onclick = () => {
      invalidate();
      const raw = $('guideCount').value, count = Number(raw);
      if (raw === '' || !Number.isInteger(count) || count < 0 || count > 10) {
        $('guideSuggestion').textContent = '请填写0–10之间的整数，未测试请跳过。';
        return;
      }
      suggestion = count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : count <= 8 ? 4 : 5;
      if ($('guideA')) {
        const a = Number($('guideA').value), b = Number($('guideB').value);
        if ($('guideA').value === '' || $('guideB').value === '' || ![a,b].every(value => Number.isInteger(value) && value >= 0 && value <= 5) || a + b !== count) {
          $('guideSuggestion').textContent = '请填写A、B各0–5次的达标数，且两项之和等于总达标数。';
          suggestion = null;
          return;
        }
        const balance = Math.min(a,b);
        suggestion = Math.min(suggestion, balance >= 4 ? 5 : balance >= 3 ? 4 : balance >= 2 ? 3 : 2);
      }
      const band = dimension.scoring.rubric_bilingual.find(item => item.score === suggestion);
      $('guideSuggestion').textContent = `参考 ${suggestion} 分。${band.zh} 请核对表现与测试条件，再采用参考分或手动调整。`;
      $('guideApply').hidden = false;
    };
    $('guideApply').onclick = () => {
      if (suggestion == null) return;
      const control = $('guideControl');
      const score = control.querySelector('.dimension-score');
      score.value = String(suggestion);
      score.dispatchEvent(new Event('input'));
      const count = control.querySelector('.dimension-count');
      count.value = `${$('guideCount').value}/10`;
      count.dispatchEvent(new Event('change'));
      if ($('guideA')) {
        const note = control.querySelector('.dimension-note');
        const previous = note.value.replace(/^A \d\/5，B \d\/5(?:；)?/, '');
        note.value = `A ${$('guideA').value}/5，B ${$('guideB').value}/5` + (previous ? '；' + previous : '');
        note.dispatchEvent(new Event('change'));
      }
      $('guideStatus').textContent = `已采用 ${suggestion} 分，可继续拖动滑条调整。`;
    };
    const advance = () => index < dimensions.length - 1 ? (index++, render()) : finish();
    $('guidePrevious').onclick = () => { if (index > 0) { index--; render(); } };
    $('guideSkip').onclick = advance;
    $('guideNext').onclick = () => {
      if (window.YKPublicGet().draft.dimensionScores?.[dimension.id] == null) {
        $('guideStatus').textContent = '请先评分，或点击跳过。';
        return;
      }
      advance();
    };
    $('guideExit').onclick = exit;
  }

  function exit() {
    $('guidedBody').hidden = true;
    document.getElementById('scorePanel').hidden = false;
    window.YKPublicGuided.refresh();
  }

  function finish() {
    exit();
    const scores = window.YKPublicGet().draft.dimensionScores || {};
    const rated = dimensions.filter(dimension => scores[dimension.id] != null).sort((a,b) => scores[a.id] - scores[b.id]);
    const body = $('guidedBody');
    body.hidden = false;
    const focus = rated[0];
    const practice = {
      depth:'保持相同来球和站位，分3组各10球练目标深区，先保合法入区，再逐渐提高深度。每组记录达标数。',
      placement:'固定来球条件，轮流叫定外侧、中路、内侧目标带，分3组各10球，记录方向是否按要求完成。',
      variation:'预先选定A、B两种合法发球方案，每种5次为一组。练3组，分别记录每种方案的达标数。',
      spin:'选定一种旋转，按测试协议观察弹跳或轨迹，分3组各10球，记录同时满足合法入区和旋转效果的次数。',
      height:'与搭档约定接发弧线和衔接时间，分3组各10球，记录同时满足两项条件的回球数。',
      recovery:'接发后按回球质量分段前进，在对方触球时停稳准备，分3组各10次观察上网和停步时机。'
    };
    body.innerHTML = `<h3>本组已评 ${rated.length} / ${dimensions.length} 项</h3><p>本组细分已同步到雷达图和下载报告。</p>${focus ? `<h4>下次优先练 · ${escape(focus.name_zh)}（${scores[focus.id]}分）</h4><p>${escape(practice[focus.key])}</p><p>复测时沿用本次目标区、来球条件和10次测试方法，再比较达标次数。</p>` : '<p>本组暂未评分，可随时重新开始。</p>'}<button class="primary" id="guideResults">查看雷达图与下载报告</button>`;
    $('guideResults').onclick = () => {
      window.YKPublicGuided.refresh();
      $('openRadars').click();
      $('radarsPanel').scrollIntoView?.({behavior:'smooth',block:'start'});
    };
  }

  section.querySelectorAll('[data-guide-group]').forEach(button => button.onclick = () => {
    window.YKPublicGuided.start();
    dimensions = db.assessmentDimensions.filter(dimension => dimension.parent_id === button.dataset.guideGroup);
    index = 0;
    $('scorePanel').hidden = true;
    render();
    section.scrollIntoView?.({behavior:'smooth',block:'start'});
  });
})();
