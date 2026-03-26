function drawInfantryUnit(ctx, x, y, moving, frame, factionColor, type, isAttacking, side, unitName, isFleeing, cooldown, unitAmmo, unit, reloadProgress) {
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
    
    // Fixed: Shorter guard (1.5 height) so it doesn't cover the eyes
    ctx.fillStyle = factionColor; 
    ctx.fillRect(-4.5, -14, 9, 1.5); 
}
    } else if (armorVal >= 8) {
        // --- MEDIUM TIER -> FACTION SPECIFIC LIGHT HATS ---
        if (factionColor === "#c2185b") { 
            // Yamato -> Ashigaru Jingasa (Flat Conical Hat)
            ctx.fillStyle = "#212121"; ctx.strokeStyle = "#fbc02d"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -15); ctx.lineTo(6, -12);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (factionColor === "#1976d2" || factionColor === "#455a64") {

			
// --- SURGERY: Replace the Mongol/Nomad helmet logic in infscript.js ---

// Identify if this is an elite/heavy unit that should keep its default armor
const isEliteMongol = unitName && (unitName.includes("Heavy") || unitName.includes("Elite") || unitName.includes("Mangadai"));
const isMongolFaction = (factionColor === "#1976d2" || factionColor === "#455a64");

if (isMongolFaction) {
    if (isEliteMongol || armorVal >= 25) {
        // DEFAULT: Heavy Spiked Steel Helmet (for elites/heavy)
        ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#424242"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -13, 4.5, Math.PI, 0); ctx.fill(); ctx.stroke(); 
        ctx.fillStyle = "#616161";
        ctx.beginPath(); ctx.moveTo(-1.5, -17.5); ctx.lineTo(1.5, -17.5); ctx.lineTo(0, -22); ctx.fill(); 
        ctx.fillStyle = "#4e342e"; 
        ctx.fillRect(-5, -13, 3, 5); ctx.fillRect(2, -13, 3, 5); // Flaps
    } else {
        // NEW: Universal Mongol Hat (Conical fur cap)
        // 1. Fur Brim
        ctx.fillStyle = "#5d4037"; 
        ctx.fillRect(-4.5, -14, 9, 3);
        // 2. Conical Top (Faction colored)
        ctx.fillStyle = factionColor;
        ctx.beginPath();
        ctx.moveTo(-4, -13);
        ctx.lineTo(0, -19);
        ctx.lineTo(4, -13);
        ctx.fill();
        // 3. Small Red Tassel
        ctx.fillStyle = "#d32f2f";
        ctx.fillRect(-0.5, -20, 1, 2);
    }
}
        
		} else if (factionColor === "#00838f") {
            // Iransar -> Simple Cloth Turban
ctx.fillStyle = "#eeeeee";
    // 1. The top dome of the turban (Half-circle)
    ctx.beginPath(); ctx.arc(0, -14, 4, Math.PI, 0); ctx.fill();
    // 2. The cloth wrap wrapping around the forehead
    ctx.fillRect(-4, -14, 8, 2);
        } else {
            // Default/Chinese/Viet -> Bamboo Rice Hat
            ctx.fillStyle = "#8d6e63"; 
            ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(0, -16); ctx.lineTo(6, -12);
            ctx.quadraticCurveTo(0, -13.5, -6, -12); ctx.fill(); ctx.stroke();
        }
    } else {
// --- SIMPLE HAIR (clean + safe) ---
ctx.fillStyle = "#212121";

// top cap
ctx.beginPath();
ctx.arc(0, -13.5, 3.6, Math.PI, 0);
ctx.fill();

// small side hints (optional, very subtle)
ctx.fillRect(-3.8, -12, 0.8, 2.5);
ctx.fillRect(3.0, -12, 0.8, 2.5);
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
	//PEASANTS
	
else if (type === "peasant") {
		
    const isMilitia = unitName === "Militia";
    
    // 1. RESILIENT SEED GENERATION
    let seed = 0;
    if (typeof unit !== 'undefined' && unit !== null) {
        if (typeof unit.id === 'number') {
            seed = Math.abs(unit.id);
        } else if (typeof unit.id === 'string') {
            // Hash a string ID (like a UUID) into a number
            for (let i = 0; i < unit.id.length; i++) {
                seed += unit.id.charCodeAt(i);
            }
        } else {
            // If no ID exists, create a permanent random seed on the unit object
            // This prevents the weapon from flickering every frame
            if (typeof unit._weaponSeed === 'undefined') {
                unit._weaponSeed = Math.floor(Math.random() * 1000);
            }
            seed = unit._weaponSeed;
        }
    }
    
    let weaponType = seed % 10; // Expanded to 10 weapons
    
 

    let wBob = (typeof weaponBob !== 'undefined') ? weaponBob : (typeof bob !== 'undefined' ? bob : 0);
    let maxCd = 300;
    let currentCd = (typeof cooldown !== 'undefined') ? cooldown : 0;
    let cycle = isAttacking ? (maxCd - currentCd) / maxCd : 0;

    // Separate animation profiles based on the weapon
    let isThrusting = (weaponType === 0 || weaponType === 1 || weaponType === 4);
    
    let thrust = 0;
    let swingAngle = 0;

    if (isAttacking) {
        if (isThrusting) {
            // Snappy, rapid thrust animation
            thrust = cycle < 0.2 ? (cycle / 0.2) * 12 : 12 * (1 - (cycle - 0.2) / 0.8);
        } else {
            // Heavy overhead/side swinging animation (used by axes, hammers, scythes)
            swingAngle = Math.sin(cycle * Math.PI) * (Math.PI / 1.5);
        }
    }

    // --- DRAWING OFF-HAND / SHIELD ---
    if ([4, 5, 8].includes(weaponType)) {
        ctx.save();
        let shieldPush = isAttacking ? 2 : 0;
        ctx.translate((2 + shieldPush) * dir, -3 + wBob);
        
        if (weaponType === 4) {
 
				// --- Chinese Tengpai (Woven Rattan Shield) ---
				ctx.save();
				let shieldRadius = 8; // Medium-large circular shield
				
				// 1. Base Rattan Color (Light Straw/Gold)
				ctx.fillStyle = "#e3c58d"; 
				ctx.beginPath();
				ctx.arc(0, 0, shieldRadius, 0, Math.PI * 1.5);
				ctx.fill();

				// 2. Woven Coils (Concentric rings to show the rattan wrap)
				ctx.strokeStyle = "#a0522d"; // Golden brown
				ctx.lineWidth = 0.6;
				for (let r = 1; r <= shieldRadius; r += 1.5) {
					ctx.beginPath();
					ctx.arc(0, 0, r, 0, Math.PI * 2);
					ctx.stroke();
				}

				// 3. The Radial Weave (The "Star" pattern that binds the coils)
				ctx.strokeStyle = "#6d4c41"; // Darker brown for depth
				ctx.lineWidth = 0.4;
				for (let i = 0; i < 12; i++) {
					let angle = (i * Math.PI) / 6;
					ctx.beginPath();
					ctx.moveTo(0, 0);
					// We use a slight curve or dashed line to simulate weaving over/under
					ctx.lineTo(Math.cos(angle) * shieldRadius, Math.sin(angle) * shieldRadius);
					ctx.stroke();
				}

				// 4. Central "Peak" (The reinforced center point)
				ctx.fillStyle = "#8d6e63";
				ctx.beginPath();
				ctx.arc(0, 0, 2, 0, Math.PI * 2);
				ctx.fill();
				// Tiny highlight on the peak
				ctx.fillStyle = "#ffe0b2";
				ctx.beginPath();
				ctx.arc(-0.5 * dir, -0.5, 0.5, 0, Math.PI * 2);
				ctx.fill();

				// 5. Reinforced Outer Rim
				ctx.strokeStyle = "#5d4037";
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
				ctx.stroke();

				ctx.restore();
}
        

		else if (weaponType === 5) {
    // --- Improvised Plank Shield (Worn/Scrap Wood) ---
    ctx.save();
    
    let sW = 7;  // Total width
    let sH = 12; // Total height
    let xOff = -3.5 * dir; // Center the shield on the arm
    
    // 1. Draw 3 individual vertical planks
    let plankWidth = sW / 3;
    let woodColors = ["#795548", "#6d4c41", "#8d6e63"]; // Slight variations in wood tone
    
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = woodColors[i];
        ctx.fillRect(xOff + (i * plankWidth * dir), -sH/2, plankWidth * dir, sH);
        
        // Plank gaps/outlines
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(xOff + (i * plankWidth * dir), -sH/2, plankWidth * dir, sH);
    }

    // 2. Horizontal Cross-Braces (The "Battens" holding them together)
    ctx.fillStyle = "#5d4037";
    // Top brace
    ctx.fillRect(xOff - (0.5 * dir), -4, (sW + 1) * dir, 2);
    // Bottom brace
    ctx.fillRect(xOff - (0.5 * dir), 2, (sW + 1) * dir, 2);

    // 3. Iron Nails (Tiny silver dots on the braces)
    ctx.fillStyle = "#bdbdbd";
    for (let row = -3; row <= 3; row += 6) { // Top and bottom brace
        for (let col = 0; col < 3; col++) { // One nail per plank
            let nailX = xOff + (col * plankWidth + plankWidth/2) * dir;
            ctx.beginPath();
            ctx.arc(nailX, row, 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 4. Rough/Chipped Edges (Optional: adds a jagged look)
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 1;
    ctx.strokeRect(xOff, -sH/2, sW * dir, sH);

    ctx.restore();
}
else if (weaponType === 8) {
    // --- Chinese Steamer Lid (Flipped/Inside View) ---
    ctx.save();
    let shieldRadius = 9; // Large, prominent size
    
    // 1. The Main Circular Base
    ctx.fillStyle = "#d2b48c"; // Bamboo Tan
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. The "Blanks" (Radial Bamboo Support Slats)
    // We draw lines from the center to the edge to look like the internal structure
    ctx.strokeStyle = "#a0522d"; // Darker bamboo brown
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        let angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * shieldRadius, Math.sin(angle) * shieldRadius);
        ctx.stroke();
    }

    // 3. Inner Binding Rings
    // These hold the slats together
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Thick Outer Rim (The deep edge of the lid)
    ctx.strokeStyle = "#8b4513";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}
ctx.restore();
	}

    // --- DRAWING MAIN WEAPON ---
    ctx.save();
    
    let pivotX = -2 * dir;
    let pivotY = -4 + wBob;
    
    ctx.translate(pivotX + (thrust * dir), pivotY);
    let baseAngle = isThrusting ? -Math.PI / 3 : -Math.PI / 2.5; 
    ctx.rotate(baseAngle + (swingAngle * dir));

    let woodColor = "#5d4037";
    let metalColor = isMilitia ? "#bdbdbd" : "#757575";

    switch(weaponType) {
        case 0: // Pitchfork
            ctx.strokeStyle = woodColor; ctx.lineWidth = 1.6; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18 * dir, 0); ctx.stroke();
            ctx.strokeStyle = metalColor; ctx.lineWidth = 1.2;
            let pHeadX = 18 * dir;
            ctx.beginPath(); ctx.moveTo(pHeadX, -3); ctx.lineTo(pHeadX, 3); ctx.stroke();
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath(); ctx.moveTo(pHeadX, i * 2.5); ctx.lineTo(pHeadX + (6 * dir), i * 2.5); ctx.stroke();
            }
            ctx.fillStyle = "#3e2723"; ctx.fillRect(pHeadX - (2 * dir), -1.5, 2 * dir, 3);
            break;

        case 1: // Bamboo Spear
            ctx.strokeStyle = "#827717"; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(-2 * dir, 0); ctx.lineTo(18 * dir, 0); ctx.stroke();
            ctx.strokeStyle = "#558b2f"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(4 * dir, -1.5); ctx.lineTo(4 * dir, 1.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(10 * dir, -1.5); ctx.lineTo(10 * dir, 1.5); ctx.stroke();
            ctx.fillStyle = "#4e342e";
            ctx.beginPath(); ctx.moveTo(18 * dir, -1.2); ctx.lineTo(24 * dir, 0); ctx.lineTo(18 * dir, 1.2); ctx.fill();
            break;

        case 2: // Woodcutter's Axe
            ctx.strokeStyle = woodColor; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12 * dir, 0); ctx.stroke();
            ctx.fillStyle = metalColor;
            ctx.beginPath(); ctx.moveTo(10 * dir, -1); ctx.lineTo(13 * dir, -5); ctx.lineTo(14 * dir, 2); ctx.lineTo(10 * dir, 1); ctx.fill();
            break;

        case 3: // Mining Pickaxe
            ctx.strokeStyle = woodColor; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14 * dir, 0); ctx.stroke();
            ctx.strokeStyle = metalColor; ctx.lineWidth = 2.5; ctx.lineCap = "square";
            ctx.beginPath(); ctx.moveTo(13 * dir, -6); ctx.quadraticCurveTo(15 * dir, 0, 13 * dir, 6); ctx.stroke();
            break;

        case 4: // Small Dagger
            ctx.strokeStyle = woodColor; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3 * dir, 0); ctx.stroke();
            ctx.fillStyle = metalColor;
            ctx.beginPath(); ctx.moveTo(3 * dir, -1); ctx.lineTo(9 * dir, 0); ctx.lineTo(3 * dir, 1); ctx.fill();
            break;

        case 5: // Sickle
            ctx.strokeStyle = woodColor; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8 * dir, 0); ctx.stroke();
            ctx.strokeStyle = metalColor; ctx.lineWidth = 2; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(7 * dir, 0); ctx.quadraticCurveTo(12 * dir, -2, 9 * dir, -6); ctx.stroke();
            break;

        case 6: // Farming Hoe
            ctx.strokeStyle = woodColor; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15 * dir, 0); ctx.stroke();
            ctx.fillStyle = metalColor;
            ctx.fillRect(13 * dir, 0, 2 * dir, 5); // Flat metal blade extending downwards
            break;

        case 7: // Blacksmith Sledgehammer
            ctx.strokeStyle = woodColor; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14 * dir, 0); ctx.stroke();
            ctx.fillStyle = metalColor;
            ctx.fillRect(12 * dir, -3, 4 * dir, 6); // Heavy block head
            break;

        case 8: // Meat Cleaver
            ctx.strokeStyle = woodColor; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4 * dir, 0); ctx.stroke();
            ctx.fillStyle = metalColor;
            ctx.fillRect(4 * dir, -3, 6 * dir, 5); // Broad rectangular blade
            ctx.beginPath(); ctx.arc(9 * dir, -2, 0.5, 0, Math.PI*2); ctx.fillStyle = "#424242"; ctx.fill(); // Hole in the cleaver
            break;

        case 9: // War Scythe
            ctx.strokeStyle = woodColor; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-2 * dir, 0); ctx.lineTo(18 * dir, 0); ctx.stroke(); // Long pole
            ctx.strokeStyle = metalColor; ctx.lineWidth = 1.5; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(17 * dir, 0); ctx.quadraticCurveTo(19 * dir, -8, 14 * dir, -10); ctx.stroke(); // Hooking blade
            break;
    }

    ctx.restore();
}
else if (type === "spearman") {
        const safeName = unitName || "";
        const isGlaive = safeName === "Glaiveman" || safeName.includes("Glaive");

        // --- 1. Improved Attack Animation ---
        const attackProgress = isAttacking ? (Math.sin(frame * 0.8) * 0.5 + 0.5) : 0;
        const thrust = isAttacking ? 14 * Math.pow(attackProgress, 1.5) : 0; 
        const lift = isAttacking ? -6 * attackProgress : 0;

        // --- 2. Shaft Placement ---
        const shaftStartX = -7 * dir;
        const shaftStartY = 4;
        const shaftEndX = (28 + (typeof weaponBob !== 'undefined' ? weaponBob : 0) + thrust) * dir;
        const shaftEndY = -24 + (typeof weaponBob !== 'undefined' ? weaponBob : 0) + lift;

        const shaftAngle = Math.atan2(shaftEndY - shaftStartY, shaftEndX - shaftStartX);

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // --- 3. Draw Shaft (Standard Wood) ---
        ctx.strokeStyle = "#4e342e";
        ctx.lineWidth = 2.2; // Slightly thinner for a "cheap" feel
        ctx.beginPath();
        ctx.moveTo(shaftStartX, shaftStartY);
        ctx.lineTo(shaftEndX, shaftEndY);
        ctx.stroke();

        // --- 4. Draw Head (Small, Cheap Iron) ---
        ctx.fillStyle = "#757575"; // Dulled, weathered iron (not shiny)
        ctx.strokeStyle = "#424242";
        ctx.lineWidth = 0.5;
        
        ctx.save();
        ctx.translate(shaftEndX, shaftEndY);
        ctx.rotate(shaftAngle);

        ctx.beginPath();
        if (isGlaive) {
            // Glaive: Slightly shorter and more curved (Reaper/Chopping style)
            ctx.moveTo(0, -1.5);
            ctx.quadraticCurveTo(8, -4, 12, 0); // Curved edge
            ctx.lineTo(10, 2); // Blunt back
            ctx.lineTo(0, 1.5);
        } else {
            // CHEAP SPEAR: Small needle-point leaf blade
            // Shortened from 18px to 7px to lose the "sword-staff" look
            ctx.moveTo(-2, 0);    // Socket base
            ctx.lineTo(0, -2);    // Shoulder
            ctx.lineTo(7, 0);     // Sharp Point (Small & Forward)
            ctx.lineTo(0, 2);     // Shoulder
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // Socket binding (The "Cheap" fix: simple dark wrap instead of a tassel)
        ctx.fillStyle = "#2b1b17";
        ctx.fillRect(-2, -1.2, 3, 2.4);
        
        ctx.restore();

        // --- 5. Shield (Only if applicable) ---
        if (safeName.includes("Shield")) {
            ctx.fillStyle = "#5d4037";
            ctx.strokeStyle = "#3e2723";
            ctx.lineWidth = 1;
            const wB = (typeof weaponBob !== 'undefined' ? weaponBob : 0);
            const shieldX = (6 + wB / 2) * dir;
            const shieldY = -4 + (isAttacking ? 2 : 0);

            ctx.beginPath();
            ctx.arc(shieldX, shieldY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Simple iron boss in center
            ctx.fillStyle = "#757575";
            ctx.beginPath();
            ctx.arc(shieldX, shieldY, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    else if (type === "sword_shield") {
    const attackPulse = isAttacking ? (Math.sin(frame * 0.9) + 1) * 0.5 : 0;

    // Subtle saber motion
    const swingX = isAttacking ? 4 * attackPulse : 0;
    const swingY = isAttacking ? -2 * attackPulse : 0;
    const tilt = isAttacking ? -0.25 * attackPulse * dir : 0;

    ctx.save();

    // --- SWORD (same shape, just transformed) ---
    ctx.strokeStyle = "#9e9e9e";
    ctx.lineWidth = 2.5;

    ctx.save();
    ctx.translate(swingX * dir, swingY);
    ctx.rotate(tilt);

    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo((14 + weaponBob) * dir, -12 + (weaponBob / 2));
    ctx.stroke();

    ctx.restore();

    // --- SHIELD (very minor reactive movement) ---
    const shieldX = (6 + weaponBob / 2) * dir + (isAttacking ? -1.5 * attackPulse * dir : 0);
    const shieldY = -4 + (isAttacking ? 1 * attackPulse : 0);

    ctx.fillStyle = "#5d4037";
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(shieldX, shieldY, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#424242";
    ctx.beginPath();
    ctx.arc(shieldX, shieldY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
else if (type === "two_handed") {
    const attackPulse = isAttacking ? (Math.sin(frame * 0.7) + 1) * 0.5 : 0;

    // Big, heavy swing
    const swingArc = isAttacking ? attackPulse : 0;
    const lift = isAttacking ? -10 * (1 - swingArc) : 0;   // wind-up
    const drop = isAttacking ? 14 * swingArc : 0;          // strike
    const rotation = isAttacking ? (-1.1 + 2.0 * swingArc) * dir : -0.15 * dir;

    ctx.save();

    // Move weapon anchor for full-body swing feel
    ctx.translate(2 * dir, lift + drop);
    ctx.rotate(rotation);

    // --- MAIN WEAPON (unchanged geometry) ---
    ctx.strokeStyle = "#757575";
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(-2 * dir, -4);
    ctx.quadraticCurveTo(
        (10 + weaponBob) * dir,
        -10 + weaponBob,
        (18 + weaponBob) * dir,
        -22 + weaponBob
    );
    ctx.stroke();

    // --- HANDLE / GRIP ---
    ctx.strokeStyle = "#212121";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(2 * dir, -7);
    ctx.stroke();

    ctx.restore();

    // Optional: subtle motion blur line during attack
    if (isAttacking) {
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4 * dir, -6);
        ctx.lineTo(12 * dir, 6);
        ctx.stroke();
    }
}
	else if (type === "archer") {
    let b = (typeof bob !== 'undefined') ? bob : 0; 
    let ammo = (typeof unitAmmo !== 'undefined') ? unitAmmo : 1; 

    ctx.save();
    ctx.translate(0, b); // Apply global bob to the whole unit

    // --- THE QUIVER (On the back, visible in both modes) ---
    ctx.fillStyle = "#3e2723"; ctx.fillRect(-5, -6, 4, 10);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-1, -12); ctx.stroke(); 

    // --- OUT OF AMMO: Melee Fallback ---
    if (ammo <= 0) {
        let meleeCycle = isAttacking ? (Date.now() / 600) % 1.0 : 0;
        let swingAngle = isAttacking ? Math.sin(meleeCycle * Math.PI) * (Math.PI / 1.5) : 0;

        // 1. Draw Stowed Bow on the back
        ctx.save();
        ctx.translate(-3, -1);
        ctx.rotate(Math.PI / 1.2); // Angled diagonally across the back
        
        // Bow Limbs
        ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(-2, -12); 
        ctx.quadraticCurveTo(6, -6, 0, 0); // Top recurve
        ctx.quadraticCurveTo(6, 6, -2, 12);  // Bottom recurve
        ctx.stroke();
        
        // Taut Bowstring
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; ctx.lineWidth = 0.6;
        ctx.beginPath(); 
        ctx.moveTo(-2, -12); 
        ctx.lineTo(-2, 12); 
        ctx.stroke();
        ctx.restore();

        // 2. Draw Shortsword & Hand
        ctx.save();
        ctx.translate(4, -8); // Shoulder/arm position
        ctx.rotate(swingAngle);
        
        // Hand
        ctx.fillStyle = "#ffccbc"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI*2); ctx.fill(); 
        // Sword Blade
        ctx.fillStyle = "#9e9e9e"; ctx.fillRect(-1.5, -14, 3, 14); 
        ctx.beginPath(); ctx.moveTo(-1.5, -14); ctx.lineTo(0, -17); ctx.lineTo(1.5, -14); ctx.fill(); // Tip
        // Sword Hilt & Crossguard
        ctx.fillStyle = "#5d4037"; ctx.fillRect(-1, 0, 2, 4); 
        ctx.fillStyle = "#e0e0e0"; ctx.fillRect(-3, -2, 6, 2); 
        ctx.restore();

        ctx.restore(); // Restore global unit translate
        return; // End render here
    }

    // --- RANGED COMBAT: Has Ammo ---
    
    // --- SURGERY START: Animation Cycle Timing ---
    // We keep the slightly faster 1.8s cycle, but we shift the release window
    let archerTime = Date.now() / 1800; 
    let cycle = isAttacking ? archerTime % 1.0 : 0.95;
    // --- SURGERY END ---
    
    let handX = 6, handY = -8; 
    let drawHandX = handX, drawHandY = handY;
    let bowKhatra = 0;
    let hasArrow = false;

    // --- SURGERY START: String Anchor Points ---
    // Initialize string separate from hand to allow for "snapping"
    let stringX = handX - 1; 
    let stringY = handY;
    // --- SURGERY END ---

    // 4-Phase Logic Machine
    if (cycle < 0.2) { 
        // Phase 1: REACH - Hand goes to back
        let p = cycle / 0.2;
        drawHandX = handX - (p * 10); 
        drawHandY = handY - (p * 4);
        hasArrow = true;
        stringX = handX - 1; // String stays at rest
    } else if (cycle < 0.4) { 
        // Phase 2: NOCK - Bring arrow to bow
        let p = (cycle - 0.2) / 0.2;
        drawHandX = (handX - 10) + (10 * p); 
        drawHandY = (handY - 4) + (4 * p);
        hasArrow = true;
        stringX = handX - 1; // String stays at rest
    } 
    // --- SURGERY START: Extended Draw Phase ---
    // We moved the end of this phase from 0.75 to 0.95
    else if (cycle < 0.95) { 
        let p = (cycle - 0.4) / 0.55; // Now calculated over 55% of the cycle
        drawHandX = handX - (p * 12);
        drawHandY = handY;
        hasArrow = true;
        stringX = drawHandX; // String follows the hand perfectly
        stringY = drawHandY;
    } else { 
        // Phase 4: RELEASE - Ultra-fast snap (0.95 to 1.0)
        let p = (cycle - 0.95) / 0.05; // 5% release window
        bowKhatra = 0.4 * (1 - p);
        drawHandX = handX - 12 + (p * 4); // Recoil
        drawHandY = handY;
        
        hasArrow = false; // Arrow is gone!
        stringX = handX - 1; // String snaps back to neutral instantly
        stringY = handY;
    }
    // --- SURGERY END ---

    // Draw Bow
    ctx.save();
    ctx.translate(handX, handY); 
    ctx.rotate(bowKhatra); 
    ctx.translate(-handX, -handY);
    
    ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.moveTo(handX - 1, -18); 
    ctx.quadraticCurveTo(handX + 10, -13, handX, handY); 
    ctx.quadraticCurveTo(handX + 10, -3, handX - 1, 2); 
    ctx.stroke();
    
    // --- SURGERY: String uses dynamic stringX/Y ---
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; ctx.lineWidth = 0.6;
    ctx.beginPath(); 
    ctx.moveTo(handX - 1, -18); 
    ctx.lineTo(stringX, stringY); 
    ctx.lineTo(handX - 1, 2); 
    ctx.stroke();
    ctx.restore();

    // The Arrow
    if (hasArrow) {
        ctx.save();
        ctx.translate(drawHandX, drawHandY);
        
        if (cycle < 0.2) {
            ctx.rotate(-Math.PI / 3); 
        } else if (cycle < 0.4) {
            let p = (cycle - 0.2) / 0.2;
            ctx.rotate((-Math.PI / 3) * (1 - p));
        }
        
        ctx.fillStyle = "#8d6e63"; ctx.fillRect(-4, -0.5, 14, 1); // Shaft
        ctx.fillStyle = "#9e9e9e"; ctx.fillRect(10, -1.5, 3, 3); // Head
        ctx.fillStyle = "#d32f2f"; ctx.fillRect(-4, -1.5, 3, 1); ctx.fillRect(-4, 0.5, 3, 1); // Feathers
        ctx.restore();
    }

    // Final Touch: Drawing hand
    ctx.fillStyle = "#ffccbc";
    ctx.beginPath();
    ctx.arc(drawHandX, drawHandY, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Restore global unit translate (for the bob)
}
else if (type === "throwing") {
        if (unitName === "Slinger") {
            // --- SURGERY START: Synchronized Slinger Timing ---
            // Slinger timing is snappy. 1.5s cycle.
            let slingerTime = Date.now() / 1500;
            let cycle = isAttacking ? slingerTime % 1.0 : 0;
            // --- SURGERY END ---
            
            let handX = 4, handY = -8;
            let stoneX, stoneY;
            let isVisible = true;

            // --- THE POUCH (At waist) ---
            ctx.fillStyle = "#5d4037"; ctx.beginPath();
            ctx.ellipse(-2, 2, 3, 4, 0, 0, Math.PI*2); ctx.fill();

            // 3-Phase Animation State Machine
            if (cycle < 0.3) { 
                // Phase 1: RELOAD - Reach for pouch (0.0 to 0.3)
                let p = cycle / 0.3;
                handX = 4 - (p * 6); handY = -8 + (p * 10);
                stoneX = handX; stoneY = handY;
            } 
            // --- SURGERY START: Extended Centrifugal Spin ---
            // We now extend the spin all the way to 0.95 (95% of the cooldown).
            // This ensures the stone stays in the sling until the moment of release.
            else if (cycle < 0.95) { 
                let p = (cycle - 0.3) / 0.65; // Normalized over the longer 65% window
                let spinAngle = p * Math.PI * 10; // Faster spin (5 full rotations) for more "oomph"
                handX = 6; handY = -10;
                
                // The stone orbits the hand in an elliptical path
                stoneX = handX + Math.cos(spinAngle) * 12;
                stoneY = handY + Math.sin(spinAngle) * 4; 
            } 
            // --- SURGERY START: Precision Snap Release ---
            else { 
                // Phase 3: THROW - High velocity snap (0.95 to 1.0)
                // This tiny 5% window mimics a real sling release.
                let p = (cycle - 0.95) / 0.05; 
                handX = 6 + (p * 10); handY = -10 - (p * 4);
                
                isVisible = false; // Stone is released exactly as the projectile spawns
            }
            // --- SURGERY END ---

            // Draw Sling Cord
            ctx.strokeStyle = "#d4b886"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(handX, handY);
            if (isVisible) {
                ctx.lineTo(stoneX, stoneY);
            } else {
                // --- SURGERY START: Cord Momentum ---
                // When invisible (released), the cord flails forward following the hand's path
                ctx.lineTo(handX + 12, handY + 6); 
                // --- SURGERY END ---
            }
            ctx.stroke();

            // Draw Stone/Bullet
            if (isVisible) {
                ctx.fillStyle = "#9e9e9e";
                ctx.beginPath(); ctx.arc(stoneX, stoneY, 2, 0, Math.PI*2); ctx.fill();
            }

            // Draw Hand (Drawn last so it sits on top of the sling cord)
            ctx.fillStyle = "#ffccbc"; 
            ctx.beginPath(); 
            ctx.arc(handX, handY, 2, 0, Math.PI*2); 
            ctx.fill();
        }
  else { // NOT SLINGER SO JAVELINIER
        // 1. Context & State Retrieval
        let currentAmmo = (typeof unit !== 'undefined' && unit.ammo !== undefined) ? unit.ammo : 4;
        let isMelee = false;
        
        // Distance Check for Melee Stabbing vs Throwing
        if (typeof unit !== 'undefined' && unit.target) {
            let distToTarget = Math.hypot(unit.target.x - unit.x, unit.target.y - unit.y);
            // Threshold for "too close" - adjust this pixel value if they stab too early/late
            if (distToTarget < 35) {
                isMelee = true;
            }
        }

        if (currentAmmo <= 0) {
            // --- OUT OF AMMO: SHORTSWORD FALLBACK ---
            let swordThrust = 0;
            if (isAttacking) {
                let p = (Date.now() / 600) % 1.0; // Fast stab cycle
                swordThrust = (p < 0.5) ? Math.sin(p * 2 * Math.PI) * 8 : 0; 
            }
            
            ctx.save();
            ctx.translate(swordThrust * dir, 0); // Apply thrust to the whole sword

            // Blade
            ctx.strokeStyle = "#9e9e9e"; ctx.lineWidth = 2.5; 
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo((12 + weaponBob) * dir, -10 + (weaponBob / 2)); ctx.stroke(); 
            // Hilt/Guard
            ctx.strokeStyle = "#212121"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(1 * dir, -5); ctx.lineTo(3 * dir, -8); ctx.stroke();
            
            ctx.restore();

            // Hand holding the sword
            ctx.fillStyle = "#ffccbc";
            ctx.beginPath(); ctx.arc((2 + swordThrust) * dir, -6, 2.5, 0, Math.PI * 2); ctx.fill();

        } else {
            // --- HAS AMMO: JAVELIN RENDERING ---
            // Calculate how many javelins are stored on the back (Max 3 on back, 1 in hand)
            let backJavelinsCount = Math.min(3, currentAmmo - 1); 
            
            ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 1.5;
            ctx.fillStyle = "#bdbdbd";
            
            // Draw stored javelins dynamically
            if (backJavelinsCount >= 1) { // Stored 1
                ctx.beginPath(); ctx.moveTo(-4 * dir, -2); ctx.lineTo(-8 * dir, -18); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-8 * dir, -18); ctx.lineTo(-10 * dir, -22); ctx.lineTo(-6 * dir, -19); ctx.fill();
            }
            if (backJavelinsCount >= 2) { // Stored 2
                ctx.beginPath(); ctx.moveTo(-2 * dir, -2); ctx.lineTo(-5 * dir, -19); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-5 * dir, -19); ctx.lineTo(-6 * dir, -23); ctx.lineTo(-3 * dir, -20); ctx.fill();
            }
            if (backJavelinsCount >= 3) { // Stored 3 (Makes 4 total with the one in hand)
                ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(-2 * dir, -18); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-2 * dir, -18); ctx.lineTo(-4 * dir, -22); ctx.lineTo(-1 * dir, -20); ctx.fill();
            }

            // --- ANIMATION LOGIC (Melee vs Throw) ---
            let handX = 2 * dir; 
            let handY = -8;
            let javRotation = 0;
            let thrust = 0;
            let isVisible = true;
            let maxCd = 1600;
            let cycle = isAttacking ? (Date.now() % maxCd) / maxCd : 0;

            if (isMelee) {
                // PHASE: MELEE STABBING (Too close to throw)
                javRotation = (Math.PI / 2.2) * dir; // Held horizontally, pointing slightly up
                
                if (isAttacking) {
                    if (cycle < 0.3) {
                        thrust = -(cycle / 0.3) * 6; // Windup pull back
                    } else if (cycle < 0.6) {
                        thrust = 12; // Fast thrust forward
                    } else {
                        thrust = 12 * (1 - ((cycle - 0.6) / 0.4)); // Smooth retract
                    }
                }
            } else {
                // PHASE: THROWING (Safe distance)
                if (isAttacking) {
                    if (cycle < 0.7) { 
                        // Wind-up
                        let p = cycle / 0.7;
                        thrust = -(p * 8); 
                        javRotation = ((-Math.PI / 6) - (p * Math.PI / 4)) * dir; 
                    } else if (cycle < 0.95) { 
                        // The Throw Snap
                        let p = (cycle - 0.7) / 0.25;
                        thrust = -8 + (p * 20); 
                        javRotation = ((-Math.PI / 4) + (p * Math.PI / 1.5)) * dir; 
                        isVisible = true;
                    } else { 
                        // Follow-through & Release
                        let p = (cycle - 0.95) / 0.05;
                        thrust = 12 + (p * 4); 
                        javRotation = (Math.PI / 3) * dir;
                        isVisible = false; // Vanishes as actual projectile spawns
                    }
                }
            }

            // --- DRAW ACTIVE JAVELIN ---
            if (isVisible || !isAttacking) {
                ctx.save();
                ctx.translate(handX + (thrust * dir), handY);
                ctx.rotate(javRotation);

                // Shaft
                ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -12); ctx.stroke();
                
                // Javelin Head
                ctx.fillStyle = "#bdbdbd";
                ctx.beginPath();
                ctx.moveTo(0, -12); 
                ctx.lineTo(-2, -10); 
                ctx.lineTo(0, -18); 
                ctx.lineTo(2, -10); 
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            }

            // Hand holding the javelin
            ctx.fillStyle = "#ffccbc";
            ctx.beginPath();
            ctx.arc(handX + (thrust * dir), handY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    } // End of Javeliner block
}//SUPPOSED TO END THROWING BLOCK


else if (type === "crossbow") { 
    let b = (typeof bob !== 'undefined') ? bob : 0; 
    let ammo = (typeof unitAmmo !== 'undefined') ? unitAmmo : 1; 

    // --- QUIVER (Back/Hip) - Revised: Smaller for Bolts ---
    ctx.save();
    ctx.translate(-5, -4 + b); 
    ctx.rotate(-Math.PI / 8);  
    
    // Smaller pouch-style quiver
    ctx.fillStyle = "#3e2723"; 
    ctx.fillRect(-2, -4, 4, 8);
    ctx.strokeStyle = "#1a1007"; ctx.lineWidth = 0.5; ctx.strokeRect(-2, -4, 4, 8);

    // Tiny bolt fletchings
    let visibleBolts = Math.max(0, Math.min(3, ammo));
    ctx.fillStyle = "#eeeeee"; 
    for (let i = 0; i < visibleBolts; i++) {
        ctx.fillRect(-1.5 + (i * 1.2), -6, 0.8, 2); 
    }
    ctx.restore();

    // --- OUT OF AMMO: Melee Fallback ---
    if (ammo <= 0) {
        let meleeCycle = isAttacking ? (Date.now() / 600) % 1.0 : 0;
        let swingAngle = isAttacking ? Math.sin(meleeCycle * Math.PI) * (Math.PI / 1.5) : 0;

        ctx.save();
        ctx.translate(0, b);
        ctx.save();
        ctx.translate(-4, -6);
        ctx.rotate(Math.PI / 1.5); 
        ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -10, 16, 3);
        
        if (unitName === "Repeater Crossbowman") {
            ctx.fillStyle = "#5d4037"; ctx.fillRect(5, -13, 10, 5); 
            ctx.strokeStyle = "#2b1b17"; ctx.lineWidth = 0.8; ctx.strokeRect(5, -13, 10, 5);
        } else {
            let scale = (unitName === "Poison Crossbowman") ? 0.8 : (unitName === "Heavy Crossbowman" ? 1.3 : 1.0);
            ctx.strokeStyle = "#000000"; ctx.lineWidth = (unitName === "Heavy Crossbowman") ? 3 : 2;
            ctx.beginPath(); ctx.moveTo(14, -10 - (6 * scale));
            ctx.quadraticCurveTo(14 + (4 * scale), -10, 14, -10 + (6 * scale)); 
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.translate(4, -8); ctx.rotate(swingAngle);
        ctx.fillStyle = "#ffccbc"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = "#9e9e9e"; ctx.fillRect(-1.5, -14, 3, 14); 
        ctx.fillStyle = "#5d4037"; ctx.fillRect(-1, 0, 2, 4); 
        ctx.restore();
        ctx.restore();
        return; 
    }
	// --- RANGED COMBAT: Engine Sync ---
let maxCool = (unitName === "Repeater Crossbowman") ? 360 : 300;
let cdown = (typeof cooldown !== 'undefined') ? cooldown : 0;
let p = Math.max(0, Math.min(1.0, 1.0 - (cdown / maxCool)));

if (unitName === "Repeater Crossbowman") {
	
	// ADD THESE TWO LINES:
    if (typeof levelStartTime === 'undefined') window.levelStartTime = Date.now();
    if (Date.now() - window.levelStartTime < 5000) p = 0; 
 
    let leverMove = 0, boltInTray = false, stringPull = 0;
    let handX = 0, handY = 0, loadingMag = false, handOnLever = false;
    let wobbleX = 0, wobbleY = 0, magOffset = 0;

    // --- PHASE 1: THE INITIAL RELOAD ---
    // Dedicate the first 25% of the cooldown ONLY to stuffing the magazine.
    // No lever movement here. This ensures the mag is "full" before we start pumping.
    if (p < 0.25) {
        loadingMag = true;
        let loadP = p / 0.25;
        // Hand moves from quiver to magazine area
        handX = loadP < 0.5 ? -4 + (loadP * 2 * 12) : 8;
        handY = loadP < 0.5 ? -2 : -10;
        
        // Weapon remains steady during reload
        leverMove = 0;
        stringPull = 0;
        boltInTray = false;
    } 
    // --- PHASE 2: THE BURST (9 BOLTS) ---
    else {
        handOnLever = true;
        
        // Safety: If p is reset by engine (loss of target), return to neutral
        if (p >= 0.99 || cdown === 0) {
            leverMove = 0; stringPull = 0; boltInTray = false;
        } else {
            // Normalize the remaining 75% of p into 9 clean cycles
            let burstP = (p - 0.25) / 0.75;   
            let shotProgress = burstP * 9; 
            let cycleP = shotProgress % 1;  
            
            // Internal Cycle Logic: Push -> Pull -> Snap
            if (cycleP < 0.35) {
                // 1. PUSH: Magazine slides forward to catch the string
                leverMove = (cycleP / 0.35) * 5; 
                stringPull = 0; 
                boltInTray = cycleP > 0.1; // Bolt drops in immediately
            } else if (cycleP < 0.85) {
                // 2. PULL: String is drawn back with the bolt
                let drawP = (cycleP - 0.35) / 0.50;
                leverMove = 5 - (drawP * 5); 
                stringPull = drawP * 8;
                boltInTray = true; 
            } else {
                // 3. SNAP: Bolt is fired
                leverMove = 0; 
                stringPull = 0; 
                boltInTray = false; 
                
                // Recoil Wobble
                wobbleX = (Math.random() - 0.5) * 4;
                wobbleY = (Math.random() - 0.5) * 4;
            }
        }
        magOffset = leverMove * 0.8;
    }

    // --- RENDERING ---
    ctx.save();
    ctx.translate(wobbleX, 8 + wobbleY); // Apply shift + recoil
    
    // Slight lean back at the very start of the reload
    if (p < 0.05) ctx.translate(-2, 0);
    
    // Main Body
    ctx.fillStyle = "#4e342e"; ctx.fillRect(3, -11, 18, 3);
    
    // Bow Limb & String
    ctx.strokeStyle = "#000000"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(21, -15); ctx.quadraticCurveTo(24 - stringPull*0.2, -11, 21, -7); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(21, -15); ctx.lineTo(21 - stringPull, -11); ctx.lineTo(21, -7); ctx.stroke();
    
    // The Magazine (The "Chuko Nu" block that slides)
    ctx.fillStyle = "#5d4037"; 
    ctx.fillRect(7 + magOffset, -18, 10, 7); 
    ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1;
    ctx.strokeRect(7 + magOffset, -18, 10, 7);

    // The Lever Pivot Logic
    ctx.save();
    ctx.translate(15 + magOffset, -10); // Pivots relative to the magazine
    let leverRotate = handOnLever ? (leverMove / 5) * -0.7 : 0; 
    ctx.rotate(leverRotate);
    ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -8); ctx.stroke(); 
    ctx.restore();
    
    // Bolt in tray
    if (boltInTray) {
        ctx.fillStyle = "#5d4037"; ctx.fillRect(11, -11, 6, 1); 
        ctx.fillStyle = "#9e9e9e"; ctx.beginPath(); 
        ctx.moveTo(17, -11.5); ctx.lineTo(20, -10.5); ctx.lineTo(17, -9.5); ctx.fill();
    }
    
    // Hand Positioning
    ctx.fillStyle = "#ffccbc";
    if (loadingMag) { 
        ctx.beginPath(); ctx.arc(handX, handY, 2.5, 0, Math.PI * 2); ctx.fill(); 
    } else if (handOnLever) { 
        // Track the end of the lever arm
        let arcX = (15 + magOffset) + Math.cos(Math.PI + 0.6 + (leverMove / 5) * -0.7) * 14;
        let arcY = -10 + Math.sin(Math.PI + 0.6 + (leverMove / 5) * -0.7) * 14;
        ctx.beginPath(); ctx.arc(arcX, arcY, 2.8, 0, Math.PI * 2); ctx.fill(); 
    }
    ctx.restore(); 
}
    else {
        // --- STANDARD / POISON / HEAVY: FOOT-STIRRUP SPANNING ---
        let weaponRot = 0, weaponX = 0, weaponY = 0, bodyDip = 0, bodyShift = 0, stringPull = 0;
        let hasBolt = false, loadHand = false, hX = 0, hY = 0, showFoot = false;
        let isHeavy = (unitName === "Heavy Crossbowman");
        let isPoison = (unitName === "Poison Crossbowman");

        // PHASE LOGIC: Added bodyShift to prevent the "Teleporting Stirrup"
        if (p < 0.05) { 
            weaponX = -3; weaponRot = -0.1; 
        } 
        else if (p < 0.20) { 
            let ph = (p - 0.05) / 0.15; 
            weaponRot = ph * (Math.PI / 2); 
            weaponY = ph * 12; 
            weaponX = ph * 4; 
            bodyDip = ph * 5; 
            bodyShift = ph * -11; // Shift body UP as weapon goes DOWN
        } 
        else if (p < 0.45) { 
            let ph = (p - 0.20) / 0.25; 
            weaponRot = Math.PI / 2; weaponY = 12; weaponX = 4; bodyDip = 5; 
            bodyShift = -11; // Maintain high position during spanning
            stringPull = ph * 8; showFoot = true; 
        } 
        else if (p < 0.60) { 
    let ph = (p - 0.45) / 0.15; 
    weaponRot = (Math.PI / 2) * (1 - ph); 
    // Instead of going to 0 (Neck), we go to 5 (Chest/Hip)
    weaponY = 12 - (ph * 7);   // 12 down to 5
    weaponX = 4 * (1 - ph); 
    bodyDip = 5 * (1 - ph); 
    // Instead of going to 0 (Teleport), we go to -5 (Slightly raised stance)
    bodyShift = -11 + (ph * 6); // -11 up to -5
    stringPull = 8; 
} 
else if (p < 0.75) { 
    stringPull = 8; loadHand = true; let ph = (p - 0.60) / 0.15; hX = -4 - (ph * 4); hY = 2 - (ph * 6);
    weaponY = 5; bodyShift = -5; // Keep the lower position while loading bolt
} 
else if (p < 0.90) { 
    stringPull = 8; loadHand = true; let ph = (p - 0.75) / 0.15; hX = -8 + (ph * 18); hY = -4 + (ph * 6);
    weaponY = 5; bodyShift = -5; // Keep the lower position while moving hand
} 
else { 
    stringPull = 8; hasBolt = true; 
    weaponY = 5; // Final resting position (No more teleporting!)
    bodyShift = -5; 
}
        ctx.save();
        // APPLY SHIFT: The man now "steps up" into the stirrup
        ctx.translate(0, bodyDip + b + bodyShift); 
        
        ctx.save();
      ctx.translate(weaponX, weaponY - 10); ctx.rotate(weaponRot); ctx.translate(0, 10);
	  // --- STOCK ---
        ctx.fillStyle = "#5d4037"; 
        ctx.fillRect(0, -10, 16, 3); // The wooden body
        
        // --- MOUNTING POINT FOR PROD ---
        // This ensures the bow limbs meet the wood BEFORE the stirrup starts
        let mountX = 16;
        // --- THE STIRRUP (FULL CIRCLE AT FRONT) ---
        let stirrupX = 16;       // At the very tip of the stock
        let stirrupY = -8.5;     // Centered vertically with the bolt/prod
        let stirrupRadius = 3.5; // Adjusted size to look like a hoop
        
        ctx.strokeStyle = "#424242"; 
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // Drawing a nearly full circle (0 to 1.8 PI) to leave a tiny gap where it meets the wood
        ctx.arc(stirrupX + stirrupRadius, stirrupY, stirrupRadius, 0, Math.PI * 2);
        ctx.stroke();

        
        if (showFoot) { 
            // Foot inside stirrup - adjusted color to match boots
            ctx.fillStyle = "#3e2723"; ctx.beginPath(); ctx.arc(17.5, -8.5, 2.5, 0, Math.PI*2); ctx.fill(); 
        }

        // ... (rest of the Prod Render code remains the same)
     // --- PROD RENDER (REVISED: ALIGNED & COMPACT) ---
        let scale = isPoison ? 0.8 : (isHeavy ? 1.4 : 1.0); // Slightly tighter scale for heavy
        ctx.strokeStyle = "#1a1a1a"; 
        ctx.lineWidth = isHeavy ? 2.5 : 2; 

  
        let anchorX = mountX - (4.5 * scale); 
        
        let tY = -8.5 - (6.5 * scale), bY = -8.5 + (6.5 * scale); // Limbs slightly shorter for "smaller" look
        let flex = (stringPull * 0.3); 
        
        ctx.beginPath();
        if (isHeavy) {
            // HEAVY RECURVE (M-SHAPE)
            // Starts at top tip
            ctx.moveTo(anchorX, tY);
            // Sweeps forward (reduced to 7.5 for smaller M), hits the stock/stirrup junction precisely
            ctx.bezierCurveTo(anchorX + 7.5 * scale - flex, tY + 2, mountX + 2, -8.5, mountX, -8.5); 
            // Returns to bottom tip
            ctx.bezierCurveTo(mountX + 2, -8.5, anchorX + 7.5 * scale - flex, bY - 2, anchorX, bY); 
        } else {
            // STANDARD ARC
            // Unified mounting: Midpoint is now forced to mountX to match the stock/stirrup junction
            ctx.moveTo(anchorX, tY);
            ctx.quadraticCurveTo(mountX + (3 * scale) - flex, -8.5, anchorX, bY);
        }
        ctx.stroke();
        
        // 2. STRING (Anchored to new tip positions)
        ctx.strokeStyle = "rgba(220, 220, 220, 0.9)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); 
        ctx.moveTo(anchorX, tY); 
        ctx.lineTo(anchorX - stringPull, -8.5); 
        ctx.lineTo(anchorX, bY); 
        ctx.stroke();

        // 3. BOLT (Anchored to string)
        if (hasBolt) {
            ctx.save(); 
            ctx.translate(anchorX - stringPull, -8.5);
            ctx.fillStyle = "#3e2723"; ctx.fillRect(0, -0.5, 9, 1); 
            ctx.fillStyle = isPoison ? "#4caf50" : "#9e9e9e";
            ctx.beginPath(); ctx.moveTo(9, -1.2); ctx.lineTo(13, 0); ctx.lineTo(9, 1.2); ctx.fill();
            ctx.restore();
        }

        ctx.restore();  
        ctx.restore();  
	}
}
else if (unitName && unitName.includes("Firelance")) {
    const isHeavy = unitName.includes("Heavy");
    const hasAmmo = (typeof unit !== 'undefined' && unit.ammo > 0);
    
    // 1. Calculate the Attack/Ignition Cycle (DECOUPLED FROM COOLDOWN)
    // We use a punchy 300ms duration to match the "extremely short" ranged burst.
    let animDuration = 300; 
    let cycle = 1.0; // Default to idle state
    
    if (isAttacking) {
        // Ideal scenario: Your unit object tracks when the attack started
        if (typeof unit !== 'undefined' && unit.lastAttackTime) {
            // Clamps the animation between 0.0 and 1.0, stopping cleanly when finished
            cycle = Math.min((Date.now() - unit.lastAttackTime) / animDuration, 1.0);
        } else {
            // Fallback: If you don't track start time, this uses modulo to loop 
            // the animation cleanly as long as 'isAttacking' is true.
            cycle = (Date.now() % animDuration) / animDuration;
        }
    }

    // 2. REVISED PHYSICS: Snap-Thrust & Dynamic Swing
    let isSwing = (typeof unit !== 'undefined' && unit.id && unit.id % 4 === 0) || (!hasAmmo);
    
    let thrust = 0;
    let swingY = 0; // Vertical displacement for swings

    if (isAttacking && cycle < 1.0) {
        if (cycle < 0.2) {
            // Explosive forward lunge (0% to 20% of animation)
            thrust = (cycle / 0.2) * 22; 
        } else {
            // Slower, guarded retraction (20% to 100% of animation)
            thrust = 22 * (1 - (cycle - 0.2) / 0.8);
        }
        
        // If it's a swinging strike, we add a deep vertical drop that peaks with the thrust
        if (isSwing) {
            swingY = Math.sin(cycle * Math.PI) * 10; 
        }
    }

    // Base Y offset applied to all weapon parts to simulate the swing angle
    let baseY = -8 + swingY;

    // Draw the Wooden Shaft
    ctx.strokeStyle = "#5d4037"; 
    ctx.lineWidth = 2; // Slightly thicker for a heavy polearm
    ctx.beginPath(); 
    ctx.moveTo(-4 * dir, baseY); 
    ctx.lineTo((21 + thrust) * dir, baseY); 
    ctx.stroke();

    // 3. Draw the Historical Bamboo/Paper Tubes
    ctx.fillStyle = "#2b2b2b"; // Charred bamboo look
    let tubeTopY = baseY - 3.5;
    let tubeBotY = baseY + 0.5;

    if (isHeavy) {
        // Heavy: Two tubes tied to the top and bottom of the shaft
        ctx.fillRect((14 + thrust) * dir, tubeTopY, 8 * dir, 3.5); 
        ctx.fillRect((14 + thrust) * dir, tubeBotY, 8 * dir, 3.5);  
        
        // Hemp twine ties (Moving dynamically with thrust)
        ctx.strokeStyle = "#8d6e63"; 
        ctx.lineWidth = 1.2;
        
        // Front Tie
        ctx.beginPath(); 
        ctx.moveTo((15 + thrust) * dir, tubeTopY - 0.5); 
        ctx.lineTo((15 + thrust) * dir, tubeBotY + 4); 
        ctx.stroke();
        
        // Back Tie
        ctx.beginPath(); 
        ctx.moveTo((20 + thrust) * dir, tubeTopY - 0.5); 
        ctx.lineTo((20 + thrust) * dir, tubeBotY + 4); 
        ctx.stroke();
    } else {
        // Standard: Single tube lashed securely to the top
        ctx.fillRect((14 + thrust) * dir, tubeTopY, 8 * dir, 4);
        
        ctx.strokeStyle = "#8d6e63"; 
        ctx.lineWidth = 1.2;
        ctx.beginPath(); 
        ctx.moveTo((16 + thrust) * dir, tubeTopY - 0.5); 
        ctx.lineTo((16 + thrust) * dir, baseY + 1); 
        ctx.stroke();
        ctx.beginPath(); 
        ctx.moveTo((20 + thrust) * dir, tubeTopY - 0.5); 
        ctx.lineTo((20 + thrust) * dir, baseY + 1); 
        ctx.stroke();
    }

    // 4. The Spearhead
    ctx.fillStyle = "#bdbdbd"; 
    ctx.beginPath(); 
    ctx.moveTo((21 + thrust) * dir, baseY); 
    ctx.lineTo((24 + thrust) * dir, baseY - 2.5); 
    ctx.lineTo((31 + thrust) * dir, baseY); // Sharper, longer point
    ctx.lineTo((24 + thrust) * dir, baseY + 2.5); 
    ctx.closePath(); 
    ctx.fill();

    // 5. ENHANCED FIRE & EFFECTS (HUGE FLAMES)
    if (isAttacking && hasAmmo && cycle < 1.0) {
        let firePos = isHeavy ? tubeTopY + 1.5 : tubeTopY + 2; 
        let showFire = true;
        let isIgniting = false;

        if (isHeavy) {
            // Instant Reload: A tiny gap in the animation cycle for a flash ignition
            if (cycle > 0.48 && cycle < 0.52) {
                showFire = false;
                isIgniting = true;
                firePos = tubeBotY + 1.5; // Snap to bottom tube
            } else if (cycle >= 0.52) {
                firePos = tubeBotY + 1.5; // Bottom tube firing
            }
        }

        if (isIgniting) {
            // Fast, blinding ignition spark between tubes
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc((22 + thrust) * dir, firePos, 4 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = "#ffeb3b";
            ctx.beginPath();
            ctx.arc((22 + thrust) * dir, firePos, 2 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (showFire) {
            // MASSIVE Flame Jet (Historical gunpowder payload)
            let flameLen = 80 + Math.random() * 120; // Pushed from ~20 to ~200 max length!
            let flameWidth = 15 + Math.random() * 15; // Wide, billowing blast
            
            let grd = ctx.createLinearGradient((22 + thrust) * dir, firePos, (22 + thrust + flameLen) * dir, firePos);
            grd.addColorStop(0, "#ffffff"); // Blinding core
            grd.addColorStop(0.1, "#fff59d"); // Yellow hot
            grd.addColorStop(0.3, "#ff9800"); // Expanding orange
            grd.addColorStop(0.7, "#f44336"); // Searing red edges
            grd.addColorStop(1, "rgba(33, 33, 33, 0)"); // Smoky dispersion

            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo((22 + thrust) * dir, firePos);
            // Drastically widened quadratic curves for a funnel-shaped blast
            ctx.quadraticCurveTo((30 + thrust + flameLen/3) * dir, firePos - flameWidth, (22 + thrust + flameLen) * dir, firePos);
            ctx.quadraticCurveTo((30 + thrust + flameLen/3) * dir, firePos + flameWidth, (22 + thrust) * dir, firePos);
            ctx.fill();

            // Heavy shower of cinders & sparks
            ctx.fillStyle = "#ffeb3b";
            for(let i = 0; i < 12; i++) {
                let sparkX = (22 + thrust + Math.random() * (flameLen * 0.8)) * dir;
                let sparkY = firePos + (Math.random() * flameWidth - flameWidth/2);
                ctx.fillRect(sparkX, sparkY, 2 + Math.random()*2, 2 + Math.random()*2);
            }
        }
    } 
 
}

	else if (type === "gun") {
        // SURGERY: Complete Hand Cannon Reload Cycle & Direct Ignition
        let maxCd = 300;
        let cd = cooldown || 0;
        let cycle = isAttacking ? (maxCd - cd) / maxCd : 1.0;

        let gunRot = 0;
        let shakeRot = 0;
        let recoilX = 0;

        // Determine Gun Angle & Shake based on specific reload phase
        if (isAttacking && cd > 0) {
            if (cycle < 0.05) {
                // 0% - 5%: FIRING! (Heavy recoil, shaking only happens here)
                gunRot = (-Math.PI / 10) * dir;
                shakeRot = (Math.random() - 0.5) * 0.2; 
                recoilX = -4 * dir;
            } else if (cycle < 0.15) {
                // 5% - 15%: Transition to reload position
                gunRot = (Math.PI / 6) * dir; 
            } else if (cycle < 0.65) {
                // 15% - 65%: Gun pointed steeply up for loading down the muzzle
                gunRot = (Math.PI / 3) * dir; 
            } else if (cycle < 0.75) {
                // 65% - 75%: Lowering slightly to access the touchhole (priming)
                gunRot = (Math.PI / 8) * dir; 
            } else {
                // 75% - 100%: Leveling out, holding fuse, lighting
                gunRot = 0; 
            }
        }

        ctx.save();
        ctx.translate(recoilX, weaponBob); // Removed random bobbing; keeping it smooth
        ctx.rotate(gunRot + shakeRot);

        // Tiller (Wooden Stock) - NO TRIGGER
        ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(6 * dir, -5); ctx.stroke();
        
        // Barrel (Iron)
        ctx.strokeStyle = "#424242"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(6 * dir, -5); ctx.lineTo(16 * dir, -5); ctx.stroke();

        // Hands & Elaborate Reloading Action
        ctx.fillStyle = "#ffccbc";
        ctx.beginPath(); ctx.arc(2 * dir, -5, 2, 0, Math.PI*2); ctx.fill(); // Back hand holding tiller
        
        if (isAttacking && cd > 0) {
            if (cycle >= 0.15 && cycle < 0.25) { 
                // 1. Pouring Powder
                let drop = (cycle - 0.15) * 10; // Animation progress (0 to 1)
                ctx.beginPath(); ctx.arc(18 * dir, -12, 2, 0, Math.PI*2); ctx.fill(); // Hand
                ctx.fillStyle = "#795548"; ctx.fillRect(16 * dir, -16, 4 * dir, 6); // Flask
                ctx.fillStyle = "#212121"; ctx.fillRect(17.5 * dir, -10 + (drop * 4), 1.5 * dir, 2); // Powder falling
            } 
            else if (cycle >= 0.25 && cycle < 0.32) { 
                // 2. Inserting Projectile
                let drop = (cycle - 0.25) * 14; 
                ctx.beginPath(); ctx.arc(18 * dir, -10, 2, 0, Math.PI*2); ctx.fill(); // Hand
                ctx.fillStyle = "#424242"; ctx.beginPath(); ctx.arc(18 * dir, -8 + (drop * 3), 1.5, 0, Math.PI*2); ctx.fill(); // Iron ball
            } 
            else if (cycle >= 0.32 && cycle < 0.40) { 
                // 3. Inserting Wadding
                let drop = (cycle - 0.32) * 12; 
                ctx.beginPath(); ctx.arc(18 * dir, -10, 2, 0, Math.PI*2); ctx.fill(); // Hand
                ctx.fillStyle = "#d7ccc8"; ctx.beginPath(); ctx.arc(18 * dir, -8 + (drop * 3), 1.5, 0, Math.PI*2); ctx.fill(); // Wadding
            } 
            else if (cycle >= 0.40 && cycle < 0.65) { 
                // 4. Ramming down the barrel
                let ramMove = Math.sin((cycle - 0.40) * Math.PI * 12) * 5; // Up and down motions
                ctx.beginPath(); ctx.arc((18 + ramMove) * dir, -5, 2, 0, Math.PI*2); ctx.fill(); // Hand
                ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo((18 + ramMove) * dir, -5); ctx.lineTo((8 + ramMove) * dir, -5); ctx.stroke(); // Ramrod
            } 
            else if (cycle >= 0.65 && cycle < 0.75) { 
                // 5. Priming the touchhole
                ctx.beginPath(); ctx.arc(6 * dir, -8, 2, 0, Math.PI*2); ctx.fill(); // Hand at breech
                ctx.fillStyle = "#212121"; ctx.fillRect(5.5 * dir, -6, 1.5 * dir, 1.5); // Pinch of powder
            } 
            else if (cycle >= 0.90 && cycle < 1.0) { 
                // 6. Lighting the fuse
                ctx.beginPath(); ctx.arc(6 * dir, -8, 2, 0, Math.PI*2); ctx.fill(); // Hand bringing fuse down
                ctx.strokeStyle = "#e65100"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(6 * dir, -8); ctx.lineTo(7 * dir, -5.5); ctx.stroke(); // Slow match
                ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(7 * dir, -5.5, 1.5 + Math.random(), 0, Math.PI*2); ctx.fill(); // Sparks!
            } 
            else {
                // Idle / Resting / Waiting for next phase
                ctx.beginPath(); ctx.arc(8 * dir, -5, 2, 0, Math.PI*2); ctx.fill(); 
            }
        } else {
            // Not attacking - Normal front hand resting
            ctx.beginPath(); ctx.arc(8 * dir, -5, 2, 0, Math.PI*2); ctx.fill(); 
        }

        // Muzzle Flash & Smoke (Only triggers in the first 5% of the cooldown cycle)
        if (isAttacking && cycle < 0.05) { 
            ctx.fillStyle = "#ffeb3b"; // Core flash
            ctx.beginPath(); ctx.arc(18 * dir, -5, 3 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
            
            ctx.fillStyle = "#ff5722"; // Secondary flame
            ctx.beginPath(); ctx.arc(22 * dir, -5, 6 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
            
            ctx.fillStyle = "rgba(140, 140, 140, 0.6)"; // Smoke expanding
            ctx.beginPath(); ctx.arc(26 * dir, -5, 8 + Math.random() * 5, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }
	else if (unitName && unitName.includes("Bomb")) {
        // 1. Context & Ammo State
        const currentAmmo = (typeof unit !== 'undefined' && unit.ammo !== undefined) ? unit.ammo : 2;
        const hasAmmo = currentAmmo > 0;
        
        // Timing synced to projectile spawn (assuming ~1.2s reload/attack cycle)
        let maxCd = 1200; 
        let currentCd = (typeof cooldown !== 'undefined') ? cooldown : 0;
        let cycle = isAttacking ? (maxCd - currentCd) / maxCd : 0;

        if (!hasAmmo) {
            // --- STATE: AMMO DEPLETED (Shortsword & Sling on Back) ---
            // Draw Sling on back
            ctx.save();
            ctx.translate(-2 * dir, -5);
            ctx.rotate(Math.PI / 1.2 * dir); 
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke(); // Staff
            ctx.strokeStyle = "#3e2723"; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(2, -10); ctx.stroke(); // Limp rope
            ctx.restore();

            // Draw Shortsword (Melee Fallback)
            let swordThrust = isAttacking ? Math.sin(cycle * Math.PI) * 8 : 0;
            ctx.save();
            ctx.translate((4 + swordThrust) * dir, -6 + weaponBob);
            ctx.rotate(Math.PI / 2 * dir);
            ctx.strokeStyle = "#9e9e9e"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.stroke(); // Blade
            ctx.strokeStyle = "#212121"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(2, -2); ctx.stroke(); // Guard
            ctx.restore();

        } else {
            // --- STATE: HAS AMMO (Staff Sling Animation) ---
            
            // 2. Draw Stored Bombs (Dynamic based on ammo)
            if (currentAmmo > 1) {
                ctx.fillStyle = "#212121";
                for (let i = 0; i < Math.min(currentAmmo - 1, 3); i++) {
                    ctx.beginPath(); 
                    ctx.arc((-5 - i*2) * dir, 0 + (i*1), 3.5, 0, Math.PI * 2); 
                    ctx.fill();
                    // Small fuse detail on stored bombs (Unlit)
                    ctx.strokeStyle = "#5d4037"; ctx.beginPath();
                    ctx.moveTo((-5 - i*2) * dir, -3 + (i*1)); ctx.lineTo((-7 - i*2) * dir, -6 + (i*1)); ctx.stroke();
                }
            }

            // 3. Staff Sling Physics
            let staffRotation = -Math.PI / 6; // Idle angle
            let pouchRotation = Math.PI / 4;  // Idle pouch hang
            let bombVisible = true;
            let handX = 2 * dir;
            let handY = -6 + weaponBob;

            if (isAttacking) {
                if (cycle < 0.4) {
                    // PHASE 1: Wind-up (Leaning back)
                    let p = cycle / 0.4;
                    staffRotation = (-Math.PI / 6) - (p * Math.PI / 3);
                    pouchRotation = (Math.PI / 4) + (p * Math.PI / 2);
                } else if (cycle < 0.8) {
                    // PHASE 2: The Snap (Forceful forward swing)
                    let p = (cycle - 0.4) / 0.4;
                    let ease = p * p; // Accelerates
                    staffRotation = (-Math.PI / 2) + (ease * Math.PI * 1.2);
                    pouchRotation = -Math.PI / 2 + (p * Math.PI);
                } else {
                    // PHASE 3: Follow-through (Release)
                    let p = (cycle - 0.8) / 0.2;
                    staffRotation = (Math.PI / 1.5);
                    pouchRotation = Math.PI / 4;
                    bombVisible = false; // Projectile is now in the air
                }
            }

            // 4. Render Staff & Pouch
            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(staffRotation * dir);

            // Draw Staff
            ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();

            // Draw Pouch (Anchor at top of staff)
            ctx.save();
            ctx.translate(0, -22);
            ctx.rotate(pouchRotation * dir);
            
            // Rope/Sling
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10); ctx.stroke();

            // The Bomb in the Pouch
            if (bombVisible) {
                // Pouch leather
                ctx.fillStyle = "#4e342e";
                ctx.beginPath(); ctx.arc(0, 10, 4, 0, Math.PI); ctx.fill();
                
                // The actual Bomb
                ctx.fillStyle = "#212121";
                ctx.beginPath(); ctx.arc(0, 10, 3.5, 0, Math.PI * 2); ctx.fill();
                
                // --- QUICK FUSE LOGIC ---
                // Only spark if attacking and specifically in the "snap" phase (0.6 to 0.8)
                // This prevents the "eternal fuse" look.
                if (isAttacking && cycle > 0.6 && cycle < 0.8) {
                    let spark = Math.random() * 2.5;
                    ctx.fillStyle = (Math.random() > 0.5) ? "#ff9800" : "#ffeb3b"; // Flicker color
                    ctx.beginPath(); 
                    ctx.arc(2, 7, spark, 0, Math.PI * 2); 
                    ctx.fill();
                    
                    // Added a tiny white core to the spark for intensity
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath(); ctx.arc(2, 7, spark/2, 0, Math.PI * 2); ctx.fill();
                } else {
                    // Draw a plain brown thread for the unlit fuse
                    ctx.strokeStyle = "#5d4037";
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(1, 9); ctx.lineTo(3, 6); ctx.stroke();
                }
            }
            
            ctx.restore(); // End pouch
            ctx.restore(); // End staff

            // Hand holding the staff
            ctx.fillStyle = "#ffccbc";
            ctx.beginPath(); ctx.arc(handX, handY, 2.5, 0, Math.PI * 2); ctx.fill();
        }
    }
	 else if (unitName?.toLowerCase().includes("ocket") || unitName?.includes("Hwacha") || type === "rocket" || type === "hwacha") {
    // 1. Logic Setup
    // Use 'unitAmmo' from the function arguments, not 'unit.ammo'
    const currentAmmo = (typeof unitAmmo !== 'undefined') ? unitAmmo : 0;
    const hasAmmo = currentAmmo > 0;
    const thrust = (isAttacking && hasAmmo) ? (Math.random() * 2) : 0; 

    // 2. Draw the Cart (ISOLATED TRANSLATION)
    ctx.save(); 
    ctx.translate(15 * dir, 2 + bob); // Move to cart position

    // Wheels
    ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 2;
    let wheelSpin = moving ? (Date.now() / 100) : 0;
    for (let sideOffset of [-8, 8]) {
        ctx.save();
        ctx.translate(0, 6);
        ctx.rotate(wheelSpin * dir);
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
        ctx.restore();
    }

    // Main Frame
    ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-12 * dir, 2); ctx.lineTo(8 * dir, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12 * dir, 2); ctx.lineTo(-18 * dir, -4); ctx.stroke();

    // The Launch Box
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(-6 * dir, -12, 12 * dir, 14);
    ctx.strokeStyle = "#212121"; ctx.lineWidth = 1;
    ctx.strokeRect(-6 * dir, -12, 12 * dir, 14);

    // Rocket Tips & Firing Effects
    if (hasAmmo) {
        ctx.fillStyle = "#212121";
        let rows = 6, cols = 5, spacing = 2, count = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (count < currentAmmo) {
                    let ax = (6 * dir) + (thrust * dir);
                    let ay = -10 + (r * spacing);
                    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (4 * dir), ay + 1); ctx.lineTo(ax, ay + 2); ctx.fill();
                }
                count++;
            }
        }
        if (isAttacking) {
            ctx.fillStyle = "rgba(255, 160, 0, 0.8)";
            ctx.beginPath(); ctx.arc(10 * dir, -6, 4 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
            ctx.beginPath(); ctx.arc(8 * dir, -4, 6 + Math.random() * 6, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.restore(); // <--- CRITICAL: Returns coordinates back to the Man's center

    // 3. Draw the Operator (The Man)
  //  ctx.fillStyle = factionColor; 
//ctx.fillRect(-3, -10 + bob, 6, 10); // Body

    // Forward Hand (Holding cart handle)
    ctx.fillStyle = "#ffccbc";
    ctx.beginPath(); 
    ctx.arc(4 * dir, -2 + bob, 2.5, 0, Math.PI * 2); 
    ctx.fill();

    // 4. Draw the Spear (Opposite Hand / Back Hand)
    let stabX = 0, stabY = 0;
    let spearRot = (Math.PI / -6) * dir;

    if (!hasAmmo && isAttacking) {
        let stabCycle = (Date.now() / 200) % 1.0; 
        stabX = Math.sin(stabCycle * Math.PI) * 12;
        stabY = Math.sin(stabCycle * Math.PI) * 2;
        spearRot = (Math.PI / 12) * dir;
    }

    ctx.save(); 
    ctx.translate((-8 + stabX) * dir, -8 + bob + stabY); // Back position
    ctx.rotate(spearRot);
    
    // Spear Shaft & Head
    ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -28); ctx.stroke();
    ctx.fillStyle = "#bdbdbd";
    ctx.beginPath(); ctx.moveTo(-1.5, -28); ctx.lineTo(0, -36); ctx.lineTo(1.5, -28); ctx.fill();
    ctx.restore(); // <--- CRITICAL: Returns coordinates back to the Man's center

    // 5. Spear Hand (Drawn last so it's on top)
    ctx.fillStyle = "#ffccbc";
    ctx.beginPath();
    ctx.arc((-8 + stabX) * dir, -8 + bob + stabY, 2.5, 0, Math.PI * 2);
    ctx.fill();

} // End of Rocket block (Note: NO ctx.restore here, the function handles it at the very bottom)
   else if (type === "shortsword" || (typeof unit !== 'undefined' && unit.stats && unit.stats.isRanged && unit.stats.ammo <= 0)) {
        // Use the 'bob' variable defined at the top of the function to avoid NaN errors
        let b = (typeof bob !== 'undefined') ? bob : 0;

        ctx.strokeStyle = "#9e9e9e"; 
        ctx.lineWidth = 2.5; 
        ctx.beginPath(); 
        ctx.moveTo(0, -6 + b); 
        ctx.lineTo(12 * dir, -10 + b); 
        ctx.stroke(); 

        ctx.strokeStyle = "#212121"; 
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(1 * dir, -5 + b); 
        ctx.lineTo(3 * dir, -8 + b); 
        ctx.stroke();
    }
    ctx.restore();
}