/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import type { Prompt } from '../types';

interface PromptSelectorProps {
  prompts: Prompt[];
  onSelect: (prompt: string) => void;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({ prompts, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredPrompts = prompts.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (prompt: Prompt) => {
    onSelect(prompt.prompt);
    setSearchTerm(prompt.title);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search saved prompts or type a new one below..."
        className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-t-lg p-3 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
      />
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-gray-800 border border-t-0 border-gray-700 rounded-b-lg shadow-lg max-h-60 overflow-y-auto z-20 animate-fade-in-fast">
          {filteredPrompts.length > 0 ? (
            <ul>
              {filteredPrompts.map(prompt => (
                <li
                  key={prompt.id}
                  onClick={() => handleSelect(prompt)}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-700 transition-colors text-gray-200"
                >
                  <p className="font-semibold">{prompt.title}</p>
                  <p className="text-xs text-gray-400 truncate">{prompt.prompt}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
                {prompts.length === 0 ? "You have no saved prompts." : "No prompts found."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptSelector;