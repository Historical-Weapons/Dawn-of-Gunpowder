// ============================================================================
// EMPIRE OF THE 13TH CENTURY - BATTLEFIELD TACTICAL ENGINE
// ============================================================================


// FOR SIEGE COMPATIBILITY REPLACED TO LET INSTEAD
let BATTLE_WORLD_WIDTH = 2400; 
let BATTLE_WORLD_HEIGHT = 1600; 
const BATTLE_TILE_SIZE = 8;
let BATTLE_COLS = Math.floor(BATTLE_WORLD_WIDTH / BATTLE_TILE_SIZE);
let BATTLE_ROWS = Math.floor(BATTLE_WORLD_HEIGHT / BATTLE_TILE_SIZE);

 

let unitIdCounter = 0;
const VIEW_PADDING = 200;

function isOnScreen(unit, camera) {
    return (
        unit.x > camera.x - VIEW_PADDING &&
        unit.x < camera.x + camera.width + VIEW_PADDING &&
        unit.y > camera.y - VIEW_PADDING &&
        unit.y < camera.y + camera.height + VIEW_PADDING
    );
}

// Global state for battle exploration
let inBattleMode = false;
let currentBattleData = null;
let savedWorldPlayerState_Battle = { x: 0, y: 0 }; 

let battleEnvironment = {
    bgCanvas: null,
	fgCanvas: null, // <--- ADD THIS LINE
    grid: [],
    units: [],
    projectiles: [], // For arrows and fire lances
	groundEffects: [] // ---> NEW: For stuck ground projectiles and bomb craters
};

 
// Locate this function in battlefield_system.js
function isExitAllowed() {
    if (!inBattleMode) return true; 
    
    // Check for remaining enemies (units not on player side with HP > 0)
    const enemyCount = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;
    
    // Safely check if the player exists before checking HP
    const playerDead = (typeof player !== 'undefined' && player) ? (player.hp <= 0) : false;
    
    return (playerDead || enemyCount === 0);
}

function generateBattleOrganicFeatures(grid, typeValue, count, maxSize) {
    // --- NEW SURGERY: Abort procedural generation if inside a city ---
    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) return;

    for (let i = 0; i < count; i++) {
        // Pick a center point anywhere in the grid
        let centerX = Math.floor(Math.random() * BATTLE_COLS);
        let centerY = Math.floor(Math.random() * BATTLE_ROWS);
        
        // Spread the tiles around that center point
        let spread = maxSize; 
        for (let j = 0; j < spread * 5; j++) {
            let cx = centerX + Math.floor((Math.random() - 0.5) * spread);
            let cy = centerY + Math.floor((Math.random() - 0.5) * spread);
            
            // Bounds check
            if (cx >= 0 && cx < BATTLE_COLS && cy >= 0 && cy < BATTLE_ROWS) {
                // Priority: Don't overwrite existing mountain peaks (Type 8)
                if (grid[cx][cy] === 0) grid[cx][cy] = typeValue; 
            }
        }
    }
}

