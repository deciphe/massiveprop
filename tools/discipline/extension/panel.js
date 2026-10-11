// MASSIVE Discipline: the same controller runs in-page and in the toolbar window.
(()=>{
 if(document.getElementById('massive-discipline-root'))return;
 const standalone=location.protocol==='chrome-extension:';
 // FontFace registers bundled type in the document; @font-face inside Shadow DOM is not reliable.
 for(const weight of [700,800]){const face=new FontFace('MassiveManrope','url('+chrome.runtime.getURL('manrope-'+weight+'.ttf')+')',{weight:String(weight)});document.fonts.add(face);face.load().catch(()=>{});}
 const host=document.createElement('div');host.id='massive-discipline-root';
 host.style.cssText=standalone?'height:100dvh;width:100%':'position:fixed;right:18px;top:18px;width:380px;max-width:calc(100vw - 24px);height:calc(100dvh - 36px);z-index:2147483646;pointer-events:none;';
 document.documentElement.append(host);const shadow=host.attachShadow({mode:'closed'});
 const css=document.createElement('link');css.rel='stylesheet';css.href=chrome.runtime.getURL('panel.css');shadow.append(css);
 const app=document.createElement('div');app.className='massive-app';shadow.append(app);
 const s={view:'connect',returnView:'ticket',accounts:[],markets:[],account:'',market:'',target:400,stop:400,maxRisk:100,side:'buy',type:'market',marginMode:'cross',size:'0.001',leverage:'2',limit:'',sl:'',tp:'',busy:false,error:'',info:'',preview:null,session:null,gateStep:0,lastWarning:null,lastClientId:'',result:null,history:[],override:false,collapsed:false,pending:[],lastSync:0};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))?'$'+Number(v).toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}):'—';
 const api=async(action,body=null,query=null)=>{const r=await chrome.runtime.sendMessage({kind:'MASSIVE_BRIDGE',action,body,query});if(r?.error)throw Error(r.error);if(!r)throw Error('Extension disconnected. Reload the trading page.');return r.data};
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const save=()=>chrome.storage.local.set({massiveSettings:{account:s.account,market:s.market,target:s.target,stop:s.stop,maxRisk:s.maxRisk}});
 async function record(type,details={}){const {massiveHistory=[]}=await chrome.storage.local.get('massiveHistory');s.history=[...massiveHistory,{id:crypto.randomUUID(),type,account:s.account,at:Date.now(),day:today(),...details}].slice(-600);await chrome.storage.local.set({massiveHistory:s.history})}
 function moon(){let dots='';for(let y=3;y<80;y+=3)for(let x=3+(Math.round(y/3)%2)*1.5;x<80;x+=3){const nx=(x-40)/36,ny=(y-40)/36,q=nx*nx+ny*ny;if(q>=1)continue;const z=Math.sqrt(1-q),v=Math.min(1,Math.max(.035,nx*.65-ny*.35+z*.65)*(.7+.2*Math.sin(nx*18)*Math.cos(ny*14)));dots+='<circle cx="'+x+'" cy="'+y+'" r="'+(.35+v*1.05)+'" opacity="'+(.15+v*.8)+'"/>'}return '<svg viewBox="0 0 80 80" fill="#ded7c7" class="moon" aria-hidden="true">'+dots+'</svg>'}
 const btn=(action,text,cls='')=>'<button data-action="'+action+'" class="'+cls+'" '+(action==='collapse'?'aria-label="Collapse discipline panel" ':'')+(s.busy?'disabled':'')+'>'+text+'</button>';
 const field=(label,name,val,extra='')=>'<label>'+label+'<input name="'+name+'" value="'+esc(val)+'" '+extra+'></label>';
 const numField=(label,name,val)=>field(label,name,val,'type="number" min="0" step="any"');
 const row=(label,value)=>'<div class="line"><span>'+label+'</span><strong>'+value+'</strong></div>';
 const title=(a,b)=>'<h1>'+a+'<br><span>'+b+'</span></h1>';
 const options=(items,current,label)=>items.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(current)?'selected':'')+'>'+esc(label(x))+'</option>').join('');
 function shell(body){
 app.innerHTML='<div class="window"><header><div class="brand">MASSIVE<span>.</span><small>discipline</small></div><div class="header-actions">'+btn('history','Record','text-button')+btn('collapse','&#8722;','icon')+'</div></header><main>'+body+'</main><div class="notice-area" role="status" aria-live="polite">'+(s.error?'<div class="notice bad">'+esc(s.error)+'</div>':s.info?'<div class="notice">'+esc(s.info)+'</div>':'')+'</div><footer><span class="status-dot"></span><span>SANDBOX</span><span class="footer-right">'+(s.busy?'WORKING…':'MFP / NATIVE COPY')+'</span></footer></div>';
 }
 function render(){
 host.style.width=s.collapsed&&!standalone?'170px':standalone?'100%':'380px';host.style.height=s.collapsed?'auto':standalone?'100dvh':'calc(100dvh - 36px)';
 if(s.collapsed){app.innerHTML='<div class="dock">'+moon()+btn('expand','MASSIVE. <small>'+ (s.override?'OVERRIDE':'DISCIPLINE')+'</small>','dock-button')+'</div>';return}
 let b='';
 if(s.view==='connect'){
 b='<div class="hero">'+moon()+'<div class="eyebrow">YOUR EDGE / YOUR RULES</div>'+title('Stay','Massive.')+'<p class="sub">One plan. Every entry.</p></div><label>API KEY<input name="mfpApiKey" type="password" autocomplete="off" spellcheck="false" placeholder="fp_test_…"></label>'+btn('connect','Connect →','primary wide')+'<p class="hint">MFP sandbox. Key saved only in this extension.</p>';
 }else if(s.view==='plan'){
 b='<div class="hero compact">'+moon()+'<div class="eyebrow">01 / SET THE DAY</div>'+title('Define','the limit.')+'</div><label>ACCOUNT<select name="account">'+options(s.accounts,s.account,a=>a.name||a.account_number||a.id)+'</select></label><div class="two">'+numField('TARGET / $','target',s.target)+numField('DAILY STOP / $','stop',s.stop)+'</div>'+numField('RISK PER ENTRY / $','maxRisk',s.maxRisk)+'<div class="plan-note">Your plan stays fixed until the next New York day.</div>'+btn('arm','Arm discipline →','primary wide')+btn('disconnect','Disconnect','ghost wide');
 }else if(s.view==='ticket'){
 const pnl=s.session?.session_pnl,room=s.session?.drawdown_room;
 b='<div class="session-hero">'+moon()+'<div class="eyebrow '+(s.override?'override':'')+'">'+(s.override?'OVERRIDE ACTIVE':'PLAN ENGAGED')+'</div><div class="accountline">'+esc(s.accounts.find(a=>a.id===s.account)?.name||s.account)+'</div><div class="large" data-pnl>'+money(pnl)+'</div><div class="small">SESSION P&L <span data-sync>'+ (s.lastSync?'LIVE SNAPSHOT':'AWAITING SNAPSHOT')+'</span></div></div><div class="metrics"><div><small>TARGET</small><b>'+money(s.target)+'</b></div><div><small>DAILY STOP</small><b>'+money(s.stop)+'</b></div><div><small>ENTRY RISK</small><b>'+money(s.maxRisk)+'</b></div></div><div class="budget"><div class="budget-fill" style="width:'+Math.min(100,Math.max(0,(1+Number(pnl||0)/s.stop)*100))+'%"></div></div><div class="line tight"><span>DRAWDOWN ROOM</span><b data-room>'+money(room)+'</b></div><div class="rule"></div><div class="entry-head"><span class="eyebrow">02 / ENTRY</span>'+btn('plan','Switch account','text-button')+'</div><label>MARKET<select name="market">'+options(s.markets,s.market,m=>m.symbol||m.name||m.id)+'</select></label><div class="two sides">'+btn('buy','Long','segment '+(s.side==='buy'?'on':''))+btn('sell','Short','segment '+(s.side==='sell'?'on':''))+'</div><div class="two"><label>TYPE<select name="type"><option value="market" '+(s.type==='market'?'selected':'')+'>Market</option><option value="limit" '+(s.type==='limit'?'selected':'')+'>Limit</option></select></label>'+numField('LEVERAGE','leverage',s.leverage)+'</div><div class="two">'+numField('SIZE / BASE ASSET','size',s.size)+'<label>MARGIN<select name="marginMode"><option value="cross" '+(s.marginMode==='cross'?'selected':'')+'>Cross</option><option value="isolated" '+(s.marginMode==='isolated'?'selected':'')+'>Isolated</option></select></label></div>'+(s.type==='limit'?numField('LIMIT ENTRY','limit',s.limit):'')+'<div class="two">'+numField('STOP LOSS','sl',s.sl)+numField('TAKE PROFIT','tp',s.tp)+'</div>'+btn('preview','Check entry →','primary wide')+(s.override?btn('rearm','Return to my plan','ghost wide'):'');
 }else if(s.view==='confirm'){
 const p=s.preview;b='<div class="hero compact">'+moon()+'<div class="eyebrow">'+(s.override?'OVERRIDE / REVIEW':'WITHIN YOUR PLAN')+'</div>'+title('Make','your move.')+'</div><div class="trade-summary">'+esc(s.side==='buy'?'Long':'Short')+' <span>'+esc(s.markets.find(m=>m.id===s.market)?.symbol||s.market)+'</span><small>'+esc(s.size)+' / '+esc(s.type)+'</small></div><div class="projection">'+row('ENTRY ESTIMATE',money(p.entry))+row('STOP RISK',money(p.estimated_risk))+row('FEES / ONE WAY',money(p.fee_estimate))+row('SLIPPAGE',esc(p.slippage_bps)+' bps')+row('DD AFTER STOP',money(p.remaining_drawdown-p.estimated_risk))+'</div><p class="hint">Fresh risk check on send. Preview expires in 60 seconds.</p>'+btn('submit','Confirm entry →','primary wide')+btn('back','Change entry','ghost wide');
 }else if(s.view==='held'){
 b='<div class="hero compact">'+moon()+'<div class="eyebrow">ENTRY HELD</div>'+title('Fix','the entry.')+'</div><div class="reasons">'+s.preview.reasons.map(r=>'<p>'+esc(r.text)+'</p>').join('')+'</div>'+btn('back','Back to entry →','primary wide');
 }else if(s.view==='gate'){
 b='<div class="eyebrow">YOUR PLAN / YOUR DECISION</div>'+title('You set','the limit.')+'<div class="progress">'+Array.from({length:10},(_,i)=>'<span class="'+(i<s.gateStep?'lit':'')+'"></span>').join('')+'</div><div class="gateNum">'+String(s.gateStep).padStart(2,'0')+'<span>/10</span></div><div class="consequence" aria-live="polite">'+(s.lastWarning?'<div class="eyebrow">'+esc(s.lastWarning.label)+'</div><div class="warning">'+esc(s.lastWarning.value)+'</div>':'<p class="sub">Ten acknowledgments. Then you control this ticket.</p>')+'</div><label>TYPE / I AM A DEGEN<input name="phrase" spellcheck="false" autocomplete="off" placeholder="I am a degen"></label>'+btn('confess','Acknowledge →','primary wide')+btn('back','Keep my plan','ghost wide');
 }else if(s.view==='unlocked'){
 b='<div class="hero">'+moon()+'<div class="eyebrow override">10 / 10 ACKNOWLEDGED</div>'+title('Your','decision.')+'</div><div class="consequence"><div class="warning">'+esc(s.lastWarning?.value||'Override recorded.')+'</div></div><p class="sub">Your Massive ticket stays here. Plan limits are overridden for this account today; protective checks remain.</p>'+btn('back','Return to entry →','primary wide')+btn('rearm','Restore my plan','ghost wide');
 }else if(s.view==='result'){
 b='<div class="hero compact">'+moon()+'<div class="eyebrow">ENTRY / RECEIPT</div>'+title('Sent.','Track it.')+'</div><div class="projection">'+row('STATUS',esc(s.result?.status||'unknown'))+'</div><div class="order-id">'+esc(s.lastClientId)+'</div><p class="hint">Acceptance is not a fill. Check MFP before another entry.</p>'+btn('reconcile','Refresh status →','primary wide')+btn('back','Return to entry','ghost wide');
 }else if(s.view==='history'){
 const h=s.history.filter(x=>x.account===s.account),over=h.filter(x=>x.type==='override').length,orders=h.filter(x=>x.type==='order_submitted'),clean=orders.filter(x=>!x.override).length,score=orders.length?Math.round(clean/orders.length*100):null;
 b='<div class="trader-card">'+moon()+'<div class="eyebrow">MASSIVE / TRADER RECORD</div><h1>'+ (over?'Own your<br><span>decisions.</span>':'Keep your<br><span>edge.</span>')+'</h1><div class="card-score">'+(score===null?'—':score+'<small>%</small>')+'</div><div class="small">ENTRIES WITHIN PLAN</div><div class="card-metrics">'+row('DISCIPLINED ENTRIES',clean)+row('OVERRIDE ENTRIES',orders.length-clean)+row('DEGEN SESSIONS',over)+'</div><div class="card-label">'+(over?'SELF-AWARE DEGEN':'DISCIPLINE CLUB')+'</div><div class="accountline">'+esc(s.account||'Connect an account')+'</div></div><div class="entry-head"><span class="eyebrow">RECENT ACTIVITY</span>'+btn('export','Export','text-button')+'</div><div class="history-list">'+h.slice(-8).reverse().map(x=>'<div class="history-row"><span>'+esc(x.type.replaceAll('_',' '))+'</span><time>'+new Date(x.at).toLocaleDateString(undefined,{month:'short',day:'numeric'})+'</time></div>').join('')+'</div>'+ (s.pending.length?'<div class="reasons"><p>'+s.pending.length+' unresolved submission(s)</p>'+s.pending.map((p,i)=>btn('pending-'+i,'Check '+esc(p.client_order_id.slice(-8)),'ghost wide')).join('')+'</div>':'')+btn('back-history','Back →','primary wide');
 }
 shell(b);app.querySelectorAll('input,select').forEach(el=>el.disabled=s.busy);
 }
 function warnings(){const p=s.preview||{},r=p.estimated_risk,room=p.remaining_drawdown;return [
 {label:'01 / THE AGREEMENT',value:'This entry breaks the plan you chose.'},
 {label:'02 / YOUR EXPOSURE',value:'Estimated stop risk: '+money(r)+'.'},
 {label:'03 / YOUR BUFFER',value:money(room)+' to the drawdown floor.'},
 {label:'04 / LOSSES LEFT',value:r>0?Math.floor(room/r)+' comparable stop losses remain.':'Stop risk unavailable.'},
 {label:'05 / DAYS LEFT',value:Math.floor(room/s.stop)+' daily-stop losses fit this buffer.'},
 {label:'06 / RECOVERY',value:Math.ceil(Math.max(0,-p.session_pnl)/s.target)+' target days to recover session P&L.'},
 {label:'07 / YOUR LIMIT',value:'Your planned entry risk: '+money(s.maxRisk)+'.'},
 {label:'08 / TODAY',value:'Session P&L: '+money(p.session_pnl)+'.'},
 {label:'09 / YOUR RECORD',value:s.history.filter(x=>x.type==='override'&&x.account===s.account).length+' earlier overrides for this account.'},
 {label:'10 / YOUR DECISION',value:'Override recorded. Your Massive ticket remains in your control.'}
 ]}
 async function session(){const p=await api('session',null,{account_id:s.account});s.session=p;s.target=p.target;s.stop=p.stop;s.maxRisk=p.maxRisk;s.lastSync=Date.now();const {mfpOverrides={}}=await chrome.storage.local.get('mfpOverrides');s.override=mfpOverrides[s.account]?.day===today()}
 async function load(){const [a,m]=await Promise.all([api('accounts'),api('markets')]);s.accounts=(Array.isArray(a)?a:a.accounts||[]).map(x=>({...x,id:x.id||x.account_id}));s.markets=(Array.isArray(m)?m:m.markets||[]).map(x=>({...x,id:x.id||x.market_id}));if(!s.accounts.length)throw Error('No accessible sandbox accounts.');s.account=s.accounts.some(a=>a.id===s.account)?s.account:s.accounts[0].id;s.market=s.markets.some(m=>m.id===s.market)?s.market:s.markets.find(m=>m.symbol==='BTC')?.id||s.markets[0]?.id||'';try{await session();s.view='ticket'}catch{s.view='plan'}s.pending=await api('pending')}
 async function act(name){
 if(s.busy)return;
 // Read sensitive input before rendering the busy state.
 const key=app.querySelector('[name="mfpApiKey"]')?.value,phrase=app.querySelector('[name="phrase"]')?.value;
 s.busy=true;s.error='';s.info='';render();
 try{
 switch(name){
 case 'connect':await api('connect',{api_key:key});await load();break;
 case 'disconnect':await api('disconnect');s.view='connect';s.session=null;s.override=false;break;
 case 'arm':case 'rearm':await api('arm',{account_id:s.account,target:s.target,stop:s.stop,maxRisk:s.maxRisk});await session();s.view='ticket';await record('arm');break;
 case 'buy':case 'sell':s.side=name;break;
 case 'plan':s.view='plan';break;
 case 'preview':{
 const o={account_id:s.account,market_id:s.market,side:s.side,type:s.type,size:Number(s.size),leverage:Number(s.leverage),margin_mode:s.marginMode,...(s.type==='limit'?{limit_price:Number(s.limit)}:{}),...(s.sl?{stop_loss_price:Number(s.sl)}:{}),...(s.tp?{take_profit_price:Number(s.tp)}:{})};
 s.preview=await api('preview',o);await session();
 if(s.preview.allowed||s.override&&!s.preview.reasons.some(r=>r.hard))s.view='confirm';else if(!s.preview.overrideable)s.view='held';else{s.view='gate';s.gateStep=0;s.lastWarning=null;await record('violation',{reasons:s.preview.reasons.map(r=>r.code)})}break;
 }
 case 'submit':{const r=await api('place',{preview_id:s.preview?.preview_id});s.lastClientId=r.client_order_id;s.result=r.order;s.view='result';await record('order_submitted',{clientOrderId:s.lastClientId,override:s.override,risk:s.preview.estimated_risk});break}
 case 'reconcile':{const r=await api('order-lookup',null,{client_order_id:s.lastClientId});const arr=Array.isArray(r)?r:r.orders||[];s.result=arr.find(o=>o.client_order_id===s.lastClientId)||{status:'Not found yet. Check MFP; do not repeat.'};s.pending=await api('pending');break}
 case 'confess':{const r=await api('confess',{preview_id:s.preview.preview_id,phrase});s.lastWarning=warnings()[r.step-1];s.gateStep=r.step;if(r.unlocked){s.override=true;s.view='unlocked';await record('override',{reasons:s.preview.reasons.map(r=>r.code),risk:s.preview.estimated_risk})}break}
 case 'history':s.returnView=s.view;s.view='history';s.pending=await api('pending').catch(()=>[]);break;
 case 'back-history':s.view=s.returnView;break;
 case 'back':s.view='ticket';break;
 case 'collapse':s.collapsed=true;break;
 case 'expand':s.collapsed=false;break;
 case 'export':{const blob=new Blob([JSON.stringify(s.history,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='massive-discipline-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break}
 default:if(name.startsWith('pending-')){s.lastClientId=s.pending[Number(name.slice(8))]?.client_order_id||'';s.result={status:'Unresolved'};s.view='result'}
 }
 await save();
 }catch(e){s.error=e.message;const cid=e.message.match(/massive-[0-9a-f-]{36}/i);if(cid){s.lastClientId=cid[0];s.result={status:'Unknown. Reconcile before another entry.'};s.view='result'}}
 finally{s.busy=false;render();if(s.view==='gate')app.querySelector('[name="phrase"]')?.focus()}
 }
 app.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b){e.preventDefault();act(b.dataset.action)}});
 app.addEventListener('input',e=>{if(e.target.name in s)s[e.target.name]=['target','stop','maxRisk'].includes(e.target.name)?Number(e.target.value):e.target.value});
 app.addEventListener('change',async e=>{if(e.target.name in s)s[e.target.name]=['target','stop','maxRisk'].includes(e.target.name)?Number(e.target.value):e.target.value;if(e.target.name==='type')render();if(e.target.name==='account'){s.session=null;s.override=false;try{await session();s.view='ticket'}catch{s.view='plan'}render();await save()}});
 app.addEventListener('keydown',e=>{if(e.key==='Enter'&&['phrase','mfpApiKey'].includes(e.target.name)){e.preventDefault();act(e.target.name==='phrase'?'confess':'connect')}});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.massiveHistory)s.history=changes.massiveHistory.newValue||[]});
 setInterval(async()=>{if(s.view!=='ticket'||s.busy)return;try{await session();const pnl=app.querySelector('[data-pnl]'),room=app.querySelector('[data-room]'),sync=app.querySelector('[data-sync]');if(pnl)pnl.textContent=money(s.session.session_pnl);if(room)room.textContent=money(s.session.drawdown_room);if(sync)sync.textContent='LIVE SNAPSHOT';const fill=app.querySelector('.budget-fill');if(fill)fill.style.width=Math.min(100,Math.max(0,(1+s.session.session_pnl/s.stop)*100))+'%'}catch{const sync=app.querySelector('[data-sync]');if(sync)sync.textContent='SNAPSHOT UNAVAILABLE'}},10000);
 (async()=>{const v=await chrome.storage.local.get(['mfpApiKey','massiveSettings','massiveHistory']);Object.assign(s,v.massiveSettings||{});s.history=v.massiveHistory||[];render();if(v.mfpApiKey){s.busy=true;render();try{await load()}catch(e){s.error=e.message}finally{s.busy=false;render()}}})().catch(e=>{s.error=e.message;render()});
})();
