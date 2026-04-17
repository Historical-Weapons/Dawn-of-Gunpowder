/**
 * enemyTacticalAI.js  ─  ENEMY TACTICAL COMMAND ENGINE
 * ======================================================
 * Governs standard ENEMY units in Land & Naval battles.
 *   ✓ Infantry · Cavalry · Ranged
 *   ✗ Enemy General (independent AI — untouched)
 *   ✗ Siege equipment / siege crews (excluded by tag)
 *   ✗ Player units (side === "player")
 *
 * PHASE 1 ─ COHESIVE ADVANCE
 *   All units march at normalized speed toward the player
 *   army's Center-of-Mass (centroid), maintaining a battle line.
 *
 * PHASE 2 ─ SKIRMISH  (triggered ≤ 600 px from player front)
 *   Ranged → seek_engage (free fire).
 *   Melee / Cav → hold_position (living shield wall).
 *
 * PHASE 3 ─ COMMITMENT  (≤ 150 px OR 8-second timer)
 *   Every unit → seek_engage at full restored speed (Global Charge).
 *
 * HOOK GUIDE (see bottom of file for integration notes)
 * -------------------------------------------------------
 * Minimum engine surface required:
 *   window.battleEnvironment.units[]       – unit array
 *   window.battleEnvironment.battleType    – "land" | "naval"
 *   unit.side          – "enemy" | "player"
 *   unit.hp            – current hit-points
 *   unit.x / unit.y    – world position
 *   unit.stats.speed   – movement speed (writable)
 *   unit.stats.role    – string role tag
 *   unit.orderType     – "move_to_point" | "hold_position" | "seek_engage"
 *   unit.orderTargetPoint – { x, y } | null
 *   unit.hasOrders     – bool
 *   unit.isCommander   – bool  (general flag)
 *   unit.isSiege       – bool  (siege crew/equipment flag)
 *   unit.isDummy       – bool  (placeholder / off-map flag)
 *   unit.disableAICombat – bool (scripted freeze flag)
 *
 * Optional engine helpers (gracefully skipped if absent):
 *   window.getTacticalRole(unit)                       → role string
 *   window.calculateFormationOffsets(units, style, pt) → sets unit.formationOffsetX/Y
 *   window.getSafeMapCoordinates(x, y, margin?)        → { x, y }
 *   window.MobileControls.G.isBattle()                → bool
 *   window.AudioManager.playSound(key)
 */

