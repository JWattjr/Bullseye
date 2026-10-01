export type Range = { lower: number; upper: number | null };
export type Mode = 'historical' | 'competitive' | 'synthetic';
export type Specification = {
  event: string; metric: string; source_url: string; geography: string; currency: string;
  unit: string; scale: number; rounding: string; ranges: Range[]; entry_deadline: number;
  observation_time: number; resolution_deadline: number; correction_policy: string;
  missing_evidence: string; mode: Mode;
};
export type Evidence = { original_source: string; approved_capture_url: string; capture_timestamp: number;
  publication_timestamp: number | null; content_hash: string; hash_scope: string; extracted_passage: string;
  normalized_value: number; specification_hash: string; provenance: string; adjudication_transaction: string | null };
export type Round = { id: string; title: string; year: string; description: string; artwork: string;
  spec: Specification; status: string; specification_hash: string; evidence: Evidence | null;
  winner: number | null; histogram: number[]; protocol?: { contract: string; specificationTx: string; adjudicationTx: string | null; status: string } };
export type Prediction = { id: string; participant: string; roundId: string; range: number; submittedAt: number; kind: 'practice' | 'protocol'; hash?: string; state: string };
export const SOURCE = 'https://www.the-numbers.com/movie/Barbie-(2023)';
export const POLICY = 'first successful consensus observation; ignore later corrections';
export const defaultRanges: Range[] = [{lower:0,upper:100_000_000},{lower:100_000_000,upper:150_000_000},{lower:150_000_000,upper:200_000_000},{lower:200_000_000,upper:null}];
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export function validateSpec(spec: Specification): string[] {
  const errors: string[] = [];
  if (!/^.+ \(\d{4}\), \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/.test(spec.event)) errors.push('Include film, release year and exact weekend dates.');
  if (spec.metric !== 'domestic opening-weekend box-office revenue') errors.push('Use the exact domestic opening-weekend metric.');
  if (spec.mode === 'synthetic' ? spec.source_url !== '/api/synthetic-evidence' : !/^https:\/\/www\.the-numbers\.com\/movie\/[A-Za-z0-9()%-]+$/.test(spec.source_url)) errors.push('Use the approved source for this round mode.');
  if (spec.geography !== 'United States and Canada' || spec.currency !== 'USD' || spec.unit !== 'dollars' || spec.scale !== 1 || spec.rounding !== 'exact published integer; no rounding') errors.push('Use US and Canada, integer USD dollars, scale 1 and no rounding.');
  if (spec.correction_policy !== POLICY || spec.missing_evidence !== 'pending until deadline then void') errors.push('Use the fixed correction and missing-evidence policies.');
  if (![spec.entry_deadline,spec.observation_time,spec.resolution_deadline].every(Number.isSafeInteger) || !(spec.entry_deadline < spec.observation_time && spec.observation_time < spec.resolution_deadline)) errors.push('Closing, observation and resolution times must be ordered.');
  if (!['historical','competitive','synthetic'].includes(spec.mode)) errors.push('Choose an explicit round mode.');
  if (spec.mode === 'competitive') {
    const start = Date.parse(spec.event.split(', ').at(-1)?.split(' to ')[0] + 'T00:00:00Z')/1000;
    if (!Number.isFinite(start) || spec.entry_deadline > start || spec.observation_time < spec.entry_deadline + 4*86400) errors.push('Competitive rounds must close before release and observe at least four days later.');
  }
  let lower = 0;
  if (!Array.isArray(spec.ranges) || spec.ranges.length < 3 || spec.ranges.length > 5) return [...errors,'Choose three to five ranges.'];
  for (const [i,range] of spec.ranges.entries()) {
    if (!Number.isSafeInteger(range.lower) || range.lower !== lower || (i===spec.ranges.length-1 ? range.upper!==null : !Number.isSafeInteger(range.upper) || (range.upper??0)<=lower || (range.upper??0)>1e12)) errors.push('Ranges must cover zero to infinity with no gaps or overlap.');
    lower = range.upper ?? lower;
  }
  return [...new Set(errors)];
}
export function winningRange(ranges: Range[], value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1e15) throw new Error('Invalid observed integer.');
  const index = ranges.findIndex(r=>value>=r.lower&&(r.upper===null||value<r.upper));
  if (index<0) throw new Error('Value outside ranges.');
  return index;
}
export function score(prediction: Prediction, round: Round) {
  const settled = round.status === 'resolved' && round.winner !== null;
  const correct = settled && prediction.range === round.winner;
  const competitive = settled && prediction.kind === 'protocol' && prediction.state === 'finalized' && round.spec.mode === 'competitive';
  return { practicePoints: settled && prediction.kind==='practice' && correct ? 100 : 0, points: competitive && correct ? 100 : 0, counted: competitive, correct };
}
export function rangeLabel(range: Range): string {
  const millions = (value: number)=>'$'+new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(value/1e6)+'m';
  if(range.lower===0) return 'Under '+millions(range.upper!);
  if(range.upper===null) return millions(range.lower)+' or more';
  return millions(range.lower)+' – under '+millions(range.upper);
}
export function baseSpec(mode: Mode, times: [number,number,number], ranges=defaultRanges): Specification {
  return {event:'Barbie (2023), 2023-07-21 to 2023-07-23',metric:'domestic opening-weekend box-office revenue',source_url:SOURCE,geography:'United States and Canada',currency:'USD',unit:'dollars',scale:1,rounding:'exact published integer; no rounding',ranges,entry_deadline:times[0],observation_time:times[1],resolution_deadline:times[2],correction_policy:POLICY,missing_evidence:'pending until deadline then void',mode};
}
