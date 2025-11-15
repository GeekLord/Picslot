/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ChangeViewPanelProps {
  onApplyViewChange: (prompt: string) => Promise<void>;
  isLoading: boolean;
}

// Helper functions to generate descriptive text from state
const getAngleDescription = (yAngle: number): string => {
  const normalizedAngle = (yAngle % 360 + 360) % 360; // Ensure angle is 0-360
  if (normalizedAngle > 337.5 || normalizedAngle <= 22.5) return 'from the front';
  if (normalizedAngle > 22.5 && normalizedAngle <= 67.5) return 'from the front-right';
  if (normalizedAngle > 67.5 && normalizedAngle <= 112.5) return 'from the right side';
  if (normalizedAngle > 112.5 && normalizedAngle <= 157.5) return 'from the back-right';
  if (normalizedAngle > 157.5 && normalizedAngle <= 202.5) return 'from behind';
  if (normalizedAngle > 202.5 && normalizedAngle <= 247.5) return 'from the back-left';
  if (normalizedAngle > 247.5 && normalizedAngle <= 292.5) return 'from the left side';
  if (normalizedAngle > 292.5 && normalizedAngle <= 337.5) return 'from the front-left';
  return 'from the front';
};

const getHeightDescription = (xAngle: number): string => {
  if (xAngle < -15) return 'from a low angle';
  if (xAngle > 15) return 'from a high angle';
  return 'from eye-level';
};

const getDistanceDescription = (distance: number): string => {
  if (distance < 33) return 'an extreme close-up shot';
  if (distance < 66) return 'a medium shot';
  return 'a wide shot';
};


const ChangeViewPanel: React.FC<ChangeViewPanelProps> = ({ onApplyViewChange, isLoading }) => {
  const [rotation, setRotation] = useState({ x: -10, y: 0 }); // x: pitch, y: yaw
  const [distance, setDistance] = useState(50); // 0-100 for slider
  const [finalPrompt, setFinalPrompt] = useState('');
  
  const gizmoRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleInteractionStart = useCallback((clientX: number, clientY: number) => {
    isDragging.current = true;
    lastMousePos.current = { x: clientX, y: clientY };
    if (gizmoRef.current) {
        gizmoRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleInteractionEnd = useCallback(() => {
    isDragging.current = false;
    if (gizmoRef.current) {
        gizmoRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleInteractionMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    
    const deltaX = clientX - lastMousePos.current.x;
    const deltaY = clientY - lastMousePos.current.y;
    lastMousePos.current = { x: clientX, y: clientY };

    setRotation(prev => {
        // Clamp the vertical rotation to prevent flipping over
        const newX = Math.max(-60, Math.min(60, prev.x - deltaY * 0.5));
        const newY = prev.y + deltaX * 0.5;
        return { x: newX, y: newY };
    });
  }, []);

  useEffect(() => {
    const gizmo = gizmoRef.current;
    if (!gizmo) return;

    const onMouseMove = (e: MouseEvent) => handleInteractionMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY)
    };

    window.addEventListener('mousemove', onMouseMove);
    gizmo.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      gizmo.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [handleInteractionMove, handleInteractionEnd]);
  
  useEffect(() => {
    const angleDesc = getAngleDescription(rotation.y);
    const heightDesc = getHeightDescription(rotation.x);
    const distanceDesc = getDistanceDescription(distance);
    
    setFinalPrompt(`${distanceDesc}, ${heightDesc}, ${angleDesc}`);
  }, [rotation, distance]);
  
  const handleApply = async () => {
    if (finalPrompt) {
      try {
        await onApplyViewChange(finalPrompt);
        // On success, App.tsx will show the main Regenerate button.
      } catch (e) {
        console.error("View change failed", e);
      }
    }
  };


  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">Drag the 3D gizmo to set the camera angle and height.</p>
        
        {/* 3D Gizmo */}
        <div className="flex justify-center items-center my-4 h-48 select-none">
            <div 
                ref={gizmoRef}
                className="w-48 h-48 cursor-grab touch-none"
                style={{ perspective: '800px' }}
                onMouseDown={(e) => handleInteractionStart(e.clientX, e.clientY)}
                onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY)}
            >
                <div 
                    className="w-full h-full relative"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                        transition: isDragging.current ? 'none' : 'transform 0.2s ease-out'
                    }}
                >
                    {/* Subject Icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-violet-400/80 border-2 border-violet-200"></div>
                    
                    {/* Camera Icon */}
                    <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10"
                        style={{
                           transform: `translateZ(80px) rotateY(180deg) rotateX(${-rotation.x}deg)`, // Counter-rotate to face center
                        }}
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-300 flex items-center justify-center shadow-lg">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                        </div>
                    </div>

                    {/* Ground Plane */}
                    <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-slate-200/50 dark:bg-slate-700/20 rounded-full border border-dashed border-slate-300 dark:border-slate-600"
                        style={{
                            transform: 'translateY(20px) rotateX(90deg)'
                        }}
                    ></div>
                </div>
            </div>
        </div>

        {/* Distance Slider */}
        <div className="px-4">
            <label htmlFor="distance" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Distance: <span className="font-bold text-slate-900 dark:text-white">{getDistanceDescription(distance)}</span></label>
            <input id="distance" type="range" min="0" max="100" step="1" value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer" />
        </div>

        {/* Prompt Preview */}
        <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-600">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Generated Prompt:</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 font-mono">{finalPrompt}</p>
        </div>

        {/* Apply Button */}
        <div className="animate-fade-in flex flex-col gap-2 pt-2">
            <button
                type="button"
                onClick={handleApply}
                className="w-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-px active:scale-95 text-base disabled:from-slate-500 disabled:to-slate-600 disabled:shadow-none disabled:cursor-not-allowed"
                disabled={isLoading || !finalPrompt.trim()}
            >
                Apply View Change
            </button>
        </div>
    </div>
  );
};

export default ChangeViewPanel;