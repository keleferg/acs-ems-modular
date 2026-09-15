/*
 * FAA additional-rating task tables.
 *
 * Sources (current FAA publications, effective May 31, 2024):
 * - FAA-S-ACS-6C, Private Pilot for Airplane Category
 * - FAA-S-ACS-7B, Commercial Pilot for Airplane Category
 * - FAA-S-8081-22A, Private Pilot Practical Test Standards for Glider
 * - FAA-S-8081-23B, Commercial Pilot Practical Test Standards for Glider
 * - FAA-S-ACS-15, Private Pilot Rotorcraft–Helicopter
 * - FAA-S-ACS-16, Commercial Pilot Rotorcraft–Helicopter
 *
 * Keep the tables expressed by Area of Operation. This mirrors the FAA
 * source tables and makes review substantially safer than flat code lists.
 */

function codes(table) {
  return Object.entries(table).flatMap(([area, tasks]) =>
    String(tasks)
      .split(",")
      .map(task => task.trim())
      .filter(Boolean)
      .flatMap(task => {
        const underscore = `${area}_${task}`;
        return [underscore, underscore.replace("_", ".")];
      })
  );
}

const PRIVATE_ASEL_COMMON = {
  RH: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XII: "A" }),
  RG: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XII: "A" }),
  GLIDER: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B", VI: "A,B,C,D", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XI: "A", XII: "A" }),
  BALLOON: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B", VI: "A,B,C,D", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XI: "A", XII: "A" }),
  AIRSHIP: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XI: "A", XII: "A" }),
  PL: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XI: "A", XII: "A" }),
};

const PRIVATE_ASES_COMMON = {
  RH: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XII: "B" }),
  RG: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XII: "B" }),
  GLIDER: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B", VI: "A,B,C,D", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XI: "A", XII: "B" }),
  BALLOON: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B", VI: "A,B,C,D", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XI: "A", XII: "B" }),
  AIRSHIP: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XI: "A", XII: "B" }),
  PL: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,B,C,D", XII: "B" }),
};

const PRIVATE_AMEL_COMMON = {
  RH: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XII: "A" }),
  RG: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XII: "A" }),
  GLIDER: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A,B", VI: "A,B,C,D", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A", XII: "A" }),
  BALLOON: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A,B", VI: "A,B,C,D", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A", XII: "A" }),
  AIRSHIP: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A", XII: "A" }),
  PL: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XII: "A" }),
};

const PRIVATE_AMES_COMMON = {
  RH: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XII: "B" }),
  RG: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XII: "B" }),
  GLIDER: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A,B", VI: "A,B,C,D", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A", XII: "B" }),
  BALLOON: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A,B", VI: "A,B,C,D", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A", XII: "B" }),
  AIRSHIP: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A,B", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A", XII: "B" }),
  PL: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A", VII: "A,B,C", VIII: "A,B,C,D,E,F", IX: "A,C,E,F,G", X: "A,B,C,D", XII: "B" }),
};

function prefixed(target, entries) {
  return Object.fromEntries(
    Object.entries(entries).map(([held, value]) => [`${target}_from_${held}`, value])
  );
}

