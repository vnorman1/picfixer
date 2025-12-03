/**
 * EffectsEngine - Additional image effects
 * Posterization, blob overlay, noise textures
 * Enhanced with Photoshop-style blend modes
 */

import { ColorUtils } from './ColorUtils.js';

export class EffectsEngine {
    
    // Available blend modes (Photoshop-style)
    static BLEND_MODES = [
        'normal',
        'multiply',
        'screen',
        'overlay',
        'soft-light',
        'hard-light',
        'color-dodge',
        'color-burn',
        'difference',
        'exclusion',
        'lighten',
        'darken'
    ];

    /**
     * Posterization - Reduce color levels for flat color bands
     */
    static posterize(imageData, levels = 4, mode = 'luminance', palette = null) {
        const { data, width, height } = imageData;
        levels = Math.max(2, Math.min(16, levels));
        const step = 255 / (levels - 1);
        
        if (mode === 'luminance' && !palette) {
            // Posterize by luminance, preserve hue
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                const lum = ColorUtils.getLuminance(r, g, b);
                const quantLum = Math.round(lum / step) * step;
                
                // Scale colors to maintain hue
                const scale = lum > 0 ? quantLum / lum : 1;
                data[i] = ColorUtils.clamp(r * scale);
                data[i + 1] = ColorUtils.clamp(g * scale);
                data[i + 2] = ColorUtils.clamp(b * scale);
            }
        } else if (mode === 'per-channel') {
            // Independent RGB posterization
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.round(data[i] / step) * step;
                data[i + 1] = Math.round(data[i + 1] / step) * step;
                data[i + 2] = Math.round(data[i + 2] / step) * step;
            }
        } else if (mode === 'artistic') {
            // Enhanced contrast posterization
            let sum = 0;
            for (let i = 0; i < data.length; i += 4) {
                sum += data[i] + data[i + 1] + data[i + 2];
            }
            const mean = sum / (data.length * 0.75);
            
            for (let i = 0; i < data.length; i += 4) {
                // Boost contrast
                let r = (data[i] - mean) * 1.3 + mean;
                let g = (data[i + 1] - mean) * 1.3 + mean;
                let b = (data[i + 2] - mean) * 1.3 + mean;
                
                // Posterize
                data[i] = ColorUtils.clamp(Math.round(r / step) * step);
                data[i + 1] = ColorUtils.clamp(Math.round(g / step) * step * 1.05);
                data[i + 2] = ColorUtils.clamp(Math.round(b / step) * step);
            }
        }
        
        // Map to palette if provided
        if (palette && palette.length > 0) {
            const sortedPalette = ColorUtils.sortPaletteByLuminance(palette);
            const numColors = sortedPalette.length;
            
            for (let i = 0; i < data.length; i += 4) {
                const lum = ColorUtils.getLuminance(data[i], data[i + 1], data[i + 2]);
                const idx = ColorUtils.getPaletteIndexByLuminance(lum, numColors);
                const [r, g, b] = sortedPalette[idx];
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }
        }
        
        return imageData;
    }

    /**
     * Blend two color values based on blend mode
     */
    static blendPixel(base, blend, mode) {
        const b = base / 255;
        const l = blend / 255;
        let result;
        
        switch (mode) {
            case 'multiply':
                result = b * l;
                break;
            case 'screen':
                result = 1 - (1 - b) * (1 - l);
                break;
            case 'overlay':
                result = b < 0.5 ? 2 * b * l : 1 - 2 * (1 - b) * (1 - l);
                break;
            case 'soft-light':
                result = l < 0.5 
                    ? b - (1 - 2 * l) * b * (1 - b)
                    : b + (2 * l - 1) * (Math.sqrt(b) - b);
                break;
            case 'hard-light':
                result = l < 0.5 ? 2 * b * l : 1 - 2 * (1 - b) * (1 - l);
                break;
            case 'color-dodge':
                result = l === 1 ? 1 : Math.min(1, b / (1 - l));
                break;
            case 'color-burn':
                result = l === 0 ? 0 : Math.max(0, 1 - (1 - b) / l);
                break;
            case 'difference':
                result = Math.abs(b - l);
                break;
            case 'exclusion':
                result = b + l - 2 * b * l;
                break;
            case 'lighten':
                result = Math.max(b, l);
                break;
            case 'darken':
                result = Math.min(b, l);
                break;
            default: // normal
                result = l;
        }
        
        return Math.round(result * 255);
    }

    /**
     * Add organic blob overlay pattern with Photoshop blend modes
     * BIG blobs with customizable settings
     */
    static addBlobs(ctx, width, height, options = {}) {
        const {
            intensity = 0.3,
            density = 50,       // Number of blobs (not percentage)
            minSize = 50,       // Larger default sizes!
            maxSize = 200,      // Much bigger blobs
            blendMode = 'overlay',
            color = null,       // Custom blob color (null = white)
            softness = 0.6      // Edge softness (0-1)
        } = options;
        
        // Create temporary canvas for blobs
        const blobCanvas = document.createElement('canvas');
        blobCanvas.width = width;
        blobCanvas.height = height;
        const blobCtx = blobCanvas.getContext('2d');
        
        // Get base color
        const blobColor = color || '#ffffff';
        const rgb = ColorUtils.hexToRgbObj(blobColor);
        
        // Draw blobs
        const numBlobs = Math.max(5, Math.min(density, 100));
        
        for (let i = 0; i < numBlobs; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = minSize + Math.random() * (maxSize - minSize);
            const alpha = 0.2 + Math.random() * 0.5;
            
            // Create gradient for soft edges
            const gradient = blobCtx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
            gradient.addColorStop(softness, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            
            // Draw organic blob shape using bezier curves
            blobCtx.beginPath();
            const points = 6 + Math.floor(Math.random() * 4);
            const angleStep = (Math.PI * 2) / points;
            
            // Generate control points for smooth blob
            const controlPoints = [];
            for (let j = 0; j < points; j++) {
                const angle = j * angleStep + Math.random() * 0.3;
                const r = size * (0.6 + Math.random() * 0.8);
                controlPoints.push({
                    x: x + Math.cos(angle) * r,
                    y: y + Math.sin(angle) * r
                });
            }
            
            // Draw smooth blob using quadratic curves
            blobCtx.moveTo(controlPoints[0].x, controlPoints[0].y);
            for (let j = 0; j < points; j++) {
                const curr = controlPoints[j];
                const next = controlPoints[(j + 1) % points];
                const midX = (curr.x + next.x) / 2;
                const midY = (curr.y + next.y) / 2;
                blobCtx.quadraticCurveTo(curr.x, curr.y, midX, midY);
            }
            blobCtx.closePath();
            
            blobCtx.fillStyle = gradient;
            blobCtx.fill();
        }
        
        // Apply blob layer with blend mode
        ctx.globalAlpha = intensity;
        ctx.globalCompositeOperation = blendMode;
        ctx.drawImage(blobCanvas, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Add noise texture for organic feel
     */
    static addNoise(imageData, amount = 10) {
        const { data } = imageData;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * amount * 2;
            data[i] = ColorUtils.clamp(data[i] + noise);
            data[i + 1] = ColorUtils.clamp(data[i + 1] + noise);
            data[i + 2] = ColorUtils.clamp(data[i + 2] + noise);
        }
        
        return imageData;
    }

    /**
     * Blend with original image for visibility
     */
    static blendWithOriginal(processedData, originalData, blendAmount) {
        const processed = processedData.data;
        const original = originalData.data;
        const invBlend = 1 - blendAmount;
        
        for (let i = 0; i < processed.length; i += 4) {
            processed[i] = processed[i] * invBlend + original[i] * blendAmount;
            processed[i + 1] = processed[i + 1] * invBlend + original[i + 1] * blendAmount;
            processed[i + 2] = processed[i + 2] * invBlend + original[i + 2] * blendAmount;
        }
        
        return processedData;
    }
}
