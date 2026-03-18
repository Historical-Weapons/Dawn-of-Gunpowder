// ============================================================================
// EMPIRE OF THE 13TH CENTURY - DYNAMIC POPULATION & NPC SYSTEM
// ============================================================================

const FACTIONS = {
    "Hong Dynasty":          { color: "#d32f2f", geoWeight: { north: 0.3, south: 0.7, west: 0.4, east: 0.6 } }, // Red
    "Shahdom of Iransar":    { color: "#00838f", geoWeight: { north: 0.4, south: 0.6, west: 0.9, east: 0.1 } }, // Teal
    "Great Khaganate":       { color: "#1976d2", geoWeight: { north: 0.9, south: 0.1, west: 0.5, east: 0.5 } }, // Blue
    "Jinlord Confederacy":   { color: "#455a64", geoWeight: { north: 0.8, south: 0.2, west: 0.5, east: 0.5 } }, // Slate Grey
    "Vietan Realm":          { color: "#388e3c", geoWeight: { north: 0.1, south: 0.9, west: 0.3, east: 0.7 } }, // Green
    "Goryun Kingdom":        { color: "#7b1fa2", geoWeight: { north: 0.7, south: 0.3, west: 0.4, east: 0.8 } }, // Purple
    "Xiaran Dominion":       { color: "#fbc02d", geoWeight: { north: 0.5, south: 0.5, west: 0.7, east: 0.3 } }, // Gold
    "High Plateau Kingdoms": { color: "#8d6e63", geoWeight: { north: 0.6, south: 0.4, west: 0.3, east: 0.7 } }, // Earth Brown
    "Yamato Clans":          { color: "#c2185b", geoWeight: { north: 0.6, south: 0.4, west: 0.2, east: 0.8 } }, // Crimson
    "Bandits":               { color: "#222222", geoWeight: { north: 0.5, south: 0.5, west: 0.5, east: 0.5 } },  // Black (Independent)
"Independent": { color: "#777777", geoWeight: { north: 0.5, south: 0.5, west: 0.5, east: 0.5 }} // Add this line

};

const SYLLABLE_POOLS = {
    "Hong Dynasty": ["Han","Zhuo","Mei","Ling","Xian","Yue","Lu","Feng","Bai","Shan","Qiao","He","Jin","Dao","Tong","An","Wu","Lin","Wan","Bao","Zi","Rong","Dong","Cheng","Hua","Shou","Yi","Tao","Yan","Gui"],
    "Jinlord Confederacy": ["Aisin","Nara","Guda","Baqa","Hada","Mukden","Tara","Sirin","Fuka","Hulan","Qara","Bolo","Dorgi","Chila","Bi","Sengge","Ulan","Bayan","Kiyen","Nurhaci"],
    "Xiaran Dominion": ["Xi","Ran","Bao","Ling","Tao","Yun","Hai","Shuo","Gu","Lan","Zhi","Min","Qiao","Fen","Jiao","Lei","Yan","Yao","Jun","Qiu"],
    "Shahdom of Iransar": ["Sham","Dar","Far","Mehr","Var","Sar","Shir","Zar","Rud","Bar","Gan","Tus","Ray","Shap","Horm","Nish","Asp","Pas","Kar","Rash","Yaz","Beh","Fir","Gol","Sam","Vah"],
    "Great Khaganate": ["Or","Kar","Batu","Sar","Tem","Alt","Bor","Khan","Ur","Tol","Dar","Mur","Nog","Tog","Bal","Kher","Ulan","Tark","Sog","Yar"],
    "Vietan Realm": ["An","Bao","Suk","Dao","Gia","Hoa","Lam","Pho","Minh","Nam","Ninh","Phu","Quang","Son","Dik","Thanh","Thu","Tien","Van","Vinh"],
    "Goryun Kingdom": ["Gyeong","Han","Nam","Seong","Hae","Pak","Cheon","Il","Sung","Jeon","Gwang","Dong","Seo","Baek","Won","Dae","Hwa","Mun","Kim"],
    "High Plateau Kingdoms": ["Lha","Tse","Nor","Gar","Ri","Do","Shar","Lang","Zang","Yul","Cham","Phu","Sum","Rin","Tag","Yak","Tso","Ling","Par"],
    "Yamato Clans": ["Aki","Naga","Hara","Kawa","Matsu","Yama","Saka","Taka","Kiri","Shima","Oka","Tomo","Hoshi","Sora","Kuma","Nori","Fuku","Hida","Ishi"]
};

