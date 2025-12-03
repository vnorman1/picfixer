/**
 * PicFixer App - Main Application Controller
 * Pure JavaScript/Canvas image processing - instant, no server needed
 */

import { ImageProcessor } from './core/ImageProcessor.js';
import { stateManager } from './state/StateManager.js';
import { Presets } from './data/Presets.js';
import { ColorPicker } from './components/ColorPicker.js';

class PicFixerApp {
    constructor() {
        this.processor = new ImageProcessor();
        this.processDebounceTimer = null;
        this.colorPickers = [];
        this.init();
    }

    init() {
        this.setupFileUpload();
        this.setupPresets();
        this.setupDitheringControls();
        this.setupPosterizeControls();
        this.setupEffectControls();
        this.setupColorPalette();
        this.setupDownload();
        
        // Subscribe to state changes
        stateManager.subscribe((state, key) => {
            if (key === 'colors') this.renderColorPalette();
        });
        
        console.log('🎨 PicFixer initialized - Pure JavaScript/Canvas');
    }

    // ==================== FILE UPLOAD ====================
    
    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('imageInput');
        
        console.log('Setting up file upload:', { uploadArea, fileInput });
        
        if (!uploadArea || !fileInput) {
            console.error('Upload elements not found!');
            return;
        }
        
        uploadArea.addEventListener('click', (e) => {
            console.log('Upload area clicked');
            e.stopPropagation();
            fileInput.click();
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            console.log('File dropped:', file);
            if (file?.type.startsWith('image/')) this.loadImage(file);
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            console.log('File selected:', file);
            if (file) this.loadImage(file);
        });
    }

    async loadImage(file) {
        console.log('Loading image:', file.name);
        try {
            await this.processor.loadImage(file);
            console.log('Image loaded successfully');
            this.processImage();
        } catch (err) {
            console.error('Failed to load image:', err);
        }
    }

    // ==================== PRESETS ====================
    
    setupPresets() {
        const grid = document.getElementById('presetsGrid');
        
        grid.innerHTML = Object.entries(Presets).map(([key, preset]) => `
            <button class="preset-btn" data-preset="${key}">
                ${preset.name}
                <div class="preset-colors">
                    ${preset.colors.map(c => `<div class="preset-color" style="background: ${c}"></div>`).join('')}
                </div>
            </button>
        `).join('');
        
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.preset-btn');
            if (!btn) return;
            
            // Highlight active
            grid.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Apply preset
            const preset = Presets[btn.dataset.preset];
            if (preset) {
                stateManager.applyPreset(preset, btn.dataset.preset);
                this.updateAllUIFromState();
                this.processImage();
            }
        });
        
        // Setup save button
        document.getElementById('savePresetBtn').addEventListener('click', () => this.saveCurrentPreset());
        
        // Load saved presets
        this.renderSavedPresets();
    }

    saveCurrentPreset() {
        const name = prompt('Add meg a preset nevét:');
        if (!name || !name.trim()) return;
        
        const state = stateManager.getState();
        const preset = {
            name: name.trim(),
            colors: [...state.colors],
            ditherType: state.settings.ditherType,
            ditherStrength: state.settings.ditherStrength,
            pixelScale: state.settings.pixelScale,
            posterizeEnabled: state.settings.posterizeEnabled,
            posterizeLevels: state.settings.posterizeLevels,
            posterizeMode: state.settings.posterizeMode,
            blobEnabled: state.settings.blobEnabled,
            blobIntensity: state.settings.blobIntensity,
            blobDensity: state.settings.blobDensity,
            blobSizeMin: state.settings.blobSizeMin,
            blobSizeMax: state.settings.blobSizeMax,
            blobSoftness: state.settings.blobSoftness,
            blobBlendMode: state.settings.blobBlendMode,
            noiseEnabled: state.settings.noiseEnabled,
            noiseAmount: state.settings.noiseAmount,
            timestamp: Date.now()
        };
        
        // Load existing presets
        const saved = JSON.parse(localStorage.getItem('picfixer_presets') || '[]');
        saved.push(preset);
        localStorage.setItem('picfixer_presets', JSON.stringify(saved));
        
        this.renderSavedPresets();
    }

    renderSavedPresets() {
        const container = document.getElementById('savedPresetsContainer');
        const saved = JSON.parse(localStorage.getItem('picfixer_presets') || '[]');
        
        if (saved.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="saved-presets-title">Mentett presetek</div>
            ${saved.map((preset, idx) => `
                <div class="saved-preset-item" data-index="${idx}">
                    <span class="saved-preset-name">${preset.name}</span>
                    <div class="saved-preset-colors">
                        ${preset.colors.map(c => `<div class="preset-color" style="background: ${c}"></div>`).join('')}
                    </div>
                    <button class="saved-preset-delete" data-index="${idx}">×</button>
                </div>
            `).join('')}
        `;
        
        // Apply preset on click
        container.querySelectorAll('.saved-preset-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('saved-preset-delete')) return;
                const idx = parseInt(item.dataset.index);
                this.applySavedPreset(idx);
            });
        });
        
        // Delete preset
        container.querySelectorAll('.saved-preset-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                this.deleteSavedPreset(idx);
            });
        });
    }

    applySavedPreset(index) {
        const saved = JSON.parse(localStorage.getItem('picfixer_presets') || '[]');
        const preset = saved[index];
        if (!preset) return;
        
        stateManager.applyPreset(preset, `saved_${index}`);
        this.updateAllUIFromState();
        this.processImage();
    }

    deleteSavedPreset(index) {
        if (!confirm('Biztosan törlöd ezt a presetet?')) return;
        
        const saved = JSON.parse(localStorage.getItem('picfixer_presets') || '[]');
        saved.splice(index, 1);
        localStorage.setItem('picfixer_presets', JSON.stringify(saved));
        
        this.renderSavedPresets();
    }

    // ==================== DITHERING ====================
    
    setupDitheringControls() {
        const typeSelect = document.getElementById('ditheringType');
        const bayerGroup = document.getElementById('bayerSizeGroup');
        const bayerSlider = document.getElementById('bayerSize');
        const bayerValue = document.getElementById('bayerSizeValue');
        const strengthSlider = document.getElementById('ditheringStrength');
        const strengthValue = document.getElementById('ditheringStrengthValue');
        const pixelSlider = document.getElementById('pixelScale');
        const pixelValue = document.getElementById('pixelScaleValue');
        
        typeSelect.addEventListener('change', () => {
            stateManager.updateSettings({ ditherType: typeSelect.value });
            bayerGroup.style.display = typeSelect.value === 'ordered' ? 'block' : 'none';
            this.processImage();
        });
        
        bayerSlider.addEventListener('input', () => {
            bayerValue.textContent = bayerSlider.value;
            stateManager.updateSettings({ orderedMatrixSize: parseInt(bayerSlider.value) });
            this.processImageDebounced();
        });
        
        strengthSlider.addEventListener('input', () => {
            strengthValue.textContent = strengthSlider.value + '%';
            stateManager.updateSettings({ ditherStrength: parseInt(strengthSlider.value) });
            this.processImageDebounced();
        });
        
        pixelSlider.addEventListener('input', () => {
            const value = parseInt(pixelSlider.value) / 10;
            pixelValue.textContent = value.toFixed(1) + 'x';
            stateManager.updateSettings({ pixelScale: value });
            this.processImageDebounced();
        });
    }

    // ==================== POSTERIZATION ====================
    
    setupPosterizeControls() {
        const toggle = document.getElementById('posterizeToggle');
        const levelsGroup = document.getElementById('posterizeLevelsGroup');
        const modeGroup = document.getElementById('posterizeModeGroup');
        const levelsSlider = document.getElementById('posterizeLevels');
        const levelsValue = document.getElementById('posterizeLevelsValue');
        const modeSelect = document.getElementById('posterizeMode');
        
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            const enabled = toggle.classList.contains('active');
            stateManager.updateSettings({ posterizeEnabled: enabled });
            levelsGroup.style.display = enabled ? 'block' : 'none';
            modeGroup.style.display = enabled ? 'block' : 'none';
            this.processImage();
        });
        
        levelsSlider.addEventListener('input', () => {
            levelsValue.textContent = levelsSlider.value;
            stateManager.updateSettings({ posterizeLevels: parseInt(levelsSlider.value) });
            this.processImageDebounced();
        });
        
        modeSelect.addEventListener('change', () => {
            stateManager.updateSettings({ posterizeMode: modeSelect.value });
            this.processImage();
        });
    }

    // ==================== EFFECTS (BLOB & NOISE) ====================
    
    setupEffectControls() {
        // Blob
        const blobToggle = document.getElementById('blobToggle');
        const blobControls = document.getElementById('blobControls');
        const blobCountSlider = document.getElementById('blobCount');
        const blobCountValue = document.getElementById('blobCountValue');
        const blobMinSizeSlider = document.getElementById('blobMinSize');
        const blobMinSizeValue = document.getElementById('blobMinSizeValue');
        const blobMaxSizeSlider = document.getElementById('blobMaxSize');
        const blobMaxSizeValue = document.getElementById('blobMaxSizeValue');
        const blobOpacitySlider = document.getElementById('blobOpacity');
        const blobOpacityValue = document.getElementById('blobOpacityValue');
        const blobSoftnessSlider = document.getElementById('blobSoftness');
        const blobSoftnessValue = document.getElementById('blobSoftnessValue');
        const blobBlendModeSelect = document.getElementById('blobBlendMode');
        
        blobToggle.addEventListener('click', () => {
            blobToggle.classList.toggle('active');
            const enabled = blobToggle.classList.contains('active');
            stateManager.updateSettings({ blobEnabled: enabled });
            blobControls.style.display = enabled ? 'block' : 'none';
            this.processImage();
        });
        
        blobCountSlider.addEventListener('input', () => {
            blobCountValue.textContent = blobCountSlider.value;
            stateManager.updateSettings({ blobDensity: parseInt(blobCountSlider.value) });
            this.processImageDebounced();
        });
        
        blobMinSizeSlider.addEventListener('input', () => {
            blobMinSizeValue.textContent = blobMinSizeSlider.value;
            stateManager.updateSettings({ blobSizeMin: parseInt(blobMinSizeSlider.value) });
            this.processImageDebounced();
        });
        
        blobMaxSizeSlider.addEventListener('input', () => {
            blobMaxSizeValue.textContent = blobMaxSizeSlider.value;
            stateManager.updateSettings({ blobSizeMax: parseInt(blobMaxSizeSlider.value) });
            this.processImageDebounced();
        });
        
        blobOpacitySlider.addEventListener('input', () => {
            blobOpacityValue.textContent = blobOpacitySlider.value + '%';
            stateManager.updateSettings({ blobIntensity: parseInt(blobOpacitySlider.value) });
            this.processImageDebounced();
        });
        
        blobSoftnessSlider.addEventListener('input', () => {
            blobSoftnessValue.textContent = blobSoftnessSlider.value + '%';
            stateManager.updateSettings({ blobSoftness: parseInt(blobSoftnessSlider.value) });
            this.processImageDebounced();
        });
        
        blobBlendModeSelect.addEventListener('change', () => {
            stateManager.updateSettings({ blobBlendMode: blobBlendModeSelect.value });
            this.processImage();
        });
        
        // Noise
        const noiseToggle = document.getElementById('noiseToggle');
        const noiseAmountGroup = document.getElementById('noiseAmountGroup');
        const noiseAmountSlider = document.getElementById('noiseAmount');
        const noiseAmountValue = document.getElementById('noiseAmountValue');
        
        noiseToggle.addEventListener('click', () => {
            noiseToggle.classList.toggle('active');
            const enabled = noiseToggle.classList.contains('active');
            stateManager.updateSettings({ noiseEnabled: enabled });
            noiseAmountGroup.style.display = enabled ? 'block' : 'none';
            this.processImage();
        });
        
        noiseAmountSlider.addEventListener('input', () => {
            noiseAmountValue.textContent = noiseAmountSlider.value;
            stateManager.updateSettings({ noiseAmount: parseInt(noiseAmountSlider.value) });
            this.processImageDebounced();
        });
    }

    // ==================== COLOR PALETTE ====================
    
    setupColorPalette() {
        document.getElementById('addColorBtn').addEventListener('click', () => {
            if (stateManager.addColor()) {
                this.renderColorPalette();
                this.processImage();
            }
        });
        
        this.renderColorPalette();
    }

    renderColorPalette() {
        const container = document.getElementById('paletteContainer');
        const colors = stateManager.getState().colors;
        
        // Clean up old pickers
        this.colorPickers.forEach(p => p.destroy?.());
        this.colorPickers = [];
        
        container.innerHTML = colors.map((color, idx) => `
            <div class="palette-row" data-index="${idx}">
                <div class="picker-container" data-index="${idx}"></div>
                <input type="text" class="color-hex" value="${color.toUpperCase()}" data-index="${idx}">
                ${colors.length > 2 ? `<button class="remove-color-btn" data-index="${idx}">×</button>` : ''}
            </div>
        `).join('');
        
        // Create custom color pickers
        colors.forEach((color, idx) => {
            const pickerContainer = container.querySelector(`.picker-container[data-index="${idx}"]`);
            
            const picker = new ColorPicker({
                initialColor: color,
                onChange: (newColor) => {
                    // Live preview while dragging
                    stateManager.updateColor(idx, newColor);
                    const hexInput = container.querySelector(`.color-hex[data-index="${idx}"]`);
                    if (hexInput) hexInput.value = newColor.toUpperCase();
                    this.processImageDebounced(50);
                },
                onConfirm: (newColor) => {
                    // Final color when OK pressed
                    stateManager.updateColor(idx, newColor);
                    this.processImage();
                }
            });
            
            picker.create(pickerContainer);
            this.colorPickers.push(picker);
        });
        
        // Hex input events
        container.querySelectorAll('.color-hex').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                let val = e.target.value.trim();
                if (!val.startsWith('#')) val = '#' + val;
                if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                    stateManager.updateColor(idx, val);
                    this.colorPickers[idx]?.setColor(val);
                    e.target.value = val.toUpperCase();
                    this.processImage();
                }
            });
        });
        
        // Remove color events
        container.querySelectorAll('.remove-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                stateManager.removeColor(idx);
                this.renderColorPalette();
                this.processImage();
            });
        });
    }

    // ==================== DOWNLOAD ====================
    
    setupDownload() {
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadImage('png');
        });
        
        document.getElementById('downloadWebpBtn').addEventListener('click', () => {
            this.downloadImage('webp');
        });
    }

    downloadImage(format = 'png') {
        if (!this.processor.hasImage()) return;
        
        const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
        const quality = format === 'webp' ? 0.92 : undefined;
        
        const dataUrl = this.processor.getDataURL(mimeType, quality);
        const link = document.createElement('a');
        link.download = `picfixer-${Date.now()}.${format}`;
        link.href = dataUrl;
        link.click();
    }

    // ==================== IMAGE PROCESSING ====================
    
    processImageDebounced(delay = 30) {
        clearTimeout(this.processDebounceTimer);
        this.processDebounceTimer = setTimeout(() => this.processImage(), delay);
    }

    processImage() {
        if (!this.processor.hasImage()) return;
        
        const startTime = performance.now();
        const indicator = document.getElementById('processingIndicator');
        indicator.classList.add('active');
        
        // Use requestAnimationFrame for smooth UI
        requestAnimationFrame(() => {
            try {
                const settings = stateManager.getProcessingSettings();
                const resultCanvas = this.processor.process(settings);
                
                // Display result
                const outputCanvas = document.getElementById('outputCanvas');
                const placeholder = document.getElementById('placeholder');
                
                outputCanvas.width = resultCanvas.width;
                outputCanvas.height = resultCanvas.height;
                outputCanvas.getContext('2d').drawImage(resultCanvas, 0, 0);
                
                placeholder.style.display = 'none';
                outputCanvas.style.display = 'block';
                document.getElementById('downloadBtn').disabled = false;
                document.getElementById('downloadWebpBtn').disabled = false;
                
                // Show processing time
                const elapsed = (performance.now() - startTime).toFixed(0);
                const timeDisplay = document.getElementById('processingTime');
                const timeValue = document.getElementById('timeValue');
                timeDisplay.style.display = 'block';
                timeValue.textContent = elapsed + 'ms';
                
            } catch (err) {
                console.error('Processing error:', err);
            }
            
            indicator.classList.remove('active');
        });
    }

    // ==================== UI SYNC ====================
    
    updateAllUIFromState() {
        const state = stateManager.getState();
        const s = state.settings;
        
        // Dithering
        document.getElementById('ditheringType').value = s.ditherType;
        document.getElementById('bayerSize').value = s.orderedMatrixSize;
        document.getElementById('bayerSizeValue').textContent = s.orderedMatrixSize;
        document.getElementById('ditheringStrength').value = s.ditherStrength;
        document.getElementById('ditheringStrengthValue').textContent = s.ditherStrength + '%';
        document.getElementById('bayerSizeGroup').style.display = s.ditherType === 'ordered' ? 'block' : 'none';
        document.getElementById('pixelScale').value = s.pixelScale * 10;
        document.getElementById('pixelScaleValue').textContent = s.pixelScale.toFixed(1) + 'x';
        
        // Posterization
        const posterizeToggle = document.getElementById('posterizeToggle');
        posterizeToggle.classList.toggle('active', s.posterizeEnabled);
        document.getElementById('posterizeLevels').value = s.posterizeLevels;
        document.getElementById('posterizeLevelsValue').textContent = s.posterizeLevels;
        document.getElementById('posterizeMode').value = s.posterizeMode;
        document.getElementById('posterizeLevelsGroup').style.display = s.posterizeEnabled ? 'block' : 'none';
        document.getElementById('posterizeModeGroup').style.display = s.posterizeEnabled ? 'block' : 'none';
        
        // Blob
        const blobToggle = document.getElementById('blobToggle');
        blobToggle.classList.toggle('active', s.blobEnabled);
        document.getElementById('blobCount').value = s.blobDensity;
        document.getElementById('blobCountValue').textContent = s.blobDensity;
        document.getElementById('blobMinSize').value = s.blobSizeMin;
        document.getElementById('blobMinSizeValue').textContent = s.blobSizeMin;
        document.getElementById('blobMaxSize').value = s.blobSizeMax;
        document.getElementById('blobMaxSizeValue').textContent = s.blobSizeMax;
        document.getElementById('blobOpacity').value = s.blobIntensity;
        document.getElementById('blobOpacityValue').textContent = s.blobIntensity + '%';
        document.getElementById('blobSoftness').value = s.blobSoftness;
        document.getElementById('blobSoftnessValue').textContent = s.blobSoftness + '%';
        document.getElementById('blobBlendMode').value = s.blobBlendMode;
        document.getElementById('blobControls').style.display = s.blobEnabled ? 'block' : 'none';
        
        // Noise
        const noiseToggle = document.getElementById('noiseToggle');
        noiseToggle.classList.toggle('active', s.noiseEnabled);
        document.getElementById('noiseAmount').value = s.noiseAmount;
        document.getElementById('noiseAmountValue').textContent = s.noiseAmount;
        document.getElementById('noiseAmountGroup').style.display = s.noiseEnabled ? 'block' : 'none';
        
        // Color palette
        this.renderColorPalette();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PicFixerApp();
});

export default PicFixerApp;
