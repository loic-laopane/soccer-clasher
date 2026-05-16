const CONFIG = {
  WIDTH: 480,
  HEIGHT: 800,
  FIELD_BOTTOM: 702,   // field occupies most of screen
  CENTER_Y: 351,

  // Structures (symmetric around CENTER_Y)
  OPP_GOAL_Y: 26,
  OPP_FLAG_Y: 128,
  PLR_FLAG_Y: 574,
  PLR_GOAL_Y: 676,

  // Bridges at center line — obligatory crossing points
  BRIDGE_LEFT_X:  110,
  BRIDGE_RIGHT_X: 370,
  BRIDGE_W:       70,   // wider bridges

  // Field bounds
  FIELD_LEFT:  14,
  FIELD_RIGHT: 466,

  // AI spawn zones
  OPP_SPAWN_MIN_Y: 48,
  OPP_SPAWN_MAX_Y: 310,

  // Chase range: only chase enemy if closer than this (else advance toward structures)
  CHASE_RANGE: 220,

  MAX_UNITS_PER_TEAM: 10,

  GOAL_HP: 2500,
  FLAG_HP: 1200,

  GK_HP:      1800,
  GK_ATK:     38,
  GK_RANGE:   160,
  GK_FIRE_MS: 1500,

  ENERGY_MAX: 10,
  ENERGY_START: 5,
  ENERGY_RECHARGE_MS: 2600,
};
