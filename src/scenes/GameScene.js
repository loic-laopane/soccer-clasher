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
    this._buildGoalkeepers();
    this._initDeck();
    this._buildUI();
    this._setupInput();

    this.playerUnits = [];
    this.aiUnits     = [];
    this.gkBalls     = [];

    this.energy      = CONFIG.ENERGY_START;
    this.aiTimer     = 0;
    this.aiInterval  = Phaser.Math.Between(3500, 6000);
    this.matchTime   = 0;
    this.gameOver    = false;

    this.selectedCardIndex = -1;
    this.selectedCard      = null;
    this.cardObjects       = [];
    this._placementOverlay = null;
    this._renderCards();
  }

  // ─── Field ──────────────────────────────────────────────────────────────────

  _buildField() {
    const W = CONFIG.WIDTH;
    const H = CONFIG.FIELD_BOTTOM;
    const g = this.add.graphics();

    // ── Crowd / stadium stands ──────────────────────────────────────────────
    // Left stand
    g.fillStyle(0x1a1a1a); g.fillRect(0, 0, 14, H);
    // Right stand
    g.fillRect(W-14, 0, 14, H);
    // Top stand
    g.fillRect(0, 0, W, 10);
    // Bottom stand
    g.fillRect(0, H-10, W, 10);

    const crowdColors = [0xCC2200,0xFF4400,0xFFAA00,0x0044CC,0x8800CC,0xFFFFFF,0xFF8800];
    const rng = (seed) => { let s=seed; return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; }; };
    const rand = rng(42);

    // Left crowd rows
    for (let row = 0; row < 5; row++) {
      for (let i = 0; i < Math.floor(H/9); i++) {
        const col = crowdColors[Math.floor(rand()*crowdColors.length)];
        g.fillStyle(col, 0.8+rand()*0.2);
        g.fillCircle(1 + row*2.5 + rand()*1, 5 + i*9 + rand()*3, 2.2);
      }
    }
    // Right crowd rows
    for (let row = 0; row < 5; row++) {
      for (let i = 0; i < Math.floor(H/9); i++) {
        const col = crowdColors[Math.floor(rand()*crowdColors.length)];
        g.fillStyle(col, 0.8+rand()*0.2);
        g.fillCircle(W-1 - row*2.5 - rand()*1, 5 + i*9 + rand()*3, 2.2);
      }
    }
    // Top crowd
    for (let col = 0; col < 5; col++) {
      for (let i = 0; i < Math.floor(W/9); i++) {
        const c = crowdColors[Math.floor(rand()*crowdColors.length)];
        g.fillStyle(c, 0.8+rand()*0.2);
        g.fillCircle(5 + i*9 + rand()*3, 1 + col*1.8 + rand()*1, 2.2);
      }
    }
    // Bottom crowd
    for (let col = 0; col < 5; col++) {
      for (let i = 0; i < Math.floor(W/9); i++) {
        const c = crowdColors[Math.floor(rand()*crowdColors.length)];
        g.fillStyle(c, 0.8+rand()*0.2);
        g.fillCircle(5 + i*9 + rand()*3, H-1 - col*1.8 - rand()*1, 2.2);
      }
    }

    // ── Grass ─────────────────────────────────────────────────────────────────
    g.fillStyle(0x1e7a1e); g.fillRect(14, 10, W-28, H-20);

    // Alternating grass stripes
    g.fillStyle(0x1c7220, 1);
    for (let y = 10; y < H-10; y += 52) g.fillRect(14, y, W-28, 26);

    // ── Pitch markings (white) ─────────────────────────────────────────────
    const lw = 1.8;
    g.lineStyle(lw, 0xFFFFFF, 0.9);

    // Touchlines
    g.strokeRect(14, 10, W-28, H-20);

    // Center line
    g.lineBetween(14, CONFIG.CENTER_Y, W-14, CONFIG.CENTER_Y);

    // Center circle + spot
    g.strokeCircle(W/2, CONFIG.CENTER_Y, 52);
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillCircle(W/2, CONFIG.CENTER_Y, 3);

    // ── Top penalty area ───────────────────────────────────────────────────
    const penW = 200, penH = 90;
    const penLX = (W - penW) / 2;
    g.strokeRect(penLX, 10, penW, penH);
    // Top goal area (6-yard box)
    const gaW = 100, gaH = 40;
    const gaLX = (W - gaW) / 2;
    g.strokeRect(gaLX, 10, gaW, gaH);
    // Top penalty spot
    g.fillCircle(W/2, 10 + 60, 3);
    // Top penalty arc
    g.beginPath();
    g.arc(W/2, 10+60, 44, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155), false);
    g.strokePath();
    // Top corner arcs
    g.beginPath(); g.arc(14, 10, 10, 0, Phaser.Math.DegToRad(90), false); g.strokePath();
    g.beginPath(); g.arc(W-14, 10, 10, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(180), false); g.strokePath();

    // ── Bottom penalty area ────────────────────────────────────────────────
    g.strokeRect(penLX, H-10-penH, penW, penH);
    g.strokeRect(gaLX, H-10-gaH, gaW, gaH);
    g.fillCircle(W/2, H-10-60, 3);
    g.beginPath();
    g.arc(W/2, H-10-60, 44, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(335), false);
    g.strokePath();
    g.beginPath(); g.arc(14, H-10, 10, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(360), false); g.strokePath();
    g.beginPath(); g.arc(W-14, H-10, 10, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(270), false); g.strokePath();

    // ── Bridges at center line ─────────────────────────────────────────────
    const BLX = CONFIG.BRIDGE_LEFT_X;
    const BRX = CONFIG.BRIDGE_RIGHT_X;
    const BW  = CONFIG.BRIDGE_W;
    const CY  = CONFIG.CENTER_Y;

    // Bridge path (wood plank color)
    g.fillStyle(0xC8A050, 0.55);
    g.fillRect(BLX - BW/2, CY - 8, BW, 16);
    g.fillRect(BRX - BW/2, CY - 8, BW, 16);

    // Bridge markings
    g.lineStyle(1.5, 0xFFD700, 0.9);
    g.strokeRect(BLX - BW/2, CY - 8, BW, 16);
    g.strokeRect(BRX - BW/2, CY - 8, BW, 16);

    // Bridge arrows
    this.add.text(BLX, CY-2, '⇅', { fontSize:'12px', color:'#FFD700', fontFamily:'Arial' }).setOrigin(0.5).setDepth(4).setAlpha(0.85);
    this.add.text(BRX, CY-2, '⇅', { fontSize:'12px', color:'#FFD700', fontFamily:'Arial' }).setOrigin(0.5).setDepth(4).setAlpha(0.85);

    // ── UI panel background ────────────────────────────────────────────────
    this.add.rectangle(W/2, CONFIG.FIELD_BOTTOM + (CONFIG.HEIGHT-CONFIG.FIELD_BOTTOM)/2,
      W, CONFIG.HEIGHT-CONFIG.FIELD_BOTTOM, 0x0d0d22);
  }

  // ─── Structures ─────────────────────────────────────────────────────────────

  _buildStructures() {
    const W = CONFIG.WIDTH;
    this.oppGoal    = new Structure(this, W/2, CONFIG.OPP_GOAL_Y,  'goal', CONFIG.GOAL_HP, this.aiTeam.primaryColor,    this.aiTeam.secondaryColor,    this.aiTeam.shortName);
    this.oppFlagL   = new Structure(this, W*0.27, CONFIG.OPP_FLAG_Y, 'flag', CONFIG.FLAG_HP, this.aiTeam.primaryColor,    this.aiTeam.secondaryColor,    '⚑G');
    this.oppFlagR   = new Structure(this, W*0.73, CONFIG.OPP_FLAG_Y, 'flag', CONFIG.FLAG_HP, this.aiTeam.primaryColor,    this.aiTeam.secondaryColor,    '⚑D');
    this.playerGoal = new Structure(this, W/2, CONFIG.PLR_GOAL_Y,  'goal', CONFIG.GOAL_HP, this.playerTeam.primaryColor, this.playerTeam.secondaryColor, this.playerTeam.shortName);
    this.playerFlagL= new Structure(this, W*0.27, CONFIG.PLR_FLAG_Y, 'flag', CONFIG.FLAG_HP, this.playerTeam.primaryColor, this.playerTeam.secondaryColor, '⚑G');
    this.playerFlagR= new Structure(this, W*0.73, CONFIG.PLR_FLAG_Y, 'flag', CONFIG.FLAG_HP, this.playerTeam.primaryColor, this.playerTeam.secondaryColor, '⚑D');
  }

  // ─── Goalkeepers ────────────────────────────────────────────────────────────

  _buildGoalkeepers() {
    const W = CONFIG.WIDTH;
    this.playerGK = new Goalkeeper(this, W/2, CONFIG.PLR_GOAL_Y - 18, true,  this.playerTeam);
    this.oppGK    = new Goalkeeper(this, W/2, CONFIG.OPP_GOAL_Y  + 18, false, this.aiTeam);
  }

  // ─── Deck ───────────────────────────────────────────────────────────────────

  _initDeck() {
    this.playerDeck = [...this.playerTeam.players];
    this._shuffle(this.playerDeck);
    this.playerHand = [];
    while (this.playerHand.length < 4) this._drawCard();
    this.aiDeck = [...this.aiTeam.players];
    this._shuffle(this.aiDeck);
  }

  _shuffle(arr) {
    for (let i = arr.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
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

  // ─── UI ─────────────────────────────────────────────────────────────────────

  _buildUI() {
    const W = CONFIG.WIDTH, UY = CONFIG.FIELD_BOTTOM;

    this.add.text(W/2, 14, this.aiTeam.shortName, {
      fontSize:'12px', color:'#FFFFFF', fontFamily:'Arial', fontStyle:'bold',
      stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5,0).setDepth(15);
    this.add.text(W/2, UY-14, this.playerTeam.shortName, {
      fontSize:'12px', color:'#FFFFFF', fontFamily:'Arial', fontStyle:'bold',
      stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5,1).setDepth(15);

    this.matchTimerText = this.add.text(W/2, 14, '00:00', {
      fontSize:'13px', color:'#FFD700', fontFamily:'Arial', fontStyle:'bold',
    }).setOrigin(0.5,0).setDepth(16);

    // Energy bar
    const barX = 10, barY = UY+22, barW = W-20, barH = 16;
    this.add.text(barX, UY+8, 'ÉNERGIE', {
      fontSize:'10px', color:'#FFD700', fontFamily:'Arial', fontStyle:'bold',
    }).setDepth(15);
    this.add.rectangle(barX+barW/2, barY, barW, barH, 0x111133).setStrokeStyle(1,0x333366).setDepth(15);
    this._energyFill = this.add.rectangle(barX, barY, 0, barH-2, 0x2266FF).setOrigin(0,0.5).setDepth(16);
    this._energyFullW = barW;

    const tg = this.add.graphics().setDepth(17);
    tg.lineStyle(1, 0xFFFFFF, 0.3);
    for (let i = 1; i < 10; i++) {
      const tx = barX + (i/10)*barW;
      tg.lineBetween(tx, barY-barH/2+2, tx, barY+barH/2-2);
    }
    this._energyText = this.add.text(W-8, barY, '5', {
      fontSize:'12px', color:'#FFFFFF', fontFamily:'Arial', fontStyle:'bold',
    }).setOrigin(1,0.5).setDepth(17);

    this.instrText = this.add.text(W/2, UY+42, 'Sélectionnez une carte', {
      fontSize:'11px', color:'#AAAAAA', fontFamily:'Arial',
    }).setOrigin(0.5).setDepth(15);
  }

  // ─── Placement overlay ───────────────────────────────────────────────────────

  _showPlacementOverlay() {
    this._hidePlacementOverlay();
    const g = this.add.graphics().setDepth(2).setAlpha(0.2);
    g.fillStyle(0x44AAFF);
    g.fillRect(14, CONFIG.CENTER_Y+12, CONFIG.WIDTH-28, CONFIG.PLR_FLAG_Y - CONFIG.CENTER_Y - 30);
    const midY = CONFIG.CENTER_Y + (CONFIG.PLR_FLAG_Y - CONFIG.CENTER_Y)/2;
    const t = this.add.text(CONFIG.WIDTH/2, midY, 'Posez ici', {
      fontSize:'15px', color:'#FFFFFF', fontFamily:'Arial', fontStyle:'bold',
      stroke:'#000000', strokeThickness:4,
    }).setOrigin(0.5).setDepth(3);
    this._placementOverlay = [g, t];
  }

  _hidePlacementOverlay() {
    if (this._placementOverlay) { this._placementOverlay.forEach(o=>o.destroy()); this._placementOverlay=null; }
  }

  // ─── Cards ──────────────────────────────────────────────────────────────────

  _renderCards() {
    this.cardObjects.forEach(g=>g.forEach(o=>o.destroy()));
    this.cardObjects = [];
    const W = CONFIG.WIDTH;
    const cw=90, ch=116, gap=6;
    const startX = (W-(4*cw+3*gap))/2;
    const cardTopY = CONFIG.FIELD_BOTTOM+52;

    for (let i=0; i<4; i++) {
      const card = this.playerHand[i];
      const cx = startX + i*(cw+gap) + cw/2;
      const cy = cardTopY + ch/2;
      const isSel = i === this.selectedCardIndex;
      const canAfford = this.energy >= card.cost;
      const group = [];

      const bg = this.add.rectangle(cx,cy,cw,ch, isSel?0x332800:0x1a1a3e)
        .setStrokeStyle(2, isSel?0xFFD700:(canAfford?0x3355BB:0x282840))
        .setDepth(15).setInteractive({useHandCursor:true});
      bg.on('pointerdown', ptr=>{ ptr.event.stopPropagation(); this._selectCard(i); });
      group.push(bg);

      if (isSel) group.push(this.add.rectangle(cx,cy-ch/2-3,cw,4,0xFFD700).setDepth(14));

      const strip = this.add.rectangle(cx, cy-ch/2+9, cw, 18,
        parseInt(this.playerTeam.jerseyColor.slice(1),16)
      ).setDepth(16).setAlpha(canAfford?1:0.4);
      group.push(strip);

      group.push(this.add.text(cx, cy-ch/2+9, card.position, {
        fontSize:'9px', color:'#FFD700', fontFamily:'Arial', fontStyle:'bold',
      }).setOrigin(0.5).setDepth(17).setAlpha(canAfford?1:0.5));

      // Avatar
      const avatarY = cy-20;
      const sz = ROLE_SIZE[card.position] ?? {bw:16,bh:14,hr:8};
      const sc = 0.78;
      const jc = parseInt(this.playerTeam.jerseyColor.slice(1),16);
      group.push(
        this.add.rectangle(cx, avatarY, sz.bw*sc, sz.bh*sc, jc).setStrokeStyle(1,0x000000).setDepth(17).setAlpha(canAfford?1:0.5),
        this.add.circle(cx, avatarY-sz.bh*sc/2-sz.hr*sc, sz.hr*sc, 0xFFCCAA).setStrokeStyle(1,0x000000).setDepth(18).setAlpha(canAfford?1:0.5),
      );

      group.push(this.add.text(cx, cy+8, card.name, {
        fontSize:'9px', color:canAfford?'#FFFFFF':'#555577',
        fontFamily:'Arial', fontStyle:'bold', wordWrap:{width:cw-6}, align:'center',
      }).setOrigin(0.5).setDepth(17));

      group.push(this.add.text(cx, cy+26, card.abDesc, {
        fontSize:'8px', color:canAfford?'#88AAFF':'#333355',
        fontFamily:'Arial', align:'center', wordWrap:{width:cw-6},
      }).setOrigin(0.5).setDepth(17));

      group.push(
        this.add.circle(cx+cw/2-12, cy+ch/2-12, 13, 0x7700CC).setStrokeStyle(1,0xFFFFFF).setDepth(17).setAlpha(canAfford?1:0.5),
        this.add.text(cx+cw/2-12, cy+ch/2-12, card.cost.toString(), {
          fontSize:'12px', color:'#FFFFFF', fontFamily:'Arial', fontStyle:'bold',
        }).setOrigin(0.5).setDepth(18).setAlpha(canAfford?1:0.5),
      );

      this.cardObjects.push(group);
    }
  }

  _selectCard(index) {
    const card = this.playerHand[index];
    if (this.energy < card.cost) { this._toast('Pas assez d\'énergie !', 0xFF4444); return; }
    if (this.selectedCardIndex === index) {
      this.selectedCardIndex=-1; this.selectedCard=null;
      this.instrText.setText('Sélectionnez une carte');
      this._hidePlacementOverlay();
    } else {
      this.selectedCardIndex=index; this.selectedCard=card;
      this.instrText.setText('Posez sur votre terrain');
      this._showPlacementOverlay();
    }
    this._renderCards();
  }

  // ─── Input ──────────────────────────────────────────────────────────────────

  _setupInput() {
    this.input.on('pointerdown', ptr => {
      if (this.gameOver || !this.selectedCard) return;
      if (ptr.y >= CONFIG.FIELD_BOTTOM) return;
      if (ptr.y <= CONFIG.CENTER_Y+12) {
        this._toast('Déployez dans votre camp !', 0xFF8800); return;
      }
      if (this.energy < this.selectedCard.cost) return;
      if (this.playerUnits.filter(u=>!u.isDead).length >= CONFIG.MAX_UNITS_PER_TEAM) {
        this._toast('Terrain plein !', 0xFF8800); return;
      }
      const x = Phaser.Math.Clamp(ptr.x, CONFIG.FIELD_LEFT+10, CONFIG.FIELD_RIGHT-10);
      const y = Phaser.Math.Clamp(ptr.y, CONFIG.CENTER_Y+20, CONFIG.PLR_FLAG_Y-20);

      this._deployUnit(this.selectedCard, x, y, true);
      this.energy -= this.selectedCard.cost;
      this.playerHand.splice(this.selectedCardIndex,1);
      this._drawCard();
      this.selectedCard=null; this.selectedCardIndex=-1;
      this.instrText.setText('Sélectionnez une carte');
      this._hidePlacementOverlay();
      this._renderCards();
    });
  }

  // ─── Deploy ─────────────────────────────────────────────────────────────────

  _deployUnit(cardData, x, y, isPlayer) {
    const teamData = isPlayer ? this.playerTeam : this.aiTeam;
    const unit = new Unit(this, x, y, cardData, isPlayer, teamData);
    (isPlayer ? this.playerUnits : this.aiUnits).push(unit);
    if (isPlayer && cardData.ability === 'energizer') this._energyBoostUntil = Date.now()+5000;
    this._spawnFx(x, y, isPlayer);
  }

  _spawnFx(x, y, isPlayer) {
    const ring = this.add.circle(x, y, 5, 0, 0).setDepth(7)
      .setStrokeStyle(3, isPlayer?0x44AAFF:0xFF4444);
    this.tweens.add({ targets:ring, scaleX:4, scaleY:4, alpha:0, duration:450, onComplete:()=>ring.destroy() });
  }

  // ─── AI ─────────────────────────────────────────────────────────────────────

  _aiDeploy() {
    if (this.aiUnits.filter(u=>!u.isDead).length >= CONFIG.MAX_UNITS_PER_TEAM) return;
    if (this.aiDeck.length===0) { this.aiDeck=[...this.aiTeam.players]; this._shuffle(this.aiDeck); }
    const card = this.aiDeck.shift();
    const x = Phaser.Math.Between(CONFIG.FIELD_LEFT+20, CONFIG.FIELD_RIGHT-20);
    const y = Phaser.Math.Between(CONFIG.OPP_SPAWN_MIN_Y, CONFIG.OPP_SPAWN_MAX_Y);
    this._deployUnit(card, x, y, false);
  }

  // ─── Game Loop ──────────────────────────────────────────────────────────────

  update(_, delta) {
    if (this.gameOver) return;

    this.matchTime += delta;
    this._updateTimer();

    // Energy recharge
    const rate = (this._energyBoostUntil && Date.now() < this._energyBoostUntil)
      ? CONFIG.ENERGY_RECHARGE_MS/2 : CONFIG.ENERGY_RECHARGE_MS;
    if (this.energy < CONFIG.ENERGY_MAX)
      this.energy = Math.min(CONFIG.ENERGY_MAX, this.energy + delta/rate);
    this._updateEnergyUI();

    // AI deploy
    this.aiTimer += delta;
    if (this.aiTimer >= this.aiInterval) {
      this.aiTimer=0; this.aiInterval=Phaser.Math.Between(3500,6500); this._aiDeploy();
    }

    // Update player units
    const alivePlr = this.playerUnits.filter(u=>!u.isDead);
    const aliveAI  = this.aiUnits.filter(u=>!u.isDead);

    // Determine opponent flag targets (nearest flag first)
    const oppFlags = [this.oppFlagL, this.oppFlagR].filter(f=>!f.destroyed);
    const plrFlags = [this.playerFlagL, this.playerFlagR].filter(f=>!f.destroyed);

    for (const u of alivePlr) {
      const nearestFlag = this._nearestTarget(u, oppFlags);
      u.update(delta, aliveAI, nearestFlag, this.oppGoal);
    }
    for (const u of aliveAI) {
      const nearestFlag = this._nearestTarget(u, plrFlags);
      u.update(delta, alivePlr, nearestFlag, this.playerGoal);
    }

    // Update goalkeepers
    this.playerGK.update(delta, aliveAI);
    this.oppGK.update(delta, alivePlr);

    // Update GK balls
    for (const b of this.gkBalls) b.update(delta);
    this.gkBalls = this.gkBalls.filter(b=>!b.isDone);

    // Cleanup dead units
    this.playerUnits = this.playerUnits.filter(u=>!u.isDead);
    this.aiUnits     = this.aiUnits.filter(u=>!u.isDead);

    // Win condition
    if (this.oppGoal.hp <= 0)    this._endGame(true);
    else if (this.playerGoal.hp <= 0) this._endGame(false);
  }

  _nearestTarget(unit, targets) {
    if (!targets.length) return null;
    let best=null, bestD=Infinity;
    for (const t of targets) {
      const d = Math.hypot(unit.x-t.x, unit.y-t.y);
      if (d < bestD) { best=t; bestD=d; }
    }
    return best;
  }

  // ─── UI helpers ─────────────────────────────────────────────────────────────

  _updateTimer() {
    const s = Math.floor(this.matchTime/1000);
    this.matchTimerText.setText(
      `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
    );
  }

  _updateEnergyUI() {
    const pct = this.energy / CONFIG.ENERGY_MAX;
    this._energyFill.width = Math.max(0, pct*this._energyFullW);
    const r = Math.round(Phaser.Math.Linear(0x22,0x00,pct));
    const gv = Math.round(Phaser.Math.Linear(0x66,0xAA,pct));
    this._energyFill.fillColor = (r<<16)|(gv<<8)|0xFF;
    this._energyText.setText(Math.floor(this.energy).toString());
    const newFloor = Math.floor(this.energy);
    if (newFloor !== this._lastEnergyFloor) {
      this._lastEnergyFloor = newFloor;
      this._renderCards();
    }
  }

  _toast(msg, color=0xFFFFFF) {
    const hex = '#'+color.toString(16).padStart(6,'0');
    const t = this.add.text(CONFIG.WIDTH/2, CONFIG.CENTER_Y+55, msg, {
      fontSize:'17px', color:hex, fontFamily:'Arial', fontStyle:'bold',
      stroke:'#000000', strokeThickness:3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets:t, alpha:0, y:t.y-50, duration:1600, onComplete:()=>t.destroy() });
  }

  _endGame(playerWon) {
    if (this.gameOver) return;
    this.gameOver=true;
    this._hidePlacementOverlay();
    const col = playerWon?'#FFD700':'#FF4444';
    const banner = this.add.text(CONFIG.WIDTH/2, CONFIG.HEIGHT/2-40,
      playerWon?'VICTOIRE !':'DÉFAITE !', {
        fontSize:'64px', color:col, fontFamily:'Arial Black, Arial', fontStyle:'bold',
        stroke:'#000000', strokeThickness:8,
      }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({ targets:banner, alpha:1, scaleX:1.2, scaleY:1.2, duration:600, yoyo:true, hold:400 });
    this.time.delayedCall(2200, () => {
      this.scene.start('GameOverScene', {
        won:playerWon, playerTeam:this.playerTeamKey,
        aiTeam:this.aiTeamKey, duration:Math.floor(this.matchTime/1000),
      });
    });
  }
}
