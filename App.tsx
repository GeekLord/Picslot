/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateAutoEnhancedImage, generateRestoredImage, generateStudioPortrait, generateCompCard, generateThreeViewShot, generateOutpaintedImage, generateRemovedBackgroundImage } from './services/geminiService';
import * as supabaseService from './services/supabaseService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, MagicWandIcon, RestoreIcon, PortraitIcon, CompCardIcon, ThreeViewIcon, ExpandIcon, ZoomInIcon, AdjustmentsIcon, LayersIcon, CropIcon, DownloadIcon, UploadIcon as UploadIconSVG, LogoutIcon, SaveIcon, RemoveBgIcon, BrushIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import CompareSlider from './components/CompareSlider';
import ZoomModal from './components/ZoomModal';
import AuthScreen from './components/AuthScreen';
import ProjectsDashboard from './components/ProjectsDashboard';
import SaveProjectModal from './components/SaveProjectModal';
import type { User } from '@supabase/supabase-js';
import BrushCanvas from './components/BrushCanvas';
import BrushControls from './components/BrushControls';


// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper to convert a fetched Blob to a File object
const blobToFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
};


type Tool = 'adjust' | 'filters' | 'crop';
type View = 'dashboard' | 'upload';

export interface Project {
  id: string;
  name: string;
  updated_at: string;
  history: string[]; // Array of paths in Supabase Storage
  history_index: number;
  thumbnail: string; // Path in Supabase Storage
}

