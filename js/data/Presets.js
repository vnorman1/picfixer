/**
 * Presets - Designer-curated effect presets
 */

export const Presets = {
    noir: {
        name: 'Noir',
        colors: ['#0a0a0a', '#f5f5f5'],
        ditherType: 'floyd-steinberg',
        blobEnabled: true,
        blobIntensity: 20
    },
    terminal: {
        name: 'Terminal Green',
        colors: ['#0d1117', '#00ff41', '#004d14'],
        ditherType: 'ordered',
        blobEnabled: true,
        blobIntensity: 15
    },
    blueprint: {
        name: 'Blueprint',
        colors: ['#001830', '#0066cc', '#e6f2ff'],
        ditherType: 'atkinson',
        blobEnabled: true,
        blobIntensity: 25
    },
    sunset: {
        name: 'Sunset',
        colors: ['#1a0a1e', '#ff6b35', '#ffd93d'],
        ditherType: 'floyd-steinberg',
        blobEnabled: true,
        blobIntensity: 30
    },
    ocean: {
        name: 'Ocean Depth',
        colors: ['#0c1445', '#1e90ff', '#7fdbff'],
        ditherType: 'ordered',
        blobEnabled: true,
        blobIntensity: 35
    },
    forest: {
        name: 'Forest',
        colors: ['#0a1f0a', '#2d5a27', '#90c67c'],
        ditherType: 'atkinson',
        blobEnabled: true,
        blobIntensity: 25
    },
    retro: {
        name: 'Retro Mac',
        colors: ['#000000', '#ffffff'],
        ditherType: 'atkinson',
        blobEnabled: false,
        blobIntensity: 0
    },
    vaporwave: {
        name: 'Vaporwave',
        colors: ['#1a0a2e', '#ff71ce', '#01cdfe'],
        ditherType: 'floyd-steinberg',
        blobEnabled: true,
        blobIntensity: 40
    },
    'poster-warm': {
        name: 'Poster Warm',
        colors: ['#1a0f0a', '#8b4513', '#daa520', '#ffefd5'],
        ditherType: 'none',
        posterizeEnabled: true,
        posterizeLevels: 4,
        blobEnabled: false,
        blobIntensity: 0
    },
    'poster-cool': {
        name: 'Poster Cool',
        colors: ['#0a0a1a', '#1e3a5f', '#4a90d9', '#c5ddf8'],
        ditherType: 'none',
        posterizeEnabled: true,
        posterizeLevels: 4,
        blobEnabled: true,
        blobIntensity: 15
    },
    'pop-art': {
        name: 'Pop Art',
        colors: ['#000000', '#ff0066', '#ffcc00', '#00ccff'],
        ditherType: 'ordered',
        posterizeEnabled: true,
        posterizeLevels: 3,
        blobEnabled: true,
        blobIntensity: 25
    },
    cyberpunk: {
        name: 'Cyberpunk',
        colors: ['#0f0f23', '#ff00ff', '#00ffff', '#ffff00'],
        ditherType: 'ordered',
        posterizeEnabled: false,
        blobEnabled: true,
        blobIntensity: 35
    }
};

export default Presets;
