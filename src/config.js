const CONFIG = {
  WIDTH: 480,
  HEIGHT: 800,
  FIELD_BOTTOM: 668,   // expanded field (+30px)
  CENTER_Y: 334,

  // Structures
  OPP_GOAL_Y: 28,
  OPP_FLAG_Y: 125,
  PLR_FLAG_Y: 543,
  PLR_GOAL_Y: 640,

  // Bridges at center line — obligatory crossing points
  BRIDGE_LEFT_X:  110,
  BRIDGE_RIGHT_X: 370,
  BRIDGE_W:       70,   // wider bridges

  // Field bounds
  FIELD_LEFT:  14,
  FIELD_RIGHT: 466,

  // AI spawn zones
  OPP_SPAWN_MIN_Y: 50,
  OPP_SPAWN_MAX_Y: 300,

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
