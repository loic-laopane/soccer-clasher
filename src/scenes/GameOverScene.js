class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.won = data.won;
    this.playerTeamKey = data.playerTeam;
    this.aiTeamKey = data.aiTeam;
    this.duration = data.duration || 0;
  }

  create() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const playerTeam = TEAMS_DATA[this.playerTeamKey];
    const aiTeam = TEAMS_DATA[this.aiTeamKey];

    // Background
    const bgColor = this.won ? 0x0a200a : 0x200a0a;
    this.add.rectangle(W / 2, H / 2, W, H, bgColor);

    // Animated particles feel via circles
    for (let i = 0; i < 14; i++) {
      const c = this.add.circle(
        Phaser.Math.Between(20, W - 20),
        Phaser.Math.Between(20, H - 20),
        Phaser.Math.Between(3, 8),
        this.won ? 0xFFD700 : 0xFF4444, 0.6
      );
      this.tweens.add({
        targets: c, y: c.y - Phaser.Math.Between(80, 200), alpha: 0,
        duration: Phaser.Math.Between(1800, 3500), repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
      });
    }

    // Result banner
    const resultColor = this.won ? '#FFD700' : '#FF4444';
    const resultEmoji = this.won ? '🏆' : '💔';
    this.add.text(W / 2, 130, this.won ? 'VICTOIRE !' : 'DÉFAITE !', {
      fontSize: '58px', color: resultColor,
      fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5);

    // Subtitle
    const winner = this.won ? playerTeam.name : aiTeam.name;
    this.add.text(W / 2, 198, `${winner} a gagné`, {
      fontSize: '18px', color: '#DDDDDD', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Match info card
    const cardY = H / 2 + 10;
    this.add.rectangle(W / 2, cardY, W - 40, 200, 0x111133)
      .setStrokeStyle(2, 0x333366);

    this.add.text(W / 2, cardY - 80, 'RÉSUMÉ DU MATCH', {
      fontSize: '14px', color: '#888888', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Teams row
    this.add.rectangle(W / 2, cardY - 50, W - 50, 50, 0x1a1a44);
    this.add.text(W / 4, cardY - 50, playerTeam.shortName, {
      fontSize: '28px', color: '#FFFFFF', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(W / 2, cardY - 50, 'VS', {
      fontSize: '18px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(3 * W / 4, cardY - 50, aiTeam.shortName, {
      fontSize: '28px', color: '#FFFFFF', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Duration
    const mm = String(Math.floor(this.duration / 60)).padStart(2, '0');
    const ss = String(this.duration % 60).padStart(2, '0');
    this.add.text(W / 2, cardY + 10, `Durée : ${mm}:${ss}`, {
      fontSize: '16px', color: '#AAAAAA', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Winner badge
    this.add.rectangle(W / 2, cardY + 55, 240, 38,
      this.won ? 0x224422 : 0x442222
    ).setStrokeStyle(2, this.won ? 0x44AA44 : 0xAA4444);
    this.add.text(W / 2, cardY + 55, `Vainqueur : ${winner}`, {
      fontSize: '14px', color: this.won ? '#88FF88' : '#FF8888',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Buttons
    this._addButton(W / 2 - 105, H - 120, 'REJOUER', 0x1155AA, () => {
      this.scene.start('GameScene', { playerTeam: this.playerTeamKey, aiTeam: this.aiTeamKey });
    });
    this._addButton(W / 2 + 105, H - 120, 'MENU', 0x444444, () => {
      this.scene.start('MenuScene');
    });

    // Change team option
    const changeBtn = this.add.text(W / 2, H - 60, 'Changer d\'équipe', {
      fontSize: '16px', color: '#666688', fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    changeBtn.on('pointerdown', () => this.scene.start('TeamSelectScene'));
    changeBtn.on('pointerover', () => changeBtn.setColor('#AAAACC'));
    changeBtn.on('pointerout', () => changeBtn.setColor('#666688'));
  }

  _addButton(x, y, label, color, cb) {
    const btn = this.add.rectangle(x, y, 185, 52, color)
      .setStrokeStyle(2, 0xFFFFFF).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '20px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerdown', cb);
    btn.on('pointerover', () => btn.setFillStyle(color + 0x222222));
    btn.on('pointerout', () => btn.setFillStyle(color));
    return btn;
  }
}
