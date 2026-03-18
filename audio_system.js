// ============================================================================
// EMPIRE OF THE 13TH CENTURY - PURE JS SYNTH AUDIO SYSTEM (ZERO ASSETS)
// ============================================================================

class AudioManagerSystem {
    constructor() {
        this.ctx = null;
        this.masterMusicVolume = 0.15; // Kept lower so it doesn't overpower SFX
        this.masterSfxVolume = 0.5;
        this.initialized = false;
        
        // Sequencer state
        this.currentTrack = null;
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.currentStep = 0;
        this.timerID = null;
        this.activeOscillators = [];

        // --- MUSICAL SCALES (Offsets from root note) ---
        const SCALES = {
            majorPentatonic: [0, 2, 4, 7, 9, 12, 14], // Bright, Eastern (Hong, Xiaran)
            minorPentatonic: [0, 3, 5, 7, 10, 12, 15], // Nomadic, Gritty (Khaganate, Jinlord)
            harmonicMinor: [0, 2, 3, 5, 7, 8, 11, 12], // Middle Eastern (Iransar)
            hirajoshi: [0, 2, 3, 7, 8, 12, 14],        // Japanese (Yamato)
            dorian: [0, 2, 3, 5, 7, 9, 10, 12],        // Medieval European/Neutral
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7],       // Chaos/Bandits
            drone: [0, 7, 12, 0, 7, 12, 0]             // Static/Tension
        };

