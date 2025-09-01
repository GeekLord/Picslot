/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

interface BrushCanvasProps {
  width: number;
  height: number;
  brushSize: number;
  isErasing: boolean;
  onMaskChange: (dataUrl: string | null) => void;
}

const BrushCanvas = forwardRef< { clear: () => void }, BrushCanvasProps>(({ width, height, brushSize, isErasing, onMaskChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        onMaskChange(null);
      }
    }
  }, [onMaskChange]);

  useImperativeHandle(ref, () => ({
    clear,
  }));

  // Resize canvas when dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = width;
        canvas.height = height;
        context.putImageData(imageData, 0, 0);
      }
    }
  }, [width, height]);


  const getCoordinates = (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in event) {
        if (event.touches.length === 0) return null;
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    lastPoint.current = getCoordinates(event.nativeEvent);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
        // To check if the canvas is empty, we can check for non-transparent pixels
        const context = canvas.getContext('2d');
        if (context) {
            const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
            const hasContent = pixelBuffer.some(color => color !== 0);

            if (hasContent) {
                // Return the data URL of the canvas which has a transparent background.
                // This is used for client-side compositing.
                onMaskChange(canvas.toDataURL());
            } else {
                onMaskChange(null);
            }
        } else {
            onMaskChange(null);
        }
    } else {
      onMaskChange(null);
    }
  };

  const draw = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const currentPoint = getCoordinates(event);

    if (!context || !currentPoint || !lastPoint.current) return;

    context.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    context.strokeStyle = 'white';
    context.fillStyle = 'white';
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(currentPoint.x, currentPoint.y);
    context.stroke();
    
    lastPoint.current = currentPoint;
  }, [isDrawing, isErasing, brushSize]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => draw(event);
    const handleTouchMove = (event: TouchEvent) => draw(event);
    const handleMouseUp = () => stopDrawing();
    const handleTouchEnd = () => stopDrawing();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draw]);


  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-auto opacity-50"
      onMouseDown={startDrawing}
      onTouchStart={startDrawing}
    />
  );
});

export default BrushCanvas;