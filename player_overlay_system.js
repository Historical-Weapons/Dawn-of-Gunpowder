// ============================================================================
// EMPIRE OF THE 13TH CENTURY - PLAYER OVERLAY & BOUNDS SYSTEM
// ============================================================================

// 1. GLOBAL UI & MOUSE STATES
// Defined at top level so all systems can access mouse position and UI status
let worldMouseX = 0;
let worldMouseY = 0;
let isHoveringPlayer = false;
window.isRosterOpen = false; 

// 2. NPC BOUNDS FIX
function enforceNPCBounds(npc, worldWidth, worldHeight) {
    const margin = 50; // Keep them away from the absolute edge
    if (npc.x < margin) { npc.x = margin; npc.vx *= -1; }
    if (npc.x > worldWidth - margin) { npc.x = worldWidth - margin; npc.vx *= -1; }
    if (npc.y < margin) { npc.y = margin; npc.vy *= -1; }
    if (npc.y > worldHeight - margin) { npc.y = worldHeight - margin; npc.vy *= -1; }
}

// 3. EVENT LISTENERS (Declared once)
window.addEventListener('keydown', (e) => {
    // Block overlay toggle if in battle or specific modes
    if (typeof inBattleMode !== 'undefined' && (inBattleMode || inCityMode || (typeof inParleMode !== 'undefined' && inParleMode))) return;

    if (e.key.toLowerCase() === 't') {
        window.isRosterOpen = !window.isRosterOpen; 
        console.log("Roster Status:", window.isRosterOpen);
    }
});

window.addEventListener('mousemove', (e) => {
    // Dependency Check: Needs access to the main game 'canvas' and 'player' objects
    if (typeof canvas === 'undefined' || typeof player === 'undefined' || !player) return;
    
    // Convert screen mouse to world coordinates based on camera zoom/offset
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Calculate World Coordinates
    worldMouseX = (screenX - canvas.width / 2) / zoom + player.x;
    worldMouseY = (screenY - canvas.height / 2) / zoom + player.y;

    // Check if mouse is hovering over the player (using world coords)
    const dist = Math.hypot(worldMouseX - player.x, worldMouseY - player.y);
    isHoveringPlayer = dist < 25;
});

// 4. MAIN DRAWING FUNCTION
function drawPlayerOverlay(ctx, player, zoom) {
    // A. Mode Safety Check
    if (typeof inBattleMode !== 'undefined' && (inBattleMode || inCityMode || (typeof inParleMode !== 'undefined' && inParleMode))) {
        isHoveringPlayer = false;
        window.isRosterOpen = false;
        return;
    }
    
    const htmlUI = document.getElementById('ui');
    
    // B. Visibility Logic: If not hovering and not locked open, show standard HTML UI and exit
    if (!isHoveringPlayer && !window.isRosterOpen) {
        if (htmlUI) htmlUI.style.display = "block"; 
        return;
    }
    
    // Otherwise, we are showing the Overlay, so hide the HTML UI
    if (htmlUI) htmlUI.style.display = "none";

    // C. Rendering the Canvas Overlay
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw in Screen Space

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // --- COMPACT OVERLAY DIMENSIONS ---
    const boxW = W * 0.8;  // 80% width
    const boxH = H * 0.7;  // 70% height
    const startX = (W - boxW) / 2; 
    const startY = (H - boxH) / 2; 

    // Process Roster Data
    let armySource = player.roster || [];
    if (armySource.length === 0 && player.troops > 0) {
        armySource = [{ type: "Default Retinue", exp: 1.0, count: player.troops }];
    }

    const troopGroups = {};
    armySource.forEach(u => {
        const l = Math.floor(u.exp || 1);
        const e = ((u.exp % 1) * 100).toFixed(0);
        const key = `${u.type || 'Unit'}|${l}|${e}`;
        if (!troopGroups[key]) {
            troopGroups[key] = { type: u.type || 'Unit', lvl: l, exp: e, count: 0 };
        }
        troopGroups[key].count += (u.count || 1);
    });

    // Background & Frame
    ctx.fillStyle = "rgba(10, 8, 5, 0.95)"; 
    ctx.fillRect(startX, startY, boxW, boxH);
    ctx.strokeStyle = "#d4b886";
    ctx.lineWidth = 5;
    ctx.strokeRect(startX + 5, startY + 5, boxW - 10, boxH - 10);

    const paddingX = startX + 40;
    
    // Player Header
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffca28";
    ctx.font = "bold 28px Georgia";
    ctx.fillText("PLAYER DATA", paddingX, startY + 50);

    // Character Status
    const pLvl = player.experienceLevel || 1;
    const pExp = player.experience || 0;
    const expNeeded = pLvl * 10; 
    const pExpPercent = Math.min(1, pExp / expNeeded);

    ctx.font = "bold 16px Georgia";
    ctx.fillStyle = "#d4b886";
    ctx.fillText("CHARACTER STATUS", paddingX, startY + 95);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`LEVEL: ${pLvl} [${Math.floor(pExp)} / ${expNeeded} XP]`, paddingX, startY + 120);

    const statsText = `HP: ${Math.floor(player.hp)}/${player.maxHealth} | ATK: ${player.meleeAttack} | DEF: ${player.meleeDefense}`;
    ctx.fillText(statsText, paddingX, startY + 145);
    
    const resourcesText = `GOLD: ${Math.floor(player.gold || 0)} | FOOD: ${Math.floor(player.food || 0)} | FORCE: ${player.troops}`;
    ctx.fillText(resourcesText, paddingX, startY + 170);

    // EXP Bar
    ctx.fillStyle = "#222";
    ctx.fillRect(paddingX, startY + 185, 300, 8); 
    ctx.fillStyle = "#ffca28"; 
    ctx.fillRect(paddingX, startY + 185, 300 * pExpPercent, 8);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(paddingX, startY + 185, 300, 8);

    // Army Roster
    const rosterStartY = startY + 230; 
    ctx.font = "bold 16px Georgia"; 
    ctx.fillStyle = "#d4b886";
    ctx.fillText(`ARMY ROSTER (${player.troops} Men)`, paddingX, rosterStartY);

    let cursorX = paddingX;
    let cursorY = rosterStartY + 30;
    const colGap = 30; 
    const rowGap = 45; 

    const units = Object.values(troopGroups);
    units.forEach((unit) => {
        ctx.font = "bold 11px monospace"; 
        const name = unit.type.toUpperCase();
        const stats = `LVL ${unit.lvl} [EXP ${unit.exp}%] x${unit.count}`;
        const entryWidth = Math.max(ctx.measureText(name).width, ctx.measureText(stats).width);

        if (cursorX + entryWidth > startX + boxW - 40) {
            cursorX = paddingX;
            cursorY += rowGap;
        }

        ctx.fillStyle = "#fff";
        ctx.fillText(name, cursorX, cursorY);
        ctx.fillStyle = "#8bc34a"; 
        ctx.font = "9px monospace"; 
        ctx.fillText(stats, cursorX, cursorY + 14); 

        cursorX += entryWidth + colGap;
    });

    // Footer
    ctx.textAlign = "center";
    ctx.font = "12px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText("Press T to exit Troop Menu", startX + (boxW / 2), startY + boxH - 20);
    
    ctx.restore();
}

// 5. INTEGRATION HELPER
function updateAndDrawPlayerSystems(ctx, player, zoom, worldW, worldH, npcs) {
    // Fix NPC bounds
    if (npcs) npcs.forEach(npc => enforceNPCBounds(npc, worldW, worldH));
    
    // Draw Player UI
    drawPlayerOverlay(ctx, player, zoom);
}