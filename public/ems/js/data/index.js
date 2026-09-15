import { PRIVATE_DATA } from "./private.js";
import { PRIVATE_GLIDER_DATA } from "./privateGlider.js";
import { COMMERCIAL_GLIDER_DATA } from "./commercialGlider.js";
import { PRIVATE_HELICOPTER_DATA } from "./privateHelicopter.js";
import { COMMERCIAL_HELICOPTER_DATA } from "./commercialHelicopter.js";
import { COMMERCIAL_DATA } from "./commercial.js";
import { ATP_DATA } from "./atp.js";
import { CFI_DATA } from "./cfi.js";
import { INSTRUMENT_DATA } from "./instrument.js";

export const ACS_DATASETS = {
  Private: PRIVATE_DATA,
  PrivateGlider: PRIVATE_GLIDER_DATA,
  PrivateHelicopter: PRIVATE_HELICOPTER_DATA,
  Instrument: INSTRUMENT_DATA,
  Commercial: COMMERCIAL_DATA,
  CommercialGlider: COMMERCIAL_GLIDER_DATA,
  CommercialHelicopter: COMMERCIAL_HELICOPTER_DATA,
  ATP: ATP_DATA,
  CFI: CFI_DATA
};
