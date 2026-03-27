
const canvas = document.getElementById('gameCanvas');
 
let activeCity = null;
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
function resizeCanvasAndResetCamera() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    zoom = Math.max(0.1, Math.min(7, zoom));
}

function logGameEvent(message, type = "general") {
    const logBox = document.getElementById('event-log-container');
    if (!logBox) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    // Add a little arrow and the message
    entry.innerHTML = `<span class="log-time">▶</span> ${message}`;

    logBox.appendChild(entry);

    // Keep memory clean: remove the oldest logs if we exceed 40 entries
    while (logBox.children.length > 40) {
        logBox.removeChild(logBox.firstChild);
    }

    // Auto-scroll to the bottom so the newest event is always visible
    logBox.scrollTop = logBox.scrollHeight;
}


// Run once at start
resizeCanvasAndResetCamera();

// Run ONLY when resizing (NOT every frame)
window.addEventListener('resize', resizeCanvasAndResetCamera);

// Start game initialize

if (typeof initDiplomacy === 'function') {initDiplomacy(FACTIONS);}

 async function initGame() {

    await generateMap(); // wait for map + cities + textures
 
	draw();              
}
	

    // --- WORLD SCALE ---
const WORLD_WIDTH = 18000; 
const WORLD_HEIGHT = 8000;
	// Padding as ratio of world size (e.g., 5% from edges)
const PADDING_X = WORLD_WIDTH * 0.05;   // 5% of width
const PADDING_Y = WORLD_HEIGHT * 0.05;  // 5% of height

    const TILE_SIZE = 8;
    const COLS = Math.floor(WORLD_WIDTH / TILE_SIZE);
    const ROWS = Math.floor(WORLD_HEIGHT / TILE_SIZE);

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = WORLD_WIDTH; 
    bgCanvas.height = WORLD_HEIGHT;
    const bgCtx = bgCanvas.getContext('2d');

 // TO THIS:
var zoom = 0.8;
 
async function setLoading(percent, text) {
    document.getElementById('loading').innerText = `${text} (${percent}%)`;
    // Double requestAnimationFrame forces the browser to physically render the text
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}
    // --- NOISE GENERATOR ---
function hash(x, y) {
        let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
        return n - Math.floor(n);
    }
	
function noise(x, y) {
        let ix = Math.floor(x), iy = Math.floor(y);
        let fx = x - ix, fy = y - iy;
        let ux = fx * fx * (3.0 - 2.0 * fx), uy = fy * fy * (3.0 - 2.0 * fy);
        let n00 = hash(ix, iy), n10 = hash(ix + 1, iy);
        let n01 = hash(ix, iy + 1), n11 = hash(ix + 1, iy + 1);
        let nx0 = n00 * (1 - ux) + n10 * ux;
        let nx1 = n01 * (1 - ux) + n11 * ux;
        return nx0 * (1 - uy) + nx1 * uy;
    }
function fbm(x, y, octaves = 6) {
        let value = 0, amplitude = 0.5, frequency = 1;
        for (let i = 0; i < octaves; i++) {
            value += amplitude * noise(x * frequency, y * frequency);
            frequency *= 2;
            amplitude *= 0.5;
        }
        return value;
    }

const PALETTE = {
        ocean: "#2b4a5f", coastal: "#3a5f75",
        desert: "#bfa373", dune: "#cfae7e",
        plains: "#767950", meadow: "#626b42",
        forest: "#425232", jungle: "#2d3b22",
        highlands: "#826b52", mountains: "#5c4f42", snow: "#d8d3c5"
    };

    const worldMap = [];

     
    
    const TARGET_CITIES = 60; // How many cities to scatter across the map
    const cities = [];
   

     
