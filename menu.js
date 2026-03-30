(function () {
    let menuActive = false;
    let menuAnimFrameId = null;
    let backgroundUnits = [];
    let particles = [];

window.showMainMenu = function () {
        if (menuActive) return;
        menuActive = true;
		
     

// --- REVISED MENU MUSIC & MAXIMIZE LOGIC ---
const startStandaloneMusic = () => {
    if (!menuActive) return;



    // 1. Initialize the global manager
    if (typeof AudioManager !== 'undefined') {
        AudioManager.init();
        AudioManager.playMP3('music/menu_noloop.mp3', false);
    }

    // 3. Remove listeners so it only triggers once
    window.removeEventListener('mousedown', startStandaloneMusic);
    window.removeEventListener('keydown', startStandaloneMusic);
};



// --- ADD THESE LINES TO HOOK IT UP ---
window.addEventListener('mousedown', startStandaloneMusic);
window.addEventListener('keydown', startStandaloneMusic);

        // --- REST OF YOUR MENU CODE ---
        
        // PAUSE NPC MOVEMENT: Set a global flag that index.html can check
        window.isPaused = true; 

        // --- MAIN CONTAINER ---
        const menu = document.createElement("div");
        menu.id = "main-menu";
        menu.style.position = "fixed";
        menu.style.top = "0";
        menu.style.left = "0";
        menu.style.width = "100%";
        menu.style.height = "100%";
        menu.style.background = "#3e2723";
        menu.style.display = "flex";
        menu.style.flexDirection = "column";
        menu.style.alignItems = "center";
        menu.style.justifyContent = "center";
        menu.style.zIndex = "10000";
        menu.style.transition = "opacity 0.5s ease";

        // --- EPIC BACKGROUND CANVAS ---
        const canvas = document.createElement("canvas");
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.zIndex = "-1";
        menu.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // --- UI CONTAINER ---
        const uiContainer = document.createElement("div");
        uiContainer.style.display = "flex";
        uiContainer.style.flexDirection = "column";
        uiContainer.style.alignItems = "center";
        uiContainer.style.zIndex = "1";
        
        // --- TITLE ---
        const title = document.createElement("h1");
        title.innerText = "DAWN OF GUNPOWDER";
        title.style.color = "#f5d76e";
        title.style.fontFamily = "Georgia, serif";
        title.style.fontSize = "4rem";
        title.style.margin = "0 0 40px 0";
        title.style.textAlign = "center";
        title.style.letterSpacing = "8px";
        title.style.textShadow = "0 0 20px rgba(212, 184, 134, 0.8), 0 5px 15px rgba(123, 26, 26, 0.9)";
        title.style.border = "none";
        title.style.borderBottom = "none";

        // --- BUTTON CREATOR ---
        function createBtn(text, onClick) {
            const btn = document.createElement("button");
            btn.innerText = text;
            btn.style.background = "linear-gradient(to bottom, #7b1a1a, #4a0a0a)";
            btn.style.color = "#f5d76e";
            btn.style.border = "2px solid #d4b886";
            btn.style.padding = "15px 40px";
            btn.style.margin = "10px";
            btn.style.fontFamily = "Georgia, serif";
            btn.style.fontSize = "1.2rem";
            btn.style.fontWeight = "bold";
            btn.style.cursor = "pointer";
            btn.style.borderRadius = "4px";
            btn.style.textTransform = "uppercase";
            btn.style.width = "280px";
            btn.style.transition = "all 0.2s";
            btn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.5)";

            btn.onmouseenter = () => {
                btn.style.transform = "scale(1.05)";
                btn.style.background = "linear-gradient(to bottom, #b71c1c, #7b1a1a)";
                btn.style.color = "#fff";
                btn.style.boxShadow = "0 0 20px #d4b886";
            };

            btn.onmouseleave = () => {
                btn.style.transform = "scale(1)";
                btn.style.background = "linear-gradient(to bottom, #7b1a1a, #4a0a0a)";
                btn.style.color = "#f5d76e";
                btn.style.boxShadow = "0 4px 6px rgba(0,0,0,0.5)";
            };

            btn.onclick = onClick;
            return btn;
        }

function destroyMenu() {
    // Stop the MP3 if it's still playing
    if (typeof AudioManager !== 'undefined') {
        AudioManager.stopMP3();
    }

    menu.style.opacity = "0";
    if (menuAnimFrameId) {
        cancelAnimationFrame(menuAnimFrameId);
        menuAnimFrameId = null;
    }
    backgroundUnits = [];
    particles = [];
    window.removeEventListener('resize', resizeCanvas);

    setTimeout(() => {
        if (menu.parentNode) menu.parentNode.removeChild(menu);
        menuActive = false;
        window.isPaused = false; 
    }, 500);
}


const playBtn = createBtn("Enter World", () => {
    // Show and style loading text to act as a header banner
    const loadDiv = document.getElementById('loading');
    if (loadDiv) {
        loadDiv.style.display = 'block';
        loadDiv.style.background = "linear-gradient(90deg, rgba(62,39,35,0.98), rgba(123,26,26,0.98), rgba(62,39,35,0.98))";
        loadDiv.style.borderBottom = "2px solid #d4b886";
        loadDiv.style.fontSize = "18px";
        loadDiv.style.padding = "15px 0";
        loadDiv.style.boxShadow = "0 4px 10px rgba(0,0,0,0.8)";
    }

    // SURGERY: Auto-show the Units Guide as the interactive loading screen
    const guideModal = document.getElementById('units-guide-modal');
    if (guideModal) {
        guideModal.style.display = 'flex';
        setTimeout(() => {
            if (typeof guideModal.setInitial === "function") guideModal.setInitial();
        }, 100);
    }
 
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
            // FIX ZOOM: Force the game to recalculate size after entering fullscreen
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 150);
        }).catch(err => console.warn(err));
    }

    if (typeof AudioManager !== 'undefined') {
        AudioManager.init();
    }

    destroyMenu();

    setTimeout(() => {
        if (typeof startGameSafe === 'function') startGameSafe();
    }, 100); 
});
// Ensure it starts hidden
playBtn.style.display = "none";

