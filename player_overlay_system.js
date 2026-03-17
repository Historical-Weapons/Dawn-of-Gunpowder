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

// 1. Declare these at the TOP of the file so drawAllNPCs can see them
let worldMouseX = 0;
let worldMouseY = 0;

window.addEventListener('mousemove', (e) => {
	if (!canvas || !player) return;
    // Convert screen mouse to world coordinates
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // 2. REMOVED 'const' here. 
    // We are now updating the global variables we declared above.
    worldMouseX = (screenX - canvas.width / 2) / zoom + player.x;
    worldMouseY = (screenY - canvas.height / 2) / zoom + player.y;

    // 3. Keep your player hover logic exactly as it was
    const dist = Math.hypot(worldMouseX - player.x, worldMouseY - player.y);
    isHoveringPlayer = dist < 25;
});

function drawPlayerOverlay(ctx, player, zoom) {
    if (typeof inBattleMode !== 'undefined' && (inBattleMode || inCityMode)) return;

    // 1. MASTER UI OVERRIDE
    const htmlUI = document.getElementById('ui');
    if (!isHoveringPlayer) {
        if (htmlUI) htmlUI.style.display = "block"; 
        return;
    }
    if (htmlUI) htmlUI.style.display = "none";

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // 2. DYNAMIC ROSTER DATA (Confirmed: player.roster)
    let armySource = player.roster || [];
    
    // VARIETY GANG FIX: If roster is empty but troops exist, don't show an empty list
    if (armySource.length === 0 && player.troops > 0) {
        // This is just a temporary visual display for the overlay 
        // until the Campaign Expansion officially populates the roster.
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
        // Use u.count if it exists (for the fallback), otherwise increment by 1
        troopGroups[key].count += (u.count || 1);
    });

    // 3. BACKGROUND & FRAME
    ctx.fillStyle = "rgba(10, 8, 5, 0.98)"; 
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#d4b886";
    ctx.lineWidth = 15;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    // 4. PLAYER DATA HEADER
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffca28";
    ctx.font = "bold 44px Georgia";
    ctx.fillText("PLAYER DATA", 80, 100);

    // 5. PLAYER CHARACTER STATUS
    const pLvl = player.stats ? (player.stats.experienceLevel || 1) : 1;
    const pExp = (pLvl % 1);
    
    ctx.font = "bold 22px Georgia";
    ctx.fillStyle = "#d4b886";
    ctx.fillText("CHARACTER STATUS", 80, 160);

    ctx.font = "16px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`LEVEL: ${Math.floor(pLvl)} (${(pExp * 100).toFixed(0)}% EXP)`, 80, 195);
    ctx.fillText(`HEALTH: ${Math.floor(player.hp || 100)}% | SPEED: ${player.speed || 2}`, 80, 220);
    ctx.fillText(`GOLD: ${Math.floor(player.gold || 0)} | FOOD: ${Math.floor(player.food || 0)}`, 80, 245);

    // EXP Bar
    ctx.fillStyle = "#222";
    ctx.fillRect(80, 260, 400, 8);
    ctx.fillStyle = "#ffca28";
    ctx.fillRect(80, 260, 400 * pExp, 8);

    // 6. ARMY ROSTER (Variety Gang)
    ctx.font = "bold 22px Georgia";
    ctx.fillStyle = "#d4b886";
    ctx.fillText("ARMY ROSTER", 80, 330);

    const margin = 80;
    let cursorX = margin;
    let cursorY = 370;
    const colGap = 45; 
    const rowGap = 65;

    const units = Object.values(troopGroups);
    units.forEach((unit) => {
        ctx.font = "bold 15px monospace";
        const name = unit.type.toUpperCase();
        const stats = `LVL ${unit.lvl} [EXP ${unit.exp}%] x${unit.count}`;
        const entryWidth = Math.max(ctx.measureText(name).width, ctx.measureText(stats).width);

        if (cursorX + entryWidth > W - margin) {
            cursorX = margin;
            cursorY += rowGap;
        }

        ctx.fillStyle = "#fff";
        ctx.fillText(name, cursorX, cursorY);
        ctx.fillStyle = "#8bc34a"; 
        ctx.font = "12px monospace";
        ctx.fillText(stats, cursorX, cursorY + 20);

        cursorX += entryWidth + colGap;
    });

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