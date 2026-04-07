
 let economyTick = 0;
 let uiSyncTick = 0;
 
 
 function calculateMovement(speed, map, tileSize, cols, rows, isCity = false) {
    // --- 1. STATUS LOCKS ---
    if ((player.isSieging && !inBattleMode) || player.stunTimer > 0) {
        if (player.stunTimer > 0) player.stunTimer--;
        player.isMoving = false;
        return;
    }
    
let dx = 0, dy = 0;
    player.isMoving = false;

    // --- 2. TERRAIN SPEED & INPUT ---
    let currentSpeed = speed;
    let isClimbing = false;
    let isMounted = false;

    // PREDICTIVE CHECK: Map the active unit to the commander if in battle
    let activeUnit = player;
    if (inBattleMode && typeof battleEnvironment !== 'undefined') {
        let pCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "player");
        if (pCmdr) activeUnit = pCmdr;
    }
    
    // Check for heavy mounts or large units
    isMounted = activeUnit.stats?.isLarge || activeUnit.isMounted || String(activeUnit.unitType || "").toLowerCase().match(/(cav|horse|camel|eleph)/);

    if (inCityMode && !inBattleMode) {
        // CIVILIAN MODE: Check city grid
        const tx = Math.floor(player.x / CITY_TILE_SIZE);
        const ty = Math.floor(player.y / CITY_TILE_SIZE);
        const tile = cityDimensions[currentActiveCityFaction]?.grid[tx]?.[ty];
        
        // Only trigger climb physics if NOT mounted
        if (!isMounted && (tile === 9 || tile === 12)) isClimbing = true;
    } 
    else if (inBattleMode) {
        // SIEGE BATTLE MODE: Check battle environment grid
        const tx = Math.floor(player.x / BATTLE_TILE_SIZE);
        const ty = Math.floor(player.y / BATTLE_TILE_SIZE);
        const tile = battleEnvironment.grid[tx]?.[ty];
        
        if (!isMounted && (tile === 9 || tile === 12)) isClimbing = true;
    }

    currentSpeed *= 0.5;

    if (isClimbing) {
        currentSpeed *= 0.20; 
    }
    if (player.hp > 0) {
        // ... (Keep keyboard input logic the same)
        if (keys['w'] || keys['arrowup']) { dy -= currentSpeed; player.isMoving = true; }
        if (keys['s'] || keys['arrowdown']) { dy += currentSpeed; player.isMoving = true; }
        if (keys['a'] || keys['arrowleft']) { dx -= currentSpeed; player.isMoving = true; }
        if (keys['d'] || keys['arrowright']) { dx += currentSpeed; player.isMoving = true; }
        if (player.isMoving) player.anim++;
    }

    const nextX = player.x + dx, nextY = player.y + dy;
  
// --- 3. ENVIRONMENT & COLLISION LOGIC ---
if (inBattleMode) {
    const bW = (typeof BATTLE_WORLD_WIDTH !== 'undefined') ? BATTLE_WORLD_WIDTH : 2000;
    const bH = (typeof BATTLE_WORLD_HEIGHT !== 'undefined') ? BATTLE_WORLD_HEIGHT : 2000;

    let tileX = battleEnvironment.grid[Math.floor(nextX / BATTLE_TILE_SIZE)]?.[Math.floor(player.y / BATTLE_TILE_SIZE)];
    let tileY = battleEnvironment.grid[Math.floor(player.x / BATTLE_TILE_SIZE)]?.[Math.floor(nextY / BATTLE_TILE_SIZE)];
// ---> SURGERY 2: Massively expand the Gate Bypass so the General's horse ignores the 96-pixel thick stone wall tunnel!
    let bypassGateCollision = false;
    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && typeof SiegeTopography !== 'undefined') {
        let isBreached = window.__SIEGE_GATE_BREACHED__;
        if (isBreached) {
            let distToGateX = Math.abs(nextX - SiegeTopography.gatePixelX);
            let distToGateY = Math.abs(nextY - SiegeTopography.gatePixelY);
            
            // SURGERY: Shrunk X from 120 to 45. 
            // This perfectly fits the 104-pixel gap, keeping the pillars completely solid!
            if (distToGateX < 45 && distToGateY < 250) bypassGateCollision = true;
        }
    }

    // Bind the bypass strictly around the wall floor check too!
    const canMoveX = bypassGateCollision || (!isBattleCollision(nextX, player.y, player.onWall, activeUnit) && tileX !== 8);
    const canMoveY = bypassGateCollision || (!isBattleCollision(player.x, nextY, player.onWall, activeUnit) && tileY !== 8);
    
    if (canMoveX) player.x = Math.max(0, Math.min(nextX, bW));
    if (canMoveY) player.y = Math.max(0, Math.min(nextY, bH));

