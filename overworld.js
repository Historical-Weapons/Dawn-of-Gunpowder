
const canvas = document.getElementById('gameCanvas');
 
let activeCity = null;
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Hardcoded percentages [x, y]
const YELLOW_RIVER_COORDS = [
    // Origin in the West (Higher up/North)
    [0.060, 0.560], [0.066, 0.558], [0.072, 0.556], [0.078, 0.554], [0.084, 0.552],
    [0.090, 0.550], [0.096, 0.548], [0.102, 0.546], [0.108, 0.544], [0.114, 0.542],
    // First small dip south
    [0.120, 0.540], [0.122, 0.548], [0.124, 0.556], [0.126, 0.564], [0.128, 0.572],
    [0.130, 0.575], [0.132, 0.577], [0.134, 0.579], [0.136, 0.580], [0.140, 0.580],
    // Flowing East before the sharp turn
    [0.145, 0.580], [0.150, 0.580], [0.155, 0.580], [0.160, 0.580], [0.165, 0.580],
    [0.170, 0.580], [0.175, 0.580], [0.180, 0.580], [0.185, 0.580], [0.190, 0.580],
    // Sharp turn North
    [0.192, 0.567], [0.194, 0.554], [0.196, 0.541], [0.198, 0.528], [0.200, 0.515],
    [0.202, 0.502], [0.204, 0.489], [0.206, 0.476], [0.208, 0.463], [0.210, 0.450],
    // Flowing East towards the Ordos Loop
    [0.217, 0.449], [0.224, 0.448], [0.231, 0.447], [0.238, 0.446], [0.245, 0.445],
    [0.252, 0.444], [0.259, 0.443], [0.266, 0.442], [0.273, 0.441], [0.280, 0.440],
    // The massive climb North (Left leg of the Ordos Loop)
    [0.286, 0.426], [0.292, 0.412], [0.298, 0.398], [0.304, 0.384], [0.310, 0.370],
    [0.316, 0.356], [0.322, 0.342], [0.328, 0.328], [0.334, 0.314], [0.340, 0.300],
    [0.345, 0.290], [0.350, 0.280],
    // The top of the Ordos Loop (Flowing East)
    [0.358, 0.281], [0.366, 0.282], [0.374, 0.283], [0.382, 0.284], [0.390, 0.285],
    [0.398, 0.286], [0.406, 0.287], [0.414, 0.288], [0.422, 0.289], [0.430, 0.290],
    [0.435, 0.290], [0.440, 0.290],
    // Plunging straight back South (Right leg of the loop)
    [0.439, 0.309], [0.438, 0.328], [0.437, 0.347], [0.436, 0.366], [0.435, 0.385],
    [0.434, 0.404], [0.433, 0.423], [0.432, 0.442], [0.431, 0.461], [0.430, 0.480],
    // Hooking Eastward towards the coast
    [0.434, 0.482], [0.438, 0.484], [0.442, 0.486], [0.446, 0.488], [0.450, 0.490],
    [0.454, 0.492], [0.458, 0.494], [0.462, 0.496], [0.466, 0.498], [0.470, 0.500],
    // Final stretch emptying into the Yellow Sea
    [0.478, 0.494], [0.486, 0.488], [0.494, 0.482], [0.502, 0.476], [0.510, 0.470],
    [0.518, 0.464], [0.526, 0.458], [0.534, 0.452], [0.542, 0.446], [0.550, 0.440],
[0.558, 0.446], [0.566, 0.452], [0.574, 0.458], [0.582, 0.464], [0.590, 0.470]
	
	
];

const YANGTZE_RIVER_COORDS = [
    // Origin in the West (Starts further West and South of Yellow River)
    [0.020, 0.650], [0.027, 0.649], [0.034, 0.648], [0.041, 0.647], [0.048, 0.646],
    [0.055, 0.645], [0.062, 0.644], [0.069, 0.643], [0.076, 0.642], [0.083, 0.641],
    [0.090, 0.640], [0.100, 0.640],
    // The massive dip South-East
    [0.104, 0.649], [0.108, 0.658], [0.112, 0.667], [0.116, 0.676], [0.120, 0.685],
    [0.124, 0.694], [0.128, 0.703], [0.132, 0.712], [0.136, 0.721], [0.140, 0.730],
    [0.145, 0.740], [0.150, 0.750],
    // Reaching the deepest point in the South
    [0.156, 0.758], [0.162, 0.766], [0.168, 0.774], [0.174, 0.782], [0.180, 0.790],
    [0.186, 0.798], [0.192, 0.806], [0.198, 0.814], [0.204, 0.822], [0.210, 0.830],
    [0.215, 0.840], [0.220, 0.850],
    // Curving back North-East
    [0.226, 0.846], [0.232, 0.842], [0.238, 0.838], [0.244, 0.834], [0.250, 0.830],
    [0.256, 0.826], [0.262, 0.822], [0.268, 0.818], [0.274, 0.814], [0.280, 0.810],
    [0.290, 0.805], [0.300, 0.800],
    // Continuing North-East towards central plains
    [0.308, 0.796], [0.316, 0.792], [0.324, 0.788], [0.332, 0.784], [0.340, 0.780],
    [0.348, 0.776], [0.356, 0.772], [0.364, 0.768], [0.372, 0.764], [0.380, 0.760],
    [0.390, 0.760], [0.400, 0.760],
    // Flattening out and flowing straight East
    [0.407, 0.760], [0.414, 0.760], [0.421, 0.760], [0.428, 0.760], [0.435, 0.760],
    [0.442, 0.760], [0.449, 0.760], [0.456, 0.760], [0.463, 0.760], [0.470, 0.760],
    [0.475, 0.760], [0.480, 0.760],
    // Final slight curve North-East to the sea
    [0.485, 0.757], [0.490, 0.754], [0.495, 0.751], [0.500, 0.748], [0.505, 0.745],
    [0.510, 0.742], [0.515, 0.739], [0.520, 0.736], [0.525, 0.733], [0.530, 0.730],
    // Empty into sea
    [0.533, 0.729], [0.536, 0.728], [0.539, 0.727], [0.542, 0.726], [0.545, 0.725],
    [0.548, 0.724], [0.551, 0.723], [0.554, 0.722], [0.557, 0.721], [0.560, 0.720],
	[0.563, 0.723], [0.566, 0.726],[0.569, 0.729], [0.572, 0.732], [0.575, 0.735], [0.578, 0.738], [0.581, 0.741],
[0.584, 0.744], [0.587, 0.747], [0.590, 0.750], [0.593, 0.753], [0.596, 0.756]
	
	
];

const TIBET_RIVER_A = [
    // Source: Deep South-West winding North-East
    [0.005, 0.980], [0.008, 0.970], [0.012, 0.962], [0.015, 0.950], [0.018, 0.935],
    [0.020, 0.920], [0.022, 0.905], [0.025, 0.890], [0.028, 0.875], [0.030, 0.860],
    [0.032, 0.845], [0.035, 0.830], [0.038, 0.815], [0.040, 0.800], [0.042, 0.785],
    [0.045, 0.770], [0.048, 0.760], [0.052, 0.755], [0.056, 0.748], [0.062, 0.740],
    [0.070, 0.730], [0.080, 0.720], [0.090, 0.710], [0.100, 0.700], [0.110, 0.692],
    [0.120, 0.685] // Connection point to Yangtze
];

const TIBET_RIVER_B = [
    // Source: Extreme bottom edge winding toward Central Yangtze
    [0.020, 0.995], [0.025, 0.985], [0.030, 0.975], [0.035, 0.965], [0.040, 0.955],
    [0.045, 0.945], [0.050, 0.935], [0.055, 0.925], [0.060, 0.915], [0.065, 0.905],
    [0.070, 0.895], [0.075, 0.885], [0.080, 0.875], [0.085, 0.865], [0.090, 0.855],
    [0.095, 0.845], [0.100, 0.835], [0.110, 0.830], [0.120, 0.825], [0.130, 0.820],
    [0.140, 0.815], [0.150, 0.810], [0.160, 0.805], [0.170, 0.798], [0.175, 0.794],
    [0.180, 0.790] // Connection point to Yangtze
];

const TIBET_RIVER_C = [
    // Source: Bottom-left corner winding along the lower map boundary
    [0.001, 0.999], [0.010, 0.995], [0.020, 0.990], [0.030, 0.985], [0.040, 0.980],
    [0.050, 0.975], [0.060, 0.970], [0.070, 0.965], [0.080, 0.960], [0.090, 0.955],
    [0.100, 0.950], [0.110, 0.945], [0.120, 0.940], [0.130, 0.935], [0.140, 0.930],
    [0.150, 0.920], [0.160, 0.910], [0.170, 0.900], [0.180, 0.890], [0.190, 0.880],
    [0.200, 0.870], [0.210, 0.860], [0.215, 0.855], [0.220, 0.850] // Connection point to Yangtze
];
function resizeCanvasAndResetCamera() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    zoom = Math.max(0.3, Math.min(7, zoom));  //default zoom
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
const WORLD_WIDTH = 8000; //15K 
const WORLD_HEIGHT = 6000; //11K
	// Padding as ratio of world size (e.g., 5% from edges)
const PADDING_X = WORLD_WIDTH * 0.05;   // 5% of width
const PADDING_Y = WORLD_HEIGHT * 0.05;  // 5% of height

    const TILE_SIZE = 8; //
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
        plains: "#a3a073", meadow: "#6b7a4a",
        forest: "#425232", jungle: "#244222",
        highlands: "#626b42", mountains: "#3E2723", snow: "#7B5E3F"
    };

    const worldMap = [];
    const TARGET_CITIES = 60; // How many cities to scatter across the map
    const cities = [];
  
