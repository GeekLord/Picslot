
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PhotoIcon, DownloadIcon, MagicWandIcon, BookmarkIcon, ArrowPathIcon, XMarkIcon, SparkleIcon, ZoomInIcon } from './icons';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import Spinner from './Spinner';
import * as geminiService from '../services/geminiService';
import type { AspectRatio } from '../services/geminiService';
import { generateEditedImage } from '../services/geminiService';
import PromptSelector from './PromptSelector';
import type { Prompt } from '../types';
import ImageStudioZoomModal from './ImageStudioZoomModal';
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

export interface HistoryImage {
    id: string;
    file: File;
    url: string;
    prompt: string;
    aspectRatio: AspectRatio;
    type: 'generate' | 'edit';
    sourceImageId?: string;
}

interface ImageStudioPageProps {
  prompts: Prompt[];
}

const aspectRatios: { label: string, hint: string, values: AspectRatio[] }[] = [
    { label: 'Standard', hint: 'Gemini Optimized Ratios', values: ['1:1', '4:3', '3:4', '16:9', '9:16'] }
];

// Helper component to render a visual icon for the aspect ratio
const AspectRatioIcon: React.FC<{ ratio: AspectRatio }> = ({ ratio }) => {
    // Calculate dimensions for the icon box based on the ratio string (e.g., "16:9")
    let width = 14;
    let height = 14;
    
    if (typeof ratio === 'string') {
        const [w, h] = ratio.split(':').map(Number);
        if (!isNaN(w) && !isNaN(h)) {
            // Normalize to fit within a 14x14 box (smaller for this view)
            if (w > h) {
                width = 14;
                height = (h / w) * 14;
            } else {
                height = 14;
                width = (w / h) * 14;
            }
        }
    }

    return (
        <div 
            className="border border-current rounded-sm" 
            style={{ width: `${width}px`, height: `${height}px` }}
        />
    );
};


