export const FLOW_CONFIGS = {
 vest: {
  id:'vest',slug:'vestflow',title:'Vestflow',firm:'Vest',eyebrow:'VEST EXCHANGE',mark:'V',
  wallet:'0xb2f86eae1197032fa85389cc6c0f3b06b58dd1ea',token:'0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  chainId:42161,balanceRpcs:['https://arb1.arbitrum.io/rpc','https://arbitrum-one-rpc.publicnode.com'],chain:'Arbitrum One',api:'https://arbitrum.blockscout.com/api/v2',explorer:'https://arbiscan.io',explorerName:'Arbiscan',minIncomingAmount:2000,
  referral:'https://next.vestmarkets.com/r/isgigaprop',referralCode:'GIGA',cta:'Get 5% off Vest'
 },
 breakout: {
  id:'breakout',slug:'breakoutflow',title:'Breakoutflow',firm:'Breakout',eyebrow:'BREAKOUT · ETHEREUM',mark:'B',
  wallet:'0x9736603a31cf71efcb62631cc28f60bcbd31d565',token:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId:1,balanceRpcs:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],chain:'Ethereum',api:'https://eth.blockscout.com/api/v2',explorer:'https://etherscan.io',explorerName:'Etherscan',
  referral:'https://portal.breakoutprop.com/buy-evaluation?ref=C406739',cta:'Explore Breakout'
 },
 nova: {
  id:'nova',slug:'novaflow',title:'Novaflow',firm:'Hypernova',eyebrow:'HYPERNOVA · ARBITRUM',mark:'N',
  wallet:'0x920973eebffd3bf7da14dd9fb52bd3bea1664c67',token:'0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  chainId:42161,balanceRpcs:['https://arb1.arbitrum.io/rpc','https://arbitrum-one-rpc.publicnode.com'],transferRpcs:['https://arb1.arbitrum.io/rpc','https://arbitrum-one-rpc.publicnode.com'],
  chain:'Arbitrum One',api:'https://arbitrum.blockscout.com/api/v2',explorer:'https://arbiscan.io',explorerName:'Arbiscan',
  referral:'https://hn.xyz/r/4sjg1b',cta:'Explore Hypernova'
 },
 propr: {
  id:'propr',slug:'proprflow',title:'Proprflow',firm:'Propr',eyebrow:'PROPR · ETHEREUM',mark:'P',
  wallet:'0x0353f53bd55b8011bad3de1d939ff4d8335cbb1d',token:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId:1,balanceRpcs:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],chain:'Ethereum',api:'https://eth.blockscout.com/api/v2',explorer:'https://etherscan.io',explorerName:'Etherscan',
  referral:'https://app.propr.xyz/r/7gJmpEjv',cta:'Explore Propr'
 }
};

export const VEST_CHAINS = [
 {...FLOW_CONFIGS.vest,chainKey:'arbitrum'},
 {...FLOW_CONFIGS.vest,chainId:8453,balanceRpcs:['https://mainnet.base.org','https://base-rpc.publicnode.com'],transferRpcs:['https://mainnet.base.org','https://base-rpc.publicnode.com'],chainKey:'base',slug:'vestflow-base',chain:'Base',
 wallet:'0x55133c825603e6a5b9e911abab23e75dc3bb07af',token:'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
 api:'https://base.blockscout.com/api/v2',explorer:'https://basescan.org',explorerName:'Basescan'},
 {...FLOW_CONFIGS.vest,chainId:1,balanceRpcs:['https://ethereum-rpc.publicnode.com','https://eth.drpc.org'],chainKey:'ethereum',slug:'vestflow-ethereum',chain:'Ethereum',
 wallet:'0xe80f92077131b9890599e418ae323de71ce1c35a',token:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
 api:'https://eth.blockscout.com/api/v2',explorer:'https://etherscan.io',explorerName:'Etherscan'}
];
export const NOVA_WALLETS=[
 {...FLOW_CONFIGS.nova,chainKey:'settlement',walletRole:'Payout settlement'},
 {...FLOW_CONFIGS.nova,chainKey:'reserve',slug:'novaflow-reserve',walletRole:'Reserve',wallet:'0x43c5f0a81d538a527dbf35d27faa583ac7fada07'}
];
export const FLOW_SOURCES=[...VEST_CHAINS,...NOVA_WALLETS,...Object.values(FLOW_CONFIGS).filter(c=>!['vest','nova'].includes(c.id))];