function populateCities() {
    console.log("Settling the Empire...");
    let attempts = 0;
	 

    // --- 2. CITY GENERATION LOOP ---
    while(cities.length < TARGET_CITIES && attempts < 10000) {
        attempts++;
        
        // Random coordinates within padding
        let cx = Math.floor(Math.random() * (WORLD_WIDTH - 2 * PADDING_X)) + PADDING_X;
        let cy = Math.floor(Math.random() * (WORLD_HEIGHT - 2 * PADDING_Y)) + PADDING_Y;
        
        // Convert pixel coordinates to grid coordinates
        let gX = Math.floor(cx / TILE_SIZE);
        let gY = Math.floor(cy / TILE_SIZE);

        // FIX: Define 'tile' for this specific coordinate before checking properties
        if (worldMap && worldMap[gX] && worldMap[gX][gY]) {
            let tile = worldMap[gX][gY];

            // Now check if the tile is suitable for a city
            if(!tile.impassable && tile.name !== "River" && tile.name !== "Coastal" && tile.name !== "Ocean") { 
                
                // Check distance to other cities (Prevent clumping)
                let tooClose = false;
                for(let c of cities) {
                    if(Math.hypot(c.x - cx, c.y - cy) < 400) { // Min 400px between cities
                        tooClose = true; 
                        break; 
                    }
                }

                if(!tooClose) {
                    let newCity = {
                        name: "Settlement", 
                        pop: Math.floor(Math.random() * 10000) + 1000,
                        x: cx,
                        y: cy,
                        radius: 25 
                    };
                    
                    // Initialize the rest of the city data
                    if (typeof initializeCityData === 'function') {
                        initializeCityData(newCity, WORLD_WIDTH, WORLD_HEIGHT);
                    }
                    
                    cities.push(newCity);
                }
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
            await setLoading(percent, "Generating Terrain...");
        }

        worldMap[i] = [];
		
for (let j = 0; j < ROWS; j++) {
    let nx = i / COLS; 
    let ny = j / ROWS;
	
	 
let isMacroRiver = false;  

    // --- DOMAIN WARPING (The Secret to Jaggedness) ---
    let warpX = nx + (fbm(nx * 10, ny * 10) - 0.5) * 0.12;
    let warpY = ny + (fbm(nx * 10 + 15, ny * 10 + 15) - 0.5) * 0.12;

    let yellowSeaX = 0.62; 
    let yellowSeaY = 0.48; 
    let distToYellowSea = Math.hypot((warpX - yellowSeaX) * 1.6, (warpY - yellowSeaY) * 0.8); 
     
    let himalayaMask = Math.max(0, 1.2 - Math.hypot((warpX - 0.15) * 2, (warpY - 0.65) * 1.5) * 2.5);
    let yunnanMask = Math.max(0, 1.0 - Math.hypot((warpX - 0.45) * 2, (warpY - 0.75) * 2) * 3.0);
    let regionalMountainStrength = himalayaMask + (yunnanMask * 0.6);
// --- 1. BASE CONTINENTAL NOISE ---
    let e = Math.pow(fbm(warpX * 3.5, warpY * 3.5) * 2.2, 1.3) * 0.22; 
    e += fbm(warpX * 25, warpY * 25) * 0.03; 

    let m = fbm(warpX * 4 + 10, warpY * 4 + 10); 
    m += (0.6 - warpY) * 0.2; 
    m += warpX * 0.15;

    // --- 2. THE MAINLAND MASS & COASTLINES ---
    let coastNoise = (fbm(warpX * 12, warpY * 12) - 0.5) * 0.15;
    let mainlandCoast = 0.70 + (fbm(warpY * 4, 0) - 0.5) * 0.25 + coastNoise; 

    let mainlandMask = 1.0 - smoothstep(mainlandCoast - 0.1, mainlandCoast + 0.1, warpX);
    if (warpX < mainlandCoast + 0.15) {
        e += mainlandMask * 0.40; 
    }



    // --- 4. SURGERY: ORGANIC TARIM BASIN & TAKLAMAKAN DESERT ---
    let tarimDistortion = fbm(warpX * 10, warpY * 10) * 0.08;
    let tarimDist = Math.hypot((warpX - 0.18) * 1.8, (warpY - 0.38)) - tarimDistortion;
    if (tarimDist < 0.16) {
        let basinDepth = smoothstep(0.16, 0.0, Math.max(0, tarimDist));
        e -= basinDepth * 0.15; 
        m -= basinDepth * 0.6; // Extremely dry  
        
        let ring = smoothstep(0.16, 0.10, tarimDist) * smoothstep(0.06, 0.10, tarimDist);
        e += ring * 0.25; 
    }

	// --- 5. REVISED: SICHUAN BASIN (The Nested Bowl) ---
	// This "carves" a hole into the eastern side of the Tibetan mass
	let sichuanNoise = fbm(warpX * 12, warpY * 12) * 0.04;
	let distToSichuan = Math.hypot((warpX - 0.42), (warpY - 0.62)) - sichuanNoise;

	if (distToSichuan < 0.10) {
		let basinDepth = smoothstep(0.10, 0.0, distToSichuan);
		
		// Drop elevation to "Steppes" level (0.42) regardless of the plateau height
		let targetBasinE = 0.42 + (fbm(warpX * 20, warpY * 20) * 0.05);
		e = (e * (1 - basinDepth)) + (targetBasinE * basinDepth);
		
		// Increase moisture (Sichuan is famous for fog/humidity/greenery)
		m = Math.max(m, 0.65 * basinDepth);
		
		// Add the "Ring of Mountains" effect around the basin
		let ringWidth = 0.03;
		let ringDist = Math.abs(distToSichuan - 0.09);
		if (ringDist < ringWidth) {
			let ringLift = smoothstep(ringWidth, 0.0, ringDist);
			e += ringLift * 0.15; // Create the surrounding hills
		}
	}

    // 🛠️ SURGERY: NO DUNES IN EASTERN CHINA
    if (warpX > 0.45 && warpX < 0.65 && warpY > 0.45 && warpY < 0.65) {
        m = Math.max(m, 0.45); 
    }
    
    // 🛠️ SURGERY: REMOVE RIVER / FILL VALLEY 
    if (warpY > 0.55 && warpY < 0.90 && warpX > 0.38 && warpX < 0.48) {
        let riverGap = Math.abs(warpX - 0.43);
        if (riverGap < 0.05) {
            e = Math.max(e, 0.45 + (fbm(warpX * 12, warpY * 12) * 0.08)); 
        }
    }
    
    // --- 6 & 7. NORTHERN TRANSITION: XINJIANG TO MANCHURIA ---
    if (warpY < 0.50) {

					
					// A. TIAN SHAN / ALTAI MOUNTAINS (NW Ridges)
					// Adds diagonal, jagged mountain ranges into the NW desert so it isn't completely flat.
			// --- REVISED 6-A. TIAN SHAN / ALTAI MOUNTAINS ---
			let mountainStrike = Math.abs((warpX * 2.0 + warpY) - 0.55);
			if (mountainStrike < 0.12 && warpX < 0.35) {
				let ridgeLift = smoothstep(0.12, 0.0, mountainStrike) * fbm(warpX * 18, warpY * 18);
				e += ridgeLift * 0.30; 
				// FIX: Clamp to ensure no snow peaks in the NW
				e = Math.min(e, 0.72); 
				m += ridgeLift * 0.15;
			}

					// B. THE ORGANIC BIOME SWEEP
					// We warp the coordinates heavily. This prevents the "flag stripes" effect.
					// It makes the forest/steppe border wave up and down like natural weather patterns.
					let biomeWarpX = warpX + fbm(warpX * 4, warpY * 4) * 0.12;
					let biomeWarpY = warpY + fbm(warpX * 4 + 10, warpY * 4 + 10) * 0.12;
					
					// Base X-progress (0 = Deep West/Desert, 1 = Far East/Forest)
let xProgress = Math.max(0, Math.min(1, (biomeWarpX - 0.10) / 0.80));
					
					// We use an exponential curve for moisture. It stays dry (plains/desert) for a long time,
					// then rapidly gets wet (forest/jungle) as you hit the Eastern seaboard.
let baseM = 0.34 + (Math.pow(xProgress, 1.45) * 0.40);
					
					// Add medium-frequency "patch" noise to create islands of forest in the plains,
					// and islands of meadow in the forest.
					let patchNoise = (fbm(warpX * 15, warpY * 15) - 0.5) * 0.18;
					
					// Override the moisture with our natural, sweeping, noisy gradient
					m = baseM + patchNoise;
					
			// C.  RANGE, diagonal "/" + shifted further down
			let shaanxiShiftX = 0.06;
			let shaanxiShiftY = 0.16; // was 0.06, now +10% more down

			// Shift the ridge in world space
			let sX = biomeWarpX - shaanxiShiftX;
			let sY = biomeWarpY + shaanxiShiftY;

			// MIRRORED diagonal ridge ("/" instead of "\")
			let shaanxiSpineY = 0.16 - (sX * 0.58) + Math.sin(sX * 10) * 0.03;
			let distToShaanxi = Math.abs(sY - shaanxiSpineY);

			if (distToShaanxi < 0.12 && xProgress > 0.6) {
				let mountainLift = smoothstep(0.12, 0.0, distToShaanxi);
				let ruggedness = fbm(warpX * 22, warpY * 22) * 1.2;
			 //   e += mountainLift * ruggedness * 0.22;

				// Moisture now correctly follows the mirrored slope
				if (sY >= shaanxiSpineY) {
				//    m += mountainLift * 0.25;
				}
			}
					
					else if (warpX < 0.6) {
						// Keep the Mongolian steppe/Gobi relatively flat outside of specific ranges
						e = Math.min(e, 0.52 + fbm(warpX*10, warpY*10)*0.05);
					}
    }

    // 🛠️ FIX 1: REMOVE MOUNTAIN LINE NEAR LANZHOU
    let lanzhouDist = Math.hypot((warpX - 0.36), (warpY - 0.45));
    if (lanzhouDist < 0.08) {
        e = Math.min(e, 0.45 + (fbm(warpX * 10, warpY * 10) * 0.05));
    }
 

			// --- 1. NORTHEAST RANGE DELETION (White Circle) ---
			if (warpX > 0.55 && warpX < 0.80 && warpY > 0.10 && warpY < 0.40) {
				// Cap the elevation to prevent mountains from spawning here
				e = Math.min(e, 0.55); 
			}

			// --- 2 & 3. ORGANIC TIBETAN PLATEAU & KUNLUN/QILIAN BARRIER ---
			// Targets the large SW mass and removes the "Square" look
			if (warpX < 0.42 && warpY > 0.35) {
				// Define a jagged northern boundary slanting from top-left to center-right
				let barrierY = 0.40 + (warpX * 0.25) + (fbm(warpX * 12, warpY * 12) * 0.04);
				
				if (warpY > barrierY) {
					// Inside the Plateau: Rough, organic highland mass (NOT square)
					let plateauNoise = fbm(warpX * 12, warpY * 12) * 0.15;
					e = Math.max(e, 0.65 + plateauNoise); 
					
					// SNOWY PEAK BARRIER (Yellow Line): Exactly along the northern edge
					let distToBarrier = Math.abs(warpY - barrierY);
					if (distToBarrier < 0.04) {
						// Extremely high frequency noise for jagged, spiky peaks
						let peakNoise = Math.pow(fbm(warpX * 35, warpY * 35), 2) * 0.2;
						e = Math.max(e, 0.71 + peakNoise); // High elevation pushes into snow biome
					}
				} else {
				// HEXI CORRIDOR / STEPPE TRANSITION (Gradual aridity before dunes)
    let distNorth = barrierY - warpY;
    
    // Increased the range to 0.32 to create a much broader transition corridor
    if (distNorth < 0.32) {
        // Normalize the distance (0.0 at the edge, 1.0 at the mountain base)
        // This makes the math easier to tune than raw subtraction.
        let blend = 1.0 - Math.min(1.0, distNorth / 0.32);
        
        // Smooth moisture gradient: 0.15 (Desert) up to 0.45 (Mountain Runoff)
        let transitionMoisture = 0.15 + (blend * 0.30); 
     //   m = Math.max(m, transitionMoisture + (fbm(warpX * 10, warpY * 10) * 0.05));
        
        // Rolling foothills: 0.35 (Plains) up to 0.55 (Mountain Foothills)
        // Adding a bit of low-frequency noise to the elevation makes the wide transition 
        // feel more like varying terrain and less like a flat ramp.
        let transitionNoise = fbm(warpX * 8, warpY * 8) * 0.05;
        let foothills = 0.35 + (blend * 0.20) + transitionNoise;
       // e = Math.max(e, foothills);
					}
				}
			}

			// --- 4. REMOVE ISOLATED MOUNTAIN BUMP (Green Circle Fix) ---
			// Targets the specific peninsula bump to turn it into plains/meadow
			let greenCircleDist = Math.hypot((warpX - 0.34), (warpY - 0.54));
			if (greenCircleDist < 0.07) {
				// Force elevation down to plains level, and moisture up for meadow
				e = Math.min(e, 0.48 + (fbm(warpX * 15, warpY * 15) * 0.02)); 
				m = Math.max(m, 0.45); 
			}

			// --- 5. EASTERN CHINA & CENTRAL BASIN HYDROLOGY FIX (Yellow Circle) ---
			// Target area: Central plains to Jiangsu/Henan
			if (warpX > 0.40 && warpX < 0.90 && warpY > 0.45 && warpY < 0.80) {
				
				// DRY UP RANDOM LAKES: If it's already land (not deep ocean coast), force it above water level
				if (e > 0.28) { 
					e = Math.max(e, 0.36); 
				}

				// CENTRAL BASIN SPECIFIC (Mostly Plains)
				if (warpX < 0.55 && warpY < 0.70) {
					// Crush any random mountains and raise any random dips
					e = Math.min(Math.max(e, 0.36), 0.55); 
					// Force moisture into the Plains/Meadow range (preventing desert)
					m = Math.max(m, 0.45); 
				}
			}
			
 
			// --- 6. SOUTHERN PATCH (Meadow/Highlands) ---
			if (warpX > 0.40 && warpX < 0.60 && warpY > 0.85 && warpY < 0.95) {
				// Create high-frequency noise patches
				let southernPatchNoise = fbm(warpX * 25, warpY * 25);
				if (southernPatchNoise > 0.65) {
					e = Math.max(e, 0.60); // Push to Highlands elevation
					m = Math.max(m, 0.30); // Ensure it stays meadow/green, not arid
				}
			}
			
			// 🛠️ SURGERY: CARVE POYANG LAKE (Jiangxi Area)
// Slightly elongated Y-axis to match the real lake's shape
let poyangDist = Math.hypot((warpX - 0.57) * 1.3, (warpY - 0.65)); 

if (poyangDist < 0.025) {
    // Force the elevation below the coastline threshold (e.g., into water)
    // The closer to the center, the deeper the lake
    let lakeDrop = (0.025 - poyangDist) * 5.0; // Simple linear depth
    e = Math.min(e, 0.32 - lakeDrop); 
    
    // Ensure the area immediately surrounding the lake is lush
    m = Math.max(m, 0.70); 
}
			

// --- SURGERY A: Top Center "No Desert / Mostly Plains" (Green Circle) ---
// cx: 38.2, cy: 37.3, rx: 10.6, ry: 23.1
let plainsZoneDist = Math.pow((warpX - 0.382) / 0.106, 2) + Math.pow((warpY - 0.373) / 0.231, 2);
if (plainsZoneDist < 1.0) {
    let blend = 1.0 - Math.sqrt(plainsZoneDist); // Smooth radial falloff
    let plainNoise = fbm(warpX * 12, warpY * 12) * 0.05;
    
    // Force moisture up to prevent desertification, blending towards center
    m = Math.max(m, 0.48 * blend); 
    
    // Flatten rugged terrain into rolling plains (elevation ~0.45)
    let targetE = 0.45 + plainNoise;
    e = (e * (1 - blend)) + (targetE * blend);
}


// --- REVISED SURGERY D: Mid Lower Plains (Guaranteed No Mountains) ---
// Expanded Bounds: X (0.279->0.250 to 0.386->0.410) | Y (0.552->0.520 to 0.776->0.810)
const minX = 0.250, maxX = 0.410;
const minY = 0.520, maxY = 0.810;

if (warpX > minX && warpX < maxX && warpY > minY && warpY < maxY) {
    // Soften the edges so the "shaving" doesn't look like a sharp cliff
    let edgeBlendX = Math.min(warpX - minX, maxX - warpX) * 10.0; 
    let edgeBlendY = Math.min(warpY - minY, maxY - warpY) * 10.0;
    let blend = Math.max(0, Math.min(1.0, Math.min(edgeBlendX, edgeBlendY)));

    if (blend > 0) {
        // 1. THE GUARANTEE: Shave off any elevation above 0.48 (the "mountain line")
        // We use a blend so the shaving gets more aggressive toward the center
        let mountainCap = 0.48; 
        if (e > mountainCap) {
            e = (e * (1 - blend)) + (mountainCap * blend);
        }

        // 2. THE LEVELING: Smooth out the remaining bumps
        let plainNoise = fbm(warpX * 18, warpY * 18) * 0.03;
        let flatTarget = 0.40 + plainNoise;
        e = (e * (1 - blend)) + (flatTarget * blend);

        // 3. MOISTURE: Force it to stay green/meadow (no desert patches)
        m = Math.max(m, 0.48 * blend); 
    }
}

// --- REVISED SURGERY E: Bottom Left (GUARANTEED SNOW PEAKS) ---
if (warpX > 0.113 && warpX < 0.247 && warpY > 0.708 && warpY < 0.896) {
    let edgeBlendX = Math.min(warpX - 0.113, 0.247 - warpX) * 12.0;
    let edgeBlendY = Math.min(warpY - 0.708, 0.896 - warpY) * 12.0;
    let blend = Math.max(0, Math.min(1.0, Math.min(edgeBlendX, edgeBlendY)));
    
    if (blend > 0) {
        // 1. HIGH FREQUENCY JAGGEDNESS
        // We use a high multiplier (0.5) to ensure very sharp, vertical spikes
        let peakNoise = Math.pow(fbm(warpX * 50, warpY * 50), 2) * 0.5;

        // 2. THE SNOW GUARANTEE
        // Instead of targetE * blend (which goes to 0 at edges), 
        // we use 0.82 as a HARD FLOOR in the center.
        let snowFloor = 0.82; 
        let targetE = snowFloor + peakNoise;

        // 3. AGGRESSIVE UPLIFT
        // We blend the elevation so it aggressively jumps to the snow line
        e = (e * (1 - blend)) + (targetE * blend);

        // 4. MOISTURE ADJUSTMENT (Optional)
        // If your biome code requires high moisture for snow, uncomment this:
        // m = Math.max(m, 0.5 * blend); 
    }
}
                    
    // --- 8. PENINSULAS & EAST CHINA SEA CARVE ---

    // A. CARVE: The Red Triangle (Middle of the Yellow Sea)
    let middleSeaDist = Math.hypot((warpX - 0.66) * 1.2, (warpY - 0.58));
    if (middleSeaDist < 0.12) {
        e = Math.min(e, 0.34); 
    }

    // C. PENINSULA: Qingdao (Shandong)
    let shandongDist = Math.hypot((warpX - 0.59) * 1.5, (warpY - 0.49));
    if (shandongDist < 0.045) { 
        let sLift = smoothstep(0.045, 0.0, shandongDist);
        e = Math.max(e, 0.38 + sLift * 0.15); 
        m += 0.2; 
    }

 
    // E. CARVE: The Bohai Gulf
    let bohaiDist = Math.hypot((warpX - 0.58) * 1.8, (warpY - 0.42));
    if (bohaiDist < 0.06) {
        e = Math.min(e, 0.32); 
    }
// 🛠️ SURGERY: PROMINENT DALIAN BUMP (Image 2)
    let dalianDist = Math.hypot((warpX - 0.63) * 1.5, (warpY - 0.37));
    if (dalianDist < 0.045) {
        let dLift = smoothstep(0.045, 0.0, dalianDist);
        e = Math.max(e, 0.42 + dLift * 0.15); // Solid land
        m += 0.2; // Keep it green, not desert
    }
    // 🛠️ FIX 1: BREAK THE LAND BRIDGE (White Circle)
    // Widened the radius and dropped the elevation to definitively sever the connection.
    let straitDist = Math.hypot((warpX - 0.615), (warpY - 0.44));
    if (straitDist < 0.055) {
        e = Math.min(e, 0.25); // Hard push to ocean
    }

    // 🛠️ FIX 2: NO LAND SOUTH OF COASTLINE (Blue Scribbles)
    // Wipe out the unwanted eastern land blobs south of Y=0.52
    if (warpY > 0.52) {
        // Define a strict diagonal coastline extending downwards
        let strictCoast = 0.54 + (warpY - 0.52) * 0.20; 
        
        // If the coordinate is east of this strict coastline, force it into ocean
        if (warpX > strictCoast) {
            e = Math.min(e, 0.28); 
        }
    }
	

    // Keep coastal waters slightly shallow right next to the mainland so it doesn't instantly drop into abyss
    if (warpY > 0.55 && warpX > 0.55 && warpX < 0.65) {
        if (e < 0.35 && e > 0.25) {
            e = Math.max(e, 0.30);
        }
    }
// 🛠️ SURGERY: NO LAND BLOB (Blue Circle)
    let noLandBlob = Math.hypot((warpX - 0.61), (warpY - 0.65));
    if (noLandBlob < 0.06) {
        e = Math.min(e, 0.25); // Hard sink to ocean
    }

	
	// NORTHEAST ASIA GRADUAL TRANSITION
    if (warpY < 0.45) {

        let blendStart = 0.45;
        let blendEnd = 0.60;
        let forestBlend = Math.max(0, Math.min(1, (warpX - blendStart) / (blendEnd - blendStart)));
        if (forestBlend > 0) {

            let neNoise = fbm(warpX * 12, warpY * 12);

            let targetElevation = 0.42 + neNoise * 0.12; 

            

            e = e * (1 - forestBlend) + Math.max(e, targetElevation) * forestBlend;

            m += forestBlend * 0.5; 

            regionalMountainStrength *= (1 - forestBlend); 

            

            if (forestBlend > 0.8 && e > 0.55) {

                e = 0.55; 

            }

        }
        let neCoastline = 0.65 + (warpY * 0.6) + (fbm(warpX * 10, warpY * 10) * 0.15);

        if (warpX > neCoastline) {

            let neLandExtension = Math.hypot((warpX - 0.95), (warpY - 0.05));

            if (warpY < 0.30 && warpX > 0.70 && neLandExtension < 0.4) {

                e = Math.max(e, 0.40 + (fbm(warpX * 10, warpY * 10) * 0.1)); 

                m += 0.3; 

            } else {

                e = Math.min(e, 0.32); 

            }

        }

    }
// --- 10. JAPAN (Shifted North 15%, 40% Thinner Y-Width) ---
let isJapanRegion = false;

// 1. Center remains shifted North (0.70)
let dx = warpX - 1.15;  
// 2. Squash the Y-axis: Dividing by 0.6 makes the island 40% thinner vertically
let dy = (warpY - 0.70) / 0.6;  

// Distance formula (The skewed ellipse for the island chain)
let japanDist = Math.hypot(dx * 1.5 + dy * 1.0, dy * 1.2 - dx * 0.5);

let islandShatter = fbm(warpX * 18, warpY * 18);
let organicBoundary = japanDist - (islandShatter * 0.18);

// 3. Boundary check (warpY > 0.40 remains the northern threshold)
if (organicBoundary < 0.35 && warpX > 0.88 && warpY > 0.40) {
    if (islandShatter > 0.3) { 
        isJapanRegion = true;
        e = Math.max(e, 0.40 + (islandShatter * 0.35)); 
        
        // MAXIMUM MOISTURE (Lush terrain)
        m = 0.6 + (fbm(warpX * 25, warpY * 25) * 0.3);
        
        if (islandShatter > 0.75) e += 0.2; 
    }
} 
// 4. Deep Sea Mask
else if (warpX > 0.85 && !isJapanRegion && warpY > 0.25) {
    e = Math.min(e, 0.32); 
}


	
	// --- 12.5 SURGERY: SE china & SNOW-FREE PEAKS ---
if (warpY > 0.65 && warpX > 0.25) { 
 
    // This pushes moisture well above the threshold for SE china
    m = Math.max(m, 0.62 + (fbm(warpX * 15, warpY * 15) * 0.1));

    // 2. OCCASIONAL MOUNTAINS (No Snow)
    // If the terrain is already high, we keep it as a mountain.
    // If it's too high (> 0.82), we crush it back down to "Mountain" range (0.72 - 0.81).
    if (e > 0.82) {
        e = 0.75 + (fbm(warpX * 20, warpY * 20) * 0.05); 
    }

    // 3. ADD EXTRA RUGGEDNESS (Karst Mountains)
    // This creates those "Avatar" style pillar mountains common in Southern China
    let southernRuggedness = fbm(warpX * 40, warpY * 40);
    if (southernRuggedness > 0.85) {
        e = Math.max(e, 0.74); // Force a mountain peak here
    }
}

 
			 
         // --- 14. RANDOM PROCEDURAL TRIBUTARIES ---
            // Finer noise for smaller snaking rivers that feed into the macro rivers or oceans.
            // By increasing the frequency (warpX * 15), we get tighter, more natural winding.
            let procRiverNoise = Math.abs(fbm(warpX * 15 + 5, warpY * 15 + 5) - 0.5) * 2.0;
            
            // We tie the river threshold to moisture! Wetter areas spawn more procedural rivers.
            let riverThreshold = 0.012 + Math.max(0, (0.5 - e) * 0.05) + (m * 0.015); 
            
            // Only spawn tributaries in reasonably wet areas, cascading down, and not overwriting macro rivers.
            let isProcRiver = (e >= 0.36 && e < 0.65 && procRiverNoise < riverThreshold && m > 0.45 && !isMacroRiver);

// --- 13. SURGERY: DEEP OCEAN (EAST CHINA SEA / PHILIPPINE SEA) ---
// Target: South of Korea (Y > 0.65), West of Japan (X < 0.95), East of China (X > 0.60)
if (warpY > 0.60 && warpX > 0.58) {
    // We exclude the actual landmasses of Japan and Korea by checking if we are 
    // in the "Japan Region" or within the Korea peninsula bounds.
    let isJapan = (warpX > 0.88 && warpY > 0.55 && organicBoundary < 0.35);
    
    // If we aren't Japan, and we are in this specific coordinate window:
    if (!isJapan) {
        // Deepen the water based on how far East/South we go
        let oceanDepth = 0.22 - (warpX * 0.05) - (warpY * 0.05);
        
        // Final Force Sink: Ensure the elevation is strictly below the Ocean threshold
        // and add some dark water noise.
        let waterNoise = fbm(warpX * 20, warpY * 20) * 0.05;
        e = Math.min(e, oceanDepth + waterNoise);
    }
}


// --- 9. 🛠️ FIX 3: REPOSITION KOREA (Green Box) ---

// Updated the X-boundary check slightly (0.70 to 0.95) to allow for the rightward shift
if (warpY >= 0.15 && warpY <= 0.65 && warpX > 0.70 && warpX < 0.95) { 
    let kProgress = (warpY - 0.15) / 0.50; 
    
    // 1. SHIFT RIGHT: Increased 0.77 to 0.81
    let kCenterX = 0.81 - (kProgress * 0.03); 
    
    // 2. MAKE SKINNIER: Reduced 0.13 to 0.08 and reduced the taper (0.06 to 0.04)
    // This makes the base narrower and ensures it doesn't disappear too much at the tip
    let kWidth = 0.08 - (kProgress * 0.04); 

    let kDistToCenter = Math.abs(warpX - kCenterX);
    
    if (kDistToCenter < kWidth) {
        let kShatter = fbm(warpX * 15, warpY * 15);
        
        e = Math.max(e, 0.45 + (kShatter * 0.2)); 
        m = 0.60; 
        
        if (kDistToCenter < kWidth * 0.4) {
            e += 0.18; // Mountains
        }
        
        if (warpX > kCenterX + (kWidth * 0.5)) {
            e += (fbm(warpX * 30, warpY * 30) * 0.15); 
        }
    }
}



// --- 10. 🏝️ JEJU ISLAND (HALVED SIZE) ---
let jX_Jeju = 0.78;      
let jY_Jeju = 0.71;      
let jSize_Jeju = 0.011;  // Reduced from 0.018 to 0.009 (Exactly half)

let dx_Jeju = (warpX - jX_Jeju);
let dy_Jeju = (warpY - jY_Jeju) * 1.6; 
let dist_Jeju = Math.sqrt(dx_Jeju * dx_Jeju + dy_Jeju * dy_Jeju);

// We also scale the shatter noise down (0.012 -> 0.005) 
// This prevents the island from looking like a tiny pixel-scatter.
let jejuShatter = fbm(warpX * 60, warpY * 60) * 0.005; 
let jejuEdge = jSize_Jeju + jejuShatter;

if (dist_Jeju < jejuEdge) {
    // BASE LANDMASS & VOLCANO
    let jejuPeak = 1.0 - (dist_Jeju / jejuEdge); 
    
    // Elevation: Keeps the volcanic peak logic but on a smaller scale
    e = Math.max(e, 0.45 + (jejuPeak * 0.35)); 
    
    m = 0.80; // Keep it lush
    
    isProcRiver = false;
    isMacroRiver = false;
}
 


 
// 🏔️ORGANIC HIMALAYAN ARC

// 1. Define the Oval Anchor (Off-screen bottom-left for a sweeping arc)
let hCx = -0.05; 
let hCy = 1.05; 

// Radii: Extended width (X) significantly to push further east toward Sichuan.
let hRx = 0.34; // Sweeps out to ~0.29 X (Original was 0.14, so +15% wider)
let hRy = 0.45; // Sweeps up to ~0.60 Y 

// Calculate normalized distance from the center of our oval
let baseDist = Math.pow((nx - hCx) / hRx, 2) + Math.pow((ny - hCy) / hRy, 2);

// 2. Add high-frequency edge warping so the range has craggy ridges, not smooth curves
let macroWarp = fbm(nx * 8, ny * 8) * 0.18;
let microWarp = Math.pow(fbm(nx * 30, ny * 30), 2) * 0.10;
let finalOvalDist = baseDist + macroWarp + microWarp;

// 3. Apply Biomes based on concentric rings radiating from the core
if (finalOvalDist <= 1.2) { 
    
    // Universal craggy texture for the entire uplift area
    let peakNoise = Math.pow(fbm(nx * 45, ny * 45), 2) * 0.35;

    if (finalOvalDist < 0.60) {
        // --- RING 1: DEEP CORE (SNOWY PEAKS) ---
        // Guaranteed snowy peaks (Elevation > 0.82)
        // Gets slightly taller the closer you are to the extreme SW corner
        e = 0.84 + peakNoise + ((0.60 - finalOvalDist) * 0.1); 
        
        // High altitudes freeze out the moisture
        m = 0.15; 
    } 
    else if (finalOvalDist < 0.85) {
        // --- RING 2: BARRIER RANGE (MOUNTAINS) ---
        // Blends from Snow (0.82) down to regular Mountains (0.72)
        let mountainBlend = (finalOvalDist - 0.60) / 0.25; // Normalizes to 0.0 - 1.0
        
        // As mountainBlend goes up, elevation goes down
        e = (0.83 * (1 - mountainBlend)) + (0.71 * mountainBlend) + (peakNoise * 0.8);
        
        // Moisture starts climbing rapidly on the lower slopes
        m = 0.30 + (mountainBlend * 0.35); 
    } 
    else {
        // --- RING 3: FOOTHILLS & BIOME BLEND (MEADOW / JUNGLE) ---
        // Tapering out from the mountains into the surrounding map (0.85 to 1.2)
        let taperBlend = (finalOvalDist - 0.85) / 0.35; // Normalizes to 0.0 - 1.0
        
        // Drop elevation smoothly into rolling foothills/highlands (~0.55)
        let targetE = 0.55 + (fbm(nx * 15, ny * 15) * 0.1); 
        
        // Fade the mountain elevation into the target elevation
        e = (e * taperBlend) + (targetE * (1 - taperBlend));

        // FORCE LUSH VEGETATION: The eastern slopes are incredibly wet.
        // We push moisture high enough to trigger your Meadow (>0.42) and Jungle (>0.75) biomes.
        let wetNoise = fbm(nx * 15, ny * 15) * 0.25;
        
        // Base moisture increases the further east (nx) we go
        let lushMoisture = 0.60 + wetNoise + (nx * 0.2); 
        
        // Aggressively override the local moisture to ensure it stays green
        m = Math.max(m, lushMoisture);
    }
}

// ☢️ THE ORGANIC HENAN FIX (Shifted Further Down/Left + Larger)
// X: 0.46 -> 0.43 (Further West/Left)
// Y: 0.52 -> 0.56 (Further South/Down)
// Radius: 0.12 -> 0.16 (Larger coverage)
let henX = 0.43; 
let henY = 0.56; 
let henRadius = 0.16; 

// Use warpX/Y to keep the edges of the "dry zone" jagged and natural
let henDist = Math.hypot(warpX - henX, warpY - henY);

if (henDist < henRadius) {
    // 1. Create a smooth falloff (1.0 at center, 0.0 at edge)
    let nukeStrength = 1.0 - (henDist / henRadius);
    
    // 2. ABSOLUTE VETO: Kill all river flags in this zone
    isProcRiver = false;
 

    // 3. ELEVATION LIFT: Force the ground above the water table (0.35)
    // We target ~0.42 (Plains) and blend it with existing terrain
    let targetE = 0.42 + (fbm(warpX * 25, warpY * 25) * 0.04);
    e = (e * (1 - nukeStrength)) + (Math.max(e, targetE) * nukeStrength);
    
    // 4. MOISTURE BALANCE: Ensure it stays green (Meadow/Forest) but not "Swampy"
    // Setting m to 0.52 keeps it in the temperate range
    m = (m * (1 - nukeStrength)) + (0.52 * nukeStrength);
}

 
// 🏔️ THE MOUNT WUTAI / SHAANXI RIDGE (Thin Profile)
let sxX = 0.43; 
let sxY = 0.45; 
let sxWidth = 0.08;  // Thinner East-West
let sxHeight = 0.20; // Taller North-South

// Calculate Elliptical Distance
// We normalize dx and dy by their respective "radii"
let dxx = (warpX - sxX) / sxWidth;
let dyy = (warpY - sxY) / sxHeight;
let sxDist = Math.sqrt(dxx * dxx + dyy * dyy);

if (sxDist < 1.0) {
    // 1. Smooth Falloff (1.0 at center ridge, 0.0 at edges)
    let sxStrength = Math.pow(1.0 - sxDist, 2);
    
    // 2. The "Mountain Lift" 
    // Increased liftAmount (0.22) to ensure it feels like a ridge/mountain
    let liftAmount = 0.22 * sxStrength; 
    e += liftAmount;

    // 3. High-Altitude Ruggedness
    // Using a higher frequency fbm (70) to make the mountain look craggy
    let mountainCrag = fbm(warpX * 70, warpY * 70) * 0.05 * sxStrength;
    e += mountainCrag;

    // 4. Rain Shadow Effect
    // Higher altitudes are usually dryer; shifting moisture down
    m -= 0.25 * sxStrength;

    // 5. Drainage Veto
    // Rivers don't usually sit on top of narrow ridges
    if (sxStrength > 0.5) {
        isProcRiver = false;
      
    }
}

// 🏔️ THE QILIAN MOUNTAIN BARRIER (REVISED STRETCH & SMOOTH)
let qX_QL = 0.15;  // ⬅️ Decrease this to move it WEST (Left)
let qY_QL = 0.22;  // ⬆️ Decrease this to move it NORTH (Up)       
let qRx_QL = 0.16;        
let qRy_QL = 0.025;       
let qAngle_QL = 35;       

// 1. ROTATE COORDINATES
let angleRad_QL = qAngle_QL * (Math.PI / 180);
let cosA_QL = Math.cos(angleRad_QL);
let sinA_QL = Math.sin(angleRad_QL);

let dx_QL = warpX - qX_QL;
let dy_QL = warpY - qY_QL;

let rotX_QL = dx_QL * cosA_QL + dy_QL * sinA_QL;
let rotY_QL = -dx_QL * sinA_QL + dy_QL * cosA_QL;

// 2. ADAPTIVE WIGGLE (Less snaky on the SE side)
// We calculate a 'smoothFactor' that is 1.0 at the NW and 0.0 at the SE.
let smoothFactor = 1.0 - Math.max(0, Math.min(1, (rotX_QL / qRx_QL) + 0.5));
rotY_QL += Math.sin(rotX_QL * 25) * (0.005 * smoothFactor);

// 3. ASYMMETRIC DISTANCE CALCULATION
// Normalize rotX to range roughly -1.0 (NW) to 1.0 (SE)
let normX = rotX_QL / qRx_QL;
let xTaper;

if (normX < 0) {
    // NORTHWEST SIDE: Use a low power (1.2) to "stretch" the tail out further
    xTaper = Math.pow(Math.abs(normX), 1.2);
} else {
    // SOUTHEAST SIDE: Use a high power (3.0) to blunt the end and stop it early
    xTaper = Math.pow(normX, 3.0);
}

let qBaseDist_QL = Math.abs(rotY_QL / qRy_QL) + xTaper;

// 4. COMBINE AND SHATTER
// We also reduce the noise influence on the SE side using the same smoothFactor
let noiseAmount = 0.15 + (0.25 * smoothFactor); 
let qJagged_QL = qBaseDist_QL + (fbm(warpX * 40, warpY * 40) * noiseAmount);

// --- SURROUNDING DESERTIFICATION ---
if (qBaseDist_QL < 2.0) {
    let haloStrength_QL = 1.0 - Math.min(1.0, qBaseDist_QL / 2.0);
    m = (m * (1 - haloStrength_QL)) + (0.12 * haloStrength_QL);
    
    if (qJagged_QL > 1.0) {
        e = (e * (1 - haloStrength_QL)) + (0.42 * haloStrength_QL);
    }
}

// --- THE SNOWY PEAKS ---
if (qJagged_QL < 1.0) {
    let qStrength_QL = Math.pow(1.0 - qJagged_QL, 2);
    let peakNoise_QL = Math.pow(fbm(warpX * 60, warpY * 60), 2) * 0.5;
    
    e = Math.max(e, 0.80 + (qStrength_QL * 0.15) + peakNoise_QL);
    m = Math.min(m, 0.15);
    
    isProcRiver = false;
  
}



//MACRO RIVER LOGIC
// Only allow rivers on land above sea level but below high peaks

    
    // Create an organic thickness. The fbm noise makes the river width pulse slightly
    // rather than looking like a perfectly uniform digital line.
    let baseThickness = 0.0035; 
    let riverEdgeNoise = fbm(warpX * 30, warpY * 30) * 0.002;
    let finalThickness = baseThickness + riverEdgeNoise;

    // Check Yellow River (using warpX and warpY so the noise naturally jags the line!)
    if (checkHardcodedRiver(warpX, warpY, YELLOW_RIVER_COORDS, finalThickness)) {
        isMacroRiver = true;
    }

    // Check Yangtze River
    if (!isMacroRiver && checkHardcodedRiver(warpX, warpY, YANGTZE_RIVER_COORDS, finalThickness)) {
        isMacroRiver = true;
    }
	
	// MACRO RIVER LOGIC
// Only allow rivers on land above sea level but below high peaks

// Create an organic thickness specific to the Tibet region
let baseThickness_tibet = 0.0035; 
let riverEdgeNoise_tibet = fbm(warpX * 30, warpY * 30) * 0.002;
let finalThickness_tibet = baseThickness_tibet + riverEdgeNoise_tibet;

// Tributaries should be thinner than the main arteries
let tributaryThickness_tibet = (baseThickness_tibet * 0.6) + riverEdgeNoise_tibet; 

// Check Yellow River (using global coords and local tibet thickness logic)
if (checkHardcodedRiver(warpX, warpY, YELLOW_RIVER_COORDS, finalThickness_tibet)) {
    isMacroRiver = true;
}

// Check main Yangtze River
if (!isMacroRiver && checkHardcodedRiver(warpX, warpY, YANGTZE_RIVER_COORDS, finalThickness_tibet)) {
    isMacroRiver = true;
}

// Check Tibet Tributaries (South-West) with updated tibet naming
if (!isMacroRiver && (
    checkHardcodedRiver(warpX, warpY, TIBET_RIVER_A, tributaryThickness_tibet) ||
    checkHardcodedRiver(warpX, warpY, TIBET_RIVER_B, tributaryThickness_tibet) ||
    checkHardcodedRiver(warpX, warpY, TIBET_RIVER_C, tributaryThickness_tibet)
)) {
    isMacroRiver = true;
}
	
	
// --- NEW EMERGENCY FILTER: SOUTHERN MOISTURE CAP ---
    // User logic: "If y is above the second half (bottom half), m cannot exceed 60"
    if (j > ROWS * 0.5) { 
        // We assume m is on a 0-100 scale here based on your "60" and "59" values.
        // If your m is 0.0 to 1.0, use (m > 0.60) and (m = 0.59)
        let mCheck = m * 100; 
        if (mCheck > 60) {
            m = 59 / 100; 
        }
    }

// --- 15 TILE ASSIGNMENT & BIOME RULES ---
let tile = { 
    id: 0, 
    color: "", 
    speed: 1.0, 
    impassable: false, 
    name: "",
    e: e, 
    m: m 
};

// 1. WATER & RIVERS
if (e < 0.25) {
    tile.name = "Ocean"; tile.color = PALETTE.ocean; tile.speed = 1.5; 
} else if (e < 0.35) {
    tile.name = "Coastal"; tile.color = PALETTE.coastal; tile.speed = 1.1; 
} else if (isMacroRiver || isProcRiver) {
    tile.name = "River"; 
    tile.color = PALETTE.coastal; // Using your coastal color for rivers
    tile.speed = 1.3;
} 

// 2. HIGH ALTITUDE (Mountains & Snow)
else if (e > 0.82) {
    // Roof of the world / Himalayas
    tile.name = "Large Mountains"; tile.color = PALETTE.snow; tile.speed = 0.3; tile.impassable = false;
} else if (e > 0.72) {
    // High Mountains
    tile.name = "Mountains"; tile.color = PALETTE.mountains; tile.speed = 0.3;
} else if (e > 0.58) {
    // Highlands / Plateaus
    if (m < 0.2) {
        tile.name = "Highlands"; tile.color = PALETTE.highlands; tile.speed = 0.45;
    } else if (m > 0.4) {
        // High moisture in highlands = Jungle (e.g., Yunnan/Taiwan)
        tile.name = "Dense Forest"; tile.color = PALETTE.jungle; tile.speed = 0.3;
    } else {
        tile.name = "Highlands"; tile.color = PALETTE.highlands; tile.speed = 0.45;
    }
} 



// 3. LOWLANDS (The moisture-rich biomes)
else {
    if (m < 0.25) {
        tile.name = "Desert"; tile.color = PALETTE.desert; tile.speed = 0.4;
    } else if (m < 0.35) {
        tile.name = "Dunes"; tile.color = PALETTE.dune; tile.speed = 0.45;
    } else if (m > 0.75) {
      //  tile.name = "Dense Forest"; tile.color = PALETTE.jungle; tile.speed = 0.24;
	          tile.name = "Forest"; tile.color = PALETTE.forest; tile.speed = 0.4;
    } else if (m > 0.55) {
        tile.name = "Forest"; tile.color = PALETTE.forest; tile.speed = 0.4;
    } else if (m > 0.42) {
        tile.name = "Plains"; tile.color = PALETTE.meadow; tile.speed = 0.5;
    } else {
        // Default temperate land
        tile.name = "Steppes"; tile.color = PALETTE.plains; tile.speed = 0.49;
    }
}

            // --- 12. DATA SAVING & CANVAS RENDERING ---
            worldMap[i][j] = tile;
            
            // Assuming bgCtx and TILE_SIZE are defined in your upper scope
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
// 1. DYNAMIC FOREST FADE (FAST + NO STRAIGHT BORDER)
if (tile.name.includes("Forest")) {
    // Cheap irregular border wobble, no fbm
    const borderWobble =
        (hash(i >> 1, j >> 1) - 0.5) * 0.14 +
        (hash(i, j) - 0.5) * 0.05 +
        Math.sin(ny * 14) * 0.01;

    // Slightly warped eastward fade instead of a perfect vertical line
    let jurchenFade = Math.max(0, Math.min(1, (nx + borderWobble - 0.45) / 0.25));

    // Keep your original density feel
    let densityThreshold = 0.5 - (jurchenFade * 0.45);

    // Korea suppression BEFORE the spawn test so it actually works
    const isKorea =
        (nx > 0.65 + (hash(i >> 2, j >> 2) - 0.5) * 0.03) &&
        (ny > 0.35) &&
        (ny < 0.65);

    if (isKorea) {
        densityThreshold = 0.95;
    }

    if (Math.random() > densityThreshold) {
        bgCtx.fillStyle = tile.color === PALETTE.jungle ? "#232e1a" : "#364528";
        bgCtx.beginPath();

        // Keep your original tree shape
        let treeSize = TILE_SIZE * (0.3 + (jurchenFade * 0.5));
        bgCtx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, treeSize, 0, Math.PI, true);
        bgCtx.fill();
    }
}
else if (tile.name === "Highlands") {
    // --- 0. WATER SAFETY CHECK ---
    // Check neighbors to ensure we aren't drawing hills/trees into a river or ocean
    let isNearWater = false;
    for (let ni = -1; ni <= 1; ni++) {
        for (let nj = -1; nj <= 1; nj++) {
            let neighbor = worldMap[i + ni] ? worldMap[i + ni][j + nj] : null;
            if (neighbor) {
                const nName = neighbor.name;
                if (nName.includes("Ocean") || nName.includes("Coastal") || nName === "River") {
                    isNearWater = true;
                    break;
                }
            }
        }
        if (isNearWater) break;
    }

    // Only proceed with decorative logic if we are safely inland
    if (!isNearWater) {
        const isNorthChina = (nx > 0.3 && nx < 0.7 && ny > 0.3 && ny < 0.6);
        const isMongolia = (nx < 0.45 && ny < 0.4);
        const isAridNorth = isNorthChina || isMongolia;
        
        // --- 1. DYNAMIC FADING ---
        let edgeFade = tile.e ? Math.min(1, (tile.e - 0.55) * 5) : 1; 

        // --- 2. REGIONAL LOGIC (Hills & Trees) ---
        if (isAridNorth) {
            // MONGOLIA / NORTH CHINA: Hills and trees are very rare
            if (Math.random() < 0.05 * edgeFade) {
                drawHighlandBump(bgCtx, px, py, TILE_SIZE);
            }

            if (Math.random() > 0.985) {
                drawHighlandTree(bgCtx, px, py, "#4a5d3a", 0.3);
            }
        } else {
            // SOUTHERN / GENERAL HIGHLANDS: Fairly popular frequency
            if (Math.random() < 0.7 * edgeFade) {
                drawHighlandBump(bgCtx, px, py, TILE_SIZE);
            }

            // Tree frequency at 15% with clusters
            if (Math.random() > 0.85 * (2 - edgeFade)) {
                let treeColor = "#2d4c1e"; 
                drawHighlandTree(bgCtx, px, py, treeColor, 0.4);
                
                if (Math.random() > 0.5) {
                    drawHighlandTree(bgCtx, px + 2, py + 1, treeColor, 0.25);
                }
            }
        }

        // Standard ground grit (Only inland)
        if (Math.random() > 0.95) {
            bgCtx.fillStyle = "rgba(0,0,0,0.03)";
            bgCtx.fillRect(px + Math.random()*TILE_SIZE, py + Math.random()*TILE_SIZE, 1, 1);
        }
    }
}




    
else if(tile.name === "Steppes" || tile.name === "Desert") {
    let nx = i / COLS;
    let ny = j / ROWS;

    // 1. RARE TREES: Reduced from > 0.96 (4%) to > 0.995 (0.5%)
    // This makes trees feel like a rare oasis or a lone hardy shrub.
    if (nx < 0.45 && ny < 0.4 && Math.random() > 0.995) {
        bgCtx.fillStyle = "#364528";
        bgCtx.beginPath();
        bgCtx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE * 0.4, 0, Math.PI * 2);
        bgCtx.fill();
    } 
    // 2. FREQUENT GRIT: Increased from > 0.8 (20%) to > 0.4 (60%)
    // This ensures most tiles have some texture, giving it a dusty, granular feel.
    else if(Math.random() > 0.4) {
        bgCtx.fillStyle = "rgba(0,0,0,0.04)"; // Slightly more visible grit
        bgCtx.beginPath();
        bgCtx.arc(px + Math.random()*TILE_SIZE, py + Math.random()*TILE_SIZE, Math.random()*2+0.5, 0, Math.PI*2);
        bgCtx.fill();
    }
}

else if(tile.name === "Meadow" || tile.name === "Plains") {
    // 1. SCATTERED TREES (Increased to 16% chance: 4x the original 4%)
    if (Math.random() > 0.84) { 
        bgCtx.fillStyle = "#425232"; 
        bgCtx.beginPath();
        bgCtx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE * 0.5, 0, Math.PI, true);
        bgCtx.fill();
    } 
    // 2. LUSH TEXTURE (Remains popular on non-tree tiles)
    else if(Math.random() > 0.7) { 
        bgCtx.fillStyle = "rgba(255,255,255,0.15)";
        bgCtx.beginPath();
        bgCtx.arc(px + Math.random()*TILE_SIZE, py + Math.random()*TILE_SIZE, Math.random()*2+1, 0, Math.PI*2);
        bgCtx.fill();
    }
}

else if (tile.name !== "Ocean" && tile.name !== "River"&& tile.name !== "Coastal") {
            // --- GENERIC GRASS TUFTS ---
            // Catch-all for any land tiles that didn't get specific textures above
            if (Math.random() > 0.98) { // Rare enough to not look like noise
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
               
            }
        }
// --- BIOMATIC FOREST ENGINE ---
if(tile.name.includes("Forest") || tile.color === PALETTE.jungle) {
    let nx = i / COLS;
    let ny = j / ROWS;
    
    // Calculate regional influences
    let jurchenFade = Math.max(0, Math.min(1, (nx - 0.45) / 0.20));
    
    // --- NEW BOUNDARY LOGIC: CURVED & BLENDED ---
    
    // 1. Far North Curve (y ≈ 0.35)
    let northCurve = 0.35 + (Math.sin(nx * Math.PI * 4) * 0.03) + (Math.cos(nx * Math.PI * 8) * 0.015);
    let northBlendChance = Math.max(0, Math.min(1, (northCurve + 0.05 - ny) / 0.10));
    
    // 2. Deep South / Jungle Curve (y ≈ 0.70)
    // Highland Perturbation: The tree transition will naturally climb and wrap around elevation (tile.e > 0.55 is highland)
    let highlandPerturbation = tile.e > 0.55 ? (tile.e - 0.55) * 0.15 : 0;
    let southCurve = 0.70 + (Math.sin(nx * Math.PI * 5) * 0.035) + (Math.cos(nx * Math.PI * 7) * 0.015) - highlandPerturbation;
    let southBlendChance = Math.max(0, Math.min(1, (ny - (southCurve - 0.05)) / 0.10));
    
    // 3. Arid West Curve (x ≈ 0.30)
    let westCurve = 0.30 + (Math.sin(ny * Math.PI * 4) * 0.03) + (Math.cos(ny * Math.PI * 9) * 0.02);
    let westBlendChance = Math.max(0, Math.min(1, (westCurve + 0.05 - nx) / 0.10));
    
    // 4. Roll the dice for this specific tree's biome style
    let isFarNorth = Math.random() < northBlendChance;
    let isJungleTile = tile.color === PALETTE.jungle;
    // Jungle palettes organically blend into regular south trees, avoiding hard color cutoffs on highland borders
    let isDeepSouth = Math.random() < southBlendChance || (isJungleTile && Math.random() > 0.15);
    let isAridWest = Math.random() < westBlendChance;

    // Density: Thicker in the South and Jurchen East
    let densityThreshold = (0.45 - (jurchenFade * 0.1) - (ny * 0.2)) / 3;

    if(Math.random() > densityThreshold) { 
        let offsetX = (Math.random() - 0.5) * (TILE_SIZE * 0.5);
        let offsetY = (Math.random() - 0.5) * (TILE_SIZE * 0.5);
        let cx = px + TILE_SIZE/2 + offsetX;
        let cy = py + TILE_SIZE/2 + offsetY;
        
        let treeSize = TILE_SIZE * (0.35 + (jurchenFade * 0.3) + (Math.random() * 0.3));
        let treeRand = Math.random();

        bgCtx.save();

        // --- SPECIES LOGIC BY CLIMATE ---

        if (isFarNorth) {
            // 1. MANCHURIAN LARCH / TAIGA (Tiered Conifers)
            let tiers = 2 + Math.floor(Math.random() * 2);
            bgCtx.fillStyle = `rgb(${10 + Math.random()*10}, ${20 + Math.random()*10}, 15)`;
            
            for(let t = 0; t < tiers; t++) {
                let ty = cy - (t * (treeSize * 0.4));
                let tw = treeSize * (1 - (t * 0.3));
                bgCtx.beginPath();
                bgCtx.moveTo(cx, ty - treeSize);
                bgCtx.lineTo(cx - tw, ty);
                bgCtx.lineTo(cx + tw, ty);
                bgCtx.closePath();
                bgCtx.fill();
            }
        } 
        else if (isDeepSouth) {
            if (treeRand > 0.4) {
                // 2. ANCIENT BANYAN (Wide Broadleaf)
                let leafColors = ["#0D1F1D", "#1A2F18", "#142414"];
                for(let l = 0; l < 3; l++) {
                    bgCtx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
                    let lx = cx + (Math.random() - 0.5) * treeSize;
                    let ly = cy + (Math.random() - 0.5) * treeSize;
                    bgCtx.beginPath();
                    bgCtx.ellipse(lx, ly, treeSize * 0.8, treeSize * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
                    bgCtx.fill();
                }
            } else {
                // 3. RIVER BAMBOO (Vertical Clusters)
                bgCtx.strokeStyle = "#1B2B12";
                bgCtx.lineWidth = 1;
                for(let b = 0; b < 3; b++) {
                    let bx = cx + (b * 2) - 2;
                    let bh = treeSize * (0.8 + Math.random() * 0.5);
                    bgCtx.beginPath();
                    bgCtx.moveTo(bx, cy);
                    bgCtx.lineTo(bx + (Math.random()-0.5), cy - bh);
                    bgCtx.stroke();
                    // Small dark leaf tuft
                    bgCtx.fillStyle = "#2D3B1E";
                    bgCtx.beginPath();
                    bgCtx.arc(bx, cy - bh, 1.5, 0, Math.PI * 2);
                    bgCtx.fill();
                }
            }
        } 
        else if (isAridWest) {
            // 4. STEPPE CYPRESS / SCRUB (Stunted & Thin)
            bgCtx.fillStyle = "#222B1A";
            bgCtx.beginPath();
            bgCtx.ellipse(cx, cy, treeSize * 0.3, treeSize, 0, 0, Math.PI * 2);
            bgCtx.fill();
        } 
        else {
            // 5. CENTRAL SONG WILLOW / OAK (Drooping & Round)
            bgCtx.fillStyle = `rgb(${25 + Math.random()*10}, ${35 + Math.random()*10}, 20)`;
            bgCtx.beginPath();
            // Main canopy
            bgCtx.arc(cx, cy, treeSize, 0, Math.PI * 2);
            // Drooping clusters for Willows
            if (treeRand > 0.7) {
                bgCtx.arc(cx - treeSize * 0.5, cy + treeSize * 0.3, treeSize * 0.6, 0, Math.PI * 2);
                bgCtx.arc(cx + treeSize * 0.5, cy + treeSize * 0.3, treeSize * 0.6, 0, Math.PI * 2);
            }
            bgCtx.fill();
        }

        // Final detail: Subtle charcoal outline for all types
        bgCtx.strokeStyle = "rgba(0,0,0,0.4)";
        bgCtx.lineWidth = 0.3;
        bgCtx.stroke();
        
        bgCtx.restore();
    }
}
  // --- MOUNTAIN ICONS & TIMBERLINES (SPARSE PEAKS, DENSE TREES) ---
if (tile.name.includes("Mountain") || tile.name.includes("Large Mountains")) {
    
    let isDryMountains = tile.name.includes("Large Mountains");
    let isExtremePeak = tile.name === "Large Mountains"; // Differentiate between pure white and icy blue

    // ==========================================
    // 1. PEAK GENERATION (Drastically Reduced)
    // ==========================================
    // Snowy gets ~3% chance, Regular gets ~1% chance to draw a peak
    let peakSpawnThreshold = isDryMountains ? 0.97 : 0.97;

    if (hash(i, j) > peakSpawnThreshold) {
        
        let isInvalidTerrain = false;
        
        // 1a. HARD GUARD: Just in case the tile itself is water-based
        let tName = tile.name;
        if (tName.includes("Ocean") || tName.includes("Coastal") || tName === "River") {
            isInvalidTerrain = true;
        }

        // 1b. NEIGHBOR GUARD: Check surroundings
        if (!isInvalidTerrain) {
            for (let ni = -1; ni <= 1; ni++) {
                for (let nj = -1; nj <= 1; nj++) {
                    let neighbor = worldMap[i + ni] ? worldMap[i + ni][j + nj] : null;
                    if (neighbor) {
                        let nName = neighbor.name;
                        if (nName.includes("Ocean") || nName.includes("Coastal") || nName === "River") {
                            isInvalidTerrain = true; 
                            break;
                        }
                    }
                }
                if (isInvalidTerrain) break; // Break outer loop early if water is found
            }
        }
        
        if (!isInvalidTerrain) {
            // SCALE LOGIC: 
            // Bumps = ~1x. Mountains = 4x Bumps. Snowy = 8x Mountains (32x).
            let scaleMultiplier = isDryMountains ? 4 : 2; 

            let randomXOffset = (Math.random() - 0.5) * 120; 
            let randomYOffset = (Math.random() - 0.5) * 120; 
            let finalPx = px + randomXOffset;
            let finalPy = py + randomYOffset;

            // Apply scale multiplier to height and width variance
            let randomHeightVar = (Math.random() - 0.5) * (15 * (scaleMultiplier / 4)); 
            let randomWidthVar = (Math.random() - 0.5) * (30 * (scaleMultiplier / 4)); 
            
            // Base calculations scaled up
            let baseHeight = Math.max(8, (tile.e - 0.5) * 25 + 5);
            let height = (baseHeight * (scaleMultiplier / 2.5)) + randomHeightVar; 
            let width = (TILE_SIZE * scaleMultiplier) + randomWidthVar;

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
            bgCtx.shadowBlur = 15;
            bgCtx.shadowColor = 'rgba(0,0,0,0.3)';

            // Dispatch to the correct helper function
            if (isDryMountains) {
                drawSnowyPeak(bgCtx, finalPx, finalPy, width, height, isExtremePeak, TILE_SIZE);
            } else {
                drawMountain(bgCtx, finalPx, finalPy, width, height, TILE_SIZE);
            }

            bgCtx.restore();
        }
    }


// --- NEW SPECIES ENGINE (DEEP JUNGLE / MOUNTAIN VARIANT) ---
let treeDensity = isDryMountains ? 0.95 : 0.35; 
let maxTrees = isDryMountains ? 1 : 3; 

for(let t = 0; t < maxTrees; t++) {
    if (Math.random() > treeDensity) {
        let treeX = px + TILE_SIZE/2 + ((Math.random() - 0.5) * TILE_SIZE * 0.9);
        let treeY = py + TILE_SIZE/2 + ((Math.random() - 0.5) * TILE_SIZE * 0.9);
        
        const treeRand = Math.random();
        bgCtx.save();

        if (isDryMountains) {
            // --- STYLE: TIERED HIGHLAND PINE (Midnight Evergreen) ---
            let tiers = 2 + Math.floor(Math.random() * 2);
            let treeWidth = TILE_SIZE * (0.4 + Math.random() * 0.3);
            
            // Much darker, desaturated alpine greens
            bgCtx.fillStyle = `rgb(${15 + Math.random()*10}, ${25 + Math.random()*10}, 20)`;
            
            for(let i = 0; i < tiers; i++) {
                let levelY = treeY - (i * 3);
                let levelW = treeWidth * (1 - (i * 0.3));
                bgCtx.beginPath();
                bgCtx.moveTo(treeX, levelY - 5);
                bgCtx.lineTo(treeX - levelW, levelY);
                bgCtx.lineTo(treeX + levelW, levelY);
                bgCtx.closePath();
                bgCtx.fill();
            }
        } 
        else if (treeRand > 0.6) {
            // --- STYLE: SOUTHERN BANYAN (Ancient Deep Broadleaf) ---
            let canopySize = TILE_SIZE * (0.5 + Math.random() * 0.4);
            
            // Deep Emerald, Moss Black, and Humid Teal
            let leafColors = ["#1A2F18", "#0D1F1D", "#223311", "#142414"];
            
            for(let i = 0; i < 4; i++) {
                bgCtx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
                let offX = (Math.random() - 0.5) * canopySize;
                let offY = (Math.random() - 0.5) * canopySize;
                bgCtx.beginPath();
                bgCtx.ellipse(treeX + offX, treeY + offY, canopySize*0.6, canopySize*0.4, Math.random()*Math.PI, 0, Math.PI*2);
                bgCtx.fill();
            }
        } 
        else {
            // --- STYLE: BAMBOO THICKET (Deep Olive Shadow) ---
            let stalks = 2 + Math.floor(Math.random() * 3);
            for(let s = 0; s < stalks; s++) {
                let sX = treeX + (s * 2) - 2;
                let sH = 6 + Math.random() * 6;
                
                // Dark Wax-Green Stalks
                bgCtx.strokeStyle = "#2D3B1E";
                bgCtx.lineWidth = 1.2; // Slightly thicker for visibility in dark
                bgCtx.beginPath();
                bgCtx.moveTo(sX, treeY);
                bgCtx.lineTo(sX + (Math.random()-0.5), treeY - sH);
                bgCtx.stroke();
                
                // Shadowed Leaves
                bgCtx.fillStyle = "#3E4D26";
                bgCtx.beginPath();
                bgCtx.arc(sX, treeY - sH, 1.5, 0, Math.PI*2);
                bgCtx.fill();
            }
        }
        bgCtx.restore();
    }
}
}}}
	
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

 if (typeof window.hideLoadingScreen === 'function') {
    window.hideLoadingScreen();
}

        AudioManager.playMusic("WorldMap_Calm");
    }

