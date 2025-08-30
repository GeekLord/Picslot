/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (
  file: File
): Promise<{ inlineData: { mimeType: string; data: string } }> => {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

  const arr = dataUrl.split(",");
  if (arr.length < 2) throw new Error("Invalid data URL");

  const mimeMatch = arr.match(/:(.*?);/);
  if (!mimeMatch || !mimeMatch[1])
    throw new Error("Could not parse MIME type from data URL");

  const mimeType = mimeMatch[1];
  const data = arr[1];

  return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
  response: GenerateContentResponse,
  context: string // e.g., "edit", "filter", "adjustment"
): string => {
  // 1) Check for prompt blocking
  if (response.promptFeedback?.blockReason) {
    const { blockReason, blockReasonMessage } = response.promptFeedback;
    const errorMessage = `Request was blocked. Reason: ${blockReason}. ${
      blockReasonMessage || ""
    }`;
    console.error(errorMessage, { response });
    throw new Error(errorMessage);
  }

  // 2) Try to find an inline image part in candidates
  const candidates = response.candidates ?? [];
  for (const cand of candidates) {
    const parts = cand.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p?.inlineData);
    if (imagePart?.inlineData) {
      const { mimeType, data } = imagePart.inlineData;
      console.log(`Received image data (${mimeType}) for ${context}`);
      return `data:${mimeType};base64,${data}`;
    }
  }

  // 3) If no image, check finishReason
  const finishReason = response.candidates?.?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
    console.error(errorMessage, { response });
    throw new Error(errorMessage);
  }

  // 4) If the model returned text only, surface it
  const textFeedback = (response as any).text?.trim();
  if (textFeedback) {
    const errorMessage = `The AI model did not return an image for the ${context}. The model responded with text: "${textFeedback}"`;
    console.error(errorMessage, { response });
    throw new Error(errorMessage);
  }

  // 5) Generic fallback
  const errorMessage = `The AI model did not return an image for the ${context}. This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.`;
  console.error(`Model response did not contain an image part for ${context}.`, {
    response,
  });
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
  hotspot: { x: number; y: number }
): Promise<string> => {
  console.log("Starting generative edit at:", hotspot);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const originalImagePart = await fileToPart(originalImage);

  const prompt = `ROLE: Senior photographic retoucher.
OBJECTIVE: Perform a natural, LOCALIZED edit focused around the specified hotspot while keeping the rest of the image unchanged.

INPUTS:
- User request: "${userPrompt}"
- Focus area: Center at (x: ${hotspot.x}, y: ${hotspot.y}); soft, feathered falloff.

SCOPE:
- Edit only within a circular region centered at the hotspot with a soft feather; use ~10–15% of the shorter image side as a guiding radius and adapt to context for realism.
- Outside this region MUST remain pixel-identical except for imperceptible blending needed for a seamless result.

QUALITY TARGETS:
- Photorealistic blending with consistent light direction, shadows, reflections, and texture continuity.
- No halos, banding, compression artifacts, or over-smoothing; preserve natural skin texture and fine detail.
- Maintain color harmony and white balance with the surrounding pixels.

IDENTITY LOCK (NON-NEGOTIABLE):
- Do NOT alter facial features, bone structure, proportions, expression, age, or identity.
- Do NOT reshape body, change hairstyle density or hairline, or alter distinguishing marks unless the request explicitly asks for it.
- Cosmetic skin-tone changes are allowed ONLY if explicitly requested; preserve undertones and do not change race or ethnicity.

SAFETY & CONTENT INTEGRITY:
- No addition of new objects or content outside the specified region.
- No text in the image unless explicitly requested.

OUTPUT:
- Return ONLY the final edited image, no text.`;

  const textPart = { text: prompt };

  console.log("Sending image and prompt to the model...");
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: { parts: [originalImagePart, textPart] },
  });

  console.log("Received response from model.", response);
  return handleApiResponse(response, "edit");
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
  originalImage: File,
  filterPrompt: string
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const originalImagePart = await fileToPart(originalImage);

    const prompt = `ROLE: Expert colorist.
OBJECTIVE: Apply a stylistic, global COLOR GRADE only; do NOT change composition or content.

INPUT:
- Filter request: "${filterPrompt}"

STYLE & COLOR MANAGEMENT:
- Operate like a film-grade/LUT: adjust color balance, contrast, tone curve, and ambiance.
- Preserve neutrals and accurate white balance; avoid color casts unless they are part of the requested style.
- Skin fidelity: maintain natural skin tones and texture; avoid hue shifts that change ethnicity or undertones.

CONSTRAINTS:
- No geometry changes, relighting that changes time-of-day context, or identity alterations.
- No background replacement or object insertion; do not add text or graphics.

QUALITY TARGETS:
- No halos, clipped highlights/shadows, posterization, or banding.
- Retain fine detail; avoid plastic skin and over-sharpening.

OUTPUT:
- Return ONLY the final filtered image, no text.`;

    const textPart = { text: prompt };

    console.log("Sending image and filter prompt to the model...");
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: { parts: [originalImagePart, textPart] },
    });

    console.log("Received response from model for filter.", response);
    return handleApiResponse(response, "filter");
  };

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
  originalImage: File,
  adjustmentPrompt: string
): Promise<string> => {
  console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const originalImagePart = await fileToPart(originalImage);

  const prompt = `ROLE: Senior photo finisher.
OBJECTIVE: Apply NATURAL, GLOBAL adjustments across the entire image based on the user request.

INPUT:
- User request: "${adjustmentPrompt}"

ALLOWED GLOBAL ADJUSTMENTS:
- Exposure, contrast, highlights/shadows recovery with roll-off to avoid clipping.
- White balance and tint normalization with subtle color balance refinement.
- Tone curve and local contrast/clarity; gentle texture/sharpness; controlled noise reduction.
- Subtle vignette, bloom, or haze reduction only if it serves realism.

IDENTITY & CONTENT GUARDRAILS:
- Do NOT alter facial identity, features, expression, age, body shape, or ethnicity.
- Cosmetic skin-tone changes only if explicitly requested, keeping undertones natural.
- No composition, pose, or background changes.

QUALITY TARGETS:
- Photorealistic finish: no halos, ringing, banding, waxy skin, or oversaturation.
- Preserve detail in hair, eyes, and fabric; maintain consistent color harmony.

OUTPUT:
- Return ONLY the final adjusted image, no text.`;

  const textPart = { text: prompt };

  console.log("Sending image and adjustment prompt to the model...");
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: { parts: [originalImagePart, textPart] },
  });

  console.log("Received response from model for adjustment.", response);
  return handleApiResponse(response, "adjustment");
};

