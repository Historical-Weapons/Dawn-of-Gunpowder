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

// --- 1. OVERRIDE DEPLOY ARMY (Persistent Rosters, 150 Cap & Player Avatar) ---
deployArmy = function(faction, totalTroops, side) {
    let entity = side === "player" ? player : currentBattleData.enemyRef;
    let expectedCount = side === "player" ? entity.troops : entity.count;

    if (side === "player") {
        currentBattleData.playerDefeatedText = false; // Reset death flag
    }

    if (entity && !entity.roster) entity.roster = [];

    // --- STEP 1: SYNC TRUE ROSTER ---
    // If roster is completely empty (first spawn)
    if (entity.roster.length === 0 && expectedCount > 0) {
        if (typeof generateNPCRoster === 'function') {
            entity.roster = generateNPCRoster(entity.role || "Military", expectedCount, faction);
        } else {
            for (let i = 0; i < expectedCount; i++) entity.roster.push({ type: "Militia", exp: 1 });
        }
    }
    // If returning veteran army, sync missing/starved troops
    else if (entity.roster.length > 0) {
        if (entity.roster.length < expectedCount) {
            let diff = expectedCount - entity.roster.length;
            for (let i = 0; i < diff; i++) entity.roster.push({ type: "Militia", exp: 1 });
        } else if (entity.roster.length > expectedCount) {
            entity.roster.splice(expectedCount); 
        }
    }

    // --- STEP 2: STORE TRUE TOTALS FOR POST-BATTLE MATH ---
    if (!currentBattleData.trueInitialCounts) currentBattleData.trueInitialCounts = { player: 0, enemy: 0 };
    currentBattleData.trueInitialCounts[side] = entity.roster.length;

    // --- STEP 3: OPTIMIZATION (THE 150 CAP & RESERVES) ---
    // 1. Shuffle the roster to ensure random troop selection
    for (let i = entity.roster.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [entity.roster[i], entity.roster[j]] = [entity.roster[j], entity.roster[i]];
    }

    // 2. Slice the roster into Battle (Max 150) and Reserve (The Rest)
    entity.battleRoster = entity.roster.slice(0, 150);
    entity.reserveRoster = entity.roster.slice(150);

    // 3. Sort the battle roster by type so units clump together cleanly on the field
    entity.battleRoster.sort((a, b) => (a.type || "A").localeCompare(b.type || "A"));

    // --- STEP 4: PHYSICAL SPAWN ---
    let spawnY = side === "player" ? BATTLE_WORLD_HEIGHT - 300 : 300;
    let spawnXCenter = BATTLE_WORLD_WIDTH / 2;
    let factionColor = (side === "player") ? "#ffffff" : ((typeof FACTIONS !== 'undefined' && FACTIONS[faction]) ? FACTIONS[faction].color : "#ffffff");

    // Siege Defender Override
    if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && side === "enemy") {
        let southGate = typeof overheadCityGates !== 'undefined' ? overheadCityGates.find(g => g.side === "south") : null;
        if (southGate) spawnY = (southGate.y * BATTLE_TILE_SIZE) - 600;
        else spawnY = BATTLE_WORLD_HEIGHT - 1000;
    }

    let totalLineWidth = 0;
    const spacingX = 18;
    const spacingY = 16;
    const groupGap = 40;
    const unitsPerRow = 15;
    const rankDir = (side === "player") ? 1 : -1;

    // Calculate line width to center the army perfectly
    let deployedCounts = {};
    entity.battleRoster.forEach(u => { deployedCounts[u.type] = (deployedCounts[u.type] || 0) + 1; });
    for (let [type, count] of Object.entries(deployedCounts)) {
        let baseT = (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits[type]) ? UnitRoster.allUnits[type] : { role: "infantry" };
        if (!baseT.role.toLowerCase().includes("cavalry") && !baseT.role.toLowerCase().includes("horse")) {
            let groupWidth = Math.min(count, unitsPerRow) * spacingX;
            totalLineWidth += groupWidth + groupGap;
        }
    }
    
    let currentLineXOffset = -(totalLineWidth / 2);
    let currentType = null;
    let typeIndex = 0;

    // Deploy ONLY the 150 units natively (1:1 ratio, no visual bloat)
    for (let i = 0; i < entity.battleRoster.length; i++) {
        let unitData = entity.battleRoster[i];
        let safeType = unitData.type || "Militia";
        let baseTemplate = (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits) 
            ? (UnitRoster.allUnits[safeType] || UnitRoster.allUnits["Militia"]) 
            : { name: "Militia", role: "infantry", isLarge: false, health: 100 };

        if (currentType !== safeType) {
            if (currentType !== null) {
                let prevTemplate = (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits[currentType]) ? UnitRoster.allUnits[currentType] : { role: "infantry" };
                if (!prevTemplate.role.toLowerCase().includes("cavalry") && !prevTemplate.role.toLowerCase().includes("horse")) {
                    currentLineXOffset += Math.min(typeIndex, unitsPerRow) * spacingX + groupGap;
                }
            }
            currentType = safeType;
            typeIndex = 0;
        }

        const isFlank = baseTemplate.role.toLowerCase().includes("cavalry") || baseTemplate.role.toLowerCase().includes("horse");
        let row = Math.floor(typeIndex / unitsPerRow);
        let col = typeIndex % unitsPerRow;

        let finalX, finalY;

        if (typeof inSiegeBattle !== 'undefined' && inSiegeBattle && side === "enemy") {
            let angle = (i * 0.5) + (Math.random() * Math.PI * 2);
            let dist = (Math.sqrt(i) * 12) + (Math.random() * 20);
            finalX = spawnXCenter + Math.cos(angle) * dist + (Math.random() - 0.5) * 15;
            finalY = spawnY + Math.sin(angle) * dist + (Math.random() - 0.5) * 15;
        } else {
            let tacticalOffset = getTacticalPosition(baseTemplate.role, side, safeType);
            if (isFlank) {
                let groupWidth = Math.min(deployedCounts[safeType], unitsPerRow) * spacingX;
                let internalX = (col * spacingX) - (groupWidth / 2);
                finalX = spawnXCenter + tacticalOffset.x + internalX;
            } else {
                finalX = spawnXCenter + currentLineXOffset + (col * spacingX);
            }
            let gridY = row * spacingY * rankDir;
            finalY = spawnY + tacticalOffset.y + gridY;
            finalX += (Math.random() - 0.5) * 3;
            finalY += (Math.random() - 0.5) * 2;
        }

        let unitStats = Object.assign(new Troop(baseTemplate.name, baseTemplate.role, baseTemplate.isLarge, faction), baseTemplate);
        unitStats.experienceLevel = unitData.exp || 1; 
        unitStats.morale = 20; 
        unitStats.factionColor = factionColor;

        battleEnvironment.units.push({
            id: Math.random().toString(36).substr(2, 9),
            side: side,
            faction: faction,
            color: factionColor,
            unitType: safeType,
            stats: unitStats,
            hp: unitStats.health, 
            x: finalX,
            y: finalY,
            target: null,
            state: "idle",
            animOffset: Math.random() * 100,
            cooldown: 0
        });

        typeIndex++;
    }

    // --- STEP 5: INJECT MAIN PLAYER AVATAR ---
    if (side === "player") {
        if (!player.stats) {
            let pTemplate = UnitRoster.allUnits["Horse Archer"];
            player.stats = Object.assign(new Troop(pTemplate.name, pTemplate.role, pTemplate.isLarge, faction), pTemplate);
            player.stats.name = "Commander";      
            player.stats.role = "horse_archer";   
            player.stats.meleeAttack += 55;
            player.stats.accuracy += 80;   
        }

        player.stats.health = player.hp > 0 ? player.hp : 100; 
        let battleSpawnX = BATTLE_WORLD_WIDTH / 2;
        let battleSpawnY = BATTLE_WORLD_HEIGHT - 200;

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
        
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "black";

        ctx.font = "bold 36px Georgia";
        ctx.fillStyle = "#ff5252"; 
        ctx.fillText("YOU HAVE FALLEN", canvas.width / 2, canvas.height / 2 - 30);
 
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

const originalLeaveBattlefield = leaveBattlefield;
leaveBattlefield = function(playerObj) {
    let pSurvivors = battleEnvironment.units.filter(u => 
        u.side === "player" && 
        u.faction === playerObj.faction && 
        !u.isCommander && 
        u.hp > 0
    );
    let eSurvivors = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0);
    let enemyRef = currentBattleData.enemyRef;

    // A. Rebuild Player Roster
    playerObj.roster = [];
    pSurvivors.forEach(u => {
        let troopExpReward = (eSurvivors.length === 0) ? 0.2 : 0.1;
        u.stats.experienceLevel = (u.stats.experienceLevel || 1) + troopExpReward;
        playerObj.roster.push({ type: u.unitType, exp: u.stats.experienceLevel });
    });

    // ---> SURGERY: MERGE BACK PLAYER RESERVES <---
    if (playerObj.reserveRoster && playerObj.reserveRoster.length > 0) {
        playerObj.roster = playerObj.roster.concat(playerObj.reserveRoster);
        playerObj.reserveRoster = []; 
    }

    // --- COMMANDER PROGRESSION ---
    if (cachedCommander && playerObj.stats) {
        let isVictory = eSurvivors.length === 0;
        let expReward = isVictory ? 1 : 0.2; 
        if (typeof playerObj.stats.gainExperience === 'function') playerObj.stats.gainExperience(expReward);
        else playerObj.stats.experienceLevel += expReward;

        if (isVictory && typeof gainPlayerExperience === 'function') gainPlayerExperience(expReward);
        playerObj.hp = cachedCommander.hp;
    }

    // B. Rebuild Enemy Roster
    if (enemyRef) {
        enemyRef.roster = [];
        eSurvivors.forEach(u => {
            u.stats.experienceLevel = (u.stats.experienceLevel || 1) + 0.05;
            enemyRef.roster.push({ type: u.unitType, exp: u.stats.experienceLevel });
        });
        
        // ---> SURGERY: MERGE BACK ENEMY RESERVES <---
        if (enemyRef.reserveRoster && enemyRef.reserveRoster.length > 0) {
            enemyRef.roster = enemyRef.roster.concat(enemyRef.reserveRoster);
            enemyRef.reserveRoster = []; 
        }
        enemyRef.count = enemyRef.roster.length;
    }

    if (playerObj.hp <= 1) playerObj.hp = 100;
    if (playerObj.stats) playerObj.stats.ammo = 30;

    // C. LOOT SYSTEM 
    if (enemyRef) {
        // Calculate loot based on true initial sizes, not just the 150 limit
        let eInitial = (currentBattleData.trueInitialCounts && currentBattleData.trueInitialCounts.enemy) ? currentBattleData.trueInitialCounts.enemy : 0;
        let eLost = Math.max(0, eInitial - (enemyRef.roster ? enemyRef.roster.length : 0));
        
        let totalLoot = eLost * 3;
        if (enemyRef.role === "Bandit") totalLoot += 50; 
        else if (enemyRef.role === "Trader") totalLoot += 300; 
        else if (enemyRef.role === "Patrol") totalLoot += 10; 

        playerObj.gold += totalLoot;
        currentBattleData.lastLootEarned = totalLoot;
    }
    
    originalLeaveBattlefield(playerObj);

    // D. FINAL TRUTH SYNC
    playerObj.troops = playerObj.roster.length;
    if (enemyRef) enemyRef.count = enemyRef.roster.length;

    cachedCommander = null;
};