function smoothstep(edge0, edge1, x) {
    // Scales, clamps and interpolates x into a 0.0 to 1.0 range
    let t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// Helper function to keep the main loop clean
function drawHighlandTree(ctx, x, y, color, scale) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE * scale, 0, Math.PI, true);
    ctx.fill();
}

// =====================================================================
        // TERRAIN SURGERY: Post-processing pass for specific mountain/snow zones
        // =====================================================================
        
        // Helper: Calculate normalized distance to a rotated ellipse (<= 1.0 is inside)
        function getEllipseDistance(col, row, cxPct, cyPct, rxPct, ryPct, angleDeg) {
            let cx = COLS * cxPct;
            let cy = ROWS * cyPct;
            let rx = COLS * rxPct;
            let ry = ROWS * ryPct;

            let angleRad = angleDeg * (Math.PI / 180);
            let cosA = Math.cos(angleRad);
            let sinA = Math.sin(angleRad);

            let dx = col - cx;
            let dy = row - cy;

            // Rotate point backwards to align with standard axis
            let rotX = dx * cosA + dy * sinA;
            let rotY = -dx * sinA + dy * cosA;

            return Math.sqrt((rotX * rotX) / (rx * rx) + (rotY * rotY) / (ry * ry));
        }

        // Helper: Calculate normalized distance to a square/box (<= 1.0 is inside)
        function getBoxDistance(col, row, cxPct, cyPct, sizeXPct, sizeYPct) {
            let cx = COLS * cxPct;
            let cy = ROWS * cyPct;
            let hw = COLS * sizeXPct * 0.5; 
            let hh = ROWS * sizeYPct * 0.5;

            let dx = Math.abs(col - cx) / hw;
            let dy = Math.abs(row - cy) / hh;

            return Math.max(dx, dy); 
        }
		
		// Mathematical helper to find the shortest distance from a pixel to a line segment
