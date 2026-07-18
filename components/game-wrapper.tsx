'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppHeader } from './app-header';
import { PrimeFactorGame } from './prime-factor-game';
import { DEFAULT_SKINS, type DiceSkin } from './dice-skin-settings';

export function GameWrapper() {
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [gameActive, setGameActive] = useState(false);

  // Local-only dice/board skins uploaded by the player on this device.
  // Lifted here so both the header (skins button) and the game share one source.
  const [diceSkins, setDiceSkins] = useState<DiceSkin[]>(DEFAULT_SKINS);

  // Load locally-saved dice skins on mount (client-only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('primetime-dice-skins');
      if (saved) {
        const parsed = JSON.parse(saved) as DiceSkin[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDiceSkins(parsed);
        }
      }
    } catch {
      // Ignore malformed/quota errors and fall back to defaults
    }
  }, []);

  const handleDiceSkinsChange = useCallback((next: DiceSkin[]) => {
    setDiceSkins(next);
    try {
      localStorage.setItem('primetime-dice-skins', JSON.stringify(next));
    } catch {
      // Ignore storage quota errors (large images) - skins still apply this session
    }
  }, []);

  return (
    <>
      <AppHeader 
        onShowRules={gameActive ? () => setShowRules(true) : undefined}
        onShowTutorial={gameActive ? () => setShowTutorial(true) : undefined}
        onExitGame={gameActive ? () => setShowExitDialog(true) : undefined}
        diceSkins={diceSkins}
        onDiceSkinsChange={handleDiceSkinsChange}
      />
      <PrimeFactorGame 
        showRulesState={[showRules, setShowRules]}
        showTutorialState={[showTutorial, setShowTutorial]}
        showExitDialogState={[showExitDialog, setShowExitDialog]}
        onGameActiveChange={setGameActive}
        diceSkins={diceSkins}
        onDiceSkinsChange={handleDiceSkinsChange}
      />
    </>
  );
}
