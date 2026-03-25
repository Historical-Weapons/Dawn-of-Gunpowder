// ============================================================================
// FACTION DYNAMICS & DIPLOMACY SYSTEM
// ============================================================================

let FACTION_RELATIONS = {};
let diplomacyTick = 0;

// Run this once when the map generates
function initDiplomacy(factionsList) {
    let names = Object.keys(factionsList);
    names.forEach(f1 => {
        FACTION_RELATIONS[f1] = {};
        names.forEach(f2 => {
            if (f1 === f2) {
                FACTION_RELATIONS[f1][f2] = "Ally";
            } else {
                // Start everyone at war so the early game is still chaotic, 
                // but they will naturally sue for peace over time.
                FACTION_RELATIONS[f1][f2] = "War"; 
            }
        });
    });
    console.log("Global Diplomacy Matrix Initialized.");
}

// Global helper to check if two factions want to kill each other
function isHostile(factionA, factionB) {
    if (factionA === "Bandits" || factionB === "Bandits") return true; // Bandits have no friends
    if (factionA === "Player's Kingdom" || factionB === "Player's Kingdom") {
        // Fallback to your existing player enemies logic if needed, 
        // but for NPC vs NPC, we use the matrix below.
        if (typeof player !== 'undefined' && player.enemies) {
            if (factionA === "Player's Kingdom") return player.enemies.includes(factionB);
            if (factionB === "Player's Kingdom") return player.enemies.includes(factionA);
        }
    }
    
    // Safety fallback
    if (!FACTION_RELATIONS[factionA] || !FACTION_RELATIONS[factionA][factionB]) return true; 
    
    return FACTION_RELATIONS[factionA][factionB] === "War";
}

// Runs periodically to simulate shifting geopolitical alliances
function updateDiplomacy() {
    diplomacyTick++;
    if (diplomacyTick < 10) return; // Only process every 10 macro-economy ticks
    diplomacyTick = 0;

    let names = Object.keys(FACTION_RELATIONS).filter(f => f !== "Bandits" && f !== "Player's Kingdom");

    // Pick two random NPC factions
    let f1 = names[Math.floor(Math.random() * names.length)];
    let f2 = names[Math.floor(Math.random() * names.length)];

    if (f1 !== f2) {
        let currentStatus = FACTION_RELATIONS[f1][f2];
        
        // 30% chance to make peace if at war. 15% chance to declare war if at peace.
        let newStatus = currentStatus === "War" ? 
            (Math.random() > 0.70 ? "Peace" : "War") : 
            (Math.random() > 0.85 ? "War" : "Peace");

        if (currentStatus !== newStatus) {
            console.log(`Diplomatic Shift: ${f1} and ${f2} are now at ${newStatus}!`);
            FACTION_RELATIONS[f1][f2] = newStatus;
            FACTION_RELATIONS[f2][f1] = newStatus; // Ensure it is bidirectional
        }
    }
}

// Counts how many cities each faction owns for the balancing mechanics
function getFactionCityCounts(cities) {
    let counts = {};
    cities.forEach(c => {
        counts[c.faction] = (counts[c.faction] || 0) + 1;
    });
    return counts;
}

// Calculates Rubber-Banding and Friction 
function applyFactionModifiers(city, factionCityCounts) {
    let count = factionCityCounts[city.faction] || 1;
    let draftMultiplier = 1.0;
    let upkeepMultiplier = 1.0;

    // A. UNDERDOG BUFF: If they are down to 1-2 cities, citizens desperately take up arms
    if (count <= 2 && city.faction !== "Bandits" && city.faction !== "Player's Kingdom") {
        draftMultiplier = 4.0; // +400% desired garrison size
    }

    // B. OVEREXTENSION PENALTY: Massive empires suffer corruption, logistics failures, and high costs
    if (count >= 10 && city.faction !== "Bandits" && city.faction !== "Player's Kingdom") {
        upkeepMultiplier = 1.5; // Armies cost 1.5x more gold to maintain
        city.food -= Math.floor(city.pop * 0.02); // Food rots in transit (flat penalty)
    }

    return { draftMultiplier, upkeepMultiplier };
}