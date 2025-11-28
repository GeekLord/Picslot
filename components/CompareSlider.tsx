
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CompareSliderProps {
  originalImageUrl: string;
  currentImageUrl: string;
}

const CompareSlider: React.FC<CompareSliderProps> = ({ originalImageUrl, currentImageUrl }) => {
  const [sliderPosition, setSliderPosition] = useState(50); // Percentage from 0 to 100
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleInteractionStart = (clientX: number) => {
    isDragging.current = true;
    setIsInteracting(true);
    handleMove(clientX);
  };
  
  const handleInteractionEnd = () => {
    isDragging.current = false;
    setIsInteracting(false);
  };
  
  const handleInteractionMove = (clientX: number) => {
    if (!isDragging.current) return;
    handleMove(clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleInteractionMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleInteractionMove(e.touches[0].clientX);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleInteractionEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [handleInteractionMove]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-h-[70vh] overflow-hidden rounded-xl select-none cursor-ew-resize group"
      onMouseDown={(e) => handleInteractionStart(e.clientX)}
      onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX)}
    >
      {/* Current (After) Image - Base Layer */}
      <img
        src={currentImageUrl}
        alt="Edited version"
        draggable={false}
        className="w-full h-auto object-contain max-h-[70vh] rounded-xl pointer-events-none"
      />
      
      {/* "After" Label */}
      <div 
        className={`absolute top-4 right-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded transition-opacity duration-300 pointer-events-none ${isInteracting ? 'opacity-0' : 'opacity-100'}`}
      >
        Edited
      </div>

      {/* Original (Before) Image - Top Layer, Clipped */}
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={originalImageUrl}
          alt="Original version"
          draggable={false}
          className="w-full h-auto object-contain max-h-[70vh] rounded-xl pointer-events-none"
        />
        {/* "Before" Label (inside the clipped container) */}
        <div 
            className={`absolute top-4 left-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded transition-opacity duration-300 pointer-events-none ${isInteracting ? 'opacity-0' : 'opacity-100'}`}
        >
            Original
        </div>
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white/80 pointer-events-none"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 bg-white/90 dark:bg-slate-800/90 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm">
          <svg className="w-6 h-6 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CompareSlider;
