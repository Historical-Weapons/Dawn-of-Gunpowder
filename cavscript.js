
function drawCavalryUnit(ctx, x, y, moving, frame, factionColor, isAttacking, type, side, unitName, isFleeing) {
    ctx.save();
    ctx.translate(x, y);
    
    // --- DYNAMIC ARMOR RETRIEVAL ---
    let armorVal = 2; 
    if (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits[unitName]) {
        armorVal = UnitRoster.allUnits[unitName].armor;
    } else if (unitName && (unitName.includes("Heavy") || unitName.includes("Elite") || type === "cataphract")) {
        armorVal = 40; // High fallback for cavalry
    }

    if (unitName === "PLAYER" || unitName === "Commander") armorVal = Math.max(armorVal, 40);

    let animFrame = frame || (Date.now() / 100);
    let dir = side === "player" ? 1 : -1;
    ctx.scale(dir, 1);

    let isMoving = moving || (typeof vx !== 'undefined' && (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1));
    let legSwing = isMoving ? Math.sin(animFrame * 0.4) : 0; // Normalized for scaling
    let bob = isMoving ? Math.sin(animFrame * 0.4) * 2 : 0;
    
    // Default rider physics (adjusted later if mount is massive)
    let riderBob = isMoving ? Math.sin(animFrame * 0.4 + 0.5) * 1.5 : 0;
    let riderHeightOffset = 0; 

    ctx.lineCap = "round"; ctx.lineJoin = "round";

    let isElephant = type === "elephant";
    let isCamel = type === "camel";

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

        // Boost the rider way up to sit on the back!
        riderHeightOffset = -32; 

    } else if (type === "camel") {
        // ==========================================
        //      DEDICATED CAMEL BLOCK (REVISED)
        // ==========================================
        let mScale = 1.25; 
        let mBob = bob * mScale;

        ctx.lineCap = "round"; 
        ctx.lineJoin = "round";

        // Helper function for articulated, pacing camel legs
        const drawLeg = (isFront, isNear) => {
            // Camels "pace" - legs on the same side move together.
            let offset = isNear ? 0 : Math.PI; 
            let phase = (animFrame * 0.3) + offset;
            
            let swing = Math.sin(phase); // Forwards/backwards motion
            let lift = Math.max(0, -Math.cos(phase)); // Lifts hoof when moving forward
            
            ctx.beginPath();
            let endX, endY;
            
            // Far legs are darker and slightly thinner for depth
            ctx.strokeStyle = isNear ? "#4A3320" : "#2d1c15";
            ctx.lineWidth = (isNear ? 2.5 : 2.0) * mScale;
            
            if (isFront) {
                let startX = (isNear ? 6 : 4) * mScale;
                let startY = mBob + 4 * mScale;
                
                // Knobby knee joint
                let kneeX = startX + swing * 4 * mScale;
                let kneeY = startY + 6 * mScale - lift * 1.5 * mScale;
                
                endX = kneeX + swing * 1.5 * mScale;
                endY = kneeY + 5 * mScale - lift * 3 * mScale;

                ctx.moveTo(startX, startY);
                ctx.lineTo(kneeX, kneeY); // Upper arm
                ctx.lineTo(endX, endY);   // Lower leg
            } else {
                let startX = (isNear ? -6 : -8) * mScale;
                let startY = mBob + 3 * mScale;
                
                // Stifle/Thigh joint
                let stifleX = startX + swing * 3 * mScale;
                let stifleY = startY + 5 * mScale - lift * mScale;
                
                // Hock/Ankle joint
                let hockX = stifleX - 1.5 * mScale + swing * 2 * mScale;
                let hockY = stifleY + 3 * mScale - lift * 2 * mScale;
                
                endX = hockX + 1.5 * mScale;
                endY = hockY + 3 * mScale - lift * 1 * mScale;

                ctx.moveTo(startX, startY);
                ctx.lineTo(stifleX, stifleY); // Thigh
                ctx.lineTo(hockX, hockY);     // Calf
                ctx.lineTo(endX, endY);       // Ankle
            }
            ctx.stroke();
            
            // Fleshy split camel pads
            ctx.fillStyle = isNear ? "#bcaaa4" : "#8d7b76";
            ctx.beginPath();
            ctx.ellipse(endX, endY + 0.5 * mScale, 3.2 * mScale, 1.8 * mScale, 0, 0, Math.PI*2);
            ctx.fill(); ctx.stroke();
        };

        // --- Z-ORDER 1: FAR LEGS & TAIL ---
        drawLeg(true, false);  // Front Far
        drawLeg(false, false); // Back Far

        // Tail (Swinging slightly opposite to bob)
        ctx.strokeStyle = "#2d1c15"; ctx.lineWidth = 1.5 * mScale;
        ctx.beginPath(); ctx.moveTo(-11 * mScale, mBob + 2 * mScale);
        ctx.quadraticCurveTo(-15 * mScale, mBob + 4 * mScale + (bob*0.5), -12 * mScale, mBob + 9 * mScale);
        ctx.stroke();
        // Tail tuft
        ctx.fillStyle = "#2d1c15"; ctx.beginPath(); 
        ctx.arc(-12 * mScale, mBob + 9 * mScale, 1.8 * mScale, 0, Math.PI*2); ctx.fill();

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

        // Face Details (Eye & Snout line)
        ctx.fillStyle = "#2d1c15";
        ctx.beginPath(); ctx.arc(22 * mScale, mBob - 14 * mScale, 0.8 * mScale, 0, Math.PI*2); ctx.fill(); // Eye
        ctx.beginPath(); ctx.moveTo(24.5 * mScale, mBob - 9.5 * mScale); ctx.lineTo(25.5 * mScale, mBob - 9.5 * mScale); ctx.stroke(); // Snout line

        // Ear
        ctx.fillStyle = "#D4B886";
        ctx.beginPath(); ctx.moveTo(19 * mScale, mBob - 15 * mScale);
        ctx.lineTo(17 * mScale, mBob - 18 * mScale); ctx.lineTo(20 * mScale, mBob - 16 * mScale);
        ctx.fill(); ctx.stroke();

        // --- Z-ORDER 3: ARMOR ---
        if (armorVal >= 25) {
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
		
} else {
    // ==========================================
    //   REVISED FWD-WALKING MUSCULAR HORSE
    // ==========================================
    let hBob = bob;
    
    // Walk speed remains slower for 4-beat sequence
    let walkSpeed = animFrame * 0.15; 
    
    // Subtle head and tail movements synced to the walk cycle (flipped signs for fwd)
    let headNod = (typeof isMoving !== 'undefined' && isMoving) ? Math.sin(walkSpeed * 2) * 1.5 : 0;
    let tailSwish = (typeof isMoving !== 'undefined' && isMoving) ? Math.sin(walkSpeed) * 2.5 : 0;

    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // Re-calculating standard colors based on input
    const bodyColor = "#795548";
    const darkBodyColor = "#5D4037"; // For near leg fill
    const farLegColor = "#3e2723";   // For far leg fill (darkest)
    const lineColor = "#3e2723";

    // --- HELPER: draw Muscular Leg ---
    // Instead of lines, this draws shaped paths for a filled, professional look.
    const drawMuscularLeg = (isFront, isNear, phaseOffset) => {
        let phase = walkSpeed + phaseOffset;
        let swing = Math.sin(phase);
        let lift = Math.max(0, -Math.cos(phase)); 

        // Define leg fill color based on near/far
        ctx.fillStyle = isNear ? darkBodyColor : farLegColor;
        
        ctx.beginPath();
        
        if (isFront) {
            // Front Leg (pointing left): Shoulder -> Knee -> Fetlock -> Hoof
            let startX = isNear ? -7 : -4; // Shoulder attachment
            let startY = hBob + 4;
            
            // Define joint locations with animation
            let kneeX = startX - 1 + swing * 3;
            let kneeY = startY + 6 - lift * 2;
            
            let fetlockX = kneeX + swing * 1.5;
            let fetlockY = kneeY + 5 - lift * 3.5;
            
            let hoofX = fetlockX - (lift > 0.1 ? 1 : 0);
            let hoofY = fetlockY + 2.5;

            // Draw Muscular Path
            ctx.moveTo(startX + 2, startY); // Upper shoulder front
            ctx.quadraticCurveTo(startX - 2, startY + 2, kneeX - 1.5, kneeY); // Front muscle
            ctx.lineTo(hoofX - 1.5, hoofY); // Down to hoof front
            ctx.lineTo(hoofX + 1.5, hoofY); // Hoof bottom
            ctx.lineTo(fetlockX + 1.2, fetlockY); // Back of pastern
            ctx.quadraticCurveTo(kneeX + 1.8, kneeY + 1, startX + 2.5, startY + 3); // Back muscle
            ctx.closePath();

        } else {
            // Back Leg (pointing left): Hip -> Stifle -> Hock -> Fetlock -> Hoof
            let startX = isNear ? 5 : 7; // Hip attachment
            let startY = hBob + 3;
            
            // Define joint locations with animation
            let stifleX = startX - 2 + swing * 1.5;
            let stifleY = startY + 4 - lift * 0.5;
            
            let hockX = stifleX + 1.5 + swing * 2;
            let hockY = stifleY + 4 - lift * 1.5;
            
            let fetlockX = hockX - 1.5 + swing * 1.5;
            let fetlockY = hockY + 4 - lift * 2.5;

            let hoofX = fetlockX - (lift > 0.1 ? 1 : 0);
            let hoofY = fetlockY + 2.5;

            // Draw Muscular Path
            ctx.moveTo(startX + 3, startY); // Upper hip back
            ctx.quadraticCurveTo(startX + 4, startY + 5, hockX + 1.8, hockY); // Big rear hamstring
            ctx.lineTo(hoofX + 1.5, hoofY); // Down to hoof back
            ctx.lineTo(hoofX - 1.5, hoofY); // Hoof bottom
            ctx.lineTo(fetlockX - 1.2, fetlockY); // Front of pastern
            ctx.quadraticCurveTo(hockX - 2, hockY - 1, stifleX - 1, stifleY); // Front Gaskin muscle
            ctx.quadraticCurveTo(startX - 1, startY + 1, startX - 2, startY); // Up to flank
            ctx.closePath();
        }
        
        ctx.fill(); // Clean fill, no stroke on muscles

        // Draw basic Hoof (darker, simple polygon over the leg fill)
        ctx.fillStyle = "#212121";
        // Recalculate hoof position based on last fetlockX/Y
        let liftCalc = Math.max(0, -Math.cos(walkSpeed + phaseOffset));
        let swingCalc = Math.sin(walkSpeed + phaseOffset);
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
        ctx.moveTo(hX - 1.8, hY + 1); // bottom back
        ctx.lineTo(hX + 1.8, hY + 1); // bottom front
        ctx.lineTo(hX + 1.2, hY - 1.5); // top front
        ctx.lineTo(hX - 1.2, hY - 1.5); // top back
        ctx.closePath();
        ctx.fill();
    };

    // --- Z-ORDER 1: FAR LEGS & TAIL ---
    // RH (+pi), RF (+pi/2)
    drawMuscularLeg(false, false, Math.PI);         // Far Back (Right Hind)
    drawMuscularLeg(true, false, Math.PI / 2);      // Far Front (Right Fore)

    // Fluid, swishing tail (flipped to point right)
    ctx.strokeStyle = "#2d1c15"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(11, hBob - 2); // Start at right rump
    ctx.bezierCurveTo(15 + tailSwish, hBob - 2, 18 + tailSwish, hBob + 4, 14 + tailSwish * 0.5, hBob + 12);
    ctx.stroke();

    // --- Z-ORDER 2: CLEAN BODY ANATOMY (FLIPPED FWD) ---
    ctx.fillStyle = bodyColor; ctx.strokeStyle = lineColor; ctx.lineWidth = 1.2;
    let horseBody = new Path2D();
    
    horseBody.moveTo(12, hBob + 2); // Start at rump (right)
    horseBody.quadraticCurveTo(12, hBob - 6, 5, hBob - 6); // Top of rump
    horseBody.quadraticCurveTo(0, hBob - 4, -6, hBob - 5);    // Back/Saddle area
    
    // Long, High-Crested Neck (pointing left, with headNod)
    horseBody.quadraticCurveTo(-10, hBob - 10 + headNod, -13, hBob - 16 + headNod); 
    horseBody.lineTo(-15, hBob - 17 + headNod); // Poll
    
    // Long Noble Snout
    horseBody.lineTo(-24, hBob - 11 + headNod); // Top of long nose
    horseBody.quadraticCurveTo(-26, hBob - 8 + headNod, -24, hBob - 6 + headNod);  // Muzzle tip
    horseBody.lineTo(-18, hBob - 4 + headNod);  // Jawline
    
    // Under-neck and Chest
    horseBody.quadraticCurveTo(-12, hBob - 2 + headNod, -9, hBob + 5);   // Gullet to chest
    horseBody.quadraticCurveTo(-8, hBob + 10, 0, hBob + 10);  // Belly
    horseBody.quadraticCurveTo(10, hBob + 10, 12, hBob + 2); // Back to start
    horseBody.closePath();

    ctx.fill(horseBody); 
    ctx.stroke(horseBody);

    // Mane & Eye (Moves with headNod, flipped)
    ctx.strokeStyle = "#212121"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-8, hBob - 7 + (headNod*0.5)); 
    ctx.quadraticCurveTo(-11, hBob - 13 + headNod, -14, hBob - 16 + headNod); ctx.stroke();
    
    ctx.fillStyle = "#111"; ctx.beginPath(); 
    ctx.arc(-19, hBob - 10 + headNod, 1.2, 0, Math.PI*2); ctx.fill();

    // High Alert Ears (flipped)
    ctx.fillStyle = bodyColor; ctx.beginPath();
    ctx.moveTo(-13, hBob - 16 + headNod); ctx.lineTo(-13, hBob - 20 + headNod); 
    ctx.lineTo(-15, hBob - 17 + headNod); ctx.fill(); ctx.stroke();

 

    // --- Z-ORDER 4: NEAR LEGS ---
    // LH (0), LF (-pi/2)
    drawMuscularLeg(false, true, 0);               // Near Back (Left Hind)
    drawMuscularLeg(true, true, -Math.PI / 2);     // Near Front (Left Fore)

		
	}
    // ==========================================
    // 3. RIDER BODY & ARMOR (Now applies to ALL mounts)
    // ==========================================
    ctx.save();
    
    // Applying riderHeightOffset so the elephant rider sits up high!
    ctx.translate(-1, (isCamel ? -7 : -4) + bob + riderBob + riderHeightOffset);
    
    // Base Faction Tunic
    ctx.fillStyle = factionColor; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -9); ctx.lineTo(-2, -9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    
    // RIDER ARMOR LAYERS
    if (unitName.includes("Elite") || armorVal >= 40) {
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
    
    // Rider Head Base
    ctx.fillStyle = "#d4b886";
    ctx.beginPath(); ctx.arc(0, -11, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

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
            ctx.fillStyle = "#eeeeee"; ctx.beginPath(); ctx.arc(0, -13, 3.5, Math.PI, 0); ctx.fill();
            ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.arc(0, -14, 3, Math.PI, 0); ctx.fill(); ctx.stroke();
        } else {
            ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); ctx.arc(0, -13, 3.5, Math.PI, 0); ctx.fill(); ctx.stroke();
            ctx.fillStyle = factionColor; ctx.fillRect(-4, -13, 8, 2.5); // Neck guard
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
            ctx.fillStyle = "#eeeeee";
            ctx.beginPath(); ctx.arc(0, -12.5, 3, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = "#8d6e63"; 
            ctx.beginPath(); ctx.moveTo(-6, -11); ctx.lineTo(0, -15); ctx.lineTo(6, -11);
            ctx.quadraticCurveTo(0, -12.5, -6, -11); ctx.fill(); ctx.stroke();
        }
    } else {
        // Low Tier Topknot
        ctx.fillStyle = "#212121"; ctx.beginPath(); ctx.arc(0, -13.5, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // --- WEAPONS LOGIC ---
    let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 : 0;

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
        let time = Date.now() / 200; 
        let pull = (Math.sin(time) * 0.5 + 0.5); 
        let khatra = (1 - pull) * 0.4; 
        let handX = 6 + weaponBob; let handY = -6; 

        ctx.save();
        ctx.translate(handX, handY); ctx.rotate(khatra); ctx.translate(-handX, -handY);
        ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(handX - 4, -14); 
        ctx.quadraticCurveTo(handX + 6, -10, handX, handY); 
        ctx.quadraticCurveTo(handX + 6, -2, handX - 4, 2); ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(handX - 4, -14); 
        let stringX = (handX - 4) - (pull * 8); 
        ctx.lineTo(stringX, handY); ctx.lineTo(handX - 4, 2); ctx.stroke();
        ctx.restore();
    }
    else if (type === "camel") {
        ctx.strokeStyle = "#212121"; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(12 + weaponBob, -5); ctx.stroke();
        if (isAttacking) { 
            ctx.fillStyle = "#ff9800"; ctx.beginPath(); ctx.arc(14 + weaponBob, -5, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(158, 158, 158, 0.6)"; ctx.beginPath(); ctx.arc(18 + weaponBob, -8, 6, 0, Math.PI * 2); ctx.fill();
        }
    } else {
        let attackThrust = isAttacking ? 10 : 0;
        ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(26 + attackThrust, -4 + (attackThrust/3)); ctx.stroke();
        ctx.fillStyle = "#bdbdbd"; ctx.fillRect(26 + attackThrust, -5 + (attackThrust/3), 6, 2); 
    }
    ctx.restore();

    // The final main restore for the base mount translation at the start of the function
    ctx.restore();
}