/**
 * autoAttack.js (ADVANCED TACTICAL ENGINE) - NAVAL PATCH EDITION
 * Injects side-by-side "Smart Auto" and "Manual" killswitch buttons.
 * LAND: Phase 1 (March), Phase 2 (Skirmish), Phase 3 (Charge).
 * NAVAL: Hold deck, Melee engages at 100px, Swimmers seek the ship.
 */
;(function (W, D) {
  'use strict';

  let tacticalInterval = null;
  let autoBtn = null;
  let manualBtn = null;
  let isManualMode = false;
  let autoRunning = false; // Tracks the ON/OFF state of the AI

  const poll = setInterval(() => {
    if (W.MobileControls && D.getElementById('mc3-hrow')) {
      clearInterval(poll);
      initLazyButtons();
    }
  }, 500);

  function initLazyButtons() {
    if (D.getElementById('mc3-tactical-container')) return;

    const hrow = D.getElementById('mc3-hrow');
    
    // Container to hold both buttons side-by-side
    const container = D.createElement('div');
    container.id = 'mc3-tactical-container';
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.alignItems = 'center';
    container.style.margin = '0 5px';

    // 1. Auto Button (The "ON" Switch)
    autoBtn = D.createElement('button');
    autoBtn.id = 'mc3-lazy-auto';
    autoBtn.setAttribute('type', 'button');
    autoBtn.className = 'mc3-btn mc3-toggle-btn';
    autoBtn.innerHTML = '🤖';
    autoBtn.style.color = '#ff5722';
    autoBtn.style.borderColor = '#ffca28';
    autoBtn.style.flex = '1';
    autoBtn.style.transition = 'opacity 0.2s';
    autoBtn.style.pointerEvents = 'auto';
    autoBtn.style.opacity = '1';

    // 2. Manual Button (The "OFF" / Killswitch)
    manualBtn = D.createElement('button');
    manualBtn.id = 'mc3-manual-override';
    manualBtn.setAttribute('type', 'button');
    manualBtn.className = 'mc3-btn mc3-toggle-btn';
    manualBtn.innerHTML = '🛑';
    manualBtn.style.color = '#f44336';
    manualBtn.style.borderColor = '#f44336';
    manualBtn.style.flex = '1';
    manualBtn.style.transition = 'opacity 0.2s';
    // Starts disabled because AI isn't running yet
    manualBtn.style.pointerEvents = 'none';
    manualBtn.style.opacity = '0.4';

    let lastFire = 0;
    
    // Auto Button Logic (Turn ON)
    const fireAuto = (ev) => {
      if (autoRunning) return; // Prevent if already running
        
      const now = Date.now();
      if (now - lastFire < 500) return; 
      lastFire = now;

      if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
      }

      autoBtn.classList.add('pressed');
      setTimeout(() => autoBtn.classList.remove('pressed'), 130);

      // --- STATE CHANGE: AUTO ON ---
      autoRunning = true;
      isManualMode = false; // Allow AI to run

      // Disable Auto button from being clicked, but keep it fully visible for text updates
      autoBtn.style.pointerEvents = 'none';
      
      // Enable Manual button as the active killswitch
      manualBtn.style.pointerEvents = 'auto';
      manualBtn.style.opacity = '1';

      triggerTacticalAssault();
    };

    // Manual Toggle Logic (Turn OFF)
    const toggleManual = (ev) => {
      if (!autoRunning) return; // Only works if Auto is running

      if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
      }

      // --- STATE CHANGE: AUTO OFF ---
      autoRunning = false;
      isManualMode = true; // Signals tactical interval to die
      
      // Re-enable Auto button
      autoBtn.style.pointerEvents = 'auto';
      autoBtn.innerHTML = '🤖';
      
      // Disable Manual button
      manualBtn.style.pointerEvents = 'none';
      manualBtn.style.opacity = '0.4';

      // Terminate AI completely
      if (tacticalInterval) {
        clearInterval(tacticalInterval);
        tacticalInterval = null;
      }

      // --- Stop moving, hold position, and deselect ---
      let env = (typeof battleEnvironment !== 'undefined') ? battleEnvironment : W.battleEnvironment;
      if (env && env.units) {
        let playerUnits = env.units.filter(u => u.side === "player");
        restoreSpeeds(playerUnits);
        
        playerUnits.forEach(u => {
          u.selected = false; 
          u.hasOrders = true;
          u.orderType = "hold_position";
          u.vx = 0;
          u.vy = 0;
          
          if (typeof W.getSafeMapCoordinates === 'function') {
            u.orderTargetPoint = W.getSafeMapCoordinates(u.x, u.y, 15);
          } else {
            u.orderTargetPoint = { x: u.x, y: u.y };
          }
        });

        if (typeof currentSelectionGroup !== 'undefined') currentSelectionGroup = null;
        if (W.MobileControls && W.MobileControls.UnitCards) {
            W.MobileControls.UnitCards._snap = '';
            W.MobileControls.UnitCards.update();
        }
      }
    };

    autoBtn.addEventListener('touchstart', fireAuto, { passive: false });
    autoBtn.addEventListener('pointerdown', fireAuto);
    manualBtn.addEventListener('touchstart', toggleManual, { passive: false });
    manualBtn.addEventListener('pointerdown', toggleManual);

    container.appendChild(autoBtn);
    container.appendChild(manualBtn);

    const group5 = D.getElementById('mc3-g5');
    if (group5) group5.after(container);
    else hrow.appendChild(container);

    // Watcher: Reset the UI state cleanly if the battle ends naturally
    setInterval(() => {
      const inBattle = W.MobileControls && W.MobileControls.G.isBattle();
      container.style.display = inBattle ? 'flex' : 'none';
      
      if (!inBattle) {
          if (tacticalInterval) {
              clearInterval(tacticalInterval);
              tacticalInterval = null;
          }
          // Reset UI to default OFF state between battles
          autoRunning = false;
          isManualMode = false;
          autoBtn.style.pointerEvents = 'auto';
          autoBtn.innerHTML = '🤖';
          manualBtn.style.pointerEvents = 'none';
          manualBtn.style.opacity = '0.4';
      }
    }, 1000);
  }

  function getFallbackRole(unit) {
    if (typeof W.getTacticalRole === 'function') return W.getTacticalRole(unit);
    const r = (unit.stats && unit.stats.role) ? String(unit.stats.role).toUpperCase() : "";
    if (["CAVALRY", "HORSE_ARCHER", "MOUNTED_GUNNER", "CAMEL", "ELEPHANT"].includes(r)) return "CAVALRY";
    if (["ARCHER", "CROSSBOW", "THROWING"].includes(r)) return "RANGED";
    if (["GUNNER", "FIRELANCE", "BOMB", "ROCKET"].includes(r)) return "GUNPOWDER";
    return "INFANTRY";
  }

  function restoreSpeeds(units) {
    units.forEach(u => {
      if (u.origSmartSpeed !== undefined && u.stats) {
        u.stats.speed = u.origSmartSpeed;
        delete u.origSmartSpeed;
      }
    });
  }

  function triggerTacticalAssault() {
    if (isManualMode) return; 

    const MC = W.MobileControls;
    if (!MC || !MC.G.isBattle()) return;
    
    let isForcedCharge = false;
    if (tacticalInterval) {
        clearInterval(tacticalInterval);
        tacticalInterval = null;
        isForcedCharge = true; 
    }

    let env = (typeof battleEnvironment !== 'undefined') ? battleEnvironment : W.battleEnvironment;
    if (!env || !env.units) return;

    // Helper to fetch live valid units
    const getLivePlayerUnits = () => env.units.filter(u => {
        const type = String(u.unitType || "").toLowerCase();
        return (u.side === "player" && u.hp > 0 && u !== W.player && !u.isCommander && type !== "commander" && type !== "general");
    });
    const getLiveEnemyUnits = () => env.units.filter(u => u.side === "enemy" && u.hp > 0 && !u.isDummy);

    let playerUnits = getLivePlayerUnits();
    let enemyUnits = getLiveEnemyUnits();
    if (playerUnits.length === 0 || enemyUnits.length === 0) return;

    // =========================================================
    // 🌊 NAVAL OVERRIDE BRANCH
    // =========================================================
    if (W.inNavalBattle) {
        if (typeof currentSelectionGroup !== 'undefined') currentSelectionGroup = 5;
        autoBtn.innerHTML = '⚓'; 

        tacticalInterval = setInterval(() => {
            if (!MC.G.isBattle() || isManualMode) {
                clearInterval(tacticalInterval);
                tacticalInterval = null;
                restoreSpeeds(playerUnits);
                if (!isManualMode) autoBtn.innerHTML = '🤖';
                return;
            }

            playerUnits = getLivePlayerUnits();
            enemyUnits = getLiveEnemyUnits();

            if (playerUnits.length === 0 || enemyUnits.length === 0) {
                clearInterval(tacticalInterval);
                tacticalInterval = null;
                autoBtn.innerHTML = '⏳';
                return;
            }

            let cmdr = env.units.find(u => u.side === 'player' && u.isCommander && u.hp > 0);

            playerUnits.forEach(u => {
                u.selected = true; // Visual Yellow Glow
                u.hasOrders = true;

                // Bulletproof Surface & Fallback check
                let surface = 'DECK';
                if (typeof W.getNavalSurfaceAt === 'function') surface = W.getNavalSurfaceAt(u.x, u.y);

                let safeTarget = cmdr ? {x: cmdr.x, y: cmdr.y} : {x: u.x, y: u.y};
                let myShip = (W.navalEnvironment && W.navalEnvironment.ships) ? W.navalEnvironment.ships.find(s => s.side === 'player') : null;
                if (myShip) safeTarget = { x: myShip.x, y: myShip.y }; // Ship centroid fallback

                // 🔴 PRIORITY 1: SWIMMING (Survival Mode)
                if (u.isSwimming || surface === 'WATER') {
                    u.target = null;
                    u.orderType = "move_to_point";
                    u.orderTargetPoint = safeTarget;
                    return; 
                }

                // 🟢 PRIORITY 2: DECK COMBAT LOGIC
                let role = getFallbackRole(u);
                let nearestDist = Infinity;
                enemyUnits.forEach(e => {
                    let d = Math.hypot(u.x - e.x, u.y - e.y);
                    if (d < nearestDist) nearestDist = d;
                });

                if (role === "INFANTRY") {
                    // Melee: Swarm boarders within 100px, otherwise hold tight
                    if (nearestDist < 100) {
                        u.orderType = "seek_engage";
                        u.orderTargetPoint = null;
                    } else {
                        u.orderType = "hold_position";
                        u.vx = 0; u.vy = 0;
                        u.orderTargetPoint = { x: u.x, y: u.y };
                    }
                } else {
                    // Ranged/Cav: Hold position and shoot natively
                    u.orderType = "hold_position";
                    u.vx = 0; u.vy = 0;
                    u.orderTargetPoint = { x: u.x, y: u.y };
                }
            });

            // Sync UI selection state
            if (MC.UnitCards) {
                MC.UnitCards._snap = '';
                MC.UnitCards.update();
            }
        }, 500);

        return; // EXIT FUNCTION: Do not run land battle logic
    }
    // =========================================================
    // 🌲 LAND BATTLE LOGIC (Original)
    // =========================================================

    let minDistance = Infinity;
    playerUnits.forEach(p => {
      enemyUnits.forEach(e => {
        let dist = Math.hypot(p.x - e.x, p.y - e.y);
        if (dist < minDistance) minDistance = dist;
      });
    });

    let phase = "MARCHING";
    let skirmishTicks = 0;
    let avgSpeed = 2; 

    if (isForcedCharge || minDistance <= 150) phase = "CHARGING";
    else if (minDistance <= 600) phase = "SKIRMISHING";

    if (phase === "MARCHING") {
        autoBtn.innerHTML = '🚶..';
        let totalSpeed = 0;
        playerUnits.forEach(u => totalSpeed += (u.stats?.speed || 2));
        avgSpeed = Math.max(1, totalSpeed / playerUnits.length);
        updateMarchTargets(playerUnits, enemyUnits, avgSpeed);
    } else if (phase === "SKIRMISHING") {
        autoBtn.innerHTML = '🏹..';
        issueSkirmishOrders(playerUnits);
    }

    if (typeof currentSelectionGroup !== 'undefined') currentSelectionGroup = 5; 

    tacticalInterval = setInterval(() => {
      if (!MC.G.isBattle() || isManualMode) {
        clearInterval(tacticalInterval);
        tacticalInterval = null;
        restoreSpeeds(playerUnits);
        if (!isManualMode) autoBtn.innerHTML = '⏳';
        return;
      }

      playerUnits = getLivePlayerUnits();
      enemyUnits = getLiveEnemyUnits();

      if (playerUnits.length === 0 || enemyUnits.length === 0) {
        clearInterval(tacticalInterval);
        tacticalInterval = null;
        restoreSpeeds(playerUnits);
        autoBtn.innerHTML = '⏳';
        return;
      }

      let playerHoldOverride = playerUnits.some(u => u.orderType === "hold_position" || u.orderType === "retreat");
      if (playerHoldOverride && phase === "MARCHING") {
          clearInterval(tacticalInterval);
          tacticalInterval = null;
          autoBtn.innerHTML = '⏳';
          restoreSpeeds(playerUnits);
          return;
      }

      minDistance = Infinity;
      let meleeMinDistance = Infinity;
      
      playerUnits.forEach(p => {
        let role = getFallbackRole(p);
        enemyUnits.forEach(e => {
          let dist = Math.hypot(p.x - e.x, p.y - e.y);
          if (dist < minDistance) minDistance = dist;
          if (role !== "RANGED" && role !== "GUNPOWDER" && dist < meleeMinDistance) meleeMinDistance = dist;
        });
      });

      if (phase === "MARCHING") {
        if (minDistance <= 600) {
          phase = "SKIRMISHING";
          autoBtn.innerHTML = '🏹..';
          issueSkirmishOrders(playerUnits);
        } else {
          updateMarchTargets(playerUnits, enemyUnits, avgSpeed);
        }
      } 
      else if (phase === "SKIRMISHING") {
        autoBtn.innerHTML = '🏹..';
        skirmishTicks++;

        if (skirmishTicks >= 16 || meleeMinDistance <= 150) {
          phase = "CHARGING";
        }
      }
      
      if (phase === "CHARGING") {
        autoBtn.innerHTML = '⚔️';
        restoreSpeeds(playerUnits);

        playerUnits.forEach(u => {
          u.hasOrders = true;
          u.orderType = "seek_engage";
          u.orderTargetPoint = null; 
          u.target = null; 
          u.selected = false;
        });

        if (typeof currentSelectionGroup !== 'undefined') currentSelectionGroup = null;

        if (MC.UnitCards) {
          MC.UnitCards._snap = '';
          MC.UnitCards.update();
        }

        if (typeof W.AudioManager !== 'undefined') W.AudioManager.playSound('charge');

        clearInterval(tacticalInterval);
        tacticalInterval = null;
        
        setTimeout(() => { if (autoBtn && !isManualMode) autoBtn.innerHTML = '⏳'; }, 2000);
      }
    }, 500);

    // --- Helpers ---
    function updateMarchTargets(pUnits, eUnits, speedTarget) {
        let eAvgX = 0, eAvgY = 0;
        eUnits.forEach(e => { eAvgX += e.x; eAvgY += e.y; });
        eAvgX /= eUnits.length;
        eAvgY /= eUnits.length;

        let cavCount = 0, rangedCount = 0, infCount = 0;
        pUnits.forEach(u => {
          let r = getFallbackRole(u);
          if (r==="CAVALRY") cavCount++; else if (r==="RANGED"||r==="GUNPOWDER") rangedCount++; else infCount++;
        });

        let total = pUnits.length;
        let chosenStyle = "standard"; 
        if (cavCount / total > 0.40) chosenStyle = "circle"; 
        else if (rangedCount / total > 0.45) chosenStyle = "line";   
        else if (infCount / total > 0.60) chosenStyle = "tight";  

        if (typeof W.calculateFormationOffsets === 'function') {
          W.calculateFormationOffsets(pUnits, chosenStyle, { x: eAvgX, y: eAvgY });
        }

        pUnits.forEach(u => {
          if (u.stats && u.origSmartSpeed === undefined) u.origSmartSpeed = u.stats.speed;
          u.stats.speed = speedTarget;

          u.selected = true; 
          u.hasOrders = true;
          u.orderType = "move_to_point";
          u.reactionDelay = 0; 
          
          let targetX = eAvgX + (u.formationOffsetX || 0);
          let targetY = eAvgY + (u.formationOffsetY || 0);

          if (typeof W.getSafeMapCoordinates === 'function') {
            u.orderTargetPoint = W.getSafeMapCoordinates(targetX, targetY);
          } else {
            u.orderTargetPoint = { x: targetX, y: targetY };
          }
        });
    }

    function issueSkirmishOrders(pUnits) {
        pUnits.forEach(u => {
            let role = getFallbackRole(u);
            if (role === "RANGED" || role === "GUNPOWDER") {
              if (u.origSmartSpeed !== undefined) u.stats.speed = u.origSmartSpeed;
              u.orderType = "seek_engage";
              u.orderTargetPoint = null;
              u.target = null;
            } else {
              u.orderType = "hold_position";
              u.vx = 0;
              u.vy = 0;
              if (typeof W.getSafeMapCoordinates === 'function') {
                u.orderTargetPoint = W.getSafeMapCoordinates(u.x, u.y, 15);
              } else {
                u.orderTargetPoint = { x: u.x, y: u.y };
              }
            }
        });
    }
  }

})(window, document);