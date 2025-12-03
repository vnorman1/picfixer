/**
 * Custom Color Picker Component
 * A beautiful, mouse-release based color picker like design apps
 */

export class ColorPicker {
    constructor(options = {}) {
        this.onColorChange = options.onChange || (() => {});
        this.onColorConfirm = options.onConfirm || (() => {});
        this.currentColor = options.initialColor || '#ffffff';
        this.isOpen = false;
        this.isDragging = false;
        
        this.element = null;
        this.popup = null;
        this.hue = 0;
        this.saturation = 100;
        this.brightness = 100;
        
        this.parseColor(this.currentColor);
    }

    /**
     * Create picker element
     */
    create(container) {
        // Main trigger button
        this.element = document.createElement('div');
        this.element.className = 'color-picker-trigger';
        this.element.innerHTML = `
            <div class="color-preview-box" style="background: ${this.currentColor}"></div>
        `;
        
        container.appendChild(this.element);
        
        // Create popup
        this.createPopup();
        
        // Events
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.popup.contains(e.target) && !this.element.contains(e.target)) {
                this.close();
            }
        });
        
        return this;
    }

    /**
     * Create the popup picker
     */
    createPopup() {
        this.popup = document.createElement('div');
        this.popup.className = 'color-picker-popup';
        this.popup.innerHTML = `
            <div class="picker-main">
                <div class="saturation-brightness-area">
                    <div class="sb-gradient-white"></div>
                    <div class="sb-gradient-black"></div>
                    <div class="sb-cursor"></div>
                </div>
                <div class="hue-slider">
                    <div class="hue-cursor"></div>
                </div>
            </div>
            <div class="picker-preview">
                <div class="preview-color"></div>
                <input type="text" class="hex-input" value="${this.currentColor}">
            </div>
            <div class="picker-actions">
                <button class="picker-cancel">Mégse</button>
                <button class="picker-confirm">OK</button>
            </div>
        `;
        
        document.body.appendChild(this.popup);
        
        this.setupPickerEvents();
    }

    /**
     * Setup picker interaction events
     */
    setupPickerEvents() {
        const sbArea = this.popup.querySelector('.saturation-brightness-area');
        const sbCursor = this.popup.querySelector('.sb-cursor');
        const hueSlider = this.popup.querySelector('.hue-slider');
        const hueCursor = this.popup.querySelector('.hue-cursor');
        const hexInput = this.popup.querySelector('.hex-input');
        const cancelBtn = this.popup.querySelector('.picker-cancel');
        const confirmBtn = this.popup.querySelector('.picker-confirm');
        
        // Saturation/Brightness area
        let sbDragging = false;
        
        const updateSB = (e) => {
            const rect = sbArea.getBoundingClientRect();
            let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            
            this.saturation = (x / rect.width) * 100;
            this.brightness = 100 - (y / rect.height) * 100;
            
            sbCursor.style.left = x + 'px';
            sbCursor.style.top = y + 'px';
            
            this.updateColorFromHSB();
        };
        
        sbArea.addEventListener('mousedown', (e) => {
            sbDragging = true;
            updateSB(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (sbDragging) updateSB(e);
        });
        
        document.addEventListener('mouseup', () => {
            sbDragging = false;
        });
        
        // Hue slider
        let hueDragging = false;
        
        const updateHue = (e) => {
            const rect = hueSlider.getBoundingClientRect();
            let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            
            this.hue = (x / rect.width) * 360;
            hueCursor.style.left = x + 'px';
            
            // Update SB area background
            sbArea.style.background = `hsl(${this.hue}, 100%, 50%)`;
            
            this.updateColorFromHSB();
        };
        
        hueSlider.addEventListener('mousedown', (e) => {
            hueDragging = true;
            updateHue(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (hueDragging) updateHue(e);
        });
        
        document.addEventListener('mouseup', () => {
            hueDragging = false;
        });
        
        // Hex input
        hexInput.addEventListener('change', () => {
            let val = hexInput.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                this.parseColor(val);
                this.updateCursors();
                this.updateColorFromHSB();
            }
        });
        
        // Buttons
        cancelBtn.addEventListener('click', () => this.close());
        confirmBtn.addEventListener('click', () => {
            this.onColorConfirm(this.currentColor);
            this.close();
        });
    }

    /**
     * Update color from HSB values
     */
    updateColorFromHSB() {
        this.currentColor = this.hsbToHex(this.hue, this.saturation, this.brightness);
        
        // Update preview
        this.element.querySelector('.color-preview-box').style.background = this.currentColor;
        this.popup.querySelector('.preview-color').style.background = this.currentColor;
        this.popup.querySelector('.hex-input').value = this.currentColor.toUpperCase();
        
        // Live preview callback
        this.onColorChange(this.currentColor);
    }

    /**
     * Update cursor positions from current HSB
     */
    updateCursors() {
        const sbArea = this.popup.querySelector('.saturation-brightness-area');
        const sbCursor = this.popup.querySelector('.sb-cursor');
        const hueSlider = this.popup.querySelector('.hue-slider');
        const hueCursor = this.popup.querySelector('.hue-cursor');
        
        // Wait for popup to be visible
        setTimeout(() => {
            const sbRect = sbArea.getBoundingClientRect();
            const hueRect = hueSlider.getBoundingClientRect();
            
            sbCursor.style.left = (this.saturation / 100) * sbRect.width + 'px';
            sbCursor.style.top = ((100 - this.brightness) / 100) * sbRect.height + 'px';
            
            hueCursor.style.left = (this.hue / 360) * hueRect.width + 'px';
            
            sbArea.style.background = `hsl(${this.hue}, 100%, 50%)`;
        }, 10);
    }

    /**
     * Parse hex color to HSB
     */
    parseColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        // Brightness
        this.brightness = max * 100;
        
        // Saturation
        this.saturation = max === 0 ? 0 : (delta / max) * 100;
        
        // Hue
        if (delta === 0) {
            this.hue = 0;
        } else if (max === r) {
            this.hue = ((g - b) / delta) % 6 * 60;
        } else if (max === g) {
            this.hue = ((b - r) / delta + 2) * 60;
        } else {
            this.hue = ((r - g) / delta + 4) * 60;
        }
        
        if (this.hue < 0) this.hue += 360;
        
        this.currentColor = hex;
    }

    /**
     * Convert HSB to hex
     */
    hsbToHex(h, s, b) {
        s /= 100;
        b /= 100;
        
        const c = b * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = b - c;
        
        let r, g, bl;
        
        if (h < 60) { r = c; g = x; bl = 0; }
        else if (h < 120) { r = x; g = c; bl = 0; }
        else if (h < 180) { r = 0; g = c; bl = x; }
        else if (h < 240) { r = 0; g = x; bl = c; }
        else if (h < 300) { r = x; g = 0; bl = c; }
        else { r = c; g = 0; bl = x; }
        
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        bl = Math.round((bl + m) * 255);
        
        return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Toggle popup
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    /**
     * Open popup
     */
    open() {
        const rect = this.element.getBoundingClientRect();
        this.popup.style.top = rect.bottom + 8 + 'px';
        this.popup.style.left = rect.left + 'px';
        this.popup.classList.add('visible');
        this.isOpen = true;
        this.updateCursors();
    }

    /**
     * Close popup
     */
    close() {
        this.popup.classList.remove('visible');
        this.isOpen = false;
    }

    /**
     * Set color externally
     */
    setColor(hex) {
        this.parseColor(hex);
        this.element.querySelector('.color-preview-box').style.background = hex;
        if (this.isOpen) {
            this.updateCursors();
        }
    }

    /**
     * Get current color
     */
    getColor() {
        return this.currentColor;
    }

    /**
     * Destroy picker
     */
    destroy() {
        this.popup?.remove();
        this.element?.remove();
    }
}

