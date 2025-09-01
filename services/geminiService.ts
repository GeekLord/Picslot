/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

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
 * Generates an edited image using generative AI. The function handles both global edits
 * and inpainting. For inpainting, the input image should have a transparent area.
 * @param imageToEdit The image file to be edited. For inpainting, this image must have a transparent region.
 * @param userPrompt The text prompt describing the desired edit. For inpainting, this should include instructions to fill the transparent area.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    imageToEdit: File,
    userPrompt: string,
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const imagePart = await fileToPart(imageToEdit);

    const fullPrompt = `You are a master-level professional photo editor and creative artist. Execute a sophisticated edit based on the user's request.

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

    const contents = { parts: [imagePart, { text: fullPrompt }] };

    console.log('Sending image and prompt to the model for editing...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: contents,
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
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

    const prompt = `You are an elite cinematographer and color grading specialist with expertise in professional film and photography post-processing. Apply a sophisticated stylistic treatment to the entire image while maintaining photographic integrity.

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

    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
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

    const prompt = `You are a master photography technician specializing in professional image correction and global enhancement. Execute comprehensive adjustments across the entire image using industry-standard techniques.

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

    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
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

    const prompt = `You are a world-renowned master photographer and digital artist with expertise in transforming images to museum-quality, award-winning standards. Execute a comprehensive enhancement that elevates this image to professional exhibition quality.

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

    const textPart = { text: prompt };

    console.log('Sending image and auto-enhance prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
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

    const prompt = `You are a world-class master conservator and digital restoration artist specializing in museum-quality photo restoration. Transform this damaged, aged, or low-quality image into a pristine, archival-standard photograph using the most advanced restoration techniques.

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

    const textPart = { text: prompt };

    console.log('Sending image and restoration prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
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

    const prompt = `You are a master portrait photographer specializing in official government documentation, executive headshots, and professional credentials. Your task is to transform the provided image into a flawless, official-standard portrait, suitable for passports, visas, or corporate profiles, by re-posing the subject while meticulously preserving their identity, clothing, and hair.

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

    const textPart = { text: prompt };

    console.log('Sending image and studio portrait prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
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

    console.log('Sending image and Comp Card prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
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

    console.log('Sending image and 3-View Shot prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('Received response from model for 3-View Shot.', response);
    return handleApiResponse(response, '3-view-shot');
};

/**
 * Generates an outpainted full-body image from a partial-body image.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the outpainted image.
 */
export const generateOutpaintedImage = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting full-body outpainting`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const prompt = `You are a master digital artist and photo compositor, specializing in photorealistic outpainting and scene extension. Your task is to intelligently extend the canvas of the provided image to reveal the subject's full body, seamlessly continuing the existing scene, clothing, and pose.

**OUTPAINTING DIRECTIVE: FULL BODY REVEAL**

**CORE REQUIREMENTS:**

1.  **ABSOLUTE IDENTITY & APPEARANCE PRESERVATION (CRITICAL):**
    - **FACIAL & UPPER BODY INTEGRITY (NON-NEGOTIABLE):** The subject's face, hair, clothing, and all visible parts in the original image MUST remain 100% unchanged and pixel-perfect. Do not re-render or alter the existing portion of the image.
    - **AUTHENTICITY:** Preserve original skin texture, ethnic characteristics, and unique identifying traits. The person must be perfectly recognizable as the same individual.

2.  **SEAMLESS OUTFIT & POSE CONTINUATION:**
    - **CLOTHING COMPLETION:** Logically and realistically complete the subject's clothing. If they are wearing a t-shirt, extend it downwards. If they are wearing jeans, generate the rest of their pants and shoes, ensuring the style is consistent.
    - **POSE REALISM:** Continue the subject's pose in a natural and physically plausible way. If they are standing, generate their legs and feet in a stable standing position.
    - **ANATOMICAL ACCURACY:** Ensure the generated body parts (legs, arms, feet) are anatomically correct and proportional to the visible upper body.

3.  **PHOTOREALISTIC BACKGROUND EXTENSION:**
    - **SCENE CONTINUATION:** Seamlessly extend the existing background. Maintain consistent lighting, shadows, textures, and perspective. The transition between the original image and the generated area must be undetectable.
    - **ENVIRONMENTAL LOGIC:** The extended background should be a logical continuation of the original scene.

4.  **TECHNICAL EXECUTION & COMPOSITION:**
    - **ASPECT RATIO:** Adjust the image's aspect ratio (likely making it taller) to accommodate the full body view. A standard portrait aspect ratio like 2:3 or 3:4 is preferred.
    - **CENTERING:** Ensure the final full-body subject is well-composed and centered within the new frame.
    - **QUALITY:** Maintain the highest photographic quality. The final image should look like a single, original, unedited photograph.

**OUTPUT DIRECTIVE:** Return exclusively the final outpainted image showing the full body of the subject. The original portion of the image must be perfectly preserved. No text or explanations.`;

    const textPart = { text: prompt };

    console.log('Sending image and outpainting prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('Received response from model for outpainting.', response);
    return handleApiResponse(response, 'outpaint');
};

/**
 * Removes the background from an image using generative AI.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the image with a transparent background.
 */
export const generateRemovedBackgroundImage = async (
    originalImage: File,
): Promise<string> => {
    console.log(`Starting background removal`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const prompt = `You are a precision digital artist specializing in complex image segmentation and background removal for high-end commercial use. Your task is to execute a flawless extraction of the primary subject from its background.

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

    const textPart = { text: prompt };

    console.log('Sending image and background removal prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    console.log('Received response from model for background removal.', response);
    return handleApiResponse(response, 'remove-background');
};