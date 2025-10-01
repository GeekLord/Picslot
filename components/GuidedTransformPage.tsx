/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadIcon, XMarkIcon, SparkleIcon, DownloadIcon, SwitchHorizontalIcon, ShoppingBagIcon, SwatchIcon, PhotoIcon, ZoomInIcon, ArrowPathIcon } from './icons';
import Spinner from './Spinner';
import { generateGuidedTransform } from '../services/geminiService';
import type { TransformType } from '../services/geminiService';
import ZoomModal from './ZoomModal';

interface ImageSlot {
    id: string;
    file: File;
    url: string;
}

// New interface for mode configuration
interface TransformConfig {
    title: string;
    icon: React.ReactNode;
    subjectTitle: string;
    subjectDesc: string;
    referenceTitle: string;
    referenceDesc: string;
    promptPlaceholder: string;
}

// Configuration object for each mode
const transformConfigs: Record<TransformType, TransformConfig> = {
    pose: {
        title: 'Pose',
        icon: <SwitchHorizontalIcon className="w-5 h-5" />,
        subjectTitle: 'Subject Image',
        subjectDesc: "The person/object to transform.",
        referenceTitle: 'Pose Image',
        referenceDesc: "The pose to apply.",
        promptPlaceholder: "Optional: Describe background, style, etc. (e.g., 'in a futuristic city', 'cinematic lighting')"
    },
    cloths: {
        title: 'Cloths',
        icon: <ShoppingBagIcon className="w-5 h-5" />,
        subjectTitle: 'Subject Image',
        subjectDesc: "The person to dress.",
        referenceTitle: 'Clothing Image',
        referenceDesc: "The outfit to apply.",
        promptPlaceholder: "Optional: Describe a specific pose or scene for the new outfit (e.g., 'walking down a city street')"
    },
    style: {
        title: 'Style',
        icon: <SwatchIcon className="w-5 h-5" />,
        subjectTitle: 'Content Image',
        subjectDesc: "The image whose content you want to keep.",
        referenceTitle: 'Style Image',
        referenceDesc: "The image whose artistic style to apply.",
        promptPlaceholder: "Optional: Fine-tune the style transfer (e.g., 'emphasize the watercolor texture')"
    },
    scene: {
        title: 'Scene',
        icon: <PhotoIcon className="w-5 h-5" />,
        subjectTitle: 'Subject Image',
        subjectDesc: "The person/object to place in the scene.",
        referenceTitle: 'Scene Image',
        referenceDesc: "The background image.",
        promptPlaceholder: "Optional: Specify how the subject should interact with the scene (e.g., 'sitting on the park bench')"
    }
};


