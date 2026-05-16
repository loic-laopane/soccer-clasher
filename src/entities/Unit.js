class Unit {
  constructor(scene, x, y, data, isPlayer, teamData) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.data = data;
    this.isPlayer = isPlayer;
    this.teamData = teamData;
    this.isDead = false;
    this.state = 'moving';

    this.maxHp = Math.round(data.hp * (data.ability === 'tank' ? 1.5 : 1));
    this.currentHp = this.maxHp;
    this.atk = data.atk;
    this.speed = (data.spd * (data.ability === 'fast' ? 1.5 : 1)) / 1000;
    this.ability = data.ability;
    this.attackCooldown = 1000;
    this.attackTimer = 0;
    this.attackRange = 58;
    this.direction = isPlayer ? -1 : 1;

    this._color = parseInt(teamData.jerseyColor.slice(1), 16);
    this._createVisuals();
  }

  _createVisuals() {
    const { x, y, scene: s } = this;
    const initials = this.data.name
      .split(/[\s.]+/).filter(Boolean)
      .map(p => p[0]).join('').slice(0, 2).toUpperCase();

    this.bodyCircle = s.add.circle(x, y, 22, this._color)
      .setStrokeStyle(2, 0xFFFFFF).setDepth(8);
    this.initialsText = s.add.text(x, y, initials, {
      fontSize: '10px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9);

    this.hpBg = s.add.rectangle(x, y - 32, 44, 6, 0x000000, 0.8).setDepth(8);
    this.hpFill = s.add.rectangle(x - 22, y - 32, 44, 6, 0x00CC00)
      .setOrigin(0, 0.5).setDepth(9);

    // Ability indicator dot
    const ABILITY_COLORS = {
      fast: 0xFFFF00, tank: 0xAAAAAA, aoe: 0xFF6600,
      striker: 0xFF2244, energizer: 0x00FFCC, balanced: 0x44FF44,
    };
    this.dotIndicator = s.add.circle(x + 16, y + 16, 5, ABILITY_COLORS[this.ability] || 0xFFFFFF)
      .setDepth(10);
  }

  update(delta, enemies, targetFlag, targetGoal) {
    if (this.isDead) return;

    // Priority 1: fight nearby enemy units
    let nearest = null;
    let nearestDist = this.attackRange;
    for (const e of enemies) {
      if (e.isDead) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
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
            if (e !== nearest && !e.isDead) {
              const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
              if (d < 95) e.takeDamage(Math.round(this.atk * 0.4));
            }
          }
        }
      }
      this._updateVisuals();
      return;
    }

    // Priority 2: attack structures or move toward them
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
      this.x += (this.startX - this.x) * 0.01;
      this.x = Phaser.Math.Clamp(this.x, 30, CONFIG.WIDTH - 30);
    }

    this._updateVisuals();
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.currentHp = Math.max(0, this.currentHp - Math.round(amount));
    this.bodyCircle.setFillStyle(0xFF3333);
    this.scene.time.delayedCall(120, () => {
      if (!this.isDead) this.bodyCircle.setFillStyle(this._color);
    });
    if (this.currentHp <= 0) this._die();
  }

  _die() {
    this.isDead = true;
    const objs = [this.bodyCircle, this.initialsText, this.hpBg, this.hpFill, this.dotIndicator];
    this.scene.tweens.add({
      targets: objs, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 380,
      onComplete: () => objs.forEach(o => o.destroy()),
    });
  }

  _updateVisuals() {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    this.bodyCircle.setPosition(x, y);
    this.initialsText.setPosition(x, y);
    this.hpBg.setPosition(x, y - 32);
    this.hpFill.setPosition(x - 22, y - 32);
    this.dotIndicator.setPosition(x + 16, y + 16);

    const pct = this.currentHp / this.maxHp;
    this.hpFill.width = Math.max(0, 44 * pct);
    this.hpFill.fillColor = pct > 0.5 ? 0x00CC00 : pct > 0.25 ? 0xFFAA00 : 0xFF2200;
  }
}
