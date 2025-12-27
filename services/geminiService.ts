
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

console.log('[GeminiService] Module loaded.');

export type TransformType = 'pose' | 'cloths' | 'style' | 'scene';
// Gemini supported aspect ratios: "1:1", "3:4", "4:3", "9:16", and "16:9".
export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type OutputAspectRatio = AspectRatio | 'auto';


const logGenerationCost = (response: GenerateContentResponse, context: string) => {
    const usage = response.usageMetadata;
    if (!usage) {
        console.log(`[COST] Usage metadata not available for ${context}.`);
        return;
    }

    const { promptTokenCount = 0, candidatesTokenCount = 0, totalTokenCount = 0 } = usage;
    
    // Pricing is assumed based on similar multimodal models.
    const PRICE_PER_1M_INPUT_TOKENS_USD = 0.35;
    const PRICE_PER_1M_OUTPUT_TOKENS_USD = 1.05;
    const USD_TO_INR_RATE = 83.5; 

    const effectiveTotalTokens = totalTokenCount || (promptTokenCount + candidatesTokenCount);

    const inputCostUSD = (promptTokenCount / 1_000_000) * PRICE_PER_1M_INPUT_TOKENS_USD;
    const outputCostUSD = (candidatesTokenCount / 1_000_000) * PRICE_PER_1M_OUTPUT_TOKENS_USD;
    const totalCostUSD = inputCostUSD + outputCostUSD;

    const totalCostINR = totalCostUSD * USD_TO_INR_RATE;

    console.log(
`----------------------------------------
[COST & USAGE] Operation: ${context}
  - Tokens Used: ${effectiveTotalTokens.toLocaleString()}
    - Input (Prompt): ${promptTokenCount.toLocaleString()}
    - Output (Generation): ${candidatesTokenCount.toLocaleString()}
  - Estimated Cost:
  
    - USD: $${totalCostUSD.toFixed(6)}
    - INR: ₹${totalCostINR.toFixed(4)}
----------------------------------------`
    );
};

