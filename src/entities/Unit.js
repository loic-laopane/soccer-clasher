// Speed divisor: higher = slower. Base: 3000 → ~33px/s at spd=100
const SPEED_DIV = 3000;

// Per-position speed & HP modifiers (stacked on top of ability modifiers)
const POS_SPD = { GK: 0.45, CB: 0.50, RB: 0.65, LB: 0.65, CDM: 0.72, CM: 0.88, CAM: 0.95, RW: 1.25, LW: 1.25, ST: 1.15 };
const POS_HP  = { GK: 1.60, CB: 1.45, RB: 1.20, LB: 1.20, CDM: 1.10, CM: 1.00, CAM: 0.90, RW: 0.72, LW: 0.72, ST: 0.80 };

// Visual size by role
const ROLE_SIZE = {
  GK:  { bw: 22, bh: 17, hr: 10 }, CB:  { bw: 22, bh: 17, hr: 10 },
  RB:  { bw: 20, bh: 15, hr:  9 }, LB:  { bw: 20, bh: 15, hr:  9 },
  CDM: { bw: 18, bh: 15, hr:  8 }, CM:  { bw: 16, bh: 14, hr:  8 },
  CAM: { bw: 15, bh: 13, hr:  7 }, RW:  { bw: 13, bh: 13, hr:  7 },
  LW:  { bw: 13, bh: 13, hr:  7 }, ST:  { bw: 14, bh: 14, hr:  7 },
};

class Unit {
  constructor(scene, x, y, data, isPlayer, teamData, lane) {
    this.scene   = scene;
    this.x       = x;
    this.y       = y;
    this.data    = data;
    this.isPlayer = isPlayer;
    this.teamData = teamData;
    this.lane    = lane; // 'left' | 'right'
    this.isDead  = false;
    this.state   = 'moving';

    const posMod = POS_SPD[data.position] ?? 1.0;
    const hpMod  = POS_HP [data.position] ?? 1.0;
    const abilitySpd = data.ability === 'fast'   ? 1.4 : 1.0;
    const abilityHp  = data.ability === 'tank'   ? 1.5 : 1.0;

    this.maxHp        = Math.round(data.hp  * hpMod  * abilityHp);
    this.currentHp    = this.maxHp;
    this.atk          = data.atk;
    this.speed        = (data.spd * posMod * abilitySpd) / SPEED_DIV; // px/ms
    this.ability      = data.ability;
    this.attackCooldown = 1000;
    this.attackTimer  = 0;
    this.attackRange  = 55;
    this.direction    = isPlayer ? -1 : 1;

    this._jerseyColor = parseInt(teamData.jerseyColor.slice(1), 16);
    this._sz = ROLE_SIZE[data.position] ?? { bw: 16, bh: 14, hr: 8 };
    this._createVisuals();
  }

  // ─── Visuals ───────────────────────────────────────────────────────────────