// --- 5. OVERRIDE BATTLE SUMMARY UI (Center Text & Accurate Mass Casualty Readout) ---
const originalCreateBattleSummaryUI = createBattleSummaryUI;

createBattleSummaryUI = function(...args) {
    originalCreateBattleSummaryUI(...args);

    let summaryDiv = document.getElementById('battle-summary');
    if (summaryDiv) {
        let closeBtn = summaryDiv.querySelector('button');
        if (player.isSieging) {
            if (closeBtn) closeBtn.click(); 
            summaryDiv.style.display = 'none'; 
            return;
        }

        summaryDiv.innerHTML = '';
        summaryDiv.style.textAlign = "center";
        summaryDiv.style.display = "flex";
        summaryDiv.style.flexDirection = "column";
        summaryDiv.style.alignItems = "center";
        summaryDiv.style.justifyContent = "center";
        
        summaryDiv.style.position = "absolute";
        summaryDiv.style.left = "50%";
        summaryDiv.style.top = "50%";
        summaryDiv.style.transform = "translate(-50%, -50%)";

        // ---> SURGERY: ACCURATE MATH (Field Survivors + Reserves) <---
        let pReserves = player.reserveRoster ? player.reserveRoster.length : 0;
        let pSurvivorsVisual = battleEnvironment.units.filter(u => u.side === "player" && u.faction === player.faction && !u.isCommander && u.hp > 0).length;
        let pSurvivorsTotal = pSurvivorsVisual + pReserves;
        let pInitial = currentBattleData.trueInitialCounts ? currentBattleData.trueInitialCounts.player : pSurvivorsTotal;
        let pLost = Math.max(0, pInitial - pSurvivorsTotal);

        let enemyRef = currentBattleData.enemyRef;
        let eReserves = (enemyRef && enemyRef.reserveRoster) ? enemyRef.reserveRoster.length : 0;
        let eSurvivorsVisual = battleEnvironment.units.filter(u => u.side === "enemy" && u.hp > 0).length;
        let eSurvivorsTotal = eSurvivorsVisual + eReserves;
        let eInitial = currentBattleData.trueInitialCounts ? currentBattleData.trueInitialCounts.enemy : eSurvivorsTotal;
        let eLost = Math.max(0, eInitial - eSurvivorsTotal);

        // UI Generation
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

        let lossReport = document.createElement('div');
        lossReport.style.marginTop = "10px";
        lossReport.style.color = "#eeeeee"; 
        lossReport.style.fontSize = "11px";
        lossReport.style.fontFamily = "monospace";
        lossReport.innerHTML = `Army Remaining: <span style="color:#8bc34a">${pSurvivorsTotal}</span> (-<span style="color:#ff5252">${pLost} lost</span>) | Enemy Remaining: <span style="color:#8bc34a">${eSurvivorsTotal}</span> (-<span style="color:#ff5252">${eLost} lost</span>)`;
        summaryDiv.appendChild(lossReport);

        if (closeBtn) {
            closeBtn.innerText = "Close";
            closeBtn.style.marginTop = "20px"; 
            summaryDiv.appendChild(closeBtn);
        }
    }
};