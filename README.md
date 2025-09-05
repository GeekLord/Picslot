# Picslot - AI-Powered Photo Editor

Picslot is a powerful, web-based AI photo editor that simplifies professional image editing. Retouch photos, apply creative filters, and make complex adjustments using simple text prompts, powered by the Google Gemini API.

![Picslot Screenshot](https://storage.googleapis.com/project-screenshots/picslot-demo.png)

## ✨ Key Features

- **Responsive Design**: Fully responsive layout that works seamlessly on desktop, tablet, and mobile devices.
- **User Profile Management**: A dedicated settings page where users can set a custom display name, professional title, bio, website link, and upload a profile photo for a personalized experience.
- **Quick Start Templates**: Kickstart your creativity with a gallery of pre-configured templates. Select a style like "Vintage Film" or "Anime Scenery" to load a sample image and a professionally crafted prompt directly into the editor.
- **Precise Retouching**: Use the "Generative Mask" to paint over any part of an image and replace it with AI-generated content based on your text prompt. Change colors, remove objects, or add elements with pinpoint accuracy.
- **Cloud-Based Projects**: Securely save your projects to your account and access them from anywhere. Your entire edit history is preserved, and you can easily load, update, or delete projects from your personal dashboard.
- **Prompt Manager**: A full CRUD (Create, Read, Update, Delete) interface for your favorite prompts. Save, manage, reuse, and now **share** your best prompts with other users directly within the editor.
- **AI Prompt Enhancer**: A one-click tool that uses AI to rewrite and improve your prompts, adding professional details to help you achieve better results.
- **Creative Filters**: Instantly transform your photos with a range of artistic filters like Synthwave, Anime, and Lomo, or create a unique look with a custom text prompt.
- **Professional Adjustments**: Apply global enhancements like blurring the background for a portrait effect, adding studio lighting, or adjusting the color temperature for a warmer feel.
- **Non-Destructive Workflow**:
  - **Undo/Redo**: Full history tracking allows you to step backward and forward through your edits.
  - **Compare Mode**: A dynamic slider lets you instantly compare your current edit with the original image.
  - **Version History (Snapshots)**: Save named "snapshots" of your edit history at any point, allowing you to create different versions of your work and restore them later.

### 🤖 One-Click AI Superpowers

Picslot leverages advanced generative AI for complex tasks that traditionally require expert skills:

- **Auto Enhance**: A single click improves your image's lighting, color balance, sharpness, and overall clarity.
- **Remove Background**: Instantly removes the background from your photo, leaving a clean, transparent cutout.
- **Restore Image**: Magically repair old, blurry, or damaged photos, removing scratches and restoring faded colors.
- **Studio Portrait**: Convert any casual photo into a professional, forward-facing headshot with a neutral studio background, while preserving the subject's identity.
- **Magic Expand (Outpainting)**: Expands a cropped photo to a full-body shot with a plausible, AI-generated background that matches the original context.
- **Composite Card Generator**: Automatically create a professional, multi-pose modeling composite card, complete with estimated stats, styled in form-fitting athletic wear.
- **Character Turnaround (3-View Shot)**: Produce a technical three-view (front, side, back) full-body reference shot, ideal for character design or fashion.

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend-as-a-Service**: Supabase (Authentication, PostgreSQL Database, Storage)
- **AI Engine**: Google Gemini API (`gemini-2.5-flash-image-preview` model for vision, `gemini-2.5-flash` for text tasks)
- **Core Libraries**:
  - `react-image-crop` for the interactive cropping UI.
- **Bundling**: The project is set up to run directly in the browser using ES Modules and an `importmap`, requiring no local bundling or installation.

## ⚙️ How It Works

Picslot's magic lies in its sophisticated prompt engineering and robust cloud architecture.

1.  **Authentication**: Users sign up and log in securely via Supabase Auth, with support for email/password and Google OAuth. Sessions are managed with industry-standard practices.
2.  **User Action**: The user uploads an image and selects a tool (e.g., "Restore Image").
3.  **Prompt Engineering**: A highly specific prompt is generated, instructing the Gemini model to act as a professional (e.g., "a world-class master conservator") and follow strict rules about identity preservation and technical execution.
4.  **API Request**: The image data and the engineered prompt are sent to the Gemini API.
5.  **Response Handling**: The application receives the AI-generated image, adds it to the non-destructive history stack, and displays it.
6.  **Cloud Sync**: When a user saves a project, each image in the history stack is uploaded to Supabase Storage. The project metadata, including the storage paths to the images, is saved to a PostgreSQL database. This ensures data is persistent, secure, and accessible across sessions.

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- A [Supabase](https://supabase.com/) account (free tier is sufficient).
- A Google Gemini API key, available from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Supabase Configuration

1.  **Create a Supabase Project:**
    -   Go to your [Supabase Dashboard](https://app.supabase.com/) and create a new project.
    -   Save your database password securely.

2.  **Get API Credentials:**
    -   In your new project, navigate to **Project Settings** (the gear icon) > **API**.
    -   Find your **Project URL** and your **`anon` public key**. You will need these for the next step.

3.  **Enable Auth Providers:**
    -   Navigate to **Authentication** > **Providers**.
    -   Enable the **Email** provider (it's usually on by default, but confirm "Confirm email" is enabled).
    -   Enable the **Google** provider. You will need to provide a Client ID and Secret, which you can get from the [Google Cloud Console](https://console.cloud.google.com/). Follow the Supabase documentation for the exact steps.

4.  **Set Up Database Schema:**
    -   Go to the **SQL Editor** in your Supabase project dashboard.
    -   Click **+ New query**.
    -   Open the `SQL.md` file located in the root of this project.
    -   Copy the entire content of the file, paste it into the Supabase SQL Editor, and click **Run**. This single script is designed to be run multiple times safely and will set up all the necessary tables, policies, and functions.

5.  **Set Up Storage:**
    -   Go to the **Storage** section in the Supabase dashboard.
    -   **Create a private bucket for projects:**
        -   Create a new bucket named `project-images`. **This name must be exact.**
        -   Make the bucket **private**.
        -   Go to the policies for the `project-images` bucket and create a new policy with the following rules to allow users to manage their own files:
            -   **Policy Name**: `User can manage their own project images`
            -   **Allowed operations**: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
            -   **Target roles**: `authenticated`
            -   **USING expression**: `bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]`
            -   **WITH CHECK expression**: `bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]`
    -   **Create a public bucket for avatars:**
        -   Create a new bucket named `avatars`. **This name must be exact.**
        -   Make the bucket **public**.
        -   Go to the policies for the `avatars` bucket and create a new policy to allow users to manage their own avatar:
            -   **Policy Name**: `User can manage their own avatar`
            -   **Allowed operations**: `SELECT`, `INSERT`, `UPDATE`
            -   **Target roles**: `authenticated`
            -   **USING expression**: `bucket_id = 'avatars' AND name = auth.uid()::text`
            -   **WITH CHECK expression**: `bucket_id = 'avatars' AND name = auth.uid()::text`

### Local Application Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/picslot.git
    cd picslot
    ```

2.  **Set Up API Keys:**
    The application loads API keys from environment variables. For simple local development without a build tool, they are configured in a script tag in `index.html`.
    
    **Important:** In a real production environment, you would use a build tool like Vite or Next.js to manage environment variables securely. Do not commit your API keys to version control.

    Open `index.html` and find the `window.process` script object. Replace the placeholder values with your actual keys from Google AI Studio and Supabase.
    ```html
    <script>
      window.process = {
        env: {
          // IMPORTANT: Replace with your actual keys
          API_KEY: "YOUR_GEMINI_API_KEY_HERE",
          SUPABASE_URL: "YOUR_SUPABASE_PROJECT_URL_HERE",
          SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY_HERE"
        }
      };
    </script>
    ```

3.  **Run the Application:**
    Since this project uses modern browser features and no build step, you can run it with any simple local web server. If you have Node.js installed, you can use `serve`:
    
    First, install `serve`:
    ```bash
    npm install -g serve
    ```
    Then, run it from the project's root directory:
    ```bash
    serve
    ```

4.  **Access the App:**
    Open your browser and navigate to the local URL provided by the server (e.g., `http://localhost:3000`). You should see the login screen.

## 📁 File Structure

```
.
├── index.html          # Main HTML entry point with importmap and env setup
├── index.tsx           # Main React application entry point
├── App.tsx             # Root component containing the main application logic and UI
├── SQL.md              # Single source of truth for the Supabase database schema
├── services/
│   ├── geminiService.ts# Functions for interacting with the Gemini API
│   └── supabaseService.ts# Functions for Supabase (Auth, DB, Storage)
├── components/
│   ├── AuthScreen.tsx      # Login/Registration UI
│   ├── ProjectsDashboard.tsx # UI to display user's cloud projects
│   ├── PromptManagerModal.tsx# UI for managing saved prompts
│   └── ...and other UI components
├── types.ts            # Centralized TypeScript type definitions
└── README.md           # This file
```

## 📄 License

This project is licensed under the Apache 2.0 License.