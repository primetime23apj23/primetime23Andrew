'use client';

import { PrimeFactorGame } from './prime-factor-game';
import { useEffect, useState } from 'react';

export function GameWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <PrimeFactorGame />;
}
