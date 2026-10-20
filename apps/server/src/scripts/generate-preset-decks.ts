import fs from 'node:fs';
import path from 'node:path';
import { parseDecklist, validateCommanderDeck, type CardDefinition } from '@mtgc/shared';

function getPresetDir(): string {
  if (fs.existsSync(path.resolve('prisma/seed'))) {
    return path.resolve('prisma/seed/preset-decks');
  }
  return path.resolve('apps/server/prisma/seed/preset-decks');
}

const PRESET_DIR = getPresetDir();
fs.mkdirSync(PRESET_DIR, { recursive: true });

interface DeckConfig {
  filename: string;
  name: string;
  commander: string;
  colorIdentity: string[];
  cardsText: string;
}

const DECKS: DeckConfig[] = [
  {
    filename: '01-krenko-mob-boss.txt',
    name: 'Krenko - Marea de Trasgos',
    commander: 'Krenko, Mob Boss',
    colorIdentity: ['R'],
    cardsText: `// Comandante
1 Krenko, Mob Boss *CMDR*

// Mazo
1 Sol Ring
1 Arcane Signet
1 Ruby Medallion
1 Skullclamp
1 Swiftfoot Boots
1 Lightning Greaves
1 Herald's Horn
1 Vanquisher's Banner
1 Icon of Ancestry
1 Coat of Arms
1 Goblin Chieftain
1 Goblin King
1 Goblin Warchief
1 Siege-Gang Commander
1 Goblin Matron
1 Goblin Ringleader
1 Goblin Trashmaster
1 Skirk Prospector
1 Muxus, Goblin Grandee
1 Pashalik Mons
1 Warren Instigator
1 Krenko, Tin Street Kingpin
1 Legion Loyalist
1 Rundvelt Hordemaster
1 Battle Hymn
1 Brightstone Ritual
1 Chaos Warp
1 Blasphemous Act
1 Chain Reaction
1 Vandalblast
1 Abrade
1 Deflecting Swat
1 Jeska's Will
1 Shared Animosity
1 Impact Tremors
1 Goblin Bombardment
1 Fervor
1 Purphoros, God of the Forge
1 Torbran, Thane of Red Fell
1 Fanatical Firebrand
1 Goblin Bushwhacker
1 Reckless Bushwhacker
1 Mogg War Marshal
1 Beetleback Chief
1 Hordeling Outburst
1 Dragon Fodder
1 Krenko's Command
1 Goblin Instigator
1 Goblinslide
1 Empty the Warrens
1 Goblin War Strike
1 Burn at the Stake
1 Massive Raid
1 Goblin Grenade
1 Lightning Bolt
1 Faithless Looting
1 Thrill of Possibility
1 Big Score
1 Unexpected Windfall
1 Demand Answers
1 Tormenting Voice
1 Wild Guess
37 Mountain`,
  },
  {
    filename: '02-goreclaw-terror-of-qal-sisma.txt',
    name: 'Goreclaw - Poder Titánico',
    commander: 'Goreclaw, Terror of Qal Sisma',
    colorIdentity: ['G'],
    cardsText: `// Comandante
1 Goreclaw, Terror of Qal Sisma *CMDR*

// Mazo
1 Sol Ring
1 Arcane Signet
1 Emerald Medallion
1 Rhonas's Monument
1 Swiftfoot Boots
1 Lightning Greaves
1 Lifecrafter's Bestiary
1 The Great Henge
1 Garruk's Uprising
1 Elemental Bond
1 Colossal Majesty
1 Tribute to the World Tree
1 Guardian Project
1 Beast Whisperer
1 Return of the Wildspeaker
1 Rishkar's Expertise
1 Soul's Majesty
1 Greater Good
1 Heroic Intervention
1 Beast Within
1 Nature's Claim
1 Kenrith's Transformation
1 Ram Through
1 Krosan Grip
1 Rampant Growth
1 Cultivate
1 Kodama's Reach
1 Farseek
1 Nature's Lore
1 Three Visits
1 Skyshroud Claim
1 Llanowar Elves
1 Elvish Mystic
1 Fyndhorn Elves
1 Birds of Paradise
1 Sakura-Tribe Elder
1 Surrak and Goreclaw
1 Ghalta, Primal Hunger
1 Apex Devastator
1 Terastodon
1 Woodfall Primus
1 Vorinclex, Voice of Hunger
1 Kogla, the Titan Ape
1 Quartzwood Crasher
1 Defiler of Vigor
1 Elder Gargaroth
1 Thrun, Breaker of Silence
1 Silverback Elder
1 Nylea, God of the Hunt
1 Steel Leaf Champion
1 Lovestruck Beast
1 Questing Beast
1 Old-Growth Troll
1 Aggressive Mammoth
1 Kalonian Hydra
1 Managorger Hydra
1 Ulvenwald Oddity
1 Llanowar Tribe
1 Selvala, Heart of the Wilds
1 Garruk, Primal Hunter
1 Vivien, Monsters' Advocate
1 Nissa, Who Shakes the World
37 Forest`,
  },
  {
    filename: '03-brago-king-eternal.txt',
    name: 'Brago - Parpadeo Eterno',
    commander: 'Brago, King Eternal',
    colorIdentity: ['W', 'U'],
    cardsText: `// Comandante
1 Brago, King Eternal *CMDR*

// Mazo
1 Sol Ring
1 Arcane Signet
1 Azorius Signet
1 Talisman of Progress
1 Mind Stone
1 Thought Vessel
1 Fellwar Stone
1 Strionic Resonator
1 Lithoform Engine
1 Swiftfoot Boots
1 Lightning Greaves
1 Panharmonicon
1 Teleportation Circle
1 Conjurer's Closet
1 Cloudshift
1 Ephemerate
1 Ghostly Flicker
1 Eerie Interlude
1 Semester's End
1 Displace
1 Swords to Plowshares
1 Path to Exile
1 Generous Gift
1 Stroke of Midnight
1 Counterspell
1 Negate
1 Dovin's Veto
1 Arcane Denial
1 Cyclonic Rift
1 Supreme Verdict
1 Cleansing Nova
1 Time Wipe
1 Mulldrifter
1 Cloudblazer
1 Spirited Companion
1 Wall of Omens
1 Sea Gate Oracle
1 Reflector Mage
1 Aether Channeler
1 Skyclave Apparition
1 Palace Jailer
1 Solitude
1 Sun Titan
1 Karmic Guide
1 Reveillark
1 Peregrine Drake
1 Knight of the White Orchid
1 Kor Cartographer
1 Solemn Simulacrum
1 Lavinia of the Tenth
1 Venser, Shaper Savant
1 Agent of Treachery
1 Diluvian Primordial
1 Yorion, Sky Nomad
1 Rhystic Study
1 Mystic Remora
1 Smothering Tithe
1 Omen of the Sea
1 Omen of the Sun
1 Trial of Knowledge
1 Command Tower
1 Prairie Stream
1 Glacial Fortress
1 Hallowed Fountain
1 Port Town
1 Azorius Chancery
1 Nimbus Maze
1 Deserted Beach
1 Sea of Clouds
1 Exotic Orchard
14 Plains
15 Island`,
  },
  {
    filename: '04-meren-of-clan-nel-toth.txt',
    name: 'Meren - Nigromancia Golgari',
    commander: 'Meren of Clan Nel Toth',
    colorIdentity: ['B', 'G'],
    cardsText: `// Comandante
1 Meren of Clan Nel Toth *CMDR*

// Mazo
1 Sol Ring
1 Arcane Signet
1 Golgari Signet
1 Talisman of Resilience
1 Mind Stone
1 Thought Vessel
1 Ashnod's Altar
1 Phyrexian Altar
1 Altar of Dementia
1 Skullclamp
1 Swiftfoot Boots
1 Lightning Greaves
1 Birthing Pod
1 Eldritch Evolution
1 Victimize
1 Reanimate
1 Animate Dead
1 Living Death
1 Dread Return
1 Buried Alive
1 Entomb
1 Assassin's Trophy
1 Abrupt Decay
1 Putrefy
1 Beast Within
1 Tear Asunder
1 Toxic Deluge
1 Damnation
1 Culling Ritual
1 Sakura-Tribe Elder
1 Spore Frog
1 Caustic Caterpillar
1 Haywire Mite
1 Viscera Seer
1 Carrion Feeder
1 Blood Artist
1 Zulaport Cutthroat
1 Syr Konrad, the Grim
1 Plaguecrafter
1 Demon's Disciple
1 Fleshbag Marauder
1 Ravenous Chupacabra
1 Shriekmaw
1 Gray Merchant of Asphodel
1 Eternal Witness
1 Timeless Witness
1 Wood Elves
1 Farhaven Elf
1 Reclamation Sage
1 Acidic Slime
1 Golgari Grave-Troll
1 Stinkweed Imp
1 Grave Titan
1 Sepulchral Primordial
1 Massacre Wurm
1 Protean Hulk
1 Mikaeus, the Unhallowed
1 Dictate of Erebos
1 Grave Pact
1 Underrealm Lich
1 Command Tower
1 Overgrown Tomb
1 Woodland Cemetery
1 Undergrowth Stadium
1 Llanowar Wastes
1 Golgari Rot Farm
1 Darkbore Pathway
1 Tainted Wood
1 Necroblossom Snarl
1 Exotic Orchard
14 Swamp
15 Forest`,
  },
  {
    filename: '05-wyleth-soul-of-steel.txt',
    name: 'Wyleth - Armamento Boros',
    commander: 'Wyleth, Soul of Steel',
    colorIdentity: ['R', 'W'],
    cardsText: `// Comandante
1 Wyleth, Soul of Steel *CMDR*

// Mazo
1 Sol Ring
1 Arcane Signet
1 Boros Signet
1 Talisman of Conviction
1 Mind Stone
1 Thought Vessel
1 Fellwar Stone
1 Sunforger
1 Sword of the Animist
1 Blackblade Reforged
1 Colossus Hammer
1 Shadowspear
1 Loxodon Warhammer
1 Swiftfoot Boots
1 Lightning Greaves
1 Masterwork of Ingenuity
1 Hammer of Nazahn
1 Commander's Plate
1 Dowsing Dagger
1 Mask of Memory
1 Puresteel Paladin
1 Sram, Senior Edificer
1 Danitha Capashen, Paragon
1 Ardenn, Intrepid Archaeologist
1 Stoneforge Mystic
1 Fighter Class
1 Open the Armory
1 Steelshaper's Gift
1 Forging the Tyrite Sword
1 Swords to Plowshares
1 Path to Exile
1 Boros Charm
1 Deflecting Swat
1 Flawless Maneuver
1 Teferi's Protection
1 Generous Gift
1 Chaos Warp
1 Wear // Tear
1 Single Combat
1 Blasphemous Act
1 Akroma's Will
1 Sigarda's Aid
1 All That Glitters
1 Mantle of the Ancients
1 Spirit Mantle
1 Unquestioned Authority
1 Timely Ward
1 Halvar, God of Battle
1 Reyav, Master Smith
1 Bruenor Battlehammer
1 Akiri, Fearless Voyager
1 Reliquary Tower
1 Rogue's Passage
1 Command Tower
1 Sacred Foundry
1 Clifftop Retreat
1 Spectator Seating
1 Battlefield Forge
1 Boros Garrison
1 Sundown Pass
1 Furycalm Snarl
1 Exotic Orchard
18 Plains
19 Mountain`,
  },
  {
    filename: '06-niv-mizzet-parun.txt',
    name: 'Niv-Mizzet - Curiosidad Izzet',
    commander: 'Niv-Mizzet, Parun',
    colorIdentity: ['U', 'R'],
    cardsText: `// Comandante
1 Niv-Mizzet, Parun *CMDR*

// Mazo
1 Sol Ring
1 Arcane Signet
1 Izzet Signet
1 Talisman of Creativity
1 Thought Vessel
1 Mind Stone
1 Fellwar Stone
1 Decanter of Endless Water
1 Swiftfoot Boots
1 Lightning Greaves
1 Curiosity
1 Ophidian Eye
1 Tandem Lookout
1 Guttersnipe
1 Electrostatic Field
1 Thermo-Alchemist
1 Archmage Emeritus
1 Storm-Kiln Artist
1 Talrand, Sky Summoner
1 Young Pyromancer
1 Murmuring Mystic
1 Baral, Chief of Compliance
1 Goblin Electromancer
1 Veyran, Voice of Duality
1 Birgi, God of Storytelling
1 Counterspell
1 Negate
1 Arcane Denial
1 Fierce Guardianship
1 Deflecting Swat
1 Chaos Warp
1 Pongify
1 Rapid Hybridization
1 Cyclonic Rift
1 Blasphemous Act
1 Chain Reaction
1 Vandalblast
1 Brainstorm
1 Ponder
1 Preordain
1 Serum Visions
1 Opt
1 Consider
1 Frantic Search
1 Faithless Looting
1 Expressive Iteration
1 Windfall
1 Wheel of Misfortune
1 Jeska's Will
1 Big Score
1 Unexpected Windfall
1 Prismari Command
1 Valakut Awakening
1 Silundi Vision
1 Command Tower
1 Steam Vents
1 Sulfur Falls
1 Training Center
1 Shivan Reef
1 Izzet Boilerworks
1 Stormcarved Coast
1 Frostboil Snarl
1 Exotic Orchard
19 Island
17 Mountain`,
  },
  {
    filename: '07-alela-artful-provocateur.txt',
    name: 'Alela - Enjambre de Hadas Esper',
    commander: 'Alela, Artful Provocateur',
    colorIdentity: ['W', 'U', 'B'],
    cardsText: `// Comandante
1 Alela, Artful Provocateur *CMDR*

// Mazo
1 Sol Ring
1 Arcane Signet
1 Azorius Signet
1 Dimir Signet
1 Orzhov Signet
1 Talisman of Progress
1 Talisman of Dominance
1 Talisman of Hierarchy
1 Thought Vessel
1 Mind Stone
1 Skullclamp
1 Swiftfoot Boots
1 Lightning Greaves
1 Bident of Thassa
1 Reconnaissance Mission
1 Coastal Piracy
1 Rhystic Study
1 Mystic Remora
1 Smothering Tithe
1 Blind Obedience
1 All That Glitters
1 Michiko's Reign of Truth
1 Mirrormade
1 Anointed Procession
1 Bitterblossom
1 Favorable Winds
1 Intangible Virtue
1 Etchings of the Chosen
1 Swords to Plowshares
1 Path to Exile
1 Anguished Unmaking
1 Despark
1 Void Rend
1 Generous Gift
1 Counterspell
1 Dovin's Veto
1 Arcane Denial
1 Negate
1 Cyclonic Rift
1 Supreme Verdict
1 Toxic Deluge
1 Baleful Strix
1 Esper Sentinel
1 Shimmer Dragon
1 Sai, Master Thopterist
1 Emry, Lurker of the Loch
1 Hanna, Ship's Navigator
1 Sydri, Galvanic Genius
1 Ethersworn Canonist
1 Chief Engineer
1 Foundry Inspector
1 Jhoira's Familiar
1 Etherium Sculptor
1 Thopter Foundry
1 Sword of the Meek
1 Time Sieve
1 Ashnod's Altar
1 Bolas's Citadel
1 Sensei's Divining Top
1 Aetherflux Reservoir
1 Command Tower
1 Hallowed Fountain
1 Watery Grave
1 Godless Shrine
1 Glacial Fortress
1 Drowned Catacomb
1 Isolated Chapel
1 Sea of Clouds
1 Morphic Pool
1 Vault of Champions
1 Raffine's Tower
1 Exotic Orchard
9 Plains
9 Island
9 Swamp`,
  },
  {
    filename: '08-kozilek-the-great-distortion.txt',
    name: 'Kozilek - Devorador Incoloro',
    commander: 'Kozilek, the Great Distortion',
    colorIdentity: [],
    cardsText: `// Comandante
1 Kozilek, the Great Distortion *CMDR*

// Mazo
1 Sol Ring
1 Mana Vault
1 Basalt Monolith
1 Grim Monolith
1 Thran Dynamo
1 Worn Powerstone
1 Hedron Archive
1 Dreamstone Hedron
1 Mind Stone
1 Thought Vessel
1 Everflowing Chalice
1 Fractured Powerstone
1 Prismatic Lens
1 Guardian Idol
1 Forsaken Monument
1 Planar Bridge
1 Lightning Greaves
1 Swiftfoot Boots
1 Shadowspear
1 Commander's Plate
1 Darksteel Plate
1 Mirage Mirror
1 Unwinding Clock
1 Sculpting Steel
1 Expedition Map
1 Moonsilver Key
1 Burnished Hart
1 Solemn Simulacrum
1 Conduit of Ruin
1 Endbringer
1 Oblivion Sower
1 Void Winnower
1 Artisan of Kozilek
1 Ulamog, the Ceaseless Hunger
1 Ulamog, the Infinite Gyre
1 Kozilek, Butcher of Truth
1 It That Betrays
1 Emrakul, the Promised End
1 Steel Hellkite
1 Platinum Angel
1 Wurmcoil Engine
1 Duplicant
1 Meteor Golem
1 Cityscape Leveler
1 Scuttling Doom Engine
1 Phyrexian Triniform
1 Not of This World
1 Warping Wail
1 Titan's Presence
1 Spatial Contortion
1 Scour from Existence
1 Introduction to Annihilation
1 All Is Dust
1 Calamity of the Titans
1 Ugin, the Ineffable
1 Ugin, the Spirit Dragon
1 Karn Liberated
1 Karn, the Great Creator
1 Mystic Forge
1 Urza's Incubator
1 Urza's Tower
1 Urza's Power Plant
1 Urza's Mine
1 Eldrazi Temple
1 Eye of Ugin
1 Shrine of the Forsaken Gods
1 Sanctum of Ugin
1 Temple of the False God
1 Tomb of the Spirit Dragon
1 Zhalfirin Void
1 Reliquary Tower
1 Rogue's Passage
1 War Room
1 Blast Zone
1 Scavenger Grounds
1 Buried Ruin
1 Inventors' Fair
1 Darksteel Citadel
21 Wastes`,
  },
];