let globalNPCs = [];
let worldMapRef = null; 
let tSize = 8;
let maxCols = 0, maxRows = 0;
let lastBattleTime = 0;
const BATTLE_COOLDOWN = 3000; // 5 seconds
// ============================================================================
// CORE HELPER FUNCTIONS
// ============================================================================

function getRandomLandCoordinate(padX = 0, padY = 0) {
    if (!worldMapRef) return { x: 5000, y: 5000 };
    let attempts = 0;
    while(attempts < 5000) {
        let cx = Math.floor(Math.random() * ((maxCols * tSize) - 2 * padX)) + padX;
        let cy = Math.floor(Math.random() * ((maxRows * tSize) - 2 * padY)) + padY;
        let tx = Math.floor(cx / tSize);
        let ty = Math.floor(cy / tSize);
        
		if (worldMapRef[tx] && worldMapRef[tx][ty]) {
                    let tile = worldMapRef[tx][ty];
                    if(!tile.impassable && tile.name !== "River" && tile.name !== "Coastal" && tile.name !== "Snowy Peaks" && tile.name !== "Ocean") {
                        return { x: cx, y: cy };
                    }
                }
        attempts++;
    }
    return { x: 5000, y: 5000 };
}

function getFactionByGeography(x, y, worldWidth, worldHeight) {
    let xNorm = x / worldWidth;
    let yNorm = y / worldHeight;
    let bestFaction = "Independent";
    let bestScore = Infinity;
    
    for (const [factionName, data] of Object.entries(FACTIONS)) {
        if(factionName === "Bandits") continue; 
        let dist = Math.hypot(xNorm - data.geoWeight.east, yNorm - data.geoWeight.south);
        let noise = Math.random() * 0.15; 
        let finalScore = dist + noise;
        if (finalScore < bestScore) {
            bestScore = finalScore;
            bestFaction = factionName;
        }
    }
    return bestFaction;
}

function generateFactionCityName(faction) {
    let pool = SYLLABLE_POOLS[faction] || SYLLABLE_POOLS["Hong Dynasty"];
    let name = "";
    let numSyllables = Math.random() < 0.95 ? 2 : 3; 
    for(let i = 0; i < numSyllables; i++) {
        name += pool[Math.floor(Math.random() * pool.length)];
    }
    return name;
}

function getRandomTargetCity(cities, excludeCity, faction = null) {
    let valid = cities.filter(c => c !== excludeCity);
    if(faction) {
        let factionCities = valid.filter(c => c.faction === faction);
        if(factionCities.length > 0) return factionCities[Math.floor(Math.random() * factionCities.length)];
    }
    return valid[Math.floor(Math.random() * valid.length)];
}

// ============================================================================
// CITY INITIALIZATION & ECONOMY
// ============================================================================

function initializeCityData(city, worldWidth, worldHeight) {
    let controllingFaction = getFactionByGeography(city.x, city.y, worldWidth, worldHeight);
    
    city.faction = controllingFaction;
    city.color = FACTIONS[controllingFaction].color;
    city.name = generateFactionCityName(controllingFaction); 
    city.pop = Math.floor(city.pop * 0.2);
    
    city.conscriptionRate = 0.01 + (Math.random() * 0.03);
    city.militaryPop = Math.floor(city.pop * city.conscriptionRate);
    city.civilianPop = city.pop - city.militaryPop;
    city.troops = city.militaryPop; 

    city.gold = Math.floor(city.civilianPop * (Math.random() * 2 + 1)); 
    city.food = Math.floor(city.pop * (Math.random() * 3 + 2)); 
}