// Helper function to build the config for a generateContent call, including aspect ratio.
const buildGenerateContentConfig = (outputAspectRatio?: OutputAspectRatio | AspectRatio) => {
    const config: any = {
        responseModalities: [Modality.IMAGE],
        // Add a random seed to ensure variety in generated images.
        seed: Math.floor(Math.random() * 1000000),
    };

    if (outputAspectRatio && outputAspectRatio !== 'auto') {
        config.imageConfig = {
            aspectRatio: outputAspectRatio,
        };
        console.log(`[GeminiService] Setting aspect ratio to: ${outputAspectRatio}`);
    } else {
        console.log(`[GeminiService] Aspect ratio not set or set to 'auto': ${outputAspectRatio}`);
    }

    console.log('[GeminiService] Generated config:', JSON.stringify(config, null, 2));
    return config;
};

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");

    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mimeType = mimeMatch[1];
    const data = arr[1];

    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string
): string => {
    logGenerationCost(response, context);

    console.log(`[GeminiService] Response metadata for ${context}:`, {
        modelVersion: response.modelVersion,
        candidates: response.candidates?.length,
        finishReason: response.candidates?.[0]?.finishReason,
    });

    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` +
        (textFeedback
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};


/**
 * Generates an image from a text prompt.
 */
export const generateImageFromText = async (
    userPrompt: string,
    aspectRatio: AspectRatio = '1:1'
): Promise<string> => {
    console.log(`[GeminiService] Called generateImageFromText with prompt: "${userPrompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const fullPrompt = `Generate a high-quality, photorealistic image based on the following description.
    
    **CRITICAL INSTRUCTIONS:**
    - The image must be visually appealing and well-composed.

    **USER REQUEST:**
    "${userPrompt}"

    **OUTPUT DIRECTIVE:** Return only the final generated image. Do not include any text, explanations, or additional content.`;

    const contents = { parts: [{ text: fullPrompt }] };

    console.log('[GeminiService] Sending text prompt to the model for generation...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
        config: buildGenerateContentConfig(aspectRatio),
    });

    console.log('[GeminiService] Received response from model for text-to-image.', response);
    return handleApiResponse(response, 'text-to-image');
};

/**
 * Generates an edited image using generative AI.
 */
export const generateEditedImage = async (
    imageToEdit: File,
    userPrompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log('[GeminiService] Called generateEditedImage.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = await fileToPart(imageToEdit);

    const basePrompt = `You are a master-level professional photo editor and creative artist. Execute a sophisticated edit based on the user's request.

**EDIT SPECIFICATIONS:**
- User Request: "${userPrompt}"

**TECHNICAL EXECUTION STANDARDS:**

1.  **SEAMLESS INTEGRATION:**
    -   If filling a transparent area (inpainting), the result must be perfectly blended with the surrounding pixels, matching lighting, texture, and perspective. The transition should be invisible.
    -   If performing a global edit, apply it harmoniously across the entire image.

2.  **ABSOLUTE IDENTITY PRESERVATION (CRITICAL):**
    -   If the image contains people, their fundamental facial features, bone structure, ethnic characteristics, and unique traits MUST remain completely unchanged. Do not alter the person's identity.
    -   Any person in the image must be 100% recognizable as the same individual after the edit.

**OUTPUT DIRECTIVE:** Return exclusively the final edited image with no accompanying text or explanations.`;
    
    const contents = { parts: [imagePart, { text: basePrompt }] };

    console.log('[GeminiService] Sending image and prompt to the model for editing...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model.', response);
    return handleApiResponse(response, 'edit');
};


/**
 * Generates an image with a filter applied using generative AI.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateFilteredImage with prompt: "${filterPrompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are an elite cinematographer and color grading specialist. Apply a sophisticated stylistic treatment to the entire image while maintaining photographic integrity.

**FILTER SPECIFICATION:**
Requested Style: "${filterPrompt}"

**PROFESSIONAL EXECUTION STANDARDS:**

1. **ABSOLUTE IDENTITY PRESERVATION (NON-NEGOTIABLE):**
   - Subject's facial features, bone structure, ethnic identity, and unique characteristics must remain completely unaltered
   - Preserve natural skin undertones and authentic ethnic appearance
   - Maintain original facial expressions and distinctive features
   - Any person must be 100% recognizable as the same individual

2. **ADVANCED COLOR GRADING PROTOCOL:**
   - Apply professional-grade color correction using industry-standard techniques
   - Implement sophisticated tone mapping and dynamic range optimization
   - Ensure consistent color temperature and white balance throughout

**OUTPUT DIRECTIVE:** Return exclusively the final filtered image with professional-grade color treatment and no accompanying text.`;

    const textPart = { text: basePrompt };

    console.log('[GeminiService] Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for filter.', response);
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateAdjustedImage with prompt: "${adjustmentPrompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a master photography technician specializing in professional image correction and global enhancement. Execute comprehensive adjustments across the entire image.

**ADJUSTMENT SPECIFICATION:**
User Request: "${adjustmentPrompt}"

**PROFESSIONAL EXECUTION FRAMEWORK:**

1. **ABSOLUTE IDENTITY PRESERVATION (PARAMOUNT):**
   - Subject's facial structure, ethnic features, and unique identifying characteristics must remain completely unchanged
   - Preserve authentic skin texture, natural features, and original ethnic appearance
   - Ensure 100% subject recognizability post-adjustment

**OUTPUT DIRECTIVE:** Return exclusively the final globally adjusted image with professional-grade correction applied and no accompanying text.`;

    const textPart = { text: basePrompt };

    console.log('[GeminiService] Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for adjustment.', response);
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates an auto-enhanced image using generative AI.
 */
export const generateAutoEnhancedImage = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateAutoEnhancedImage.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a world-renowned master photographer. Execute a comprehensive enhancement that elevates this image to professional exhibition quality.

**COMPREHENSIVE ENHANCEMENT PROTOCOL:**

1. **ABSOLUTE IDENTITY PRESERVATION (CRITICAL FOUNDATION):**
   - Subject's facial features, bone structure, ethnic characteristics, and unique identity markers must remain completely unaltered
   - Preserve authentic skin undertones, natural ethnic features, and original facial expressions
   - Ensure 100% subject recognizability - the enhanced person must be perfectly identifiable as the original

2. **MASTER-LEVEL LIGHTING ARTISTRY:** Apply natural, flattering illumination that enhances clarity and depth.

**OUTPUT DIRECTIVE:** Return exclusively the final enhanced image at professional exhibition quality with no accompanying text or explanations.`;

    const textPart = { text: basePrompt };

    console.log('[GeminiService] Sending image and auto-enhance prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for auto-enhancement.', response);
    return handleApiResponse(response, 'auto-enhance');
};