export const VERIFIED_ADDITIONAL_MAPS = {
  Private: {
    ASEL_from_ASES: codes({ I: "F,G", II: "A,B,D,F", III: "B", IV: "A,B,C,D,E,F", IX: "A,B,C", XII: "A" }),
    ASEL_from_AMEL: codes({ I: "F,G", II: "A,B,F", IV: "A,B,C,D,E,F,M", IX: "A,B,C" }),
    ASEL_from_AMES: codes({ I: "F,G", II: "A,B,D,F", III: "B", IV: "A,B,C,D,E,F,M", IX: "A,B,C", XII: "A" }),
    ...prefixed("ASEL", PRIVATE_ASEL_COMMON),

    ASES_from_ASEL: codes({ I: "F,G,I", II: "A,B,E,F", III: "B", IV: "A,B,G,H,I,J,K,L", IX: "A,B", XII: "B" }),
    ASES_from_AMEL: codes({ I: "F,G,I", II: "A,B,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M", IX: "A,B", XII: "B" }),
    ASES_from_AMES: codes({ I: "F,G", II: "A,B,F", IV: "A,B,M", IX: "A,B" }),
    ...prefixed("ASES", PRIVATE_ASES_COMMON),

    AMEL_from_ASEL: codes({ I: "F,G", II: "A,B,C,D,F", IV: "A,B,E,F", V: "A", VII: "A,B,C", IX: "E,F,G", X: "A,B,C,D" }),
    AMEL_from_ASES: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F", V: "A", VII: "A,B,C", IX: "E,F,G", X: "A,B,C,D", XII: "A" }),
    AMEL_from_AMES: codes({ I: "F,G", II: "A,D", III: "B", IV: "A,B,E,F", XII: "A" }),
    ...prefixed("AMEL", PRIVATE_AMEL_COMMON),

    AMES_from_ASEL: codes({ I: "F,G,I", II: "A,B,E,F", IV: "A,B,G,H,I,J,K,L", V: "A", VII: "A,B,C", IX: "E,F,G", X: "A,B,C,D", XII: "B" }),
    AMES_from_ASES: codes({ I: "F,G", II: "A,B,E,F", IV: "A,B", V: "A", VII: "A,B,C", IX: "E,F,G", X: "A,B,C,D" }),
    AMES_from_AMEL: codes({ I: "F,G,I", II: "A,B,E,F", IV: "A,B,G,H,I,J,K,L", XII: "B" }),
    ...prefixed("AMES", PRIVATE_AMES_COMMON),

    ...prefixed("GLIDER", Object.fromEntries(
      ["ASEL", "ASES", "AMEL", "AMES", "RH", "RG"].map(held => [held,
        codes({ I: "B,C,D", II: "A,B,C,E", III: "B", IV: "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S", V: "A,B", VI: "A,B,C", VII: "A,B,C", IX: "A,B", X: "A,B", XI: "A" })
      ])
    )),
    GLIDER_from_BALLOON: codes({ I: "C,D", II: "A,B,C,D,E", III: "B", IV: "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S", V: "A,B", VI: "A,B,C", VII: "A,B,C", VIII: "A", IX: "A,B", X: "A,B", XI: "A" }),
    GLIDER_from_AIRSHIP: codes({ I: "C,D", II: "A,B,C,E", III: "B", IV: "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S", V: "A,B", VI: "A,B,C", VII: "A,B,C", IX: "A,B", X: "A,B", XI: "A" }),

    ...prefixed("RH", Object.fromEntries(
      ["ASEL", "ASES", "AMEL", "AMES", "RG", "AIRSHIP", "PL"].map(held => [held,
        codes({ I: "E,F,G", II: "A,B,C,D", III: "A,C", IV: "A,B,C,E", V: "A,B,C,D,E,F,G,H", VI: "A,B,C", VIII: "A,B,C,D,E,F,G,H,I,J,K", X: "A" })
      ])
    )),
    RH_from_GLIDER: codes({ I: "D,E,F,G", II: "A,B,C,D", III: "A,B,C", IV: "A,B,C,E", V: "A,B,C,D,E,F,G,H", VI: "A,B,C", VII: "A,B,C,D", VIII: "A,B,C,D,E,F,G,H,I,J,K", IX: "A", X: "A" }),
    RH_from_BALLOON: codes({ I: "D,E,F,G", II: "A,B,C,D", III: "A,B,C", IV: "A,B,C,E", V: "A,B,C,D,E,F,G,H", VI: "A,B,C", VII: "A,B,C,D", VIII: "A,B,C,D,E,F,G,H,I,J,K", IX: "A", X: "A" }),
  },

  Commercial: {
    ASEL_from_ASES: codes({ I: "F,G", II: "A,B,D,F", III: "B", IV: "A,B,C,D,E,F", IX: "B", XI: "A" }),
    ASEL_from_AMEL: codes({ I: "F,G", II: "A,B,F", IV: "A,B,C,D,E,F,M", V: "B,C,D,E", IX: "B,C" }),
    ASEL_from_AMES: codes({ I: "F,G", II: "A,B,D,F", III: "B", IV: "A,B,C,D,E,F,M", V: "B,C,D,E", IX: "B,C", XI: "A" }),
    ASEL_from_RH: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B,C,D,E", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "A" }),
    ASEL_from_RG: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B,C,D,E", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "A" }),
    ASEL_from_PL: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B,C,D,E", VII: "A,B,C,D,E", IX: "A,B,C", XI: "A" }),
    ASEL_from_GLIDER: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B,C,D,E", VI: "A,B,C,D", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "A" }),
    ASEL_from_BALLOON: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B,C,D,E", VI: "A,B,C,D", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "A" }),
    ASEL_from_AIRSHIP: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,C,D,E,F,M,N", V: "A,B,C,D,E", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "A" }),

    ASES_from_ASEL: codes({ I: "F,G,I", II: "A,B,E,F", III: "B", IV: "A,B,G,H,I,J,K,L", XI: "B" }),
    ASES_from_AMEL: codes({ I: "F,G,I", II: "A,B,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M", V: "B,C,D,E", IX: "B,C", XI: "B" }),
    ASES_from_AMES: codes({ I: "F,G", II: "A,B,F", IV: "A,B,M", V: "B,C,D,E", IX: "B,C" }),
    ASES_from_RH: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B,C,D,E", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "B" }),
    ASES_from_RG: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B,C,D,E", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "B" }),
    ASES_from_PL: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B,C,D,E", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "B" }),
    ASES_from_GLIDER: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B,C,D,E", VI: "A,B,C,D", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "B" }),
    ASES_from_BALLOON: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B,C,D,E", VI: "A,B,C,D", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "B" }),
    ASES_from_AIRSHIP: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,M,N", V: "A,B,C,D,E", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,B,C", XI: "B" }),

    AMEL_from_ASEL: codes({ I: "F,G", II: "A,B,C,D,F", IV: "A,B,E,F", V: "A", VII: "A,B,C,D,E", IX: "E,F,G", X: "A,B,C,D" }),
    AMEL_from_ASES: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F", V: "A", VII: "A,B,C,D,E", IX: "E,F,G", X: "A,B,C,D", XI: "A" }),
    AMEL_from_AMES: codes({ I: "F,G", II: "A,D", III: "B", IV: "A,B,E,F", V: "A", XI: "A" }),
    AMEL_from_RH: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A" }),
    // FAA-S-ACS-7B prints “D,F” in Area III for the RG column, but Area III
    // contains only Tasks A and B. Use Task B, the applicable traffic-pattern
    // task, rather than silently creating non-existent ACS Tasks.
    AMEL_from_RG: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "B", V: "A", VI: "A", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A" }),
    AMEL_from_PL: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A", VII: "A,B,C,D,E", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A" }),
    AMEL_from_GLIDER: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A", VI: "A,B,C,D", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A" }),
    AMEL_from_BALLOON: codes({ I: "D,F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A", VI: "A,B,C,D", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A" }),
    AMEL_from_AIRSHIP: codes({ I: "F,G", II: "A,B,C,D,F", III: "B", IV: "A,B,E,F,N", V: "A", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "A" }),

    AMES_from_ASEL: codes({ I: "F,G,I", II: "A,B,E,F", IV: "A,B,G,H,I,J,K,L", V: "A", VII: "A,B,C,D,E", IX: "E,F,G", X: "A,B,C,D", XI: "B" }),
    AMES_from_ASES: codes({ I: "F,G", II: "A,B,E,F", IV: "A,B", V: "A", VII: "A,B,C,D,E", IX: "E,F,G", X: "A,B,C,D" }),
    AMES_from_AMEL: codes({ I: "F,G,I", II: "A,B,E,F", IV: "A,B,G,H,I,J,K,L", XI: "B" }),
    AMES_from_RH: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "B" }),
    AMES_from_RG: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "B" }),
    AMES_from_PL: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A", VII: "A,B,C,D,E", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "B" }),
    AMES_from_GLIDER: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A", VI: "A,B,C,D", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "B" }),
    AMES_from_BALLOON: codes({ I: "D,F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A", VI: "A,B,C,D", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "B" }),
    AMES_from_AIRSHIP: codes({ I: "F,G,I", II: "A,B,C,E,F", III: "B", IV: "A,B,G,H,I,J,K,L,N", V: "A", VII: "A,B,C,D,E", VIII: "A,B", IX: "A,C,E,F,G", X: "A,B,C,D", XI: "B" }),

    ...prefixed("GLIDER", Object.fromEntries(
      ["ASEL", "ASES", "AMEL", "AMES", "RH", "RG", "PL", "AIRSHIP"].map(held => [held,
        codes({ I: "B,C,D,E", II: "A,B,C,E", III: "B", IV: "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S", V: "A,B", VI: "A,B,C", VII: "A,B,C", IX: "A,B", X: "A,B", XI: "A" })
      ])
    )),
    GLIDER_from_BALLOON: codes({ I: "B,C,D,E", II: "A,B,C,D,E", III: "A,B,C", IV: "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S", V: "A,B", VI: "A,B,C", VII: "A,B,C", VIII: "A", IX: "A,B", X: "A,B", XI: "A" }),

    ...prefixed("RH", Object.fromEntries(
      ["ASEL", "ASES", "AMEL", "AMES", "RG", "AIRSHIP", "PL"].map(held => [held,
        codes({ I: "E,F,G", II: "A,B,C,D", III: "A,C", IV: "A,B,C,E", V: "A,B,C,D,F,G", VI: "A,B,C", VIII: "A,B,C,D,E,F,G,H,I,J,K,L,M", IX: "A,B", X: "A" })
      ])
    )),
    RH_from_GLIDER: codes({ I: "D,E,F,G", II: "A,B,C,D", III: "A,B,C", IV: "A,B,C,E", V: "A,B,C,D,F,G", VI: "A,B,C", VII: "A,B,C,D", VIII: "A,B,C,D,E,F,G,H,I,J,K,L,M", IX: "A,B", X: "A" }),
    RH_from_BALLOON: codes({ I: "D,E,F,G", II: "A,B,C,D", III: "A,B,C", IV: "A,B,C,E", V: "A,B,C,D,F,G", VI: "A,B,C", VII: "A,B,C,D", VIII: "A,B,C,D,E,F,G,H,I,J,K,L,M", IX: "A,B", X: "A" }),
  },
};