        // --- 20 PROCEDURAL MUSIC PROFILES ---
        this.tracks = {
            // Factions
            "Hong Dynasty":          { scale: SCALES.majorPentatonic, root: 60, tempo: 140, wave: 'triangle', pattern: [0,2,4,2, 5,4,2,-1] },
            "Shahdom of Iransar":    { scale: SCALES.harmonicMinor, root: 58, tempo: 110, wave: 'sine',     pattern: [0,1,2,1, 4,3,2,-1] },
            "Great Khaganate":       { scale: SCALES.minorPentatonic,root: 50, tempo: 160, wave: 'sawtooth', pattern: [0,0,3,0, 5,0,3,-1] }, // Throat singing vibe
            "Jinlord Confederacy":   { scale: SCALES.minorPentatonic,root: 55, tempo: 130, wave: 'square',   pattern: [0,-1,2,-1, 4,2,0,-1] },
            "Vietan Realm":          { scale: SCALES.majorPentatonic, root: 65, tempo: 120, wave: 'triangle', pattern: [0,3,5,6, 5,3,0,-1] }, // Bamboo xylophone vibe
            "Goryun Kingdom":        { scale: SCALES.dorian,          root: 57, tempo: 100, wave: 'square',   pattern: [0,2,4,2, 0,-1,-1,-1] },
            "Xiaran Dominion":       { scale: SCALES.majorPentatonic, root: 62, tempo: 150, wave: 'sine',     pattern: [4,3,2,0, 2,0,-1,-1] },
            "High Plateau Kingdoms": { scale: SCALES.majorPentatonic, root: 53, tempo: 90,  wave: 'triangle', pattern: [0,-1,2,-1, 4,-1,-1,-1] },
            "Yamato Clans":          { scale: SCALES.hirajoshi,       root: 60, tempo: 115, wave: 'square',   pattern: [0,1,3,4, 3,1,0,-1] },
        "Bandits": { 
    scale: SCALES.chromatic,       
    root: 55, 
    tempo: 220, 
    wave: 'sawtooth', 
    pattern: [
        0,3,1,7, 2,9,3,-1,
        11,4,6,8, 10,-1,7,5,
        12,10,8,6, 4,2,0,-1,
        3,6,9,12, 11,7,5,3,
        0,-1,12,7, 3,10,-1,6,
        8,5,2,9, 11,-1,4,1,
        13,11,9,7, 5,3,1,-1,
        0,4,8,12, 7,3,-1,10
    ] 
}, // Hyper-chaotic, dense, aggressive   "Independent":           { scale: SCALES.dorian,          root: 60, tempo: 100, wave: 'triangle', pattern: [0,2,4,-1, 4,2,0,-1] },
            
            // General Game States
            "MainMenu":              { scale: SCALES.dorian,          root: 55, tempo: 110, wave: 'square',   pattern: [0,4,7,4, 0,7,12,-1] }, // Epic build
            "WorldMap_Calm": {
    scale: SCALES.dorian,
    root: 60,
    tempo: 108, // faster, removes sluggish feel
    wave: 'triangle', // softer than sine for GBA vibe
    pattern: [

        // Phrase A – flowing intro
        0,2,4,5, 4,2,0,-1,
        2,4,5,7, 5,4,2,-1,

        // Phrase B – gentle rise
        4,5,7,9, 7,5,4,-1,
        5,7,9,10, 9,7,5,-1,

        // Phrase C – melodic loop (signature)
        7,5,4,2, 4,5,7,-1,
        9,7,5,4, 5,4,2,-1,

        // Phrase D – variation (GBA-style emotional shift)
        0,2,4,7, 5,4,2,-1,
        4,5,7,9, 7,5,4,-1,

        // Phrase E – descending calm resolution
        9,7,5,4, 2,0,-2,-1,
        0,2,4,5, 4,2,0,-1,

        // Phrase F – loop bridge (prevents repetition fatigue)
        2,4,5,7, 9,7,5,-1,
        7,5,4,2, 0,-1,-2,-1,

        // Phrase G – callback to intro
        0,2,4,5, 4,2,0,-1,
        2,4,5,7, 5,4,2,-1
    ]
},
        "WorldMap_Tension": { 
    scale: SCALES.drone,
    root: 48,
    tempo: 140,
    wave: 'sawtooth',
    pattern: [
        0,-1,1,-1, 0,-1,-1,-1,
        0,1,0,-1, 2,-1,1,-1,

        0,-1,1,2, 1,-1,0,-1,
        -1,-1,0,1, 0,-1,-1,-1,

        0,1,2,1, 0,-1,1,-1,
        2,-1,3,-1, 2,1,0,-1,

        0,-1,1,-1, 2,-1,1,-1,
        0,-1,-2,-1, -1,-1,0,-1,

        0,1,0,1, 2,1,0,-1,
        1,-1,2,-1, 3,-1,2,-1,

        0,-1,1,2, 3,-1,2,-1,
        1,-1,0,-1, -1,-1,-2,-1,

        0,1,2,3, 2,1,0,-1,
        1,-1,0,-1, 0,-1,-1,-1
    ]
},

    "Battle_Skirmish": {
    scale: SCALES.minorPentatonic,
    root: 58,
    tempo: 168,
    wave: 'square',
    pattern: [

        // Phrase A – core motif
        0,2,4,2, 0,2,4,7,
        4,2,0,2, 4,7,4,2,

        // Phrase B – response (higher energy)
        4,7,9,7, 4,7,9,12,
        9,7,4,7, 9,7,4,2,

        // Phrase C – descending pressure
        7,5,4,2, 4,5,7,9,
        7,5,4,2, 0,2,4,2,

        // Phrase D – quick run + turnaround
        0,2,4,5, 7,9,7,5,
        4,2,0,2, 4,2,0,-1,

        // Phrase E – variation loop
        2,4,7,4, 2,4,7,9,
        7,4,2,4, 7,9,7,4,

        // Phrase F – tension build
        4,7,9,10, 12,10,9,7,
        9,7,5,4, 2,0,2,-1,

        // Phrase G – callback
        0,2,4,2, 0,2,4,7,
        4,2,0,2, 4,2,0,-1
    ]
},

   "Battle_Massive": {
    scale: SCALES.harmonicMinor,
    root: 50,
    tempo: 148,
    wave: 'sawtooth',
    pattern: [

        // Phrase A – marching core
        0,0,3,5, 7,5,3,0,
        0,3,5,7, 8,7,5,3,

        // Phrase B – rising tension
        3,5,7,8, 10,8,7,5,
        7,8,10,12, 10,8,7,5,

        // Phrase C – heavy descent
        12,10,8,7, 5,3,2,0,
        3,5,7,5, 3,2,0,-1,

        // Phrase D – dramatic push
        0,3,7,10, 8,7,5,3,
        5,7,8,10, 12,10,8,7,

        // Phrase E – warlike repetition
        7,7,8,10, 12,10,8,7,
        5,5,7,8, 10,8,7,5,

        // Phrase F – tension spike
        8,10,12,13, 15,13,12,10,
        12,10,8,7, 5,3,2,-1,

        // Phrase G – final resolve loop
        0,3,5,7, 8,7,5,3,
        5,3,2,0, 0,-1,0,-1
    ]
},       

	"Battle_Gunpowder": {
    scale: SCALES.chromatic,
    root: 45,
    tempo: 208,
    wave: 'square',
    pattern: [

        // Phrase A – frantic ignition (tight chromatic flicker)
        0,1,0,2, 1,3,2,4,
        3,5,4,3, 2,1,0,-1,

        // Phrase B – rising instability
        0,2,3,5, 6,5,7,8,
        7,6,5,3, 2,1,0,-1,

        // Phrase C – chaotic zig-zag
        4,2,5,3, 6,4,7,5,
        8,6,9,7, 6,5,3,2,

        // Phrase D – rapid climb burst
        0,1,2,3, 4,5,6,7,
        8,9,10,9, 8,7,6,5,

        // Phrase E – collapsing panic
        10,8,9,7, 8,6,7,5,
        6,4,5,3, 4,2,3,1,

        // Phrase F – unstable loop (signature chaos motif)
        0,3,1,4, 2,5,3,6,
        4,7,5,8, 6,5,4,2,

        // Phrase G – tension spike (high register)
        7,9,10,12, 11,13,12,11,
        10,9,8,7, 6,5,4,3,

        // Phrase H – stutter panic callback
        0,1,0,1, 2,1,2,3,
        1,0,1,2, 0,-1,0,-1,

        // Phrase I – final unstable descent (loop reset)
        5,4,3,2, 3,2,1,0,
        2,1,0,-2, -1,0,-1,-1
    ]
},      

	"City_Ambient": {
    scale: SCALES.majorPentatonic,
    root: 64,
    tempo: 112,
    wave: 'triangle',
    pattern: [

        // Phrase A – gentle intro (establish mood)
        0,2,4,2, 0,2,4,7,
        4,2,0,-1, 2,4,2,-1,

        // Phrase B – upward life (people movement feel)
        2,4,7,9, 7,4,2,-1,
        4,7,9,11, 9,7,4,-1,

        // Phrase C – calm response (lower register)
        0,-1,2,4, 2,0,-1,-1,
        0,2,4,2, 0,-1,0,-1,

        // Phrase D – melodic sparkle (city energy)
        7,9,11,9, 7,9,7,4,
        9,11,12,11, 9,7,4,-1,

        // Phrase E – flowing walk cycle feel
        0,2,4,7, 4,2,0,-1,
        2,4,7,9, 7,4,2,-1,

        // Phrase F – variation (keeps loop fresh)
        4,2,0,2, 4,7,4,2,
        7,9,7,4, 2,0,-1,-1,

        // Phrase G – higher “busy street” layer feel
        9,11,12,11, 9,7,9,11,
        12,14,12,11, 9,7,4,-1,

        // Phrase H – soft resolution
        7,4,2,0, 2,4,2,0,
        0,-1,0,-1, -2,-1,0,-1,

        // Phrase I – loop bridge (prevents obvious repetition)
        2,4,7,4, 2,4,7,9,
        7,4,2,-1, 0,2,0,-1,

        // Phrase J – callback to intro (smooth loop reset)
        0,2,4,2, 0,2,4,7,
        4,2,0,-1, 0,-1,0,-1
    ]
}, 


      "Victory":               { scale: SCALES.majorPentatonic, root: 60, tempo: 120, wave: 'square',   pattern: [0,2,4,7, 9,-1,-1,-1] },
            "Defeat":                { scale: SCALES.harmonicMinor,   root: 55, tempo: 60,  wave: 'sawtooth', pattern: [4,3,2,0, -1,-1,-1,-1] },
			
			// --- ADD THESE BELOW "Defeat" INSIDE this.tracks ---
            
            "gold_buy":         { scale: SCALES.majorPentatonic, root: 72, tempo: 200, wave: 'sine',     pattern: [0, 2, 4, 7, -1, -1, -1, -1] },
            "error":            { scale: SCALES.harmonicMinor,   root: 40, tempo: 180, wave: 'sawtooth', pattern: [1, 0, 1, 0, -1, -1, -1, -1] },
            "ui_click":         { scale: SCALES.majorPentatonic, root: 80, tempo: 240, wave: 'sine',     pattern: [0, -1, -1, -1, -1, -1, -1, -1] },
            
            // Additional Common Game Effects as Tracks
            "Level_Up":         { scale: SCALES.majorPentatonic, root: 60, tempo: 160, wave: 'square',   pattern: [0, 2, 4, 7, 12, 7, 12, -1] },
            "Quest_Complete":   { scale: SCALES.dorian,          root: 62, tempo: 130, wave: 'triangle', pattern: [0, 4, 2, 5, 7, -1, -1, -1] },
            "Discovery":        { scale: SCALES.majorPentatonic, root: 67, tempo: 90,  wave: 'sine',     pattern: [0, 7, 12, 14, -1, -1, -1, -1] },
            "Danger_Nearby":    { scale: SCALES.drone,           root: 45, tempo: 140, wave: 'sawtooth', pattern: [0, 1, 0, 1, 0, 1, -1, -1] },
            "Item_Pickup":      { scale: SCALES.majorPentatonic, root: 75, tempo: 200, wave: 'sine',     pattern: [0, 4, 7, -1, -1, -1, -1, -1] },
            "Resting_Theme":    { scale: SCALES.majorPentatonic, root: 55, tempo: 60,  wave: 'triangle', pattern: [0, -1, 4, -1, 2, -1, 0, -1] },
            "Infiltration":     { scale: SCALES.minorPentatonic, root: 50, tempo: 110, wave: 'square',   pattern: [0, -1, 3, -1, 0, -1, 2, -1] },
            "Trade_Menu":       { scale: SCALES.majorPentatonic, root: 65, tempo: 100, wave: 'sine',     pattern: [0, 2, 0, 4, 2, 0, -1, -1] },
            "Ambush":           { scale: SCALES.chromatic,       root: 52, tempo: 190, wave: 'sawtooth', pattern: [0, 1, 2, 1, 0, 1, 2, -1] },
            "Tavern_Jingle":    { scale: SCALES.dorian,          root: 58, tempo: 140, wave: 'triangle', pattern: [0, 2, 4, 0, 5, 4, 2, 0] }
			
        };
    }

    init() {
        if (this.initialized) return;
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.initialized = true;
        console.log("Procedural Audio System Initialized");
    }

    // ========================================================================
    // MUSIC GENERATOR (THE MINI-SEQUENCER)
    // ========================================================================
    
    // Convert MIDI note to Frequency
    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    playMusic(trackName) {
        if (!this.initialized || !this.tracks[trackName] || this.currentTrack === trackName) return;
        
        this.stopMusic();
        this.currentTrack = trackName;
        this.isPlaying = true;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        
        this.scheduler();
    }

    stopMusic() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
        this.activeOscillators.forEach(osc => {
            try { osc.stop(); } catch(e){}
        });
        this.activeOscillators = [];
        this.currentTrack = null;
    }

    scheduler() {
        // Schedule notes slightly ahead of time for perfect rhythm
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this.playNextNote();
        }
        if (this.isPlaying) {
            this.timerID = setTimeout(() => this.scheduler(), 25);
        }
    }

