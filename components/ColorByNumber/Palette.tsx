"use client";

import { Color, colorToCss } from "@/lib/imageProcessing";

interface PaletteProps {
  palette: Color[];
  selectedColorNumber: number | null;
  onSelectColor: (colorNumber: number) => void;
  colorProgress: number[]; // Percentage of each color that has been filled
}

export function Palette({
  palette,
  selectedColorNumber,
  onSelectColor,
  colorProgress,
}: PaletteProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-medium">Color Palette</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {palette.map((color, index) => {
          const colorNumber = index + 1;
          const isSelected = selectedColorNumber === colorNumber;
          const progress = colorProgress[index];
          const isComplete = progress === 100;

          return (
            <button
              key={index}
              className={`flex items-center p-2 rounded-md border ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-500"
                  : "border-gray-300"
              } ${isComplete ? "opacity-50" : ""}`}
              onClick={() => onSelectColor(colorNumber)}
              disabled={isComplete}
            >
              <div
                className="w-6 h-6 rounded-md mr-2"
                style={{ backgroundColor: colorToCss(color) }}
              />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{colorNumber}</span>
                <span className="text-xs text-gray-500">{progress}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
