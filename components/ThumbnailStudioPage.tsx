/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SparkleIcon, UploadIcon, XMarkIcon, DownloadIcon, ArrowPathIcon, ZoomInIcon, TicketIcon } from './icons';
import Spinner from './Spinner';
import * as geminiService from '../services/geminiService';
import type { AspectRatio } from '../services/geminiService';
import ZoomModal from './ZoomModal';
import LoadingOverlay from './LoadingOverlay';

// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

interface ImageSlot {
    file: File;
    url: string;
}

interface ThumbnailStudioPageProps {
  onOpenAssetLibrary: (onSelect: (files: File[]) => void, config: { multiSelect: boolean, selectButtonText: string }) => void;
}

const aspectRatios: { label: string, value: AspectRatio, hint: string }[] = [
    { label: '16:9', value: '16:9', hint: 'YouTube, Widescreen' },
    { label: '9:16', value: '9:16', hint: 'Shorts, Stories, Reels' },
    { label: '1:1', value: '1:1', hint: 'Instagram Post' },
    { label: '4:5', value: '4:5', hint: 'Instagram Portrait' },
    { label: '4:3', value: '4:3', hint: 'Standard Digital' },
    { label: '3:2', value: '3:2', hint: 'Classic Photo' },
    { label: '2:3', value: '2:3', hint: 'Classic Photo' },
    { label: '3:4', value: '3:4', hint: 'Standard Portrait' },
    { label: '5:4', value: '5:4', hint: 'Large Format' },
    { label: '21:9', value: '21:9', hint: 'Cinematic Banner' },
];

const AspectSelector: React.FC<{ selected: AspectRatio, onSelect: (ar: AspectRatio) => void, disabled: boolean }> = ({ selected, onSelect, disabled }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
        <div className="grid grid-cols-2 gap-2">
            {aspectRatios.map(({ label, value, hint }) => (
                <button
                    key={value}
                    onClick={() => onSelect(value)}
                    disabled={disabled}
                    className={`py-2 px-3 rounded-lg transition-colors text-left ${selected === value ? 'bg-blue-600 text-white' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-300'} disabled:opacity-50`}
                >
                    <span className="block font-semibold text-sm">{label}</span>
                    <span className="block text-xs opacity-80">{hint}</span>
                </button>
            ))}
        </div>
    </div>
);

const ImageUploader: React.FC<{ 
    onFileSelect: (file: File) => void,
    onOpenLibrary: () => void,
}> = ({ onFileSelect, onOpenLibrary }) => {
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
            className={`w-full h-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-center transition-colors ${isDraggingOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'}`}
        >
            <div className="flex flex-col items-center justify-center gap-2">
                 <UploadIcon className="w-8 h-8 mx-auto text-gray-400" />
                 <p className="text-sm text-gray-400">Drag, paste, or upload a guiding image</p>
                 <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => inputRef.current?.click()} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-sm">Upload</button>
                    <button type="button" onClick={onOpenLibrary} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-sm">From Library</button>
                 </div>
            </div>
            <input type="file" ref={inputRef} onChange={(e) => handleFile(e.target.files)} className="hidden" accept="image/*" />
        </div>
    );
};


