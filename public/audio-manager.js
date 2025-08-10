class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.currentMusic = null;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.isInitialized = false;
        
        // Audio buffers for sound effects
        this.soundBuffers = new Map();
        
        // Initialize on first user interaction
        this.initPromise = null;
    }

    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._initialize();
        return this.initPromise;
    }

    async _initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes for volume control
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            
            // Connect gain nodes
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            // Set initial volumes
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.audioContext.currentTime);
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.audioContext.currentTime);
            
            // Generate sound effects
            await this.generateSoundEffects();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.warn('🔇 Audio initialization failed:', error);
        }
    }

    async generateSoundEffects() {
        // Generate various sound effects using Web Audio API
        const sounds = {
            peashooter: () => this.generatePeaShot(),
            snowPea: () => this.generateSnowPeaShot(),
            cactus: () => this.generateCactusShot(),
            mushroom: () => this.generateMushroomPuff(),
            plantPlace: () => this.generatePlantPlace(),
            zombieHit: () => this.generateZombieHit(),
            zombieGroan: () => this.generateZombieGroan(),
            sunCollect: () => this.generateSunCollect(),
            explosion: () => this.generateExplosion(),
            lawnMower: () => this.generateLawnMower()
        };

        for (const [name, generator] of Object.entries(sounds)) {
            try {
                const buffer = await generator();
                this.soundBuffers.set(name, buffer);
            } catch (error) {
                console.warn(`Failed to generate ${name} sound:`, error);
            }
        }
    }

    async generatePeaShot() {
        const duration = 0.15;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Sharp pop sound with quick decay
            const envelope = Math.exp(-t * 20);
            const noise = (Math.random() - 0.5) * 0.3;
            const tone = Math.sin(2 * Math.PI * 800 * t) * 0.4;
            data[i] = (tone + noise) * envelope;
        }

        return buffer;
    }

    async generateSnowPeaShot() {
        const duration = 0.2;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Crystalline, icy sound
            const envelope = Math.exp(-t * 15);
            const tone1 = Math.sin(2 * Math.PI * 600 * t) * 0.3;
            const tone2 = Math.sin(2 * Math.PI * 1200 * t) * 0.2;
            const shimmer = Math.sin(2 * Math.PI * 2400 * t) * 0.1 * Math.sin(t * 30);
            data[i] = (tone1 + tone2 + shimmer) * envelope;
        }

        return buffer;
    }

    async generateCactusShot() {
        const duration = 0.12;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Sharp, piercing sound
            const envelope = Math.exp(-t * 25);
            const tone = Math.sin(2 * Math.PI * 1000 * t) * 0.5;
            const click = Math.sin(2 * Math.PI * 3000 * t) * 0.2 * (t < 0.02 ? 1 : 0);
            data[i] = (tone + click) * envelope;
        }

        return buffer;
    }

    async generateMushroomPuff() {
        const duration = 0.25;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Soft puff sound
            const envelope = Math.exp(-t * 8);
            const noise = (Math.random() - 0.5) * 0.4;
            const lowTone = Math.sin(2 * Math.PI * 200 * t) * 0.2;
            data[i] = (noise + lowTone) * envelope;
        }

        return buffer;
    }

    async generatePlantPlace() {
        const duration = 0.3;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Pleasant planting sound
            const envelope = Math.exp(-t * 5);
            const tone1 = Math.sin(2 * Math.PI * 440 * t) * 0.3;
            const tone2 = Math.sin(2 * Math.PI * 660 * t) * 0.2;
            data[i] = (tone1 + tone2) * envelope;
        }

        return buffer;
    }

    async generateSunCollect() {
        const duration = 0.4;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Bright, cheerful collection sound
            const envelope = Math.exp(-t * 3);
            const tone1 = Math.sin(2 * Math.PI * 523 * t) * 0.3; // C5
            const tone2 = Math.sin(2 * Math.PI * 659 * t) * 0.2; // E5
            const tone3 = Math.sin(2 * Math.PI * 784 * t) * 0.1; // G5
            data[i] = (tone1 + tone2 + tone3) * envelope;
        }

        return buffer;
    }

    async generateZombieHit() {
        const duration = 0.2;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Impact sound
            const envelope = Math.exp(-t * 12);
            const noise = (Math.random() - 0.5) * 0.6;
            const thud = Math.sin(2 * Math.PI * 80 * t) * 0.4;
            data[i] = (noise + thud) * envelope;
        }

        return buffer;
    }

    async generateExplosion() {
        const duration = 0.8;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Big explosion sound
            const envelope = Math.exp(-t * 3);
            const noise = (Math.random() - 0.5) * 0.8;
            const rumble = Math.sin(2 * Math.PI * 60 * t) * 0.5;
            data[i] = (noise + rumble) * envelope;
        }

        return buffer;
    }

    async generateZombieGroan() {
        const sampleRate = this.audioContext.sampleRate;
        const duration = 1.2;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 2) * (1 - Math.exp(-t * 10));
            
            // Low frequency groan with harmonics
            const fundamental = Math.sin(t * 80 * Math.PI * 2);
            const harmonic1 = Math.sin(t * 120 * Math.PI * 2) * 0.5;
            const harmonic2 = Math.sin(t * 160 * Math.PI * 2) * 0.3;
            const noise = (Math.random() * 2 - 1) * 0.1;
            
            data[i] = (fundamental + harmonic1 + harmonic2 + noise) * envelope * 0.4;
        }

        return buffer;
    }

    async generateLawnMower() {
        const sampleRate = this.audioContext.sampleRate;
        const duration = 2.0;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.min(1, t * 5) * Math.max(0, 1 - (t - 1.5) * 2);
            
            // Engine sound with varying RPM
            const rpm = 1200 + Math.sin(t * 3) * 200;
            const engine = Math.sin(t * rpm * Math.PI * 2 / 60);
            const engine2 = Math.sin(t * rpm * Math.PI * 4 / 60) * 0.3;
            const noise = (Math.random() * 2 - 1) * 0.2;
            
            data[i] = (engine + engine2 + noise) * envelope * 0.5;
        }

        return buffer;
    }

    playSound(soundName, volume = 1.0) {
        if (!this.isInitialized || !this.soundBuffers.has(soundName)) {
            return;
        }

        try {
            const buffer = this.soundBuffers.get(soundName);
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            source.start();

        } catch (error) {
            console.warn(`Failed to play sound ${soundName}:`, error);
        }
    }

    async startBackgroundMusic() {
        if (!this.isInitialized) return;

        try {
            // Generate procedural background music
            await this.generateBackgroundMusic();
        } catch (error) {
            console.warn('Failed to start background music:', error);
        }
    }

    async generateBackgroundMusic() {
        // Create a simple, pleasant background loop
        const duration = 16; // 16 second loop
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);
        
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);

        // Simple chord progression: C - Am - F - G
        const chords = [
            [261.63, 329.63, 392.00], // C major
            [220.00, 261.63, 329.63], // A minor
            [174.61, 220.00, 261.63], // F major
            [196.00, 246.94, 293.66]  // G major
        ];

        for (let i = 0; i < leftChannel.length; i++) {
            const t = i / sampleRate;
            const chordIndex = Math.floor((t % duration) / 4); // 4 seconds per chord
            const chord = chords[chordIndex];
            
            let sample = 0;
            chord.forEach((freq, index) => {
                const volume = 0.1 / (index + 1); // Decreasing volume for harmony
                sample += Math.sin(2 * Math.PI * freq * t) * volume;
            });
            
            // Add some gentle variation
            const envelope = 0.8 + 0.2 * Math.sin(t * 0.5);
            sample *= envelope;
            
            leftChannel[i] = sample;
            rightChannel[i] = sample * 0.9; // Slight stereo effect
        }

        // Play the music loop
        this.playMusicLoop(buffer);
    }

    playMusicLoop(buffer) {
        if (this.currentMusic) {
            this.currentMusic.stop();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(this.musicGain);
        source.start();
        
        this.currentMusic = source;
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = null;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.audioContext.currentTime);
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.audioContext.currentTime);
        }
    }

    // Resume audio context (required for some browsers)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}

// Create global audio manager instance
window.audioManager = new AudioManager();
