
let inParleMode = false;
let currentParleNPC = null;
let savedParleTile = null; 
let isDiplomacyProcessing = false; // NEW: Prevents button spamming

function getTopExpensiveNPCUnits(npc, count = 3) {
    if (!npc.roster || npc.roster.length === 0) return [];

    // Assumption: FACTIONS data is defined globally or in npc_system.js
    // Assumption: UnitRoster.allUnits is defined in troop_system.js

    // 1. Create a map of Unit Type -> Cost (referencing Troop System)
    let unitDataArr = [];
    npc.roster.forEach(unitEntry => {
        let type = unitEntry.type;
        let baseTemplate = null;

        if (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits && UnitRoster.allUnits[type]) {
            baseTemplate = UnitRoster.allUnits[type];
        }

        // Add to array with cost; fallback to 0 if cost is not specified in Troop System
        unitDataArr.push({
            type: type,
            cost: (baseTemplate && baseTemplate.cost) ? baseTemplate.cost : 0
        });
    });

    // 2. Sort the array descending by cost
    unitDataArr.sort((a, b) => b.cost - a.cost);

    // 3. Return only unique types to prevent displaying multiple 'Elite Lancer' entries
    let uniqueTypes = [];
    let topUnits = [];
    for (let data of unitDataArr) {
        if (!uniqueTypes.includes(data.type)) {
            uniqueTypes.push(data.type);
            topUnits.push(data);
            if (topUnits.length >= count) break; 
        }
    }

    return topUnits;
}

/**
 * Returns a tailored dialogue string for the 'Hello' choice based on the NPC role.
 */
function generateNPCDialogue(npc, choice) {
    // UPDATED: Dynamically check standings
    const isEnemy = player.enemies && player.enemies.includes(npc.faction);
    const isAlly = npc.faction === player.faction;

    if (choice === "Hello") {
        if (npc.faction === "Bandits" || npc.role === "Bandit") {
            return "What do you think you're doing? Hand over everything!";
        } else if (npc.role === "Civilian" || npc.role === "Commerce") {
            return "We are simple folk, just passing through.";
        } else if (npc.role === "Patrol" || npc.role === "Military") {
            if (isAlly) {
                // Assumption: player.faction is defined in the global player object
                return "Commander! The region is stable. Our forces stand ready.";
            } else if (isEnemy) {
                return "You stand on hostile ground. Explain your presence, or we will remove you, dead or alive!";
            } else {
                // Neutral military response
                return `Halt. We represent the ${npc.faction}. We seek no quarrel, provided you keep your weapons sheathed.`;
            }
        } else {
            // Neutral/Default response
            return `Hello there. Safe travels in these parts.`;
        }
    }
    
    return "...";
}

function handleDiplomacyAction(npc, actionType) {
if (isDiplomacyProcessing) return; // EXIT if we are already transitioning

    if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click');
    // UPDATED: Define different scenarios based on dynamic faction standing
    const isEnemy = player.enemies && player.enemies.includes(npc.faction);
    const isAlly = npc.faction === player.faction;
    const isNeutral = !isEnemy && !isAlly;
    const isBandit = npc.faction === "Bandits" || npc.role === "Bandit";

    // NEW: Calculate Overwhelming Odds (3:1 ratio)
    const playerTroops = player.troops || 0;
    const npcTroops = npc.count || 0;
    const isOverwhelmingOdds = playerTroops >= (npcTroops * 3);

    const parleDialogue = document.getElementById('parle-dialogue');
    parleDialogue.innerText = ""; // Clear current string

    switch (actionType) {
        case "HELLO":
            parleDialogue.innerText = generateNPCDialogue(npc, "Hello");
            break;

case "RANDOM":
            if (typeof RandomDialogue !== 'undefined' && typeof RandomDialogue.generate === 'function') {
                // Pass the npc object reference as the second argument to track spam/re-encounters
                parleDialogue.innerText = RandomDialogue.generate({
                    faction: npc.faction,
                    playerFaction: player.faction,
                    playerNumbers: playerTroops,
                    npcNumbers: npcTroops,
                    npcType: npc.role,
                    isEnemy: isEnemy,
                    isAlly: isAlly
                }, npc);
            } else {
                parleDialogue.innerText = "There is much to discuss, but perhaps another time.";
            }
            break;

        case "DECLARE_WAR":
isDiplomacyProcessing = true; // LOCK UI
            parleDialogue.innerText = `So be it! The ${npc.faction} will see you crushed!`;
            if (!player.enemies) player.enemies = [];
            if (!player.enemies.includes(npc.faction)) {
                player.enemies.push(npc.faction);
            }
            setTimeout(() => {
                executeAttackAction(npc); 
            }, 1500);
            break;

        case "LEAVE": {
    const isCivilianOrCommerce = npc.role === "Civilian" || npc.role === "Commerce";
    const isHostileCombatType = (npc.role === "Bandit" || npc.role === "Military" || npc.role === "Patrol");

    // Civilian / commerce NPCs always allow you to leave
    if (isCivilianOrCommerce) {
        isDiplomacyProcessing = true;
        parleDialogue.innerText = `Goodbye.`;
        setTimeout(() => {
            leaveParle(player);
        }, 1200);

    // Hostile military / patrol / bandits only let you leave if massively outnumbering them
    } else if ((isEnemy || isBandit || isHostileCombatType) && isOverwhelmingOdds) {
        isDiplomacyProcessing = true;
        parleDialogue.innerText = `You left with confidence.`;
        setTimeout(() => {
            leaveParle(player);
        }, 2000);

    } else if (isAlly || isNeutral) {
        isDiplomacyProcessing = true;
        leaveParle(player);

    } else {
        isDiplomacyProcessing = true;
        parleDialogue.innerText = `You can't walk away from us, you fool. We'll take what is ours! Prepare yourself!`;
        setTimeout(() => {
            executeAttackAction(npc);
        }, 1500);
    }
		break;}

        case "ATTACK":
isDiplomacyProcessing = true; // LOCK UI
            parleDialogue.innerText = `Prepare for Battle!`;
            setTimeout(() => {
                executeAttackAction(npc); 
            }, 1000);
            break;
    }
}

