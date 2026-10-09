import {useId} from 'react';
export default function LunarRank({rank}){
 const id='lunar-rank-'+useId().replace(/:/g,'');
 const numeral=String(rank).padStart(2,'0');
 const text=<text x="12" y="249" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="266" letterSpacing="-24">{numeral}</text>;
 return <svg className="flat-lunar-rank" viewBox="0 0 350 280" role="img" aria-label={'Rank '+rank}>
 <defs><clipPath id={id}>{text}</clipPath><filter id={id+'-neutral'}><feColorMatrix type="saturate" values=".12"/></filter></defs>
 <g fill="currentColor" opacity=".16">{text}</g>
 <g clipPath={'url(#'+id+')'}>
 <image href="/assets/flat-massive-moon.jpg" x="-220" y="-405" width="680" height="680" preserveAspectRatio="xMidYMid slice" filter={'url(#'+id+'-neutral)'}/>
 <g fill="currentColor" style={{mixBlendMode:'color'}}>{text}</g>
 </g>
 <g fill="none" stroke="currentColor" strokeWidth=".6" opacity=".38">{text}</g>
 </svg>;
}
