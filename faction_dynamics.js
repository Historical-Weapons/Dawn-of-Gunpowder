// ============================================================================
// FACTION DYNAMICS & DIPLOMACY SYSTEM
// ============================================================================

let FACTION_RELATIONS = {};
let diplomacyTick = 0;

// Run this once when the map generates
function initDiplomacy(factionsList) {
    if (!factionsList) return;
    
    let names = Object.keys(factionsList);
    names.forEach(f1 => {
        FACTION_RELATIONS[f1] = {};
        names.forEach(f2 => {
            // Everyone explicitly starts at "Peace". 
            FACTION_RELATIONS[f1][f2] = (f1 === f2) ? "Ally" : "Peace"; 
        });
    });
    console.log("Global Diplomacy Matrix Initialized (Peaceful Start).");
}

// Global helper to check if two factions want to kill each other
function isHostile(factionA, factionB) {
    if (!factionA || !factionB) return false;
    if (factionA === factionB) return false;

    // Bandits are globally hostile
    if (factionA === "Bandits" || factionB === "Bandits") return true; 
    
    // Player Diplomacy logic
    if (factionA === "Player's Kingdom" || factionB === "Player's Kingdom") {
        if (typeof player !== 'undefined' && player.enemies) {
            if (factionA === "Player's Kingdom") return player.enemies.includes(factionB);
            if (factionB === "Player's Kingdom") return player.enemies.includes(factionA);
        }
    }
    
    if (!FACTION_RELATIONS[factionA] || !FACTION_RELATIONS[factionA][factionB]) {
        return false; 
    }
    
    return FACTION_RELATIONS[factionA][factionB] === "War";
}

// --- Refined Update Loop inside faction_dynamics.js ---
function updateDiplomacy() {
    diplomacyTick++;
    // SLOWED: Processes every 120 ticks (roughly every 2 minutes at 60fps)
    if (diplomacyTick < 120) return; 
    diplomacyTick = 0;

    let names = Object.keys(FACTION_RELATIONS).filter(f => f !== "Bandits" && f !== "Player's Kingdom");
    if (names.length < 2) return;

    let f1 = names[Math.floor(Math.random() * names.length)];
    let f2 = names[Math.floor(Math.random() * names.length)];

    if (f1 !== f2) {
        let currentStatus = FACTION_RELATIONS[f1][f2] || "Peace";
        
        // LOGIC: Hostile factions go to peace (30% chance) 
        // Peace factions go to war (only 4% chance - very rare)
        let rand = Math.random();
        let newStatus = currentStatus;

        if (currentStatus === "War" && rand < 0.30) {
            newStatus = "Peace";
        } else if (currentStatus === "Peace" && rand < 0.04) {
            newStatus = "War";
        }

if (currentStatus !== newStatus) {
            FACTION_RELATIONS[f1][f2] = newStatus;
            FACTION_RELATIONS[f2][f1] = newStatus;
            
            // ---> NEW: Send the event to the UI Log <---
            if (typeof logGameEvent === 'function') {
                if (newStatus === "War") {
                    logGameEvent(`${f1} has declared war on the ${f2}!`, "war");
                } else if (newStatus === "Peace") {
                    logGameEvent(`${f1} and ${f2} have signed a peace treaty.`, "peace");
                }
            }
            
            // Refresh table if open
            if(document.getElementById('diplomacy-panel').style.display === 'block') {
                renderDiplomacyMatrix();
            }
        }
    }
}

// Counts how many cities each faction owns for the balancing mechanics
function getFactionCityCounts(cities) {
    let counts = {};
    if (!cities) return counts;
    
    cities.forEach(c => {
        if (c && c.faction) {
            counts[c.faction] = (counts[c.faction] || 0) + 1;
        }
    });
    return counts;
}

