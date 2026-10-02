import {baseSpec,winningRange, type Round} from './domain';
import {makeEvidence,specificationHash} from './evidence';
export function historicalRound(): Round {
  const spec=baseSpec('historical',[1690000000,1690259200,1690864000]);
  const evidence=makeEvidence(spec,'Opening Weekend: $162,022,044',162022044,Math.floor(Date.now()/1000));
  return {id:'barbie-practice',title:'Barbie',year:'2023',description:'A pink phenomenon. A record-breaking weekend. How close would your forecast have been?',artwork:'pink',spec,status:'resolved',specification_hash:specificationHash(spec),evidence,winner:2,histogram:[0,0,0,0]};
}
export function historicalRounds():Round[]{
  const ranges=[{lower:0,upper:50_000_000},{lower:50_000_000,upper:75_000_000},{lower:75_000_000,upper:100_000_000},{lower:100_000_000,upper:null}];
  const films=[
    {id:'oppenheimer-practice',title:'Oppenheimer',year:'2023',slug:'Oppenheimer-(2023)',start:'2023-07-21',end:'2023-07-23',value:82_455_420,artwork:'ochre',description:'A three-hour historical drama met blockbuster crowds. Where would you have called its opening weekend?'},
    {id:'dune-two-practice',title:'Dune: Part Two',year:'2024',slug:'Dune-Part-Two-(2024)',start:'2024-03-01',end:'2024-03-03',value:82_505_391,artwork:'slate',description:'Return to Arrakis. Forecast the published domestic opening weekend of its wide release.'}
  ];
  return [historicalRound(),...films.map(film=>{
    const start=Date.parse(film.start+'T00:00:00Z')/1000;
    const spec=baseSpec('historical',[start-3600,start+4*86400,start+10*86400],ranges);
    spec.event=film.title+' ('+film.year+'), '+film.start+' to '+film.end;spec.source_url='https://www.the-numbers.com/movie/'+film.slug;
    const evidence=makeEvidence(spec,'Opening Weekend: $'+film.value.toLocaleString('en-US'),film.value,Math.floor(Date.now()/1000));
    evidence.provenance='Historical public publisher checked on 2026-10-02. Whitespace-normalized excerpt retained for local practice; no protocol adjudication. Observation timestamp is the local record creation time.';
    return {id:film.id,title:film.title,year:film.year,description:film.description,artwork:film.artwork,spec,status:'resolved',specification_hash:specificationHash(spec),evidence,winner:winningRange(ranges,film.value),histogram:[0,0,0,0]};
  })];
}
export function addHistoricalRounds(rounds:Round[]){for(const round of historicalRounds())if(!rounds.some(existing=>existing.id===round.id))rounds.push(round);}
export function syntheticRound(id:string, timestamp:number):Round {
  const spec=baseSpec('synthetic',[timestamp+8,timestamp+10,timestamp+120],[{lower:0,upper:30_000_000},{lower:30_000_000,upper:50_000_000},{lower:50_000_000,upper:null}]);
  spec.event='The Last Projection (2026), 2026-10-01 to 2026-10-03';
  spec.source_url='/api/synthetic-evidence';
  return {id,title:'The Last Projection',year:'SYNTHETIC',description:'Run a ten-second rehearsal: pick a range, watch it close, then inspect a synthetic result.',artwork:'lime',spec,status:'open',specification_hash:specificationHash(spec),evidence:null,winner:null,histogram:[0,0,0]};
}
