"use client";

import { Color, NumberedPixel, colorToCss } from "@/lib/imageProcessing";
import { useCallback, useEffect, useRef, useState } from "react";

// Helper function to check if a pixel is at the edge of a region
function isRegionEdge(
  x: number,
  y: number,
  template: NumberedPixel[][]
): boolean {
  const height = template.length;
  const width = template[0].length;
  const currentNumber = template[y][x].number;

  // Check neighboring pixels (up, down, left, right)
  const neighbors = [
    { x: x, y: y - 1 }, // up
    { x: x, y: y + 1 }, // down
    { x: x - 1, y: y }, // left
    { x: x + 1, y: y }, // right
  ];

  for (const neighbor of neighbors) {
    // Check if neighbor is within bounds
    if (
      neighbor.x >= 0 &&
      neighbor.x < width &&
      neighbor.y >= 0 &&
      neighbor.y < height
    ) {
      // If any neighbor has a different number, this is an edge
      if (template[neighbor.y][neighbor.x].number !== currentNumber) {
        return true;
      }
    }
  }

  return false;
}

// Find centers of regions for better number placement
function findRegionCenters(
  template: NumberedPixel[][]
): { x: number; y: number; number: number }[] {
  const height = template.length;
  const width = template[0].length;

  // Map to track regions by number
  const regionMap = new Map<
    number,
    { pixels: { x: number; y: number }[]; center?: { x: number; y: number } }
  >();

  // First, collect all pixels for each region number
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const number = template[y][x].number;

      if (!regionMap.has(number)) {
        regionMap.set(number, { pixels: [] });
      }

      regionMap.get(number)!.pixels.push({ x, y });
    }
  }

  // For each region, find its center
  const centers: { x: number; y: number; number: number }[] = [];

  regionMap.forEach((region, number) => {
    // Calculate the centroid of the region
    let sumX = 0;
    let sumY = 0;

    for (const pixel of region.pixels) {
      sumX += pixel.x;
      sumY += pixel.y;
    }

    const centerX = Math.round(sumX / region.pixels.length);
    const centerY = Math.round(sumY / region.pixels.length);

    // Find the pixel closest to the centroid that has the same number
    let bestDistance = Infinity;
    let bestPixel = { x: centerX, y: centerY };

    for (const pixel of region.pixels) {
      const distance = Math.sqrt(
        Math.pow(pixel.x - centerX, 2) + Math.pow(pixel.y - centerY, 2)
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestPixel = pixel;
      }
    }

    // Check if the best pixel is not at the edge of the region
    if (!isRegionEdge(bestPixel.x, bestPixel.y, template)) {
      centers.push({ x: bestPixel.x, y: bestPixel.y, number });
    } else {
      // If the best pixel is at the edge, try to find a non-edge pixel
      for (const pixel of region.pixels) {
        if (!isRegionEdge(pixel.x, pixel.y, template)) {
          centers.push({ x: pixel.x, y: pixel.y, number });
          break;
        }
      }
    }
  });

  return centers;
}

interface CanvasProps {
  numberedTemplate: NumberedPixel[][] | null;
  width: number;
  height: number;
  selectedColorNumber: number | null;
  palette: Color[];
  onPixelColored: (x: number, y: number) => void;
  coloredPixels: boolean[][];
  showTemplate: boolean;
}

