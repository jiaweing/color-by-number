/**
 * Represents a color in RGB format
 */
export interface Color {
  r: number;
  g: number;
  b: number;
}

/**
 * Represents a pixel in the image with its color and assigned number
 */
export interface NumberedPixel {
  color: Color;
  number: number;
}

/**
 * Simplifies the colors in an image to a limited palette and enhances edges for a coloring book style
 * @param imageData The base64 encoded image data
 * @param numColors The number of colors to simplify to
 * @returns A promise that resolves to an object with the simplified image data and color palette
 */
export async function simplifyColors(
  imageData: string,
  numColors: number = 10
): Promise<{
  simplifiedImageData: ImageData;
  palette: Color[];
  originalImageData: ImageData;
}> {
  return new Promise((resolve, reject) => {
    // Create an image element to load the base64 image
    const img = new Image();
    img.onload = () => {
      // Create a canvas to draw the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0);

      // Get the image data
      const originalImageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Use k-means clustering to simplify colors
      const { simplifiedImageData, palette } = kMeansClustering(
        originalImageData,
        numColors
      );

      console.log(
        "Simplified image dimensions:",
        simplifiedImageData.width,
        "x",
        simplifiedImageData.height
      );
      console.log("Palette size:", palette.length);

      // Apply post-processing to enhance region boundaries
      const enhancedImageData = enhanceRegionBoundaries(
        simplifiedImageData,
        palette
      );

      console.log(
        "Enhanced image dimensions:",
        enhancedImageData.width,
        "x",
        enhancedImageData.height
      );

      resolve({
        simplifiedImageData: enhancedImageData,
        palette,
        originalImageData,
      });
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Set the source of the image to the base64 data
    img.src = `data:image/png;base64,${imageData}`;
  });
}

/**
 * Performs k-means clustering to simplify colors in an image
 * @param imageData The original image data
 * @param k The number of colors to simplify to
 * @returns An object with the simplified image data and color palette
 */
function kMeansClustering(
  imageData: ImageData,
  k: number
): {
  simplifiedImageData: ImageData;
  palette: Color[];
} {
  // Extract pixels from image data
  const pixels: Color[] = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels.push({
      r: imageData.data[i],
      g: imageData.data[i + 1],
      b: imageData.data[i + 2],
    });
  }

  // Initialize k random centroids
  let centroids: Color[] = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * pixels.length);
    centroids.push({ ...pixels[randomIndex] });
  }

  // Maximum iterations for k-means
  const maxIterations = 10;

  // Perform k-means clustering
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign each pixel to the nearest centroid
    const clusters: Color[][] = Array.from({ length: k }, () => []);

    for (const pixel of pixels) {
      let minDistance = Infinity;
      let closestCentroidIndex = 0;

      for (let i = 0; i < centroids.length; i++) {
        const distance = colorDistance(pixel, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroidIndex = i;
        }
      }

      clusters[closestCentroidIndex].push(pixel);
    }

    // Update centroids
    const newCentroids: Color[] = [];
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) {
        // If a cluster is empty, keep the old centroid
        newCentroids.push(centroids[i]);
      } else {
        // Calculate the average color in the cluster
        const sum = clusters[i].reduce(
          (acc, pixel) => ({
            r: acc.r + pixel.r,
            g: acc.g + pixel.g,
            b: acc.b + pixel.b,
          }),
          { r: 0, g: 0, b: 0 }
        );

        newCentroids.push({
          r: Math.round(sum.r / clusters[i].length),
          g: Math.round(sum.g / clusters[i].length),
          b: Math.round(sum.b / clusters[i].length),
        });
      }
    }

    // Check if centroids have converged
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (colorDistance(centroids[i], newCentroids[i]) > 1) {
        converged = false;
        break;
      }
    }

    centroids = newCentroids;

    if (converged) break;
  }

  // Create a new image data with simplified colors
  const simplifiedImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Assign each pixel to the nearest centroid color
  for (let i = 0; i < simplifiedImageData.data.length; i += 4) {
    const pixel: Color = {
      r: simplifiedImageData.data[i],
      g: simplifiedImageData.data[i + 1],
      b: simplifiedImageData.data[i + 2],
    };

    let minDistance = Infinity;
    let closestCentroidIndex = 0;

    for (let j = 0; j < centroids.length; j++) {
      const distance = colorDistance(pixel, centroids[j]);
      if (distance < minDistance) {
        minDistance = distance;
        closestCentroidIndex = j;
      }
    }

    // Replace the pixel color with the centroid color
    simplifiedImageData.data[i] = centroids[closestCentroidIndex].r;
    simplifiedImageData.data[i + 1] = centroids[closestCentroidIndex].g;
    simplifiedImageData.data[i + 2] = centroids[closestCentroidIndex].b;
  }

  return {
    simplifiedImageData,
    palette: centroids,
  };
}

