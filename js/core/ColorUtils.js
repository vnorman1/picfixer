/**
 * ColorUtils - Color manipulation utilities
 * High-performance color operations for image processing
 */

export class ColorUtils {
    /**
     * Convert hex color to RGB array [r, g, b]
     * This format is used for dithering algorithms
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }

    /**
     * Convert hex color to RGB object {r, g, b}
     * This format is used for canvas operations
     */
    static hexToRgbObj(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
     * Convert RGB to hex string
     */
    static rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    /**
     * Calculate perceived luminance (fast integer math)
     */
    static getLuminance(r, g, b) {
        // Using bit shift for speed: (r*77 + g*150 + b*29) >> 8
        return (r * 77 + g * 150 + b * 29) >> 8;
    }

    /**
     * Calculate squared color distance (no sqrt for speed)
     */
    static colorDistanceSq(r1, g1, b1, r2, g2, b2) {
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        // Weighted by human perception
        return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    }

    /**
     * Find closest color in palette (optimized)
     */
    static findClosestColor(r, g, b, palette) {
        let minDist = Infinity;
        let closest = palette[0];
        
        for (let i = 0; i < palette.length; i++) {
            const [pr, pg, pb] = palette[i];
            const dist = this.colorDistanceSq(r, g, b, pr, pg, pb);
            if (dist < minDist) {
                minDist = dist;
                closest = palette[i];
            }
        }
        return closest;
    }

    /**
     * Sort palette by luminance (darkest to lightest)
     */
    static sortPaletteByLuminance(palette) {
        return [...palette].sort((a, b) => 
            this.getLuminance(a[0], a[1], a[2]) - this.getLuminance(b[0], b[1], b[2])
        );
    }

    /**
     * Get palette index by luminance
     */
    static getPaletteIndexByLuminance(luminance, paletteLength) {
        const normalized = luminance / 255;
        const index = Math.round(normalized * (paletteLength - 1));
        return Math.max(0, Math.min(paletteLength - 1, index));
    }

    /**
     * Clamp value between 0 and 255
     */
    static clamp(value) {
        return value < 0 ? 0 : (value > 255 ? 255 : value);
    }
}
