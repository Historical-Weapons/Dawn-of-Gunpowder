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
    "Bandits":               { color: "#222222", geoWeight: { north: 0.5, south: 0.5, west: 0.5, east: 0.5 } },  // Black 
"Player's Kingdom": { color: "#FFFFFF", geoWeight: { north: 0.5, south: 0.5, west: 0.5, east: 0.5 }} // Add this line

};

const SYLLABLE_POOLS = {
    "Hong Dynasty": ["Han","Zhuo","Mei","Ling","Xian","Yue","Lu","Feng","Bai","Shan","Qiao","He","Jin","Dao","Tong","An","Wu","Lin","Wan","Bao","Zi","Rong","Dong","Cheng","Hua","Shou","Yi","Tao","Yan","Gui"],
"Jinlord Confederacy": [
    "Cira", "Nuru", "Guda", "Bi", "Bisi", 
    "Muke", "Tala", "Siri", "Hada", "Hula", 
    "Hete", "Boro", "Dogi", "Cila", "Bira", 
    "Sege", "Ula",  "Baya", "Kiye", "Ye"
],
 "Xiaran Dominion": ["Xi","Ran","Bao","Ling","Tao","Yun","Hai","Shuo","Gu","Lan","Zhi","Min","Qiao","Fen","Jiao","Lei","Yan","Yao","Jun","Qiu"],
    "Shahdom of Iransar": ["Sham","Dar","Far","Mehr","Var","Sar","Shir","Zar","Rud","Bar","Gan","Tus","Ray","Shap","Horm","Nish","Asp","Pas","Kar","Rash","Yaz","Beh","Fir","Gol","Sam","Vah"],
    "Great Khaganate": ["Or","Kar","Batu","Sar","Tem","Alt","Bor","Khan","Ur","Tol","Dar","Mur","Nog","Tog","Bal","Kher","Ulan","Tark","Sog","Yar"],
    "Vietan Realm": ["An","Bao","Suk","Dao","Gia","Hoa","Lam","Pho","Minh","Nam","Ninh","Phu","Quang","Son","Dik","Thanh","Thu","Tien","Van","Vinh"],
    "Goryun Kingdom": ["Gyeong","Han","Nam","Seong","Hae","Pak","Cheon","Il","Sung","Jeon","Gwang","Dong","Seo","Baek","Won","Dae","Hwa","Mun","Kim"],
    "High Plateau Kingdoms": ["Lha","Tse","Nor","Gar","Ri","Do","Shar","Lang","Zang","Yul","Cham","Phu","Sum","Rin","Tag","Yak","Tso","Ling","Par"],
    "Yamato Clans": ["Aki","Naga","Hara","Kawa","Matsu","Yama","Saka","Taka","Kiri","Shima","Oka","Tomo","Hoshi","Sora","Kuma","Nori","Fuku","Hida","Ishi"],
"Player's Kingdom": [
  "Tsim", "Sha", "Tsui", "Mong", "Kok",
  "Sham", "Shui", "Po", "Kwun", "Tong",
  "Yuen", "Long", "Wan", "Chai", "Sai",
  "Ying", "Cheung", "Chung", "Lok", "Lam"
]
};
const NPC_CARRY_CAPACITY_PER_UNIT = 10; // Each person/soldier can carry 20 units of goods
let globalNPCs = [];
let worldMapRef = null; 
let tSize = 8;
let maxCols = 0, maxRows = 0;
let lastBattleTime = 0;
const BATTLE_COOLDOWN = 2000;  
const MAX_GLOBAL_NPCS = 450; // NEW: Hard cap to save CPU
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
    let bestFaction = "Player's Kingdom";
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
function generateNPCRoster(role, count, faction) {
    let roster = [];
    let c = Math.max(1, Math.floor(count)); 

    // CASE 1: Specialized Roles (Non-Military)
    if (role === "Civilian") {
        let militiaCount = Math.floor(c * 0.95);
        for(let i=0; i<militiaCount; i++) roster.push({ type: "Militia", exp: 1 });
        for(let i=0; i<(c - militiaCount); i++) roster.push({ type: "Light Two Handed", exp: 1 }); 
    } 
    else if (role === "Commerce") {
        let militiaCount = Math.floor(c * 0.40); 
        for(let i=0; i<militiaCount; i++) roster.push({ type: "Militia", exp: 1 });
        for(let i=0; i<(c - militiaCount); i++) roster.push({ type: "Light Two Handed", exp: 2 }); 
    } 
    // CASE 2: Military, Patrol, or Bandits (Using your Composition Templates)
    else {
        let composition = [];

        // Integrated Faction Logic from your Battlefield System
        if (faction === "Great Khaganate") {
            composition = [{type: "Horse Archer", pct: 0.50}, {type: "Heavy Horse Archer", pct: 0.20}, {type: "Mangudai", pct: 0.10}, {type: "Lancer", pct: 0.15}, {type: "Heavy Lancer", pct: 0.05}];
        } else if (faction === "Shahdom of Iransar") {
            composition = [{type: "War Elephant", pct: 0.05}, {type: "Heavy Lancer", pct: 0.25}, {type: "Horse Archer", pct: 0.25}, {type: "Spearman", pct: 0.25}, {type: "Shielded Infantry", pct: 0.20}];
        } else if (faction === "Hong Dynasty") {
            composition = [{type: "Shielded Infantry", pct: 0.30}, {type: "Heavy Crossbowman", pct: 0.25}, {type: "Rocket", pct: 0.15}, {type: "Firelance", pct: 0.05}, {type: "Repeater Crossbowman", pct: 0.05}, {type: "Heavy Firelance", pct: 0.05}, {type: "Bomb", pct: 0.05}, {type: "Archer", pct: 0.05}];
        } else if (faction === "Vietan Realm") {
            composition = [{type: "Glaiveman", pct: 0.30}, {type: "Poison Crossbowman", pct: 0.25}, {type: "Javelinier", pct: 0.20}, {type: "Archer", pct: 0.15}, {type: "Spearman", pct: 0.10}];
        } else if (faction === "Jinlord Confederacy") {
            composition = [{type: "Archer", pct: 0.20}, {type: "Heavy Crossbowman", pct: 0.30}, {type: "Shielded Infantry", pct: 0.20}, {type: "Hand Cannoneer", pct: 0.15}, {type: "Heavy Lancer", pct: 0.10}, {type: "Elite Lancer", pct: 0.05}];
        } else if (faction === "Xiaran Dominion") {
            composition = [{type: "Camel Cannon", pct: 0.20}, {type: "Hand Cannoneer", pct: 0.20}, {type: "Slinger", pct: 0.25}, {type: "Spearman", pct: 0.20}, {type: "Lancer", pct: 0.15}];
        } else if (faction === "Goryun Kingdom") {
            composition = [{type: "Archer", pct: 0.40}, {type: "Spearman", pct: 0.20}, {type: "Shielded Infantry", pct: 0.20}, {type: "Rocket", pct: 0.10}, {type: "Hand Cannoneer", pct: 0.05}, {type: "Repeater Crossbowman", pct: 0.05}];
        } else if (faction === "High Plateau Kingdoms") {
            composition = [{type: "Slinger", pct: 0.30}, {type: "Heavy Horse Archer", pct: 0.20}, {type: "Archer", pct: 0.25}, {type: "Shielded Infantry", pct: 0.25}];
        } else if (faction === "Yamato Clans") {
            composition = [{type: "Glaiveman", pct: 0.40}, {type: "Heavy Two Handed", pct: 0.20}, {type: "Archer", pct: 0.30}, {type: "Heavy Horse Archer", pct: 0.10}];
        } else if (faction === "Bandits" || role === "Bandit") {
            composition = [{type: "Militia", pct: 0.70}, {type: "Slinger", pct: 0.15}, {type: "Javelinier", pct: 0.15}];
        } else {
            composition = [{type: "Shielded Infantry", pct: 0.25}, {type: "Spearman", pct: 0.20}, {type: "Archer", pct: 0.20}, {type: "Crossbowman", pct: 0.15}, {type: "Lancer", pct: 0.10}, {type: "Light Two Handed", pct: 0.10}];
        }

        // Generate units based on composition percentages
        let remainingCount = c;
        composition.forEach((unitTier, index) => {
            let numUnits = (index === composition.length - 1) ? remainingCount : Math.floor(c * unitTier.pct);
            for(let i=0; i < numUnits; i++) {
                roster.push({ type: unitTier.type, exp: 2 });
            }
            remainingCount -= numUnits;
        });
    }

    // SHUFFLE (Red Flag 4 Fix): Ensures casualites aren't always the same unit type
    for (let i = roster.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roster[i], roster[j]] = [roster[j], roster[i]];
    }

    return roster;
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
    city.pop = Math.floor(city.pop * 0.15);//population factor
    
    city.conscriptionRate = 0.02 + (Math.random() * 0.05);
    city.militaryPop = Math.floor(city.pop * city.conscriptionRate);
    city.civilianPop = city.pop - city.militaryPop;
    city.troops = city.militaryPop; 

    city.gold = Math.floor(city.civilianPop * (Math.random() * 2 + 1)); 
    city.food = Math.floor(city.pop * (Math.random() * 3 + 2)); 
}

