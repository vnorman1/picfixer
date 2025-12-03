/**
 * DitheringEngine - High-performance dithering algorithms
 * Uses typed arrays and optimized loops for native speed
 */

import { ColorUtils } from './ColorUtils.js';

export class DitheringEngine {
    
    /**
     * Floyd-Steinberg Dithering - Classic error diffusion
     * Processes directly on ImageData for maximum speed
     */
    static floydSteinberg(imageData, palette) {
        const { data, width, height } = imageData;
        
        // Create float buffer for error accumulation
        const buffer = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            buffer[i] = data[i];
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Get current pixel with accumulated error
                const r = buffer[idx];
                const g = buffer[idx + 1];
                const b = buffer[idx + 2];
                
                // Find closest palette color
                const [nr, ng, nb] = ColorUtils.findClosestColor(r, g, b, palette);
                
                // Set output pixel
                data[idx] = nr;
                data[idx + 1] = ng;
                data[idx + 2] = nb;
                
                // Calculate error
                const errR = r - nr;
                const errG = g - ng;
                const errB = b - nb;
                
                // Distribute error to neighbors (Floyd-Steinberg pattern)
                // Right: 7/16
                if (x + 1 < width) {
                    const rightIdx = idx + 4;
                    buffer[rightIdx] += errR * 0.4375;
                    buffer[rightIdx + 1] += errG * 0.4375;
                    buffer[rightIdx + 2] += errB * 0.4375;
                }
                
                // Bottom row
                if (y + 1 < height) {
                    // Bottom-left: 3/16
                    if (x > 0) {
                        const blIdx = ((y + 1) * width + x - 1) * 4;
                        buffer[blIdx] += errR * 0.1875;
                        buffer[blIdx + 1] += errG * 0.1875;
                        buffer[blIdx + 2] += errB * 0.1875;
                    }
                    
                    // Bottom: 5/16
                    const bottomIdx = ((y + 1) * width + x) * 4;
                    buffer[bottomIdx] += errR * 0.3125;
                    buffer[bottomIdx + 1] += errG * 0.3125;
                    buffer[bottomIdx + 2] += errB * 0.3125;
                    
                    // Bottom-right: 1/16
                    if (x + 1 < width) {
                        const brIdx = ((y + 1) * width + x + 1) * 4;
                        buffer[brIdx] += errR * 0.0625;
                        buffer[brIdx + 1] += errG * 0.0625;
                        buffer[brIdx + 2] += errB * 0.0625;
                    }
                }
            }
        }
        
        return imageData;
    }

    /**
     * Ordered Dithering (Bayer) - Super fast pattern-based dithering
     * No error diffusion needed - pure lookup table operation
     */
    static orderedDither(imageData, palette, matrixSize = 4) {
        const { data, width, height } = imageData;
        
        // Pre-computed Bayer matrices (normalized 0-1)
        const bayerMatrices = {
            2: [
                [0.00, 0.50],
                [0.75, 0.25]
            ],
            4: [
                [0.0000, 0.5000, 0.1250, 0.6250],
                [0.7500, 0.2500, 0.8750, 0.3750],
                [0.1875, 0.6875, 0.0625, 0.5625],
                [0.9375, 0.4375, 0.8125, 0.3125]
            ],
            8: [
                [0.000, 0.500, 0.125, 0.625, 0.031, 0.531, 0.156, 0.656],
                [0.750, 0.250, 0.875, 0.375, 0.781, 0.281, 0.906, 0.406],
                [0.188, 0.688, 0.063, 0.563, 0.219, 0.719, 0.094, 0.594],
                [0.938, 0.438, 0.813, 0.313, 0.969, 0.469, 0.844, 0.344],
                [0.047, 0.547, 0.172, 0.672, 0.016, 0.516, 0.141, 0.641],
                [0.797, 0.297, 0.922, 0.422, 0.766, 0.266, 0.891, 0.391],
                [0.234, 0.734, 0.109, 0.609, 0.203, 0.703, 0.078, 0.578],
                [0.984, 0.484, 0.859, 0.359, 0.953, 0.453, 0.828, 0.328]
            ]
        };
        
        const bayer = bayerMatrices[matrixSize] || bayerMatrices[4];
        const sortedPalette = ColorUtils.sortPaletteByLuminance(palette);
        const numColors = sortedPalette.length;
        
        for (let y = 0; y < height; y++) {
            const yMod = y % matrixSize;
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                
                // Get threshold from Bayer matrix
                const threshold = bayer[yMod][x % matrixSize];
                
                // Calculate luminance and apply threshold
                const lum = ColorUtils.getLuminance(r, g, b) / 255;
                const adjustedLum = lum + (threshold - 0.5) * 0.5;
                
                // Map to palette
                const colorIdx = ColorUtils.getPaletteIndexByLuminance(
                    adjustedLum * 255, 
                    numColors
                );
                
                const [nr, ng, nb] = sortedPalette[colorIdx];
                data[idx] = nr;
                data[idx + 1] = ng;
                data[idx + 2] = nb;
            }
        }
        
        return imageData;
    }

    /**
     * Atkinson Dithering - Classic Mac style
     * Distributes only 6/8 of error for higher contrast
     */
    static atkinson(imageData, palette) {
        const { data, width, height } = imageData;
        
        const buffer = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            buffer[i] = data[i];
        }
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                const r = buffer[idx];
                const g = buffer[idx + 1];
                const b = buffer[idx + 2];
                
                const [nr, ng, nb] = ColorUtils.findClosestColor(r, g, b, palette);
                
                data[idx] = nr;
                data[idx + 1] = ng;
                data[idx + 2] = nb;
                
                // Error * 1/8 (Atkinson distributes less error)
                const errR = (r - nr) * 0.125;
                const errG = (g - ng) * 0.125;
                const errB = (b - nb) * 0.125;
                
                // Atkinson pattern: 6 neighbors get 1/8 each
                const neighbors = [
                    [0, 1], [0, 2],           // Right, far right
                    [1, -1], [1, 0], [1, 1],  // Next row
                    [2, 0]                     // Two rows down
                ];
                
                for (const [dy, dx] of neighbors) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        const nIdx = (ny * width + nx) * 4;
                        buffer[nIdx] += errR;
                        buffer[nIdx + 1] += errG;
                        buffer[nIdx + 2] += errB;
                    }
                }
            }
        }
        
        return imageData;
    }

    /**
     * Simple Quantize - No dithering, just nearest color
     * Ultra fast for preview or clean look
     */
    static quantize(imageData, palette) {
        const { data, width, height } = imageData;
        
        for (let i = 0; i < data.length; i += 4) {
            const [nr, ng, nb] = ColorUtils.findClosestColor(
                data[i], data[i + 1], data[i + 2], 
                palette
            );
            data[i] = nr;
            data[i + 1] = ng;
            data[i + 2] = nb;
        }
        
        return imageData;
    }
}
