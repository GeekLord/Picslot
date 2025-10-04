/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserAsset } from '../types';
import * as supabaseService from '../services/supabaseService';
import { XMarkIcon, UploadIcon, TrashIcon, CheckIcon, LayoutGridIcon } from './icons';
import Spinner from './Spinner';

interface AssetLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onSelectAssets: (files: File[]) => void;
    multiSelect: boolean;
    selectButtonText: string;
}

const AssetCard: React.FC<{
    asset: UserAsset;
    isSelected: boolean;
    onSelect: (asset: UserAsset) => void;
    onDelete: (asset: UserAsset) => void;
}> = ({ asset, isSelected, onSelect, onDelete }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchUrl = async () => {
            try {
                const url = await supabaseService.createSignedUrl(asset.storage_path, 'user-assets');
                if (isMounted) {
                    setImageUrl(url);
                }
            } catch (err) {
                console.error("Failed to get asset URL", err);
            }
        };
        fetchUrl();
        return () => { isMounted = false; };
    }, [asset.storage_path]);

    return (
        <div 
            className={`group relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 ${isSelected ? 'border-blue-500 scale-95' : 'border-transparent hover:border-gray-500'}`}
            onClick={() => onSelect(asset)}
        >
            {isLoading && (
                <div className="w-full h-full bg-gray-700 animate-pulse" />
            )}
            <img 
                src={imageUrl || ''} 
                alt={asset.filename} 
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsLoading(false)}
                style={{ display: isLoading ? 'none' : 'block' }}
            />
            {isSelected && (
                <div className="absolute inset-0 bg-blue-600/50 flex items-center justify-center">
                    <CheckIcon className="w-10 h-10 text-white" />
                </div>
            )}
            <button 
                className="absolute top-1 right-1 p-1.5 bg-black/50 rounded-full text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onDelete(asset); }}
                title={`Delete ${asset.filename}`}
            >
                <TrashIcon className="w-4 h-4"/>
            </button>
        </div>
    );
};


const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({ isOpen, onClose, user, onSelectAssets, multiSelect, selectButtonText }) => {
    const [assets, setAssets] = useState<UserAsset[]>([]);
    const [selectedAssets, setSelectedAssets] = useState<UserAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const userAssets = await supabaseService.getUserAssets(user.id);
            setAssets(userAssets);
        } catch (err: any) {
            setError(err.message || 'Failed to load assets.');
        } finally {
            setIsLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        if (isOpen) {
            fetchAssets();
            setSelectedAssets([]); // Reset selection when modal opens
        }
    }, [isOpen, fetchAssets]);

    const handleSelect = (asset: UserAsset) => {
        setSelectedAssets(prev => {
            if (prev.some(a => a.id === asset.id)) {
                return prev.filter(a => a.id !== asset.id);
            }
            if (multiSelect) {
                return [...prev, asset];
            }
            return [asset];
        });
    };

    const handleDelete = async (asset: UserAsset) => {
        if (!window.confirm(`Are you sure you want to delete "${asset.filename}"?`)) return;

        try {
            await supabaseService.deleteUserAsset(asset);
            setAssets(prev => prev.filter(a => a.id !== asset.id));
            setSelectedAssets(prev => prev.filter(a => a.id !== asset.id));
        } catch (err: any) {
            setError(err.message || "Failed to delete asset.");
        }
    };
    
    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsUploading(true);
        setError(null);
        try {
            await Promise.all(Array.from(files).map(file => supabaseService.uploadUserAsset(user.id, file)));
            await fetchAssets();
        } catch(err: any) {
             setError(err.message || "Failed to upload files.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleConfirmSelection = async () => {
        if (selectedAssets.length === 0) return;
        
        setIsConfirming(true);
        setError(null);

        try {
            const signedUrlPromises = selectedAssets.map(asset => 
                supabaseService.createSignedUrl(asset.storage_path, 'user-assets').then(url => ({url, asset}))
            );
    
            const signedUrlResults = await Promise.all(signedUrlPromises);
            
            // FIX: Remove unreliable third-party CORS proxy and fetch Supabase signed URLs directly.
            // This is the correct and more robust method for loading assets from Supabase storage.
            const blobPromises = signedUrlResults.map(async ({ url, asset }) => {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image for ${asset.filename}. Status: ${response.status}`);
                }
                const blob = await response.blob();
                return { blob, asset };
            });

            const blobResults = await Promise.all(blobPromises);
    
            const files = blobResults.map(({ blob, asset }) => new File([blob], asset.filename, { type: blob.type }));
            
            onSelectAssets(files);
        } catch (err: any) {
            setError(err.message || "Could not prepare selected files. This may be a network or CORS issue.");
        } finally {
            setIsConfirming(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-gray-800/80 border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] mx-auto flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <LayoutGridIcon className="w-6 h-6 text-blue-400"/>
                        <h2 className="text-xl font-bold text-white">Asset Library</h2>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </header>

                <main className="flex-grow p-4 overflow-y-auto">
                    {error && (
                         <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-center">
                            {error}
                        </div>
                    )}
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center"><Spinner size="lg"/></div>
                    ) : (
                        <>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                onDragLeave={() => setIsDraggingOver(false)}
                                onDrop={(e) => { e.preventDefault(); setIsDraggingOver(false); handleFileUpload(e.dataTransfer.files); }}
                                className={`mb-4 p-4 border-2 border-dashed rounded-lg text-center transition-colors ${isDraggingOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'}`}
                            >
                                <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFileUpload(e.target.files)} className="hidden" accept="image/*" />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 font-semibold text-gray-300 hover:text-white" disabled={isUploading}>
                                    {isUploading ? (
                                        <><Spinner size="sm"/> Uploading...</>
                                    ) : (
                                        <><UploadIcon className="w-5 h-5"/> Upload New Assets (or drag & drop)</>
                                    )}
                                </button>
                            </div>

                            {assets.length === 0 && !isUploading ? (
                                <div className="text-center text-gray-500 pt-10">Your asset library is empty.</div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                    {assets.map(asset => (
                                        <AssetCard 
                                            key={asset.id} 
                                            asset={asset}
                                            isSelected={selectedAssets.some(a => a.id === asset.id)}
                                            onSelect={handleSelect}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </main>
                
                <footer className="p-4 border-t border-gray-700 flex-shrink-0 flex justify-end">
                    <button
                        onClick={handleConfirmSelection}
                        disabled={selectedAssets.length === 0 || isConfirming}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed min-w-[150px] flex items-center justify-center"
                    >
                        {isConfirming ? <Spinner size="sm" /> : `${selectButtonText} (${selectedAssets.length})`}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AssetLibraryModal;
