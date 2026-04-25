"use client";

import React from "react"

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DiceSkin {
  value: number | "W";
  imageUrl: string | null;
  label: string;
}

// Default animal skins for dice values
export const DEFAULT_SKINS: DiceSkin[] = [
  { value: 2, imageUrl: "/dice-skins/owl.jpg", label: "2 - Owl" },
  { value: 3, imageUrl: "/dice-skins/fox.jpg", label: "3 - Fox" },
  { value: 5, imageUrl: "/dice-skins/cat.jpg", label: "5 - Cat" },
  { value: 7, imageUrl: "/dice-skins/rabbit.jpg", label: "7 - Rabbit" },
  { value: 11, imageUrl: "/dice-skins/bear.jpg", label: "11 - Bear" },
  { value: 13, imageUrl: "/dice-skins/penguin.jpg", label: "13 - Penguin" },
  { value: 17, imageUrl: "/dice-skins/lion.jpg", label: "17 - Lion" },
  { value: 19, imageUrl: "/dice-skins/elephant.jpg", label: "19 - Elephant" },
  { value: 23, imageUrl: "/dice-skins/giraffe.jpg", label: "23 - Giraffe" },
  { value: 29, imageUrl: "/dice-skins/dolphin.jpg", label: "29 - Dolphin" },
  { value: 31, imageUrl: "/dice-skins/eagle.jpg", label: "31 - Eagle" },
  { value: 37, imageUrl: "/dice-skins/tiger.jpg", label: "37 - Tiger" },
  { value: 41, imageUrl: "/dice-skins/panda.jpg", label: "41 - Panda" },
  { value: 43, imageUrl: "/dice-skins/peacock.jpg", label: "43 - Peacock" },
  { value: 47, imageUrl: "/dice-skins/wolf.jpg", label: "47 - Wolf" },
  { value: "W", imageUrl: "/dice-skins/wild.jpg", label: "Wild Card" },
];

interface DiceSkinSettingsProps {
  skins: DiceSkin[];
  onSkinsChange: (skins: DiceSkin[]) => void;
}

export function DiceSkinSettings({ skins, onSkinsChange }: DiceSkinSettingsProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSkin, setSelectedSkin] = useState<DiceSkin | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, skin: DiceSkin) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const updatedSkins = skins.map((s) =>
        s.value === skin.value ? { ...s, imageUrl } : s
      );
      onSkinsChange(updatedSkins);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (skin: DiceSkin) => {
    const updatedSkins = skins.map((s) =>
      s.value === skin.value ? { ...s, imageUrl: null } : s
    );
    onSkinsChange(updatedSkins);
  };

  const handleResetToDefaults = () => {
    onSkinsChange(DEFAULT_SKINS);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Dice Skins</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize Dice Images</DialogTitle>
          <DialogDescription>
            Associate images with dice values to help visualize prime numbers
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {skins.map((skin) => (
              <div
                key={String(skin.value)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-muted/30"
              >
                <div className="text-sm font-semibold">
                  {skin.value === "W" ? "Wild" : skin.value}
                </div>
                
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-border bg-background">
                  {skin.imageUrl ? (
                    <>
                      <img
                        src={skin.imageUrl || "/placeholder.svg"}
                        alt={skin.label}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(skin)}
                        className="absolute top-0 right-0 p-0.5 bg-destructive text-white rounded-bl"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                      {skin.value === "W" ? "W" : skin.value}
                    </div>
                  )}
                </div>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, skin)}
                  />
                  <span className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Upload
                  </span>
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get skin image for a dice value
export function getDiceSkinImage(
  value: number | "W",
  skins: DiceSkin[]
): string | null {
  return skins.find((s) => s.value === value)?.imageUrl ?? null;
}