// --- ENHANCED START ENGINE WRAPPER ---
function startGameSafe() {
    // Prevent double-starts if the user double-clicks the button
    if (window.__gameStarted) return;
    window.__gameStarted = true;

    console.log("Handoff successful: Starting Game Engine...");

    if (typeof initGame === "function") {
        initGame();
    } else {
        // Fallback for debugging if the main script isn't ready
        console.error("Critical Error: initGame() not found. Ensure index.html scripts are loaded.");
        alert("Game Engine failed to initialize. Please refresh.");
    }
}
        
        // HIDDEN BY DEFAULT
        playBtn.style.display = "none";

const instrBtn = createBtn("Manual", () => {
    // 1. Instantly unlock the other hidden buttons
    playBtn.style.display = "block";
	
	    // --- NEW: FORCE FULLSCREEN ON FIRST GESTURE ---
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Fullscreen blocked or failed: ${err.message}`);
        });
    }
	
    const unitsBtn = document.getElementById("units-guide-btn");
    if (unitsBtn) unitsBtn.style.display = "block";

    // 2. Open the manual immediately (No fullscreen conflict)
    manualModal.style.display = "flex";
    uiContainer.style.display = "none";
    
    // 3. Keep this to ensure the layout snaps to the current window size
    window.dispatchEvent(new Event('resize'));
});


        // --- CUSTOM SCROLLBAR CSS ---
        const style = document.createElement('style');
        style.innerHTML = `
            #manual-content::-webkit-scrollbar { width: 10px; }
            #manual-content::-webkit-scrollbar-track { background: #3e2723; border-radius: 4px; border: 1px solid #7b1a1a; }
            #manual-content::-webkit-scrollbar-thumb { background: #d4b886; border-radius: 4px; }
            #manual-content::-webkit-scrollbar-thumb:hover { background: #f5d76e; }
        `;
        document.head.appendChild(style);

        // --- IN-GAME MANUAL MODAL GUI ---
        const manualModal = document.createElement("div");
        manualModal.style.display = "none"; // Hidden by default
        manualModal.style.flexDirection = "column";
manualModal.style.width = "clamp(320px, 60vw, 900px)";
manualModal.style.height = "clamp(300px, 70vh, 800px)";
manualModal.style.maxWidth = "95vw";
manualModal.style.maxHeight = "90vh";
        manualModal.style.background = "linear-gradient(to bottom, rgba(62, 39, 35, 0.95), rgba(74, 10, 10, 0.95))";
        manualModal.style.border = "3px solid #d4b886";
        manualModal.style.borderRadius = "8px";
        manualModal.style.padding = "30px";
        manualModal.style.boxShadow = "0 10px 40px rgba(0,0,0,0.8)";
        manualModal.style.zIndex = "10";
        manualModal.style.color = "#f5d76e";
        manualModal.style.fontFamily = "Georgia, serif";

        const manualContent = document.createElement("div");
        manualContent.id = "manual-content";
        manualContent.style.overflowY = "auto";
        manualContent.style.flexGrow = "1";
        manualContent.style.paddingRight = "15px";
        manualContent.innerHTML = `
            <h2 style="text-align: center; border-bottom: 2px solid #7b1a1a; padding-bottom: 15px; margin-top: 0; letter-spacing: 2px;">
                DAWN OF GUNPOWDER:<br><span style="font-size: 0.7em; color: #d4b886;">EMPIRE OF THE 13TH CENTURY</span>
            </h2>
            <h3 style="color: #fff; margin-top: 25px;">COMMANDS:</h3>
            <ul style="line-height: 1.8; font-size: 1.1rem; list-style-type: square; color: #d4b886;">
                <li><strong style="color: #f5d76e;">WASD to Travel</li>
                <li><strong style="color: #f5d76e;">SCROLL to Zoom Map</li>
			    <li><strong style="color: #f5d76e;">12345 to Select Unit Type in Battlefield</li>
			    <li><strong style="color: #f5d76e;">Press Q,E,R,F to Select Unit Type in Battlefield</li>
							    <li><strong style="color: #f5d76e;">Press Z,X,C,V,B to Command Unit Formation</li>
                <li><strong style="color: #f5d76e;">Press P to Return to Overworld unless still in Live Battle</li>
				                <li><strong style="color: #f5d76e;">Press T to view Troops & EXP in Overworld</li>
            </ul>
<p style="line-height: 1.6; font-size: 1.1rem; margin-top: 25px;">
    Dawn of Gunpowder is a tactical strategy experience set in a historically inspired 13th-century world shaped by conquest, innovation, and shifting alliances. Though its factions are fictional, each draws heavily from real medieval cultures, technologies, and battlefield traditions of mostly East Asia before the age of Mongol conquest and during the early gunpowder era. Across sweeping steppes, fortified river valleys, dense forests, deserts, and mountain frontiers, rival powers struggle to dominate trade routes, secure borders, and expand their influence. Among them are mobile steppe confederations inspired by the Mongol war machine, disciplined dynastic armies influenced by Song-era gunpowder warfare, and armored cavalry kingdoms modeled after the Central Asian military traditions. Smaller regional powers, influenced by Korean, Vietnamese, Tibetan, and Japanese warfare, defend their homelands with unique tactics shaped by terrain, culture, and centuries of conflict.
</p>

<p style="line-height: 1.6; font-size: 1.1rem; margin-top: 15px;">
    Each faction fields armies built around distinctive historical doctrines rather than simple variations of the same units. Steppe-inspired factions dominate open terrain with fast-moving horse archers, raiders, and elite lancers capable of striking deep behind enemy lines. Gunpowder dynasties deploy disciplined infantry supported by crossbows, rockets, firelances, bombs, and early hand cannons, excelling in defensive warfare and siege-style engagements. Cavalry kingdoms rely on heavily armored riders, spear formations, and combined-arms tactics supported by archers and war beasts such as elephants or camels. Highland and frontier factions favor endurance, skirmishing, and specialized weapons suited to rugged terrain, while coastal and riverine powers protect vital trade routes with flexible, mixed formations. As the campaign unfolds, armies grow through recruitment and battlefield experience, transforming small warbands into veteran forces capable of decisive victories. Every battle reflects the strengths and weaknesses of its faction, ensuring that terrain, composition, and tactical decisions shape the outcome of war.
</p>
        `;

        const closeBtn = createBtn("Close Manual", () => {
            manualModal.style.display = "none";
            uiContainer.style.display = "flex"; // Show main UI again
        });
        closeBtn.style.margin = "20px auto 0 auto";
        
        manualModal.appendChild(manualContent);
        manualModal.appendChild(closeBtn);

        // --- CREDITS TEXT ---
        const credits = document.createElement("div");
        credits.innerText = "by Historical Weapons YouTube Channel";
        credits.style.position = "absolute";
        credits.style.bottom = "15px";
        credits.style.color = "#d4b886";
        credits.style.fontFamily = "Georgia, serif";
        credits.style.fontSize = "0.9rem";
        credits.style.opacity = "0.7";
        credits.style.letterSpacing = "1px";

uiContainer.appendChild(title);
        uiContainer.appendChild(instrBtn);
        uiContainer.appendChild(playBtn); 
        
        menu.appendChild(uiContainer);

        menu.appendChild(manualModal); // Append Modal to menu
        menu.appendChild(credits);     // Append Credits to menu
        
        // CRITICAL: Append the menu to the webpage FIRST
        document.body.appendChild(menu);

        // NOW inject the units guide, so the script can successfully find the menu and build the data table
        if (typeof window.injectUnitsGuide === "function") {
            window.injectUnitsGuide();
        }

        // ==========================================
        // EPIC BACKGROUND ANIMATION LOGIC
        // ==========================================
        
        const unitTypes = [
            { type: "gun", name: "Handgunner", isCavalry: false },
            { type: "crossbow", name: "Repeater Crossbowman", isCavalry: false },
            { type: "crossbow", name: "Poison Crossbowman", isCavalry: false },
            { type: "spearman", name: "Firelance", isCavalry: false },
            { type: "peasant", name: "Bomb", isCavalry: false },
            { type: "archer", name: "Rocket", isCavalry: false }
   
        ];

        const headwears = ["none", "rice_hat", "mongol_helmet"];

// REDUCED UNIT COUNT TO 20 (Slightly less crowded)
        for(let i = 0; i < 20; i++) { 
            let uType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
            let fColor = Math.random() > 0.5 ? "#7b1a1a" : "#4a4a4a";
            // Assign Mongol helmets mostly to horse archers/grey faction, Rice hats to red faction
            let hat = "none";
            if (uType.isCavalry) hat = "mongol_helmet";
            else if (fColor === "#7b1a1a" && Math.random() > 0.5) hat = "rice_hat";
            else if (fColor === "#4a4a4a" && Math.random() > 0.5) hat = "mongol_helmet";

backgroundUnits.push({
                x: Math.random() * canvas.width,  // USE CANVAS WIDTH
                y: Math.random() * canvas.height, // USE CANVAS HEIGHT
                vx: 0,
                vy: 0,
                type: uType.type,
                unitName: uType.name,
                isCavalry: uType.isCavalry,
                headwear: hat,
                frame: Math.random() * 100,
                dir: Math.random() > 0.5 ? 1 : -1,
                factionColor: fColor,
                isAttacking: false,
                state: "idle",   // New State Machine
                stateTimer: 0
            });
        }

        function drawEpicUnit(ctx, unit) {
            ctx.save();
            ctx.translate(unit.x, unit.y);
            
            let dir = unit.dir;
            ctx.scale(dir, 1);
            let userDir = 1; 

            let isMoving = (unit.state === "walk");
            let bob = isMoving ? Math.sin(unit.frame * 0.4) * 2 : 0;
            let weaponBob = unit.isAttacking ? Math.sin(unit.frame * 0.8) * 4 : (isMoving ? bob : 0);
            
            let type = unit.type;
            let unitName = unit.unitName;
            let frame = unit.frame;
            let isAttacking = unit.isAttacking;

            // --- CAVALRY RENDERING ---
            if (unit.isCavalry) {
               // --- START OF YOUR HORSE CODE ---
        let legSwing = isMoving ? Math.sin(frame * 0.4) * 8 : 0;
        let bob = isMoving ? Math.sin(frame * 0.4) * 2 : 0;
        let riderBob = isMoving ? Math.sin(frame * 0.4 + 0.5) * 1.5 : 0;

        ctx.lineCap = "round"; ctx.lineJoin = "round";

        let mountColor = "#795548"; // Default Horse Brown

        // 1. BACK LEGS
        ctx.strokeStyle = "#3e2723"; 
        ctx.lineWidth = 1.8; 
        ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-6 - legSwing, 10);
        ctx.moveTo(3, 2); ctx.lineTo(1 - legSwing, 10); ctx.stroke();

        // 2. MOUNT BODY
        ctx.fillStyle = mountColor; ctx.strokeStyle = "#3e2723";
        ctx.beginPath(); 
        ctx.ellipse(0, bob, 11, 7, 0, 0, Math.PI * 2); 
        ctx.fill(); ctx.stroke();

        // 3. RIDER 
        ctx.save();
        ctx.translate(-1, -4 + bob + riderBob);
        
        ctx.fillStyle = unit.factionColor; ctx.strokeStyle = "#1a1a1a";
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(2, -9); ctx.lineTo(-2, -9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        // Head
        ctx.fillStyle = "#ffccbc";
        ctx.beginPath(); ctx.arc(0, -11, 3, 0, Math.PI * 2); ctx.fill();

        // --- ADDING THE HEADWEAR TO THE RIDER ---
        if (unit.headwear === "mongol_helmet") {
            ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#424242"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, -11, 4, Math.PI, 0); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#616161"; ctx.fillRect(-0.5, -16, 1, 3); // Spike
        }

        let weaponBob = isAttacking ? Math.sin(frame * 0.8) * 4 : 0;
        
        // --- WEAPON (Khatra Bow logic) ---
        if (unit.type === "horse_archer") {
            let pull = isAttacking ? (Math.sin(frame * 0.5) * 0.5 + 0.5) : 0;
            ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(2, -14); ctx.quadraticCurveTo(10, -10, 6, -6 + weaponBob);
            ctx.quadraticCurveTo(10, -2, 2, 2); ctx.stroke();
        }
        ctx.restore();
        // --- END OF YOUR HORSE CODE ---
            } 
            // --- INFANTRY RENDERING ---
            else {
                ctx.fillStyle = unit.factionColor;
                ctx.fillRect(-4, -10 + bob, 8, 10); // Torso
                ctx.fillStyle = "#ffccbc"; // Skin
                ctx.beginPath(); ctx.arc(0, -14 + bob, 4, 0, Math.PI*2); ctx.fill(); // Head
            }

            // --- HEADWEAR ---
            let headYOffset = unit.isCavalry ? 3 : 0; // Adjust hat height if on horseback
            if (unit.headwear === "rice_hat") {
                ctx.fillStyle = "#d4b886"; ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-7, -15 + bob + headYOffset);
                ctx.lineTo(7, -15 + bob + headYOffset);
                ctx.lineTo(0, -21 + bob + headYOffset);
                ctx.closePath(); ctx.fill(); ctx.stroke();
            } else if (unit.headwear === "mongol_helmet") {
                ctx.fillStyle = "#9e9e9e"; ctx.strokeStyle = "#424242"; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(0, -14 + bob + headYOffset, 4.5, Math.PI, 0); ctx.fill(); ctx.stroke(); // Dome
                ctx.fillStyle = "#616161";
                ctx.beginPath(); ctx.moveTo(-1.5, -18.5 + bob + headYOffset); ctx.lineTo(1.5, -18.5 + bob + headYOffset); ctx.lineTo(0, -23 + bob + headYOffset); ctx.fill(); // Spike
                // Flaps
                ctx.fillStyle = "#4e342e";
                ctx.fillRect(-5, -14 + bob + headYOffset, 3, 5);
                ctx.fillRect(2, -14 + bob + headYOffset, 3, 5);
            }

            // --- WEAPONS ---
            if (type === "peasant") {
                let tipX = (12 + weaponBob) * userDir;
                let tipY = -12 + weaponBob;
                ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(-2 * userDir, -4); ctx.lineTo(tipX, tipY); ctx.stroke();
            } 
            else if (type === "spearman" || unitName.includes("Firelance")) {
                if (unitName.includes("Firelance")) {
                    ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(21 + weaponBob, -8); ctx.stroke();
                    ctx.fillStyle = "#212121"; ctx.fillRect(14 + weaponBob, -10, 7, 4);
                    ctx.fillStyle = "#9e9e9e"; ctx.beginPath();
                    ctx.moveTo(21 + weaponBob, -8); ctx.lineTo(24 + weaponBob, -10);
                    ctx.lineTo(29 + weaponBob, -8); ctx.lineTo(24 + weaponBob, -6);
                    ctx.closePath(); ctx.fill();
                    if (isAttacking) {
                        ctx.fillStyle = "#ff5722"; ctx.beginPath(); ctx.arc(22 + weaponBob, -8, 1.5 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = "rgba(200, 200, 200, 0.4)";
                        ctx.beginPath(); ctx.arc(24 + weaponBob, -10, 4 + Math.random()*6, 0, Math.PI * 2); ctx.fill();
                    }
                } else {
                    ctx.strokeStyle = "#4e342e"; ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.moveTo(-6 * userDir, 4); ctx.lineTo((28 + weaponBob) * userDir, -24 + weaponBob); ctx.stroke();
                }
            }
            else if (type === "gun") {
                ctx.strokeStyle = "#424242"; ctx.lineWidth = 3.5;
                ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(14 + weaponBob, -8); ctx.stroke();
                if (isAttacking) { 
                    ctx.fillStyle = "#ff5722"; ctx.beginPath(); ctx.arc(16 + weaponBob, -9, 2 + Math.random()*2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = "rgba(180, 180, 180, 0.5)"; 
                    ctx.beginPath(); ctx.arc(20 + weaponBob, -11, 6 + Math.random()*6, 0, Math.PI * 2); ctx.fill();
                }
            }
            else if (type === "crossbow") { 
                if (unitName === "Repeater Crossbowman") {
                    ctx.save();
                    let shakeX = isAttacking ? Math.sin(Date.now() / 30) * 1.5 : 0;
                    let shakeY = isAttacking ? Math.cos(Date.now() / 30) * 1.2 : 0;
                    ctx.translate(shakeX, shakeY);
                    ctx.fillStyle = "#3e2723"; ctx.fillRect(-3, -12 + bob, 6, 6); 
                    ctx.fillStyle = "#4e342e"; ctx.fillRect(3, -11 + bob, 18, 3); 
                    ctx.save();
                    ctx.translate(5, -17 + bob); 
                    ctx.fillStyle = "#5d4037"; ctx.fillRect(0, 0, 14, 6); 
                    ctx.strokeStyle = "#2b1b17"; ctx.lineWidth = 0.8; ctx.strokeRect(0, 0, 14, 6);
                    ctx.restore();
                    ctx.fillStyle = "#212121"; ctx.fillRect(21, -11 + bob, 2, 3); 
                    ctx.restore();
                }
                else if (unitName === "Poison Crossbowman") {
                    ctx.fillStyle = "#5d4037"; ctx.fillRect(0, -10, 12, 3); 
                    ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(10, -8.5, 6.5, -Math.PI/2, Math.PI/2); ctx.stroke();
                    ctx.strokeStyle = "rgba(200, 255, 200, 0.4)"; ctx.lineWidth = 0.5;
                    ctx.beginPath(); ctx.moveTo(10, -15); ctx.lineTo(10, -2); ctx.stroke();
                }
            }
            else if (type === "horse_archer") {
                let time = isAttacking ? Date.now() / 150 : 0; 
                let pull = isAttacking ? (Math.sin(time) * 0.5 + 0.5) : 0; 
                let khatra = isAttacking ? ((1 - pull) * 0.4) : 0; 
                let handX = 6 + weaponBob;
                let handY = -6; 

                ctx.save();
                ctx.translate(handX, handY);
                ctx.rotate(khatra); 
                ctx.translate(-handX, -handY);

                ctx.strokeStyle = "#3e2723"; ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(handX - 4, -14); 
                ctx.quadraticCurveTo(handX + 6, -10, handX, handY); 
                ctx.quadraticCurveTo(handX + 6, -2, handX - 4, 2); 
                ctx.stroke();

                ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(handX - 4, -14); 
                let stringX = (handX - 4) - (pull * 8); 
                ctx.lineTo(stringX, handY); 
                ctx.lineTo(handX - 4, 2); 
                ctx.stroke();
                ctx.restore();
            }
            else if (unitName === "Bomb" || type === "Bomb") {
                ctx.save();
                if (isAttacking) ctx.rotate(Math.PI / 4); 
                else ctx.rotate(-Math.PI / 10); 
                ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
                ctx.fillStyle = "#424242"; ctx.beginPath(); ctx.arc(3, -14, 4, 0, Math.PI * 2); ctx.fill();
                if(isAttacking) { ctx.fillStyle = "#ff9800"; ctx.beginPath(); ctx.arc(3, -16, 2, 0, Math.PI * 2); ctx.fill(); }
                ctx.restore();
            }
            else if (unitName === "Rocket" || type === "Rocket") {
                ctx.save();
                ctx.translate(4 * userDir, -6);
                ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 2;
                for(let i=-1; i<=1; i++) { 
                    ctx.beginPath(); ctx.moveTo(-8 * userDir, i*2); ctx.lineTo(10 * userDir + weaponBob, -4 + i*2); ctx.stroke();
                }
                ctx.fillStyle = "#424242"; ctx.fillRect(-10 * userDir, -3, 4 * userDir, 6); 
                if (isAttacking) {
                    ctx.fillStyle = "rgba(180, 180, 180, 0.6)";
                    for(let j=0; j<4; j++) {
                        ctx.beginPath(); ctx.arc(-14 * userDir - (j*6), 2 + (Math.random()*6-3), 4+j, 0, Math.PI*2); ctx.fill();
                    }
                }
                ctx.strokeStyle = "#ff9800"; ctx.lineWidth = 1; 
                ctx.beginPath(); ctx.moveTo(-10 * userDir, 0); ctx.lineTo(-14 * userDir, 4); ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
        }

        function animateMenu() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (Math.random() < 0.2) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height + 10,
                    s: Math.random() * 3 + 1,
                    a: Math.random() * 0.5 + 0.1
                });
            }
            
            ctx.fillStyle = "#ff5722";
            for(let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i];
                p.y -= p.s;
                p.x += Math.sin(p.y / 20) * 2;
                ctx.globalAlpha = p.a;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill();
                if (p.y < -10) particles.splice(i, 1);
            }
            ctx.globalAlpha = 1.0;

            backgroundUnits.sort((a, b) => a.y - b.y);

            backgroundUnits.forEach(unit => {
                unit.frame += 1;

                // --- STATE MACHINE "AI" FOR MORE ACTIVITY ---
                if (unit.stateTimer <= 0) {
                    let roll = Math.random();
                    if (roll < 0.3) {
                        unit.state = "idle";
                        unit.vx = 0; unit.vy = 0;
                        unit.isAttacking = false;
                        unit.stateTimer = 40 + Math.random() * 60;
                    } else if (roll < 0.6) {
                        unit.state = "attack";
                        unit.vx = 0; unit.vy = 0;
                        unit.isAttacking = true;
                        unit.dir = Math.random() > 0.5 ? 1 : -1; // Snap to face an "enemy"
                        unit.stateTimer = 60 + Math.random() * 60;
                    } else {
                        unit.state = "walk";
                        // Cavalry move faster
                        let speedMult = unit.isCavalry ? 3 : 1.5; 
                        unit.vx = (Math.random() - 0.5) * speedMult;
                        unit.vy = (Math.random() - 0.5) * (speedMult / 2);
                        unit.dir = unit.vx > 0 ? 1 : -1;
                        unit.isAttacking = false;
                        unit.stateTimer = 100 + Math.random() * 100;
                    }
                }
                unit.stateTimer--;

                unit.x += unit.vx;
                unit.y += unit.vy;

                // Screen wrapping
                if (unit.x > canvas.width + 20) unit.x = -20;
                if (unit.x < -20) unit.x = canvas.width + 20;
                if (unit.y > canvas.height + 20) unit.y = -20;
                if (unit.y < -20) unit.y = canvas.height + 20;

                ctx.save();
                ctx.translate(unit.x, unit.y);
                ctx.scale(2.5, 2.5); 
                drawEpicUnit(ctx, { ...unit, x: 0, y: 0 });
                ctx.restore();
            });

            menuAnimFrameId = requestAnimationFrame(animateMenu);
        }

        animateMenu();
    };


})();
