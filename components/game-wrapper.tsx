'use client';

import { useState, useRef } from 'react';
import { AppHeader } from './app-header';
import { PrimeFactorGame } from './prime-factor-game';

export function GameWrapper() {
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const gameActiveRef = useRef(false);

  return (
    <>
      <AppHeader 
        onShowRules={gameActiveRef.current ? () => setShowRules(true) : undefined}
        onShowTutorial={gameActiveRef.current ? () => setShowTutorial(true) : undefined}
        onExitGame={gameActiveRef.current ? () => setShowExitDialog(true) : undefined}
      />
      <PrimeFactorGame 
        showRulesState={[showRules, setShowRules]}
        showTutorialState={[showTutorial, setShowTutorial]}
        showExitDialogState={[showExitDialog, setShowExitDialog]}
        onGameActiveChange={(isActive) => {
          gameActiveRef.current = isActive;
        }}
      />
    </>
  );
}
