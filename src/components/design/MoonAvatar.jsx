import {useMemo} from 'react';
// Stable lunar lighting per wallet; no network image or random render state.
export default function MoonAvatar({seed='',className=''}){
 const dots=useMemo(()=>{let hash=0;for(const c of seed)hash=(hash*31+c.charCodeAt(0))>>>0;const phase=(hash%360)*Math.PI/180,lx=Math.cos(phase)*.85,lz=Math.sin(phase)*.7,out=[];for(let y=3;y<80;y+=3)for(let x=3+(Math.round(y/3)%2)*1.5;x<80;x+=3){const nx=(x-40)/36,ny=(y-40)/36,q=nx*nx+ny*ny;if(q>=1)continue;const z=Math.sqrt(1-q),v=Math.min(1,Math.max(.035,nx*lx-ny*.35+z*lz)*(.7+.2*Math.sin(nx*18+hash%20)*Math.cos(ny*14)));out.push(<circle key={x+':'+y} cx={x} cy={y} r={.35+v*1.05} opacity={.15+v*.8}/>)}return out},[seed]);
 return <svg className={'flat-moon-avatar '+className} viewBox="0 0 80 80" fill="#ded7c7" aria-hidden="true">{dots}</svg>;
}
