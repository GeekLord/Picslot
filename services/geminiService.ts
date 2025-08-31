/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, GenerateContentResponse, Modality } from '@google/genai';

const apiKey = process.env.API_KEY;
if (!apiKey || apiKey.includes("YOUR_GEMINI_API_KEY")) {
    throw new Error("Gemini API key is missing or is a placeholder. Please update it in index.html according to the README.md setup guide.");
}

const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-2.5-flash-image-preview';

/**
 * Converts a File object to a base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves to the base64 string.
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

/**
 * Resizes an image if it exceeds a maximum size and returns its data URL.
 * Intelligently switches between JPEG for compression and PNG for transparency.
 * @param file The image file to process.
 * @param outputFormat The desired output format ('image/jpeg' or 'image/png').
 * @param maxSize The maximum width or height of the image.
 * @returns A promise that resolves to the data URL of the (potentially resized) image.
 */
const getImageDataUrl = (file: File, outputFormat: 'image/jpeg' | 'image/png' = 'image/jpeg', maxSize: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error('FileReader did not produce a result.'));
            }
            const dataUrl = event.target.result as string;
            const img = new Image();
            img.onload = () => {
                const { width, height } = img;

                if (width <= maxSize && height <= maxSize) {
                    // If the image is already in the right format and small enough, return it.
                    if (file.type === outputFormat) {
                       resolve(dataUrl);
                       return;
                    }
                }
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));

                let newWidth = width;
                let newHeight = height;

                if (width > height) {
                    if (width > maxSize) {
                        newHeight = Math.round(height * (maxSize / width));
                        newWidth = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        newWidth = Math.round(width * (maxSize / height));
                        newHeight = maxSize;
                    }
                }

                canvas.width = newWidth;
                canvas.height = newHeight;
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // Use JPEG with quality for better compression unless PNG is required
                resolve(canvas.toDataURL(outputFormat, 0.9));
            };
            img.onerror = reject;
            img.src = dataUrl;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * A generic handler to call the Gemini API for various image generation tasks.
 * @param originalImage The original image file.
 * @param prompt The text prompt for the AI model.
 * @param outputFormat The required output format. PNG for transparency, otherwise JPEG.
 * @returns A promise that resolves to the data URL of the generated image.
 */
