import {useId} from 'react';
// The same crater/light model as the scene moon, clipped into the rank.
const terrain=(()=>{
 const layers=Array.from({length:6},()=>[]);
 const craters=[[.28,.33,.14],[.62,.58,.19],[.78,.24,.09],[.36,.8,.1],[.12,.61,.07]];
 for(let y=3;y<280;y+=2.7)for(let x=2+(Math.round(y/2.7)%2)*1.35;x<350;x+=2.7){
  const nx=x/350,ny=y/280;
  let v=.57+.21*Math.sin(nx*13+ny*4)*Math.cos(ny*15)-ny*.18;
  for(const [cx,cy,r] of craters){const d=Math.hypot(nx-cx,ny-cy)/r;v-=.45*Math.exp(-d*d*3);v+=.23*Math.exp(-Math.pow((d-1)*5,2));}
  v=Math.max(.03,Math.min(.99,v));const radius=.3+v*.86;
  layers[Math.floor(v*6)].push('M'+x.toFixed(2)+','+y.toFixed(2)+'m-'+radius.toFixed(2)+',0a'+radius.toFixed(2)+','+radius.toFixed(2)+' 0 1,0 '+(radius*2).toFixed(2)+',0a'+radius.toFixed(2)+','+radius.toFixed(2)+' 0 1,0 -'+(radius*2).toFixed(2)+',0');
 }
 return layers.map(a=>a.join(''));
})();
export default function LunarRank({rank}){
 const id='lunar-rank-'+useId().replace(/:/g,'');
 const numeral=String(rank).padStart(2,'0');
 const metal=rank===1?['#f1e7cc','#caba96','#e4d6b5','#9d8a64']:rank===2?['#f0f1ee','#c1c6c7','#e2e5e2','#929b9d']:['#decabb','#b79b85','#d0b49e','#8d7160'];
 const text=<text x="12" y="249" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="266" letterSpacing="-24">{numeral}</text>;
 return <svg className="flat-lunar-rank" viewBox="0 0 350 280" role="img" aria-label={'Rank '+rank}>
 <defs><clipPath id={id}>{text}</clipPath><linearGradient id={id+'-base'} x1="0" y1="0" x2=".8" y2="1"><stop stopColor={metal[0]}/><stop offset=".4" stopColor={metal[1]}/><stop offset=".65" stopColor={metal[2]}/><stop offset="1" stopColor={metal[3]}/></linearGradient></defs>
 <g fill={'url(#'+id+'-base)'}>{text}</g>
 <g clipPath={'url(#'+id+')'} fill="#080809" opacity=".2">{terrain.map((d,i)=><path key={i} d={d} opacity={.27+i*.14}/>)}</g>
 <g fill="none" stroke="currentColor" strokeWidth=".55" opacity=".3">{text}</g>
 </svg>;
}