// Ladder/Wall Transition Logic
if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && battleEnvironment?.grid) {
    const pTx = Math.floor(player.x / BATTLE_TILE_SIZE);
    const pTy = Math.floor(player.y / BATTLE_TILE_SIZE);
    const tile = battleEnvironment.grid[pTx]?.[pTy];

    // BLOCK TILE 9: do not allow climbing
    if (tile === 1 || tile === 5) {
        player.onWall = false; // normal wall/floor behavior
    } else {
        player.onWall = false; // ensures ladder tile does NOT trigger climbing
    }
}}


else if (isCity) {
        const cityW = (typeof CITY_WORLD_WIDTH !== 'undefined') ? CITY_WORLD_WIDTH : 2000;
        if (nextX > 25 && nextX < cityW - 25 && nextY > 25) {
            const txx = Math.floor(nextX / CITY_TILE_SIZE);
            const tyy = Math.floor(nextY / CITY_TILE_SIZE);
            const nextTile = cityDimensions[currentActiveCityFaction]?.grid?.[txx]?.[tyy];

            const isStairs = (nextTile === 9); 
            const isWallFloor = (nextTile === 8); // SURGERY: Detect Wall Floors

            const curTx = Math.floor(player.x / CITY_TILE_SIZE);
            const curTy = Math.floor(player.y / CITY_TILE_SIZE);
            const currentlyOnStairs = cityDimensions[currentActiveCityFaction]?.grid?.[curTx]?.[curTy] === 9;

            // SURGERY: Hard block movement onto Tile 8
            if (!isWallFloor && (isStairs || currentlyOnStairs || typeof isCityCollision !== 'function' || !isCityCollision(nextX, nextY, currentActiveCityFaction, player.onWall))) {
                player.x = nextX;
                player.y = nextY;
            }
        }
    }
    else if (map?.length > 0) {
        const ntx = Math.floor(nextX / tileSize), nty = Math.floor(nextY / tileSize);
        if (ntx >= 0 && ntx < (cols || 0) && nty >= 0 && nty < (rows || 0) && map[ntx]?.[nty]?.impassable === false) {
            player.x = nextX; player.y = nextY;
        }
    }
}

	// Ensure defaults if constants are missing during startup