/**
 * Generates an auto-enhanced image using generative AI.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the enhanced image.
 */
export const generateAutoEnhancedImage = async (
  originalImage: File
): Promise<string> => {
  console.log(`Starting auto-enhancement`);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const originalImagePart = await fileToPart(originalImage);

  const prompt = `ROLE: World-class photo editor.
OBJECTIVE: Perform a comprehensive, automatic enhancement to achieve a polished, professional, studio-quality look while preserving the subject’s identity.

PRIORITIES (IN ORDER):
1) Lighting & Tonal Balance: recover blown highlights, lift blocked shadows, and normalize midtones with natural contrast.
2) Color: neutral white balance, clean skin tones, remove unwanted color casts while keeping scene intent.
3) Clarity & Detail: subtle texture and micro-contrast; sharpen eyes, hair, and key edges without halos.
4) Noise & Artifacts: reduce noise and compression carefully without plastic smoothing; retain fine texture.
5) Lens & Clean-up: correct minor chromatic aberration/moire and remove small distractions that do not change scene content.

OPTIONAL INTELLIGENT UN-CROP:
- If framing is obviously cramped, extend background slightly for balance using contextually accurate continuation.
- Do NOT invent new salient objects; keep extensions subtle, consistent in lighting and perspective.

IDENTITY LOCK:
- Absolutely no changes to facial structure, expression, age, hairstyle density/hairline, or body shape.
- Do not add makeup or alter features unless such enhancement is clearly implied by “professional polish.”
- Cosmetic tan/lighten/darken only if explicitly requested; keep undertones and ethnicity unchanged.

OUTPUT:
- Return ONLY the final enhanced image, no text.`;

  const textPart = { text: prompt };

  console.log("Sending image and auto-enhance prompt to the model...");
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: { parts: [originalImagePart, textPart] },
  });

  console.log("Received response from model for auto-enhancement.", response);
  return handleApiResponse(response, "auto-enhance");
};

