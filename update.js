 let economyTick = 0;
 let uiSyncTick = 0;
function calculateMovement(speed, map, tileSize, cols, rows, isCity = false) {
	// NEW: If mobile drawer is open, stop movement logic immediately
    if (window.isMobileDrawerOpen) {
        player.isMoving = false;
        return; 
    }
	
    if ((player.isSieging && !inBattleMode) || player.stunTimer > 0) {
        if (player.stunTimer > 0) player.stunTimer--;
        player.isMoving = false;
        return;
    }
    let dx = 0, dy = 0;
    player.isMoving = false;
    let currentSpeed = speed;
    let isClimbing = false;
    let isMounted = false;

    let activeUnit = player;
    if (inBattleMode && typeof battleEnvironment !== 'undefined') {
        let pCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "player");
        if (pCmdr) activeUnit = pCmdr;
    } 
    isMounted = activeUnit.stats?.isLarge || activeUnit.isMounted || String(activeUnit.unitType || "").toLowerCase().match(/(cav|horse|camel|eleph)/);

    if (inCityMode && !inBattleMode) {
        const tx = Math.floor(player.x / CITY_TILE_SIZE);
        const ty = Math.floor(player.y / CITY_TILE_SIZE);
        const currentTile = cityDimensions[currentActiveCityFaction]?.grid?.[tx]?.[ty];
        
        if (!isMounted && (currentTile === 9 || currentTile === 12)) {
            isClimbing = true;
            // REMOVED: player.onWall = true; (We will calculate this dynamically below)
        }
    }
    else if (inBattleMode) {
        const tx = Math.floor(player.x / BATTLE_TILE_SIZE);
        const ty = Math.floor(player.y / BATTLE_TILE_SIZE);
        const tile = battleEnvironment.grid[tx]?.[ty];
        if (!isMounted && (tile === 9 || tile === 12)) isClimbing = true;
    }

    currentSpeed *= 0.5;
    if (isClimbing) {
        currentSpeed *= 0.20; 
    }

// ---> SURGERY 2: Add 'P' to return to Overworld.
    if (inCityMode && !inBattleMode && keys['p']) {
        keys['p'] = false;
        if (typeof leaveCity === 'function') leaveCity(player);
        return;
    }

    // ---> SURGERY 3: Pull the Keyboard Input BEFORE City Collisions! 
    // This allows dx and dy to actually populate before the city uses them!
    if (player.hp > 0) {
        if (keys['w'] || keys['arrowup']) { dy -= currentSpeed; player.isMoving = true; }
        if (keys['s'] || keys['arrowdown']) { dy += currentSpeed; player.isMoving = true; }
        if (keys['a'] || keys['arrowleft']) { dx -= currentSpeed; player.isMoving = true; }
        if (keys['d'] || keys['arrowright']) { dx += currentSpeed; player.isMoving = true; }
        if (player.isMoving) player.anim++;
    }

    const nextX = player.x + dx, nextY = player.y + dy;
  
