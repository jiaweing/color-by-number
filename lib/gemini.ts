/**
 * Generate an image based on a prompt using Gemini API via a secure server-side API route
 * @param prompt The text prompt to generate an image from
 * @returns Base64 encoded image data
 */
export async function generateImage(prompt: string): Promise<string | null> {
  try {
    // Call our secure API route instead of directly using the Gemini API
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API error:", errorData.error);
      return null;
    }

    const data = await response.json();
    return data.imageData || null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}