function commercialSingleEngineAlternatives(target, held, includeAB) {
  const prefix = `COMMERCIAL_${target}_FROM_${held}`;
  const groups = [];

  if (includeAB) {
    groups.push({
      id: `${prefix}_AREA_V_AB`,
      label: "Area V — Task A or B",
      options: [["V_A"], ["V_B"]],
    });
  }

  groups.push({
    id: `${prefix}_AREA_V_CD`,
    label: "Area V — Task C or D",
    options: [["V_C"], ["V_D"]],
  });

  return groups;
}

const NON_AIRPLANE_HELD = ["RH", "RG", "PL", "GLIDER", "BALLOON", "AIRSHIP"];

export const VERIFIED_ADDITIONAL_ALTERNATIVE_GROUPS = {
  Private: {},
  Commercial: {
    ASEL_from_AMEL: commercialSingleEngineAlternatives("ASEL", "AMEL", false),
    ASEL_from_AMES: commercialSingleEngineAlternatives("ASEL", "AMES", false),
    ASES_from_AMEL: commercialSingleEngineAlternatives("ASES", "AMEL", false),
    ASES_from_AMES: commercialSingleEngineAlternatives("ASES", "AMES", false),
    ...Object.fromEntries(
      ["ASEL", "ASES"].flatMap(target =>
        NON_AIRPLANE_HELD.map(held => [
          `${target}_from_${held}`,
          commercialSingleEngineAlternatives(target, held, true),
        ])
      )
    ),
  },
};

