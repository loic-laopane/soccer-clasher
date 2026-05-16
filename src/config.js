const CONFIG = {
  WIDTH: 480,
  HEIGHT: 800,
  FIELD_BOTTOM: 638,
  CENTER_Y: 319,

  // Structures
  OPP_GOAL_Y: 40,
  OPP_FLAG_Y: 130,
  PLR_FLAG_Y: 508,
  PLR_GOAL_Y: 598,

  // Bridges at center line (only crossing points between halves)
  BRIDGE_LEFT_X:  100,
  BRIDGE_RIGHT_X: 380,
  BRIDGE_W:       56,  // passable half-width each side

  // Field bounds
  FIELD_LEFT:  16,
  FIELD_RIGHT: 464,

  // Spawn zones (full-width halves)
  OPP_SPAWN_MIN_Y: 60,
  OPP_SPAWN_MAX_Y: 290,
  PLR_SPAWN_MIN_Y: 350,
  PLR_SPAWN_MAX_Y: 610,

  MAX_UNITS_PER_TEAM: 10,

  GOAL_HP: 2500,
  FLAG_HP: 1200,

  // Goalkeeper
  GK_HP:      1800,
  GK_ATK:     38,
  GK_RANGE:   160,  // only shoots when enemy is within this distance from goal
  GK_FIRE_MS: 1500,

  ENERGY_MAX: 10,
  ENERGY_START: 5,
  ENERGY_RECHARGE_MS: 2600,
};
