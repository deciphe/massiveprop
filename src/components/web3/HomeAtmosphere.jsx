import {useEffect,useRef} from 'react';
import './home-atmosphere.css';

// Decorative canvas layers are painted only on resize; scrolling moves the cached layers.
export default function HomeAtmosphere(){
 const scene=useRef(null),moon=useRef(null),stars=useRef(null);
 useEffect(()=>{
  const host=scene.current, lunar=moon.current, sky=stars.current;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,resizeFrame=0;
  function context(canvas,w,h){const d=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);const ctx=canvas.getContext('2d');if(ctx)ctx.setTransform(d,0,0,d,0,0);return ctx}
  function paint(){
   const w=host.clientWidth,h=host.clientHeight;
   const sc=context(sky,w,h),mc=context(lunar,w,h);if(!sc||!mc)return;
   let seed=947;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
   for(let i=0;i<Math.min(170,Math.round(w*h/11000));i++){const x=random()*w,y=random()*h,r=.45+random()*.65;sc.fillStyle=`rgba(213,213,207,${.08+random()*.2})`;sc.beginPath();sc.arc(x,y,r,0,Math.PI*2);sc.fill()}
   const radius=Math.max(w*.73,h*.72),cx=w*1.05,cy=h*1.27;
   const craters=[[-.55,-.57,.13],[-.22,-.73,.075],[-.7,-.34,.055],[-.35,-.37,.09],[-.07,-.5,.12],[-.53,-.2,.045],[.19,-.68,.065],[-.8,-.14,.033],[-.12,-.87,.04],[-.43,-.76,.047],[.12,-.31,.08]];
   const step=w<600?4.2:4.8;
   for(let y=0;y<h;y+=step){for(let x=(Math.round(y/step)%2)*step/2;x<w;x+=step){
    const nx=(x-cx)/radius,ny=(y-cy)/radius,q=nx*nx+ny*ny;if(q>=1)continue;
    const z=Math.sqrt(1-q),light=Math.max(0,-nx*.4-ny*.62+z*.12);
    let texture=Math.sin(nx*23+Math.sin(ny*17)*2)*Math.cos(ny*29)*.13+Math.sin(nx*71-ny*43)*.05;
    for(const [a,b,r] of craters){const d=Math.hypot(nx-a,ny-b)/r;if(d<1.5)texture+=-.52*Math.exp(-d*d*2.8)+.22*Math.exp(-Math.pow((d-1)*6,2))}
    const v=Math.max(.015,Math.min(1,light*(.55+texture))),limb=Math.min(1,(1-q)*35);
    mc.fillStyle=`rgba(198,198,191,${(.025+v*.31)*limb})`;mc.beginPath();mc.arc(x,y,step*(.12+v*.37),0,Math.PI*2);mc.fill();
   }}
  }
  function move(){frame=0;const y=reduced.matches?0:Math.min(window.scrollY,4000);lunar.style.transform=`translate3d(0,${-y*.075}px,0)`;sky.style.transform=`translate3d(0,${-y*.025}px,0)`}
  function scroll(){if(!frame)frame=requestAnimationFrame(move)}
  function resize(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{paint();move()})}
  const observer=new ResizeObserver(resize);observer.observe(host);
  window.addEventListener('scroll',scroll,{passive:true});reduced.addEventListener('change',scroll);paint();move();
  return()=>{observer.disconnect();window.removeEventListener('scroll',scroll);reduced.removeEventListener('change',scroll);cancelAnimationFrame(frame);cancelAnimationFrame(resizeFrame)};
 },[]);
 return <div className="home-atmosphere" ref={scene} aria-hidden="true"><canvas ref={stars} className="home-stars"/><canvas ref={moon} className="home-moon"/><div className="home-vignette"/></div>;
}
