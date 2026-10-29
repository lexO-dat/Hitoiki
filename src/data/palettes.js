// Color palettes. Washi is always available; the others are earned with seals (see achievements.js).
// Pure data, no React: [id, kanji, name, seal that unlocks it (null = free)]. The colors live in
// styles.css under :root[data-palette='<id>'] (and the dark variant); tests check their contrast.
export const PALETTES = [
  { id: 'washi', kanji: '和', name: 'Washi', seal: null },
  { id: 'sakura', kanji: '桜', name: 'Sakura', seal: 'day' },
  { id: 'matcha', kanji: '茶', name: 'Matcha', seal: 'levels' },
  { id: 'ai', kanji: '藍', name: 'Ai', seal: 'streak7' },
  { id: 'momiji', kanji: '紅', name: 'Momiji', seal: 'hundred' },
  { id: 'yozakura', kanji: '夜', name: 'Yozakura', seal: 'expert' },
  { id: 'kin', kanji: '金', name: 'Kin', seal: 'streak30' },
];

export const PALETTE_IDS = PALETTES.map((p) => p.id);