function calculateMovement(speed, map, tileSize, cols, rows, isCity = false) {
    // --- NEW: SIEGE LOCK ---
    if (player.isSieging && !inBattleMode) {
        player.isMoving = false;
        return; // Completely bypass all movement logic
    }
    
	// --- NEW: STUN/TOUCH LOCK ---
    if (player.stunTimer > 0) {
        player.stunTimer--;
        player.isMoving = false;
        return; // Completely bypass all movement logic while stunned
    }
	
    let dx = 0, dy = 0;
    player.isMoving = false;

    // --- 1. TERRAIN SPEED CALCULATION (Original Logic) ---
    let currentSpeed = speed;

    if (!isCity && !inBattleMode) {
        let tx = Math.floor(player.x / tileSize);
        let ty = Math.floor(player.y / tileSize);
        
        // Ensure we are within map bounds before checking tile speed
        if (map[tx] && map[tx][ty]) {
            let tile = map[tx][ty];
            // Use the tile's speed property; default to 1.0
            currentSpeed = speed * (tile.speed || 1.0);
        }
    }
	
	currentSpeed *= 0.5; //player speed modifier
	
    // -----------------------------------------------------
// --- 2. battleINPUT PROCESSING ---

// Check if player is alive before allowing WASD/Arrow movement
if (player.hp > 0) {
    if (keys['w'] || keys['arrowup']) { dy -= currentSpeed; player.isMoving = true; }
    if (keys['s'] || keys['arrowdown']) { dy += currentSpeed; player.isMoving = true; }
    if (keys['a'] || keys['arrowleft']) { dx -= currentSpeed; player.isMoving = true; }
    if (keys['d'] || keys['arrowright']) { dx += currentSpeed; player.isMoving = true; }
} else {
    // If dead, ensure the moving state is killed so animations stop
    player.isMoving = false;
}

if (player.isMoving) player.anim++;

// Calculate the intended destination
// (dx and dy will remain 0 if the player is dead, keeping nextX/Y equal to current position)
let nextX = player.x + dx;
let nextY = player.y + dy;
    // --- 3. SURGERY: MOVEMENT LOGIC & BOUNDARIES ---
    
    if (inBattleMode) {
        // -> THE FIX: Save the old coordinates BEFORE we move the player!
        let oldX = player.x;
        let oldY = player.y;

        // --- BATTLEFIELD INVISIBLE WALL ---
        // Clamp the destination so the player never crosses the 0 or Max bounds
        player.x = Math.max(0, Math.min(nextX, BATTLE_WORLD_WIDTH));
        player.y = Math.max(0, Math.min(nextY, BATTLE_WORLD_HEIGHT));
   
        // --- THE FIX FOR CAVSCRIPT ---
        // Find the actual Commander unit in the battle array to sync animations
        let cmdUnit = battleEnvironment.units.find(u => u.isCommander);
        if (cmdUnit) {
            // Update the Commander's physical position to match the player object
            cmdUnit.x = player.x;
            cmdUnit.y = player.y;

            // Calculate Velocity: This now works because oldX and oldY exist!
            cmdUnit.vx = cmdUnit.x - oldX;
            cmdUnit.vy = cmdUnit.y - oldY;

            // Set the state so the renderer knows which animation to play
            if (player.isMoving) {
                cmdUnit.state = "moving";
            } else if (cmdUnit.state !== "attacking") {
                cmdUnit.state = "idle";
                cmdUnit.vx = 0;
                cmdUnit.vy = 0;
            }
        }
   } 
    else if (!isCity) {
        // --- WORLD MAP COLLISION (Original Logic) ---
        let ntx = Math.floor(nextX / tileSize);
        let nty = Math.floor(nextY / tileSize);
        
        if (ntx >= 0 && ntx < cols && nty >= 0 && nty < rows) {
            // Check if destination is impassable (like Deep Ocean)
            if (!map[ntx][nty].impassable) {
                player.x = nextX;
                player.y = nextY;
            }
        }
    } else {
        // --- CITY/INTERIOR MOVEMENT ---
        let withinX = (nextX > 50 && nextX < CITY_WORLD_WIDTH - 50);
        let withinY = (nextY > 50); 

        if (withinX && withinY) {
            if (typeof isCityCollision === 'function') {
                if (!isCityCollision(nextX, nextY)) {
                    player.x = nextX;
                    player.y = nextY;
                }
            } else {
                player.x = nextX;
                player.y = nextY;
            }
        }
    }

}