const App: React.FC = () => {
  // Auth & Project State
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Editor State
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);

  // Brush / Mask State
  const [isBrushMode, setIsBrushMode] = useState<boolean>(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(40);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const brushCanvasRef = useRef<{ clear: () => void }>(null);

  // Crop State
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();

  const imgRef = useRef<HTMLImageElement>(null);
  
  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // === Effects ===

  // Use onAuthStateChange as the single source of truth for the user's session.
  useEffect(() => {
    // onAuthStateChange fires an event immediately with the initial session state,
    // and then listens for any subsequent changes (including after OAuth redirect).
    const { data: authListener } = supabaseService.supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
  
    // Clean up the subscription when the component unmounts.
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);


  // Load user's projects when they log in
  useEffect(() => {
    if (user) {
        setProjectsLoaded(false);
        supabaseService.getProjects(user.id)
            .then(setProjects)
            .catch(e => {
                console.error("Failed to load projects:", e);
                setError("Could not load your saved projects.");
                setProjects([]);
            })
            .finally(() => setProjectsLoaded(true));
    } else {
        // Clear projects when user logs out
        setProjects([]);
        setProjectsLoaded(false);
    }
  }, [user]);

  // Clean up compare mode when tool changes
  useEffect(() => {
    if (activeTool !== null || isBrushMode) {
      setIsCompareMode(false);
    }
  }, [activeTool, isBrushMode]);

  // Deactivate brush mode if another tool is selected
  useEffect(() => {
    if (activeTool !== null) {
      setIsBrushMode(false);
    }
  }, [activeTool]);
  

  // Create Object URLs for images in history for performance
  useEffect(() => {
    if (currentImage) {
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);

  // === History Management ===

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Clear transient state
    setCrop(undefined);
    setCompletedCrop(undefined);
    brushCanvasRef.current?.clear();
    setMaskDataUrl(null);
    setIsBrushMode(false);
  }, [history, historyIndex]);

  // === Event Handlers ===
  
  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setActiveProjectId(null); // It's a new, unsaved project
    setActiveTool(null);
    setIsBrushMode(false);
    setMaskDataUrl(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);
  
  // === Project Management ===

  const handleSaveProject = async (projectName: string) => {
    if (!currentImage || !user) return;
    setIsLoading(true);

    try {
        const tempProjectId = activeProjectId || `temp_${Date.now()}`;
        
        // Upload all images in history to cloud storage
        const historyPaths = await Promise.all(
            history.map(file => supabaseService.uploadProjectFile(user.id, tempProjectId, file))
        );
        
        const thumbnailPath = historyPaths[historyIndex];

        const projectData = {
            id: activeProjectId,
            user_id: user.id,
            name: projectName,
            history: historyPaths,
            history_index: historyIndex,
            thumbnail: thumbnailPath,
        };

        const savedProject = await supabaseService.saveProject(projectData);
        
        // Update local state with the saved project
        setProjects(prevProjects => {
            const existingIndex = prevProjects.findIndex(p => p.id === savedProject.id);
            if (existingIndex > -1) {
                const newProjects = [...prevProjects];
                newProjects[existingIndex] = savedProject;
                return newProjects;
            }
            return [...prevProjects, savedProject];
        });
        setActiveProjectId(savedProject.id);

    } catch (e: any) {
        setError(`Failed to save project: ${e.message}`);
        console.error(e);
    } finally {
        setIsSaveModalOpen(false);
        setIsLoading(false);
    }
  };

  const handleLoadProject = useCallback(async (project: Project) => {
    setIsLoading(true);
    setError(null);
    try {
        const signedUrlPromises = project.history.map(path => supabaseService.createSignedUrl(path));
        const imageUrls = await Promise.all(signedUrlPromises);
        const newHistoryFiles = await Promise.all(
            imageUrls.map((url, index) => blobToFile(url, `history-${project.id}-${index}.png`))
        );

        setHistory(newHistoryFiles);
        setHistoryIndex(project.history_index);
        setActiveProjectId(project.id);

        // Reset editor state
        setCrop(undefined);
        setCompletedCrop(undefined);
        setActiveTool(null);
        setMaskDataUrl(null);
        setIsBrushMode(false);
        setPrompt('');
    } catch (e) {
        setError("Failed to load project files from the cloud.");
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleDeleteProject = useCallback(async (project: Project) => {
    setIsLoading(true);
    try {
      await supabaseService.deleteProject(project);
      // Remove the project from the local state for an immediate UI update
      setProjects(prevProjects => prevProjects.filter(p => p.id !== project.id));
    } catch (e: any) {
      setError(`Failed to delete project: ${e.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);


  // === AI & Editing Handlers ===

  const handleGenerate = useCallback(async () => {
    if (!currentImage || !prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
        let imageToSend = currentImage;
        let finalPrompt = prompt;

        // If a mask exists, prepare the image for inpainting
        if (maskDataUrl) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");

            // Load original image to get its natural dimensions
            const originalImg = new Image();
            originalImg.src = URL.createObjectURL(currentImage);
            await new Promise((resolve, reject) => {
                originalImg.onload = resolve;
                originalImg.onerror = reject;
            });
            
            canvas.width = originalImg.naturalWidth;
            canvas.height = originalImg.naturalHeight;
            
            // 1. Draw the original image onto the canvas
            ctx.drawImage(originalImg, 0, 0);

            // Load the mask image (white drawing on transparent background)
            const maskImg = new Image();
            maskImg.src = maskDataUrl;
            await new Promise((resolve, reject) => {
                maskImg.onload = resolve;
                maskImg.onerror = reject;
            });
            
            // 2. Use 'destination-out' composite operation. This erases parts of the
            //    original image (destination) where the mask (source) is drawn.
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height); // Scale mask to fit

            // 3. The canvas now holds the original image with transparent holes.
            const inpaintingImageDataUrl = canvas.toDataURL('image/png');
            imageToSend = dataURLtoFile(inpaintingImageDataUrl, `inpainting-${Date.now()}.png`);
            
            // 4. Create a specific prompt for the inpainting task.
            finalPrompt = `The user has provided an image with a transparent area. Your task is to seamlessly and photorealistically fill in ONLY the transparent area based on the user's request: "${prompt}". The existing, non-transparent parts of the image MUST be perfectly preserved.`;
        }
        
        const editedImageUrl = await generateEditedImage(imageToSend, finalPrompt);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setPrompt(''); // Clear prompt on success
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, addImageToHistory, maskDataUrl]);
  
  const createApiHandler = (apiFn: (file: File, prompt?: string) => Promise<string>, actionName: string) => async (promptOrFile?: string | File) => {
      if (!currentImage) return;
      setIsLoading(true);
      setError(null);
      try {
          const resultUrl = await (typeof promptOrFile === 'string' ? apiFn(currentImage, promptOrFile) : apiFn(currentImage));
          const newImageFile = dataURLtoFile(resultUrl, `${actionName}-${Date.now()}.png`);
          addImageToHistory(newImageFile);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Failed to ${actionName}. ${errorMessage}`);
      } finally {
          setIsLoading(false);
      }
  };

  const handleApplyFilter = createApiHandler(generateFilteredImage, 'filter');
  const handleApplyAdjustment = createApiHandler(generateAdjustedImage, 'adjustment');
  const handleAutoEnhance = createApiHandler(generateAutoEnhancedImage, 'auto-enhance');
  const handleRestoreImage = createApiHandler(generateRestoredImage, 'restore');
  const handleRemoveBackground = createApiHandler(generateRemovedBackgroundImage, 'remove-background');
  const handleStudioPortrait = createApiHandler(generateStudioPortrait, 'studio-portrait');
  const handleGenerateCompCard = createApiHandler(generateCompCard, 'comp-card');
  const handleGenerateThreeViewShot = createApiHandler(generateThreeViewShot, '3-view-shot');
  const handleOutpaint = createApiHandler(generateOutpaintedImage, 'outpaint');

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);
    setActiveTool(null);
  }, [completedCrop, addImageToHistory]);

  // === Top Bar Action Handlers ===
  const handleUndo = useCallback(() => {
      if (canUndo) {
          setHistoryIndex(historyIndex - 1);
          brushCanvasRef.current?.clear();
          setMaskDataUrl(null);
          setIsBrushMode(false);
      }
  }, [canUndo, historyIndex]);

  const handleRedo = useCallback(() => {
      if (canRedo) {
          setHistoryIndex(historyIndex + 1);
          brushCanvasRef.current?.clear();
          setMaskDataUrl(null);
          setIsBrushMode(false);
      }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
      if (history.length > 0) {
          setHistoryIndex(0);
          brushCanvasRef.current?.clear();
          setMaskDataUrl(null);
          setIsBrushMode(false);
      }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setActiveProjectId(null);
      setView('dashboard');
  }, []);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `picslot-edited-${currentImage.name}`;
          link.click();
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
        handleImageUpload(files[0]);
    }
  };
  
  const handleLogout = useCallback(async () => {
    await supabaseService.signOut();
    // The onAuthStateChange listener will handle setting user to null
    setHistory([]);
    setHistoryIndex(-1);
    setActiveProjectId(null);
  }, []);

  const handleClearMask = useCallback(() => {
      brushCanvasRef.current?.clear();
      setMaskDataUrl(null);
  }, []);

  const handleBrushContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isBrushMode) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleBrushContainerMouseLeave = () => {
    setCursorPosition(null);
  };


  // === RENDER LOGIC ===

  if (error) {
     return (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
                <p className="text-md text-red-400">{error}</p>
                <button onClick={() => setError(null)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors">Try Again</button>
            </div>
        </div>
      );
  }
  
  if (!authChecked) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <Spinner />
        </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }
    
  if (!currentImageUrl) {
    return (
        <div className="min-h-screen text-gray-100 flex flex-col">
            <Header />
            <main className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-8 flex justify-center items-center">
                {!projectsLoaded ? <Spinner /> : (
                    view === 'dashboard' ? 
                    <ProjectsDashboard 
                      projects={projects} 
                      onSelectProject={handleLoadProject} 
                      onDeleteProject={handleDeleteProject}
                      onStartNewProject={() => setView('upload')} 
                    /> : 
                    <StartScreen onFileSelect={handleFileSelect} />
                )}
            </main>
        </div>
    );
  }

  const mainToolButtonClass = (tool: Tool) => `flex flex-col items-center justify-center gap-2 w-full font-semibold py-3 px-2 rounded-lg transition-all duration-200 text-sm ${activeTool === tool ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-700'}`;
  const sidebarToolButtonClass = `flex items-center justify-start text-left bg-gray-700/50 border border-transparent text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 hover:border-gray-600 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700/50`;
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      
      <div className="w-full bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/80 p-2 flex items-center justify-between gap-2 sticky top-[65px] z-40">
        <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={!canUndo || isLoading} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon className="w-5 h-5"/>Undo</button>
            <button onClick={handleRedo} disabled={!canRedo || isLoading} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon className="w-5 h-5"/>Redo</button>
            <button onClick={handleReset} disabled={!canUndo || isLoading} className="bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Reset</button>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsSaveModalOpen(true)} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors"><SaveIcon className="w-5 h-5"/>Save</button>
            <button onClick={handleUploadNew} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors"><UploadIconSVG className="w-5 h-5"/>Projects</button>
            <button onClick={handleDownload} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md shadow-blue-500/20"><DownloadIcon className="w-5 h-5"/>Download</button>
            <button onClick={handleLogout} title="Logout" className="p-2 bg-gray-800/80 hover:bg-red-500/20 text-gray-200 hover:text-red-400 rounded-md transition-colors"><LogoutIcon className="w-5 h-5"/></button>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1800px] mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-grow flex flex-col gap-4 items-center md:w-[65%] lg:w-[70%]">
            <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20 group">
                {isLoading && (
                    <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                        <Spinner />
                        <p className="text-gray-300">AI is working its magic...</p>
                    </div>
                )}
                {activeTool === 'crop' ? (
                  <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={aspect} className="max-h-[70vh]">
                    <img ref={imgRef} src={currentImageUrl} alt="Crop this image" className="w-full h-auto object-contain max-h-[70vh] rounded-xl"/>
                  </ReactCrop>
                ) : isCompareMode && originalImageUrl ? (
                    <CompareSlider originalImageUrl={originalImageUrl} currentImageUrl={currentImageUrl} />
                ) : (
                  <div 
                    className={`relative w-full h-full ${isBrushMode ? 'cursor-none' : ''}`}
                    onMouseMove={handleBrushContainerMouseMove}
                    onMouseLeave={handleBrushContainerMouseLeave}
                  >
                    <img ref={imgRef} src={currentImageUrl} alt="Current" className="w-full h-auto object-contain max-h-[70vh] rounded-xl pointer-events-none" />
                    {isBrushMode && imgRef.current && (
                        <BrushCanvas
                          ref={brushCanvasRef}
                          width={imgRef.current.clientWidth}
                          height={imgRef.current.clientHeight}
                          brushSize={brushSize}
                          isErasing={isErasing}
                          onMaskChange={setMaskDataUrl}
                        />
                    )}
                    {isBrushMode && cursorPosition && (
                        <div
                            className={`absolute rounded-full border-2 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-colors duration-100 ${isErasing ? 'border-red-500 bg-red-500/20' : 'border-white bg-white/20'}`}
                            style={{
                                left: `${cursorPosition.x}px`,
                                top: `${cursorPosition.y}px`,
                                width: `${brushSize}px`,
                                height: `${brushSize}px`,
                            }}
                            aria-hidden="true"
                        />
                    )}
                  </div>
                )}
                
                {isBrushMode && (
                    <BrushControls 
                        brushSize={brushSize}
                        isErasing={isErasing}
                        onBrushSizeChange={setBrushSize}
                        onIsErasingChange={setIsErasing}
                        onClear={handleClearMask}
                    />
                )}

                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    <button onClick={() => setIsZoomModalOpen(true)} disabled={isLoading} className="flex items-center gap-2 bg-black/50 hover:bg-black/80 text-white font-semibold py-2 px-4 rounded-full transition-colors backdrop-blur-sm"><ZoomInIcon className="w-5 h-5"/>Zoom</button>
                    {canUndo && <button onClick={() => setIsCompareMode(!isCompareMode)} disabled={isLoading || activeTool !== null || isBrushMode} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-full transition-colors backdrop-blur-sm ${isCompareMode ? 'bg-blue-500 text-white' : 'bg-black/50 hover:bg-black/80 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}><EyeIcon className="w-5 h-5"/>Compare</button>}
                </div>
            </div>

            <div className={`w-full flex flex-col items-center gap-4 transition-opacity duration-300 ${(activeTool !== null || isCompareMode) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <p className="text-md text-gray-400">
                    {isBrushMode ? (maskDataUrl ? 'Describe your edit for the masked area.' : 'Draw on the image to select an area for editing.') : 'Describe an edit, or use the mask tool for a precise change.'}
                </p>
                <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                    <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 'change shirt color to blue' or 'make the sky dramatic'" className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-4 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading || (isBrushMode && !maskDataUrl)}/>
                    <button type="submit" className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:translate-y-px active:scale-95 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed" disabled={isLoading || !prompt.trim() || (isBrushMode && !maskDataUrl)}>Generate</button>
                </form>
            </div>
        </div>
        
        <aside className="w-full md:w-[35%] lg:w-[30%] bg-gray-800/80 border border-gray-700/80 rounded-xl p-4 flex flex-col gap-4 self-start sticky top-[128px] max-h-[calc(100vh-140px)] overflow-y-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">Retouch & AI Tools</h3>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => {
                      setIsBrushMode(!isBrushMode);
                      setActiveTool(null);
                  }} 
                  className={`flex items-center justify-start text-left border text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 hover:border-gray-600 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${isBrushMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700/50 border-transparent'}`}
                  disabled={isLoading}
                >
                    <BrushIcon className="w-5 h-5 mr-3"/>Generative Mask
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={() => handleAutoEnhance()} disabled={isLoading} className={sidebarToolButtonClass} title="Automatically improve lighting, color, and sharpness with a single click."><MagicWandIcon className="w-5 h-5 mr-3 text-purple-400"/>Auto Enhance</button>
                <button onClick={() => handleRemoveBackground()} disabled={isLoading} className={sidebarToolButtonClass} title="Instantly remove the background and make it transparent."><RemoveBgIcon className="w-5 h-5 mr-3 text-pink-400"/>Remove Background</button>
                <button onClick={() => handleRestoreImage()} disabled={isLoading} className={sidebarToolButtonClass} title="Repair old, blurry, or damaged photos by removing scratches and restoring color."><RestoreIcon className="w-5 h-5 mr-3 text-amber-400"/>Photo Restore</button>
                <button onClick={() => handleStudioPortrait()} disabled={isLoading} className={sidebarToolButtonClass} title="Convert your photo into a professional headshot with a clean studio background."><PortraitIcon className="w-5 h-5 mr-3 text-cyan-400"/>Studio Portrait</button>
                <button onClick={() => handleGenerateCompCard()} disabled={isLoading} className={sidebarToolButtonClass} title="Generate a professional, multi-pose modeling composite card."><CompCardIcon className="w-5 h-5 mr-3 text-red-400"/>Composite Card</button>
                <button onClick={() => handleGenerateThreeViewShot()} disabled={isLoading} className={sidebarToolButtonClass} title="Create a 3-view (front, side, back) reference shot of a person."><ThreeViewIcon className="w-5 h-5 mr-3 text-sky-400"/>Character Turnaround</button>
                <button onClick={() => handleOutpaint()} disabled={isLoading} className={sidebarToolButtonClass} title="Expand a cropped image to reveal the full body and a complete background."><ExpandIcon className="w-5 h-5 mr-3 text-green-400"/>Magic Expand</button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-3 border-b border-gray-700 pb-2">Manual Edits</h3>
              <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setActiveTool(activeTool === 'adjust' ? null : 'adjust')} className={mainToolButtonClass('adjust')}><AdjustmentsIcon className="w-6 h-6"/>Adjust</button>
                  <button onClick={() => setActiveTool(activeTool === 'filters' ? null : 'filters')} className={mainToolButtonClass('filters')}><LayersIcon className="w-6 h-6"/>Filters</button>
                  <button onClick={() => setActiveTool(activeTool === 'crop' ? null : 'crop')} className={mainToolButtonClass('crop')}><CropIcon className="w-6 h-6"/>Crop</button>
              </div>
              <div className="mt-4">
                  {activeTool === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
                  {activeTool === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
                  {activeTool === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
              </div>
            </div>
        </aside>
      </main>
      
      <ZoomModal isOpen={isZoomModalOpen} onClose={() => setIsZoomModalOpen(false)} imageUrl={currentImageUrl} />
      <SaveProjectModal 
        isOpen={isSaveModalOpen} 
        onSave={handleSaveProject}
        onClose={() => setIsSaveModalOpen(false)}
        initialName={projects.find(p => p.id === activeProjectId)?.name || ''}
      />
    </div>
  );
};

export default App;