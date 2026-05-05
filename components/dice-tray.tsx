"use client";

import React from "react"

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Die } from "@/lib/game-utils";
import type { DiceSkin } from "./dice-skin-settings";

interface DiceTrayProps {
  dice: Die[];
  selectedDice: string[];
  onDieClick: (die: Die) => void;
  onReorder?: (newOrder: Die[]) => void;
  disabled?: boolean;
  skins?: DiceSkin[];
  playerName?: string;
  hideValues?: boolean;
}

export function DiceTray({
  dice,
  selectedDice,
  onDieClick,
  onReorder,
  disabled = false,
  skins = [],
  playerName = "Your",
  hideValues = false,
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
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        {playerName}&apos;s Dice ({dice.length} remaining){!hideValues && " - Click to select, drag to reorder"}
      </h3>
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
          dice.map((die) => (
            <DieComponent
              key={die.id}
              die={die}
              isSelected={selectedDice.includes(die.id)}
              onClick={() => onDieClick(die)}
              disabled={disabled || die.used}
              skin={skins.find((s) => s.value === die.value)}
              isDragging={draggedId === die.id}
              isDragOver={dragOverId === die.id}
              onDragStart={(e) => handleDragStart(e, die.id)}
              onDragOver={(e) => handleDragOver(e, die.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, die.id)}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface DieComponentProps {
  die: Die;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
  skin?: DiceSkin;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function DieComponent({ 
  die, 
  isSelected, 
  onClick, 
  disabled, 
  skin,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: DieComponentProps) {
  const isWild = die.value === "W";
  
  // Get color based on prime value - matching factorization colors
  const getColorClasses = () => {
    const value = die.value;
    if (value === "W") return "bg-gradient-to-br from-amber-100 to-amber-200 border-amber-400";
    
    switch (value) {
      case 2: return "bg-green-100 dark:bg-green-900 border-yellow-500 dark:border-yellow-400";
      case 3: return "bg-green-100 dark:bg-green-900 border-yellow-500 dark:border-yellow-400";
      case 5: return "bg-sky-100 dark:bg-sky-900 border-yellow-500 dark:border-yellow-400";
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
      case 47: return "bg-amber-200 dark:bg-amber-800 border-yellow-500 dark:border-yellow-400";
      default: return "bg-white dark:bg-zinc-900 border-border";
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "w-14 h-14 sm:w-16 sm:h-16 rounded-lg font-black text-2xl sm:text-3xl",
        "flex items-center justify-center transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        "shadow-md hover:shadow-lg overflow-hidden relative border",
        die.used && "opacity-30 cursor-not-allowed",
        !die.used && !disabled && "cursor-grab hover:-translate-y-0.5",
        isDragging && "opacity-50 scale-95 cursor-grabbing",
        isDragOver && "ring-2 ring-blue-500 scale-105",
        isSelected
          ? "ring-2 ring-chart-1 ring-offset-2 scale-110"
          : "",
        getColorClasses()
      )}
    >
      <span className="text-foreground">
        {die.value === "W" ? "W" : die.value}
      </span>
    </button>
  );
}
