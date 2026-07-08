'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface NextRoundConfirmationProps {
  isOpen: boolean;
  initiatorName: string;
  currentPlayerIndex: number;
  initiatorIndex: number;
  countdown: number;
  onConfirm: () => void;
  onDecline: () => void;
}

export function NextRoundConfirmation({
  isOpen,
  initiatorName,
  currentPlayerIndex,
  initiatorIndex,
  countdown,
  onConfirm,
  onDecline,
}: NextRoundConfirmationProps) {
  const isCurrentPlayerInitiator = currentPlayerIndex === initiatorIndex;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onDecline(); }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Ready for Next Round</DialogTitle>
          <DialogDescription>
            {initiatorName} is ready to start the next round
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-6 py-6">
          <div className="text-4xl font-bold text-blue-600">
            {countdown}s
          </div>

          {isCurrentPlayerInitiator ? (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Waiting for opponent to accept...
              </p>
            </div>
          ) : (
            <div className="flex gap-3 w-full">
              <Button
                onClick={onConfirm}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Accept
              </Button>
              <Button
                onClick={onDecline}
                variant="outline"
                className="flex-1"
              >
                Decline
              </Button>
            </div>
          )}

          {countdown === 0 && (
            <p className="text-sm text-gray-600">Round advancing...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