/**
 * Restores an old or damaged image using generative AI.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the restored image.
 */
export const generateRestoredImage = async (
  originalImage: File
): Promise<string> => {
  console.log(`Starting image restoration`);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const originalImagePart = await fileToPart(originalImage);

  const prompt = `ROLE: Archival photo restoration specialist.
OBJECTIVE: Restore the image to a clean, high-definition, photorealistic state without altering identity or historical authenticity.

RESTORATION TASKS:
- Remove damage: scratches, dust, tears, stains, noise, banding, and compression artifacts.
- Resolve blur and improve clarity; upsample only as needed to reveal plausible detail (no over-invention).
- Reconstruct missing micro-texture (skin, fabric, hair) naturally; avoid plastic smoothing.

COLOR & LIGHT:
- Rebuild faded color to natural, balanced, and vibrant levels; remove color casts.
- Correct exposure with gentle highlight recovery and shadow lift; maintain period-accurate contrast if implied.
- If input is B/W, keep B/W unless explicit colorization is requested.

IDENTITY LOCK:
- Do NOT change facial features, expression, bone structure, age, moles/scars/unique marks (unless the user requests removal).
- Preserve ethnicity and undertones; cosmetic tone shifts only on explicit request.

QUALITY TARGETS:
- No halos, ringing, oversharpening, or waxy skin.
- Maintain film-like or natural texture as appropriate.

OUTPUT:
- Return ONLY the final restored image, no text.`;

  const textPart = { text: prompt };

  console.log("Sending image and restoration prompt to the model...");
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: { parts: [originalImagePart, textPart] },
  });

  console.log("Received response from model for restoration.", response);
  return handleApiResponse(response, "restoration");
};

/**
 * Generates a studio-quality portrait from an image.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the portrait image.
 */
export const generateStudioPortrait = async (
  originalImage: File
): Promise<string> => {
  console.log(`Starting studio portrait generation`);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const originalImagePart = await fileToPart(originalImage);

  const prompt = `ROLE: Studio portrait photographer and retoucher.
OBJECTIVE: Transform the provided image into a professional, half-body studio portrait suitable for official/professional use, while preserving exact identity.

IDENTITY LOCK (MOST IMPORTANT):
- The person must remain perfectly recognizable; no change to facial features, bone structure, expression, age, or hairstyle density/hairline.
- Do NOT slim, reshape, or alter body proportions.

COMPOSITION & POSE:
- Reframe to a centered half-body portrait (head to around the waist), shoulders level, facing camera directly, neutral posture and gaze.
- Remove obstructions from face/shoulders; reposition arms realistically out of frame if they obstruct.

LIGHTING & BACKGROUND:
- Apply even, flattering, professional studio lighting with natural skin rendition and clean catchlights.
- Replace background with a uniform, softly blurred neutral (light gray / professional blue / off-white) with subtle falloff; no patterns.

FINISHING:
- Restore/denoise if needed; enhance clarity and detail without halos or plastic skin.
- Keep grooming realistic: tame stray flyaways subtly; avoid artificial makeup unless implicitly present.

OUTPUT:
- Return ONLY the final studio portrait image, no text.`;

  const textPart = { text: prompt };

  console.log("Sending image and studio portrait prompt to the model...");
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: { parts: [originalImagePart, textPart] },
  });

  console.log("Received response from model for studio portrait.", response);
  return handleApiResponse(response, "studio-portrait");
};