const GLIDER_LAUNCH_GROUP = {
  label: "Area IV — one launch method",
  options: [
    ["IV_A", "IV_B", "IV_C", "IV_D", "IV_E", "IV_F", "IV_G"],
    ["IV_H", "IV_I", "IV_J"],
    ["IV_K", "IV_L", "IV_M", "IV_N", "IV_O", "IV_P"],
  ],
};

function helicopterGroups(certificate, heldRatings) {
  return Object.fromEntries(heldRatings.map(held => {
    const prefix = `${certificate.toUpperCase()}_RH_FROM_${held}`;
    return [`RH_from_${held}`, [
      {
        id: `${prefix}_AREA_VI_BC`,
        label: "Area VI — Task B or C",
        options: [["VI_B"], ["VI_C"]],
      },
      {
        id: `${prefix}_AREA_VIII_ENGINE`,
        label: "Area VIII — single-engine Tasks A and B, or multiengine Task C",
        options: [["VIII_A", "VIII_B"], ["VIII_C"]],
      },
      ...(certificate === "Private" ? [{
        id: `${prefix}_AREA_V_FGH`,
        label: "Area V — one additional Task (F, G, or H)",
        options: [["V_F"], ["V_G"], ["V_H"]],
      }] : []),
    ]];
  }));
}

