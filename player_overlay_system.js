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

window.addEventListener('mousemove', (e) => {
    // Convert screen mouse to world coordinates based on camera zoom/offset
    // This assumes you have access to 'player' and 'zoom' from index.html
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Calculate world position relative to player (center of screen)
    const worldMouseX = (screenX - canvas.width / 2) / zoom + player.x;
    const worldMouseY = (screenY - canvas.height / 2) / zoom + player.y;

    // Check if mouse is near player icon (approx 20px radius)
    const dist = Math.hypot(worldMouseX - player.x, worldMouseY - player.y);
    isHoveringPlayer = dist < 25;
});
 
// 3. RENDER PLAYER OVERLAY
function drawPlayerOverlay(ctx, player, zoom) {
	
	// Only display if NOT in battle and NOT in city exploration
    if (inBattleMode || inCityMode) return;
	
    ctx.save();
    
    // Position text below player icon
    const labelY = player.y + 45;
    
    // A. ALWAYS VISIBLE NAME
    // Slightly smaller base font (14 instead of 18)
    const nameFontSize = Math.max(10, 14 / zoom); 
    ctx.font = `bold ${nameFontSize}px Georgia`;
    ctx.textAlign = "center";
    
    // Shadow & Text for "Player"
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillText("Player", player.x + 2, labelY + 2); 
    ctx.fillStyle = "#f5d76e"; 
    ctx.fillText("Player", player.x, labelY);

    // B. HOVER-ONLY DETAILED STATS
    if (isHoveringPlayer) {
        const stats = [
            `Troops: ${player.troops || 0}`,
            `Food: ${Math.floor(player.food || 0)}`,
            `Gold: ${Math.floor(player.gold || 0)}`,
            `Health: ${Math.floor(player.hp || 100)}%`
        ];

        if (player.unitType) {
            stats.push(`Type: ${player.unitType}`);
            if (typeof UNIT_TYPES !== 'undefined' && UNIT_TYPES[player.unitType]) {
                stats.push(`Atk: ${UNIT_TYPES[player.unitType].dmg}`);
            }
        }

        // 1. Calculate the dynamic text size
        const statFontSize = Math.max(10, 14 / zoom);
        const lineHeight = statFontSize * 1.4;
        const padding = statFontSize * 0.8;
        
        // 2. Tie the box dimensions to the text size so they never mismatch
        const boxWidth = statFontSize * 9.5; // 9.5 chars wide (fits Monospace text)
        const boxHeight = (stats.length * lineHeight) + padding;
        
        // 3. Position the box above the "Player" label, adapting to zoom
        const boxX = player.x - boxWidth / 2;
        const boxY = labelY - boxHeight - (20 / zoom) - nameFontSize;
        
        // Draw background box
        ctx.fillStyle = "rgba(25, 15, 5, 0.9)";
        ctx.strokeStyle = "#5d4037";
        ctx.lineWidth = 2 / zoom; // Ensure border thickness scales cleanly too
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        // Draw Stats Text
        ctx.textAlign = "left";
        ctx.font = `${statFontSize}px monospace`;
        
        stats.forEach((text, i) => {
            ctx.fillStyle = text.includes("Food") ? "#8bc34a" : (text.includes("Gold") ? "#ffd700" : "#fff");
            // Calculate exact vertical placement for each line
            const textY = boxY + padding + (i * lineHeight) + (statFontSize * 0.75);
            ctx.fillText(text, boxX + padding, textY);
        });
    }

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