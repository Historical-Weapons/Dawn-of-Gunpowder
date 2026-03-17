// ============================================================================
// EMPIRE OF THE 13TH CENTURY - CITY DIMENSION GENERATOR (ORGANIC UPDATE)
// ============================================================================

const CITY_WORLD_WIDTH = 3200; 
const CITY_WORLD_HEIGHT = 3200; 
const CITY_TILE_SIZE = 8;
const CITY_COLS = Math.floor(CITY_WORLD_WIDTH / CITY_TILE_SIZE);
const CITY_ROWS = Math.floor(CITY_WORLD_HEIGHT / CITY_TILE_SIZE);
async function initAllCities(factions) {
    const factionList = Array.isArray(factions) ? factions : Object.keys(factions);
    for (let f of factionList) {
        generateCity(f);
        // Yield to the browser for 10ms so it doesn't crash from memory spikes
        await new Promise(r => setTimeout(r, 10)); 
    }
}

// Global state for city exploration
let inCityMode = false;
let currentActiveCityFaction = null;
let savedWorldPlayerState = { x: 0, y: 0 }; 

// Cache for generated cities and their local NPCs
const cityDimensions = {};
const cityCosmeticNPCs = {};

// --- EXPANDED 13TH CENTURY ARCHITECTURAL TEXTURES ---
const ARCHITECTURE = {
    "Hong Dynasty": { 
        roofs: ["#8b0000", "#7a1a1a", "#3e3e3e", "#4a4a4a", "#6b2d2d", "#2c2c2c"], 
        walls: ["#d3c5b4", "#8b7e71", "#e0d6c8", "#c2b29f", "#968878"],            
        ground: "#556b2f", road: "#7a7a7a", plaza: "#8c8c8c", water: "#4b8da6", 
        trees: ["#2e4a1f", "#3a5f27", "#1f3315"] 
    },
    "Shahdom of Iransar": { 
        roofs: ["#00838f", "#006064", "#d2b48c", "#c2a37c", "#a88c69", "#eebd86"], 
        walls: ["#cfae7e", "#bfa373", "#d6bc94", "#a68a5c", "#e3cca6"],            
        ground: "#cfae7e", road: "#eebd86", plaza: "#d9ae75", water: "#3ba3ab", 
        trees: ["#5c6b3e", "#4a5732", "#6e804a"] 
    },
    "Great Khaganate": { 
        roofs: ["#e0e0e0", "#f5f5dc", "#dcdcdc", "#8b5a2b", "#6b4421"],            
        walls: ["#5c4033", "#4a3329", "#735141", "#8b7355", "#6e5c47"],            
        ground: "#767950", road: "#8b5a2b", plaza: "#704b26", water: "#517a80", 
        trees: ["#414a24", "#30381a", "#525e2e"] 
    },
    "Jinlord Confederacy": { 
        roofs: ["#455a64", "#37474f", "#263238", "#546e7a", "#1c262b"],            
        walls: ["#607d8b", "#4f6a78", "#3f5461", "#7693a1", "#2e404a"],            
        ground: "#607d8b", road: "#708090", plaza: "#596a75", water: "#345c73", 
        trees: ["#1f3b2f", "#152b22", "#2a5241"] 
    },
    "Vietan Realm": { 
        roofs: ["#5d4037", "#4e342e", "#3e2723", "#795548", "#8d6e63"],            
        walls: ["#3e2723", "#2c1c19", "#4e342e", "#5c4033", "#735141"],            
        ground: "#2e7d32", road: "#795548", plaza: "#63453a", water: "#2c8a7b", 
        trees: ["#114a16", "#0b330e", "#19661f"] 
    },
    "Goryun Kingdom": { 
        roofs: ["#212121", "#424242", "#303030", "#4a148c", "#380b6b"],            
        walls: ["#e0e0e0", "#f5f5f5", "#bdbdbd", "#9e9e9e", "#d6d6d6"],            
        ground: "#4a148c", road: "#9e9e9e", plaza: "#7d7d7d", water: "#533785", 
        trees: ["#27084a", "#1c0536", "#360b66"] 
    },
    "Xiaran Dominion": {
        roofs: ["#fbc02d", "#f9a825", "#f57f17", "#c28e0e", "#d4a017"],            
        walls: ["#e6c280", "#d4ad68", "#c29b55", "#b08a45", "#f0d097"],            
        ground: "#d4ad68", road: "#e6c280", plaza: "#c29b55", water: "#345c73",
        trees: ["#5c6b3e", "#4a5732", "#6e804a"] 
    },
    "High Plateau Kingdoms": {
        roofs: ["#4e342e", "#3e2723", "#5d4037", "#8b0000", "#7a1a1a"],            
        walls: ["#fafafa", "#f5f5f5", "#eeeeee", "#e0e0e0", "#d6d6d6"],            
        ground: "#8d6e63", road: "#a1887f", plaza: "#795548", water: "#4b8da6",
        trees: ["#1f3315", "#15240e", "#2a451d"] 
    },
    "Yamato Clans": {
        roofs: ["#2c2c2c", "#383838", "#454545", "#5c4a3d", "#4a3c31"],            
        walls: ["#d7ccc8", "#bcaaa4", "#a1887f", "#8d6e63", "#795548"],            
        ground: "#334d33", road: "#5c5c5c", plaza: "#4a4a4a", water: "#3a6b5e",
        trees: ["#881c2e", "#6b1423", "#2e4a1f"] 
    },
    "Bandits": {
        roofs: ["#3e2723", "#212121", "#424242", "#111111", "#2e2e2e"],            
        walls: ["#2c1c19", "#3e2723", "#1a100e", "#4a3329", "#33231c"],            
        ground: "#222222", road: "#333333", plaza: "#1a1a1a", water: "#1a332c",
        trees: ["#1a2412", "#121a0d", "#233318"] 
    }
};