;(function (W, D) {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  // MODULE STATE
  // ─────────────────────────────────────────────────────────────────────────
  let _tickInterval  = null;   // master loop handle
  let _phase         = 'IDLE'; // IDLE → MARCHING → SKIRMISHING → CHARGING
  let _skirmishTicks = 0;      // tick counter inside SKIRMISHING phase

  // Milliseconds between AI ticks (500 ms = ~2 evaluations per second)
  const TICK_MS          = 500;
  // Skirmish-to-charge hard timer: 16 ticks × 500 ms = 8 seconds
  const SKIRMISH_MAX_TICKS = 16;
  // Distance thresholds (world-space pixels)
  const DIST_SKIRMISH    = 600;
  const DIST_CHARGE      = 150;

  // ─────────────────────────────────────────────────────────────────────────
  // SIEGE & EXCLUSION TAGS
  //   Extend this set freely — any unit whose role matches is ignored.
  // ─────────────────────────────────────────────────────────────────────────
  const SIEGE_ROLES = new Set([
    'SIEGE', 'CATAPULT', 'BALLISTA', 'TREBUCHET', 'CANNON',
    'BOMBARD', 'MORTAR', 'RAM', 'SIEGE_TOWER', 'FIRE_SHIP',
    'GALLEY_SIEGE', 'ROCKET_BATTERY', 'SIEGE_CREW',
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // BATTLE-TYPE GUARD
  //   Only run for land and naval battles.
  // ─────────────────────────────────────────────────────────────────────────
  const ALLOWED_BATTLE_TYPES = new Set(['land', 'naval', 'land_custom', 'naval_custom']);

  function isAllowedBattle() {
    const env = W.battleEnvironment;
    if (!env) return false;
    // If battleType is absent we assume "land" (safe default)
    const bt = (env.battleType || 'land').toLowerCase();
    return ALLOWED_BATTLE_TYPES.has(bt);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ROLE RESOLVER
  //   Mirrors autoAttack.js getFallbackRole for symmetry.
  // ─────────────────────────────────────────────────────────────────────────
  const CAVALRY_ROLES   = new Set(['CAVALRY', 'HORSE_ARCHER', 'MOUNTED_GUNNER', 'CAMEL', 'ELEPHANT']);
  const RANGED_ROLES    = new Set(['ARCHER', 'CROSSBOW', 'THROWING']);
  const GUNPOWDER_ROLES = new Set(['GUNNER', 'FIRELANCE', 'BOMB', 'ROCKET']);

  function resolveRole(unit) {
    if (typeof W.getTacticalRole === 'function') return W.getTacticalRole(unit);
    const r = (unit.stats && unit.stats.role) ? String(unit.stats.role).toUpperCase() : '';
    if (CAVALRY_ROLES.has(r))   return 'CAVALRY';
    if (RANGED_ROLES.has(r))    return 'RANGED';
    if (GUNPOWDER_ROLES.has(r)) return 'GUNPOWDER';
    return 'INFANTRY';
  }

  function isRangedRole(role) {
    return role === 'RANGED' || role === 'GUNPOWDER';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UNIT FILTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns enemy units eligible for AI command.
   * Excludes: generals, siege, dummies, dead, frozen-by-script.
   */
  function getEnemyUnits() {
    const env = W.battleEnvironment;
    if (!env || !env.units) return [];
    return env.units.filter(u =>
      u.side             === 'enemy' &&
      u.hp               >  0        &&
      !u.isCommander                  && // general has own AI
      !u.isDummy                      && // off-map placeholder
      !u.disableAICombat              && // scripted freeze
      !SIEGE_ROLES.has((u.stats && u.stats.role || '').toUpperCase())
    );
  }

  /** Returns living player units (to track centroid & distances). */
  function getPlayerUnits() {
    const env = W.battleEnvironment;
    if (!env || !env.units) return [];
    return env.units.filter(u => u.side === 'player' && u.hp > 0 && !u.isDummy);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPEED NORMALISATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Store true speed before we overwrite it (idempotent). */
  function backupSpeed(unit) {
    if (unit._etai_origSpeed === undefined && unit.stats) {
      unit._etai_origSpeed = unit.stats.speed;
    }
  }

  /** Restore the original speed and clean up the backup property. */
  function restoreSpeed(unit) {
    if (unit._etai_origSpeed !== undefined && unit.stats) {
      unit.stats.speed = unit._etai_origSpeed;
      delete unit._etai_origSpeed;
    }
  }

  function restoreAllSpeeds(units) {
    units.forEach(restoreSpeed);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GEOMETRY HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** 2D distance between two unit-like objects with .x/.y properties. */
  function dist2D(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Center-of-Mass of a unit array → { x, y }. */
  function centroid(units) {
    if (units.length === 0) return { x: 0, y: 0 };
    let sx = 0, sy = 0;
    units.forEach(u => { sx += u.x; sy += u.y; });
    return { x: sx / units.length, y: sy / units.length };
  }

  /**
   * Returns the minimum distance between any enemy unit and any player unit.
   * Optionally restricts the enemy side to a specific role filter.
   */
  function minDistanceBetweenArmies(enemyUnits, playerUnits, enemyRoleFilter) {
    let min = Infinity;
    enemyUnits.forEach(e => {
      if (enemyRoleFilter && !enemyRoleFilter(resolveRole(e))) return;
      playerUnits.forEach(p => {
        const d = dist2D(e, p);
        if (d < min) min = d;
      });
    });
    return min;
  }

  /** Clamp a world coordinate using the engine helper if available. */
  function safePoint(x, y, margin) {
    if (typeof W.getSafeMapCoordinates === 'function') {
      return W.getSafeMapCoordinates(x, y, margin);
    }
    return { x, y };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPOSITION ANALYSIS
  //   Determines the best formation style for Phase 1 advance.
  // ─────────────────────────────────────────────────────────────────────────

  function analyseComposition(units) {
    let cavCount = 0, rangedCount = 0, infantryCount = 0, totalSpeed = 0;
    units.forEach(u => {
      const role = resolveRole(u);
      if (role === 'CAVALRY')              cavCount++;
      else if (isRangedRole(role))         rangedCount++;
      else                                 infantryCount++;
      totalSpeed += (u.stats?.speed || 2);
    });

    const total = units.length || 1;
    let formationStyle = 'standard';
    if (cavCount  / total > 0.40) formationStyle = 'circle';
    else if (rangedCount / total > 0.45) formationStyle = 'line';
    else if (infantryCount / total > 0.60) formationStyle = 'tight';

    const avgSpeed = Math.max(1, totalSpeed / total);
    return { formationStyle, avgSpeed, cavCount, rangedCount, infantryCount };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ORDER HELPERS
  //   Manipulate orders directly — no "selection" API needed.
  // ─────────────────────────────────────────────────────────────────────────

  /** Issue a move-to-point order without touching selection state. */
  function orderMoveToPoint(unit, targetX, targetY) {
    unit.hasOrders       = true;
    unit.orderType       = 'move_to_point';
    unit.orderTargetPoint = safePoint(targetX, targetY);
    unit.reactionDelay   = 0;
  }

  /** Issue a hold-position order at the unit's current location. */
  function orderHoldPosition(unit) {
    unit.hasOrders       = true;
    unit.orderType       = 'hold_position';
    unit.vx              = 0;
    unit.vy              = 0;
    unit.orderTargetPoint = safePoint(unit.x, unit.y, 15);
  }

  /** Issue a free-chase seek-and-engage order (unit picks nearest enemy). */
  function orderSeekEngage(unit) {
    unit.hasOrders        = true;
    unit.orderType        = 'seek_engage';
    unit.orderTargetPoint = null;
    unit.target           = null; // let engine re-acquire
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: COHESIVE ADVANCE
  //   Dispatch all enemy units toward the player centroid in formation
  //   at a normalised (averaged) speed.
  // ─────────────────────────────────────────────────────────────────────────

  function executePhaseMarching(enemyUnits, playerCentroid) {
    const { formationStyle, avgSpeed } = analyseComposition(enemyUnits);

    // Ask engine to populate unit.formationOffsetX/Y if possible
    if (typeof W.calculateFormationOffsets === 'function') {
      W.calculateFormationOffsets(enemyUnits, formationStyle, playerCentroid);
    }

    enemyUnits.forEach(u => {
      backupSpeed(u);
      u.stats.speed = avgSpeed; // phalanx speed lock — no trickle-in

      const tx = playerCentroid.x + (u.formationOffsetX || 0);
      const ty = playerCentroid.y + (u.formationOffsetY || 0);
      orderMoveToPoint(u, tx, ty);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: SKIRMISH
  //   Ranged → free fire.  Melee/Cav → hold the line.
  // ─────────────────────────────────────────────────────────────────────────

  function executePhaseSkirmish(enemyUnits) {
    enemyUnits.forEach(u => {
      const role = resolveRole(u);
      if (isRangedRole(role)) {
        // Shooters get their speed back and open fire
        restoreSpeed(u);
        orderSeekEngage(u);
      } else {
        // Melee & cavalry anchor — protect the shooters
        orderHoldPosition(u);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3: GLOBAL CHARGE
  //   All units restore speed and charge at full intensity.
  // ─────────────────────────────────────────────────────────────────────────

  function executePhaseCharge(enemyUnits) {
    restoreAllSpeeds(enemyUnits);
    enemyUnits.forEach(u => orderSeekEngage(u));

    // Optional charge audio cue
    if (typeof W.AudioManager !== 'undefined' && typeof W.AudioManager.playSound === 'function') {
      W.AudioManager.playSound('enemy_charge');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BATTLE-END CLEANUP
  // ─────────────────────────────────────────────────────────────────────────

  function teardown() {
    if (_tickInterval) {
      clearInterval(_tickInterval);
      _tickInterval = null;
    }
    _phase         = 'IDLE';
    _skirmishTicks = 0;

    // Best-effort: restore any speed locks that remain on still-living units
    const env = W.battleEnvironment;
    if (env && env.units) {
      env.units.forEach(u => {
        if (u.side === 'enemy') restoreSpeed(u);
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORE TICK — THE TACTICAL STATE MACHINE
  // ─────────────────────────────────────────────────────────────────────────

  function tick() {
    // ── Guard: battle must still be active ──────────────────────────────
    const isBattle = (typeof W.MobileControls !== 'undefined')
      ? W.MobileControls.G.isBattle()
      : (W.battleEnvironment && W.battleEnvironment.isActive);

    if (!isBattle || !isAllowedBattle()) {
      teardown();
      return;
    }

    // ── Refresh living unit lists every tick ────────────────────────────
    const enemyUnits  = getEnemyUnits();
    const playerUnits = getPlayerUnits();

    // Armies exhausted → clean up
    if (enemyUnits.length === 0 || playerUnits.length === 0) {
      teardown();
      return;
    }

    const playerCentroid = centroid(playerUnits);

    // ════════════════════════════════════════════════════════════════════
    // PHASE 1: MARCHING — Cohesive Advance
    // ════════════════════════════════════════════════════════════════════
    if (_phase === 'MARCHING') {
      // Re-issue march orders every tick to track a moving centroid
      executePhaseMarching(enemyUnits, playerCentroid);

      // Distance check — find closest enemy-to-player pair
      const closestDist = minDistanceBetweenArmies(enemyUnits, playerUnits);

      if (closestDist <= DIST_SKIRMISH) {
        _phase         = 'SKIRMISHING';
        _skirmishTicks = 0;
        executePhaseSkirmish(enemyUnits);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // PHASE 2: SKIRMISHING — Hold line, ranged free-fires
    // ════════════════════════════════════════════════════════════════════
    else if (_phase === 'SKIRMISHING') {
      _skirmishTicks++;

      // Only measure distance for the melee/cav "shield wall"
      const meleeDist = minDistanceBetweenArmies(
        enemyUnits,
        playerUnits,
        role => !isRangedRole(role) // only non-ranged participate in the check
      );

      const hardTimerExpired = _skirmishTicks >= SKIRMISH_MAX_TICKS;
      const enemiesOverrun   = meleeDist <= DIST_CHARGE;

      if (hardTimerExpired || enemiesOverrun) {
        _phase = 'CHARGING';
        executePhaseCharge(enemyUnits);
        // State machine is terminal after charge — let teardown handle the rest
        teardown(); // also clears interval
      }
      // else: hold current orders (no re-issue needed during skirmish phase)
    }

    // ════════════════════════════════════════════════════════════════════
    // PHASE 3: CHARGING — handled by executePhaseCharge, interval already cleared
    // ════════════════════════════════════════════════════════════════════
    // (unreachable after teardown, kept for clarity)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * EnemyTacticalAI.start()
   *   Call this when a land or naval battle begins.
   *   Safe to call multiple times — will restart cleanly.
   */
  function start() {
    if (!isAllowedBattle()) {
      // Siege or unsupported battle type — do nothing
      return;
    }

    teardown(); // idempotent reset if called mid-battle
    _phase         = 'MARCHING';
    _skirmishTicks = 0;

    // Issue first march orders immediately (don't wait for first tick)
    const enemyUnits  = getEnemyUnits();
    const playerUnits = getPlayerUnits();
    if (enemyUnits.length > 0 && playerUnits.length > 0) {
      executePhaseMarching(enemyUnits, centroid(playerUnits));
    }

    _tickInterval = setInterval(tick, TICK_MS);
  }

  /**
   * EnemyTacticalAI.stop()
   *   Call this to abort the AI mid-battle (e.g., scripted cutscene,
   *   battle-won event, or switching to a siege map).
   */
  function stop() {
    teardown();
  }

  /**
   * EnemyTacticalAI.getPhase()
   *   Returns the current phase string for debugging/HUD display.
   *   Possible values: 'IDLE' | 'MARCHING' | 'SKIRMISHING' | 'CHARGING'
   */
  function getPhase() {
    return _phase;
  }

  // Expose on window so other engine files can call it
  W.EnemyTacticalAI = { start, stop, getPhase };

})(window, document);


/*
 * ═══════════════════════════════════════════════════════════════════════════
 * INTEGRATION GUIDE — How to hook enemyTacticalAI.js into your engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── STEP 1: Load the script ─────────────────────────────────────────────
 *
 *   In your HTML (or your script loader inside battlefield_launch.js):
 *
 *     <script src="enemyTacticalAI.js"></script>
 *
 *   It must load AFTER the engine sets up window.battleEnvironment
 *   but BEFORE the battle-start event fires. A safe place is right
 *   after your existing autoAttack.js tag:
 *
 *     <script src="autoAttack.js"></script>
 *     <script src="enemyTacticalAI.js"></script>
 *
 *
 * ── STEP 2: battlefield_launch.js — Start the AI on battle begin ────────
 *
 *   Find (or create) the callback that fires when a land/naval battle
 *   initialises — commonly called onBattleStart, initBattle, or similar.
 *
 *   ADD one line:
 *
 *     function onBattleStart(battleData) {
 *       // ... your existing setup code ...
 *
 *       EnemyTacticalAI.start();   // ← ADD THIS
 *     }
 *
 *
 * ── STEP 3: battlefield_logic.js — Stop the AI on battle end ────────────
 *
 *   Find the battle-end / victory / defeat handler and add:
 *
 *     function onBattleEnd(result) {
 *       // ... your existing teardown ...
 *
 *       EnemyTacticalAI.stop();    // ← ADD THIS
 *     }
 *
 *   This prevents the interval from running on a post-battle results
 *   screen or during a transition back to the campaign map.
 *
 *
 * ── STEP 4: update.js — Optional per-frame sync (advanced) ─────────────
 *
 *   If your engine runs a main update loop that already refreshes
 *   unit positions, you can query the phase for HUD/debug overlays:
 *
 *     function updateLoop(dt) {
 *       // ... existing update code ...
 *
 *       if (DEBUG_MODE) {
 *         console.log('[EnemyAI Phase]', EnemyTacticalAI.getPhase());
 *       }
 *     }
 *
 *   The AI is entirely self-ticking (setInterval) and does NOT need to
 *   be called from your update loop — this is purely informational.
 *
 *
 * ── STEP 5: troop_system.js — Siege exclusion double-lock (recommended) ─
 *
 *   If your troop system already tags siege units, ensure the flag is
 *   set before battle start so our filter catches them:
 *
 *     // When spawning a siege unit:
 *     unit.isSiege = true;
 *     // AND / OR set:
 *     unit.stats.role = 'CATAPULT';  // any string in the SIEGE_ROLES set
 *
 *   Both flags are checked — either one is sufficient to exclude the unit.
 *
 *
 * ── STEP 6: ai_categories.js — Role accuracy check (recommended) ────────
 *
 *   Register a global resolver so EnemyTacticalAI uses your canonical
 *   role data instead of the fallback string-parser:
 *
 *     // In ai_categories.js or your unit-definition bootstrap:
 *     window.getTacticalRole = function(unit) {
 *       // Return one of: 'CAVALRY' | 'RANGED' | 'GUNPOWDER' | 'INFANTRY'
 *       return unit.aiCategory || unit.stats.role || 'INFANTRY';
 *     };
 *
 *   If window.getTacticalRole is absent, EnemyTacticalAI falls back to
 *   parsing unit.stats.role strings automatically — no crash, just less
 *   precision if your role strings differ from the built-in lookup set.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
