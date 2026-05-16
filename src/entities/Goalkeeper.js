// GK stays in goal, shoots ball projectiles at enemies that come close to the goal.
// GK_RANGE in config defines how close an enemy must be before GK fires.

class Goalkeeper {
  constructor(scene, x, y, isPlayer, teamData) {
    this.scene    = scene;
    this.x        = x;
    this.y        = y;
    this.isPlayer = isPlayer;
    this.teamData = teamData;
    this.isDead   = false;

    this.maxHp     = CONFIG.GK_HP;
    this.currentHp = CONFIG.GK_HP;
    this.fireTimer = 0;
    this.fireCooldown = CONFIG.GK_FIRE_MS;
    this._baseX   = x;
    this._baseY   = y;
    this._wobble  = 0;

    this._jerseyColor = parseInt(teamData.jerseyColor.slice(1), 16);
    this._createVisuals();
  }

  _createVisuals() {
    const {x, y, scene:s, _jerseyColor:jc} = this;
    const skin = 0xFFCCAA;
    const hair = 0x1A0D00;
    const sc   = this.teamData.secondaryColor;
    // GK is large
    const bw = 26, bh = 20, hr = 12;
    this._bw = bw; this._bh = bh; this._hr = hr;

    this._shadow = s.add.ellipse(x, y+bh/2+hr/2+2, bw+8, 8, 0x000000, 0.3).setDepth(5);
    this._legL   = s.add.rectangle(x-bw*0.22, y+bh/2+5, bw*0.24, 11, 0x111111).setStrokeStyle(1,0x000000).setDepth(6);
    this._legR   = s.add.rectangle(x+bw*0.22, y+bh/2+5, bw*0.24, 11, 0x111111).setStrokeStyle(1,0x000000).setDepth(6);
    // GK has bright yellow jersey
    this._body   = s.add.rectangle(x, y, bw, bh, 0xFFDD00).setStrokeStyle(2,0x000000,0.9).setDepth(7);
    this._stripe = s.add.rectangle(x, y-bh*0.1, bw, Math.max(3,Math.round(bh*0.28)), jc).setAlpha(0.6).setDepth(8);
    const headY  = y - bh/2 - hr;
    this._head   = s.add.circle(x, headY, hr, skin).setStrokeStyle(1,0x000000,0.8).setDepth(9);
    this._hair   = s.add.arc(x, headY, hr*0.95, 200, 340, false, hair).setDepth(10);

    // HP bar
    const barW  = bw + 16;
    const barY  = headY - hr - 8;
    this._barW  = barW;
    this._hpBg  = s.add.rectangle(x, barY, barW, 5, 0x000000, 0.85).setDepth(10);
    this._hpFill= s.add.rectangle(x-barW/2, barY, barW, 5, 0x00DDFF).setOrigin(0,0.5).setDepth(11);

    // GK label
    this._label = s.add.text(x, headY - hr - 18, 'GK', {
      fontSize: '9px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12);
  }

  update(delta, enemies) {
    if (this.isDead) return;

    // Subtle side-to-side oscillation
    this._wobble = Math.sin(Date.now() * 0.0018) * 18;
    const x = Math.round(this._baseX + this._wobble);
    const y = Math.round(this._baseY);
    this.x = x;
    this.y = y;

    // Find nearest enemy within GK_RANGE of the goal
    let target = null, minDist = CONFIG.GK_RANGE;
    for (const e of enemies) {
      if (e.isDead) continue;
      const d = Math.hypot(this._baseX - e.x, this._baseY - e.y);
      if (d < minDist) { target = e; minDist = d; }
    }

    if (target) {
      this.fireTimer += delta;
      if (this.fireTimer >= this.fireCooldown) {
        this.fireTimer = 0;
        this._shoot(target);
      }
    } else {
      this.fireTimer = 0;
    }

    this._updateVisuals(x, y);
  }

  _shoot(target) {
    // Create a ball projectile
    const ball = new GKBall(this.scene, this.x, this.y, target, CONFIG.GK_ATK);
    this.scene.gkBalls.push(ball);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.currentHp = Math.max(0, this.currentHp - Math.round(amount));
    this._body.setFillStyle(0xFF3333);
    this.scene.time.delayedCall(130, () => {
      if (!this.isDead) this._body.setFillStyle(0xFFDD00);
    });
    if (this.currentHp <= 0) this._die();
  }

  _die() {
    this.isDead = true;
    const objs = [this._shadow, this._legL, this._legR, this._body,
                  this._stripe, this._head, this._hair, this._hpBg, this._hpFill, this._label];
    this.scene.tweens.add({
      targets: objs, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 400,
      onComplete: () => objs.forEach(o => o.destroy()),
    });
  }

  _updateVisuals(x, y) {
    const bw = this._bw, bh = this._bh, hr = this._hr;
    const headY = y - bh/2 - hr;
    const barY  = headY - hr - 8;

    this._shadow.setPosition(x, y+bh/2+hr/2+2);
    this._legL.setPosition(x-bw*0.22, y+bh/2+5);
    this._legR.setPosition(x+bw*0.22, y+bh/2+5);
    this._body.setPosition(x, y);
    this._stripe.setPosition(x, y-bh*0.1);
    this._head.setPosition(x, headY);
    this._hair.setPosition(x, headY);
    this._hpBg.setPosition(x, barY);
    this._hpFill.setPosition(x-this._barW/2, barY);
    this._label.setPosition(x, headY-hr-18);

    const pct = this.currentHp / this.maxHp;
    this._hpFill.width = Math.max(0, this._barW * pct);
    this._hpFill.fillColor = pct > 0.5 ? 0x00DDFF : pct > 0.25 ? 0xFFAA00 : 0xFF2200;
  }
}

// ── Ball projectile ────────────────────────────────────────────────────────────

class GKBall {
  constructor(scene, x, y, target, damage) {
    this.scene   = scene;
    this.x       = x;
    this.y       = y;
    this.target  = target;
    this.damage  = damage;
    this.speed   = 0.38; // px/ms
    this.isDone  = false;

    // Direction toward target at moment of firing
    const dx = target.x - x, dy = target.y - y;
    const d  = Math.hypot(dx, dy) || 1;
    this.vx  = (dx / d) * this.speed;
    this.vy  = (dy / d) * this.speed;

    this._gfx = scene.add.graphics().setDepth(20);
    this._draw();
  }

  _draw() {
    this._gfx.clear();
    // White ball with black patches
    this._gfx.fillStyle(0xFFFFFF);
    this._gfx.fillCircle(this.x, this.y, 6);
    this._gfx.fillStyle(0x111111);
    this._gfx.fillCircle(this.x, this.y, 2);
    this._gfx.fillCircle(this.x + 3, this.y - 2, 1.5);
    this._gfx.fillCircle(this.x - 3, this.y - 2, 1.5);
  }

  update(delta) {
    if (this.isDone) return;

    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this._draw();

    // Hit check on original target
    if (!this.target.isDead) {
      const d = Math.hypot(this.x - this.target.x, this.y - this.target.y);
      if (d < 18) {
        this.target.takeDamage(this.damage);
        this._destroy();
        return;
      }
    }

    // Out of field
    if (this.x < 0 || this.x > CONFIG.WIDTH || this.y < 0 || this.y > CONFIG.FIELD_BOTTOM + 20) {
      this._destroy();
    }
  }

  _destroy() {
    this.isDone = true;
    this._gfx.destroy();
  }
}