/**
 * Restores an old or damaged image using generative AI.
 */
export const generateRestoredImage = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateRestoredImage.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a world-class master conservator. Transform this damaged, aged, or low-quality image into a pristine, archival-standard photograph using the most advanced restoration techniques.

**COMPREHENSIVE RESTORATION PROTOCOL:**

1. **ABSOLUTE IDENTITY PRESERVATION:**
   - The subject's facial features, bone structure, ethnic characteristics, and unique identity must remain completely unchanged
   - Preserve authentic historical appearance and original ethnic features
   - Ensure 100% subject recognizability - the restored person must be perfectly identifiable as the original

2. **MASTER-LEVEL DAMAGE RESTORATION:** Remove all scratches, tears, dust, stains, and aging artifacts. Restore original color and vibrancy.

**OUTPUT DIRECTIVE:** Return exclusively the final restored image at archival conservation quality with no accompanying text or explanations.`;

    const textPart = { text: basePrompt };

    console.log('[GeminiService] Sending image and restoration prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for restoration.', response);
    return handleApiResponse(response, 'restoration');
};

/**
 * Generates a studio-quality portrait from an image.
 */
export const generateStudioPortrait = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateStudioPortrait.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a master portrait photographer. Transform the provided image into a flawless, official-standard portrait by re-posing the subject while meticulously preserving their identity, clothing, and hair.

**CORE DIRECTIVE: RE-POSE, DO NOT REPLACE.**

**OFFICIAL PORTRAIT SPECIFICATIONS:**

1. **ABSOLUTE IDENTITY & APPEARANCE PRESERVATION (CRITICAL):**
   - **FACIAL INTEGRITY (NON-NEGOTIABLE):** The subject's facial features, bone structure, and unique identity markers MUST remain 100% unchanged.
   - **HAIR & CLOTHING PRESERVATION:** The subject's original hairstyle and clothing MUST be preserved.
   - **AUTHENTICITY:** The person must be perfectly recognizable.

2. **MANDATORY RE-POSING:** Orient the subject to face directly forward towards the camera with a neutral, professional pose against a neutral studio background.

**OUTPUT DIRECTIVE:** Return exclusively the final re-posed official portrait. No other changes are permitted.`;

    const textPart = { text: basePrompt };

    console.log('[GeminiService] Sending image and studio portrait prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for studio portrait.', response);
    return handleApiResponse(response, 'studio-portrait');
};

/**
 * Generates a modeling comp card from an image.
 */
export const generateCompCard = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateCompCard.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const prompt = `You are an elite fashion industry art director. Create a professional, industry-standard modeling composite card featuring four professional poses.

**MODELING COMPOSITE CARD SPECIFICATIONS:**

1.  **CRITICAL DIRECTIVE: PERFECT IDENTITY PRESERVATION (NON-NEGOTIABLE):**
    -   The face in the provided photograph is the absolute, unalterable source of truth for the subject's identity.
    -    Replicate this exact face onto each of the new poses. The subject must be 100% recognizable.

2.  **PROFESSIONAL COLLAGE COMPOSITION:**
    -   Generate a single, vertically-oriented composite image on a solid white canvas.
    -   Ensure the four poses are distinct and do not overlap.

**OUTPUT DIRECTIVE:** Return exclusively the final single composite image featuring four professional poses with a statistics block.`;

    const textPart = { text: prompt };

    console.log('[GeminiService] Sending image and Comp Card prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for Comp Card.', response);
    return handleApiResponse(response, 'comp-card');
};

/**
 * Generates a 3-view shot from an image.
 */
