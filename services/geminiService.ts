/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

console.log('[GeminiService] Module loaded.');

export type TransformType = 'pose' | 'cloths' | 'style' | 'scene';
export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '21:9' | '3:2' | '2:3' | '5:4' | '4:5';
export type OutputAspectRatio = AspectRatio | 'auto';


const logGenerationCost = (response: GenerateContentResponse, context: string) => {
    const usage = response.usageMetadata;
    if (!usage) {
        console.log(`[COST] Usage metadata not available for ${context}.`);
        return;
    }

    const { promptTokenCount = 0, candidatesTokenCount = 0, totalTokenCount = 0 } = usage;
    
    // NOTE: These prices are for demonstration purposes and may not reflect the actual
    // pricing for the 'gemini-2.5-flash-image' model.
    // Please refer to the official Google Cloud/AI Studio pricing page for accurate costs.
    // Pricing is assumed based on similar multimodal models.
    const PRICE_PER_1M_INPUT_TOKENS_USD = 0.35; // Example: $0.35 per 1 million tokens
    const PRICE_PER_1M_OUTPUT_TOKENS_USD = 1.05; // Example: $1.05 per 1 million tokens
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

// Helper to add aspect ratio instruction to a prompt
const addAspectRatioToPrompt = (prompt: string, aspectRatio: OutputAspectRatio | undefined): string => {
    if (aspectRatio && aspectRatio !== 'auto') {
        return `${prompt}\n\n**CRITICAL COMPOSITION DIRECTIVE:** The final output image MUST be rendered with an aspect ratio of exactly ${aspectRatio}. Intelligently expand (outpaint) or crop the scene to fit this new aspect ratio while maintaining a professional and visually appealing composition. The main subject must remain the focus.`;
    }
    return prompt;
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
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // Log cost and token usage
    logGenerationCost(response, context);

    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
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
 * @param userPrompt The text prompt describing the desired image.
 * @param aspectRatio The desired aspect ratio for the output image.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateImageFromText = async (
    userPrompt: string,
    aspectRatio: AspectRatio = '1:1'
): Promise<string> => {
    console.log(`[GeminiService] Called generateImageFromText with prompt: "${userPrompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const fullPrompt = `Generate a high-quality, photorealistic image based on the following description.
    
    **CRITICAL INSTRUCTIONS:**
    - The image must be visually appealing and well-composed.
    - The final output aspect ratio must be exactly ${aspectRatio}.

    **USER REQUEST:**
    "${userPrompt}"

    **OUTPUT DIRECTIVE:** Return only the final generated image. Do not include any text, explanations, or additional content.`;

    const contents = { parts: [{ text: fullPrompt }] };

    console.log('[GeminiService] Sending text prompt to the model for generation...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    console.log('[GeminiService] Received response from model for text-to-image.', response);
    return handleApiResponse(response, 'text-to-image');
};

/**
 * Generates an edited image using generative AI. The function handles both global edits
 * and inpainting. For inpainting, the input image should have a transparent area.
 * @param imageToEdit The image file to be edited. For inpainting, this image must have a transparent region.
 * @param userPrompt The text prompt describing the desired edit. For inpainting, this should include instructions to fill the transparent area.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    imageToEdit: File,
    userPrompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log('[GeminiService] Called generateEditedImage.');
    console.log(`[GeminiService] API_KEY available: ${!!process.env.API_KEY}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    console.log('[GeminiService] GoogleGenAI client initialized.');
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
    
    const fullPrompt = addAspectRatioToPrompt(basePrompt, outputAspectRatio);

    const contents = { parts: [imagePart, { text: fullPrompt }] };

    console.log('[GeminiService] Sending image and prompt to the model for editing...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: contents,
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model.', response);
    return handleApiResponse(response, 'edit');
};


/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateFilteredImage with prompt: "${filterPrompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are an elite cinematographer and color grading specialist with expertise in professional film and photography post-processing. Apply a sophisticated stylistic treatment to the entire image while maintaining photographic integrity.

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
   - Utilize advanced LUT (Look-Up Table) methodology for consistent color treatment
   - Apply graduated filters and selective color adjustments with precision

3. **CINEMATIC QUALITY STANDARDS:**
   - Execute Hollywood-level color grading with attention to mood and atmosphere
   - Maintain natural skin tone fidelity across all ethnic backgrounds
   - Apply film-quality exposure and contrast adjustments
   - Ensure consistent color temperature and white balance throughout

4. **TECHNICAL PRESERVATION:**
   - Maintain original image composition and subject positioning
   - Preserve image sharpness and detail resolution
   - Retain natural depth of field and bokeh characteristics
   - Keep original lighting direction and shadow structure

**ENHANCED SAFETY PROTOCOL:**
- Filters may enhance colors and mood but must never alter fundamental ethnic characteristics
- Preserve authentic skin tones while allowing for artistic color treatment
- Maintain subject dignity and natural appearance in all filter applications

**OUTPUT DIRECTIVE:** Return exclusively the final filtered image with professional-grade color treatment and no accompanying text.`;

    const fullPrompt = addAspectRatioToPrompt(basePrompt, outputAspectRatio);
    const textPart = { text: fullPrompt };

    console.log('[GeminiService] Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for filter.', response);
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateAdjustedImage with prompt: "${adjustmentPrompt}"`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a master photography technician specializing in professional image correction and global enhancement. Execute comprehensive adjustments across the entire image using industry-standard techniques.

**ADJUSTMENT SPECIFICATION:**
User Request: "${adjustmentPrompt}"

**PROFESSIONAL EXECUTION FRAMEWORK:**

1. **ABSOLUTE IDENTITY PRESERVATION (PARAMOUNT):**
   - Subject's facial structure, ethnic features, and unique identifying characteristics must remain completely unchanged
   - Preserve authentic skin texture, natural features, and original ethnic appearance
   - Maintain original facial expressions and distinctive traits
   - Ensure 100% subject recognizability post-adjustment

2. **GLOBAL CORRECTION PROTOCOL:**
   - Apply uniform adjustments across the entire image canvas
   - Execute professional-grade exposure correction and dynamic range optimization
   - Implement advanced shadow/highlight recovery techniques
   - Apply sophisticated color balance and white point correction

3. **TECHNICAL EXCELLENCE STANDARDS:**
   - Utilize professional histogram analysis for optimal tonal distribution
   - Apply industry-standard gamma correction and tone curve adjustments
   - Execute precision color space management and saturation enhancement
   - Maintain photographic authenticity and natural appearance

4. **QUALITY ASSURANCE MEASURES:**
   - Preserve original image resolution and pixel density
   - Maintain natural lighting characteristics and shadow behavior
   - Ensure consistent color temperature across all image regions
   - Apply professional noise reduction and sharpening algorithms

**ENHANCED SAFETY PROTOCOL:**
- Execute standard photo enhancement requests including professional skin tone adjustments
- Maintain ethical standards while fulfilling legitimate adjustment requests
- Preserve subject dignity and authentic ethnic appearance

**OUTPUT DIRECTIVE:** Return exclusively the final globally adjusted image with professional-grade correction applied and no accompanying text.`;

    const fullPrompt = addAspectRatioToPrompt(basePrompt, outputAspectRatio);
    const textPart = { text: fullPrompt };

    console.log('[GeminiService] Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for adjustment.', response);
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates an auto-enhanced image using generative AI.
 * @param originalImage The original image file.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the enhanced image.
 */
export const generateAutoEnhancedImage = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateAutoEnhancedImage.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a world-renowned master photographer and digital artist with expertise in transforming images to museum-quality, award-winning standards. Execute a comprehensive enhancement that elevates this image to professional exhibition quality.

**COMPREHENSIVE ENHANCEMENT PROTOCOL:**

1. **ABSOLUTE IDENTITY PRESERVATION (CRITICAL FOUNDATION):**
   - Subject's facial features, bone structure, ethnic characteristics, and unique identity markers must remain completely unaltered
   - Preserve authentic skin undertones, natural ethnic features, and original facial expressions
   - Maintain original personality and distinctive characteristics
   - Ensure 100% subject recognizability - the enhanced person must be perfectly identifiable as the original

2. **MASTER-LEVEL LIGHTING ARTISTRY (PRIMARY FOCUS):**
   - **Professional Light Sculpting:** Apply museum-quality lighting that rivals the world's best portrait photographers
   - **Advanced Exposure Recovery:** Rescue blown highlights and lift shadow details using professional-grade HDR techniques
   - **Studio Light Simulation:** Create natural, flattering illumination that mimics $100,000 professional studio setups
   - **Micro-contrast Enhancement:** Apply professional clarity adjustments that bring out fine facial details

3. **TECHNICAL EXCELLENCE FRAMEWORK:**
   - **Resolution Enhancement:** Apply AI-powered super-resolution for crystal-clear detail reproduction
   - **Professional Sharpening:** Execute multi-scale sharpening algorithms used in commercial photography
   - **Color Science Mastery:** Implement professional color grading with film-quality color reproduction
   - **Noise Elimination:** Apply state-of-the-art denoising while preserving natural texture detail

4. **COMPOSITION OPTIMIZATION (INTELLIGENT):**
   - **Smart Framing:** If composition benefits, intelligently extend the background for better visual balance
   - **Professional Cropping:** Apply rule-of-thirds and golden ratio principles for optimal composition
   - **Background Enhancement:** Generate contextually appropriate, high-quality backgrounds when extending the frame
   - **Depth Enhancement:** Improve dimensional perception and visual depth

5. **ADVANCED QUALITY ASSURANCE:**
   - **Skin Texture Preservation:** Maintain natural skin texture while eliminating imperfections
   - **Eye Enhancement:** Bring out natural eye brilliance and clarity without artificial appearance
   - **Hair Detail Recovery:** Restore fine hair detail and natural texture definition
   - **Fabric Texture Enhancement:** Improve clothing detail and material authenticity

**PROFESSIONAL SAFETY STANDARDS:**
- Execute standard photo enhancement requests including professional skin tone adjustments
- Maintain photographic authenticity while achieving commercial-quality results
- Preserve subject dignity and natural ethnic appearance

**OUTPUT DIRECTIVE:** Return exclusively the final enhanced image at professional exhibition quality with no accompanying text or explanations.`;

    const fullPrompt = addAspectRatioToPrompt(basePrompt, outputAspectRatio);
    const textPart = { text: fullPrompt };

    console.log('[GeminiService] Sending image and auto-enhance prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for auto-enhancement.', response);
    return handleApiResponse(response, 'auto-enhance');
};

/**
 * Restores an old or damaged image using generative AI.
 * @param originalImage The original image file.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the restored image.
 */
export const generateRestoredImage = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateRestoredImage.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a world-class master conservator and digital restoration artist specializing in museum-quality photo restoration. Transform this damaged, aged, or low-quality image into a pristine, archival-standard photograph using the most advanced restoration techniques.

**COMPREHENSIVE RESTORATION PROTOCOL:**

1. **ABSOLUTE IDENTITY PRESERVATION (SACRED PRINCIPLE):**
   - The subject's facial features, bone structure, ethnic characteristics, and unique identity must remain completely unchanged
   - Preserve authentic historical appearance and original ethnic features
   - Maintain original facial expressions, distinctive traits, and personality characteristics
   - Ensure 100% subject recognizability - the restored person must be perfectly identifiable as the original

2. **MASTER-LEVEL DAMAGE RESTORATION:**
   - **Complete Imperfection Elimination:** Remove all scratches, tears, dust, stains, water damage, and age spots
   - **Advanced Noise Reduction:** Eliminate film grain, digital artifacts, and compression damage using professional algorithms
   - **Crack and Tear Repair:** Seamlessly reconstruct damaged areas with historically accurate detail
   - **Fade Recovery:** Restore original color vibrancy and contrast from faded photographs

3. **PROFESSIONAL IMAGE ENHANCEMENT:**
   - **Resolution Upscaling:** Apply museum-quality super-resolution for maximum detail recovery
   - **Clarity Restoration:** Bring back sharp focus and fine detail definition
   - **Dynamic Range Recovery:** Restore full tonal range from heavily compressed or faded images
   - **Professional Sharpening:** Apply multi-scale sharpening for maximum detail clarity

4. **ARCHIVAL COLOR RESTORATION:**
   - **Historical Color Accuracy:** Restore authentic color reproduction based on period-appropriate color science
   - **White Balance Correction:** Neutralize color casts and restore natural color temperature
   - **Skin Tone Fidelity:** Ensure accurate and natural skin tone reproduction
   - **Color Depth Enhancement:** Restore full color gamut and saturation depth

5. **TECHNICAL EXCELLENCE STANDARDS:**
   - **Lighting Optimization:** Balance shadows and highlights for optimal detail visibility
   - **Texture Preservation:** Maintain natural skin texture and fabric detail authenticity
   - **Background Reconstruction:** Intelligently restore damaged background areas with period-appropriate detail
   - **Edge Definition:** Restore clean edge definition and eliminate motion blur

6. **INTELLIGENT COMPOSITION ENHANCEMENT:**
   - **Smart Extension:** If beneficial, intelligently extend cropped areas with historically accurate content
   - **Perspective Correction:** Correct lens distortion and perspective issues common in vintage photography
   - **Format Optimization:** Optimize aspect ratio and framing for modern viewing while preserving historical integrity

**PROFESSIONAL SAFETY STANDARDS:**
- Execute standard restoration requests including natural skin tone corrections
- Maintain historical authenticity while achieving modern technical quality
- Preserve subject dignity and authentic ethnic appearance throughout restoration

**OUTPUT DIRECTIVE:** Return exclusively the final restored image at archival conservation quality with no accompanying text or explanations.`;

    const fullPrompt = addAspectRatioToPrompt(basePrompt, outputAspectRatio);
    const textPart = { text: fullPrompt };

    console.log('[GeminiService] Sending image and restoration prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for restoration.', response);
    return handleApiResponse(response, 'restoration');
};

/**
 * Generates a studio-quality portrait from an image.
 * @param originalImage The original image file.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the portrait image.
 */
export const generateStudioPortrait = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateStudioPortrait.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a master portrait photographer specializing in official government documentation, executive headshots, and professional credentials. Your task is to transform the provided image into a flawless, official-standard portrait, suitable for passports, visas, or corporate profiles, by re-posing the subject while meticulously preserving their identity, clothing, and hair.

**CORE DIRECTIVE: RE-POSE, DO NOT REPLACE.**

**OFFICIAL PORTRAIT SPECIFICATIONS:**

1. **ABSOLUTE IDENTITY & APPEARANCE PRESERVATION (CRITICAL):**
   - **FACIAL INTEGRITY (NON-NEGOTIABLE):** The subject's facial features, bone structure, ethnic characteristics, unique identity markers, and the exact pixels of the face MUST remain 100% unchanged. The face is a protected, unalterable element.
   - **HAIR & CLOTHING PRESERVATION:** The subject's original hairstyle, hair color, clothing, and any visible accessories MUST be preserved with no changes. The goal is to re-pose the person, not to re-style them.
   - **AUTHENTICITY:** Preserve original skin texture, natural features, and authentic appearance. The person must be perfectly recognizable.

2. **MANDATORY RE-POSING REQUIREMENTS (CRITICAL FOR DOCUMENTATION):**
   - **PERFECT FORWARD ALIGNMENT:** The subject's entire body, from shoulders to face, must be re-oriented to face directly forward towards the camera.
   - **DIRECT GAZE:** The subject's eyes must be adjusted to look directly into the camera lens.
   - **LEVEL HEAD:** The head must be perfectly level, with no tilting, turning, or angling.
   - **NEUTRAL POSE:** Reposition arms to a relaxed, neutral state at the sides. Remove any hand-to-face contact.

3. **PROFESSIONAL COMPOSITION & BACKGROUND:**
   - **FRAMING:** Create a professional half-body portrait (head to approximately waist level), perfectly centered.
   - **BACKGROUND:** Replace the original background with a solid, neutral light gray or soft off-white, consistent with official documentation standards. Apply a subtle, professional bokeh effect.

4. **STUDIO-QUALITY LIGHTING & ENHANCEMENT:**
   - **LIGHTING:** Apply a professional, even studio lighting setup suitable for an executive headshot. Eliminate harsh shadows while maintaining natural facial modeling.
   - **QUALITY:** If the original is low quality, enhance sharpness, correct color, and remove noise, but ONLY after all preservation rules are met.

**OUTPUT DIRECTIVE:** Return exclusively the final re-posed official portrait. The output must show the same person, in the same clothes and with the same hair, now facing the camera directly against a neutral studio background. No other changes are permitted.`;

    const fullPrompt = addAspectRatioToPrompt(basePrompt, outputAspectRatio);
    const textPart = { text: fullPrompt };

    console.log('[GeminiService] Sending image and studio portrait prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for studio portrait.', response);
    return handleApiResponse(response, 'studio-portrait');
};

/**
 * Generates a modeling comp card from an image.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the comp card image.
 */
export const generateCompCard = async (
    originalImage: File,
): Promise<string> => {
    console.log(`[GeminiService] Called generateCompCard.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const prompt = `You are an elite fashion industry art director and composite card designer working for the world's top modeling agencies. Create a professional, industry-standard modeling composite card that meets New York Fashion Week and international agency requirements.

**MODELING COMPOSITE CARD SPECIFICATIONS:**

1.  **CRITICAL DIRECTIVE: PERFECT IDENTITY PRESERVATION (NON-NEGOTIABLE):**
    -   **SOURCE OF TRUTH:** The face in the provided photograph is the absolute, unalterable source of truth for the subject's identity.
    -   **EXACT REPLICATION, NOT INTERPRETATION:** Your primary task is to perfectly replicate this exact face onto each of the new poses. Do not interpret, re-render, or create a "similar" face. You are compositing the original face onto new bodies.
    -   **PIXEL-LEVEL FIDELITY:** The subject's bone structure, skin texture, unique features (moles, scars), and the precise shape and spacing of the eyes, nose, and mouth must be 100% identical to the source image.
    -   **FAILURE CONDITION:** Any deviation in facial identity, however minor, constitutes a complete failure of the task. The person in all generated poses must be instantly and perfectly recognizable as the person in the input image. This rule overrides all other stylistic instructions.

2.  **PROFESSIONAL COLLAGE COMPOSITION (STRICT LAYOUT RULES):**
    -   **Single Composite Output:** Generate a single, vertically-oriented composite image.
    -   **MANDATORY TRANSPARENT BACKGROUNDS:** Each of the four poses MUST be generated with a perfectly transparent background.
    -   **FINAL COMPOSITE:** These four transparent-background poses must then be arranged on a single, clean, solid #FFFFFF white canvas.
    -   **NO OVERLAPPING (CRITICAL):** The bounding boxes of the four generated poses MUST NOT overlap under any circumstances. There must be clear, visible white space separating each distinct image. Do not allow any part of one pose to obscure any part of another. This is a strict requirement for a clean, professional layout.
    -   **Dynamic Layout:** Within the no-overlapping constraint, create a sophisticated and balanced, magazine-quality arrangement. Avoid a simple, rigid grid.

3.  **INDUSTRY-STANDARD FOUR POSES:**
    -   **Main Headshot:** Professional studio headshot (shoulders up) with perfect facial clarity.
    -   **Full-Body Studio Shot:** Complete standing pose showcasing full physique and proportions.
    -   **Three-Quarter Length:** Professional shot from knees up in a complementary pose.
    -   **Profile Shot:** Clean side-view profile highlighting facial structure and bone definition.

4.  **PROFESSIONAL WARDROBE STYLING:**
    -   **Consistent Athletic Wear:** Replace original clothing with sophisticated, form-fitting athletic or swimwear.
    -   **Male Styling:** Premium athletic shorts, briefs, or fitted athletic wear showcasing physique.
    -   **Female Styling:** Professional sports bra and shorts, unitard, or elegant bikini highlighting body lines.
    -   **Physique Showcase:** Attire must clearly display muscle definition, body shape, and proportions.
    -   **Cohesive Aesthetic:** Maintain consistent styling across all four poses for professional unity.

5.  **TECHNICAL MODEL STATISTICS (DATA ANALYSIS):**
    Based on visual analysis of the original photograph, generate realistic professional modeling statistics:
    -   **Height:** Estimate in both feet/inches and centimeters.
    -   **Measurements:** Professional Bust-Waist-Hips measurements in inches.
    -   **Physical Attributes:** Hair color and eye color analysis.
    -   **Shoe Size:** US sizing estimation.
    -   **Typography:** Clean, minimalist text block positioning at the bottom of the composite.

6.  **FASHION INDUSTRY QUALITY STANDARDS:**
    -   **Magazine-Grade Photography:** Each pose must meet Vogue/Elle publication standards.
    -   **Professional Lighting:** Apply high-fashion studio lighting techniques.
    -   **Model Agency Quality:** Ensure composite meets top-tier agency submission requirements.
    -   **Commercial Viability:** Create a comp card suitable for Fashion Week casting submissions.

**PROFESSIONAL SAFETY STANDARDS:**
-   Preserve authentic ethnic characteristics while achieving fashion industry presentation standards.
-   Maintain subject dignity and professional modeling industry ethics.
-   Ensure all poses meet international modeling agency standards.

**OUTPUT DIRECTIVE:** Return exclusively the final single composite image featuring four professional poses with a statistics block, meeting all specified international modeling agency standards.`;

    const textPart = { text: prompt };

    console.log('[GeminiService] Sending image and Comp Card prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for Comp Card.', response);
    return handleApiResponse(response, 'comp-card');
};

/**
 * Generates a 3-view full body shot from an image.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the 3-view image.
 */
export const generateThreeViewShot = async (
    originalImage: File,
): Promise<string> => {
    console.log(`[GeminiService] Called generateThreeViewShot.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const prompt = `You are a master technical photographer specializing in professional figure reference documentation and anatomical photography for the fashion and entertainment industries. Create a comprehensive three-view technical reference sheet meeting professional industry standards.

**THREE-VIEW TECHNICAL DOCUMENTATION:**

1.  **CRITICAL DIRECTIVE: PERFECT IDENTITY PRESERVATION (NON-NEGOTIABLE):**
    -   **SOURCE OF TRUTH:** The face in the provided photograph is the absolute, unalterable source of truth for the subject's identity.
    -   **EXACT REPLICATION, NOT INTERPRETATION:** Your primary task is to perfectly replicate this exact face onto the front-facing pose. For the side-profile view, you must accurately reconstruct the profile based on the frontal features, maintaining all key proportions and characteristics (nose shape, chin, forehead). Do not interpret, re-render, or create a "similar" face.
    -   **PIXEL-LEVEL FIDELITY:** The subject's bone structure, skin texture, unique features, and the precise shape and spacing of facial features must be 100% consistent with the source image.
    -   **FAILURE CONDITION:** Any deviation in facial identity constitutes a complete failure. The person in all generated poses must be instantly and perfectly recognizable. This rule overrides all other stylistic instructions.

2.  **PROFESSIONAL THREE-VIEW SPECIFICATIONS:**
    -   **Front View (Anatomical Position):** Subject standing straight, facing forward with arms naturally at sides in neutral position
    -   **Side View (Profile Position):** Complete 90-degree profile showing full body silhouette and proportions
    -   **Back View (Posterior Position):** Direct rear view maintaining same neutral standing pose
    -   **Consistent Pose:** Maintain identical "anatomical reference" position across all three views for accurate comparison

3.  **TECHNICAL DOCUMENTATION STANDARDS:**
    -   **Professional Arrangement:** Present three views side-by-side in logical sequence (Side | Front | Back)
    -   **Uniform Scaling:** Ensure identical proportional scaling across all three figures
    -   **Consistent Lighting:** Apply professional studio lighting uniformly across all views
    -   **Technical Accuracy:** Maintain precise anatomical positioning for professional reference use

4.  **PROFESSIONAL WARDROBE SPECIFICATIONS:**
    -   **Male Attire:** Premium athletic shorts, briefs, or fitted athletic wear for clear physique documentation
    -   **Female Attire:** Professional sports bra and shorts, unitard, or elegant athletic wear showcasing body lines
    -   **Physique Documentation:** Attire must clearly display muscle definition, body proportions, and anatomical structure
    -   **Technical Purpose:** Clothing optimized for professional figure reference and proportion analysis

5.  **INDUSTRY-STANDARD PRESENTATION:**
    -   **Pure White Background:** Completely uniform white background meeting professional documentation standards
    -   **PNG Alpha Channel:** Output format optimized for professional use and versatility
    -   **High Resolution:** Technical documentation quality suitable for professional industry use
    -   **Clean Composition:** Eliminate all visual distractions for pure technical reference

6.  **PROFESSIONAL QUALITY ASSURANCE:**
    -   **Anatomical Accuracy:** Ensure poses meet technical reference standards used in fashion and entertainment
    -   **Proportional Consistency:** Maintain accurate body proportions across all three views
    -   **Technical Clarity:** Provide clear, unobstructed view of physique and body structure
    -   **Professional Standards:** Meet industry requirements for casting, costume design, and technical reference

**PROFESSIONAL SAFETY STANDARDS:**
-   Preserve authentic ethnic characteristics while achieving technical documentation standards
-   Maintain subject dignity and professional industry ethics
-   Ensure documentation meets legitimate professional reference requirements

**OUTPUT DIRECTIVE:** Return exclusively the final single composite image showing three professional views on pure white background meeting technical documentation standards.`;

    const textPart = { text: prompt };

    console.log('[GeminiService] Sending image and 3-View Shot prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for 3-View Shot.', response);
    return handleApiResponse(response, '3-view-shot');
};

/**
 * Generates an outpainted full-body image from a partial-body image.
 * @param originalImage The original image file.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the outpainted image.
 */
export const generateOutpaintedImage = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateOutpaintedImage.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    let prompt: string;
    if (outputAspectRatio && outputAspectRatio !== 'auto') {
        prompt = `You are a master-level professional photo compositor specializing in photorealistic, seamless outpainting and scene extension. Your task is to intelligently expand the provided image to a new aspect ratio of **${outputAspectRatio}**.
            
**CRITICAL DIRECTIVE:** The original image content must form the core of the new, larger image and must be perfectly preserved. The final composition must be natural and well-balanced.

**UNIVERSAL RULES:**
- **Contextual Awareness:** The generated content must always be a logical extension of the original scene.
- **Photorealism:** The final image must look like a single, original, unedited photograph.
- **Identity Preservation:** If people are present, their identity and appearance must not be changed.

**OUTPUT DIRECTIVE:**
Return only the final, complete image with the aspect ratio of ${outputAspectRatio}. Do not add any text.`;
    } else {
        prompt = `You are a master-level professional photo compositor specializing in photorealistic, seamless outpainting and scene extension.

**YOUR TASK:**
Intelligently expand the scene of the provided image.

**TWO SCENARIOS:**

1.  **IF THE IMAGE HAS TRANSPARENT AREAS:**
    -   Your only task is to photorealistically fill **ONLY** the transparent areas.
    -   The existing, non-transparent part of the image **MUST NOT BE ALTERED**. Preserve every pixel of the original content.
    -   The new content must be a seamless extension of the original, matching lighting, texture, and perspective.

2.  **IF THE IMAGE IS FULL-FRAME (NO TRANSPARENCY):**
    -   Intelligently expand the image on all sides to create a wider, more complete scene.
    -   The original image content should form the center of the new, larger image and must be perfectly preserved.
    -   The aspect ratio of the final output should be a standard photographic ratio that best fits the expanded content (e.g., 4:3, 3:2, 16:9).

**UNIVERSAL RULES:**
-   **Contextual Awareness:** The generated content must always be a logical extension of the original scene.
-   **Photorealism:** The final image must look like a single, original, unedited photograph.
-   **Identity Preservation:** If people are present, their identity and appearance must not be changed.

**OUTPUT DIRECTIVE:**
Return only the final, complete image. Do not add any text.`;
    }


    const textPart = { text: prompt };

    console.log('[GeminiService] Sending image and outpainting prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for outpainting.', response);
    return handleApiResponse(response, 'outpaint');
};

/**
 * Removes the background from an image using generative AI.
 * @param originalImage The original image file.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the image with a transparent background.
 */
export const generateRemovedBackgroundImage = async (
    originalImage: File,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateRemovedBackgroundImage.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const basePrompt = `You are a precision digital artist specializing in complex image segmentation and background removal for high-end commercial use. Your task is to execute a flawless extraction of the primary subject from its background.

**EXTRACTION DIRECTIVE: FLAWLESS BACKGROUND REMOVAL**

**TECHNICAL SPECIFICATIONS:**

1.  **SUBJECT ISOLATION (CRITICAL):**
    -   Identify and perfectly isolate the main foreground subject(s).
    -   The subject must be completely preserved with no alteration to its appearance, color, or texture.

2.  **PRECISION MASKING:**
    -   Create an ultra-precise alpha mask around the subject.
    -   Pay meticulous attention to complex edges, such as hair, fur, and semi-transparent objects. The edge quality must be professional-grade, with no jagged artifacts or halos.
    -   Handle fine details with surgical precision.

3.  **BACKGROUND REMOVAL:**
    -   Completely remove the original background. Every pixel not belonging to the subject must be eliminated.

**OUTPUT REQUIREMENTS (NON-NEGOTIABLE):**

-   **TRANSPARENT BACKGROUND:** The final output MUST have a fully transparent background.
-   **FORMAT:** The image must be a PNG with a valid alpha channel to support transparency.
-   **CLEAN EDGES:** The subject's silhouette must be clean, smooth, and perfectly anti-aliased against the transparent background.

**OUTPUT DIRECTIVE:** Return ONLY the final image of the subject on a transparent background. Do not include any text, explanations, or additional content.`;

    const fullPrompt = addAspectRatioToPrompt(basePrompt, outputAspectRatio);
    const textPart = { text: fullPrompt };

    console.log('[GeminiService] Sending image and background removal prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for background removal.', response);
    return handleApiResponse(response, 'remove-background');
};

/**
 * Generates an image from a different camera angle using a dynamic prompt.
 * @param originalImage The original image file.
 * @param prompt The dynamically generated prompt describing the new camera view and context.
 * @param outputAspectRatio The desired aspect ratio for the final output image.
 * @returns A promise that resolves to the data URL of the new image.
 */
export const generateMovedCameraImage = async (
    originalImage: File,
    prompt: string,
    outputAspectRatio: OutputAspectRatio = 'auto'
): Promise<string> => {
    console.log(`[GeminiService] Called generateMovedCameraImage with dynamic prompt.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const fullPrompt = addAspectRatioToPrompt(prompt, outputAspectRatio);
    const textPart = { text: fullPrompt };

    console.log('[GeminiService] Sending image and dynamic change view prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for moved camera.', response);
    return handleApiResponse(response, 'move-camera');
};

/**
 * Generates a detailed description of an image using generative AI.
 * @param imageToDescribe The image file to be described.
 * @returns A promise that resolves to the text description of the image.
 */
export const describeImage = async (
    imageToDescribe: File,
): Promise<string> => {
    console.log('[GeminiService] Called describeImage.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const imagePart = await fileToPart(imageToDescribe);

    const prompt = "You are an expert prompt engineer for advanced text-to-image AI models. Analyze the provided image and generate a concise, yet visually descriptive prompt that could be used to recreate it. The prompt should be a single paragraph. Focus on capturing the key elements: subject, action, setting, composition, lighting, and overall artistic style (e.g., 'photorealistic,' 'cinematic,' 'oil painting'). Structure the prompt as a series of descriptive phrases, separated by commas. Do not include any analysis, preamble, or explanations. Only output the final prompt.";

    const contents = { parts: [imagePart, { text: prompt }] };

    console.log('[GeminiService] Sending image to the model for description...');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
    });

    console.log('[GeminiService] Received description from model.', response);
    const descriptionText = response.text;

    if (!descriptionText || descriptionText.trim() === '') {
        throw new Error('The AI model did not return a description.');
    }

    return descriptionText.trim();
};


/**
 * Enhances a user's prompt using generative AI.
 * @param promptToEnhance The user's prompt text.
 * @returns A promise that resolves to the enhanced prompt string.
 */
export const enhancePrompt = async (
    promptToEnhance: string,
): Promise<string> => {
    console.log(`[GeminiService] Called enhancePrompt.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const metaPrompt = `You are a world-class expert prompt engineer specializing in advanced generative image models. Your task is to rewrite the following user's prompt to be more descriptive, clear, structured, and effective for generating a high-quality, photorealistic image.

**Instructions:**
1.  **Analyze Intent:** Deeply understand the user's core request.
2.  **Add Detail:** Elaborate on key elements. Specify lighting conditions (e.g., "soft morning light," "dramatic studio lighting"), camera details (e.g., "shot on a DSLR with a 85mm f/1.4 lens," "cinematic wide-angle shot"), composition (e.g., "rule of thirds," "centered close-up"), and artistic style (e.g., "hyperrealistic," "concept art," "vibrant synthwave aesthetic").
3.  **Preserve Core Subject:** The central subject and action requested by the user must be the primary focus of the rewritten prompt.
4.  **Structure for Clarity:** Use clear, concise language. You can use comma-separated keywords or descriptive sentences.
5.  **Output Format:** Respond ONLY with the rewritten prompt text. Do not include any pre-amble, post-amble, or explanations like "Here is the rewritten prompt:".

**User's Prompt to Enhance:**
"${promptToEnhance}"`;

    console.log('[GeminiService] Sending prompt to the model for enhancement...');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: metaPrompt,
    });
    
    console.log('[GeminiService] Received response from model for prompt enhancement.', response);
    const enhancedText = response.text;

    if (!enhancedText || enhancedText.trim() === '') {
        throw new Error('The AI model did not return an enhanced prompt. It might be a safety or content issue.');
    }
    
    return enhancedText.trim();
};

/**
 * Generates a short, descriptive title for a prompt using generative AI.
 * @param promptContent The full text of the prompt.
 * @returns A promise that resolves to the generated title string.
 */
export const generatePromptTitle = async (
    promptContent: string,
): Promise<string> => {
    console.log(`[GeminiService] Called generatePromptTitle.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const metaPrompt = `You are an expert at summarizing content. Analyze the following detailed prompt for an image generation model and create a short, descriptive title for it (4-5 words maximum). The title should capture the main essence of the prompt.

**Prompt to summarize:**
"${promptContent}"

**Output:**
Respond ONLY with the generated title text. Do not include any other words, preamble, or quotation marks.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: metaPrompt,
    });
    
    const generatedTitle = response.text;

    if (!generatedTitle || generatedTitle.trim() === '') {
        throw new Error('The AI model did not return a title.');
    }
    
    // Clean up potential markdown or quotes
    return generatedTitle.trim().replace(/["']/g, "");
};

/**
 * Generates a random, creative prompt for a camera move.
 * @returns A promise that resolves to the camera move description string.
 */
export const generateRandomCameraMovePrompt = async (): Promise<string> => {
    console.log(`[GeminiService] Called generateRandomCameraMovePrompt.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const metaPrompt = `You are a creative cinematographer AI. Your task is to generate a single, short, creative, and random instruction for changing a camera's perspective on a scene.

    The instruction should describe a cinematic shot type or camera movement.

    Here are some good examples of the kind of output you should provide:
    - "a dramatic low-angle shot looking up at the subject"
    - "a bird's-eye view looking directly down"
    - "a cinematic dutch angle shot"
    - "a dynamic dolly zoom effect, pulling the background closer"
    - "an extreme close-up on the subject's eyes"
    - "a wide shot from the far left side"
    - "a cinematic over-the-shoulder shot"
    - "a stunning long shot revealing the full landscape"
    - "a shaky, handheld point-of-view shot"

    Your response MUST be ONLY the instruction phrase itself. Do not include any preamble, explanations, or quotation marks.`;

    console.log('[GeminiService] Sending prompt to the model for random camera move...');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: metaPrompt,
    });
    
    console.log('[GeminiService] Received response from model for random camera move.', response);
    const randomPrompt = response.text;

    if (!randomPrompt || randomPrompt.trim() === '') {
        throw new Error('The AI model did not return a random prompt.');
    }
    
    return randomPrompt.trim().replace(/["']/g, "");
};


/**
 * Generates a composited image from multiple source images and a master prompt.
 * @param images An array of objects, each containing a File and its user-defined role.
 * @param masterPrompt The main instruction for how to combine the images.
 * @returns A promise that resolves to the data URL of the final composited image.
 */
export const generateCompositedImage = async (
    images: { file: File; role: string }[],
    masterPrompt: string
): Promise<string> => {
    console.log('[GeminiService] Called generateCompositedImage.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    // 1. Prepare all image parts in parallel
    const imageParts = await Promise.all(images.map(img => fileToPart(img.file)));

    // 2. Construct the detailed text prompt
    let textPrompt = `You are an expert AI photo compositor. Your task is to combine multiple image assets into a single, seamless, and photorealistic final image based on a master instruction.

**CRITICAL RULE: IDENTITY PRESERVATION**
If any of the image assets contain a person, you MUST preserve their exact facial features, ethnicity, and unique characteristics in the final output. Do not alter their identity.

---

**MASTER INSTRUCTION:**
${masterPrompt}

---

**IMAGE ASSETS:**
You are provided with the following image assets. The user has described the role for each one.
`;

    const allParts = [];
    images.forEach((image, index) => {
        textPrompt += `\n- [IMAGE ${index + 1}] Role: ${image.role}`;
        allParts.push(imageParts[index]);
    });

    allParts.push({ text: textPrompt });

    // 3. Send the request to the model
    console.log('[GeminiService] Sending multiple images and composed prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: allParts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('[GeminiService] Received response from model for composition.', response);
    return handleApiResponse(response, 'composition');
};

/**
 * Generates an image by transforming a subject image based on a reference image and a specified transform type.
 * @param subjectImage The primary image containing the subject or content.
 * @param referenceImage The secondary image providing the pose, clothing, style, or scene.
 * @param userPrompt Optional additional instructions.
 * @param transformType The type of transformation to perform.
 * @returns A promise that resolves to the data URL of the final image.
 */
export const generateGuidedTransform = async (
    subjectImage: File,
    referenceImage: File,
    userPrompt: string,
    transformType: TransformType
): Promise<string> => {
    console.log(`[GeminiService] Called generateGuidedTransform with type: ${transformType}.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const subjectImagePart = await fileToPart(subjectImage);
    const referenceImagePart = await fileToPart(referenceImage);

    let fullPrompt = '';

    switch (transformType) {
        case 'pose':
            fullPrompt = `You are a master AI digital artist specializing in photorealistic character recomposition. Your task is to extract a pose from a reference image and apply it to a subject from a source photograph, creating a new, seamless, and realistic photo.

**CRITICAL DIRECTIVES (NON-NEGOTIABLE):**
1.  **ABSOLUTE IDENTITY PRESERVATION:** The person in the final image MUST be the **exact same person** from the [SUBJECT IMAGE]. Do NOT alter their facial features, bone structure, ethnicity, unique characteristics, hairstyle, or clothing. The subject's entire appearance is the source of truth and must be perfectly replicated.
2.  **PHOTOREALISTIC OUTPUT:** The final output MUST be a **high-quality, realistic photograph**. The style, lighting, and quality must match the [SUBJECT IMAGE].
3.  **POSE REFERENCE ONLY:** The [REFERENCE IMAGE] is to be used **exclusively** as a reference for the body's pose. Completely ignore its artistic style, clothing, and subject identity.

**IMAGE ROLES:**
-   **[SUBJECT IMAGE]:** Provides the person's identity, face, clothing, hair, and the required **photorealistic style**.
-   **[REFERENCE IMAGE]:** Provides the physical pose **only**.

**INSTRUCTIONS:**
1.  Recreate the subject from the [SUBJECT IMAGE] in the exact pose shown in the [REFERENCE IMAGE].
2.  Maintain the original clothing, hair, and accessories from the [SUBJECT IMAGE].
3.  ${userPrompt ? `Apply the following user instructions: "${userPrompt}"` : 'Generate a simple, neutral studio background that complements the subject.'}

**OUTPUT DIRECTIVE:** Return only the final, composited, photorealistic image.`;
            break;

        case 'cloths':
            fullPrompt = `You are a master AI digital stylist and photo compositor. Your task is to perform a virtual "try-on" by taking only the clothing from a reference image and putting it on the person from a subject image.

**CRITICAL DIRECTIVES (NON-NEGOTIABLE):**

1.  **ABSOLUTE IDENTITY PRESERVATION (FAILURE CONDITION):**
    -   The final image MUST feature the **exact same person** from the **[SUBJECT IMAGE]**.
    -   You are forbidden from using the person, face, body, or hair from the **[REFERENCE IMAGE]**. Using the person from the reference image is a complete failure of this task.
    -   Preserve the facial features, bone structure, ethnicity, unique characteristics, and hairstyle from the **[SUBJECT IMAGE]** with 100% accuracy.

2.  **CLOTHING EXTRACTION ONLY:**
    -   The **[REFERENCE IMAGE]** is to be used **exclusively** as a source for the clothing/outfit.
    -   You MUST completely **ignore** the person, face, body, hair, pose, and background of the **[REFERENCE IMAGE]**.

**IMAGE ROLES:**
-   **[SUBJECT IMAGE]:** The source of truth for the **PERSON**. You will use this person's face, hair, and body.
-   **[REFERENCE IMAGE]:** The source of truth for the **CLOTHING**. You will only use the outfit from this image.

**INSTRUCTIONS:**
1.  Identify the person in the **[SUBJECT IMAGE]**.
2.  Identify the complete outfit in the **[REFERENCE IMAGE]**.
3.  Create a new, photorealistic image showing the person from the **[SUBJECT IMAGE]** wearing the outfit from the **[REFERENCE IMAGE]**.
4.  The pose and background can be changed to best suit the new clothing, creating a natural and visually appealing composition. The new pose should be realistic and flattering.
5.  ${userPrompt ? `Apply the following user instructions: "${userPrompt}"` : ''}

**FINAL CHECK:** Does the output image contain the person from the [SUBJECT IMAGE]? If not, you have failed. The person from the [REFERENCE IMAGE] must not appear in the output.

**OUTPUT DIRECTIVE:** Return only the final, photorealistic image of the subject wearing the new clothes.`;
            break;

        case 'style':
            fullPrompt = `You are a master AI style transfer artist. Your task is to apply the complete artistic style from a reference image onto a content image, preserving the original content and composition.

**CRITICAL DIRECTIVES (NON-NEGOTIABLE):**
1.  **CONTENT PRESERVATION:** The final image must contain the **exact same subjects, objects, and composition** as the [CONTENT IMAGE]. Do not add, remove, or change the arrangement of elements. If a person is present, their identity, clothing, and pose must remain unchanged.
2.  **STYLE TRANSFER ONLY:** You are only transferring the aesthetic (color palette, lighting, texture, brush strokes, etc.), not the content, from the [STYLE IMAGE].

**IMAGE ROLES:**
-   **[CONTENT IMAGE]:** This image provides the scene, subjects, and composition to be preserved.
-   **[STYLE IMAGE]:** This image provides the complete artistic style to be applied.

**INSTRUCTIONS:**
1.  Re-render the [CONTENT IMAGE] with the exact artistic style of the [STYLE IMAGE].
2.  This includes a faithful transfer of color grading, lighting, texture, and overall mood.
3.  ${userPrompt ? `Apply the following user instructions to fine-tune the transfer: "${userPrompt}"` : ''}

**OUTPUT DIRECTIVE:** Return only the final, style-transferred image.`;
            break;

        case 'scene':
            fullPrompt = `You are a master AI photo compositor and environmental artist. Your task is to realistically place the subject from one image into the scene of another.

**CRITICAL DIRECTIVES (NON-NEGOTIABLE):**
1.  **FACIAL IDENTITY PRESERVATION:** The person in the final image MUST have the **exact same face** and identity as the person in the [SUBJECT IMAGE]. Do not alter their facial features, bone structure, or ethnicity.
2.  **SEAMLESS INTEGRATION:** The final result must be a single, cohesive, and photorealistic image. The lighting, shadows, perspective, and scale of the subject must perfectly match the new environment.

**IMAGE ROLES:**
-   **[SUBJECT IMAGE]:** This image provides the person/object to be placed in the new scene.
-   **[SCENE IMAGE]:** This image provides the new background and environment.

**INSTRUCTIONS:**
1.  Seamlessly and realistically composite the person from the [SUBJECT IMAGE] into the environment from the [SCENE IMAGE].
2.  The subject's clothing and hairstyle **MAY BE MODIFIED** to logically fit the new scene (e.g., a winter coat in a snowy scene, a swimsuit at a beach).
3.  The lighting on the subject MUST be re-rendered to match the lighting of the new scene.
4.  ${userPrompt ? `Apply the following user instructions for the composition: "${userPrompt}"` : ''}

**OUTPUT DIRECTIVE:** Return only the final, seamlessly composited, photorealistic image.`;
            break;
    }

    const allParts = [subjectImagePart, referenceImagePart, { text: fullPrompt }];

    console.log(`[GeminiService] Sending images and prompt to the model for guided transform (${transformType})...`);
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: allParts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log(`[GeminiService] Received response from model for guided transform (${transformType}).`, response);
    return handleApiResponse(response, `guided-transform-${transformType}`);
};