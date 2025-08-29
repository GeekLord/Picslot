/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

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
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- YOU MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates an auto-enhanced image using generative AI.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the enhanced image.
 */
export const generateAutoEnhancedImage = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting auto-enhancement`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are a world-class AI photo editor. Your task is to perform a comprehensive, automatic enhancement of the provided image to elevate it to professional, studio quality.

**Core Enhancement Guidelines:**

1.  **Masterful Lighting Correction:** This is your highest priority.
    *   **Fix Overexposure & Highlights:** Identify and correct any blown-out highlights or areas of overexposure. Recover detail in these bright areas.
    *   **Balance Shadows:** Lift harsh, dark shadows, especially on faces, to reveal detail without making the image look flat.
    *   **Apply Natural Studio Light:** Re-light the entire image with even, flattering, and natural-looking light, similar to a professional studio setup. The final lighting should be balanced and make the subject look their best.
2.  **Enhance Clarity & Detail:** Subtly increase the overall sharpness and clarity of the image. Bring out fine details in hair, eyes, and clothing to make the image crisp and high-definition.
3.  **Vibrant & Natural Colors:** Adjust the color balance to be vibrant, rich, and true-to-life. Correct any unnatural color casts.
4.  **Intelligent Composition Enhancement (Optional):** If the original composition is tightly cropped or awkward, intelligently extend the image's background to create a more balanced and aesthetically pleasing frame (zoom out/uncrop). The extended background must be realistic, high-quality, and contextually appropriate.
5.  **Absolute Identity Preservation:** This is a critical rule. The main subject/person MUST remain **exactly** the same. Do not alter their facial features, identity, expression, bone structure, or unique characteristics. The enhanced person must be perfectly recognizable as the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final enhanced image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and auto-enhance prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for auto-enhancement.', response);
    
    return handleApiResponse(response, 'auto-enhance');
};

/**
 * Restores an old or damaged image using generative AI.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the restored image.
 */
export const generateRestoredImage = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting image restoration`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are a world-class photo restoration AI, specializing in creating flawless, photorealistic restorations. Your task is to restore the provided image, which may be old, low-quality, dark, overexposed, or damaged, to a perfect, modern, studio-quality state.

**Core Restoration Guidelines:**

1.  **Flawless Imperfection Removal:** Eradicate all signs of damage. This includes scratches, dust, tears, stains, noise, grain, and digital compression artifacts. The result must be perfectly clean.
2.  **Extreme Detail & Clarity:** Dramatically enhance the resolution and sharpness. The main subject, especially the face and eyes, must be in crisp, perfect focus. Bring out fine details like hair strands and fabric textures.
3.  **Studio-Quality Lighting & Color:**
    *   **Color Correction:** Restore faded colors to be natural, balanced, and vibrant. Eliminate any color casts or shifts.
    *   **Lighting Correction:** Masterfully balance the lighting. Correct under-exposure (darkness) and over-exposure (blown highlights). Soften harsh shadows on faces to be more flattering, like professional portrait lighting.
4.  **Absolute Identity Preservation:** This is the most critical rule. The main subject/person MUST remain **exactly** the same. Do not alter their facial features, identity, expression, bone structure, or unique characteristics. The restored person must be perfectly recognizable as the original.
5.  **Natural Textures:** Preserve and enhance natural textures. For portraits, skin should look realistic and retain its natural texture, not overly smoothed or "plastic".
6.  **Intelligent Composition Enhancement (Optional):** If the original composition is tightly cropped, intelligently extend the image's background to create a more balanced and aesthetically pleasing frame (zoom out/uncrop). The extended background must be realistic and contextually appropriate.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final restored image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and restoration prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for restoration.', response);
    
    return handleApiResponse(response, 'restoration');
};

/**
 * Generates a studio-quality portrait from an image.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the portrait image.
 */
