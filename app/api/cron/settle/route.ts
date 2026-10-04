import {filmSnapshot, invalidateFilm, settleFilm, waitForSettlement} from '@/lib/film-market-server';
import {runSettlementKeeper} from '@/lib/settlement-keeper';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== 'Bearer ' + process.env.CRON_SECRET) return Response.json({error: 'Unauthorized'}, {status: 401});
  const results = await runSettlementKeeper({snapshot: filmSnapshot, settle: settleFilm, wait: waitForSettlement, invalidate: invalidateFilm});
  const failed = results.some(result => result.state === 'retry_required' || result.state === 'budget_exhausted');
  if (failed) console.error('Bullseye settlement will retry', results.filter(result => result.error || result.state === 'budget_exhausted'));
  return Response.json({checkedAt: new Date().toISOString(), results}, {status: failed ? 503 : 200, headers: {'Cache-Control': 'no-store'}});
}
