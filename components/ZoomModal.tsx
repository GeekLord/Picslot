/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect } from 'react';
import { XMarkIcon as CloseIcon } from './icons';

interface ZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

const ZoomModal: React.FC<ZoomModalProps> = ({ isOpen, onClose, imageUrl }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!isOpen || !imageUrl) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                aria-label="Close zoomed image view"
            >
                <CloseIcon className="w-8 h-8" />
            </button>
            <div 
                className="relative max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image container
            >
                <img 
                    src={imageUrl} 
                    alt="Zoomed view" 
                    className="object-contain max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
                />
            </div>
        </div>
    );
};

export default ZoomModal;