function getDistanceToSegment(px, py, x1, y1, x2, y2) {
    let A = px - x1;
    let B = py - y1;
    let C = x2 - x1;
    let D = y2 - y1;

    let dot = A * C + B * D;
    let len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0) param = dot / len_sq;

    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    let dx = px - xx;
    let dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// Checks if the current coordinate is close enough to any segment in your river array
function checkHardcodedRiver(x, y, riverArray, thickness) {
    for (let k = 0; k < riverArray.length - 1; k++) {
        let p1 = riverArray[k];
        let p2 = riverArray[k + 1];
        let dist = getDistanceToSegment(x, y, p1[0], p1[1], p2[0], p2[1]);
        
        if (dist < thickness) {
            return true;
        }
    }
    return false;
}

 
 
 
 function getMountainAlpha(size, tileSize) {
    // Bigger mountains = less translucent
    let t = Math.max(0, Math.min(1, size / (tileSize * 2.0)));

    // Small peaks: a bit more see-through
    // Large peaks: mostly solid
    let alpha = 0.78 + (t * 0.18); // 0.78 -> 0.96

    // Slight random variation
    alpha += (Math.random() * 0.08) - 0.04; // +/- 0.04

    return Math.max(0.72, Math.min(0.98, alpha));
}

function drawHighlandBump(ctx, px, py, size) {
    let bumpX = px + (Math.random() * size);
    let bumpY = py + (size * 0.8);
    let bumpW = size * (0.5 + Math.random() * 0.5);
    let bumpH = bumpW * 0.4;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + Math.random() * 0.08})`;

    ctx.beginPath();
    ctx.ellipse(bumpX, bumpY, bumpW, bumpH, 0, 0, Math.PI, true);
    ctx.fill();
}

function drawMountain(ctx, x, y, width, height, tileSize) {
    const alpha = getMountainAlpha(height, tileSize);

    // Brown backfill for normal mountains
    ctx.fillStyle = `rgba(62, 52, 42, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y + tileSize);
    ctx.quadraticCurveTo(x, y + tileSize - (height * 1.4), x + width / 2, y + tileSize);
    ctx.fill();

    // Lighter brown top layer
    ctx.fillStyle = `rgba(117, 102, 84, ${Math.min(0.98, alpha + 0.02)})`;

    for (let b = 0; b < 2; b++) {
        let shift = (b - 0.5) * (width * 0.3);
        let bWidth = width * 0.6;
        let bHeight = height * 0.7;

        ctx.beginPath();
        ctx.moveTo(x + shift - bWidth / 2, y + tileSize);
        ctx.quadraticCurveTo(x + shift, y + tileSize - bHeight, x + shift + bWidth / 2, y + tileSize);
        ctx.fill();
    }

    ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.05})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y + tileSize);
    ctx.quadraticCurveTo(x, y + tileSize - (height * 1.4), x + width / 2, y + tileSize);
    ctx.stroke();
}

