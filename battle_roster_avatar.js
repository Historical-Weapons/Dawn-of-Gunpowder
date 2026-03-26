// ============================================================================
/*battle_roster_avatar.js
  Adds persistent rosters, player avatar, and hero progression.
  Overrides deploy, update, draw, and leave functions for battle sync.
  Tracks XP, loot, casualties, and UI messages.
  Ensures overworld and battle stats remain consistent.
*/


if (typeof drawBattleUnits === 'undefined') {
    var drawBattleUnits = function() { console.warn("Original drawBattleUnits not found."); };
}
if (typeof getTacticalPosition === 'undefined') {
    var getTacticalPosition = () => ({ x: 0, y: 0 }); // Fallback so it doesn't crash
}

// SURGERY: Cache the player avatar to stop array searching every frame
let cachedCommander = null; 
 

const originalDeployArmy = deployArmy;


// --- 1. OVERRIDE DEPLOY ARMY (Persistent Rosters & Player Avatar Injection) ---
deployArmy = function(faction, totalTroops, side) {
	// Add this at the very start of deployArmy
 

    let entity = side === "player" ? player : currentBattleData.enemyRef;
    let expectedCount = side === "player" ? entity.troops : entity.count;

    if (side === "player") {
        currentBattleData.playerDefeatedText = false; // Reset death flag for new battles
    }

    // Ensure entity exists and has a roster array initialized
    if (entity && !entity.roster) entity.roster = [];

  // SCENARIO A: First time fighting (Roster is empty)
        if (entity && entity.roster.length === 0 && expectedCount > 0) {
            originalDeployArmy(faction, totalTroops, side); 

            let justSpawned = battleEnvironment.units.filter(u => u.side === side);
            
            // ---> SURGERY 2: Grab the ACTUAL scale to rebuild roster perfectly <---
            let actualScale = expectedCount > 300 ? 5 : 1; 

            justSpawned.forEach(u => {
                for(let i = 0; i < actualScale; i++) {
                    entity.roster.push({ type: u.unitType, exp: 1 });
                }
            });
            
            if (entity.roster.length > expectedCount) {
                entity.roster.length = expectedCount; 
            }
        }
    
    // SCENARIO B: Returning veteran army
    else if (entity && entity.roster.length > 0) {
        
        // 1. Sync overworld counts (Recruits vs Starvation)
        if (entity.roster.length < expectedCount) {
            let diff = expectedCount - entity.roster.length;
            for (let i = 0; i < diff; i++) entity.roster.push({ type: "Militia", exp: 1 });
        } else if (entity.roster.length > expectedCount) {
            entity.roster.splice(expectedCount); 
        }

        // 2. Spawn them physically
        let spawnY = side === "player" ? BATTLE_WORLD_HEIGHT - 300 : 300;
        let spawnXCenter = BATTLE_WORLD_WIDTH / 2;
// This forces white if the side is 'player', otherwise it uses the faction color
let factionColor = (side === "player") ? "#ffffff" : ((typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#ffffff");
        if (!currentBattleData.initialCounts) currentBattleData.initialCounts = { player: 0, enemy: 0 };
        currentBattleData.initialCounts[side] += entity.roster.length;

        let visualScale = entity.roster.length > 300 ? 5 : 1;

        for (let i = 0; i < entity.roster.length; i += visualScale) {
            let unitData = entity.roster[i];
            if (!unitData) continue;
			
			// 1. Safely resolve the template, falling back to a hardcoded default if the Roster fails
            let safeType = unitData.type || "Militia";
            let baseTemplate = (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits) 
                ? (UnitRoster.allUnits[safeType] || UnitRoster.allUnits["Militia"]) 
                : null;
			
// 2. Ultimate safety net: If it's STILL undefined, force a generic template
            if (!baseTemplate) {
                baseTemplate = { name: "Militia", role: "infantry", isLarge: false, health: 100 };
            }
            let offsetX = (Math.random() - 0.5) * 600;
            let offsetY = (Math.random() - 0.5) * 50;
            let tacticalOffset = getTacticalPosition(baseTemplate.role, side);

let unitStats = Object.assign(new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction), baseTemplate);
            unitStats.experienceLevel = unitData.exp; 
            unitStats.morale = 20; // Ensure veterans start fresh with full morale
unitStats.factionColor=factionColor;
            battleEnvironment.units.push({
                id: Math.random().toString(36).substr(2, 9),
                side: side,
                faction: faction,
                color: factionColor,
                unitType: unitData.type,
                stats: unitStats,
                hp: unitStats.health, 
                x: spawnXCenter + offsetX + tacticalOffset.x,
                y: spawnY + offsetY + tacticalOffset.y,
                target: null,
                state: "idle",
                animOffset: Math.random() * 100,
                cooldown: 0
            });
        }
    }

// --- 2. INJECT MAIN PLAYER AVATAR ---
    if (side === "player") {
        // 1. Create persistent player stats ONLY if they don't exist yet
        if (!player.stats) {
            let pTemplate = UnitRoster.allUnits["Horse Archer"];
            player.stats = Object.assign(new Troop(pTemplate.name, pTemplate.role, pTemplate.isLarge, faction), pTemplate);
            
            player.stats.name = "Commander";      
            player.stats.role = "horse_archer";   
            player.stats.meleeAttack += 55; // Initial hero buff
            player.stats.accuracy += 80;    // Initial hero buff
        }

        // 2. Sync HP for the upcoming battle
        player.stats.health = player.hp > 0 ? player.hp : 100; 

        let battleSpawnX = BATTLE_WORLD_WIDTH / 2;
        let battleSpawnY = BATTLE_WORLD_HEIGHT - 200;

        // 3. Create the battle entity, using the persistent overworld stats
        let avatarObj = {
            id: "MAIN_PLAYER_AVATAR",
            side: "player",
            isCommander: true, 
            faction: faction,
            color: "#ffffff", 
            unitType: "Horse Archer", 
            stats: player.stats,  
            hp: player.stats.health,
            x: battleSpawnX, 
            y: battleSpawnY,
            target: null,
            state: "idle",
            animOffset: 0,
            cooldown: 0
        };

        battleEnvironment.units.push(avatarObj);
        cachedCommander = avatarObj;
		
        player.x = battleSpawnX;
        player.y = battleSpawnY;
    }
}; 

// --- 3. HOOK TACTICAL AI (Logic Only) ---
const originalUpdateBattleUnits = updateBattleUnits;

updateBattleUnits = function() {
    let avatar =cachedCommander; 

if (avatar && avatar.hp > 0) {
        if (player.isMoving) {
            avatar.x = player.x; 
            avatar.y = player.y;
            avatar.state = "moving"; // Triggers leg animation
        } else {
            avatar.state = "idle";   // Stops leg animation
}}

    originalUpdateBattleUnits(); 

    if (avatar) {
        if (!player.isMoving && avatar.hp > 0) {
            player.x = avatar.x;
            player.y = avatar.y;
        }
        player.hp = Math.max(0, avatar.hp); 
    }

    if (avatar && avatar.hp <= 0 && !currentBattleData.playerDefeatedText) {
        currentBattleData.playerDefeatedText = true;
        player.hp = 0;
    }
};

// --- 3.5 NEW: HOOK DRAW BATTLE UNITS (Death UI Rendering) ---
const originalDrawBattleUnits = drawBattleUnits;

drawBattleUnits = function(ctx) {
    originalDrawBattleUnits(ctx); // Draw standard units first
// SURGERY: Use the cache here too!
    let avatar = cachedCommander;
    // FIX: Check the persistent flag so the UI stays even when the engine deletes your dead body!
    if (inBattleMode && currentBattleData && currentBattleData.playerDefeatedText) {
        ctx.save();
        ctx.resetTransform(); 
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "black";

        ctx.font = "bold 36px Georgia";
        ctx.fillStyle = "#ff5252"; 
        ctx.fillText("YOU HAVE FALLEN", canvas.width / 2, canvas.height / 2 - 30);

        ctx.font = "bold 22px Georgia";
        ctx.fillStyle = "#ffffff"; 
        ctx.fillText("You managed to escape and recover.", canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.font = "italic 18px Georgia";
        ctx.fillStyle = "#ffca28"; 
        ctx.fillText("Press [P] to return to the world map", canvas.width / 2, canvas.height / 2 + 60);

        ctx.restore();
    } else if (inBattleMode && avatar && avatar.hp > 0) {
        // Standard Top-Right Reminder (Only shown while alive)
        ctx.save();
        ctx.resetTransform(); 
        ctx.textAlign = "right";
        ctx.font = "bold 18px Georgia";
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
 
        ctx.fillStyle = "#ffca28"; 
        ctx.fillText("Press [P] to exit when battle is over", canvas.width - 20, 30);
        ctx.restore();
    }
};

// --- 4. HOOK BATTLE EXIT (Fixes Teleportation & UI bugs) ---
const originalLeaveBattlefield = leaveBattlefield;
leaveBattlefield = function(playerObj) {
    // A. Capture ONLY living survivors (hp > 0)
    let pSurvivors = battleEnvironment.units.filter(u => u.side === "player" && !u.isCommander && u.hp > 0);
    let eSurvivors = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0);
    let enemyRef = currentBattleData.enemyRef;

// B. Rebuild Player Roster - One survivor = One entry
    playerObj.roster = [];
    pSurvivors.forEach(u => {
        // If enemy is wiped out, give a massive +1.0 level. If retreating, just 0.05.
        let troopExpReward = (eSurvivors.length === 0) ? 0.2 : 0.1;
        u.stats.experienceLevel = (u.stats.experienceLevel || 1) + troopExpReward;
        
        playerObj.roster.push({ 
            type: u.unitType, 
            exp: u.stats.experienceLevel 
        });
    });

// --- COMMANDER PROGRESSION ---
    if (cachedCommander && playerObj.stats) {
        // Check for victory (no enemies left alive)
        let isVictory = eSurvivors.length === 0;
        
        // Massive payout for victory (50), tiny trickle for retreat (0.1)
        let expReward = isVictory ? 1 : 0.2; 

        // Gain Commander Avatar XP
        if (typeof playerObj.stats.gainExperience === 'function') {
            playerObj.stats.gainExperience(expReward);
        } else {
            playerObj.stats.experienceLevel += expReward;
        }

        // IMPORTANT: Also trigger the Global Player level up system!
        if (isVictory && typeof gainPlayerExperience === 'function') {
            gainPlayerExperience(expReward);
        }
        
        // Sync HP back to the overworld
        playerObj.hp = cachedCommander.hp;
    }

// C. Rebuild Enemy Roster - One survivor = One entry
    if (enemyRef) {
        enemyRef.roster = [];
        eSurvivors.forEach(u => {
            // Apply XP gain for survivors
            u.stats.experienceLevel = (u.stats.experienceLevel || 1) + 0.05;
            enemyRef.roster.push({ 
                type: u.unitType, 
                exp: u.stats.experienceLevel 
            });
        });
        // Set count initially, but we will force-sync it again after the original engine call
        enemyRef.count = enemyRef.roster.length;
    }

    // --- PLAYER STAT FEATURES (KEPT) ---
    // Safety floor for HP
    if (playerObj.hp <= 1) playerObj.hp = 100;
    
    // Commander Ammo Reset (Your requested feature)
    if (playerObj.stats) {
        playerObj.stats.ammo = 30; // Resets the actual stat used in battle
    }

// --- NEW: LOOT & BOUNTY SYSTEM ---
    if (enemyRef) {
        let eInitial = (currentBattleData.initialCounts && currentBattleData.initialCounts.enemy) ? currentBattleData.initialCounts.enemy : 0;
        let eLost = Math.max(0, eInitial - eSurvivors.length);
        
        // Base Loot: 3 gold for every enemy fallen
        let totalLoot = eLost * 3;

        // Bounties based on NPC Role
        if (enemyRef.role === "Bandit") {
            totalLoot += 50; // Flat bounty for clearing a bandit party
        } else if (enemyRef.role === "Trader") {
            totalLoot += 300; // High reward for raiding caravans (but you'd usually lose rep!)
        } else if (enemyRef.role === "Patrol") {
            totalLoot += 10; // Small military bonus
        }

        playerObj.gold += totalLoot;
        
        // Store loot amount temporarily so the UI can show it
        currentBattleData.lastLootEarned = totalLoot;
    }
	
    // D. Call original engine cleanup
    // Note: This cleans up memory/UI, but its count math might be wrong...
    originalLeaveBattlefield(playerObj);

    // E. FINAL TRUTH SYNC: Overwrite engine math with the Roster reality
    // This ensures that if 1 man survives, the count is EXACTLY 1.
    playerObj.troops = playerObj.roster.length;
    if (enemyRef) {
        enemyRef.count = enemyRef.roster.length;
    }

    // E. Cleanup the reference for the next battle
    cachedCommander = null;
};
// --- 5. OVERRIDE BATTLE SUMMARY UI (Center Text & Map Return) ---
const originalCreateBattleSummaryUI = createBattleSummaryUI;

createBattleSummaryUI = function(...args) {
    // 1. Run the base function to trigger background events and generate the button
    originalCreateBattleSummaryUI(...args);

    let summaryDiv = document.getElementById('battle-summary');
    if (summaryDiv) {
		let closeBtn = summaryDiv.querySelector('button');

        // ---> SURGERY: Teleport to overworld immediately <---
        if (player.isSieging || (currentBattleData && currentBattleData.playerDefeatedText)) {
            if (closeBtn) {
                closeBtn.click(); // This calls leaveBattlefield() automatically
            }
            // Hide this summary box so it doesn't overlap the Siege GUI
            summaryDiv.style.display = 'none'; 
            return;
        }

        // 3. WIPE the div completely to remove the original base-game text
        summaryDiv.innerHTML = '';

        // 4. Apply your layout styling
        summaryDiv.style.textAlign = "center";
        summaryDiv.style.display = "flex";
        summaryDiv.style.flexDirection = "column";
        summaryDiv.style.alignItems = "center";
        summaryDiv.style.justifyContent = "center";
        
        summaryDiv.style.position = "absolute";
        summaryDiv.style.left = "50%";
        summaryDiv.style.top = "50%";
        summaryDiv.style.transform = "translate(-50%, -50%)";

        // --- 5. COMBINED CASUALTY & DESERTION REPORT (The Reliable Data) ---
        let pSurvivors = battleEnvironment.units.filter(u => u.side === "player" && u.hp > 0 && !u.isCommander).length;
        let eSurvivors = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length;
        
        let pInitial = (currentBattleData.initialCounts && currentBattleData.initialCounts.player) ? currentBattleData.initialCounts.player : pSurvivors;
        let eInitial = (currentBattleData.initialCounts && currentBattleData.initialCounts.enemy) ? currentBattleData.initialCounts.enemy : eSurvivors;

        let pLost = Math.max(0, pInitial - pSurvivors);
        let eLost = Math.max(0, eInitial - eSurvivors);

        // --- 6. BUILD UI: Status Message ---
        let statusText = document.createElement('p');
        statusText.style.color = "#ffca28";
        statusText.style.fontWeight = "bold";
        statusText.style.fontSize = "16px";

        let text = "RETREAT: You have left the battlefield.";
        if (currentBattleData && currentBattleData.playerDefeatedText) {
            text = "They left you to die but you were saved by a villager";
        } else if (args[0] && typeof args[0] === 'string' && args[0].includes("Victory")) {
            text = "VICTORY: Your forces have secured the field!";
        }
        statusText.innerText = text;
        summaryDiv.appendChild(statusText);

        // --- 7. BUILD UI: Custom Loss Report ---
        let lossReport = document.createElement('div');
        lossReport.style.marginTop = "10px";
        lossReport.style.color = "#eeeeee"; 
        lossReport.style.fontSize = "11px";
        lossReport.style.fontFamily = "monospace";
       lossReport.innerHTML = `Player Casualties: <span style="color:#ff5252">${pLost}</span> | Enemy Casualties: <span style="color:#ff5252">${eLost}</span>`;
	   summaryDiv.appendChild(lossReport);

        // --- 8. RESTORE UI: Put the button back at the bottom ---
        if (closeBtn) {
            closeBtn.innerText = "Close";
            closeBtn.style.marginTop = "20px"; // Optional: adds a little spacing above the button
            summaryDiv.appendChild(closeBtn);
        }
    }
};