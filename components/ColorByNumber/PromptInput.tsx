"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && prompt.trim()) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="prompt" className="text-sm font-medium">
          Enter a prompt to generate an image
        </label>
        <div className="flex gap-2">
          <Input
            id="prompt"
            placeholder="e.g., a cozy forest cabin"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>
      <div className="text-sm text-gray-500">
        Try descriptive prompts like "a unicorn", "a castle", "a dinosaur", or
        "a flower bouquet". Simple subjects work best for color-by-number style
        images.
      </div>
    </div>
  );
}
