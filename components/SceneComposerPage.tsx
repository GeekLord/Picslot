/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon, XMarkIcon, PlusIcon, ArrowUturnLeftIcon, ArrowPathIcon } from './icons';
import Spinner from './Spinner';
import { generateCompositedImage } from '../services/geminiService';

interface UploadedFile {
    id: string;
    file: File;
    url: string;
}

interface StagedImage extends UploadedFile {
    role: string;
}

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
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}


const SceneComposerPage: React.FC = () => {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
    const [masterPrompt, setMasterPrompt] = useState('');
    const [outputImageUrl, setOutputImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [showRegenerate, setShowRegenerate] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectUrlsRef = useRef(new Set<string>());

    // FIX: Robustly manage object URLs to prevent 404 errors.
    // This effect runs only once on mount and returns a cleanup function
    // that runs only on unmount, revoking all URLs created in the session.
    useEffect(() => {
        const urlsToClean = objectUrlsRef.current;
        return () => {
            urlsToClean.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files) return;
        const newFiles: UploadedFile[] = Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .map(file => {
                const url = URL.createObjectURL(file);
                objectUrlsRef.current.add(url); // Track URL for cleanup
                return {
                    id: `${file.name}-${file.lastModified}-${Math.random()}`,
                    file: file,
                    url: url,
                };
            });
        setUploadedFiles(prev => [...prev, ...newFiles]);
    }, []);

    const removeUrlFromTracking = (url: string) => {
        URL.revokeObjectURL(url);
        objectUrlsRef.current.delete(url);
    };

    const handleRemoveFromTray = (fileId: string) => {
        const fileToRemove = uploadedFiles.find(f => f.id === fileId);
        if (fileToRemove) {
            removeUrlFromTracking(fileToRemove.url);
            setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        }
    };

    const handleAddToStage = (file: UploadedFile) => {
        setStagedImages(prev => [...prev, { ...file, role: '' }]);
        setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
        setShowRegenerate(false);
    };
    
    const handleReturnToTray = (image: StagedImage) => {
        setUploadedFiles(prev => [...prev, { id: image.id, file: image.file, url: image.url }]);
        setStagedImages(prev => prev.filter(img => img.id !== image.id));
        setShowRegenerate(false);
    };

    const handleRoleChange = (id: string, newRole: string) => {
        setStagedImages(prev => prev.map(img => img.id === id ? { ...img, role: newRole } : img));
        setShowRegenerate(false);
    };
    
    const handleGenerate = async () => {
        if (stagedImages.length < 2 || !masterPrompt.trim()) {
            setError("Please add at least two images to the scene and provide a master prompt.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setShowRegenerate(false);
        if (outputImageUrl) {
            removeUrlFromTracking(outputImageUrl);
        }
        setOutputImageUrl(null);

        try {
            const imagesToProcess = stagedImages.map(img => ({
                file: img.file,
                role: img.role || 'Image asset', // Provide a default role if empty
            }));
            const resultDataUrl = await generateCompositedImage(imagesToProcess, masterPrompt);
            const resultFile = dataURLtoFile(resultDataUrl, `composed-scene-${Date.now()}.png`);
            const newUrl = URL.createObjectURL(resultFile);
            objectUrlsRef.current.add(newUrl); // Track new URL
            setOutputImageUrl(newUrl);
            setShowRegenerate(true);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred during scene generation.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const canGenerate = stagedImages.length >= 2 && masterPrompt.trim() !== '' && !isLoading;

    return (
        <div className="w-full h-full flex flex-col lg:flex-row gap-6">
             {/* Left Column: Image Tray */}
            <aside className="w-full lg:w-1/4 xl:w-1/5 bg-gray-800/50 border border-gray-700/80 rounded-xl flex flex-col">
                <h2 className="text-xl font-bold p-4 border-b border-gray-700 flex-shrink-0">1. Image Tray</h2>
                <div className="flex-grow p-4 overflow-y-auto">
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingOver(false);
                            handleFileSelect(e.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`mb-4 p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDraggingOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                    >
                         <UploadIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                         <p className="font-semibold text-gray-300">Upload Images</p>
                         <p className="text-xs text-gray-500">or drag & drop</p>
                    </div>
                     <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files)} className="hidden" accept="image/*" />

                    <div className="grid grid-cols-2 gap-3">
                         {uploadedFiles.map(file => (
                            <div key={file.id} className="group relative aspect-square rounded-md overflow-hidden bg-black">
                                <img src={file.url} alt={file.file.name} className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                    <button onClick={() => handleAddToStage(file)} className="text-white bg-blue-600 hover:bg-blue-500 rounded-md py-2 px-3 text-sm font-semibold flex items-center gap-2">
                                        <PlusIcon className="w-5 h-5"/> Add to Scene
                                    </button>
                                </div>
                                <button onClick={() => handleRemoveFromTray(file.id)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                         ))}
                    </div>
                </div>
            </aside>
            
            {/* Center Column: Composition Stage */}
            <main className="flex-grow w-full lg:w-1/2 xl:w-3/5 bg-gray-800/50 border border-gray-700/80 rounded-xl flex flex-col">
                 <h2 className="text-xl font-bold p-4 border-b border-gray-700 flex-shrink-0">2. Composition Stage</h2>
                 <div className="flex-grow p-4 overflow-y-auto">
                    {stagedImages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center text-gray-500 p-8">
                           <p className="max-w-xs">Add at least two images from your tray to start composing a new scene.</p>
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stagedImages.map(image => (
                               <div key={image.id} className="group relative bg-gray-900/50 p-2 rounded-lg border border-gray-700 flex flex-col gap-2">
                                   <div className="relative aspect-square rounded-md overflow-hidden bg-black">
                                        <img src={image.url} alt={image.file.name} className="w-full h-full object-cover"/>
                                        <button onClick={() => handleReturnToTray(image)} className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 rounded-full text-white hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100" title="Return to tray">
                                            <ArrowUturnLeftIcon className="w-4 h-4" />
                                        </button>
                                   </div>
                                   <input
                                        type="text"
                                        value={image.role}
                                        onChange={(e) => handleRoleChange(image.id, e.target.value)}
                                        placeholder="Describe this image's role..."
                                        className="w-full bg-gray-800 border border-gray-600 text-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                                   />
                               </div>
                            ))}
                         </div>
                    )}
                 </div>
            </main>

            {/* Right Column: Controls & Output */}
            <aside className="w-full lg:w-1/4 xl:w-1/5 bg-gray-800/50 border border-gray-700/80 rounded-xl flex flex-col">
                 <h2 className="text-xl font-bold p-4 border-b border-gray-700 flex-shrink-0">3. Controls & Output</h2>
                 <div className="p-4 flex flex-col gap-4 flex-grow">
                     <div>
                        <label htmlFor="masterPrompt" className="block text-sm font-medium text-gray-300 mb-1">Master Prompt</label>
                        <textarea
                            id="masterPrompt"
                            value={masterPrompt}
                            onChange={(e) => { setMasterPrompt(e.target.value); setShowRegenerate(false); }}
                            placeholder="e.g., Place the man in the forest scene. Use the style from the painting."
                            rows={5}
                            className="w-full bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                        />
                     </div>
                      {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-lg text-center text-sm">
                            {error}
                        </div>
                      )}
                     <div className="flex flex-col gap-2">
                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? <Spinner /> : 'Generate Scene'}
                        </button>
                        {showRegenerate && !isLoading && (
                            <button
                                onClick={handleGenerate}
                                className="w-full bg-gray-700/60 hover:bg-gray-700 border border-gray-600 text-gray-200 font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base active:scale-95 animate-fade-in"
                                title="Try generating this scene again"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Regenerate
                            </button>
                        )}
                     </div>
                 </div>
                 <div className="p-4 border-t border-gray-700 flex-grow-[2] flex flex-col">
                     <h3 className="text-md font-semibold mb-2">Result</h3>
                     <div className="flex-grow w-full bg-black/20 rounded-lg flex items-center justify-center">
                        {isLoading ? (
                            <Spinner size="lg"/>
                        ) : outputImageUrl ? (
                            <img src={outputImageUrl} alt="Generated scene" className="w-full h-auto object-contain rounded-lg max-h-full" />
                        ) : (
                            <p className="text-gray-500 text-sm p-4 text-center">Output will appear here</p>
                        )}
                     </div>
                     {outputImageUrl && !isLoading && (
                        <a href={outputImageUrl} download={`composed-scene-${Date.now()}.png`} className="w-full mt-4 text-center bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Download
                        </a>
                     )}
                 </div>
            </aside>
        </div>
    );
};

export default SceneComposerPage;
