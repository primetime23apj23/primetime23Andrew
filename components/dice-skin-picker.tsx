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

interface DiceSkinPreset {
  id: string;
  name: string;
  description: string;
  previewImage: string;
}

const DICE_SKIN_PRESETS: DiceSkinPreset[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Classic white dice with black numbers",
    previewImage: "/dice-skins/standard-preview.jpg",
  },
  {
    id: "crystal",
    name: "Crystal",
    description: "Transparent crystalline dice",
    previewImage: "/dice-skins/crystal-preview.jpg",
  },
  {
    id: "gold",
    name: "Gold",
    description: "Luxurious gold plated dice",
    previewImage: "/dice-skins/gold-preview.jpg",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Vibrant neon glowing dice",
    previewImage: "/dice-skins/neon-preview.jpg",
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

      <div className="grid grid-cols-2 gap-3">
        {DICE_SKIN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onChange(preset.id)}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
              value === preset.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 bg-card"
            }`}
          >
            {/* Preview Box */}
            <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted border border-border">
              <div className="w-full h-full flex items-center justify-center">
                {/* Placeholder dice representation */}
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-white to-gray-100 flex items-center justify-center border border-gray-300 shadow-md">
                  <span className="text-lg font-bold text-gray-800">⚲</span>
                </div>
              </div>
            </div>

            {/* Label */}
            <div className="text-center">
              <p className="text-sm font-semibold">{preset.name}</p>
              <p className="text-xs text-muted-foreground">{preset.description}</p>
            </div>

            {/* Selection indicator */}
            {value === preset.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Select a preset or use the Customize button to upload custom dice images for each value.
      </p>
    </div>
  );
}