// --- 3. ENVIRONMENT & COLLISION LOGIC ---
    if (inCityMode && !inBattleMode) {
        const outOfBounds = (nextX < 0 || nextX >= CITY_WORLD_WIDTH || 
                             nextY < 0 || nextY >= CITY_WORLD_HEIGHT);

if (nextY >= CITY_WORLD_HEIGHT - 5) {
            if (typeof leaveCity === 'function') leaveCity(player);
            return;
        }
        const curTx = Math.floor(player.x / CITY_TILE_SIZE);
        const curTy = Math.floor(player.y / CITY_TILE_SIZE);
        const currentTile = cityDimensions[currentActiveCityFaction]?.grid?.[curTx]?.[curTy];
        
        const nextTx = Math.floor(nextX / CITY_TILE_SIZE);
        const nextTy = Math.floor(nextY / CITY_TILE_SIZE);
        const destTile = cityDimensions[currentActiveCityFaction]?.grid?.[nextTx]?.[nextTy];

        // Intelligently transition onWall state based on where the player is trying to step
        if (!isMounted) {
            if (currentTile === 9 || currentTile === 12) {
                if (destTile === 8 || destTile === 10) player.onWall = true; // Stepping UP onto wall floor
                else if (destTile === 0 || destTile === 1 || destTile === 5) player.onWall = false; // Stepping DOWN to ground
            } else if (currentTile === 8 || currentTile === 10) {
                player.onWall = true; // Safely on the wall
            } else {
                player.onWall = false; // Safely on the ground
            }
        }

        const isColliding = isCityCollision(nextX, nextY, currentActiveCityFaction, player.onWall);

        if (!outOfBounds && !isColliding) {
            player.x = nextX;
            player.y = nextY;
            player.isMoving = true;
        } else {
            player.isMoving = false;
        }
        return; 
    }
    else if (inBattleMode) {
        const bW = (typeof BATTLE_WORLD_WIDTH !== 'undefined') ? BATTLE_WORLD_WIDTH : 2000;
        const bH = (typeof BATTLE_WORLD_HEIGHT !== 'undefined') ? BATTLE_WORLD_HEIGHT : 2000;

        let tileX = battleEnvironment.grid[Math.floor(nextX / BATTLE_TILE_SIZE)]?.[Math.floor(player.y / BATTLE_TILE_SIZE)];
        let tileY = battleEnvironment.grid[Math.floor(player.x / BATTLE_TILE_SIZE)]?.[Math.floor(nextY / BATTLE_TILE_SIZE)];
        
        let bypassGateCollision = false;
        if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && typeof SiegeTopography !== 'undefined') {
            let isBreached = window.__SIEGE_GATE_BREACHED__;
            if (isBreached) {
                let distToGateX = Math.abs(nextX - SiegeTopography.gatePixelX);
                let distToGateY = Math.abs(nextY - SiegeTopography.gatePixelY);
                if (distToGateX < 45 && distToGateY < 250) bypassGateCollision = true;
            }
        }

     // In naval battles tile 8 is the hull rail — physics handles friction, not hard collision.
        // In siege / field battles tile 8 is still a platform wall, so keep blocking there.
        const tile8Blocks = !window.inNavalBattle;
        const canMoveX = bypassGateCollision || (!isBattleCollision(nextX, player.y, player.onWall, activeUnit) && (!tile8Blocks || tileX !== 8));
        const canMoveY = bypassGateCollision || (!isBattleCollision(player.x, nextY, player.onWall, activeUnit) && (!tile8Blocks || tileY !== 8));
        
        if (canMoveX) player.x = Math.max(0, Math.min(nextX, bW));
        if (canMoveY) player.y = Math.max(0, Math.min(nextY, bH));

        if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && battleEnvironment?.grid) {
            const pTx = Math.floor(player.x / BATTLE_TILE_SIZE);
            const pTy = Math.floor(player.y / BATTLE_TILE_SIZE);
            const tile = battleEnvironment.grid[pTx]?.[pTy];

            if (tile === 1 || tile === 5) {
                player.onWall = false; 
            } else {
                player.onWall = false; 
            }
        }
    }
    else if (isCity) {
        const cityW = (typeof CITY_WORLD_WIDTH !== 'undefined') ? CITY_WORLD_WIDTH : 2000;
        if (nextX > 25 && nextX < cityW - 25 && nextY > 25) {
            const txx = Math.floor(nextX / CITY_TILE_SIZE);
            const tyy = Math.floor(nextY / CITY_TILE_SIZE);
            const nextTile = cityDimensions[currentActiveCityFaction]?.grid?.[txx]?.[tyy];
            
            const isWallFloor = (nextTile === 8); 
            const isStoneWall = (nextTile === 6); 
            const isAccessTile = (nextTile === 10 || nextTile === 12); 
            const isStairs = (nextTile === 9); 

            const curTx = Math.floor(player.x / CITY_TILE_SIZE);
            const curTy = Math.floor(player.y / CITY_TILE_SIZE);
            const currentTile = cityDimensions[currentActiveCityFaction]?.grid?.[curTx]?.[curTy];
            const currentlyOnStairs = (currentTile === 9);
            const currentlyInAccess = (currentTile === 10 || currentTile === 12);
            
            let canMove = false;

            if (isAccessTile) {
                canMove = true; 
            } else if (currentlyInAccess || currentlyOnStairs) {
                canMove = !isCityCollision(nextX, nextY, currentActiveCityFaction, player.onWall);
            } else if (!isWallFloor && !isStoneWall) {
                canMove = !isCityCollision(nextX, nextY, currentActiveCityFaction, player.onWall);
            }

            if (canMove) {
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

const SAFE_WIDTH = typeof WORLD_WIDTH !== 'undefined' ? WORLD_WIDTH : 2000;
const SAFE_HEIGHT = typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 2000;


let player = {
    // --- POSITION & PHYSICS ---
    x: SAFE_WIDTH * 0.5,
    y: SAFE_HEIGHT * 0.45,
    size: 24,
    distTrack: 0,       

    // --- MOVEMENT & STATE ---
    baseSpeed: 15,  //overworld    
    speed: 15, //overworld
    isMoving: false,
    stunTimer: 0,
    anim: 0,
    color: "#ffffff",

    // --- RESOURCES ---
    gold: 500,
    food: 100,
    maxFood: 2000,
    troops: 20, //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>dpnt forget

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
 //roster: ["Militia", "Crossbowman", "Heavy Crossbowman", "Bomb", "Spearman", "Firelance", "Heavy Firelance", "Archer", "Horse Archer", "Heavy Horse Archer", "General", "Shielded Infantry", "Light Two Handed", "Heavy Two Handed", "Lancer", "Heavy Lancer", "Elite Lancer", "Rocket", "Keshig", "Hand Cannoneer", "Camel Cannon", "Poison Crossbowman", "War Elephant", "Repeater Crossbowman", "Slinger", "Glaiveman", "Javelinier", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Militia", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Spearman", "Shielded Infantry", "Shielded Infantry", "Shielded Infantry", "Shielded Infantry", "Shielded Infantry", "Shielded Infantry", "Shielded Infantry", "Shielded Infantry", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Crossbowman", "Heavy Crossbowman", "Heavy Crossbowman", "Heavy Crossbowman", "Heavy Crossbowman", "Heavy Crossbowman", "Heavy Crossbowman", "Archer", "Archer", "Archer", "Archer", "Archer", "Archer", "Firelance", "Firelance", "Firelance", "Firelance", "Heavy Firelance", "Heavy Firelance", "Bomb", "Repeater Crossbowman", "Repeater Crossbowman", "Repeater Crossbowman", "Poison Crossbowman", "Slinger"].map(unitName => ({ type: unitName, exp: 1 })),
 
 roster: [
     
    "Militia", "Militia", "Militia", "Militia", "Militia",
    "Militia", "Militia", "Militia", "Militia", "Militia",
    "Militia", "Militia", "Militia", "Militia", "Militia",
    "Militia", "Militia", "Militia", "Militia", "Militia"
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
    AudioManager.init();
    AudioManager.stopMusic();
}

// 1. ADD THIS: Tell the game when a key is pressed!
window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;
window.onwheel = (e) => {
    // SURGERY 1: Block zoom if in Diplomacy OR the Mobile Detail Drawer is open
    if ((typeof inParleMode !== 'undefined' && inParleMode) || window.isMobileDrawerOpen) {
        return;
    }

    
    // 2. If player scrolls normally, cancel cinematic instantly
    if (window.isZoomAnimating) { 
        window.isZoomAnimating = false; 
    }      
    zoom = Math.max(0.7, Math.min(3, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
};

function update() {
	// --- PRECISION SURGERY: HIDE UI DURING BATTLE/SIEGE ---
let uiElement = document.getElementById("ui");
if (uiElement) {
    // inBattleMode typically covers both field battles and sieges. 
    // If true, hide it. If false, show it.
    uiElement.style.display = inBattleMode ? "none" : "block";
}
// ------------------------------------------------------

    const aliveEnemies = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;
    let pCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "player");
    let disableAICombatDefeated = pCmdr ? (pCmdr.hp <= 0) : (player.hp <= 0);

    // SURGERY 2: Freeze the entire game loop if in Diplomacy OR the Mobile Detail Drawer is open
    if ((typeof inParleMode !== 'undefined' && inParleMode) || window.isMobileDrawerOpen) return;

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
    
   if (inBattleMode) 
	{
        if (!battleEnvironment?.grid || typeof pCmdr === 'undefined' || !pCmdr) return;
		
// --- NAVAL / RIVER PHYSICS HOOK ---
// Check for Ocean/Coastal mode
        if (typeof window.inNavalBattle !== 'undefined' && window.inNavalBattle) {
            updateNavalPhysics();
        } 
        // Check for River mode (Safe against undefined)
        else if (typeof window.inRiverBattle !== 'undefined' && window.inRiverBattle) {
            // This runs the river drowning/swimming logic
            updateRiverPhysics();
        }
        // --- END NAVAL / RIVER PHYSICS HOOK ---
        
        player.size = 24;

        // ---> SURGERY: STRICT TILE CHECK FOR PLAYER WATER SLOWDOWN <---
        // Safely clamp coordinates to prevent out-of-bounds array checks
        let pTx = Math.floor(player.x / (typeof BATTLE_TILE_SIZE !== 'undefined' ? BATTLE_TILE_SIZE : 8));
        let pTy = Math.floor(player.y / (typeof BATTLE_TILE_SIZE !== 'undefined' ? BATTLE_TILE_SIZE : 8));
        pTx = Math.max(0, Math.min(BATTLE_COLS - 1, pTx));
        pTy = Math.max(0, Math.min(BATTLE_ROWS - 1, pTy));
        
        let playerTile = (battleEnvironment.grid[pTx] && battleEnvironment.grid[pTx][pTy]) ? battleEnvironment.grid[pTx][pTy] : 0;
        let waterSpeedMulti = 1.0;

        // NAVAL FIX: The grid is 100% water. Rely on exact 3D deck math instead!
        if (window.inNavalBattle && typeof window.getNavalSurfaceAt === 'function') {
            let surface = window.getNavalSurfaceAt(player.x, player.y);
            if (surface === 'WATER' || surface === 'EDGE') {
                waterSpeedMulti = 0.40;
            }
        } else {
            // Standard field/river battles: ONLY slow down on raw water (4) or ocean (11)
            // Land (0), Mud (7), and Grass (10) will retain 1.0x normal speed.
            if (playerTile === 4 || playerTile === 11) {
                waterSpeedMulti = 0.40; 
            }
        }

        // Apply movement: On land, waterSpeedMulti is 1.0 so they move at normal battle speed
        calculateMovement(((player.baseSpeed / 4) * 0.70) * waterSpeedMulti, null, typeof BATTLE_TILE_SIZE !== 'undefined' ? BATTLE_TILE_SIZE : 8, null, null, true);
        
        if (typeof updateBattleUnits === 'function') updateBattleUnits();

        // (NOTE: The secondary 'UNIVERSAL WATER SLOWDOWN FOR ALL TROOPS' loop has been 
        // completely removed from here, as updateRiverPhysics handles it properly!)
        
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
			
// SURGERY REVISION: Hold the attack lock, BUT drop it if the enemy dies, flees, or runs out of range!
if (pCmdr.target) {
    let distToTarget = Math.hypot(pCmdr.target.x - pCmdr.x, pCmdr.target.y - pCmdr.y);
    let maxRange = pCmdr.stats.range || 700;
    
    if (pCmdr.target.hp <= 0 || pCmdr.target.state === "FLEEING" || distToTarget > maxRange) {
        pCmdr.target = null;
    }
}
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
	
else 
	{ 
        player.size = 24;
        
        if (++economyTick > 300) { updateCityEconomies(cities); economyTick = 0; }
        if (typeof updateDiplomacy === 'function') updateDiplomacy();
        if (typeof updateSieges === 'function') updateSieges();
 
        // ---> SURGERY 1: FETCH TILE & CALCULATE SPEED BEFORE MOVING <---
        const tx = Math.max(0, Math.min(COLS - 1, Math.floor(player.x / TILE_SIZE)));
        const ty = Math.max(0, Math.min(ROWS - 1, Math.floor(player.y / TILE_SIZE)));
        const currentTile = worldMap?.[tx]?.[ty] || {name: "Plains", speed: 1};

        const oldX = player.x, oldY = player.y;
        
// 1. Calculate penalties
let starvPenalty = player.food > 0 ? 1.0 : 0.6;

// 2. Troop Weight Penalty: Each troop reduces speed slightly.
// Example: -0.2% speed per soldier, with a minimum speed floor of 40%.
let troopPenalty = Math.max(0.4, 1.0 - (player.troops * 0.002)); 

// 3. Apply all multipliers to calculate final Overworld speed
// SURGERY: Base speed modified by hunger, army size, terrain, and a 0.60 global overworld modifier
player.speed = player.baseSpeed * starvPenalty * troopPenalty * currentTile.speed * 0.60;

        // Now pass the heavily modified speed into the engine
        calculateMovement(player.speed / 4, worldMap, TILE_SIZE, COLS, ROWS, false);
        // ---------------------------------------------------------------
        
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
// Define what SHOULD be playing
const targetSong = 'music/gameloop.mp3';

// TRIGGER: SAFE/CALM
if (AudioManager.currentTrack !== targetSong) {
    // This only runs ONCE when the song changes
AudioManager.playRandomMP3List([
    'music/gameloop1.mp3',
    'music/gameloop2.mp3',
    'music/gameloop3.mp3'
]);
        }
        player.lastEncounteredFaction = null;
    }
}
// --- SURGERY: HIDE TOP LEFT UI IN BATTLE/SIEGE ---
let locEl = document.getElementById('loc-text');
let topGuiContainer = locEl ? locEl.parentElement : null;

// Hide the entire panel if in battle or actively sieging
if (topGuiContainer) {
    if (inBattleMode || player.isSieging) {
        topGuiContainer.style.display = 'none';
    } else {
        topGuiContainer.style.display = 'block';
    }
}

// Proceed with updating text variables only if they exist
if (locEl) locEl.innerText = `${Math.round(player.x)}, ${Math.round(player.y)}`;

let terrainEl = document.getElementById('terrain-text');
if (terrainEl) terrainEl.innerText = (typeof inCityMode !== 'undefined' && inCityMode) ? "City" : currentTile.name;

const speedEl = document.getElementById('speed-text');
if (speedEl) {
    if (inBattleMode || (typeof inCityMode !== 'undefined' && inCityMode)) {
        speedEl.style.display = 'none';
    } else {
        speedEl.style.display = 'block';
        speedEl.innerText = currentTile.speed + "x";
    }
}
// --------------------------------------------------

document.getElementById('zoom-text').innerText =
    zoom.toFixed(2) + "x";
	
	
        if (!inCityMode) {
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
			if (typeof inNavalBattle !== 'undefined' && inNavalBattle) {
				// --- FIX 1: THE BLACK ABYSS ---
				// 1. Paint the infinite background pure black
				ctx.fillStyle = "#000000"; 
				ctx.fillRect(-3000, -3000, 8400, 7600);
				
				// 2. Paint the actual playable naval grid with water
				ctx.fillStyle = navalEnvironment.waterColor;
				ctx.fillRect(0, 0, BATTLE_WORLD_WIDTH, BATTLE_WORLD_HEIGHT);

				drawNavalBackground(ctx);
				drawNavalShips(ctx);
				drawCosmeticWaves(ctx);
			} else {
				// 1. Draw Infinite Floor (LAND)
				ctx.fillStyle = battleEnvironment.groundColor || "#767950";
				ctx.fillRect(-3000, -3000, 8400, 7600);

				// 2. Draw Background Terrain (LAND)
				if (battleEnvironment.bgCanvas) {
					ctx.drawImage(battleEnvironment.bgCanvas, -battleEnvironment.visualPadding, -battleEnvironment.visualPadding);
				}
			}

			// 3. Draw Units
			ctx.save();
            
			// --- FIX 2 & 3: CANVAS LEAK & SHIP SWAY ---
			if (typeof inNavalBattle !== 'undefined' && inNavalBattle) {
                // Apply the wave bobbing to the troops so they stay pinned to the swaying deck
                ctx.translate(navalEnvironment.shipSwayX, navalEnvironment.shipSwayY);
                
                // DELETED the broken unit loop with unmatched ctx.save() and ctx.clip() calls. 
                // Any water clipping MUST be handled individually inside troop_system.js per unit.
			}
            
			drawBattleUnits(ctx);
			ctx.restore();

			// 4. Draw Foreground Terrain (Trees/Canopy) - ONLY ON LAND
			if (!(typeof inNavalBattle !== 'undefined' && inNavalBattle) && battleEnvironment.fgCanvas) {
				ctx.drawImage(battleEnvironment.fgCanvas, -battleEnvironment.visualPadding, -battleEnvironment.visualPadding);
			}
        
// 5. Draw Dynamic Assets (Gates & Engines)
        if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) {
            if (typeof renderDynamicGates === 'function') renderDynamicGates(ctx);
            if (typeof renderSiegeEngines === 'function') renderSiegeEngines(ctx);
        }


// 5. Draw Dynamic Assets (Gates, Engines, & Towers)
// Logic: Draw if (Siege OR City) AND NOT Naval
const canDrawForts = !(typeof inNavalBattle !== 'undefined' && inNavalBattle) && 
                     ((typeof inSiegeBattle !== 'undefined' && inSiegeBattle) || (typeof inCityMode !== 'undefined' && inCityMode));

if (canDrawForts) {
    // Gates and Towers appear in both Sieges and City Exploration
    if (typeof renderDynamicGates === 'function') renderDynamicGates(ctx);
    if (typeof renderDynamicTowers === 'function') renderDynamicTowers(ctx);

    // Siege Engines (Rams/Towers) usually only appear during active Siege Battles
    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle) {
        if (typeof renderSiegeEngines === 'function') renderSiegeEngines(ctx);
    }
}

        // 6. Draw Battle UI overlays
        const aliveEnemies = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;

 




} else if (inCityMode) {

        // 1. Draw city background FIRST
        let cityData = cityDimensions[currentActiveCityFaction];
        if (cityData && cityData.bgCanvas) {
            ctx.drawImage(cityData.bgCanvas, 0, 0);
        }

        // 2. Draw forts/towers ON TOP of background (correct order)
        if (typeof renderDynamicGates === 'function') renderDynamicGates(ctx);
        if (typeof renderDynamicTowers === 'function') renderDynamicTowers(ctx);

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
		
		if (typeof cityDialogueRender === 'function') {
    cityDialogueRender(ctx);
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
 

    if (uiSyncTick % 30 === 0) syncSiegeUIVisibility();
	
    ctx.restore();

    if (typeof drawPlayerOverlay === 'function') {
        drawPlayerOverlay(ctx, player, zoom);
    }

    requestAnimationFrame(() => {
        update();
        draw();
    });

    updateAndDrawPlayerSystems(ctx, player, zoom, WORLD_WIDTH, WORLD_HEIGHT, typeof globalNPCs !== 'undefined' ? globalNPCs : []);
	updateCitySystems();
	
drawMasterStateOverlay(ctx, canvas.width, canvas.height);
drawVictoryStateOverlay(ctx, canvas.width, canvas.height);
}
// A dedicated function that ONLY runs at the very end of the frame
function drawMasterStateOverlay(ctx, canvasWidth, canvasHeight) {
    if (typeof inBattleMode === 'undefined' || !inBattleMode) return;
    if (typeof battleEnvironment === 'undefined' || !battleEnvironment.units) return;

    let pCmdr = battleEnvironment.units.find(u => u.isCommander && u.side === "player");
    if (!pCmdr) return;

    if (pCmdr.hp <= 0) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // --- CENTER DEATH TEXT ---
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let mainFontSize = Math.min(64, canvasWidth * 0.1); 
        ctx.fillStyle = "#ff3333"; 
        ctx.font = `bold ${mainFontSize}px Georgia, serif`;
        ctx.shadowBlur = 10;
        ctx.fillText("YOU HAVE FALLEN", canvasWidth / 2, canvasHeight / 2 - 20);

        let subFontSize = Math.min(24, canvasWidth * 0.04);
        ctx.fillStyle = "#ffca28";
        ctx.font = `italic ${subFontSize}px Georgia, serif`;
        ctx.shadowBlur = 5;
        ctx.fillText("Press [P] or ↩️ to end Battle.", canvasWidth / 2, canvasHeight / 2 + 40);

        ctx.restore();
    }
}

function drawVictoryStateOverlay(ctx, canvasWidth, canvasHeight) {
    // 1. Guards: Ensure we are in battle and the environment exists
    if (typeof inBattleMode === 'undefined' || !inBattleMode) return;
    if (typeof battleEnvironment === 'undefined' || !battleEnvironment.units) return;

    // 2. Count alive enemies (excluding the player's side)
    const aliveEnemies = battleEnvironment.units.filter(u => u.side !== 'player' && u.hp > 0).length;

    // 3. Trigger overlay only when no enemies remain
    if (aliveEnemies < 1) {
        ctx.save();
        
        // Full-screen semi-transparent wash
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // --- CENTER VICTORY TEXT ---
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Main Title: Gold/Amber for Victory
        let mainFontSize = Math.min(64, canvasWidth * 0.1); 
        ctx.fillStyle = "#ffca28"; 
        ctx.font = `bold ${mainFontSize}px Georgia, serif`;
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10;
        ctx.fillText("VICTORY", canvasWidth / 2, canvasHeight / 2 - 20);

        // Subtext: Exit instructions following your [P] key logic
        let subFontSize = Math.min(24, canvasWidth * 0.04);
        ctx.fillStyle = "#ffffff";
        ctx.font = `italic ${subFontSize}px Georgia, serif`;
        ctx.shadowBlur = 5;
        ctx.fillText("Press [P] or ↩️ to return to the Overworld.", canvasWidth / 2, canvasHeight / 2 + 40);

        ctx.restore();
    }
}


//initGame();
showMainMenu();
 
 function updateCitySystems() {
    if (!inCityMode || inBattleMode || !currentActiveCityFaction) return;

    // 1. Process Dialogue Timers
    if (typeof cityDialogueUpdate === 'function') {
        cityDialogueUpdate();
    }

    // 2. Check for Proximity Triggers (Frame-by-Frame)
    if (typeof cityDialogueSystem !== 'undefined') {
        cityDialogueSystem.tryAutoCityContact(player, currentActiveCityFaction, { radius: 25 }); // Slightly increased radius for better feel
    }
}

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
// --- SURGERY: MISSING RIVER PHYSICS ENGINE REBUILT ---
window.updateRiverPhysics = function() {
    if (!window.inRiverBattle || !battleEnvironment.units) return;

    battleEnvironment.units.forEach(unit => {
        if (unit.hp <= 0) return;
        
        let surface = 'LAND'; 

        // Only use the complex naval 'ship deck' detector if it's a true Ocean/Coastal battle
        if (window.inNavalBattle && (navalEnvironment.mapType === "Ocean" || navalEnvironment.mapType === "Coastal")) {
            if (typeof window.getNavalSurfaceAt === 'function') {
                surface = window.getNavalSurfaceAt(unit.x, unit.y);
            }
        } 
        // Otherwise, check the actual terrain grid tiles (River battles live here)
        else if (battleEnvironment && battleEnvironment.grid) {
            const tx = Math.floor(unit.x / (typeof BATTLE_TILE_SIZE !== 'undefined' ? BATTLE_TILE_SIZE : 8));
            const ty = Math.floor(unit.y / (typeof BATTLE_TILE_SIZE !== 'undefined' ? BATTLE_TILE_SIZE : 8));
            
            // ---> THE FIX: Check for BOTH River (4) and Ocean (11) <---
            if (battleEnvironment.grid[tx] && (battleEnvironment.grid[tx][ty] === 11 || battleEnvironment.grid[tx][ty] === 4)) {
                surface = 'WATER';
            }
        }

        if (surface === 'WATER') {
            unit.overboardTimer = (unit.overboardTimer || 0) + 1;
            unit.isSwimming = true;
            
            // Apply water friction
            unit.vx *= 0.15;
            unit.vy *= 0.15;

            // Drown threshold calculation
            if (!unit.drownTimer) unit.drownTimer = 0;
            let drownThreshold = Math.max(450, 4500 - ((unit.stats.weightTier||1)*250) - (unit.stats.mass||10));
            unit.drownTimer++;
            
            if (unit.drownTimer > drownThreshold) {
                unit.hp = 0; 
                unit.deathRotation = 0; 
                unit._drownedSilently = true; 
            }
        } else {
            // Unit is on Land
            unit.overboardTimer = 0;
            unit.isSwimming = false;
            if (unit.drownTimer > 0) unit.drownTimer -= 1;
        }
    });
};

// Optimized: Run bounds check every 100ms instead of every frame (Lag Fix)
setInterval(() => {if (typeof globalNPCs !== 'undefined') {globalNPCs.forEach(npc => enforceNPCBounds(npc, WORLD_WIDTH, WORLD_HEIGHT));}}, 100);