function generateBattlefield(worldTerrainType) {
    const grid = Array.from({ length: BATTLE_COLS }, () => Array(BATTLE_ROWS).fill(0));
    
    let groundColor = "#767950"; 
    let treeColorPool = ["#2e4a1f", "#3a5f27", "#1f3315"];
    let rockColor = "#5c5c5c";

// Dense Forest (more trees than regular Forest)
if (worldTerrainType.includes("Dense Forest")) {
    groundColor = "#3a4228"; // Slightly darker green
    generateBattleOrganicFeatures(grid, 3, 40, 25); // Dense trees
    generateBattleOrganicFeatures(grid, 7, 20, 12); // More undergrowth
} 
// Sparse Forest
else if (worldTerrainType.includes("Forest")) {
    groundColor = "#425232";
    generateBattleOrganicFeatures(grid, 3, 18, 20); // Sparse trees
    generateBattleOrganicFeatures(grid, 7, 12, 10); // Sparse brush
}
// NEW SURGERY: STEPPE (Dry, Yellow, No Trees)
else if (worldTerrainType.includes("Steppe")) {
    groundColor = "#a3a073"; // Parched yellow-green
    // No trees (Type 3 removed)
    generateBattleOrganicFeatures(grid, 10, 60, 10); // Heavy dry grass texture
    generateBattleOrganicFeatures(grid, 7, 30, 8);   // Dry dirt/mud patches
} 
// NEW SURGERY: PLAINS (Green, Occasional Rocks)
else if (worldTerrainType.includes("Plains")) {
    groundColor = "#6b7a4a"; // Soft plains green
    treeColorPool = ["#4e6b3e", "#3a522d"]; 
    rockColor = "#969696"; 
    
    generateBattleOrganicFeatures(grid, 10, 40, 12); // Lush grass texture
    generateBattleOrganicFeatures(grid, 6, 2, 10);   // Occasional rocks
 
}
	

else if (worldTerrainType.includes("Desert") || worldTerrainType.includes("Dunes")) {
        groundColor = "#cfae7e";
        treeColorPool = ["#8b7e71", "#a68a5c"]; 
        // REVISED: Lowered count from 20 to 2, lowered maxSize from 250 to 15
        generateBattleOrganicFeatures(grid, 6, 2, 15);  
        generateBattleOrganicFeatures(grid, 7, 40, 10);  
    } 
	
// 1. HIGHLANDS: Rocky and brown, sparse vegetation
else if (worldTerrainType.includes("Highlands")) {
    groundColor = "#7d664b"; // Rocky brown
    treeColorPool = ["#5a5a3a", "#4a4a2a"]; // Desaturated, dry greens
    
    // Lower rock density for clusters
    generateBattleOrganicFeatures(grid, 6, 1, 12); // Fewer, smaller rock clusters
    generateBattleOrganicFeatures(grid, 3, 6, 10);  // Very few trees
}



else if (worldTerrainType.includes("Large Mountains")) {
    groundColor = "#7B5E3F"; // dark ground
    rockColor = "#2a2a2a";   // Dark grey for exposed rock faces
    
    // --- SURGERY: MOUNTAIN RANGE CLUSTERING ---
    
    // 1. The Main Summit (Massive Peak)
    // We keep this at 1 to serve as the "centerpiece" of the map
    generateBattleOrganicFeatures(grid, 8, 1, 120); 

    // 2. Subsidiary Peaks (Smaller surrounding mountains)
    // This creates the "Range" effect so the main peak isn't lonely
    // Tile Type 8, Count 3, MaxSize 40
    generateBattleOrganicFeatures(grid, 8, 2, 40);

    // 3. Exposed Rock Formations (Large Boulders/Cliffs)
    // Increased count and size to represent rocky outcrops in the snow
    generateBattleOrganicFeatures(grid, 6, 3, 25); 

    // 4. Textured Snow Drifts
    // Using Type 7 (Mud/Brush logic) but it will render as soft shadows on white ground
    generateBattleOrganicFeatures(grid, 7, 10, 12); 
}
	
// 2. TROPICAL HIGHLANDS (Jungle Karst): Steep, mossy, and humid
else if (worldTerrainType.includes("Mountain") && !worldTerrainType.includes("Snowy")) {
    groundColor = "#3e4d26"; // Deep mossy/clay earth
    // Tropical Palette: Bright Limes, Deep Ferns, and Jungle Teals
    treeColorPool = ["#2d5a27", "#4a7c38", "#1e3d1a", "#5c913c"]; 
    rockColor = "#7a7a7a"; // Limestone grey
    
    // --- CLUSTERING LOGIC ---
    // Tile Type 9: New Tropical Karst Peak (We'll define the draw logic below)
    // We use a higher count (5) but smaller maxSize (35) to create many "Pillars"
    generateBattleOrganicFeatures(grid, 9, 3, 35); 

    // Dense Jungle Foliage
    generateBattleOrganicFeatures(grid, 3, 25, 15); 

    // Limestone Outcrops (Vertical rocks)
    generateBattleOrganicFeatures(grid, 6, 3, 12); 
    
    // Muddy patches/Dense undergrowth
    generateBattleOrganicFeatures(grid, 7, 15, 10);
}
	
	else {
        generateBattleOrganicFeatures(grid, 3, 60, 15);  
        generateBattleOrganicFeatures(grid, 4, 20, 12);  
        generateBattleOrganicFeatures(grid, 7, 30, 10);  
    }

    // --- SURGERY: CANVAS EXPANSION ---
    const VISUAL_PADDING = 100; // The size of the "Outer Bound" area
	
	// 1. Existing Background Canvas
const canvas = document.createElement('canvas');
canvas.width = BATTLE_WORLD_WIDTH + (VISUAL_PADDING * 2);
canvas.height = BATTLE_WORLD_HEIGHT + (VISUAL_PADDING * 2);
const ctx = canvas.getContext('2d');

// 2. NEW: Foreground Canvas
const fgCanvas = document.createElement('canvas');
fgCanvas.width = BATTLE_WORLD_WIDTH + (VISUAL_PADDING * 2);
fgCanvas.height = BATTLE_WORLD_HEIGHT + (VISUAL_PADDING * 2);
const fgCtx = fgCanvas.getContext('2d'); // We will use this to draw trees!
	
 
 // 1. Paint the "Infinite" Floor
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

 
	
    // 2. SURGERY: Decorative Outer Bound Textures
    // This populates the "Abyss" so it looks like a real world
    for (let i = 0; i < canvas.width; i += 60) {
        for (let j = 0; j < canvas.height; j += 60) {
            // Only draw if we are OUTSIDE the playable battle area
            if (i < VISUAL_PADDING || i > BATTLE_WORLD_WIDTH + VISUAL_PADDING || 
                j < VISUAL_PADDING || j > BATTLE_WORLD_HEIGHT + VISUAL_PADDING) {
                
                let rand = Math.random();
              if (rand > 0.98) { // Decorative Trees
					fgCtx.fillStyle = treeColorPool[Math.floor(Math.random() * treeColorPool.length)];
					fgCtx.beginPath();
					fgCtx.arc(i, j, 5 + (Math.random() * 8), 0, Math.PI * 2);
					fgCtx.fill();
				} else if (rand > 0.97) { // Decorative Rocks
					fgCtx.fillStyle = rockColor;
					fgCtx.beginPath();
					fgCtx.moveTo(i, j + 10);
					fgCtx.lineTo(i + 5, j);
					fgCtx.lineTo(i + 10, j + 10);
					fgCtx.fill();
				}
            }
        }
    }

    // 3. Shift the context so your original grid logic draws in the center
    ctx.save();
    ctx.translate(VISUAL_PADDING, VISUAL_PADDING);
	fgCtx.save();
	fgCtx.translate(VISUAL_PADDING, VISUAL_PADDING);

    // --- YOUR ORIGINAL GRID DRAWING LOOP (DO NOT DELETE) ---
    for (let i = 0; i < BATTLE_COLS; i++) {
        for (let j = 0; j < BATTLE_ROWS; j++) {
							let px = i * BATTLE_TILE_SIZE;
							let py = j * BATTLE_TILE_SIZE;

							if (grid[i][j] === 0 && Math.random() > 0.95) {
								ctx.fillStyle = "rgba(0,0,0,0.1)";
								ctx.fillRect(px + Math.random() * 4, py + Math.random() * 4, 3, 3);
							} 
							
 							else if (grid[i][j] === 3) { // Trees
									// 1. Deterministic Seed
									const treeSeed = (i * 1337 + j * 7331);
									const randomVisual = (n) => ((Math.abs(Math.sin(treeSeed * n)) * 1000) % 1);

									// 2. Constants
									const sizeMult = 2 + (randomVisual(1) * 12); 
									const radius = (BATTLE_TILE_SIZE / 2) * sizeMult;
									const cx = px + BATTLE_TILE_SIZE / 2;
									const cy = py + BATTLE_TILE_SIZE / 2;
									
									// 3. Selection & Biome Logic
									const treeColor = treeColorPool[Math.floor(randomVisual(2) * treeColorPool.length)];
									const isSnowyConifer = worldTerrainType.includes("Snowy") || (worldTerrainType.includes("Mountain") && worldTerrainType.includes("North"));
									const isHighland = worldTerrainType.includes("Mountain") && !worldTerrainType.includes("Snowy");

									const drawCtx = fgCtx; 
									drawCtx.fillStyle = treeColor;

									if (isSnowyConifer) {
										// --- ORIGINAL CONIFER LOGIC (Jurchen Forests / Alpine) ---
										drawCtx.beginPath();
										// Top Tier
										drawCtx.moveTo(cx, cy - radius * 1.8);
										drawCtx.lineTo(cx - radius * 0.7, cy - radius * 0.5);
										drawCtx.lineTo(cx + radius * 0.7, cy - radius * 0.5);
										drawCtx.fill();
										// Bottom Tier
										drawCtx.beginPath();
										drawCtx.moveTo(cx, cy - radius * 0.8);
										drawCtx.lineTo(cx - radius, cy + radius);
										drawCtx.lineTo(cx + radius, cy + radius);
										drawCtx.fill();
										// Depth Shadow
										drawCtx.fillStyle = "rgba(0,0,0,0.15)";
										drawCtx.beginPath();
										drawCtx.moveTo(cx, cy - radius * 1.8);
										drawCtx.lineTo(cx, cy + radius);
										drawCtx.lineTo(cx + radius, cy + radius);
										drawCtx.fill();

									} else if (isHighland) {
										// --- NEW SURGERY: TROPICAL CLOUD FOREST (Hmong Highlands) ---
										// Wide, umbrella-like banyan/tropical canopy
										drawCtx.beginPath();
										drawCtx.ellipse(cx, cy, radius, radius * 0.6, 0, 0, Math.PI * 2);
										drawCtx.ellipse(cx, cy - radius * 0.4, radius * 0.7, radius * 0.4, 0, 0, Math.PI * 2);
										drawCtx.fill();
										// Leaf Cluster Texturing
										drawCtx.fillStyle = "rgba(0,0,0,0.12)";
										drawCtx.beginPath();
										drawCtx.arc(cx + radius * 0.3, cy + radius * 0.1, radius * 0.3, 0, Math.PI * 2);
										drawCtx.arc(cx - radius * 0.4, cy, radius * 0.25, 0, Math.PI * 2);
										drawCtx.fill();

									} else {
										// --- ORIGINAL TEMPERATE LOGIC (Organic Blobs) ---
										drawCtx.beginPath();
										drawCtx.arc(cx, cy, radius, 0, Math.PI * 2);
										drawCtx.arc(cx - radius * 0.4, cy - radius * 0.2, radius * 0.6, 0, Math.PI * 2);
										drawCtx.arc(cx + radius * 0.3, cy + radius * 0.1, radius * 0.5, 0, Math.PI * 2);
										drawCtx.fill();
										// Highlight
										drawCtx.fillStyle = "rgba(255,255,255,0.12)";
										drawCtx.beginPath();
										drawCtx.arc(cx - radius * 0.2, cy - radius * 0.3, radius * 0.5, 0, Math.PI * 2);
										drawCtx.fill();
									}
								}
							
							
							else if (grid[i][j] === 4) { // Water
								ctx.fillStyle = "#3ba3ab";
								ctx.fillRect(px, py, BATTLE_TILE_SIZE, BATTLE_TILE_SIZE);
				} 

else if (grid[i][j] === 6) { // Rocks / Boulders
    const centerX = px + BATTLE_TILE_SIZE / 2;
    const centerY = py + BATTLE_TILE_SIZE / 2;
    
    // Use the seed to make the rock jagged, not a circle
    const rockSeed = (i * 1337 + j * 7331);
    const rRand = (n) => ((Math.abs(Math.sin(rockSeed * n)) * 100) % 1);
    
  // NEW SURGERY: High-Quality Small Crags
// Scaled down significantly (from 4-10 tiles down to 1-3 tiles)
const bW = BATTLE_TILE_SIZE * (1.2 + rRand(1) * 2.5);
const bH = BATTLE_TILE_SIZE * (0.8 + rRand(2) * 1.5);

// 1. Shadow Base (Deepened)
ctx.fillStyle = "rgba(0,0,0,0.3)";
ctx.beginPath();
ctx.moveTo(centerX - bW/1.8, centerY + bH/1.8);
ctx.lineTo(centerX + bW/1.8, centerY + bH/1.8);
ctx.lineTo(centerX, centerY - bH/4);
ctx.fill();

// 2. Main Rock Body
ctx.fillStyle = rockColor;
ctx.beginPath();
ctx.moveTo(centerX - bW/2, centerY + bH/2);
ctx.lineTo(centerX - bW/4, centerY - bH/2); // Sharp top left
ctx.lineTo(centerX + bW/3, centerY - bH/3); // Jagged ridge
ctx.lineTo(centerX + bW/2, centerY + bH/2);
ctx.closePath();
ctx.fill();

// 3. High-Quality Highlight (Top-left edge lighting)
ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
ctx.lineWidth = 0.5;
ctx.beginPath();
ctx.moveTo(centerX - bW/2.5, centerY + bH/4);
ctx.lineTo(centerX - bW/5, centerY - bH/2.5);
ctx.stroke();
}
							
else if (grid[i][j] === 7) { // Mud/Brush
    // 1. Deterministic Seed for consistent ground noise
    const brushSeed = (i * 1337 + j * 7331);
    const bRand = (n) => ((Math.abs(Math.sin(brushSeed * n)) * 1000) % 1);

    // 2. Muddy Base (Slightly smaller than tile to avoid grid lines)
    ctx.fillStyle = "rgba(40, 30, 20, 0.12)"; 
    ctx.beginPath();
    ctx.arc(px + BATTLE_TILE_SIZE/2, py + BATTLE_TILE_SIZE/2, BATTLE_TILE_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 3. "Speckle" Detail (Small organic clumps)
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    for (let s = 0; s < 2; s++) {
        const ox = bRand(s + 1) * BATTLE_TILE_SIZE;
        const oy = bRand(s + 2) * BATTLE_TILE_SIZE;
        const r = 0.5 + bRand(s + 3) * 1.5; // Very small radius
        
        ctx.beginPath();
        ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

else if (grid[i][j] === 8) { // Massive Snowy Peak (Reduced Height)
    const peakSeed = (i * 1337 + j * 7331);
    const rand = (n) => ((Math.abs(Math.sin(peakSeed * n)) * 1000) % 1);
    
    const width = BATTLE_TILE_SIZE * (30 + rand(1) * 20); 
    
    // REDUCED HEIGHT BY 70%: Original (0.8 + rand * 0.5) -> New (0.24 + rand * 0.15)
    const height = width * (0.24 + rand(2) * 0.15);
    
    const cx = px + BATTLE_TILE_SIZE / 2;
    const cy = py + BATTLE_TILE_SIZE / 2;

    // Use ctx to render UNDER units
    ctx.save(); 
    
    // 1. The Shadow/Base Body
    ctx.fillStyle = "#cbd5e0"; 
    ctx.beginPath();
    ctx.moveTo(cx - width, cy + BATTLE_TILE_SIZE);
    ctx.quadraticCurveTo(cx - width * 0.5, cy - height * 0.2, cx, cy - height);
    ctx.quadraticCurveTo(cx + width * 0.5, cy - height * 0.2, cx + width, cy + BATTLE_TILE_SIZE);
    ctx.fill();

    // 2. The Bright Snow Cap
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx, cy - height);
    ctx.lineTo(cx - width * 0.2, cy - height * 0.6);
    ctx.lineTo(cx - width * 0.1, cy - height * 0.55);
    ctx.lineTo(cx + width * 0.05, cy - height * 0.65);
    ctx.lineTo(cx + width * 0.2, cy - height * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

else if (grid[i][j] === 9) { // Tropical Karst Pillars (Hmong Highland Style)
    const peakSeed = (i * 1337 + j * 7331);
    const rand = (n) => ((Math.abs(Math.sin(peakSeed * n)) * 1000) % 1);
    
    // Draw 2-3 tightly packed pillars per tile
    for (let p = 0; p < 2; p++) {
        const xOffset = (rand(p + 5) - 0.5) * (BATTLE_TILE_SIZE * 8);
        const pWidth = BATTLE_TILE_SIZE * (15 + rand(p + 10) * 15); 
        
        // REDUCED HEIGHT BY 60%: Original (1.2 + rand * 0.8) -> New (0.48 + rand * 0.32)
        const pHeight = pWidth * (0.48 + rand(p + 15) * 0.32); 
        
        const cx = px + (BATTLE_TILE_SIZE / 2) + xOffset;
        const cy = py + BATTLE_TILE_SIZE / 2;

        ctx.save();
        
        // 1. The Pillar Body (Mossy Limestone)
        ctx.fillStyle = "#5c6350"; 
        ctx.beginPath();
        ctx.moveTo(cx - pWidth * 0.5, cy + BATTLE_TILE_SIZE);
        
        // Steep sides with a rounded "dome" top
        ctx.lineTo(cx - pWidth * 0.4, cy - pHeight * 0.6); // Steep wall
        ctx.quadraticCurveTo(cx, cy - pHeight, cx + pWidth * 0.4, cy - pHeight * 0.6); // Rounded summit
        ctx.lineTo(cx + pWidth * 0.5, cy + BATTLE_TILE_SIZE);
        ctx.fill();

        // 2. The Vegetation "Cap" (Lush Greenery on top)
        // Selecting from your treeColorPool for biome consistency
        ctx.fillStyle = treeColorPool[Math.floor(rand(p + 20) * treeColorPool.length)];
        ctx.beginPath();
        ctx.moveTo(cx - pWidth * 0.35, cy - pHeight * 0.7);
        ctx.quadraticCurveTo(cx, cy - pHeight - 5, cx + pWidth * 0.35, cy - pHeight * 0.7);
        ctx.lineTo(cx + pWidth * 0.2, cy - pHeight * 0.5);
        ctx.lineTo(cx - pWidth * 0.2, cy - pHeight * 0.5);
        ctx.fill();

        // 3. Humidity/Mist Shadow
        // Using a soft green-grey to simulate jungle mist at the base
        const mistGrad = ctx.createLinearGradient(cx, cy + BATTLE_TILE_SIZE, cx, cy - pHeight);
        mistGrad.addColorStop(0, "rgba(60, 80, 60, 0.2)");
        mistGrad.addColorStop(0.5, "rgba(0,0,0,0)");
        
        ctx.fillStyle = mistGrad;
        ctx.fillRect(cx - pWidth, cy - pHeight, pWidth * 2, pHeight + BATTLE_TILE_SIZE);

        ctx.restore();
    }
}

else if (grid[i][j] === 10) { // GRASS TEXTURE
    const grassSeed = (i * 1337 + j * 7331);
    const gRand = (n) => ((Math.abs(Math.sin(grassSeed * n)) * 1000) % 1);

    // Pick a color slightly darker than the ground for contrast
    ctx.strokeStyle = worldTerrainType.includes("Steppe") ? "rgba(100, 80, 20, 0.15)" : "rgba(40, 60, 20, 0.15)";
    ctx.lineWidth = 1;

    const cx = px + BATTLE_TILE_SIZE / 2;
    const cy = py + BATTLE_TILE_SIZE / 2;

    // Draw 2-3 small blades of grass
    for (let g = 0; g < 2; g++) {
        const offX = (gRand(g) - 0.5) * BATTLE_TILE_SIZE;
        const offY = (gRand(g + 1) - 0.5) * BATTLE_TILE_SIZE;
        const gH = 2 + gRand(g + 2) * 3; // Blade height

        ctx.beginPath();
        // Simple "V" shape for grass
        ctx.moveTo(cx + offX - 1, cy + offY);
        ctx.lineTo(cx + offX, cy + offY - gH);
        ctx.lineTo(cx + offX + 1, cy + offY);
        ctx.stroke();
    }
}
			
				
        }
    }

    // 4. SURGERY: The Red Tactical Boundary
    ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
    ctx.lineWidth = 8;
    ctx.setLineDash([15, 15]); // Makes it look like a tactical UI line
    ctx.strokeRect(0, 0, BATTLE_WORLD_WIDTH, BATTLE_WORLD_HEIGHT);
    ctx.setLineDash([]); // Reset for other drawings
    
    ctx.restore(); // Back to global canvas space

    // Store state
    battleEnvironment.bgCanvas = canvas;
	battleEnvironment.fgCanvas = fgCanvas; // <--- ADD THIS LINE
    battleEnvironment.grid = grid;
    battleEnvironment.groundColor = "#000000";
    battleEnvironment.visualPadding = VISUAL_PADDING; // Store this for the camera!
}





// --- ENTER BATTLE LOGIC ---
function enterBattlefield(enemyNPC, playerObj, currentWorldMapTile) {
    if (inCityMode) return; 

 

if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) {
        // SURGERY: Fallback to 300x200 if city variables are missing
        let cols = (typeof CITY_COLS !== 'undefined') ? CITY_COLS : 300;
        let rows = (typeof CITY_ROWS !== 'undefined') ? CITY_ROWS : 200;
        BATTLE_WORLD_WIDTH = cols * BATTLE_TILE_SIZE; 
        BATTLE_WORLD_HEIGHT = rows * BATTLE_TILE_SIZE;
    } else {
        BATTLE_WORLD_WIDTH = 2400; 
        BATTLE_WORLD_HEIGHT = 1600;
    }

    // 2. Recalculate grid columns and rows based on chosen dimensions
    BATTLE_COLS = Math.floor(BATTLE_WORLD_WIDTH / BATTLE_TILE_SIZE);
    BATTLE_ROWS = Math.floor(BATTLE_WORLD_HEIGHT / BATTLE_TILE_SIZE);

    // 3. Save state and switch modes
    savedWorldPlayerState_Battle.x = playerObj.x;
    savedWorldPlayerState_Battle.y = playerObj.y;
    
   
    closeParleUI();

    inBattleMode = true;

// ---> SURGERY: FLUSH GHOST KEYS <---
    // Prevents the player from sliding automatically if a key got stuck in a menu
    if (typeof keys !== 'undefined') {
        for (let k in keys) keys[k] = false;
    }

    // Safety: also double-kill visually in case of race conditions
    // Safety: also double-kill visually in case of race conditions
    const panel = document.getElementById('parle-panel');
    if (panel) panel.style.display = 'none';

	
	currentBattleData = {
        enemyRef: enemyNPC,
        playerFaction: playerObj.faction || "Hong Dynasty",
        enemyFaction: enemyNPC.faction,
        initialCounts: { player: 0, enemy: 0 },
        // ADD THESE:
        
    // UPDATED:
    playerColor: (typeof FACTIONS !== 'undefined' && FACTIONS[playerObj.faction]) 
        ? FACTIONS[playerObj.faction].color 
        : "#ffffff", // white fallback

    enemyColor: (typeof FACTIONS !== 'undefined' && FACTIONS[enemyNPC.faction]) 
        ? FACTIONS[enemyNPC.faction].color 
        : "#000000" // black fallback

		};

    generateBattlefield(currentWorldMapTile.name || "Plains");


   // FIX: Pull the real troop count from the player object
    let playerTroopCount = playerObj.troops || 0; 
    let playerUniqueType = playerObj.uniqueUnit || null; 
    deployArmy(currentBattleData.playerFaction, playerTroopCount, "player"); 
    deployArmy(enemyNPC.faction, enemyNPC.count, "enemy");

    // ---> SURGERY: SNAP WASD TO COMMANDER <---
    // Find exactly where the army deployed the commander and move the invisible WASD player there
    let deployedCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "player");
    if (deployedCmdr) {
        playerObj.x = deployedCmdr.x;
        playerObj.y = deployedCmdr.y;
    } else {
        playerObj.x = BATTLE_WORLD_WIDTH / 2;
        playerObj.y = BATTLE_WORLD_HEIGHT - 100;
    }
	
    let totalCombatants = playerTroopCount + enemyNPC.count;
    

    if (typeof AudioManager !== 'undefined') {
        AudioManager.init();

        // 2. Play your MP3 file (false = no loop)
        // Ensure path matches your folder: music/menu_noloop.mp3
        AudioManager.playMP3('music/battlemusic.mp3', false);
    }
    AudioManager.playSound("charge"); // Warcry SFX on spawn
	// Trigger the Epic Zoom: Starts at 0.3x (high up), lands at 1.5x (tactical view) over 1.5 seconds
    if (typeof triggerEpicZoom === 'function') {
        triggerEpicZoom(0.1, 1.5, 3500);
    }
	
 
}
 
// --- ARMY DEPLOYMENT BASED ON FACTION RACE & ACTUAL ROSTER ---
function deployArmy(faction, totalTroops, side, uniqueType) {
    
    // 1. Track initial counts for the battle summary
    if (!currentBattleData.initialCounts) {
        currentBattleData.initialCounts = { player: 0, enemy: 0 };
    }
    
    // 2. Setup spawn coordinates
    let spawnY = side === "player" ? BATTLE_WORLD_HEIGHT - 300 : 300;
    let spawnXCenter = BATTLE_WORLD_WIDTH / 2;
    let factionColor = (typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#ffffff";
    
// =========================================================
    // --- SURGERY: SIEGE DEFENDER OVERRIDE ---
    // Forces enemy troops into a horizontal line deep inside the city
    // =========================================================
    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && side === "enemy") {
        let southGate = typeof overheadCityGates !== 'undefined' ? overheadCityGates.find(g => g.side === "south") : null;
        if (southGate) {
            // Push them 500 pixels North (deep inside the walls/plaza)
            spawnY = (southGate.y * BATTLE_TILE_SIZE) - 600; 
        } else {
            spawnY = BATTLE_WORLD_HEIGHT - 1000; // Safe fallback deep inside walls
        }
    }
	
	
	
    let composition = [];

// =========================================================
    // THE FIX: If it's the player, read EXACTLY what they bought
    // =========================================================
	
	
    if (side === "player" && typeof player !== 'undefined' && player.roster && player.roster.length > 0) {
        let counts = {};
        
        // Tally up the exact units in the roster
        player.roster.forEach(unit => {
            let rawType = unit.type || unit.name;
            if (!rawType) return;
            // Force exact UI capitalization so the Engine never misses the database name
            let type = rawType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            if (type.toLowerCase() === "militia") type = "Militia";
            
            counts[type] = (counts[type] || 0) + 1;
        });

        // Convert the exact counts into percentages for your visual scaling engine
        let totalRosterSize = player.roster.length;
        for (let [type, count] of Object.entries(counts)) {
            composition.push({ type: type, pct: count / totalRosterSize });
        }
		composition.sort((a, b) => a.pct - b.pct);

        // Override totalTroops to match the actual roster size
        totalTroops = totalRosterSize;

    } else {
   // =========================================================
// ENEMY AI: Updated Composition Templates (v2.1)
// =========================================================

if (faction === "Great Khaganate") {
    composition = [
        {type: "Horse Archer", pct: 0.50}, 
        {type: "Heavy Horse Archer", pct: 0.20},
        {type: "Keshig", pct: 0.10}, 
        {type: "Lancer", pct: 0.15}, 
        {type: "Heavy Lancer", pct: 0.05}
    ];
} else if (faction === "Dab Tribes") {
    // Dali Kingdom
    composition = [
        {type: "War Elephant", pct: 0.05}, 
        {type: "Poison Crossbowman", pct: 0.25}, 
        {type: "Javelinier", pct: 0.15},
        {type: "Spearman", pct: 0.25}, 
        {type: "Shielded Infantry", pct: 0.30} 
    ];
} else if (faction === "Hong Dynasty") {
    composition = [
{type: "Shielded Infantry", pct: 0.30}, 
        {type: "Heavy Crossbowman", pct: 0.25}, 
        {type: "Rocket", pct: 0.15},
        {type: "Firelance", pct: 0.05}, 
        {type: "Repeater Crossbowman", pct: 0.05}, 
        {type: "Heavy Firelance", pct: 0.05}, 
        {type: "Bomb", pct: 0.05},
        {type: "Archer", pct: 0.05}
    ];
} else if (faction === "Tran Realm") {
    composition = [
        {type: "Firelance", pct: 0.10}, 
        {type: "Poison Crossbowman", pct: 0.25}, 
        {type: "Javelinier", pct: 0.20},
        {type: "Archer", pct: 0.15}, 
        {type: "Spearman", pct: 0.30}
    ];
} else if (faction === "Jinlord Confederacy") {
    composition = [
 {type: "Archer", pct: 0.20}, 
        {type: "Heavy Crossbowman", pct: 0.30},
        {type: "Shielded Infantry", pct: 0.20},
        {type: "Hand Cannoneer", pct: 0.15}, 
        {type: "Heavy Lancer", pct: 0.10}, 
        {type: "Elite Lancer", pct: 0.05}
    ];
} else if (faction === "Xiaran Dominion") {
    composition = [
        {type: "Camel Cannon", pct: 0.20}, 
        {type: "Hand Cannoneer", pct: 0.20}, 
        {type: "Slinger", pct: 0.25},
        {type: "Spearman", pct: 0.20}, 
        {type: "Lancer", pct: 0.15}
    ];
} else if (faction === "Goryun Kingdom") {
    composition = [
		{type: "Archer", pct: 0.40}, 
        {type: "Spearman", pct: 0.20}, 
        {type: "Shielded Infantry", pct: 0.20},
        {type: "Rocket", pct: 0.10}, 
        {type: "Hand Cannoneer", pct: 0.05}, 
        {type: "Repeater Crossbowman", pct: 0.05}
    ];
} else if (faction === "High Plateau Kingdoms") {
    // Tibet-inspired: Heavy on skirmishers and high-altitude endurance
    composition = [
        {type: "Slinger", pct: 0.30}, 
        {type: "Heavy Horse Archer", pct: 0.20}, 
        {type: "Archer", pct: 0.25}, 
        {type: "Shielded Infantry", pct: 0.25}
    ];
} else if (faction === "Yamato Clans") {
    composition = [
        {type: "Glaiveman", pct: 0.40}, 
        {type: "Heavy Two Handed", pct: 0.20}, 
        {type: "Archer", pct: 0.30},
        {type: "Heavy Horse Archer", pct: 0.10}
    ];
} else if (faction === "Bandits") {
    composition = [
        {type: "Militia", pct: 0.70}, 
        {type: "Slinger", pct: 0.15}, 
        {type: "Javelinier", pct: 0.15}
    ];
} else {
    composition = [
        {type: "Shielded Infantry", pct: 0.25}, 
        {type: "Spearman", pct: 0.20}, 
        {type: "Archer", pct: 0.20},
        {type: "Crossbowman", pct: 0.15}, 
        {type: "Lancer", pct: 0.10}, 
        {type: "Light Two Handed", pct: 0.10}
    ];
	}}

    currentBattleData.initialCounts[side] += totalTroops;

   // --- 3. Spawning Engine (Distributed side-by-side) ---
let visualScale = totalTroops > 300 ? 5 : 1; 
let unitsToSpawn = Math.round(totalTroops / visualScale); 

// First, calculate the total width of all "Line" units (non-cavalry)
// This ensures we can center the entire army perfectly.
let totalLineWidth = 0;
const spacingX = 18;
const groupGap = 40; // Pixels between different unit types

composition.forEach(comp => {
    let baseTemplate = UnitRoster.allUnits[comp.type];
    if (baseTemplate && !baseTemplate.role.toLowerCase().includes("cavalry") && !baseTemplate.role.toLowerCase().includes("horse")) {
        let count = Math.round(unitsToSpawn * comp.pct);
        if (count > 0) {
            let unitsPerRow = 15;
            let groupWidth = Math.min(count, unitsPerRow) * spacingX;
            totalLineWidth += groupWidth + groupGap;
        }
    }
});

let currentLineXOffset = -(totalLineWidth / 2);
let spawnedSoFar = 0;

composition.forEach(comp => {
    let count = Math.round(unitsToSpawn * comp.pct);
    if (count === 0 && unitsToSpawn > 0) count = 1;
    count = Math.min(count, unitsToSpawn - spawnedSoFar);
    
    let baseTemplate = UnitRoster.allUnits[comp.type];
    if (!baseTemplate) {
        console.warn(`Unit type ${comp.type} missing! Defaulting to Militia.`);
        baseTemplate = UnitRoster.allUnits["Militia"];
    }

    // Grid Constants
    const unitsPerRow = 15;
    const spacingY = 16;
    const dir = (side === "player") ? -1 : 1;
    const rankDir = (side === "player") ? 1 : -1; 

    // Determine if this is a wing (cavalry) or center-line unit
    const isFlank = baseTemplate.role.toLowerCase().includes("cavalry") || 
                    baseTemplate.role.toLowerCase().includes("horse");

    let groupWidth = Math.min(count, unitsPerRow) * spacingX;
// Locate the loop where units are pushed (inside composition.forEach)
// Replace the calculation for finalX and finalY with this override:

for (let i = 0; i < count; i++) {
    let row = Math.floor(i / unitsPerRow);
    let col = i % unitsPerRow;

    // 1. Get Tactical Position (Vertical lines and Flank X)
    let tacticalX = 0;
    let tacticalY = 0;
    if (typeof getTacticalPosition === 'function') {
        let tPos = getTacticalPosition(baseTemplate.role, side, comp.type);
        tacticalX = tPos.x;
        tacticalY = tPos.y;
    }

    // 2. Calculate X/Y
    let finalX, finalY;

    // =========================================================
    // --- SURGERY: CLUMPED SPAWN FOR SIEGE DEFENDERS ONLY ---
    // =========================================================
    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && side === "enemy") {
        
        // We ignore the grid and the "currentLineXOffset"
        // We use spawnXCenter and spawnY as the "Epicenter" of the clump
        
        const clumpRadius = 120; // How wide the total blob is
        const personalSpace = 12; // Minimum distance between units
        
        // Use a basic spiral or random-in-circle logic
        // Angle is based on the unit index for even distribution, plus high randomness
        let angle = (i * 0.5) + (Math.random() * Math.PI * 2);
        let dist = (Math.sqrt(i) * personalSpace) + (Math.random() * 20);

        finalX = spawnXCenter + Math.cos(angle) * dist;
        finalY = spawnY + Math.sin(angle) * dist;

        // Extra jitter to break up any spiral patterns
        finalX += (Math.random() - 0.5) * 15;
        finalY += (Math.random() - 0.5) * 15;

    } else {
        // --- ORIGINAL GRID LOGIC FOR ALL OTHER SCENARIOS ---
        if (isFlank) {
            let internalX = (col * spacingX) - (groupWidth / 2);
            finalX = spawnXCenter + tacticalX + internalX;
        } else {
            finalX = spawnXCenter + currentLineXOffset + (col * spacingX);
        }

        let gridY = row * spacingY * rankDir;
        finalY = spawnY + tacticalY + gridY;

        // Original Human Jitter
        finalX += (Math.random() - 0.5) * 3;
        finalY += (Math.random() - 0.5) * 2;
    }

    // 4. Create Troop and Push... (Rest of the logic remains the same)
	
	
        let unitStats = Object.assign(
            new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction),
            baseTemplate
        );
        unitStats.morale = 20;    
        unitStats.maxMorale = 20; 
        unitStats.faction = faction;

        battleEnvironment.units.push({
            id: unitIdCounter++,
            side: side,
            faction: faction,
            color: factionColor,
            unitType: comp.type, 
			isCommander: isCmdr, // <--- ADD THIS LINE HERE
			// ADD THIS LINE: Explicitly tag the player's commander
    isPlayer: (side === 'player' && isCmdr),
            stats: unitStats, 
            hp: unitStats.health,
            x: finalX,
            y: finalY,
            target: null,
            state: "idle", 
            animOffset: Math.random() * 100,
            cooldown: 0,
            hasOrders: false
        });
    }

    // If it was a line unit, move the "cursor" for the next group to the right
    if (!isFlank) {
        currentLineXOffset += groupWidth + groupGap;
    }
    
    spawnedSoFar += count;
});
	
	
	
}