function drawSnowyPeak(ctx, x, y, width, height, isExtremePeak, tileSize) {
    const alpha = getMountainAlpha(height, tileSize);
    if (alpha <= 0) return;

    // Local scaling factor (1/4 size)
    const sW = width * 0.25;
    const sH = height * 0.25;

    // 1. THE JAGGED BASE
    ctx.fillStyle = `rgba(100, 115, 140, ${alpha})`; 
    ctx.beginPath();
    ctx.moveTo(x - sW / 2, y + tileSize); // Bottom Left
    
    // Jagged ascent
    ctx.lineTo(x - sW * 0.25, y + tileSize - sH * 0.4); 
    ctx.lineTo(x, y + tileSize - sH * 1.4); // Sharp Summit
    ctx.lineTo(x + sW * 0.25, y + tileSize - sH * 0.4);
    ctx.lineTo(x + sW / 2, y + tileSize); // Bottom Right
    ctx.fill();

    // 2. THE SNOW CAP (Upper 50%)
    ctx.fillStyle = isExtremePeak 
        ? `rgba(255, 255, 255, ${Math.min(1, alpha + 0.1)})` 
        : `rgba(220, 235, 245, ${alpha})`;
        
    ctx.beginPath();
    ctx.moveTo(x, y + tileSize - sH * 1.4); // Summit
    ctx.lineTo(x - sW * 0.15, y + tileSize - sH * 0.7); // Left snow line
    
    // Jagged "Frozen" transition
    ctx.lineTo(x - sW * 0.05, y + tileSize - sH * 0.8);
    ctx.lineTo(x + sW * 0.08, y + tileSize - sH * 0.65);
    
    ctx.lineTo(x + sW * 0.15, y + tileSize - sH * 0.7); // Right snow line
    ctx.closePath();
    ctx.fill();

    // 3. THE COLD SHADOW
    ctx.fillStyle = `rgba(0, 20, 50, ${alpha * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(x, y + tileSize - sH * 1.4); // Summit
    ctx.lineTo(x + sW * 0.25, y + tileSize - sH * 0.4);
    ctx.lineTo(x + sW / 2, y + tileSize);
    ctx.lineTo(x, y + tileSize); // Center bottom
    ctx.fill();

    // 4. CRISP OUTLINE (Reduced width for smaller scale)
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
    ctx.lineWidth = 0.4; 
    ctx.beginPath();
    ctx.moveTo(x - sW / 2, y + tileSize);
    ctx.lineTo(x - sW * 0.25, y + tileSize - sH * 0.4);
    ctx.lineTo(x, y + tileSize - sH * 1.4);
    ctx.lineTo(x + sW * 0.25, y + tileSize - sH * 0.4);
    ctx.lineTo(x + sW / 2, y + tileSize);
    ctx.stroke();
}
	
		//lack memory
		// // --- 11. 🏝️ TSUSHIMA (BETWEEN KOREA & JAPAN) ---
// let tX_Tsu = 0.865;      // Positioned East of Korea's tip
// let tY_Tsu = 0.63;       // Tucked into the strait
// let tSize_Tsu = 0.014;   // Long spine
// let tWidth_Tsu = 0.004;  // Very thin
// let tAngle_Tsu = 70;     // Tilted toward Japan

// let tDx = (warpX - tX_Tsu);
// let tDy = (warpY - tY_Tsu);

// // Rotate Tsushima to match its real-world tilt
// let tRad = tAngle_Tsu * (Math.PI / 180);
// let tRotX = tDx * Math.cos(tRad) + tDy * Math.sin(tRad);
// let tRotY = -tDx * Math.sin(tRad) + tDy * Math.cos(tRad);

// // Capsule-style distance for a long, thin island
// let dist_Tsu = Math.abs(tRotY / tWidth_Tsu) + Math.pow(tRotX / tSize_Tsu, 2);
// let tShatter = fbm(warpX * 70, warpY * 70) * 0.4;

// if (dist_Tsu + tShatter < 1.0) {
//     e = Math.max(e, 0.48 + (fbm(warpX * 40, warpY * 40) * 0.2)); // Craggy hills
//     m = 0.70;
//     isProcRiver = false;
// }

// // --- 12. 🏝️ NARU / GOTO ISLANDS (SOUTHWEST SPECK) ---
// let nX_Naru = 0.845;     
// let nY_Naru = 0.75;      
// let nSize_Naru = 0.0058;  // Very small

// let dx_Naru = (warpX - nX_Naru);
// let dy_Naru = (warpY - nY_Naru);
// let dist_Naru = Math.sqrt(dx_Naru * dx_Naru + dy_Naru * dy_Naru);

// // High noise relative to size makes it look like a cluster of islets
// let nShatter = fbm(warpX * 100, warpY * 100) * 0.008;

// if (dist_Naru < nSize_Naru + nShatter) {
//     e = Math.max(e, 0.45); 
//     m = 0.80;
//     isProcRiver = false;
// }



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


 