function populateCities() {
        console.log("Settling the Empire...");
        let attempts = 0;
        
        while(cities.length < TARGET_CITIES && attempts < 10000) {
            attempts++;
            
            // Random coordinates, keeping a 1000px padding from the absolute map edges

			let cx = Math.floor(Math.random() * (WORLD_WIDTH - 2 * PADDING_X)) + PADDING_X;
			let cy = Math.floor(Math.random() * (WORLD_HEIGHT - 2 * PADDING_Y)) + PADDING_Y;
						
            let tx = Math.floor(cx / TILE_SIZE);
            let ty = Math.floor(cy / TILE_SIZE);
            
            if (!worldMap[tx] || !worldMap[tx][ty]) continue;
            let tile = worldMap[tx][ty];

 
                if(!tile.impassable && tile.name !== "River" && tile.name !== "Coastal" && tile.name !== "Ocean") { 
                // Check distance to other cities (Prevent clumping / overlapping)
                let tooClose = false;
                for(let c of cities) {
                    if(Math.hypot(c.x - cx, c.y - cy) < 400) { // Min 400px between cities
                        tooClose = true; 
                        break; 
                    }
                }

				if(!tooClose) {
					let newCity = {
						name: "Settlement", // Placeholder
						pop: Math.floor(Math.random() * 80000) + 5000, // Slightly higher range for 13th c.
						x: cx,
						y: cy,
						radius: 25 
						
					};
					
					// This now sets the Faction, Name, Gold, Food, and Military/Civilian split
					initializeCityData(newCity, WORLD_WIDTH, WORLD_HEIGHT);
					
					cities.push(newCity);
				}
            }
        }
        console.log(`Successfully generated ${cities.length} dynamic cities.`);
    }
	
	
// --- PROCEDURAL GENERATION & BAKING ---

