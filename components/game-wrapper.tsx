'use client';

import { useState } from 'react';
import { AppHeader } from './app-header';
import { PrimeFactorGame } from './prime-factor-game';

export function GameWrapper() {
  const [showRules, setShowRules] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  return (
    <>
      <AppHeader 
        onShowRules={() => setShowRules(true)}
        onShowTutorial={() => setShowTutorial(true)}
        onExitGame={() => setShowExitDialog(true)}
      />
      <PrimeFactorGame 
        showRulesState={[showRules, setShowRules]}
        showTutorialState={[showTutorial, setShowTutorial]}
        showExitDialogState={[showExitDialog, setShowExitDialog]}
      />
    </>
  );
}
