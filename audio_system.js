// ============================================================================
// EMPIRE OF THE 13TH CENTURY - PURE JS SYNTH AUDIO SYSTEM (ZERO ASSETS) + MP3
// ============================================================================

class AudioManagerSystem {
    constructor() {
        this.ctx = null;
        this.masterMusicVolume = 0.15; // Kept lower so it doesn't overpower SFX
        this.masterSfxVolume = 0.5;
        this.initialized = false;
        
        // MP3 state
        this.currentMp3 = null;
        this.mp3Volume = 0.2; // Default volume for MP3 tracks
        this.fadeInterval = null; // Used for smooth transitions
        
        // Playlist state
        this.currentPlaylist = [];
        this.isPlaylistMode = false;
        this.mp3Volume = 0.2; // Default volume for MP3 tracks
this.fadeInterval = null; // Used for smooth transitions
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

        // --- PROCEDURAL MUSIC PROFILES ---
        this.tracks = {
            // Factions
            "Hong Dynasty":          { scale: SCALES.majorPentatonic, root: 60, tempo: 140, wave: 'triangle', pattern: [0,2,4,2, 5,4,2,-1] },
            "Shahdom of Iransar":    { scale: SCALES.harmonicMinor, root: 58, tempo: 110, wave: 'sine',     pattern: [0,1,2,1, 4,3,2,-1] },
            "Great Khaganate":       { scale: SCALES.minorPentatonic,root: 50, tempo: 160, wave: 'sawtooth', pattern: [0,0,3,0, 5,0,3,-1] }, 
            "Jinlord Confederacy":   { scale: SCALES.minorPentatonic,root: 55, tempo: 130, wave: 'square',   pattern: [0,-1,2,-1, 4,2,0,-1] },
            "Vietan Realm":          { scale: SCALES.majorPentatonic, root: 65, tempo: 120, wave: 'triangle', pattern: [0,3,5,6, 5,3,0,-1] }, 
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
            }, 
            "Independent":           { scale: SCALES.dorian,          root: 60, tempo: 100, wave: 'triangle', pattern: [0,2,4,-1, 4,2,0,-1] },
            
            // General Game States
            "MainMenu":              { scale: SCALES.dorian,          root: 55, tempo: 110, wave: 'square',   pattern: [0,4,7,4, 0,7,12,-1] },
            "WorldMap_Calm":         { scale: SCALES.dorian,          root: 60, tempo: 108, wave: 'triangle', pattern: [0,2,4,5, 4,2,0,-1, 2,4,5,7, 5,4,2,-1, 4,5,7,9, 7,5,4,-1, 5,7,9,10, 9,7,5,-1, 7,5,4,2, 4,5,7,-1, 9,7,5,4, 5,4,2,-1, 0,2,4,7, 5,4,2,-1, 4,5,7,9, 7,5,4,-1, 9,7,5,4, 2,0,-2,-1, 0,2,4,5, 4,2,0,-1, 2,4,5,7, 9,7,5,-1, 7,5,4,2, 0,-1,-2,-1, 0,2,4,5, 4,2,0,-1, 2,4,5,7, 5,4,2,-1] },
            "WorldMap_Tension":      { scale: SCALES.drone,           root: 48, tempo: 140, wave: 'sawtooth', pattern: [0,-1,1,-1, 0,-1,-1,-1, 0,1,0,-1, 2,-1,1,-1, 0,-1,1,2, 1,-1,0,-1, -1,-1,0,1, 0,-1,-1,-1, 0,1,2,1, 0,-1,1,-1, 2,-1,3,-1, 2,1,0,-1, 0,-1,1,-1, 2,-1,1,-1, 0,-1,-2,-1, -1,-1,0,-1, 0,1,0,1, 2,1,0,-1, 1,-1,2,-1, 3,-1,2,-1, 0,-1,1,2, 3,-1,2,-1, 1,-1,0,-1, -1,-1,-2,-1, 0,1,2,3, 2,1,0,-1, 1,-1,0,-1, 0,-1,-1,-1] },
            "Battle_Skirmish":       { scale: SCALES.minorPentatonic, root: 58, tempo: 168, wave: 'square',   pattern: [0,2,4,2, 0,2,4,7, 4,2,0,2, 4,7,4,2, 4,7,9,7, 4,7,9,12, 9,7,4,7, 9,7,4,2, 7,5,4,2, 4,5,7,9, 7,5,4,2, 0,2,4,2, 0,2,4,5, 7,9,7,5, 4,2,0,2, 4,2,0,-1, 2,4,7,4, 2,4,7,9, 7,4,2,4, 7,9,7,4, 4,7,9,10, 12,10,9,7, 9,7,5,4, 2,0,2,-1, 0,2,4,2, 0,2,4,7, 4,2,0,2, 4,2,0,-1] },
            "Battle_Massive":        { scale: SCALES.harmonicMinor,   root: 50, tempo: 148, wave: 'sawtooth', pattern: [0,0,3,5, 7,5,3,0, 0,3,5,7, 8,7,5,3, 3,5,7,8, 10,8,7,5, 7,8,10,12, 10,8,7,5, 12,10,8,7, 5,3,2,0, 3,5,7,5, 3,2,0,-1, 0,3,7,10, 8,7,5,3, 5,7,8,10, 12,10,8,7, 7,7,8,10, 12,10,8,7, 5,5,7,8, 10,8,7,5, 8,10,12,13, 15,13,12,10, 12,10,8,7, 5,3,2,-1, 0,3,5,7, 8,7,5,3, 5,3,2,0, 0,-1,0,-1] },        
            "Battle_Gunpowder":      { scale: SCALES.chromatic,       root: 45, tempo: 208, wave: 'square',   pattern: [0,1,0,2, 1,3,2,4, 3,5,4,3, 2,1,0,-1, 0,2,3,5, 6,5,7,8, 7,6,5,3, 2,1,0,-1, 4,2,5,3, 6,4,7,5, 8,6,9,7, 6,5,3,2, 0,1,2,3, 4,5,6,7, 8,9,10,9, 8,7,6,5, 10,8,9,7, 8,6,7,5, 6,4,5,3, 4,2,3,1, 0,3,1,4, 2,5,3,6, 4,7,5,8, 6,5,4,2, 7,9,10,12, 11,13,12,11, 10,9,8,7, 6,5,4,3, 0,1,0,1, 2,1,2,3, 1,0,1,2, 0,-1,0,-1, 5,4,3,2, 3,2,1,0, 2,1,0,-2, -1,0,-1,-1] },      
            "City_Ambient":          { scale: SCALES.majorPentatonic, root: 64, tempo: 112, wave: 'triangle', pattern: [0,2,4,2, 0,2,4,7, 4,2,0,-1, 2,4,2,-1, 2,4,7,9, 7,4,2,-1, 4,7,9,11, 9,7,4,-1, 0,-1,2,4, 2,0,-1,-1, 0,2,4,2, 0,-1,0,-1, 7,9,11,9, 7,9,7,4, 9,11,12,11, 9,7,4,-1, 0,2,4,7, 4,2,0,-1, 2,4,7,9, 7,4,2,-1, 4,2,0,2, 4,7,4,2, 7,9,7,4, 2,0,-1,-1, 9,11,12,11, 9,7,9,11, 12,14,12,11, 9,7,4,-1, 7,4,2,0, 2,4,2,0, 0,-1,0,-1, -2,-1,0,-1, 2,4,7,4, 2,4,7,9, 7,4,2,-1, 0,2,0,-1, 0,2,4,2, 0,2,4,7, 4,2,0,-1, 0,-1,0,-1] }, 
            "Victory":               { scale: SCALES.majorPentatonic, root: 60, tempo: 120, wave: 'square',   pattern: [0,2,4,7, 9,-1,-1,-1] },
            "Defeat":                { scale: SCALES.harmonicMinor,   root: 55, tempo: 60,  wave: 'sawtooth', pattern: [4,3,2,0, -1,-1,-1,-1] },
            
            "gold_buy":              { scale: SCALES.majorPentatonic, root: 72, tempo: 200, wave: 'sine',     pattern: [0, 2, 4, 7, -1, -1, -1, -1] },
            "error":                 { scale: SCALES.harmonicMinor,   root: 40, tempo: 180, wave: 'sawtooth', pattern: [1, 0, 1, 0, -1, -1, -1, -1] },
            "ui_click":              { scale: SCALES.majorPentatonic, root: 80, tempo: 240, wave: 'sine',     pattern: [0, -1, -1, -1, -1, -1, -1, -1] },
            
            "Level_Up":              { scale: SCALES.majorPentatonic, root: 60, tempo: 160, wave: 'square',   pattern: [0, 2, 4, 7, 12, 7, 12, -1] },
            "Quest_Complete":        { scale: SCALES.dorian,          root: 62, tempo: 130, wave: 'triangle', pattern: [0, 4, 2, 5, 7, -1, -1, -1] },
            "Discovery":             { scale: SCALES.majorPentatonic, root: 67, tempo: 90,  wave: 'sine',     pattern: [0, 7, 12, 14, -1, -1, -1, -1] },
            "Danger_Nearby":         { scale: SCALES.drone,           root: 45, tempo: 140, wave: 'sawtooth', pattern: [0, 1, 0, 1, 0, 1, -1, -1] },
            "Item_Pickup":           { scale: SCALES.majorPentatonic, root: 75, tempo: 200, wave: 'sine',     pattern: [0, 4, 7, -1, -1, -1, -1, -1] },
            "Resting_Theme":         { scale: SCALES.majorPentatonic, root: 55, tempo: 60,  wave: 'triangle', pattern: [0, -1, 4, -1, 2, -1, 0, -1] },
            "Infiltration":          { scale: SCALES.minorPentatonic, root: 50, tempo: 110, wave: 'square',   pattern: [0, -1, 3, -1, 0, -1, 2, -1] },
            "Trade_Menu":            { scale: SCALES.majorPentatonic, root: 65, tempo: 100, wave: 'sine',     pattern: [0, 2, 0, 4, 2, 0, -1, -1] },
            "Ambush":                { scale: SCALES.chromatic,       root: 52, tempo: 190, wave: 'sawtooth', pattern: [0, 1, 2, 1, 0, 1, 2, -1] },
            "Tavern_Jingle":         { scale: SCALES.dorian,          root: 58, tempo: 140, wave: 'triangle', pattern: [0, 2, 4, 0, 5, 4, 2, 0] }
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
    // MP3 MUSIC PLAYER
    // ========================================================================
    
    playMP3(url, loop = true) {
        // Stop any playing synth music so they don't clash
        this.stopMusic();
        
        // Stop any MP3 that is already playing
        this.stopMP3();
        
        this.isPlaylistMode = false;
        this.currentTrack = url; 
        
        this.currentMp3 = new Audio(url);
        this.currentMp3.volume = 0; // Start at 0 for fade in
        this.currentMp3.loop = loop;
        
        this.currentMp3.play().then(() => {
            this._fadeMP3(this.currentMp3, this.mp3Volume, 1000); // 1 sec fade in
        }).catch(err => {
            console.warn("Browser blocked audio playback or file not found:", err);
        });
        
        console.log("Playing MP3:", url);
    }
    
    // --- NEW: Playlist Function ---
    // Usage: AudioManager.playRandomMP3List(['music/track1.mp3', 'music/track2.mp3', 'music/track3.mp3']);
    playRandomMP3List(trackArray) {
        if (!trackArray || trackArray.length === 0) return;
        
        // Use a generic ID for the current track so the `update()` loop doesn't restart it
        if (this.currentTrack === "PLAYLIST_MODE") return; 
        
        this.stopMusic();
        this.stopMP3();
        
        this.isPlaylistMode = true;
        this.currentPlaylist = trackArray;
        this.currentTrack = "PLAYLIST_MODE";
        
        this._playNextInList();
    }
    
_playNextInList(previousTrack = null) {
    if (!this.isPlaylistMode || this.currentPlaylist.length === 0) return;

    // Pick a random track that isn't the one that just played
    let nextTrack;
    if (this.currentPlaylist.length > 1) {
        do {
            nextTrack = this.currentPlaylist[Math.floor(Math.random() * this.currentPlaylist.length)];
        } while (nextTrack === previousTrack);
    } else {
        nextTrack = this.currentPlaylist[0];
    }

    console.log("Playlist playing:", nextTrack);

    const currentAudio = new Audio(nextTrack);
    this.currentMp3 = currentAudio;
    currentAudio.volume = 0;
    currentAudio.loop = false;

    currentAudio.play().then(() => {
        this._fadeMP3(currentAudio, this.mp3Volume, 2000);
    }).catch(err => {
        console.warn("Playlist error:", err);
        if (this.isPlaylistMode) {
            this.playlistTimeout = setTimeout(() => this._playNextInList(previousTrack), 2000);
        }
        return;
    });

    const MIN_PLAY_MS = 120000; // 1 minute minimum before switching
    const startedAt = Date.now();
    let advanced = false;

    const advanceToNext = () => {
        if (advanced || !this.isPlaylistMode) return;
        advanced = true;

        if (this.playlistTimeout) {
            clearTimeout(this.playlistTimeout);
            this.playlistTimeout = null;
        }

        const fadingTrack = currentAudio;
        this._fadeMP3(fadingTrack, 0, 1900, () => {
            fadingTrack.pause();
            if (this.currentMp3 === fadingTrack) this.currentMp3 = null;
        });

        this.playlistTimeout = setTimeout(() => {
            if (this.isPlaylistMode) this._playNextInList(nextTrack);
        }, 2000);
    };

    this.playlistTimeout = setTimeout(advanceToNext, MIN_PLAY_MS);

    currentAudio.addEventListener('ended', () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= MIN_PLAY_MS) {
            advanceToNext();
        }
        // If it ends before 1 minute, do nothing.
        // The timeout above will handle the next switch.
    }, { once: true });
}
    
    // Internal helper to handle smooth volume fading
    _fadeMP3(audioObj, targetVolume, duration, callback = null) {
        if (!audioObj) return;
        
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        
        let steps = 20; // Update volume 20 times over the duration
        let timeStep = duration / steps;
        let volumeStep = (targetVolume - audioObj.volume) / steps;
        
        this.fadeInterval = setInterval(() => {
            if (!audioObj) {
                clearInterval(this.fadeInterval);
                return;
            }
            
            let newVol = audioObj.volume + volumeStep;
            
            // Clamp volume to valid bounds
            if (newVol > 1.0) newVol = 1.0;
            if (newVol < 0.0) newVol = 0.0;
            
            audioObj.volume = newVol;
            
            // Check if we've reached the target
            if ((volumeStep > 0 && audioObj.volume >= targetVolume - 0.01) || 
                (volumeStep < 0 && audioObj.volume <= targetVolume + 0.01)) {
                
                audioObj.volume = targetVolume;
                clearInterval(this.fadeInterval);
                if (callback) callback();
            }
        }, timeStep);
    }

    stopMP3() {
        this.isPlaylistMode = false; // Turn off playlist mode
        if (this.fadeInterval) clearInterval(this.fadeInterval);
        
        if (this.currentMp3) {
            this.currentMp3.pause();
            this.currentMp3.currentTime = 0;
            this.currentMp3 = null;
        }
        this.currentTrack = null;
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
        
        // Stop MP3 if one is playing so they don't clash
        this.stopMP3();

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