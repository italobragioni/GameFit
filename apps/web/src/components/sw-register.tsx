'use client';

import { useEffect } from 'react';

/** Registra o service worker do PWA (somente em produção/https ou localhost). */
export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // falha de registro não é crítica
      });
    }
  }, []);
  return null;
}
