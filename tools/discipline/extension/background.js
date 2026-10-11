// Public app never handles or stores an MFP API credential.
const BRIDGE = 'http://127.0.0.1:18740';
const ACTIONS = new Set(['health','accounts','markets','account','session','arm','preview','place','order-lookup']);
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(m?.kind!=='MASSIVE_BRIDGE')return;
  if(!sender.tab?.url || !/^https:\/\/(www\.)?myfundedperpetuals\.com\/trade(?:\/|$)/.test(sender.tab.url)){
    reply({error:'Not a trading tab'});return;
  }
  (async()=>{
    if(!ACTIONS.has(m.action))throw Error('Unsupported action');
    const values=await chrome.storage.local.get(['bridgeToken']);
    if(!values.bridgeToken)throw Error('Bridge token missing. Connect from MASSIVE settings.');
    const params=new URLSearchParams();
    for(const [k,v] of Object.entries(m.query||{})) params.set(k,String(v));
    const method=['arm','preview','place'].includes(m.action)?'POST':'GET';
    const suffix=method==='GET' && params.size?'?'+params.toString():'';
    const response=await fetch(BRIDGE+'/'+m.action+suffix,{
      method,headers:{Authorization:'Bearer '+values.bridgeToken,...(method==='POST'?{'Content-Type':'application/json'}:{})},
      ...(method==='POST'?{body:JSON.stringify(m.body||{})}:{})
    });
    const json=await response.json();
    if(!response.ok)throw Error((json.error||'Bridge refused request')+(json.client_order_id?' [Client order: '+json.client_order_id+']':''));
    return json.data;
  })().then(data=>reply({data})).catch(e=>reply({error:String(e.message||e)}));
  return true;
});
