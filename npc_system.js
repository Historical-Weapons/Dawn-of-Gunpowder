const FACTIONS = {
    // 1. THE HEARTLAND: Central China (Nudged North to clear the South)
    "Hong Dynasty":          { color: "#d32f2f", geoWeight: { north: 0.50, south: 0.50, west: 0.40, east: 0.60 } }, 

    // 2. YUNAN: Center-Left, Extreme South
    "Dab Tribes":            { color: "#00838f", geoWeight: { north: 0.01, south: 0.99, west: 0.70, east: 0.30 } }, 

    // 3. MONGOL STEPPE: Far North
    "Great Khaganate":       { color: "#1976d2", geoWeight: { north: 0.85, south: 0.15, west: 0.60, east: 0.40 } }, 

    // 4. JURCHEN FORESTS: Top-Right
    "Jinlord Confederacy":   { color: "#455a64", geoWeight: { north: 0.98, south: 0.02, west: 0.05, east: 0.95 } }, 

    // 5. VIET REALM: Center-Right, Extreme South
    "Tran Realm":            { color: "#388e3c", geoWeight: { north: 0.01, south: 0.99, west: 0.30, east: 0.70 } }, 

    // 6. GORYUN (KOREA): Mid-East
    "Goryun Kingdom":        { color: "#7b1fa2", geoWeight: { north: 0.40, south: 0.60, west: 0.05, east: 0.85 } },

    // 7. XIARAN: Desert/Silk Road (Northwest)
    "Xiaran Dominion":       { color: "#fbc02d", geoWeight: { north: 0.75, south: 0.25, west: 0.90, east: 0.10 } }, 

    // 8. TIBET: Extreme Southwest
    "High Plateau Kingdoms": { color: "#8d6e63", geoWeight: { north: 0.10, south: 0.90, west: 0.98, east: 0.02 } }, 

    // 9. YAMATO (JAPAN): Extreme East
    "Yamato Clans":          { color: "#c2185b", geoWeight: { north: 0.15, south: 0.65, west: 0.02, east: 0.98 } },
	
    // 10. BANDITS: General spread
    "Bandits":               { color: "#222222", geoWeight: { north: 0.50, south: 0.50, west: 0.50, east: 0.50 } }, 

    // 11. PLAYER: Yellow Sea Anchor
    "Player's Kingdom":      { color: "#FFFFFF", geoWeight: { north: 0.45, south: 0.45, west: 0.30, east: 0.70 } } 
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
   
   "Dab Tribes": ["Pao",
  "Vang",
  "Tou",
  "Mee",
  "Nao",
  "Chue",
  "Kou",
  "Leng",

  "Ntxa",
  "Ntsh",
  "Plig",
  "Xyoo"],
  
    "Great Khaganate": ["Or","Kar","Batu","Sar","Tem","Alt","Bor","Khan","Ur","Tol","Dar","Mur","Nog","Tog","Bal","Kher","Ulan","Tark","Sog","Yar"],
"Tran Realm": [
  "Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Dang", "Bui", "Do", 
  "Ho", "Ngo", "Phat", "Minh", "Anh", "Long", "Duc", "Kim", "Duy", "Thanh", 
  "Son", "Hai", "Linh", "Tien", "Nam"
],
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
const MAX_GARRISON = 200;          ///////////DEBUG LOW NUMBER
const BATTLE_COOLDOWN = 2000;  
const MAX_GLOBAL_NPCS = 500; // NEW: Hard cap to save CPU
// ============================================================================
// CORE HELPER FUNCTIONS
// ============================================================================

function getRandomLandCoordinate(padX = 0, padY = 0) {
    if (!worldMapRef) return { x: 500, y: 500 };
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
    return { x: 500, y: 500 };
}

function getFactionByGeography(x, y, worldWidth, worldHeight) {
    let xNorm = x / worldWidth;
    let yNorm = y / worldHeight;
    let bestFaction = "Hong Dynasty"; // Default fallback
    let bestScore = Infinity;

    for (const [factionName, data] of Object.entries(FACTIONS)) {
        // Skip non-political factions
        if (factionName === "Bandits" || factionName === "Player's Kingdom") continue;

        // Calculate Euclidean distance to the faction's "Magnetic Pole"
        let dx = xNorm - data.geoWeight.east;
        let dy = yNorm - data.geoWeight.south;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // PRECISION SURGERY: Lower noise (0.02) means factions stay 
        // strictly where they belong. 
        let noise = Math.random() * 0.02; 
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

function initializeCityData(city, worldWidth, worldHeight) {
    let controllingFaction = getFactionByGeography(city.x, city.y, worldWidth, worldHeight);
    city.recoveryTimer = 0;
    city.faction = controllingFaction;
    
    // ---> SURGERY: Permanently lock in the native culture <---
    city.originalFaction = controllingFaction; 
     
    city.color = FACTIONS[controllingFaction].color;
    city.name = generateFactionCityName(controllingFaction); 
    city.pop = Math.floor(city.pop * 1);//population factor
    
    city.conscriptionRate = 0.04 + (Math.random() * 0.08);
city.militaryPop = Math.min(MAX_GARRISON, Math.floor(city.pop * city.conscriptionRate));
    city.civilianPop = city.pop - city.militaryPop;
    city.troops = city.militaryPop; 

    city.gold = Math.floor(city.civilianPop * (Math.random() * 2 + 1)); 
    city.food = Math.floor(city.pop * (Math.random() * 3 + 2)); 
}

function updateCityEconomies(cities) {
    let factionCityCounts = typeof getFactionCityCounts === 'function'
        ? getFactionCityCounts(cities)
        : {};

    cities.forEach(city => {
        if (city.recoveryTimer === undefined) city.recoveryTimer = 0;
        if (city.conscriptionRate === undefined) city.conscriptionRate = 0.03;
        if (city.civilianPop === undefined) city.civilianPop = Math.max(0, city.pop || 0);
        if (city.militaryPop === undefined) city.militaryPop = 0;
        if (city.troops === undefined) city.troops = city.militaryPop;

        let mods = typeof applyFactionModifiers === 'function'
            ? applyFactionModifiers(city, factionCityCounts)
            : { draftMultiplier: 1, upkeepMultiplier: 1 };

        // Base food flow
        let foodProduced = city.isUnderSiege ? 0 : (city.pop * 0.07);
        let foodConsumed = city.pop * 0.058;
        city.food += Math.floor(foodProduced - foodConsumed);

        // Food spoilage
        let spoilRate = 0.01;
        let spoilAmount = Math.floor(city.food * spoilRate);

        // Extra spoil if overstocked
        if (city.food > 500) {
            spoilAmount += Math.floor((city.food - 500) * 0.05);
        }

        city.food -= spoilAmount;
		
		// --- AUTO FOOD PURCHASE LOGIC ---
		if (city.food <= 50 && city.gold > 0) {
			// Determine how much food to buy to reach 500
			let neededFood = 500 - city.food;
			// Cost per unit of food
			let foodCost = 10; // 10 gold per 1 food, emergency
			// Max we can afford
			let affordableFood = Math.min(neededFood, city.gold / foodCost);
			
			// Spend gold to buy food
			city.food += affordableFood;
			city.gold -= Math.floor(affordableFood * foodCost);
		}

        // Starvation / collapse
        if (city.food < 0) {
            let starved = Math.floor(Math.abs(city.food) * 0.4);

            // Trigger recovery after major losses
            if (starved > city.pop * 0.05) {
                city.recoveryTimer = 300;
            }

            let civilianLoss = Math.min(city.civilianPop, starved);
            let militaryLoss = Math.max(0, starved - civilianLoss);

            city.civilianPop -= civilianLoss;
            city.militaryPop = Math.max(0, city.militaryPop - militaryLoss);
            city.pop = Math.max(100, city.civilianPop + city.militaryPop);
            city.food = 0;
        } else {
            // Population growth / recovery
            let baseGrowth = city.pop * 0.003;

            // Recovery boost after siege/famine
            if (city.recoveryTimer > 0) {
                baseGrowth *= 3;
                city.recoveryTimer--;
            }

            // Extra recovery bonus when food stores are healthy
            if (!city.isUnderSiege && city.food > city.pop * 0.5 && city.recoveryTimer > 0) {
                baseGrowth += city.pop * 0.002;
            }

            let growth = Math.floor(baseGrowth);

            if (!city.isUnderSiege && city.food > city.pop * 7) {
                city.pop += growth;
                city.civilianPop += growth;
                city.food -= Math.floor(growth * 2);
            }
        }

        // Tax revenue and military upkeep
        let taxRevenue = city.civilianPop * 0.01;
        let militaryUpkeep = (city.militaryPop * 0.02) * mods.upkeepMultiplier;
        city.gold += Math.floor(taxRevenue - militaryUpkeep);

        // Caps
        let maxFood = 1000;
        let maxGold = city.pop ;

        if (city.food > maxFood) city.food = maxFood;
        if (city.gold > maxGold) city.gold = maxGold;
        if (city.food < 0) city.food = 0;
        if (city.gold < 0) city.gold = 0;

        // Underdog garrison logic
let targetGarrison = Math.min(MAX_GARRISON, Math.floor(city.pop * city.conscriptionRate * 0.9 * mods.draftMultiplier));

        if (city.militaryPop < targetGarrison) {
            let draft = Math.min(3, targetGarrison - city.militaryPop);
            if (city.civilianPop >= draft) {
                city.militaryPop += draft;
                city.civilianPop -= draft;
            }
        } else if (city.militaryPop > city.pop * 0.45) {
            let retire = 3;
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
    let speed = 0.5, count = 0; //default speed is 0.5
    let carriedGold = 0, carriedFood = 0;
    let travelDist = 0;




    if (role === "Civilian") {
        count = Math.min(Math.floor(Math.random() * 8) + 5, city.civilianPop);
        if (count < 5) return;
        speed = 0.5;
        target = getWealthyCity(citiesArr, city); 
        carriedGold = Math.floor((count / (city.civilianPop || 1)) * city.gold * 0.5);
        carriedFood = count * 2;
        city.civilianPop -= count; city.pop -= count;
        city.gold -= carriedGold; city.food -= carriedFood;
    } 
else if (role === "Commerce") {
    count = Math.floor(Math.random() * 12) + 8; 
    if (city.civilianPop < count || city.food < 100) return;

    speed = 0.5;
    target = getRandomTargetCity(citiesArr, city);
    travelDist = Math.hypot(target.x - city.x, target.y - city.y);

    const capacityPerUnit = 25; 
    const maxCapacity = count * capacityPerUnit;

    let potentialFood = Math.floor(city.food * 0.03);
    let potentialGold = Math.floor(city.gold * 0.05);

    carriedFood = Math.min(maxCapacity * 0.6, potentialFood, 200); 
    carriedGold = Math.min(maxCapacity - carriedFood, potentialGold, 150);

    city.civilianPop -= count;
    city.pop -= count;
    city.food -= carriedFood;
    city.gold -= carriedGold;
}
else if (role === "Patrol") {
    count = Math.min(Math.floor(Math.random() * 20) + 10, city.militaryPop);
    if (count < 10) return;
    speed = 0.5;
    targetX = city.x + (Math.random() - 0.5) * 800;
    targetY = city.y + (Math.random() - 0.5) * 800;
    carriedFood = count * 5;

    city.militaryPop -= count;
    city.pop -= count;
    city.food -= carriedFood;
} 
    else if (role === "Military") {
 
    count = Math.min(Math.floor(Math.random() * 180) + 20, city.militaryPop);
    if (count < 20) return;     //military number count
    speed = 0.5;
        target = getEnemyCity(city, citiesArr);
        if (!target) target = getRandomTargetCity(citiesArr, city, city.faction);
        
        carriedFood = count * 10;
        city.militaryPop -= count; city.pop -= count;
        city.food -= carriedFood;
    }

if (target) { targetX = target.x; targetY = target.y; }
        city.troops = city.militaryPop; 

		// Inside spawnNPCFromCity for Civilian/Commerce
		if (role === "Commerce" || role === "Civilian") {
			target = target || getRandomTargetCity(citiesArr, city);
			if (!target) return;
			// CRITICAL: Sync these immediately
			targetX = target.x;
			targetY = target.y;
		}

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
        x: city.x + (Math.random() - 0.5) * 30, 
        y: city.y + (Math.random() - 0.5) * 30,
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
    
 
    let banditCount = (Math.floor(Math.random() * 10) + 3) ;
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
        speed: 0.4, 
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

// 1. First, set up initial data for all cities
    cities.forEach(city => {
        initializeCityData(city, maxCols * tSize, maxRows * tSize);
    });

    // 2. RUN THE GUARANTEE LOOP HERE
    // This fixes any "empty" factions before NPCs are created
    ensureAllFactionsSpawned(cities);

    // 3. Now spawn NPCs (they will now use the corrected faction data)
    cities.forEach(city => {
        let activityLevel = Math.floor(city.pop / 1500) + 1; 
        for(let i=0; i < activityLevel; i++) {
            if (Math.random() < 0.15) spawnNPCFromCity(city, "Commerce", cities);
            if (Math.random() < 0.15) spawnNPCFromCity(city, "Civilian", cities);
            if (Math.random() < 0.15) spawnNPCFromCity(city, "Patrol", cities);
        }
    });

// Inside initializeNPCs function
let banditCount = Math.min(10, cities.length * 2);//<<<<<<<<<<<<<<<<<<<<10 bandits only for debugging
    for(let i=0; i<banditCount; i++) {
        spawnBandit(padX, padY);
    }
    console.log(`Successfully deployed ${globalNPCs.length} dynamic NPCs across the map.`);
}

 

function updateNPCs(cities) {
    // Clean up dead units first
// --- FIX: CLEAN UP DEAD UNITS & UNSTUCK SURVIVORS ---
    globalNPCs = globalNPCs.filter(npc => {
        if (npc.count <= 0) {
            // If this unit is dying, make sure anyone targeting it gets released
            globalNPCs.forEach(other => {
                if (other.battleTarget === npc) {
                    other.battleTarget = null;
                    other.battlingTimer = 0;
                    other.waitTimer = 30; // Brief pause before resuming patrol
                }
            });
            return false;
        }
        return true;
    });

    for (let i = 0; i < globalNPCs.length; i++) {
        let npc = globalNPCs[i];
        if (npc.decisionTimer === undefined) npc.decisionTimer = 0;
        if (npc.decisionTimer > 0) npc.decisionTimer--;

        // --- BUG FIX 1: GHOST TARGET & ANTI-FREEZE FAILSAFE ---
        // Applies universally to Military, Patrol, Bandits, etc.
        if (npc.battleTarget) {
            if (!globalNPCs.includes(npc.battleTarget) || npc.battleTarget.count <= 0) {
                npc.battleTarget = null;
                npc.battlingTimer = 0;
                npc.waitTimer = 30; 
                npc.isMoving = true; 
                // Kickstart a new waypoint so they don't sit idle forever
                npc.targetX = npc.x + (Math.random() - 0.5) * 300;
                npc.targetY = npc.y + (Math.random() - 0.5) * 300;
                npc.decisionTimer = 0; // Force immediate brain update
            }
        }
        // --- END FIX 1 ---

        let bestTarget = null;
        let bestTargetScore = -Infinity;   
        let closestScaryEnemy = null;      
        let minScaryDistSq = 90000; // 300 squared
        
        // ==========================================================
        // SINGLE PASS OPTIMIZED LOOP (Collision & Radar in one)
        // ==========================================================
        for (let j = 0; j < globalNPCs.length; j++) {
            if (i === j) continue;
            let other = globalNPCs[j];
            if (other.count <= 0) continue;

            let dx = npc.x - other.x;
            let dy = npc.y - other.y;
            
            // Fast 1D Culling: Skip expensive math entirely if they are further than 400px
            if (Math.abs(dx) > 400 || Math.abs(dy) > 400) continue;

            let distSq = dx * dx + dy * dy;

            // --- 1. COLLISION CHECK (Only run once per pair: i < j) ---
            if (i < j && distSq < 225) { 
                let dist = Math.sqrt(distSq);
                if (dist === 0) {
                    npc.x += Math.random() - 0.5; npc.y += Math.random() - 0.5;
                    continue;
                }

                let nx = dx / dist, ny = dy / dist; 
                let overlap = 15 - dist;
                
                let forceMod = (npc.isSieging || other.isSieging) ? 0.0 :
                               (npc.role === "Commerce" || npc.role === "Civilian" || other.role === "Commerce" || other.role === "Civilian") ? 0.01 : 0.005;
                if (npc.waitTimer > 0 || other.waitTimer > 0) forceMod = 0.01;

                let push = overlap * forceMod;
                npc.x += nx * push; npc.y += ny * push;
                other.x -= nx * push; other.y -= ny * push;
            }

            // --- 2. RADAR CHECK ---
            if (distSq > 160000) continue; // Skip if > 400px away
            
            // Cache the hostility check (Massive CPU saver)
            let areEnemies = typeof isHostile === 'function' && isHostile(npc.faction, other.faction);

            if (areEnemies) {
                // --- REVISED A. INITIATE COMBAT (FIXED) ---
                 if (distSq < 625 && !npc.battleTarget && !other.battleTarget && 
                    npc.battlingTimer === 0 && other.battlingTimer === 0 && 
                    npc.waitTimer === 0 && other.waitTimer === 0) {

                    // 1. DETERMINE AGGRESSION
                    let isOutnumbered = npc.count < other.count * 0.6;
                    let roll = Math.random();

                    // 2. FLEE OR IGNORE LOGIC
                    if (roll > 0.4 || isOutnumbered) {
                        if (isOutnumbered) {
                            // Run away from the enemy coordinate
                            let repelAngle = Math.atan2(npc.y - other.y, npc.x - other.x);
                            npc.targetX = npc.x + Math.cos(repelAngle) * 200; // Increased distance
                            npc.targetY = npc.y + Math.sin(repelAngle) * 200;
                            npc.targetCity = null; // Forget current destination to prioritize survival
                            npc.isMoving = true;
                            npc.waitTimer = 0; 
                            npc.decisionTimer = 100; // Lock this flee-path for 100 frames
                        }
                        // If they are just "ignoring" each other, they need a small push to stop the collision
                        else {
                             npc.waitTimer = 5; // Tiny pause to desync movement
                        }
                        continue; // Skip combat for this pair this frame
                    }
                    
                    // 3. ENGAGE IN COMBAT
                    npc.battlingTimer = 90; 
                    other.battlingTimer = 90;
                    npc.battleTarget = other; 
                    other.battleTarget = npc;
                    
                    // Stop both units dead in their tracks to fight
                    npc.waitTimer = 0; 
                    other.waitTimer = 0;
                    npc.isMoving = false;
                    other.isMoving = false;
                    
                    break; 
                }

                // B. CHASE / FLEE TRACKING
                if (npc.decisionTimer <= 0 && !npc.isSieging) {
                    let isScary = (other.role === "Military" || other.role === "Patrol");
                    let isTargetableEnemy = !(other.isSieging && npc.role !== "Military");

                    if (npc.role === "Bandit" && isTargetableEnemy) {
                        if (other.role === "Commerce") {
                            let score = -distSq + 55000000; 
                            if (score > bestTargetScore) { bestTargetScore = score; bestTarget = other; }
                        } else if (distSq < minScaryDistSq) {
                            minScaryDistSq = distSq; closestScaryEnemy = other;
                        }
                    } 
                    else if ((npc.role === "Military" || npc.role === "Patrol") && isTargetableEnemy) {
                        let score = -distSq;
                        if (npc.role === "Military") score += isScary ? 1000000 : -5000000;
                        else if (npc.role === "Patrol") {
                            if (isScary) score += 800000;
                            if (other.role === "Bandit") score += 150000;
                            if (other.role === "Civilian" || other.role === "Commerce") score -= 1000000;
                        }
                        if (score > bestTargetScore) { bestTargetScore = score; bestTarget = other; }
                    } 
                    else if ((npc.role === "Civilian" || npc.role === "Commerce") && isScary) {
                        if (distSq < minScaryDistSq) { minScaryDistSq = distSq; closestScaryEnemy = other; }
                    }
                }
            }
        } // End Inner j-loop

        // ==========================================================
        // POST-RADAR LOGIC & COMBAT EXECUTION
        // ==========================================================
        
        // Player Diplomacy Interception
        if (typeof player !== 'undefined') {
            let dxPlayer = npc.x - player.x, dyPlayer = npc.y - player.y;
            let distSqToPlayer = dxPlayer * dxPlayer + dyPlayer * dyPlayer;
            const now = Date.now();

            if (distSqToPlayer < 400 && // 20px radius
                (typeof inParleMode === 'undefined' || !inParleMode) && 
                (typeof inCityMode === 'undefined' || !inCityMode) && 
                (typeof inBattleMode === 'undefined' || !inBattleMode) &&
                (typeof BATTLE_COOLDOWN !== 'undefined' && now - (typeof lastBattleTime !== 'undefined' ? lastBattleTime : 0) > BATTLE_COOLDOWN)) 
            {
                let tx = Math.floor(npc.x / tSize), ty = Math.floor(npc.y / tSize);
                let currentTile = (worldMapRef && worldMapRef[tx] && worldMapRef[tx][ty]) ? worldMapRef[tx][ty] : {name: "Plains"}; 
                if (typeof initiateParleWithNPC === 'function') initiateParleWithNPC(npc, currentTile);
                else if (typeof enterBattlefield === 'function') enterBattlefield(npc, player, currentTile);
            }

            // Player Tracking for AI
            if (!npc.isSieging && npc.role !== "Civilian" && npc.role !== "Commerce") {
                let disableAICombatEnemy = (npc.faction === "Bandits") || (player.enemies && player.enemies.includes(npc.faction));
                if (disableAICombatEnemy && npc.role === "Patrol" && (player.troops || 0) >= npc.count) disableAICombatEnemy = false;
                
                if (disableAICombatEnemy && !(player.isSieging && npc.role !== "Military") && distSqToPlayer < 10000) {
                    let playerScore = -distSqToPlayer + 90000000;
                    if (playerScore > bestTargetScore) {
                        bestTargetScore = playerScore;
                        bestTarget = { x: player.x, y: player.y, role: "Player", disableAICombat: true };
                    }
                }
            }
        }

        // --- 1. COMBAT SEQUENCE ---
        if (npc.battlingTimer > 0) {
            npc.battlingTimer--;
            npc.isMoving = false;

            if (npc.battleTarget && npc.battleTarget.count > 0) {
                if (npc.battlingTimer % 10 === 0) {
                    let other = npc.battleTarget;
                    let dmgToOther = Math.max(1, Math.floor(npc.count * (Math.random() * 0.05 + 0.01)));
                    let dmgToNpc = Math.max(1, Math.floor(other.count * (Math.random() * 0.05 + 0.01)));

                    npc.count -= dmgToNpc; other.count -= dmgToOther;
                    
                    // Roster Pops
                    for (let k = 0; k < dmgToNpc && npc.roster && npc.roster.length > 0; k++) {
                        let idx = Math.floor(Math.random() * npc.roster.length);
                        npc.roster[idx] = npc.roster[npc.roster.length - 1]; npc.roster.pop();
                    }
                    for (let k = 0; k < dmgToOther && other.roster && other.roster.length > 0; k++) {
                        let idx = Math.floor(Math.random() * other.roster.length);
                        other.roster[idx] = other.roster[other.roster.length - 1]; other.roster.pop();
                    }

                    // --- BATTLE RESOLUTION & ANTI-FREEZE REBOUND ---
                    // NEW: Triggers resolution if someone dies, OR if the battle timer expires
                    if (npc.count <= 0 || other.count <= 0 || npc.battlingTimer === 0) {
                        let bothSurvived = (npc.count > 0 && other.count > 0);
                        
                        // NEW FIX: If BOTH units survive the skirmish timer (mutual retreat)
                        if (bothSurvived) {
                            let angle1 = Math.random() * Math.PI * 2;
                            npc.x += Math.cos(angle1) * 30; npc.y += Math.sin(angle1) * 30;
                            npc.waitTimer = 0; npc.isMoving = true; npc.speed = 0.8;
                            npc.targetX = npc.x + Math.cos(angle1) * 100; npc.targetY = npc.y + Math.sin(angle1) * 100;
                            npc.decisionTimer = 60; // Lock brain so they walk away
                            
                            let angle2 = angle1 + Math.PI; // Flee in opposite direction
                            other.x += Math.cos(angle2) * 30; other.y += Math.sin(angle2) * 30;
                            other.waitTimer = 0; other.isMoving = true; other.speed = 0.8;
                            other.targetX = other.x + Math.cos(angle2) * 100; other.targetY = other.y + Math.sin(angle2) * 100;
                            other.decisionTimer = 60;
                        } 
                        // Existing logic: If only one side survived (or one died)
                        else {
                            let actualSurvivor = (npc.count > 0) ? npc : ((other.count > 0) ? other : null);
                            let loser = (npc.count <= 0) ? npc : other;

                            if (actualSurvivor) {
                                let maxCapacity = actualSurvivor.count * (typeof NPC_CARRY_CAPACITY_PER_UNIT !== 'undefined' ? NPC_CARRY_CAPACITY_PER_UNIT : 10);
                                let roomLeft = Math.max(0, maxCapacity - (actualSurvivor.gold + actualSurvivor.food));
                                if (roomLeft > 0) {
                                    let totalLoot = loser.gold + loser.food;
                                    let ratio = Math.min(1, roomLeft / Math.max(1, totalLoot));
                                    actualSurvivor.gold += Math.floor(loser.gold * ratio);
                                    actualSurvivor.food += Math.floor(loser.food * ratio);
                                }

                                let angle = Math.random() * Math.PI * 2;
                                actualSurvivor.x += Math.cos(angle) * 30; 
                                actualSurvivor.y += Math.sin(angle) * 30;
                                
                                // Force Movement State Unlocking
                                actualSurvivor.waitTimer = 0; 
                                actualSurvivor.isMoving = true;
                                actualSurvivor.speed = 0.8; 
                                actualSurvivor.targetX = actualSurvivor.x + Math.cos(angle) * 100; 
                                actualSurvivor.targetY = actualSurvivor.y + Math.sin(angle) * 100;
                                actualSurvivor.decisionTimer = 60; 

                                // Give survivor a nudge to prevent "stacking"
                                actualSurvivor.x += (Math.random() - 0.5) * 15;
                                actualSurvivor.y += (Math.random() - 0.5) * 15;
                            }
                        }
                        
                        // FIX: Clear BOTH units so nobody gets stuck
                        npc.battleTarget = null;
                        npc.battlingTimer = 0;
                        other.battleTarget = null;
                        other.battlingTimer = 0;
                    }
                }
            } else {
                // --- BUG FIX 2: INVALID TARGET CATCH ---
                // Triggers if a target was deleted or vanished mid-fight
                npc.battleTarget = null; 
                npc.battlingTimer = 0; 
                npc.waitTimer = 10;
                npc.isMoving = true;
                // Give them a destination so they walk away instead of freezing forever
                npc.targetX = npc.x + (Math.random() - 0.5) * 300;
                npc.targetY = npc.y + (Math.random() - 0.5) * 300;
                npc.decisionTimer = 0; // Force immediate brain update
            }
            
            continue; 
        }

        if (npc.isMoving && Math.random() < 0.002) npc.waitTimer = Math.floor(Math.random() * 100) + 50; 

        // --- 4. FLIGHT OR FIGHT LOGIC ---
        if (!npc.battleTarget && npc.decisionTimer <= 0) {
            npc.decisionTimer = 60; 

            if (npc.food < 20 && npc.role !== "Commerce" && npc.role !== "Civilian") {
                bestTarget = null; 
                if (!npc.targetCity || (npc.faction !== "Bandits" && npc.targetCity.faction !== npc.faction)) {
                    let potentialCities = npc.faction === "Bandits" ? cities : cities.filter(c => c.faction === npc.faction);
                    if (potentialCities.length > 0) {
                        potentialCities.sort((a,b) => (Math.pow(npc.x-a.x, 2)+Math.pow(npc.y-a.y, 2)) - (Math.pow(npc.x-b.x, 2)+Math.pow(npc.y-b.y, 2)));
                        npc.targetCity = potentialCities[0]; 
                    }
                }
            }

            if (closestScaryEnemy && (npc.role === "Civilian" || npc.role === "Commerce" || npc.role === "Bandit")) {
                let dxE = npc.x - closestScaryEnemy.x, dyE = npc.y - closestScaryEnemy.y;
                if (dxE === 0 && dyE === 0) { dxE = Math.random() - 0.5; dyE = Math.random() - 0.5; }
                let distToScary = Math.hypot(dxE, dyE);
                npc.targetX = npc.x + (dxE / distToScary) * 150; 
                npc.targetY = npc.y + (dyE / distToScary) * 150;
                npc.waitTimer = 0; npc.speed = 0.8; npc.decisionTimer = 40; 
            } 
            else if ((npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") && bestTarget) {
                let isWorthDiverting = (bestTarget.role === "Military" || bestTarget.role === "Patrol" || bestTarget.disableAICombat);
                if (npc.role === "Patrol" && bestTarget.role === "Bandit") isWorthDiverting = true; 
                if (npc.role === "Bandit" && bestTarget.role === "Commerce") isWorthDiverting = true; 
                
                let targetDistSq = Math.pow(npc.x - bestTarget.x, 2) + Math.pow(npc.y - bestTarget.y, 2);
                if (isWorthDiverting || targetDistSq < 1500) { 
                    npc.targetX = bestTarget.x; npc.targetY = bestTarget.y;
                    npc.waitTimer = 0; npc.speed = 0.85; 
					
					
				   // 🔧 CHANGE 1: commit longer (reduces flip-flopping)
        npc.decisionTimer = (npc.role === "Bandit") ? 35 : 20;
                }
            } 
            else {
                if (npc.targetCity && npc.targetCity.x != null && npc.targetCity.y != null) {
                    npc.targetX = npc.targetCity.x; npc.targetY = npc.targetCity.y;
                } else if (!npc.isMoving) {
                    npc.targetX = npc.x + (Math.random() - 0.5) * 200;
                    npc.targetY = npc.y + (Math.random() - 0.5) * 200;
                }
                if (npc.role === "Civilian") npc.speed = 0.45;
                else if (npc.role === "Commerce") npc.speed = 0.75;
                else if (npc.role === "Military") npc.speed = 0.4;
                else if (npc.role === "Bandit") npc.speed = 0.85;
                else if (npc.role === "Patrol") npc.speed = 0.85;
            }
        }

        // --- 5. ARMY SUPPLY DRAIN ---
        if (npc.isMoving) {
            if ((npc.role === "Military" || npc.role === "Bandit" || npc.role === "Patrol") && Math.random() < 0.002) { 
                npc.food -= (1 + Math.floor(npc.count / 25));
                if (npc.food <= 0) {
                    npc.food = 0; npc.count -= Math.max(1, Math.floor(npc.count * 0.02)); 
                }
            }
            if (npc.food < 20 && Math.random() < 0.005) {
                let forageAmount = Math.max(2, Math.floor(npc.count * 0.01));
                if (npc.role === "Bandit") forageAmount *= 2; 
                npc.food += forageAmount;
            }
        }

        // --- 6. MOVEMENT LOGIC ---
        if (npc.waitTimer > 0) {
            npc.waitTimer--; npc.isMoving = false;
        } else if (!npc.battleTarget) {
            let dx = npc.targetX - npc.x, dy = npc.targetY - npc.y;
            let dist = Math.hypot(dx, dy);
            let tc = npc.targetCity;
            
            // ANTI-FREEZE FIX: Ensure they are actually AT the target city, not just hitting a fleeing waypoint
            let isAtTargetCity = tc && Math.abs(npc.targetX - tc.x) < 5 && Math.abs(npc.targetY - tc.y) < 5;

            if (dist < 10) { 
                npc.isMoving = false;
                
                if (isAtTargetCity) {
                    npc.x = tc.x + (Math.random() - 0.5) * 40; npc.y = tc.y + (Math.random() - 0.5) * 40;
                    
                    if (npc.role === "Military" && npc.faction !== tc.faction) {
                        if (typeof initiateSiege === 'function') {
                            if (!npc.isSieging) initiateSiege(npc, tc);
                            npc.waitTimer = 100; 
                        } else {
                            npc.waitTimer = 100;
                            tc.pop -= (typeof siegeDamage !== 'undefined') ? siegeDamage : Math.floor(npc.count * 0.1) + 10;
                        }
                        if (tc.militaryPop <= 10) {
                            tc.faction = npc.faction; tc.color = npc.color;
tc.militaryPop = Math.min(MAX_GARRISON, Math.max(10, Math.floor(npc.count * 0.5))); 
//you expend half your troops for garrison
                            tc.troops = tc.militaryPop; tc.pop += tc.militaryPop;
                            npc.count -= tc.militaryPop; npc.targetCity = null; 
                        }
                    }
                    else if ((npc.role === "Bandit" || npc.role === "Patrol") && npc.faction !== tc.faction) {
                        npc.targetX = npc.x + (Math.random() - 0.5) * 600;
                        npc.targetY = npc.y + (Math.random() - 0.5) * 600;
                        npc.waitTimer = Math.floor(Math.random() * 60) + 30;
                        npc.targetCity = null; 
                    }
                    else if ((npc.role === "Military" || npc.role === "Patrol" || npc.role === "Bandit") && npc.faction === tc.faction) {
                        let foodToTake = Math.min((npc.count * 10) - npc.food, tc.food);
                        if (foodToTake > 0) {
                            tc.food -= foodToTake; npc.food += foodToTake;
                            let cost = Math.floor(foodToTake * 0.05);
                            if (npc.gold >= cost) { npc.gold -= cost; tc.gold += cost; }
                        }
let targetGarrison = Math.min(
    MAX_GARRISON,
    Math.floor(tc.pop * tc.conscriptionRate * 0.3)
);

if (tc.militaryPop < targetGarrison) {
    let absorb = Math.min(
        3,
        npc.count,
        targetGarrison - tc.militaryPop,
        MAX_GARRISON - tc.militaryPop
    );

    if (absorb > 0) {
        tc.militaryPop += absorb;
        tc.pop += absorb;
        tc.troops = tc.militaryPop;
        npc.count -= absorb;
    }
}
                        if (npc.count > 0) {
                            npc.targetCity = (typeof getEnemyCity === 'function' ? getEnemyCity(tc, cities) : null) || (typeof getRandomTargetCity === 'function' ? getRandomTargetCity(cities, tc) : null);
                            if (npc.targetCity) { npc.targetX = npc.targetCity.x; npc.targetY = npc.targetCity.y; }
                            npc.waitTimer = Math.floor(Math.random() * 100) + 50; 
                        }
                    }
                    else if (npc.role === "Commerce") {
                        if (npc.targetCity === npc.originCity) {
                            tc.civilianPop += npc.count; tc.pop += npc.count; npc.count = 0; 
                        } else {
                            tc.gold += Math.floor(npc.travelDist * 0.02) + npc.gold; 
                            tc.food += npc.food; npc.gold = 0; npc.food = 0; 
                            npc.targetCity = npc.originCity; 
                            if (npc.targetCity) { npc.targetX = npc.targetCity.x; npc.targetY = npc.targetCity.y; }
                            npc.waitTimer = Math.floor(Math.random() * 100) + 50;
                        }
                    }
                    else if (npc.role === "Civilian") {
                        tc.civilianPop += npc.count; tc.pop += npc.count;
                        tc.gold += npc.gold; tc.food += npc.food; npc.count = 0; 
                    }
                } 
                else {
                    // Wandering / reached random waypoint. Pick a new one so they don't freeze!
                    if (npc.targetCity) {
                        npc.targetX = npc.targetCity.x; npc.targetY = npc.targetCity.y;
                    } else {
                        npc.targetX = npc.x + (Math.random() - 0.5) * 600;
                        npc.targetY = npc.y + (Math.random() - 0.5) * 600;
                    }
                    npc.waitTimer = Math.floor(Math.random() * 60) + 30;
                }
            } 
            else {
                let tx = Math.floor(npc.x / (typeof tSize !== 'undefined' ? tSize : 8)), ty = Math.floor(npc.y / (typeof tSize !== 'undefined' ? tSize : 8));
                let currentTile = (typeof worldMapRef !== 'undefined' && worldMapRef[tx] && worldMapRef[tx][ty]) ? worldMapRef[tx][ty] : { speed: 1.0 };
                let terrainMod = currentTile.speed !== undefined ? currentTile.speed : 1.6;
                let currentSpeed = npc.speed;

if (npc.role === "Bandit") {
    // Start penalties later (after 30 instead of 21)
    let penaltySteps = Math.max(0, Math.floor((npc.count - 30) / 10) + 1);

    // Much softer penalty (4% per step instead of 10%)
    let speedMultiplier = 1 - (penaltySteps * 0.04);

    // Higher floor so it never feels too punishing
    speedMultiplier = Math.max(0.6, speedMultiplier);

    currentSpeed *= speedMultiplier;
}

                let moveStep = Math.min(currentSpeed * terrainMod, 1); 
                if (dist > 0) { npc.x += (dx / dist) * moveStep; npc.y += (dy / dist) * moveStep; }
                npc.isMoving = true; npc.anim += moveStep * 1.5; 
            }
        }
    } // End main NPC loop


 //global spawn
    if (Math.random() < 0.03 && cities.length > 0) {
        let rc = cities[Math.floor(Math.random() * cities.length)];
        if (Math.random() < 0.3 && rc.civilianPop > 20) spawnNPCFromCity(rc, "Commerce", cities);
        else if (Math.random() < 0.2 && rc.civilianPop > 50) spawnNPCFromCity(rc, "Civilian", cities);
   else if (Math.random() < 0.3 && rc.militaryPop > 30) spawnNPCFromCity(rc, "Patrol", cities);
else if (rc.pop > 500 && rc.militaryPop > 50 && Math.random() < 0.10) spawnNPCFromCity(rc, "Military", cities); //military spawn requirement
    }
    if (Math.random() < 0.005 && globalNPCs.filter(n => n.role === "Bandit").length < cities.length * 1.5) {
        if (typeof spawnBandit === 'function') spawnBandit(0, 0); 
    }
}





function ensureAllFactionsSpawned(cities) {
    let spawnedFactions = new Set();
    cities.forEach(c => spawnedFactions.add(c.faction));

    // Get list of factions that are NOT Bandits or Players
    const required = Object.keys(FACTIONS).filter(f => f !== "Bandits" && f !== "Player's Kingdom");

    required.forEach(factionName => {
        if (!spawnedFactions.has(factionName)) {
            console.log(`Force-spawning missing faction: ${factionName}`);
            
            let bestCity = null;
            let minDist = Infinity;
            let target = FACTIONS[factionName].geoWeight;

            // Find the city closest to where this faction SHOULD be
            cities.forEach(city => {
                let dx = (city.x / (maxCols * tSize)) - target.east;
                let dy = (city.y / (maxRows * tSize)) - target.south;
                let d = dx * dx + dy * dy;
                if (d < minDist) {
                    minDist = d;
                    bestCity = city;
                }
            });

            if (bestCity) {
                // Force overwrite this city
                bestCity.faction = factionName;
                bestCity.originalFaction = factionName;
                bestCity.color = FACTIONS[factionName].color;
                bestCity.name = generateFactionCityName(factionName);
                spawnedFactions.add(factionName);
            }
        }
    });
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