for (const certificate of ["Private", "Commercial"]) {
  const maps = VERIFIED_ADDITIONAL_MAPS[certificate];
  const alternatives = VERIFIED_ADDITIONAL_ALTERNATIVE_GROUPS[certificate];

  for (const key of Object.keys(maps).filter(key => key.startsWith("GLIDER_from_"))) {
    alternatives[key] = [{
      ...GLIDER_LAUNCH_GROUP,
      id: `${certificate.toUpperCase()}_${key.toUpperCase()}_AREA_IV_LAUNCH`,
    }];
  }

  Object.assign(
    alternatives,
    helicopterGroups(
      certificate,
      Object.keys(maps)
        .filter(key => key.startsWith("RH_from_"))
        .map(key => key.replace("RH_from_", "")),
    ),
  );
}

export const VERIFIED_INITIAL_ALTERNATIVE_GROUPS = {
  Private: {
    GLIDER: [{ ...GLIDER_LAUNCH_GROUP, id: "PRIVATE_GLIDER_INITIAL_AREA_IV_LAUNCH" }],
    RH: [
      {
        id: "PRIVATE_RH_INITIAL_AREA_VI_BC",
        label: "Area VI — Task B or C",
        options: [["VI_B"], ["VI_C"]],
      },
      {
        id: "PRIVATE_RH_INITIAL_AREA_VIII_ENGINE",
        label: "Area VIII — single-engine Tasks A and B, or multiengine Task C",
        options: [["VIII_A", "VIII_B"], ["VIII_C"]],
      },
      {
        id: "PRIVATE_RH_INITIAL_AREA_V_FGH",
        label: "Area V — one additional Task (F, G, or H)",
        options: [["V_F"], ["V_G"], ["V_H"]],
      },
    ],
  },
  Commercial: {
    GLIDER: [{ ...GLIDER_LAUNCH_GROUP, id: "COMMERCIAL_GLIDER_INITIAL_AREA_IV_LAUNCH" }],
    RH: [
      {
        id: "COMMERCIAL_RH_INITIAL_AREA_VI_BC",
        label: "Area VI — Task B or C",
        options: [["VI_B"], ["VI_C"]],
      },
      {
        id: "COMMERCIAL_RH_INITIAL_AREA_VIII_ENGINE",
        label: "Area VIII — single-engine Tasks A and B, or multiengine Task C",
        options: [["VIII_A", "VIII_B"], ["VIII_C"]],
      },
    ],
  },
};