export function Canvas({
  numberedTemplate,
  width,
  height,
  selectedColorNumber,
  palette,
  onPixelColored,
  coloredPixels,
  showTemplate,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // State for pan and zoom
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Function to draw the canvas
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to be larger than the image for better display
    const displayWidth = Math.max(width * 4, 400); // Make canvas at least 400px wide
    const displayHeight = Math.max(height * 4, 400); // and 400px tall
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    console.log(`Canvas dimensions set to ${displayWidth}x${displayHeight}`);
    console.log(`Image dimensions: ${width}x${height}`);

    // Clear the canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    if (!numberedTemplate) return;

    console.log("Drawing template with dimensions:", width, height);
    console.log("Template data sample:", numberedTemplate[0][0]);

    // Apply transformations for pan and zoom
    ctx.save();

    // Center the image in the canvas
    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2;

    // Apply transformations: translate to center, apply scale, apply offset, translate back
    // Simplify transformations for debugging
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(offset.x, offset.y);
    ctx.translate(-width / 2, -height / 2);

    // Draw a reference point at the origin (0,0) after transformations
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw coordinate axes
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.lineTo(width + 50, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(0, height + 50);
    ctx.stroke();

    // First pass: Fill all regions with their base colors
    try {
      console.log(`Starting to draw ${width}x${height} template`);

      // Draw the actual template
      if (numberedTemplate) {
        console.log("Drawing the numbered template");

        // Draw each pixel with its color
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            try {
              const pixel = numberedTemplate[y][x];

              // Get the color number for this pixel
              const colorNumber = pixel.number;

              if (coloredPixels[y] && coloredPixels[y][x]) {
                // If the pixel is colored by the user, use the color from the palette
                if (palette && palette[colorNumber - 1]) {
                  ctx.fillStyle = colorToCss(palette[colorNumber - 1]);
                  ctx.fillRect(x, y, 1, 1);
                }
              } else {
                // Otherwise, fill with a light gray base color
                ctx.fillStyle = "#f0f0f0";
                ctx.fillRect(x, y, 1, 1);
              }
            } catch (err) {
              console.error(`Error drawing template pixel at ${x},${y}:`, err);
            }
          }
        }
      }

      console.log("Finished drawing template");
    } catch (err) {
      console.error("Error in canvas drawing:", err);
    }

    // Second pass: Draw region outlines and numbers
    if (showTemplate && numberedTemplate) {
      try {
        console.log("Drawing region outlines and numbers");

        // Draw grid lines
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 0.5;

        // Draw vertical grid lines
        for (let x = 0; x <= width; x++) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Draw horizontal grid lines
        for (let y = 0; y <= height; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Draw region outlines
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 0.8;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const currentNumber = numberedTemplate[y][x].number;

            // Check neighbors to see if we need to draw a border
            const neighbors = [
              { x: x + 1, y }, // right
              { x: x - 1, y }, // left
              { x, y: y + 1 }, // down
              { x, y: y - 1 }, // up
            ];

            for (const neighbor of neighbors) {
              const nx = neighbor.x;
              const ny = neighbor.y;

              if (
                nx >= 0 &&
                nx < width &&
                ny >= 0 &&
                ny < height &&
                numberedTemplate[ny][nx].number !== currentNumber
              ) {
                // Draw border between different regions
                if (nx > x) {
                  // right border
                  ctx.beginPath();
                  ctx.moveTo(x + 1, y);
                  ctx.lineTo(x + 1, y + 1);
                  ctx.stroke();
                }
                if (nx < x) {
                  // left border
                  ctx.beginPath();
                  ctx.moveTo(x, y);
                  ctx.lineTo(x, y + 1);
                  ctx.stroke();
                }
                if (ny > y) {
                  // bottom border
                  ctx.beginPath();
                  ctx.moveTo(x, y + 1);
                  ctx.lineTo(x + 1, y + 1);
                  ctx.stroke();
                }
                if (ny < y) {
                  // top border
                  ctx.beginPath();
                  ctx.moveTo(x, y);
                  ctx.lineTo(x + 1, y);
                  ctx.stroke();
                }
              }
            }
          }
        }

        // Find centers of regions and place numbers
        const regionCenters = findRegionCenters(numberedTemplate);

        // Draw numbers at region centers
        ctx.fillStyle = "black";
        ctx.font = "8px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const center of regionCenters) {
          // Only draw if the region isn't completely colored
          let isRegionColored = true;
          const number = center.number;

          // Check if any pixel with this number is not colored
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (numberedTemplate[y][x].number === number) {
                if (!coloredPixels[y] || !coloredPixels[y][x]) {
                  isRegionColored = false;
                  break;
                }
              }
            }
            if (!isRegionColored) break;
          }

          // Draw the number if the region isn't completely colored
          if (!isRegionColored) {
            ctx.fillText(
              center.number.toString(),
              center.x + 0.5,
              center.y + 0.5
            );
          }
        }
      } catch (err) {
        console.error("Error drawing region outlines:", err);
      }
    }

    // Restore the context to remove transformations
    ctx.restore();
  }, [
    numberedTemplate,
    width,
    height,
    selectedColorNumber,
    coloredPixels,
    showTemplate,
    palette,
    scale,
    offset,
  ]);

  // Draw the canvas when the template or other state changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle mouse events for coloring and panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Right click or middle click for panning
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Left click for coloring
    if (!numberedTemplate || selectedColorNumber === null) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    colorPixel(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle panning
    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle coloring
    if (!isDrawing || !numberedTemplate || selectedColorNumber === null) return;

    const { x, y } = getCanvasCoordinates(e);
    colorPixel(x, y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setIsDragging(false);
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
    setScale((prev) => Math.max(0.5, Math.min(10, prev * zoomFactor))); // Limit zoom range
  };

  // Get canvas coordinates from mouse event, accounting for pan and zoom
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculate the center of the canvas
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate the mouse position relative to the center
    const mouseX = e.clientX - rect.left - centerX;
    const mouseY = e.clientY - rect.top - centerY;

    // Apply inverse transformations to get the actual pixel coordinates
    // 1. Divide by scale to account for zoom
    // 2. Subtract offset to account for panning
    // 3. Add half the image dimensions to center
    const x = Math.floor(mouseX / scale - offset.x + width / 2);
    const y = Math.floor(mouseY / scale - offset.y + height / 2);

    return { x, y };
  };

  // Color a region using flood fill algorithm
  const colorPixel = (x: number, y: number) => {
    if (
      !numberedTemplate ||
      selectedColorNumber === null ||
      x < 0 ||
      x >= width ||
      y < 0 ||
      y >= height
    )
      return;

    // Get the target color number
    const targetNumber = numberedTemplate[y][x].number;

    // Only proceed if the clicked pixel has the selected color number
    if (targetNumber !== selectedColorNumber) return;

    // If the pixel is already colored, do nothing
    if (coloredPixels[y] && coloredPixels[y][x]) return;

    console.log(`Coloring region with number ${targetNumber} at (${x}, ${y})`);

    // Use flood fill to color the entire region
    const pixelsToColor: { x: number; y: number }[] = [];
    floodFill(x, y, targetNumber, pixelsToColor);

    console.log(`Found ${pixelsToColor.length} pixels to color`);

    // Color all the pixels in the region
    for (const pixel of pixelsToColor) {
      onPixelColored(pixel.x, pixel.y);
    }

    // Force a redraw
    drawCanvas();
  };

  // Flood fill algorithm to find all connected pixels with the same number
  // Using an iterative approach to avoid stack overflow with large regions
  const floodFill = (
    startX: number,
    startY: number,
    targetNumber: number,
    result: { x: number; y: number }[]
  ) => {
    // Check initial conditions
    if (
      startX < 0 ||
      startX >= width ||
      startY < 0 ||
      startY >= height ||
      !numberedTemplate ||
      numberedTemplate[startY][startX].number !== targetNumber ||
      (coloredPixels[startY] && coloredPixels[startY][startX])
    )
      return;

    // Use a queue for breadth-first search
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    // Use a set to track visited pixels
    const visited = new Set<string>();
    const key = `${startX},${startY}`;
    visited.add(key);

    // Process queue
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;

      // Add to result
      result.push({ x, y });

      // Check neighbors (4-way connectivity)
      const neighbors = [
        { x: x + 1, y }, // right
        { x: x - 1, y }, // left
        { x, y: y + 1 }, // down
        { x, y: y - 1 }, // up
      ];

      for (const neighbor of neighbors) {
        const { x: nx, y: ny } = neighbor;
        const neighborKey = `${nx},${ny}`;

        // Check if valid and not visited
        if (
          nx >= 0 &&
          nx < width &&
          ny >= 0 &&
          ny < height &&
          !visited.has(neighborKey) &&
          numberedTemplate[ny][nx].number === targetNumber &&
          (!coloredPixels[ny] || !coloredPixels[ny][nx])
        ) {
          visited.add(neighborKey);
          queue.push({ x: nx, y: ny });
        }
      }
    }
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="bg-gray-100 p-1">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{
            imageRendering: "pixelated",
            cursor: isDragging
              ? "grabbing"
              : selectedColorNumber !== null
              ? "pointer"
              : "default",
            minHeight: "400px",
            height: "500px",
            border: "3px solid #333",
            background: "#f8f8f8",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
          height={400} // Set a minimum height for the canvas
        />
      </div>
      <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
        <span>Zoom: {Math.round(scale * 100)}%</span>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md"
          onClick={() => {
            console.log("Resetting view");
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Reset View
        </button>
      </div>
    </div>
  );
}