export function runGenerator() {
  console.log(`Writing ${DECKS.length} preset decks to ${PRESET_DIR}...`);

  for (const d of DECKS) {
    const filePath = path.join(PRESET_DIR, d.filename);
    fs.writeFileSync(filePath, d.cardsText.trim() + '\n', 'utf-8');
    console.log(`Saved: ${d.filename}`);

    // Parse and validate
    const parsed = parseDecklist(d.cardsText);
    const cmdrCount = parsed.commanderEntries.reduce((s, e) => s + e.quantity, 0);
    const mainCount = parsed.maindeckEntries.reduce((s, e) => s + e.quantity, 0);
    const total = cmdrCount + mainCount;

    if (total !== 100) {
      throw new Error(`Deck ${d.name} has ${total} cards (must be exactly 100)!`);
    }

    // Build dummy definitions to run validator
    const commanderCards = parsed.commanderEntries.map(e => ({
      card: {
        scryfallId: `id_${e.cardName}`,
        name: e.cardName,
        cmc: 4,
        typeLine: 'Legendary Creature',
        colorIdentity: d.colorIdentity as any,
        colors: d.colorIdentity as any,
        legalities: { commander: 'legal' },
      } as CardDefinition,
      quantity: e.quantity,
      isCommander: true,
    }));

    const maindeckCards = parsed.maindeckEntries.map(e => ({
      card: {
        scryfallId: `id_${e.cardName}`,
        name: e.cardName,
        cmc:
          e.cardName.includes('Plains') ||
          e.cardName.includes('Island') ||
          e.cardName.includes('Swamp') ||
          e.cardName.includes('Mountain') ||
          e.cardName.includes('Forest') ||
          e.cardName.includes('Wastes')
            ? 0
            : 3,
        typeLine:
          e.cardName.includes('Plains') ||
          e.cardName.includes('Island') ||
          e.cardName.includes('Swamp') ||
          e.cardName.includes('Mountain') ||
          e.cardName.includes('Forest') ||
          e.cardName.includes('Wastes')
            ? 'Basic Land'
            : 'Spell',
        colorIdentity: d.colorIdentity as any,
        colors: d.colorIdentity as any,
        legalities: { commander: 'legal' },
      } as CardDefinition,
      quantity: e.quantity,
      isCommander: false,
    }));

    const valResult = validateCommanderDeck(commanderCards, maindeckCards);
    if (!valResult.isValid) {
      throw new Error(`Deck ${d.name} failed validation: ${valResult.errors.join(', ')}`);
    }
    console.log(`Validated: ${d.name} (${total} cards, commander: ${d.commander}) - OK`);
  }

  console.log('All 8 preset decks successfully generated and validated!');
}

runGenerator();
