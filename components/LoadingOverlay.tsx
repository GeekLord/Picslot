
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { SparkleIcon } from './icons';

interface LoadingOverlayProps {
  message?: string;
}

const loadingMessages = [
  "Analyzing image composition...",
  "Applying creative adjustments...",
  "Enhancing lighting and details...",
  "Refining textures...",
  "Polishing final result...",
  "Almost there..."
];

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 z-30 flex flex-col items-center justify-center gap-6 animate-fade-in backdrop-blur-sm rounded-xl">
      <div className="relative">
        <div className="absolute inset-0 bg-violet-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
        <SparkleIcon className="w-12 h-12 text-violet-500 animate-spin-slow relative z-10" />
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-lg font-bold text-slate-900 dark:text-white animate-pulse">
          {message || "Working Magic..."}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 h-5 transition-all duration-300 ease-in-out">
          {loadingMessages[currentMessageIndex]}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
