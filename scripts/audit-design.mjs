#!/usr/bin/env node
/*
 * MASSIVE design + interaction contract.
 * This is a release gate for objective Flat MASSIVE invariants, not an
 * algorithmic substitute for an art director reviewing screenshots.
 * Every inspected route gets mobile and desktop reference screenshots.
 */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.QA_ORIGIN || 'http://127.0.0.1:4173/';
const routes = [
  {hash:'', root:'.gp-site', label:'home'},
  {hash:'#leaderboard', root:'.wk', label:'leaderboard'},
  {hash:'#flow', root:'.fh', label:'flow'},
  {hash:'#vestflow', root:'.vf', label:'vestflow'},
  {hash:'#thebook', root:'.lp, .learn-perps, main', label:'thebook'},
  {hash:'#perpcopier', root:'.pc-page', label:'perpcopier'},
  {hash:'#affiliated', root:'.af-page, .affiliated-page, main', label:'affiliated'}
];
const viewports = [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}];
const dest='artifacts/design';
await fs.mkdir(dest,{recursive:true});
const findings=[];
const add=(route,viewport,problem)=>findings.push({route,viewport,problem});
const browser=await chromium.launch({headless:true});
try{
 for(const route of routes){
  for(const viewport of viewports){
   const context=await browser.newContext({
    viewport:{width:viewport.width,height:viewport.height},
    deviceScaleFactor:1,
    reducedMotion:'reduce'
   });
   const page=await context.newPage();
   const jsErrors=[];
   page.on('pageerror',e=>jsErrors.push(e.message));
   try{
    await page.goto(base+route.hash,{waitUntil:'domcontentloaded',timeout:25000});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(850);
    const result=await page.evaluate(({root,primary})=>{
      const scope=document.querySelector(root);
      const body=document.body;
      if(!scope) return {missing:root};
      const style=getComputedStyle(scope);
      const rootStyle=getComputedStyle(document.querySelector('.massive-scene')||body);
      const titles=[...scope.querySelectorAll('h1,h2')].filter(el=>{
        const s=getComputedStyle(el); return s.display!=='none'&&el.getBoundingClientRect().width>0;
      });
      const h1=titles.find(el=>el.matches('h1'));
      const heading=h1?getComputedStyle(h1):null;
      const bodyTypeface=style.fontFamily||rootStyle.fontFamily;
      const pageBackground=style.backgroundColor;
      const names=[...scope.querySelectorAll('.flat-podium-card .flat-podium-name')];
      const cards=[...scope.querySelectorAll('.flat-podium-card')];
      const ranks=cards.map(el=>({
       place:[...el.classList].find(c=>/^flat-place-/.test(c)),
       rect:(()=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})(),
       portrait:!!el.querySelector('.flat-podium-face,.flat-moon-avatar')
      }));
      const images=[...scope.querySelectorAll('img')].filter(el=>{
        const r=el.getBoundingClientRect();
        return r.width>22&&r.height>22;
      });
      return {
        bodyTypeface, pageBackground,
        rootInk:rootStyle.getPropertyValue('--flat-ink').trim(),
        rootPaper:rootStyle.getPropertyValue('--flat-paper').trim(),
        headingTypeface:heading?.fontFamily,
        headingWeight:heading?.fontWeight,
        titleCount:titles.length,
        ranks, nameCount:names.length,
        illegibleText:[...scope.querySelectorAll('h1,h2,h3,.flat-podium-name')].filter(el=>{
          const s=getComputedStyle(el),r=el.getBoundingClientRect();
          return r.width>0&&r.height>0&&parseFloat(s.fontSize)<10;
        }).map(el=>el.className||el.tagName).slice(0,10),
        missingImages:images.filter(el=>el.complete&&el.naturalWidth===0).map(el=>el.currentSrc||el.src).slice(0,10),
        hasScene:!!document.querySelector('.massive-scene'),
        viewportWidth:document.documentElement.clientWidth,
        horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+3,
        primary
      };
    },{root:route.root,primary:route.label});
    if(result.missing)add(route.label,viewport.name,'Missing expected page root '+result.missing);
    else{
      if(!result.hasScene)add(route.label,viewport.name,'Missing Flat MASSIVE scene');
      if(result.rootInk!=='#080809'||result.rootPaper!=='#eeeae2')add(route.label,viewport.name,'Flat MASSIVE palette tokens changed');
      if(['home','leaderboard','flow','vestflow'].includes(route.label)&&!/Manrope/i.test(result.bodyTypeface))
       add(route.label,viewport.name,'Flat MASSIVE typography changed: '+result.bodyTypeface);
      if(result.headingTypeface&&['home','leaderboard','flow','vestflow'].includes(route.label)&&!/Manrope/i.test(result.headingTypeface))
       add(route.label,viewport.name,'Display heading lost Manrope: '+result.headingTypeface);
      if(result.missingImages.length)add(route.label,viewport.name,'Visible broken artwork: '+JSON.stringify(result.missingImages));
      if(result.horizontalOverflow)add(route.label,viewport.name,'Horizontal overflow detected');
      if(result.illegibleText.length)add(route.label,viewport.name,'Important text smaller than 10px: '+result.illegibleText.join(','));
      if(route.label==='leaderboard'&&result.ranks.length>=3){
       const first=result.ranks.find(r=>r.place==='flat-place-1');
       const second=result.ranks.find(r=>r.place==='flat-place-2');
       const third=result.ranks.find(r=>r.place==='flat-place-3');
       if(first&&second&&third){
        if(!result.ranks.every(r=>r.portrait))add(route.label,viewport.name,'A podium portrait is missing');
        if(viewport.name==='mobile'){
         if(!(first.rect.width>second.rect.width*1.7))add(route.label,viewport.name,'Mobile champion lost full-width prominence');
         if(!(first.rect.y<second.rect.y&&first.rect.y<third.rect.y))add(route.label,viewport.name,'Mobile champion is not above challengers');
         if(Math.abs(second.rect.y-third.rect.y)>30)add(route.label,viewport.name,'Mobile #2 and #3 are not aligned');
        }else{
         if(!(first.rect.width>=second.rect.width*.85))add(route.label,viewport.name,'Desktop champion became too narrow');
        }
       }
      }
    }
    for(const err of jsErrors)add(route.label,viewport.name,'JavaScript error: '+err);
    await page.screenshot({path:`${dest}/${route.label}-${viewport.name}.png`,fullPage:true,animations:'disabled'});
   }catch(e){add(route.label,viewport.name,String(e));}
   finally{await context.close();}
  }
 }
 // Navigation and controls: exercise actual user actions, not just initial renders.
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try{
  await page.goto(base+'#perpcopier',{waitUntil:'domcontentloaded'});
  const pause=page.getByRole('button',{name:/^pause$/i});
  if(await pause.count()){
   await pause.click();
   if(!await page.getByText('Demo paused').count())add('perpcopier','interaction','Pause button did not update status');
   const resume=page.getByRole('button',{name:/^resume$/i});
   await resume.click();
   if(!await page.getByText('Demo copying').count())add('perpcopier','interaction','Resume button did not update status');
  } else add('perpcopier','interaction','Pause control not found');
  const flatten=page.getByRole('button',{name:'Flatten demo'});
  await flatten.click();
  if(!await page.getByText('Demo flattened').count())add('perpcopier','interaction','Flatten did not update status');
  await page.getByRole('button',{name:'Reset demo'}).click();
  if(!await page.getByText('Demo copying').count())add('perpcopier','interaction','Reset did not restore state');
 }catch(e){add('perpcopier','interaction',String(e));}
 await page.goto(base+'#leaderboard',{waitUntil:'domcontentloaded'});
 try{
  const tabs=page.locator('.wk-view-switch');
  await tabs.getByRole('button',{name:/weekly/i}).click();
  if(!await tabs.getByRole('button',{name:/weekly/i}).evaluate(e=>e.classList.contains('active')))add('leaderboard','interaction','Weekly tab failed to activate');
  await tabs.getByRole('button',{name:/season/i}).click();
  if(!await tabs.getByRole('button',{name:/season/i}).evaluate(e=>e.classList.contains('active')))add('leaderboard','interaction','Season tab failed to activate');
 }catch(e){add('leaderboard','interaction',String(e));}
 await page.close();
}finally{await browser.close();}
await fs.writeFile(`${dest}/report.json`,JSON.stringify({routes:routes.length,viewports:viewports.map(x=>x.width),findings},null,2));
console.log(`Flat MASSIVE design: ${routes.length*viewports.length} screenshots + interactions; ${findings.length} issues.`);
for(const finding of findings)console.log(JSON.stringify(finding));
if(findings.length)process.exitCode=1;