const callGenerativeApi = async (
    originalImage: File,
    prompt: string,
    outputFormat: 'image/png' | 'image/jpeg' = 'image/jpeg'
): Promise<string> => {
    // Resize and convert the image to a data URL for the API payload.
    const optimizedDataUrl = await getImageDataUrl(originalImage, outputFormat);
    const base64Data = optimizedDataUrl.split(',')[1];
    const mimeType = optimizedDataUrl.substring(optimizedDataUrl.indexOf(':') + 1, optimizedDataUrl.indexOf(';'));

    const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: {
            parts: [{
                inlineData: {
                    data: base64Data,
                    mimeType,
                },
            }, {
                text: prompt,
            }, ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData) {
        const newMimeType = imagePart.inlineData.mimeType;
        return `data:${newMimeType};base64,${imagePart.inlineData.data}`;
    }

    // Check for text part which might contain an error or explanation
    const textPart = response.candidates?.[0]?.content?.parts?.find(part => part.text);
    if (textPart && textPart.text) {
        throw new Error(`The AI model returned text instead of an image: "${textPart.text}"`);
    }

    throw new Error('The AI model did not return an image. Please try again.');
};

// --- API Functions ---

export const generateEditedImage = (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    const prompt = `
        As an expert photo editor, perform the following edit: "${userPrompt}".
        The user has indicated a specific point of interest at coordinates (x: ${hotspot.x}, y: ${hotspot.y}) on the original image.
        Focus the edit on this area, ensuring the result is photorealistic and seamlessly integrated.
        Preserve the original image's style, lighting, and resolution. Do not change the subject's identity or overall composition unless specifically instructed.
    `;
    return callGenerativeApi(originalImage, prompt);
};

export const generateFilteredImage = (
    originalImage: File,
    filterPrompt: string
): Promise<string> => {
    const prompt = `
        Apply a creative filter to this image based on the following description: "${filterPrompt}".
        The filter should be applied globally, affecting the entire image.
        Maintain the core subject matter and composition. The result should be artistic and high-quality.
    `;
    return callGenerativeApi(originalImage, prompt);
};


export const generateAdjustedImage = (
    originalImage: File,
    adjustmentPrompt: string
): Promise<string> => {
    const prompt = `
        Perform a professional photo adjustment on this entire image. The goal is to: "${adjustmentPrompt}".
        This is a technical adjustment, not a content change. Maintain the subject's identity and composition.
        The result should look like it was done by a professional photographer.
    `;
    return callGenerativeApi(originalImage, prompt);
};

export const generateAutoEnhancedImage = (originalImage: File): Promise<string> => {
    const prompt = `
        Act as a professional photo editor. Perform an "auto-enhance" or "magic edit" on this image.
        Subtly improve lighting, color balance, contrast, and sharpness to make the photo look its best.
        Do not crop, change content, or alter the subject's identity. The enhancement should be natural and not overly stylized.
    `;
    return callGenerativeApi(originalImage, prompt);
};

export const generateRestoredImage = (originalImage: File): Promise<string> => {
    const prompt = `
        Act as a master photo restoration expert. Restore this image.
        Remove any scratches, dust, blurriness, and color fading. Sharpen details and clarify the subjects.
        It is critical to preserve the original subjects' identities and the historical context of the photo. Do not add or invent details that are not present. The goal is restoration, not recreation.
    `;
    return callGenerativeApi(originalImage, prompt);
};

export const generateRemovedBackgroundImage = (originalImage: File): Promise<string> => {
    const prompt = `
      Precisely segment the main foreground subject from the background.
      Remove the background completely, making it transparent.
      Ensure the edges of the subject are clean and sharp. Do not leave any background remnants.
      Output a PNG file with a transparent background.
    `;
    // Background removal requires transparency, so we must use PNG.
    return callGenerativeApi(originalImage, prompt, 'image/png');
};

export const generateStudioPortrait = (originalImage: File): Promise<string> => {
    const prompt = `
        Transform this image into a professional, forward-facing studio headshot.
        The subject should be looking directly at the camera.
        The background must be a clean, neutral, professional studio backdrop (e.g., light gray, off-white).
        Lighting should be flattering and professional.
        It is absolutely critical to preserve the subject's identity and facial features exactly as they are in the original photo. Do not alter their appearance.
    `;
    return callGenerativeApi(originalImage, prompt);
};

export const generateCompCard = (originalImage: File): Promise<string> => {
    const prompt = `
        Act as a professional agent for a model. Generate a professional modeling composite card (comp card) using the provided image of the person as the main photo.
        The comp card should feature multiple poses of the same person, styled in simple, form-fitting athletic wear (like a tank top and leggings).
        Include a full-body shot, a headshot, and a three-quarter shot.
        Also, include a section with the model's estimated stats: Height, Weight, Bust, Waist, Hips, and Shoe Size.
        The layout should be clean, modern, and professional. Preserve the model's identity in all generated poses.
    `;
    return callGenerativeApi(originalImage, prompt);
};


export const generateThreeViewShot = (originalImage: File): Promise<string> => {
    const prompt = `
        Generate a technical, full-body, three-view reference shot (also known as a character sheet or turnaround) of the person in the image.
        The output must show the person from the front, side, and back, standing in a neutral A-pose.
        The person should be wearing simple, form-fitting clothing (like a grey t-shirt and shorts) to clearly show their physique.
        The background must be a plain, neutral color.
        It is crucial to maintain the person's identity, proportions, and features across all three views.
    `;
    return callGenerativeApi(originalImage, prompt);
};

export const generateOutpaintedImage = (originalImage: File): Promise<string> => {
    const prompt = `
        This image is a crop of a person. Your task is to "outpaint" or "un-crop" it to reveal the person's full body and a plausible, complete background.
        The generated parts of the person and the background must seamlessly match the style, lighting, and context of the original image.
        Preserve the person's identity and the original part of the image perfectly.
    `;
    return callGenerativeApi(originalImage, prompt);
};