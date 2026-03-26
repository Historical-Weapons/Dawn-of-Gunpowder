
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
const WORLD_WIDTH = 12000; 
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

// CRITICAL CHECK: Fixed to prevent Atlantis (no cities in the Ocean!)
                if(!tile.impassable && tile.name !== "River" && tile.name !== "Coastal" && tile.name !== "Snowy Peaks" && tile.name !== "Ocean") { 
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
        for(let i=0; i<COLS; i++) {
			    if(i % 50 === 0){
				let percent = Math.floor((i / COLS) * 60);
				await setLoading(percent, "Generating terrain");
				}
				
            worldMap[i] = [];
            for(let j=0; j<ROWS; j++) {
                let nx = i / COLS; 
                let ny = j / ROWS;
                let e = fbm(nx * 5, ny * 5);
                let m = fbm(nx * 4 + 10, ny * 4 + 10);
                let r = Math.abs(fbm(nx * 10 + 5, ny * 10 + 5) - 0.5) * 2;
                let distToEast = nx;
                // --- REVISION: Added Noise Warp ---
                let distToNW = Math.sqrt(nx*nx + ny*ny);
                let fuzzyDist = distToNW + (fbm(nx * 3, ny * 3, 3) - 0.5) * 0.25;
                
                e -= Math.pow(distToEast, 3) * 0.4;
                let tile = { id: 0, color: "", speed: 1.0, name: "" };

				if (e < 0.25) {
                    // OCEAN: Fast travel for ships, no longer impassable
                    tile.name = "Ocean"; 
                    tile.color = PALETTE.ocean; 
                    tile.speed = 2.0; // High speed for open-sea sailing
                    tile.impassable = false; 
                } else if (e < 0.3) {
                    // COASTAL: Transition zone
                    tile.name = "Coastal"; 
                    tile.color = PALETTE.coastal; 
                    tile.speed = 1.8; // Slightly slower due to shallows/reefs
                    tile.impassable = false;
                } else {
                    if (r < 0.03 && e < 0.6) {
                        tile.name = "River"; tile.color = PALETTE.coastal; tile.speed = 1.9;
                    } else if (e > 0.7) {
                        tile.name = m > 0.6 ? "Snowy Peaks" : "Mountains";
                        tile.color = m > 0.6 ? PALETTE.snow : PALETTE.mountains; tile.speed = 0.2;
                    } else if (e > 0.55) {
                        tile.name = "Highlands"; tile.color = PALETTE.highlands; tile.speed = 0.4;
                  } else {
                        // --- REVISION: Use fuzzyDist for organic border ---
                        if (fuzzyDist < 0.38) {
                            tile.name = e > 0.42 ? "Dunes" : "Desert";
                            tile.color = e > 0.42 ? PALETTE.dune : PALETTE.desert; tile.speed = 0.53;
                        } else if (m > 0.6) {
                            tile.name = "Dense Forest"; tile.color = PALETTE.jungle; tile.speed = 0.24;
                        } else if (m > 0.45) {
                            tile.name = "Forest"; tile.color = PALETTE.forest; tile.speed = 0.47;
                        } else {
                            tile.name = "Plains"; tile.color = PALETTE.plains; tile.speed = 0.55;
                        }
                    }
                }
                
                tile.e = e; 
                worldMap[i][j] = tile;
                bgCtx.fillStyle = tile.color;
                bgCtx.fillRect(i * TILE_SIZE, j * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
	await setLoading(65, "Adding terrain textures");
		
        console.log("Adding Artistic Textures and Features...");
	
        for(let j=0; j<ROWS; j++) {
		
		    if(j % 80 === 0){
								let percent = 65 + Math.floor((j / ROWS) * 15);
								await setLoading(percent, "Painting terrain");
							}
            for(let i=0; i<COLS; i++) {
                let tile = worldMap[i][j];
                let px = i * TILE_SIZE;
                let py = j * TILE_SIZE;

                if(tile.name === "Plains" || tile.name === "Desert") {
                    if(Math.random() > 0.8) {
                        bgCtx.fillStyle = "rgba(0,0,0,0.03)";
                        bgCtx.beginPath();
                        bgCtx.arc(px + Math.random()*TILE_SIZE, py + Math.random()*TILE_SIZE, Math.random()*3+1, 0, Math.PI*2);
                        bgCtx.fill();
                    }
                }
                if(tile.name.includes("Forest")) {
                    if(Math.random() > 0.3) { 
                        bgCtx.fillStyle = tile.color === PALETTE.jungle ? "#232e1a" : "#364528";
                        bgCtx.beginPath();
                        bgCtx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE * 0.8, 0, Math.PI, true);
                        bgCtx.fill();
                        bgCtx.strokeStyle = "rgba(0,0,0,0.3)";
                        bgCtx.lineWidth = 1;
                        bgCtx.stroke();
                    }
                }
                if(tile.name.includes("Mountain") || tile.name === "Snowy Peaks") {
                    if(hash(i, j) > 0.4) {
                        let height = (tile.e - 0.5) * 60 + Math.random() * 10;
                        let width = TILE_SIZE * 2.5;
                        
                        bgCtx.fillStyle = "#3e342a"; 
                        bgCtx.beginPath();
                        bgCtx.moveTo(px, py + TILE_SIZE);
                        bgCtx.lineTo(px + width/2, py + TILE_SIZE - height);
                        bgCtx.lineTo(px + width, py + TILE_SIZE);
                        bgCtx.fill();

                        bgCtx.fillStyle = tile.name === "Snowy Peaks" ? "#e0ded7" : "#756654";
                        bgCtx.beginPath();
                        bgCtx.moveTo(px - width*0.2, py + TILE_SIZE);
                        bgCtx.lineTo(px + width/2, py + TILE_SIZE - height);
                        bgCtx.lineTo(px + width/2 + width*0.1, py + TILE_SIZE);
                        bgCtx.fill();

                        bgCtx.strokeStyle = "rgba(0,0,0,0.6)";
                        bgCtx.lineWidth = 1.5;
                        bgCtx.beginPath();
                        bgCtx.moveTo(px - width*0.2, py + TILE_SIZE);
                        bgCtx.lineTo(px + width/2, py + TILE_SIZE - height);
                        bgCtx.lineTo(px + width, py + TILE_SIZE);
                        bgCtx.stroke();
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

		// Generate the cities now that the map is ready
		await setLoading(92, "Founding cities");
        populateCities();
        await setLoading(97, "Spawning caravans");
        // --- NEW: Initialize Faction NPCs ---
       initializeNPCs(cities, worldMap, TILE_SIZE, COLS, ROWS, PADDING_X, PADDING_Y);
		
		 

		await setLoading(98, "Generating Settlments...");
		await initAllCities(FACTIONS);
 
    
		// AFTER city generation (around line 300-400 of engine.js)
		if (cities.length > 0) {
player.x = WORLD_WIDTH * (0.6 + (Math.random() * 0.04 - 0.02));
player.y = WORLD_HEIGHT * (0.6 + (Math.random() * 0.04 - 0.02));
		} else {
			// Fallback to center of world if no cities
			player.x = WORLD_WIDTH / 2;
			player.y = WORLD_HEIGHT / 2;
		}

		// Reveal UI
		document.getElementById('ui').style.display = 'block';
		document.getElementById('loading').style.display = 'none';

		
		// ---> PASTE HERE <---
AudioManager.playMusic("WorldMap_Calm");
 
    }

// --- REVISION: Added Animation State ---
const player = {
				x: WORLD_WIDTH * 0.5,
				y: WORLD_HEIGHT * 0.45,
				baseSpeed: 15, // Store the original speed here
				speed: 15,
				size: 24,
				isMoving: false,
				stunTimer: 0, // <--- ADD THIS HERE
				anim: 0,
				color: "#ffffff", 
				troops: 100,
				food: 100,
				maxFood: 2000,   // Increase this cap significantly
				gold: 500,
				experience: 0,
			experienceLevel: 1,
			maxHealth: 100, // Ensure the player has a cap
			hp: 100,
			meleeAttack: 15, // Base stats for the player
			meleeDefense: 15,
				distTrack: 0, // <--- NEW: Track distance for food mechanic
				
		 
				faction: "Player's Kingdom",
				enemies: ["Bandits"], // Bandits are hostile by default
				
			roster: Array(100).fill("Militia").map(u => ({ type: u, exp: 1 }))
			//	roster: [
		//	"Militia", "Crossbowman", "Heavy Crossbowman", "Bomb", "Spearman", 
		//	"Firelance", "Heavy Firelance", "Archer", "Horse Archer", "Heavy Horse Archer", 
		//	"Shielded Infantry", "Light Two Handed", "Heavy Two Handed", "Lancer", 
		//	"Heavy Lancer", "Elite Lancer", "Rocket", "Mangudai", "Hand Cannoneer", 
		//	"Camel Cannon", "Poison Crossbowman", "War Elephant", "Repeater Crossbowman", 
	//		"Slinger", "Glaiveman", "Javelinier"
	//	].map(u => ({ type: u, exp: 1 })),

    };
	const keys = {};

// 1. ADD THIS: Tell the game when a key is pressed!
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;

window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;
window.onwheel = (e) => {
    // 1. SURGICAL FIX: Prevent map zoom if Diplomacy/Parle UI is open
    if (typeof inParleMode !== 'undefined' && inParleMode) {
        return; // Allow the table to scroll, but stop the map from zooming
    }

    // 2. If player scrolls normally, cancel cinematic instantly
    if (window.isZoomAnimating) { 
        window.isZoomAnimating = false; 
    }      
    zoom = Math.max(0.1, Math.min(3, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
};

 function drawCaravan(x, y, moving, frame, factionColor = "#d4b886") {
        ctx.save();
        ctx.translate(x, y);
        
        let legSwing = moving ? Math.sin(frame * 0.2) * 8 : 0;
        let bob = moving ? Math.sin(frame * 0.2) * 2 : 0;
        let riderBob = moving ? Math.sin(frame * 0.2 + 0.5) * 1.5 : 0;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // 1. BACK LEGS
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-4, 2); ctx.lineTo(-6 - legSwing, 10);
        ctx.moveTo(3, 2); ctx.lineTo(1 - legSwing, 10);
        ctx.stroke();

        // 2. HORSE BODY
        ctx.fillStyle = "#795548";
        ctx.strokeStyle = "#3e2723";
        ctx.beginPath();
        ctx.ellipse(0, bob, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 3. RIDER
        ctx.save();
        ctx.translate(-1, -4 + bob + riderBob);
        ctx.fillStyle = factionColor; 
        ctx.strokeStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -9); ctx.lineTo(-2, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#d4b886";
        ctx.beginPath(); ctx.arc(0, -11, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#a1887f";
        ctx.beginPath();
        ctx.moveTo(-10, -11); ctx.lineTo(0, -17); ctx.lineTo(10, -11);
        ctx.quadraticCurveTo(0, -10, -10, -11);
        ctx.fill(); ctx.stroke();
        ctx.restore();

        // 4. FRONT LEGS
        ctx.beginPath();
        ctx.moveTo(-1, 2); ctx.lineTo(-1 + legSwing, 10);
        ctx.moveTo(6, 2); ctx.lineTo(8 + legSwing, 10);
        ctx.stroke();

        // 5. HORSE HEAD (ELONGATED SNOUT)
        ctx.save();
        ctx.translate(8, -2 + bob);
        ctx.fillStyle = "#795548";
        ctx.beginPath();
        ctx.moveTo(-2, 4);           // Neck connection
        ctx.lineTo(8, -6);           // Bridge starts
        ctx.lineTo(16, -11);         // Way longer nose tip
        ctx.lineTo(14, -13);         // Muzzle
        ctx.lineTo(6, -11);          // Forehead
        ctx.lineTo(5, -14);          // Ear Front
        ctx.lineTo(3, -14);          // Ear Back
        ctx.lineTo(1, -10);          // Back of poll
        ctx.lineTo(-4, -1);          // Neck back
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        
        // Mane
        ctx.fillStyle = "#3e2723";
        ctx.beginPath();
        ctx.moveTo(1, -10); ctx.quadraticCurveTo(-2, -9, -5, 0); ctx.lineTo(-2, -1);
        ctx.fill();
        ctx.restore();

        // 6. TAIL
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-10, -1 + bob);
        ctx.quadraticCurveTo(-16, 1, -14, 10 + bob);
        ctx.stroke();

        ctx.restore();
    }
 // Add factionColor to the parameters
function drawShip(x, y, moving, frame, factionColor = "#ffffff") {
    ctx.save();
    ctx.translate(x, y);
    
    // Swaying/Floating effect
    let sway = Math.sin(frame * 0.08) * 0.1;
    let bob = Math.cos(frame * 0.08) * 2;
    ctx.rotate(sway);

    // Hull
    ctx.fillStyle = "#3e2723";
    ctx.beginPath();
    ctx.moveTo(-15, bob);
    ctx.lineTo(15, bob);
    ctx.lineTo(10, 10 + bob);
    ctx.lineTo(-10, 10 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Sails - NOW USES DYNAMIC COLOR
    ctx.fillStyle = factionColor; 
    ctx.beginPath();
    ctx.moveTo(0, bob);
    ctx.lineTo(0, -20 + bob);
    ctx.lineTo(15, -5 + bob);
    ctx.closePath();
    ctx.fill();
    
    // Mast
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, bob);
    ctx.lineTo(0, -22 + bob);
    ctx.stroke();

    ctx.restore();
}

let economyTick = 0;
 let uiSyncTick = 0;
 
 //main UPDATE
 function update() {
    // --- 1. GLOBAL UI FREEZES ---
    if (typeof inParleMode !== 'undefined' && inParleMode) {
        return; 
    }

    if (typeof troopGUI !== 'undefined' && troopGUI.isOpen) {
        return; 
    }

    // NEW SURGICAL FIX: Freeze game loop if an enemy sally-out is pending player action
    if (typeof pendingSallyOut !== 'undefined' && pendingSallyOut) {
        return; 
    }

    // --- SURGICAL FIX: UI DOUBLE-CHECKER ---
    // Force-hide the city panel if we are in battle or a sub-mode
    const cityPanel = document.getElementById('city-panel');
    if (inBattleMode || (typeof inCityMode !== 'undefined' && inCityMode)) {
        if (cityPanel && cityPanel.style.display !== 'none') {
            cityPanel.style.display = 'none';
        }
    }

    // --- SURGICAL FIX: DIPLOMACY BUTTON VISIBILITY ---
    const dipBtn = document.getElementById('diplomacy-container');
    const isUIBusy = (typeof troopGUI !== 'undefined' && troopGUI.isOpen) || inBattleMode || inCityMode;

    if (dipBtn) {
        // Only show button if not in a menu/battle/city and loading is finished
        if (!isUIBusy && document.getElementById('loading').style.display === 'none') {
            dipBtn.style.display = 'block';
        } else {
            dipBtn.style.display = 'none';
        }
    }

    // --- SURGICAL FIX: SIEGE GUI PERSISTENCE CHECKER ---
    const siegeGui = document.getElementById('siege-gui');
    if (siegeGui && player.isSieging && !inBattleMode && !inCityMode) {
        if (siegeGui.style.display === 'none') {
            siegeGui.style.display = 'block';
        }
    }

    // ------------------------------------------------

    // SURGICAL FIX: Freeze the entire game loop if the Diplomacy screen is open
    if (typeof inParleMode !== 'undefined' && inParleMode) {
        return; 
    }
    
    if (inBattleMode) {
        // --- 1. BATTLEFIELD MODE ---
        calculateMovement(player.baseSpeed / 7, null, BATTLE_TILE_SIZE, null, null, true); 
        updateBattleUnits();
		
 if (keys['p']) {
            // 1. Check for living enemies and player health
            const aliveEnemies = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;
            const isPlayerDead = player.hp <= 0;

            if (isPlayerDead || aliveEnemies === 0) {
                // Exit the battle mode as normal
                // (This automatically handles the siege UI and summary screens!)
                leaveBattlefield(player);
            } else {
                console.log("Cannot retreat while enemies remain!");
            }
            
            keys['p'] = false;
        }
		
        // --- UPDATE UI TEXT: Place at the very end of your DRAW loop ---
        const aliveEnemies = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;

        if (player.hp <= 0 || aliveEnemies === 0) {
            ctx.save();
            
            // SURGERY: Reset transform to "Screen Space" 
            // This ignores camera zoom/panning so the text stays centered on the monitor
            ctx.setTransform(1, 0, 0, 1, 0, 0); 

            // 1. Draw a subtle dark bar behind the text for readability
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(0, window.innerHeight - 80, window.innerWidth, 80);

            // 2. Render the Victory/Defeat Text
            ctx.fillStyle = player.hp <= 0 ? "#ff5252" : "#ffca28"; // Red if dead, Gold if victory
            ctx.font = "bold 24px Georgia";
            ctx.textAlign = "center";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;
            
            let statusText = player.hp <= 0 ? "COMMANDER FALLEN" : "VICTORY";
            ctx.fillText(`${statusText} - Press [P] to Exit Battlefield`, window.innerWidth / 2, window.innerHeight - 45);

            ctx.restore();
        }
    } 
    else if (inCityMode) {
        // --- 2. LOCAL CITY MODE ---
        calculateMovement(player.baseSpeed / 9, null, TILE_SIZE, null, null, true);

        if (typeof updateCityCosmeticNPCs === 'function') {
            updateCityCosmeticNPCs(currentActiveCityFaction);
        }
        if (player.y > CITY_WORLD_HEIGHT - 20 || keys['p']) {
            leaveCity(player);
            keys['p'] = false; 
        }
    } 
    else {
        // --- 3. WORLD MAP MODE ---
        // Your existing World Map logic continues here...
// --- 3. WORLD MAP MODE ---
        economyTick++;
        if (economyTick > 300) { 
            updateCityEconomies(cities);
            economyTick = 0;
        }

// --- SURGERY: REFRESH DIPLOMACY DATA ---
        // Process the diplomacy logic (war/peace rolls)
        if (typeof updateDiplomacy === 'function') {
            updateDiplomacy();
        }
        // Note: renderDiplomacyMatrix() is already called inside updateDiplomacy() 
        // when changes happen, so we don't need to render it 60 times a second here!
        if (typeof updateSieges === 'function') updateSieges();
		
// --- PRO MODE: PLAYER FOOD & ATTRITION ---
        let oldX = player.x;
        let oldY = player.y;

        // Starvation Penalty: 40% speed reduction if food is empty
        player.speed = player.food > 0 ? player.baseSpeed : player.baseSpeed * 0.6; 
        
        calculateMovement(player.speed / 4, worldMap, TILE_SIZE, COLS, ROWS, false);
        
        let step = Math.hypot(player.x - oldX, player.y - oldY);
        if (step > 0) {
            player.distTrack += step;
            if (player.distTrack >= 1000) { 
                player.distTrack = 0;

                if (player.food > 0) {
                    // Normal Consumption
                    let consumption = 1 + Math.floor(player.troops / 5); 
                    player.food = Math.max(0, player.food - consumption);
                } else {
                    // --- ATTRITION: Food is 0, men start leaving ---
                    if (player.troops > 0) {
                        player.troops--; 
                        // Remove the last person added to the roster to keep count in sync
                        if (player.roster.length > 0) player.roster.pop();
                        
                        console.log("A soldier has deserted due to starvation!");
                    }
                }
            }
        }

        updateNPCs(cities);
		
		// --- ADVANCED PROXIMITY AUDIO SYSTEM ---
if (typeof globalNPCs !== 'undefined' && player) {
    let closestDist = 1000;
    let closestEnemy = null;

    // 1. Find the nearest hostile entity
    for (let npc of globalNPCs) {
        if (npc.faction !== player.faction) {
            let d = Math.hypot(npc.x - player.x, npc.y - player.y);
            if (d < closestDist) {
                closestDist = d;
                closestEnemy = npc;
            }
        }
    }

    // 2. Define State Thresholds
    // Danger (<250), Alert (250-600), Safe (>600)
    if (closestDist < 0) {
       //  TRIGGER: HIGH TENSION
       if (AudioManager.currentTrack !== "WorldMap_Tension") {
            AudioManager.playMusic("WorldMap_Tension");
            AudioManager.playSound('ui_click'); // Small percussive 'heartbeat' sync
        }
        
        // FACTION-SPECIFIC ENCOUNTER STINGERS (Plays once per encounter)
        if (!player.lastEncounteredFaction || player.lastEncounteredFaction !== closestEnemy.faction) {
            player.lastEncounteredFaction = closestEnemy.faction;
            
            // Surgical sound selection based on faction identity
            if (closestEnemy.faction === "Great Khaganate") {
                AudioManager.playSound('charge'); // Horse-lords warcry
            } else if (closestEnemy.faction === "Hong Dynasty") {
                AudioManager.playSound('firelance'); // Gunpowder crackle
            } else if (closestEnemy.faction === "Shahdom of Iransar") {
                AudioManager.playSound('sword_clash'); // Steel ring
            }
        }

    } else if (closestDist < 1) {
        // TRIGGER: ALERT/LOW TENSION 
        // We use the "Bandits" track here as a low-level threat ambient
        if (AudioManager.currentTrack !== "Bandits") {
            AudioManager.playMusic("Bandits");
        }
        player.lastEncounteredFaction = null; // Reset stinger so it can trigger if you move back in

    } else {
        // TRIGGER: SAFE/CALM
        if (AudioManager.currentTrack !== "WorldMap_Calm") {
            AudioManager.playMusic("WorldMap_Calm");
        }
        player.lastEncounteredFaction = null;
    }
}
// --- END AUDIO SYSTEM ---
        
        let tx = Math.floor(player.x / TILE_SIZE);
        let ty = Math.floor(player.y / TILE_SIZE);
        
        if (tx < 0) tx = 0; if (tx >= COLS) tx = COLS - 1;
        if (ty < 0) ty = 0; if (ty >= ROWS) ty = ROWS - 1;

        let currentTile = worldMap[tx][ty];

        document.getElementById('loc-text').innerText = `${Math.round(player.x)}, ${Math.round(player.y)}`;
        document.getElementById('terrain-text').innerText = currentTile.name;
        document.getElementById('speed-text').innerText = currentTile.speed + "x";
        document.getElementById('zoom-text').innerText = zoom.toFixed(2) + "x";

        let touchingCity = null;
        for(let c of cities) {
            let dist = Math.hypot(player.x - c.x, player.y - c.y);
            if(dist < c.radius + player.size) {
                touchingCity = c;
                break;
            }
        }

const cityPanel = document.getElementById('city-panel');
        if(touchingCity) {
            if(activeCity !== touchingCity) {
                activeCity = touchingCity;
                document.getElementById('city-name').innerText = activeCity.name;
                document.getElementById('city-name').style.color = activeCity.color;
                document.getElementById('city-faction').innerText = activeCity.faction;
                cityPanel.style.display = 'block';
                
                // ---> SURGERY: DYNAMIC WAR STATE UI <---
                const isEnemy = player.enemies && player.enemies.includes(activeCity.faction);
                const recruitBox = document.getElementById('recruit-box');
                const hostileBox = document.getElementById('hostile-box');

               if (isEnemy) {
                    // Disable standard buttons visually and functionally
                    recruitBox.style.opacity = '0.3';
                    recruitBox.style.pointerEvents = 'none';
                    // Show war UI
                    hostileBox.style.display = 'flex';
                    
                    // --- APPLY TEMPORARY MOVEMENT FREEZE (Approx 1 second at 60fps) ---
                    player.stunTimer = 60; 
                    
                    // Kill current momentum/key inputs so they don't slide
                    keys['w'] = keys['a'] = keys['s'] = keys['d'] = false;
                    keys['arrowup'] = keys['arrowleft'] = keys['arrowdown'] = keys['arrowright'] = false;
                } else {
                    // Enable standard buttons
                    recruitBox.style.opacity = '1';
                    recruitBox.style.pointerEvents = 'auto';
                    // Hide war UI
                    hostileBox.style.display = 'none';
                }
            }
			
			
			
            document.getElementById('city-pop').innerText = Math.floor(activeCity.pop).toLocaleString();
            document.getElementById('city-garrison').innerText = Math.floor(activeCity.troops).toLocaleString();
            document.getElementById('city-gold').innerText = Math.floor(activeCity.gold).toLocaleString();
            document.getElementById('city-food').innerText = Math.floor(activeCity.food).toLocaleString();
        } else {
            if(activeCity !== null) {
                activeCity = null;
                cityPanel.style.display = 'none';
            }
        }
    }
	
	
	uiSyncTick++;
    if (uiSyncTick % 30 === 0) { // Check every ~0.5 seconds
        syncSiegeUIVisibility();
    }
	
}


//DRAW EVERYTHING TO RUN GAME
 function draw() {
	 
	 if (!player || isNaN(player.x) || isNaN(player.y)) return; // Safety gate
	 
	 
			ctx.fillStyle = "#050505";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.save();
			ctx.translate(canvas.width/2, canvas.height/2);
			ctx.scale(zoom, zoom);
			ctx.translate(-player.x, -player.y);

			if (inBattleMode) {
		// --- 1. DRAW BATTLEFIELD ---
				
				// NEW: Paint the "abyss" with the base terrain color so retreating units don't float in space
				ctx.fillStyle = battleEnvironment.groundColor || "#767950";
				// Draw a massive rectangle extending far beyond the map bounds (-3000px in all directions)
				ctx.fillRect(-3000, -3000, 8400, 7600); 

				// Draw the textured battlefield directly on top
				if (battleEnvironment.bgCanvas) {
				   // To this:
		ctx.drawImage(battleEnvironment.bgCanvas, -battleEnvironment.visualPadding, -battleEnvironment.visualPadding);
				}

				drawBattleUnits(ctx);

		 
// --- UPDATE UI TEXT: Dynamic Positioning Logic ---
const aliveEnemies = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;

// Text Styles
ctx.font = "bold 18px Georgia";
ctx.textAlign = "center";
ctx.shadowColor = "black";
ctx.shadowBlur = 4;

if (aliveEnemies > 0) {
// 1. ENEMIES PRESENT: Draw at the current "Ready" position (Bottom Left/Right UI area)

// Set small font size
ctx.font = "10px Arial";
ctx.fillStyle = "#ffffff";

// Optional: center alignment if you're placing at sceen center
ctx.textAlign = "center";

// Draw text
ctx.fillText(
    `Enemies Remaining: ${aliveEnemies}`,
    BATTLE_WORLD_WIDTH / 2,
    canvas.height - 50
);

} else {
    // 2. BATTLE OVER: Move to the center or fallback position
    ctx.fillStyle = "#ffca28"; // Gold color for victory/exit
    
    let drawX, drawY;

    if (player && player.hp > 0) {
        // Center on Player for maximum visibility
        drawX = player.x;
        drawY = player.y - 60; // Float slightly above the player's head
    } else {
        // Fallback: 200px above the bottom "Red Line" (canvas bottom)
        drawX = canvas.width / 2;
        drawY = canvas.height - 200;
    }

    ctx.fillText("BATTLE OVER - Press [p] to Exit", drawX, drawY);
}

// Reset shadow so it doesn't bleed into other rendering
ctx.shadowBlur = 0;
				
				
			} 
			else if (inCityMode) {
				// --- 2. DRAW CITY ---
				let cityData = cityDimensions[currentActiveCityFaction];
				if (cityData && cityData.bgCanvas) {
					ctx.drawImage(cityData.bgCanvas, 0, 0); 
				}

				if (typeof drawCityCosmeticNPCs === 'function') {
					drawCityCosmeticNPCs(ctx, currentActiveCityFaction, drawCaravan, zoom);
				}
			 
				let pColor = "#d32f2f"; 
				if (typeof FACTIONS !== 'undefined' && player.faction && FACTIONS[player.faction]) {
					pColor = FACTIONS[player.faction].color;
				}
				if (typeof drawHuman === 'function') {
				
					drawHuman(ctx, player.x, player.y, player.isMoving, player.anim, pColor);
				}

				ctx.save();
				ctx.font = "bold 16px Georgia";
				ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
				ctx.fillRect(canvas.width / 2 - 150, 20, 300, 30);
				ctx.fillStyle = "#f5d76e";
				ctx.textAlign = "center";
				ctx.fillText("Press P or walk South to exit", canvas.width / 2, 40);
				ctx.restore();
			} 
			else {
				// --- 3. DRAW WORLD MAP ---
				ctx.imageSmoothingEnabled = true;
				ctx.drawImage(bgCanvas, 0, 0);

				// SURGERY: Calculate what the camera can actually see right now
				let halfWidth = (canvas.width / 2) / zoom;
				let halfHeight = (canvas.height / 2) / zoom;
				// Add 150px padding so things don't pop out abruptly at the edges
				let camLeft = player.x - halfWidth - 150; 
				let camRight = player.x + halfWidth + 150;
				let camTop = player.y - halfHeight - 150;
				let camBottom = player.y + halfHeight + 150;


cities.forEach(c => {
				
				// SURGERY: If the city is outside the camera view, skip rendering entirely!
				if (c.x < camLeft || c.x > camRight || c.y < camTop || c.y > camBottom) return;
			
					ctx.lineWidth = 3;
					ctx.fillStyle = c.color;
					ctx.strokeStyle = "#ffca28"; 

 //cities are one shape
						const r = 14;
						ctx.beginPath();
						for (let i = 0; i < 6; i++) {
							const angle = Math.PI / 3 * i;
							const px = c.x + r * Math.cos(angle);
							const py = c.y + r * Math.sin(angle);
							if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
						}
						ctx.closePath(); ctx.fill(); ctx.stroke();
					

					ctx.fillStyle = "#fff";
					ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();

					let fontSize = Math.max(12, 20 / zoom); 
					ctx.font = `bold ${fontSize}px Georgia`;
					ctx.textAlign = "center";
					ctx.fillStyle = "#111"; 
					ctx.fillText(c.name, c.x + 2, c.y - 18);
					ctx.fillStyle = c.color; 
					ctx.fillText(c.name, c.x, c.y - 20);
				});
		 
		 // ---> ADD THIS LINE <---
               if (typeof drawSiegeVisuals === 'function') drawSiegeVisuals(ctx);
			   
			   // SURGERY: Pass the camera bounds to the NPC rendering system
				drawAllNPCs(ctx, drawCaravan, drawShip, zoom, camLeft, camRight, camTop, camBottom);
				
				
				let tx = Math.floor(player.x / TILE_SIZE);
				let ty = Math.floor(player.y / TILE_SIZE);
				
				let currentTile = (worldMap[tx] && worldMap[tx][ty]) ? worldMap[tx][ty] : {name: "Plains"};
				if (currentTile.name === "Coastal" || currentTile.name === "River" || currentTile.name === "Ocean") {
					drawShip(player.x, player.y, player.isMoving, player.anim, player.color);
				} 
				else {drawCaravan(player.x, player.y, player.isMoving, player.anim, player.color);}

				// ---> SURGICAL FIX: PLAYER LABEL (TIGHT STACK, NO WHITE TEXT) <---
				let nameFontSize = Math.max(10, 14 / zoom);
				let detailFontSize = Math.max(8, 12 / zoom);
				ctx.textAlign = "center";

				// 1. TOP STATS (Gold & Food - Ultra Tight)
				ctx.font = `italic ${detailFontSize}px Georgia`;
				let goldText = `G: ${Math.floor(player.gold)}`;
				let foodText = `F: ${Math.floor(player.food)}`;
				let statGap = 8; 

				ctx.fillStyle = "#ffca28"; // Gold text is now gold
				ctx.fillText(goldText, player.x - (ctx.measureText(foodText).width / 2) - (statGap / 2), player.y - 38);

// --- SURGERY: HIDE STATS DURING SIEGE ---
if (typeof isSieging === 'undefined' || !isSieging) {
 
    ctx.fillStyle = "#8bc34a"; // Food
    ctx.fillText(foodText, player.x + (ctx.measureText(goldText).width / 2) + (statGap / 2), player.y - 38);
}
				// 2. NAME ("YOU") - Now the bottom-most line, sits right above hat tip
				ctx.font = `bold ${nameFontSize}px Georgia`;
				ctx.fillStyle = "#ffffff"; // YOU text is now white
				ctx.fillText(`YOU (${player.troops})`, player.x, player.y - 26);
				ctx.font = "10px Arial";
				}
				
		ctx.restore();
		
		// ---> ADD THIS FIX: Render the overlay UI on top of everything <---
    if (typeof drawPlayerOverlay === 'function') {
        drawPlayerOverlay(ctx, player, zoom);
    }
	
		requestAnimationFrame(() => { update(); draw(); });
		// Add this right before the end of the draw() function
updateAndDrawPlayerSystems(ctx, player, zoom, WORLD_WIDTH, WORLD_HEIGHT, typeof globalNPCs !== 'undefined' ? globalNPCs : []);
//	updateAndDrawPlayerSystems(ctx, player, zoom, WORLD_WIDTH, WORLD_HEIGHT, npcs);	
}//draw() end


//initGame();
showMainMenu();
 
function refreshCityUI() {
    // 1. Update the Player's Global UI (Top left/Overlay)
    const globalGold = document.getElementById('gold-text');
    const globalFood = document.getElementById('food-text');
    
    if (globalGold) globalGold.innerText = Math.floor(player.gold);
    if (globalFood) globalFood.innerText = Math.floor(player.food);

    // 2. Update the City Panel specifically (if it's open)
    const cityGoldDisp = document.getElementById('city-gold-display');
    const cityFoodDisp = document.getElementById('city-food-display');

    if (cityGoldDisp) cityGoldDisp.innerText = `Gold: ${Math.floor(player.gold)}`;
    if (cityFoodDisp) cityFoodDisp.innerText = `Food: ${Math.floor(player.food)}`;
}

// Define the missing function to stop the background crashing
function enforceNPCBounds(npc, maxWidth, maxHeight) {
    if (npc.x < 0) npc.x = 0;
    if (npc.x > maxWidth) npc.x = maxWidth;
    if (npc.y < 0) npc.y = 0;
    if (npc.y > maxHeight) npc.y = maxHeight;
}

function toggleDiplomacyMenu() {
    const panel = document.getElementById('diplomacy-panel');
    
    // Check if currently open
    const isOpen = panel.style.display === 'block';
    
    if (!isOpen) {
        panel.style.display = 'block';
        inParleMode = true; // FREEZES THE GAME
        renderDiplomacyMatrix(); // Fills the table with data
    } else {
        panel.style.display = 'none';
        inParleMode = false; // UNFREEZES THE GAME
    }
}

function syncSiegeUIVisibility() {
    const siegeGui = document.getElementById('siege-gui');
    if (!siegeGui) return;

    // If player is technically sieging but the GUI is hidden, bring it back
    if (player.isSieging && siegeGui.style.display === 'none' && !inBattleMode) {
        // Find the active siege record for the player
        const currentSiege = activeSieges.find(s => s.attacker === player || s.attacker.isPlayer);
		if (currentSiege) {
                    console.log("Restoring Siege GUI after interruption...");
                    // SURGERY: Just show the GUI directly, the function didn't exist
                    siegeGui.style.display = 'block'; 
                } else {
            // Safety: if no siege object found, reset player state
            player.isSieging = false;
        }
    }
}

// Add this inside your script tag to handle the UI toggle
function updateCityPanelUI(city) {
    const recruitBox = document.getElementById('recruit-box');
    const hostileBox = document.getElementById('hostile-box');
    
    // Check if the city belongs to a faction you are at war with
    // This assumes your faction_dynamics.js is loaded
    const isHostile = player.enemies.includes(city.faction);

    if (isHostile) {
        recruitBox.style.display = 'none';
        hostileBox.style.display = 'flex';
    } else {
        recruitBox.style.display = 'flex';
        hostileBox.style.display = 'none';
    }
}

// Optimized: Run bounds check every 100ms instead of every frame (Lag Fix)
setInterval(() => {if (typeof globalNPCs !== 'undefined') {globalNPCs.forEach(npc => enforceNPCBounds(npc, WORLD_WIDTH, WORLD_HEIGHT));}}, 100);