function updateCityEconomies(cities) {
	
	// ---> ADD THIS HOOK <---
    let factionCityCounts = typeof getFactionCityCounts === 'function' ? getFactionCityCounts(cities) : {};
	
    cities.forEach(city => {
		
		// ---> ADD THIS HOOK <---
        let mods = typeof applyFactionModifiers === 'function' ? applyFactionModifiers(city, factionCityCounts) : { draftMultiplier: 1, upkeepMultiplier: 1 };


let foodProduced = city.pop * 0.08; // example value
let foodConsumed = city.pop * 0.05;
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
        let militaryUpkeep = (city.militaryPop * 0.02) * mods.upkeepMultiplier; 
        city.gold += Math.floor(taxRevenue - militaryUpkeep);
 

        let maxFood = city.pop * 10;
        let maxGold = city.pop * 5;
        if (city.food > maxFood) city.food = maxFood;
        if (city.gold > maxGold) city.gold = maxGold;
		
      // ---> MODIFY THIS LINE (Apply Underdog draft buff) <---
        let targetGarrison = Math.floor(city.pop * city.conscriptionRate) * mods.draftMultiplier;
		
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


function getEnemyCity(originCity, citiesArr) {
    // ---> SURGICAL REPLACEMENT <---
    let enemies = citiesArr.filter(c => isHostile(originCity.faction, c.faction) && c.faction !== "Bandits");
    
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


function spawnNPCFromCity(city, role, citiesArr) {
if (globalNPCs.length >= MAX_GLOBAL_NPCS) return; // ENFORCE CAP
// 1. FIX: Removed the floating 'id:' line. 
    // 2. FIX: Properly declare targetX and targetY with 'let' so they exist safely.
    let target = null; 
    let targetX = city.x; 
    let targetY = city.y;
    let speed = 0.5, count = 0;
    let carriedGold = 0, carriedFood = 0;
    let travelDist = 0;




    if (role === "Civilian") {
        count = Math.min(Math.floor(Math.random() * 12) + 5, city.civilianPop);
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
        if (city.civilianPop < count * 1 || city.food < 100) return;

        speed = 0.5;
        target = getRandomTargetCity(citiesArr, city);
        travelDist = Math.hypot(target.x - city.x, target.y - city.y);

        // Define how much each unit can carry
        const capacityPerUnit = 25; 
        const maxCapacity = count * capacityPerUnit;

        // Calculate potential loads
        let potentialFood = Math.floor(city.food * 0.03);
        let potentialGold = Math.floor(city.gold * 0.05);

        // Apply carrying capacity (Prioritize food, then fill remaining space with gold)
        carriedFood = Math.min(maxCapacity * 0.6, potentialFood, 200); 
        carriedGold = Math.min(maxCapacity - carriedFood, potentialGold, 150);

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
// Generates <150 ish troops, capped by the city's actual military population
    count = Math.min(Math.floor(Math.random() * 50) + 100, city.militaryPop);
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

if (role === "Commerce" || role === "Civilian") {
        targetCity = getRandomTargetCity(cities, city);
if (!targetCity) return;}

    globalNPCs.push({
        id: Math.random().toString(36).substr(2, 9), 
        role: role, 
        count: count,
		roster: generateNPCRoster(role, count, city.faction), // <--- ADD THIS LINE
        faction: city.faction, 
        color: city.color, 
        originCity: city, 
        targetCity: target,
        travelDist: travelDist, 
  // Scatter them slightly around the city center
        x: city.x + (Math.random() - 0.5) * 300, 
        y: city.y + (Math.random() - 0.5) * 300,
        targetX: targetX, 
        targetY: targetY, 
        speed: speed,
        anim: Math.floor(Math.random() * 100), 
        isMoving: true, 
        waitTimer: 0,
        battlingTimer: 0,   
        battleTarget: null, 
        gold: carriedGold, 
        food: carriedFood,
		// --- ADD THIS LINE (around line 250-260) ---
decisionTimer: 0
    });
}

// --- SURGERY: FIXED spawnBandit Scope ---
function spawnBandit(padX, padY) {
	if (globalNPCs.length >= MAX_GLOBAL_NPCS) return; // ENFORCE CAP
    let coords = getRandomLandCoordinate(padX, padY);
    let banditCount = Math.floor(Math.random() * 16) + 3; // Define locally first
    
    globalNPCs.push({
        id: Math.random().toString(36).substr(2, 9),
        role: "Bandit",
        count: banditCount,
        roster: generateNPCRoster("Bandit", banditCount, "Bandits"), // Use the local variable
        faction: "Bandits",
        color: FACTIONS["Bandits"].color,
// ... rest of object
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
        food: 30,
		// --- ADD THIS LINE (around line 250-260) ---
decisionTimer: 0
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
            // OPTIMIZED: Lowered spawn chance from 0.3 to 0.15
            if (Math.random() < 0.15) spawnNPCFromCity(city, "Commerce", cities);
            if (Math.random() < 0.15) spawnNPCFromCity(city, "Civilian", cities);
            if (Math.random() < 0.15) spawnNPCFromCity(city, "Patrol", cities);
        }
    });

    let banditCount = cities.length * 2; 
    for(let i=0; i<banditCount; i++) {
        spawnBandit(padX, padY);
    }
    console.log(`Successfully deployed ${globalNPCs.length} dynamic NPCs across the map.`);
}

function updateNPCs(cities) {
	
    globalNPCs = globalNPCs.filter(npc => npc.count > 0);

for (let i = 0; i < globalNPCs.length; i++) {
			
			
	let npc = globalNPCs[i];
	
	// FAIL-SAFE: If for some reason it's undefined, initialize it now
    if (npc.decisionTimer === undefined) npc.decisionTimer = 0;

// --- SURGERY: DECISION LOCK ---
        // Stop the "vibrating" hesitation by forcing NPCs to commit to a path
// --- SURGERY: DECISION LOCK ---
// Stop the "vibrating" hesitation by forcing NPCs to commit to a path
if (npc.decisionTimer > 0) {
    npc.decisionTimer--;
} 
// REMOVED THE 'else {' AND THE RESET FROM HERE!

// --- 3. AGGRO & EVASION RADAR ---
            // --- 3. AGGRO & EVASION RADAR ---
            let bestTarget = null;
            let bestTargetScore = -Infinity;   
            let closestScaryEnemy = null;      
            let minScaryDist = 300;
			
// --- FIXED: PROPER NORMALIZED SEPARATION (REVISED) ---
for (let j = i + 1; j < globalNPCs.length; j++) {
    let other = globalNPCs[j];
    let dx = npc.x - other.x;
    let dy = npc.y - other.y;
    let distSq = dx * dx + dy * dy;

    // Radius of 15px (distSq < 225)
    if (distSq < 225) { 
        let dist = Math.sqrt(distSq);
        
        // SAFETY: If they are EXACTLY on top of each other, dist is 0. 
        // We must give them a random nudge to prevent 'NaN' errors.
        if (dist === 0) {
            npc.x += Math.random() - 0.5;
            npc.y += Math.random() - 0.5;
            continue;
        }

        let nx = dx / dist; 
        let ny = dy / dist; 
        let overlap = 15 - dist;
        let forceMod = 0.03; // Default push force

        if (npc.isSieging || other.isSieging) {
            forceMod = 0.0; // Sieging units stay anchored
        } else if (npc.faction === other.faction) {
            // Check for non-combatants
            if (npc.role === "Commerce" || npc.role === "Civilian" || other.role === "Commerce" || other.role === "Civilian") {
                // CHANGE: Use 0.01 instead of 0.0. 
                // This allows them to slowly "ooze" apart rather than getting stuck.
                forceMod = 0.01; 
            } else {
                forceMod = 0.005; 
            }
        } else if (npc.waitTimer > 0 || other.waitTimer > 0) {
            forceMod = 0.01; 
        }

        let push = overlap * forceMod;
        npc.x += nx * push;
        npc.y += ny * push;
        other.x -= nx * push;
        other.y -= ny * push;
    }
}

	// Check Player Collision
	let distToPlayer = Math.hypot(npc.x - player.x, npc.y - player.y);
	const now = Date.now();

	// ---> SURGERY: DIPLOMACY INTERCEPTION (Allow all NPCs) <---

	if (
				distToPlayer < 20 &&
				(typeof inParleMode === 'undefined' || !inParleMode) && // <--- FAIL-SAFE CHECK
				(typeof inCityMode === 'undefined' || !inCityMode) &&
				(typeof inBattleMode === 'undefined' || !inBattleMode) &&
				(now - lastBattleTime > BATTLE_COOLDOWN) 
			) {
				// ... initiates diplomacy ...
		// Grab the tile the player is standing on so we can pass it to the diplomacy screen
		let tx = Math.floor(npc.x / tSize);
		let ty = Math.floor(npc.y / tSize);
		let currentTile = (worldMapRef && worldMapRef[tx] && worldMapRef[tx][ty]) ? worldMapRef[tx][ty] : {name: "Plains"}; 

		// NEW DIPLOMACY INITIATION
		if (typeof initiateParleWithNPC === 'function') {
			initiateParleWithNPC(npc, currentTile); // Pass the captured tile for battlefield texturing
		} else {
			console.warn("initiateParleWithNPC function from diplomacy_system.js not found! Jumping directly to battlefield.");
			enterBattlefield(npc, player, currentTile); // Fallback logic
		}
	}


			// --- 1. COMBAT SEQUENCE (SURGERY: Trickling Troops & Faster Battles) ---
			if (npc.battlingTimer > 0) {
				npc.battlingTimer--;
				npc.isMoving = false;

				if (npc.battleTarget && npc.battleTarget.count > 0) {
					// Trickle down troops periodically during the battle (every 10 ticks)
				// --- SURGERY: Keep Roster in sync with Count during Auto-Combat ---
				if (npc.battlingTimer % 10 === 0) {
					let other = npc.battleTarget;
					let dmgToOther = Math.max(1, Math.floor(npc.count * (Math.random() * 0.05 + 0.01)));
					let dmgToNpc = Math.max(1, Math.floor(other.count * (Math.random() * 0.05 + 0.01)));

					npc.count -= dmgToNpc;
					other.count -= dmgToOther;
					
	// OPTIMIZED O(1) ARRAY REMOVAL: Swap-and-pop avoids re-indexing massive arrays
					if (npc.roster) {
						for (let k = 0; k < dmgToNpc && npc.roster.length > 0; k++) {
							let idx = Math.floor(Math.random() * npc.roster.length);
							npc.roster[idx] = npc.roster[npc.roster.length - 1];
							npc.roster.pop();
						}
					}
					if (other.roster) {
						for (let k = 0; k < dmgToOther && other.roster.length > 0; k++) {
							let idx = Math.floor(Math.random() * other.roster.length);
							other.roster[idx] = other.roster[other.roster.length - 1];
							other.roster.pop();
						}
					}

	// --- SURGERY: POST-BATTLE REBOUND ---
	if (npc.count <= 0 || other.count <= 0) {
		let survivor = npc.count > 0 ? npc : other;
		let loser = npc.count <= 0 ? npc : other;

		// --- SURGERY: CAPPED LOOTING ---
		let maxCapacity = survivor.count * NPC_CARRY_CAPACITY_PER_UNIT;
		let currentWeight = survivor.gold + survivor.food;
		let roomLeft = Math.max(0, maxCapacity - currentWeight);

		if (roomLeft > 0) {
			// Simple proportional looting if they can't take everything
			let totalLoot = loser.gold + loser.food;
			if (totalLoot <= roomLeft) {
				survivor.gold += loser.gold;
				survivor.food += loser.food;
			} else {
				let ratio = roomLeft / totalLoot;
				survivor.gold += Math.floor(loser.gold * ratio);
				survivor.food += Math.floor(loser.food * ratio);
			}
		}

		// REBOUND: "Kick" the survivor away so they don't stay on the corpse
		let angle = Math.random() * Math.PI * 2;
		survivor.x += Math.cos(angle) * 20; 
		survivor.y += Math.sin(angle) * 20;
		
		survivor.waitTimer = 0; // Set to 0 so they move IMMEDIATELY
		survivor.isMoving = true;
		survivor.speed = 0.8; // Brief burst of speed away from the site
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

 
		for (let j = 0; j < globalNPCs.length; j++) {
				if (i === j) continue;
				let other = globalNPCs[j];

				// ULTRA-FAST CULLING: 1D checks first, then Math.abs, then squared distance.
				let dx = npc.x - other.x;
				if (Math.abs(dx) > 400) continue; 
				
				let dy = npc.y - other.y;
				if (Math.abs(dy) > 400) continue;

				let distSq = dx * dx + dy * dy;
				if (distSq > 160000) continue; // 400 squared. True circular boundary.

				// Only call the external function if they are confirmed close
	if (other.count > 0 && isHostile(npc.faction, other.faction)) 
	{
			let dist = Math.sqrt(distSq); // Cheaper than hypot

			// A. INITIATE COMBAT
			if (dist < 25 && !npc.battleTarget && !other.battleTarget && npc.battlingTimer === 0 && other.battlingTimer === 0) {
				if (Math.random() > 0.1) {
					if (npc.count < other.count * 0.6) {
						let repelAngle = Math.atan2(npc.y - other.y, npc.x - other.x);
						npc.targetX = npc.x + Math.cos(repelAngle) * 60;
						npc.targetY = npc.y + Math.sin(repelAngle) * 60;
						npc.waitTimer = 0;
					}
					continue;
				}

				npc.battlingTimer = 90;
				other.battlingTimer = 90;
				npc.battleTarget = other;
				other.battleTarget = npc;
				npc.waitTimer = 0;
				other.waitTimer = 0;
				break;
			}
	// B. TRACK FOR CHASE / FLEE 
		let isWeak = (other.role === "Civilian" || other.role === "Commerce");
		let isBandit = (other.role === "Bandit");
	 
		if (npc.isSieging) {
			if (dist > 25) continue;
		}

		let isScary = (other.role === "Military" || other.role === "Patrol");
		
		// FIX: Define isEnemy clearly so the logic doesn't break
		let isTargetableEnemy = isHostile(npc.faction, other.faction);

		// If the target is sieging, only Military units are "brave" enough to be the aggressor
		if (other.isSieging && npc.role !== "Military") {
			isTargetableEnemy = false; 
		}

		if (npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") {
			if (dist < 400 && isTargetableEnemy) { // Only score if they are actually targetable
				let score = -dist;
				if (npc.role === "Bandit") {
					if (isWeak) score += 500;
					if (isScary) score -= 1000;
				} else if (npc.role === "Military") {
					if (isScary) score += 1000;
					else score -= 5000;
				} else if (npc.role === "Patrol") {
					if (isScary) score += 800;
					if (isBandit) score += 150;
					if (isWeak) score -= 1000;
				}

				if (score > bestTargetScore) {
					bestTargetScore = score;
					bestTarget = other;
				}
			}
		} else if (npc.role === "Civilian" || npc.role === "Commerce") {
			// Civilians only care about Scary units that are actually Hostile
			let isEnemyScary = isScary && isHostile(npc.faction, other.faction); 
			
			if (isEnemyScary && dist < minScaryDist) {
				minScaryDist = dist;
				closestScaryEnemy = other;
			}
		}
	}

	// Don't let sieging armies break off to chase the player
	if (typeof player !== 'undefined' && (npc.role === "Military" || npc.role === "Patrol" || npc.role === "Bandit") && !npc.isSieging) {
		let isPlayerEnemy = (npc.faction === "Bandits") || (player.enemies && player.enemies.includes(npc.faction));

				if (isPlayerEnemy && npc.role === "Patrol") {
					let playerTroopCount = player.troops || 0;
					// If the player has equal or more troops, the patrol turns a blind eye
					if (playerTroopCount >= npc.count) {
						isPlayerEnemy = false; 
					}
				}

					 if (isPlayerEnemy) 
					 {
					// NEW: If player is sieging, only Military units care. Bandits and Patrols walk right past.
					if (player.isSieging && npc.role !== "Military") {
						// Do nothing. They ignore you.
					} else {
						let distToPlayer = Math.hypot(npc.x - player.x, npc.y - player.y);
					
					if (distToPlayer < 100) { // Armies can spot you from a short distance
						let playerScore = -distToPlayer + 3000; // MASSIVE priority
						
						if (playerScore > bestTargetScore) {
							bestTargetScore = playerScore;
							// Mock up a target object so the movement logic can read its coordinates and role
							bestTarget = { x: player.x, y: player.y, role: "Player", isPlayer: true };
								}
							}
						}
					}

// --- 4. FLIGHT OR FIGHT LOGIC ---
			if (!npc.battleTarget) {
				
				// Keep your Hunger/Survival check exactly as it was
				if (npc.food < 20 && npc.role !== "Commerce" && npc.role !== "Civilian") {
					bestTarget = null; 
					
					if (!npc.targetCity || (npc.faction !== "Bandits" && npc.targetCity.faction !== npc.faction)) {
						let potentialCities = npc.faction === "Bandits" ? cities : cities.filter(c => c.faction === npc.faction);
						if (potentialCities.length > 0) {
							potentialCities.sort((a,b) => Math.hypot(npc.x-a.x, npc.y-a.y) - Math.hypot(npc.x-b.x, npc.y-b.y));
							npc.targetCity = potentialCities[0]; 
						}
					}
				}

				// Only recalculate Chase/Flee if the decision timer has cooled down
	// Only recalculate Chase/Flee if the decision timer has cooled down
if (npc.decisionTimer <= 0) {
    npc.decisionTimer = 100; // <--- ADDED THE RESET HERE INSTEAD
    
    // A. REVISED AGGRO LOGIC (Military/Bandit/Patrol)
					// A. REVISED AGGRO LOGIC (Military/Bandit/Patrol)
					if ((npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") && bestTarget) {
						let isWorthDiverting = (bestTarget.role === "Military" || bestTarget.role === "Patrol" || bestTarget.isPlayer);
						
						if (npc.role === "Patrol" && bestTarget.role === "Bandit") isWorthDiverting = true; 
						if (npc.role === "Bandit") isWorthDiverting = true; 
						
						let targetDist = Math.hypot(npc.x - bestTarget.x, npc.y - bestTarget.y);
						
						if (isWorthDiverting || targetDist < 50) { 
							npc.targetX = bestTarget.x;
							npc.targetY = bestTarget.y;
							npc.waitTimer = 0; 
							npc.speed = 1.2; 
							npc.decisionTimer = 20; // Commit to this chase for 20 frames
						}
					} 
					// B. FLEEING LOGIC (Civilian/Commerce)
					else if ((npc.role === "Civilian" || npc.role === "Commerce") && closestScaryEnemy) {
						let dx = npc.x - closestScaryEnemy.x;
						let dy = npc.y - closestScaryEnemy.y;
						let distToScary = Math.hypot(dx, dy) || 1;
						
						// Run away decisively
						npc.targetX = npc.x + (dx / distToScary) * 150; 
						npc.targetY = npc.y + (dy / distToScary) * 150;
						npc.waitTimer = 0;
						npc.speed = 1.2; 
						npc.decisionTimer = 40; // Commit to fleeing for 40 frames (stops the jitter)
					} 
					// C. NORMAL PATHING (Return to target)
					else {
						if (npc.targetCity) {
							npc.targetX = npc.targetCity.x;
							npc.targetY = npc.targetCity.y;
						}
						// Restore your baseline speeds
	if (npc.role === "Civilian") npc.speed = 0.49;
    else if (npc.role === "Commerce") npc.speed = 0.5;
    else if (npc.role === "Military") npc.speed = 0.3;
    else if (npc.role === "Bandit") npc.speed = 0.5;
    else if (npc.role === "Patrol") npc.speed = 0.5;
					}
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
				let tc = npc.targetCity;
				
				if (dist < 10) { 
					npc.isMoving = false;
					
					// ONLY run city interactions if there actually is a target city
					if (tc) {
						npc.x = tc.x + (Math.random() - 0.5) * 40;
						npc.y = tc.y + (Math.random() - 0.5) * 40;
						
					   // --- SCENARIO A: HOSTILE ARMY (SIEGE) ---
						if ((npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") && npc.faction !== tc.faction) {
							if (typeof initiateSiege === 'function') {
								if (!npc.isSieging) initiateSiege(npc, tc);
								npc.waitTimer = 100; // Anchor both attackers and late reinforcements
							} else {
								// Only apply instant damage if the siege_system.js fails to load
								npc.waitTimer = 100;
								let currentSiegeDamage = (typeof siegeDamage !== 'undefined') ? siegeDamage : Math.floor(npc.count * 0.1) + 10;
								tc.pop -= currentSiegeDamage;
							}//////////////////

							if (tc.militaryPop <= 0) {
								tc.faction = npc.faction; 
								tc.color = npc.color;
								tc.militaryPop = Math.max(10, Math.floor(npc.count * 0.5)); 
								tc.troops = tc.militaryPop; 
								tc.pop += tc.militaryPop;
								npc.count -= tc.militaryPop; 
								npc.targetCity = null; 
							}
							// Notice: The premature `continue;` was removed so the logic above actually runs!
						}
						// --- SCENARIO B: FRIENDLY ARMY (RESUPPLY & REINFORCE) ---
						else if ((npc.role === "Military" || npc.role === "Patrol" || npc.role === "Bandit") && npc.faction === tc.faction) {
							
							// Resupply & Trade Mechanic
							let foodNeeded = (npc.count * 10) - npc.food;
							let foodToTake = Math.min(foodNeeded, tc.food);
							
							if (foodToTake > 0) {
								tc.food -= foodToTake;
								npc.food += foodToTake;
								
								// Pay for the food if they have gold
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
								tc.militaryPop += absorb; 
								tc.pop += absorb; 
								tc.troops = tc.militaryPop;
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
						// --- SCENARIO C: COMMERCE ---
						else if (npc.role === "Commerce") {
							let profit = Math.floor(npc.travelDist * 0.02) + npc.gold;
							tc.gold += profit; 
							tc.food += npc.food; 
							npc.gold = 0; 
							npc.food = 0; 
							
							npc.targetCity = npc.originCity; 
							if (npc.targetCity) { // Ensure originCity actually exists
								npc.targetX = npc.targetCity.x; 
								npc.targetY = npc.targetCity.y;
							}
							npc.waitTimer = Math.floor(Math.random() * 100) + 50;
						}
						// --- SCENARIO D: CIVILIAN ---
						else if (npc.role === "Civilian") {
							tc.civilianPop += npc.count; 
							tc.pop += npc.count;
							tc.gold += npc.gold; 
							tc.food += npc.food;
							npc.count = 0; 
						}
					} 
					// IF NO TARGET CITY (e.g. wanderers reaching a random wilderness waypoint)
					else {
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
					
	/* --- REVISE THIS SECTION IN updateNPCs --- */
	// 2. Fetch tile data (falling back to a neutral 1.0 multiplier if off-map)
	let currentTile = (worldMapRef && worldMapRef[tx] && worldMapRef[tx][ty])
		? worldMapRef[tx][ty]
		: { speed: 1.0 };

	// 3. Calculate move step: (Role Base Speed) * (Terrain Modifier)
	let terrainMod = currentTile.speed !== undefined ? currentTile.speed : 1.6;

	// FIX: Added a Math.min hard cap. No matter what, an NPC can NEVER move 
	// more than 1 pixels per frame, completely eliminating teleportation.
	let moveStep = Math.min(npc.speed * terrainMod, 1); 

	// 4. Apply movement (CRITICAL FIX: Prevent division by zero if overlapping exactly)
	if (dist > 0) {
		npc.x += (dx / dist) * moveStep;
		npc.y += (dy / dist) * moveStep;
	}
					npc.isMoving = true;
					
					// 5. Sync animation speed to the terrain (slows legs/sails in mud/snow)
					npc.anim += moveStep * 1.5; 
				}
			}
		}

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
       let dx = npc.x - player.x;
let dy = npc.y - player.y;
let distSq = dx * dx + dy * dy;
        return distSq <= SPOTTING_RANGE_SQ;
    });

    // --- PASS 1: DRAW SPRITES ---
    visibleNPCs.forEach(npc => {
        let tx = Math.floor(npc.x / TILE_SIZE); 
        let ty = Math.floor(npc.y / TILE_SIZE);
        let tile = (worldMap[tx] && worldMap[tx][ty]) ? worldMap[tx][ty] : null;
        let useBoat = !tile || ["Coastal", "River", "Ocean", "Sea", "Deep Ocean"].includes(tile.name);

		if (useBoat) {
            // NOW PASSING npc.color!
            drawShipFunc(npc.x, npc.y, npc.isMoving, npc.anim, npc.color);
        } else {
            drawCaravanFunc(npc.x, npc.y, npc.isMoving, npc.anim, npc.color); 
        }
    });

// --- PASS 2: NAMES AND ROLES ---
    let nameFontSize = Math.max(10, 16 / zoom);
    // Use a fallback font for emojis to ensure they render cleanly alongside Georgia
    ctx.font = `bold ${nameFontSize}px Georgia, "Segoe UI Emoji", Arial`;
    ctx.textAlign = "center";

    visibleNPCs.forEach(npc => {
        // Determine state and assign the appropriate icon
        let statusIcon = "";
        if (npc.battlingTimer > 0) {
            statusIcon = " ⚔️"; // NPC vs NPC Land Battle
        } else if (npc.isSieging) {
            statusIcon = " ⛺"; // Sieging a Settlement (Feel free to change to 🔥 or 🏰)
        }

        let displayText = npc.role + statusIcon;

        // Draw shadow/outline
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillText(displayText, npc.x + 1, npc.y - 24); 
        // Draw main text
        ctx.fillStyle = npc.color;
        ctx.fillText(displayText, npc.x, npc.y - 25);
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