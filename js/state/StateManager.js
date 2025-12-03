/**
 * StateManager - Central state management for the app
 * Handles settings, current state, and subscribers
 */

export class StateManager {
    constructor() {
        this.state = {
            // Image state
            originalImage: null,
            processedImage: null,
            
            // Color palette
            colors: ['#0a0a0a', '#f5f5f5'],
            
            // Processing settings
            settings: {
                ditherType: 'floyd-steinberg',
                ditherStrength: 100,
                orderedMatrixSize: 4,
                pixelScale: 1.0,
                posterizeEnabled: false,
                posterizeLevels: 4,
                posterizeMode: 'luminance',
                posterizeUsePalette: true,
                blobEnabled: true,
                blobIntensity: 30,
                blobDensity: 15,         // Number of blobs (not percentage)
                blobSizeMin: 50,         // Bigger blobs!
                blobSizeMax: 200,        // Much bigger!
                blobSoftness: 60,        // Edge softness %
                blobBlendMode: 'overlay', // Photoshop blend mode
                noiseEnabled: false,
                noiseAmount: 10,
                originalBlend: 0
            },
            
            // UI state
            currentView: 'processed',
            isProcessing: false,
            activePreset: null
        };
        
        this.subscribers = new Set();
    }

    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Notify all subscribers of state change
     */
    notify(changedKey = null) {
        for (const callback of this.subscribers) {
            callback(this.state, changedKey);
        }
    }

    /**
     * Update state (partial update)
     */
    setState(updates, changedKey = null) {
        this.state = { ...this.state, ...updates };
        this.notify(changedKey);
    }

    /**
     * Update nested settings
     */
    updateSettings(settingUpdates) {
        this.state.settings = { ...this.state.settings, ...settingUpdates };
        this.notify('settings');
    }

    /**
     * Get current state
     */
    getState() {
        return this.state;
    }

    /**
     * Get settings merged with colors
     */
    getProcessingSettings() {
        return {
            colors: this.state.colors,
            ...this.state.settings
        };
    }

    /**
     * Set colors
     */
    setColors(colors) {
        this.state.colors = colors;
        this.notify('colors');
    }

    /**
     * Add a color
     */
    addColor(color = '#808080') {
        if (this.state.colors.length < 5) {
            const colors = [...this.state.colors];
            colors.splice(colors.length - 1, 0, color);
            this.state.colors = colors;
            this.notify('colors');
            return true;
        }
        return false;
    }

    /**
     * Remove a color by index
     */
    removeColor(index) {
        if (this.state.colors.length > 2) {
            const colors = [...this.state.colors];
            colors.splice(index, 1);
            this.state.colors = colors;
            this.notify('colors');
            return true;
        }
        return false;
    }

    /**
     * Update a color at index
     */
    updateColor(index, color) {
        const colors = [...this.state.colors];
        colors[index] = color;
        this.state.colors = colors;
        this.notify('colors');
    }

    /**
     * Apply a preset
     */
    applyPreset(preset, presetKey) {
        if (preset.colors) {
            this.state.colors = [...preset.colors];
        }
        
        const settingsToApply = {};
        
        // Dithering
        if (preset.ditherType !== undefined) settingsToApply.ditherType = preset.ditherType;
        if (preset.ditherStrength !== undefined) settingsToApply.ditherStrength = preset.ditherStrength;
        if (preset.pixelScale !== undefined) settingsToApply.pixelScale = preset.pixelScale;
        if (preset.orderedMatrixSize !== undefined) settingsToApply.orderedMatrixSize = preset.orderedMatrixSize;
        
        // Posterization
        if (preset.posterizeEnabled !== undefined) settingsToApply.posterizeEnabled = preset.posterizeEnabled;
        if (preset.posterizeLevels !== undefined) settingsToApply.posterizeLevels = preset.posterizeLevels;
        if (preset.posterizeMode !== undefined) settingsToApply.posterizeMode = preset.posterizeMode;
        
        // Blobs
        if (preset.blobEnabled !== undefined) settingsToApply.blobEnabled = preset.blobEnabled;
        if (preset.blobIntensity !== undefined) settingsToApply.blobIntensity = preset.blobIntensity;
        if (preset.blobDensity !== undefined) settingsToApply.blobDensity = preset.blobDensity;
        if (preset.blobSizeMin !== undefined) settingsToApply.blobSizeMin = preset.blobSizeMin;
        if (preset.blobSizeMax !== undefined) settingsToApply.blobSizeMax = preset.blobSizeMax;
        if (preset.blobSoftness !== undefined) settingsToApply.blobSoftness = preset.blobSoftness;
        if (preset.blobBlendMode !== undefined) settingsToApply.blobBlendMode = preset.blobBlendMode;
        
        // Noise
        if (preset.noiseEnabled !== undefined) settingsToApply.noiseEnabled = preset.noiseEnabled;
        if (preset.noiseAmount !== undefined) settingsToApply.noiseAmount = preset.noiseAmount;
        
        this.state.settings = { ...this.state.settings, ...settingsToApply };
        this.state.activePreset = presetKey;
        
        this.notify('preset');
    }

    /**
     * Reset to defaults
     */
    reset() {
        this.state.originalImage = null;
        this.state.processedImage = null;
        this.state.activePreset = null;
        this.state.isProcessing = false;
        this.notify('reset');
    }
}

// Singleton instance
export const stateManager = new StateManager();
export default stateManager;