function updateCityEconomies(cities) {
    cities.forEach(city => {
        let foodProduced = city.pop * 0.055; 
        let foodConsumed = city.pop * 0.050; 
        city.food += Math.floor(foodProduced - foodConsumed);

        if (city.food < 0) {
            let starved = Math.floor(Math.abs(city.food) * 0.5); 
            city.pop = Math.max(100, city.pop - starved);
            city.civilianPop = Math.max(0, city.civilianPop - starved); 
            city.food = 0;
        } else if (city.food > city.pop * 5) {
            let growth = Math.floor(city.pop * 0.005); 
            city.pop += growth;
            city.civilianPop += growth; 
            city.food -= Math.floor(growth * 2); 
        }

        let taxRevenue = city.civilianPop * 0.01;
        let militaryUpkeep = city.militaryPop * 0.02; 
        city.gold += Math.floor(taxRevenue - militaryUpkeep);

        let maxFood = city.pop * 10;
        let maxGold = city.pop * 5;
        if (city.food > maxFood) city.food = maxFood;
        if (city.gold > maxGold) city.gold = maxGold;
		
        let targetGarrison = Math.floor(city.pop * city.conscriptionRate);
        
        if (city.militaryPop < targetGarrison) {
            let draft = Math.min(5, targetGarrison - city.militaryPop); 
            if (city.civilianPop > draft) { 
                city.militaryPop += draft;
                city.civilianPop -= draft;
            }
        } 
        else if (city.militaryPop > city.pop * 0.5) {
            let retire = 5;
            city.militaryPop -= retire;
            city.civilianPop += retire;
        }

        city.militaryPop = Math.max(0, city.militaryPop);
        city.civilianPop = Math.max(0, city.civilianPop);
        city.troops = city.militaryPop; 
    });
}

// ============================================================================
// SMART TARGETING HELPERS
// ============================================================================

function getEnemyCity(originCity, citiesArr) {
    let enemies = citiesArr.filter(c => c.faction !== originCity.faction && c.faction !== "Bandits");
    if (enemies.length === 0) return null;
    enemies.sort((a, b) => Math.hypot(a.x - originCity.x, a.y - originCity.y) - Math.hypot(b.x - originCity.x, b.y - originCity.y));
    return enemies[Math.floor(Math.random() * Math.min(3, enemies.length))]; 
}

function getWealthyCity(citiesArr, excludeCity) {
    let valid = citiesArr.filter(c => c !== excludeCity);
    if (valid.length === 0) return null;
    valid.sort((a, b) => (b.food + b.gold) - (a.food + a.gold));
    return valid[Math.floor(Math.random() * Math.min(5, valid.length))]; 
}

// ============================================================================
// NPC SPAWNING LOGIC 
// ============================================================================

function spawnNPCFromCity(city, role, citiesArr) {

// 1. FIX: Removed the floating 'id:' line. 
    // 2. FIX: Properly declare targetX and targetY with 'let' so they exist safely.
    let target = null; 
    let targetX = city.x; 
    let targetY = city.y;
    let speed = 0.5, count = 0;
    let carriedGold = 0, carriedFood = 0;
    let travelDist = 0;

    if (role === "Civilian") {
        count = Math.min(Math.floor(Math.random() * 35) + 5, city.civilianPop);
        if (count < 5) return;
        speed = 0.3;
        target = getWealthyCity(citiesArr, city); 
        carriedGold = Math.floor((count / (city.civilianPop || 1)) * city.gold * 0.5);
        carriedFood = count * 2;
        city.civilianPop -= count; city.pop -= count;
        city.gold -= carriedGold; city.food -= carriedFood;
    } 
    else if (role === "Commerce") {
        count = Math.floor(Math.random() * 20) + 10; 
        if (city.civilianPop < count * 2 || city.food < 100) return;

        speed = 0.5;
        target = getRandomTargetCity(citiesArr, city);
        travelDist = Math.hypot(target.x - city.x, target.y - city.y);
        carriedFood = Math.min(200, Math.floor(city.food * 0.03));
        carriedGold = Math.min(150, Math.floor(city.gold * 0.05));

        city.food -= carriedFood;
        city.gold -= carriedGold;
    }
    else if (role === "Patrol") {
        count = Math.min(Math.floor(Math.random() * 20) + 10, city.militaryPop);
        if (count < 10) return;
        speed = 0.7;
        targetX = city.x + (Math.random() - 0.5) * 800;
        targetY = city.y + (Math.random() - 0.5) * 800;
        carriedFood = count * 5;
        city.food -= carriedFood;
    } 
    else if (role === "Military") {
        count = Math.min(Math.floor(Math.random() * 400) + 100, city.militaryPop);
        if (count < 50) return;
        speed = 0.6;
        target = getEnemyCity(city, citiesArr);
        if (!target) target = getRandomTargetCity(citiesArr, city, city.faction);
        
        carriedFood = count * 10;
        city.militaryPop -= count; city.pop -= count;
        city.food -= carriedFood;
    }

    if (target) { targetX = target.x; targetY = target.y; }
    city.troops = city.militaryPop; 

    globalNPCs.push({
        id: Math.random().toString(36).substr(2, 9), 
        role: role, 
        count: count,
        faction: city.faction, 
        color: city.color, 
        originCity: city, 
        targetCity: target,
        travelDist: travelDist, 
        x: city.x, 
        y: city.y, 
        targetX: targetX, 
        targetY: targetY, 
        speed: speed,
        anim: Math.floor(Math.random() * 100), 
        isMoving: true, 
        waitTimer: 0,
        battlingTimer: 0,   
        battleTarget: null, 
        gold: carriedGold, 
        food: carriedFood
    });
}

