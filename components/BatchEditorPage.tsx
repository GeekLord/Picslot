/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import * as geminiService from '../services/geminiService';
import { UploadIcon, DownloadIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from './icons';
import Spinner from './Spinner';
import PromptSelector from './PromptSelector';
import type { Prompt } from '../types';
import BatchZoomModal from './BatchZoomModal';


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

type BatchAction = 'none' | 'remove-background' | 'auto-enhance' | 'restore' | 'filter' | 'adjustment';
type ImageStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ImageJob {
  id: string;
  originalFile: File;
  originalUrl: string;
  processedFile: File | null;
  processedUrl: string | null;
  status: ImageStatus;
  error: string | null;
}

interface BatchEditorPageProps {
  prompts: Prompt[];
  onOpenAssetLibrary: (onSelect: (files: File[]) => void, config: { multiSelect: boolean, selectButtonText: string }) => void;
}

const BatchEditorPage: React.FC<BatchEditorPageProps> = ({ prompts, onOpenAssetLibrary }) => {
    const [jobs, setJobs] = useState<ImageJob[]>([]);
    const [action, setAction] = useState<BatchAction>('none');
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
    const [zoomedJobIndex, setZoomedJobIndex] = useState(0);

    const handleFileSelect = useCallback((files: FileList | null | File[]) => {
        if (!files) return;
        const fileArray = Array.isArray(files) ? files : Array.from(files);
        const newJobs: ImageJob[] = fileArray
            .filter(file => file.type.startsWith('image/'))
            .map(file => ({
                id: `${file.name}-${file.lastModified}-${Math.random()}`,
                originalFile: file,
                originalUrl: URL.createObjectURL(file),
                processedFile: null,
                processedUrl: null,
                status: 'pending',
                error: null,
            }));
        setJobs(prevJobs => [...prevJobs, ...newJobs]);
    }, []);
    
    // FIX: Bug fix for 404 error.
    // The cleanup effect for Object URLs should only run when the component unmounts.
    // An empty dependency array [] ensures this. Previously, it was [jobs], causing
    // URLs to be revoked on every state update, which broke the image previews.
    useEffect(() => {
        // Create a local copy of the jobs array to avoid stale closures in the cleanup function.
        const currentJobs = jobs;
        return () => {
            console.log('[BatchEditorPage] Unmounting, revoking all Object URLs.');
            currentJobs.forEach(job => {
                URL.revokeObjectURL(job.originalUrl);
                if (job.processedUrl) {
                    URL.revokeObjectURL(job.processedUrl);
                }
            });
        };
    }, []); // Empty dependency array ensures this runs only once on mount and cleans up on unmount.
    
    const handleRemoveJob = useCallback((jobIdToRemove: string) => {
        setJobs(prevJobs => {
            const jobToRemove = prevJobs.find(job => job.id === jobIdToRemove);
            if (jobToRemove) {
                URL.revokeObjectURL(jobToRemove.originalUrl);
                if(jobToRemove.processedUrl) {
                    URL.revokeObjectURL(jobToRemove.processedUrl);
                }
            }
            return prevJobs.filter(job => job.id !== jobIdToRemove);
        });
    }, []);

    const completedJobs = useMemo(() => jobs.filter(job => job.status === 'completed'), [jobs]);

    const handleOpenZoom = useCallback((jobToZoom: ImageJob) => {
        const indexInCompleted = completedJobs.findIndex(job => job.id === jobToZoom.id);
        if (indexInCompleted > -1) {
            setZoomedJobIndex(indexInCompleted);
            setIsZoomModalOpen(true);
        }
    }, [completedJobs]);

    const getApiFunction = (selectedAction: BatchAction) => {
        switch (selectedAction) {
            case 'auto-enhance': return geminiService.generateAutoEnhancedImage;
            case 'remove-background': return geminiService.generateRemovedBackgroundImage;
            case 'restore': return geminiService.generateRestoredImage;
            case 'filter': return (file: File) => geminiService.generateFilteredImage(file, prompt);
            case 'adjustment': return (file: File) => geminiService.generateAdjustedImage(file, prompt);
            default: return null;
        }
    };

    const processSingleJob = useCallback(async (job: ImageJob, apiFn: (file: File) => Promise<string>) => {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing', error: null } : j));
        try {
            const resultUrl = await apiFn(job.originalFile);
            const newImageFile = dataURLtoFile(resultUrl, `processed-${job.originalFile.name}`);
            const newImageUrl = URL.createObjectURL(newImageFile);

            setJobs(prev => prev.map(j => j.id === job.id ? {
                ...j,
                status: 'completed',
                processedFile: newImageFile,
                processedUrl: newImageUrl,
                error: null,
            } : j));
            return true;
        } catch (err: any) {
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'error', error: err.message || 'Unknown error' } : j));
            return false;
        }
    }, []);

    const startProcessing = async () => {
        setIsProcessing(true);
        setProcessingProgress(0);
        const apiFn = getApiFunction(action);
        if (!apiFn) {
            console.error("No API function for selected action");
            setIsProcessing(false);
            return;
        }
        
        let processedCount = 0;
        const jobsToProcess = jobs.filter(j => j.status === 'pending');
        const totalJobsToProcess = jobsToProcess.length;

        for (const job of jobsToProcess) {
            await processSingleJob(job, apiFn);
            processedCount++;
            setProcessingProgress((processedCount / totalJobsToProcess) * 100);
        }
        setIsProcessing(false);
    };

    const handleRegenerateJob = useCallback(async (jobId: string) => {
        const jobToRegen = jobs.find(j => j.id === jobId);
        if (!jobToRegen || isProcessing) return;

        const apiFn = getApiFunction(action);
        if (!apiFn) {
            console.error("Cannot regenerate: no action selected.");
            return;
        }
        
        // Revoke old processed URL if it exists
        if(jobToRegen.processedUrl) {
            URL.revokeObjectURL(jobToRegen.processedUrl);
        }

        await processSingleJob(jobToRegen, apiFn);

    }, [jobs, action, prompt, isProcessing, processSingleJob]);
    
    const downloadAllAsZip = async () => {
        setIsZipping(true);
        const zip = new JSZip();
        const completedJobsToZip = jobs.filter(job => job.status === 'completed' && job.processedFile);
    
        for (const job of completedJobsToZip) {
            zip.file(job.processedFile!.name, job.processedFile!);
        }
    
        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `picslot-batch-${new Date().toISOString()}.zip`);
        } catch (error) {
            console.error("Failed to create zip file", error);
        } finally {
            setIsZipping(false);
        }
    };

    const completedJobsCount = completedJobs.length;
    const isPromptRequired = action === 'filter' || action === 'adjustment';
    const canStartProcessing = jobs.some(j => j.status === 'pending') && action !== 'none' && !isProcessing && (!isPromptRequired || prompt.trim() !== '');

    if (jobs.length === 0) {
        return (
            <div 
                className={`w-full h-full flex-grow flex items-center justify-center transition-all duration-300 rounded-2xl border-4 ${isDraggingOver ? 'bg-blue-500/10 border-dashed border-blue-400' : 'border-transparent'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    handleFileSelect(e.dataTransfer.files);
                }}
            >
                <div className="text-center p-8 max-w-3xl">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-gray-800/60 border border-gray-700/80 rounded-2xl flex items-center justify-center">
                            <UploadIcon className="w-10 h-10 text-gray-400" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-extrabold tracking-tight text-gray-100">Batch Editor</h1>
                    <p className="max-w-2xl mt-4 text-lg text-gray-400">Process multiple images at once. Drag and drop your files here or click to upload.</p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files)} className="hidden" accept="image/*" />
                        <button onClick={() => fileInputRef.current?.click()} className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-full cursor-pointer group hover:bg-blue-500 transition-colors">
                            <UploadIcon className="w-6 h-6 mr-3" />
                            Select Images
                        </button>
                         <button onClick={() => onOpenAssetLibrary(
                            (files) => handleFileSelect(files),
                            { multiSelect: true, selectButtonText: 'Add to Batch' }
                         )} className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-200 bg-gray-700/60 rounded-full cursor-pointer hover:bg-gray-700 transition-colors">
                            From Library
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in flex flex-col h-full gap-6">
            <header>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-100">Batch Editor</h1>
                <p className="mt-2 text-lg text-gray-400">Apply one action to all {jobs.length} of your images.</p>
            </header>

            <div className="relative bg-gray-800/50 border border-gray-700/80 rounded-xl p-4 flex flex-col md:flex-row md:flex-wrap items-center justify-between gap-4 sticky top-[80px] z-20 backdrop-blur-sm overflow-hidden">
                {/* Left group: Action selection and prompt */}
                <div className="w-full flex-grow-[3] md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <select 
                        value={action} 
                        onChange={(e) => setAction(e.target.value as BatchAction)} 
                        className="bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full md:w-auto md:max-w-xs"
                    >
                        <option value="none" disabled>Select an Action...</option>
                        <option value="auto-enhance">Auto Enhance</option>
                        <option value="remove-background">Remove Background</option>
                        <option value="restore">Photo Restore</option>
                        <option value="filter">Apply Filter</option>
                        <option value="adjustment">Apply Adjustment</option>
                    </select>

                    {isPromptRequired && (
                        <div className="flex-grow w-full flex flex-col gap-0 animate-fade-in">
                            <PromptSelector prompts={prompts} onSelect={setPrompt} />
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="Enter prompt for filter/adjustment..."
                                rows={2}
                                className="w-full bg-gray-800 border border-t-0 border-gray-700 text-gray-200 rounded-b-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Right group: Job buttons */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full sm:w-auto bg-gray-700/80 hover:bg-gray-700 text-gray-200 font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Add Images
                    </button>
                    <button 
                        onClick={startProcessing} 
                        disabled={!canStartProcessing} 
                        className="w-full sm:w-auto bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : `Start Batch Job (${jobs.filter(j => j.status === 'pending').length})`}
                    </button>
                    <button 
                        onClick={downloadAllAsZip} 
                        disabled={completedJobsCount === 0 || isZipping} 
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px]"
                    >
                        {isZipping ? <Spinner size="sm" /> : `Download All (${completedJobsCount})`}
                    </button>
                </div>
                {isProcessing && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/20">
                        <div className="bg-blue-500 h-1" style={{ width: `${processingProgress}%`, transition: 'width 0.2s linear' }}></div>
                    </div>
                )}
            </div>
            
            <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files)} className="hidden" accept="image/*" />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {jobs.map(job => <ImageJobCard key={job.id} job={job} onRemove={handleRemoveJob} onZoom={handleOpenZoom} onRegenerate={handleRegenerateJob} />)}
            </div>
            
            <BatchZoomModal 
                isOpen={isZoomModalOpen}
                onClose={() => setIsZoomModalOpen(false)}
                jobs={completedJobs}
                initialIndex={zoomedJobIndex}
            />
        </div>
    );
};


const ImageJobCard: React.FC<{ job: ImageJob; onRemove: (id: string) => void; onZoom: (job: ImageJob) => void; onRegenerate: (id: string) => void; }> = ({ job, onRemove, onZoom, onRegenerate }) => {
    const canZoom = job.status === 'completed';
    // FIX: Removed redundant `job.status !== 'processing'` check.
    // If a job status is 'completed' or 'error', it can't be 'processing'.
    const canRegenerate = job.status === 'completed' || job.status === 'error';

    const getStatusBadge = () => {
        switch (job.status) {
            case 'pending': return <span className="bg-gray-600 text-gray-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">Pending</span>;
            case 'processing': return <span className="bg-yellow-600 text-yellow-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">Processing</span>;
            case 'completed': return <span className="bg-green-600 text-green-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1"><CheckIcon className="w-3 h-3"/>Completed</span>;
            case 'error': return <span className="bg-red-600 text-red-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">Error</span>;
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(job.processedFile) {
            saveAs(job.processedFile, job.processedFile.name);
        }
    }
    
    const handleRegenerateClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRegenerate(job.id);
    }

    return (
        <div 
            onClick={canZoom ? () => onZoom(job) : undefined}
            className={`group relative aspect-square w-full bg-gray-800/50 border border-gray-700/60 rounded-xl overflow-hidden flex flex-col text-sm transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 ${canZoom ? 'cursor-pointer' : ''}`}
        >
            {job.status === 'pending' && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemove(job.id); }}
                    className="absolute top-1.5 right-1.5 p-1.5 bg-black/50 text-gray-300 hover:bg-red-600 hover:text-white rounded-full transition-colors z-10"
                    aria-label="Remove image"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            )}
            <div className="relative flex-grow bg-black/20">
                 <div 
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-300 group-hover:opacity-0"
                    style={{ backgroundImage: `url(${job.processedUrl || job.originalUrl})` }} 
                />
                {job.processedUrl && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{ backgroundImage: `url(${job.originalUrl})` }} 
                    />
                )}
                {!job.processedUrl && (
                    <div 
                         className="absolute inset-0 bg-cover bg-center"
                         style={{ backgroundImage: `url(${job.originalUrl})` }}
                    />
                )}

                {job.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Spinner size="md" />
                    </div>
                )}
                 {job.status === 'completed' && (
                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Show Original
                    </div>
                 )}
            </div>
            <div className="p-2 bg-gray-900/50 border-t border-gray-700/60">
                <p className="font-semibold text-white truncate">{job.originalFile.name}</p>
                <div className="flex items-center justify-between mt-1">
                    {getStatusBadge()}
                    <div className="flex items-center gap-1">
                        {canRegenerate && 
                            <button onClick={handleRegenerateClick} className="p-1 text-gray-300 hover:text-blue-400" title="Regenerate this image">
                                <ArrowPathIcon className="w-5 h-5"/>
                            </button>
                        }
                        {job.status === 'completed' && 
                            <button onClick={handleDownload} className="p-1 text-gray-300 hover:text-white" title="Download this image">
                                <DownloadIcon className="w-5 h-5"/>
                            </button>
                        }
                    </div>
                </div>
                {job.status === 'error' && (
                     <p className="text-xs text-red-400 mt-1 truncate" title={job.error ?? 'Unknown error'}>Error: {job.error}</p>
                )}
            </div>
        </div>
    );
}

export default BatchEditorPage;