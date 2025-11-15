/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon as CloseIcon, MagnifyingGlassPlusIcon } from './icons';

interface ZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

const ZoomModal: React.FC<ZoomModalProps> = ({ isOpen, onClose, imageUrl }) => {
    const [isMagnifierActive, setIsMagnifierActive] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isImageHovered, setIsImageHovered] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const magnifierSize = 200;
    const zoomLevel = 2.5;

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

    useEffect(() => {
        // Reset magnifier state when modal is opened/closed or image changes
        if (isOpen) {
            setIsMagnifierActive(false);
        }
    }, [isOpen, imageUrl]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            setPosition({ x, y });
            if (!isImageHovered) setIsImageHovered(true);
        } else {
            if (isImageHovered) setIsImageHovered(false);
        }
    };

    if (!isOpen || !imageUrl) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsMagnifierActive(!isMagnifierActive); }}
                    className={`p-2 rounded-full text-white transition-colors ${isMagnifierActive ? 'bg-violet-500' : 'bg-black/40 hover:bg-black/70'}`}
                    aria-label="Toggle magnifier"
                    title="Toggle Magnifier"
                >
                    <MagnifyingGlassPlusIcon className="w-8 h-8" />
                </button>
                <button 
                    onClick={onClose} 
                    className="p-2 rounded-full text-white bg-black/40 hover:bg-black/70 transition-colors"
                    aria-label="Close zoomed image view"
                >
                    <CloseIcon className="w-8 h-8" />
                </button>
            </div>

            <div 
                className="relative max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()}
                onMouseMove={isMagnifierActive ? handleMouseMove : undefined}
                onMouseLeave={isMagnifierActive ? () => setIsImageHovered(false) : undefined}
                style={{ cursor: isMagnifierActive && isImageHovered ? 'none' : 'default' }}
            >
                <img 
                    ref={imageRef}
                    src={imageUrl} 
                    alt="Zoomed view" 
                    className="object-contain max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
                />

                {isMagnifierActive && isImageHovered && (
                    <div
                        className="absolute pointer-events-none border-4 border-white rounded-full bg-no-repeat shadow-lg"
                        style={{
                            height: `${magnifierSize}px`,
                            width: `${magnifierSize}px`,
                            left: `${position.x - magnifierSize / 2}px`,
                            top: `${position.y - magnifierSize / 2}px`,
                            backgroundImage: `url(${imageUrl})`,
                            backgroundSize: `${(imageRef.current?.width || 0) * zoomLevel}px ${(imageRef.current?.height || 0) * zoomLevel}px`,
                            backgroundPosition: `-${position.x * zoomLevel - magnifierSize / 2}px -${position.y * zoomLevel - magnifierSize / 2}px`,
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default ZoomModal;