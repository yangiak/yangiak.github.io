/* Browser-only raster exports. No remote libraries, fonts or upload service. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),enc=s=>new TextEncoder().encode(s);
 const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length}return out};
 const jpegBytes=url=>Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));
 const le=(value,size)=>Uint8Array.from({length:size},(_,i)=>(value>>>(i*8))&255);
 function zipFromJpegs(pages){
  const local=[],central=[];let offset=0;
  const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0)}return (value^0xffffffff)>>>0};
  pages.forEach((p,i)=>{const name=enc('report-'+String(i+1).padStart(2,'0')+'.jpg'),checksum=crc(p.bytes),size=p.bytes.length;
   const head=join([le(0x04034b50,4),le(20,2),le(0,2),le(0,2),le(0,2),le(33,2),le(checksum,4),le(size,4),le(size,4),le(name.length,2),le(0,2),name]);
   local.push(head,p.bytes);central.push(join([le(0x02014b50,4),le(20,2),le(20,2),le(0,2),le(0,2),le(0,2),le(33,2),le(checksum,4),le(size,4),le(size,4),le(name.length,2),le(0,2),le(0,2),le(0,2),le(0,2),le(0,4),le(offset,4),name]));offset+=head.length+size;
  });
  const index=join(central);return join([...local,index,le(0x06054b50,4),le(0,2),le(0,2),le(pages.length,2),le(pages.length,2),le(index.length,4),le(offset,4),le(0,2)]);
 }
 function pdfFromJpegs(pages){
  const objects=[null,enc('<< /Type /Catalog /Pages 2 0 R >>'),enc(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`)];
  const stream=(dict,bytes)=>join([enc(`<< ${dict} /Length ${bytes.length} >>\nstream\n`),bytes,enc('\nendstream')]);
  for(const [i,p] of pages.entries()){
   const page=3+i*3,image=page+1,content=page+2;
   objects[page]=enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`);
   objects[image]=stream(`/Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,p.bytes);
   objects[content]=stream('',enc('q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ'));
  }
  const chunks=[enc('%PDF-1.4\n% Local report\n')],offsets=[0];let size=chunks[0].length;
  for(let i=1;i<objects.length;i++){offsets.push(size);const part=join([enc(`${i} 0 obj\n`),objects[i],enc('\nendobj\n')]);chunks.push(part);size+=part.length}
  chunks.push(enc(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF\n`));return join(chunks);
 }
 const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=1&&v<=5;
 const imageFromSvg=svg=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('图表转换失败，请重试或下载 HTML 报告。'));image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="520" height="450" '))});
 async function renderPages(r,db,details){
  const W=1240,H=1754,M=82,bottom=H-95,pages=[];let canvas,ctx,y,page=0;
  function start(){canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');if(!ctx)throw Error('当前浏览器不支持图片导出，请使用打印或 HTML 报告。');ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.fillStyle='#176d72';ctx.fillRect(M,65,W-M*2,5);y=104;page++;ctx.fillStyle='#60717d';ctx.font='16px system-ui,sans-serif';ctx.fillText(page===1?'PICKLEBALL · SELF-ASSESSMENT':r.title,M,y);y+=34}
  function finish(){ctx.font='16px system-ui,sans-serif';ctx.fillStyle='#73838b';ctx.fillText('个人自评 · 仅供训练参考',M,H-49);ctx.textAlign='right';ctx.fillText(String(page),W-M,H-49);ctx.textAlign='left';const url=canvas.toDataURL('image/jpeg',.93);pages.push({width:W,height:H,bytes:jpegBytes(url),url});canvas.width=canvas.height=0}
  function ensure(height){if(y+height>bottom){finish();start()}}
  function lines(text,width,font=22){ctx.font=`${font}px system-ui,sans-serif`;const out=[];for(const paragraph of String(text??'').split('\n')){let line='';for(const ch of paragraph){if(line&&ctx.measureText(line+ch).width>width){out.push(line);line=ch}else line+=ch}out.push(line)}return out}
  function text(value,{font=22,color='#243445',height=34,bold=false}={}){for(const line of lines(value,W-M*2,font)){ensure(height);ctx.fillStyle=color;ctx.font=`${bold?'600 ':''}${font}px system-ui,sans-serif`;ctx.fillText(line,M,y);y+=height}}
  function heading(value){ensure(85);y+=20;text(value,{font:27,bold:true,height:43,color:'#164e55'});ctx.fillStyle='#dce6e7';ctx.fillRect(M,y-15,W-M*2,1)}
  start();text(r.title,{font:38,bold:true,height:52,color:'#133f44'});text(`${r.name}  ·  ${r.date}`,{font:22,color:'#536775'});y+=12;
  const rated=db.adultSkills.filter(s=>valid(r.d.scores[s.id])),dims=db.assessmentDimensions.filter(s=>valid(r.d.dimensionScores?.[s.id]));
  const serveRated=dims.filter(d=>d.parent_id!=='tactics'),tacticalRated=dims.filter(d=>d.parent_id==='tactics');const average=rated.length?(rated.reduce((n,s)=>n+r.d.scores[s.id],0)/rated.length).toFixed(2):'—';
  const cards=[['已评项目均分',average+' / 5'],['综合技术覆盖',rated.length+' / 40'],['独立细分评估',dims.length+' / '+db.assessmentDimensions.length]],gap=18,cw=(W-M*2-gap*2)/3;
  cards.forEach(([label,value],i)=>{const x=M+i*(cw+gap);ctx.fillStyle='#f2f7f6';ctx.fillRect(x,y,cw,112);ctx.strokeStyle='#d4e3e1';ctx.strokeRect(x,y,cw,112);ctx.fillStyle='#60717d';ctx.font='19px system-ui';ctx.fillText(label,x+18,y+31);ctx.fillStyle='#164e55';ctx.font='600 32px system-ui';ctx.fillText(value,x+18,y+80)});y+=151;
  text('未评项目不按 0 分计算；细分评分独立展示。',{font:19,color:'#60717d',height:29});
  const charts=[['categoryRadar','七大能力雷达图',false],['pairRadar','正反手技术对比',true],...(serveRated.length?[['serveDimensionRadar','发球四维评估',false],['returnDimensionRadar','接发四维对比',true]]:[]),...(tacticalRated.length?[['tacticalRadar','比赛决策与 Dink 战术',false]]:[])];
  const tile=(W-M*2-20)/2,tileH=tile*450/520+91;
  for(let i=0;i<charts.length;i+=2){ensure(tileH+20);for(let j=0;j<2&&charts[i+j];j++){const [id,title,pairs]=charts[i+j],x=M+j*(tile+20);ctx.strokeStyle='#dce6e7';ctx.strokeRect(x,y,tile,tileH);ctx.fillStyle='#243445';ctx.font='600 23px system-ui';ctx.fillText(title,x+16,y+35);const svg=$(id).innerHTML.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];if(svg)ctx.drawImage(await imageFromSvg(svg),x+8,y+48,tile-16,(tile-16)*450/520);ctx.font='17px system-ui';ctx.fillStyle='#177d84';ctx.fillText(pairs?'● 正手':'● 当前自评 · 空白轴为未评',x+16,y+tileH-15);if(pairs){ctx.fillStyle='#dc7d4b';ctx.fillText('● 反手',x+110,y+tileH-15);ctx.fillStyle='#60717d';ctx.fillText('· 空白轴为未评',x+205,y+tileH-15)}}y+=tileH+20}
  if(!details){text('结果基于个人自评，不代表官方 DUPR 评级。',{font:18,color:'#60717d'});finish();return pages}
  finish();start();
  function table(title,items,scores){heading(title);for(const s of items){ensure(66);ctx.fillStyle='#243445';ctx.font='21px system-ui';ctx.fillText(s.name_zh,M+10,y);ctx.fillStyle='#6b7c86';ctx.font='16px system-ui';ctx.fillText(s.name_en||'',M+10,y+25);ctx.font='600 22px system-ui';ctx.fillStyle=valid(scores?.[s.id])?'#155d62':'#7c8790';ctx.textAlign='right';ctx.fillText(valid(scores?.[s.id])?scores[s.id]+' / 5':'未评',W-M-10,y+8);ctx.textAlign='left';ctx.fillStyle='#e1e8eb';ctx.fillRect(M,y+37,W-M*2,1);y+=61}}
  table('40 项技术结果',db.adultSkills,r.d.scores);if(serveRated.length)table('发球与接发细分',db.assessmentDimensions.filter(d=>d.parent_id!=='tactics'),r.d.dimensionScores);if(tacticalRated.length)table('比赛决策与 Dink 战术',db.assessmentDimensions.filter(d=>d.parent_id==='tactics'),r.d.dimensionScores);
  if(r.d.note){heading('自评备注');text(r.d.note)}
  if(r.d.drills?.length){heading('接下来练什么');r.d.drills.forEach((d,i)=>text(`${i+1}. ${d}`))}
  heading('已评项目的参考表现');text('半分项目列出较低整数档的参考表现。',{font:18,color:'#60717d'});
  for(const s of [...rated.map(s=>({...s,value:r.d.scores[s.id]})),...dims.map(s=>({...s,value:r.d.dimensionScores[s.id]}))]){const band=s.scoring?.rubric_bilingual?.find(b=>b.score===Math.floor(s.value));if(!band)continue;ensure(110);text(`${s.name_zh} · ${s.value} / 5`,{bold:true});text(band.zh,{font:20,height:31});if(band.en)text(band.en,{font:17,color:'#60717d',height:27});y+=14}
  text('本报告基于个人自评，仅供训练与复盘参考，不代表官方 DUPR 评级。',{font:18,color:'#60717d'});finish();return pages;
 }
 async function jpegOverview(pages){if(pages.length===1)return pages[0].bytes;const canvas=document.createElement('canvas');canvas.width=pages[0].width;canvas.height=pages.reduce((h,p)=>h+p.height,0);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);let y=0;for(const p of pages){const image=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=p.url});ctx.drawImage(image,0,y);y+=p.height}const bytes=jpegBytes(canvas.toDataURL('image/jpeg',.93));canvas.width=canvas.height=0;return bytes}
 function download(bytes,type,name){window.YKAnalytics?.track('yk_report_export',type==='application/pdf'?'pdf':type==='application/zip'?'jpeg_zip':'jpeg');const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
 const action=type=>async()=>{const controls=['downloadJpeg','downloadPdf'];controls.forEach(id=>$(id).disabled=true);$('reportStatus').textContent='正在本地生成文件，请稍候…';try{const r=window.YKPublicReport.report(),db=JSON.parse($('database').textContent),pages=await renderPages(r,db,type==='pdf');download(type==='pdf'?pdfFromJpegs(pages):await jpegOverview(pages),type==='pdf'?'application/pdf':'image/jpeg','pickleball-self-assessment-'+r.date+(type==='pdf'?'.pdf':'-overview.jpg'));$('reportStatus').textContent=type==='pdf'?'PDF 完整报告已生成，可直接保存。':'JPEG 雷达概览已生成；逐项评分请下载 PDF 完整报告。'}catch(e){$('reportStatus').textContent='导出失败：'+e.message}finally{controls.forEach(id=>$(id).disabled=false)}};
 $('downloadJpeg').onclick=action('jpeg');$('downloadPdf').onclick=action('pdf');
 $('downloadJpegReport').onclick=async()=>{const button=$('downloadJpegReport');button.disabled=true;$('reportStatus').textContent='正在本地生成逐页 JPEG 报告…';try{const r=window.YKPublicReport.report(),db=JSON.parse($('database').textContent),pages=await renderPages(r,db,true);download(zipFromJpegs(pages),'application/zip','pickleball-self-assessment-'+r.date+'-jpeg.zip');$('reportStatus').textContent='JPEG 完整报告已按页打包为 ZIP，解压后可查看每页图片。'}catch(e){$('reportStatus').textContent='导出失败：'+e.message}finally{button.disabled=false}};
 window.PickleballExports={pdfFromJpegs,zipFromJpegs,renderPages};
})();
