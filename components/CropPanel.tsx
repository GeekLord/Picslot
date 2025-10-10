/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface CropPanelProps {
  onApplyCrop: () => void;
  onSetAspect: (aspect: number | undefined) => void;
  isLoading: boolean;
  isCropping: boolean;
  imageAspect?: number;
}

// By defining the type for the groups, we ensure type safety and prevent TypeScript
// from widening the string literal values 'original' and 'free' to the 'string' type.
const aspectRatioGroups: { [key: string]: { [key: string]: number | 'original' | 'free' } } = {
    'Special': { 'Original': 'original', 'Free': 'free' },
    'Landscape': { '21:9': 21/9, '16:9': 16/9, '4:3': 4/3, '3:2': 3/2 },
    'Square': { '1:1': 1/1 },
    'Portrait': { '9:16': 9/16, '3:4': 3/4, '2:3': 2/3 },
    'Flexible': { '5:4': 5/4, '4:5': 4/5 }
};


const CropPanel: React.FC<CropPanelProps> = ({ onApplyCrop, onSetAspect, isLoading, isCropping, imageAspect }) => {
  const [activeAspect, setActiveAspect] = useState<string>('free');
  
  const handleAspectChange = (name: string, value: number | 'original' | 'free') => {
    setActiveAspect(name);
    if (value === 'original') {
        onSetAspect(imageAspect);
    } else if (value === 'free') {
        onSetAspect(undefined);
    } else {
        onSetAspect(value as number);
    }
  }

  const renderButtons = (group: { [key: string]: number | 'original' | 'free' }) => {
    return Object.entries(group).map(([name, value]) => (
        <button
          type="button"
          key={name}
          onClick={() => handleAspectChange(name, value)}
          disabled={isLoading || (name === 'Original' && !imageAspect)}
          className={`px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            activeAspect === name 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'bg-gray-700/60 hover:bg-gray-700 text-gray-200'
          }`}
        >
          {name}
        </button>
    ));
  }

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      <p className="text-sm text-gray-400 -mt-2">Select a preset or drag freely on the image.</p>
      
      <div className="grid grid-cols-2 gap-2">
        {renderButtons(aspectRatioGroups['Special'])}
      </div>
      
      {Object.entries(aspectRatioGroups).map(([groupName, group]) => {
        if (groupName === 'Special') return null;

        const gridColsClass = Object.keys(group).length <= 2 ? `grid-cols-2` : `grid-cols-4`;
        
        return (
          <div key={groupName}>
              <p className="text-xs text-gray-400 mb-1">{groupName}</p>
              <div className={`grid ${gridColsClass} gap-2`}>
                {renderButtons(group)}
              </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={onApplyCrop}
        disabled={isLoading || !isCropping}
        className="w-full mt-2 bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 text-base disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed"
      >
        Apply Crop
      </button>
    </div>
  );
};

export default CropPanel;