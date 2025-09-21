/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import type { ImageJob } from './BatchEditorPage';


interface BatchZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: ImageJob[];
  initialIndex: number;
}

const BatchZoomModal: React.FC<BatchZoomModalProps> = ({ isOpen, onClose, jobs, initialIndex }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showOriginal, setShowOriginal] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setShowOriginal(false); // Reset to show processed image first
        }
    }, [initialIndex, isOpen]);

    const handleNext = useCallback(() => {
        setCurrentIndex(prevIndex => (prevIndex + 1) % jobs.length);
    }, [jobs.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex(prevIndex => (prevIndex - 1 + jobs.length) % jobs.length);
    }, [jobs.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleNext, handlePrev, onClose]);

    if (!isOpen || jobs.length === 0) {
        return null;
    }

    const currentJob = jobs[currentIndex];
    const canNavigate = jobs.length > 1;
    const imageUrl = showOriginal ? currentJob.originalUrl : currentJob.processedUrl;

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors z-10 bg-black/30 rounded-full"
                aria-label="Close zoomed image view"
            >
                <XMarkIcon className="w-8 h-8" />
            </button>

            {canNavigate && (
                <button
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white bg-black/30 rounded-full hover:bg-black/60 transition-colors z-10"
                    aria-label="Previous image"
                >
                    <ChevronLeftIcon className="w-8 h-8" />
                </button>
            )}

            <div 
                className="relative max-w-full max-h-full flex flex-col items-center justify-center gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative">
                     <img 
                        src={imageUrl || ''} 
                        alt={`Zoomed view of ${currentJob.originalFile.name}`} 
                        className="object-contain max-w-[85vw] max-h-[80vh] rounded-lg shadow-2xl"
                    />
                </div>
               
                <div className="flex items-center justify-between gap-4 bg-black/50 text-white px-4 py-2 rounded-lg w-full max-w-md">
                    <div className="text-left">
                        <p className="font-semibold truncate">{currentJob.originalFile.name}</p>
                        <p className="text-sm text-gray-300">{currentIndex + 1} / {jobs.length}</p>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition-colors flex-shrink-0"
                    >
                        {showOriginal ? 'Show Processed' : 'Show Original'}
                    </button>
                </div>
            </div>

            {canNavigate && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white bg-black/30 rounded-full hover:bg-black/60 transition-colors z-10"
                    aria-label="Next image"
                >
                    <ChevronRightIcon className="w-8 h-8" />
                </button>
            )}
        </div>
    );
};

export default BatchZoomModal;