/**
 * Generates a modeling comp card from an image.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the comp card image.
 */
export const generateCompCard = async (
  originalImage: File
): Promise<string> => {
  console.log(`Starting Comp Card generation`);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const originalImagePart = await fileToPart(originalImage);

  const prompt = `ROLE: Elite art director and graphic designer.
OBJECTIVE: From a single image, create ONE vertically oriented composite (comp card) on a pure white background with four poses plus a minimalist stats block, preserving exact facial identity.

IDENTITY LOCK (NON-NEGOTIABLE):
- The face must be an exact, crystal-clear match across ALL four poses; no changes to features, expression, bone structure, age, or ethnicity.
- Maintain consistent proportions; no body reshaping or exaggeration.

LAYOUT & BACKGROUND:
- Output a single composite image on PURE WHITE.
- Generate each pose on transparent conceptually, then arrange into a dynamic magazine-like collage (avoid rigid grids); tasteful slight overlaps allowed.

REQUIRED POSES:
1) Main headshot (shoulders up), forward-facing.
2) Full-body standing shot.
3) Three-quarter (knees up), different pose.
4) Profile head-and-shoulders (side view).

WARDROBE (CONSISTENT):
- Replace clothing with minimalist, form-fitting professional wardrobe (e.g., athletic wear or simple swimwear) appropriate for industry standards; consistent across all four shots.
- Keep tasteful and professional; no logos or distracting patterns.

STATS BLOCK (MINIMAL, LEGIBLE):
- Include estimated: Height (ft/in + cm), Measurements (B-W-H in inches), Hair Color, Eye Color, Shoe Size (US).
- Use clean typography; align neatly at the bottom; do not include external branding.

QUALITY TARGETS:
- Uniform lighting and scale across poses; preserve skin texture and detail; no halos or plastic smoothing.

SAFETY:
- Do not sexualize; maintain professional tone.
- Preserve ethnicity; no race changes.

OUTPUT:
- Return ONLY the final single composite image, no text.`;

  const textPart = { text: prompt };

  console.log("Sending image and Comp Card prompt to the model...");
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: { parts: [originalImagePart, textPart] },
  });

  console.log("Received response from model for Comp Card.", response);
  return handleApiResponse(response, "comp-card");
};

/**
 * Generates a 3-view full body shot from an image.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the 3-view image.
 */
export const generateThreeViewShot = async (
  originalImage: File
): Promise<string> => {
  console.log(`Starting 3-View Shot generation`);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const originalImagePart = await fileToPart(originalImage);

  const prompt = `ROLE: Art director for turnarounds.
OBJECTIVE: Generate a single composite image with three full-body views (Front, Side, Back) on a white background, preserving exact identity.

IDENTITY LOCK:
- Face must remain an exact match; no changes to features, expression, age, or ethnicity.
- Maintain consistent body proportions; no slimming, muscle exaggeration, or reshaping.

POSE & ARRANGEMENT:
- Neutral, standardized stance: arms at sides, shoulders level, feet comfortably apart (anatomical/soldier-at-attention style).
- Arrange logically (Side | Front | Back) with consistent height and scale.

WARDROBE & BACKGROUND:
- Replace clothing with minimalist, form-fitting athletic wear or simple swimwear appropriate for professional digitals.
- Pure white background; consistent, even lighting across all three views.

QUALITY TARGETS:
- Clean edges; no halos; preserve skin texture and fabric detail.
- Ensure perspective and proportions match across views.

OUTPUT:
- Return ONLY the final single composite image (PNG with transparency acceptable), no text.`;

  const textPart = { text: prompt };

  console.log("Sending image and 3-View Shot prompt to the model...");
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents: { parts: [originalImagePart, textPart] },
  });

  console.log("Received response from model for 3-View Shot.", response);
  return handleApiResponse(response, "3-view-shot");
};