export const generateThreeViewShot = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateThreeViewShot.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const prompt = `You are a master technical photographer. Create a comprehensive three-view (front, side, back) technical reference sheet of the person in the image.

**CRITICAL DIRECTIVE: PERFECT IDENTITY PRESERVATION:**
The person in all generated poses must be instantly and perfectly recognizable as the person in the input image.

**THREE-VIEW SPECIFICATIONS:**
- Present three views side-by-side (Side | Front | Back) on a pure white background.
- Maintain consistent pose, lighting, and proportions across all views.

**OUTPUT DIRECTIVE:** Return exclusively the final single composite image showing three professional views on pure white background.`;

    const textPart = { text: prompt };

    console.log('[GeminiService] Sending image and 3-View Shot prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for 3-View Shot.', response);
    return handleApiResponse(response, '3-view-shot');
};

/**
 * Generates an outpainted image.
 */
export const generateOutpaintedImage = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateOutpaintedImage.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const prompt = `You are a master-level professional photo compositor specializing in seamless outpainting.

**YOUR TASK:**
Intelligently expand the scene of the provided image. The original image content should form the center of the new image and must be perfectly preserved. The new content must be a seamless extension, matching lighting, texture, and perspective.

**IDENTITY PRESERVATION:** If people are present, their appearance must not be changed.

**OUTPUT DIRECTIVE:** Return only the final, complete image. Do not add any text.`;

    const textPart = { text: prompt };

    console.log('[GeminiService] Sending image and outpainting prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for outpainting.', response);
    return handleApiResponse(response, 'outpaint');
};

/**
 * Removes the background from an image.
 */
export const generateRemovedBackgroundImage = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateRemovedBackgroundImage.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a precision digital artist. Your task is to execute a flawless background removal for the primary subject.

**SUBJECT ISOLATION:** perfectly isolate the main foreground subject(s). The subject must be completely preserved.

**OUTPUT REQUIREMENTS:**
-   **TRANSPARENT BACKGROUND:** The final output MUST have a fully transparent background.
-   **FORMAT:** The image must be a PNG with a valid alpha channel.

**OUTPUT DIRECTIVE:** Return ONLY the final image of the subject on a transparent background.`;

    const textPart = { text: basePrompt };

    console.log('[GeminiService] Sending image and background removal prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for background removal.', response);
    return handleApiResponse(response, 'remove-background');
};

/**
 * Generates an image from a different camera angle.
 */
export const generateMovedCameraImage = async (
    originalImage: File,
    prompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateMovedCameraImage with dynamic prompt.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const originalImagePart = await fileToPart(originalImage);

    const textPart = { text: prompt };

    console.log('[GeminiService] Sending image and dynamic change view prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    console.log('[GeminiService] Received response from model for moved camera.', response);
    return handleApiResponse(response, 'move-camera');
};

/**
 * Generates a detailed description of an image.
 */
export const describeImage = async (
    imageToDescribe: File,
): Promise<string> => {
    console.log('[GeminiService] Called describeImage.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = await fileToPart(imageToDescribe);

    const prompt = "You are an expert prompt engineer. Analyze the provided image and generate a concise, yet visually descriptive paragraph describing it. Focus on subject, setting, composition, lighting, and style. Only output the final description.";

    const contents = { parts: [imagePart, { text: prompt }] };

    console.log('[GeminiService] Sending image to the model for description...');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
    });

    const descriptionText = response.text;
    if (!descriptionText || descriptionText.trim() === '') {
        throw new Error('The AI model did not return a description.');
    }

    return descriptionText.trim();
};


/**
 * Enhances a user's prompt using generative AI.
 */
export const enhancePrompt = async (
    promptToEnhance: string,
): Promise<string> => {
    console.log(`[GeminiService] Called enhancePrompt.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const metaPrompt = `You are a world-class expert prompt engineer. Rewrite the following user's prompt to be more descriptive, adding detail about lighting, camera, composition, and style while preserving the core subject. Respond ONLY with the rewritten prompt text.

**User's Prompt to Enhance:**
"${promptToEnhance}"`;

    console.log('[GeminiService] Sending prompt to the model for enhancement...');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: metaPrompt,
    });
    
    const enhancedText = response.text;
    if (!enhancedText || enhancedText.trim() === '') {
        throw new Error('The AI model did not return an enhanced prompt.');
    }
    
    return enhancedText.trim();
};