const ImageUploader: React.FC<{ onFileSelect: (file: File) => void, title: string, description: string }> = ({ onFileSelect, title, description }) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (files: FileList | null) => {
        if (files && files[0]) {
            onFileSelect(files[0]);
        }
    };

    return (
        <div 
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDraggingOver(false); handleFile(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`w-full h-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDraggingOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
        >
            <UploadIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="font-semibold text-gray-200">{title}</p>
            <p className="text-sm text-gray-500">{description}</p>
            <input type="file" ref={inputRef} onChange={(e) => handleFile(e.target.files)} className="hidden" accept="image/*" />
        </div>
    );
};

const GuidedTransformPage: React.FC = () => {
    const [transformType, setTransformType] = useState<TransformType>('pose');
    const [subject, setSubject] = useState<ImageSlot | null>(null);
    const [reference, setReference] = useState<ImageSlot | null>(null);
    const [prompt, setPrompt] = useState('');
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
    const [showRegenerate, setShowRegenerate] = useState(false);

    const handleFileSelect = useCallback((file: File, type: 'subject' | 'reference') => {
        const newImage = {
            id: `${file.name}-${Date.now()}`,
            file,
            url: URL.createObjectURL(file),
        };
        setShowRegenerate(false);
        if (type === 'subject') {
            if (subject) URL.revokeObjectURL(subject.url);
            setSubject(newImage);
        } else {
            if (reference) URL.revokeObjectURL(reference.url);
            setReference(newImage);
        }
    }, [subject, reference]);
    
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }
        
            const items = event.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        if (!subject) {
                            handleFileSelect(file, 'subject');
                        } else if (!reference) {
                            handleFileSelect(file, 'reference');
                        }
                        break; // We only handle the first image found
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);

        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [subject, reference, handleFileSelect]);

    const handleClear = (type: 'subject' | 'reference') => {
        setShowRegenerate(false);
        if (type === 'subject' && subject) {
            URL.revokeObjectURL(subject.url);
            setSubject(null);
        } else if (type === 'reference' && reference) {
            URL.revokeObjectURL(reference.url);
            setReference(null);
        }
    };

    const handleGenerate = async () => {
        if (!subject || !reference) {
            setError("Please upload both a subject and a reference image.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setShowRegenerate(false);
        if (outputUrl && outputUrl.startsWith('blob:')) {
            URL.revokeObjectURL(outputUrl);
        }
        setOutputUrl(null);

        try {
            const resultUrl = await generateGuidedTransform(subject.file, reference.file, prompt, transformType);
            setOutputUrl(resultUrl);
            setShowRegenerate(true);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const canGenerate = subject && reference && !isLoading;
    const config = transformConfigs[transformType];

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in flex flex-col gap-8">
            <header>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-100">Guided Transform</h1>
                <p className="mt-2 text-lg text-gray-400">Combine two images to create something new. Upload by clicking, dragging, or pasting from your clipboard.</p>
            </header>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-900/50 p-2 rounded-xl border border-gray-700/60">
                {(Object.keys(transformConfigs) as TransformType[]).map(type => (
                    <button
                        key={type}
                        onClick={() => { setTransformType(type); setShowRegenerate(false); }}
                        className={`flex items-center justify-center gap-3 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out text-base ${
                            transformType === type ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-300 hover:bg-gray-700/50'
                        }`}
                    >
                        {transformConfigs[type].icon}
                        {transformConfigs[type].title}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Inputs Column */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4 flex flex-col gap-3">
                        <h2 className="text-xl font-bold text-white">{config.subjectTitle}</h2>
                        <div className="aspect-square w-full">
                            {subject ? (
                                <div className="group relative w-full h-full">
                                    <img src={subject.url} alt="Subject" className="w-full h-full object-contain rounded-lg" />
                                    <button onClick={() => handleClear('subject')} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <ImageUploader onFileSelect={(file) => handleFileSelect(file, 'subject')} title={config.subjectTitle} description={config.subjectDesc}/>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4 flex flex-col gap-3">
                        <h2 className="text-xl font-bold text-white">{config.referenceTitle}</h2>
                        <div className="aspect-square w-full">
                            {reference ? (
                                <div className="group relative w-full h-full">
                                    <img src={reference.url} alt="Reference" className="w-full h-full object-contain rounded-lg" />
                                    <button onClick={() => handleClear('reference')} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <ImageUploader onFileSelect={(file) => handleFileSelect(file, 'reference')} title={config.referenceTitle} description={config.referenceDesc} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Controls & Output Column */}
                <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-4 flex flex-col gap-4">
                     <h2 className="text-xl font-bold text-white">Controls & Output</h2>
                     <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">Optional Instructions</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => { setPrompt(e.target.value); setShowRegenerate(false); }}
                            placeholder={config.promptPlaceholder}
                            rows={4}
                            className="w-full bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                        />
                     </div>
                     {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-lg text-center text-sm">{error}</div>}
                     <div className="flex flex-col gap-2">
                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? <Spinner /> : <><SparkleIcon className="w-5 h-5 mr-2" /> Generate</>}
                        </button>
                        {showRegenerate && !isLoading && (
                             <button
                                onClick={handleGenerate}
                                className="w-full bg-gray-700/60 hover:bg-gray-700 border border-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base active:scale-95 animate-fade-in"
                                title="Try generating this transform again"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Regenerate
                            </button>
                        )}
                     </div>
                     <div className="flex-grow w-full bg-black/20 rounded-lg flex items-center justify-center aspect-square mt-2">
                        {isLoading ? (
                            <Spinner size="lg"/>
                        ) : outputUrl ? (
                            <div className="group relative w-full h-full">
                                <button type="button" onClick={() => setIsZoomModalOpen(true)} className="w-full h-full block">
                                    <img src={outputUrl} alt="Generated scene" className="w-full h-full object-contain rounded-lg" />
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <ZoomInIcon className="w-12 h-12 text-white" />
                                    </div>
                                </button>
                                <div className="absolute bottom-2 right-2">
                                    <a href={outputUrl} download={`guided-transform-${Date.now()}.png`} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white inline-block" title="Download Image">
                                        <DownloadIcon className="w-5 h-5"/>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm p-4 text-center">Output will appear here</p>
                        )}
                     </div>
                </div>
            </div>
            <ZoomModal isOpen={isZoomModalOpen} onClose={() => setIsZoomModalOpen(false)} imageUrl={outputUrl} />
        </div>
    );
};

export default GuidedTransformPage;
