"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DiceSkinSettings, DEFAULT_SKINS, type DiceSkin } from "./dice-skin-settings";
import { Settings } from "lucide-react";

interface DiceSkinPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const DICE_SKIN_PRESETS = [
  {
    id: "standard",
    name: "Standard",
    description: "Classic white dice with black numbers",
  },
  {
    id: "crystal",
    name: "Crystal",
    description: "Transparent crystalline dice",
  },
  {
    id: "gold",
    name: "Gold",
    description: "Luxurious gold plated dice",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Vibrant neon glowing dice",
  },
];

export function DiceSkinPicker({ value, onChange }: DiceSkinPickerProps) {
  const [customSkins, setCustomSkins] = useState<DiceSkin[]>(DEFAULT_SKINS);
  const [showCustomizer, setShowCustomizer] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Dice Skin</Label>
        <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <Settings className="h-3 w-3" />
              Customize
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Customize Dice Images</DialogTitle>
              <DialogDescription>
                Upload custom images for each dice value to personalize your game experience.
              </DialogDescription>
            </DialogHeader>
            <DiceSkinSettings skins={customSkins} onSkinsChange={setCustomSkins} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DICE_SKIN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onChange(preset.id)}
            className={`px-3 py-2 rounded-lg border-2 transition-all text-left ${
              value === preset.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 bg-card"
            }`}
          >
            <p className="text-sm font-semibold">{preset.name}</p>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
