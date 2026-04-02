// ============================================================================
// EMPIRE OF THE 13TH CENTURY - CUSTOM BATTLE SYSTEM (ROME 2 STYLE UI)
// ============================================================================

(function () {
 
    // --- STATE MANAGEMENT ---
    let customBattleActive = false;
    let customFunds = 1000;
    
    let playerSetup = { faction: "Hong Dynasty", color: "#d32f2f", roster: [], cost: 0 };
    let enemySetup = { faction: "Great Khaganate", color: "#1976d2", roster: [], cost: 0 };
    
    let selectedMap = "Plains";
    let originalLeaveBattlefield = null; 
    let preBattleStats = {}; // For the post-battle report

  const MAP_TYPES = [
        "Plains", "Forest", "Dense Forest", "Steppe", 
        "Desert", "Highlands", "Large Mountains"
    ];

    // ============================================================================
    // --- FACTION ROSTER RULES (EASY TO EDIT) ---
    // Add factions here to restrict what they can recruit. 
    // If a faction is NOT on this list, they can recruit EVERYTHING.
    // Use 'bannedRoles' to ban whole classes (like all Cavalry), 
    // and 'bannedUnits' to ban specific units by name.
    // ============================================================================
// ============================================================================
    // --- FACTION ROSTER RULES ---
    // Uses the "Literal Names" from troop_system.js for 100% reliability.
    // ============================================================================
const FactionUnitRules = {
        
"Tran Realm": {
    bannedRoles: [], // Clear this to allow roles like Cavalry (which Elephants use)
    bannedUnits: [
        "Horse Archer", "Heavy Horse Archer", "Lancer", "Heavy Lancer", 
        "Elite Lancer", "Keshig", "Camel Cannon", "Hand Cannoneer", "Rocket","Heavy Crossbowman", "Repeater Crossbowman"
    ] // Manually exclude all "Horse-like" names and specific tech
},

"Dab Tribes": {
    bannedRoles: [], // Clear this to allow elephants
    bannedUnits: [
        "Horse Archer", "Heavy Horse Archer", "Lancer", "Heavy Lancer", 
        "Elite Lancer", "Keshig", "Camel Cannon", "Slinger", "Hand Cannoneer", "Rocket","Heavy Crossbowman", "Repeater Crossbowman"
    ] 
},
        "Great Khaganate": {
            // "Only Cavalry and Militia"
            // We ban every role that ISN'T cavalry, horse_archer, or basic infantry.
            bannedRoles: [
                 "pike", "two_handed", "crossbow", 
                "archer", "throwing", "bomb", 
                "Rocket", "Repeater Crossbowman"
            ],
            // Then we ban all "Infantry" role units EXCEPT the "Militia"
            bannedUnits: ["Glaiveman", "War Elephant", "Shielded Infantry","Slinger"] 
        },

        "Yamato Clans": {
            // No gunpowder, no crossbows, no elephants.
            bannedRoles: ["gunner", "mounted_gunner", "firelance", "Rocket", "crossbow"],
            bannedUnits: ["War Elephant", "Poison Crossbowman", "Repeater Crossbowman", "Camel Cannon", "Keshig","Slinger","Elite Lancer","Shielded Infantry", "Javelinier"]
        },

        "Xiaran Dominion": {
              bannedRoles: [], 
            bannedUnits: ["War Elephant", "Keshig","Slinger","Javelinier", "Poison Crossbowman","Elite Lancer", "Repeater Crossbowman"]
        },

        "Hong Dynasty": {
            bannedRoles: [], 
            // Banned Xia's unique tech and the nomad elites
            bannedUnits: ["War Elephant", "Keshig", "Camel Cannon","Slinger","Javelinier", "Poison Crossbowman","Elite Lancer", "Hand Cannoneer"] 
        },

        "Jinlord Confederacy": {
            bannedRoles: ["Rocket", "bomb"], 
            bannedUnits: ["War Elephant", "Camel Cannon", "Keshig","Slinger","Javelinier", "Poison Crossbowman", "Repeater Crossbowman"]
        },

        "Goryun Kingdom": {
            bannedRoles: ["mounted_gunner", "gunner"],
            bannedUnits: ["War Elephant", "Camel Cannon", "Hand Cannoneer", "Keshig","Slinger","Javelinier", "Poison Crossbowman","Elite Lancer"]
        },

        "High Plateau Kingdoms": {
            bannedRoles: ["gunner", "mounted_gunner", "Rocket", "bomb", "firelance"],
            bannedUnits: ["War Elephant", "Camel Cannon", "Hand Cannoneer", "Heavy Lancer", "Elite Lancer", "Keshig", "Poison Crossbowman", "Repeater Crossbowman"]
        }
    };

    // --- NEW FUNCTION: Filters and Sorts units based on the rules above ---
    function getAvailableUnitsForFaction(factionName) {
        let available = [];
        const rules = FactionUnitRules[factionName] || { bannedRoles: [], bannedUnits: [] };
        const bannedRoles = rules.bannedRoles || [];
        const bannedUnits = rules.bannedUnits || [];

        // Check if ROLES is defined, otherwise use standard string fallbacks
        const roleCav = typeof ROLES !== 'undefined' ? ROLES.CAVALRY : "Cavalry";
        const roleHorseArch = typeof ROLES !== 'undefined' ? ROLES.HORSE_ARCHER : "Horse Archer";
        const roleMountedGun = typeof ROLES !== 'undefined' ? ROLES.MOUNTED_GUNNER : "Mounted Gunner";

        for (let unitKey in UnitRoster.allUnits) {
            // Never put commanders in the standard catalog
            if (["Commander", "General", "Mounted General"].includes(unitKey)) continue;

            let template = UnitRoster.allUnits[unitKey];
            let role = template.role;

            // 1. Check if unit is specifically banned
            if (bannedUnits.includes(unitKey)) continue;

            // 2. Check if the unit's role is banned
            // Note: Ensuring robust string matching just in case the engine uses constant objects
            if (bannedRoles.includes(role)) continue; 

            // (Optional) Catch-all for hardcoded string bans vs constant bans
            if (bannedRoles.includes("Cavalry") && role === roleCav) continue;
            if (bannedRoles.includes("Horse Archer") && role === roleHorseArch) continue;
            if (bannedRoles.includes("Mounted Gunner") && role === roleMountedGun) continue;

            available.push(unitKey);
        }

        // Return the list sorted alphabetically so it looks neat
        return available.sort();
    }
	

    // Dummy unit object to prevent render crashes in infscript/cavscript
    const dummyUnit = { id: 1, stats: { ammo: 10 }, ammo: 10, state: "idle" };

    // --- MAIN ENTRY POINT ---
    window.showCustomBattleMenu = function (reportData = null) {
        if (customBattleActive && !reportData) return;
        customBattleActive = true;

        // Ensure global game is paused
        window.isPaused = true;
        if (typeof closeParleUI === 'function') closeParleUI();

        // Cleanup existing menu if re-opening
        const existing = document.getElementById("cb-menu-container");
        if (existing) existing.remove();

        // 1. MAIN CONTAINER (The Rome II Vibe)
        const container = document.createElement("div");
        container.id = "cb-menu-container";
        container.style.position = "fixed";
        container.style.top = "0"; container.style.left = "0";
        container.style.width = "100%"; container.style.height = "100%";
        container.style.background = "#1a1a1a"; // Fallback to dark grey
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.zIndex = "11000";
        container.style.fontFamily = "Georgia, serif";
        container.style.color = "#e0e0e0";

        // 2. HEADER (Settings & Funds)
        const header = document.createElement("div");
        header.style.height = "80px";
        header.style.background = "linear-gradient(to bottom, #2b2b2b, #111)";
        header.style.borderBottom = "2px solid #d4b886";
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.style.padding = "0 30px";
        header.style.boxShadow = "0 4px 15px rgba(0,0,0,0.8)";

        const titleBox = document.createElement("div");
        titleBox.innerHTML = `<h1 style="margin: 0; color: #f5d76e; letter-spacing: 3px; font-size: 24px;">CUSTOM BATTLE</h1>`;
        
        const settingsBox = document.createElement("div");
        settingsBox.style.display = "flex";
        settingsBox.style.gap = "20px";
        settingsBox.style.alignItems = "center";
        settingsBox.innerHTML = `
            <div>
                <label style="color: #a1887f; font-size: 12px; text-transform: uppercase;">Map</label><br>
                <select id="cb-map-select" style="background: #3e2723; color: #fff; border: 1px solid #d4b886; padding: 5px; font-family: Georgia;">
                    ${MAP_TYPES.map(m => `<option value="${m}" ${m === selectedMap ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
            </div>
            <div>
                <label style="color: #a1887f; font-size: 12px; text-transform: uppercase;">Funds</label><br>
                <input id="cb-funds-input" type="number" value="${customFunds}" step="1000" style="background: #3e2723; color: #f5d76e; border: 1px solid #d4b886; padding: 5px; width: 100px; font-family: Georgia; text-align: right;">
            </div>
            <div style="margin-left: 15px; text-align: center;">
                <label style="color: #a1887f; font-size: 12px; text-transform: uppercase;">Game Mode</label><br>
                <div style="color: #ff9800; font-size: 14px; font-weight: bold; margin-top: 4px; text-shadow: 1px 1px 2px #000;">
                    Regicide (Commander Death)
                </div>
            </div>
        `;

        const actionBox = document.createElement("div");
        const backBtn = createCBBtn("Main Menu", () => exitCustomBattleMenu());
        const randomBtn = createCBBtn("🎲 Random Battle", () => launchRandomBattle());
        randomBtn.style.background = "linear-gradient(to bottom, #1565c0, #0d47a1)"; // Blue tint to distinguish it
        const startBtn = createCBBtn("Start Battle", () => launchCustomBattle());
        startBtn.style.background = "linear-gradient(to bottom, #b71c1c, #7b1a1a)";
        
        actionBox.appendChild(backBtn);
        actionBox.appendChild(randomBtn);
        actionBox.appendChild(startBtn);

        header.appendChild(titleBox);
        header.appendChild(settingsBox);
        header.appendChild(actionBox);

        // 3. ARMIES SPLIT SCREEN
        const body = document.createElement("div");
        body.style.display = "flex";
        body.style.flex = "1";
        body.style.overflow = "hidden";

        // Left: Player | Right: Enemy
        const playerPanel = createArmyPanel("ATTACKER (YOU)", playerSetup, "player");
        const enemyPanel = createArmyPanel("DEFENDER (AI)", enemySetup, "enemy");

        playerPanel.style.borderRight = "2px solid #000";

        body.appendChild(playerPanel);
        body.appendChild(enemyPanel);

        container.appendChild(header);
        container.appendChild(body);
        document.body.appendChild(container);

        // Event Listeners
        document.getElementById("cb-funds-input").addEventListener("change", (e) => {
            customFunds = parseInt(e.target.value) || 10000;
            updateUI();
        });
        document.getElementById("cb-map-select").addEventListener("change", (e) => {
            selectedMap = e.target.value;
        });

        updateUI();

        // 4. POST BATTLE REPORT OVERLAY
        if (reportData) {
            showReportModal(container, reportData);
        }
    };

    // --- PANEL CREATION ---
   // --- PANEL CREATION (Updated with Clear All Button) ---
   function createArmyPanel(title, setupObj, side) {
    const panel = document.createElement("div");
    panel.style.flex = "1";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.background = "rgba(20, 20, 20, 0.8)";
    
    // Header setup
    const pHeader = document.createElement("div");
    pHeader.style.padding = "10px";
    pHeader.style.background = "rgba(0,0,0,0.5)";
    pHeader.style.textAlign = "center";
    pHeader.innerHTML = `
        <div style="font-size: 14px; color: #a1887f; letter-spacing: 2px;">${title}</div>
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px; align-items: center;">
<select id="cb-faction-${side}" style="background: #3e2723; color: #fff; border: 1px solid #d4b886; padding: 5px;">
    ${Object.keys(typeof FACTIONS !== 'undefined' ? FACTIONS : {"Generic":{color:"#fff"}})
        .filter(f => f !== "Bandits" && f !== "Player's Kingdom") // Filter out these two
        .map(f => 
            `<option value="${f}" ${f === setupObj.faction ? 'selected' : ''}>${f}</option>`
        ).join('')}
</select>
            <div style="font-size: 16px; color: #f5d76e;">Funds Left: <span id="cb-funds-left-${side}">${customFunds - setupObj.cost}</span></div>
        </div>
    `;

// Catalog Grid (Available Units)
    const catalog = document.createElement("div");
    catalog.style.flex = "2";
    catalog.style.overflowY = "auto";
    catalog.style.padding = "15px";
    catalog.style.display = "grid";
    catalog.style.gridTemplateColumns = "repeat(auto-fill, minmax(70px, 1fr))";
    catalog.style.gap = "10px";
    catalog.style.borderBottom = "2px solid #d4b886";
    
    // --- NEW: Snap cards to the top-left to prevent gaps from banned units ---
    catalog.style.alignContent = "start";   
    catalog.style.justifyContent = "start";
    
    // Tray for selected units
    const trayContainer = document.createElement("div");
    trayContainer.style.flex = "1";
    trayContainer.style.background = "rgba(0,0,0,0.8)";
    trayContainer.style.padding = "10px";
    
    const trayHeader = document.createElement("div");
    trayHeader.style.display = "flex";
    trayHeader.style.justifyContent = "space-between";
    trayHeader.style.alignItems = "center";
    trayHeader.style.marginBottom = "10px";

    const trayTitle = document.createElement("div");
    trayTitle.innerText = "SELECTED ROSTER (Max 100)";
    trayTitle.style.color = "#a1887f";
    trayTitle.style.fontSize = "12px";

    // --- FAT CLEAR BUTTON ---
    const clearBtn = document.createElement("button");
    clearBtn.innerText = "✖ REMOVE ALL";
    clearBtn.style.background = "rgba(244, 67, 54, 0.4)";
    clearBtn.style.color = "#fff";
    clearBtn.style.border = "2px solid #f44336";
    clearBtn.style.fontSize = "14px";
    clearBtn.style.padding = "10px 20px";
    clearBtn.style.fontWeight = "bold";
    clearBtn.style.cursor = "pointer";
    clearBtn.style.fontFamily = "Georgia, serif";
    clearBtn.style.position = "relative";
    clearBtn.style.zIndex = "9999";
    clearBtn.style.pointerEvents = "auto";
	
const tray = document.createElement("div");
    tray.id = `cb-tray-${side}`;
    tray.style.display = "flex";
    tray.style.flexWrap = "wrap";
    tray.style.gap = "5px";
    tray.style.overflowY = "auto";
    tray.style.maxHeight = "calc(100% - 25px)";
    
    // --- NEW: Snap selected roster rows to the top-left ---
    tray.style.alignContent = "flex-start";

	tray.style.maxHeight = "calc(100% - 25px)";

    // --- INTERNAL LOGIC FUNCTIONS ---
    // These must be INSIDE createArmyPanel to see 'catalog', 'side', and 'setupObj'

    const updateUI = () => {
        // Update Funds Display
        const fundsLabel = document.getElementById(`cb-funds-left-${side}`);
        if (fundsLabel) fundsLabel.innerText = customFunds - setupObj.cost;

        // Clear and rebuild the Tray
        tray.innerHTML = "";
        setupObj.roster.forEach((unitKey, index) => {
            // side, index helps the card know which unit to remove if clicked
            const card = createUnitCard(unitKey, setupObj.color, false, side, index);
            tray.appendChild(card);
        });
    };

    const refreshCatalog = () => {
        catalog.innerHTML = ""; 
        let allowedUnits = getAvailableUnitsForFaction(setupObj.faction);
        
        allowedUnits.forEach(unitKey => {
            // 'true' tells the card it is for the catalog (click to add)
            const card = createUnitCard(unitKey, setupObj.color, true, side);
            catalog.appendChild(card);
        });
    };

    // Button Events
    clearBtn.onmousedown = (e) => {
        e.stopPropagation();
        setupObj.roster = [];
        setupObj.cost = 0;
        updateUI();
        console.log("Roster Cleared!");
    };
    clearBtn.onmouseenter = () => clearBtn.style.background = "rgba(244, 67, 54, 0.8)";
    clearBtn.onmouseleave = () => clearBtn.style.background = "rgba(244, 67, 54, 0.4)";

    // Final Assembly
    trayHeader.appendChild(trayTitle);
    trayHeader.appendChild(clearBtn);
    trayContainer.appendChild(trayHeader);
    trayContainer.appendChild(tray);

    panel.appendChild(pHeader);
    panel.appendChild(catalog);
    panel.appendChild(trayContainer);

    // Initialization and Faction Change Listener
    setTimeout(() => {
        const factionSelect = document.getElementById(`cb-faction-${side}`);
        if (factionSelect) {
            factionSelect.addEventListener("change", (e) => {
                setupObj.faction = e.target.value;
                if (typeof FACTIONS !== 'undefined' && FACTIONS[setupObj.faction]) {
                    setupObj.color = FACTIONS[setupObj.faction].color;
                }
                setupObj.roster = [];
                setupObj.cost = 0;
                
                updateUI();
                refreshCatalog();
            });
        }
        refreshCatalog(); 
        updateUI();
    }, 0);

    return panel;
}

    // --- UNIT CARD GENERATOR (Dynamic Canvas Render) ---
    function createUnitCard(unitKey, color, isCatalog, side) {
        const template = UnitRoster.allUnits[unitKey];
        const cost = template.cost || 50;

        const card = document.createElement("div");
        card.style.width = "70px";
        card.style.height = "100px";
        card.style.background = "linear-gradient(to bottom, #d4b886, #8d6e63)";
        card.style.border = "1px solid #3e2723";
        card.style.borderRadius = "4px";
        card.style.cursor = "pointer";
        card.style.position = "relative";
        card.style.boxShadow = "2px 2px 5px rgba(0,0,0,0.5)";
        card.style.transition = "transform 0.1s";

        card.onmouseenter = () => card.style.transform = "scale(1.05)";
        card.onmouseleave = () => card.style.transform = "scale(1)";

        // Live Render Canvas
        const canvas = document.createElement("canvas");
        canvas.width = 70; canvas.height = 70;
        canvas.style.position = "absolute";
        canvas.style.top = "0"; canvas.style.left = "0";
        
        const ctx = canvas.getContext("2d");
        ctx.translate(35, 55); // Center unit in card

        // Map role to visual type
        let visType = "peasant";
        const role = template.role;
        if (role === ROLES.CAVALRY || role === ROLES.MOUNTED_GUNNER) {
            visType = unitKey === "War Elephant" ? "elephant" : (unitKey.includes("Camel") ? "camel" : "cavalry");
        } else if (role === ROLES.HORSE_ARCHER) visType = "horse_archer";
        else if (role === ROLES.PIKE || unitKey.includes("Glaive")) visType = "spearman";
        else if (role === ROLES.SHIELD) visType = "sword_shield";
        else if (role === ROLES.TWO_HANDED) visType = "two_handed";
        else if (role === ROLES.CROSSBOW) visType = "crossbow";
        else if (role === ROLES.FIRELANCE) visType = "firelance";
        else if (role === ROLES.ARCHER) visType = "archer";
        else if (role === ROLES.THROWING) visType = "throwing";
        else if (role === ROLES.GUNNER) visType = "gun";
        else if (role === ROLES.BOMB) visType = "bomb";
        else if (role === ROLES.ROCKET) visType = "rocket";

        // Draw it statically (Frame 10, not moving)
        if (["cavalry", "elephant", "camel", "horse_archer"].includes(visType)) {
            drawCavalryUnit(ctx, 0, 0, false, 10, color, false, visType, side, unitKey, false, 0, 10, dummyUnit, 0);
        } else {
            drawInfantryUnit(ctx, 0, 0, false, 10, color, visType, false, side, unitKey, false, 0, 10, dummyUnit, 0);
        }

        // Labels
        const nameLabel = document.createElement("div");
        nameLabel.innerText = unitKey;
        nameLabel.style.position = "absolute";
        nameLabel.style.bottom = "12px"; nameLabel.style.width = "100%";
        nameLabel.style.textAlign = "center"; nameLabel.style.fontSize = "9px";
        nameLabel.style.fontWeight = "bold"; nameLabel.style.color = "#111";
        nameLabel.style.background = "rgba(255,255,255,0.7)";

        const costLabel = document.createElement("div");
        costLabel.innerText = `🪙 ${cost}`;
        costLabel.style.position = "absolute";
        costLabel.style.bottom = "0"; costLabel.style.width = "100%";
        costLabel.style.textAlign = "center"; costLabel.style.fontSize = "10px";
        costLabel.style.background = "#2b2b2b"; costLabel.style.color = "#f5d76e";

        card.appendChild(canvas);
        card.appendChild(nameLabel);
        card.appendChild(costLabel);

// Click logic
        card.onclick = () => {
            let setup = side === "player" ? playerSetup : enemySetup;
            if (isCatalog) {
                if (setup.cost + cost > customFunds) return; // Ignore if it exceeds funds
                if (setup.roster.length >= 100) return; // Engine soft limit
                
                setup.roster.push(unitKey);
                setup.cost += cost;

                // --- NEW HOOK: Auto-sort the array alphabetically every time a unit is added ---
                setup.roster.sort(); 
                
            } else {
                // Remove from tray
                const idx = setup.roster.indexOf(unitKey);
                if (idx > -1) {
                    setup.roster.splice(idx, 1);
                    setup.cost -= cost;
                }
            }
            updateUI();
        };
        return card;
    }

    // --- SYNCHRONIZE UI STATE ---
    function updateUI() {
        ["player", "enemy"].forEach(side => {
            const setup = side === "player" ? playerSetup : enemySetup;
            
            // Update funds text
            const fundsEl = document.getElementById(`cb-funds-left-${side}`);
            if (fundsEl) {
                fundsEl.innerText = customFunds - setup.cost;
                fundsEl.style.color = (customFunds - setup.cost) < 0 ? "#f44336" : "#f5d76e";
            }

            // Update faction dropdown
            const factionEl = document.getElementById(`cb-faction-${side}`);
            if (factionEl) {
                factionEl.value = setup.faction;
            }

            // Update map dropdown
            const mapEl = document.getElementById(`cb-map-select`);
            if (mapEl) {
                mapEl.value = selectedMap;
            }

            // Update Tray
            const tray = document.getElementById(`cb-tray-${side}`);
            if (tray) {
                tray.innerHTML = "";
                setup.roster.forEach(unitKey => {
                    tray.appendChild(createUnitCard(unitKey, setup.color, false, side));
                });
            }
        });
    }

    // --- RANDOM BATTLE GENERATOR ---
    function launchRandomBattle() {
        // Set funds to 1000
        customFunds = 1000;
        const fundsInput = document.getElementById("cb-funds-input");
        if (fundsInput) fundsInput.value = customFunds;

        // Pick Random Map
        selectedMap = MAP_TYPES[Math.floor(Math.random() * MAP_TYPES.length)];

        // Helper to randomly fill an army
        const factionNames = typeof FACTIONS !== 'undefined' ? Object.keys(FACTIONS) : ["Generic"];
        
        // Safety check to ensure UnitRoster exists before filtering
        if (typeof UnitRoster === 'undefined' || !UnitRoster.allUnits) {
            console.error("UnitRoster not found!");
            return;
        }
        const validUnits = Object.keys(UnitRoster.allUnits).filter(k => k !== "Commander");

        function populateRandomArmy(setupObj) {
            setupObj.faction = factionNames[Math.floor(Math.random() * factionNames.length)];
            setupObj.color = (typeof FACTIONS !== 'undefined' && FACTIONS[setupObj.faction]) ? FACTIONS[setupObj.faction].color : "#ffffff";
            setupObj.roster = [];
            setupObj.cost = 0;

            let attempts = 0;
            // Target ~1000 funds with max 100 units
            while (setupObj.cost < customFunds && setupObj.roster.length < 100 && attempts < 50) {
                let randomUnit = validUnits[Math.floor(Math.random() * validUnits.length)];
                let cost = UnitRoster.allUnits[randomUnit].cost || 50;

                if (setupObj.cost + cost <= customFunds) {
                    setupObj.roster.push(randomUnit);
                    setupObj.cost += cost;
                    attempts = 0; // Reset consecutive failures
                } else {
                    attempts++;
                }
            }
        }

        populateRandomArmy(playerSetup);
        populateRandomArmy(enemySetup);

        updateUI();

        // Launch instantly after building the random armies
        launchCustomBattle();
    }

    // --- REGICIDE WIN/LOSS MONITOR (SEPARATE FUNCTION) ---
    function startRegicideMonitor() {
        // Ensure any previous monitors are cleared before starting a new one
        if (window.cbRegicideMonitor) {
            clearInterval(window.cbRegicideMonitor);
        }

        window.cbRegicideMonitor = setInterval(() => {
            // Stop checking if battle ends or game mode is interrupted
            if (!inBattleMode) {
                clearInterval(window.cbRegicideMonitor);
                return;
            }

            // Check if player commander is dead
            let pCmdr = battleEnvironment.units.find(u => u.isCommander && u.isPlayer);
            let pIsDead = (pCmdr && pCmdr.hp <= 0) || (typeof player !== 'undefined' && player.hp <= 0);

            // Check if enemy commander is dead
            let eCmdr = battleEnvironment.units.find(u => u.isCommander && !u.isPlayer);
            let eIsDead = (eCmdr && eCmdr.hp <= 0);

            // Trigger battle exit if a commander has fallen
            if (pIsDead || eIsDead) {
                clearInterval(window.cbRegicideMonitor);
                if (typeof window.leaveBattlefield === 'function') {
                    window.leaveBattlefield();
                }
            }
        }, 1000); // Check once per second to reduce overhead
    }

    // --- LAUNCH BATTLE ENGINE ---
    function launchCustomBattle() {
        // 🔴 SURGERY 1: Clear the slate
        battleEnvironment.units = [];
        battleEnvironment.projectiles = [];
        unitIdCounter = 0; 

        // 🔴 SURGERY 2: Generate the Map Canvas (Crucial for the Draw loop)
        // This creates the bgCanvas that the draw() function is looking for
        if (typeof generateBattlefield === 'function') {
            generateBattlefield(selectedMap || "Plains");
        }
        
        // Battle zoom
        zoom = 0.1;

        // Validation
        if (playerSetup.roster.length === 0 || enemySetup.roster.length === 0) {
            alert("Both sides must have at least 1 unit!");
            return;
        }
        if (playerSetup.cost > customFunds || enemySetup.cost > customFunds) {
            alert("Funds exceeded! Please remove some units.");
            return;
        }

        // Start the render loop only once
        if (!window.__battleLoopStarted) {
            window.__battleLoopStarted = true;
            draw();
        }

        // UI cleanup
        const cbContainer = document.getElementById("cb-menu-container");
        if (cbContainer) cbContainer.remove();

        const mainMenu = document.getElementById("main-menu");
        if (mainMenu) mainMenu.style.display = "none";

        // 🔴 SURGICAL FIX: Hide the Overworld UI and Diplomacy button
        const overworldUI = document.getElementById("ui");
        if (overworldUI) overworldUI.style.display = "none";
        const dipContainer = document.getElementById("diplomacy-container");
        if (dipContainer) dipContainer.style.display = "none";

        customBattleActive = false;
        // Battle state
        inBattleMode = true;
        inCityMode = false;

        // 🔴 SURGERY 3: Force global state for renderer
        // If your draw() function relies on these being defined:
        if (typeof player !== 'undefined') {
            player.hp = 100; // Ensure player isn't "dead" or the battle ends immediately
        }
        
if (typeof window.player === "undefined" || !window.player) {
            window.player = { 
                x: BATTLE_WORLD_WIDTH / 2, 
                y: BATTLE_WORLD_HEIGHT - 100, 
                hp: 200, 
                maxHealth: 200, 
                baseSpeed: 15, // ---> ADDED THIS: Stops undefined speed crashes
                speed: 15,     // ---> ADDED THIS: Stops undefined speed crashes
                faction: playerSetup.faction,
                state: "idle",  // Prevents rendering animation crashes
                frame: 0,
                direction: 1,
                roster: playerSetup.roster
            };
        }

        // 🔴 SURGICAL FIX: The "Silent Culling" Bug.
        window.camera = {
            get x() { return typeof player !== 'undefined' ? player.x - (canvas.width / 2 / (typeof zoom !== 'undefined' ? zoom : 1)) : 0; },
            get y() { return typeof player !== 'undefined' ? player.y - (canvas.height / 2 / (typeof zoom !== 'undefined' ? zoom : 1)) : 0; },
            get width() { return canvas.width / (typeof zoom !== 'undefined' ? zoom : 1); },
            get height() { return canvas.height / (typeof zoom !== 'undefined' ? zoom : 1); }
        };
        // Hijack exit
        if (!originalLeaveBattlefield) originalLeaveBattlefield = window.leaveBattlefield;
        window.leaveBattlefield = handleCustomBattleExit;

        // Battlefield size
        BATTLE_WORLD_WIDTH = 2400;
        BATTLE_WORLD_HEIGHT = 1600;
        BATTLE_COLS = Math.floor(BATTLE_WORLD_WIDTH / BATTLE_TILE_SIZE);
        BATTLE_ROWS = Math.floor(BATTLE_WORLD_HEIGHT / BATTLE_TILE_SIZE);

        // Reset battle container
        if (typeof battleEnvironment === "undefined" || !battleEnvironment) {
            window.battleEnvironment = {};
        }
        battleEnvironment.units = [];
        battleEnvironment.projectiles = [];
        battleEnvironment.groundEffects = [];

        // Build battlefield
        if (typeof generateBattlefield === "function") {
            generateBattlefield(selectedMap);
            console.log("battle bgCanvas:", !!battleEnvironment.bgCanvas);
            console.log("battle grid:", !!battleEnvironment.grid, battleEnvironment.grid?.length);
            console.log("battle units:", battleEnvironment.units.length);
        }

        currentBattleData = {
            playerFaction: playerSetup.faction,
            enemyFaction: enemySetup.faction,
            playerColor: playerSetup.color,
            enemyColor: enemySetup.color,
            initialCounts: {
                player: playerSetup.roster.length + 1,
                enemy: enemySetup.roster.length + 1
            }
        };

        // Spawn armies
        customSpawnLoop(playerSetup.roster, "player", playerSetup.faction, playerSetup.color);
        customSpawnLoop(enemySetup.roster, "enemy", enemySetup.faction, enemySetup.color);

        // Use the player commander as the battle anchor
        const playerCommander = battleEnvironment.units.find(
            u => u.isCommander && u.side === "player"
        );

        if (playerCommander && typeof player !== "undefined") {
            player.x = playerCommander.x;
            player.y = playerCommander.y;
            player.hp = playerCommander.hp;
            player.maxHealth = playerCommander.maxHp || playerCommander.hp;
        }

        // Record initial stats
        preBattleStats = {
            playerTotalHP: battleEnvironment.units
                .filter(u => u.side === "player")
                .reduce((sum, u) => sum + (u.hp || 0), 0),
            enemyTotalHP: battleEnvironment.units
                .filter(u => u.side === "enemy")
                .reduce((sum, u) => sum + (u.hp || 0), 0),
            playerMen: currentBattleData.initialCounts.player,
            enemyMen: currentBattleData.initialCounts.enemy
        };

        // Canvas sizing
        const canvas = document.getElementById("gameCanvas");
        if (canvas) {
            canvas.style.display = "block";
            canvas.style.visibility = "visible";
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    

        // 🔴 SURGERY 1: Fix Camera Centering
        // Instead of snapping top-left to player, center the screen on the player
        if (playerCommander && typeof camera !== "undefined") {
            // Adjust for zoom and screen half-width/height
            camera.x = playerCommander.x - (window.innerWidth / 2 / (zoom || 1));
            camera.y = playerCommander.y - (window.innerHeight / 2 / (zoom || 1));
        }
    

        // 🔴 SURGERY 3: Fix the "Invisibility" Zoom
        // If triggerEpicZoom isn't working, force a visible zoom immediately
        if (typeof triggerEpicZoom !== 'function') {
            zoom = 0.8; // Set to a standard visible level
        } else {
            triggerEpicZoom(0.1, 0.8, 3000); // Start zoom-in effect
        }
        
        // Audio / cinematic
        if (typeof AudioManager !== "undefined") {
            AudioManager.playMP3("music/battlemusic.mp3", false);
            AudioManager.playSound("charge");
        }
        if (typeof triggerEpicZoom === "function") {
            triggerEpicZoom(0.1, 1.5, 3500);
        }

        // No resize reset here; it was overwriting the battle camera setup
        window.isPaused = false;
        console.log("Custom Battle Launched: Units Spawned =", battleEnvironment.units.length);

        // 👉 HOOK REGICIDE MODE
        startRegicideMonitor();
		console.log("Custom Battle Launched: Units Spawned =", battleEnvironment.units.length);
		
    }

    // --- CUSTOM SPAWNER FOR THIS UI (REWRITTEN: MIRRORED COMMANDER & FALLBACK ARMOR) ---
    function customSpawnLoop(rosterArray, side, faction, color) {
        let startY = side === 'player' ? BATTLE_WORLD_HEIGHT - 300 : 300;
        let centerX = BATTLE_WORLD_WIDTH / 2;
        let rankDir = side === 'player' ? 1 : -1;
        let spacingX = 22; 
        let spacingY = 18;

        let currentX = centerX - (10 * spacingX) / 2;
        let currentY = startY;
        let col = 0;

        // Group identical units together so formations look clean
        let sortedRoster = [...rosterArray].sort();

        sortedRoster.forEach(unitKey => {
            let template = UnitRoster.allUnits[unitKey] || UnitRoster.allUnits["Militia"];
            let unitStats = Object.assign(new Troop(template.name, template.role, template.isLarge, faction), template);
            
            unitStats.morale = 20;    
            unitStats.maxMorale = 20; 

            // Tactical offsets for unit roles
            let tacOffset = {x: 0, y: 0};
            if (typeof getTacticalPosition === 'function') {
                tacOffset = getTacticalPosition(template.role, side, unitKey) || {x: 0, y: 0};
            }

            let safeHP = unitStats.health || unitStats.hp || unitStats.maxHealth || template.health || 100;

            // Map visual render types
            let visType = "peasant";
            const role = template.role;
            if (role === (typeof ROLES !== 'undefined' ? ROLES.CAVALRY : "Cavalry") || role === (typeof ROLES !== 'undefined' ? ROLES.MOUNTED_GUNNER : "Mounted Gunner")) {
                visType = unitKey === "War Elephant" ? "elephant" : (unitKey.includes("Camel") ? "camel" : "cavalry");
            } else if (role === (typeof ROLES !== 'undefined' ? ROLES.HORSE_ARCHER : "Horse Archer")) visType = "horse_archer";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.PIKE : "Pikeman") || unitKey.includes("Glaive")) visType = "spearman";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.SHIELD : "Shield")) visType = "sword_shield";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.TWO_HANDED : "Two-Handed")) visType = "two_handed";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.CROSSBOW : "Crossbow")) visType = "crossbow";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.FIRELANCE : "Firelance")) visType = "firelance";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.ARCHER : "Archer")) visType = "archer";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.THROWING : "Throwing")) visType = "throwing";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.GUNNER : "Gunner")) visType = "gun";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.BOMB : "Bombardier")) visType = "bomb";
            else if (role === (typeof ROLES !== 'undefined' ? ROLES.ROCKET : "Rocket")) visType = "rocket";

            battleEnvironment.units.push({
                id: Math.floor(Math.random() * 999999), 
                side: side,
                faction: faction,
                color: color,
                unitType: unitKey,
                stats: unitStats,
                hp: safeHP,
                maxHp: safeHP, 
                ammo: unitStats.ammo || template.ammo || 0, 
                renderType: visType, 
                x: currentX + tacOffset.x + (Math.random() - 0.5) * 5,
                y: currentY + tacOffset.y + (Math.random() - 0.5) * 5,
                vx: 0, vy: 0,
                direction: rankDir, 
                anim: Math.floor(Math.random() * 100),
                frame: 0, 
                isMoving: false, 
                target: null,
                state: "idle",
                animOffset: Math.random() * 100,
                cooldown: 0,
                hasOrders: false
            });
            
            col++;
            currentX += spacingX;
            if (col >= 10) { 
                col = 0;
                currentX = centerX - (10 * spacingX) / 2;
                currentY += spacingY * rankDir;
            }
        });

// ========================================================================
        // COMMANDER SPAWN (USING NEW 'GENERAL' ROSTER UNIT)
        // ========================================================================
        let isPlayerSide = side === "player";
        let cmdrName = "General"; 
        
        // Pull the dedicated General stats you created in troop_system.js
        let baseGeneral = UnitRoster.allUnits[cmdrName] || {}; 
        let cmdrRole = baseGeneral.role || (typeof ROLES !== 'undefined' ? ROLES.HORSE_ARCHER : "horse_archer");
        
        // Create the unit stats based on the roster template
        let cmdrStats = Object.assign(new Troop(cmdrName, cmdrRole, true, faction), baseGeneral);
        
        // Dynamically pull the health and ammo values from the template
        let finalMaxHp = cmdrStats.health || 200;
        let finalAmmo = cmdrStats.ammo || 24;

        battleEnvironment.units.push({
            id: isPlayerSide ? 999999 : 888888 + Math.floor(Math.random() * 1000), 
            side: side,
            faction: faction,
            color: color,
            unitType: cmdrName, 
            isCommander: true,
            isPlayer: isPlayerSide, 
            stats: cmdrStats,
            hp: finalMaxHp,       // Pulls 200 directly from your General stats
            maxHp: finalMaxHp,    
            ammo: finalAmmo,      // Pulls 24 directly from your General stats
            renderType: "horse_archer", 
            x: centerX,
            y: startY - (80 * rankDir), 
            vx: 0,
            vy: 0,
            direction: rankDir, 
            anim: 0,
            frame: 0,
            isMoving: false,
            target: null,
            state: "idle",
            animOffset: Math.random() * 100,
            cooldown: 0,
            hasOrders: false
        });

        // Final global sync for player health so UI matches the General's HP
        if (isPlayerSide && typeof player !== 'undefined') {
            player.hp = finalMaxHp;
            player.maxHealth = finalMaxHp;
        }
    }
function handleCustomBattleExit() {
    if (window.cbRegicideMonitor) {
        clearInterval(window.cbRegicideMonitor);
        window.cbRegicideMonitor = null;
    }

    // --- TALLY RESULTS BEFORE CLEARING ANYTHING ---
    let pAlive = 0, pHP = 0;
    let eAlive = 0, eHP = 0;

    if (typeof battleEnvironment !== "undefined" && battleEnvironment?.units) {
        battleEnvironment.units.forEach(u => {
            if (u.hp > 0) {
                if (u.side === "player") { pAlive++; pHP += u.hp; }
                else { eAlive++; eHP += u.hp; }
            }
        });
    }

    let pLosses = preBattleStats.playerMen - pAlive;
    let eLosses = preBattleStats.enemyMen - eAlive;

    let pCmdr = battleEnvironment.units.find(u => u.isCommander && u.isPlayer);
    let eCmdr = battleEnvironment.units.find(u => u.isCommander && !u.isPlayer);

    let pCommanderDead = (pCmdr && pCmdr.hp <= 0) || (typeof player !== 'undefined' && player.hp <= 0);
    let eCommanderDead = (eCmdr && eCmdr.hp <= 0);

    let isVictory = eCommanderDead && !pCommanderDead;
    let isDefeat = pCommanderDead;

    let resultStr = "Results:";
    if (isDefeat) {
        resultStr = "Defeat! (Your Commander Fell)";
    } else if (isVictory) {
        resultStr = "Decisive Victory (Enemy Commander Slain)!";
    } else if (eAlive === 0) {
        resultStr = "Victory (Enemies Routed)!";
        isVictory = true;
    } else {
        resultStr = "Battle Ended / Draw";
    }

    let reportData = {
        resultStr,
        resultColor: isVictory ? "#4caf50" : (isDefeat ? "#f44336" : "#ff9800"),
        pMen: preBattleStats.playerMen, pAlive, pLosses,
        eMen: preBattleStats.enemyMen, eAlive, eLosses
    };

    // --- NOW CLEAN UP BATTLE STATE ---
    window.leaveBattlefield = originalLeaveBattlefield;
    originalLeaveBattlefield = null;

    inBattleMode = false;
    inCityMode = false;
    if (typeof inSiegeBattle !== "undefined") inSiegeBattle = false;
    if (typeof currentBattleData !== "undefined") currentBattleData = null;

    if (typeof battleEnvironment !== "undefined" && battleEnvironment) {
        battleEnvironment.units = [];
        battleEnvironment.projectiles = [];
        battleEnvironment.groundEffects = [];
        battleEnvironment.grid = null;
        battleEnvironment.bgCanvas = null;
        battleEnvironment.fgCanvas = null;
    }

    zoom = 0.8;
    if (typeof camera !== "undefined") {
        camera.x = 0;
        camera.y = 0;
    }

    if (typeof keys !== "undefined") {
        Object.keys(keys).forEach(k => keys[k] = false);
    }
    player.isMoving = false;
    player.stunTimer = 0;
    player.onWall = false;

    const overworldUI = document.getElementById("ui");
    if (overworldUI) overworldUI.style.display = "block";

    window.showCustomBattleMenu(reportData);
}

    // --- POST BATTLE REPORT MODAL ---
    function showReportModal(parentContainer, data) {
        const modalBg = document.createElement("div");
        modalBg.style.position = "absolute";
        modalBg.style.top = "0"; modalBg.style.left = "0";
        modalBg.style.width = "100%"; modalBg.style.height = "100%";
        modalBg.style.background = "rgba(0,0,0,0.85)";
        modalBg.style.display = "flex";
        modalBg.style.justifyContent = "center";
        modalBg.style.alignItems = "center";
        modalBg.style.zIndex = "12000";

        const box = document.createElement("div");
        box.style.background = "#2b2b2b";
        box.style.border = "2px solid #d4b886";
        box.style.padding = "40px";
        box.style.textAlign = "center";
        box.style.width = "500px";

        box.innerHTML = `
            <h1 style="color: ${data.resultColor}; letter-spacing: 2px; margin-top:0;">${data.resultStr}</h1>
            <hr style="border-color: #5d4037; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 18px; color: #fff;">
                <div style="text-align: left;">
                    <h3 style="color: #2196f3; margin-bottom: 5px;">ATTACKERS</h3>
                    Deployed: ${data.pMen}<br>
                    Lost: <span style="color: #f44336;">${data.pLosses}</span><br>
                    Remaining: ${data.pAlive}
                </div>
                <div style="text-align: right;">
                    <h3 style="color: #f44336; margin-bottom: 5px;">DEFENDERS</h3>
                    Deployed: ${data.eMen}<br>
                    Lost: <span style="color: #f44336;">${data.eLosses}</span><br>
                    Remaining: ${data.eAlive}
                </div>
            </div>
            <hr style="border-color: #5d4037; margin: 20px 0;">
        `;

        const closeBtn = createCBBtn("Return to Setup", () => {
            modalBg.remove();
        });
        box.appendChild(closeBtn);
        modalBg.appendChild(box);
        parentContainer.appendChild(modalBg);
    }

    // --- UTILITIES ---
    function exitCustomBattleMenu() {
        const container = document.getElementById("cb-menu-container");
        if (container) container.remove();
        customBattleActive = false;
        
        // FIX: Properly unhide the Main Menu so buttons return
        const mainMenu = document.getElementById("main-menu");
        if (mainMenu) {
            mainMenu.style.display = "flex"; 
            // Seek out the uiContainer wrapper holding the buttons and show it
            const uiContainer = Array.from(mainMenu.children).find(c => c.tagName === "DIV" && c.style.zIndex === "1");
            if (uiContainer) uiContainer.style.display = "flex";
        } else if (typeof showMainMenu === 'function') {
            showMainMenu();
        } else {
            window.isPaused = false; 
        }
    }

    function createCBBtn(text, onClick) {
        const btn = document.createElement("button");
        btn.innerText = text;
        btn.style.background = "linear-gradient(to bottom, #7b1a1a, #4a0a0a)";
        btn.style.color = "#f5d76e";
        btn.style.border = "1px solid #d4b886";
        btn.style.padding = "10px 20px";
        btn.style.fontFamily = "Georgia, serif";
        btn.style.cursor = "pointer";
        btn.onclick = onClick;
        
        btn.onmouseenter = () => btn.style.background = "linear-gradient(to bottom, #b71c1c, #7b1a1a)";
        btn.onmouseleave = () => btn.style.background = "linear-gradient(to bottom, #7b1a1a, #4a0a0a)";
        
        return btn;
    }
})();