/**
 * Calculates the Euclidean distance between two colors
 * @param color1 The first color
 * @param color2 The second color
 * @returns The distance between the two colors
 */
function colorDistance(color1: Color, color2: Color): number {
  const rDiff = color1.r - color2.r;
  const gDiff = color1.g - color2.g;
  const bDiff = color1.b - color2.b;

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * Enhances region boundaries to create clearer outlines for coloring
 * @param imageData The simplified image data
 * @param palette The color palette
 * @returns Enhanced image data with clearer region boundaries
 */
function enhanceRegionBoundaries(
  imageData: ImageData,
  palette: Color[]
): ImageData {
  const width = imageData.width;
  const height = imageData.height;

  // Create a new image data object for the enhanced image
  const enhancedData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    width,
    height
  );

  // Create a map to track region numbers
  const regionMap: number[][] = [];

  // First, map each pixel to its closest palette color index
  for (let y = 0; y < height; y++) {
    regionMap[y] = [];
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const pixelColor: Color = {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
      };

      // Find the closest color in the palette
      let minDistance = Infinity;
      let closestColorIndex = 0;

      for (let i = 0; i < palette.length; i++) {
        const distance = colorDistance(pixelColor, palette[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestColorIndex = i;
        }
      }

      regionMap[y][x] = closestColorIndex;
    }
  }

  // Apply median filter to reduce noise and smooth regions
  const smoothedMap = applyMedianFilter(regionMap, width, height);

  // Now, detect edges between different regions
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const currentRegion = smoothedMap[y][x];

      // Check if this pixel is at the edge of a region
      const isEdge = isPixelAtRegionEdge(x, y, smoothedMap, width, height);

      if (isEdge) {
        // Mark edge pixels with black
        enhancedData.data[index] = 0; // R
        enhancedData.data[index + 1] = 0; // G
        enhancedData.data[index + 2] = 0; // B
      } else {
        // Set non-edge pixels to their palette color
        const paletteColor = palette[currentRegion];
        enhancedData.data[index] = paletteColor.r; // R
        enhancedData.data[index + 1] = paletteColor.g; // G
        enhancedData.data[index + 2] = paletteColor.b; // B
      }
    }
  }

  return enhancedData;
}

/**
 * Applies a median filter to smooth region boundaries
 */
function applyMedianFilter(
  regionMap: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = [];
  const kernelSize = 3; // 3x3 kernel
  const kernelRadius = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      // Collect values in the kernel neighborhood
      const neighbors: number[] = [];

      for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
        for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
          const nx = x + kx;
          const ny = y + ky;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            neighbors.push(regionMap[ny][nx]);
          }
        }
      }

      // Find the most common value (mode) in the neighborhood
      const counts = new Map<number, number>();
      let maxCount = 0;
      let mode = regionMap[y][x]; // Default to current value

      for (const value of neighbors) {
        const count = (counts.get(value) || 0) + 1;
        counts.set(value, count);

        if (count > maxCount) {
          maxCount = count;
          mode = value;
        }
      }

      result[y][x] = mode;
    }
  }

  return result;
}

/**
 * Checks if a pixel is at the edge of a region in the region map
 */
