(() => {
 'use strict';
 const $=id=>document.getElementById(id),db=JSON.parse($('database').textContent);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const current=()=>{const view=window.YKPublicGet();return {mode:view.record?.mode||view.mode,d:view.record||view.draft,imported:!!view.record}};
 function report(){
  const {mode,d,imported}=current(),skills=mode==='adult'?db.adultSkills:db.kidSkills,dimensions=mode==='adult'?db.assessmentDimensions:[];
  const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=1&&v<=(mode==='adult'?5:4);
  const rated=skills.filter(s=>valid(d.scores[s.id])),dimRated=dimensions.filter(s=>valid(d.dimensionScores?.[s.id]));
  if(!rated.length&&!dimRated.length)throw Error('请先完成至少一项评分，再下载报告。');
  if(!imported)$('openRadars').click();
  const mean=rated.length?(rated.reduce((n,s)=>n+d.scores[s.id],0)/rated.length).toFixed(2):'未评';
  const name=$('publicName').value.trim()||d.studentName||'匿名自评',date=imported?d.date:$('sessionDate').value;
  const rows=(items,scores)=>items.map(s=>{const value=scores?.[s.id],band=valid(value)?s.scoring?.rubric_bilingual?.find(r=>r.score===Math.floor(value)):null;return `<tr><th>${esc(s.name_zh)}<br><small>${esc(s.name_en)}</small></th><td>${valid(value)?esc(value)+' / '+(mode==='adult'?5:4):'未评'}</td><td>${band?esc(band.zh)+'<br><small>'+esc(band.en)+'</small>':'—'}</td></tr>`}).join('');
  const chart=(id,title)=>`<div class="report-chart"><h3>${title}</h3>${$(id).innerHTML}</div>`;
  const body=`<h1>YK Pickleball 自评报告</h1><p>${esc(name)} · ${esc(date)} · ${mode==='adult'?'成人技术':'儿童启蒙'}</p><p>综合技术已评 ${rated.length} / ${skills.length} 项 · 已评项均分 ${mean} · 细分已评 ${dimRated.length} 项。未评项目不按 0 分计算。</p><p>自评结果仅供练习参考，不是官方 DUPR 等级。标准版本：${esc(mode==='adult'?db.rubricVersion:'yk-kid-2026.11-v1')}。分数含半分时，下表列出向下取整档位的参考标准。</p><div class="report-charts">${chart('categoryRadar','能力雷达图')}${mode==='adult'?chart('pairRadar','正反手对比')+chart('serveDimensionRadar','发球细分')+chart('returnDimensionRadar','接发细分'):''}</div><h2>逐项自评</h2><table class="report-table"><thead><tr><th>项目</th><th>分数</th><th>该档参考表现</th></tr></thead><tbody>${rows(skills,d.scores)}</tbody></table>${dimensions.length?'<h2>发球与接发细分</h2><table class="report-table"><tr><th>项目</th><th>分数</th><th>该档参考表现</th></tr>'+rows(dimensions,d.dimensionScores)+'</table>':''}<h2>自评备注</h2><p style="white-space:pre-wrap">${esc(d.note||'无')}</p><h2>练习计划</h2><ul>${(d.drills||[]).map(x=>'<li>'+esc(x)+'</li>').join('')||'<li>未选择练习，可在工具的练习推荐页选择。</li>'}</ul><p>本报告由浏览器生成，评分未上传至 YK Coach Studio 数据库。</p>`;
  return {body,name,date,mode,d};
 }
 const styles='body{font:15px/1.7 system-ui,sans-serif;color:#17243b;max-width:1000px;margin:auto;padding:25px}h1,h2{color:#176d72}.report-charts{display:grid;grid-template-columns:1fr 1fr;gap:18px}svg{width:100%;height:auto}.report-chart{break-inside:avoid}.report-table{width:100%;border-collapse:collapse;font-size:12px}.report-table td,.report-table th{text-align:left;padding:8px;border-bottom:1px solid #ddd}small{color:#526376}@media(max-width:650px){.report-charts{grid-template-columns:1fr}}@media print{tr{break-inside:avoid}}';
 function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 const action=fn=>()=>{try{fn();$('reportStatus').textContent='报告已在浏览器生成。请保存下载文件；刷新页面会清空本次评分。'}catch(e){$('reportStatus').textContent=e.message}};
 $('downloadReport').onclick=action(()=>{const r=report();download('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:"><title>YK Pickleball 自评报告</title><style>'+styles+'</style><body>'+r.body+'</body></html>','text/html;charset=utf-8','yk-self-assessment-'+r.date+'.html')});
 $('printReport').onclick=action(()=>{$('printArea').innerHTML=report().body;window.print()});
 $('downloadScores').onclick=action(()=>{const r=report();download(JSON.stringify({app:'YK Coach Studio',schemaVersion:2,assessment:{studentName:r.name,mode:r.mode,date:r.date,scores:r.d.scores,dimensionScores:r.d.dimensionScores||{},note:r.d.note||'',drills:r.d.drills||[],rubricVersion:r.mode==='adult'?db.rubricVersion:'yk-kid-2026.11-v1'}},null,2),'application/json','yk-self-assessment-'+r.date+'.json')});
 $('resetTrial').onclick=()=>{if(!confirm('清空成人和儿童两种模式的全部评分？请先下载需要保留的报告。'))return;location.reload()};
 window.YKPublicReport={current,report};
})();
