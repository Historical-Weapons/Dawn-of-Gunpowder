
function drawDetailedChineseWagon(ctx, x, y, factionColor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.2, 1.2); // Balanced scale

    // --- 1. THE SHADOW ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- 2. THE CHASSIS (Heavy Timber) ---
    const woodDark = "#3e2723";
    const woodMid = "#5d4037";
    
    // Main base beams
    ctx.fillStyle = woodDark;
    ctx.fillRect(-28, 5, 56, 6); // Main floor
    ctx.fillStyle = woodMid;
    ctx.fillRect(-28, 5, 56, 2); // Top highlight of beam
    
    // Front shafts (The "Tongue" for the horse/ox)
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-28, 8);
    ctx.lineTo(-45, 12);
    ctx.stroke();

    // --- 3. THE CANVAS COVER (Barrel Vault) ---
    const canvasBase = "#d7ccc8"; // Aged parchment/canvas color
    const canvasShadow = "#bcaaa4";
    
    // Draw the main cloth body
    ctx.fillStyle = canvasBase;
    ctx.beginPath();
    ctx.moveTo(-25, 5);
    // The "Barrel" arch
    ctx.bezierCurveTo(-25, -35, 25, -35, 25, 5);
    ctx.fill();

    // DRAW THE "LINES" (Structural Ribs/Folds)
    // This gives it the realistic bamboo-frame look instead of a flat "salt" texture
    ctx.save();
ctx.beginPath();
ctx.moveTo(-25, 5);
ctx.bezierCurveTo(-25, -35, 25, -35, 25, 5);
ctx.closePath();
ctx.clip();

ctx.strokeStyle = "rgba(0,0,0,0.12)";
ctx.lineWidth = 1;

for (let i = -20; i <= 20; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 5);
    ctx.lineTo(i, -30);
    ctx.stroke();
}

ctx.restore();

    // Front/Back Openings (The dark interior look)
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(-25, 5);
    ctx.quadraticCurveTo(-25, -28, -18, -20);
    ctx.lineTo(-18, 5);
    ctx.fill();

    // --- 4. THE FACTION FLAG (Small & Detailed) ---
    ctx.strokeStyle = "#212121";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, -15);
    ctx.lineTo(15, -35); // Flag pole
    ctx.stroke();

    ctx.fillStyle = factionColor || "#cc0000";
    ctx.beginPath();
    ctx.moveTo(15, -35);
    ctx.lineTo(28, -30);
    ctx.lineTo(15, -25);
    ctx.fill();
    // Tiny flag detail
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();

    // --- 5. THE WHEELS (Large Chinese Spoked Wheels) ---
    // We draw two wheels, one slightly offset for 2.5D depth
    drawSpokedWheel(ctx, -16, 12, 10); // Front wheel
    drawSpokedWheel(ctx, 18, 12, 10);  // Back wheel

    ctx.restore();
}

function drawSpokedWheel(ctx, x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    
    // Outer Rim (Tire)
    ctx.strokeStyle = "#1a1a1a"; // Iron/Dark Wood rim
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Wood Rim
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
    ctx.stroke();

    // The Hub (Center)
    ctx.fillStyle = "#212121";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // The Spokes (12 Spokes for 13th Century style)
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(0, radius - 2);
        ctx.stroke();
    }

    ctx.restore();
}


