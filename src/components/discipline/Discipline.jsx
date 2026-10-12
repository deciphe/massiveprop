import {useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import './discipline.css';

export default function Discipline(){
 const [status,setStatus]=useState('idle');
 useEffect(()=>{const previous=document.title;document.title='MASSIVE Discipline';return()=>{document.title=previous}},[]);
 async function submit(event){
  event.preventDefault();if(status==='sending')return;
  const form=event.currentTarget,fields=new FormData(form);if(fields.get('website'))return;
  setStatus('sending');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch('https://formsubmit.co/ajax/gp@gigaprop.xyz',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},signal:controller.signal,body:JSON.stringify({email:fields.get('email').trim(),source:'massiveprop.xyz/#discipline',_subject:'MASSIVE Discipline — interested',consent:'Email me about MASSIVE Discipline. I can unsubscribe anytime.',_honey:''})});
   const result=await response.json();if(!response.ok||![true,'true'].includes(result?.success))throw Error();
   setStatus('success');form.reset();
  }catch{setStatus('error')}finally{clearTimeout(timer)}
 }
 return <main className="md-interest"><nav className="md-interest-nav"><a href="#">MASSIVE.</a><span>DISCIPLINE</span></nav>
  <video className="md-interest-video" controls playsInline preload="metadata" aria-label="MASSIVE Discipline preview"><source src="/media/massive-discipline-promo.mp4" type="video/mp4"/>Your browser cannot play this video.</video>
  <section className="md-interest-entry" aria-label="Discipline interest signup"><div><h1>MASSIVE Discipline.</h1><p>Get the first word.</p></div>
   {status==='success'?<p className="md-interest-confirm" role="status">You're on the list.</p>:<form onSubmit={submit}><input type="text" name="website" tabIndex={-1} autoComplete="off" className="md-interest-honey" aria-hidden="true"/><label className="md-interest-sr" htmlFor="md-interest-email">Email address</label><input id="md-interest-email" name="email" type="email" required autoComplete="email" placeholder="Your email" disabled={status==='sending'}/><button type="submit" disabled={status==='sending'}>{status==='sending'?'Sending…':"I'm interested"}<ArrowUpRight size={13}/></button><small>Updates on Discipline. Unsubscribe anytime.</small>{status==='error'&&<p role="alert">Couldn't send. Please try again.</p>}</form>}
  </section>
 </main>;
}