// Export styles that should be added to the page
export const ColorPickerStyles = `
    .color-picker-trigger {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        border: 2px solid var(--border, #2d2d3a);
        cursor: pointer;
        overflow: hidden;
        transition: border-color 0.15s ease, transform 0.1s ease;
    }

    .color-picker-trigger:hover {
        border-color: var(--accent, #6366f1);
        transform: scale(1.05);
    }

    .color-preview-box {
        width: 100%;
        height: 100%;
    }

    .color-picker-popup {
        position: fixed;
        z-index: 10000;
        background: var(--bg-secondary, #12121a);
        border: 1px solid var(--border, #2d2d3a);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        display: none;
        min-width: 260px;
    }

    .color-picker-popup.visible {
        display: block;
        animation: picker-fade-in 0.15s ease;
    }

    @keyframes picker-fade-in {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .picker-main {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .saturation-brightness-area {
        width: 230px;
        height: 150px;
        position: relative;
        border-radius: 8px;
        cursor: crosshair;
        background: hsl(0, 100%, 50%);
    }

    .sb-gradient-white {
        position: absolute;
        inset: 0;
        background: linear-gradient(to right, #fff, transparent);
        border-radius: 8px;
    }

    .sb-gradient-black {
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, transparent, #000);
        border-radius: 8px;
    }

    .sb-cursor {
        position: absolute;
        width: 16px;
        height: 16px;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .hue-slider {
        width: 230px;
        height: 16px;
        border-radius: 8px;
        background: linear-gradient(to right, 
            hsl(0, 100%, 50%), 
            hsl(60, 100%, 50%), 
            hsl(120, 100%, 50%), 
            hsl(180, 100%, 50%), 
            hsl(240, 100%, 50%), 
            hsl(300, 100%, 50%), 
            hsl(360, 100%, 50%)
        );
        position: relative;
        cursor: pointer;
    }

    .hue-cursor {
        position: absolute;
        width: 8px;
        height: 20px;
        background: white;
        border-radius: 4px;
        top: -2px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        transform: translateX(-50%);
        pointer-events: none;
    }

    .picker-preview {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border, #2d2d3a);
    }

    .preview-color {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        border: 2px solid var(--border, #2d2d3a);
    }

    .picker-preview .hex-input {
        flex: 1;
        background: var(--bg-tertiary, #1a1a25);
        border: 1px solid var(--border, #2d2d3a);
        border-radius: 8px;
        padding: 10px 12px;
        color: var(--text-primary, #f8fafc);
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
    }

    .picker-preview .hex-input:focus {
        outline: none;
        border-color: var(--accent, #6366f1);
    }

    .picker-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
    }

    .picker-actions button {
        flex: 1;
        padding: 10px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .picker-cancel {
        background: var(--bg-tertiary, #1a1a25);
        border: 1px solid var(--border, #2d2d3a);
        color: var(--text-secondary, #94a3b8);
    }

    .picker-cancel:hover {
        border-color: var(--text-secondary, #94a3b8);
    }

    .picker-confirm {
        background: var(--accent, #6366f1);
        border: none;
        color: white;
    }

    .picker-confirm:hover {
        background: var(--accent-hover, #818cf8);
    }
`;