const SAFE_WIDTH = typeof WORLD_WIDTH !== 'undefined' ? WORLD_WIDTH : 2000;
const SAFE_HEIGHT = typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 2000;


	
// --- REVISION: Added Animation State ---
let player = {
    // --- POSITION & PHYSICS ---
    x: SAFE_WIDTH * 0.5,
    y: SAFE_HEIGHT * 0.45,
    size: 24,
    distTrack: 0,      // Track distance for food mechanic

    // --- MOVEMENT & STATE ---
    baseSpeed: 15,     // Original speed
    speed: 15,
    isMoving: false,
    stunTimer: 0,
    anim: 0,
    color: "#ffffff",

    // --- RESOURCES ---
    gold: 500,
    food: 100,
    maxFood: 2000,
    troops: 100,

    // --- PROGRESSION ---
    experience: 0,
    experienceLevel: 1,

    // --- COMBAT STATS ---
    hp: 200,
    maxHealth: 200,
    meleeAttack: 15,
    meleeDefense: 15,
    armor: 20,

    // --- DIPLOMACY ---
    faction: "Player's Kingdom",
    enemies: ["Bandits"],
roster: [
    "Militia", "Crossbowman", "Heavy Crossbowman", "Bomb", "Spearman", 
    "Firelance", "Heavy Firelance", "Archer", "Horse Archer", "Heavy Horse Archer", 
    "General", "Shielded Infantry", "Light Two Handed", "Heavy Two Handed", 
    "Lancer", "Heavy Lancer", "Elite Lancer", "Rocket", "Keshig", 
    "Hand Cannoneer", "Camel Cannon", "Poison Crossbowman", "War Elephant", 
    "Repeater Crossbowman", "Slinger", "Glaiveman", "Javelinier",
    "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", 
    "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia",
    "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", 
    "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", 
    "Spearman", "Spearman", "Spearman", "Spearman",
    "Shielded Infantry", "Shielded Infantry", "Shielded Infantry", 
    "Shielded Infantry", "Shielded Infantry", "Shielded Infantry", 
    "Shielded Infantry", "Shielded Infantry",
    "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", 
    "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", 
    "Crossbowman", "Crossbowman",
    "Heavy Crossbowman", "Heavy Crossbowman", "Heavy Crossbowman", 
    "Heavy Crossbowman", "Heavy Crossbowman", "Heavy Crossbowman",
    "Archer", "Archer", "Archer", "Archer", "Archer", "Archer",
    "Firelance", "Firelance", "Firelance", "Firelance",
    "Heavy Firelance", "Heavy Firelance",
    "Bomb",
    "Repeater Crossbowman", "Repeater Crossbowman", "Repeater Crossbowman",
    "Poison Crossbowman",
    "Slinger"
].map(unitName => ({ type: unitName, exp: 1 })),
    // --- SYSTEM ---
    isInitialized: false
};
	
const keys = {};

// Add an initialization function
function initPlayer() {
    // Check if overworld constants exist, otherwise use defaults
    const worldW = typeof WORLD_WIDTH !== 'undefined' ? WORLD_WIDTH : 2000;
    const worldH = typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 2000;
    
    player.x = worldW * 0.5;
    player.y = worldH * 0.45;
}
/**
 * Call this ONLY when the user clicks the "Overworld" button 
 * in your Main Menu (Option B).
 */
