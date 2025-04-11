"use client";

import { Button } from "../ui/Button";

interface DifficultySelectorProps {
  difficulty: number;
  onChangeDifficulty: (difficulty: number) => void;
  isGenerating: boolean;
}

export function DifficultySelector({
  difficulty,
  onChangeDifficulty,
  isGenerating,
}: DifficultySelectorProps) {
  const difficulties = [
    { value: 5, label: "Easy (5 colors)" },
    { value: 10, label: "Medium (10 colors)" },
    { value: 15, label: "Hard (15 colors)" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Difficulty</h3>
      <div className="flex flex-wrap gap-2">
        {difficulties.map((option) => (
          <Button
            key={option.value}
            variant={difficulty === option.value ? "primary" : "outline"}
            size="sm"
            onClick={() => onChangeDifficulty(option.value)}
            disabled={isGenerating}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
