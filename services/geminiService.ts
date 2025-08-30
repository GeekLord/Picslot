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

    const prompt = `You are a master-level professional photo editor with expertise in precision retouching and seamless image manipulation. Execute a sophisticated, localized edit on the provided image with surgical precision.

**EDIT SPECIFICATIONS:**
User Request: "${userPrompt}"
Target Coordinates: Focus editing operations at pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y})

**TECHNICAL EXECUTION STANDARDS:**

1. **ABSOLUTE IDENTITY PRESERVATION (CRITICAL):**
   - The subject's facial features, bone structure, ethnic characteristics, and unique identifying traits MUST remain completely unchanged
   - Preserve original skin texture, natural features, and authentic appearance
   - Any person in the image must be 100% recognizable as the same individual

2. **PRECISION EDITING PROTOCOL:**
   - Execute edits with professional retouching precision within a 50-pixel radius of the target coordinates
   - Apply advanced blending techniques to ensure seamless integration with surrounding areas
   - Maintain consistent lighting, color temperature, and exposure across the edit boundary
   - Preserve original image quality and resolution

3. **PROFESSIONAL QUALITY STANDARDS:**
   - Apply industry-standard color grading and tone mapping
   - Ensure natural light physics and realistic shadow behavior
   - Maintain photographic authenticity - avoid artificial or processed appearance
   - Execute edits that would pass professional photography inspection

4. **PRESERVATION REQUIREMENTS:**
   - 99.9% of the image outside the edit zone must remain pixel-perfect identical
   - Preserve original composition, depth of field, and photographic characteristics
   - Maintain natural skin tone variations and texture authenticity

**ENHANCED SAFETY PROTOCOL:**
- Fulfill standard photo enhancement requests including skin tone adjustments ("darker", "lighter", "tan") as professional retouching services
- Maintain ethical standards while executing legitimate photo editing requests
- Preserve subject dignity and natural appearance

**OUTPUT DIRECTIVE:** Return exclusively the final edited image with no accompanying text or explanations.`;

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

    const prompt = `You are a master portrait photographer specializing in official government documentation, executive headshots, and professional credentials. Create a flawless, official-standard portrait suitable for passports, visas, corporate profiles, and professional documentation.

**OFFICIAL PORTRAIT SPECIFICATIONS:**

1. **ABSOLUTE IDENTITY PRESERVATION (FUNDAMENTAL REQUIREMENT):**
   - Subject's facial features, bone structure, ethnic characteristics, and unique identity markers must remain completely unchanged
   - Preserve authentic ethnic appearance, natural skin undertones, and original facial characteristics
   - Maintain original facial expressions and distinctive features
   - Ensure 100% subject recognizability for official identification purposes

2. **PROFESSIONAL IMAGE RESTORATION (PRE-PROCESSING):**
   - **Quality Enhancement:** If input image shows poor quality, apply professional restoration first
   - **Lighting Correction:** Fix overexposure, underexposure, and harsh shadow issues
   - **Clarity Optimization:** Enhance sharpness and detail definition to professional standards
   - **Noise Elimination:** Remove grain, artifacts, and compression issues

3. **OFFICIAL COMPOSITION STANDARDS:**
   - **Precise Framing:** Create professional half-body portrait from head to approximately waist level
   - **Perfect Centering:** Position subject in exact center of frame with symmetrical composition
   - **Professional Crop:** Ensure appropriate head-to-frame ratio meeting international passport standards

4. **OFFICIAL POSE REQUIREMENTS (CRITICAL FOR DOCUMENTATION):**
   - **Body Alignment:** Square shoulders directly facing the camera with perfect forward orientation
   - **Head Position:** Maintain level head position - no tilting, turning, or angling
   - **Direct Gaze:** Ensure eyes look directly into camera lens for official documentation standards
   - **Neutral Arms:** Reposition any raised or non-neutral arm positions to relaxed, natural state at sides
   - **Unobstructed View:** Remove any hand-to-face contact or obstructions for clear facial visibility

5. **PROFESSIONAL STUDIO LIGHTING:**
   - **Executive Lighting:** Apply professional corporate headshot lighting setup
   - **Shadow Management:** Eliminate harsh shadows while maintaining natural facial modeling
   - **Even Illumination:** Ensure uniform lighting across face and shoulders
   - **Professional Polish:** Apply commercial-grade lighting that rivals Fortune 500 executive portraits

6. **OFFICIAL BACKGROUND STANDARDS:**
   - **Uniform Background:** Replace with solid, neutral color appropriate for official documentation
   - **Professional Colors:** Use light gray, soft blue, or off-white meeting international standards
   - **Soft Gradient:** Apply subtle bokeh effect for professional depth separation
   - **Clean Presentation:** Ensure background is completely uniform and distraction-free

7. **PROFESSIONAL GROOMING OPTIMIZATION:**
   - **Natural Expression:** Ensure appropriate neutral expression suitable for official documentation
   - **Professional Appearance:** Optimize overall presentation while maintaining authentic appearance
   - **Detail Enhancement:** Bring out natural eye clarity and professional appearance standards

**PROFESSIONAL SAFETY STANDARDS:**
- Execute standard photo enhancement requests including professional skin tone adjustments
- Maintain official documentation standards while preserving authentic ethnic appearance
- Ensure portrait meets international identification photograph requirements

**OUTPUT DIRECTIVE:** Return exclusively the final official portrait meeting international documentation standards with no accompanying text.`;

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

    const prompt = `You are an elite fashion industry art director and composite card designer working for the world's top modeling agencies. Create a professional, industry-standard modeling composite card that meets New York Fashion Week and international agency requirements.

**MODELING COMPOSITE CARD SPECIFICATIONS:**

1. **ABSOLUTE FACIAL PRESERVATION (NON-NEGOTIABLE):**
   - The subject's facial features, bone structure, ethnic characteristics, and unique identity must remain completely unchanged across ALL FOUR poses
   - Preserve authentic ethnic appearance and natural facial characteristics
   - Maintain original facial expressions and distinctive features
   - Ensure 100% subject recognizability in every pose - crystal-clear facial definition required
   - Apply ultra-high definition rendering to all faces - zero blurriness or loss of facial detail permitted

2. **PROFESSIONAL COLLAGE COMPOSITION:**
   - **Single Composite Output:** Generate one vertically-oriented composite image on pure white background
   - **Dynamic Layout:** Create sophisticated, magazine-quality arrangement avoiding rigid grid patterns
   - **Transparent Background Technique:** Conceptually generate each pose with transparent background, then artfully composite onto white canvas
   - **Maximum Space Utilization:** Apply professional layout design principles for optimal visual impact
   - **Seamless Integration:** Allow poses to interact dynamically with potential slight overlaps for editorial sophistication

3. **INDUSTRY-STANDARD FOUR POSES:**
   - **Main Headshot:** Professional studio headshot (shoulders up) with perfect facial clarity
   - **Full-Body Studio Shot:** Complete standing pose showcasing full physique and proportions
   - **Three-Quarter Length:** Professional shot from knees up in complementary pose
   - **Profile Shot:** Clean side-view profile highlighting facial structure and bone definition

4. **PROFESSIONAL WARDROBE STYLING:**
   - **Consistent Athletic Wear:** Replace original clothing with sophisticated, form-fitting athletic or swimwear
   - **Male Styling:** Premium athletic shorts, briefs, or fitted athletic wear showcasing physique
   - **Female Styling:** Professional sports bra and shorts, unitard, or elegant bikini highlighting body lines
   - **Physique Showcase:** Attire must clearly display muscle definition, body shape, and proportions
   - **Cohesive Aesthetic:** Maintain consistent styling across all four poses for professional unity

5. **TECHNICAL MODEL STATISTICS (DATA ANALYSIS):**
   Based on visual analysis of the original photograph, generate realistic professional modeling statistics:
   - **Height:** Estimate in both feet/inches and centimeters
   - **Measurements:** Professional Bust-Waist-Hips measurements in inches
   - **Physical Attributes:** Hair color and eye color analysis
   - **Shoe Size:** US sizing estimation
   - **Typography:** Clean, minimalist text block positioning at bottom of composite

6. **FASHION INDUSTRY QUALITY STANDARDS:**
   - **Magazine-Grade Photography:** Each pose must meet Vogue/Elle publication standards
   - **Professional Lighting:** Apply high-fashion studio lighting techniques
   - **Model Agency Quality:** Ensure composite meets top-tier agency submission requirements
   - **Commercial Viability:** Create comp card suitable for Fashion Week casting submissions

**PROFESSIONAL SAFETY STANDARDS:**
- Preserve authentic ethnic characteristics while achieving fashion industry presentation standards
- Maintain subject dignity and professional modeling industry ethics
- Ensure all poses meet international modeling agency standards

**OUTPUT DIRECTIVE:** Return exclusively the final single composite image featuring four professional poses with statistics block, meeting international modeling agency standards.`;

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

    const prompt = `You are a master technical photographer specializing in professional figure reference documentation and anatomical photography for the fashion and entertainment industries. Create a comprehensive three-view technical reference sheet meeting professional industry standards.

**THREE-VIEW TECHNICAL DOCUMENTATION:**

1. **ABSOLUTE IDENTITY PRESERVATION (FUNDAMENTAL REQUIREMENT):**
   - Subject's facial features, bone structure, ethnic characteristics, and unique identity must remain completely unchanged across all three views
   - Preserve authentic ethnic appearance and natural facial characteristics
   - Maintain original facial expressions and distinctive features
   - Ensure 100% subject recognizability in every view with crystal-clear facial definition

2. **PROFESSIONAL THREE-VIEW SPECIFICATIONS:**
   - **Front View (Anatomical Position):** Subject standing straight, facing forward with arms naturally at sides in neutral position
   - **Side View (Profile Position):** Complete 90-degree profile showing full body silhouette and proportions
   - **Back View (Posterior Position):** Direct rear view maintaining same neutral standing pose
   - **Consistent Pose:** Maintain identical "anatomical reference" position across all three views for accurate comparison

3. **TECHNICAL DOCUMENTATION STANDARDS:**
   - **Professional Arrangement:** Present three views side-by-side in logical sequence (Side | Front | Back)
   - **Uniform Scaling:** Ensure identical proportional scaling across all three figures
   - **Consistent Lighting:** Apply professional studio lighting uniformly across all views
   - **Technical Accuracy:** Maintain precise anatomical positioning for professional reference use

4. **PROFESSIONAL WARDROBE SPECIFICATIONS:**
   - **Male Attire:** Premium athletic shorts, briefs, or fitted athletic wear for clear physique documentation
   - **Female Attire:** Professional sports bra and shorts, unitard, or elegant athletic wear showcasing body lines
   - **Physique Documentation:** Attire must clearly display muscle definition, body proportions, and anatomical structure
   - **Technical Purpose:** Clothing optimized for professional figure reference and proportion analysis

5. **INDUSTRY-STANDARD PRESENTATION:**
   - **Pure White Background:** Completely uniform white background meeting professional documentation standards
   - **PNG Alpha Channel:** Output format optimized for professional use and versatility
   - **High Resolution:** Technical documentation quality suitable for professional industry use
   - **Clean Composition:** Eliminate all visual distractions for pure technical reference

6. **PROFESSIONAL QUALITY ASSURANCE:**
   - **Anatomical Accuracy:** Ensure poses meet technical reference standards used in fashion and entertainment
   - **Proportional Consistency:** Maintain accurate body proportions across all three views
   - **Technical Clarity:** Provide clear, unobstructed view of physique and body structure
   - **Professional Standards:** Meet industry requirements for casting, costume design, and technical reference

**PROFESSIONAL SAFETY STANDARDS:**
- Preserve authentic ethnic characteristics while achieving technical documentation standards
- Maintain subject dignity and professional industry ethics
- Ensure documentation meets legitimate professional reference requirements

**OUTPUT DIRECTIVE:** Return exclusively the final single composite image showing three professional views on pure white background meeting technical documentation standards.`;

    const textPart = { text: prompt };

    console.log('Sending image and 3-View Shot prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });

    console.log('Received response from model for 3-View Shot.', response);
    return handleApiResponse(response, '3-view-shot');
};
