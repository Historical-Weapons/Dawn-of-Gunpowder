// ============================================================================
// SIEGE SYSTEM - Attrition, Sallying Out & Conquest
// ============================================================================

let activeSieges = [];

function initiateSiege(attacker, city) {
    // Prevent duplicate sieges on the same city
    if (activeSieges.some(s => s.defender === city)) return;

    let attackerName = attacker.isPlayer ? "Your forces" : `${attacker.faction} ${attacker.role}s`;
    console.log(`${attackerName} have laid siege to ${city.name}!`);

    // 1. LOCK STATES & CLEAR TARGETS
    attacker.isSieging = true;
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

function initiatePlayerSiege(city) {
    if (player.troops <= 0) {
        alert("You have no troops to lay siege!");
        return;
    }

    player.isPlayer = true; 
    initiateSiege(player, city);
    
    document.getElementById('city-panel').style.display = 'none';
}

function updateSieges() {
    for (let i = activeSieges.length - 1; i >= 0; i--) {
        let siege = activeSieges[i];
        let atk = siege.attacker;
        let def = siege.defender;

        let attackerCount = atk.isPlayer ? player.troops : atk.count;
        let attackerDead = atk.isPlayer ? (player.hp <= 0 || player.troops <= 0) : atk.count <= 0;
        
        // Check if attacker was ambushed by a military relief force
        let isInBattle = atk.isPlayer ? (typeof inBattleMode !== 'undefined' && inBattleMode) : (atk.battlingTimer > 0);

        // Break the siege if they die or are pulled into a field battle
        if (attackerDead || isInBattle) {
            console.log(`The siege of ${def.name} has been broken!`);
            atk.isSieging = false;
            activeSieges.splice(i, 1);
            continue;
        }

        siege.ticks++;

        // Continually enforce the movement lock
        if (!atk.isPlayer) atk.waitTimer = 50; 
        else atk.isMoving = false; 

        // 2. SALLY OUT MECHANIC (Defender Military Outnumbers Attacker 3:1)
        let defenderMilitary = def.militaryPop || def.troops || 0;
        if (defenderMilitary >= attackerCount * 3) {
            console.log(`${def.name} garrison sallies out! They outnumber the besiegers 3 to 1!`);
            atk.isSieging = false;
            
            if (atk.isPlayer) {
                if (typeof enterBattlefield === 'function' && typeof generateNPCRoster === 'function') {
                    // Generate an NPC object for the city garrison
                    let sallyForce = {
                        faction: def.faction,
                        role: "Military",
                        count: defenderMilitary,
                        roster: generateNPCRoster("Military", defenderMilitary, def.faction)
                    };
                    enterBattlefield(sallyForce, player, {name: "City Gates", speed: 0.8});
                }
            } else {
                // Auto-resolve Sally Out vs NPC
                atk.count -= Math.floor(defenderMilitary * 0.4);
                def.militaryPop -= Math.floor(attackerCount * 0.4);
                def.troops = def.militaryPop;
            }
            activeSieges.splice(i, 1);
            continue; // Skip the rest of the loop
        }

        // 3. WAR OF ATTRITION
        if (siege.ticks % 30 === 0) {
            
            let defConsumption = Math.floor(def.pop * 0.05); 
            def.food -= defConsumption;
            
            let atkConsumption = Math.floor(attackerCount * 0.1);
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
                } else {
                    atk.count -= attrition;
                }
            }

            // Resolve Defender Starvation
            if (def.food <= 0) {
                def.food = 0;
                let garrisonDamage = Math.max(1, Math.floor(def.militaryPop * 0.08));
                def.militaryPop -= garrisonDamage;
                def.pop -= garrisonDamage;

                // Conquest Triggered
                if (def.militaryPop <= 0) {
                    let conqueringFaction = atk.isPlayer ? player.faction : atk.faction;
                    let conqueringColor = atk.isPlayer ? "#FFFFFF" : atk.color;
                    
                    console.log(`${def.name} has fallen to ${conqueringFaction}!`);
                    
                    def.faction = conqueringFaction;
                    def.color = conqueringColor;
                    
                    let occupyingForce = Math.max(5, Math.floor(attackerCount * 0.3));
                    def.militaryPop = occupyingForce;
                    def.troops = occupyingForce;
                    def.pop += occupyingForce;
                    
                    if (atk.isPlayer) {
                        player.troops -= occupyingForce;
                        alert(`Victory! ${def.name} has starved into submission. It is now yours. You left ${occupyingForce} troops behind to hold the city.`);
                        atk.isSieging = false;
                    } else {
                        atk.count -= occupyingForce;
                        atk.isSieging = false;
                        atk.targetCity = null; 
                    }
                    
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
        ctx.font = "bold 12px Georgia";
        ctx.fillText("UNDER SIEGE", def.x, def.y - (def.radius || 20) - 25);

        // ⛺ Troop Ratio (Attacker : Defender Military)
        ctx.fillStyle = "#ffffff";
        // Use a fallback font to ensure the emojis render properly
        ctx.font = "11px Arial, 'Segoe UI Emoji'";
        ctx.fillText(`⛺ ${attackerCount} : ${defenderCount} 🏰`, def.x, def.y - (def.radius || 20) - 10);

        ctx.restore();
    });
}