function enterOverworldMode() {
    // Ensure constants are available or use fallbacks
    const w = (typeof WORLD_WIDTH !== 'undefined') ? WORLD_WIDTH : 2000;
    const h = (typeof WORLD_HEIGHT !== 'undefined') ? WORLD_HEIGHT : 2000;

    player.x = w * 0.5;
    player.y = h * 0.45;
    player.hp = Math.max(1, player.maxHealth || 100);
    player.stunTimer = 0;
    player.isMoving = false;
    player.isInitialized = true;
    
    console.log("Overworld Started: Player spawned at", player.x, player.y);
}


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
    zoom = Math.max(0.3, Math.min(3, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
};

 function update() {
    const aliveEnemies = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;
    let pCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "player");
    let disableAICombatDefeated = pCmdr ? (pCmdr.hp <= 0) : (player.hp <= 0);

    if (typeof inParleMode !== 'undefined' && inParleMode) return;

    const parlePanel = document.getElementById('parle-panel');
    if ((inBattleMode || (typeof inCityMode !== 'undefined' && inCityMode)) && parlePanel?.style.display !== 'none') {
        parlePanel.style.display = 'none';
        inParleMode = false;
    }

    if ((typeof troopGUI !== 'undefined' && troopGUI.isOpen) || (typeof pendingSallyOut !== 'undefined' && pendingSallyOut)) return;

    const cityPanel = document.getElementById('city-panel');
    if (inBattleMode || (typeof inCityMode !== 'undefined' && inCityMode)) {
        if (cityPanel?.style.display !== 'none') cityPanel.style.display = 'none';
    }

    const isUIBusy = (typeof troopGUI !== 'undefined' && troopGUI.isOpen) || inBattleMode || (typeof inCityMode !== 'undefined' && inCityMode);
    const dipBtn = document.getElementById('diplomacy-container');
    if (dipBtn) dipBtn.style.display = (!isUIBusy && document.getElementById('loading')?.style.display === 'none') ? 'block' : 'none';

    const siegeGui = document.getElementById('siege-gui');
    if (siegeGui && player.isSieging && !inBattleMode && !(typeof inCityMode !== 'undefined' && inCityMode)) {
        if (siegeGui.style.display === 'none') siegeGui.style.display = 'block';
    }

    if (typeof inParleMode !== 'undefined' && inParleMode) return;
    
    if (inBattleMode) {
        if (!battleEnvironment?.grid || typeof pCmdr === 'undefined' || !pCmdr) return;
        
        player.size = 24;
        calculateMovement(player.baseSpeed / 4, null, typeof BATTLE_TILE_SIZE !== 'undefined' ? BATTLE_TILE_SIZE : 8, null, null, true);
        if (typeof updateBattleUnits === 'function') updateBattleUnits();
        
        pCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "player");
        if (pCmdr && player) {
            player.hp = pCmdr.hp;
            disableAICombatDefeated = (pCmdr.hp <= 0); 
if (!disableAICombatDefeated) {
    pCmdr.x = player.x; pCmdr.y = player.y;
    pCmdr.isMoving = player.isMoving;
    if (player.isMoving) pCmdr.state = "moving";
    if (keys['a'] || keys['arrowleft']) pCmdr.direction = player.direction = -1;
    if (keys['d'] || keys['arrowright']) pCmdr.direction = player.direction = 1;
    pCmdr.vx = pCmdr.vy = 0; 
    // SURGERY: Removed 'pCmdr.target = null' so the Commander can hold an attack lock!
}


			else {
                player.x = pCmdr.x; player.y = pCmdr.y; player.isMoving = false;
            }
        }
        
        if (keys['p']) {
            const scale = currentBattleData?.initialCounts?.player > 300 ? 5 : 1; 
            const enemyNetCount = aliveEnemies * scale;
            const enemyInitial = currentBattleData?.initialCounts?.enemy || 1;

            if (disableAICombatDefeated || (enemyNetCount / enemyInitial < 0.10) || (enemyNetCount < 5)) {
                (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) ? concludeSiegeBattlefield(player) : leaveBattlefield(player);
            }
            keys['p'] = false;
        }

        if (disableAICombatDefeated || aliveEnemies === 0) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); 
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(0, window.innerHeight - 80, window.innerWidth, 80);
            ctx.fillStyle = disableAICombatDefeated ? "#ff5252" : "#ffca28"; 
            ctx.font = "bold 24px Georgia"; ctx.textAlign = "center"; ctx.shadowColor = "black"; ctx.shadowBlur = 4;
            ctx.fillText(`${disableAICombatDefeated ? "DEFEAT - COMMANDER FALLEN" : "VICTORY - ENEMIES ROUTED"} - Press [P] to Exit Battlefield`, window.innerWidth / 2, window.innerHeight - 45);
            ctx.restore();
        }
    } 
