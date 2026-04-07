export const dynamic = 'force-dynamic';

import { AppHeader } from "@/components/app-header";
import { GiveOrTakeGame } from "@/components/give-or-take-game";

export default function GiveOrTakePage() {
  return (
    <>
      <AppHeader title="Give or Take Game" />
      <GiveOrTakeGame />
    </>
  );
}
