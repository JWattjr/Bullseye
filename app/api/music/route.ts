import type {TransactionHash} from 'genlayer-js/types';
import {musicMaintenance, musicReceipt, musicSeason, musicSnapshot, validMusicId} from '@/lib/music-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const id = query.get('id'), receipt = query.get('receipt'), participant = query.get('participant');
  if (id && !validMusicId(id) || receipt && !/^0x[a-fA-F0-9]{64}$/.test(receipt) || participant && !/^0x[a-fA-F0-9]{40}$/.test(participant)) return Response.json({error: 'Invalid market, wallet or transaction.'}, {status: 400});
  try {
    return Response.json(receipt ? await musicReceipt(receipt as TransactionHash) : query.has('season') ? await musicSeason(participant?.toLowerCase()) : await musicSnapshot(id ?? undefined, participant?.toLowerCase(),query.has('previous')));
  } catch {return Response.json({error: 'The network is taking longer than usual. Retry in a moment.'}, {status: 502});}
}
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({error: 'Invalid request origin.'}, {status: 403});
  try {
    const body = await request.json();
    if (typeof body.id !== 'string' || !validMusicId(body.id) || !['resolve', 'settle', 'verify-claim', 'sync-season', 'sync-film','judge-challenge','expire-challenge','open-reviewed','release-listing','verify-credit','recover-deposit','recover-review','relay-review','recover-ruling'].includes(body.action)) return Response.json({error: 'Choose a listed music market.'}, {status: 400});
    if (['sync-season', 'sync-film'].includes(body.action) && (typeof body.participant !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(body.participant))) return Response.json({error: 'Invalid wallet.'}, {status: 400});
    if (['verify-claim','verify-credit','recover-deposit'].includes(body.action) && (typeof body.participant !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(body.participant) || typeof body.hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(body.hash))) return Response.json({error: 'Invalid collection receipt.'}, {status: 400});
    if(body.hash && (typeof body.hash!=='string'||!/^0x[a-fA-F0-9]{64}$/.test(body.hash)))return Response.json({error:'Invalid recovery receipt.'},{status:400});
    return Response.json(await musicMaintenance(body.id, body.action, body.participant?.toLowerCase(), body.hash,body.previous===true));
  } catch {return Response.json({error: 'Result verification is taking longer. We will retry.'}, {status: 502});}
}