const ThumbnailStudioPage: React.FC<ThumbnailStudioPageProps> = ({ onOpenAssetLibrary }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [guidingImage, setGuidingImage] = useState<ImageSlot | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [outputUrl, setOutputUrl] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
    const [showRegenerate, setShowRegenerate] = useState(false);
    
    const objectUrlsRef = useRef(new Set<string>());
    
    useEffect(() => {
        const urlsToClean = objectUrlsRef.current;
        return () => {
            urlsToClean.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);


    const handleFileSelect = useCallback((file: File) => {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.add(url);
        
        if (guidingImage) {
            URL.revokeObjectURL(guidingImage.url);
            objectUrlsRef.current.delete(guidingImage.url);
        }
        setGuidingImage({ file, url });
        setShowRegenerate(false);
    }, [guidingImage]);

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) return;
            
            const items = event.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    const file = items[i].getAsFile();
                    if (file) {
                        handleFileSelect(file);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [handleFileSelect]);

    const handleClearImage = () => {
        if (guidingImage) {
            URL.revokeObjectURL(guidingImage.url);
            objectUrlsRef.current.delete(guidingImage.url);
            setGuidingImage(null);
            setShowRegenerate(false);
        }
    };

    const handleGenerate = async () => {
        if (!title.trim()) {
            setError("Please provide a title for your thumbnail.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setShowRegenerate(false);
        if (outputUrl) {
             if (outputUrl.startsWith('blob:')) URL.revokeObjectURL(outputUrl);
             objectUrlsRef.current.delete(outputUrl);
        }
        setOutputUrl(null);

        try {
            const resultDataUrl = await geminiService.generateThumbnailImage(title, description, guidingImage?.file, aspectRatio);
            
            const resultFile = dataURLtoFile(resultDataUrl, `thumbnail-${Date.now()}.png`);
            const newUrl = URL.createObjectURL(resultFile);
            objectUrlsRef.current.add(newUrl);
            setOutputUrl(newUrl);
            setShowRegenerate(true);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const canGenerate = title.trim() !== '' && !isLoading;
    
    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in flex flex-col gap-8">
            <header>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-100">AI Thumbnail Studio</h1>
                <p className="mt-2 text-lg text-gray-400">Generate high click-through-rate thumbnails for your content.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Inputs Panel */}
                <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 flex flex-col gap-6">
                     <h2 className="text-2xl font-bold text-white">1. Enter Details</h2>
                     <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Video Title (Required)</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); setShowRegenerate(false); }}
                            placeholder="e.g., My Insane Trip to Japan!"
                            className="w-full bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-base"
                        />
                     </div>
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); setShowRegenerate(false); }}
                            placeholder="e.g., A travel vlog showing Mount Fuji, Tokyo cityscapes, and eating ramen."
                            rows={3}
                            className="w-full bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                        />
                     </div>
                     <div className="h-48">
                        {guidingImage ? (
                             <div className="group relative w-full h-full">
                                <img src={guidingImage.url} alt="Guiding" className="w-full h-full object-contain rounded-lg" />
                                <button onClick={handleClearImage} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-600 transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <ImageUploader 
                                onFileSelect={handleFileSelect}
                                onOpenLibrary={() => onOpenAssetLibrary(
                                    (files) => { if (files[0]) handleFileSelect(files[0]); },
                                    { multiSelect: false, selectButtonText: 'Use as Guide' }
                                )}
                            />
                        )}
                     </div>

                     <AspectSelector selected={aspectRatio} onSelect={(ar) => { setAspectRatio(ar); setShowRegenerate(false); }} disabled={isLoading} />
                     {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-lg text-center text-sm">{error}</div>}

                     <div className="flex flex-col gap-2 mt-auto">
                        <button onClick={handleGenerate} disabled={!canGenerate} className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-px active:scale-95 disabled:from-gray-600 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center">
                            {isLoading ? <Spinner /> : <><SparkleIcon className="w-5 h-5 mr-2" /> Generate Thumbnail</>}
                        </button>
                        {showRegenerate && !isLoading && (
                            <button onClick={handleGenerate} className="w-full bg-gray-700/60 hover:bg-gray-700 border border-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base active:scale-95 animate-fade-in">
                                <ArrowPathIcon className="w-5 h-5" /> Regenerate
                            </button>
                        )}
                     </div>
                </div>

                {/* Output Panel */}
                <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-6 flex flex-col gap-4 relative">
                     <h2 className="text-2xl font-bold text-white">2. Result</h2>
                     <div className="flex-grow w-full bg-black/20 rounded-lg flex items-center justify-center aspect-video relative overflow-hidden">
                        {isLoading ? (
                            <LoadingOverlay message="Designing your thumbnail..." />
                        ) : outputUrl ? (
                            <div className="group relative w-full h-full">
                                <button type="button" onClick={() => setIsZoomModalOpen(true)} className="w-full h-full block">
                                    <img src={outputUrl} alt="Generated thumbnail" className="w-full h-full object-contain rounded-lg" />
                                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <ZoomInIcon className="w-12 h-12 text-white" />
                                    </div>
                                </button>
                            </div>
                        ) : (
                             <div className="text-center text-gray-500 p-8">
                                <TicketIcon className="w-16 h-16 mx-auto"/>
                                <p className="mt-4">Your generated thumbnail will appear here.</p>
                            </div>
                        )}
                     </div>
                      {outputUrl && !isLoading && (
                        <a href={outputUrl} download={`thumbnail-${Date.now()}.png`} className="w-full text-center bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                           <DownloadIcon className="w-5 h-5"/> Download
                        </a>
                     )}
                </div>
            </div>
            <ZoomModal isOpen={isZoomModalOpen} onClose={() => setIsZoomModalOpen(false)} imageUrl={outputUrl} />
        </div>
    );
};

export default ThumbnailStudioPage;