/**
 * Generates a short, descriptive title for a prompt.
 */
export const generatePromptTitle = async (
    promptContent: string,
): Promise<string> => {
    console.log(`[GeminiService] Called generatePromptTitle.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const metaPrompt = `Analyze the following detailed prompt and create a short, descriptive title for it (4-5 words maximum). Respond ONLY with the title text.

**Prompt to summarize:**
"${promptContent}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: metaPrompt,
    });
    
    const generatedTitle = response.text;
    if (!generatedTitle || generatedTitle.trim() === '') {
        throw new Error('The AI model did not return a title.');
    }
    
    return generatedTitle.trim().replace(/["']/g, "");
};

/**
 * Generates a random, creative prompt for a camera move.
 */
export const generateRandomCameraMovePrompt = async (): Promise<string> => {
    console.log(`[GeminiService] Called generateRandomCameraMovePrompt.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const metaPrompt = `You are a creative cinematographer AI. Generate a single, short, creative, and random cinematic shot type or camera movement instruction. Respond ONLY with the instruction phrase.`;

    console.log('[GeminiService] Sending prompt to the model for random camera move...');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: metaPrompt,
    });
    
    const randomPrompt = response.text;
    if (!randomPrompt || randomPrompt.trim() === '') {
        throw new Error('The AI model did not return a random prompt.');
    }
    
    return randomPrompt.trim().replace(/["']/g, "");
};

/**
 * Generates a high-CTR thumbnail image.
 */
export const generateThumbnailImage = async (
    title: string,
    description?: string,
    guidingImage?: File,
    aspectRatio: AspectRatio = '16:9'
): Promise<string> => {
    console.log(`[GeminiService] Called generateThumbnailImage with title: "${title}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [];
    let prompt = `Create a professional YouTube thumbnail for a video titled "${title}".
    ${description ? `Context: ${description}` : ''}
    The title "${title}" MUST be visible and legible. Format: ${aspectRatio} aspect ratio.
    OUTPUT DIRECTIVE: Return only the final generated image.`;

    if (guidingImage) {
        const imagePart = await fileToPart(guidingImage);
        parts.push(imagePart);
    }
    parts.push({ text: prompt });

    console.log('[GeminiService] Sending thumbnail request to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: buildGenerateContentConfig(aspectRatio),
    });

    return handleApiResponse(response, 'thumbnail-generation');
};

/**
 * Generates an image by applying a transformation from a reference image to a subject image.
 */
export const generateGuidedTransform = async (
    subjectImage: File,
    referenceImage: File,
    userPrompt: string,
    transformType: TransformType,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateGuidedTransform with type: ${transformType}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const subjectPart = await fileToPart(subjectImage);
    const referencePart = await fileToPart(referenceImage);

    let masterPrompt = `You are a master digital artist. Your task is to apply the ${transformType} from the reference image onto the subject from the subject image. Preserve the subject's identity. Instructions: "${userPrompt}". OUTPUT DIRECTIVE: Return only the final image.`;

    const contents = { parts: [subjectPart, referencePart, { text: masterPrompt }] };

    console.log(`[GeminiService] Sending images to the model for guided transform (${transformType})...`);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    return handleApiResponse(response, `guided-transform-${transformType}`);
};

/**
 * Generates a composited image from multiple source images and a master prompt.
 */
export const generateCompositedImage = async (
    images: { file: File; role: string }[],
    masterPrompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log('[GeminiService] Called generateCompositedImage.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imageParts = await Promise.all(images.map(img => fileToPart(img.file)));

    let textPrompt = `You are an expert AI photo compositor. Combine multiple image assets into a single, seamless, and photorealistic final image based on this instruction: "${masterPrompt}". Preserve the identity of any people in the images. Assets:`;
    const allParts: any[] = [];
    images.forEach((image, index) => {
        textPrompt += `\n- [IMAGE ${index + 1}] Role: ${image.role}`;
        allParts.push(imageParts[index]);
    });
    allParts.push({ text: textPrompt });

    console.log('[GeminiService] Sending multiple images to the model for scene composition...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: allParts },
        config: buildGenerateContentConfig(outputAspectRatio),
    });

    return handleApiResponse(response, 'scene-composition');
};
