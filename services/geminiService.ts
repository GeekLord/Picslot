/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabaseService';

/**
 * Resizes an image if it exceeds a maximum size and returns its data URL.
 * This is crucial for keeping the payload to the edge function below the 1MB limit.
 * @param file The image file to process.
 * @param maxSize The maximum width or height of the image.
 * @returns A promise that resolves to the data URL of the (potentially resized) image.
 */
const getImageDataUrl = (file: File, maxSize: number = 1024): Promise<string> => {
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
                    // Image is small enough, return original data URL
                    resolve(dataUrl);
                    return;
                }

                // Image needs resizing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }

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
                
                // Using PNG to support transparency, which is important for 'remove-background'
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = dataUrl;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


// Generic handler to call the Supabase Edge Function for image generation
const callImageGenerationApi = async (
    action: string,
    originalImage: File,
    prompt?: string,
    hotspot?: { x: number, y: number }
): Promise<string> => {
    console.log(`Starting generative action: ${action}`);

    // The user must be authenticated to proceed.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('You must be logged in to use AI features.');
    }

    // Resize image if necessary and get its data URL to keep the payload size manageable.
    const dataUrl = await getImageDataUrl(originalImage);

    // Construct the payload for the edge function.
    const payload = {
        action,
        dataUrl,
        prompt,
        hotspot,
    };

    // Invoke the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-image', {
        body: payload
    });

    if (error) {
        console.error(`Error invoking generate-image function for action "${action}":`, error);
        if (error.message.includes('Failed to fetch')) {
             throw new Error(`Network error: Could not connect to the AI service. Please check your internet connection.`);
        }
        throw new Error(error.message || `Failed to ${action}. An unknown function error occurred.`);
    }

    if (data?.error) {
        console.error(`Error from generate-image function for action "${action}":`, data.error);
        throw new Error(data.error);
    }
    
    if (!data?.dataUrl) {
         console.error('Invalid response from generate-image function, no dataUrl returned.', data);
         throw new Error('The AI model did not return an image. Please try again.');
    }

    return data.dataUrl;
};

/**
 * Generates an edited image by proxying the request through a serverless function.
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
    return callImageGenerationApi('edit', originalImage, userPrompt, hotspot);
};

/**
 * Generates an image with a filter by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    return callImageGenerationApi('filter', originalImage, filterPrompt);
};

/**
 * Generates an image with a global adjustment by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    return callImageGenerationApi('adjustment', originalImage, adjustmentPrompt);
};

/**
 * Generates an auto-enhanced image by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the enhanced image.
 */
export const generateAutoEnhancedImage = (originalImage: File): Promise<string> => {
    return callImageGenerationApi('auto-enhance', originalImage);
};

/**
 * Restores an old or damaged image by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the restored image.
 */
export const generateRestoredImage = (originalImage: File): Promise<string> => {
    return callImageGenerationApi('restore', originalImage);
};

/**
 * Generates an image with the background removed by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the image with a transparent background.
 */
export const generateRemovedBackgroundImage = (originalImage: File): Promise<string> => {
    return callImageGenerationApi('remove-background', originalImage);
};

/**
 * Generates a studio-quality portrait by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the portrait image.
 */
export const generateStudioPortrait = (originalImage: File): Promise<string> => {
    return callImageGenerationApi('studio-portrait', originalImage);
};

/**
 * Generates a modeling comp card by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the comp card image.
 */
export const generateCompCard = (originalImage: File): Promise<string> => {
    return callImageGenerationApi('comp-card', originalImage);
};

/**
 * Generates a 3-view full body shot by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the 3-view image.
 */
export const generateThreeViewShot = (originalImage: File): Promise<string> => {
    return callImageGenerationApi('3-view-shot', originalImage);
};

/**
 * Generates an outpainted full-body image by proxying the request through a serverless function.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the outpainted image.
 */
export const generateOutpaintedImage = (originalImage: File): Promise<string> => {
    return callImageGenerationApi('outpaint', originalImage);
};