const ImageStudioPage: React.FC<ImageStudioPageProps> = ({ prompts }) => {
    const [history, setHistory] = useState<HistoryImage[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [mode, setMode] = useState<'generate' | 'edit'>('generate');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isZipping, setIsZipping] = useState(false);
    const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);


    const [lastAction, setLastAction] = useState<{
        prompt: string;
        aspectRatio: AspectRatio;
        mode: 'generate' | 'edit';
        sourceImageId?: string;
    } | null>(null);
    
    const objectUrlsRef = useRef(new Set<string>());

    useEffect(() => {
        const urlsToClean = objectUrlsRef.current;
        return () => {
            urlsToClean.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);
    
    const selectedImage = useMemo(() => history.find(h => h.id === selectedImageId) || null, [history, selectedImageId]);
    const selectedImageIndex = useMemo(() => history.findIndex(h => h.id === selectedImageId), [history, selectedImageId]);

    const handleOpenZoom = () => {
        if (selectedImage) {
            setIsZoomModalOpen(true);
        }
    };

    const handleGenerate = async (isRegeneration = false) => {
        let actionToRun = isRegeneration ? lastAction : { prompt, aspectRatio, mode, sourceImageId: mode === 'edit' ? selectedImageId : undefined };

        if (!actionToRun || !actionToRun.prompt.trim()) {
            setError("Please enter a prompt.");
            return;
        }

        if (actionToRun.mode === 'edit' && !actionToRun.sourceImageId) {
            setError("Please select an image to edit.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let resultDataUrl: string;
            const sourceImage = history.find(h => h.id === actionToRun?.sourceImageId);

            if (actionToRun.mode === 'edit' && sourceImage) {
                resultDataUrl = await generateEditedImage(sourceImage.file, actionToRun.prompt);
            } else {
                resultDataUrl = await geminiService.generateImageFromText(actionToRun.prompt, actionToRun.aspectRatio);
            }
            
            const newFile = dataURLtoFile(resultDataUrl, `generated-${Date.now()}.png`);
            const newUrl = URL.createObjectURL(newFile);
            objectUrlsRef.current.add(newUrl);

            const newHistoryItem: HistoryImage = {
                id: `img-${Date.now()}`,
                file: newFile,
                url: newUrl,
                prompt: actionToRun.prompt,
                aspectRatio: actionToRun.aspectRatio,
                type: actionToRun.mode,
                sourceImageId: actionToRun.sourceImageId,
            };

            setHistory(prev => [newHistoryItem, ...prev]);
            setSelectedImageId(newHistoryItem.id);
            if (!isRegeneration) {
                setLastAction(actionToRun);
            }

        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
            setLastAction(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancing(true);
        try {
            const enhanced = await geminiService.enhancePrompt(prompt);
            setPrompt(enhanced);
        } catch (err: any) {
            setError(err.message || 'Failed to enhance prompt.');
        } finally {
            setIsEnhancing(false);
        }
    };
    
    const handleRemoveHistoryItem = (idToRemove: string) => {
        const itemToRemove = history.find(h => h.id === idToRemove);
        if (itemToRemove) {
            URL.revokeObjectURL(itemToRemove.url);
            objectUrlsRef.current.delete(itemToRemove.url);
        }

        setHistory(prev => {
            const newHistory = prev.filter(h => h.id !== idToRemove);
            if(selectedImageId === idToRemove) {
                setSelectedImageId(newHistory.length > 0 ? newHistory[0].id : null);
            }
            return newHistory;
        });
    };

    const handleDownloadAll = async () => {
        if (history.length === 0) return;

        setIsZipping(true);
        setError(null);
        const zip = new JSZip();

        history.forEach((item, index) => {
            // Use a consistent naming scheme for downloaded files
            const fileName = `picslot-studio-${history.length - index}.png`;
            zip.file(fileName, item.file);
        });

        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `picslot-studio-collection-${new Date().toISOString().split('T')[0]}.zip`);
        } catch (err) {
            console.error("Failed to create zip file", err);
            setError("Could not create the zip file. Please try again.");
        } finally {
            setIsZipping(false);
        }
    };


    const canEdit = !!selectedImage;
    useEffect(() => {
        if (!canEdit) {
            setMode('generate');
        }
    }, [canEdit]);


    return (
        <div className="w-full flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-fade-in">
            {/* Main Content */}
            <main className="w-full lg:w-2/3 flex-shrink-0 flex flex-col">
                <div className="flex-grow w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center p-4 relative shadow-sm">
                    {isLoading ? (
                        <LoadingOverlay message="Generating your masterpiece..." />
                    ) : selectedImage ? (
                        <div className="relative w-full h-full group">
                            <button type="button" onClick={handleOpenZoom} className="w-full h-full block">
                                <img src={selectedImage.url} alt={selectedImage.prompt} className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <ZoomInIcon className="w-12 h-12 text-white" />
                                </div>
                            </button>
                            <a 
                                href={selectedImage.url}
                                download={`picslot-studio-${selectedImage.id}.png`}
                                className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 hover:bg-black/80 text-white font-semibold py-2 px-4 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100 z-10"
                            >
                                <DownloadIcon className="w-5 h-5"/> Download
                            </a>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 dark:text-gray-500">
                             <PhotoIcon className="w-24 h-24 mx-auto text-slate-300 dark:text-gray-600"/>
                             <h2 className="mt-4 text-2xl font-bold text-slate-700 dark:text-gray-300">AI Image Studio</h2>
                             <p className="max-w-md mt-2 text-slate-500 dark:text-gray-500">Your generated images will appear here. Use the controls on the right to start creating.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Sidebar */}
            <aside className="w-full lg:w-1/3 bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700/80 rounded-xl flex flex-col shadow-sm">
                <div className="p-4 flex flex-col gap-4 border-b border-slate-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Controls</h2>

                    <div className="relative flex flex-col gap-0">
                        <PromptSelector prompts={prompts} onSelect={setPrompt} />
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="A cinematic shot of an astronaut on a horse..."
                            rows={3}
                            className="w-full bg-slate-100 dark:bg-gray-800 border border-t-0 border-slate-300 dark:border-gray-700 text-slate-900 dark:text-gray-200 rounded-b-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none pr-12"
                        />
                         <div className="absolute top-[calc(50%-28px)] right-3 flex items-center gap-2">
                            <button type="button" onClick={handleEnhancePrompt} title="Enhance Prompt with AI" className="p-2 text-slate-400 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-wait" disabled={isEnhancing || !prompt.trim()}>
                                {isEnhancing ? <Spinner size="sm" /> : <MagicWandIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Aspect Ratio</label>
                        {mode === 'edit' ? (
                            <div className="p-3 bg-slate-100 dark:bg-gray-900/50 rounded-lg text-center text-slate-500 dark:text-gray-400 text-sm border border-slate-200 dark:border-gray-700">
                                Matches source image aspect ratio
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {aspectRatios.map(({ label, hint, values }) => (
                                    <div key={label}>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">{label} <span className="text-slate-400 dark:text-gray-500">- {hint}</span></p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {values.map(ar => (
                                                <button 
                                                    key={ar} 
                                                    onClick={() => setAspectRatio(ar)} 
                                                    className={`py-2 rounded-md font-semibold transition-colors text-sm flex items-center justify-center gap-1 ${
                                                        aspectRatio === ar 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-slate-200 dark:bg-gray-700/60 hover:bg-slate-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    <AspectRatioIcon ratio={ar} />
                                                    {ar}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Mode</label>
                         <div className="flex bg-slate-200 dark:bg-gray-700/60 p-1 rounded-lg">
                            <button 
                                onClick={() => setMode('generate')} 
                                className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${
                                    mode === 'generate' 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-700'
                                }`}
                            >
                                Generate New
                            </button>
                            <button 
                                onClick={() => setMode('edit')} 
                                disabled={!canEdit} 
                                className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${
                                    mode === 'edit' 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-700'
                                } disabled:text-slate-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed`}
                            >
                                Edit Selected
                            </button>
                         </div>
                    </div>
                    
                    {error && <p className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-500/10 p-2 rounded-md text-sm">{error}</p>}
                    
                    <div className="flex flex-col gap-2">
                        <button onClick={() => handleGenerate(false)} disabled={isLoading || !prompt.trim()} className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-px active:scale-95 disabled:from-slate-400 dark:disabled:from-gray-600 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center">
                           {isLoading ? <Spinner /> : <><SparkleIcon className="w-5 h-5 mr-2"/>Generate</>}
                        </button>
                         {lastAction && !isLoading && (
                             <button
                                onClick={() => handleGenerate(true)}
                                className="w-full bg-slate-200 dark:bg-gray-700/60 hover:bg-slate-300 dark:hover:bg-gray-700 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base active:scale-95 animate-fade-in"
                                title="Try generating again"
                            >
                                <ArrowPathIcon className="w-5 h-5" />
                                Regenerate
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-grow p-4 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">History</h2>
                        <button
                            onClick={handleDownloadAll}
                            disabled={history.length === 0 || isZipping}
                            className="flex items-center gap-2 bg-slate-200 dark:bg-gray-700/80 hover:bg-slate-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 font-semibold py-1 px-3 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isZipping ? (
                                <>
                                    <Spinner size="sm"/> Zipping...
                                </>
                            ) : (
                                <>
                                    <DownloadIcon className="w-4 h-4" /> Download All
                                </>
                            )}
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                        {history.length > 0 ? (
                             <div className="grid grid-cols-3 gap-2">
                                {history.map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => setSelectedImageId(item.id)} 
                                        className={`group relative aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-black border-2 transition-colors ${
                                            selectedImageId === item.id 
                                            ? 'border-blue-500' 
                                            : 'border-transparent hover:border-slate-400 dark:hover:border-gray-500'
                                        }`}
                                    >
                                        <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveHistoryItem(item.id); }} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100">
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </button>
                                ))}
                             </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center text-slate-400 dark:text-gray-500 text-sm">
                                <p>Your generated images will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <ImageStudioZoomModal
                isOpen={isZoomModalOpen}
                onClose={() => setIsZoomModalOpen(false)}
                images={history}
                currentIndex={selectedImageIndex}
                onNavigate={(newIndex) => {
                    if (history[newIndex]) {
                        setSelectedImageId(history[newIndex].id);
                    }
                }}
            />
        </div>
    );
};

export default ImageStudioPage;
