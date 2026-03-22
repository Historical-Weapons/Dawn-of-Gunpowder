// ============================================================================
// EMPIRE OF THE 13TH CENTURY - PLAYER OVERLAY & BOUNDS SYSTEM
// ============================================================================

// 1. NPC BOUNDS FIX: Add this function to your update loop or call it for each NPC
function enforceNPCBounds(npc, worldWidth, worldHeight) {
    const margin = 50; // Keep them away from the absolute edge
    if (npc.x < margin) { npc.x = margin; npc.vx *= -1; }
    if (npc.x > worldWidth - margin) { npc.x = worldWidth - margin; npc.vx *= -1; }
    if (npc.y < margin) { npc.y = margin; npc.vy *= -1; }
    if (npc.y > worldHeight - margin) { npc.y = worldHeight - margin; npc.vy *= -1; }
}

// 2. PLAYER MOUSE HOVER STATE
let mouseX = 0;
let mouseY = 0;
let isHoveringPlayer = false;
let overlayLocked = false; // <--- NEW FLAG
// Listen for the T key
// Replace the listener in player_overlay_system.js
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't') {
        // Use the variable that index.html actually checks
        window.isRosterOpen = !window.isRosterOpen; 
        console.log("Roster Status:", window.isRosterOpen);
    }
});

// 1. Declare these at the TOP of the file so drawAllNPCs can see them
let worldMouseX = 0;
let worldMouseY = 0;

window.addEventListener('mousemove', (e) => {
    // Safely check if variables exist before touching them
	if (typeof canvas === 'undefined' || typeof player === 'undefined' || !player) return;
    // Convert screen mouse to world coordinates
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // We are now updating the global variables we declared above.
    worldMouseX = (screenX - canvas.width / 2) / zoom + player.x;
    worldMouseY = (screenY - canvas.height / 2) / zoom + player.y;

    // 3. Keep your player hover logic exactly as it was
    const dist = Math.hypot(worldMouseX - player.x, worldMouseY - player.y);
    isHoveringPlayer = dist < 25;
});

// ... (NPC Bounds and Mouse listeners remain the same) ...

// Inside player_overlay_system.js
function drawPlayerOverlay(ctx, player, zoom) {
    if (typeof inBattleMode !== 'undefined' && (inBattleMode || inCityMode)) {
        isHoveringPlayer = false;
        window.isRosterOpen = false; // Reset state when entering battle/city
        return;
    }
    
    const htmlUI = document.getElementById('ui');
    
    // FIX: Check window.isRosterOpen instead of overlayLocked
    if (!isHoveringPlayer && !window.isRosterOpen) {
        if (htmlUI) htmlUI.style.display = "block"; 
        return;
    }
    if (htmlUI) htmlUI.style.display = "none";
    // ... rest of the function remains the same

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // --- NEW: COMPACT OVERLAY DIMENSIONS ---
    const boxW = W * 0.8;  // 80% width
    const boxH = H * 0.7;  // 70% height
    const startX = (W - boxW) / 2; // Center horizontally
    const startY = (H - boxH) / 2; // Center vertically

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

    // BACKGROUND & FRAME (Slightly more transparent so game is visible)
    ctx.fillStyle = "rgba(10, 8, 5, 0.90)"; 
    ctx.fillRect(startX, startY, boxW, boxH);
    ctx.strokeStyle = "#d4b886";
    ctx.lineWidth = 5;
    ctx.strokeRect(startX + 5, startY + 5, boxW - 10, boxH - 10);

    // Padding inside the new smaller box
    const paddingX = startX + 40;
    
    // 4. PLAYER DATA HEADER
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffca28";
    ctx.font = "bold 28px Georgia";
    ctx.fillText("PLAYER DATA", paddingX, startY + 50);

   // 5. PLAYER CHARACTER STATUS (Surgical Fix)
    // We check for player.exp first. If it doesn't exist, we default to 1.0
    const rawPExp = player.exp || 1.0; 
    const pLvl = Math.floor(rawPExp);
    const pExpPercent = (rawPExp % 1); // Get the decimal part for the bar
    
    ctx.font = "bold 16px Georgia";
    ctx.fillStyle = "#d4b886";
    ctx.fillText("CHARACTER STATUS", paddingX, startY + 95);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#ffffff";
    
    // Display Level and calculated Percent
    ctx.fillText(`LEVEL: ${pLvl} (${(pExpPercent * 100).toFixed(0)}% EXP)`, paddingX, startY + 120);
    ctx.fillText(`HEALTH: ${Math.floor(player.hp || 100)}% | SPEED: ${player.speed || 15}`, paddingX, startY + 145);
    ctx.fillText(`GOLD: ${Math.floor(player.gold || 0)} | FOOD: ${Math.floor(player.food || 0)} | FORCE: ${player.troops}`, paddingX, startY + 170);

    // EXP Bar - Corrected to use pExpPercent
    ctx.fillStyle = "#222";
    ctx.fillRect(paddingX, startY + 185, 300, 6);
    ctx.fillStyle = "#ffca28";
    ctx.fillRect(paddingX, startY + 185, 300 * pExpPercent, 6);

    // 6. ARMY ROSTER (Anchored inside the compact box)
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

        // Word wrap within the new compact box bounds
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

    ctx.textAlign = "center";
    ctx.font = "12px monospace";
    ctx.fillStyle = "#888";
    // Footer text stays at the bottom of the compact box
    ctx.fillText("Press T to exit Troop Menu", startX + (boxW / 2), startY + boxH - 20);
    ctx.restore();
}

// 4. INTEGRATION HELPER
// Call this inside your main update/draw loop
function updateAndDrawPlayerSystems(ctx, player, zoom, worldW, worldH, npcs) {
    // Fix NPC bounds
    if (npcs) npcs.forEach(npc => enforceNPCBounds(npc, worldW, worldH));
    
    // Draw Player UI
    drawPlayerOverlay(ctx, player, zoom);
}