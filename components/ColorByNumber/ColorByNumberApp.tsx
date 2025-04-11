"use client";

import { generateImage } from "@/lib/gemini";
import {
  Color,
  NumberedPixel,
  createNumberedTemplate,
  simplifyColors,
} from "@/lib/imageProcessing";
import { useEffect, useState } from "react";
import { Canvas } from "./Canvas";
import { Controls } from "./Controls";
import { DifficultySelector } from "./DifficultySelector";
import { Palette } from "./Palette";
import { PromptInput } from "./PromptInput";

// Canvas dimensions - increased for better detail and to match coloring book style
const CANVAS_WIDTH = 128;
const CANVAS_HEIGHT = 128;

export function ColorByNumberApp() {
  // State for the image generation
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageData, setGeneratedImageData] = useState<string | null>(
    null
  );

  // State for the color-by-number template
  const [difficulty, setDifficulty] = useState(10); // Default: 10 colors
  const [palette, setPalette] = useState<Color[]>([]);
  const [numberedTemplate, setNumberedTemplate] = useState<
    NumberedPixel[][] | null
  >(null);
  const [selectedColorNumber, setSelectedColorNumber] = useState<number | null>(
    null
  );
  const [showTemplate, setShowTemplate] = useState(true);

  // State for tracking colored pixels
  const [coloredPixels, setColoredPixels] = useState<boolean[][]>(
    Array.from({ length: CANVAS_HEIGHT }, () =>
      Array.from({ length: CANVAS_WIDTH }, () => false)
    )
  );
  const [colorProgress, setColorProgress] = useState<number[]>([]);

  // Initialize colored pixels array when template changes
  useEffect(() => {
    if (!numberedTemplate) return;

    // Create a 2D array to track colored pixels if not already initialized
    setColoredPixels((prev) => {
      if (prev.length === CANVAS_HEIGHT && prev[0]?.length === CANVAS_WIDTH) {
        // Already initialized with correct dimensions, just reset all values to false
        return Array.from({ length: CANVAS_HEIGHT }, () =>
          Array.from({ length: CANVAS_WIDTH }, () => false)
        );
      } else {
        // Initialize with correct dimensions
        return Array.from({ length: CANVAS_HEIGHT }, () =>
          Array.from({ length: CANVAS_WIDTH }, () => false)
        );
      }
    });

    // Initialize color progress
    const newColorProgress = Array.from({ length: palette.length }, () => 0);

    setColorProgress(newColorProgress);

    // Select the first color by default
    if (palette.length > 0) {
      setSelectedColorNumber(1);
    }
  }, [numberedTemplate, palette]);

  // Handle image generation
  const handleGenerate = async (inputPrompt: string) => {
    setPrompt(inputPrompt);
    setIsGenerating(true);

    try {
      console.log("Generating image for prompt:", inputPrompt);

      // Generate image using Gemini API
      const imageData = await generateImage(inputPrompt);

      if (imageData) {
        console.log("Image data received, length:", imageData.length);
        setGeneratedImageData(imageData);

        // Process the image to create a color-by-number template
        const {
          simplifiedImageData,
          palette: newPalette,
          originalImageData,
        } = await simplifyColors(imageData, difficulty);

        setPalette(newPalette);

        // Create the numbered template
        const template = createNumberedTemplate(
          simplifiedImageData,
          newPalette
        );

        console.log(
          "Created template with dimensions:",
          simplifiedImageData.width,
          "x",
          simplifiedImageData.height
        );
        console.log("Template sample:", template[0][0]);

        setNumberedTemplate(template);
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle pixel coloring
  const handlePixelColored = (x: number, y: number) => {
    if (!numberedTemplate || selectedColorNumber === null) return;

    // Update colored pixels and then update color progress
    setColoredPixels((prev) => {
      // Make sure the array is properly initialized
      let newColoredPixels;
      if (!prev[y]) {
        newColoredPixels = [...prev];
        // Initialize the row if it doesn't exist
        newColoredPixels[y] = Array.from({ length: CANVAS_WIDTH }, () => false);
      } else {
        newColoredPixels = [...prev];
      }

      // Set the pixel as colored
      newColoredPixels[y][x] = true;

      // Update color progress with the new pixels
      setTimeout(() => updateColorProgress(newColoredPixels), 0);

      return newColoredPixels;
    });
  };

  // Update the progress for each color
  const updateColorProgress = (pixels: boolean[][]) => {
    if (!numberedTemplate) return;

    // Count total pixels for each color
    const totalPixels = Array.from({ length: palette.length }, () => 0);
    const coloredCount = Array.from({ length: palette.length }, () => 0);

    // Count total and colored pixels for each color
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const colorNumber = numberedTemplate[y][x].number;
        totalPixels[colorNumber - 1]++;

        if (pixels[y][x]) {
          coloredCount[colorNumber - 1]++;
        }
      }
    }

    // Calculate progress percentages
    const newColorProgress = totalPixels.map((total, index) => {
      if (total === 0) return 0;
      return Math.round((coloredCount[index] / total) * 100);
    });

    setColorProgress(newColorProgress);
  };

  // Handle reset
  const handleReset = () => {
    if (!numberedTemplate) return;

    // Reset colored pixels
    const newColoredPixels = Array.from({ length: CANVAS_HEIGHT }, () =>
      Array.from({ length: CANVAS_WIDTH }, () => false)
    );

    setColoredPixels(newColoredPixels);

    // Reset color progress
    const newColorProgress = Array.from({ length: palette.length }, () => 0);

    setColorProgress(newColorProgress);

    // Ensure color progress is updated
    updateColorProgress(newColoredPixels);
  };

  // Handle hint (auto-fill one pixel of the selected color)
  const handleHint = () => {
    if (!numberedTemplate || selectedColorNumber === null) return;

    // Find an uncolored pixel with the selected color
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        if (
          numberedTemplate[y][x].number === selectedColorNumber &&
          (!coloredPixels[y] || !coloredPixels[y][x])
        ) {
          // Color this pixel using the handlePixelColored function
          // which already has safety checks
          handlePixelColored(x, y);
          return;
        }
      }
    }
  };

  // Handle export
  const handleExport = () => {
    if (!numberedTemplate) return;

    // Create a canvas to draw the colored image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Draw the colored image
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const pixel = numberedTemplate[y][x];

        if (coloredPixels[y] && coloredPixels[y][x]) {
          // Draw colored pixel
          ctx.fillStyle = `rgb(${pixel.color.r}, ${pixel.color.g}, ${pixel.color.b})`;
        } else {
          // Draw white pixel
          ctx.fillStyle = "white";
        }

        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Convert the canvas to a data URL
    const dataUrl = canvas.toDataURL("image/png");

    // Create a download link
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `color-by-number-${prompt.replace(/\s+/g, "-")}.png`;
    link.click();
  };

  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty: number) => {
    setDifficulty(newDifficulty);

    // If we already have an image, regenerate the template with the new difficulty
    if (generatedImageData) {
      regenerateTemplate(newDifficulty);
    }
  };

  // Regenerate the template with a new difficulty
  const regenerateTemplate = async (newDifficulty: number) => {
    if (!generatedImageData) return;

    setIsGenerating(true);

    try {
      // Process the image with the new difficulty
      const {
        simplifiedImageData,
        palette: newPalette,
        originalImageData,
      } = await simplifyColors(generatedImageData, newDifficulty);

      setPalette(newPalette);

      // Create the numbered template
      const template = createNumberedTemplate(simplifiedImageData, newPalette);

      setNumberedTemplate(template);
    } catch (error) {
      console.error("Error regenerating template:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Color by Number</h2>
        <PromptInput onGenerate={handleGenerate} isLoading={isGenerating} />
        <DifficultySelector
          difficulty={difficulty}
          onChangeDifficulty={handleDifficultyChange}
          isGenerating={isGenerating}
        />
      </div>

      {isGenerating && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {numberedTemplate && (
        <div className="flex flex-col gap-6">
          <Controls
            onReset={handleReset}
            onHint={handleHint}
            onToggleTemplate={() => setShowTemplate(!showTemplate)}
            onExport={handleExport}
            showTemplate={showTemplate}
            isGenerating={isGenerating}
            hasTemplate={!!numberedTemplate}
          />

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Canvas</h3>
                <div className="text-sm text-gray-500">
                  Tip: Use mouse wheel to zoom, and drag to pan around the
                  canvas
                </div>
              </div>
              <Canvas
                numberedTemplate={numberedTemplate}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                selectedColorNumber={selectedColorNumber}
                palette={palette}
                onPixelColored={handlePixelColored}
                coloredPixels={coloredPixels}
                showTemplate={showTemplate}
              />
            </div>

            <div className="flex flex-col gap-4">
              <Palette
                palette={palette}
                selectedColorNumber={selectedColorNumber}
                onSelectColor={setSelectedColorNumber}
                colorProgress={colorProgress}
              />

              {/* Display the original generated image for reference */}
              {generatedImageData && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Original Image</h3>
                  <div className="border border-gray-300 rounded-md overflow-hidden">
                    <img
                      src={`data:image/png;base64,${generatedImageData}`}
                      alt="Generated image"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
