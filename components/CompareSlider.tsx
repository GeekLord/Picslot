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
    handleMove(clientX);
  };
  
  const handleInteractionEnd = () => {
    isDragging.current = false;
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
      className="relative w-full max-h-[70vh] overflow-hidden rounded-xl select-none cursor-ew-resize"
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
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white/80 pointer-events-none"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -left-5 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm">
          <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default CompareSlider;