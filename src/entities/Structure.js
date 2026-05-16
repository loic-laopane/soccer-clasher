class Structure {
  constructor(scene, x, y, type, maxHp, primaryColor, secondaryColor, label) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.destroyed = false;

    this.w = type === 'goal' ? 130 : 82;
    this.h = type === 'goal' ? 50 : 32;

    this._buildVisuals(primaryColor, secondaryColor, label);
  }

  _buildVisuals(primaryColor, secondaryColor, label) {
    const { scene: s, x, y, w, h } = this;

    this.body = s.add.rectangle(x, y, w, h, primaryColor)
      .setStrokeStyle(3, 0xFFFFFF).setDepth(3);

    if (this.type === 'goal') {
      // Net grid lines
      const g = s.add.graphics().setDepth(4);
      g.lineStyle(1, 0xFFFFFF, 0.3);
      for (let dx = -w / 2 + 13; dx < w / 2; dx += 13) {
        g.lineBetween(x + dx, y - h / 2, x + dx, y + h / 2);
      }
      for (let dy = -h / 2 + 10; dy < h / 2; dy += 10) {
        g.lineBetween(x - w / 2, y + dy, x + w / 2, y + dy);
      }
      this._netGfx = g;

      // Top accent bar
      s.add.rectangle(x, y - h / 2 + 4, w, 8, secondaryColor).setDepth(4);
    } else {
      // Flag pole
      s.add.rectangle(x, y - h / 2 - 10, 3, 20, 0xFFFFFF).setDepth(4);
      // Flag triangle
      const fg = s.add.graphics().setDepth(5);
      fg.fillStyle(secondaryColor);
      fg.fillTriangle(x + 2, y - h / 2 - 20, x + 2, y - h / 2 - 8, x + 18, y - h / 2 - 14);
      this._flagGfx = fg;
    }

    this.labelText = s.add.text(x, y + 2, label, {
      fontSize: this.type === 'goal' ? '13px' : '10px',
      color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setDepth(5);

    const barY = y - h / 2 - (this.type === 'flag' ? 28 : 12);
    this.hpBg = s.add.rectangle(x, barY, w, 8, 0x000000, 0.7)
      .setStrokeStyle(1, 0x444444).setDepth(5);
    this.hpFill = s.add.rectangle(x - w / 2, barY, w, 8, 0x00CC00)
      .setOrigin(0, 0.5).setDepth(6);
    this.hpLabel = s.add.text(x, barY, `${this.maxHp}`, {
      fontSize: '8px', color: '#FFFFFF', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(7);
  }

  takeDamage(amount) {
    if (this.destroyed) return;
    this.hp = Math.max(0, this.hp - Math.round(amount));
    this._refreshBar();
    if (this.hp <= 0) this._destroy();
  }

  _refreshBar() {
    const pct = this.hp / this.maxHp;
    this.hpFill.width = this.w * pct;
    this.hpFill.fillColor = pct > 0.5 ? 0x00CC00 : pct > 0.25 ? 0xFFAA00 : 0xFF2200;
    this.hpLabel.setText(Math.ceil(this.hp).toString());
  }

  _destroy() {
    this.destroyed = true;
    this.hp = 0;

    const flash = this.scene.add.rectangle(this.x, this.y, this.w + 30, this.h + 30, 0xFFFFFF)
      .setDepth(20);
    this.scene.tweens.add({
      targets: flash, alpha: 0, scaleX: 3, scaleY: 3, duration: 700,
      onComplete: () => flash.destroy(),
    });

    const targets = [this.body, this.labelText, this.hpBg, this.hpFill, this.hpLabel];
    if (this._netGfx) targets.push(this._netGfx);
    if (this._flagGfx) targets.push(this._flagGfx);
    this.scene.tweens.add({ targets, alpha: 0, duration: 900 });

    this.scene.cameras.main.shake(300, 0.012);
  }
}
