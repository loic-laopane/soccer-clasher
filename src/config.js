const CONFIG = {
  WIDTH: 480,
  HEIGHT: 800,
  FIELD_BOTTOM: 638,
  CENTER_Y: 319,

  // Structures (y positions, centered horizontally per lane)
  OPP_GOAL_Y: 40,
  OPP_FLAG_Y: 130,
  PLR_FLAG_Y: 508,
  PLR_GOAL_Y: 598,

  // Two lanes
  LANE_LEFT_X: 140,
  LANE_RIGHT_X: 340,

  // Spawn zones
  OPP_SPAWN_MIN_Y: 165,
  OPP_SPAWN_MAX_Y: 285,
  PLR_SPAWN_MIN_Y: 350,
  PLR_SPAWN_MAX_Y: 465,

  MAX_UNITS_PER_TEAM: 8,   // 4 per lane max

  GOAL_HP: 2000,
  FLAG_HP: 1000,

  ENERGY_MAX: 10,
  ENERGY_START: 5,
  ENERGY_RECHARGE_MS: 2800, // ms per 1 energy pip
};
