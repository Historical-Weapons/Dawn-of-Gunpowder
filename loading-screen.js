

// loading-screen.js (Replaces menu-units-guide.js)
(function () {
  if (window.__loadingScreenInstalled) return;
  window.__loadingScreenInstalled = true;

   const STAT_ORDER = [
  "weightClass","isRanged","ammo","health","meleeAttack","meleeDefense",
  "missileBaseDamage","missileAPDamage","accuracy","armor","bonusVsLarge","speed","range","morale","cost"
];

const STAT_LABELS = {
  weightClass: "Weight",
  isRanged: "Ranged",
  ammo: "Ammo",
  health: "Health",
  meleeAttack: "Melee Atk",
  meleeDefense: "Melee Def",
  missileBaseDamage: "Missile Dmg",
  missileAPDamage: "AP Dmg",
  accuracy: "Accuracy",
  armor: "Armor",
  bonusVsLarge: "Bonus vs Large",
  speed: "Moving Speed",
  range: "Range (feet)",
  morale: "Morale",
  cost: "Cost"
};

  function create(tag, style) {
    const el = document.createElement(tag);
    if (style) Object.assign(el.style, style);
    return el;
  }

  function prettyValue(key, value) {
    if (value === true) return "Yes";
    if (value === false) return "No";
    if (value === null || typeof value === "undefined") return "—";
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
    return String(value);
  }

  // Same logic to determine how to draw the unit
  function resolvePreviewSpec(unit) {
    const lower = (unit?.name || "").trim().toLowerCase();
    const ammo = unit?.stats?.ammo || 0;
    if (lower === "bomb") return { mode: "infantry", type: "bomb", ammo, zoom: 2.2, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("rocket") || lower.includes("hwacha")) return { mode: "infantry", type: "rocket", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("firelance")) return { mode: "infantry", type: "firelance", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower === "glaiveman" || lower.includes("glaive")) return { mode: "infantry", type: "spearman", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("repeater crossbowman")) return { mode: "infantry", type: "crossbow", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("crossbowman")) return { mode: "infantry", type: "crossbow", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("hand cannoneer")) return { mode: "infantry", type: "gun", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("slinger") || lower.includes("javelinier")) return { mode: "infantry", type: "throwing", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("archer") && !lower.includes("horse")) return { mode: "infantry", type: "archer", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("shielded infantry")) return { mode: "infantry", type: "sword_shield", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("two handed")) return { mode: "infantry", type: "two_handed", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("spearman")) return { mode: "infantry", type: "spearman", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower === "militia") return { mode: "infantry", type: "peasant", ammo, zoom: 2.0, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("camel cannon")) return { mode: "cavalry", type: "camel", subtype: "camel_cannon", ammo, zoom: 1.6, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("elephant")) return { mode: "cavalry", type: "elephant", ammo, zoom: 1.3, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("keshig") || lower.includes("horse archer")) return { mode: "cavalry", type: "horse_archer", ammo, zoom: 1.6, xBias: 0.5, yBias: 0.75 };
    if (lower.includes("lancer")) return { mode: "cavalry", type: "lancer", ammo, zoom: 1.6, xBias: 0.5, yBias: 0.75 };
    return { mode: unit?.mounted ? "cavalry" : "infantry", type: unit?.renderType || (unit?.mounted ? "lancer" : "peasant"), ammo, zoom: unit?.mounted ? 1.6 : 2.0, xBias: 0.5, yBias: 0.75 };
  }

  function renderPortrait(canvas, unit) {
    if (!canvas || !unit) return;
    const ctx = canvas.getContext("2d");
    const cssW = canvas.clientWidth || 400;
    const cssH = canvas.clientHeight || 400;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const spec = resolvePreviewSpec(unit);
    const factionColor = "#b71c1c"; // Give them a cool red faction color for the loading screen

    const baseX = cssW * spec.xBias-50;
    const baseY = cssH * spec.yBias;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(spec.zoom, spec.zoom);

    // Give it a slow, Skyrim-esque rotation or idle bob if we hooked into an animation loop, 
    // but a static heroic pose works perfectly for a loading screen.
    try {
      if (spec.mode === "cavalry" && typeof drawCavalryUnit === "function") {
        drawCavalryUnit(ctx, 0, 0, false, 0, factionColor, false, spec.type, "player", unit.name, false, 0, spec.ammo, { id: unit.name, lastAttackTime: 0, stats: unit.stats || {} }, 0);
      } else if (typeof drawInfantryUnit === "function") {
        drawInfantryUnit(ctx, 0, 0, false, 0, factionColor, spec.type, false, "player", unit.name, false, 0, spec.ammo, { id: unit.name, lastAttackTime: 0, stats: unit.stats || {} }, 0);
      }
    } catch (err) {
      console.warn("Loading screen portrait render failed:", err);
    }
    ctx.restore();
  }

  function buildLoadingScreen() {
    const existing = document.getElementById("loading-screen-wrapper");
    if (existing) return existing;

const wrapper = create("div", {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100%",
  height: "100vh",   // leaves bottom 20% visible
  display: "none",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  paddingTop: "2vh",
paddingBottom: "2vh",
  background: "#0c0a0a",
zIndex: "10000",
  color: "#fff",
  fontFamily: "Georgia, serif",
  overflow: "hidden" // prevents spill
});
    wrapper.id = "loading-screen-wrapper";

    // GIANT LOADING TEXT
    const header = create("div", {
      fontSize: "2.8rem", fontWeight: "700", color: "#f5d76e", letterSpacing: "15px",
      marginBottom: "40px", textShadow: "0 0 20px rgba(245, 215, 110, 0.5)", textAlign: "center"
    });
    header.textContent = "  LOADING...";

// MAIN CONTENT BOX (Skyrim style: Model left, Text Right)
    const content = create("div", {
      display: "flex", 
      flexDirection: "row", 
      gap: "40px", 
      width: "clamp(320px, 70vw, 900px)",
      justifyContent: "center",
      alignItems: "center",
      // --- ADD THIS LINE ---
      transform: "translateX(-200px)" 
    });

    // LEFT: PORTRAIT
    const canvasContainer = create("div", {
      flex: "1", height: "400px", background: "radial-gradient(circle, rgba(60,60,60,0.5) 0%, rgba(12,10,10,0) 70%)",
      display: "flex", justifyContent: "center", alignItems: "center"
    });
    const canvas = create("canvas", { width: "100%", height: "100%", display: "block" });
    canvasContainer.appendChild(canvas);

    // RIGHT: STATS & LORE
    const infoPanel = create("div", { flex: "1", display: "flex", flexDirection: "column", gap: "15px" });
    
    const unitName = create("div", { fontSize: "2.5rem", color: "#ffffff", borderBottom: "2px solid #7b1a1a", paddingBottom: "10px" });
const unitDesc = create("div", { fontSize: "0.95rem", color: "#d4b886", lineHeight: "1.3", fontStyle: "italic" });
    const statsGrid = create("div", {
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "20px"
    });

    infoPanel.appendChild(unitName);
    infoPanel.appendChild(unitDesc);
    infoPanel.appendChild(statsGrid);

    content.appendChild(canvasContainer);
    content.appendChild(infoPanel);

    wrapper.appendChild(header);
wrapper.appendChild(content);
    document.body.appendChild(wrapper);

    // API to show a random unit
    window.showLoadingScreen = function () {
      wrapper.style.display = "flex";
      
    // ---> ADD THIS FIX: Wake up the initialization ribbon <---
      const loadingRibbon = document.getElementById("loading");
      if (loadingRibbon) {
          loadingRibbon.style.display = "flex";
      }
      
	  // ---> PULL DYNAMIC DATA HERE <---
      const liveData = window.getEncyclopediaData();
      
      // Safety check in case the roster isn't ready
      if (!liveData || liveData.length === 0) return;
	  
      // Pick random unit
const randomUnit = liveData[Math.floor(Math.random() * liveData.length)];
      unitName.textContent = randomUnit.name;
      unitDesc.textContent = `"${randomUnit.desc}"`;

      // Fill Stats
      statsGrid.innerHTML = "";
const stats = randomUnit.stats || {};
for (const key of STAT_ORDER) {
  if (!(key in stats)) continue;
statsGrid.innerHTML += `
  <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding:5px 0; font-size:0.9rem;">
    <span style="color:#d4b886;">${STAT_LABELS[key]}</span>
    <span style="color:#fff;">${prettyValue(key, stats[key])}</span>
  </div>
`;
}

      // Allow DOM to update, then render canvas
      setTimeout(() => {
        renderPortrait(canvas, randomUnit);
      }, 50);
    };

    window.hideLoadingScreen = function () {
      wrapper.style.display = "none"; 
      
      // ---> ADD THIS FIX: Hide the ribbon when loading is done <---
      const loadingRibbon = document.getElementById("loading");
      if (loadingRibbon) {
          loadingRibbon.style.display = "none";
      }
    };
  }
  // Initialize it but don't show it immediately
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildLoadingScreen);
  } else {
    buildLoadingScreen();
  }

})();