# Color by Number App

A Next.js application that allows users to generate images using AI (Google Gemini), convert them into color-by-number templates, and interactively color them.

## Features

- Generate images using Google Gemini AI based on text prompts
- Automatically convert images into color-by-number templates
- Interactive coloring with a palette of colors
- Highlight regions of the selected color using a checkerboard pattern
- Adjustable difficulty levels (number of colors)
- Export the final colored image

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- A Google Gemini API key (get one from [Google AI Studio](https://ai.google.dev/))

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file in the root directory and add your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## How to Use

1. Enter a prompt in the text field (e.g., "a cozy forest cabin")
2. Click "Generate" to create an image
3. Once the image is processed, select a color from the palette
4. Click on the numbered regions to color them
5. Use the controls to toggle the template view, get hints, or reset the coloring
6. Export your finished artwork when done

## Technologies Used

- Next.js 15
- React 19
- Google Gemini API for image generation
- Canvas API for image processing and rendering
- Tailwind CSS for styling
