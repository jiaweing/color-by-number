import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Initialize the Gemini API with server-side environment variable
const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function POST(request: NextRequest) {
  try {
    // Make sure API key is set
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server" },
        { status: 500 }
      );
    }

    // Get the prompt from the request body
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Call the Gemini API to generate an image
    const isImageGeneration = true;

    // Enhance the prompt to request a color-by-number style image
    const enhancedPrompt = `Create a non-pixel art, coloring book style image of ${prompt}. The image should have:
- Clear distinct regions with different colors
- Bold outlines between different colored areas
- A clean, simple design with flat colors
- No tiny details or complex patterns
- Distinct areas that can be easily numbered
- No shading, gradients, or textures
- Similar to professional coloring book pages for adults
- High contrast between different regions`;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      config: {
        responseModalities: isImageGeneration ? ["Text", "Image"] : ["Text"],
      },
    });

    // Extract the base64 image data from the response
    if (result.candidates && result.candidates[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (
          part.inlineData !== undefined &&
          part.inlineData.data &&
          part.inlineData.mimeType &&
          part.inlineData.mimeType.startsWith("image/")
        ) {
          // Return the image data
          return NextResponse.json({ imageData: part.inlineData.data });
        }
      }
    }

    return NextResponse.json(
      { error: "No image data returned from Gemini API" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
