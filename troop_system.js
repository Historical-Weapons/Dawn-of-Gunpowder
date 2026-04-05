const globalSettings = { formatNumbersWithCommas: false };

const ROLES = {
    GUNNER: "gunner", 
    SHIELD: "shield", 
    PIKE: "pike",
    ARCHER: "archer", 
    CAVALRY: "cavalry", 
    INFANTRY: "infantry",
    TWO_HANDED: "two_handed", 
    FIRELANCE: "firelance",
    BOMB: "bomb", 
    THROWING: "throwing", 
    HORSE_ARCHER: "horse_archer",
    CROSSBOW: "crossbow",
	MOUNTED_GUNNER: "mounted_gunner",
	ROCKET: "Rocket" 
};

// --- NEW: ARMOR CLASSIFICATION SYSTEM ---
// 0-5: Cloth/Unarmored | 5-10: Gambeson/Leather | 10-20: Partial Lamellar | 20+: Full Lamellar/Heavy
const ARMOR_TIERS = {
    CLOTH: 2,             // Peasant clothes, bare minimum
    LEATHER: 8,           // Gambeson, hardened leather, organic
    PARTIAL_LAMELLAR: 15, // Chest plate + helmet, decent protection
    FULL_LAMELLAR: 25,    // Full suit of heavy lamellar armor
    SUPER_HEAVY: 40,      // Barded horses, elite cataphracts
    JUGGERNAUT: 60        // War Elephants, massive natural armor
};

// --- NEW: PHYSICAL WEIGHT CLASSES ---
// Tier determines who pushes who (Light cannot push Heavy). 
// Mass determines push ratio if tiers are equal.
// Radius determines how much physical space they take up.
const WEIGHT_CLASSES = {
    LIGHT_INF: { tier: 1, mass: 10,  radius: 5 },   // Peasants, Archers
    HEAVY_INF: { tier: 2, mass: 25,  radius: 7 },   // Armored Infantry, Pikemen
    CAV:       { tier: 3, mass: 80,  radius: 10 },  // Standard horses
    HEAVY_CAV: { tier: 4, mass: 150, radius: 12 },  // Barded Cataphracts
    ELEPHANT:  { tier: 5, mass: 500, radius: 18 }   // Unmovable Behemoths
};

class Troop {
    constructor(name, role, isLarge, faction = "Generic") 
	{
        this.name = name;
        this.role = role;
        this.isLarge = isLarge;
        this.faction = faction;
        
		// Default fallbacks (will be overwritten by the roster)
        this.weightTier = WEIGHT_CLASSES.LIGHT_INF.tier;
        this.mass = WEIGHT_CLASSES.LIGHT_INF.mass;
        this.radius = WEIGHT_CLASSES.LIGHT_INF.radius;
		
		
		this.level = 1; this.morale = 20; this.maxMorale = 20; this.stamina = 100; this.health = 100; this.meleeAttack = 10; this.meleeDefense = 10;
        this.armor = ARMOR_TIERS.CLOTH; this.shieldBlockChance = 0; this.bonusVsLarge = 0;  this.isRanged = false; this.ammo = 0; this.accuracy = 0; this.reloadSpeed = 0; this.missileBaseDamage = 0; this.missileAPDamage = 0;
		this.speed = 0.8;  this.range = 20; 
        this.currentStance = "statusmelee"; 
    }
	
gainExperience(amount) {//troop non player version of gain exp
    if (this.experienceLevel >= 10) return; // Cap level at 10

    // 1. Add to a dedicated experience pool, NOT the level itself
    this.experience = (this.experience || 0) + (amount*5);

    // 2. Define how much is needed for the NEXT level
    // Formula: Level 1 needs 1.0, Level 2 needs 2.0, Level 3 needs 3.0...
    let expNeeded = this.experienceLevel * 1.0; 

    // 3. Level up logic with a "While" loop to handle large XP gains correctly
    while (this.experience >= expNeeded && this.experienceLevel < 10) {
        this.experience -= expNeeded; // Consume the XP
        this.experienceLevel++;
        
        // Boost stats on level up
        this.meleeAttack += 2;
        this.meleeDefense += 2;
        this.health = Math.min(this.maxHealth || 100, this.health + 10);
        
        console.log(`${this.name} reached Level ${this.experienceLevel}!`);
        
        // Update requirement for the NEXT level in the loop
        expNeeded = this.experienceLevel * 1.0;
    }
}

    updateStance(targetDistance) {
        if (!this.isRanged) {
            this.currentStance = "statusmelee";
            return;
        }
        const MELEE_ENGAGEMENT_DISTANCE = 15;
        if (this.ammo <= 0 || targetDistance <= MELEE_ENGAGEMENT_DISTANCE) {
            this.currentStance = "statusmelee";
        } else {
            this.currentStance = "statusrange";
        }
    }
}

