/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface BrushControlsProps {
  brushSize: number;
  isErasing: boolean;
  onBrushSizeChange: (size: number) => void;
  onIsErasingChange: (isErasing: boolean) => void;
  onClear: () => void;
}

const BrushControls: React.FC<BrushControlsProps> = ({ brushSize, isErasing, onBrushSizeChange, onIsErasingChange, onClear }) => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md p-3 rounded-lg flex items-center gap-4 z-20 shadow-lg animate-fade-in">
      <div className="flex items-center gap-2">
        <label htmlFor="brushSize" className="text-white text-sm font-semibold">Size:</label>
        <input
          id="brushSize"
          type="range"
          min="5"
          max="100"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-32 cursor-pointer"
        />
      </div>

      <div className="w-px h-6 bg-gray-500/50" />
      
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onIsErasingChange(false)}
          className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
            !isErasing ? 'bg-blue-500 text-white' : 'bg-gray-600/50 text-gray-200 hover:bg-gray-600'
          }`}
        >
          Brush
        </button>
        <button
          type="button"
          onClick={() => onIsErasingChange(true)}
          className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
            isErasing ? 'bg-blue-500 text-white' : 'bg-gray-600/50 text-gray-200 hover:bg-gray-600'
          }`}
        >
          Erase
        </button>
      </div>

      <div className="w-px h-6 bg-gray-500/50" />
      
      <button type="button" onClick={onClear} className="text-gray-300 hover:text-white font-semibold text-sm">
        Clear Mask
      </button>
    </div>
  );
};

export default BrushControls;