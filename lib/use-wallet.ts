'use client';
import {useEffect, useState} from 'react';

export type WalletProvider = {request: (args: {method: string; params?: unknown[]}) => Promise<unknown>; on?: (event: string, fn: (value: unknown) => void) => void; removeListener?: (event: string, fn: (value: unknown) => void) => void};
export function walletProvider() {return (window as unknown as {ethereum?: WalletProvider}).ethereum;}

export function useWallet() {
  const [account, setAccount] = useState(''), [balance, setBalance] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const provider = walletProvider();
    const update = (accounts: unknown) => {
      const first = Array.isArray(accounts) ? accounts[0] : '';
      if (active) {setAccount(typeof first === 'string' && /^0x[a-fA-F0-9]{40}$/.test(first) ? first.toLowerCase() : ''); setBalance(null);}
    };
    const connected = (event: Event) => update([(event as CustomEvent).detail]);
    provider?.request({method: 'eth_accounts'}).then(update).catch(() => {});
    provider?.on?.('accountsChanged', update); window.addEventListener('bullseye:wallet-connected', connected);
    return () => {active = false; provider?.removeListener?.('accountsChanged', update); window.removeEventListener('bullseye:wallet-connected', connected);};
  }, []);
  useEffect(() => {
    if (!account) return;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      try {const response = await fetch('/api/wallet?address=' + account, {cache: 'no-store'}); const result = await response.json(); if (active && response.ok) setBalance(result.balance);} catch {}
    };
    void refresh(); const timer = setInterval(refresh, 30_000);
    window.addEventListener('bullseye:balance-changed', refresh);
    return () => {active = false; clearInterval(timer); window.removeEventListener('bullseye:balance-changed', refresh);};
  }, [account]);
  return {account, balance};
}