  _createVisuals() {
    const { x, y, scene: s, _sz: sz, _jerseyColor: jc } = this;
    const skin     = 0xFFCCAA;
    const hair     = 0x3B2010;
    const secondary = this.teamData.secondaryColor;

    // Shadow
    this._shadow = s.add.ellipse(x, y + sz.bh / 2 + sz.hr / 2 + 2, sz.bw + 4, 6, 0x000000, 0.25).setDepth(5);

    // Legs (behind body)
    this._legL = s.add.rectangle(x - sz.bw * 0.22, y + sz.bh / 2 + 5, sz.bw * 0.22, 9, jc)
      .setStrokeStyle(1, 0x000000, 0.6).setDepth(6);
    this._legR = s.add.rectangle(x + sz.bw * 0.22, y + sz.bh / 2 + 5, sz.bw * 0.22, 9, jc)
      .setStrokeStyle(1, 0x000000, 0.6).setDepth(6);

    // Body (jersey)
    this._body = s.add.rectangle(x, y, sz.bw, sz.bh, jc)
      .setStrokeStyle(1.5, 0x000000, 0.9).setDepth(7);

    // Horizontal stripe on jersey (secondary color accent)
    const stripeH = Math.max(3, Math.round(sz.bh * 0.28));
    this._stripe = s.add.rectangle(x, y - sz.bh * 0.1, sz.bw, stripeH, secondary)
      .setAlpha(0.55).setDepth(8);

    // Head
    const headY = y - sz.bh / 2 - sz.hr;
    this._head = s.add.circle(x, headY, sz.hr, skin)
      .setStrokeStyle(1, 0x000000, 0.8).setDepth(9);

    // Hair (top arc)
    this._hair = s.add.arc(x, headY, sz.hr * 0.95, 200, 340, false, hair)
      .setDepth(10);

    // HP bar
    const barW     = sz.bw + 12;
    const barY     = headY - sz.hr - 7;
    this._barW     = barW;
    this._hpBg     = s.add.rectangle(x, barY, barW, 5, 0x000000, 0.8).setDepth(10);
    this._hpFill   = s.add.rectangle(x - barW / 2, barY, barW, 5, 0x00CC00).setOrigin(0, 0.5).setDepth(11);

    // Ability dot (bottom-right corner of body)
    const DOT_COLOR = { fast: 0xFFFF00, tank: 0xAAAAAA, aoe: 0xFF6600, striker: 0xFF2244, energizer: 0x00FFCC, balanced: 0x44FF44 };
    this._dot = s.add.circle(x + sz.bw / 2, y + sz.bh / 2, 4, DOT_COLOR[this.ability] ?? 0xFFFFFF).setDepth(12);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(delta, enemies, targetFlag, targetGoal) {
    if (this.isDead) return;

    // Keep locked to lane x
    this.x = this.lane === 'left' ? CONFIG.LANE_LEFT_X : CONFIG.LANE_RIGHT_X;

    // Priority 1: fight nearest enemy in same lane within range
    let nearest = null, nearestDist = this.attackRange;
    for (const e of enemies) {
      if (e.isDead) continue;
      const d = Math.abs(this.y - e.y); // same lane → only y distance matters
      if (d < nearestDist) { nearest = e; nearestDist = d; }
    }

    if (nearest) {
      this.state = 'fighting';
      this.attackTimer += delta;
      if (this.attackTimer >= this.attackCooldown) {
        this.attackTimer -= this.attackCooldown;
        nearest.takeDamage(this.atk);
        if (this.ability === 'aoe') {
          for (const e of enemies) {
            if (e !== nearest && !e.isDead && Math.abs(this.y - e.y) < 90) {
              e.takeDamage(Math.round(this.atk * 0.4));
            }
          }
        }
      }
      this._updateVisuals();
      return;
    }

    // Priority 2: attack structures or move
    const activeTarget = (targetFlag && !targetFlag.destroyed) ? targetFlag : targetGoal;
    if (!activeTarget || activeTarget.destroyed) { this._updateVisuals(); return; }

    const distToTarget = Math.abs(this.y - activeTarget.y);
    if (distToTarget <= this.attackRange) {
      this.state = 'attacking_structure';
      this.attackTimer += delta;
      if (this.attackTimer >= this.attackCooldown) {
        this.attackTimer -= this.attackCooldown;
        const dmg = this.ability === 'striker' ? Math.round(this.atk * 1.5) : this.atk;
        activeTarget.takeDamage(dmg);
      }
    } else {
      this.state = 'moving';
      this.attackTimer = 0;
      this.y += this.direction * this.speed * delta;
      // Clamp within field
      this.y = Phaser.Math.Clamp(this.y, 20, CONFIG.FIELD_BOTTOM - 20);
    }

    this._updateVisuals();
  }

  // ─── Damage & Death ────────────────────────────────────────────────────────

  takeDamage(amount) {
    if (this.isDead) return;
    this.currentHp = Math.max(0, this.currentHp - Math.round(amount));
    // Flash red
    this._body.setFillStyle(0xFF3333);
    this._head.setFillStyle(0xFF3333);
    this.scene.time.delayedCall(130, () => {
      if (!this.isDead) {
        this._body.setFillStyle(this._jerseyColor);
        this._head.setFillStyle(0xFFCCAA);
      }
    });
    if (this.currentHp <= 0) this._die();
  }

  _die() {
    this.isDead = true;
    const objs = [this._shadow, this._legL, this._legR, this._body, this._stripe,
                  this._head, this._hair, this._hpBg, this._hpFill, this._dot];
    this.scene.tweens.add({
      targets: objs, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 380,
      onComplete: () => objs.forEach(o => o.destroy()),
    });
  }

  // ─── Visuals update ────────────────────────────────────────────────────────

  _updateVisuals() {
    const x  = Math.round(this.x);
    const y  = Math.round(this.y);
    const sz = this._sz;

    const headY  = y - sz.bh / 2 - sz.hr;
    const legLX  = x - sz.bw * 0.22;
    const legRX  = x + sz.bw * 0.22;
    const legY   = y + sz.bh / 2 + 5;
    const barY   = headY - sz.hr - 7;

    this._shadow.setPosition(x, y + sz.bh / 2 + sz.hr / 2 + 2);
    this._legL.setPosition(legLX, legY);
    this._legR.setPosition(legRX, legY);
    this._body.setPosition(x, y);
    this._stripe.setPosition(x, y - sz.bh * 0.1);
    this._head.setPosition(x, headY);
    this._hair.setPosition(x, headY);
    this._hpBg.setPosition(x, barY);
    this._hpFill.setPosition(x - this._barW / 2, barY);
    this._dot.setPosition(x + sz.bw / 2, y + sz.bh / 2);

    // HP bar
    const pct = this.currentHp / this.maxHp;
    this._hpFill.width = Math.max(0, this._barW * pct);
    this._hpFill.fillColor = pct > 0.5 ? 0x00CC00 : pct > 0.25 ? 0xFFAA00 : 0xFF2200;

    // Leg animation when moving
    const wobble = this.state === 'moving' ? Math.sin(Date.now() * 0.012) * 3 : 0;
    this._legL.setPosition(legLX, legY + wobble);
    this._legR.setPosition(legRX, legY - wobble);
  }
}
