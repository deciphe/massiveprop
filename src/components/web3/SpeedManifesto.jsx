import {BRAND_ASSETS} from '../../lib/brand-assets.js';
export default function SpeedManifesto(){
 return <section className="flat-home-hero" id="speed"><h1>MASSIVE.</h1><p>The traders.<br/>The payouts.</p><a className="flat-hero-link" href="#leaderboard">Leaderboard <span>↗</span></a><a className="flat-vault" href="#flow"><span>Enter the</span><b>VAULT.</b><i aria-hidden="true">↗</i><span className="flat-vault-marks">{[['Vest',BRAND_ASSETS.vestSymbol],['Breakout',BRAND_ASSETS.breakout],['Hypernova',BRAND_ASSETS.hypernova],['Propr',BRAND_ASSETS.propr]].map(([name,src])=><span key={name}><img src={src} alt={name}/></span>)}</span></a></section>;
}
