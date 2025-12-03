/**
 * ImageProcessor - Main processing pipeline
 * Orchestrates all effects and dithering operations
 */

import { ColorUtils } from './ColorUtils.js';
import { DitheringEngine } from './DitheringEngine.js';
import { EffectsEngine } from './EffectsEngine.js';

export class ImageProcessor {
    constructor() {
        // Create offscreen canvases for processing
        this.sourceCanvas = document.createElement('canvas');
        this.sourceCtx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });
        
        this.processCanvas = document.createElement('canvas');
        this.processCtx = this.processCanvas.getContext('2d', { willReadFrequently: true });
        
        this.originalImageData = null;
    }

    /**
     * Load image from source (File, URL, or existing Image)
     */
    async loadImage(source) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                // Set canvas size
                this.sourceCanvas.width = img.width;
                this.sourceCanvas.height = img.height;
                this.processCanvas.width = img.width;
                this.processCanvas.height = img.height;
                
                // Draw original
                this.sourceCtx.drawImage(img, 0, 0);
                
                // Store original data
                this.originalImageData = this.sourceCtx.getImageData(
                    0, 0, img.width, img.height
                );
                
                resolve({
                    width: img.width,
                    height: img.height,
                    image: img
                });
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            
            if (source instanceof File) {
                img.src = URL.createObjectURL(source);
            } else if (typeof source === 'string') {
                img.src = source;
            } else if (source instanceof Image) {
                img.src = source.src;
            }
        });
    }

    /**
     * Main processing pipeline - processes image with given settings
     * Returns a canvas element with the processed image
     */
    process(settings) {
        if (!this.originalImageData) {
            throw new Error('No image loaded');
        }

        const {
            colors = ['#000000', '#ffffff'],
            ditherType = 'floyd-steinberg',
            ditherStrength = 100,
            orderedMatrixSize = 4,
            pixelScale = 1.0,
            posterizeEnabled = false,
            posterizeLevels = 4,
            posterizeMode = 'luminance',
            posterizeUsePalette = true,
            blobEnabled = true,
            blobIntensity = 30,
            blobDensity = 15,
            blobSizeMin = 50,
            blobSizeMax = 200,
            blobSoftness = 60,
            blobBlendMode = 'overlay',
            noiseEnabled = false,
            noiseAmount = 10,
            originalBlend = 0
        } = settings;

        // Convert hex colors to RGB arrays
        const palette = colors.map(c => ColorUtils.hexToRgb(c));
        
        // Get original dimensions
        const origWidth = this.originalImageData.width;
        const origHeight = this.originalImageData.height;
        
        // Calculate working dimensions for pixelation
        const workWidth = Math.floor(origWidth / pixelScale);
        const workHeight = Math.floor(origHeight / pixelScale);
        
        // Step 0: Pixelation - downscale if pixelScale > 1
        let imageData;
        if (pixelScale > 1) {
            // Create small canvas for downscaling
            const smallCanvas = document.createElement('canvas');
            smallCanvas.width = workWidth;
            smallCanvas.height = workHeight;
            const smallCtx = smallCanvas.getContext('2d');
            
            // Draw original scaled down
            smallCtx.drawImage(this.sourceCanvas, 0, 0, workWidth, workHeight);
            imageData = smallCtx.getImageData(0, 0, workWidth, workHeight);
        } else {
            // Copy original data at full resolution
            imageData = new ImageData(
                new Uint8ClampedArray(this.originalImageData.data),
                origWidth,
                origHeight
            );
        }
        
        // Store clean copy for blending
        const cleanOriginal = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        // Step 1: Posterization (if enabled)
        if (posterizeEnabled) {
            imageData = EffectsEngine.posterize(
                imageData, 
                posterizeLevels, 
                posterizeMode,
                posterizeUsePalette ? palette : null
            );
        }

        // Step 2: Dithering
        if (ditherStrength > 0) {
            switch (ditherType) {
                case 'floyd-steinberg':
                    imageData = DitheringEngine.floydSteinberg(imageData, palette);
                    break;
                case 'ordered':
                    imageData = DitheringEngine.orderedDither(imageData, palette, orderedMatrixSize);
                    break;
                case 'atkinson':
                    imageData = DitheringEngine.atkinson(imageData, palette);
                    break;
                case 'none':
                    // If no posterization with palette, still quantize to palette
                    if (!posterizeEnabled || !posterizeUsePalette) {
                        imageData = DitheringEngine.quantize(imageData, palette);
                    }
                    break;
                default:
                    imageData = DitheringEngine.floydSteinberg(imageData, palette);
            }
            
            // Blend with undithered version based on strength
            if (ditherStrength < 100 && ditherType !== 'none') {
                const undithered = new ImageData(
                    new Uint8ClampedArray(cleanOriginal.data),
                    imageData.width,
                    imageData.height
                );
                const blend = (100 - ditherStrength) / 100;
                imageData = EffectsEngine.blendWithOriginal(imageData, undithered, blend);
            }
        }

        // Put processed data on process canvas (at working size)
        this.processCanvas.width = origWidth;
        this.processCanvas.height = origHeight;
        
        if (pixelScale > 1) {
            // Scale up with nearest neighbor (pixelated)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageData.width;
            tempCanvas.height = imageData.height;
            tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
            
            this.processCtx.imageSmoothingEnabled = false;
            this.processCtx.drawImage(tempCanvas, 0, 0, origWidth, origHeight);
            this.processCtx.imageSmoothingEnabled = true;
        } else {
            this.processCtx.putImageData(imageData, 0, 0);
        }

        // Step 3: Blob overlay (uses canvas operations)
        if (blobEnabled && blobIntensity > 0) {
            EffectsEngine.addBlobs(this.processCtx, origWidth, origHeight, {
                intensity: blobIntensity / 100,
                density: blobDensity,
                minSize: blobSizeMin,
                maxSize: blobSizeMax,
                softness: blobSoftness / 100,
                blendMode: blobBlendMode
            });
            
            // Get updated image data after blobs
            imageData = this.processCtx.getImageData(0, 0, origWidth, origHeight);
        } else {
            imageData = this.processCtx.getImageData(0, 0, origWidth, origHeight);
        }

        // Step 4: Noise texture
        if (noiseEnabled) {
            imageData = EffectsEngine.addNoise(imageData, noiseAmount);
            this.processCtx.putImageData(imageData, 0, 0);
        }

        // Step 5: Blend with original
        if (originalBlend > 0) {
            const origClean = new ImageData(
                new Uint8ClampedArray(this.originalImageData.data),
                origWidth,
                origHeight
            );
            imageData = this.processCtx.getImageData(0, 0, origWidth, origHeight);
            imageData = EffectsEngine.blendWithOriginal(imageData, origClean, originalBlend / 100);
            this.processCtx.putImageData(imageData, 0, 0);
        }

        return this.processCanvas;
    }

    /**
     * Get processed image as data URL
     */
    getDataURL(format = 'image/png', quality = 0.92) {
        return this.processCanvas.toDataURL(format, quality);
    }

    /**
     * Get processed image as Blob
     */
    async getBlob(format = 'image/png', quality = 0.92) {
        return new Promise(resolve => {
            this.processCanvas.toBlob(resolve, format, quality);
        });
    }

    /**
     * Check if image is loaded
     */
    hasImage() {
        return this.originalImageData !== null;
    }

    /**
     * Get original image dimensions
     */
    getDimensions() {
        if (!this.originalImageData) return null;
        return {
            width: this.originalImageData.width,
            height: this.originalImageData.height
        };
    }

    /**
     * Clear loaded image
     */
    clear() {
        this.originalImageData = null;
        this.sourceCanvas.width = 1;
        this.sourceCanvas.height = 1;
        this.processCanvas.width = 1;
        this.processCanvas.height = 1;
    }
}
