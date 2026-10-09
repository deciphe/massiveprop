import MoonAvatar from './MoonAvatar';
export default function MoonLoader({label='Loading'}){return <div className="flat-loading" role="status" aria-live="polite"><MoonAvatar seed="massive-lunar"/><strong>{label}<span aria-hidden="true">.</span></strong></div>}
