"use client";

import { Button } from "../ui/Button";

interface ControlsProps {
  onReset: () => void;
  onHint: () => void;
  onToggleTemplate: () => void;
  onExport: () => void;
  showTemplate: boolean;
  isGenerating: boolean;
  hasTemplate: boolean;
}

export function Controls({
  onReset,
  onHint,
  onToggleTemplate,
  onExport,
  showTemplate,
  isGenerating,
  hasTemplate,
}: ControlsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={onToggleTemplate}
        disabled={isGenerating || !hasTemplate}
      >
        {showTemplate ? "Hide Numbers" : "Show Numbers"}
      </Button>
      <Button
        variant="outline"
        onClick={onHint}
        disabled={isGenerating || !hasTemplate}
      >
        Hint
      </Button>
      <Button
        variant="outline"
        onClick={onReset}
        disabled={isGenerating || !hasTemplate}
      >
        Reset
      </Button>
      <Button
        variant="outline"
        onClick={onExport}
        disabled={isGenerating || !hasTemplate}
      >
        Export
      </Button>
    </div>
  );
}