function isPixelAtRegionEdge(
  x: number,
  y: number,
  regionMap: number[][],
  width: number,
  height: number
): boolean {
  const currentRegion = regionMap[y][x];

  // Check neighboring pixels (4-connectivity)
  const neighbors = [
    { x: x, y: y - 1 }, // up
    { x: x, y: y + 1 }, // down
    { x: x - 1, y: y }, // left
    { x: x + 1, y: y }, // right
  ];

  for (const neighbor of neighbors) {
    if (
      neighbor.x >= 0 &&
      neighbor.x < width &&
      neighbor.y >= 0 &&
      neighbor.y < height
    ) {
      // If any neighbor has a different region, this is an edge
      if (regionMap[neighbor.y][neighbor.x] !== currentRegion) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Creates a numbered template from the simplified image with enhanced region detection
 * @param simplifiedImageData The simplified image data
 * @param palette The color palette
 * @returns An array of numbered pixels
 */
export function createNumberedTemplate(
  simplifiedImageData: ImageData,
  palette: Color[]
): NumberedPixel[][] {
  const width = simplifiedImageData.width;
  const height = simplifiedImageData.height;

  // Create a 2D array to store the numbered pixels
  const template: NumberedPixel[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      color: { r: 0, g: 0, b: 0 },
      number: 0,
    }))
  );

  // Assign numbers to each pixel based on its color
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const pixelColor: Color = {
        r: simplifiedImageData.data[index],
        g: simplifiedImageData.data[index + 1],
        b: simplifiedImageData.data[index + 2],
      };

      // Find the closest color in the palette
      let minDistance = Infinity;
      let closestColorIndex = 0;

      for (let i = 0; i < palette.length; i++) {
        const distance = colorDistance(pixelColor, palette[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestColorIndex = i;
        }
      }

      // Assign the color and number to the pixel
      template[y][x] = {
        color: palette[closestColorIndex],
        number: closestColorIndex + 1, // Numbers start from 1
      };
    }
  }

  return template;
}

/**
 * Converts a color to a CSS color string
 * @param color The color to convert
 * @returns A CSS color string
 */
export function colorToCss(color: Color): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Creates a black and white template image with clear region outlines
 * @param numberedTemplate The numbered template
 * @param width The width of the image
 * @param height The height of the image
 * @returns A base64 encoded black and white template image
 */
export function createBWTemplate(
  numberedTemplate: NumberedPixel[][],
  width: number,
  height: number
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  canvas.width = width;
  canvas.height = height;

  // Fill the canvas with white
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // First pass: Draw region outlines
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const currentNumber = numberedTemplate[y][x].number;

      // Check if this pixel is at the edge of a region
      const isEdge = isTemplatePixelAtEdge(x, y, numberedTemplate);

      if (isEdge) {
        // Draw strong black outline for region edges
        ctx.fillStyle = "black";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Second pass: Place numbers strategically in regions
  const regionCenters = findRegionCenters(numberedTemplate);

  // Place numbers at region centers
  for (const center of regionCenters) {
    const number = numberedTemplate[center.y][center.x].number;

    // Draw the number
    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(number.toString(), center.x + 0.5, center.y + 0.5);
  }

  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Convert the canvas to a base64 encoded image
  return canvas.toDataURL("image/png").split(",")[1];
}

/**
 * Checks if a pixel is at the edge of a region in the template
 */
function isTemplatePixelAtEdge(
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

/**
 * Find centers of regions for number placement
 */
function findRegionCenters(
  template: NumberedPixel[][]
): { x: number; y: number }[] {
  const height = template.length;
  const width = template[0].length;
  const centers: { x: number; y: number }[] = [];

  // Simple approach: place numbers at regular intervals
  // but only if they're not at the edge of a region
  for (let y = 0; y < height; y += 15) {
    for (let x = 0; x < width; x += 15) {
      // Find a good spot within this 15x15 region
      let bestSpot = { x, y };
      let maxNeighborsSameColor = 0;

      for (let dy = 0; dy < 15 && y + dy < height; dy++) {
        for (let dx = 0; dx < 15 && x + dx < width; dx++) {
          const currentX = x + dx;
          const currentY = y + dy;
          const currentNumber = template[currentY][currentX].number;

          // Skip edge pixels
          if (isTemplatePixelAtEdge(currentX, currentY, template)) {
            continue;
          }

          // Count neighbors with same number
          let sameColorNeighbors = 0;
          for (let ny = -1; ny <= 1; ny++) {
            for (let nx = -1; nx <= 1; nx++) {
              const neighborX = currentX + nx;
              const neighborY = currentY + ny;

              if (
                neighborX >= 0 &&
                neighborX < width &&
                neighborY >= 0 &&
                neighborY < height &&
                template[neighborY][neighborX].number === currentNumber
              ) {
                sameColorNeighbors++;
              }
            }
          }

          if (sameColorNeighbors > maxNeighborsSameColor) {
            maxNeighborsSameColor = sameColorNeighbors;
            bestSpot = { x: currentX, y: currentY };
          }
        }
      }

      centers.push(bestSpot);
    }
  }

  return centers;
}