function executeAttackAction(npc) {
    const tile = savedParleTile || { name: "Plains" }; // Fallback

    // Check external references: enterBattlefield, player (from index.html scope)
    if (typeof enterBattlefield === 'function') {
        leaveParle(player, true); // Close diplomacy state, but flag that we are going to battle (don't set BATTLE_COOLDOWN)
        enterBattlefield(npc, player, tile); // Launch Battlefield System
    } else {
        console.error("Battlefield System (enterBattlefield) not found! Diplomacy aborted.");
        leaveParle(player);
    }
}

function initiateParleWithNPC(npc, tile) {
if (typeof inBattleMode !== 'undefined' && inBattleMode) return;
    if (typeof inCityMode !== 'undefined' && inCityMode) return; 
    isHoveringPlayer = false;
    window.isRosterOpen = false;


// ---> ADD THIS COOLDOWN CHECK <---
    // Wait 3 seconds (3000ms) after a battle or previous parley before allowing another one
    if (typeof lastBattleTime !== 'undefined' && typeof BATTLE_COOLDOWN !== 'undefined') {
        if (Date.now() - lastBattleTime < BATTLE_COOLDOWN) {
            return; // Exit silently, giving the player time to walk away
        }
    }

    isDiplomacyProcessing = false; // Reset lock on new encounter
    inParleMode = true;
    currentParleNPC = npc;
    savedParleTile = tile;

    if (player) player.isMapPaused = true;
    if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_parle_open'); 

    document.getElementById('parle-panel').style.display = 'block';
    
    // NPC Name
    document.getElementById('parle-npc-name').innerText = npc.role;
    
    // --- FACTION LOGIC ---
    let factionName = npc.faction;
    const standingEl = document.getElementById('parle-faction-standing');
    
    // Special check for Independent / Player Kingdom
    if (factionName === "Independent") {
        factionName = "Player's Kingdom";
    }
    document.getElementById('parle-npc-faction').innerText = factionName;

    // Standing Indicator
    const isEnemy = player.enemies && player.enemies.includes(npc.faction);
    const isAlly = npc.faction === player.faction;

    if (isAlly) {
        standingEl.innerText = "Ally";
        standingEl.style.backgroundColor = "#2e7d32"; // Green
        standingEl.style.color = "#fff";
    } else if (isEnemy) {
        standingEl.innerText = "Hostile";
        standingEl.style.backgroundColor = "#c62828"; // Red
        standingEl.style.color = "#fff";
    } else {
        standingEl.innerText = "Neutral";
        standingEl.style.backgroundColor = "#616161"; // Grey
        standingEl.style.color = "#fff";
    }

    const npcFactionData = (typeof FACTIONS !== 'undefined' && FACTIONS[npc.faction]) ? FACTIONS[npc.faction] : { color: "#777" };
    document.getElementById('parle-npc-name').style.color = npcFactionData.color;

    // Reset Dialogue & Scroll to top
    const diagBox = document.getElementById('parle-dialogue');
    diagBox.innerText = `You have encountered ${npc.role}. The region is ${tile.name}. What is your approach?`;
    diagBox.scrollTop = 0; // Reset scroll position for new encounters

    // Troop Counts
    document.getElementById('parle-player-troops').innerText = player.troops || 0;
    document.getElementById('parle-npc-troops').innerText = npc.count || 0;

    // NPC Units List
    const unitListUL = document.getElementById('parle-npc-top-units');
    unitListUL.innerHTML = '';
    const topUnits = getTopExpensiveNPCUnits(npc, 3);
    if (topUnits.length > 0) {
        topUnits.forEach(unit => {
            let li = document.createElement('li');
            li.innerHTML = `<span style="color:#d4b886;">${unit.cost}G</span> - ${unit.type}`;
            unitListUL.appendChild(li);
        });
    } else {
        unitListUL.innerHTML = `<li style="color:#666;">No notable units</li>`;
    }

    populateParleButtons(npc);
}
function populateParleButtons(npc) {
    const actionBox = document.getElementById('parle-action-box');
    actionBox.innerHTML = ''; // Clear previous buttons

    // UPDATED: Dynamic faction standings
    const isEnemy = player.enemies && player.enemies.includes(npc.faction);
    const isAlly = npc.faction === player.faction;
    const isNeutral = !isEnemy && !isAlly;
    const isBandit = npc.faction === "Bandits" || npc.role === "Bandit";

    // NEW: Calculate Odds for button context
    const playerTroops = player.troops || 0;
    const npcTroops = npc.count || 0;
    const isOverwhelmingOdds = playerTroops >= (npcTroops * 3);

    // Create buttons (similar to Bannerlord options)

    // Button 1: Saying Hello
    actionBox.appendChild(createDiplomacyButton("Greetings... (Saying Hello)", () => {
        handleDiplomacyAction(npc, "HELLO");
    }));

    // Button 2: Updated Text - Prepared for external random dialogue integration
    actionBox.appendChild(createDiplomacyButton("There is something I want to discuss.", () => {
        handleDiplomacyAction(npc, "RANDOM");
    }));

    // Button 3: Hostile Actions (Dynamic based on standing)
    if (isEnemy) {
        actionBox.appendChild(createDiplomacyButton("I am attacking you. (Force Attack)", () => {
            handleDiplomacyAction(npc, "ATTACK");
        }, true)); // Flag as attack action for styling
    } else if (isNeutral) {
        actionBox.appendChild(createDiplomacyButton("Your lands are forfeit! (Declare War)", () => {
            handleDiplomacyAction(npc, "DECLARE_WAR");
        }, true)); // Flag as attack action for styling
    }

let leaveText = "Leave.";

const isCivilianOrCommerce =
    npc.role === "Civilian" || npc.role === "Commerce";

const isHostileCombatType =
    npc.role === "Bandit" ||
    npc.role === "Military" ||
    npc.role === "Patrol";

/* --- PRIORITY: ALLIES FIRST --- */
if (isAlly) {

    leaveText = "Goodbye.";

}

/* --- HOSTILE FORCES --- */
else if (isEnemy || isHostileCombatType) {

    leaveText = isOverwhelmingOdds
        ? "Leave. (They are intimidated)"
        : "Attempt to Leave.";

}

/* --- CIVILIANS / NEUTRALS --- */
else if (isCivilianOrCommerce || isNeutral) {

    leaveText = "Leave.";

}
    
    actionBox.appendChild(createDiplomacyButton(leaveText, () => {
        handleDiplomacyAction(npc, "LEAVE");
    }));
}

