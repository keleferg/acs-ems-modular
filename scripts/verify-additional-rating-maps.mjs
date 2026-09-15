import assert from "node:assert/strict";

import {
  CERT_CONFIG,
} from "../public/ems/js/config/config.js";
import {
  VERIFIED_ADDITIONAL_ALTERNATIVE_GROUPS,
  VERIFIED_ADDITIONAL_MAPS,
} from "../public/ems/js/config/additionalRatingTables.js";
import { COMMERCIAL_DATA } from "../public/ems/js/data/commercial.js";
import { COMMERCIAL_GLIDER_DATA } from "../public/ems/js/data/commercialGlider.js";
import { COMMERCIAL_HELICOPTER_DATA } from "../public/ems/js/data/commercialHelicopter.js";
import { PRIVATE_DATA } from "../public/ems/js/data/private.js";
import { PRIVATE_GLIDER_DATA } from "../public/ems/js/data/privateGlider.js";
import { PRIVATE_HELICOPTER_DATA } from "../public/ems/js/data/privateHelicopter.js";

const datasets = {
  Private: {
    ASEL: PRIVATE_DATA,
    ASES: PRIVATE_DATA,
    AMEL: PRIVATE_DATA,
    AMES: PRIVATE_DATA,
    GLIDER: PRIVATE_GLIDER_DATA,
    RH: PRIVATE_HELICOPTER_DATA,
  },
  Commercial: {
    ASEL: COMMERCIAL_DATA,
    ASES: COMMERCIAL_DATA,
    AMEL: COMMERCIAL_DATA,
    AMES: COMMERCIAL_DATA,
    GLIDER: COMMERCIAL_GLIDER_DATA,
    RH: COMMERCIAL_HELICOPTER_DATA,
  },
};

const expectedPathCounts = {
  Private: { ASEL: 9, ASES: 9, AMEL: 9, AMES: 9, GLIDER: 8, RH: 9 },
  Commercial: { ASEL: 9, ASES: 9, AMEL: 9, AMES: 9, GLIDER: 9, RH: 9 },
};

const expectedDatasetTaskCounts = new Map([
  [PRIVATE_GLIDER_DATA, 47],
  [COMMERCIAL_GLIDER_DATA, 48],
  [PRIVATE_HELICOPTER_DATA, 49],
  [COMMERCIAL_HELICOPTER_DATA, 51],
]);

for (const [dataset, expected] of expectedDatasetTaskCounts) {
  assert.equal(
    dataset.reduce((total, area) => total + area.tasks.length, 0),
    expected,
  );
}

for (const certificate of ["Private", "Commercial"]) {
  assert(CERT_CONFIG[certificate].ratings.includes("GLIDER"));
  assert(CERT_CONFIG[certificate].ratings.includes("RH"));

  for (const [target, expectedCount] of Object.entries(expectedPathCounts[certificate])) {
    const prefix = `${target}_from_`;
    const keys = Object.keys(VERIFIED_ADDITIONAL_MAPS[certificate]).filter(key =>
      key.startsWith(prefix)
    );
    assert.equal(keys.length, expectedCount, `${certificate} ${target} path count`);
  }

  for (const [key, rawCodes] of Object.entries(VERIFIED_ADDITIONAL_MAPS[certificate])) {
    const target = key.split("_from_")[0];
    const dataset = datasets[certificate][target];
    assert(dataset, `Missing dataset for ${certificate} ${target}`);

    const validCodes = new Set(
      dataset.flatMap(area => area.tasks.map(task => `${area.id}_${task.id}`)),
    );
    const requiredCodes = new Set(rawCodes.filter(code => code.includes("_")));

    for (const code of requiredCodes) {
      assert(validCodes.has(code), `${certificate} ${key} references unknown ${code}`);
    }

    for (const group of VERIFIED_ADDITIONAL_ALTERNATIVE_GROUPS[certificate]?.[key] || []) {
      assert(group.id, `${certificate} ${key} has an alternative group without an id`);
      assert(group.options?.length > 1, `${certificate} ${key} ${group.id} needs alternatives`);

      for (const option of group.options) {
        assert(option.length > 0, `${certificate} ${key} ${group.id} has an empty option`);
        for (const code of option) {
          assert(validCodes.has(code), `${certificate} ${key} ${group.id} references unknown ${code}`);
          assert(requiredCodes.has(code), `${certificate} ${key} ${group.id} is absent from its task map: ${code}`);
        }
      }
    }
  }
}

console.log("Additional-rating verification passed: 107 FAA task paths checked.");
