class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.playerTeamKey = data.playerTeam;
    this.aiTeamKey     = data.aiTeam;
  }

  create() {
    this.playerTeam = TEAMS_DATA[this.playerTeamKey];
    this.aiTeam     = TEAMS_DATA[this.aiTeamKey];

    this._buildField();
    this._buildStructures();
    this._initDeck();
    this._buildUI();
    this._setupInput();

    this.playerUnits = [];
    this.aiUnits     = [];

    // Energy as a float for smooth fill
    this.energy      = CONFIG.ENERGY_START;

    // AI
    this.aiTimer    = 0;
    this.aiInterval = Phaser.Math.Between(4000, 6500);

    this.matchTime  = 0;
    this.gameOver   = false;

    this.selectedCardIndex = -1;
    this.selectedCard      = null;
    this.cardObjects       = [];
    this._laneOverlay      = null;
    this._renderCards();
  }

  // ─── Field ─────────────────────────────────────────────────────────────────

  _buildField() {
    const W  = CONFIG.WIDTH;
    const FB = CONFIG.FIELD_BOTTOM;
    const LL = CONFIG.LANE_LEFT_X;
    const LR = CONFIG.LANE_RIGHT_X;
    const LHW = 60; // half lane width = 60 → lane spans [x-60, x+60]

    const g = this.add.graphics();

    // Base field — dark green
    g.fillStyle(0x1e6b1e);
    g.fillRect(0, 0, W, FB);

    // Lane corridors — lighter green
    g.fillStyle(0x2d8a2d, 1);
    g.fillRect(LL - LHW, 10, LHW * 2, FB - 20);
    g.fillRect(LR - LHW, 10, LHW * 2, FB - 20);

    // Subtle grass stripes inside each lane
    g.fillStyle(0x287528, 0.35);
    for (let y = 10; y < FB - 10; y += 44) {
      g.fillRect(LL - LHW, y, LHW * 2, 22);
      g.fillRect(LR - LHW, y, LHW * 2, 22);
    }

    // Field border
    g.lineStyle(2, 0xFFFFFF, 0.85);
    g.strokeRect(8, 8, W - 16, FB - 16);

    // Lane border lines
    g.lineStyle(2, 0xFFFFFF, 0.5);
    [LL - LHW, LL + LHW, LR - LHW, LR + LHW].forEach(lx => {
      g.lineBetween(lx, 8, lx, FB - 8);
    });

    // Center line
    g.lineStyle(2, 0xFFFFFF, 0.7);
    g.lineBetween(8, CONFIG.CENTER_Y, W - 16, CONFIG.CENTER_Y);
    g.strokeCircle(W / 2, CONFIG.CENTER_Y, 30);

    // Lane labels (faint)
    this.add.text(LL, FB / 2, 'GAUCHE', {
      fontSize: '11px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold', alpha: 0.18,
    }).setOrigin(0.5).setAlpha(0.18).setAngle(-90);
    this.add.text(LR, FB / 2, 'DROITE', {
      fontSize: '11px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.18).setAngle(-90);

    // UI background
    this.add.rectangle(W / 2, FB + (CONFIG.HEIGHT - FB) / 2, W, CONFIG.HEIGHT - FB, 0x12122a);
  }

  // ─── Structures ────────────────────────────────────────────────────────────

  _buildStructures() {
    const W  = CONFIG.WIDTH;
    const LL = CONFIG.LANE_LEFT_X;
    const LR = CONFIG.LANE_RIGHT_X;

    // Opponent goal (full-width, centered)
    this.oppGoal = new Structure(this, W / 2, CONFIG.OPP_GOAL_Y, 'goal',
      CONFIG.GOAL_HP, this.aiTeam.primaryColor, this.aiTeam.secondaryColor, this.aiTeam.shortName);

    // Opponent flags (one per lane)
    this.oppFlagL = new Structure(this, LL, CONFIG.OPP_FLAG_Y, 'flag',
      CONFIG.FLAG_HP, this.aiTeam.primaryColor, this.aiTeam.secondaryColor, '⚑G');
    this.oppFlagR = new Structure(this, LR, CONFIG.OPP_FLAG_Y, 'flag',
      CONFIG.FLAG_HP, this.aiTeam.primaryColor, this.aiTeam.secondaryColor, '⚑D');

    // Player goal
    this.playerGoal = new Structure(this, W / 2, CONFIG.PLR_GOAL_Y, 'goal',
      CONFIG.GOAL_HP, this.playerTeam.primaryColor, this.playerTeam.secondaryColor, this.playerTeam.shortName);

    // Player flags
    this.playerFlagL = new Structure(this, LL, CONFIG.PLR_FLAG_Y, 'flag',
      CONFIG.FLAG_HP, this.playerTeam.primaryColor, this.playerTeam.secondaryColor, '⚑G');
    this.playerFlagR = new Structure(this, LR, CONFIG.PLR_FLAG_Y, 'flag',
      CONFIG.FLAG_HP, this.playerTeam.primaryColor, this.playerTeam.secondaryColor, '⚑D');
  }

  // ─── Deck / Hand ───────────────────────────────────────────────────────────

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

  // ─── UI ────────────────────────────────────────────────────────────────────

  _buildUI() {
    const W  = CONFIG.WIDTH;
    const UY = CONFIG.FIELD_BOTTOM;

    // Team labels on field edges
    this.add.text(W / 2, 14, this.aiTeam.shortName, {
      fontSize: '12px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(15);
    this.add.text(W / 2, UY - 14, this.playerTeam.shortName, {
      fontSize: '12px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(15);

    // Match timer (centered top)
    this.matchTimerText = this.add.text(W / 2, 14, '00:00', {
      fontSize: '13px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(16);

    // ── Progressive energy bar ──────────────────────────────────────────────
    const barX   = 10;
    const barY   = UY + 22;
    const barW   = W - 20;
    const barH   = 16;

    this.add.text(barX, UY + 8, 'ÉNERGIE', {
      fontSize: '10px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
    }).setDepth(15);

    // Background track
    this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x111133)
      .setStrokeStyle(1, 0x333366).setDepth(15);

    // Smooth fill bar
    this._energyFill = this.add.rectangle(barX, barY, 0, barH - 2, 0x2266FF)
      .setOrigin(0, 0.5).setDepth(16);
    this._energyFullW = barW;

    // Tick marks at each integer (cost reference)
    const tickGfx = this.add.graphics().setDepth(17);
    tickGfx.lineStyle(1, 0xFFFFFF, 0.35);
    for (let i = 1; i < 10; i++) {
      const tx = barX + (i / 10) * barW;
      tickGfx.lineBetween(tx, barY - barH / 2 + 2, tx, barY + barH / 2 - 2);
    }

    this._energyText = this.add.text(W - 8, barY, '5', {
      fontSize: '12px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(17);

    // Instruction / lane hint
    this.instrText = this.add.text(W / 2, UY + 42, 'Sélectionnez une carte', {
      fontSize: '11px', color: '#AAAAAA', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(15);
  }

  // ─── Lane overlay (shown when card selected) ───────────────────────────────

  _showLaneOverlay() {
    this._hideLaneOverlay();
    const g = this.add.graphics().setDepth(2).setAlpha(0.22);
    const LHW = 60;

    g.fillStyle(0x44AAFF);
    g.fillRect(CONFIG.LANE_LEFT_X - LHW, CONFIG.CENTER_Y + 10, LHW * 2, CONFIG.PLR_FLAG_Y - CONFIG.CENTER_Y - 50);
    g.fillRect(CONFIG.LANE_RIGHT_X - LHW, CONFIG.CENTER_Y + 10, LHW * 2, CONFIG.PLR_FLAG_Y - CONFIG.CENTER_Y - 50);

    const txtStyle = { fontSize: '13px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 };
    const midY = CONFIG.CENTER_Y + (CONFIG.PLR_FLAG_Y - CONFIG.CENTER_Y) / 2;
    const tL = this.add.text(CONFIG.LANE_LEFT_X,  midY, '← GAUCHE', txtStyle).setOrigin(0.5).setDepth(3);
    const tR = this.add.text(CONFIG.LANE_RIGHT_X, midY, 'DROITE →', txtStyle).setOrigin(0.5).setDepth(3);

    this._laneOverlay = [g, tL, tR];
  }

  _hideLaneOverlay() {
    if (this._laneOverlay) {
      this._laneOverlay.forEach(o => o.destroy());
      this._laneOverlay = null;
    }
  }

  // ─── Cards ─────────────────────────────────────────────────────────────────

  _renderCards() {
    this.cardObjects.forEach(group => group.forEach(o => o.destroy()));
    this.cardObjects = [];

    const W      = CONFIG.WIDTH;
    const cw     = 90, ch = 116, gap = 6;
    const startX = (W - (4 * cw + 3 * gap)) / 2;
    const cardTopY = CONFIG.FIELD_BOTTOM + 52;

    for (let i = 0; i < 4; i++) {
      const card       = this.playerHand[i];
      const cx         = startX + i * (cw + gap) + cw / 2;
      const cy         = cardTopY + ch / 2;
      const isSelected = i === this.selectedCardIndex;
      const canAfford  = this.energy >= card.cost;
      const group      = [];

      const bg = this.add.rectangle(cx, cy, cw, ch, isSelected ? 0x332800 : 0x1a1a3e)
        .setStrokeStyle(2, isSelected ? 0xFFD700 : (canAfford ? 0x3355BB : 0x282840))
        .setDepth(15).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', ptr => { ptr.event.stopPropagation(); this._selectCard(i); });
      group.push(bg);

      if (isSelected) {
        group.push(this.add.rectangle(cx, cy - ch / 2 - 3, cw, 4, 0xFFD700).setDepth(14));
      }

      // Team color strip at top
      const strip = this.add.rectangle(cx, cy - ch / 2 + 9, cw, 18,
        parseInt(this.playerTeam.jerseyColor.slice(1), 16)
      ).setDepth(16).setAlpha(canAfford ? 1 : 0.4);
      group.push(strip);

      // Position badge
      group.push(this.add.text(cx, cy - ch / 2 + 9, card.position, {
        fontSize: '9px', color: '#FFD700', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(17).setAlpha(canAfford ? 1 : 0.5));

      // Mini character avatar
      const avatarY = cy - 18;
      const sz = ROLE_SIZE[card.position] ?? { bw: 16, bh: 14, hr: 8 };
      const scale = 0.8;
      const jc = parseInt(this.playerTeam.jerseyColor.slice(1), 16);

      const aBody = this.add.rectangle(cx, avatarY, sz.bw * scale, sz.bh * scale, jc)
        .setStrokeStyle(1, 0x000000).setDepth(17).setAlpha(canAfford ? 1 : 0.5);
      const aHead = this.add.circle(cx, avatarY - sz.bh * scale / 2 - sz.hr * scale, sz.hr * scale, 0xFFCCAA)
        .setStrokeStyle(1, 0x000000).setDepth(18).setAlpha(canAfford ? 1 : 0.5);
      group.push(aBody, aHead);

      // Name
      group.push(this.add.text(cx, cy + 10, card.name, {
        fontSize: '9px', color: canAfford ? '#FFFFFF' : '#555577',
        fontFamily: 'Arial', fontStyle: 'bold',
        wordWrap: { width: cw - 6 }, align: 'center',
      }).setOrigin(0.5).setDepth(17));

      // Ability
      group.push(this.add.text(cx, cy + 28, card.abDesc, {
        fontSize: '8px', color: canAfford ? '#88AAFF' : '#333355',
        fontFamily: 'Arial', align: 'center', wordWrap: { width: cw - 6 },
      }).setOrigin(0.5).setDepth(17));

      // Cost circle
      const costCircle = this.add.circle(cx + cw / 2 - 12, cy + ch / 2 - 12, 13, 0x7700CC)
        .setStrokeStyle(1, 0xFFFFFF).setDepth(17).setAlpha(canAfford ? 1 : 0.5);
      group.push(costCircle);
      group.push(this.add.text(cx + cw / 2 - 12, cy + ch / 2 - 12, card.cost.toString(), {
        fontSize: '12px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(18).setAlpha(canAfford ? 1 : 0.5));

      this.cardObjects.push(group);
    }
  }

  _selectCard(index) {
    const card = this.playerHand[index];
    if (this.energy < card.cost) {
      this._toast('Pas assez d\'énergie !', 0xFF4444);
      return;
    }
    if (this.selectedCardIndex === index) {
      this.selectedCardIndex = -1;
      this.selectedCard      = null;
      this.instrText.setText('Sélectionnez une carte');
      this._hideLaneOverlay();
    } else {
      this.selectedCardIndex = index;
      this.selectedCard      = card;
      this.instrText.setText('Touchez GAUCHE ou DROITE du terrain');
      this._showLaneOverlay();
    }
    this._renderCards();
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.on('pointerdown', ptr => {
      if (this.gameOver || !this.selectedCard) return;
      if (ptr.y >= CONFIG.FIELD_BOTTOM) return;
      if (ptr.y <= CONFIG.CENTER_Y + 10) {
        this._toast('Déployez dans votre moitié !', 0xFF8800);
        return;
      }
      if (this.energy < this.selectedCard.cost) return;
      if (this.playerUnits.filter(u => !u.isDead).length >= CONFIG.MAX_UNITS_PER_TEAM) {
        this._toast('Terrain plein !', 0xFF8800);
        return;
      }

      // Determine lane from tap position
      const lane = ptr.x < CONFIG.WIDTH / 2 ? 'left' : 'right';
      const x    = lane === 'left' ? CONFIG.LANE_LEFT_X : CONFIG.LANE_RIGHT_X;
      const y    = Phaser.Math.Clamp(ptr.y, CONFIG.CENTER_Y + 20, CONFIG.PLR_FLAG_Y - 40);

      this._deployUnit(this.selectedCard, x, y, true, lane);
      this.energy -= this.selectedCard.cost;

      this.playerHand.splice(this.selectedCardIndex, 1);
      this._drawCard();
      this.selectedCard      = null;
      this.selectedCardIndex = -1;
      this.instrText.setText('Sélectionnez une carte');
      this._hideLaneOverlay();
      this._renderCards();
    });
  }

  // ─── Deploy ────────────────────────────────────────────────────────────────

  _deployUnit(cardData, x, y, isPlayer, lane) {
    const teamData = isPlayer ? this.playerTeam : this.aiTeam;
    const unit     = new Unit(this, x, y, cardData, isPlayer, teamData, lane);
    if (isPlayer) {
      this.playerUnits.push(unit);
      if (cardData.ability === 'energizer') this._energyBoostUntil = Date.now() + 5000;
    } else {
      this.aiUnits.push(unit);
    }
    this._spawnFx(x, y, isPlayer);
  }

  _spawnFx(x, y, isPlayer) {
    const ring = this.add.circle(x, y, 5, 0, 0).setDepth(7)
      .setStrokeStyle(3, isPlayer ? 0x44AAFF : 0xFF4444);
    this.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 450,
      onComplete: () => ring.destroy(),
    });
  }

  // ─── AI ────────────────────────────────────────────────────────────────────

  _aiDeploy() {
    if (this.aiUnits.filter(u => !u.isDead).length >= CONFIG.MAX_UNITS_PER_TEAM) return;
    if (this.aiDeck.length === 0) { this.aiDeck = [...this.aiTeam.players]; this._shuffle(this.aiDeck); }
    const card = this.aiDeck.shift();
    const lane  = Math.random() < 0.5 ? 'left' : 'right';
    const x     = lane === 'left' ? CONFIG.LANE_LEFT_X : CONFIG.LANE_RIGHT_X;
    const y     = Phaser.Math.Between(CONFIG.OPP_SPAWN_MIN_Y, CONFIG.OPP_SPAWN_MAX_Y);
    this._deployUnit(card, x, y, false, lane);
  }

  // ─── Game Loop ─────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this.gameOver) return;

    this.matchTime += delta;
    this._updateTimer();

    // ── Smooth energy recharge ─────────────────────────────────────────────
    const rate = (this._energyBoostUntil && Date.now() < this._energyBoostUntil)
      ? CONFIG.ENERGY_RECHARGE_MS / 2
      : CONFIG.ENERGY_RECHARGE_MS;

    if (this.energy < CONFIG.ENERGY_MAX) {
      this.energy = Math.min(CONFIG.ENERGY_MAX, this.energy + delta / rate);
    }
    this._updateEnergyUI();

    // ── AI ──────────────────────────────────────────────────────────────────
    this.aiTimer += delta;
    if (this.aiTimer >= this.aiInterval) {
      this.aiTimer    = 0;
      this.aiInterval = Phaser.Math.Between(4000, 7000);
      this._aiDeploy();
    }

    // ── Update units (per lane) ─────────────────────────────────────────────
    const alivePlr = this.playerUnits.filter(u => !u.isDead);
    const aliveAI  = this.aiUnits.filter(u => !u.isDead);

    for (const u of alivePlr) {
      const laneEnemies = aliveAI.filter(e => e.lane === u.lane);
      const targetFlag  = u.lane === 'left' ? this.oppFlagL : this.oppFlagR;
      u.update(delta, laneEnemies, targetFlag, this.oppGoal);
    }
    for (const u of aliveAI) {
      const laneEnemies = alivePlr.filter(e => e.lane === u.lane);
      const targetFlag  = u.lane === 'left' ? this.playerFlagL : this.playerFlagR;
      u.update(delta, laneEnemies, targetFlag, this.playerGoal);
    }

    this.playerUnits = this.playerUnits.filter(u => !u.isDead);
    this.aiUnits     = this.aiUnits.filter(u => !u.isDead);

    // ── Win condition ───────────────────────────────────────────────────────
    if (this.oppGoal.hp <= 0)    this._endGame(true);
    else if (this.playerGoal.hp <= 0) this._endGame(false);
  }

  // ─── UI helpers ────────────────────────────────────────────────────────────

  _updateTimer() {
    const s  = Math.floor(this.matchTime / 1000);
    this.matchTimerText.setText(
      `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    );
  }

  _updateEnergyUI() {
    const pct = this.energy / CONFIG.ENERGY_MAX;
    this._energyFill.width = Math.max(0, pct * this._energyFullW);

    // Color: blue → cyan near full
    const r = Math.round(Phaser.Math.Linear(0x22, 0x00, pct));
    const g = Math.round(Phaser.Math.Linear(0x66, 0xAA, pct));
    const b = 0xFF;
    this._energyFill.fillColor = (r << 16) | (g << 8) | b;

    this._energyText.setText(Math.floor(this.energy).toString());

    // Refresh card affordability when floor changes
    const newFloor = Math.floor(this.energy);
    if (newFloor !== this._lastEnergyFloor) {
      this._lastEnergyFloor = newFloor;
      this._renderCards();
    }
  }

  _toast(msg, color = 0xFFFFFF) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(CONFIG.WIDTH / 2, CONFIG.CENTER_Y + 55, msg, {
      fontSize: '17px', color: hex, fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 50, duration: 1600, onComplete: () => t.destroy() });
  }

  _endGame(playerWon) {
    if (this.gameOver) return;
    this.gameOver = true;
    this._hideLaneOverlay();
    const msg    = playerWon ? 'VICTOIRE !' : 'DÉFAITE !';
    const col    = playerWon ? '#FFD700' : '#FF4444';
    const banner = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 40, msg, {
      fontSize: '64px', color: col, fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, scaleX: 1.2, scaleY: 1.2, duration: 600, yoyo: true, hold: 400 });
    this.time.delayedCall(2200, () => {
      this.scene.start('GameOverScene', {
        won: playerWon, playerTeam: this.playerTeamKey,
        aiTeam: this.aiTeamKey, duration: Math.floor(this.matchTime / 1000),
      });
    });
  }
}
