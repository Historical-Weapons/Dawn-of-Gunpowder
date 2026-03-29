// ============================================================================
// SIEGE SYSTEM - Attrition, Sallying Out & Conquest
// ============================================================================

let activeSieges = [];

let pendingSallyOut = null;

 
function initiateSiege(attacker, city) {
    // ---> GATEKEEPER: Only the Player or Military Armies can lay siege <---
    if (!attacker.isPlayer && attacker.role !== "Military") {
        return; 
    }

    // Prevent duplicate sieges on the same city
    if (activeSieges.some(s => s.defender === city)) return;

    let attackerName = attacker.isPlayer ? "Your forces" : `${attacker.faction} ${attacker.role}s`;
    console.log(`${attackerName} have laid siege to ${city.name}!`);

    // 1. LOCK STATES & CLEAR TARGETS
    attacker.isSieging = true;
	city.isUnderSiege = true;   
    attacker.battleTarget = null;
    attacker.battlingTimer = 0;
    
    if (!attacker.isPlayer) {
        attacker.waitTimer = 100; 
        attacker.targetX = city.x;
        attacker.targetY = city.y;
    } else {
        // Force the player to stand ground visually near the city
        attacker.x = city.x;
        attacker.y = city.y + (city.radius || 25) + 20;
        attacker.isMoving = false;
    }

    activeSieges.push({
        id: Math.random().toString(36).substr(2, 9),
        attacker: attacker,
        defender: city,
        ticks: 0
    });
}
// 1. Update Initialization to show the new GUI
function initiatePlayerSiege(city) {
    if (player.troops <= 0) {
        alert("You have no troops to lay siege!");
        return;
    }

    player.isPlayer = true; 
    initiateSiege(player, city);
    
    // Hide city panel
	
    document.getElementById('city-panel').style.display = 'none';


    // Show persistent Siege GUI
    const gui = document.getElementById('siege-gui');
    if (gui) {
        gui.style.display = 'block';
        document.getElementById('gui-assault-btn').style.display = 'block';
        document.getElementById('gui-leave-btn').style.display = 'block';
        document.getElementById('gui-sally-btn').style.display = 'none';
        
        const statusText = document.getElementById('siege-status-text');
        statusText.innerText = "STATUS: Encircling the city...";
        statusText.style.color = "#ffca28";
    }
	
	const contBtn = document.getElementById('gui-continue-btn');
    if (contBtn) contBtn.style.display = 'none';
	
}


function resumeSiege() {
    const siege = activeSieges.find(s => s.attacker === player || s.attacker.isPlayer);
    if (siege) siege.isPaused = false;
    
    document.getElementById('gui-continue-btn').style.display = 'none';
    document.getElementById('gui-assault-btn').style.display = 'block';
    
    const statusText = document.getElementById('siege-status-text');
    if (statusText) {
        statusText.innerText = "STATUS: Encircling the city...";
        statusText.style.color = "#ffca28";
    }
}


// 2. Safely end the siege and hide the GUI
function endSiege(success = false) {
    player.isSieging = false;
    
	    // SURGERY: Reset Buttons
    const sBtn = document.getElementById('siege-button');
    const aBtn = document.getElementById('assault-button');
    if(sBtn) sBtn.style.display = 'block';
    if(aBtn) aBtn.style.display = 'none';
	
    // Remove player siege from active list
    activeSieges = activeSieges.filter(s => !s.attacker.isPlayer);

    if (success) {
        console.log("City Captured!");
    } else {
        console.log("Siege abandoned safely.");
    }
    
    if(document.getElementById('siege-gui')) document.getElementById('siege-gui').style.display = 'none';
}