function spawnBandit(padX, padY) {
    let coords = getRandomLandCoordinate(padX, padY);
    globalNPCs.push({
        id: Math.random().toString(36).substr(2, 9),
        role: "Bandit",
        count: Math.floor(Math.random() * 16) + 5, 
        faction: "Bandits",
        color: FACTIONS["Bandits"].color,
        originCity: null, targetCity: null,
        x: coords.x, y: coords.y,
        targetX: coords.x + (Math.random() - 0.5) * 1000,
        targetY: coords.y + (Math.random() - 0.5) * 1000,
        speed: 0.6, 
        anim: Math.floor(Math.random() * 100), 
        isMoving: true, 
        waitTimer: 0,
        battlingTimer: 0,   
        battleTarget: null, 
        gold: 0, 
        food: 30 
    });
}

function initializeNPCs(cities, mapData, tileSize, cols, rows, padX, padY) {
    console.log("Drafting Dynamic Populations & Armies...");
    
    worldMapRef = mapData;
    tSize = tileSize;
    maxCols = cols;
    maxRows = rows;
    globalNPCs = []; 

    cities.forEach(city => {
        let activityLevel = Math.floor(city.pop / 1500) + 1; 
        
        for(let i=0; i < activityLevel; i++) {
            if (Math.random() < 0.3) spawnNPCFromCity(city, "Commerce", cities);
            if (Math.random() < 0.3) spawnNPCFromCity(city, "Civilian", cities);
            if (Math.random() < 0.3) spawnNPCFromCity(city, "Patrol", cities);
        }
        
        if(city.pop > 5000 && Math.random() < 0.4) {
            spawnNPCFromCity(city, "Military", cities);
        }
    });

    let banditCount = cities.length * 2; 
    for(let i=0; i<banditCount; i++) {
        spawnBandit(padX, padY);
    }
    console.log(`Successfully deployed ${globalNPCs.length} dynamic NPCs across the map.`);
}

// ============================================================================
// GRAND SIMULATION LOOP (Combat, Sieges, Migration, Trade)
// ============================================================================

