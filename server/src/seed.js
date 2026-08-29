require('dotenv').config();

const bcrypt = require('bcrypt');
const { query } = require('./config/db');

const SALT_ROUNDS = 10;

const DEMO_USER = {
  username: 'LoreArchitect',
  email: 'demo@storyhub.app',
  password: 'demo1234',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtavyHa8gkS0Jnv1r9NTxqoSpUPAUo45ym88VCLyOmQxfqz0iHbJ-JWJX7Lov7Xn3aq2RKO_ulZCwt9rr8sj54It-VbPhtYQeCCHV32NWF9XKjCMNhu37KqSAvl-jzxdeUtXTD4YhswWSDar_VW0N-DVpw-NscxsoFnPa7aqqfG_5dQ5c02oy8MViOU_RgLW2ULajhroiqJfLP9mD__0PyRytETSTuTxamh0fZ2hlPaH-ArAJIZ7e0ew',
  bio: 'Worldbuilder. I craft interconnected story universes using Lore Canvas.'
};

const canvasData = {
  nodes: [
    {
      id: 'char-king-aldric',
      type: 'custom',
      position: { x: 80, y: 120 },
      data: {
        type: 'Character',
        label: 'King Aldric',
        role: 'Ruler of Eldermyr',
        affiliation: 'The Wardens',
        description: 'The aging ruler of Eldermyr. Haunted by the loss of the Sunstone, he seeks a successor before the kingdom fractures.'
      }
    },
    {
      id: 'char-queen-seraphine',
      type: 'custom',
      position: { x: 420, y: 80 },
      data: {
        type: 'Character',
        label: 'Queen Seraphine',
        role: 'Heir Apparent',
        affiliation: 'The Shade Court',
        description: 'Aldric\'s estranged daughter and a master of forbidden lore. She wields shadow-weaving magic tied to the Crown\'s history.'
      }
    },
    {
      id: 'char-theron',
      type: 'custom',
      position: { x: 760, y: 140 },
      data: {
        type: 'Character',
        label: 'Theron',
        role: 'Wanderer / Knight-Errant',
        affiliation: 'Merchant Guild',
        description: 'A disgraced knight turned wanderer. He bears the last known map to the Sunstone Vault and is hunted by the Crown.'
      }
    },
    {
      id: 'loc-eldermyr',
      type: 'custom',
      position: { x: 200, y: 420 },
      data: {
        type: 'Location',
        label: 'Eldermyr',
        role: 'Capital City',
        affiliation: 'Kingdom of Eldermyr',
        description: 'The capital city built into the cliffs of the Ember Coast. Its spires are lit by captured lightning from the upper atmosphere.'
      }
    },
    {
      id: 'loc-vault',
      type: 'custom',
      position: { x: 580, y: 420 },
      data: {
        type: 'Location',
        label: 'Sunstone Vault',
        role: 'Sealed Temple',
        affiliation: 'Ancient Order',
        description: 'A sealed temple beneath the Frostfall Peaks. The Sunstone can stabilize the Crown\'s fading magic or unmake it entirely.'
      }
    },
    {
      id: 'plot-claim',
      type: 'custom',
      position: { x: 80, y: 720 },
      data: {
        type: 'Plot Event',
        label: 'Claim to the Throne',
        role: 'Inciting Incident',
        affiliation: '',
        keyCharacters: 'King Aldric - Proclaims the trial by ordeal\nTheron - Answers the call, revealing the map\nQueen Seraphine - Watches from the shadows, forming her own plan',
        description: 'Aldric announces a trial by ordeal. Whoever retrieves the Sunstone will be named heir. This sets the main quest in motion.'
      }
    },
    {
      id: 'plot-betrayal',
      type: 'custom',
      position: { x: 420, y: 720 },
      data: {
        type: 'Plot Event',
        label: 'Betrayal at the Spire',
        role: 'Midpoint Twist',
        affiliation: 'The Shade Court',
        keyCharacters: 'Queen Seraphine - Secretly sabotages the expedition\nTheron - Discovers the betrayal but is too late\nKing Aldric - Unaware, believes the ordeal is sacred',
        description: 'Seraphine secretly sabotages the expedition, hoping to claim the Sunstone for herself and rewrite the kingdom\'s fate.'
      }
    },
    {
      id: 'plot-reckoning',
      type: 'custom',
      position: { x: 760, y: 720 },
      data: {
        type: 'Plot Event',
        label: 'The Reckoning',
        role: 'Climax',
        affiliation: '',
        keyCharacters: 'King Aldric - Confronts Seraphine in the Vault\nQueen Seraphine - Claims the Sunstone, revealing her true allegiance\nTheron - Makes the final choice: destroy the Crown or restore it',
        description: 'The Sunstone is found. Aldric, Seraphine, and Theron confront each other in the Vault. The Crown either breaks or endures.'
      }
    },
    {
      id: 'lore-crown',
      type: 'custom',
      position: { x: 80, y: 380 },
      data: {
        type: 'Lore',
        label: 'The Shattered Crown',
        role: 'MacGuffin / Artifact',
        affiliation: 'The Wardens',
        description: 'An artifact forged from the first eclipse. It grants kingship but slowly drains the wearer\'s memory. Three shards are missing.'
      }
    },
    {
      id: 'lore-sunstone',
      type: 'custom',
      position: { x: 760, y: 380 },
      data: {
        type: 'Lore',
        label: 'The Sunstone',
        role: 'Celestial Relic',
        affiliation: 'Ancient Order',
        description: 'A celestial relic that can mend the Crown or shatter it. Legends say it chose the first king. Now it sleeps beneath the peaks.'
      }
    },
    {
      id: 'item-map',
      type: 'custom',
      position: { x: 420, y: 380 },
      data: {
        type: 'Item',
        label: 'Theron\'s Map',
        role: 'Key Item',
        affiliation: 'Merchant Guild',
        description: 'A living map that rewrites itself. It points toward the Vault but also reveals the bearer\'s hidden regrets.'
      }
    },
    {
      id: 'faction-wardens',
      type: 'custom',
      position: { x: 80, y: 560 },
      data: {
        type: 'Faction',
        label: 'The Wardens',
        role: 'Protectors of the Crown',
        affiliation: 'Kingdom of Eldermyr',
        description: 'An ancient order sworn to protect the Crown. They believe the ordeal is sacred; any interference is heresy.'
      }
    },
    {
      id: 'faction-shade-court',
      type: 'custom',
      position: { x: 420, y: 560 },
      data: {
        type: 'Faction',
        label: 'The Shade Court',
        role: 'Secret Society',
        affiliation: 'Independent',
        description: 'A secret society of mages who want the Crown destroyed. Seraphine is their hidden champion.'
      }
    },
    {
      id: 'faction-merchant-guild',
      type: 'custom',
      position: { x: 760, y: 560 },
      data: {
        type: 'Faction',
        label: 'Merchant Guild',
        role: 'Economic Power',
        affiliation: 'Independent',
        description: 'They fund Theron\'s expedition in exchange for a share of the Sunstone\'s power. Loyalty is rented, not given.'
      }
    },
    {
      id: 'theme-power',
      type: 'custom',
      position: { x: 420, y: 200 },
      data: {
        type: 'Theme',
        label: 'Power vs Sacrifice',
        role: 'Central Theme',
        affiliation: '',
        description: 'Every character must choose between preserving their power and sacrificing it for the kingdom. The Crown tests this in every generation.'
      }
    }
  ],
  edges: [
    { id: 'e-aldric-crown', source: 'char-king-aldric', target: 'lore-crown', label: 'wears' },
    { id: 'e-seraphine-crown', source: 'char-queen-seraphine', target: 'lore-crown', label: 'covets' },
    { id: 'e-theron-map', source: 'char-theron', target: 'item-map', label: 'carries' },
    { id: 'e-aldric-claim', source: 'char-king-aldric', target: 'plot-claim', label: 'proclaims' },
    { id: 'e-theron-claim', source: 'char-theron', target: 'plot-claim', label: 'answers' },
    { id: 'e-seraphine-betrayal', source: 'char-queen-seraphine', target: 'plot-betrayal', label: 'plots' },
    { id: 'e-claim-reckoning', source: 'plot-claim', target: 'plot-reckoning', label: 'leads to' },
    { id: 'e-betrayal-reckoning', source: 'plot-betrayal', target: 'plot-reckoning', label: 'escalates' },
    { id: 'e-aldric-eldermyr', source: 'char-king-aldric', target: 'loc-eldermyr', label: 'rules' },
    { id: 'e-theron-vault', source: 'char-theron', target: 'loc-vault', label: 'seeks' },
    { id: 'e-crown-sunstone', source: 'lore-crown', target: 'lore-sunstone', label: 'requires' },
    { id: 'e-aldric-wardens', source: 'char-king-aldric', target: 'faction-wardens', label: 'commands' },
    { id: 'e-seraphine-shade', source: 'char-queen-seraphine', target: 'faction-shade-court', label: 'leads' },
    { id: 'e-theron-guild', source: 'char-theron', target: 'faction-merchant-guild', label: 'owes' },
    { id: 'e-aldric-theme', source: 'char-king-aldric', target: 'theme-power', label: 'embodies' },
    { id: 'e-seraphine-theme', source: 'char-queen-seraphine', target: 'theme-power', label: 'rejects' },
    { id: 'e-theron-theme', source: 'char-theron', target: 'theme-power', label: 'sacrifices' }
  ]
};

