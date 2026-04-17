/**
 * autoAttack.js (ADVANCED TACTICAL ENGINE) - FIXED VERSION + MANUAL OVERRIDE
 * Injects side-by-side "Smart Auto" and "Manual" killswitch buttons.
 * Phase 1: March in formation tracking the moving enemy centroid.
 * Phase 2: Skirmish at 600px (Ranged engage, Melee holds).
 * Phase 3: Global Charge.
 * NEW: Manual mode toggle completely disables Auto, stops all units, and deselects them.
 */
;(function (W, D) {
  'use strict';

  let tacticalInterval = null;
  let autoBtn = null;
  let manualBtn = null;
  let isManualMode = false;

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

    // 1. Auto Button
    autoBtn = D.createElement('button');
    autoBtn.id = 'mc3-lazy-auto';
    autoBtn.setAttribute('type', 'button');
    autoBtn.className = 'mc3-btn mc3-toggle-btn';
    autoBtn.innerHTML = '⚔️ TACTICAL AUTO';
    autoBtn.style.color = '#ff5722';
    autoBtn.style.borderColor = '#ffca28';
    autoBtn.style.flex = '1';
    autoBtn.style.transition = 'opacity 0.2s';

    // 2. Manual Button (Killswitch)
    manualBtn = D.createElement('button');
    manualBtn.id = 'mc3-manual-override';
    manualBtn.setAttribute('type', 'button');
    manualBtn.className = 'mc3-btn mc3-toggle-btn';
    manualBtn.innerHTML = '✋ MANUAL OFF';
    manualBtn.style.color = '#ffca28';
    manualBtn.style.borderColor = '#ffca28';
    manualBtn.style.flex = '1';

    let lastFire = 0;
    
    // Auto Button Logic
    const fireAuto = (ev) => {
      if (isManualMode || autoBtn.disabled) return;
        
      const now = Date.now();
      if (now - lastFire < 500) return; 
      lastFire = now;

      if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
      }

      autoBtn.classList.add('pressed');
      setTimeout(() => autoBtn.classList.remove('pressed'), 130);

      triggerTacticalAssault();
    };

    // Manual Toggle Logic
    const toggleManual = (ev) => {
      if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
      }

      isManualMode = !isManualMode;

      if (isManualMode) {
        // Activate Manual / Killswitch
        manualBtn.innerHTML = '🛑 MANUAL ON';
        manualBtn.style.color = '#f44336';
        manualBtn.style.borderColor = '#f44336';
        
        // Disable Auto visually and functionally
        autoBtn.disabled = true;
        autoBtn.style.opacity = '0.4';
        autoBtn.style.pointerEvents = 'none';
        autoBtn.innerHTML = '⛔ DISABLED';

        // Terminate AI completely
        if (tacticalInterval) {
          clearInterval(tacticalInterval);
          tacticalInterval = null;
        }

        // --- NEW: Stop moving, hold position (allows attacking), and deselect ---
        let env = (typeof battleEnvironment !== 'undefined') ? battleEnvironment : W.battleEnvironment;
        if (env && env.units) {
          let playerUnits = env.units.filter(u => u.side === "player");
          restoreSpeeds(playerUnits);
          
          playerUnits.forEach(u => {
            u.selected = false; // Deselect unit for manual mode
            
            // Halt movement and set to hold position
            u.hasOrders = true;
            u.orderType = "hold_position";
            u.vx = 0;
            u.vy = 0;
            
            // Anchor to current position
            if (typeof W.getSafeMapCoordinates === 'function') {
              u.orderTargetPoint = W.getSafeMapCoordinates(u.x, u.y, 15);
            } else {
              u.orderTargetPoint = { x: u.x, y: u.y };
            }
          });

          // Clear UI selection groups to reflect deselection
          if (typeof currentSelectionGroup !== 'undefined') {
              currentSelectionGroup = null;
          }
          if (W.MobileControls && W.MobileControls.UnitCards) {
              W.MobileControls.UnitCards._snap = '';
              W.MobileControls.UnitCards.update();
          }
        }
      } else {
        // Deactivate Manual
        manualBtn.innerHTML = '✋ MANUAL OFF';
        manualBtn.style.color = '#ffca28';
        manualBtn.style.borderColor = '#ffca28';
        
        // Re-enable Auto
        autoBtn.disabled = false;
        autoBtn.style.opacity = '1';
        autoBtn.style.pointerEvents = 'auto';
        autoBtn.innerHTML = '⚔️ TACTICAL AUTO';
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

    setInterval(() => {
      const inBattle = W.MobileControls && W.MobileControls.G.isBattle();
      container.style.display = inBattle ? 'flex' : 'none';
      if (!inBattle && tacticalInterval) {
          clearInterval(tacticalInterval);
          tacticalInterval = null;
          if (!isManualMode) autoBtn.innerHTML = '⚔️ TACTICAL AUTO';
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
    if (isManualMode) return; // Safety block

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

    let playerUnits = env.units.filter(u => u.side === "player" && !u.isCommander && u.hp > 0 && !u.disableAICombat);
    let enemyUnits = env.units.filter(u => u.side === "enemy" && u.hp > 0 && !u.isDummy);
    
    if (playerUnits.length === 0 || enemyUnits.length === 0) return;

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

    if (isForcedCharge || minDistance <= 150) {
        phase = "CHARGING";
    } else if (minDistance <= 600) {
        phase = "SKIRMISHING";
    }

    if (phase === "MARCHING") {
        autoBtn.innerHTML = '🚶 ADVANCING...';
        let totalSpeed = 0;
        playerUnits.forEach(u => totalSpeed += (u.stats?.speed || 2));
        avgSpeed = Math.max(1, totalSpeed / playerUnits.length);
        updateMarchTargets(playerUnits, enemyUnits, avgSpeed);
    } else if (phase === "SKIRMISHING") {
        autoBtn.innerHTML = '🏹 SKIRMISHING...';
        issueSkirmishOrders(playerUnits);
    }

    if (typeof currentSelectionGroup !== 'undefined') {
        currentSelectionGroup = 5; 
    }

    tacticalInterval = setInterval(() => {
      // Abort interval if manual mode is toggled or battle ends
      if (!MC.G.isBattle() || isManualMode) {
        clearInterval(tacticalInterval);
        tacticalInterval = null;
        restoreSpeeds(playerUnits);
        if (!isManualMode) autoBtn.innerHTML = '⚔️ TACTICAL AUTO';
        return;
      }

      playerUnits = env.units.filter(u => u.side === "player" && u.hp > 0 && !u.isCommander && !u.disableAICombat);
      enemyUnits = env.units.filter(u => u.side === "enemy" && u.hp > 0 && !u.isDummy);

      if (playerUnits.length === 0 || enemyUnits.length === 0) {
        clearInterval(tacticalInterval);
        tacticalInterval = null;
        restoreSpeeds(playerUnits);
        autoBtn.innerHTML = '⚔️ TACTICAL AUTO';
        return;
      }

      let playerHoldOverride = playerUnits.some(u => u.orderType === "hold_position" || u.orderType === "retreat");
      if (playerHoldOverride && phase === "MARCHING") {
          clearInterval(tacticalInterval);
          tacticalInterval = null;
          autoBtn.innerHTML = '⚔️ TACTICAL AUTO';
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
          if (role !== "RANGED" && role !== "GUNPOWDER" && dist < meleeMinDistance) {
              meleeMinDistance = dist;
          }
        });
      });

      if (phase === "MARCHING") {
        if (minDistance <= 600) {
          phase = "SKIRMISHING";
          autoBtn.innerHTML = '🏹 SKIRMISHING...';
          issueSkirmishOrders(playerUnits);
        } else {
          updateMarchTargets(playerUnits, enemyUnits, avgSpeed);
        }
      } 
      else if (phase === "SKIRMISHING") {
        autoBtn.innerHTML = '🏹 SKIRMISHING...';
        skirmishTicks++;

        if (skirmishTicks >= 16 || meleeMinDistance <= 150) {
          phase = "CHARGING";
        }
      }
      
      if (phase === "CHARGING") {
        autoBtn.innerHTML = '⚔️ CHARGING!';
        restoreSpeeds(playerUnits);

        playerUnits.forEach(u => {
          u.hasOrders = true;
          u.orderType = "seek_engage";
          u.orderTargetPoint = null; 
          u.target = null; 
          u.selected = false;
        });

        if (typeof currentSelectionGroup !== 'undefined') {
            currentSelectionGroup = null;
        }

        if (MC.UnitCards) {
          MC.UnitCards._snap = '';
          MC.UnitCards.update();
        }

        if (typeof W.AudioManager !== 'undefined') {
          W.AudioManager.playSound('charge');
        }

        clearInterval(tacticalInterval);
        tacticalInterval = null;
        
        setTimeout(() => {
            if (autoBtn && !isManualMode) autoBtn.innerHTML = '⚔️ TACTICAL AUTO';
        }, 2000);
      }
    }, 500);

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