async function generateMap() {
    console.log("Generating Base Topography...");
    for (let i = 0; i < COLS; i++) {
        if (i % 50 === 0) {
            let percent = Math.floor((i / COLS) * 60);
            await setLoading(percent, "Generating terrain, be patient!");
        }

        worldMap[i] = [];
		
		
        for (let j = 0; j < ROWS; j++) {
            let nx = i / COLS; 
            let ny = j / ROWS;
            
            // --- DOMAIN WARPING (The Secret to Jaggedness) ---
            let warpX = nx + (fbm(nx * 8, ny * 8) - 0.5) * 0.1;
            let warpY = ny + (fbm(nx * 8 + 10, ny * 8 + 10) - 0.5) * 0.1;
// --- 1. BASE ELEVATION & REGIONAL BIOMES (Enhanced) ---
            let e = Math.pow(fbm(warpX * 3.5, warpY * 3.5) * 2.2, 1.3) * 0.22; 
            e += fbm(warpX * 20, warpY * 20) * 0.02;

            let m = fbm(warpX * 4 + 10, warpY * 4 + 10); 
            let isJapanRegion = false;

            // --- SURGERY 2: MONGOLIA / NW SILK ROAD DIVERSITY ---
            if (warpX < 0.45 && warpY < 0.4) {
                m -= 0.3; // Drier, but not pure dead desert
                
                // Add rolling Steppe Hills (pop up elevation slightly)
                let steppeHills = fbm(warpX * 25, warpY * 25);
                if (steppeHills > 0.6) {
                    e += (steppeHills - 0.6) * 0.3; // Creates rocky outcrops/highlands
                }

                // Shrublands instead of dense forests
                if (fbm(warpX * 30, warpY * 30) > 0.72) {
                    m += 0.3; // Just enough moisture for scrub/light forest
                }
            }
            if (warpY > 0.65) m += 0.4; // SW/SE: Jungles
			
			

            // --- SURGERY 3: CENTRAL NORTH CHINA (LOESS PLATEAU) ---
            let centralNorthDist = Math.hypot((warpX - 0.45), (warpY - 0.45));
            if (centralNorthDist < 0.15) {
                // Carve jagged badlands/ravines using absolute value noise
                let badlandsNoise = Math.abs(fbm(warpX * 35, warpY * 35) - 0.5) * 2.0; 
                // Only raise elevation toward the center of the plateau
                e += (0.15 - centralNorthDist) * badlandsNoise * 0.9; 
                m -= 0.1; // Keep it relatively dry
            }
			
			

// --- 2. THE MAINLAND MASS (Jagged Coastlines) ---
// Add noise to the coast variable itself to create peninsulas and bays
let coastNoise = (fbm(warpX * 10, warpY * 10) - 0.5) * 0.12;
let mainlandCoast = 0.65 + (fbm(warpY * 5, 0) - 0.5) * 0.2 + coastNoise; 

let mainlandMask = 1.0 - smoothstep(mainlandCoast - 0.08, mainlandCoast + 0.08, warpX);

if (warpX < mainlandCoast + 0.1) {
    e += mainlandMask * 0.45; 
}

            // --- 3. THE HIMALAYAS & YUNNAN ---
            let himalayaMask = Math.max(0, 1.2 - Math.hypot((warpX - 0.15) * 2, (warpY - 0.65) * 1.5) * 2.5);
            let yunnanMask = Math.max(0, 1.0 - Math.hypot((warpX - 0.45) * 2, (warpY - 0.75) * 2) * 3.0);
            let regionalMountainStrength = himalayaMask + (yunnanMask * 0.6);

           // --- SURGERY 1: NORTHEAST ASIA GRADUAL TRANSITION ---
            if (warpY < 0.45) {
                // Smoothly blend from 0 to 1 between X=0.45 (Plains) and X=0.60 (Jurchen Core)
                let blendStart = 0.45;
                let blendEnd = 0.60;
                let forestBlend = Math.max(0, Math.min(1, (warpX - blendStart) / (blendEnd - blendStart)));

                if (forestBlend > 0) {
                    let neNoise = fbm(warpX * 12, warpY * 12);
                    let targetElevation = 0.42 + neNoise * 0.12; // The solid land floor
                    
                    // Smoothly transition elevation, moisture, and mountain fading
                    e = e * (1 - forestBlend) + Math.max(e, targetElevation) * forestBlend;
                    m += forestBlend * 0.5; // Gradually gets wetter
                    regionalMountainStrength *= (1 - forestBlend); // Mountains slowly fade into hills
                    
                    // Cap elevation in the deepest forest so it doesn't become snowy peaks
                    if (forestBlend > 0.8 && e > 0.55) {
                        e = 0.55; 
                    }
				}
			}
            // --- 5. THE BOHAI/YELLOW SEA CARVE ---
            // We dig a hole *between* China and where Korea will be to ensure water separation
            let yellowSeaDist = Math.hypot(warpX - 0.68, warpY - 0.42);
            if (yellowSeaDist < 0.08) {
                e = Math.min(e, 0.2 + fbm(warpX*10, warpY*10)*0.1); // Force water
            }

            // --- 6. THE KOREAN PENINSULA ---
            // A dedicated structural line dropping down from the Jurchen lands
            if (warpY >= 0.38 && warpY <= 0.62 && warpX > 0.65) {
                let kLineProgress = (warpY - 0.38) / 0.24; // 0 to 1 down the peninsula
                let kCenterX = 0.73 + (kLineProgress * 0.04); // Slightly angles eastward
                let kDistToCenter = Math.abs(warpX - kCenterX);
                let kWidth = 0.035 - (kLineProgress * 0.02); // Tapers to a point at the south
                
                if (kDistToCenter < kWidth) {
                    let kShatter = fbm(warpX * 20, warpY * 20) * 0.15;
                    e = Math.max(e, 0.45 + kShatter + (0.05 * (1 - kLineProgress))); // Higher in the north, tapers down
                    m += 0.3; // Mixed terrain (Lush)
                    
                    // Add a specific, small mountain spine down the east coast of Korea (Taebaek Mountains)
                    if (warpX > kCenterX && kShatter > 0.08) {
                        e += 0.15; 
                    }
                }
            }

            // --- 7. JAPAN (Bottom Right Corner ONLY) ---
            // Anchored strictly to the extreme bottom right
            let japanDist = Math.hypot((warpX - 0.95), (warpY - 0.85));
            if (japanDist < 0.18 && warpX > 0.85 && warpY > 0.65) {
                let islandShatter = fbm(warpX * 25, warpY * 25); 
                if (islandShatter > 0.4) {
                    isJapanRegion = true;
                    e = Math.max(e, 0.42 + (islandShatter * 0.35)); // Islands popping up
                    m += 0.6; // Lush Japanese forests
                    if (islandShatter > 0.8) e += 0.2; // Mt. Fuji style peaks
                }
            } else if (warpX > 0.78 && !isJapanRegion && warpY > 0.3) {
                // Ensure the rest of the eastern map is definitely the Sea of Japan / Pacific
                e = Math.min(e, 0.25); 
            }

            // --- 8. MOUNTAIN SPAWNING (Filtered) ---
            if (regionalMountainStrength > 0) {
                e += (regionalMountainStrength * 0.7) * fbm(warpX * 12, warpY * 12);
            }

            // --- 9. THE GREAT RIVERS (Yangtze & Yellow River) ---
            let isMacroRiver = false;
            
            // Only draw rivers if we are on land (not ocean, not snowy peaks)
            if (e > 0.35 && e < 0.7) {
                // A. Yangtze River (Sweeping southern curve)
                // Starts West, dips South, exits East near X=0.7
                let yangtzeY = 0.58 + (Math.sin(warpX * 6) * 0.08) - (warpX * 0.02);
                let distToYangtze = Math.abs(warpY - yangtzeY);

                // B. Yellow River (The Ordos Loop)
                // Creates that distinct massive square hump in Northern China
                let yellowY = 0.45 - (Math.sin(warpX * 8) * 0.12 * Math.sin(warpX * 3.14));
                let distToYellow = Math.abs(warpY - yellowY);

                // River gets slightly wider as it goes East
                let riverWidth = 0.002 + (warpX * 0.002); 
                
                // Add noise to the edges so they aren't perfect geometric lines
                let riverEdgeNoise = fbm(warpX * 30, warpY * 30) * 0.003;

                if (distToYangtze < (riverWidth + riverEdgeNoise) || distToYellow < (riverWidth + riverEdgeNoise)) {
                    isMacroRiver = true;
                    e = 0.36; // Flatten out to river level
                }
            }

            // --- 10. RANDOM PROCEDURAL RIVERS ---
            let procRiverNoise = Math.abs(fbm(warpX * 8 + 5, warpY * 8 + 5) - 0.5) * 2;
            let riverThreshold = 0.015 + Math.max(0, (0.5 - e) * 0.08); 
            let isProcRiver = (e >= 0.35 && e < 0.65 && procRiverNoise < riverThreshold && !isMacroRiver);

            // --- 11. TILE ASSIGNMENT & COASTAL RULES ---
            let tile = { id: 0, color: "", speed: 1.0, impassable: false, name: "", isJapan: isJapanRegion };
            tile.e = e; 

            if (e < 0.25) {
                tile.name = "Ocean"; tile.color = PALETTE.ocean; tile.speed = 2.0; 
            } else if (e < 0.35) {
                tile.name = "Coastal"; tile.color = PALETTE.coastal; tile.speed = 1.8; 
            } else if (isMacroRiver || isProcRiver) {
                tile.name = "River"; tile.color = PALETTE.coastal; tile.speed = 1.9;
            } else if (e < 0.48) {
                if (m > 0.5) { tile.name = "Forest"; tile.color = PALETTE.forest; tile.speed = 0.47; } 
                else { tile.name = "Plains"; tile.color = PALETTE.plains; tile.speed = 0.55; }
            } else {
                if (e > 0.85 && himalayaMask > 0.2) {
                    tile.name = "Snowy Peaks"; tile.color = PALETTE.snow || "#ffffff"; tile.speed = 0.0; tile.impassable = true;
                } else if (e > 0.75 && regionalMountainStrength > 0.1) {
                    tile.name = "Snowy Mountains"; tile.color = PALETTE.snowyMountains || "#c6d0d6"; tile.speed = 0.15;
                } else if (e > 0.65 && (regionalMountainStrength > 0 || isJapanRegion || warpX > 0.7)) {
                    // Added warpX > 0.7 here to allow the Taebaek Korean mountains to render properly
                    tile.name = "Mountains"; tile.color = PALETTE.mountains; tile.speed = 0.25;
                } else if (e > 0.58) {
                    tile.name = "Highlands"; tile.color = PALETTE.highlands; tile.speed = 0.4;
                } else {
                    if (m < 0.3 && warpY < 0.45) {
                        tile.name = e > 0.53 ? "Dunes" : "Desert"; tile.color = e > 0.53 ? PALETTE.dune : PALETTE.desert; tile.speed = 0.53;
                    } else if (m > 0.7) {
                        tile.name = "Dense Forest"; tile.color = PALETTE.jungle; tile.speed = 0.24;
                    } else if (m > 0.45) {
                        tile.name = "Forest"; tile.color = PALETTE.forest; tile.speed = 0.47;
                    } else {
                        tile.name = "Plains"; tile.color = PALETTE.plains; tile.speed = 0.55;
                    }
                }
            }
            
            worldMap[i][j] = tile;
            bgCtx.fillStyle = tile.color;
            bgCtx.fillRect(i * TILE_SIZE, j * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
	
 await setLoading(65, "Adding terrain textures");
        console.log("Adding Artistic Textures and Features...");
		
		
		
// --- UPDATED PAINTING LOOP ---
for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
        let tile = worldMap[i][j];
        let px = i * TILE_SIZE;
        let py = j * TILE_SIZE;
        let nx = i / COLS;
        let ny = j / ROWS;

        // 1. DYNAMIC FOREST FADE (Jurchen/Northeast)
        if (tile.name.includes("Forest")) {
            // How deep into the Jurchen lands are we? (0.0 at Mongol border, 1.0 at Core)
            let jurchenFade = Math.max(0, Math.min(1, (nx - 0.45) / 0.25));
            
            // DENSITY: Sparse (0.5) at the edge, Thick (0.05) at the core
            let densityThreshold = 0.5 - (jurchenFade * 0.45); 

            if (Math.random() > densityThreshold) {
                bgCtx.fillStyle = tile.color === PALETTE.jungle ? "#232e1a" : "#364528";
                bgCtx.beginPath();
                // SIZE: Smaller trees at the "fading" edge, larger in the core
                let treeSize = TILE_SIZE * (0.3 + (jurchenFade * 0.5));
                bgCtx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, treeSize, 0, Math.PI, true);
                bgCtx.fill();
            }
        } 
        
        // 2. NORTHERN CHINA & MONGOLIA SPARSE TREES
        else if (tile.name === "Highlands") {
            let isNorthChina = (nx > 0.3 && nx < 0.7 && ny > 0.3 && ny < 0.6);
            let isMongolia = (nx < 0.45 && ny < 0.4);
            
            // If in North China or Mongolia, add very rare sparse "lone trees"
            if ((isNorthChina || isMongolia) && Math.random() > 0.985) {
                bgCtx.fillStyle = "#4a5d3a"; // Slightly lighter "temperate" tree
                bgCtx.beginPath();
                bgCtx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE * 0.3, 0, Math.PI, true);
                bgCtx.fill();
            } 
            // Standard ground texture for the rest
            else if (Math.random() > 0.85) {
                bgCtx.fillStyle = "rgba(0,0,0,0.04)";
                bgCtx.fillRect(px + Math.random()*TILE_SIZE, py + Math.random()*TILE_SIZE, 1, 1);
            }
        }
    
else if(tile.name === "Plains" || tile.name === "Desert") {
    let nx = i / COLS;
    let ny = j / ROWS;

    // Check if we are in the Inner Mongolia / NW region
    if (nx < 0.45 && ny < 0.4 && Math.random() > 0.96) {
        // Draw a tiny, sparse tree (a dark green dot or small arc)
        bgCtx.fillStyle = "#364528";
        bgCtx.beginPath();
        bgCtx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE * 0.4, 0, Math.PI * 2);
        bgCtx.fill();
    } else if(Math.random() > 0.8) {
        // Standard grit/sand texture
        bgCtx.fillStyle = "rgba(0,0,0,0.03)";
        bgCtx.beginPath();
        bgCtx.arc(px + Math.random()*TILE_SIZE, py + Math.random()*TILE_SIZE, Math.random()*3+1, 0, Math.PI*2);
        bgCtx.fill();
    }
}
else if (tile.name !== "Ocean" && tile.name !== "River") {
            // --- GENERIC GRASS TUFTS ---
            // Catch-all for any land tiles that didn't get specific textures above
            if (Math.random() > 0.94) { // Rare enough to not look like noise
                bgCtx.strokeStyle = "rgba(30, 50, 20, 0.3)"; // Subtle dark organic green
                bgCtx.lineWidth = 1;
                
                let gx = px + Math.random() * TILE_SIZE;
                let gy = py + Math.random() * TILE_SIZE;

                bgCtx.beginPath();
                // Draw a simple 2-blade grass tuft
                bgCtx.moveTo(gx, gy);
                bgCtx.lineTo(gx - 1.5, gy - 3);
                bgCtx.moveTo(gx, gy);
                bgCtx.lineTo(gx + 1.5, gy - 2.5);
                bgCtx.stroke();
            }
        }

// --- UPDATED FOREST TEXTURE LOGIC ---
if(tile.name.includes("Forest")) {
    let nx = i / COLS;
    let ny = j / ROWS;
    
    // Calculate Jurchen Influence (0.0 at Mongol border, 1.0 at Jurchen core)
    // Transition zone starts at X=0.45 and ends at X=0.65
    let jurchenFade = Math.max(0, Math.min(1, (nx - 0.45) / 0.20));

    // Calculate dynamic density: 
    // 0.40 (Sparse) at the Mongol side
    // 0.02 (Extremely Dense) at the Jurchen core
    let densityThreshold = 0.40 - (jurchenFade * 0.38); 

    if(Math.random() > densityThreshold) { 
        bgCtx.fillStyle = tile.color === PALETTE.jungle ? "#232e1a" : "#364528";
        bgCtx.beginPath();
        // Slightly vary tree size based on influence to make edges feel "younger/smaller"
        let treeSize = TILE_SIZE * (0.5 + (jurchenFade * 0.3));
        bgCtx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, treeSize, 0, Math.PI, true);
        bgCtx.fill();
        
        bgCtx.strokeStyle = "rgba(0,0,0,0.3)";
        bgCtx.lineWidth = 1;
        bgCtx.stroke();
    }
}
                
                // --- MOUNTAIN ICONS (SPARSE & OPTIMIZED) ---
                if(tile.name.includes("Mountain") || tile.name.includes("Snowy")) {
                    // CRITICAL FIX: Drastically reduce painting density. 
                    // Snowy peaks (Himalayas) get 8%, regular mountains get 3%.
                    let spawnThreshold = tile.name.includes("Snowy") ? 0.92 : 0.97;

                    if(hash(i, j) > spawnThreshold) {
                        
                        // 1. PROXIMITY CHECK: Don't draw if touching Ocean or River
                        let isNearWater = false;
                        for (let ni = -1; ni <= 1; ni++) {
                            for (let nj = -1; nj <= 1; nj++) {
                                let neighbor = worldMap[i + ni] ? worldMap[i + ni][j + nj] : null;
                                if (neighbor && (neighbor.name.includes("Ocean") || neighbor.name === "River")) {
                                    isNearWater = true; 
                                    break;
                                }
                            }
                        }
                        if (isNearWater) continue;

                        let randomXOffset = (Math.random() - 0.5) * 120; 
                        let randomYOffset = (Math.random() - 0.5) * 120; 
                        let finalPx = px + randomXOffset;
                        let finalPy = py + randomYOffset;

                        // 2. TONE DOWN PEAKS: Lower height multiplier and wider base
                        let randomHeightVar = (Math.random() - 0.5) * 15; 
                        let randomWidthVar = (Math.random() - 0.5) * 30; 
                        let height = Math.max(8, (tile.e - 0.5) * 25 + 5 + randomHeightVar);
                        let width = TILE_SIZE * 5.5 + randomWidthVar; // Wider base

                        // 3. FADED LINES: Start with lower base alpha
                        let alpha = 0.75; 
                        
                        // Edge Tapering logic
                        let edge_taper_pad = 500;
                        if (px < edge_taper_pad) alpha = Math.min(alpha, px / edge_taper_pad);
                        if (px > WORLD_WIDTH - edge_taper_pad) alpha = Math.min(alpha, (WORLD_WIDTH - px) / edge_taper_pad);
                        if (py < edge_taper_pad) alpha = Math.min(alpha, py / edge_taper_pad);
                        if (py > WORLD_HEIGHT - edge_taper_pad) alpha = Math.min(alpha, (WORLD_HEIGHT - py) / edge_taper_pad);

                        if (py >= 1800 && py <= 2100) alpha = Math.min(alpha, 0.5 * (1 - (py - 1800) / 300));
                        if (py > 3600 && px > 6000) alpha = Math.min(alpha, 0.15);

                        bgCtx.save();
                        bgCtx.globalAlpha = alpha;
                        bgCtx.shadowBlur = 15; // Softened shadow
                        bgCtx.shadowColor = 'rgba(0,0,0,0.3)';

                        // 4. DRAWING THE BUMP
                        bgCtx.fillStyle = "#3e342a"; 
                        bgCtx.beginPath();
                        bgCtx.moveTo(finalPx - width/2, finalPy + TILE_SIZE);
                        bgCtx.lineTo(finalPx, finalPy + TILE_SIZE - height);
                        bgCtx.lineTo(finalPx + width/2, finalPy + TILE_SIZE);
                        bgCtx.fill();

                        // Color Assignment
                        if (tile.name === "Snowy Peaks") {
                            bgCtx.fillStyle = "#ffffff";
                        } else if (tile.name === "Snowy Mountains") {
                            bgCtx.fillStyle = "#d4dee2"; 
                        } else {
                            bgCtx.fillStyle = "#756654";
                        }

                        // Secondary slope for visual depth
                        bgCtx.beginPath();
                        bgCtx.moveTo(finalPx - width * 0.4, finalPy + TILE_SIZE);
                        bgCtx.lineTo(finalPx, finalPy + TILE_SIZE - height);
                        bgCtx.lineTo(finalPx + width * 0.1, finalPy + TILE_SIZE);
                        bgCtx.fill();

                        // 5. FADED OUTLINES: Use very low opacity for the stroke
                        bgCtx.strokeStyle = "rgba(0,0,0,0.15)"; 
                        bgCtx.lineWidth = 1.0;
                        bgCtx.beginPath();
                        bgCtx.moveTo(finalPx - width/2, finalPy + TILE_SIZE);
                        bgCtx.lineTo(finalPx, finalPy + TILE_SIZE - height);
                        bgCtx.lineTo(finalPx + width/2, finalPy + TILE_SIZE);
                        bgCtx.stroke();

                        bgCtx.restore();
                    }
                }
            }
        }

        await setLoading(85, "Aging parchment map");
        console.log("Applying Parchment Vignette...");
        bgCtx.globalCompositeOperation = "multiply";
        bgCtx.fillStyle = "#e0c9a3"; 
        bgCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        let gradient = bgCtx.createRadialGradient(
            WORLD_WIDTH/2, WORLD_HEIGHT/2, WORLD_HEIGHT*0.3, 
            WORLD_WIDTH/2, WORLD_HEIGHT/2, WORLD_WIDTH*0.6
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(0.7, "rgba(139, 69, 19, 0.4)"); 
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        bgCtx.globalCompositeOperation = "source-over";

        await setLoading(92, "Founding cities");
        populateCities();
        await setLoading(97, "Spawning caravans");
        initializeNPCs(cities, worldMap, TILE_SIZE, COLS, ROWS, PADDING_X, PADDING_Y);

        await setLoading(98, "Generating Settlements...");
        await initAllCities(FACTIONS);

        if (cities.length > 0) {
            player.x = WORLD_WIDTH * (0.6 + (Math.random() * 0.04 - 0.02));
            player.y = WORLD_HEIGHT * (0.6 + (Math.random() * 0.04 - 0.02));
        } else {
            player.x = WORLD_WIDTH / 2;
            player.y = WORLD_HEIGHT / 2;
        }

        document.getElementById('ui').style.display = 'block';
        document.getElementById('loading').style.display = 'none';

        AudioManager.playMusic("WorldMap_Calm");
    }

function smoothstep(edge0, edge1, x) {
    // Scales, clamps and interpolates x into a 0.0 to 1.0 range
    let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}