function drawCavalryUnit(ctx, x, y, moving, frame, factionColor, isAttacking, type, side, unitName, isFleeing, cooldown, unitAmmo, unit, reloadProgress) {
    ctx.save();
    ctx.translate(x, y);
    
// --- DYNAMIC ARMOR RETRIEVAL ---
    let armorVal = 2; 
    
    // 1. BEST METHOD: Read directly from the physical unit on the battlefield
    if (unit && unit.stats && unit.stats.armor !== undefined) {
        armorVal = unit.stats.armor;
    } 
    // 2. BACKUP: Read from the global roster (Used for UI menu rendering)
    else if (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits[unitName]) {
        armorVal = UnitRoster.allUnits[unitName].armor;
    } 
    // 3. EMERGENCY FALLBACK: Name checks (Added Keshig here just in case)
    else if (unitName && (unitName.includes("Heavy") || unitName.includes("Elite") || unitName.includes("eshig") || type === "cataphract")) {
        armorVal = 40; 
    }

// This regex catches: "War Elephant", "warelephant", "ELEPHANT_HEAVY", "ArmoredElefant", etc.
    const elephantRegex = /eleph|elefa/i; 
    const isElephant = elephantRegex.test(type) || (unitName && elephantRegex.test(unitName));
    const isCamel = type === "camel" || (unitName && /camel/i.test(unitName));
  
	
    if (unitName === "PLAYER" || unitName === "Commander") armorVal = Math.max(armorVal, 10);

    let animFrame = frame || (Date.now() / 100);
    let dir = side === "player" ? 1 : -1;
 

    let isMoving = moving || (typeof vx !== 'undefined' && (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1));
    let legSwing = isMoving ? Math.sin(animFrame * 0.4) : 0; // Normalized for scaling
    let bob = isMoving ? Math.sin(animFrame * 0.4) * 2 : 0;
    
    // Default rider physics (adjusted later if mount is massive)
    let riderBob = isMoving ? Math.sin(animFrame * 0.4 + 0.5) * 1.5 : 0;
    let riderHeightOffset = 0; 
let baseMountHeight = -4; // Default Horse
if (isElephant) baseMountHeight = -80; // Lower spine relative to body center
if (isCamel)    baseMountHeight = 7;
 

    if (isElephant) {
		// Add a gentle, rhythmic weight shift so it doesn't statically lean
        let eSway = isMoving ? Math.sin(animFrame * 0.2) * 0.04 : 0;
        ctx.rotate(eSway);
		
        // ==========================================
        //      MASSIVE, HIGH-DETAIL ELEPHANT
        // ==========================================
        let eBob = bob * 1.5; // Heavier, slower bob for massive weight
        let eSwing = legSwing * 10; // Wider, lumbering stride
        let trunkSwing = isMoving ? Math.cos(animFrame * 0.4) * 6 : 0;
        let earFlap = isMoving ? Math.cos(animFrame * 0.4) * 4 : 0;

        let skinBase = "#757575";
        let skinDark = "#616161";
        let outline = "#424242";

        // 1. FAR LEGS (Thick, column-like)
        ctx.fillStyle = skinDark;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;

        // Far Back Leg
        ctx.beginPath(); ctx.roundRect(-22 + eSwing * 0.5, eBob - 5, 12, 28, 3); ctx.fill(); ctx.stroke();
        // Far Front Leg
        ctx.beginPath(); ctx.roundRect(18 - eSwing * 0.5, eBob - 5, 12, 28, 3); ctx.fill(); ctx.stroke();

        // 2. TAIL
        ctx.beginPath();
        ctx.moveTo(-33, eBob - 18);
        ctx.quadraticCurveTo(-42, eBob - 5, -38, eBob + 8);
        ctx.strokeStyle = outline; ctx.lineWidth = 2; ctx.stroke();
        // Tail tuft
        ctx.fillStyle = "#212121";
        ctx.beginPath(); ctx.arc(-38, eBob + 8, 3, 0, Math.PI * 2); ctx.fill();

        // 3. MAIN BODY (Exactly 3x Horse Size: 33x21 ellipse)
        ctx.fillStyle = skinBase;
        ctx.strokeStyle = outline;
        ctx.beginPath();
        ctx.ellipse(0, eBob - 15, 33, 22, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Body Wrinkles (Faint texture arcs)
        ctx.strokeStyle = "rgba(66, 66, 66, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let w = -20; w < 20; w += 8) {
            ctx.moveTo(w, eBob - 34);
            ctx.quadraticCurveTo(w + 6, eBob - 15, w - 2, eBob + 2);
        }
        ctx.stroke();

        // 4. HEAD & EYE
        ctx.fillStyle = skinBase;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(30, eBob - 20, 16, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = "#111"; // Beady eye
        ctx.beginPath(); ctx.arc(36, eBob - 24, 2, 0, Math.PI * 2); ctx.fill();

        // 5. SWINGING TRUNK
        ctx.beginPath();
        ctx.moveTo(42, eBob - 22);
        ctx.quadraticCurveTo(55 + trunkSwing, eBob - 10, 42 + trunkSwing * 1.5, eBob + 20);
        ctx.quadraticCurveTo(35 + trunkSwing * 1.5, eBob + 24, 38 + trunkSwing, eBob + 18);
        ctx.quadraticCurveTo(46 + trunkSwing, eBob - 5, 30, eBob - 6);
        ctx.fill(); ctx.stroke();

        // Trunk Wrinkles
        ctx.strokeStyle = "rgba(66, 66, 66, 0.4)";
        ctx.beginPath();
        for(let tw = 0; tw < 18; tw += 4) {
            ctx.moveTo(38 + tw*0.2 + trunkSwing*0.5, eBob - 10 + tw);
            ctx.lineTo(46 + trunkSwing*0.4, eBob - 8 + tw);
        }
        ctx.stroke();

        // 6. GIANT TUSKS (Unarmored, natural weapons)
        ctx.fillStyle = "#fffae6";
        ctx.strokeStyle = "#cfc7a1";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(36, eBob - 10);
        ctx.quadraticCurveTo(55, eBob - 5, 60, eBob - 20);
        ctx.quadraticCurveTo(50, eBob - 2, 35, eBob - 3);
        ctx.fill(); ctx.stroke();

        // 7. FLAPPING EAR
        ctx.fillStyle = skinDark;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(22, eBob - 18, 12 + earFlap, 18, Math.PI / 8, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 8. NEAR LEGS & TOES
        ctx.fillStyle = skinBase;
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;

        // Near Back Leg
        ctx.beginPath(); ctx.roundRect(-28 - eSwing, eBob - 5, 14, 30, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#bdbdbd"; // Toenails
        for(let t=0; t<3; t++) { ctx.beginPath(); ctx.arc(-26 - eSwing + t*4, eBob + 24, 2.5, Math.PI, 0); ctx.fill(); }

        // Near Front Leg
        ctx.fillStyle = skinBase;
        ctx.beginPath(); ctx.roundRect(12 + eSwing, eBob - 5, 14, 30, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#bdbdbd"; // Toenails
        for(let t=0; t<3; t++) { ctx.beginPath(); ctx.arc(14 + eSwing + t*4, eBob + 24, 2.5, Math.PI, 0); ctx.fill(); }

 

} else if (type === "camel") {
        // ==========================================
        //      DEDICATED CAMEL BLOCK (REVISED)
        // ==========================================
        let mScale = 1.25; 
        let mBob = bob * mScale;

        ctx.lineCap = "round"; 
        ctx.lineJoin = "round";

        const drawLeg = (isFront, isNear) => {
            let offset = isNear ? 0 : Math.PI; 
            let phase = (animFrame * 0.3) + offset;
            
            // --- FIX: Only calculate swing and lift if the unit is actively moving ---
            let swing = moving ? Math.sin(phase) : 0; 
            let lift = moving ? Math.max(0, -Math.cos(phase)) : 0; 
            
            ctx.beginPath();
            let endX, endY;
            ctx.strokeStyle = isNear ? "#4A3320" : "#2d1c15";
            ctx.lineWidth = (isNear ? 2.5 : 2.0) * mScale;
            
            if (isFront) {
                let startX = (isNear ? 6 : 4) * mScale;
                let startY = mBob + 4 * mScale;
                let kneeX = startX + swing * 4 * mScale;
                let kneeY = startY + 6 * mScale - lift * 1.5 * mScale;
                endX = kneeX + swing * 1.5 * mScale;
                endY = kneeY + 5 * mScale - lift * 3 * mScale;
                ctx.moveTo(startX, startY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(endX, endY);   
            } else {
                let startX = (isNear ? -6 : -8) * mScale;
                let startY = mBob + 3 * mScale;
                let stifleX = startX + swing * 3 * mScale;
                let stifleY = startY + 5 * mScale - lift * mScale;
                let hockX = stifleX - 1.5 * mScale + swing * 2 * mScale;
                let hockY = stifleY + 3 * mScale - lift * 2 * mScale;
                endX = hockX + 1.5 * mScale;
                endY = hockY + 3 * mScale - lift * 1 * mScale;
                ctx.moveTo(startX, startY); ctx.lineTo(stifleX, stifleY); ctx.lineTo(hockX, hockY); ctx.lineTo(endX, endY);        
            }
            ctx.stroke();
            
            // --- FIX MOVED HERE (Inside function scope) ---
            ctx.fillStyle = isNear ? "#bcaaa4" : "#8d7b76";
            ctx.beginPath();
            let footW = Math.max(0.1, 2.2 * mScale);
            let footH = Math.max(0.1, 1.2 * mScale);
            ctx.ellipse(endX, endY + 0.5 * mScale, footW, footH, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        };

        // --- Z-ORDER 1: FAR LEGS & TAIL ---
        drawLeg(true, false);  // Front Far
        drawLeg(false, false); // Back Far

        // --- Z-ORDER 2: CAMEL BODY (SINGLE PATH) ---
        // This ensures the 2 humps, neck, head, and belly share ONE clean fill.
        let body = new Path2D();
        body.moveTo(-11 * mScale, mBob + 3 * mScale); // Start at rear
        body.bezierCurveTo(-12 * mScale, mBob - 4 * mScale, -9 * mScale, mBob - 8 * mScale, -5 * mScale, mBob - 8 * mScale); // Rump
        body.bezierCurveTo(-4 * mScale, mBob - 15 * mScale, -1 * mScale, mBob - 15 * mScale, 1 * mScale, mBob - 6 * mScale); // Hump 1
        body.quadraticCurveTo(3 * mScale, mBob - 3 * mScale, 4 * mScale, mBob - 6 * mScale); // Deep dip between humps
        body.bezierCurveTo(6 * mScale, mBob - 15 * mScale, 9 * mScale, mBob - 15 * mScale, 10 * mScale, mBob - 7 * mScale); // Hump 2
        body.quadraticCurveTo(12 * mScale, mBob - 2 * mScale, 14 * mScale, mBob - 8 * mScale); // Base of neck
        body.quadraticCurveTo(16 * mScale, mBob - 16 * mScale, 19 * mScale, mBob - 17 * mScale); // Neck sweeping up
        body.bezierCurveTo(22 * mScale, mBob - 18 * mScale, 24 * mScale, mBob - 15 * mScale, 25 * mScale, mBob - 12 * mScale); // Crown of head
        body.lineTo(25.5 * mScale, mBob - 9 * mScale); // Snout
        body.lineTo(23 * mScale, mBob - 8 * mScale); // Mouth
        body.lineTo(20 * mScale, mBob - 9 * mScale); // Jawline
        body.quadraticCurveTo(16 * mScale, mBob - 2 * mScale, 11 * mScale, mBob + 5 * mScale); // Throat to chest
        body.quadraticCurveTo(9 * mScale, mBob + 9 * mScale, 5 * mScale, mBob + 8 * mScale); // Chest
        body.lineTo(-6 * mScale, mBob + 8 * mScale); // Flat belly
        body.quadraticCurveTo(-10 * mScale, mBob + 7 * mScale, -11 * mScale, mBob + 3 * mScale); // Back to rear
        body.closePath();

        ctx.fillStyle = "#D4B886"; // Consistent, rich desert sand color
        ctx.strokeStyle = "#4A3320"; 
        ctx.lineWidth = 1.5 * mScale;
        ctx.fill(body); ctx.stroke(body);

        ctx.beginPath(); ctx.moveTo(24.5 * mScale, mBob - 9.5 * mScale); ctx.lineTo(25.5 * mScale, mBob - 9.5 * mScale); ctx.stroke(); // Snout line

        // Ear
        ctx.fillStyle = "#D4B886";
        ctx.beginPath(); ctx.moveTo(19 * mScale, mBob - 15 * mScale);
        ctx.lineTo(17 * mScale, mBob - 18 * mScale); ctx.lineTo(20 * mScale, mBob - 16 * mScale);
        ctx.fill(); ctx.stroke();

        // This prevents the diagonal lines and brown square from appearing on the Camel Cannon
        if (armorVal >= 25 && !unitName.toLowerCase().includes("cannon")) {
            ctx.save(); 
            ctx.clip(body); // MAGIC: Clips the armor perfectly to the camel's exact curves!
            
            if (armorVal >= 40) {
                // Heavy Chain/Plate
                ctx.fillStyle = "#9e9e9e"; 
                // Draw a rectangle over the torso area, let the clip map it to the body
                ctx.fillRect(-10 * mScale, mBob - 10 * mScale, 22 * mScale, 20 * mScale); 
                ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 0.5 * mScale;
                for(let i = -10; i < 15; i+=2) {
                    ctx.beginPath(); ctx.moveTo(i * mScale, mBob - 15 * mScale); ctx.lineTo(i * mScale, mBob + 10 * mScale); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-10 * mScale, mBob + (i%4)*2 * mScale); ctx.lineTo(15 * mScale, mBob + (i%4)*2 * mScale); ctx.stroke();
                }
            } else {
                // Leather Saddle/Blanket
                ctx.fillStyle = "#5d4037"; 
                ctx.fillRect(-8 * mScale, mBob - 8 * mScale, 18 * mScale, 15 * mScale);
                ctx.strokeStyle = "#271610"; ctx.lineWidth = 1 * mScale;
                for(let i = -8; i < 12; i+=3) {
                    ctx.beginPath(); ctx.moveTo(i * mScale, mBob - 10 * mScale); ctx.lineTo((i - 2) * mScale, mBob + 8 * mScale); ctx.stroke();
                }
            }
            ctx.restore();
        }

        // --- Z-ORDER 4: NEAR LEGS ---
        drawLeg(true, true);  // Front Near
        drawLeg(false, true); // Back Near

        // SURGERY FIX: onfoot
        riderHeightOffset = -14; 
        
    
} else {
        // ==========================================
        //   REVISED FWD-WALKING MUSCULAR HORSE
        // ==========================================
        let hBob = bob;
        
        // --- FIX: Only progress walkSpeed if the unit is moving ---
        let walkSpeed = moving ? animFrame * 0.15 : 0; 
        
        // --- FIX: Tie secondary animations to moving boolean ---
        let headNod = moving ? Math.sin(walkSpeed * 2) * 1.5 : 0;
        let tailSwish = moving ? Math.sin(walkSpeed) * 2.5 : 0;

        ctx.lineCap = "round"; ctx.lineJoin = "round";

        const bodyColor = "#795548";
        const darkBodyColor = "#5D4037"; 
        const farLegColor = "#3e2723";   
        const lineColor = "#3e2723";

        // --- HELPER: draw Muscular Leg ---
        const drawMuscularLeg = (isFront, isNear, phaseOffset) => {
            let phase = walkSpeed + phaseOffset;
            
            // --- FIX: Swing and lift must be 0 if not moving ---
            let swing = moving ? Math.sin(phase) : 0;
            let lift = moving ? Math.max(0, -Math.cos(phase)) : 0; 

            ctx.fillStyle = isNear ? darkBodyColor : farLegColor;
            ctx.beginPath();
            
            if (isFront) {
                let startX = isNear ? -7 : -4; 
                let startY = hBob + 4;
                
                let kneeX = startX - 1 + swing * 3;
                let kneeY = startY + 6 - lift * 2;
                
                let fetlockX = kneeX + swing * 1.5;
                let fetlockY = kneeY + 5 - lift * 3.5;
                
                let hoofX = fetlockX - (lift > 0.1 ? 1 : 0);
                let hoofY = fetlockY + 2.5;

                ctx.moveTo(startX + 2, startY);
                ctx.quadraticCurveTo(startX - 2, startY + 2, kneeX - 1.5, kneeY);
                ctx.lineTo(hoofX - 1.5, hoofY);
                ctx.lineTo(hoofX + 1.5, hoofY);
                ctx.lineTo(fetlockX + 1.2, fetlockY);
                ctx.quadraticCurveTo(kneeX + 1.8, kneeY + 1, startX + 2.5, startY + 3);
                ctx.closePath();
            } else {
                let startX = isNear ? 5 : 7; 
                let startY = hBob + 3;
                
                let stifleX = startX - 2 + swing * 1.5;
                let stifleY = startY + 4 - lift * 0.5;
                
                let hockX = stifleX + 1.5 + swing * 2;
                let hockY = stifleY + 4 - lift * 1.5;
                
                let fetlockX = hockX - 1.5 + swing * 1.5;
                let fetlockY = hockY + 4 - lift * 2.5;

                let hoofX = fetlockX - (lift > 0.1 ? 1 : 0);
                let hoofY = fetlockY + 2.5;

                ctx.moveTo(startX + 3, startY);
                ctx.quadraticCurveTo(startX + 4, startY + 5, hockX + 1.8, hockY);
                ctx.lineTo(hoofX + 1.5, hoofY);
                ctx.lineTo(hoofX - 1.5, hoofY);
                ctx.lineTo(fetlockX - 1.2, fetlockY);
                ctx.quadraticCurveTo(hockX - 2, hockY - 1, stifleX - 1, stifleY);
                ctx.quadraticCurveTo(startX - 1, startY + 1, startX - 2, startY);
                ctx.closePath();
            }
            
            ctx.fill();

            // Draw Hoof
            ctx.fillStyle = "#212121";
            let liftCalc = moving ? Math.max(0, -Math.cos(walkSpeed + phaseOffset)) : 0;
            let swingCalc = moving ? Math.sin(walkSpeed + phaseOffset) : 0;
            let hX, hY;

            if(isFront) {
                let kX = (isNear ? -7 : -4) - 1 + swingCalc * 3;
                let kY = hBob + 4 + 6 - liftCalc * 2;
                let fX = kX + swingCalc * 1.5;
                let fY = kY + 5 - liftCalc * 3.5;
                hX = fX - (liftCalc > 0.1 ? 1 : 0); hY = fY + 2.5;
            } else {
                let sX = (isNear ? 5 : 7) - 2 + swingCalc * 1.5;
                let sY = hBob + 3 + 4 - liftCalc * 0.5;
                let hoX = sX + 1.5 + swingCalc * 2.5;
                let hoY = sY + 4 - liftCalc * 1.5;
                let fX = hoX - 1.5 + swingCalc * 1.5;
                let fY = hoY + 4 - liftCalc * 2.5;
                hX = fX - (liftCalc > 0.1 ? 1 : 0); hY = fY + 2.5;
            }

            ctx.beginPath();
            ctx.moveTo(hX - 1.8, hY + 1); 
            ctx.lineTo(hX + 1.8, hY + 1); 
            ctx.lineTo(hX + 1.2, hY - 1.5); 
            ctx.lineTo(hX - 1.2, hY - 1.5); 
            ctx.closePath();
            ctx.fill();
        };

        // --- Z-ORDER 1: FAR LEGS & TAIL ---
        drawMuscularLeg(false, false, Math.PI);        
        drawMuscularLeg(true, false, Math.PI / 2);      

        ctx.strokeStyle = "#2d1c15"; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(11, hBob - 2); 
        ctx.bezierCurveTo(15 + tailSwish, hBob - 2, 18 + tailSwish, hBob + 4, 14 + tailSwish * 0.5, hBob + 12);
        ctx.stroke();

        // --- Z-ORDER 2: BODY ---
        ctx.fillStyle = bodyColor; ctx.strokeStyle = lineColor; ctx.lineWidth = 1.2;
        let horseBody = new Path2D();
        horseBody.moveTo(12, hBob + 2); 
        horseBody.quadraticCurveTo(12, hBob - 6, 5, hBob - 6); 
        horseBody.quadraticCurveTo(0, hBob - 4, -6, hBob - 5);    
        horseBody.quadraticCurveTo(-10, hBob - 10 + headNod, -13, hBob - 16 + headNod); 
        horseBody.lineTo(-15, hBob - 17 + headNod); 
        horseBody.lineTo(-24, hBob - 11 + headNod); 
        horseBody.quadraticCurveTo(-26, hBob - 8 + headNod, -24, hBob - 6 + headNod);  
        horseBody.lineTo(-18, hBob - 4 + headNod);  
        horseBody.quadraticCurveTo(-12, hBob - 2 + headNod, -9, hBob + 5);   
        horseBody.quadraticCurveTo(-8, hBob + 10, 0, hBob + 10);  
        horseBody.quadraticCurveTo(10, hBob + 10, 12, hBob + 2); 
        horseBody.closePath();

        ctx.fill(horseBody); 
        ctx.stroke(horseBody);

        // Mane & Eye
        ctx.strokeStyle = "#212121"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-8, hBob - 7 + (headNod*0.5)); 
        ctx.quadraticCurveTo(-11, hBob - 13 + headNod, -14, hBob - 16 + headNod); ctx.stroke();
        
        ctx.fillStyle = "#111"; ctx.beginPath(); 
        ctx.arc(-19, hBob - 10 + headNod, 1.2, 0, Math.PI*2); ctx.fill();

        // Ears
        ctx.fillStyle = bodyColor; ctx.beginPath();
        ctx.moveTo(-13, hBob - 16 + headNod); ctx.lineTo(-13, hBob - 20 + headNod); 
        ctx.lineTo(-15, hBob - 17 + headNod); ctx.fill(); ctx.stroke();

        // --- Z-ORDER 4: NEAR LEGS ---
        drawMuscularLeg(false, true, 0);               
        drawMuscularLeg(true, true, -Math.PI / 2);     
    }
// ==========================================
// 3. RIDER BODY & ARMOR
// ==========================================
// >>> ADD THESE 4 LINES HERE <<<
 if (isElephant) {
    ctx.restore(); // Clean up the stack before leaving!
    return;
}

ctx.save();
    let isCamelCannon = (type === "camel_cannon" || (unitName && unitName.toLowerCase().includes("camel cannon")));

// --- 2. THE RIDER TRANSLATION ---
// We combine the base animal height + animation bob + the massive elephant offset
ctx.translate(-1, baseMountHeight + bob + riderBob + riderHeightOffset);
if (!isElephant && !isCamelCannon) {
    // Base Faction Tunic
    ctx.fillStyle = factionColor; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -9); ctx.lineTo(-2, -9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    }

ctx.restore();

    // RIDER ARMOR LAYERS
if ((unitName.includes("Elite") || armorVal >= 40) && !isCamelCannon) {
        // --- ELITE / SUPER HEAVY TIER ---
        // 1. Shield on Back
        ctx.fillStyle = factionColor; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(-4, -4.5, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.arc(-4, -4.5, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // Shield Boss

        // 2. Leg Armor (Steel Chausses)
        ctx.fillStyle = "#9e9e9e";
        ctx.beginPath(); ctx.moveTo(-2.5, 0); ctx.lineTo(3.5, 0); ctx.lineTo(4, 6); ctx.lineTo(-1, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = 0.5;
        for(let i = 1; i <= 5; i+=1.2) { // Dense leg weave
            ctx.beginPath(); ctx.moveTo(-1.5 + (i*0.1), i); ctx.lineTo(3.5 - (i*0.1), i); ctx.stroke();
        }

        // 3. Denser Steel Vest (Lamellar/Mail Crosshatch)
        ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-3.5, -1); ctx.lineTo(3.5, -1); ctx.lineTo(2.5, -9); ctx.lineTo(-2.5, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 0.5;
        for(let i = -8; i <= -1; i+=1.2) { // Dense Horizontal
            ctx.beginPath(); ctx.moveTo(-3, i); ctx.lineTo(3, i); ctx.stroke();
        }
        for(let i = -2.5; i <= 2.5; i+=1.2) { // Dense Vertical
            ctx.beginPath(); ctx.moveTo(i, -8); ctx.lineTo(i, -1); ctx.stroke();
        }
        
        // 4. Heavy Steel Pauldrons
        ctx.fillStyle = "#9e9e9e"; ctx.lineWidth = 1; ctx.strokeStyle = "#1a1a1a";
        ctx.fillRect(-6.5, -9.5, 3.5, 4.5); ctx.strokeRect(-6.5, -9.5, 3.5, 4.5); // Left
        ctx.fillRect(3, -9.5, 3.5, 4.5); ctx.strokeRect(3, -9.5, 3.5, 4.5);       // Right
        ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 0.5;
        for(let i = -8; i <= -6; i+=1.2) {
            ctx.beginPath(); ctx.moveTo(-6.5, i); ctx.lineTo(-3, i); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(3, i); ctx.lineTo(6.5, i); ctx.stroke();
        }

    } else if (armorVal >= 25) {
        // HEAVY TIER: Steel Vest + SQUARE Pauldrons
        ctx.fillStyle = "#9e9e9e";
        ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(3, -1); ctx.lineTo(2, -8); ctx.lineTo(-2, -8);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 0.5;
        for(let i = -7; i < -1; i+=2.5) {
            ctx.beginPath(); ctx.moveTo(-3, i); ctx.lineTo(3, i); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-1.5, i); ctx.lineTo(-1.5, i+2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(1.5, i); ctx.lineTo(1.5, i+2); ctx.stroke();
        }
        
        // Square Pauldrons for Cavalry Rider
        ctx.fillStyle = factionColor; 
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        ctx.fillRect(-5.5, -8.5, 2.5, 3.5); ctx.strokeRect(-5.5, -8.5, 2.5, 3.5); // Left
        ctx.fillRect(3, -8.5, 2.5, 3.5); ctx.strokeRect(3, -8.5, 2.5, 3.5);       // Right
        
        // Small lines on pauldrons
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath(); ctx.moveTo(-5.5, -6.5); ctx.lineTo(-3, -6.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, -6.5); ctx.lineTo(5.5, -6.5); ctx.stroke();

    } else if (armorVal >= 8) {
        // --- MEDIUM TIER: Smooth Vest + FACTION PAULDRONS ---
        ctx.fillStyle = "#5d4037"; 
        ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(3, -1); ctx.lineTo(2, -8); ctx.lineTo(-2, -8);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Square Pauldrons for Medium Rider (Faction Color, No Lines)
        ctx.fillStyle = factionColor; 
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        ctx.fillRect(-5, -8, 2, 3); ctx.strokeRect(-5, -8, 2, 3); // Left
        ctx.fillRect(3, -8, 2, 3); ctx.strokeRect(3, -8, 2, 3);   // Right
    }
      if (!isCamelCannon) {  
    // Rider Head Base
    ctx.fillStyle = "#d4b886";
    ctx.beginPath(); ctx.arc(0, -11, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
	  }
    // RIDER HEADGEAR
    if (unitName.includes("Elite") || armorVal >= 40) {
        // --- ELITE CUMAN HELMET WITH STEEL FACE MASK ---
        // Mail Aventail (Neck Guard)
        ctx.fillStyle = "#757575"; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(-3.5, -13); ctx.lineTo(-4.5, -8); ctx.lineTo(1, -8); ctx.lineTo(1.5, -13); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        for(let i = -12; i <= -9; i+=1.2) { ctx.beginPath(); ctx.moveTo(-4, i); ctx.lineTo(0, i); ctx.stroke(); }

        // Steel Face Mask
        ctx.fillStyle = "#eeeeee"; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(1, -11, 2.5, -Math.PI/1.5, Math.PI/1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        // Eye Slit & Nose Ridge
        ctx.fillStyle = "#000000"; ctx.fillRect(1.5, -12, 1.5, 0.8);
        ctx.beginPath(); ctx.moveTo(2.5, -11.2); ctx.lineTo(2.5, -9.5); ctx.stroke();

        // Pointy Cuman Dome
        ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-3.5, -13); ctx.lineTo(3.5, -13); 
        ctx.quadraticCurveTo(0, -16, -1, -20); // Pointing slightly back and up
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        // Helmet Trim
        ctx.strokeStyle = factionColor; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-3.5, -13); ctx.lineTo(3.5, -13); ctx.stroke();

    } else if (armorVal >= 25) {
        // High Tier Heavy Helmets
        if (factionColor === "#c2185b") { 
            ctx.fillStyle = "#212121"; ctx.beginPath(); ctx.arc(0, -12, 3.5, Math.PI, 0); ctx.fill();
            ctx.fillRect(-4, -12, 8, 1.5);
            ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-3, -17); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(3, -17); ctx.stroke();
        } else if (factionColor === "#1976d2" || factionColor === "#455a64") { 
            ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#424242"; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.arc(0, -13, 4, Math.PI, 0); ctx.fill(); ctx.stroke(); 
            ctx.fillStyle = "#616161"; ctx.beginPath(); ctx.moveTo(-1, -16); ctx.lineTo(1, -16); ctx.lineTo(0, -20); ctx.fill();
            ctx.fillStyle = "#4e342e"; ctx.fillRect(-4, -13, 2.5, 4); ctx.fillRect(1.5, -13, 2.5, 4);
} else if (factionColor === "#00838f") {
            // Dali Kingdom (Hmong) -> Elite High-Crested War Helm
            
            // 1. The Heavy Base (Replaces the thin neck guard)
            ctx.fillStyle = "#5d4037"; // Dark lacquered wood/rattan
            ctx.fillRect(-6, -14, 12, 3); // Wider base for the helmet
            
            // 2. The Tiered Crest (The "Heavy" Elite look)
            ctx.fillStyle = "#8d6e63"; // Lighter rattan layer
            ctx.beginPath();
            ctx.moveTo(-5, -14);
            ctx.lineTo(-2, -22); // Tall peak left
            ctx.lineTo(2, -22);  // Tall peak right
            ctx.lineTo(5, -14);
            ctx.fill();

            // 3. Silver Status Ornament (The "Elite" indicator)
            ctx.fillStyle = "#e0e0e0"; 
            // A silver band across the middle of the helmet
            ctx.fillRect(-3, -18, 6, 1.5);
            // A silver "spike" or finial at the very top
            ctx.beginPath();
            ctx.moveTo(-1, -22);
            ctx.lineTo(0, -25);
            ctx.lineTo(1, -22);
            ctx.fill();

            // 4. Side "Wings" (Traditional Dali silhouette)
            ctx.strokeStyle = "#e0e0e0";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-6, -13); ctx.lineTo(-8, -15); // Left wing
            ctx.moveTo(6, -13); ctx.lineTo(8, -15);   // Right wing
            ctx.stroke();
	} else { 
	// --- 1. RED FEATHER PLUME (Raised 1.5px) ---
    ctx.fillStyle = "#d32f2f";
    ctx.beginPath();
    ctx.moveTo(0, -19.5);
    ctx.quadraticCurveTo(-3, -25.5, -5, -23.5);
    ctx.quadraticCurveTo(-1, -22.5, 0, -19.5);
    ctx.quadraticCurveTo(3, -25.5, 5, -23.5);
    ctx.quadraticCurveTo(1, -22.5, 0, -19.5);
    ctx.fill();

    // --- 2. MAIN HELMET DOME (Raised 1.5px) ---
    ctx.fillStyle = "#9e9e9e";
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-5, -13.5);
    ctx.quadraticCurveTo(0, -22.5, 5, -13.5);
    ctx.lineTo(4.5, -12);
    ctx.quadraticCurveTo(0, -11, -4.5, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- 3. TOP FINIAL SOCKET (Raised 1.5px) ---
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.moveTo(-1.2, -19);
    ctx.lineTo(1.2, -19);
    ctx.lineTo(0.8, -21);
    ctx.lineTo(-0.8, -21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- 4. HEAVY WRAP-AROUND FACE & NECK GUARD ---
    ctx.fillStyle = factionColor;
    ctx.beginPath();
    // Start at the temple
    ctx.moveTo(-5, -13); 
    // Left side down to chin
    ctx.lineTo(-5.5, -6); 
    // The "Chin" - wrapping across the bottom
    ctx.quadraticCurveTo(0, -4.5, 5.5, -6); 
    // Right side up to temple
    ctx.lineTo(5, -13);
    // Eye Slit Top (Lower brow)
    ctx.lineTo(3.5, -11.5);
    ctx.quadraticCurveTo(0, -10.5, -3.5, -11.5); 
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- 5. EYE SLIT SHADOW ---
    // Creates the depth inside the mask so the face is barely seen
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(-3.5, -11.5);
    ctx.quadraticCurveTo(0, -10.5, 3.5, -11.5);
    ctx.lineTo(3.8, -10);
    ctx.quadraticCurveTo(0, -9, -3.8, -10);
    ctx.closePath();
    ctx.fill();

    // --- 6. ELITE LAMELLAR STITCHING ---
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    // Vertical plates on the face mask
    for(let x = -4; x <= 4; x += 2) {
        if (x === 0) continue; // Keep the center nose-line clean
        ctx.moveTo(x, -9.5); 
        ctx.lineTo(x * 1.1, -5.5);
    }
    // Horizontal row across the jaw
    ctx.moveTo(-5.2, -8); ctx.lineTo(5.2, -8);
    ctx.stroke();

    // --- 7. RED CEREMONIAL TASSELS ---
    ctx.strokeStyle = "#b71c1c";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4.5, -11); ctx.lineTo(-6.5, -6); 
    ctx.moveTo(4.5, -11);  ctx.lineTo(6.5, -6);
    ctx.stroke();
	}
    } else if (armorVal >= 8) {
        // Medium Tier Light Faction Hats
        if (factionColor === "#c2185b") { 
            ctx.fillStyle = "#212121"; ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(-5, -10.5); ctx.lineTo(0, -13.5); ctx.lineTo(5, -10.5);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (factionColor === "#1976d2" || factionColor === "#455a64") { 
            ctx.fillStyle = "#4e342e"; ctx.beginPath(); ctx.arc(0, -12, 3, Math.PI, 0); ctx.fill();
            ctx.fillStyle = "#795548"; ctx.fillRect(-3.5, -12, 7, 1.5); 
} else if (factionColor === "#00838f") {
// Dali Kingdom (Hmong) -> Light Cavalry Indigo Headwrap
            ctx.fillStyle = "#1a237e";   // Indigo dyed cloth
            ctx.strokeStyle = "#0d47a1"; // Slightly lighter blue for fold definition
            ctx.lineWidth = 0.5;

            // 1. The main horizontal wrap
            // Dropped from -15.5 to -14 to fully close the 20% gap
            ctx.fillRect(-3, -14, 6, 2); 
            
            // 2. The rounded top (The "bun")
            // Center lowered to -14 to sit flush with the base
            ctx.beginPath();
            ctx.arc(0, -14, 2.5, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 3. Simple fold detail 
            // Adjusted coordinates to match the lower position
            ctx.beginPath();
            ctx.moveTo(-2, -15);
            ctx.lineTo(1.5, -15.5);
            ctx.stroke();
        } else {
// --- 1. ROUNDED SKULL CAP (Raised 1.5px) ---
    ctx.fillStyle = "#808080"; 
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    // Y shifted from -12 to -13.5
    ctx.arc(0, -13.5, 4.8, Math.PI, 0); 
    ctx.lineTo(4.8, -12.5); 
    ctx.quadraticCurveTo(0, -12, -4.8, -12.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- 2. TOP RIVET (Raised 1.5px) ---
    ctx.fillStyle = "#555555";
    ctx.beginPath();
    // Y shifted from -16.8 to -18.3
    ctx.arc(0, -18.3, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // --- 3. LAMELLAR EAR FLAPS (Raised 1.5px) ---
    ctx.fillStyle = factionColor;
    
    // Left Flap - Now starts higher to show more jawline/cheek
    ctx.beginPath();
    ctx.rect(-5.2, -12.5, 2.2, 3.5); 
    ctx.fill();
    ctx.stroke();

    // Right Flap
    ctx.beginPath();
    ctx.rect(3, -12.5, 2.2, 3.5);  
    ctx.fill();
    ctx.stroke();

    // --- 4. MINIMAL BACK NECK GUARD (Raised 1.5px) ---
    ctx.beginPath();
    ctx.moveTo(-3, -12.5);
    ctx.quadraticCurveTo(0, -11.5, 3, -12.5);
    ctx.lineTo(3, -10.5);
    ctx.quadraticCurveTo(0, -10, -3, -10.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- 5. LAMELLAR STITCHING (Raised 1.5px) ---
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 0.5;
    
    // Vertical split on ear flaps
    ctx.beginPath();
    ctx.moveTo(-4.1, -12.5); ctx.lineTo(-4.1, -9);
    ctx.moveTo(4.1, -12.5);  ctx.lineTo(4.1, -9);
    // Horizontal row (Y shifted from -9.2 to -10.7)
    ctx.moveTo(-5.2, -10.7); ctx.lineTo(-3, -10.7);
    ctx.moveTo(3, -10.7);    ctx.lineTo(5.2, -10.7);
    ctx.stroke();
        }
    } 
	else { //camel 
           }
// --- WEAPONS LOGIC ---
    let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 : Math.sin(frame * 0.2) * 1;

    if (isFleeing) {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(4, -22 + weaponBob); ctx.stroke(); 
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 0.5;
        let flap = moving ? Math.sin(frame * 1.5) * 3 : 0;
        ctx.beginPath(); ctx.moveTo(4, -21 + weaponBob); 
        ctx.quadraticCurveTo(-4, -22 + weaponBob + flap, -10, -18 + weaponBob); 
        ctx.quadraticCurveTo(-6, -14 + weaponBob - flap, 3, -12 + weaponBob);
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
else if (type === "horse_archer") {
        
        ctx.save();
        ctx.scale(dir, 1);

        let b = (typeof bob !== 'undefined') ? bob : 0;
        let weaponBob = b; 
        let ammo = (typeof unitAmmo !== 'undefined') ? unitAmmo : 1;

        // --- FETCH ACTUAL COOLDOWN TIMERS ---
        let cd = (typeof cooldown !== 'undefined') ? cooldown : 0;
        let maxCd = (typeof unit !== 'undefined' && unit.stats && unit.stats.cooldown) ? unit.stats.cooldown : 2000;

        // --- REVISED ARROW QUIVER ---
        ctx.save();
        ctx.translate(-3, 0 + b); // Pulled in closer to the hip
        ctx.rotate(Math.PI / 6);  // Leans back away from the neck
        
        ctx.fillStyle = "#5d4037"; ctx.fillRect(-3, -4, 6, 11);
        ctx.strokeStyle = "#2b1b17"; ctx.lineWidth = 1; ctx.strokeRect(-3, -4, 6, 11);

        let visibleArrows = Math.max(0, Math.min(3, ammo));
        ctx.fillStyle = "#d32f2f"; 
        for (let i = 0; i < visibleArrows; i++) {
            let offset = -1.5 + (i * 1.5); 
            ctx.fillRect(offset, -6, 1.2, 2.5);
        }
        ctx.restore();

        // --- OUT OF AMMO: Melee Lance Fallback ---
        if (ammo <= 0) {
			 		    
// --- IMPROVED AGGRESSIVE MELEE LOGIC ---
let meleeCycle = isAttacking ? Math.max(0, maxCd - cd) / maxCd : 0;

// Use a power function to make the strike "pop" forward 
// Math.pow(x, 0.3) starts extremely fast and slows down at the end
let snapCycle = Math.sin(Math.pow(meleeCycle, 0.3) * Math.PI);

// Determine if this specific unit is performing a 'Swing' instead of a 'Thrust'
// We use the unit's internal ID (if available) or a coordinate hash to keep it consistent
let unitSeed = (unit && unit.id) ? unit.id : (x + y);
let isSwing = (unitSeed % 3 === 0); // Roughly 33% of units will swing instead of thrust

let thrust = !isSwing ? snapCycle * 14 : snapCycle * 5; // Longer reach for thrusts
let swingAngle = isSwing ? (snapCycle * 1.2) - 0.6 : 0; // Rotational arc for swings

// 1. Draw Stowed Bow in Bow Case (Kept as is)
ctx.save();
ctx.translate(-5, 0 + b);
ctx.rotate(Math.PI / 6);
ctx.fillStyle = "#4e342e"; ctx.fillRect(-3, -8, 6, 16);
ctx.strokeStyle = "#212121"; ctx.lineWidth = 1; ctx.strokeRect(-3, -8, 6, 16);
ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 2;
ctx.beginPath(); ctx.moveTo(0, -8); 
ctx.quadraticCurveTo(4, -12, -2, -16); ctx.stroke();
ctx.restore();

// 2. REVISED: Draw Melee Lance & Hand
ctx.save();
// Apply translation for the "snap" thrust and rotation for the "swing"
ctx.translate(2 + thrust, -4 + b); 
if (isSwing) ctx.rotate(swingAngle); 

// The Lance Shaft
ctx.fillStyle = "#795548"; 
ctx.fillRect(-10, -1, 35, 2); // Slightly longer lance for better visual impact

// The Lance Tip (Steel)
ctx.fillStyle = "#e0e0e0";
ctx.beginPath();
ctx.moveTo(25, -2); ctx.lineTo(33, 0); ctx.lineTo(25, 2); 
ctx.fill();

// The Hand (Placed last to stay on top of the shaft)
ctx.fillStyle = "#ffccbc"; 
ctx.beginPath(); 
ctx.arc(0, 0, 2.5, 0, Math.PI * 2); 
ctx.fill();

ctx.restore();
        } else {
			   drawOffhandhorseBow(animFrame);   // keep bow visible
            // --- RANGED COMBAT: Has Ammo ---
            // 1. Draw Stowed Lance
            ctx.save();
            ctx.translate(-2, 4 + b); 
            ctx.rotate(-Math.PI / 12);
            ctx.fillStyle = "#5d4037"; ctx.fillRect(-12, -1, 28, 2);
            ctx.fillStyle = "#bdbdbd"; 
            ctx.beginPath(); ctx.moveTo(16, -1.5); ctx.lineTo(22, 0); ctx.lineTo(16, 1.5); ctx.fill();
            ctx.restore();

// --- 2. ACTIVE ARCHERY ANIMATION (SMOOTH VERSION) ---

// FIX: A unit is "Action Active" as long as the cooldown is counting.
// This prevents the arm from snapping when you start moving.
let isActionActive = (cd > 0); 

// If the timer is running, use it. Otherwise, stay in "Ready" pose (0.9)
let cycle = isActionActive ? Math.max(0, maxCd - cd) / maxCd : 0.9; 

let bowKhatra = 0;
let hasArrow = false;
let handX = 6 + weaponBob; 
let handY = -6 + b; 
let rightHandX = handX, rightHandY = handY;
let stringX = handX - 4; 

// --- ANIMATION STAGES ---
if (cycle < 0.2) {
    // Reaching for quiver
    let reachProgress = cycle / 0.2;
    rightHandX = (handX - 8) + ((-5) - (handX - 8)) * Math.sin(reachProgress * Math.PI / 2);
    rightHandY = handY + ((-2 + b) - handY) * Math.sin(reachProgress * Math.PI / 2);
    hasArrow = false; 
    stringX = handX - 4; 
} else if (cycle < 0.4) {
    // Nocking the arrow
    let nockProgress = (cycle - 0.2) / 0.2;
    rightHandX = -5 + (handX - (-5)) * nockProgress;
    rightHandY = (-2 + b) + (handY - (-2 + b)) * nockProgress;
    hasArrow = true;
    stringX = handX - 4; 
} else if (cycle < 0.95) { 
    // Drawing the string back
    let drawProgress = (cycle - 0.4) / 0.55;
    rightHandX = handX - (drawProgress * 14); 
    rightHandY = handY;
    hasArrow = true;
    stringX = rightHandX; 
} else {
    // Release (The "Pop")
    let releaseProgress = (cycle - 0.95) / 0.05;
    bowKhatra = 0.6 * (1 - releaseProgress); 
    rightHandX = (handX - 14) + (releaseProgress * 6); 
    hasArrow = false; 
    stringX = handX - 4; 
}

// ... (Rest of your Drawing code: Draw Bow, Draw Arrow, Draw Right Hand) ...
            // Draw Bow
            ctx.save();
            ctx.translate(handX, handY); 
            ctx.rotate(bowKhatra); 
            ctx.translate(-handX, -handY);
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
            
            // Replaced hardcoded values to be relative to handY
            ctx.beginPath(); ctx.moveTo(handX - 4, handY - 8); 
            ctx.quadraticCurveTo(handX + 6, handY - 4, handX, handY); 
            ctx.quadraticCurveTo(handX + 6, handY + 8, handX - 4, handY + 8); ctx.stroke();
            
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(handX - 4, handY - 8); 
            ctx.lineTo(stringX, rightHandY); 
            ctx.lineTo(handX - 4, handY + 8); ctx.stroke();
            ctx.restore();

            // Draw Arrow (Only renders if hasArrow is true, which is fixed to start at 0.2)
            if (hasArrow) {
                ctx.save();
                ctx.translate(rightHandX, rightHandY); 
                if (cycle >= 0.2 && cycle < 0.4) {
                    // Smoothly rotates the arrow into nocking position
                    let nockProgress = (cycle - 0.2) / 0.2;
                    ctx.rotate((-Math.PI / 4) * (1 - nockProgress));
                }
                ctx.fillStyle = "#8d6e63"; ctx.fillRect(-4, -0.5, 16, 1); 
                ctx.fillStyle = "#9e9e9e"; ctx.fillRect(12, -1.5, 3, 3); 
                ctx.fillStyle = "#d32f2f"; 
                ctx.fillRect(-3, -1.5, 4, 1); ctx.fillRect(-3, 0.5, 4, 1); 
                ctx.restore();
            }

            // Draw Right Hand
            ctx.fillStyle = "#ffccbc"; 
            ctx.beginPath(); ctx.arc(rightHandX, rightHandY, 2, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.restore();
    }
// Triggers for camels, the specific Zamburak role, or units equipped with Hand Cannons
// --- CAMEL CANNON / ZAMBURAK LOGIC ---
// --- CAMEL CANNON / ZAMBURAK LOGIC ---
else if (
    type === "MOUNTED_GUNNER" || 
    type === "camel_cannon" ||
    (unitName && unitName.toLowerCase().includes("camel cannon"))
) {
    let b = (typeof bob !== 'undefined') ? bob : 0;
    let reducedBob = b * 0.1; 
    let ammo = (typeof unitAmmo !== 'undefined') ? unitAmmo : 1;
    let cd = (typeof cooldown !== 'undefined') ? cooldown : 0;
    let maxCd = (typeof unit !== 'undefined' && unit.stats && unit.stats.cooldown) ? unit.stats.cooldown : 1000; 
    
    // Unified cycle logic for flicker-free movement
    let cycle = isAttacking ? Math.max(0, maxCd - cd) / maxCd : 1.0;

    // ==========================================
    // 1. DRAW RIDER
    // ==========================================
    ctx.save();
    ctx.translate(2.0, reducedBob + 11.0); 
    ctx.scale(1.275, 1.275); 
    
    ctx.strokeStyle = "#1a1a1a"; 
    ctx.lineJoin = "round";

    // Legs
   // Old line: let gLegSwing = Math.sin(animFrame * 0.4) * 2;
let gLegSwing = moving ? Math.sin(animFrame * 0.4) * 2 : 0;
    ctx.strokeStyle = "#3e2723"; 
    ctx.lineWidth = 1.8; 
    ctx.beginPath();
    ctx.moveTo(-1.5, -1); ctx.lineTo(-3 + gLegSwing, 6); 
    ctx.moveTo(1.5, -1); ctx.lineTo(3 - gLegSwing, 6);
    ctx.stroke();

    // Body (Thobe)
    ctx.fillStyle = factionColor;
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = "#1a1a1a";
    ctx.beginPath(); ctx.rect(-3.5, -8, 7, 8.5); ctx.fill(); ctx.stroke();

    // Head & Keffiyeh
    ctx.fillStyle = "#ffccbc"; 
    ctx.beginPath(); ctx.arc(0, -10.5, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = factionColor;
    ctx.strokeStyle = "#212121"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-3.5, -12); ctx.lineTo(3.5, -12); ctx.stroke();

    ctx.restore();

    // ==========================================
    // 2. COMBAT LOGIC (Ranged vs Melee)
    // ==========================================
    if (ammo <= 0) {
        // --- MODE A: SWORD COMBAT (CANNON STOWED) ---
        
        // 1. Draw Cannon stowed on back (Inside Rider space)
        ctx.save();
        ctx.translate(-1, reducedBob + 6); // Position on rider's back
        ctx.rotate(Math.PI / 4); // Slanted across back
        ctx.fillStyle = "#4e342e"; ctx.fillRect(-4, -1, 8, 2); // Stock
        ctx.fillStyle = "#424242"; ctx.fillRect(2, -1.5, 12, 3); // Barrel
        ctx.restore();

        // 2. Shortsword Animation Logic
        var meleeCycle = cycle; 
        var swingAngle = -Math.PI / 2; // Ready position
        var handX = 4, handY = 8;

        if (isAttacking) {
            if (meleeCycle < 0.2) { 
                // Wind up
                swingAngle = -Math.PI / 1.2; 
            } else if (meleeCycle < 0.5) { 
                // Swing down
                var p = (meleeCycle - 0.2) / 0.3;
                swingAngle = -Math.PI / 1.2 + (Math.PI * 1.5 * p);
                handX = 4 + (p * 6);
            } else { 
                // Recover
                var p = (meleeCycle - 0.5) / 0.5;
                swingAngle = Math.PI * 0.3 - (Math.PI * 0.8 * p);
                handX = 10 - (p * 6);
            }
        }
		else{}

        // 3. Render Shortsword
        ctx.save();
        ctx.translate(handX, handY + reducedBob);
        ctx.rotate(swingAngle);
        
        // Blade
        ctx.fillStyle = "#cfd8dc"; // Steel
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, -1);
        ctx.lineTo(14, 0); // Point
        ctx.lineTo(12, 1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#90a4ae";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Crossguard & Hilt
        ctx.fillStyle = "#ffca28"; // Gold/Brass
        ctx.fillRect(-1, -3, 2, 6); // Guard
        ctx.fillStyle = "#4e342e"; 
        ctx.fillRect(-4, -1, 4, 2); // Handle
        
        // Hand
        ctx.fillStyle = "#ffccbc";
        ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
        
        ctx.restore();

 
} else {
    // --- MODE B: RANGED CANNON (SURGERY FIX REPLICATED) ---
    
    // 1. Unified Timing Logic (Matches Hand Cannoner success)
    let maxCd = 300; 
    let cd = (typeof cooldown !== 'undefined') ? cooldown : 0;
    let cycle = isAttacking ? Math.max(0, maxCd - cd) / maxCd : 1.0;

    // 2. Recuperation & Positioning
    // Recoil kicks back hard during the first 15% of the cycle
    let recoil = (isAttacking && cycle < 0.15) ? Math.sin((cycle / 0.15) * Math.PI) * 5 : 0;
    
    let gunAngle = -Math.PI / 30; 
    let gunY = 0;
    // Tilt up for swabbing/loading phases
    if (isAttacking && cycle > 0.15 && cycle < 0.95) { 
        gunAngle = Math.PI / 20; 
        gunY = 1.0; 
    }

    ctx.save();
    // Offset for the camel's back and apply bobbing
    ctx.translate(8.0 + recoil, gunY + (reducedBob || 0) + 8); 
    ctx.rotate(gunAngle); 

// --- CHINESE WHEELBARROW WAGON CHASSIS ---
    ctx.save();
    // Lower the cart slightly relative to the gun so it sits underneath
    ctx.translate(0, 3);
    
    // 1. Wooden Frame/Handles
    ctx.fillStyle = "#5d4037"; ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10, 0); // Back handles held by the rider
    ctx.lineTo(16, 0);  // Front bed
    ctx.lineTo(16, 3);
    ctx.lineTo(-10, 3);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 2. Wheel Strut / Axle Mount
    ctx.fillRect(6, 3, 4, 8);
    ctx.strokeRect(6, 3, 4, 8);

    // 3. The Central Wheel
    let wheelRot = moving ? animFrame * 0.4 : 0;
    ctx.save();
    ctx.translate(8, 12); // Center of the wheel
    ctx.rotate(wheelRot);
    
    // Outer rim
    ctx.fillStyle = "#4e342e"; ctx.strokeStyle = "#212121"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    // Spokes
    ctx.strokeStyle = "#212121"; ctx.lineWidth = 1;
    for (let w = 0; w < 4; w++) {
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.rotate(Math.PI / 4);
    }
    ctx.restore(); // Restore wheel rotation
    ctx.restore(); // Restore cart translation
	
	
    ctx.fillStyle = "#424242"; ctx.strokeStyle = "#212121"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(20, -1.5); ctx.lineTo(20, 2.5); ctx.lineTo(2, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#616161"; ctx.fillRect(20, -2.5, 3, 6); // Muzzle ring

    // Support hand holding the stock
    ctx.fillStyle = "#ffccbc"; ctx.beginPath(); ctx.arc(10, 2, 2, 0, Math.PI*2); ctx.fill();

    // ==========================================
    // 1. REPLICATED MUZZLE FLASH & CLOUD
    // ==========================================
    // Triggering via CD check (like the infantry) ensures it never skips frames
    if (isAttacking && cd > 270) { 
        // CORE FLASH
        ctx.fillStyle = "#fff176"; ctx.beginPath(); 
        ctx.arc(23, 0.5, 3 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
        
        // OUTER FLASH
        ctx.fillStyle = "#ff5722"; ctx.beginPath(); 
        ctx.arc(25, 0.5, 5 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
        
        // THE SMOKE CLOUD
        ctx.fillStyle = "rgba(180, 180, 180, 0.7)"; 
        ctx.beginPath(); 
        ctx.arc(30, -2, 7 + Math.random() * 4, 0, Math.PI * 2); // Main puff
        ctx.arc(35, 1, 5 + Math.random() * 4, 0, Math.PI * 2);  // Forward puff
        ctx.fill();
    }
    // ==========================================
    // 2. RELOAD SEQUENCE (SWAB -> BALL -> RAM)
    // ==========================================
    else if (isAttacking && cycle < 0.55) { 
        let p = (cycle - 0.15) / 0.40; 
        let depth = Math.sin(p * Math.PI) * 15;
        ctx.strokeStyle = "#546e7a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(23 - depth, 0.5); ctx.lineTo(33 - depth, 0.5); ctx.stroke();
    }
    else if (isAttacking && cycle < 0.65) { 
        ctx.fillStyle = "#212121"; 
        ctx.beginPath(); ctx.arc(22, -1 + Math.sin(cycle*40)*2, 2, 0, Math.PI*2); ctx.fill();
    } 
    else if (isAttacking && cycle < 0.90) { 
        let p = (cycle - 0.65) / 0.25;
        let depth = Math.sin(p * Math.PI) * 18; 
        ctx.strokeStyle = "#cfd8dc"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(23 - depth, 0.5); ctx.lineTo(35 - depth, 0.5); ctx.stroke();
    }
    else if (isAttacking && cycle < 0.99) { 
        let matchDip = Math.sin((cycle - 0.90) * 15) * 4;
        ctx.strokeStyle = "#ff5722"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(4, -7 + matchDip); ctx.lineTo(4, -2); ctx.stroke();
    }

    ctx.restore();
}}
 else {
 

        // --- MELEE LANCE ---
        let b = bob || 0; // Ensure 'b' (bob) from the top of drawCavalryUnit is used
        let meleeTime = Date.now() / 600; 
        let cycle = isAttacking ? meleeTime % 1.0 : 0;
        
        let lanceRot = 0;
        let thrustX = 0;
        let thrustY = 0;

        if (isAttacking) {
            // 3-Hit Combo System
            if (cycle < 0.33) {
                let p = cycle / 0.33;
                lanceRot = -Math.PI / 4 * Math.sin(p * Math.PI); 
            } else if (cycle < 0.66) {
                let p = (cycle - 0.33) / 0.33;
                lanceRot = Math.PI / 3 * Math.sin(p * Math.PI); 
            } else {
                let p = (cycle - 0.66) / 0.34;
                thrustX = Math.sin(p * Math.PI) * 18; 
                thrustY = Math.sin(p * Math.PI) * 3;
            }
        }

        // --- RENDER LANCE ---
        ctx.save();
        ctx.translate(2, -4 + b); 
        ctx.rotate(lanceRot);

        // Draw Lance Shaft
        ctx.strokeStyle = "#4e342e"; 
        ctx.lineWidth = 2.5; 
        ctx.beginPath(); 
        ctx.moveTo(-6 + thrustX, 0 + thrustY); 
        ctx.lineTo(26 + thrustX, 0 + thrustY); 
        ctx.stroke();
        
        // Hand
        ctx.fillStyle = "#ffccbc";
        ctx.beginPath();
        ctx.arc(thrustX, thrustY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw Lance Tip
        ctx.fillStyle = "#bdbdbd"; 
        ctx.beginPath(); 
        ctx.moveTo(26 + thrustX, -2 + thrustY); 
        ctx.lineTo(38 + thrustX, 0 + thrustY); 
        ctx.lineTo(26 + thrustX, 2 + thrustY); 
        ctx.fill();

        // Highlight
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(26 + thrustX, 0 + thrustY);
        ctx.lineTo(37 + thrustX, 0 + thrustY);
        ctx.stroke();

		ctx.restore(); // 1. Restores the Melee Lance rotation
    } // Closes the final 'else' weapon block

    ctx.restore(); // 2. Restores the Rider's 'bob' and elevation layer 

}  

// Fixed: Added 'frame' to the parameters and defined 'b' locally
function drawOffhandhorseBow(frame) {
//nevermind THIS RENDERS TWO BOWS IF I DRAW ANOTHER ONE
}