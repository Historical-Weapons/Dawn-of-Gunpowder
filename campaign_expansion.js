// ============================================================================
// DAWN OF GUNPOWDER - CAMPAIGN EXPANSION (Bannerlord Rosters & Player Avatar)
// ============================================================================

// SURGERY: Cache the player avatar to stop array searching every frame
let cachedCommander = null; 
 

const originalDeployArmy = deployArmy;

// --- 1. OVERRIDE DEPLOY ARMY (Persistent Rosters & Player Avatar Injection) ---
deployArmy = function(faction, totalTroops, side) {
    let entity = side === "player" ? player : currentBattleData.enemyRef;
    let expectedCount = side === "player" ? entity.troops : entity.count;

    if (side === "player") {
        currentBattleData.playerDefeatedText = false; // Reset death flag for new battles
    }

    // Ensure entity exists and has a roster array initialized
    if (entity && !entity.roster) entity.roster = [];

    // SCENARIO A: First time fighting (Roster is empty)
    if (entity && entity.roster.length === 0 && expectedCount > 0) {
        // Let the original game generate the 11-faction composition visually
        originalDeployArmy(faction, totalTroops, side); 

        // Scrape the newly generated units into permanent memory
        let justSpawned = battleEnvironment.units.filter(u => u.side === side);
        let visualScale = totalTroops > 300 ? 5 : 1;

        justSpawned.forEach(u => {
            for(let i = 0; i < visualScale; i++) {
                entity.roster.push({ type: u.unitType, exp: 1 });
            }
        });
        
        // Trim to exact count to prevent rounding errors from visual scaling
        if (entity.roster.length > expectedCount) entity.roster.splice(expectedCount); 
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
        let factionColor = (typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#ffffff";

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
            color: "#ffca28", 
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
        // Increment unit experience
        u.stats.experienceLevel = (u.stats.experienceLevel || 1) + 0.1;
        
        playerObj.roster.push({ 
            type: u.unitType, 
            exp: u.stats.experienceLevel 
        });
    });
     

    // --- COMMANDER PROGRESSION ---
    if (cachedCommander && playerObj.stats) {
        // Gain Commander XP
        if (typeof playerObj.stats.gainExperience === 'function') {
            playerObj.stats.gainExperience(0.6);
        } else {
            playerObj.stats.experienceLevel += 0.6;
        }
        
        // Sync HP back to the overworld
        playerObj.hp = cachedCommander.hp;
    }

    // C. Rebuild Enemy Roster - One survivor = One entry
    if (enemyRef) {
        enemyRef.roster = [];
        eSurvivors.forEach(u => {
            u.stats.experienceLevel = (u.stats.experienceLevel || 1) + 0.05;
            enemyRef.roster.push({ 
                type: u.unitType, 
                exp: u.stats.experienceLevel 
            });
        });
        enemyRef.count = enemyRef.roster.length;
    }

// Safety floor for HP and reset persistent ammo
if (playerObj.hp <= 1) playerObj.hp = 100;
if (playerObj.stats) {
    playerObj.stats.ammo = 30; // Resets the actual stat used in battle
}

    // D. Call original engine cleanup
    originalLeaveBattlefield(playerObj);
	
	playerObj.troops = playerObj.roster.length;

    // E. Cleanup the reference for the next battle
    cachedCommander = null;
};

// --- 5. OVERRIDE BATTLE SUMMARY UI (Center Text & Map Return) ---
const originalCreateBattleSummaryUI = createBattleSummaryUI;

createBattleSummaryUI = function(...args) {
    originalCreateBattleSummaryUI(...args);

    let summaryDiv = document.getElementById('battle-summary');
    if (summaryDiv) {
        summaryDiv.style.textAlign = "center";
        summaryDiv.style.display = "flex";
        summaryDiv.style.flexDirection = "column";
        summaryDiv.style.alignItems = "center";
        summaryDiv.style.justifyContent = "center";
        
        summaryDiv.style.position = "absolute";
        summaryDiv.style.left = "50%";
        summaryDiv.style.top = "50%";
        summaryDiv.style.transform = "translate(-50%, -50%)";

        let p = document.createElement('p');
        p.style.color = "#ffca28";
        p.style.fontWeight = "bold";
        p.style.fontSize = "20px";

        // FIX: Safe string checking so game doesn't crash on wipeout
        let text = "RETREAT: You have left the battlefield.";
        if (currentBattleData && currentBattleData.playerDefeatedText) {
            text = "They left you to die but you were saved by a villager";
        } else if (args[0] && typeof args[0] === 'string' && args[0].includes("Victory")) {
            text = "VICTORY: Your forces have secured the field!";
        }
        
        p.innerText = text;
        summaryDiv.appendChild(p);

        // FIX: Do not overwrite the onclick handler, just change the text, so the base engine successfully returns to the map
        let closeBtn = summaryDiv.querySelector('button');
        if (closeBtn) {
            closeBtn.innerText = "Return to Map";
        }
    }
};