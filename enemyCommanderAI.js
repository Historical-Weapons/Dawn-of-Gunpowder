
 // ============================================================================
// ENEMY COMMANDER SKIRMISH AI (20s PHASE THEN MELEE RUSH)
// ============================================================================
function processEnemyCommanderAI(cmdr) {
    if (cmdr.hp <= 0 || cmdr.state === "FLEEING") return;

    // --- 0. THE 60-SECOND TIMER ---
    // Mark the exact millisecond the commander charge
    cmdr.skirmishStartTime = cmdr.skirmishStartTime || Date.now();
    let elapsed = Date.now() - cmdr.skirmishStartTime;
    let isSkirmishPhase = elapsed < 60000; // 60 seconds

    // --- 1. DECISION THROTTLING ---
    cmdr.aiTick = (cmdr.aiTick || 0) + 1;
    if (cmdr.aiTick % 10 !== 0 && cmdr.target && cmdr.target.hp > 0) {
        applySkirmishPhysics(cmdr);
        return;
    }

    let closestDist = Infinity;
    let closestEnemy = null;

    // --- 2. TARGET PERSISTENCE ---
    if (cmdr.target && cmdr.target.hp > 0) {
        let d = Math.hypot(cmdr.target.x - cmdr.x, cmdr.target.y - cmdr.y);
        if (d < 600) { 
            closestEnemy = cmdr.target;
            closestDist = d;
        }
    }

    if (!closestEnemy) {
        for (let u of battleEnvironment.units) {
            if (u.side === 'player' && u.hp > 0) {
                let d = Math.hypot(u.x - cmdr.x, u.y - cmdr.y);
                if (d < closestDist) {
                    closestDist = d;
                    closestEnemy = u;
                }
            }
        }
    }

    if (!closestEnemy) {
        cmdr.state = "idle";
        cmdr.isMoving = false;
        cmdr.vx *= 0.9; cmdr.vy *= 0.9; 
        return;
    }

    cmdr.target = closestEnemy;

    let dx = closestEnemy.x - cmdr.x;
    let dy = closestEnemy.y - cmdr.y;
    let angle = Math.atan2(dy, dx);
    cmdr.direction = dx > 0 ? 1 : -1;

// --- 3. PHASE LOGIC ---
    // Added safety check to ensure we also look at cmdr.stats.ammo
    if (!isSkirmishPhase || (cmdr.ammo || 0) <= 0 || (cmdr.stats && cmdr.stats.ammo <= 0)) {
        // ==========================================
        // PHASE 2: MELEE RUSH (No more arrows!)
        // ==========================================
        
        // CRITICAL FIX: Wipe ammo on BOTH the wrapper and the stats object
        cmdr.ammo = 0; 
        cmdr.isRanged = false; 
        if (cmdr.stats) {
            cmdr.stats.ammo = 0;
            cmdr.stats.isRanged = false;
            cmdr.stats.currentStance = "statusmelee"; // Instantly force melee stance
        }

        // SPEED FIX: Scale charge speed dynamically instead of a flat 4.5
        const baseSpeed = (cmdr.stats && cmdr.stats.speed) ? cmdr.stats.speed : 1.0;
        const chargeSpeed = baseSpeed * 1.0; // Gives a 0% charge bonus
        const meleeRange = 40;   // Get right in their face

        if (closestDist > meleeRange) {
            // CHARGE!
            cmdr.state = "moving";
            cmdr.isMoving = true;
            cmdr.targetVx = Math.cos(angle) * chargeSpeed;
            cmdr.targetVy = Math.sin(angle) * chargeSpeed;
        } else {
            // STRIKE!
            cmdr.state = "attacking"; 
            cmdr.isMoving = false;
            cmdr.targetVx = 0;
            cmdr.targetVy = 0;
        }
    } else {
        // ==========================================
        // PHASE 1: ANNOYING SKIRMISH (First 20s)
        // ==========================================
        const IDEAL_MIN = 200; 
        const IDEAL_MAX = 500; 
        const speed = 1.0; 

        if (closestDist < IDEAL_MIN) {
            // Retreat
            cmdr.state = "moving";
            cmdr.isMoving = true;
            cmdr.targetVx = -Math.cos(angle) * speed; 
            cmdr.targetVy = -Math.sin(angle) * speed; 
        } else if (closestDist > IDEAL_MAX) {
            // Advance cautiously
            cmdr.state = "moving";
            cmdr.isMoving = true;
            cmdr.targetVx = Math.cos(angle) * speed * 0.8;
            cmdr.targetVy = Math.sin(angle) * speed * 0.8;
        } else {
            // Hold and Shoot
            cmdr.state = "attacking"; 
            cmdr.isMoving = false;
            cmdr.targetVx = 0;
            cmdr.targetVy = 0;
        }
    }

    applySkirmishPhysics(cmdr);

    // --- 4. COMBAT EXECUTION ---
    // The ultimate safeguard: He is ONLY allowed to shoot if the 20-second
    // phase is active AND he actually has ammo.
    if (isSkirmishPhase && cmdr.state === "attacking" && cmdr.cooldown <= 0 && (cmdr.ammo || 0) > 0) {
        fireCommanderProjectile(cmdr, angle);
    }
    
    if (cmdr.cooldown > 0) cmdr.cooldown--;
}

function applySkirmishPhysics(cmdr) {
    const lerp = 0.15; 
    cmdr.vx = (cmdr.vx || 0) * (1 - lerp) + (cmdr.targetVx || 0) * lerp;
    cmdr.vy = (cmdr.vy || 0) * (1 - lerp) + (cmdr.targetVy || 0) * lerp;

    cmdr.x += cmdr.vx;
    cmdr.y += cmdr.vy;

    let margin = 60;
    cmdr.x = Math.max(margin, Math.min(BATTLE_WORLD_WIDTH - margin, cmdr.x));
    cmdr.y = Math.max(margin, Math.min(BATTLE_WORLD_HEIGHT - margin, cmdr.y));
}

function fireCommanderProjectile(cmdr, angle) {
    let projSpeed = 12;
    battleEnvironment.projectiles.push({
        x: cmdr.x, y: cmdr.y,
        vx: Math.cos(angle) * projSpeed,
        vy: Math.sin(angle) * projSpeed,
        startX: cmdr.x, startY: cmdr.y,
        maxRange: cmdr.stats.range || 650,
        attackerStats: cmdr.stats,
        side: cmdr.side,
        projectileType: "Arrow",
        isFire: false
    });

    if (typeof AudioManager !== 'undefined') AudioManager.playSound('arrow');
    cmdr.ammo--;
    cmdr.cooldown = 150;
}