function promptSallyOut(siege, defenderMilitary, attackerCount) {
    pendingSallyOut = { siege, defenderMilitary, attackerCount };
    
    const sallyBtn = document.getElementById('gui-sally-btn');
    const leaveBtn = document.getElementById('gui-leave-btn');
    const assaultBtn = document.getElementById('gui-assault-btn');
    const statusText = document.getElementById('siege-status-text');

    if (sallyBtn) {
        sallyBtn.style.display = 'block';
        if (leaveBtn) leaveBtn.style.display = 'none'; // HIDE LEAVE
        if (assaultBtn) assaultBtn.style.display = 'none'; // HIDE ASSAULT
        
        statusText.innerText = "CRITICAL: The garrison is sallying out!";
        statusText.style.color = "#ff5252";
        
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('battle_shout');
    }
}
	
	
function updateSieges() {
    for (let i = activeSieges.length - 1; i >= 0; i--) {
        let siege = activeSieges[i];
        let atk = siege.attacker;
        let def = siege.defender;

        let attackerCount = atk.isPlayer ? player.troops : atk.count;
		let attackerDead = atk.isPlayer ? (player.troops <= 0) : atk.count <= 0;
        
        let isInBattle = atk.isPlayer ? (typeof inBattleMode !== 'undefined' && inBattleMode) : (atk.battlingTimer > 0);
// Locate this in updateSieges()
if (attackerDead || isInBattle) {
    console.log(`The siege of ${def.name} has been broken!`);
    
    // MOVE THIS HERE (Outside the death check)
    if (atk.isPlayer) {
        const sBtn = document.getElementById('siege-button');
        const aBtn = document.getElementById('assault-button');
        if(sBtn) sBtn.style.display = 'block';
        if(aBtn) aBtn.style.display = 'none';
    }

    if (atk.isPlayer && player.troops <= 0) {
        // ... status text and alert logic ...
        const gui = document.getElementById('siege-gui');
        if(gui) gui.style.display = 'none';
    }

    atk.isSieging = false;
    def.isUnderSiege = false;
    activeSieges.splice(i, 1);
    continue;
	}

// 2. ADD THIS LINE RIGHT HERE: Block attrition if paused
        if (siege.isPaused) continue;
		
        siege.ticks++;

        // Continually enforce the movement lock
        if (!atk.isPlayer) atk.waitTimer = 50; 
        else atk.isMoving = false; 
// --- NEW SALLY OUT LOGIC ---
        let defenderMilitary = def.militaryPop || def.troops || 0;

// Condition: Defenders MUST outnumber attacker to trigger this event
        if (defenderMilitary > attackerCount && Math.random() < 0.00005) {         //for DEBUGGING I HAVE IT AS LOWER BUT ORIGINAL IS 0.005
            console.log(`${def.name} garrison sallies out to break the siege!`);

			if (atk.isPlayer) {
                const statusText = document.getElementById('siege-status-text');
                if(statusText) {
                    statusText.innerText = "STATUS: DEFENDERS ATTACKING!";
                    statusText.style.color = "#ff5252";
                }
                
			promptSallyOut(siege, defenderMilitary, attackerCount);
                // Return here prevents ticks from continuing while frozen
                continue; // SURGERY: Changed return to continue
			}
            // NPC vs NPC Logic
            let atkLoss = Math.floor(defenderMilitary * 0.4);
            let defLoss = Math.floor(attackerCount * 0.4);
            atk.count = Math.max(0, (atk.count || 0) - atkLoss);
            def.militaryPop = Math.max(0, defenderMilitary - defLoss);
            def.isUnderSiege = false;
            atk.isSieging = false;
            activeSieges.splice(i, 1);
            continue;
        }
		
		
        // 3. WAR OF ATTRITION
        if (siege.ticks % 60 === 0) {
            
            let defConsumption = Math.max(
                1,
                Math.floor((def.pop * 0.01) + (def.militaryPop * 0.03))
            );
            def.food -= defConsumption;
            
            // weaker attacker drain
            let atkConsumption = Math.max(1, Math.floor(attackerCount * 0.03)); 
            if (atk.isPlayer) player.food -= atkConsumption;
            else atk.food -= atkConsumption;

            let currentAtkFood = atk.isPlayer ? player.food : atk.food;

// Resolve Attacker Starvation
            if (currentAtkFood <= 0) {
                if (atk.isPlayer) player.food = 0; else atk.food = 0;
                
                let attrition = Math.max(1, Math.ceil(attackerCount * 0.05));
                if (atk.isPlayer) {
                    player.troops -= attrition;
                    if(player.roster && player.roster.length > 0) player.roster.pop();
                    
                    // Update GUI Status Text to reflect starvation deaths
                    const statusText = document.getElementById('siege-status-text');
                    if (statusText) {
                        statusText.innerText = `STATUS: STARVING! (-${attrition} troops. ${player.troops} left)`;
                        statusText.style.color = "#ff5252";
                    }
                } else {
                    atk.count -= attrition;
                }
            }

// 3. REBALANCED WAR OF ATTRITION (Targets ~3 minute total siege)
            // Resolve Defender Starvation
            if (def.food <= 0) {
                def.food = 0;

                // BALANCE: Lose 2% of garrison per second (assuming 1 tick per sec here)
                // This ensures even a large garrison of 500 melts away in ~100 seconds after food is gone.
                let garrisonDamage = Math.max(2, Math.floor(def.militaryPop * 0.02));
                def.militaryPop -= garrisonDamage;
                def.pop -= Math.floor(garrisonDamage * 0.5); // Population stays slightly more resilient

                // --- UI SURGERY: UPDATE STATUS TEXT ---
                if (atk.isPlayer) {
                    const statusText = document.getElementById('siege-status-text');
                    if (statusText) {
                        statusText.innerText = "STATUS: DEFENDERS STARVING";
                        statusText.style.color = "#ffa500"; // Orange for starvation
                    }
                }

                // Conquest Triggered
                if (def.militaryPop <= 0) {
                    let conqueringFaction = atk.isPlayer ? player.faction : atk.faction;
                    let conqueringColor = atk.isPlayer ? "#FFFFFF" : atk.color;
                    
                    console.log(`${def.name} has fallen to ${conqueringFaction}!`);
                    
                    // Update City Ownership
                    def.faction = conqueringFaction;
                    def.color = conqueringColor;
                    
                    // Occupying Force: Take 30% of the attacking army to become the new garrison
                    let occupyingForce = Math.max(5, Math.floor(attackerCount * 0.3));
                    def.militaryPop = occupyingForce;
                    def.troops = occupyingForce;
                    def.pop += occupyingForce;
                    
                    if (atk.isPlayer) {
                        player.troops -= occupyingForce;
                        
                        // --- UI SURGERY: FINAL VICTORY STATUS ---
                        const statusText = document.getElementById('siege-status-text');
                        if (statusText) statusText.innerText = "STATUS: CITY CAPTURED!";
                        
                        alert(`Victory! ${def.name} has starved into submission. It is now yours.\n\nYou left ${occupyingForce} troops behind as a garrison.`);
                        
                        // Close Siege GUI
                        atk.isSieging = false;
                        document.getElementById('siege-gui').style.display = 'none';
                    } else {
                        atk.count -= occupyingForce;
                        atk.isSieging = false;
                        atk.targetCity = null; 
                    }

                    def.isUnderSiege = false;
                    activeSieges.splice(i, 1);
                }
            }
        }
    }
}