async function seed() {
  const client = await query('SELECT 1');

  let user = await query('SELECT id, username FROM users WHERE email = $1', [DEMO_USER.email]);
  let userId = user.rows[0]?.id;

  if (!userId) {
    const passwordHash = await bcrypt.hash(DEMO_USER.password, SALT_ROUNDS);
    const created = await query(
      `INSERT INTO users (username, email, password_hash, avatar, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [DEMO_USER.username, DEMO_USER.email, passwordHash, DEMO_USER.avatar, DEMO_USER.bio]
    );
    userId = created.rows[0].id;
    console.log(`Created demo user: ${DEMO_USER.username} (${userId})`);
  } else {
    console.log(`Demo user already exists: ${DEMO_USER.username} (${userId})`);
  }

  const existing = await query('SELECT id FROM projects WHERE user_id = $1 AND title = $2', [userId, 'The Shattered Crown']);
  if (existing.rows[0]) {
    await query('UPDATE projects SET canvas_data = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(canvasData), existing.rows[0].id]);
    console.log('Example project updated with latest data.');
    return;
  }

  const project = await query(
    `INSERT INTO projects (user_id, title, description, is_public, canvas_data, cover_image, genre)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      userId,
      'The Shattered Crown',
      'A complete story architecture demo showing characters, locations, factions, lore, items, themes, and plot events interconnected in one world.',
      true,
      JSON.stringify(canvasData),
      null,
      'Epic Fantasy'
    ]
  );

  console.log(`Seeded example project: ${project.rows[0].id}`);
}

seed()
  .then(() => {
    console.log('Seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
