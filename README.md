# Picslot - AI-Powered Photo Editor

Picslot is a powerful, web-based AI photo editor that simplifies professional image editing. Retouch photos, apply creative filters, and make complex adjustments using simple text prompts, powered by the Google Gemini API.

![Picslot Screenshot](https://storage.googleapis.com/project-screenshots/picslot-demo.png)

## ✨ Key Features

- **Precise Retouching**: Click any point on an image to make localized edits. Change colors, remove objects, or add elements with pinpoint accuracy simply by describing what you want.
- **Creative Filters**: Instantly transform your photos with a range of artistic filters like Synthwave, Anime, and Lomo, or create a unique look with a custom text prompt.
- **Professional Adjustments**: Apply global enhancements like blurring the background for a portrait effect, adding studio lighting, or adjusting the color temperature for a warmer feel.
- **Standard Editing Tools**: Includes a robust cropping tool with freeform and fixed aspect ratios (1:1, 16:9).
- **Non-Destructive Workflow**:
  - **Undo/Redo**: Full history tracking allows you to step backward and forward through your edits.
  - **Compare Mode**: A dynamic slider lets you instantly compare your current edit with the original image.
  - **Reset**: Revert all changes and start fresh with a single click.

### 🤖 One-Click AI Superpowers

Picslot leverages advanced generative AI for complex tasks that traditionally require expert skills:

- **Auto Enhance**: A single click improves your image's lighting, color balance, sharpness, and overall clarity.
- **Restore Image**: Magically repair old, blurry, or damaged photos, removing scratches and restoring faded colors.
- **Studio Portrait**: Convert any casual photo into a professional, forward-facing headshot with a neutral studio background, while preserving the subject's identity.
- **Comp Card Generator**: Automatically create a professional, multi-pose modeling composite card, complete with estimated stats, styled in form-fitting athletic wear.
- **3-View Shot Generator**: Produce a technical three-view (front, side, back) full-body reference shot, ideal for character design or fashion.

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI Engine**: Google Gemini API (`gemini-2.5-flash-image-preview` model)
- **Core Libraries**:
  - `react-image-crop` for the interactive cropping UI.
- **Bundling**: The project is set up to run directly in the browser using ES Modules and an `importmap`, requiring no local bundling or installation.

## ⚙️ How It Works

Picslot's magic lies in its sophisticated prompt engineering. When a user performs an action, the application doesn't just send the image and a simple prompt to the AI. Instead, it constructs a detailed, role-based prompt for the Gemini model.

1.  **User Action**: The user uploads an image and selects a tool (e.g., "Restore Image").
2.  **Image Processing**: The frontend converts the uploaded image file into a Base64-encoded string.
3.  **Prompt Engineering**: A highly specific prompt is generated. For example, the "Restore Image" prompt instructs the AI to act as a "world-class master conservator and digital restoration artist." It includes strict rules about:
    - **Identity Preservation**: A non-negotiable clause to ensure the subject's facial features, ethnicity, and unique characteristics remain unchanged.
    - **Technical Execution**: Detailed steps on how to remove scratches, correct colors, enhance resolution, and preserve texture.
    - **Output Format**: A directive to return only the final image data.
4.  **API Request**: The image data and the engineered prompt are sent to the Gemini API.
5.  **Response Handling**: The application receives the AI-generated image, checks for any safety blocks or errors, and displays the result to the user.
6.  **History Management**: The new image is added to the history stack, allowing for undo/redo functionality.

This meticulous approach ensures high-quality, consistent, and safe results for complex editing tasks.

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- `npm` (included with Node.js)
- A Google Gemini API key, available from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation & Configuration

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/picslot.git
    cd picslot
    ```

2.  **Install Dependencies:**
    This project may require a local web server or other tools. To install the required packages, run:
    ```bash
    npm install
    ```
    *(This assumes a `package.json` file exists with dependencies like `serve`.)*

3.  **Set Up API Key:**
    The application loads the Gemini API key from environment variables. Create a file named `.env.local` in the project's root directory.
    ```bash
    touch .env.local
    ```
    Open this file and add your API key:
    ```
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```
    **Important:** Your development environment must be configured to load `.env.local` and make the `API_KEY` available to the application as `process.env.API_KEY`. Tools like Vite or Create React App handle this automatically.

### Running the Application

**Development Mode:**

To run the application with a development server that supports features like hot-reloading and environment variables, you would typically use a command like:
```bash
npm run dev
```
*(This requires a `dev` script to be configured in `package.json`, e.g., using Vite).*

**Production Mode / Simple Server:**

For a simple production-like deployment, you can use a static file server.

1.  **Start the server:**
    If you have `serve` installed (e.g., via `npm install -g serve` or as a project dependency), run:
    ```bash
    serve
    ```

2.  **Access the App:**
    Open your browser and navigate to the local URL provided (e.g., `http://localhost:3000`).

## 📁 File Structure

```
.
├── index.html          # Main HTML entry point with importmap setup
├── index.tsx           # Main React application entry point
├── App.tsx             # Root component containing the main application logic and UI
├── services/
│   └── geminiService.ts# All functions for interacting with the Gemini API
├── components/
│   ├── AdjustmentPanel.tsx # UI for global image adjustments
│   ├── CompareSlider.tsx   # UI for before/after image comparison
│   ├── CropPanel.tsx       # UI for cropping options
│   ├── FilterPanel.tsx     # UI for creative filters
│   ├── Header.tsx          # Application header
│   ├── StartScreen.tsx     # Initial screen for image upload
│   ├── ...and other UI components
└── README.md           # This file
```

## 📄 License

This project is licensed under the Apache 2.0 License. See the `LICENSE` file for details.