export const generateStudioPortrait = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting studio portrait generation`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are a world-class AI portrait photographer specializing in creating official, high-quality portraits suitable for passports, visas, and professional profiles like LinkedIn.

**Your task is to transform the provided image by following these rules precisely:**

**RULE 1: ABSOLUTE IDENTITY PRESERVATION (MOST IMPORTANT)**
The person in the final portrait MUST be **perfectly and EXACTLY** the same as in the original photo. Do NOT alter their facial features, bone structure, unique characteristics, expression, or identity in any way. They must be 100% recognizable.

**RULE 2: ENHANCE AND RESTORE FIRST**
If the input image is of poor quality (e.g., blurry, noisy, grainy, bad lighting, has scratches), your first step is to restore it to a high-definition, clean, and sharp state. Correct any lighting issues like overexposure or harsh shadows.

**RULE 3: CREATE THE STUDIO PORTRAIT**
After ensuring the image quality is high, apply the following transformations:
*   **Composition:** Re-frame the image into a professional **half-body portrait**. The person must be centered, with their head and shoulders clearly visible. This is a strict requirement for a passport-style photo.
*   **Pose & Gaze:** This is crucial for a professional passport-style portrait.
    *   **Body Posture:** The person's body and shoulders must be squared and facing directly forward towards the camera. Correct any leaning or angled postures.
    *   **Head Position:** The head must be held straight and level, not tilted to the side, up, or down.
    *   **Gaze:** The person must be looking directly forward into the camera lens.
    *   **Neutral Arms:** The pose must be neutral. If the subject's hands are touching their face or head, or are raised in a non-neutral pose, you MUST realistically reposition their arms to a relaxed, neutral position at their sides, completely out of the frame. The face and shoulders must be completely unobstructed.
*   **Lighting:** Apply even, flattering, professional studio lighting to the person.
*   **Background:** Completely replace the original background with a uniform, single-color, and softly blurred background (bokeh effect). Use a neutral color like light gray, professional blue, or off-white.
*   **Appearance & Grooming for Perfection:**
    *   **Attire:** Replace the original clothing with simple, professional attire (e.g., a solid dark-colored shirt/blouse). The clothing must be appropriate for an official ID photo.
    *   **Accessories:** Remove any distracting accessories like large earrings, necklaces, or hats.
    *   **Hair:** Neatly groom the hair, taming any stray or flyaway strands.
    *   **Expression:** Ensure the final expression is neutral, as required for official photos.

**FINAL CHECK:** Before outputting, confirm that RULE 1 (Absolute Identity Preservation) has been followed perfectly. The person's face must be untouched.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

**Output:** Return ONLY the final, edited portrait image. Do not return any text.`;
    const textPart = { text: prompt };

    console.log('Sending image and studio portrait prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for studio portrait.', response);
    
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
    console.log(`Starting Comp Card generation`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an elite AI art director and graphic designer, specializing in creating industry-standard modeling composite cards (comp cards). Your primary directive is to ensure the model's facial identity is perfectly preserved and rendered with extreme clarity across multiple poses.

**Your task is to transform the single provided image of a person into a complete, professional 4-shot modeling comp card, formatted as a single composite image.**

**CRITICAL RULE 1: ABSOLUTE FACIAL PRESERVATION & ULTRA-HIGH DEFINITION (NON-NEGOTIABLE)**
*   The face of the person in the original uploaded image is the absolute source of truth.
*   In **ALL FOUR** generated images on the comp card, the person's face MUST be a **PERFECT, IDENTICAL, FLAWLESS, and CRYSTAL-CLEAR** replica of the original.
*   There shall be NO alterations, changes, or modifications to the facial features, bone structure, expression, or unique identity. The likeness must be 100% exact.
*   All faces must be rendered in ultra-high definition. **There must be no blurriness or loss of facial detail.** This is the most important success metric.

**CRITICAL RULE 2: DYNAMIC COLLAGE COMPOSITION ON A WHITE BACKGROUND**
*   **Final Output:** You must generate a single, vertically oriented composite image. The entire image must have a **seamless, clean, and pure white background.**
*   **Composition Technique:** To avoid overlapping issues, you must first conceptually generate each of the four required poses as if they have a **transparent background**. Then, you will artfully arrange and composite these four 'cutout' poses onto the final pure white canvas. This is crucial for creating a dynamic layout where poses can be placed closely or even overlap slightly without one image's rectangular background blocking another.
*   **Layout:** The final arrangement must be a **dynamic and artful collage that utilizes the maximum available space. AVOID a rigid grid at all costs.** The individual poses should be composed together harmoniously, like a professional magazine layout.
*   **Required Poses:** The collage must contain four distinct poses:
    1.  **Main Headshot:** A professional, forward-facing studio headshot (shoulders up).
    2.  **Full-Body Shot:** A full-length, standing studio shot.
    3.  **Three-Quarter Shot:** A shot from the knees up, in a different pose.
    4.  **Profile Shot:** A side-view profile shot of the head and shoulders.
*   **Text Block:** At the bottom of the composite image, include a clean, minimalist text block with the model's estimated statistics.

**CRITICAL RULE 3: PROFESSIONAL WARDROBE**
*   For all four poses, realistically replace the subject's original clothing with a consistent, professional, industry-standard wardrobe.
    *   Replace the subject's original clothing with minimalist, form-fitting athletic wear or simple swimwear.
    *   For males, this could be athletic shorts or briefs.
    *   For females, this could be a simple sports bra and shorts, a unitard, or a basic bikini.
    *   The attire's purpose is to clearly and accurately showcase the model's physique, muscle definition, and body shape without distraction.
    *   The clothing must appear natural, flattering, and be consistent across all four shots to create a cohesive look.

**CRITICAL RULE 4: ESTIMATE PHYSICAL ATTRIBUTES**
*   Based on your visual analysis of the original photo, provide realistic estimates for the following professional modeling statistics in the text block at the bottom:
    *   Height (in feet/inches and cm)
    *   Measurements (Bust-Waist-Hips in inches)
    *   Hair Color
    *   Eye Color
    *   Shoe Size (US)

**Final Output Instructions:**
*   Assemble the four poses and the statistics text block into a single, professional, vertically-oriented comp card image with a dynamic collage layout on a pure white background, using the transparent background composition technique described in RULE 2.
*   The final output must be ONE single image file. Do not return text.

Safety & Ethics Policy:
- Do not change the person's fundamental race or ethnicity.

**Output:** Return ONLY the final, single composite image showing the four poses and the statistics block.`;
    const textPart = { text: prompt };

    console.log('Sending image and Comp Card prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for Comp Card.', response);
    
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
    console.log(`Starting 3-View Shot generation`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an elite AI art director and graphic designer, specializing in creating industry-standard modeling composite cards (comp cards) and photoshoots. Your task is to transform a single user-uploaded image into a high-resolution full-body, three-view turnaround of the person. Your primary directive is to ensure the model's facial identity is perfectly preserved and rendered with extreme clarity across three-view full body shot on a white background.
    
**Objective:** From a user-uploaded image, generate a full-body, three-view turnaround of the person. The final image should feature the subject in a neutral standing pose from the front, side, and back, dressed in form-fitting attire on a white background.

**Core Instructions:**

1.  **Preserve Exact Facial Identity:** Analyze the face in the user's uploaded image. It is critical that you lock and perfectly replicate the subject's facial features, structure, and identity across all generated views. No alteration of the face is permitted.

2.  **Generate Three Specific Views:** Create three distinct, full-body shots of the person and present them side-by-side in a single image.
    *   **Front View:** The person standing straight, facing forward, with arms at their sides (similar to a soldier at attention or a T-pose).
    *   **Side View:** A complete profile shot of the person standing in the same neutral pose.
    *   **Back View:** A shot from directly behind, again in the same neutral standing pose.

3.  **Standardize the Pose:** The subject must maintain a consistent, neutral, "anatomical" or "soldier at attention" pose across all three views to ensure a clear and comparable representation of their physique.

4.  **Modify Clothing for Physique:**
    *   Replace the subject's original clothing with minimalist, form-fitting athletic wear or simple swimwear.
    *   For males, this could be athletic shorts or briefs.
    *   For females, this could be a simple sports bra and shorts, a unitard, or a basic bikini.
    *   The attire's purpose is to clearly and accurately showcase the model's physique, muscle definition, and body shape without distraction.

5.  **Ensure a White Background:** The final generated image must have a completely white background. This is essential for versatility and professional use. The output format MUST be a PNG with an alpha channel.

6.  **Final Output:**
    *   Combine the front, side, and back views into a single, cohesive, high-resolution image file.
    *   The views should be arranged logically (e.g., Side | Front | Back).
    *   Ensure consistent lighting and proportion across all three figures in the final output.

Safety & Ethics Policy:
- Do not change the person's fundamental race or ethnicity.

Output: Return ONLY the final, single composite image showing the three poses on a white background. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and 3-View Shot prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for 3-View Shot.', response);
    
    return handleApiResponse(response, '3-view-shot');
};