#!/usr/bin/env node
// Responsive visual regression smoke test for each publicly routed surface.
// Usage: npm run build && npx vite preview --host 127.0.0.1 &
//        node scripts/audit-responsive.mjs
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin=process.env.QA_ORIGIN||'http://127.0.0.1:4173/';
const routes=['','#leaderboard','#flow','#vestflow','#breakoutflow','#novaflow','#proprflow','#thebook','#vestpdf','#perpcopier','#affiliated'];
const widths=[320,390,430,768,1024,1440];
const out='artifacts/responsive';
await fs.mkdir(out,{recursive:true});
const errors=[];
const browser=await chromium.launch({headless:true});
try{
 for(const route of routes){
  for(const width of widths){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
   const exceptions=[];
   page.on('pageerror',e=>exceptions.push(e.message));
   const url=origin+route;
   try{
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForTimeout(1300);
    const details=await page.evaluate(()=>{
     const vw=document.documentElement.clientWidth;
     const over=[];
     for(const el of document.querySelectorAll('body *')){
      const s=getComputedStyle(el);
      if(s.display==='none'||s.visibility==='hidden'||s.position==='fixed'||s.position==='absolute')continue;
      const r=el.getBoundingClientRect();
      if(!r.width||!r.height)continue;
      if(r.right>vw+3 || r.left < -3){
       // Sections and decorative full-bleed layers can extend by design;
       // report only interactive/content targets and top-level grid items.
       if(el.matches('a,button,input,select,h1,h2,h3,.flat-podium-card,.wk-row,.vf-panel,.fh-card,.flat-podium-name,.flat-podium-total'))
        over.push({selector:el.className?.baseVal||el.className||el.tagName,right:Math.round(r.right),left:Math.round(r.left)});
      }
     }
     const clipped=[];
     for(const el of document.querySelectorAll('h1,h2,h3,button,.flat-podium-name,.flat-podium-total,.flat-podium-tag,.wk-wallet-name')){
      const s=getComputedStyle(el), r=el.getBoundingClientRect();
      if(!r.width||!r.height||s.visibility==='hidden'||s.display==='none')continue;
      if(el.scrollWidth>el.clientWidth+3 && ['hidden','clip'].includes(s.overflowX)){
       clipped.push({selector:el.className?.baseVal||el.className||el.tagName,text:(el.textContent||'').trim().slice(0,60)});
      }
     }
     return {horizontalOverflow:document.documentElement.scrollWidth>vw+3,documentWidth:document.documentElement.scrollWidth,viewport:vw,over:over.slice(0,12),clipped:clipped.slice(0,12),mainText:(document.body.innerText||'').trim().slice(0,80)};
    });
    const failures=[];
    if(!response?.ok())failures.push('HTTP '+response?.status());
    if(details.horizontalOverflow)failures.push('document overflow: '+details.documentWidth+'/'+details.viewport);
    if(details.over.length)failures.push('elements out of viewport: '+JSON.stringify(details.over));
    if(details.clipped.length)failures.push('clipped headings/controls: '+JSON.stringify(details.clipped));
    if(exceptions.length)failures.push('JS errors: '+exceptions.join('; '));
    if(!details.mainText)failures.push('empty page');
    if(failures.length){
     errors.push({route:route||'home',width,failures});
     await page.screenshot({path:path.join(out,(route.slice(1)||'home')+'-'+width+'.png'),fullPage:true});
    }
   }catch(e){errors.push({route:route||'home',width,failures:[String(e)]});}
   finally{await page.close();}
  }
 }
}finally{await browser.close();}
await fs.writeFile(path.join(out,'report.json'),JSON.stringify({tested:routes.length*widths.length,errors},null,2));
console.log('Checked '+routes.length*widths.length+' viewport/route combinations. Issues: '+errors.length);
for(const error of errors)console.log(JSON.stringify(error));
if(errors.length)process.exitCode=1;
