
function drawInfantryUnit(ctx, x, y, moving, frame, factionColor, type, isAttacking, side, unitName, isFleeing) {
    ctx.save();
    ctx.translate(x, y);

   // --- DYNAMIC ARMOR RETRIEVAL ---
    let armorVal = 2; 
    if (typeof UnitRoster !== 'undefined' && UnitRoster.allUnits[unitName]) {
        armorVal = UnitRoster.allUnits[unitName].armor;
    } else if (unitName && (unitName.includes("Elite") || type === "cataphract")) {
        armorVal = 40; // Elite/Super Heavy fallback
    } else if (unitName && unitName.includes("Heavy")) {
        armorVal = 25; // Standard Heavy fallback (matches Heavy Horse Archer)
    }

    if (unitName === "PLAYER" || unitName === "Commander") armorVal = Math.max(armorVal, 40);
	
    let legSwing = moving ? Math.sin(frame * 0.3) * 6 : 0;
    let bob = moving ? Math.abs(Math.sin(frame * 0.3)) * 2 : 0;
    let dir = side === "player" ? 1 : -1; 

    // 1. Legs
    ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-3 - legSwing, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(3 + legSwing, 9); ctx.stroke();

    ctx.translate(0, -bob); 
    
    // 2. Body: Base Faction Tunic (Mobs always wear faction color underneath)
    ctx.fillStyle = factionColor; ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(3, -10); ctx.lineTo(-3, -10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    
    // 3. ARMOR LAYERING
    if (armorVal >= 25) {
        // --- HEAVY TIER (25+): Steel Lamellar & SQUARE Pauldrons ---
        ctx.fillStyle = "#9e9e9e"; // Steel/Iron color
        ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1); ctx.lineTo(3, -9); ctx.lineTo(-3, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        // Steel Lamellar Texture (Lines)
        ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 0.5;
        for(let i = -8; i < -1; i+=2.5) {
            ctx.beginPath(); ctx.moveTo(-3, i); ctx.lineTo(3, i); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-1.5, i); ctx.lineTo(-1.5, i+2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(1.5, i); ctx.lineTo(1.5, i+2); ctx.stroke();
        }

        // SQUARE Asian-style Pauldrons
        ctx.fillStyle = factionColor; 
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        // Left pauldron
        ctx.fillRect(-6.5, -9.5, 3, 4.5); ctx.strokeRect(-6.5, -9.5, 3, 4.5);
        // Right pauldron
        ctx.fillRect(3.5, -9.5, 3, 4.5); ctx.strokeRect(3.5, -9.5, 3, 4.5);
        
        // Lamellar lines on the square pauldrons
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath(); ctx.moveTo(-6.5, -7.5); ctx.lineTo(-3.5, -7.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3.5, -7.5); ctx.lineTo(6.5, -7.5); ctx.stroke();

} else if (armorVal >= 8) {
        // --- MEDIUM TIER (8-24): Smooth Leather + FACTION PAULDRONS ---
        ctx.fillStyle = "#5d4037"; // Dark smooth leather/cloth vest
        ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(4, -1); ctx.lineTo(2.5, -9); ctx.lineTo(-2.5, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // ADDED: Square Pauldrons for Medium Tier (Faction Color, No Lines)
        ctx.fillStyle = factionColor; 
        ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 1;
        // Left pauldron
        ctx.fillRect(-6, -9, 2.5, 4); ctx.strokeRect(-6, -9, 2.5, 4);
        // Right pauldron
        ctx.fillRect(3.5, -9, 2.5, 4); ctx.strokeRect(3.5, -9, 2.5, 4);
    }
    // Low tier (<8) is left as the standard cloth tunic.

    // 4. Head Base
    ctx.fillStyle = "#d4b886"; 
    ctx.beginPath(); ctx.arc(0, -12, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    
    // 5. DYNAMIC HEADGEAR BY ARMOR TIER AND FACTION
    if (armorVal >= 25) {
        // --- HIGH TIER -> HEAVY HELMETS ---
        if (factionColor === "#c2185b") { 
            // Yamato (Crimson) -> Samurai Kabuto Helmet with Horns
            ctx.fillStyle = "#212121";
            ctx.beginPath(); ctx.arc(0, -13, 4, Math.PI, 0); ctx.fill(); 
            ctx.fillRect(-5, -13, 10, 2); 
            ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 1.5; 
            ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-4, -19); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(4, -19); ctx.stroke();
        } else if (factionColor === "#1976d2" || factionColor === "#455a64") { 
            // Mongol / Jinlord -> Heavy Spiked Steel Helmet with flaps
            ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#424242"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, -14, 4.5, Math.PI, 0); ctx.fill(); ctx.stroke(); 
            ctx.fillStyle = "#616161";
            ctx.beginPath(); ctx.moveTo(-1.5, -18.5); ctx.lineTo(1.5, -18.5); ctx.lineTo(0, -23); ctx.fill(); 
            ctx.fillStyle = "#4e342e"; 
            ctx.fillRect(-5, -14, 3, 5); ctx.fillRect(2, -14, 3, 5);
        } else if (factionColor === "#00838f") {
            // Iransar (Teal) -> Heavy Steel Conical Helm with Wrap
            ctx.fillStyle = "#eeeeee";
            ctx.beginPath(); ctx.arc(0, -14, 4, Math.PI, 0); ctx.fill();
            ctx.fillStyle = "#9e9e9e"; // Steel tip
            ctx.beginPath(); ctx.arc(0, -15, 3.5, Math.PI, 0); ctx.fill(); ctx.stroke();
        } else {
            // Default (Chinese/Korean) -> Steel Dome with Lamellar Neck Guard
            ctx.fillStyle = "#9e9e9e";
            ctx.beginPath(); ctx.arc(0, -14, 4, Math.PI, 0); ctx.fill(); ctx.stroke();
            ctx.fillStyle = factionColor; // Neck guard matching faction
            ctx.fillRect(-4.5, -14, 9, 3);
        }
    } else if (armorVal >= 8) {
        // --- MEDIUM TIER -> FACTION SPECIFIC LIGHT HATS ---
        if (factionColor === "#c2185b") { 
            // Yamato -> Ashigaru Jingasa (Flat Conical Hat)
            ctx.fillStyle = "#212121"; ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -15); ctx.lineTo(6, -12);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (factionColor === "#1976d2" || factionColor === "#455a64") { 
            // Mongol -> Fur-trimmed Leather Cap
            ctx.fillStyle = "#4e342e"; ctx.beginPath(); ctx.arc(0, -13, 3.5, Math.PI, 0); ctx.fill();
            ctx.fillStyle = "#795548"; ctx.fillRect(-4, -13, 8, 2); 
        } else if (factionColor === "#00838f") {
            // Iransar -> Simple Cloth Turban
            ctx.fillStyle = "#eeeeee";
            ctx.beginPath(); ctx.arc(0, -13.5, 3.5, 0, Math.PI * 2); ctx.fill();
        } else {
            // Default/Chinese/Viet -> Bamboo Rice Hat
            ctx.fillStyle = "#8d6e63"; 
            ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -16); ctx.lineTo(6, -12);
            ctx.quadraticCurveTo(0, -13.5, -6, -12); ctx.fill(); ctx.stroke();
        }
    } else {
        // --- LOW TIER -> Bare Head / Topknot ---
        ctx.fillStyle = "#212121"; // Dark hair
        ctx.beginPath(); ctx.arc(0, -14.5, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    
    // 6. WEAPONS LOGIC (Preserved perfectly)
    let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 : 0;
    
    if (isFleeing) {
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(2 * dir, -4); ctx.lineTo(4 * dir, -22 + weaponBob); ctx.stroke(); 
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 0.5;
        let flap = moving ? Math.sin(frame * 1.5) * 3 : 0; 
        ctx.beginPath();
        ctx.moveTo(4 * dir, -21 + weaponBob); 
        ctx.quadraticCurveTo((-4 * dir), -22 + weaponBob + flap, (-10 * dir), -18 + weaponBob); 
        ctx.quadraticCurveTo((-6 * dir), -14 + weaponBob - flap, 3 * dir, -12 + weaponBob); 
        ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    else if (type === "peasant") {
        let tipX = (12 + weaponBob) * dir; let tipY = -12 + weaponBob;
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-2 * dir, -4); ctx.lineTo(tipX, tipY); ctx.stroke();

        if (unitName === "Militia") {
            ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#444444"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX + (1.5 * dir), tipY + 1); 
            ctx.lineTo(tipX + (2.5 * dir), tipY + 6); ctx.lineTo(tipX - (0.5 * dir), tipY + 6.5); 
            ctx.lineTo(tipX - (1 * dir), tipY + 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(tipX, tipY, 1, 0, Math.PI * 2); ctx.fill();
        }
    }  
    else if (type === "spearman") {
        let isGlaive = unitName === "Glaiveman";
        ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-6 * dir, 4); ctx.lineTo((28 + weaponBob) * dir, -24 + weaponBob); ctx.stroke();
        ctx.fillStyle = "#bdbdbd"; 
        if (isGlaive) {
            ctx.beginPath(); ctx.moveTo((26 + weaponBob) * dir, -22 + weaponBob);
            ctx.quadraticCurveTo((32 + weaponBob) * dir, -30 + weaponBob, (28 + weaponBob) * dir, -32 + weaponBob);
            ctx.lineTo((25 + weaponBob) * dir, -24 + weaponBob); ctx.fill();
        } else {
            ctx.save();
            ctx.translate((28 + weaponBob) * dir, -24 + weaponBob);
            ctx.rotate(Math.PI * -0.25 * dir); 
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, 2); ctx.lineTo(8, 0); 
            ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        if (unitName.includes("Shield")) {
            ctx.fillStyle = "#5d4037"; ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
            ctx.fillStyle = "#424242"; 
            ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 2.5, 0, Math.PI * 2); ctx.fill();
        }
    }
    else if (type === "sword_shield") {
        ctx.strokeStyle = "#9e9e9e"; ctx.lineWidth = 2.5; 
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo((14 + weaponBob) * dir, -12 + (weaponBob/2)); ctx.stroke(); 
        ctx.fillStyle = "#5d4037"; ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 7.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
        ctx.fillStyle = "#424242"; 
        ctx.beginPath(); ctx.arc((6 + weaponBob/2) * dir, -4, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    else if (type === "two_handed") {
        ctx.strokeStyle = "#757575"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-2 * dir, -4); 
        ctx.quadraticCurveTo((10 + weaponBob) * dir, -10 + weaponBob, (18 + weaponBob) * dir, -22 + weaponBob); ctx.stroke();
        ctx.strokeStyle = "#212121"; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(2 * dir, -7); ctx.stroke();
    }
else if (type === "archer") {
        let archerTime = Date.now() / 1800; // Slightly faster than horse archer
        let cycle = isAttacking ? archerTime % 1.0 : 0.95;
        
        let handX = 6, handY = -8; 
        let drawHandX = handX, drawHandY = handY;
        let bowKhatra = 0;
        let hasArrow = false;

        // --- THE QUIVER (On the back) ---
        ctx.fillStyle = "#3e2723"; ctx.fillRect(-5, -6, 4, 10);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-1, -12); ctx.stroke(); // Arrow fletching peaking out

        // Phase Logic
        if (cycle < 0.2) { // REACH: Hand goes to back
            let p = cycle / 0.2;
            drawHandX = handX - (p * 10); drawHandY = handY - (p * 4);
            hasArrow = true;
        } else if (cycle < 0.4) { // NOCK: Bring arrow to bow
            let p = (cycle - 0.2) / 0.2;
            drawHandX = (handX - 10) + (10 * p); drawHandY = (handY - 4) + (4 * p);
            hasArrow = true;
        } else if (cycle < 0.75) { // DRAW: Pull back string
            let p = (cycle - 0.4) / 0.35;
            drawHandX = handX - (p * 12);
            hasArrow = true;
        } else { // RELEASE: Snap
            let p = (cycle - 0.75) / 0.25;
            bowKhatra = 0.4 * (1 - p);
            drawHandX = handX - 12 + (p * 4);
            hasArrow = false;
        }

        // Draw Bow
        ctx.save();
        ctx.translate(handX, handY); ctx.rotate(bowKhatra); ctx.translate(-handX, -handY);
        ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(handX-1, -18); 
        ctx.quadraticCurveTo(handX+10, -13, handX, handY); 
        ctx.quadraticCurveTo(handX+10, -3, handX-1, 2); ctx.stroke();
        
        // Dynamic String
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(handX-1, -18); ctx.lineTo(drawHandX, drawHandY); ctx.lineTo(handX-1, 2); ctx.stroke();
        ctx.restore();

        // The Arrow (Your requested style)
        if (hasArrow) {
            ctx.save();
            ctx.translate(drawHandX, drawHandY);
            if (cycle < 0.3) ctx.rotate(-Math.PI/3); 
            ctx.fillStyle = "#8d6e63"; ctx.fillRect(-4, -0.5, 14, 1); // Shaft
            ctx.fillStyle = "#9e9e9e"; ctx.fillRect(10, -1.5, 3, 3); // Head
            ctx.fillStyle = "#d32f2f"; ctx.fillRect(-4, -1.5, 3, 1); ctx.fillRect(-4, 0.5, 3, 1); // Feathers
            ctx.restore();
        }
    }
else if (type === "throwing") {
        if (unitName === "Slinger") {
            let slingerTime = Date.now() / 1500;
            let cycle = isAttacking ? slingerTime % 1.0 : 0;
            
            let handX = 4, handY = -8;
            let stoneX, stoneY;
            let isVisible = true;

            // --- THE POUCH (At waist) ---
            ctx.fillStyle = "#5d4037"; ctx.beginPath();
            ctx.ellipse(-2, 2, 3, 4, 0, 0, Math.PI*2); ctx.fill();

            if (cycle < 0.3) { // RELOAD: Reach for pouch
                let p = cycle / 0.3;
                handX = 4 - (p * 6); handY = -8 + (p * 10);
                stoneX = handX; stoneY = handY;
            } else if (cycle < 0.7) { // SPIN: Rotate the sling
                let p = (cycle - 0.3) / 0.4;
                let spinAngle = p * Math.PI * 6; // 3 full rotations
                handX = 6; handY = -10;
                // The stone orbits the hand
                stoneX = handX + Math.cos(spinAngle) * 12;
                stoneY = handY + Math.sin(spinAngle) * 4; // Elliptical spin
            } else { // THROW: Snap forward
                let p = (cycle - 0.7) / 0.3;
                handX = 6 + (p * 8); handY = -10 - (p * 2);
                isVisible = false; // Stone is gone!
            }

            // Draw Sling Cord
            ctx.strokeStyle = "#d4b886"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(handX, handY);
            if (isVisible) ctx.lineTo(stoneX, stoneY);
            else ctx.lineTo(handX + 10, handY + 5); // Empty cord trailing
            ctx.stroke();

            // Draw Stone/Bullet
            if (isVisible) {
                ctx.fillStyle = "#9e9e9e";
                ctx.beginPath(); ctx.arc(stoneX, stoneY, 2, 0, Math.PI*2); ctx.fill();
            }

            // Hand
            ctx.fillStyle = "#ffccbc"; ctx.beginPath(); ctx.arc(handX, handY, 2, 0, Math.PI*2); ctx.fill();
} else { 
            // 1. Draw extra javelins stored on the back/off-hand
            ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 1.5;
            ctx.fillStyle = "#bdbdbd";
            
            // Stored Javelin 1
            ctx.beginPath(); ctx.moveTo(-4 * dir, -2); ctx.lineTo(-8 * dir, -18); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-8 * dir, -18); ctx.lineTo(-10 * dir, -22); ctx.lineTo(-6 * dir, -19); ctx.fill();
            
            // Stored Javelin 2
            ctx.beginPath(); ctx.moveTo(-2 * dir, -2); ctx.lineTo(-5 * dir, -19); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-5 * dir, -19); ctx.lineTo(-6 * dir, -23); ctx.lineTo(-3 * dir, -20); ctx.fill();

            // 2. Active Javelin (Main hand)
            ctx.save();
            let handX = 2 * dir; let handY = -8;
            ctx.translate(handX, handY);
            
            // Rotate ~90 degrees upward, angle forward when attacking
            let angle = isAttacking ? (Math.PI / 4) * dir : (-Math.PI / 6) * dir;
            // Add a thrusting motion during the attack animation
            let thrust = isAttacking ? Math.sin(frame * 0.5) * 6 : 0;
            
            ctx.translate(thrust * dir, 0);
            ctx.rotate(angle);

            // Draw shaft
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -12); ctx.stroke();
            
            // Draw matching leaf-shaped Javelin Head
            ctx.beginPath();
            ctx.moveTo(0, -12); // Base of metal head
            ctx.lineTo(-2, -10); // Flare left
            ctx.lineTo(0, -18); // Sharp tip
            ctx.lineTo(2, -10); // Flare right
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
		} else if (type === "crossbow") { 
    let b = (typeof bob !== 'undefined') ? bob : 0; 

    if (unitName === "Repeater Crossbowman") {
        // --- REPEATER CROSSBOWMAN: MAGAZINE LOAD -> RAPID FIRE ---
        let repeatTime = Date.now() / 3000; 
        let cycle = isAttacking ? repeatTime % 1.0 : 0;
        
        let leverMove = 0;
        let shake = 0;
        let handX = 0, handY = 0;
        let loadingBolt = false;
        let boltInTray = false;

        // Phase 1: Loading 3 bolts one-by-one into the top (0% to 45% of cycle)
        if (cycle < 0.45) {
            loadingBolt = true;
            let loadP = (cycle / 0.45) * 3; 
            let individualBoltP = loadP % 1.0;
            
            // Revised Hand Movement: handY starts at -6 (Chest) instead of 5 (Knees)
            handX = individualBoltP < 0.5 ? -8 + (individualBoltP * 20) : 2;
            handY = individualBoltP < 0.5 ? -6 : -18 + (individualBoltP * 2); 
        } 
        // Phase 2: Rapid Lever Action (45% to 100% of cycle)
        else {
            let fireP = (cycle - 0.45) / 0.55; 
            leverMove = Math.sin(fireP * Math.PI * 2 * 3) * 5; 
            shake = (leverMove > 4) ? Math.random() * 2 : 0;
            boltInTray = leverMove > 0; 
        }

        ctx.save();
        ctx.translate(shake, shake + b);

        // Stock and Barrel
        ctx.fillStyle = "#4e342e"; ctx.fillRect(3, -11, 18, 3); 
        
        // The Magazine
        ctx.fillStyle = "#5d4037"; ctx.fillRect(5, -17, 14, 6); 
        ctx.strokeStyle = "#2b1b17"; ctx.lineWidth = 0.8; ctx.strokeRect(5, -17, 14, 6);

        // The Action Lever
        ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 3;
        ctx.beginPath(); 
        ctx.moveTo(9 + leverMove, -10); 
        ctx.lineTo(4 + leverMove, -18); 
        ctx.stroke();
        
        if (boltInTray) {
            ctx.fillStyle = "#9e9e9e"; ctx.fillRect(11, -11, 7, 1);
        }

        // Front Prod
        ctx.strokeStyle = "#212121"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(21, -15); ctx.lineTo(21, -7); ctx.stroke();
        
        // The Hand
        ctx.fillStyle = "#ffccbc";
        if (loadingBolt) {
            ctx.beginPath(); ctx.arc(handX, handY, 2.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#9e9e9e";
            ctx.fillRect(handX - 2, handY - 1, 5, 1);
        } else {
            // Hand stays high on the lever neck
            ctx.beginPath(); ctx.arc(4 + leverMove, -18, 2.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();

    } else {
        // --- STANDARD/POISON/HEAVY: FOOT SPANNING WITH ROTATION ---
        let spanTime = (unitName === "Heavy Crossbowman") ? 5500 : 4500; 
        let cycle = isAttacking ? (Date.now() / spanTime) % 1.0 : 0.95;
        
        let weaponRot = 0, weaponX = 0, weaponY = 0;
        let bodyDip = 0, stringPull = 0, hasBolt = false;
        let loadHand = false, hX = 0, hY = 0;
        let isPoison = (unitName === "Poison Crossbowman");

        if (cycle < 0.15) {
            let p = cycle / 0.15;
            weaponRot = p * (Math.PI / 2.2);
            weaponY = p * 12; weaponX = p * 4;
            bodyDip = p * 4;
        } else if (cycle < 0.4) {
            weaponRot = Math.PI / 2.2; weaponY = 12; weaponX = 4; bodyDip = 4;
            stringPull = ((cycle - 0.15) / 0.25) * 8;
        } else if (cycle < 0.55) {
            let p = (cycle - 0.4) / 0.15;
            weaponRot = (Math.PI / 2.2) * (1 - p);
            weaponY = 12 * (1 - p); weaponX = 4 * (1 - p);
            bodyDip = 4 * (1 - p); stringPull = 8;
        } else if (cycle < 0.85) {
            stringPull = 8; loadHand = true;
            let lp = (cycle - 0.55) / 0.3;
            if (lp < 0.4) { hX = -8 * (lp / 0.4); hY = 2; } 
            else { 
                let lp2 = (lp - 0.4) / 0.6;
                hX = -8 + (lp2 * 18); hY = 2 - (lp2 * 10);
            }
        } else {
            stringPull = 8; hasBolt = (cycle < 0.97);
        }

        ctx.save();
        ctx.translate(0, bodyDip + b); 
        ctx.save();
        ctx.translate(weaponX, weaponY - 10);
        ctx.rotate(weaponRot);
        ctx.translate(0, 10);
        ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -10, 16, 3);
        ctx.strokeStyle = "#424242"; ctx.lineWidth = 1; ctx.strokeRect(16, -10, 3, 3);
        ctx.strokeStyle = isPoison ? "#2e7d32" : "#3e2723"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, -16);
        ctx.quadraticCurveTo(22 - (stringPull * 0.4), -8.5, 14, -1); ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(14, -16); ctx.lineTo(14 - stringPull, -8.5); ctx.lineTo(14, -1); ctx.stroke();
        if (hasBolt) {
            ctx.fillStyle = isPoison ? "#4caf50" : "#9e9e9e";
            ctx.fillRect(14 - stringPull, -9.5, 8, 1.5);
        }
        if (cycle >= 0.15 && cycle < 0.4) {
            ctx.fillStyle = "#ffccbc";
            ctx.beginPath(); ctx.arc(14 - stringPull, -8.5, 2.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        if (loadHand) {
            ctx.fillStyle = "#ffccbc";
            ctx.beginPath(); ctx.arc(hX, hY, 2.5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = isPoison ? "#4caf50" : "#9e9e9e";
            ctx.fillRect(hX - 3, hY - 0.5, 6, 1.2); 
        }
        ctx.restore();
    }
}
// FINALLY: Correctly chained without the syntax-breaking extra braces
else if (unitName && unitName.includes("Firelance")) {
    // Firelance rendering and logic goes here

        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(21 + weaponBob, -8); ctx.stroke();
        ctx.fillStyle = "#212121"; ctx.fillRect(14 + weaponBob, -10, 7, 4);
        ctx.fillStyle = "#9e9e9e"; 
        ctx.beginPath(); ctx.moveTo(21 + weaponBob, -8); ctx.lineTo(24 + weaponBob, -10); 
        ctx.lineTo(29 + weaponBob, -8); ctx.lineTo(24 + weaponBob, -6); ctx.closePath(); ctx.fill();
        if (isAttacking) {
            ctx.fillStyle = "#ff5722"; ctx.beginPath(); ctx.arc(22 + weaponBob, -8, 1.5 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(100, 100, 100, 0.4)";
            ctx.beginPath(); ctx.arc(24 + weaponBob, -10, 4 + Math.random()*3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(28 + weaponBob, -12, 2 + Math.random()*2, 0, Math.PI * 2); ctx.fill();
        }
    } 
    else if (type === "gun") {
        ctx.strokeStyle = "#424242"; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(14 + weaponBob, -8); ctx.stroke();
        if (isAttacking) { 
            ctx.fillStyle = "#ff5722"; ctx.beginPath(); ctx.arc(16 + weaponBob, -9, 1 + Math.random()*1, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(140, 140, 140, 0.5)"; 
            ctx.beginPath(); ctx.arc(20 + weaponBob, -11, 5 + Math.random()*4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(26 + weaponBob, -13, 7 + Math.random()*5, 0, Math.PI * 2); ctx.fill();
        }
    }
    else if (unitName === "Bomb") {
        ctx.save();
        if (isAttacking) { ctx.rotate(Math.PI / 4); } else { ctx.rotate(-Math.PI / 10); }
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
        ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.quadraticCurveTo(4, -18, 3, -14); ctx.stroke();
        ctx.fillStyle = "#424242"; ctx.beginPath(); ctx.arc(3, -14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    } 
    else if (unitName === "Rocket") {
        ctx.save();
        ctx.translate(4 * dir, -6);
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
        for(let i=-1; i<=1; i++) { 
            ctx.beginPath(); ctx.moveTo(-8 * dir, i*2); ctx.lineTo(10 * dir + weaponBob, -4 + i*2); ctx.stroke();
        }
        ctx.fillStyle = "#424242"; ctx.fillRect(-10 * dir, -3, 4 * dir, 6); 
        if (isAttacking) {
            ctx.fillStyle = "rgba(180, 180, 180, 0.6)";
            for(let j=0; j<3; j++) {
                ctx.beginPath(); ctx.arc(-14 * dir - (j*5), 2 + (Math.random()*4-2), 3+j, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.strokeStyle = "#ff9800"; ctx.lineWidth = 1; 
        ctx.beginPath(); ctx.moveTo(-10 * dir, 0); ctx.lineTo(-14 * dir, 4); ctx.stroke();
        ctx.restore();
    }
    else if (type === "shortsword" || (typeof unit !== 'undefined' && unit.stats && unit.stats.isRanged && unit.stats.ammo <= 0)) {
        if (type === "shortsword" || (typeof unit !== 'undefined' && unit.stats.isRanged)) {
            ctx.strokeStyle = "#9e9e9e"; ctx.lineWidth = 2.5; 
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo((12 + weaponBob) * dir, -10 + (weaponBob / 2)); ctx.stroke(); 
            ctx.strokeStyle = "#212121"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(1 * dir, -5); ctx.lineTo(3 * dir, -8); ctx.stroke();
        }
    }
    ctx.restore();
}
 