else if (typeof inCityMode !== 'undefined' && inCityMode) {
        player.size = 8;
        
        // ---> SURGERY 2: PERSISTENT WALL STATE <---
        if (cityDimensions[currentActiveCityFaction]) {
            const tx = Math.floor(player.x / CITY_TILE_SIZE);
            const ty = Math.floor(player.y / CITY_TILE_SIZE);
            const currentTile = cityDimensions[currentActiveCityFaction].grid[tx]?.[ty];
            
            // Tile 8 = Parapet, 9 = Ladder, 10 = Tower
            if (currentTile === 9 || currentTile === 8 || currentTile === 10) {
                player.onWall = true;
            } 
            // Drop back to ground physics ONLY if stepping onto pure terrain
            else if (currentTile === 0 || currentTile === 1 || currentTile === 5) {
                player.onWall = false;
            }
        }

        // Removed the invalid 7th argument passed to calculateMovement
        calculateMovement(player.baseSpeed / 9, null, CITY_TILE_SIZE, null, null, true);

        if (cityDimensions[currentActiveCityFaction]) handleEntityGateTeleport(player, cityDimensions[currentActiveCityFaction].grid);
        if (typeof updateCityCosmeticNPCs === 'function') updateCityCosmeticNPCs(currentActiveCityFaction);
        
        // ... (rest of the block remains the same)
        
        if (player.y > CITY_WORLD_HEIGHT - 20 || keys['p']) {
            player.onWall = false;
            leaveCity(player);
            keys['p'] = false; 
        }
    } 
    else { 
        player.size = 24;
        
        if (++economyTick > 300) { updateCityEconomies(cities); economyTick = 0; }
        if (typeof updateDiplomacy === 'function') updateDiplomacy();
        if (typeof updateSieges === 'function') updateSieges();
 
        const oldX = player.x, oldY = player.y;
        player.speed = player.food > 0 ? player.baseSpeed : player.baseSpeed * 0.6; 
        calculateMovement(player.speed / 4, worldMap, TILE_SIZE, COLS, ROWS, false);
        
        const step = Math.hypot(player.x - oldX, player.y - oldY);
        if (step > 0 && (player.distTrack += step) >= 1000) { 
            player.distTrack = 0;
            if (player.food > 0) {
                player.food = Math.max(0, player.food - (1 + Math.floor(player.troops / 5)));
            } else if (player.troops > 0) {
                player.troops--; 
                if (player.roster.length > 0) player.roster.pop();
            }
        }

        updateNPCs(cities);
        
        if (typeof globalNPCs !== 'undefined' && player) {
            let closestDist = 1000, closestEnemy = null;
            for (let npc of globalNPCs) {
                if (npc.faction !== player.faction) {
                    let d = Math.hypot(npc.x - player.x, npc.y - player.y);
                    if (d < closestDist) { closestDist = d; closestEnemy = npc; }
                }
            }

            if (closestDist < 0) {
                if (AudioManager.currentTrack !== "WorldMap_Tension") {
                    AudioManager.playMusic("WorldMap_Tension");
                    AudioManager.playSound('ui_click'); 
                }
                if (player.lastEncounteredFaction !== closestEnemy.faction) {
                    player.lastEncounteredFaction = closestEnemy.faction;
                    if (closestEnemy.faction === "Great Khaganate") AudioManager.playSound('charge');
                    else if (closestEnemy.faction === "Hong Dynasty") AudioManager.playSound('firelance');
                    else if (closestEnemy.faction === "Shahdom of Iransar") AudioManager.playSound('sword_clash');
                }
            } else if (closestDist < 1) {
                if (AudioManager.currentTrack !== "Bandits") AudioManager.playMusic("Bandits");
                player.lastEncounteredFaction = null; 
            } else {
                if (AudioManager.currentTrack !== 'music/gameloop.mp3') {
                    AudioManager.playRandomMP3List(['music/gameloop1.mp3', 'music/gameloop2.mp3', 'music/gameloop3.mp3']);
                }
                player.lastEncounteredFaction = null;
            }
        }
      
        const tx = Math.max(0, Math.min(COLS - 1, Math.floor(player.x / TILE_SIZE)));
        const ty = Math.max(0, Math.min(ROWS - 1, Math.floor(player.y / TILE_SIZE)));
        const currentTile = worldMap?.[tx]?.[ty] || {name: "Plains", speed: 1};

        document.getElementById('loc-text').innerText = `${Math.round(player.x)}, ${Math.round(player.y)}`;
        document.getElementById('terrain-text').innerText = currentTile.name;
        document.getElementById('speed-text').innerText = currentTile.speed + "x";
        document.getElementById('zoom-text').innerText = zoom.toFixed(2) + "x";

        let touchingCity = cities.find(c => Math.hypot(player.x - c.x, player.y - c.y) < c.radius + player.size) || null;
        
        if (touchingCity) {
            if (activeCity !== touchingCity) {
                activeCity = touchingCity;
                document.getElementById('city-name').innerText = activeCity.name;
                document.getElementById('city-name').style.color = activeCity.color;
                document.getElementById('city-faction').innerText = activeCity.faction;
                cityPanel.style.display = 'block';
                
                const isEnemy = player.enemies?.includes(activeCity.faction);
                const recruitBox = document.getElementById('recruit-box');
                const hostileBox = document.getElementById('hostile-box');

                recruitBox.style.opacity = isEnemy ? '0.3' : '1';
                recruitBox.style.pointerEvents = isEnemy ? 'none' : 'auto';
                hostileBox.style.display = isEnemy ? 'flex' : 'none';
                    
                if (isEnemy) {
                    player.stunTimer = 60; 
                    keys['w'] = keys['a'] = keys['s'] = keys['d'] = keys['arrowup'] = keys['arrowleft'] = keys['arrowdown'] = keys['arrowright'] = false;
                }
            }
            document.getElementById('city-pop').innerText = Math.floor(activeCity.pop).toLocaleString();
            document.getElementById('city-garrison').innerText = Math.floor(activeCity.troops).toLocaleString();
            document.getElementById('city-gold').innerText = Math.floor(activeCity.gold).toLocaleString();
            document.getElementById('city-food').innerText = Math.floor(activeCity.food).toLocaleString();
        } else if (activeCity !== null) {
            activeCity = null;
            cityPanel.style.display = 'none';
        }
    }
    
    if (++uiSyncTick % 30 === 0) syncSiegeUIVisibility();
}
function draw() {
    if (!player || isNaN(player.x) || isNaN(player.y)) {
        console.warn("NaN caught in draw! Healing coordinates to prevent black screen.");
        player.x = 800;
        player.y = 800;
        if (isNaN(zoom) || zoom <= 0) zoom = 0.8;
    }

    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-player.x, -player.y);

    if (inBattleMode) {
        // 1. Draw Infinite Floor
        ctx.fillStyle = battleEnvironment.groundColor || "#767950";
        ctx.fillRect(-3000, -3000, 8400, 7600);

        // 2. Draw Background Terrain
        if (battleEnvironment.bgCanvas) {
            ctx.drawImage(battleEnvironment.bgCanvas, -battleEnvironment.visualPadding, -battleEnvironment.visualPadding);
        }

        // 3. Draw Units
        drawBattleUnits(ctx);

        // 4. Draw Foreground Terrain (Trees/Canopy)
        if (battleEnvironment.fgCanvas) {
            ctx.drawImage(battleEnvironment.fgCanvas, -battleEnvironment.visualPadding, -battleEnvironment.visualPadding);
        }

        // 5. Draw Dynamic Assets (Gates & Engines)
        if (typeof renderDynamicGates === 'function') {
            renderDynamicGates(ctx);
        }

        if (typeof renderSiegeEngines === 'function') renderSiegeEngines(ctx);

        // 6. Draw Battle UI overlays
        const aliveEnemies = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;

        ctx.font = "bold 18px Georgia";
        ctx.textAlign = "center";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;

        if (aliveEnemies > 0) {
            ctx.font = "10px Arial";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(
                `Enemies Remaining: ${aliveEnemies}`,
                BATTLE_WORLD_WIDTH / 2,
                canvas.height + 450
            );
        } else {
            ctx.fillStyle = "#ffca28";
            let drawX = (player && player.hp > 0) ? player.x : canvas.width / 2;
            let drawY = (player && player.hp > 0) ? player.y - 60 : canvas.height - 200;

            ctx.fillText("BATTLE OVER - Press [p] to Exit", drawX, drawY);
        }

        ctx.shadowBlur = 0;

    } else if (inCityMode) {
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

    } else {
        // WORLD MAP MODE
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(bgCanvas, 0, 0);

        if (typeof drawSiegeVisuals === 'function') drawSiegeVisuals(ctx);

        let halfWidth = (canvas.width / 2) / zoom;
        let halfHeight = (canvas.height / 2) / zoom;
        let camLeft = player.x - halfWidth - 150;
        let camRight = player.x + halfWidth + 150;
        let camTop = player.y - halfHeight - 150;
        let camBottom = player.y + halfHeight + 150;

        cities.forEach(c => {
            if (c.x < camLeft || c.x > camRight || c.y < camTop || c.y > camBottom) return;

            ctx.lineWidth = 3;
            ctx.fillStyle = c.color;
            ctx.strokeStyle = "#ffca28";

            const r = 14;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i;
                const px = c.x + r * Math.cos(angle);
                const py = c.y + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
            ctx.fill();

            let fontSize = Math.max(12, 20 / zoom);
            ctx.font = `bold ${fontSize}px Georgia`;
            ctx.textAlign = "center";
            ctx.fillStyle = "#111";
            ctx.fillText(c.name, c.x + 2, c.y - 18);
            ctx.fillStyle = c.color;
            ctx.fillText(c.name, c.x, c.y - 20);
        });

        drawAllNPCs(ctx, drawCaravan, drawShip, zoom, camLeft, camRight, camTop, camBottom);

        let tx = Math.floor(player.x / TILE_SIZE);
        let ty = Math.floor(player.y / TILE_SIZE);

        let currentTile = (worldMap[tx] && worldMap[tx][ty]) ? worldMap[tx][ty] : { name: "Plains" };
        if (currentTile.name === "Coastal" || currentTile.name === "River" || currentTile.name === "Ocean") {
            drawShip(player.x, player.y, player.isMoving, player.anim, player.color);
        } else {
            drawCaravan(player.x, player.y, player.isMoving, player.anim, player.color);
        }

        let nameFontSize = Math.max(10, 14 / zoom);
        let detailFontSize = Math.max(8, 12 / zoom);
        ctx.textAlign = "center";

        ctx.font = `italic ${detailFontSize}px Georgia`;
        let goldText = `G: ${Math.floor(player.gold)}`;
        let foodText = `F: ${Math.floor(player.food)}`;
        let statGap = 8;

        ctx.fillStyle = "#ffca28";
        ctx.fillText(goldText, player.x - (ctx.measureText(foodText).width / 2) - (statGap / 2), player.y - 38);

        if (typeof isSieging === 'undefined' || !isSieging) {
            ctx.fillStyle = "#8bc34a";
            ctx.fillText(foodText, player.x + (ctx.measureText(goldText).width / 2) + (statGap / 2), player.y - 38);
        }

        ctx.font = `bold ${nameFontSize}px Georgia`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`YOU (${player.troops})`, player.x, player.y - 26);
        ctx.font = "10px Arial";
    }

    ctx.restore();

    if (typeof drawPlayerOverlay === 'function') {
        drawPlayerOverlay(ctx, player, zoom);
    }

    requestAnimationFrame(() => {
        update();
        draw();
    });

    updateAndDrawPlayerSystems(ctx, player, zoom, WORLD_WIDTH, WORLD_HEIGHT, typeof globalNPCs !== 'undefined' ? globalNPCs : []);
}

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
        const currentSiege = activeSieges.find(s => s.attacker === player || s.attacker.disableAICombat);
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
