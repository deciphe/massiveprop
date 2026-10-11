import traders from '../data/traders.json';
import {traderWallets} from './trader-wallets.js';
// Editorial identities may span owner-confirmed wallet groups; never grant a signature badge.
export const FEATURED_TRADERS=Object.fromEntries(traders.flatMap(t=>{
 const username=t.twitter.trim().replace(/^@/,'');
 const avatar=/^https?:\/\//i.test(t.image)?t.image:'https://raw.githubusercontent.com/deciphe/massiveprop/main/public/traders/'+t.image;
 return traderWallets(t.wallet).map(address=>[address,{username,displayName:t.name||username,displayLabel:t.displayLabel||'',tagUrl:t.tagUrl||'',avatar,social:'https://x.com/'+username,tag:t.tag||'',editorial:true}]);
}));
export const featuredTrader=address=>FEATURED_TRADERS[address?.toLowerCase()]||null;
