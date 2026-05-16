class TeamSelectScene extends Phaser.Scene {
  constructor() { super('TeamSelectScene'); }

  create() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;

    // Background
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0a0a1e);
    gfx.fillRect(0, 0, W, H);
    gfx.fillStyle(0x0d1a2e, 1);
    for (let i = 0; i < H; i += 60) gfx.fillRect(0, i, W, 30);

    // Header
    this.add.rectangle(W / 2, 70, W, 100, 0x111133);
    this.add.text(W / 2, 58, 'CHOISISSEZ', {
      fontSize: '28px', color: '#FFFFFF', fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(W / 2, 90, 'VOTRE ÉQUIPE', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Team cards
    this._buildTeamCard(W / 4, H / 2 - 10, 'PSG');
    this._buildTeamCard(3 * W / 4, H / 2 - 10, 'OM');

    // VS divider
    this.add.circle(W / 2, H / 2 - 10, 30, 0x222244).setStrokeStyle(2, 0xFFD700);
    this.add.text(W / 2, H / 2 - 10, 'VS', {
      fontSize: '20px', color: '#FFD700', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Back
    const back = this.add.text(W / 2, H - 45, '← Retour', {
      fontSize: '18px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('MenuScene'));
    back.on('pointerover', () => back.setColor('#FFFFFF'));
    back.on('pointerout', () => back.setColor('#888888'));
  }

  _buildTeamCard(cx, cy, teamKey) {
    const team = TEAMS_DATA[teamKey];
    const cw = 186;
    const ch = 380;

    // Card shadow
    this.add.rectangle(cx + 4, cy + 4, cw, ch, 0x000000, 0.5);

    // Main card body
    const card = this.add.rectangle(cx, cy, cw, ch, team.primaryColor)
      .setStrokeStyle(3, 0xFFFFFF).setInteractive({ useHandCursor: true });

    // Top accent strip
    this.add.rectangle(cx, cy - ch / 2 + 10, cw, 20, team.secondaryColor);

    // Team short name (big)
    this.add.text(cx, cy - ch / 2 + 55, team.shortName, {
      fontSize: '58px', color: '#FFFFFF', fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    // Full name
    this.add.text(cx, cy - ch / 2 + 108, team.name, {
      fontSize: '11px', color: '#DDDDDD', fontFamily: 'Arial',
      align: 'center', wordWrap: { width: cw - 14 },
    }).setOrigin(0.5);

    // Divider
    this.add.rectangle(cx, cy - ch / 2 + 128, cw - 20, 1, 0xFFFFFF, 0.3);

    // League info
    this.add.text(cx, cy - ch / 2 + 148, team.league, {
      fontSize: '13px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player list (first 8)
    const listY = cy - ch / 2 + 170;
    for (let i = 0; i < Math.min(8, team.players.length); i++) {
      const p = team.players[i];
      const rowY = listY + i * 20;
      this.add.text(cx - cw / 2 + 12, rowY, `[${p.position}]`, {
        fontSize: '9px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
      });
      this.add.text(cx - cw / 2 + 50, rowY, p.name, {
        fontSize: '9px', color: '#FFFFFF', fontFamily: 'Arial',
      });
    }
    if (team.players.length > 8) {
      this.add.text(cx, listY + 8 * 20, `+${team.players.length - 8} autres`, {
        fontSize: '9px', color: '#AAAAAA', fontFamily: 'Arial',
      }).setOrigin(0.5);
    }

    // Select button
    const btn = this.add.rectangle(cx, cy + ch / 2 - 30, 150, 42, 0x00AA44)
      .setStrokeStyle(2, 0xFFFFFF).setInteractive({ useHandCursor: true });
    this.add.text(cx, cy + ch / 2 - 30, 'CHOISIR', {
      fontSize: '17px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    const handler = () => {
      const aiTeam = teamKey === 'PSG' ? 'OM' : 'PSG';
      this.scene.start('GameScene', { playerTeam: teamKey, aiTeam });
    };
    card.on('pointerdown', handler);
    btn.on('pointerdown', handler);
    btn.on('pointerover', () => btn.setFillStyle(0x33CC66));
    btn.on('pointerout', () => btn.setFillStyle(0x00AA44));

    // Hover pulse on card
    this.tweens.add({ targets: card, scaleX: 1.02, scaleY: 1.02, duration: 950, yoyo: true, repeat: -1 });
  }
}
