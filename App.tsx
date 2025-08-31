/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateAutoEnhancedImage, generateRestoredImage, generateStudioPortrait, generateCompCard, generateThreeViewShot, generateOutpaintedImage } from './services/geminiService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, MagicWandIcon, RestoreIcon, PortraitIcon, CompCardIcon, ThreeViewIcon, ExpandIcon, ZoomInIcon, AdjustmentsIcon, LayersIcon, CropIcon, DownloadIcon, UploadIcon as UploadIconSVG } from './components/icons';
import StartScreen from './components/StartScreen';
import CompareSlider from './components/CompareSlider';
import ZoomModal from './components/ZoomModal';

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

type Tool = 'adjust' | 'filters' | 'crop';

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
  const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (activeTool !== 'crop' && isCompareMode) {
      setIsCompareMode(false);
    }
  }, [activeTool]);

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


  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [history, historyIndex]);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setEditHotspot(null);
    setDisplayHotspot(null);
    setActiveTool(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!currentImage || !prompt.trim() || !editHotspot) return;

    setIsLoading(true);
    setError(null);
    
    try {
        const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        setEditHotspot(null);
        setDisplayHotspot(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  }, [currentImage, prompt, editHotspot, addImageToHistory]);
  
  const createApiHandler = (apiFn: (file: File, prompt?: string) => Promise<string>, actionName: string) => async (promptOrFile?: string | File) => {
      if (!currentImage) {
        setError(`No image loaded to apply ${actionName}.`);
        return;
      }
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

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0,
      completedCrop.width, completedCrop.height,
    );
    
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);
    setActiveTool(null);
  }, [completedCrop, addImageToHistory]);

  const handleUndo = useCallback(() => {
    if (canUndo) setHistoryIndex(historyIndex - 1);
  }, [canUndo, historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (canRedo) setHistoryIndex(historyIndex + 1);
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
    if (history.length > 0) setHistoryIndex(0);
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
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
    if (files && files[0]) handleImageUpload(files[0]);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (activeTool !== null) return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDisplayHotspot({ x: offsetX, y: offsetY });

    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const originalX = Math.round(offsetX * (naturalWidth / clientWidth));
    const originalY = Math.round(offsetY * (naturalHeight / clientHeight));

    setEditHotspot({ x: originalX, y: originalY });
  };

  if (error) {
     return (
         <div className="min-h-screen w-full flex items-center justify-center p-4">
            <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
              <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
              <p className="text-md text-red-400">{error}</p>
              <button
                  onClick={() => setError(null)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors"
                >
                  Try Again
              </button>
            </div>
         </div>
      );
  }
    
  if (!currentImageUrl) {
    return (
        <div className="min-h-screen text-gray-100 flex flex-col">
            <Header />
            <main className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-8 flex justify-center items-center">
                <StartScreen onFileSelect={handleFileSelect} />
            </main>
        </div>
    );
  }

  const mainToolButtonClass = (tool: Tool) => `flex flex-col items-center justify-center gap-2 w-full font-semibold py-3 px-2 rounded-lg transition-all duration-200 text-sm ${
    activeTool === tool
    ? 'bg-blue-600 text-white shadow-lg' 
    : 'bg-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-700'
  }`;

  const sidebarToolButtonClass = `flex items-center justify-start text-left bg-gray-700/50 border border-transparent text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 hover:border-gray-600 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700/50`;
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      
      {/* Top Action Bar */}
      <div className="w-full bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/80 p-2 flex items-center justify-between gap-2 sticky top-[65px] z-40">
        <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={!canUndo || isLoading} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon className="w-5 h-5"/>Undo</button>
            <button onClick={handleRedo} disabled={!canRedo || isLoading} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon className="w-5 h-5"/>Redo</button>
            <button onClick={handleReset} disabled={!canUndo || isLoading} className="bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Reset</button>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleUploadNew} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors"><UploadIconSVG className="w-5 h-5"/>Upload New</button>
            <button onClick={handleDownload} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md shadow-blue-500/20"><DownloadIcon className="w-5 h-5"/>Download</button>
        </div>
      </div>

      <main className="flex-grow w-full max-w-[1800px] mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
        {/* === Left Panel: Image & Retouch === */}
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
                    <img ref={imgRef} src={currentImageUrl} alt="Current" onClick={handleImageClick} className={`w-full h-auto object-contain max-h-[70vh] rounded-xl ${activeTool === null ? 'cursor-crosshair' : ''}`} />
                )}

                {displayHotspot && !isLoading && activeTool === null && !isCompareMode && (
                    <div className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}>
                        <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                    </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    <button onClick={() => setIsZoomModalOpen(true)} disabled={isLoading} className="flex items-center gap-2 bg-black/50 hover:bg-black/80 text-white font-semibold py-2 px-4 rounded-full transition-colors backdrop-blur-sm"><ZoomInIcon className="w-5 h-5"/>Zoom</button>
                    {canUndo && <button onClick={() => setIsCompareMode(!isCompareMode)} disabled={isLoading || activeTool === 'crop'} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-full transition-colors backdrop-blur-sm ${isCompareMode ? 'bg-blue-500 text-white' : 'bg-black/50 hover:bg-black/80 text-white'}`}><EyeIcon className="w-5 h-5"/>Compare</button>}
                </div>
            </div>

            {/* Retouch UI (only visible when no other tool is active) */}
            <div className={`w-full flex flex-col items-center gap-4 transition-opacity duration-300 ${(activeTool !== null || isCompareMode) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <p className="text-md text-gray-400">
                  {isCompareMode 
                    ? 'Exit Compare mode to enable retouching.' 
                    : editHotspot 
                      ? 'Describe your edit below.' 
                      : 'Click an area on the image for a precise retouch.'
                  }
                </p>
                <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                    <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={editHotspot ? "e.g., 'change shirt color to blue'" : "First click a point on the image"} className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-4 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading || !editHotspot}/>
                    <button type="submit" className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:translate-y-px active:scale-95 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed" disabled={isLoading || !prompt.trim() || !editHotspot}>Generate</button>
                </form>
            </div>
        </div>
        
        {/* === Right Panel: Sidebar === */}
        <aside className="w-full md:w-[35%] lg:w-[30%] bg-gray-800/80 border border-gray-700/80 rounded-xl p-4 flex flex-col gap-4 self-start sticky top-[128px] max-h-[calc(100vh-140px)] overflow-y-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">Creative Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleAutoEnhance()} disabled={isLoading} className={sidebarToolButtonClass}><MagicWandIcon className="w-5 h-5 mr-3 text-purple-400"/>Auto Enhance</button>
                <button onClick={() => handleRestoreImage()} disabled={isLoading} className={sidebarToolButtonClass}><RestoreIcon className="w-5 h-5 mr-3 text-amber-400"/>Restore</button>
                <button onClick={() => handleStudioPortrait()} disabled={isLoading} className={sidebarToolButtonClass}><PortraitIcon className="w-5 h-5 mr-3 text-cyan-400"/>Studio Portrait</button>
                <button onClick={() => handleGenerateCompCard()} disabled={isLoading} className={sidebarToolButtonClass}><CompCardIcon className="w-5 h-5 mr-3 text-red-400"/>Comp Card</button>
                <button onClick={() => handleGenerateThreeViewShot()} disabled={isLoading} className={sidebarToolButtonClass}><ThreeViewIcon className="w-5 h-5 mr-3 text-sky-400"/>3-View Shot</button>
                <button onClick={() => handleOutpaint()} disabled={isLoading} className={sidebarToolButtonClass}><ExpandIcon className="w-5 h-5 mr-3 text-green-400"/>Full Body</button>
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
    </div>
  );
};

export default App;