/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import type { Prompt } from '../types';
import * as supabaseService from '../services/supabaseService';
import { enhancePrompt, generatePromptTitle } from '../services/geminiService';
import type { User } from '@supabase/supabase-js';
import ConfirmationModal from './ConfirmationModal';
import { PlusIcon, TrashIcon, BookmarkIcon, MagicWandIcon, DuplicateIcon, ShareIcon, PlayIcon } from './icons';
import Spinner from './Spinner';
import SharePromptModal from './SharePromptModal';

interface PromptManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onRefreshPrompts: () => void;
  initialPrompts: Prompt[];
  onUsePrompt: (prompt: Prompt) => void;
}

const PromptManagerModal: React.FC<PromptManagerModalProps> = ({ isOpen, onClose, user, onRefreshPrompts, initialPrompts, onUsePrompt }) => {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<Prompt | null>(null);
  const [promptToShare, setPromptToShare] = useState<Prompt | null>(null);

  useEffect(() => {
      setPrompts(initialPrompts);
  }, [initialPrompts]);
  
  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setSelectedPrompt(null);
      setIsCreating(false);
      setTitle('');
      setPromptContent('');
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen]);

  const filteredPrompts = useMemo(() =>
    prompts.filter(p =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase())
    ), [prompts, searchTerm]);

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setTitle(prompt.title);
    setPromptContent(prompt.prompt);
    setIsCreating(false);
    setError(null);
  };

  const handleNewPrompt = () => {
    setSelectedPrompt(null);
    setTitle('');
    setPromptContent('');
    setIsCreating(true);
    setError(null);
  };
  
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !promptContent.trim() || !user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const saved = await supabaseService.savePrompt({
        id: isCreating ? null : selectedPrompt?.id,
        user_id: user.id,
        title: title.trim(),
        prompt: promptContent.trim(),
      });
      onRefreshPrompts();
      if (isCreating) {
        // After creating, switch to editing the new prompt
        handleSelectPrompt(saved);
      }
    } catch (err: any) {
      setError(`Failed to save prompt: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
      if (!promptToDelete) return;
      setIsLoading(true);
      setError(null);
      try {
          await supabaseService.deletePrompt(promptToDelete.id);
          onRefreshPrompts();
          if (selectedPrompt?.id === promptToDelete.id) {
            handleNewPrompt();
          }
      } catch (err: any) {
          setError(`Failed to delete prompt: ${err.message}`);
      } finally {
          setPromptToDelete(null);
          setIsLoading(false);
      }
  }

  const handleEnhance = async () => {
    if (!promptContent.trim()) return;
    setIsEnhancing(true);
    setError(null);
    try {
        const enhanced = await enhancePrompt(promptContent);
        setPromptContent(enhanced);
    } catch (err: any) {
        setError(`Failed to enhance prompt: ${err.message}`);
    } finally {
        setIsEnhancing(false);
    }
  };
  
  const handleGenerateTitle = async () => {
    if (!promptContent.trim()) return;
    setIsGeneratingTitle(true);
    setError(null);
    try {
      const generated = await generatePromptTitle(promptContent);
      setTitle(generated);
    } catch (err: any) {
      setError(`Failed to generate title: ${err.message}`);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedPrompt || !user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const duplicatedPromptData = {
        user_id: user.id,
        title: `Copy of ${selectedPrompt.title}`,
        prompt: selectedPrompt.prompt,
      };
      const saved = await supabaseService.savePrompt(duplicatedPromptData);
      
      // Update local state immediately for better UX
      setPrompts(prev => [saved, ...prev]);
      handleSelectPrompt(saved); // Select the new copy
      
      onRefreshPrompts(); // Also trigger a full refresh in the background
    } catch (err: any) {
      setError(`Failed to duplicate prompt: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (email: string) => {
    if (!promptToShare || !user) {
        throw new Error("No prompt selected to share.");
    };
    await supabaseService.sharePrompt(promptToShare.id, email);
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-800/80 border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] mx-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <BookmarkIcon className="w-6 h-6 text-blue-400"/>
            <h2 className="text-xl font-bold text-white">Prompt Manager</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </header>
        
        <div className="flex-grow flex min-h-0">
          {/* Left Panel: Prompt List */}
          <div className="w-1/3 border-r border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700">
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
            <div className="flex-grow overflow-y-auto">
              <ul>
                {filteredPrompts.map(p => (
                  <li
                    key={p.id}
                    onClick={() => handleSelectPrompt(p)}
                    className={`p-3 cursor-pointer border-l-4 transition-colors ${selectedPrompt?.id === p.id ? 'bg-blue-600/20 border-blue-500' : 'border-transparent hover:bg-gray-700/50'}`}
                  >
                    <h4 className="font-semibold text-white truncate">{p.title}</h4>
                    <p className="text-sm text-gray-400 truncate">{p.prompt}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 border-t border-gray-700">
                <button type="button" onClick={handleNewPrompt} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    <PlusIcon className="w-5 h-5"/> New Prompt
                </button>
            </div>
          </div>

          {/* Right Panel: Editor */}
          <div className="w-2/3 flex flex-col p-4">
            {isCreating || selectedPrompt ? (
                <form onSubmit={handleSave} className="flex flex-col h-full">
                    <h3 className="text-lg font-bold text-white mb-4">{isCreating ? 'Create New Prompt' : 'Edit Prompt'}</h3>
                    {error && <p className="text-red-400 bg-red-500/10 p-2 rounded-md mb-4">{error}</p>}
                    <div className="mb-4">
                        <label htmlFor="promptTitle" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                        <div className="flex items-center gap-2">
                          <input
                              id="promptTitle"
                              type="text"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="A short, descriptive title"
                              required
                              className="flex-grow bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                          />
                          <button 
                            type="button" 
                            onClick={handleGenerateTitle} 
                            title="Generate title from prompt content"
                            disabled={isGeneratingTitle || !promptContent.trim()} 
                            className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                          >
                            {isGeneratingTitle ? <Spinner size="sm" /> : 'Generate'}
                          </button>
                        </div>
                    </div>
                    <div className="flex-grow flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="promptContent" className="block text-sm font-medium text-gray-300">Prompt</label>
                            <button type="button" onClick={handleEnhance} disabled={isEnhancing || !promptContent.trim()} className="text-sm text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait">
                                {isEnhancing ? <Spinner size="sm" /> : <><MagicWandIcon className="w-4 h-4"/> Enhance with AI</>}
                            </button>
                        </div>
                        <textarea
                            id="promptContent"
                            value={promptContent}
                            onChange={(e) => setPromptContent(e.target.value)}
                            placeholder="Enter your detailed prompt here..."
                            required
                            className="w-full h-full flex-grow bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                        />
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                        <div>
                            {selectedPrompt && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPromptToDelete(selectedPrompt)}
                                    className="text-red-500 hover:text-red-400 font-semibold flex items-center gap-2 p-2 rounded-md hover:bg-red-500/10"
                                  >
                                      <TrashIcon className="w-5 h-5"/> Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleDuplicate}
                                    className="text-gray-300 hover:text-white font-semibold flex items-center gap-2 p-2 rounded-md hover:bg-gray-700/50"
                                    disabled={isLoading}
                                    title="Duplicate this prompt"
                                  >
                                    <DuplicateIcon className="w-5 h-5"/> Duplicate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPromptToShare(selectedPrompt)}
                                    className="text-gray-300 hover:text-white font-semibold flex items-center gap-2 p-2 rounded-md hover:bg-gray-700/50"
                                    disabled={isLoading}
                                    title="Share this prompt"
                                  >
                                    <ShareIcon className="w-5 h-5"/> Share
                                  </button>
                                </div>
                            )}
                        </div>
                         <div className="flex items-center gap-2">
                            <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={isLoading || !title.trim() || !promptContent.trim()}>
                                {isLoading ? <Spinner size="sm" /> : (isCreating ? 'Create Prompt' : 'Save Changes')}
                            </button>
                            {!isCreating && selectedPrompt && (
                                <button
                                    type="button"
                                    onClick={() => onUsePrompt(selectedPrompt)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                                    title="Use this prompt in the editor"
                                >
                                    <PlayIcon className="w-5 h-5"/> Use Prompt
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <BookmarkIcon className="w-16 h-16 mb-4"/>
                    <h3 className="text-xl font-semibold">Select a prompt to view or edit</h3>
                    <p>Or, create a new prompt to get started.</p>
                </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={!!promptToDelete}
        onClose={() => setPromptToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Prompt?"
        message={`Are you sure you want to permanently delete "${promptToDelete?.title}"? This action cannot be undone.`}
      />
      {promptToShare && (
        <SharePromptModal 
            isOpen={!!promptToShare}
            onClose={() => setPromptToShare(null)}
            onShare={handleShare}
            promptTitle={promptToShare.title}
        />
      )}
    </div>
  );
};

export default PromptManagerModal;