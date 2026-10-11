/* MASSIVE Discipline. MFP ticket overlay; requests go only to the public API via a local bridge. */
(()=> {
  if(document.getElementById('massive-discipline-root')) return;
  const host=document.createElement('div');
  host.id='massive-discipline-root';
  host.style.cssText='position:fixed;right:0;top:0;width:386px;max-width:100vw;height:100dvh;z-index:2147483646;pointer-events:none;';
  document.documentElement.appendChild(host);
  const shadow=host.attachShadow({mode:'closed'});
  const css=document.createElement('link');css.rel='stylesheet';css.href=chrome.runtime.getURL('panel.css');shadow.append(css);
  const app=document.createElement('div');app.className='massive-app';shadow.append(app);
  const state={
    view:'connect',accounts:[],markets:[],account:'',market:'',
    target:400,stop:400,maxRisk:100,
    side:'buy',type:'market',size:'0.001',leverage:'2',limit:'',sl:'',tp:'',
    busy:false,error:'',info:'',preview:null,session:null,gateStep:0,lastWarning:null,
    lastClientId:'',result:null,history:[],saved:{},released:null
  };
  const money=(v)=>Number.isFinite(Number(v))?'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
  const escape=(v)=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nice=(v)=>escape(v).slice(0,90);
  const api=async(action,body=null,query=null)=>{
    const reply=await chrome.runtime.sendMessage({kind:'MASSIVE_BRIDGE',action,body,query});
    if(reply?.error)throw Error(reply.error);
    return reply?.data;
  };
  const save=async()=>{await chrome.storage.local.set({massiveSettings:{account:state.account,market:state.market,target:state.target,stop:state.stop,maxRisk:state.maxRisk},massiveHistory:state.history.slice(-600),massiveReleased:state.released});};
  const record=async(type,details={})=>{
    state.history.push({type,account:state.account,at:Date.now(),day:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),...details});
    await save();
  };
  const status=(msg,bad=false)=>{state.error=bad?msg:'';state.info=bad?'':msg;render();};
  const button=(name,txt,cls='')=>'<button data-action="'+name+'" class="'+cls+'">'+txt+'</button>';
  const field=(label,name,value,extra='')=>'<label>'+label+'<input name="'+name+'" value="'+escape(value)+'" '+extra+'></label>';
  const row=(label,value)=>'<div class="line"><span>'+label+'</span><strong>'+value+'</strong></div>';
  const shell=(title,body,footer='')=>{
    app.innerHTML='<div class="window"><header><div class="brand">MASSIVE<span>.</span></div><div class="caps">DISCIPLINE <em>/</em> '+nice(title)+'</div></header><main>'+body+'</main><footer><div class="small">MYFUNDEDPERPS <span>·</span> VOLUNTARY CONTROL</div>'+footer+'</footer></div>';
  };
  const setOpts=(name,items,selected)=>{
    const el=app.querySelector('[name="'+name+'"]');
    if(!el)return;
    for(const item of items){const o=document.createElement('option');o.value=String(item.value);o.textContent=String(item.text);el.append(o);}
    if(selected && items.some(x=>String(x.value)===String(selected)))el.value=selected;
    else if(el.options.length) {el.selectedIndex=0;state[name]=el.value;}
  };
  function render(){
    host.style.width=state.view==='released'?'245px':'386px';
    host.style.height=state.view==='released'?'auto':'100dvh';
    if(state.view==='released'){
      app.innerHTML='<div class="dock"><div class="brand">MASSIVE.</div><p>NATIVE TICKET UNLOCKED</p>'+button('rearm','RE-ARM DISCIPLINE','primary')+'</div>';
      return;
    }
    if(state.view==='connect'){
      shell('CONNECT','<div class="eyebrow">LOCAL EXECUTION</div><h1>YOUR RULES.<br><i>YOUR TICKET.</i></h1><p class="sub">Enter your local bridge token. Never paste an MFP API key into an extension.</p><label>BRIDGE TOKEN<input name="bridgeToken" type="password" autocomplete="off" placeholder="Your private local token"></label>'+button('connect','CONNECT BRIDGE →','primary wide')+'<p class="hint">Start tools/discipline/bridge.mjs locally with an MFP sandbox API key first.</p>');
    }else if(state.view==='plan'){
      const optionList=state.accounts.map(a=>({value:a.id,text:(a.name||a.account_number||a.id)+' · '+(a.status||'unknown')}));
      shell('SESSION PLAN','<div class="eyebrow">01 / PLAN</div><h1>DEFINE<br><i>THE DAY.</i></h1><p class="sub">Targets describe the session from ARM onward, not earlier trades.</p><label>ACCOUNT<select name="account"></select></label><div class="two">'+field('DAILY TARGET $','target',state.target,'type="number" min="1" step="1"')+field('DAILY STOP $','stop',state.stop,'type="number" min="1" step="1"')+'</div>'+field('MAX RISK PER TRADE $','maxRisk',state.maxRisk,'type="number" min="1" step="1"')+'<div class="projection">'+row('5 TARGET DAYS',money(state.target*5))+row('20 TARGET DAYS',money(state.target*20))+'</div><p class="hint">Projections assume every session hits its target. They are not earnings forecasts.</p>'+button('arm','ARM DISCIPLINE →','primary wide'));
      setOpts('account',optionList,state.account);
    }else if(state.view==='ticket'){
      const symbols=state.markets.map(m=>({value:m.id,text:m.symbol || m.name || m.id}));
      shell('ARMED','<div class="eyebrow armed">● SESSION ARMED</div><div class="accountline">'+nice(state.accounts.find(a=>a.id===state.account)?.name||state.account)+'</div><div class="large">'+money(state.session?.session_pnl??0)+'<span> SINCE ARM</span></div><div class="line tight"><span>DAILY TARGET</span><b>'+money(state.target)+'</b></div><div class="line tight"><span>SESSION STOP</span><b>−'+money(state.stop)+'</b></div><div class="line tight"><span>PER TRADE</span><b>'+money(state.maxRisk)+'</b></div><div class="rule"></div><div class="eyebrow">02 / ORDER ENTRY</div><label>MARKET<select name="market"></select></label><div class="two">'+button('buy','BUY / LONG','segment '+(state.side==='buy'?'on':''))+button('sell','SELL / SHORT','segment '+(state.side==='sell'?'on':''))+'</div><div class="two"><label>ORDER TYPE<select name="type"><option value="market">MARKET</option><option value="limit">LIMIT</option></select></label>'+field('LEVERAGE','leverage',state.leverage,'type="number" min="1" step=".1"')+'</div>'+field('SIZE · BASE ASSET','size',state.size,'type="number" min="0" step="any"')+(state.type==='limit'?field('LIMIT PRICE','limit',state.limit,'type="number" min="0" step="any"'):'')+'<div class="two">'+field('STOP LOSS','sl',state.sl,'type="number" min="0" step="any"')+field('TAKE PROFIT','tp',state.tp,'type="number" min="0" step="any"')+'</div>'+button('preview','CHECK ORDER →','primary wide')+'<p class="hint">Opening orders run through our plan. Native closes and protective orders remain available outside the overlay.</p>');
      setOpts('market',symbols,state.market);
      const typ=app.querySelector('[name="type"]');if(typ)typ.value=state.type;
    }else if(state.view==='confirm'){
      const p=state.preview;
      shell('CONFIRM','<div class="eyebrow armed">● ORDER PASSED YOUR PLAN</div><h1>READY<br><i>TO SEND.</i></h1><div class="projection">'+row('REFERENCE PRICE',money(p.entry))+row('EST. STOP RISK',money(p.estimated_risk))+row('SESSION P&L',money(p.session_pnl))+row('REMAINING DD',money(p.remaining_drawdown))+'</div><p class="hint">Risk is estimated. Quotes, fees, slippage and fills can change. Sending does not guarantee execution.</p>'+button('submit','CONFIRM & PLACE ORDER','primary wide')+button('back','← CHANGE ORDER','ghost wide'));
    }else if(state.view==='gate'){
      const step=state.gateStep;
      const bars=Array.from({length:10},(_,i)=>'<span class="'+(i<step?'lit':'')+'"></span>').join('');
      shell('DEGEN GATE','<div class="eyebrow">YOUR RULES / YOUR OVERRIDE</div><h1>YOU SET<br><i>THE LIMIT.</i></h1><div class="progress">'+bars+'</div><div class="gateNum">'+String(Math.min(step+1,10)).padStart(2,'0')+'<span>/10</span></div><div class="consequence">'+(state.lastWarning?'<div class="eyebrow">'+nice(state.lastWarning.label)+'</div><div class="warning">'+nice(state.lastWarning.value)+'</div>':'<p class="sub">Complete ten separate acknowledgments to return to the original MFP order ticket.</p>')+'</div><label>TYPE TO OVERRIDE<input name="phrase" spellcheck="false" autocomplete="off" placeholder="I am a degen"></label>'+button('confess','ACKNOWLEDGE →','primary wide')+button('back','← KEEP MY PLAN','ghost wide')+'<p class="hint">Each confession reveals one account consequence. Your plan breach will be recorded locally.</p>');
    }else if(state.view==='result'){
      shell('ORDER STATUS','<div class="eyebrow armed">ORDER SENT TO MFP</div><h1>REQUEST<br><i>RECEIVED.</i></h1><div class="projection">'+row('CLIENT ORDER ID',nice(state.lastClientId))+row('CURRENT STATUS',nice(state.result?.status||'unknown'))+'</div><p class="hint">Order acceptance is not a fill. Reconcile before placing any additional order.</p>'+button('reconcile','CHECK ORDER STATUS →','primary wide')+button('back','← ORDER TICKET','ghost wide'));
    }
    const notice=app.querySelector('main');
    if(state.error) notice.insertAdjacentHTML('afterbegin','<div class="notice bad">'+nice(state.error)+'</div>');
    else if(state.info)notice.insertAdjacentHTML('afterbegin','<div class="notice">'+nice(state.info)+'</div>');
  }
  function warnings(){
    const p=state.preview||{}, s=state.session||{};
    const r=Number(p.estimated_risk),room=Number(p.remaining_drawdown);
    const totalOverrides=state.history.filter(x=>x.type==='override').length;
    return [
      {label:'01 / AGREEMENT',value:'This order breaks the plan you chose before trading.'},
      {label:'02 / TRADE EXPOSURE',value:Number.isFinite(r)?'Estimated risk: '+money(r):'No calculable stop risk.'},
      {label:'03 / DRAWDOWN BUFFER',value:Number.isFinite(room)?money(room)+' remaining to your drawdown floor.':'Drawdown data unavailable.'},
      {label:'04 / LOSSES LEFT',value:r>0 && room>0?Math.floor(room/r)+' similar full-stop losses fit the remaining buffer (estimate).':'Cannot calculate without a valid stop.'},
      {label:'05 / DAYS LEFT',value:s.stop>0 && room>=0?Math.floor(room/s.stop)+' daily-stop losses fit that buffer (estimate).':'Daily-stop scenario unavailable.'},
      {label:'06 / WINS TO RECOVER',value:s.target>0?Math.ceil(Math.max(0,-Number(p.session_pnl||0))/s.target)+' target-sized wins to recover session P&L (before costs).':'Recovery scenario unavailable.'},
      {label:'07 / TRADE LIMIT',value:'Your approved per-trade risk was '+money(s.maxRisk||state.maxRisk)+'.'},
      {label:'08 / SESSION RESULT',value:'Current P&L since ARM: '+money(p.session_pnl||0)+'.'},
      {label:'09 / HISTORY',value:totalOverrides+' earlier overrides logged in this browser.'},
      {label:'10 / OWNERSHIP',value:'The native ticket will reopen. The choice and outcome remain yours.'}
    ];
  }
  async function boot(){
    const values=await chrome.storage.local.get(['bridgeToken','massiveSettings','massiveHistory','massiveReleased']);
    state.history=Array.isArray(values.massiveHistory)?values.massiveHistory:[];
    state.released=values.massiveReleased||null;
    Object.assign(state,values.massiveSettings||{});
    state.view=values.bridgeToken?'plan':'connect';
    render();
    if(values.bridgeToken)await load();
  }
  async function load(){
    try{
      state.accounts=await api('accounts');
      state.markets=await api('markets');
      if(!Array.isArray(state.accounts))state.accounts=state.accounts?.accounts||[];
      if(!Array.isArray(state.markets))state.markets=state.markets?.markets||[];
      if(!state.accounts.length)throw Error('No accessible MFP accounts in this environment');
      state.account=state.accounts.some(a=>a.id===state.account)?state.account:state.accounts[0].id;
      state.market=state.markets.some(m=>m.id===state.market)?state.market:state.markets[0]?.id||'';
      try{
        const sess=await api('session',null,{account_id:state.account});
        state.session=sess;
        state.target=sess.target;state.stop=sess.stop;state.maxRisk=sess.maxRisk;
        state.view='ticket';
        if(state.released?.account===state.account && state.released?.day===sess.day) state.view='released';
      }catch{state.view='plan';}
      state.error='';render();
    }catch(e){state.error=e.message;state.view='connect';render();}
  }
  async function act(name){
    if(state.busy)return;
    state.busy=true;
    try {
      if(name==='connect'){
        const token=app.querySelector('[name="bridgeToken"]')?.value?.trim();
        if(!token || token.length<24)throw Error('Enter a bridge token of at least 24 characters');
        await chrome.storage.local.set({bridgeToken:token});
        await api('health'); await load();
      }else if(name==='arm'||name==='rearm'){
        if(name==='arm'){
          for(const key of ['target','stop','maxRisk'])if(!Number.isFinite(Number(state[key]))||Number(state[key])<=0)throw Error('Plan fields must be positive numbers');
        }
        const s=await api('arm',{account_id:state.account,target:Number(state.target),stop:Number(state.stop),maxRisk:Number(state.maxRisk)});
        state.session={...s,session_pnl:0};state.target=s.target;state.stop=s.stop;state.maxRisk=s.maxRisk;
        state.view='ticket';state.error='';state.released=null;
        await record(name==='rearm'?'rearm':'arm',{plan:{target:s.target,stop:s.stop,maxRisk:s.maxRisk}});
      }else if(name==='buy'||name==='sell'){state.side=name;}
      else if(name==='preview'){
        if(!state.market)throw Error('Select a market');
        const order={
          account_id:state.account,market_id:state.market,side:state.side,type:state.type,
          size:Number(state.size),leverage:Number(state.leverage),
          ...(state.type==='limit'?{limit_price:Number(state.limit)}:{}),
          ...(state.sl?{stop_loss_price:Number(state.sl)}:{}),
          ...(state.tp?{take_profit_price:Number(state.tp)}:{})
        };
        const p=await api('preview',order);
        state.preview=p;state.session={...state.session,session_pnl:p.session_pnl};
        if(p.allowed){state.view='confirm';}
        else {
          state.gateStep=0;state.lastWarning=null;state.view='gate';
          await record('violation',{reasons:p.reasons.map(x=>x.code),estimatedRisk:p.estimated_risk});
        }
      }else if(name==='submit'){
        const p=state.preview;
        if(!p?.allowed)throw Error('No approved order preview');
        const o=await api('place',{preview_id:p.preview_id});
        state.lastClientId=o.client_order_id||'';
        state.result=o.order||{status:'pending'};
        await record('order_submitted',{clientOrderId:state.lastClientId,estimatedRisk:p.estimated_risk});
        state.view='result';
      }else if(name==='reconcile'){
        if(!state.lastClientId)throw Error('No order ID to reconcile');
        const data=await api('order-lookup',null,{client_order_id:state.lastClientId});
        state.result=Array.isArray(data)?data[0]||{status:'not_found'}:data?.[0]||data?.orders?.[0]||{status:'unknown'};
      }else if(name==='back'){state.view='ticket';state.error='';}
      else if(name==='confess'){
        if(app.querySelector('[name="phrase"]')?.value?.trim().toLowerCase()!=='i am a degen')throw Error('Type I am a degen to acknowledge');
        state.lastWarning=warnings()[state.gateStep];
        state.gateStep+=1;
        if(state.gateStep===10){
          await record('override',{reasonCodes:state.preview?.reasons?.map(x=>x.code)||[],estimatedRisk:state.preview?.estimated_risk});
          state.view='released';
          state.released={account:state.account,day:state.session?.day||'',at:Date.now()};
        }
      }
      await save();render();
    }catch(e){state.error=e.message;render();}
    finally{state.busy=false;}
  }
  app.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]');if(btn){e.preventDefault();act(btn.dataset.action);}
  });
  app.addEventListener('input',e=>{
    const el=e.target;
    if(el.name==='bridgeToken'||el.name==='phrase')return;
    if(['target','stop','maxRisk'].includes(el.name))state[el.name]=Number(el.value);
    else if(el.name in state)state[el.name]=el.value;
    if(state.view==='plan'&&['target','stop'].includes(el.name)){
      const proj=app.querySelector('.projection');
      if(proj)proj.innerHTML=row('5 TARGET DAYS',money(state.target*5))+row('20 TARGET DAYS',money(state.target*20));
    }
  });
  app.addEventListener('change',e=>{
    if(e.target.name in state)state[e.target.name]=e.target.value;
    if(state.view==='ticket'&&e.target.name==='type')render();
    if(state.view==='plan'&&e.target.name==='account')save();
  });
  app.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&state.view==='gate'&&e.target.name==='phrase'){e.preventDefault();act('confess');}
  });
  // Refresh visible session values, but don't steal focus by rebuilding a form mid-typing.
  setInterval(async()=>{
    if(state.view!=='ticket'||state.busy||!state.account)return;
    try{
      const s=await api('session',null,{account_id:state.account});
      state.session=s;
      const large=app.querySelector('.large');
      if(large)large.innerHTML=money(s.session_pnl)+'<span> SINCE ARM</span>';
    }catch{/* Show failure when next order is previewed; never submit with a stale snapshot. */}
  },10000);
  boot().catch(e=>status(e.message,true));
})();
