class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;

    // Field background
    const gfx = this.add.graphics();
    gfx.fillStyle(0x2d7a2d);
    gfx.fillRect(0, 0, W, H);
    gfx.fillStyle(0x287528, 0.5);
    for (let i = 0; i < H; i += 55) gfx.fillRect(0, i, W, 27);
    gfx.lineStyle(2, 0xFFFFFF, 0.25);
    gfx.lineBetween(0, H / 2, W, H / 2);
    gfx.strokeCircle(W / 2, H / 2, 80);
    gfx.strokeRect(10, 10, W - 20, H - 20);

    // Dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.52);

    // Ball graphic
    this._drawBall(W / 2, H * 0.22, 42);

    // Title
    this.add.text(W / 2, H * 0.37, 'SOCCER', {
      fontSize: '54px', color: '#FFFFFF', fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.37 + 58, 'CLASHER', {
      fontSize: '54px', color: '#FFD700', fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5);
    this.add.text(W / 2, H * 0.37 + 116, 'Saison 2024 – 25', {
      fontSize: '16px', color: '#BBBBBB', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Play button
    const btnBg = this.add.rectangle(W / 2, H * 0.68, 210, 64, 0x22AA44)
      .setStrokeStyle(3, 0xFFFFFF).setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(W / 2, H * 0.68, 'JOUER', {
      fontSize: '30px', color: '#FFFFFF', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerdown', () => this.scene.start('TeamSelectScene'));
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x33CC55));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x22AA44));

    this.tweens.add({ targets: [btnBg, btnTxt], scaleX: 1.04, scaleY: 1.04, duration: 850, yoyo: true, repeat: -1 });

    // Footer
    this.add.text(W / 2, H - 38, 'Phase 1 : PSG  vs  OM', {
      fontSize: '14px', color: '#777777', fontFamily: 'Arial',
    }).setOrigin(0.5);
  }

  _drawBall(cx, cy, r) {
    const g = this.add.graphics();
    g.fillStyle(0xFFFFFF);
    g.fillCircle(cx, cy, r);
    g.fillStyle(0x111111);
    // Pentagon patches approximation
    const patches = [
      [0, 0], [0, -r * 0.5], [r * 0.47, -r * 0.15],
      [r * 0.29, r * 0.4], [-r * 0.29, r * 0.4], [-r * 0.47, -r * 0.15],
    ];
    const pr = r * 0.22;
    for (const [dx, dy] of patches) {
      g.fillCircle(cx + dx, cy + dy, pr);
    }
    // Mask to circle
    const mask = this.add.graphics();
    mask.fillStyle(0xFFFFFF);
    mask.fillCircle(cx, cy, r);
    g.setMask(mask.createGeometryMask());
  }
}
