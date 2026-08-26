const COMMERCIAL_TASKS_BY_AREA = {
  I: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  II: ['A', 'B', 'C', 'D', 'E', 'F'],
  III: ['A', 'B'],
  IV: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
  V: ['A', 'B', 'C', 'D', 'E'],
  VI: ['A', 'B', 'C', 'D'],
  VII: ['A', 'B', 'C', 'D', 'E'],
  VIII: ['A', 'B'],
  IX: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  X: ['A', 'B', 'C', 'D'],
  XI: ['A', 'B']
};

const RAW_COMMERCIAL_ADDITIONAL_TABLE = {
  AMEL_from_ASEL: {
    I: 'F,G',
    II: 'A,B,C,D,F',
    III: 'None',
    IV: 'A,B,E,F',
    V: 'A',
    VI: 'None',
    VII: 'All',
    VIII: 'None',
    IX: 'E,F,G',
    X: 'All',
    XI: 'None'
  }
};

function expandTaskList(area, value) {
  if (!value || value === 'None') return [];

  if (value === 'All') {
    return COMMERCIAL_TASKS_BY_AREA[area].map(letter => `${area}_${letter}`);
  }

  return value
    .split(',')
    .map(letter => letter.trim())
    .filter(Boolean)
    .map(letter => `${area}_${letter}`);
}

function buildMap(rawTable) {
  const output = {};

  Object.entries(rawTable).forEach(([key, areaMap]) => {
    output[key] = Object.entries(areaMap).flatMap(([area, value]) =>
      expandTaskList(area, value)
    );
  });

  return output;
}

export const COMMERCIAL_ADDITIONAL_MAPS = buildMap(
  RAW_COMMERCIAL_ADDITIONAL_TABLE
);