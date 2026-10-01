import {baseSpec, type Round} from './domain';
import {makeEvidence,specificationHash} from './evidence';
export function historicalRound(): Round {
  const spec=baseSpec('historical',[1690000000,1690259200,1690864000]);
  const evidence=makeEvidence(spec,'Opening Weekend: $162,022,044',162022044,Math.floor(Date.now()/1000));
  return {id:'barbie-practice',title:'Barbie',year:'2023',description:'A pink phenomenon. A record-breaking weekend. How close would your forecast have been?',artwork:'pink',spec,status:'resolved',specification_hash:specificationHash(spec),evidence,winner:2,histogram:[0,0,0,0]};
}
export function syntheticRound(id:string, timestamp:number):Round {
  const spec=baseSpec('synthetic',[timestamp+8,timestamp+10,timestamp+120],[{lower:0,upper:30_000_000},{lower:30_000_000,upper:50_000_000},{lower:50_000_000,upper:null}]);
  spec.event='The Last Projection (2026), 2026-10-01 to 2026-10-03';
  spec.source_url='/api/synthetic-evidence';
  return {id,title:'The Last Projection',year:'SYNTHETIC',description:'Run a ten-second rehearsal: pick a range, watch it close, then inspect a synthetic result.',artwork:'lime',spec,status:'open',specification_hash:specificationHash(spec),evidence:null,winner:null,histogram:[0,0,0]};
}
