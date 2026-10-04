import type {TransactionHash} from 'genlayer-js/types';
import {isMovie} from '@/lib/film-market';
import {filmPool, filmReceipt, filmSnapshot, settleFilm} from '@/lib/film-market-server';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams, movie = query.get('movie');
  if (!movie || !isMovie(movie)) return Response.json({error: 'Choose a listed movie.'}, {status: 400});
  const hash = query.get('receipt'), before = query.get('before'), poolId = query.get('poolId');
  if (hash && !/^0x[a-fA-F0-9]{64}$/.test(hash)) return Response.json({error: 'Invalid transaction hash.'}, {status: 400});
  if (before !== null && !/^\d{1,5}$/.test(before)) return Response.json({error: 'Invalid prediction cursor.'}, {status: 400});
  try {
    return Response.json(hash ? await filmReceipt(movie, hash as TransactionHash) : poolId ? await filmPool(movie, poolId) : await filmSnapshot(movie, before === null ? undefined : Number(before)));
  } catch {
    return Response.json({error: 'The network is taking longer than usual. We’ll retry automatically.'}, {status: 502});
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({error: 'Invalid request origin.'}, {status: 403});
  try {
    const {movie, poolId} = await request.json();
    if (typeof movie !== 'string' || !isMovie(movie) || typeof poolId !== 'string' || poolId.length > 100) return Response.json({error: 'Choose a listed movie session.'}, {status: 400});
    return Response.json(await settleFilm(movie, poolId));
  } catch {
    return Response.json({error: 'The result is taking longer than usual. We’ll retry automatically.'}, {status: 502});
  }
}