playNextNote() {
    const track = this.tracks[this.currentTrack];
    const secondsPerBeat = 60.0 / track.tempo;
    
    const noteIndex = track.pattern[this.currentStep];
    
    if (noteIndex !== -1 && noteIndex !== undefined) {
        // SURGERY: We use a "Double Modulo" to ensure negative pattern numbers 
        // still point to a valid index in the scale array.
        const scaleLen = track.scale.length;
        const safeIndex = ((noteIndex % scaleLen) + scaleLen) % scaleLen;
        
        const midiNote = track.root + track.scale[safeIndex];
        const freq = this.midiToFreq(midiNote);
        
        // Final safety check: ensure freq is a real number
        if (isFinite(freq)) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = track.wave;
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, this.nextNoteTime);
            gain.gain.linearRampToValueAtTime(this.masterMusicVolume, this.nextNoteTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, this.nextNoteTime + secondsPerBeat - 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(this.nextNoteTime);
            osc.stop(this.nextNoteTime + secondsPerBeat);
            
            this.activeOscillators.push(osc);
            setTimeout(() => {
                this.activeOscillators = this.activeOscillators.filter(o => o !== osc);
            }, secondsPerBeat * 1000 + 100);
        }
    }

    this.nextNoteTime += secondsPerBeat;
    this.currentStep++;
    if (this.currentStep >= track.pattern.length) {
        this.currentStep = 0; 
    }
}

    // ========================================================================
    // PROCEDURAL SOUND EFFECTS (10 EFFECTS)
    // ========================================================================
    
    playSound(effect) {
        if (!this.initialized || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;

        switch(effect) {
            case 'sword_clash':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gain.gain.setValueAtTime(this.masterSfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
                break;
                
            case 'firelance': // Short burst of noise/square
                this._createNoise(now, 0.3, 'lowpass', 1000);
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
                gain.gain.setValueAtTime(this.masterSfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
                break;

            case 'bomb': // Deep sub drop
                this._createNoise(now, 1.0, 'lowpass', 400);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(80, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 1.0);
                gain.gain.setValueAtTime(this.masterSfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
                osc.start(now); osc.stop(now + 1.0);
                break;

            case 'arrow': // High pitched swoosh
                this._createNoise(now, 0.2, 'bandpass', 2500);
                break;

            case 'shield_block': // Dull thud
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(this.masterSfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
                break;

            case 'horse_trot': // Rhythmic clop
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
                gain.gain.setValueAtTime(this.masterSfxVolume * 0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now); osc.stop(now + 0.05);
                break;

            case 'elephant': // Trumpet synth
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(500, now + 0.2);
                osc.frequency.linearRampToValueAtTime(250, now + 0.7);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(this.masterSfxVolume, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
                osc.start(now); osc.stop(now + 0.7);
                break;

            case 'charge': // Simulated shout (mid-low bandpass noise)
                this._createNoise(now, 0.5, 'bandpass', 600);
                break;

            case 'hit': // Flesh impact
                this._createNoise(now, 0.1, 'lowpass', 800);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(100, now);
                gain.gain.setValueAtTime(this.masterSfxVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
                break;

            case 'ui_click': // UI feedback
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(this.masterSfxVolume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now); osc.stop(now + 0.05);
                break;
        }
    }

    // Helper for complex noise (gunpowder, explosions)
    _createNoise(time, duration, filterType, freq) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = freq;
        const gain = this.ctx.createGain();
        
        gain.gain.setValueAtTime(this.masterSfxVolume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(time);
    }
}

// Global instance to be used across all your files
const AudioManager = new AudioManagerSystem();