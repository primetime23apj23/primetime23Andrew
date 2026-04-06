"use client";

import { useState, useEffect } from "react";
import { signUp, signIn, getCurrentUser } from "@/lib/auth";
const log = (...args: any[]) => console.debug('[AuthDialog]', ...args);
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthed: (playerName: string, email: string, userId: string | null) => void;
}

export function AuthDialog({ open, onOpenChange, onAuthed }: AuthDialogProps) {
  const [mode, setMode] = useState<"signup" | "signin" | "guest">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    log('state snapshot', {
      open,
      mode,
      loading,
      error,
      email,
      name,
    });
  }, [open, mode, loading, error, email, name]);

  useEffect(() => {
    // Check if user is already authenticated
    log('mount: checking current user');
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    log('checkCurrentUser:start');
    const user = await getCurrentUser();
    log('checkCurrentUser:result', user);
    if (user) {
      log('checkCurrentUser:already authed -> calling onAuthed', {
        playerName: user.playerName,
        email: user.email,
        id: user.id,
      });
      onAuthed(user.playerName, user.email, user.id);
      onOpenChange(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    log('signUp:start', { email, name });
    const result = await signUp(email, password, name);
    log('signUp:result', result);

    if (result.success && result.user) {
      localStorage.setItem("pf_player_name", result.user.playerName);
      localStorage.setItem("pf_player_email", result.user.email);
      log('signUp:stored localStorage + calling onAuthed', {
        playerName: result.user.playerName,
        email: result.user.email,
        id: result.user.id,
      });
      onAuthed(result.user.playerName, result.user.email, result.user.id);
      onOpenChange(false);
    } else {
      log('signUp:error', result.error);
      setError(result.error || "Failed to sign up");
    }

    setLoading(false);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    log('signIn:start', { email });
    const result = await signIn(email, password);
    log('signIn:result', result);

    if (result.success && result.user) {
      localStorage.setItem("pf_player_name", result.user.playerName);
      localStorage.setItem("pf_player_email", result.user.email);
      log('signIn:stored localStorage + calling onAuthed', {
        playerName: result.user.playerName,
        email: result.user.email,
        id: result.user.id,
      });
      onAuthed(result.user.playerName, result.user.email, result.user.id);
      onOpenChange(false);
    } else {
      log('signIn:error', result.error);
      setError(result.error || "Failed to sign in");
    }

    setLoading(false);
  };

  const handleGuestMode = async () => {
    if (!name.trim()) {
      setError("Please enter a display name");
      return;
    }

    localStorage.setItem("pf_player_name", name.trim());
    log('guest:start', { name: name.trim() });
    onAuthed(name.trim(), "", null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      log('dialog:onOpenChange', nextOpen);
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join the Game</DialogTitle>
          <DialogDescription>
            Create an account, sign in, or play as a guest
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="w-full grid w-full grid-cols-3">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="guest">Guest</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Display Name</label>
              <Input
                value={name}
                placeholder="Your player name"
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Email</label>
              <Input
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Password</label>
              <Input
                type="password"
                value={password}
                placeholder="At least 6 characters"
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              className="w-full"
              onClick={handleSignUp}
              disabled={loading || !name.trim() || !email.trim() || !password.trim()}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </TabsContent>

          <TabsContent value="signin" className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Email</label>
              <Input
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Password</label>
              <Input
                type="password"
                value={password}
                placeholder="Your password"
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              className="w-full"
              onClick={handleSignIn}
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </TabsContent>

          <TabsContent value="guest" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Play as a guest without creating an account. You won&apos;t be able to resume games later.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium">Display Name</label>
              <Input
                value={name}
                placeholder="Your player name"
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              className="w-full"
              onClick={handleGuestMode}
              disabled={loading || !name.trim()}
            >
              Play as Guest
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
