'use client';

import { useState } from 'react';
import { AppHeader } from './app-header';
import { PrimeFactorGame } from './prime-factor-game';

export function GameWrapper() {
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [gameActive, setGameActive] = useState(false);

  return (
    <>
      <AppHeader 
        onShowRules={gameActive ? () => setShowRules(true) : undefined}
        onShowTutorial={gameActive ? () => setShowTutorial(true) : undefined}
        onExitGame={gameActive ? () => setShowExitDialog(true) : undefined}
      />
      <PrimeFactorGame 
        showRulesState={[showRules, setShowRules]}
        showTutorialState={[showTutorial, setShowTutorial]}
        showExitDialogState={[showExitDialog, setShowExitDialog]}
        onGameActiveChange={setGameActive}
      />
    </>
  );
}
