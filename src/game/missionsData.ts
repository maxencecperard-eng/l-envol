import { Mission, WorldLandmark, CoinPickup, ThermalUpdraft } from '../types/game';

export const WORLD_LANDMARKS: WorldLandmark[] = [
  { id: 'nest', name: 'Le Grand Chêne (Nid)', position: [0, 22, 0], icon: '🌳', color: '#48bb78' },
  { id: 'windmill', name: 'Le Moulin à Vent', position: [75, 16, 60], icon: '🌾', color: '#ed8936' },
  { id: 'lighthouse', name: 'Le Grand Phare', position: [-130, 32, 110], icon: '🗼', color: '#e53e3e' },
  { id: 'village', name: 'Le Village Perché', position: [110, 24, -90], icon: '🏘️', color: '#ecc94b' },
  { id: 'cliffs', name: 'Les Falaises Brumeuses', position: [-50, 46, -120], icon: '⛰️', color: '#9f7aea' },
  { id: 'lake', name: 'Le Lac Émeraude', position: [-30, 4, 40], icon: '💧', color: '#4299e1' },
];

// Small deterministic PRNG so the scattered pickups are the same on every load
function seededRandom(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const THERMAL_UPDRAFTS: ThermalUpdraft[] = (() => {
  const updrafts: ThermalUpdraft[] = [
    { id: 't1', position: [30, 15, -30], radius: 24, strength: 16 },
    { id: 't2', position: [-70, 20, 30], radius: 28, strength: 20 },
    { id: 't3', position: [50, 25, 110], radius: 30, strength: 22 },
    { id: 't4', position: [-80, 30, -80], radius: 32, strength: 25 },
  ];

  const rand = seededRandom(0x5eed);
  for (let i = 0; i < 14; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 320 + rand() * 1500;
    updrafts.push({
      id: `thermal_${i}`,
      position: [
        Math.round(Math.cos(angle) * radius),
        18 + Math.round(rand() * 25),
        Math.round(Math.sin(angle) * radius),
      ],
      radius: 24 + Math.round(rand() * 12),
      strength: 17 + Math.round(rand() * 10),
    });
  }
  return updrafts;
})();

export const INITIAL_COINS: CoinPickup[] = (() => {
  const coins: CoinPickup[] = [
    // Rings of coins around landmarks and along scenic flight corridors
    { id: 'c1', position: [0, 28, 25], collected: false, value: 5 },
    { id: 'c2', position: [15, 26, 40], collected: false, value: 5 },
    { id: 'c3', position: [35, 24, 50], collected: false, value: 5 },
    { id: 'c4', position: [55, 22, 55], collected: false, value: 10 },
    { id: 'c5', position: [-25, 20, 10], collected: false, value: 5 },
    { id: 'c6', position: [-50, 18, 25], collected: false, value: 5 },
    { id: 'c7', position: [-90, 24, 70], collected: false, value: 10 },
    { id: 'c8', position: [-120, 36, 100], collected: false, value: 15 },
    { id: 'c9', position: [20, 35, -20], collected: false, value: 5 },
    { id: 'c10', position: [50, 32, -50], collected: false, value: 10 },
    { id: 'c11', position: [85, 28, -70], collected: false, value: 10 },
    { id: 'c12', position: [-20, 40, -60], collected: false, value: 10 },
    { id: 'c13', position: [-45, 52, -100], collected: false, value: 15 },
    { id: 'c14', position: [0, 65, 0], collected: false, value: 20 }, // High in sky above nest
    { id: 'c15', position: [-80, 45, 0], collected: false, value: 10 },
    { id: 'c16', position: [70, 35, 30], collected: false, value: 10 },
    { id: 'c17', position: [-100, 25, -50], collected: false, value: 15 },
    { id: 'c18', position: [40, 45, 90], collected: false, value: 15 },
  ];

  // Scattered treasure across the endless world, rewarding exploration
  const rand = seededRandom(0xc0ffee);
  for (let i = 0; i < 90; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 260 + rand() * 1700;
    coins.push({
      id: `wild_coin_${i}`,
      position: [
        Math.round(Math.cos(angle) * radius),
        20 + Math.round(rand() * 80),
        Math.round(Math.sin(angle) * radius),
      ],
      collected: false,
      value: rand() < 0.18 ? 15 : rand() < 0.5 ? 10 : 5,
    });
  }
  return coins;
})();

export const INITIAL_MISSIONS: Mission[] = [
  {
    id: 'm1_tutorial',
    title: 'Didacticiel : Premier Envol',
    category: 'didacticiel',
    description: 'Apprenez à maîtriser vos ailes, à vous orienter avec la mini-carte et à franchir votre premier anneau.',
    dialogue: 'Bienvenue jeune oiseau ! Déploie tes ailes avec la barre ESPACE pour prendre de l\'altitude, puis incline-toi avec les touches directionnelles.',
    coinReward: 60,
    currentObjectiveIndex: 0,
    completed: false,
    unlocked: true,
    objectives: [
      {
        id: 'tut_altitude',
        instruction: 'Battre des ailes (ESPACE) et atteindre 25m d\'altitude',
        position: [0, 28, 10],
        radius: 12,
        type: 'reach',
        completed: false,
        markerLabel: 'Prendre l\'altitude',
        additionalInfo: 'Touche ESPACE pour battre des ailes',
      },
      {
        id: 'tut_dive',
        instruction: 'Pique vers le bas (Touche S ou Flèche Bas) pour accélérer',
        position: [20, 18, 30],
        radius: 14,
        type: 'reach',
        completed: false,
        markerLabel: 'Piquer et accélérer',
        additionalInfo: 'Prenez de la vitesse en piqué',
      },
      {
        id: 'tut_ring',
        instruction: 'Franchis le 1er Anneau Doré au-dessus de la colline',
        position: [45, 24, 45],
        radius: 9,
        type: 'ring',
        completed: false,
        markerLabel: 'Anneau Didacticiel',
        additionalInfo: 'Passez au centre de l\'anneau lumineux',
      },
    ],
  },
  {
    id: 'm2_twigs',
    title: 'Brindilles pour le Nid Royal',
    category: 'aventure',
    description: 'La brise d\'automne a secoué le grand nid. Retrouvez 3 brindilles dorées disséminées et ramenez-les au Grand Chêne.',
    dialogue: 'Le nid a besoin de réparations ! Regarde ta mini-carte en bas à droite pour voir la distance qui te sépare de chaque brindille.',
    coinReward: 120,
    currentObjectiveIndex: 0,
    completed: false,
    unlocked: true,
    objectives: [
      {
        id: 'twig_windmill',
        instruction: 'Ramasser la 1ère brindille près du Moulin à vent',
        position: [72, 18, 55],
        radius: 7,
        type: 'collect',
        completed: false,
        markerLabel: 'Brindille du Moulin',
      },
      {
        id: 'twig_cliffs',
        instruction: 'Ramasser la 2ème brindille sur la crête des Falaises',
        position: [-48, 48, -115],
        radius: 8,
        type: 'collect',
        completed: false,
        markerLabel: 'Brindille des Falaises',
      },
      {
        id: 'twig_village',
        instruction: 'Ramasser la 3ème brindille au bord du Village',
        position: [105, 25, -80],
        radius: 8,
        type: 'collect',
        completed: false,
        markerLabel: 'Brindille du Village',
      },
      {
        id: 'twig_deposit',
        instruction: 'Rapporter les brindilles au Nid du Grand Chêne',
        position: [0, 23, 0],
        radius: 10,
        type: 'reach',
        completed: false,
        markerLabel: 'Nid du Grand Chêne',
      },
    ],
  },
  {
    id: 'm3_lighthouse',
    title: 'Le Mystère du Grand Phare',
    category: 'aventure',
    description: 'Le gardien du phare a perdu ses lunettes de mer sur la corniche. Volez jusqu\'à la lanterne marine puis traversez l\'arche rocheuse.',
    dialogue: 'Cap au sud-ouest ! La mini-carte t\'indique la direction et la distance précise vers le Grand Phare.',
    coinReward: 180,
    currentObjectiveIndex: 0,
    completed: false,
    unlocked: true,
    objectives: [
      {
        id: 'light_top',
        instruction: 'Survoler le sommet de la lanterne du phare',
        position: [-130, 36, 110],
        radius: 10,
        type: 'reach',
        completed: false,
        markerLabel: 'Sommet du Phare',
      },
      {
        id: 'light_ring',
        instruction: 'Franchir l\'anneau marin entre les récifs',
        position: [-105, 14, 85],
        radius: 8,
        type: 'ring',
        completed: false,
        markerLabel: 'Anneau Récif',
      },
      {
        id: 'light_safe',
        instruction: 'Se poser en douceur sur l\'îlot du phare',
        position: [-125, 20, 115],
        radius: 10,
        type: 'land',
        completed: false,
        markerLabel: 'Îlot du Phare',
      },
    ],
  },
  {
    id: 'm4_slalom',
    title: 'Le Slalom des Nuages',
    category: 'defi',
    description: 'Prouvez votre maîtrise aérodynamique en enchaînant 4 anneaux célestes en altitude à haute vitesse.',
    dialogue: 'Prépare-toi à foncer ! Déploie la vitesse maximale de ton oiseau pour négocier ces virages aériens serrés.',
    coinReward: 250,
    currentObjectiveIndex: 0,
    completed: false,
    unlocked: true,
    objectives: [
      {
        id: 'slalom_1',
        instruction: 'Passer l\'Anneau Aérien n°1 (Altitude 45m)',
        position: [-20, 45, 60],
        radius: 8,
        type: 'ring',
        completed: false,
        markerLabel: 'Porte Céleste 1',
      },
      {
        id: 'slalom_2',
        instruction: 'Passer l\'Anneau Aérien n°2 (Altitude 52m)',
        position: [30, 52, 40],
        radius: 8,
        type: 'ring',
        completed: false,
        markerLabel: 'Porte Céleste 2',
      },
      {
        id: 'slalom_3',
        instruction: 'Passer l\'Anneau Aérien n°3 (Altitude 58m)',
        position: [60, 58, -20],
        radius: 8,
        type: 'ring',
        completed: false,
        markerLabel: 'Porte Céleste 3',
      },
      {
        id: 'slalom_4',
        instruction: 'Franchir l\'Anneau Final au-dessus des nuages',
        position: [0, 68, -60],
        radius: 8,
        type: 'ring',
        completed: false,
        markerLabel: 'Porte Céleste Finale',
      },
    ],
  },
  {
    id: 'm5_messenger',
    title: 'Le Courrier des Cimes',
    category: 'aventure',
    description: 'Une lettre urgente doit voyager du clocher du village jusqu\'à la bergerie de la montagne.',
    dialogue: 'Les villageois comptent sur ta célérité. Un oiseau rapide comme le Faucon ou l\'Hirondelle fera des merveilles !',
    coinReward: 320,
    currentObjectiveIndex: 0,
    completed: false,
    unlocked: true,
    objectives: [
      {
        id: 'msg_pickup',
        instruction: 'Récupérer le pli au clocher du village perché',
        position: [112, 28, -90],
        radius: 8,
        type: 'collect',
        completed: false,
        markerLabel: 'Clocher du Village',
      },
      {
        id: 'msg_deliver',
        instruction: 'Livrer la lettre au refuge des falaises',
        position: [-52, 47, -125],
        radius: 10,
        type: 'reach',
        completed: false,
        markerLabel: 'Refuge des Falaises',
      },
    ],
  },
  {
    id: 'm6_phoenix_trial',
    title: 'L\'Épreuve Solaire du Phénix',
    category: 'defi',
    description: 'Captez les courants ascendants thermiques pour monter à plus de 90 mètres et traverser l\'embrasement céleste !',
    dialogue: 'Sens la chaleur monter ! Utilise les colonnes d\'air chaud (tourbillons dorés) pour t\'élever sans perdre d\'énergie.',
    coinReward: 500,
    currentObjectiveIndex: 0,
    completed: false,
    unlocked: true,
    objectives: [
      {
        id: 'phx_thermal',
        instruction: 'Entrer dans l\'ascendance thermique près du lac',
        position: [-70, 22, 30],
        radius: 15,
        type: 'reach',
        completed: false,
        markerLabel: 'Courant Chaud',
      },
      {
        id: 'phx_high',
        instruction: 'S\'élever à 95m d\'altitude dans les stratus',
        position: [-50, 95, -10],
        radius: 16,
        type: 'reach',
        completed: false,
        markerLabel: 'Haute Stratosphère',
      },
      {
        id: 'phx_crown',
        instruction: 'Franchir la Couronne Solaire Céleste',
        position: [0, 92, 0],
        radius: 12,
        type: 'ring',
        completed: false,
        markerLabel: 'Couronne Solaire',
      },
    ],
  },
  {
    id: 'm7_frontier',
    title: 'Les Confins du Monde',
    category: 'aventure',
    description: 'La carte n’a plus de bords. Volez vers l’est jusqu’aux terres inconnues et rapportez la preuve de votre expédition.',
    dialogue: 'Au-delà des falaises, le monde continue à l’infini. Suis le faisceau bleu et laisse la brise te guider.',
    coinReward: 650,
    currentObjectiveIndex: 0,
    completed: false,
    unlocked: true,
    objectives: [
      {
        id: 'frontier_1',
        instruction: 'Atteindre la première borne des plaines lointaines',
        position: [620, 55, 420],
        radius: 18,
        type: 'reach',
        completed: false,
        markerLabel: 'Borne des Plaines',
      },
      {
        id: 'frontier_2',
        instruction: 'Franchir l’anneau des vents au-dessus du grand lac',
        position: [980, 70, -260],
        radius: 14,
        type: 'ring',
        completed: false,
        markerLabel: 'Anneau des Vents',
      },
      {
        id: 'frontier_3',
        instruction: 'Se poser sur le pic du bout du monde',
        position: [1280, 88, 760],
        radius: 20,
        type: 'reach',
        completed: false,
        markerLabel: 'Pic du Bout du Monde',
      },
    ],
  },
  {
    id: 'm8_odyssey',
    title: 'L’Odyssée Sans Frontières',
    category: 'defi',
    description: 'Un tour du monde vertigineux : trois anneaux célestes éloignés de plus de deux kilomètres les uns des autres.',
    dialogue: 'Seuls les oiseaux les plus endurants osent cette odyssée. Prépare-toi à voler longtemps, très longtemps.',
    coinReward: 1200,
    currentObjectiveIndex: 0,
    completed: false,
    unlocked: true,
    objectives: [
      {
        id: 'odyssey_1',
        instruction: 'Franchir l’anneau de l’aube glacée',
        position: [-820, 72, -640],
        radius: 16,
        type: 'ring',
        completed: false,
        markerLabel: 'Anneau de l’Aube',
      },
      {
        id: 'odyssey_2',
        instruction: 'Franchir l’anneau du couchant doré',
        position: [940, 80, -980],
        radius: 16,
        type: 'ring',
        completed: false,
        markerLabel: 'Anneau du Couchant',
      },
      {
        id: 'odyssey_3',
        instruction: 'Boucler l’odyssée à la couronne des nuages',
        position: [1240, 68, 340],
        radius: 16,
        type: 'ring',
        completed: false,
        markerLabel: 'Couronne des Nuages',
      },
    ],
  },
];
