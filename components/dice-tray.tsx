"use client";

import React from "react"

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Die } from "@/lib/game-utils";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { getDiceSkinImage, type DiceSkin } from "@/components/dice-skin-settings";

interface DiceTrayProps {
  dice: Die[];
  selectedDice: string[];
  onDieClick: (die: Die) => void;
  onReorder?: (newOrder: Die[]) => void;
  disabled?: boolean;
  playerName?: string;
  hideValues?: boolean;
  showActions?: boolean;
  canClaim?: boolean;
  onClaim?: () => void;
  onCancel?: () => void;
  skins?: DiceSkin[] | null;
  opponentSelectedDice?: string[];
}

export function DiceTray({
  dice,
  selectedDice,
  onDieClick,
  onReorder,
  disabled = false,
  playerName = "Your",
  hideValues = false,
  showActions = false,
  canClaim = false,
  onClaim,
  onCancel,
  skins = null,
  opponentSelectedDice = [],
}: DiceTrayProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, dieId: string) => {
    setDraggedId(dieId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dieId);
  };

  const handleDragOver = (e: React.DragEvent, dieId: string) => {
    e.preventDefault();
    if (dieId !== draggedId) {
      setDragOverId(dieId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    
    if (!draggedId || draggedId === targetId || !onReorder) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = dice.findIndex((d) => d.id === draggedId);
    const targetIndex = dice.findIndex((d) => d.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newDice = [...dice];
    const [draggedDie] = newDice.splice(draggedIndex, 1);
    newDice.splice(targetIndex, 0, draggedDie);

    onReorder(newDice);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {playerName}&apos;s Dice ({dice.length} remaining)
        </h3>
        {!hideValues && (
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            Click to select (deselect), drag to reorder
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {hideValues ? (
          dice.map((die) => (
            <div
              key={die.id}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg font-bold text-lg flex items-center justify-center border-2 border-border bg-muted text-muted-foreground shadow-md"
            >
              ?
            </div>
          ))
        ) : (
          dice.map((die, index) => (
            <DieComponent
              key={die.id}
              die={die}
              isSelected={selectedDice.includes(die.id)}
              isOpponentSelected={opponentSelectedDice.includes(String(index))}
              onClick={() => onDieClick(die)}
              disabled={disabled || die.used}
              isDragging={draggedId === die.id}
              isDragOver={dragOverId === die.id}
              onDragStart={(e) => handleDragStart(e, die.id)}
              onDragOver={(e) => handleDragOver(e, die.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, die.id)}
              onDragEnd={handleDragEnd}
              skinImage={getDiceSkinImage(die.value, skins)}
            />
          ))
        )}
      </div>
      
      {showActions && (
        <div className="flex gap-2 mt-4">
          <Button
            onClick={onClaim}
            disabled={!canClaim}
            className="flex-1 gap-2"
          >
            <Check className="w-4 h-4" />
            Claim Space
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

interface DieComponentProps {
  die: Die;
  isSelected: boolean;
  isOpponentSelected?: boolean;
  onClick: () => void;
  disabled: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  skinImage?: string | null;
}

function DieComponent({ 
  die, 
  isSelected, 
  isOpponentSelected = false,
  onClick, 
  disabled, 
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  skinImage = null,
}: DieComponentProps) {
  const isWild = die.value === "W";
  
  // Get color based on prime value - matching factorization colors
  const getColorClasses = () => {
    const value = die.value;
    if (value === "W") return "bg-gradient-to-br from-amber-100 to-amber-200 border-amber-400";
    
    switch (value) {
      case 2: return "bg-green-100 dark:bg-green-900 border-yellow-500 dark:border-yellow-400";
      case 3: return "bg-amber-200 dark:bg-amber-800 border-yellow-500 dark:border-yellow-400";
      case 5: return "bg-red-200 dark:bg-red-800 border-yellow-500 dark:border-yellow-400";
      case 7: return "bg-amber-100 dark:bg-amber-900 border-yellow-500 dark:border-yellow-400";
      case 11: return "bg-orange-100 dark:bg-orange-900 border-yellow-500 dark:border-yellow-400";
      case 13: return "bg-red-100 dark:bg-red-900 border-yellow-500 dark:border-yellow-400";
      case 17: return "bg-teal-100 dark:bg-teal-900 border-yellow-500 dark:border-yellow-400";
      case 19: return "bg-indigo-100 dark:bg-indigo-900 border-yellow-500 dark:border-yellow-400";
      case 23: return "bg-yellow-100 dark:bg-yellow-900 border-yellow-500 dark:border-yellow-400";
      case 29: return "bg-violet-200 dark:bg-violet-800 border-yellow-500 dark:border-yellow-400";
      case 31: return "bg-green-100 dark:bg-green-900 border-yellow-500 dark:border-yellow-400";
      case 37: return "bg-purple-100 dark:bg-purple-900 border-yellow-500 dark:border-yellow-400";
      case 41: return "bg-stone-200 dark:bg-stone-800 border-yellow-500 dark:border-yellow-400";
      case 43: return "bg-pink-100 dark:bg-pink-900 border-yellow-500 dark:border-yellow-400";
      case 47: return "bg-red-100 dark:bg-red-900 border-yellow-500 dark:border-yellow-400";
      default: return "bg-white dark:bg-zinc-900 border-border";
    }
  };

  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "w-12 h-12 sm:w-14 sm:h-14 rounded-lg font-bold text-lg sm:text-xl",
        "flex items-center justify-center transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "shadow-md hover:shadow-lg overflow-hidden relative border",
        "user-select-none",
        die.used && "opacity-30 cursor-not-allowed",
        !die.used && !disabled && "cursor-grab hover:-translate-y-0.5",
        isDragging && "opacity-50 scale-95 cursor-grabbing",
        isDragOver && "ring-2 ring-blue-500 scale-105",
        isSelected
          ? "ring-2 ring-chart-1 ring-offset-2 scale-110"
          : "",
        isOpponentSelected && !isSelected
          ? "ring-2 ring-blue-400 dark:ring-blue-300 shadow-[inset_0_0_6px_1px_rgba(96,165,250,0.3)]"
          : "",
        getColorClasses()
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      {skinImage ? (
        <img
          src={skinImage || "/placeholder.svg"}
          alt={die.value === "W" ? "Wild die" : `Die showing ${die.value}`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : die.value === "W" ? (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-xs sm:text-sm font-semibold leading-none">Any</span>
          <span className="text-xs leading-none">Prime</span>
        </div>
      ) : (
        <span className="text-foreground">{die.value}</span>
      )}
    </div>
  );
}
