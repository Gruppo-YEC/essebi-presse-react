import React, { useRef, useEffect, useState } from 'react';
import './Cropper.css';

export default function Cropper({ 
    src, 
    style, 
    aspectRatio, 
    minCropBoxWidth = 100, 
    minCropBoxHeight = 100,
    onInitialized,
    guides = true
}) {
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const animationRef = useRef(null);
    
    // Use single state for render trigger
    const [renderTrigger, setRenderTrigger] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);
    
    // All mutable state in ref
    const stateRef = useRef({
        imageData: null,
        cropBox: null,
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
        startPoint: { x: 0, y: 0 },
        startBox: null,
        scale: 1
    });

    // Load image and initialize
    useEffect(() => {
        if (!src) {
            setImageLoaded(false);
            return;
        }

        const img = new Image();
        img.onload = () => {
            const container = containerRef.current;
            if (!container) return;

            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            // Calculate image display size to fit container
            const scale = Math.min(
                containerWidth / img.width,
                containerHeight / img.height
            );

            const displayWidth = img.width * scale;
            const displayHeight = img.height * scale;
            const x = (containerWidth - displayWidth) / 2;
            const y = (containerHeight - displayHeight) / 2;

            // Initialize image data
            stateRef.current.imageData = {
                naturalWidth: img.width,
                naturalHeight: img.height,
                displayWidth,
                displayHeight,
                x,
                y
            };

            // Initialize crop box with proper aspect ratio
            let boxWidth = Math.min(displayWidth * 0.8, displayHeight * 0.8);
            let boxHeight = boxWidth;

            if (aspectRatio && aspectRatio > 0) {
                boxHeight = boxWidth / aspectRatio;
                // If calculated height is too big, adjust based on height
                if (boxHeight > displayHeight * 0.8) {
                    boxHeight = displayHeight * 0.8;
                    boxWidth = boxHeight * aspectRatio;
                }
            }

            stateRef.current.cropBox = {
                x: x + (displayWidth - boxWidth) / 2,
                y: y + (displayHeight - boxHeight) / 2,
                width: boxWidth,
                height: boxHeight
            };
            
            stateRef.current.scale = 1;
            setImageLoaded(true);
            setRenderTrigger(prev => prev + 1);
        };
        img.src = src;
    }, [src, aspectRatio]);

    // Initialize API only once when image loads
    useEffect(() => {
        if (!onInitialized || !imageLoaded) return;

        const api = {
            getCroppedCanvas: () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = imageRef.current;
                
                if (!img || !stateRef.current.cropBox || !stateRef.current.imageData) return canvas;
                
                const { cropBox, imageData, scale } = stateRef.current;
                
                // Calculate crop in original image coordinates
                const cropX = (cropBox.x - imageData.x) * imageData.naturalWidth / (imageData.displayWidth * scale);
                const cropY = (cropBox.y - imageData.y) * imageData.naturalHeight / (imageData.displayHeight * scale);
                const cropWidth = cropBox.width * imageData.naturalWidth / (imageData.displayWidth * scale);
                const cropHeight = cropBox.height * imageData.naturalHeight / (imageData.displayHeight * scale);
                
                canvas.width = cropWidth;
                canvas.height = cropHeight;
                
                ctx.drawImage(
                    img,
                    cropX, cropY, cropWidth, cropHeight,
                    0, 0, cropWidth, cropHeight
                );
                
                return canvas;
            },
            clear: () => {
                const { imageData } = stateRef.current;
                if (imageData) {
                    stateRef.current.cropBox = {
                        x: imageData.x + 50,
                        y: imageData.y + 50,
                        width: 200,
                        height: aspectRatio ? 200 / aspectRatio : 200
                    };
                    setRenderTrigger(prev => prev + 1);
                }
            }
        };
        onInitialized(api);
    }, [imageLoaded]); // Remove onInitialized and aspectRatio from deps to avoid re-init

    const requestUpdate = () => {
        if (!animationRef.current) {
            animationRef.current = requestAnimationFrame(() => {
                animationRef.current = null;
                setRenderTrigger(prev => prev + 1);
            });
        }
    };

    const handleMouseDown = (e, handle = null) => {
        e.preventDefault();
        e.stopPropagation();

        const state = stateRef.current;
        state.startPoint = { x: e.clientX, y: e.clientY };
        state.startBox = { ...state.cropBox };

        if (handle) {
            state.isResizing = true;
            state.resizeHandle = handle;
        } else {
            state.isDragging = true;
        }

        const handleGlobalMove = (e) => {
            const state = stateRef.current;
            const { imageData, startPoint, startBox } = state;

            if (!imageData || !startBox) return;

            const dx = e.clientX - startPoint.x;
            const dy = e.clientY - startPoint.y;
            

            if (state.isDragging) {
                // Move crop box
                state.cropBox = {
                    ...state.cropBox,
                    x: Math.max(
                        imageData.x,
                        Math.min(startBox.x + dx, imageData.x + imageData.displayWidth * state.scale - state.cropBox.width)
                    ),
                    y: Math.max(
                        imageData.y,
                        Math.min(startBox.y + dy, imageData.y + imageData.displayHeight * state.scale - state.cropBox.height)
                    )
                };
                requestUpdate();
            } else if (state.isResizing) {
                let newBox = { ...startBox };

                // Handle resize based on which handle is being dragged
                switch (state.resizeHandle) {
                    case 'se':
                        newBox.width = startBox.width + dx;
                        newBox.height = startBox.height + dy;
                        break;
                    case 'nw':
                        newBox.x = startBox.x + dx;
                        newBox.y = startBox.y + dy;
                        newBox.width = startBox.width - dx;
                        newBox.height = startBox.height - dy;
                        break;
                    case 'ne':
                        newBox.y = startBox.y + dy;
                        newBox.width = startBox.width + dx;
                        newBox.height = startBox.height - dy;
                        break;
                    case 'sw':
                        newBox.x = startBox.x + dx;
                        newBox.width = startBox.width - dx;
                        newBox.height = startBox.height + dy;
                        break;
                    case 'n':
                        newBox.y = startBox.y + dy;
                        newBox.height = startBox.height - dy;
                        break;
                    case 's':
                        newBox.height = startBox.height + dy;
                        break;
                    case 'e':
                        newBox.width = startBox.width + dx;
                        break;
                    case 'w':
                        newBox.x = startBox.x + dx;
                        newBox.width = startBox.width - dx;
                        break;
                }

                // Apply minimum size constraints FIRST, then maintain aspect ratio
                newBox.width = Math.max(minCropBoxWidth, Math.abs(newBox.width));
                newBox.height = Math.max(minCropBoxHeight, Math.abs(newBox.height));

                // ALWAYS maintain aspect ratio if aspectRatio is set
                if (aspectRatio && aspectRatio > 0) {
                    if (['nw', 'ne', 'sw', 'se'].includes(state.resizeHandle)) {
                        // For corners, use the dimension that changed more to determine scaling
                        if (Math.abs(dx) > Math.abs(dy)) {
                            // Width changed more, adjust height to match aspect ratio
                            newBox.height = newBox.width / aspectRatio;
                            // Adjust Y position for top corners
                            if (['nw', 'ne'].includes(state.resizeHandle)) {
                                newBox.y = startBox.y + startBox.height - newBox.height;
                            }
                        } else {
                            // Height changed more, adjust width to match aspect ratio
                            newBox.width = newBox.height * aspectRatio;
                            // Adjust X position for left corners
                            if (['nw', 'sw'].includes(state.resizeHandle)) {
                                newBox.x = startBox.x + startBox.width - newBox.width;
                            }
                        }
                    } else if (['n', 's'].includes(state.resizeHandle)) {
                        // Vertical resize: height changes, width must follow aspect ratio
                        newBox.width = newBox.height * aspectRatio;
                        // Keep centered horizontally
                        newBox.x = startBox.x + (startBox.width - newBox.width) / 2;
                    } else if (['e', 'w'].includes(state.resizeHandle)) {
                        // Horizontal resize: width changes, height must follow aspect ratio  
                        newBox.height = newBox.width / aspectRatio;
                        // Keep centered vertically
                        newBox.y = startBox.y + (startBox.height - newBox.height) / 2;
                    }
                    
                    // Ensure minimum sizes are still respected after aspect ratio adjustment
                    if (newBox.width < minCropBoxWidth) {
                        newBox.width = minCropBoxWidth;
                        newBox.height = newBox.width / aspectRatio;
                    }
                    if (newBox.height < minCropBoxHeight) {
                        newBox.height = minCropBoxHeight;
                        newBox.width = newBox.height * aspectRatio;
                    }
                }

                // Keep within image bounds
                const maxX = imageData.x + imageData.displayWidth * state.scale;
                const maxY = imageData.y + imageData.displayHeight * state.scale;
                
                newBox.x = Math.max(imageData.x, Math.min(newBox.x, maxX - newBox.width));
                newBox.y = Math.max(imageData.y, Math.min(newBox.y, maxY - newBox.height));
                newBox.width = Math.min(newBox.width, maxX - newBox.x);
                newBox.height = Math.min(newBox.height, maxY - newBox.y);

                state.cropBox = newBox;
                requestUpdate();
            }
        };

        const handleGlobalUp = () => {
            state.isDragging = false;
            state.isResizing = false;
            state.resizeHandle = null;
            document.removeEventListener('mousemove', handleGlobalMove);
            document.removeEventListener('mouseup', handleGlobalUp);
        };

        document.addEventListener('mousemove', handleGlobalMove);
        document.addEventListener('mouseup', handleGlobalUp);
    };

    const handleWheel = (e) => {
        const state = stateRef.current;
        if (!state.imageData) return;

        const delta = e.deltaY > 0 ? 0.95 : 1.05;
        const newScale = Math.max(0.5, Math.min(3, state.scale * delta));
        
        if (newScale === state.scale) return; // No change
        
        state.scale = newScale;
        
        // Adjust crop box to stay within bounds
        const { imageData, cropBox } = state;
        const maxWidth = imageData.displayWidth * newScale;
        const maxHeight = imageData.displayHeight * newScale;
        
        if (cropBox.width > maxWidth - (cropBox.x - imageData.x)) {
            cropBox.width = maxWidth - (cropBox.x - imageData.x);
            if (aspectRatio && aspectRatio > 0) {
                cropBox.height = cropBox.width / aspectRatio;
            }
        }
        if (cropBox.height > maxHeight - (cropBox.y - imageData.y)) {
            cropBox.height = maxHeight - (cropBox.y - imageData.y);
            if (aspectRatio && aspectRatio > 0) {
                cropBox.width = cropBox.height * aspectRatio;
            }
        }
        
        requestUpdate();
    };

    // Setup wheel event listener with passive: false to allow preventDefault
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            container.removeEventListener('wheel', handleWheel);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [aspectRatio]);

    const { cropBox, imageData, scale } = stateRef.current;

    return (
        <div 
            ref={containerRef}
            className="cropper-container" 
            style={style}
        >
            {src && imageLoaded && imageData && (
                <>
                    <div className="cropper-wrap-box">
                        <div className="cropper-canvas">
                            <img 
                                ref={imageRef}
                                src={src} 
                                alt=""
                                style={{
                                    position: 'absolute',
                                    width: imageData.displayWidth * scale,
                                    height: imageData.displayHeight * scale,
                                    left: imageData.x,
                                    top: imageData.y
                                }}
                            />
                        </div>
                    </div>
                    
                    {/* Dark overlay */}
                    <div className="cropper-modal" />
                    
                    {/* Crop box */}
                    {cropBox && (
                        <div 
                            className="cropper-crop-box"
                            style={{
                                left: cropBox.x,
                                top: cropBox.y,
                                width: cropBox.width,
                                height: cropBox.height
                            }}
                            onMouseDown={(e) => handleMouseDown(e)}
                        >
                            {/* Visible image in crop area */}
                            <span className="cropper-view-box">
                                <img 
                                    src={src} 
                                    alt=""
                                    style={{
                                        width: imageData.displayWidth * scale,
                                        height: imageData.displayHeight * scale,
                                        marginLeft: -cropBox.x + imageData.x,
                                        marginTop: -cropBox.y + imageData.y
                                    }}
                                />
                            </span>
                            
                            {/* Grid */}
                            {guides && (
                                <>
                                    <span className="cropper-dashed cropper-dashed-h" />
                                    <span className="cropper-dashed cropper-dashed-v" />
                                </>
                            )}
                            
                            {/* Center lines */}
                            <span className="cropper-center" />
                            
                            {/* Resize handles */}
                            <span className="cropper-line line-n" onMouseDown={(e) => handleMouseDown(e, 'n')} />
                            <span className="cropper-line line-e" onMouseDown={(e) => handleMouseDown(e, 'e')} />
                            <span className="cropper-line line-s" onMouseDown={(e) => handleMouseDown(e, 's')} />
                            <span className="cropper-line line-w" onMouseDown={(e) => handleMouseDown(e, 'w')} />
                            
                            <span className="cropper-point point-nw" onMouseDown={(e) => handleMouseDown(e, 'nw')} />
                            <span className="cropper-point point-ne" onMouseDown={(e) => handleMouseDown(e, 'ne')} />
                            <span className="cropper-point point-sw" onMouseDown={(e) => handleMouseDown(e, 'sw')} />
                            <span className="cropper-point point-se" onMouseDown={(e) => handleMouseDown(e, 'se')} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}