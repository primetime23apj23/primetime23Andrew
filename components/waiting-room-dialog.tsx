import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WaitingRoomProps {
  sessionCode: string;
  playerName: string;
  isOpen?: boolean;
  onCancel: () => void;
  onOpponentJoined?: () => void;
}

export function WaitingRoomDialog({
  sessionCode,
  playerName,
  isOpen = true,
  onCancel,
  onOpponentJoined,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waiting for Opponent...</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Your Name</p>
            <p className="text-lg font-semibold">{playerName}</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Session Code</p>
            <p className="text-2xl font-mono font-bold tracking-wider">{sessionCode}</p>
            <Button
              onClick={copySessionCode}
              variant="outline"
              size="sm"
              className="mt-2 w-full"
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>

          <div className="text-center">
            <div className="flex justify-center gap-1 mb-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-sm text-muted-foreground">Waiting for opponent to join...</p>
          </div>

          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