/**
 * Clean up the diplomacy screen and resume the world map.
 */
function leaveParle(playerObj, isGoingToBattle = false) {
    inParleMode = false;

    // NEW: Reset the random dialogue spam checker for the next encounter
    if (typeof RandomDialogue !== 'undefined') {
        RandomDialogue.resetSession();
    }
 
    // ---> THE FIX: Push the NPC away to prevent infinite Parle loops <---
    if (!isGoingToBattle && currentParleNPC) {
        let angle = Math.random() * Math.PI * 2;
        currentParleNPC.x += Math.cos(angle) * 30;
        currentParleNPC.y += Math.sin(angle) * 30;
        currentParleNPC.waitTimer = 0; // Make them walk away immediately
        currentParleNPC.targetX = currentParleNPC.x + Math.cos(angle) * 100;
        currentParleNPC.targetY = currentParleNPC.y + Math.sin(angle) * 100;
    }

    currentParleNPC = null;
    savedParleTile = null;

    // ---> RESUME MAP MOVEMENTS <---
    if (playerObj) playerObj.isMapPaused = false; 

    if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_parle_close'); 

    if (!isGoingToBattle) {
        if (typeof lastBattleTime !== 'undefined' && typeof BATTLE_COOLDOWN !== 'undefined') {
            lastBattleTime = Date.now(); // Prevents instant encounter re-trigger
        }
    }

    // HIDE THE UI
    document.getElementById('parle-panel').style.display = 'none';
    console.log("World Map Resumed.");
}

// HELPER: Create standard Parle/Diplomacy styled button
function createDiplomacyButton(text, clickHandler, isAttack = false) {
    const btn = document.createElement('button');
    btn.className = 'menu-btn'; // Standard styled button class from index.html
    btn.style.textTransform = "none"; // Preserve capitalization for these Bannerlord-like options
    btn.innerText = text;
    btn.onclick = clickHandler;

    // Special styling for the 'Attack' choice (red highlight)
    if (isAttack) {
        btn.style.background = "linear-gradient(to bottom, #d32f2f, #b71c1c)";
        btn.style.borderColor = "#fff";
        btn.style.color = "#fff";
    }

    return btn;
}