// Calculates Rubber-Banding and Friction 
function applyFactionModifiers(city, factionCityCounts) {
    if (!city || !city.faction) return { draftMultiplier: 1.0, upkeepMultiplier: 1.0 };
    
    let count = factionCityCounts[city.faction] || 1;
    let draftMultiplier = 1.0;
    let upkeepMultiplier = 1.0;

    if (count <= 2 && city.faction !== "Bandits" && city.faction !== "Player's Kingdom") {
        draftMultiplier = 4.0; 
    }

    if (count >= 10 && city.faction !== "Bandits" && city.faction !== "Player's Kingdom") {
        upkeepMultiplier = 1.5; 
        city.food -= Math.floor(city.pop * 0.02); 
    }

    return { draftMultiplier, upkeepMultiplier };
}


// ============================================================================
// UI: DIPLOMACY TABLE GENERATOR (EMOJI EDITION)
// ============================================================================

const FACTION_EMOJIS = {
    "Hong Dynasty": "🏯",
    "Shahdom of Iransar": "🦁",
    "Great Khaganate": "🏇",
    "Jinlord Confederacy": "💣",
    "Vietan Realm": "🏝️",
    "Goryun Kingdom": "🐯",
    "Xiaran Dominion": "🐪",
    "High Plateau Kingdoms": "⛰️",
    "Yamato Clans": "🌸",
    "Bandits": "🏴‍☠️",
    "Player's Kingdom": "🎮"
};

 
function renderDiplomacyMatrix() {
    const panel = document.getElementById('diplomacy-panel');
    const container = document.getElementById('diplomacy-table-container');
    if (!panel || !container) return;

    // 1. Re-build Header (To include the Close/Minimize button)
    panel.innerHTML = `
        <div id=\"dip-panel-header\">
            <h2>Geopolitical Relations</h2>
            <button class=\"dip-close-btn\" onclick=\"toggleDiplomacyMenu()\">✕</button>
        </div>
        <div id=\"diplomacy-table-container\"></div>
    `;

    // Re-select container after re-build
    const tableBox = document.getElementById('diplomacy-table-container');
    
    let factions = Object.keys(FACTIONS);
    let tableHTML = `<table class="dip-table"><thead><tr><th></th>`;

    // Generate Top Row (Emojis)
    factions.forEach(f => {
        let emoji = FACTION_EMOJIS[f] || "🏳️";
        tableHTML += `<th title="${f}">${emoji}</th>`; 
    });
    tableHTML += `</tr></thead><tbody>`;

    // Generate Matrix Rows
    factions.forEach(f1 => {
        let rowEmoji = FACTION_EMOJIS[f1] || "";
        tableHTML += `<tr><td class="dip-row-label">${rowEmoji} ${f1}</td>`;
        
        factions.forEach(f2 => {
			// Logic priority: Function check -> Matrix check -> Default Peace
            let rel = "Peace";
            
            // SURGERY 1: Force the table to respect the global 'isHostile' check first
            if (isHostile(f1, f2)) {
                rel = "War";
            } else if (f1 !== "Player's Kingdom" && f2 !== "Player's Kingdom") {
                rel = (typeof getRelation === 'function') ? getRelation(f1, f2) : (FACTION_RELATIONS[f1]?.[f2] || "Peace");
            }

            // Handle Hard-coded hostiles
            if (f1 === "Bandits" || f2 === "Bandits") rel = "War";
            if (f1 === f2) rel = "-";

            let color = "#d4b886"; // Neutral/Peace
            if (rel === "War") color = "#ff5252";
            if (rel === "Ally") color = "#8bc34a";
            
            tableHTML += `<td style="color: ${color}; font-weight: bold;">${(rel === "-") ? "-" : rel.toUpperCase()}</td>`;
        });
        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table>`;
    tableBox.innerHTML = tableHTML;
	
	// Remove your temporary fail-safe catch and replace it with this clean injection:
const dipContainer = document.getElementById('diplomacy-table-container');
if (dipContainer) {
    dipContainer.innerHTML = tableHTML;
}
}