// --- Function to generate organic clusters (Trees, Water) ---
function generateOrganicFeatures(grid, typeValue, count, maxSize) {
    for (let i = 0; i < count; i++) {
        let startX = Math.floor(Math.random() * (CITY_COLS - maxSize));
        let startY = Math.floor(Math.random() * (CITY_ROWS - maxSize));
        
        for (let j = 0; j < maxSize * 2; j++) {
            let cx = startX + Math.floor((Math.random() - 0.5) * maxSize);
            let cy = startY + Math.floor((Math.random() - 0.5) * maxSize);
            
            if (cx > 0 && cx < CITY_COLS && cy > 0 && cy < CITY_ROWS) {
                if (grid[cx][cy] === 0) grid[cx][cy] = typeValue; // Overwrite ground only
            }
        }
    }
}

// --- Generation Logic (Organic & Radial Density) ---
function generateCity(factionName) {
    if (cityDimensions[factionName]) return;

    const arch = ARCHITECTURE[factionName] || ARCHITECTURE["Hong Dynasty"];
    
    // Matrix: 0=Ground, 1=Road, 2=Building(Solid), 3=Tree(Solid), 4=Water(Solid), 5=Plaza
    const grid = Array.from({ length: CITY_COLS }, () => Array(CITY_ROWS).fill(0));
    
    let midX = Math.floor(CITY_COLS / 2);
    let midY = Math.floor(CITY_ROWS / 2);
    let maxRadius = Math.min(midX, midY) - 5;

    // 1. Central Irregular Plaza
    for(let i=midX-15; i<=midX+15; i++) {
        for(let j=midY-15; j<=midY+15; j++) {
            if (Math.hypot(i-midX, j-midY) < 12 + Math.random() * 4) {
                grid[i][j] = 5; 
            }
        }
    }

    // 2. Organic Winding Roads (Drunkard's Walk spreading outward)
    let numRoads = 60; // More branches = denser road network
    for(let r = 0; r < numRoads; r++) {
        let cx = midX;
        let cy = midY;
        let angle = Math.random() * Math.PI * 2;
        let length = 30 + Math.random() * (maxRadius * 0.8);
        let roadWidth = 1 + Math.floor(Math.random() * 3);

        for(let step = 0; step < length; step++) {
            cx += Math.cos(angle) * 1.5;
            cy += Math.sin(angle) * 1.5;
            angle += (Math.random() - 0.5) * 0.9; // Wiggle factor

            let ix = Math.floor(cx);
            let iy = Math.floor(cy);

            if (ix > 0 && ix < CITY_COLS && iy > 0 && iy < CITY_ROWS) {
                for(let w1 = -roadWidth; w1 <= roadWidth; w1++) {
                    for(let w2 = -roadWidth; w2 <= roadWidth; w2++) {
                        if (Math.hypot(w1, w2) <= roadWidth) { // Circular brush
                            if (ix+w1 > 0 && ix+w1 < CITY_COLS && iy+w2 > 0 && iy+w2 < CITY_ROWS) {
                                if (grid[ix+w1][iy+w2] === 0) grid[ix+w1][iy+w2] = 1; 
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Scatter Buildings Radially (Dense center, sparse edges)
    const buildings = [];
    let numBuildingAttempts = 11000; 

    for (let i = 0; i < numBuildingAttempts; i++) {
        let bx = Math.floor(Math.random() * CITY_COLS);
        let by = Math.floor(Math.random() * CITY_ROWS);

        let dist = Math.hypot(bx - midX, by - midY);
        let densityProb = 1 - (dist / maxRadius);
        densityProb = Math.max(0.01, densityProb); 
        densityProb = Math.pow(densityProb, 1.8); // Exponential drop-off to pack the center

        if (Math.random() > densityProb) continue;

        // Irregular building footprints
        let bw = 2 + Math.floor(Math.random() * 5); 
        let bh = 2 + Math.floor(Math.random() * 5); 

        // Check if space is empty and near a road or tightly packed to other buildings
        let canPlace = true;
        let nearCivilization = false;

        for (let x = bx - 1; x <= bx + bw; x++) {
            for (let y = by - 1; y <= by + bh; y++) {
                if (x < 0 || x >= CITY_COLS || y < 0 || y >= CITY_ROWS) {
                    canPlace = false; break;
                }
                if (x >= bx && x < bx + bw && y >= by && y < by + bh) {
                    if (grid[x][y] !== 0) canPlace = false; // The footprint itself must be pure ground
                } else {
                    if (grid[x][y] === 1 || grid[x][y] === 5 || grid[x][y] === 2) nearCivilization = true;
                }
            }
            if (!canPlace) break;
        }

        // Extremely close buildings don't need a road, they form slums/dense blocks
        if (dist < 25) nearCivilization = true;

        if (canPlace && nearCivilization) {
            let bWall = arch.walls[Math.floor(Math.random() * arch.walls.length)];
            let bRoof = arch.roofs[Math.floor(Math.random() * arch.roofs.length)];

            buildings.push({x: bx, y: by, w: bw, h: bh, wall: bWall, roof: bRoof});
            for (let x = bx; x < bx + bw; x++) {
                for (let y = by; y < by + bh; y++) {
                    grid[x][y] = 2; // Mark as solid building
                }
            }
        }
    }

    // Add Organic Features (Trees=3, Water=4)
generateOrganicFeatures(grid, 3, 40, 18);
generateOrganicFeatures(grid, 4, 12, 12);

    // --- Render Canvas with Texture Noise --- 
    const canvas = document.createElement('canvas');
    canvas.width = CITY_WORLD_WIDTH;  // FIX: Use full pixel width
    canvas.height = CITY_WORLD_HEIGHT; // FIX: Use full pixel height
    const ctx = canvas.getContext('2d');

    // Paint Ground
    ctx.fillStyle = arch.ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Paint Matrix Data (Roads, Plazas, Water, Trees, Bases)
    for (let i = 0; i < CITY_COLS; i++) {
        for (let j = 0; j < CITY_ROWS; j++) {
            if (grid[i][j] === 1 || grid[i][j] === 5) { 
                ctx.fillStyle = grid[i][j] === 1 ? arch.road : arch.plaza;
                ctx.fillRect(i * CITY_TILE_SIZE, j * CITY_TILE_SIZE, CITY_TILE_SIZE, CITY_TILE_SIZE);
                
                // Texture Noise: Random cobblestone/dirt specs
                if (Math.random() > 0.6) {
                    ctx.fillStyle = "rgba(0,0,0,0.15)";
                    ctx.fillRect((i * CITY_TILE_SIZE) + Math.random() * 4, (j * CITY_TILE_SIZE) + Math.random() * 4, 3, 3);
                }
            } else if (grid[i][j] === 0 && Math.random() > 0.95) {
                // Texture Noise: Grass/dirt tufts on the ground
                ctx.fillStyle = "rgba(0,0,0,0.1)";
                ctx.fillRect((i * CITY_TILE_SIZE) + Math.random() * 4, (j * CITY_TILE_SIZE) + Math.random() * 4, 2, 2);
            } else if (grid[i][j] === 3) { // Trees
                ctx.fillStyle = arch.trees[Math.floor(Math.random() * arch.trees.length)];
                ctx.beginPath();
                ctx.arc((i * CITY_TILE_SIZE) + 4, (j * CITY_TILE_SIZE) + 4, 6 + (Math.random()*3), 0, Math.PI*2);
                ctx.fill();
            } else if (grid[i][j] === 4) { // Water
                ctx.fillStyle = arch.water;
                ctx.fillRect(i * CITY_TILE_SIZE, j * CITY_TILE_SIZE, CITY_TILE_SIZE, CITY_TILE_SIZE);
            } 
        }
    }

    // Render Buildings with textured details
    for (let b of buildings) {
        // Draw Wall/Base
        ctx.fillStyle = b.wall; 
        ctx.fillRect(b.x * CITY_TILE_SIZE, b.y * CITY_TILE_SIZE, b.w * CITY_TILE_SIZE, b.h * CITY_TILE_SIZE);

        // Wall texture: random dark structural beam
        if (Math.random() > 0.5) {
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.fillRect((b.x * CITY_TILE_SIZE) + 2, b.y * CITY_TILE_SIZE, 2, b.h * CITY_TILE_SIZE);
        }

        // Draw Roof with depth shift
        ctx.fillStyle = b.roof;
        ctx.fillRect(b.x * CITY_TILE_SIZE, b.y * CITY_TILE_SIZE - 6, b.w * CITY_TILE_SIZE, b.h * CITY_TILE_SIZE);
        
        // Roof texture: slates/shingles lines
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        for (let r = 0; r < b.w * CITY_TILE_SIZE; r += 4) {
             ctx.fillRect((b.x * CITY_TILE_SIZE) + r, b.y * CITY_TILE_SIZE - 6, 1, b.h * CITY_TILE_SIZE);
        }

        // Subtle highlight for 3D effect
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(b.x * CITY_TILE_SIZE, b.y * CITY_TILE_SIZE - 6, b.w * CITY_TILE_SIZE, (b.h * CITY_TILE_SIZE)/2);
        
        // Subtle shadow beneath the roof overhang
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(b.x * CITY_TILE_SIZE, (b.y + b.h) * CITY_TILE_SIZE - 6, b.w * CITY_TILE_SIZE, 2);
    }

    cityDimensions[factionName] = {
        bgCanvas: canvas,
        grid: grid
    };

    generateCityCosmeticNPCs(factionName, grid);
}

// --- Collision Detection API ---
function isCityCollision(x, y, factionName = currentActiveCityFaction) {
    if (!inCityMode || !factionName || !cityDimensions[factionName]) return false;
    
    let tileX = Math.floor(x / CITY_TILE_SIZE);
    let tileY = Math.floor(y / CITY_TILE_SIZE);

    if (tileX < 0 || tileX >= CITY_COLS || tileY < 0 || tileY >= CITY_ROWS) return true;
    let tile = cityDimensions[factionName].grid[tileX][tileY];
	return tile === 2 || tile === 3 || tile === 4;
}

// --- City Entry/Exit ---
function enterCity(factionName, playerObj) {
    generateCity(factionName);
    if (!cityDimensions || !cityDimensions[factionName]) return; 
    
    savedWorldPlayerState.x = playerObj.x;
    savedWorldPlayerState.y = playerObj.y;
    
    inCityMode = true;
    currentActiveCityFaction = factionName;
    
 // Find a safe spot (Road=1 or Plaza=5) near the center
    let foundSafeSpot = false;
    let grid = cityDimensions[factionName].grid;
    let centerX = Math.floor(CITY_COLS / 2);
    let centerY = Math.floor(CITY_ROWS / 2);

    for (let radius = 0; radius < 30 && !foundSafeSpot; radius++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                if (grid[x] && (grid[x][y] === 1 || grid[x][y] === 5)) {
                    playerObj.x = x * CITY_TILE_SIZE;
                    playerObj.y = y * CITY_TILE_SIZE;
                    foundSafeSpot = true;
                    break;
                }
            }
            if (foundSafeSpot) break;
        }
    }

    if (!foundSafeSpot) {
        playerObj.x = CITY_WORLD_WIDTH / 2;
        playerObj.y = CITY_WORLD_HEIGHT / 2;
    }
}

function leaveCity(playerObj) {
    inCityMode = false;
    currentActiveCityFaction = null;
    
    // 1. CLEAR KEY BUFFER: This stops the "natural" velocity increase 
    // caused by keys being "stuck" during the transition.
    for (let key in keys) {
        keys[key] = false;
    }

    if (typeof activeCity !== 'undefined') activeCity = null;
    const panel = document.getElementById('city-panel');
    if (panel) panel.style.display = 'none';
    
    // 2. Reset Position
    playerObj.x = savedWorldPlayerState.x;
    playerObj.y = savedWorldPlayerState.y;
    
    // 3. Reset Physics
    playerObj.speed = 15; 
    playerObj.isMoving = false;
    playerObj.anim = 0; // Reset animation frame to prevent jitter

    console.log("Returned to world map: Physics and Input cleared.");
}

// ============================================================================
// NEW HUMAN DRAWING & NPC SYSTEM
// ============================================================================

function drawHuman(ctx, x, y, moving, frame, factionColor) {
    ctx.save();
    ctx.translate(x, y);
    
    let legSwing = moving ? Math.sin(frame * 0.2) * 6 : 0;
    let bob = moving ? Math.abs(Math.sin(frame * 0.2)) * 2 : 0;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Legs
    ctx.strokeStyle = "#3e2723"; 
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-3 - legSwing, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(3 + legSwing, 9); ctx.stroke();

    // Body
    ctx.save();
    ctx.translate(0, -bob); 
    
    ctx.fillStyle = factionColor; 
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -9); ctx.lineTo(-2, -9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = "#d4b886"; 
    ctx.beginPath(); ctx.arc(0, -11, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = "#a1887f";
    ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(0, -18); ctx.lineTo(9, -11);
    ctx.quadraticCurveTo(0, -10, -9, -11); ctx.fill(); ctx.stroke();
    
    ctx.restore();
    ctx.restore();
}

// --- Local NPC Systems ---

function generateCityCosmeticNPCs(factionName, grid) {
    cityCosmeticNPCs[factionName] = [];
    let midX = CITY_COLS / 2;
    let midY = CITY_ROWS / 2;
    
    let spawned = 0;
    let attempts = 0;
    
	// --- STEP 1: Define the random target ---
    // Math.random() * 16 gives 0-15.99. + 5 makes it 5-20.99. 
    // Math.floor turns it into an integer (5, 6, 7... up to 20).
    const targetPopulation = Math.floor(Math.random() * 16) + 5;
	
	
    // Massive population decrease, heavily biased toward the center plaza and dense roads
while (spawned < targetPopulation && attempts < 200){
        attempts++;
        
        // Random angle and a squiggly radius pushes them closer to the middle naturally
        let angle = Math.random() * Math.PI * 2;
        let radius = (Math.random() * Math.random()) * (CITY_COLS / 2); 
        
        let tx = Math.floor(midX + Math.cos(angle) * radius);
        let ty = Math.floor(midY + Math.sin(angle) * radius);
        
        if (tx > 0 && tx < CITY_COLS && ty > 0 && ty < CITY_ROWS) {
            let newX = tx * CITY_TILE_SIZE;
            let newY = ty * CITY_TILE_SIZE;

            // --- ADDED: SPAWN PROXIMITY CHECK ---
            // Don't spawn if someone is already standing within 20px
            let tooCrowded = cityCosmeticNPCs[factionName].some(other => 
                Math.hypot(other.x - newX, other.y - newY) < 20
            );

            if (!tooCrowded && (grid[tx][ty] < 2 || grid[tx][ty] === 5)) {
                cityCosmeticNPCs[factionName].push({
                    x: newX,
                    y: newY,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: (Math.random() - 0.5) * 1.2,
                    animOffset: Math.random() * 100 
                });
                spawned++;
            }
        }
    }
}
function drawCityCosmeticNPCs(ctx, factionName, _ignored, zoom) {
    let npcs = cityCosmeticNPCs[factionName];
    if (!npcs) return;

    let factionColor = (typeof FACTIONS !== 'undefined' && FACTIONS[factionName]) 
                       ? FACTIONS[factionName].color : "#ffffff";

    for (let npc of npcs) {
        // 1. EMERGENCY CHECK: If stuck inside a wall, nudge toward map center
        if (isCityCollision(npc.x, npc.y, factionName)) {
            let dirX = (CITY_WORLD_WIDTH / 2) - npc.x;
            let dirY = (CITY_WORLD_HEIGHT / 2) - npc.y;
            let angle = Math.atan2(dirY, dirX);
            npc.x += Math.cos(angle) * 5; 
            npc.y += Math.sin(angle) * 5;
            npc.vx = (Math.random() - 0.5) * 1.5;
            npc.vy = (Math.random() - 0.5) * 1.5;
        }

        let nx = npc.x + npc.vx;
        let ny = npc.y + npc.vy;

        // 2. SOCIAL DISTANCING: Check if the next move hits another human
        // We use a small radius (12px) to let them get close but not overlap
        let hitHuman = npcs.some(other => 
            other !== npc && Math.hypot(other.x - nx, other.y - ny) < 12
        );

        // 3. NORMAL COLLISION: Bounce off walls OR other humans
        if (isCityCollision(nx, ny, factionName) || hitHuman) {
            npc.vx *= -1; 
            npc.vy *= -1;
            // Add chaos wiggle so they don't get stuck in a perfect bounce loop
            npc.vx += (Math.random() - 0.5) * 0.4;
            npc.vy += (Math.random() - 0.5) * 0.4;
        } else {
            npc.x = nx;
            npc.y = ny;
        }

        // Draw the walking human
        drawHuman(ctx, npc.x, npc.y, true, (Date.now() / 50) + npc.animOffset, factionColor);
    }
}