function updateNPCs(cities) {
	
    globalNPCs = globalNPCs.filter(npc => npc.count > 0);

    for (let i = 0; i < globalNPCs.length; i++) {
		
		
        let npc = globalNPCs[i];

// --- SURGERY: LIGHTWEIGHT SEPARATION ---
for (let j = i + 1; j < globalNPCs.length; j++) {
    let other = globalNPCs[j];
    let dx = npc.x - other.x;
    let dy = npc.y - other.y;
    let distSq = dx * dx + dy * dy;

    if (distSq < 225) { // 15px radius squared (faster than Math.sqrt)
        let push = 0.5; // How hard they push away
        npc.x += dx > 0 ? push : -push;
        npc.y += dy > 0 ? push : -push;
        other.x += dx > 0 ? -push : push;
        other.y += dy > 0 ? -push : push;
    }
}

// Check Player Collision
let distToPlayer = Math.hypot(npc.x - player.x, npc.y - player.y);
const now = Date.now();

// --- Inside npc_system.js -> updateNPCs() ---

if (
    distToPlayer < 20 &&
    !inCityMode &&         // FIX: Removed 'window.'
    !inBattleMode &&       // FIX: Removed 'window.'
    (now - lastBattleTime > BATTLE_COOLDOWN) &&
    npc.role !== "Civilian" &&
    npc.role !== "Commerce"
) {
    // Grab the tile the player is standing on to texture the battlefield
// Inside drawAllNPCs in npc_system.js:
let tx = Math.floor(npc.x / tSize); // Change TILE_SIZE to tSize
let ty = Math.floor(npc.y / tSize);
// Match the name 'currentTile' so enterBattlefield can find it
let currentTile = (worldMapRef && worldMapRef[tx] && worldMapRef[tx][ty]) ? worldMapRef[tx][ty] : {name: "Plains"}; 
enterBattlefield(npc, player, currentTile);
}
        // --- 1. COMBAT SEQUENCE (SURGERY: Trickling Troops & Faster Battles) ---
        if (npc.battlingTimer > 0) {
            npc.battlingTimer--;
            npc.isMoving = false;

            if (npc.battleTarget && npc.battleTarget.count > 0) {
                // Trickle down troops periodically during the battle (every 10 ticks)
                if (npc.battlingTimer % 10 === 0) {
                    let other = npc.battleTarget;
                    let dmgToOther = Math.max(1, Math.floor(npc.count * (Math.random() * 0.05 + 0.01)));
                    let dmgToNpc = Math.max(1, Math.floor(other.count * (Math.random() * 0.05 + 0.01)));

                    npc.count -= dmgToNpc;
                    other.count -= dmgToOther;

// --- SURGERY: POST-BATTLE REBOUND ---
if (npc.count <= 0 || other.count <= 0) {
    let survivor = npc.count > 0 ? npc : other;
    let loser = npc.count <= 0 ? npc : other;

    // Transfer loot
    survivor.gold += loser.gold; 
    survivor.food += loser.food;

    // REBOUND: "Kick" the survivor away so they don't stay on the corpse
    let angle = Math.random() * Math.PI * 2;
    survivor.x += Math.cos(angle) * 20; 
    survivor.y += Math.sin(angle) * 20;
    
    // Reset state and force a brief "scatter" move
    survivor.waitTimer = 40;
    survivor.targetX = survivor.x + Math.cos(angle) * 50;
    survivor.targetY = survivor.y + Math.sin(angle) * 50;
    
    npc.battleTarget = null;
    other.battleTarget = null;
    npc.battlingTimer = 0;
    other.battlingTimer = 0;
}
                }
            } else {
                // Foe is dead or missing, clear lock
                npc.battleTarget = null;
                npc.battlingTimer = 0;
                npc.waitTimer = 30;
            }
            continue; 
        }

        // --- 2. HUMAN MECHANIC (Random Rest) ---
        if (npc.isMoving && Math.random() < 0.002) {
            npc.waitTimer = Math.floor(Math.random() * 100) + 50; 
        }

        // --- 3. AGGRO & EVASION RADAR ---
        let bestTarget = null;
        let bestTargetScore = -Infinity; 
        let closestScaryEnemy = null;    
        let minScaryDist = 300; 

        for (let j = 0; j < globalNPCs.length; j++) {
            if (i === j) continue;
            let other = globalNPCs[j];
            
            if (other.count > 0 && npc.faction !== other.faction && (npc.faction !== "Bandits" || other.faction !== "Bandits")) {
                let dist = Math.hypot(npc.x - other.x, npc.y - other.y);
                
                // A. INITIATE COMBAT (SURGERY: Hesitation & Repel Mechanics)
                if (dist < 25 && !npc.battleTarget && !other.battleTarget && npc.battlingTimer === 0 && other.battlingTimer === 0) {
                    
                    // Dice roll to reduce battle frequency (simulates hesitation before clash)
                    if (Math.random() > 0.1) { // 90% chance per frame to NOT instantly lock in combat
                        
                        // Weaker foes will try to actively repel away instead of re-engaging
                        if (npc.count < other.count * 0.6) {
                            npc.targetX = npc.x + (npc.x - other.x) * 2; 
                            npc.targetY = npc.y + (npc.y - other.y) * 2;
                            npc.waitTimer = 0;
                        }
                        break; 
                    }

                    npc.battlingTimer = 90; // Much faster battles
                    other.battlingTimer = 90;
                    npc.battleTarget = other;
                    other.battleTarget = npc;
                    npc.waitTimer = 0;
                    other.waitTimer = 0;
                    break; 
                }
                
                // B. TRACK FOR CHASE / FLEE
                let isScary = (other.role === "Military" || other.role === "Bandit" || other.role === "Patrol");
                let isWeak = (other.role === "Civilian" || other.role === "Commerce");

                if (npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") {
                    if (dist < 400) { 
                        let score = -dist; 
                        if (isWeak) score += 500; 
                        
                        // SURGERY: Fine-tuned Bandit vs Patrol targeting
                        if (npc.role === "Bandit" && (other.role === "Military" || other.role === "Patrol")) score -= 1000;
                        if (npc.role === "Patrol" && other.role === "Bandit") score += 800;

                        if (score > bestTargetScore) {
                            bestTargetScore = score;
                            bestTarget = other;
                        }
                    }
                } 
                else if (npc.role === "Civilian" || npc.role === "Commerce") {
                    if (isScary && dist < minScaryDist) {
                        minScaryDist = dist;
                        closestScaryEnemy = other;
                    }
                }
            }
        }

        // --- 4. FLIGHT OR FIGHT LOGIC ---
// SURGICAL REPLACEMENT:
        // --- 4. FLIGHT OR FIGHT LOGIC ---
        if (!npc.battleTarget) {
            
            // NEW: DESPERATION/HUNGER OVERRIDE
            if (npc.food < 20 && npc.role !== "Commerce" && npc.role !== "Civilian") {
                bestTarget = null; // Drop enemy aggro to focus on survival
                
                // Find nearest friendly city to buy food. (Bandits just look for any close city to raid).
                if (!npc.targetCity || (npc.faction !== "Bandits" && npc.targetCity.faction !== npc.faction)) {
                    let potentialCities = npc.faction === "Bandits" ? cities : cities.filter(c => c.faction === npc.faction);
                    if (potentialCities.length > 0) {
                        potentialCities.sort((a,b) => Math.hypot(npc.x-a.x, npc.y-a.y) - Math.hypot(npc.x-b.x, npc.y-b.y));
                        npc.targetCity = potentialCities[0];
                    }
                }
            }

            if ((npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") && bestTarget) {
                npc.targetX = bestTarget.x;
                npc.targetY = bestTarget.y;
                npc.waitTimer = 0; 
                npc.speed = 1.4; 
            } 
            else if ((npc.role === "Civilian" || npc.role === "Commerce") && closestScaryEnemy) {
                let dx = npc.x - closestScaryEnemy.x;
                let dy = npc.y - closestScaryEnemy.y;
                let distToScary = Math.hypot(dx, dy) || 1;
                
                npc.targetX = npc.x + (dx / distToScary) * 150; 
                npc.targetY = npc.y + (dy / distToScary) * 150;
                npc.waitTimer = 0;
                npc.speed = 1.6; 
            } 
            else {
                if (npc.targetCity) {
                    npc.targetX = npc.targetCity.x;
                    npc.targetY = npc.targetCity.y;
                }
                if (npc.role === "Civilian" || npc.role === "Commerce") npc.speed = 0.9;
                else if (npc.role === "Military" || npc.role === "Bandit") npc.speed = 1;
                else if (npc.role === "Patrol") npc.speed = 1;
            }
        }

// SURGICAL REPLACEMENT:
        // --- 5. ARMY SUPPLY DRAIN & FORAGING ---
        if (npc.isMoving) {
            if ((npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") && Math.random() < 0.002) { 
                let consumption = 1 + Math.floor(npc.count / 25);
                npc.food -= consumption;
                
                if (npc.food <= 0) {
                    npc.food = 0;
                    npc.count -= Math.max(1, Math.floor(npc.count * 0.02)); 
                }
            }
            
            // NEW: Wilderness Foraging (Slower rate, triggers if food is critically low)
            if (npc.food < 20 && Math.random() < 0.005) {
                // Find a small amount of food. Bandits are better at living off the land.
                let forageAmount = Math.max(2, Math.floor(npc.count * 0.01));
                if (npc.role === "Bandit") forageAmount *= 2; 
                npc.food += forageAmount;
            }
        }

        // --- 6. MOVEMENT LOGIC ---
        if (npc.waitTimer > 0) {
            npc.waitTimer--;
            npc.isMoving = false;
        } else if (!npc.battleTarget) {
            let dx = npc.targetX - npc.x;
            let dy = npc.targetY - npc.y;
            let dist = Math.hypot(dx, dy);

            if (dist < 10) { 
                npc.isMoving = false;
                
                if (npc.targetCity) {
                    let tc = npc.targetCity;
// Before processing logic, "park" the unit in a random spot near the city
        // so the next unit doesn't stack directly on top of it.
        npc.x = tc.x + (Math.random() - 0.5) * 40;
        npc.y = tc.y + (Math.random() - 0.5) * 40;
                    // SURGICAL REPLACEMENT:
// SURGICAL REPLACEMENT:
                    if ((npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") && npc.faction !== tc.faction) {
                        let siegeDamage = Math.floor(npc.count * 0.2);
                        let garrisonDamage = Math.floor(tc.militaryPop * 0.15);

                        npc.count -= garrisonDamage;
                        tc.militaryPop -= siegeDamage;
                        tc.pop -= siegeDamage;

                        if (tc.militaryPop <= 0) {
                            tc.faction = npc.faction; tc.color = npc.color;
                            tc.militaryPop = Math.max(10, Math.floor(npc.count * 0.5)); 
                            tc.troops = tc.militaryPop; tc.pop += tc.militaryPop;
                            npc.count -= tc.militaryPop; 
                            npc.targetCity = null; 
                        } else {
                            npc.waitTimer = 50; 
                            continue; 
                        }
                    }
                    // FIX: Added "Bandit" so they can use friendly bases too
                    else if ((npc.role === "Military" || npc.role === "Patrol" || npc.role === "Bandit") && npc.faction === tc.faction) {
                        
                        // NEW: Resupply & Trade Mechanic
                        let foodNeeded = (npc.count * 10) - npc.food;
                        
                        // FIX: Take what we need, or whatever the city has left (whichever is smaller)
                        let foodToTake = Math.min(foodNeeded, tc.food);
                        
                        if (foodToTake > 0) {
                            tc.food -= foodToTake;
                            npc.food += foodToTake;
                            
                            // Pay for the food if they have gold, simulating military budget flowing into local economy
                            // (Note: If gold < cost, they just "requisition" it for free, which is historically accurate!)
                            let cost = Math.floor(foodToTake * 0.05);
                            if (npc.gold >= cost) {
                                npc.gold -= cost;
                                tc.gold += cost;
                            }
                        }

                        // Only dissolve troops if the city is critically undefended
                        let targetGarrison = Math.floor(tc.pop * tc.conscriptionRate);
                        if (tc.militaryPop < targetGarrison) {
                            let absorb = Math.min(npc.count, targetGarrison - tc.militaryPop);
                            tc.militaryPop += absorb; tc.pop += absorb; tc.troops = tc.militaryPop;
                            npc.count -= absorb;
                        }

                        // If the army is still standing, give them a new mission so they don't get stuck
                        if (npc.count > 0) {
                            npc.targetCity = getEnemyCity(tc, cities) || getRandomTargetCity(cities, tc);
                            if (npc.targetCity) {
                                npc.targetX = npc.targetCity.x; 
                                npc.targetY = npc.targetCity.y;
                            }
                            npc.waitTimer = Math.floor(Math.random() * 100) + 50; 
                        }
                    }
                    // ... (Commerce and Civilian logic remains identical below this)
                    else if (npc.role === "Commerce") {
                     let profit = Math.floor(npc.travelDist * 0.02) + npc.gold;
                        tc.gold += profit; tc.food += npc.food; 
                        npc.gold = 0; npc.food = 0; 
                        
                        npc.targetCity = npc.originCity; 
                        npc.targetX = npc.targetCity.x; npc.targetY = npc.targetCity.y;
                        npc.waitTimer = Math.floor(Math.random() * 100) + 50;
                    }
                    else if (npc.role === "Civilian") {
                        tc.civilianPop += npc.count; tc.pop += npc.count;
                        tc.gold += npc.gold; tc.food += npc.food;
                        npc.count = 0; 
                    }
                } else {
                    npc.targetX = npc.x + (Math.random() - 0.5) * 600;
                    npc.targetY = npc.y + (Math.random() - 0.5) * 600;
                    npc.waitTimer = Math.floor(Math.random() * 60) + 30;
                }
            } 
			 else {
                // --- TILE SPEED SURGERY ---
                // 1. Identify current tile coordinates
                let tx = Math.floor(npc.x / tSize);
                let ty = Math.floor(npc.y / tSize);
                
                // 2. Fetch tile data (falling back to Plains speed of 0.55)
                let currentTile = (worldMapRef[tx] && worldMapRef[tx][ty]) ? worldMapRef[tx][ty] : { speed: 0.55 };
                
                // 3. Calculate move step: (Role Base Speed) * (Terrain Modifier)
                let moveStep = npc.speed * (currentTile.speed || 1.55);

                // 4. Apply movement
                npc.x += (dx / dist) * moveStep;
                npc.y += (dy / dist) * moveStep;
                npc.isMoving = true;
                
                // 5. Sync animation speed to the terrain (slows legs/sails in mud/snow)
                npc.anim += moveStep * 1.5; 
            }
        }
    }

    // --- 7. LONG-TERM RESPONSIVENESS (Mount & Blade style organic respawning) ---
    // Periodically, thriving cities will spawn new dynamic units into the world
// --- 7. LONG-TERM RESPONSIVENESS (Lowered for 1k-10k Pop) ---
    if (Math.random() < 0.04 && cities.length > 0) {
        let rc = cities[Math.floor(Math.random() * cities.length)];
        
        // Ratios dropped to ensure smaller towns still trade/patrol
        if (Math.random() < 0.3 && rc.civilianPop > 20) spawnNPCFromCity(rc, "Commerce", cities);
        else if (Math.random() < 0.2 && rc.civilianPop > 50) spawnNPCFromCity(rc, "Civilian", cities);
        else if (Math.random() < 0.4 && rc.militaryPop > 30) spawnNPCFromCity(rc, "Patrol", cities);
        
        // SURGERY: Military respawn threshold dropped from 20k/200 to 5k/80
        else if (rc.pop > 5000 && rc.militaryPop > 80 && Math.random() < 0.15) {
            spawnNPCFromCity(rc, "Military", cities);
        }
    }
    
    // Ensure the wilderness is never totally safe by slowly respawning destroyed bandit camps
    if (Math.random() < 0.02 && globalNPCs.filter(n => n.role === "Bandit").length < cities.length * 1.5) {
        spawnBandit(0, 0); 
    }
}
function drawAllNPCs(ctx, drawCaravanFunc, drawShipFunc, zoom, camLeft, camRight, camTop, camBottom) {
    // 1. SAFETY: Check for necessary globals
    if (!player || !worldMap) return; 

    // 2. Y-SORTING
    globalNPCs.sort((a, b) => a.y - b.y);

    const SPOTTING_RANGE_SQ = 1500 * 1500;

    // 3. CULLING
    const visibleNPCs = globalNPCs.filter(npc => {
        if (npc.x < camLeft || npc.x > camRight || npc.y < camTop || npc.y > camBottom) return false;
        let distSq = Math.pow(npc.x - player.x, 2) + Math.pow(npc.y - player.y, 2);
        return distSq <= SPOTTING_RANGE_SQ;
    });

    // --- PASS 1: DRAW SPRITES ---
    visibleNPCs.forEach(npc => {
        let tx = Math.floor(npc.x / TILE_SIZE); 
        let ty = Math.floor(npc.y / TILE_SIZE);
        let tile = (worldMap[tx] && worldMap[tx][ty]) ? worldMap[tx][ty] : null;
        let useBoat = !tile || ["Coastal", "River", "Ocean", "Sea", "Deep Ocean"].includes(tile.name);

        if (useBoat) {
            drawShipFunc(npc.x, npc.y, npc.isMoving, npc.anim);
        } else {
            drawCaravanFunc(npc.x, npc.y, npc.isMoving, npc.anim, npc.color); 
        }
    });

    // --- PASS 2: BATCHED TEXT (NAMES) ---
    let nameFontSize = Math.max(10, 14 / zoom); 
    ctx.font = `bold ${nameFontSize}px Georgia`;
    ctx.textAlign = "center";

    visibleNPCs.forEach(npc => {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillText(npc.role, npc.x + 1, npc.y - 24); 
        ctx.fillStyle = npc.color;
        ctx.fillText(npc.role, npc.x, npc.y - 25);
    });

    // --- PASS 3: CONDITIONAL DETAILS ---
    let detailFontSize = Math.max(8, 12 / zoom); // Renamed from smallFont to avoid conflict
    ctx.font = `italic ${detailFontSize}px Georgia`;
    
    visibleNPCs.forEach(npc => {
        const distToPlayerSq = Math.pow(npc.x - player.x, 2) + Math.pow(npc.y - player.y, 2);
        let mx = (typeof worldMouseX !== 'undefined') ? worldMouseX : 0;
        let my = (typeof worldMouseY !== 'undefined') ? worldMouseY : 0;
        const isMouseOver = Math.hypot(npc.x - mx, npc.y - my) < 30;

        if (distToPlayerSq < 40000 || isMouseOver || npc.battlingTimer > 0) {
            ctx.fillStyle = "#fff";
            let label = (npc.role === "Commerce" || npc.role === "Civilian") ? "People" : "Troops";
            ctx.fillText(`${npc.count} ${label}`, npc.x, npc.y - 12);
            
            if (distToPlayerSq < 10000 || isMouseOver) {
                ctx.fillStyle = "#ffd700";
                ctx.fillText(`G: ${Math.floor(npc.gold)}`, npc.x - 14, npc.y - 35);
                ctx.fillStyle = "#8bc34a";
                ctx.fillText(`F: ${Math.floor(npc.food)}`, npc.x + 14, npc.y - 35);
            }
        }
    });
}