function drawSiegeVisuals(ctx) {
    activeSieges.forEach(s => {
        let def = s.defender;
        let atk = s.attacker;
        let attackerCount = atk.isPlayer ? player.troops : atk.count;
        let defenderCount = def.militaryPop || def.troops || 0;
        
        let attackerFood = atk.isPlayer ? player.food : atk.food;
        let defenderFood = def.food;

        ctx.save();
        ctx.beginPath();
        ctx.arc(def.x, def.y, (def.radius || 20) + 18, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(220, 50, 47, 0.8)";
        ctx.lineWidth = 3;
        
        // Animated dashes for visual flavor
        ctx.setLineDash([8, 6]); 
        ctx.lineDashOffset = -(Date.now() / 50) % 14; 
        ctx.stroke();
        
        ctx.textAlign = "center";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;

        // "UNDER SIEGE" text
        ctx.fillStyle = "#ff5252";
        ctx.font = "bold 13px Georgia";
        ctx.fillText("UNDER SIEGE", def.x, def.y - (def.radius || 20) - 40);

        // ⛺ Attacker Stats (Stacked above defender)
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px Arial, 'Segoe UI Emoji'";
        ctx.fillText(`⛺ ${attackerCount} (🍖 ${Math.floor(attackerFood)})`, def.x, def.y - (def.radius || 20) - 24);
        
        // 🏰 Defender Stats
        ctx.fillText(`🏰 ${defenderCount} (🍖 ${Math.floor(defenderFood)})`, def.x, def.y - (def.radius || 20) - 8);

        ctx.restore();
    });
}

function resolveSallyOut(choice) {
    if (!pendingSallyOut) return;
    const siege = pendingSallyOut.siege;
    const def = siege.defender;

    // 1. IMMEDIATELY HIDE AND DISABLE GUI TO PREVENT DOUBLE-CLICKING
    const siegeGui = document.getElementById('siege-gui');
    const leaveBtn = document.getElementById('gui-leave-btn');
    const sallyBtn = document.getElementById('gui-sally-btn');
    const assaultBtn = document.getElementById('gui-assault-btn');

    if (choice === 'attack') {
		if (sallyBtn) sallyBtn.style.display = 'none';
        // HIDE EVERYTHING so it doesn't show up during the battle
        siegeGui.style.display = "none";
        
        // Prepare the transition
        console.log(`Sally out triggered! Defenders of ${def.name} are attacking!`);
        
        if (typeof enterBattlefield === "function" && typeof generateNPCRoster === "function") {
            const garrisonForce = {
                faction: def.faction,
                role: "Garrison (Sally Out)",
                count: def.militaryPop || 50,
                roster: generateNPCRoster("Military", def.militaryPop || 50, def.faction),
                isSallyOut: true 
            };
            
            // Trigger battle
            // FIXED: Swapped arguments to (Enemy, Player) and added terrain object to fix the .name error
            enterBattlefield(garrisonForce, player, { name: "Plains", speed: 1.0 });
            
            // We do NOT delete the siege yet because the player might survive and continue it
        }
    }
    
    pendingSallyOut = null;
}


function triggerSiegeAssault() {
    const currentSiege = activeSieges.find(s => s.attacker.isPlayer);
    if (!currentSiege) {
        alert("You are not currently besieging a settlement!");
        return;
    }

    // SURGERY: Reset Buttons for the world map UI
    const sBtn = document.getElementById('siege-button');
    const aBtn = document.getElementById('assault-button');
    if(sBtn) sBtn.style.display = 'block';
    if(aBtn) aBtn.style.display = 'none';

    const city = currentSiege.defender;
 
    const defenderCount = city.militaryPop || city.troops || 0;

    // 2. Clear Siege States before entering battle
    player.isSieging = false;
    city.isUnderSiege = false;
    activeSieges = activeSieges.filter(s => s.id !== currentSiege.id);
    
    // Hide the GUI
    const gui = document.getElementById('siege-gui');
    if (gui) gui.style.display = 'none';

  
    console.log(`Assaulting ${city.name}! Transitioning to battlefield_system.js...`);
    
    if (typeof enterBattlefield === "function" && typeof generateNPCRoster === "function") {
        // Create a temporary NPC object out of the city garrison to feed into the battle engine
        const garrisonForce = {
            faction: city.faction,
            role: "Garrison",
            count: defenderCount,
            roster: generateNPCRoster("Military", defenderCount, city.faction),
            isCityGarrison: true // Custom flag you can use later in battlefield_system.js to spawn walls
        };
        
			// REPLACE WITH THIS:
					if (typeof enterSiegeBattlefield === "function") {
						enterSiegeBattlefield(garrisonForce, player, city);
					} else {
						// Fallback if siegebattle.js isn't loaded
						//enterBattlefield(garrisonForce, player, { name: "City Walls", speed: 0.8 });
					}
				}

	else {
        alert("Battlefield system not loaded! The assault failed.");
    }
}

function restoreSiegeAfterBattle(didPlayerWin) {
 
    const siege = activeSieges.find(s => s.attacker === player || s.attacker.isPlayer);
    if (!siege) return;

    siege.isPaused = true; 

    // Now that the map is visible in the background, show the UI
    const siegeGui = document.getElementById('siege-gui');
    const statusText = document.getElementById('siege-status-text');
    const leaveBtn = document.getElementById('gui-leave-btn');
    const sallyBtn = document.getElementById('gui-sally-btn');
    const assaultBtn = document.getElementById('gui-assault-btn');
    const continueBtn = document.getElementById('gui-continue-btn');

    if (siegeGui) siegeGui.style.display = 'block';
    if (leaveBtn) leaveBtn.style.display = 'block'; 
    if (sallyBtn) sallyBtn.style.display = 'none'; 
    if (assaultBtn) assaultBtn.style.display = 'none'; 
    if (continueBtn) continueBtn.style.display = 'block';

    if (didPlayerWin) {
        statusText.innerText = "VICTORY: The sally was repelled. What now?";
        statusText.style.color = "#8bc34a";
    } else {
        statusText.innerText = "DEFEAT: You retreated, but the blockade holds. What now?";
        statusText.style.color = "#ffca28";
    }
}