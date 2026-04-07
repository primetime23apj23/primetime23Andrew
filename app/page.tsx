import { PrimeFactorGame } from "@/components/prime-factor-game";
import { AppHeader } from "@/components/app-header";

// v1.0.1 - Give or Take multiplayer lobbies
export default function Home() {
  return (
    <>
      <AppHeader />
      <PrimeFactorGame />
    </>
  );
}
