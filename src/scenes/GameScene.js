class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.playerTeamKey = data.playerTeam;
    this.aiTeamKey = data.aiTeam;
  }

  create() {
    this.playerTeam = TEAMS_DATA[this.playerTeamKey];
    this.aiTeam = TEAMS_DATA[this.aiTeamKey];

    this._buildField();
    this._buildStructures();
    this._initDeck();
    this._buildUI();
    this._setupInput();

    this.playerUnits = [];
    this.aiUnits = [];

    this.energy = CONFIG.ENERGY_START;
    this.energyTimer = 0;
    this.energyBoostTimer = 0;

    this.aiTimer = 0;
    this.aiInterval = Phaser.Math.Between(3500, 5500);

    this.matchTime = 0;
    this.gameOver = false;

    this.selectedCardIndex = -1;
    this.selectedCard = null;
    this.cardObjects = [];
    this._renderCards();
  }

  // ─── Field ────────────────────────────────────────────────────────────────

  _buildField() {
    const W = CONFIG.WIDTH;
    const FB = CONFIG.FIELD_BOTTOM;
    const g = this.add.graphics();

    g.fillStyle(0x2d7a2d);
    g.fillRect(0, 0, W, FB);

    // Alternating grass stripes
    g.fillStyle(0x287528, 0.5);
    for (let y = 0; y < FB; y += 50) g.fillRect(0, y, W, 25);

    // Field border
    g.lineStyle(2, 0xFFFFFF, 0.9);
    g.strokeRect(8, 8, W - 16, FB - 16);

    // Center line
    g.lineStyle(2, 0xFFFFFF, 0.8);
    g.lineBetween(8, CONFIG.CENTER_Y, W - 8, CONFIG.CENTER_Y);

    // Center circle
    g.strokeCircle(W / 2, CONFIG.CENTER_Y, 52);
    g.fillStyle(0xFFFFFF, 0.08);
    g.fillCircle(W / 2, CONFIG.CENTER_Y, 52);

    // Penalty areas
    const penW = 180;
    const penH = 80;
    g.lineStyle(2, 0xFFFFFF, 0.7);
    g.strokeRect((W - penW) / 2, 12, penW, penH);
    g.strokeRect((W - penW) / 2, FB - penH - 12, penW, penH);

    // Goal areas (small box)
    const gaW = 100;
    const gaH = 35;
    g.strokeRect((W - gaW) / 2, 12, gaW, gaH);
    g.strokeRect((W - gaW) / 2, FB - gaH - 12, gaW, gaH);

    // UI background
    this.add.rectangle(W / 2, FB + (CONFIG.HEIGHT - FB) / 2, W, CONFIG.HEIGHT - FB, 0x12122a);
  }

  // ─── Structures ───────────────────────────────────────────────────────────

  _buildStructures() {
    const cx = CONFIG.WIDTH / 2;
    this.oppGoal = new Structure(
      this, cx, CONFIG.OPP_GOAL_Y, 'goal', CONFIG.GOAL_HP,
      this.aiTeam.primaryColor, this.aiTeam.secondaryColor, this.aiTeam.shortName
    );
    this.oppFlag = new Structure(
      this, cx, CONFIG.OPP_FLAG_Y, 'flag', CONFIG.FLAG_HP,
      this.aiTeam.primaryColor, this.aiTeam.secondaryColor, 'DRAPEAU'
    );
    this.playerGoal = new Structure(
      this, cx, CONFIG.PLR_GOAL_Y, 'goal', CONFIG.GOAL_HP,
      this.playerTeam.primaryColor, this.playerTeam.secondaryColor, this.playerTeam.shortName
    );
    this.playerFlag = new Structure(
      this, cx, CONFIG.PLR_FLAG_Y, 'flag', CONFIG.FLAG_HP,
      this.playerTeam.primaryColor, this.playerTeam.secondaryColor, 'DRAPEAU'
    );
  }

  // ─── Deck / Hand ──────────────────────────────────────────────────────────

  _initDeck() {
    this.playerDeck = [...this.playerTeam.players];
    this._shuffle(this.playerDeck);
    this.playerHand = [];
    while (this.playerHand.length < 4) this._drawCard();

    this.aiDeck = [...this.aiTeam.players];
    this._shuffle(this.aiDeck);
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  _drawCard() {
    if (this.playerDeck.length === 0) {
      this.playerDeck = [...this.playerTeam.players];
      this._shuffle(this.playerDeck);
    }
    this.playerHand.push(this.playerDeck.shift());
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  _buildUI() {
    const W = CONFIG.WIDTH;
    const UY = CONFIG.FIELD_BOTTOM;

    // Team labels on field
    this.add.text(W / 2, 14, this.aiTeam.shortName, {
      fontSize: '12px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(15);
    this.add.text(W / 2, CONFIG.FIELD_BOTTOM - 14, this.playerTeam.shortName, {
      fontSize: '12px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(15);

    // Match timer
    this.matchTimerText = this.add.text(W / 2, 14, '00:00', {
      fontSize: '13px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(15);

    // Energy label
    this.add.text(12, UY + 8, 'ÉNERGIE', {
      fontSize: '10px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(15);

    // Energy pips
    this.energyPips = [];
    const pipW = (W - 24) / 10;
    for (let i = 0; i < 10; i++) {
      const pip = this.add.rectangle(
        12 + (i + 0.5) * pipW, UY + 22, pipW - 3, 14, 0x224488
      ).setOrigin(0.5).setDepth(15);
      this.energyPips.push(pip);
    }
    this.energyText = this.add.text(W - 10, UY + 22, '5/10', {
      fontSize: '11px', color: '#FFFFFF', fontFamily: 'Arial',
    }).setOrigin(1, 0.5).setDepth(16);

    // Instruction
    this.instrText = this.add.text(W / 2, UY + 40, 'Sélectionnez une carte', {
      fontSize: '11px', color: '#AAAAAA', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(15);

    // Deploy zone indicator (subtle)
    const dzGfx = this.add.graphics().setDepth(1);
    dzGfx.lineStyle(1, 0xFFFFFF, 0.12);
    dzGfx.strokeRect(8, CONFIG.CENTER_Y + 8, CONFIG.WIDTH - 16, CONFIG.PLR_FLAG_Y - CONFIG.CENTER_Y - 50);
  }

  _renderCards() {
    this.cardObjects.forEach(group => group.forEach(o => o.destroy()));
    this.cardObjects = [];

    const W = CONFIG.WIDTH;
    const cw = 90, ch = 116;
    const gap = 6;
    const startX = (W - (4 * cw + 3 * gap)) / 2;
    const cardTopY = CONFIG.FIELD_BOTTOM + 52;

    for (let i = 0; i < 4; i++) {
      const card = this.playerHand[i];
      const cx = startX + i * (cw + gap) + cw / 2;
      const cy = cardTopY + ch / 2;
      const isSelected = i === this.selectedCardIndex;
      const canAfford = Math.floor(this.energy) >= card.cost;
      const group = [];

      // Card background
      const bg = this.add.rectangle(cx, cy, cw, ch,
        isSelected ? 0x332800 : 0x1a1a3e
      ).setStrokeStyle(2, isSelected ? 0xFFD700 : (canAfford ? 0x3355BB : 0x282840))
       .setDepth(15).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', ptr => { ptr.event.stopPropagation(); this._selectCard(i); });
      bg.on('pointerover', () => { if (!isSelected) bg.setFillStyle(0x222255); });
      bg.on('pointerout', () => { if (!isSelected) bg.setFillStyle(0x1a1a3e); });
      group.push(bg);

      // Top color strip (team color)
      const strip = this.add.rectangle(cx, cy - ch / 2 + 9, cw, 18,
        parseInt(this.playerTeam.jerseyColor.slice(1), 16)
      ).setDepth(16).setAlpha(canAfford ? 1 : 0.45);
      group.push(strip);

      // Position badge
      const posTxt = this.add.text(cx, cy - ch / 2 + 9, card.position, {
        fontSize: '9px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(17).setAlpha(canAfford ? 1 : 0.5);
      group.push(posTxt);

      // Avatar circle
      const avatar = this.add.circle(cx, cy - 18, 20,
        parseInt(this.playerTeam.jerseyColor.slice(1), 16)
      ).setStrokeStyle(2, 0xFFFFFF).setDepth(16).setAlpha(canAfford ? 1 : 0.5);
      group.push(avatar);

      const initials = card.name.split(/[\s.]+/).filter(Boolean)
        .map(p => p[0]).join('').slice(0, 2).toUpperCase();
      const initTxt = this.add.text(cx, cy - 18, initials, {
        fontSize: '10px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(17).setAlpha(canAfford ? 1 : 0.5);
      group.push(initTxt);

      // Player name
      const nameTxt = this.add.text(cx, cy + 10, card.name, {
        fontSize: '9px', color: canAfford ? '#FFFFFF' : '#555577',
        fontFamily: 'Arial', fontStyle: 'bold',
        wordWrap: { width: cw - 6 }, align: 'center',
      }).setOrigin(0.5).setDepth(17);
      group.push(nameTxt);

      // Ability
      const abTxt = this.add.text(cx, cy + 28, card.abDesc, {
        fontSize: '8px', color: canAfford ? '#88AAFF' : '#333355',
        fontFamily: 'Arial', align: 'center', wordWrap: { width: cw - 6 },
      }).setOrigin(0.5).setDepth(17);
      group.push(abTxt);

      // Cost circle
      const costCircle = this.add.circle(cx + cw / 2 - 12, cy + ch / 2 - 12, 13, 0x7700CC)
        .setStrokeStyle(1, 0xFFFFFF).setDepth(17).setAlpha(canAfford ? 1 : 0.5);
      group.push(costCircle);
      const costTxt = this.add.text(cx + cw / 2 - 12, cy + ch / 2 - 12, card.cost.toString(), {
        fontSize: '12px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(18).setAlpha(canAfford ? 1 : 0.5);
      group.push(costTxt);

      // Selected indicator: top glow bar
      if (isSelected) {
        const sel = this.add.rectangle(cx, cy - ch / 2 - 3, cw, 5, 0xFFD700).setDepth(14);
        group.push(sel);
      }

      this.cardObjects.push(group);
    }
  }

  _selectCard(index) {
    const card = this.playerHand[index];
    if (Math.floor(this.energy) < card.cost) {
      this._toast('Pas assez d\'énergie !', 0xFF4444);
      return;
    }
    if (this.selectedCardIndex === index) {
      this.selectedCardIndex = -1;
      this.selectedCard = null;
      this.instrText.setText('Sélectionnez une carte');
    } else {
      this.selectedCardIndex = index;
      this.selectedCard = card;
      this.instrText.setText('Touchez votre terrain pour déployer');
    }
    this._renderCards();
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.on('pointerdown', ptr => {
      if (this.gameOver || !this.selectedCard) return;
      if (ptr.y >= CONFIG.FIELD_BOTTOM) return;
      if (ptr.y <= CONFIG.CENTER_Y + 15) {
        this._toast('Déployez dans votre moitié !', 0xFF8800);
        return;
      }
      if (Math.floor(this.energy) < this.selectedCard.cost) return;
      if (this.playerUnits.filter(u => !u.isDead).length >= CONFIG.MAX_UNITS_PER_TEAM) {
        this._toast('Terrain plein ! (max 6)', 0xFF8800);
        return;
      }

      const x = Phaser.Math.Clamp(ptr.x, 35, CONFIG.WIDTH - 35);
      const y = Phaser.Math.Clamp(ptr.y, CONFIG.CENTER_Y + 20, CONFIG.PLR_FLAG_Y - 40);

      this._deployUnit(this.selectedCard, x, y, true);
      this.energy -= this.selectedCard.cost;

      this.playerHand.splice(this.selectedCardIndex, 1);
      this._drawCard();

      this.selectedCard = null;
      this.selectedCardIndex = -1;
      this.instrText.setText('Sélectionnez une carte');
      this._renderCards();
    });
  }

  // ─── Unit Deployment ──────────────────────────────────────────────────────

  _deployUnit(cardData, x, y, isPlayer) {
    const teamData = isPlayer ? this.playerTeam : this.aiTeam;
    const unit = new Unit(this, x, y, cardData, isPlayer, teamData);
    if (isPlayer) {
      this.playerUnits.push(unit);
      if (cardData.ability === 'energizer') {
        this.energyBoostTimer = 5000;
      }
    } else {
      this.aiUnits.push(unit);
    }
    this._spawnEffect(x, y, isPlayer);
  }

  _spawnEffect(x, y, isPlayer) {
    const ring = this.add.circle(x, y, 5, isPlayer ? 0x44AAFF : 0xFF4444, 0).setDepth(7)
      .setStrokeStyle(3, isPlayer ? 0x44AAFF : 0xFF4444);
    this.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 500,
      onComplete: () => ring.destroy(),
    });
  }

  // ─── AI ───────────────────────────────────────────────────────────────────

  _aiDeploy() {
    if (this.aiUnits.filter(u => !u.isDead).length >= CONFIG.MAX_UNITS_PER_TEAM) return;
    if (this.aiDeck.length === 0) {
      this.aiDeck = [...this.aiTeam.players];
      this._shuffle(this.aiDeck);
    }
    const card = this.aiDeck.shift();
    const x = Phaser.Math.Between(55, CONFIG.WIDTH - 55);
    const y = Phaser.Math.Between(CONFIG.OPP_SPAWN_MIN_Y, CONFIG.OPP_SPAWN_MAX_Y);
    this._deployUnit(card, x, y, false);
  }

  // ─── Game Loop ────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.gameOver) return;

    this.matchTime += delta;
    this._updateTimer();

    // Energy recharge
    const rate = this.energyBoostTimer > 0
      ? CONFIG.ENERGY_RECHARGE_MS / 2
      : CONFIG.ENERGY_RECHARGE_MS;
    this.energyTimer += delta;
    if (this.energyTimer >= rate && this.energy < CONFIG.ENERGY_MAX) {
      this.energy = Math.min(CONFIG.ENERGY_MAX, this.energy + 1);
      this.energyTimer -= rate;
      this._renderCards();
    }
    if (this.energyBoostTimer > 0) this.energyBoostTimer -= delta;
    this._updateEnergyUI();

    // AI deploy
    this.aiTimer += delta;
    if (this.aiTimer >= this.aiInterval) {
      this.aiTimer = 0;
      this.aiInterval = Phaser.Math.Between(3500, 6000);
      this._aiDeploy();
    }

    // Update units
    const alivePlr = this.playerUnits.filter(u => !u.isDead);
    const aliveAI = this.aiUnits.filter(u => !u.isDead);

    for (const u of alivePlr) u.update(delta, aliveAI, this.oppFlag, this.oppGoal);
    for (const u of aliveAI) u.update(delta, alivePlr, this.playerFlag, this.playerGoal);

    this.playerUnits = this.playerUnits.filter(u => !u.isDead);
    this.aiUnits = this.aiUnits.filter(u => !u.isDead);

    // Win / lose
    if (this.oppGoal.hp <= 0) this._endGame(true);
    else if (this.playerGoal.hp <= 0) this._endGame(false);
  }

  _updateTimer() {
    const s = Math.floor(this.matchTime / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    this.matchTimerText.setText(`${mm}:${ss}`);
  }

  _updateEnergyUI() {
    const floor = Math.floor(this.energy);
    for (let i = 0; i < 10; i++) {
      this.energyPips[i].fillColor = i < floor ? 0x2266FF : 0x1a1a3a;
    }
    this.energyText.setText(`${floor}/10`);
  }

  _toast(msg, color = 0xFFFFFF) {
    const t = this.add.text(CONFIG.WIDTH / 2, CONFIG.CENTER_Y + 60, msg, {
      fontSize: '17px', color: `#${color.toString(16).padStart(6, '0')}`,
      fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 50, duration: 1600, onComplete: () => t.destroy() });
  }

  _endGame(playerWon) {
    this.gameOver = true;
    const msg = playerWon ? 'VICTOIRE !' : 'DÉFAITE !';
    const col = playerWon ? '#FFD700' : '#FF4444';
    const banner = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 40, msg, {
      fontSize: '64px', color: col, fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, scaleX: 1.2, scaleY: 1.2, duration: 600, yoyo: true, hold: 400 });
    this.time.delayedCall(2200, () => {
      this.scene.start('GameOverScene', {
        won: playerWon,
        playerTeam: this.playerTeamKey,
        aiTeam: this.aiTeamKey,
        duration: Math.floor(this.matchTime / 1000),
      });
    });
  }
}
