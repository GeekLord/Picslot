/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useCallback } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from './icons';
import saveAs from 'file-saver';
import type { HistoryImage } from './ImageStudioPage';


interface ImageStudioZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: HistoryImage[];
  currentIndex: number;
  onNavigate: (newIndex: number) => void;
}

const ImageStudioZoomModal: React.FC<ImageStudioZoomModalProps> = ({ isOpen, onClose, images, currentIndex, onNavigate }) => {
    
    const handleNext = useCallback(() => {
        if (images.length > 0) {
            onNavigate((currentIndex + 1) % images.length);
        }
    }, [currentIndex, images.length, onNavigate]);

    const handlePrev = useCallback(() => {
        if (images.length > 0) {
            onNavigate((currentIndex - 1 + images.length) % images.length);
        }
    }, [currentIndex, images.length, onNavigate]);

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

    if (!isOpen || images.length === 0 || currentIndex < 0) {
        return null;
    }

    const currentImage = images[currentIndex];
    const canNavigate = images.length > 1;

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        saveAs(currentImage.file, `picslot-studio-${currentImage.id}.png`);
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
                <button
                    onClick={handleDownload}
                    className="p-2 rounded-full text-white bg-black/40 hover:bg-black/70 transition-colors"
                    aria-label="Download image"
                    title="Download Image"
                >
                    <DownloadIcon className="w-8 h-8" />
                </button>
                <button 
                    onClick={onClose} 
                    className="p-2 rounded-full text-white bg-black/40 hover:bg-black/70 transition-colors"
                    aria-label="Close zoomed image view"
                >
                    <XMarkIcon className="w-8 h-8" />
                </button>
            </div>

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
                        src={currentImage.url} 
                        alt={currentImage.prompt} 
                        className="object-contain max-w-[85vw] max-h-[80vh] rounded-lg shadow-2xl"
                    />
                </div>
               
                <div className="bg-black/50 text-white px-4 py-2 rounded-lg w-full max-w-2xl text-center">
                    <p className="font-semibold truncate" title={currentImage.prompt}>{currentImage.prompt}</p>
                    <p className="text-sm text-gray-300">{images.length - currentIndex} / {images.length}</p>
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

export default ImageStudioZoomModal;