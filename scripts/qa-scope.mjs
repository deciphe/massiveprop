import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

export function scopeFor(files){
 const routes=new Set();
 for(const file of files){
  if(/^(src\/components\/weekly\/|src\/data\/traders\.json$|public\/traders\/|src\/lib\/(trader-|lead-history|weekly|seasons))/.test(file))routes.add('#leaderboard');
  else if(file.startsWith('src/components/vestflow/'))['#flow','#vestflow','#breakoutflow','#novaflow','#proprflow'].forEach(r=>routes.add(r));
  else if(file.startsWith('src/components/perpcopier/'))routes.add('#perpcopier');
  else if(file.startsWith('src/components/affiliated/'))routes.add('#affiliated');
  else if(file.startsWith('src/components/discipline/')||file.startsWith('public/media/massive-discipline'))routes.add('#discipline');
  else if(file.startsWith('src/components/updates/'))routes.add('#wire');
  else if(file.startsWith('src/components/email/'))routes.add('#massiveprop');
  else return null; // Shared code, unknown dependencies and QA changes require the full suite.
 }
 return routes.size?[...routes]:null;
}
export function includesRoute(hash){
 if(!process.env.QA_ROUTES)return true;
 return JSON.parse(process.env.QA_ROUTES).includes(hash.split('?')[0]);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let scope=null;
 try{
  const base=process.env.QA_BASE;
  if(base&&/^[a-f0-9]{40}$/.test(base)){
   execFileSync('git',['fetch','--depth=1','origin',base],{stdio:'pipe'});
   execFileSync('git',['merge-base','--is-ancestor',base,'HEAD']);
   const files=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
   scope=scopeFor(files);
  }
 }catch(e){console.log('Using full QA: baseline unavailable.');}
 const value=scope?JSON.stringify(scope):'';
 if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`QA_ROUTES=${value}\n`);
 console.log(scope?'QA pages: '+scope.join(', '):'QA pages: full suite');
}