const UnitRoster = {
    allUnits: {},
    
    // --- EMBEDDED HIERARCHY DATA (Synced with GUI) ---
    hierarchy: {
        militia: {
            crossbow_line:   ["Crossbowman", "Heavy Crossbowman"],
            spear_line:      ["Javelinier", "Firelance", "Heavy Firelance"],
            archer_line:     ["Archer", "Horse Archer", "Heavy Horse Archer"],
            sabre_line:      ["Shielded Infantry", "Light Two Handed", "Heavy Two Handed"],
            scout_line:      ["Spearman", "Lancer", "Heavy Lancer"],
            specialist_line: ["Bomb", "Hand Cannoneer"] // Moved Bomb to branch directly from Militia
        },
        faction_uniques: {
            korean: "Rocket",
            mongol: "Keshig",
            jurchen: "Elite Lancer",
            xia: "Camel Cannon",
            viet: "Poison Crossbowman",
            persian: "War Elephant",
            hong: "Repeater Crossbowman",
            tibetan: "Slinger",
            japanese: "Glaiveman"
        }
    },

    getAvailableUpgrades: function(currentType) {
        let upgrades = [];
        
        if (currentType === "Militia") {
            for (let line in this.hierarchy.militia) {
                upgrades.push(this.hierarchy.militia[line][0]);
            }
            return upgrades; 
        }
        
        for (let line in this.hierarchy.militia) {
            let arr = this.hierarchy.militia[line];
            let idx = arr.indexOf(currentType);
            if (idx !== -1 && idx < arr.length - 1) {
                upgrades.push(arr[idx + 1]);
                return upgrades; 
            }
        }
        
        return upgrades; 
    },

    create: function(id, name, role, isLarge, stats, faction = "Generic") {
        let t = new Troop(name, role, isLarge, faction);
        Object.assign(t, stats);
	// ---> INSERT NEW DESCRIPTION LOGIC <---
        t.desc = stats.desc || "Unit Description";	
		// 2. ---> INSERT THE NEW WEIGHT LOGIC HERE <---
    // This maps the WEIGHT_CLASSES object data onto the individual unit
    if (stats.weightClass) {
        t.weightTier = stats.weightClass.tier;
        t.mass = stats.weightClass.mass;
        t.radius = stats.weightClass.radius;
    }
		
        t.morale = stats.morale || 20; 
        t.maxMorale = stats.morale || 20;
        t.currentStance = t.isRanged ? "statusrange" : "statusmelee"; 
        
        // Auto-Balancing Logic for Ranged Hybrids
        if (t.isRanged) {
            t.meleeAttack = Math.floor(t.meleeAttack * 0.85); 
            t.meleeDefense = Math.floor(t.meleeDefense * 0.85);
            const isCannonWeapon = t.name.toLowerCase().includes("cannon") || t.name.toLowerCase().includes("fire");
            if (!isCannonWeapon) {
                t.missileBaseDamage = Math.floor(t.missileBaseDamage * 0.7);
                t.missileAPDamage = Math.floor(t.missileAPDamage * 0.7);
            }
        } 
        this.allUnits[id] = t;
    },
    
init: function() {
    // --- BASE MILITIA (Tier 0) ---
    this.create("Militia", "Militia", ROLES.INFANTRY, false, { desc: "Drawn from the agrarian backbone, these peasant conscripts are hastily armed with farming implements and sometimes with improvised baskets, furniture pieces, or potlids as makeshift shields. Though lacking martial discipline or equipment, they were great at soaking up enemy volleys or intimidate bandits, before the professional armies arrive.", weightClass: WEIGHT_CLASSES.LIGHT_INF, health: 80, meleeAttack: 5, meleeDefense: 1, armor: ARMOR_TIERS.CLOTH, speed: 1.1, range: 15, morale: 5, cost: 20 });

    // --- CROSSBOW LINE ---
    this.create("Crossbowman", "Crossbowman", ROLES.CROSSBOW, false, { desc: "Crossbows were mass-produced during the Han dynasty. They became popular again in the Song dynasty. According to the Wujing Zongyao, crossbows deployed en masse were the most effective weapon against northern nomadic cavalry. Even when shots failed to hit their target, the quarrels were too short to be reused as regular arrows, preventing the nomads from turning captured ammunition against Song forces. Crossbow ammunition was cheaper than arrows due to wider spine tolerances, and they do not need/want to carve out nocks or glue feathers to mass produce. Typical Song crossbows doubled the kinetic energy of bows while being significantly slower to reload. Engagement distances of crossbows are often higher than bows.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 100, meleeAttack: 10, meleeDefense: 5, missileBaseDamage: 12, missileAPDamage: 28, accuracy: 95, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.7, range: 800, morale: 50, cost: 50 });
    this.create("Heavy Crossbowman", "Heavy Crossbowman", ROLES.CROSSBOW, false, { desc: "Skilled marksmen wielding the Divine Arm Crossbows. Clad in overlapping iron lamellar for protection, these veterans anchor the rearguard. Their mechanical weapons strike a fine balance between draw weight and power stroke, capable of penetrating even the best lamellar armor. The longer draw of the prod compared to contemporary European crossbows, allows a lesser draw weight, while having comparable potential energy.", weightClass: WEIGHT_CLASSES.HEAVY_INF, isRanged: true, ammo: 25, health: 140, meleeAttack: 14, meleeDefense: 14, missileBaseDamage: 15, missileAPDamage: 30, accuracy: 95, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.4, range: 820, morale: 65, cost: 70 });
    this.create("Bomb", "Bomb", ROLES.BOMB, false, { desc: "Thrown by hand or via a staff sling, the 'Thunder Crash Bomb' was an early blackpowder bomb first depicted in a late 12th century artwork 揭缽圖卷, though some historians have argued a much earlier date of around 950AD with controversy. The 13th century version were iron-cased explosives packed with fast burning black powder. Ignited with a slow match, these volatile bombs produce a concussive shockwave and flesh-tearing shrapnel, capable of shattering enemy morale and weakening tight infantry squares. However early bombs of this era were not particularly lethal and still required a decisive melee.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 2, health: 80, meleeAttack: 8, meleeDefense: 8, missileBaseDamage: 50, missileAPDamage: 10, accuracy: 50, armor: ARMOR_TIERS.CLOTH, speed: 0.9, range: 330, morale: 100, cost: 105 });

    // --- SPEAR LINE ---
    this.create("Spearman", "Spearman", ROLES.PIKE, false, { desc: "Armed with long, cost-effective spears and drilled in rigid, disciplined formations, these infantrymen are trained to plant their weapons firmly against charging cavalry, creating a deadly wall of wood and steel. While versatile polearms like the halberd existed, they were far less common during this period, making the spear the backbone of frontline infantry. Most spearmen lacked proper side arms and would often carry improvised sidearms like daggers, tools or clubs.", weightClass: WEIGHT_CLASSES.HEAVY_INF, health: 100, meleeAttack: 14, meleeDefense: 16, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, bonusVsLarge: 20, speed: 0.80, range: 30, morale: 55, cost: 25 });
    this.create("Firelance", "Firelance", ROLES.FIRELANCE, false, { desc: "Pioneers of early gunpowder warfare. These shock troops wield the early firelance — a spear strapped with a bamboo or paper tube packed with incendiary blackpowder as early as 950 AD in Dunhuang depictions. Upon closing with the enemy, they unleash a terrifying torrent of flame, smoke, and debris, burning faces and scaring horses before thrusting with the lethal component - the spearhead. Around 1233 from the History of Jin, the Jin troops attacked the Mongols with firelances. Pucha Guannu divided his soldiers into teams of 50 to 70, each in a small boat, ordering them to advance to the Mongol camp and attack it from all sides. Carrying their fire lances, the Jin soldiers launched a sudden attack which the Mongols were unable to resist. It was a great defeat, for in all 3500 Mongols were drowned in the river.", weightClass: WEIGHT_CLASSES.HEAVY_INF, isRanged: true, ammo: 1, health: 100, meleeAttack: 16, meleeDefense: 14, missileBaseDamage: 14, missileAPDamage: 45, accuracy: 55, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.7, range: 30, morale: 60, cost: 50 });
    this.create("Heavy Firelance", "Heavy Firelance", ROLES.FIRELANCE, false, { desc: "Elite shock troops equipped with 2 reinforced tubes strapped on a lance. Encased in iron lamellar to survive the vanguard clash, their weapons discharge a blackpowder based fire, melting enemy morale. It wasn't until the 13th century that pellets were recorded with wadding to be used with the firelances. From History of Jin: to make the lance, use chi-huang paper, sixteen layers of it for the tube, and make it a bit longer than two feet. Stuff it with willow charcoal, iron fragments, magnet ends, sulfur, white arsenic and other ingredients, and put a fuse to the end. Each troop has hanging on him a little iron pot to keep fire, and when it's time to do battle, the flames shoot out the front of the lance more than ten feet, and when the gunpowder is depleted, the tube isn't destroyed.", weightClass: WEIGHT_CLASSES.HEAVY_INF, isRanged: true, ammo: 2, health: 140, meleeAttack: 20, meleeDefense: 20, missileBaseDamage: 20, missileAPDamage: 60, accuracy: 60, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.55, range: 30, morale: 70, cost: 80 });

    // --- ARCHER LINE ---
    this.create("Archer", "Archer", ROLES.ARCHER, false, { desc: "Foot archers in the Sinosphere loosed faster than crossbowmen but relied on typically more expensive ammunition due to the spine tolerances, feather fletchings, and nock design requirements compared to cheap crossbow bolts. Archers often delivered less kinetic energy than Chinese crossbows even with a higher powerstroke. because the lower draw weight. A typical Song dynasty crossbow can be around 280lbs with moderate powerstroke while the average archer was likely less than 100lbs. Draw weight and bow design varied by faction and experience, affecting range and strength. Used to harass, soften enemy lines, and cover skirmishers, they were valued for mobility and sustained volleys despite logistical demands for sustained fire.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 20, health: 100, meleeAttack: 8, meleeDefense: 10, missileBaseDamage: 13, missileAPDamage: 4, accuracy: 75, armor: ARMOR_TIERS.LEATHER, speed: 0.85, range: 700, morale: 50, cost: 45 });
    this.create("Horse Archer", "Horse Archer", ROLES.HORSE_ARCHER, true, { desc: "Trained from youth to shoot on horseback often controlling the horse merely with their legs, they are capable of shooting 360 degrees. Highly mobile and disciplined, they control the battlefield by harassing flanks, disrupting supply lines, and raining relentless volleys of arrows on enemy infantry while staying safely out of reach. Their speed and precision make them a constant threat, dictating the flow of combat across open terrain wearing light armor.", weightClass: WEIGHT_CLASSES.CAV, isRanged: true, ammo: 20, health: 120, meleeAttack: 12, meleeDefense: 12, missileBaseDamage: 11, missileAPDamage: 4, accuracy: 60, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 1.6, range: 700, morale: 60, cost: 70 });
    this.create("Heavy Horse Archer", "Heavy Horse Archer", ROLES.HORSE_ARCHER, true, { desc: "Melding the nomadic mastery of the composite bow with the metallurgical wealth of conquered empires. Clad in heavy iron lamellar, they possess the durability to weather enemy archer volleys, allowing them to skirmish but also fight well in a melee.", weightClass: WEIGHT_CLASSES.HEAVY_CAV, isRanged: true, ammo: 20, health: 150, meleeAttack: 16, meleeDefense: 18, missileBaseDamage: 11, missileAPDamage: 6, accuracy: 65, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 1.3, range: 700, morale: 70, cost: 85 });

    this.create("General", "General", ROLES.HORSE_ARCHER, true, { desc: "A master strategist shaped by the teachings of Sun Tzu and other military classics, this commander serves as the mind of the army. Surrounded by signal flags, war drums, and elite bodyguards, his presence steadies wavering lines and keeps the intricate machinery of a 13th-century combined-arms force running smoothly. Yet beyond the battlefield, most of their days are consumed by bureaucracy and paperwork, the unseen burden of command. Not expected to be in combat, the general often wears medium armor for comfort.", weightClass: WEIGHT_CLASSES.HEAVY_CAV, isRanged: true, ammo: 24, health: 140, meleeAttack: 22, meleeDefense: 5, missileBaseDamage: 14, missileAPDamage: 8, accuracy: 72, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 1.2, range: 700, morale: 95, cost: 150 });

    // --- SABRE LINE ---
    this.create("Shielded Infantry", "Shielded Infantry", ROLES.SHIELD, false, { desc: "A common foot soldier, wearing light armor and carrying large protective shields. Their main role is to absorb enemy attacks and hold the line, acting as mobile screens for the rest of the army. Quick and resilient, they draw enemy projectiles and charges, giving archers, skirmishers, and heavier troops the freedom to strike while the front line takes the brunt of combat. The sabre is considered a self defence weapon in this context, as their main role is to screen projectiles particularly against horse archers.", weightClass: WEIGHT_CLASSES.HEAVY_INF, health: 150, meleeAttack: 9, meleeDefense: 15, armor: ARMOR_TIERS.LEATHER, shieldBlockChance: 25, speed: 0.5, range: 20, morale: 60, cost: 30 });
    this.create("Light Two Handed", "Light Two Handed", ROLES.TWO_HANDED, false, { desc: "Agile shock infantry armed with two handed sabers. Lacking heavy armor, these fearless warriors are deployed specifically to flank and deliver shock, using sweeping, two-handed strikes to cause terror.", weightClass: WEIGHT_CLASSES.LIGHT_INF, health: 100, meleeAttack: 30, meleeDefense: 12, armor: ARMOR_TIERS.LEATHER, speed: 0.7, range: 20, morale: 65, cost: 55 });
    this.create("Heavy Two Handed", "Heavy Two Handed", ROLES.TWO_HANDED, false, { desc: "Imposing heavy infantry clad in lamellar armor and wielding large two-handed blades, these warriors were often elite troops demonstrating skill and status as much as battlefield effectiveness. The sheer size of their weapons made sustained combat exhausting and their practicality questionable. While their strength and sweeping strikes could disrupt enemy cohesion, their role was as much about intimidation, status, and spectacle than practical battlefield efficiency.", weightClass: WEIGHT_CLASSES.HEAVY_INF, health: 125, meleeAttack: 36, meleeDefense: 16, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 0.65, range: 20, morale: 75, cost: 90 });

    // --- SCOUT LINE ---
    this.create("Lancer", "Lancer", ROLES.CAVALRY, true, { desc: "Nimble cavalry reliant on speed used throughout Asia to exploit gaps in the enemy line, chase down routing skirmishers, and deliver flanking charges that can break the enemy's formation through speed and momentum. They are lightly armored relative to the elites.", weightClass: WEIGHT_CLASSES.CAV, health: 100, meleeAttack: 18, meleeDefense: 14, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 1.7, range: 25, morale: 60, cost: 60 });
    this.create("Heavy Lancer", "Heavy Lancer", ROLES.CAVALRY, true, { desc: "Heavy lancers wore lamellar armor while riding unarmored horses for maximum mobility. Wielding long, iron-tipped lances, they excel at charging enemy formations with precision, capable of breaking infantry lines or scattering lighter cavalry. Disciplined and veteran, these cavalrymen form the spearhead of frontier armies, using speed, timing, and armored resilience to dominate the battlefield at the right time.", weightClass: WEIGHT_CLASSES.HEAVY_CAV, health: 150, meleeAttack: 24, meleeDefense: 20, armor: ARMOR_TIERS.FULL_LAMELLAR, speed: 1.5, range: 25, morale: 75, cost: 90 });
    this.create("Elite Lancer", "Elite Lancer", ROLES.CAVALRY, true, { desc: "Elite Jin heavy lancers are often drawn from the dynasty’s best frontier cavalry individuals; clad in the finest lamellar armor and mounted on some of the best horses of this region, they are trained to charge with heavy lances combining the shock of cavalry with disciplined formation tactics, capable of smashing infantry lines or breaking lighter cavalry. Their mobility, discipline, and armored protection made them an elite striking force on the northern frontiers.", weightClass: WEIGHT_CLASSES.HEAVY_CAV, health: 200, meleeAttack: 28, meleeDefense: 24, armor: ARMOR_TIERS.SUPER_HEAVY + 5, speed: 1.0, range: 25, morale: 85, cost: 150 }); 

    // --- FACTION UNIQUES ---
    this.create("Rocket", "Rocket", ROLES.ROCKET, false, { desc: "Operators of early solid-propellant rocketry, such as the Fei Huo Qiang. While hopelessly inaccurate, these rudimentary missiles screech across the battlefield in terrifying volleys, trailing fire and smoke. Their primary utility lies in causing widespread panic, triggered by the action of one igniter.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 80, meleeAttack: 8, meleeDefense: 8, missileBaseDamage: 5, missileAPDamage: 1, accuracy: 15, armor: ARMOR_TIERS.CLOTH, speed: 0.4, range: 1020, morale: 15, cost: 100 });
    this.create("Keshig", "Keshig", ROLES.HORSE_ARCHER, true, { desc: "The legendary elite cavalry of the Mongol Empire. Hand-picked for their supreme combat skills, experience, and loyalty, they were the imperial guard and shock troops for royalty in the Mongol Empire. Their primary purpose was to act as bodyguards for emperors and other nobles. They were divided into two subgroups: the day guard (Torguud) and the night guard (Khebtuul).", weightClass: WEIGHT_CLASSES.HEAVY_CAV, isRanged: true, ammo: 35, health: 145, meleeAttack: 18, meleeDefense: 16, missileBaseDamage: 14, missileAPDamage: 8, accuracy: 75, armor: ARMOR_TIERS.SUPER_HEAVY, speed: 1.8, range: 700, morale: 80, cost: 145 });
    this.create("Hand Cannoneer", "Hand Cannoneer", ROLES.GUNNER, false, { desc: "Although the earliest archaeological evidence of a cannon dates to the Xia period in the early 13th century, it was not until the late 13th century that truly portable firearms appeared, such as the Heilongjiang hand cannon. The development of faster-burning gunpowder mixtures—far more explosive than the earlier, slower-burning formulas—was the key breakthrough that made these weapons practical. Though inaccurate and prone to misfire, these brave infantrymen unleash thunderous blasts of lead and scrap metal. The concussive roar and choking smoke terrify enemy troops and horses alike, heralding cannon warfare, even if they don't hit anything.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 100, meleeAttack: 10, meleeDefense: 12, missileBaseDamage: 25, missileAPDamage: 50, accuracy: 35, armor: ARMOR_TIERS.CLOTH, speed: 0.75, range: 800, morale: 70, cost: 60 });
    this.create("Camel Cannon", "Camel Cannon", ROLES.MOUNTED_GUNNER, true, { desc: "Probably the oldest archaeological find of a true gun, the Wuwei cannon was unearthed near Wuwei in modern Gansu and dated to around 1220 AD, within the arid domains of the Western Xia. Earlier gunpowder mixtures burned slowly and were used mainly in incendiary weapons—more akin to flamethrowers and fire lances than true firearms. The later development of faster-burning, more explosive powder made weapons like the Wuwei cannon possible. Likely requiring horses or camels to haul across positions, these cumbersome guns offered unprecedented mobile artillery, capable of hurling devastating—if wildly inaccurate—cannonballs into dense enemy formations.", weightClass: WEIGHT_CLASSES.CAV, isRanged: true, ammo: 60, health: 150, meleeAttack: 12, meleeDefense: 14, missileBaseDamage: 35, missileAPDamage: 80, accuracy: 40, armor: ARMOR_TIERS.CLOTH, speed: 0.2, range: 850, morale: 80, cost: 80 });
    this.create("Poison Crossbowman", "Poison Crossbowman", ROLES.CROSSBOW, false, { desc: "Stealthy auxiliaries often drawn from the southern tropical frontiers of Dai Viet or tribal mountain regions. They coat their crossbow bolts in potent, naturally derived neurotoxins like aconite, which does not need a powerful prod. Even a glancing flesh wound from their weapons can paralyze and kill, making them a psychological nightmare for advancing infantry.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 80, meleeAttack: 10, meleeDefense: 12, missileBaseDamage: 60, missileAPDamage: 1, accuracy: 90, armor: ARMOR_TIERS.CLOTH, speed: 0.8, range: 400, morale: 55, cost: 45 });
    this.create("War Elephant", "War Elephant", ROLES.CAVALRY, true, { desc: "Deployed by southern powers like the Dali, these Asian behemoths are the ultimate psychological weapon, trampling men and scaring warhorses.", weightClass: WEIGHT_CLASSES.ELEPHANT, health: 500, meleeAttack: 35, meleeDefense: 20, armor: ARMOR_TIERS.JUGGERNAUT, speed: 0.9, range: 25, morale: 30, cost: 500 });
    this.create("Repeater Crossbowman", "Repeater Crossbowman", ROLES.CROSSBOW, false, { desc: "The first evidence of repeating crossbows date back as early as ~400 BC, with archaeological finds showing an early push pull action design so small that they are more akin to personal defence weapons. They were not invented by Zhuge Liang as later legend claims. Instead, he is traditionally credited with improving or popularizing the weapon centuries later. The familiar lever-operated repeating crossbow in pop culture today, is the design most people know, which simplified the mechanism to draw, load, and release bolts in a single motion without complicated internal sear triggers unlike the Chinese bronze age repeater. While lacking the armor-piercing strength of standard crossbows, these weapons could unleash a rapid hail of bolts in seconds, making them highly effective for suppressing enemies at close range, though rarely lethal.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 50, health: 100, meleeAttack: 10, meleeDefense: 10, missileBaseDamage: 15, missileAPDamage: 1, accuracy: 65, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.85, range: 500, morale: 65, cost: 45 });
    this.create("Slinger", "Slinger", ROLES.THROWING, false, { desc: "These slingers came from the hardy mountain auxiliaries from the Tibetan plateau and still use them today for herding animals. Though their weapons appear primitive, they can launch stones with bone-shattering force. These warriors serve as a cost-effective screen of skirmishers, raining blunt-force trauma upon the enemy before fading back into the mountains. The concept of slings was so foreign to the Chinese that there was no character for it, yet the staff sling found its place in warfare, used to hurl stones and bombs with deadly effect.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 30, health: 80, meleeAttack: 6, meleeDefense: 8, missileBaseDamage: 5, missileAPDamage: 2, accuracy: 30, armor: ARMOR_TIERS.CLOTH, speed: 1.0, range: 650, morale: 40, cost: 20 });
    this.create("Glaiveman", "Glaiveman", ROLES.INFANTRY, false, { desc: "Highly disciplined warriors wielding the naginata, a curved blade mounted on a long shaft. Combining the reach of a spear with the cutting power of a sword, the naginata remained a staple of 13th-century Japanese warfare because it allowed mounted or foot soldiers to counter cavalry while still delivering lethal slashing strikes. These infantrymen are versatile combatants, capable of holding the line against charging horsemen or carving a bloody path through tightly packed enemy formations.", weightClass: WEIGHT_CLASSES.HEAVY_INF, health: 100, meleeAttack: 30, meleeDefense: 6, armor: ARMOR_TIERS.PARTIAL_LAMELLAR, speed: 0.75, range: 30, morale: 65, cost: 65 });
    
    this.create("Javelinier", "Javelinier", ROLES.THROWING, false, { desc: "Fast-moving tribal skirmishers from the southern fringes of the empire. Though rarely depicted in Han-dominated warfare — where crossbows were preferred — javelinmen were sometimes employed by bandits, rebels, irregulars, and non-Han ethnic groups throughout the Sinosphere due to the simplicity and utility as melee weapons. They sometimes hurled poison-tipped javelins. Their hit-and-run tactics are essential for exhausting and disrupting the enemy before the true melee begins.", weightClass: WEIGHT_CLASSES.LIGHT_INF, isRanged: true, ammo: 4, health: 120, meleeAttack: 15, meleeDefense: 20, missileBaseDamage: 18, missileAPDamage: 15, accuracy: 70, armor: ARMOR_TIERS.CLOTH, speed: 0.75, range: 150, morale: 50, cost: 65 });
}
};
UnitRoster.init(); 
 window.UnitRoster = UnitRoster; // <--- ADD THIS LINE


function getTacticalPosition(role, side, unitType) {
    let offsetX = 0;
    let offsetY = 0;
    let dir = (side === "player") ? -1 : 1;

    // 3. TACTICAL FORMATION LOGIC (Historical Setup)
    switch(role) {
        // --- FRONT LINE: MELEE INFANTRY ---
        // Tightened from 80 to 45 to close the gap to the ranged units
        case ROLES.SHIELD:
        case ROLES.PIKE:
        case ROLES.INFANTRY: 
        case ROLES.TWO_HANDED:
            offsetY = (45 * dir) + (Math.random() * 10 - 5); 
            break;

        // --- SECOND LINE: RANGED & SPECIALISTS ---
        // Tightened from 30 to 15 to stay immediately behind the infantry
        case ROLES.THROWING:
        case ROLES.GUNNER:
        case ROLES.CROSSBOW:
        case ROLES.ARCHER:
        case ROLES.FIRELANCE:
        case ROLES.BOMB:
        case ROLES.ROCKET:
            offsetY = (15 * dir) + (Math.random() * 6 - 3);
            break;

        // --- FLANKS: CAVALRY, CAMELS, ELEPHANTS ---
        // Cavalry is now centered vertically with the army core (0 offset)
        case ROLES.CAVALRY:
        case ROLES.HORSE_ARCHER:
        case ROLES.MOUNTED_GUNNER:
            offsetY = (0 * dir) + (Math.random() * 10 - 5);
            
            let flankSide = (Math.random() > 0.5) ? 1 : -1;
            let isHeavy = unitType && (unitType.includes("Elephant") || unitType.includes("Cannon"));
            
            // Fixed base width to keep them out of the center-line's way
            let baseFlankX = isHeavy ? 400 : 320;
            offsetX = (flankSide * baseFlankX) + (Math.random() * 40 - 20); 
            break;

        // --- REARGUARD / COMMANDER / UNKNOWN ---
        // Moved from -80 to -25. This puts the commander right behind the archers.
        default:
            offsetY = (-25 * dir) + (Math.random() * 4 - 2);
            break;
    }
    
    // 4. FINAL MICRO-JITTER
    // Restricting jitter to sub-pixel levels to maintain the grid feel
    offsetX += (Math.random() * 2 - 1);
    offsetY += (Math.random() * 2 - 1);

    return { x: offsetX, y: offsetY };
}
// ============================================================================
// BATTLE RESOLUTION & SUMMARY UI
// ============================================================================
 
function getReloadTime(unit) {
	
	    if (!unit || !unit.stats) return 60;
		
    const role = unit.stats.role;
    const name = unit.unitType;
	// Unit Type           | Time
// ------------------- | ------------------------
// Melee               | 1.0 sec
// Throwing            | 2.0 sec
// Archer              | 2.5 sec
// Crossbow            | 2.5 sec
// Repeater burst      | 0.5 sec (10 shots) then 8 second magazine reload
// Repeater full cycle | same as crossbow
// Bomb                | 5.8 sec
// Rocket              | near instant
 

    if (name === "Rocket") return 15;
    if (name === "Repeater Crossbowman") return 300;
    
    if (role === ROLES.ARCHER || role === ROLES.HORSE_ARCHER) return 150;
    if (role === ROLES.CROSSBOW) return 300;
    if (role === ROLES.GUNNER || role === ROLES.MOUNTED_GUNNER) return 300; 
    if (role === ROLES.FIRELANCE) return 80;
    if (role === ROLES.THROWING) return 120;
    if (role === ROLES.BOMB) return 250;

	if (!unit.isRanged) {
		if (role === ROLES.TWO_HANDED) return 80;
		if (role === ROLES.SHIELD) return 50;
		if (role === ROLES.CAVALRY) return 70;
		return 60;
	}


    return 60; 
}

    let lastSortTime = 0;
    const SORT_INTERVAL = 100; 
	let sortedUnitsCache = []; // Store the sorted copy here
 
function drawBattleUnits(ctx) {
	
	// ---> ADD THIS FIX: Render Wagons before units so they sit on the ground <---
    const centerX = BATTLE_WORLD_WIDTH / 2 - 150; 
    const pColor = (currentBattleData && currentBattleData.playerColor) ? currentBattleData.playerColor : "#2196f3";
    const eColor = (currentBattleData && currentBattleData.enemyColor) ? currentBattleData.enemyColor : "#f44336";

    // Pass a dummy camera {x:0, y:0} because index.html already translated the canvas!
    drawSupplyLines(ctx, centerX, 80, eColor, {x: 0, y: 0});
    drawSupplyLines(ctx, centerX, BATTLE_WORLD_HEIGHT - 80, pColor, {x: 0, y: 0});
    // -----------------------------------------------------------------------------

 

	
// --- CLEAN FIX: Only sort the cache, leave the original array alone ---
    if (performance.now() - lastSortTime > SORT_INTERVAL) {
        sortedUnitsCache = [...battleEnvironment.units].sort((a, b) => a.y - b.y);
        lastSortTime = performance.now();
    }

    let time = Date.now() / 50;




 // ---> RENDER GROUND EFFECTS <---
    if (battleEnvironment.groundEffects) {
        battleEnvironment.groundEffects.forEach(ge => {
            if (typeof camera !== 'undefined' && camera && typeof isOnScreen === 'function') {
                if (!isOnScreen(ge, camera)) return;
            }
            ctx.save();
            ctx.translate(ge.x, ge.y);
            ctx.rotate(ge.angle);
// Generate a unique seed based on its position
        // We multiply x and y by different primes to ensure (10, 20) 
        // doesn't produce the same seed as (20, 10)
        const geSeed = (ge.x * 12.9898) + (ge.y * 78.233);
        
        drawStuckProjectileOrEffect(ctx, ge.type, geSeed);
            ctx.restore();
        });
    }

    sortedUnitsCache.forEach(unit => {
		
		// --- FIREWALL: Skip corrupt data ---
    if (isNaN(unit.x) || isNaN(unit.y)) return; 
    // ---> INSERT CULLING HERE <---
        // Skip rendering if the unit is outside the viewable area
// ---> INSERT CULLING HERE <---
        // Skip rendering if the unit is outside the viewable area
        if (typeof camera !== 'undefined' && camera && typeof isOnScreen === 'function') {
            if (!isOnScreen(unit, camera)) return;
        }
        let isMoving = unit.state === "moving";
        let frame = time + unit.animOffset;
        let isAttacking = unit.state === "attacking" && unit.cooldown > (unit.stats.isRanged ? 30 : 40);

// ---> SURGERY: Draw Selection Ring <---
if (unit.selected && unit.hp > 0) {
            ctx.save();
            ctx.translate(unit.x, unit.y);
            ctx.strokeStyle = "rgba(255, 235, 59, 0.8)"; // Bright Yellow
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 5, 12, 6, 0, 0, Math.PI * 2.7); // Perspective oval under feet
            ctx.stroke();
            ctx.restore();
        }
        // ---> END SURGERY <---


        let visType = "peasant";
        
// --- UPDATED VISUAL TYPE LOGIC ---
// SURGERY: Check for isCommander instead of disableAICombat
if ((typeof player !== 'undefined' && unit === player) || unit.isCommander) {
    visType = "horse_archer"; 
} else if (unit.stats.role === ROLES.CAVALRY || unit.stats.role === ROLES.MOUNTED_GUNNER) {
    // If it's a mounted gunner or the name contains "Camel", use the camel renderer
    if (unit.unitType === "War Elephant") {
        visType = "elephant";
    } else if (unit.unitType === "Camel Cannon" || unit.unitType.toLowerCase().includes("camel")) {
        visType = "camel";
    } else {
        visType = "cavalry";
    }
} else if (unit.stats.role === ROLES.HORSE_ARCHER) {
 
            visType = "horse_archer";
        } else if (unit.stats.role === ROLES.PIKE || unit.unitType.includes("Glaive")) {
            visType = "spearman";
        } else if (unit.stats.role === ROLES.SHIELD || unit.unitType === "Glaiveman") {
            visType = "sword_shield";
        } else if (unit.stats.role === ROLES.TWO_HANDED) {
            visType = "two_handed";
        } else if (unit.stats.role === ROLES.CROSSBOW) {
            visType = "crossbow";
        } 
		else if (unit.stats.role === ROLES.FIRELANCE) {
    // Dedicated line for Firelances
		visType = "firelance";}
		
		else if (unit.stats.role === ROLES.ARCHER) {
            visType = "archer";
        } else if (unit.stats.role === ROLES.THROWING) {
            visType = "throwing"; 
        } else if (unit.stats.role === ROLES.GUNNER || unit.stats.role === ROLES.FIRELANCE) {
            visType = "gun";
        } else if (unit.stats.role === ROLES.BOMB) {
            visType = "bomb";
			} else if (unit.stats.role === ROLES.ROCKET) {
    visType = "rocket";
        } else if (unit.unitType === "Militia") {
            visType = "peasant";
        }
		
if (unit.stats.isRanged && unit.stats.ammo <= 0) {
    if (visType === "horse_archer") {
        visType = "cavalry"; 
    } else if (visType === "camel") {
        // KEEP it as a camel! We handle its melee mode inside drawCavalryUnit.
        visType = "camel"; 
    } else {
        visType = "shortsword"; 
    }
}

// ---> NEW: Determine if they are retreating <---
        // ONLY raise the white flag if they are broken AND have crossed the red tactical boundary
        let isFleeing = unit.stats.morale <= 0 && 
                        (unit.x < 0 || unit.x > BATTLE_WORLD_WIDTH || 
                         unit.y < 0 || unit.y > BATTLE_WORLD_HEIGHT);
						 
						 
						 
						 
						 
						 
// ---> INSERT ANIMATION SYNC HERE <---
// This calculates the specific frame progress for reload/release cycles
let reloadProgress = 0;
if (unit.state === "attacking" && unit.stats.isRanged) {
    // Standardizing the cycle to a 0.0 - 1.0 range for the renderers
    reloadProgress = (unit.cooldown / (unit.stats.fireRate || 100));
}
// ---> SURGERY: DEAD UNIT RENDERING <---
let isDead = unit.hp <= 0;
if (isDead) {
    drawBloodPool(ctx, unit);
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.deathRotation || Math.PI / 2);
    ctx.translate(-unit.x, -unit.y);
}

// 1. Dispatch to the correct renderer
if (["cavalry", "elephant", "camel", "horse_archer"].includes(visType)) {
    drawCavalryUnit(
        ctx, unit.x, unit.y, isMoving, frame, unit.color, 
        isAttacking, visType, unit.side, unit.unitType, 
        isFleeing, unit.cooldown, unit.ammo, unit, reloadProgress
    );
} else {
    drawInfantryUnit(
        ctx, unit.x, unit.y, isMoving, frame, unit.color, 
        visType, isAttacking, unit.side, unit.unitType, 
        isFleeing, unit.cooldown, unit.ammo, unit, reloadProgress
    );
}

// ---> DRAW STUCK PROJECTILES <---
if (unit.stuckProjectiles && unit.stuckProjectiles.length > 0) {
    ctx.save();
    ctx.translate(unit.x, unit.y);

    unit.stuckProjectiles.forEach(sp => {
        ctx.save();
        ctx.translate(sp.offsetX, sp.offsetY);
        ctx.rotate(sp.angle);
        drawStuckProjectileOrEffect(ctx, sp.type);
        ctx.restore();
    });
    ctx.restore();
}
// ---> END STUCK PROJECTILES <---


if (isDead) {
    ctx.restore();
    return; // EXIT EARLY: Skip drawing health bars, exp bars, and names on corpses
	}
	
	 


// 2. SURGICAL NAME OVERRIDE: Show "PLAYER" if it's the commander
//ctx.fillStyle = "#ffffff";
//ctx.font = unit.isCommander ? "bold 6px Georgia" : "4px Georgia"; // Bolder for player
//ctx.textAlign = "center";
//let displayName = unit.isCommander ? "PLAYER" : unit.unitType;
//ctx.fillText(displayName, unit.x, unit.y - 21);

// 3. HEALTH BAR CONFIG
//const barWidth = 24;
//const barHeight = 4;
//const barY = unit.y - 30; 

// --- SURGICAL DEBUG UI OVERRIDE --- 
// Changed from 'unit.isCommander' so ALL player troops show stats
//if (unit.side === "player") {
   // ctx.save();
    
    // 1. Configure Debug Font (Slightly smaller for troops so it doesn't clutter)
 //  ctx.textAlign = "center";
 // ctx.font = unit.isCommander ? "bold 8px monospace" : "6px monospace"; 
    
    // Change color based on Level (Gold for Level 3+, White for recruits)
 //   let lvl = unit.stats.experienceLevel || 1;
 //  ctx.fillStyle = lvl >= 3 ? "#ffca28" : "#ffffff"; 

    // 2. Build the Debug String
  //  let ma = unit.stats.meleeAttack;
  //  let df = unit.stats.armor;    
  //  let acc = unit.stats.accuracy;

 //   let debugText = `LVL:${Math.floor(lvl)} | ATK:${ma} | DF:${df} | ACC:${acc}`;

    // 3. Draw the Label
  //  ctx.fillText(debugText, unit.x, barY - 10);

    // 4. SATISFACTION / EXP BAR
  //  const expProgress = lvl % 1; 
   // ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  // ctx.fillRect(unit.x - barWidth / 2, barY - 6, barWidth, 2); // EXP Background
    
    // Blue for Commander, Green for regular troops
  // ctx.fillStyle = unit.isCommander ? "#4fc3f7" : "#81c784"; 
  // ctx.fillRect(unit.x - barWidth / 2, barY - 6, barWidth * expProgress, 2); // EXP Fill

   // ctx.restore();
//}

// 5. HEALTH BAR RENDERING
// Draw Background (Red/Empty)
//ctx.fillStyle = "rgba(200, 0, 0, 0.5)";
//ctx.fillRect(unit.x - barWidth / 2, barY, barWidth, barHeight);

// Draw Health Fill (Green for Allies, Orange/Red for Enemies)
//const healthPercent = Math.max(0, unit.hp / unit.stats.health);
//ctx.fillStyle = unit.side === "COMMANDER" ? "#4caf50" : "#ff5722"; 
//ctx.fillRect(unit.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);

// Draw Border
//ctx.strokeStyle = "#000";
//ctx.lineWidth = 1;
//ctx.strokeRect(unit.x - barWidth / 2, barY, barWidth, barHeight);
}); 

battleEnvironment.projectiles.forEach(p => {
		if (isNaN(p.x) || isNaN(p.y)) return; // Safety check
		
		
// ---> INSERT CULLING HERE <---
        if (typeof camera !== 'undefined' && camera && typeof isOnScreen === 'function') {
            if (!isOnScreen(p, camera)) return;
        }
		
let vx = p.vx || p.dx || 0; 
let vy = p.vy || p.dy || 0;
let angle = (vx === 0 && vy === 0) ? 0 : Math.atan2(vy, vx);
        ctx.save(); 
        ctx.translate(p.x, p.y);

        let isBomb = p.attackerStats && p.attackerStats.role === "bomb";
		let isRocket = (p.type === "rocket") || 
               (p.attackerStats && (p.attackerStats.role === ROLES.ROCKET || p.attackerStats.name.includes("Rocket")));
			   let isJavelin = p.attackerStats && p.attackerStats.name === "Javelinier";
        let isSlinger = p.attackerStats && p.attackerStats.name === "Slinger";
		

let isBullet = p.attackerStats && (
    p.attackerStats.role === "gunner" || 
    p.attackerStats.role === "mounted_gunner" ||
    (p.attackerStats.name && p.attackerStats.name.toLowerCase().includes("camel"))
);

        let isBolt = p.attackerStats && p.attackerStats.name === "Crossbowman";
        // Default to arrow if it's not any of the above but comes from an archer/horse archer
		let isArrow = !isBomb && !isRocket && !isJavelin && !isSlinger && !isBolt && !isBullet;
if (isBomb) {
            // Spinning round bomb
            let spin = Date.now() / 50;
            ctx.rotate(spin);
            
            // 1. The Bomb Body
            ctx.fillStyle = "#212121"; 
            ctx.beginPath(); 
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2); 
            ctx.fill();

            // 2. The Flying Fuse/Spark (Now travels with the projectile)
            ctx.strokeStyle = "#ffa000"; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(5, -5);
            ctx.stroke();

            // The glowing tip of the fuse
            ctx.fillStyle = "#ff5722";
            ctx.beginPath();
            ctx.arc(5, -5, 1.5 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
			
			
        }
		
		else if (isRocket) {
    // 1. High-Velocity Angle & Physics
    ctx.rotate(angle);
    ctx.scale(0.3, 0.3); // ---> NEW: Shrinks the mid-air rocket rendering by 50%
    // Subtle high-frequency jitter for powder burning instability
    let jitterY = (Math.sin(Date.now() * 0.1) * 0.8);

    // 2. THE LONG SKINNY SHAFT (Medieval Arrow Base)
    ctx.strokeStyle = "#5d4037"; 
    ctx.lineWidth = 0.6; // Ultra skinny
    ctx.beginPath(); 
    ctx.moveTo(-28, jitterY); // Extended back for length
    ctx.lineTo(12, jitterY);  // Pointing forward
    ctx.stroke();

    // 3. FLETCHING (The feathers at the back)
    ctx.fillStyle = "#eeeeee"; // White feathers
    ctx.beginPath();
    ctx.moveTo(-28, jitterY);
    ctx.lineTo(-34, jitterY - 2.5);
    ctx.lineTo(-30, jitterY);
    ctx.lineTo(-34, jitterY + 2.5);
    ctx.closePath();
    ctx.fill();

    // 4. THE POWDER TUBE (Lashed to the shaft)
    // We draw this slightly offset to look like it's tied to the side
    ctx.fillStyle = "#4e342e"; 
    ctx.strokeStyle = "#212121";
    ctx.lineWidth = 0.5;
    // Small, slender tube lashed to the front-middle
    ctx.fillRect(-6, jitterY + 0.5, 14, 2.2); 
    ctx.strokeRect(-6, jitterY + 0.5, 14, 2.2);
    
    // Lashings (The string holding the tube to the arrow)
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.moveTo(-4, jitterY); ctx.lineTo(-4, jitterY + 2.5);
    ctx.moveTo(4, jitterY); ctx.lineTo(4, jitterY + 2.5);
    ctx.stroke();

    // 5. THE ARROWHEAD (Sharp Warhead)
    ctx.fillStyle = "#424242";
    ctx.beginPath();
    ctx.moveTo(12, jitterY - 1.2);
    ctx.lineTo(20, jitterY); // Very long, piercing tip
    ctx.lineTo(12, jitterY + 1.2);
    ctx.fill();

    // 6. PROPELLANT EFFECTS (Coming from the back of the tube)
    let tubeBackX = -6;
    let flameSize = 3 + Math.random() * 5;
    let fGrd = ctx.createLinearGradient(tubeBackX, 0, tubeBackX - flameSize, 0);
    fGrd.addColorStop(0, "#fff59d");
    fGrd.addColorStop(0.4, "#ff9800");
    fGrd.addColorStop(1, "rgba(255, 87, 34, 0)");
    
    ctx.fillStyle = fGrd;
    ctx.beginPath();
    ctx.moveTo(tubeBackX, jitterY + 1);
    ctx.lineTo(tubeBackX - flameSize, jitterY + 1.5);
    ctx.lineTo(tubeBackX, jitterY + 2);
    ctx.fill();

    // 7. VOLUMINOUS SMOKE TRAIL
    ctx.fillStyle = "rgba(200, 200, 200, 0.35)";
    for (let i = 0; i < 5; i++) {
        let smokeX = tubeBackX - (i * 7);
        let smokeSize = 1.5 + i;
        ctx.beginPath();
        // Smoke drifts slightly "up" relative to the arrow's path
        ctx.arc(smokeX, (jitterY + 1.5) + (Math.sin(Date.now()/40 + i) * 1.5), smokeSize, 0, Math.PI * 2);
        ctx.fill();
    }
}
		
else if (p.isFire || p.projectileType === "firelance" || (p.projectileType && p.projectileType.includes("Firelance"))) {

            ctx.rotate(angle);

            // 1. Scale Settings (5x the original size)
            // Original was ~6px wide, now 30-50px wide spread
            const blastLength = 65; 
            const blastWidth = 40; 
            const jitter = (Math.random() - 0.5) * 10; // Adds "flicker" effect

            // 2. Create the "Hot Core" to "Fading Ember" Gradient
            // This removes the "bullet" look by blending the origin into the flame
            let fireGrd = ctx.createRadialGradient(0, 0, 2, 20, 0, blastLength);
            fireGrd.addColorStop(0, "rgba(255, 255, 255, 0.9)");   // White-hot center
            fireGrd.addColorStop(0.2, "rgba(255, 230, 100, 0.8)"); // Bright Yellow
            fireGrd.addColorStop(0.4, "rgba(255, 100, 0, 0.6)");   // Deep Orange
            fireGrd.addColorStop(0.7, "rgba(200, 40, 0, 0.3)");    // Red Glow
            fireGrd.addColorStop(1, "rgba(50, 50, 50, 0)");        // Dissipating Smoke

            // 3. Draw the Conical Blast Shape
            ctx.fillStyle = fireGrd;
            ctx.beginPath();
            ctx.moveTo(-5, 0); // Start slightly behind the tip for better "attachment"
            
            // Top curve of the jet
            ctx.quadraticCurveTo(blastLength * 0.4, -blastWidth + jitter, blastLength, jitter);
            // Bottom curve of the jet back to origin
            ctx.quadraticCurveTo(blastLength * 0.4, blastWidth + jitter, -5, 0);
            
            ctx.fill();

            // 4. Heat Distortion / Inner Turbulence
            // This adds extra "thickness" to the blast without adding "bullets"
            ctx.globalCompositeOperation = "lighter"; // Makes the fire "glow" onto itself
            ctx.fillStyle = "rgba(255, 150, 50, 0.2)";
            for (let i = 0; i < 2; i++) {
                let s = 10 + Math.random() * 15;
                ctx.beginPath();
                ctx.arc(Math.random() * 30, (Math.random() - 0.5) * 15, s, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = "source-over"; // Reset to normal

            // 5. Large Smoke Clouds (Tail)
            ctx.fillStyle = "rgba(100, 100, 100, 0.2)";
            ctx.beginPath();
            ctx.arc(-15, jitter, 15, 0, Math.PI * 2);
            ctx.arc(-25, -jitter, 10, 0, Math.PI * 2);
            ctx.fill();
        }
else if (isJavelin) {
// --- SURGERY START: High-Fidelity Javelin (Mini-Head Edition) ---
// Long thrown spear
ctx.rotate(angle);

// Shaft - matches unit's wood color (STAYS THE SAME)
ctx.strokeStyle = "#5d4037"; 
ctx.lineWidth = 2;
ctx.beginPath(); 
ctx.moveTo(-12, 0); // Tail
ctx.lineTo(8, 0);   // To head base
ctx.stroke();

// Scaled-down leaf-shaped iron tip (1/3 size)
ctx.fillStyle = "#bdbdbd";
ctx.beginPath();
ctx.moveTo(8, 0);          // Base of metal head
ctx.lineTo(7.33, -0.83);   // Flare top back (Scaled relative to 8,0)
ctx.lineTo(10.67, 0);      // Sharp tip (Length reduced from 8 to 2.67)
ctx.lineTo(7.33, 0.83);    // Flare bottom back
ctx.closePath();
ctx.fill();
// --- SURGERY END ---
        }
        else if (isSlinger) {
            // --- SURGERY START: Slinger Stone ---
            // Small aerodynamic lead/stone bullet
            ctx.rotate(angle);
            
            // Subtle motion trail
            ctx.fillStyle = "rgba(158, 158, 158, 0.4)";
            ctx.beginPath();
            ctx.ellipse(-3, 0, 5, 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // The Stone itself
            ctx.fillStyle = "#9e9e9e";
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2); // Slightly larger than the unit-held stone for visibility
            ctx.fill();
            // --- SURGERY END ---
        }
		
		else if (isBolt) {
            // --- SURGERY START: Heavy Crossbow Bolt ---
            ctx.rotate(angle);
            
            // Bolts are shorter and thicker than arrows
            ctx.fillStyle = "#5d4037"; // Darker wood
            ctx.fillRect(-4, -1, 8, 2); 

            // Heavy triangular head
            ctx.fillStyle = "#757575"; 
            ctx.beginPath();
            ctx.moveTo(4, -2); ctx.lineTo(9, 0); ctx.lineTo(4, 2);
            ctx.fill();

            // Wood Fletchings (Brown/Tan instead of feathers)
            ctx.fillStyle = "#8d6e63"; 
            ctx.fillRect(-5, -1.5, 3, 3);
            // --- SURGERY END ---
        }
        else if (isArrow) {
            // --- SURGERY START: Slim Standard Arrow ---
            ctx.rotate(angle);
            
            // Thinner, longer shaft
            ctx.fillStyle = "#8d6e63"; 
            ctx.fillRect(-6, -0.5, 12, 1); 

            // Needle-like arrowhead
            ctx.fillStyle = "#9e9e9e"; 
            ctx.beginPath();
            ctx.moveTo(6, -1.5); ctx.lineTo(11, 0); ctx.lineTo(6, 1.5);
            ctx.fill();

            // Green "Forest" Fletchings (To differ from Red Horse Archer feathers)
            ctx.fillStyle = "#4caf50"; 
            ctx.fillRect(-7, -1.5, 4, 1);
            ctx.fillRect(-7, 0.5, 4, 1);
            // --- SURGERY END ---
        }
		else if (isBullet) {
 
            // --- SURGERY START: Handcannon Lead Ball ---
            ctx.rotate(angle);

            // 1. Long Motion Blur/Smoke Trail
            // This makes the fast bullet visible to the player
            let gradient = ctx.createLinearGradient(-15, 0, 0, 0);
            gradient.addColorStop(0, "rgba(140, 140, 140, 0)");   // Fade out
            gradient.addColorStop(1, "rgba(100, 100, 100, 0.6)"); // Smoke color
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-18, -1, 18, 2); 

            // 2. The Lead Ball
            ctx.fillStyle = "#424242"; // Dark lead/iron
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 1);
            ctx.fill();

            // 3. Incandescent Tip (Heat from the barrel)
            // A tiny orange-hot glow at the very front
            ctx.fillStyle = "#ff5722"; 
            ctx.beginPath();
            ctx.arc(1, 0, 1, 0, Math.PI * 1);
            ctx.fill();
  
        }
        else {
            // FALLBACK: Standard Bolt if all else fails
            ctx.rotate(angle);
            ctx.fillStyle = "#8d6e63";
            ctx.fillRect(-4, -0.5, 8, 1);
            ctx.fillStyle = "#9e9e9e";
            ctx.fillRect(2, -1.5, 3, 3);
        }
ctx.restore();
    });
	
	
	
	// --- DRAW RTS SELECTION BOX ---
    if (typeof isBoxSelecting !== 'undefined' && isBoxSelecting) {
        ctx.save();
        ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
        ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
        ctx.lineWidth = 1;
        
        let width = selectionBoxCurrent.x - selectionBoxStart.x;
        let height = selectionBoxCurrent.y - selectionBoxStart.y;
        
        ctx.fillRect(selectionBoxStart.x, selectionBoxStart.y, width, height);
        ctx.strokeRect(selectionBoxStart.x, selectionBoxStart.y, width, height);
        ctx.restore();
    }
	
	
	// ---> FINAL UI LAYER <---
    // This ensures the player stats/roster are never hidden by unit sprites
    if (typeof drawPlayerOverlay === 'function') {
        // We use a dummy camera or reset transform if the UI is screen-space
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        drawPlayerOverlay(ctx, player);
        ctx.restore();
    }
	
	
	
}


  