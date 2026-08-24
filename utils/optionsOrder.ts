// Ordre canonique des sections du Poké sur mesure
const SECTION_ORDER = [
  'base',
  'protéine',
  'proteine',
  'accompagnement',
  'topping',
  'sauce supplémentaire',
  'sauce supplementaire',
  'sauce',
  'boisson',
  'dessert',
];

export function sortedOptions(selectedOptions: Record<string, string[]>): [string, string[]][] {
  const entries = Object.entries(selectedOptions);
  const getRank = (key: string): number => {
    const lower = key.toLowerCase();
    for (let i = 0; i < SECTION_ORDER.length; i++) {
      if (lower.includes(SECTION_ORDER[i])) return i;
    }
    return 99;
  };
  return entries.sort(([a], [b]) => getRank(a) - getRank(b));
}

export function splitOptions(selectedOptions: Record<string, string[]>) {
  const food: { sec: string; choices: string[] }[] = [];
  const extras: { sec: string; choices: string[] }[] = [];
  const sorted = sortedOptions(selectedOptions);
  sorted.forEach(([sec, choices]) => {
    const lower = sec.toLowerCase();
    const label = sec.replace(/Choisis t(a|es|on) /i, '').split(' (')[0].toUpperCase();
    if (lower.includes('boisson') || lower.includes('dessert')) {
      extras.push({ sec: label, choices: choices as string[] });
    } else {
      food.push({ sec: label, choices: choices as string[] });
    }
  });
  return { food, extras };
}
