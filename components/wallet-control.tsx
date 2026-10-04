'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Wallet, ChevronDown, X} from 'lucide-react';
import {displayGen} from '@/lib/film-market';
import {useWallet} from '@/lib/use-wallet';

export default function WalletControl({connect}: {connect: () => Promise<void>}) {
  const {account, balance} = useWallet(), [connecting, setConnecting] = useState(false), [error, setError] = useState(''), [open, setOpen] = useState(false);
  async function request() {
    if (account) {setOpen(value => !value); return;}
    setConnecting(true); setError('');
    try {await connect();} catch (e) {const reason = e as {code?: number; message?: string}; setError(reason.code === 4001 ? 'Connection cancelled. Try again when you’re ready.' : reason.message ?? 'Could not connect your wallet. Please try again.'); setOpen(true);} finally {setConnecting(false);}
  }
  return <div className="wallet-control"><button className="wallet-button" onClick={request} disabled={connecting} aria-expanded={open} aria-label={account ? 'Wallet connected: ' + account : undefined} title={account || 'Connect to StudioNet'}><Wallet size={16}/>{connecting ? 'Connecting…' : account ? <><span className="wallet-balance">{balance === null ? '—' : displayGen(balance)} GEN</span><span className="wallet-address-short">{account.slice(0, 6)}…{account.slice(-4)}</span><ChevronDown size={14}/></> : 'Connect wallet'}</button>
    {open && <div className="wallet-message" role="dialog" aria-label="Wallet details"><button className="wallet-close" aria-label="Close wallet details" onClick={() => setOpen(false)}><X size={16}/></button><strong>{account ? 'Your StudioNet wallet' : 'Connect your wallet'}</strong>{account && <><p className="wallet-full-address">{account}</p><div className="wallet-popover-balance">{balance === null ? 'Loading balance…' : displayGen(balance) + ' GEN'}</div><Link href="/predictions" onClick={() => setOpen(false)}>My predictions</Link><a href="https://studio.genlayer.com" target="_blank" rel="noreferrer">Get StudioNet GEN</a><p>Practice balance · simulated GEN</p></>}{error && <p role="alert">{error}</p>}</div>}
  </div>;
}
