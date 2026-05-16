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

    this._dragCardIndex = -1;
    this._dragCard      = null;
    this._dragGhost     = null;

    this.cardObjects = [];
    this._renderCards();
  }

  // ─── Field ──────────────────────────────────────────────────────────────────

  _buildField() {
    const W=CONFIG.WIDTH, H=CONFIG.FIELD_BOTTOM;
    const g=this.add.graphics();

    // Stands
    g.fillStyle(0x1a1a1a);
    g.fillRect(0,0,14,H); g.fillRect(W-14,0,14,H);
    g.fillRect(0,0,W,10); g.fillRect(0,H-8,W,8);

    // Crowd
    const cc=[0xCC2200,0xFF4400,0xFFAA00,0x0044CC,0x8800CC,0xFFFFFF,0xFF8800,0x00AA44];
    let s=42; const rn=()=>{s=(s*1664525+1013904223)&0xffffffff;return(s>>>0)/0xffffffff;};
    for(let row=0;row<5;row++) for(let i=0;i<Math.floor(H/9);i++){
      g.fillStyle(cc[Math.floor(rn()*cc.length)],0.85); g.fillCircle(1+row*2.5+rn(),5+i*9+rn()*3,2.2);
    }
    for(let row=0;row<5;row++) for(let i=0;i<Math.floor(H/9);i++){
      g.fillStyle(cc[Math.floor(rn()*cc.length)],0.85); g.fillCircle(W-1-row*2.5-rn(),5+i*9+rn()*3,2.2);
    }
    for(let col=0;col<4;col++) for(let i=0;i<Math.floor(W/9);i++){
      g.fillStyle(cc[Math.floor(rn()*cc.length)],0.85); g.fillCircle(5+i*9+rn()*3,1+col*2+rn(),2.2);
    }
    for(let col=0;col<3;col++) for(let i=0;i<Math.floor(W/9);i++){
      g.fillStyle(cc[Math.floor(rn()*cc.length)],0.85); g.fillCircle(5+i*9+rn()*3,H-2-col*2-rn(),2.2);
    }

    // Grass
    g.fillStyle(0x1e7a1e); g.fillRect(14,10,W-28,H-18);
    g.fillStyle(0x1c7220,1);
    for(let y=10;y<H-10;y+=52) g.fillRect(14,y,W-28,26);

    // Pitch lines
    g.lineStyle(1.8,0xFFFFFF,0.9);
    g.strokeRect(14,10,W-28,H-18);
    g.lineBetween(14,CONFIG.CENTER_Y,W-14,CONFIG.CENTER_Y);
    g.strokeCircle(W/2,CONFIG.CENTER_Y,52);
    g.fillStyle(0xFFFFFF,0.9); g.fillCircle(W/2,CONFIG.CENTER_Y,3);

    const penW=200,penH=90,penLX=(W-penW)/2,gaW=100,gaH=40,gaLX=(W-gaW)/2;
    g.strokeRect(penLX,10,penW,penH);
    g.strokeRect(gaLX,10,gaW,gaH);
    g.fillCircle(W/2,10+60,3);
    g.beginPath(); g.arc(W/2,10+60,44,Phaser.Math.DegToRad(25),Phaser.Math.DegToRad(155),false); g.strokePath();
    g.beginPath(); g.arc(14,10,10,0,Phaser.Math.DegToRad(90),false); g.strokePath();
    g.beginPath(); g.arc(W-14,10,10,Phaser.Math.DegToRad(90),Phaser.Math.DegToRad(180),false); g.strokePath();

    g.strokeRect(penLX,H-18-penH,penW,penH);
    g.strokeRect(gaLX,H-18-gaH,gaW,gaH);
    g.fillCircle(W/2,H-18-60,3);
    g.beginPath(); g.arc(W/2,H-18-60,44,Phaser.Math.DegToRad(205),Phaser.Math.DegToRad(335),false); g.strokePath();
    g.beginPath(); g.arc(14,H-8,10,Phaser.Math.DegToRad(270),Phaser.Math.DegToRad(360),false); g.strokePath();
    g.beginPath(); g.arc(W-14,H-8,10,Phaser.Math.DegToRad(180),Phaser.Math.DegToRad(270),false); g.strokePath();

    // Bridges
    const BLX=CONFIG.BRIDGE_LEFT_X,BRX=CONFIG.BRIDGE_RIGHT_X,BW=CONFIG.BRIDGE_W,CY=CONFIG.CENTER_Y;
    g.fillStyle(0xC8A050,0.5);
    g.fillRect(BLX-BW/2,CY-9,BW,18); g.fillRect(BRX-BW/2,CY-9,BW,18);
    g.lineStyle(2,0xFFD700,0.9);
    g.strokeRect(BLX-BW/2,CY-9,BW,18); g.strokeRect(BRX-BW/2,CY-9,BW,18);
    this.add.text(BLX,CY-2,'⇅',{fontSize:'13px',color:'#FFD700',fontFamily:'Arial'}).setOrigin(0.5).setDepth(4).setAlpha(0.9);
    this.add.text(BRX,CY-2,'⇅',{fontSize:'13px',color:'#FFD700',fontFamily:'Arial'}).setOrigin(0.5).setDepth(4).setAlpha(0.9);

    // UI panel
    this.add.rectangle(W/2,CONFIG.FIELD_BOTTOM+(CONFIG.HEIGHT-CONFIG.FIELD_BOTTOM)/2,
      W,CONFIG.HEIGHT-CONFIG.FIELD_BOTTOM,0x0d0d22);
  }

  // ─── Structures ─────────────────────────────────────────────────────────────

  _buildStructures() {
    const W=CONFIG.WIDTH;
    this.oppGoal    = new Structure(this,W/2,CONFIG.OPP_GOAL_Y,'goal',CONFIG.GOAL_HP,this.aiTeam.primaryColor,this.aiTeam.secondaryColor,this.aiTeam.shortName);
    this.oppFlagL   = new Structure(this,W*0.27,CONFIG.OPP_FLAG_Y,'flag',CONFIG.FLAG_HP,this.aiTeam.primaryColor,this.aiTeam.secondaryColor,'⚑G');
    this.oppFlagR   = new Structure(this,W*0.73,CONFIG.OPP_FLAG_Y,'flag',CONFIG.FLAG_HP,this.aiTeam.primaryColor,this.aiTeam.secondaryColor,'⚑D');
    this.playerGoal = new Structure(this,W/2,CONFIG.PLR_GOAL_Y,'goal',CONFIG.GOAL_HP,this.playerTeam.primaryColor,this.playerTeam.secondaryColor,this.playerTeam.shortName);
    this.playerFlagL= new Structure(this,W*0.27,CONFIG.PLR_FLAG_Y,'flag',CONFIG.FLAG_HP,this.playerTeam.primaryColor,this.playerTeam.secondaryColor,'⚑G');
    this.playerFlagR= new Structure(this,W*0.73,CONFIG.PLR_FLAG_Y,'flag',CONFIG.FLAG_HP,this.playerTeam.primaryColor,this.playerTeam.secondaryColor,'⚑D');
  }

  _buildGoalkeepers() {
    const W=CONFIG.WIDTH;
    this.playerGK = new Goalkeeper(this,W/2,CONFIG.PLR_GOAL_Y-18,true, this.playerTeam);
    this.oppGK    = new Goalkeeper(this,W/2,CONFIG.OPP_GOAL_Y+18,false,this.aiTeam);
  }

  // ─── Deck ───────────────────────────────────────────────────────────────────

  _initDeck() {
    this.playerDeck=[...this.playerTeam.players]; this._shuffle(this.playerDeck);
    this.playerHand=[]; while(this.playerHand.length<4) this._drawCard();
    this.aiDeck=[...this.aiTeam.players]; this._shuffle(this.aiDeck);
  }
  _shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}}
  _drawCard(){
    if(!this.playerDeck.length){this.playerDeck=[...this.playerTeam.players];this._shuffle(this.playerDeck);}
    this.playerHand.push(this.playerDeck.shift());
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  _buildUI() {
    const W=CONFIG.WIDTH, UY=CONFIG.FIELD_BOTTOM;
    this.add.text(W/2,14,this.aiTeam.shortName,{fontSize:'12px',color:'#FFFFFF',fontFamily:'Arial',fontStyle:'bold',stroke:'#000000',strokeThickness:3}).setOrigin(0.5,0).setDepth(15);
    this.add.text(W/2,UY-12,this.playerTeam.shortName,{fontSize:'12px',color:'#FFFFFF',fontFamily:'Arial',fontStyle:'bold',stroke:'#000000',strokeThickness:3}).setOrigin(0.5,1).setDepth(15);
    this.matchTimerText=this.add.text(W/2,14,'00:00',{fontSize:'13px',color:'#FFD700',fontFamily:'Arial',fontStyle:'bold'}).setOrigin(0.5,0).setDepth(16);

    // Compact energy bar
    const barX=8,barY=UY+16,barW=W-16,barH=14;
    this.add.text(barX,UY+5,'⚡',{fontSize:'10px',color:'#FFD700',fontFamily:'Arial'}).setDepth(15);
    this.add.rectangle(barX+barW/2,barY,barW,barH,0x111133).setStrokeStyle(1,0x333366).setDepth(15);
    this._energyFill=this.add.rectangle(barX,barY,0,barH-2,0x2266FF).setOrigin(0,0.5).setDepth(16);
    this._energyFullW=barW;
    const tg=this.add.graphics().setDepth(17);
    tg.lineStyle(1,0xFFFFFF,0.3);
    for(let i=1;i<10;i++){const tx=barX+(i/10)*barW;tg.lineBetween(tx,barY-barH/2+2,tx,barY+barH/2-2);}
    this._energyText=this.add.text(W-6,barY,'5',{fontSize:'11px',color:'#FFFFFF',fontFamily:'Arial',fontStyle:'bold'}).setOrigin(1,0.5).setDepth(17);
    this.instrText=this.add.text(W/2,UY+33,'Glissez une carte sur le terrain',{fontSize:'10px',color:'#AAAAAA',fontFamily:'Arial'}).setOrigin(0.5).setDepth(15);
  }

  // ─── Drag ghost ─────────────────────────────────────────────────────────────

  _createDragGhost(card, x, y) {
    this._destroyDragGhost();
    const jc=parseInt(this.playerTeam.jerseyColor.slice(1),16);
    const sz=ROLE_SIZE[card.position]??{bw:16,bh:14,hr:8};
    const sc=this.playerTeam.secondaryColor;
    const ring=this.add.circle(x,y,22,0x44AAFF,0.35).setDepth(48).setStrokeStyle(2,0x44AAFF,0.9);
    const body=this.add.rectangle(x,y,sz.bw,sz.bh,jc).setAlpha(0.72).setStrokeStyle(1.5,0x000000,0.9).setDepth(49);
    const stripe=this.add.rectangle(x,y-sz.bh*0.1,sz.bw,Math.max(3,Math.round(sz.bh*0.26)),sc).setAlpha(0.45).setDepth(50);
    const headY=y-sz.bh/2-sz.hr;
    const head=this.add.circle(x,headY,sz.hr,0xFFCCAA).setAlpha(0.72).setStrokeStyle(1,0x000000).setDepth(50);
    this._dragGhost={objs:[ring,body,stripe,head],ring,_offY:sz.bh/2+sz.hr+5,_sz:sz};
    this._moveDragGhost(x,y);
  }

  _moveDragGhost(px,py){
    if(!this._dragGhost) return;
    const g=this._dragGhost, y=py-g._offY, sz=g._sz;
    const headY=y-sz.bh/2-sz.hr;
    const valid=this._isValidDrop(px,py);
    const rc=valid?0x44FF88:0xFF4444;
    g.ring.setPosition(px,y).setFillStyle(rc,0.25).setStrokeStyle(2,rc,0.9);
    g.objs[1].setPosition(px,y);
    g.objs[2].setPosition(px,y-sz.bh*0.1);
    g.objs[3].setPosition(px,headY);
  }

  _destroyDragGhost(){if(this._dragGhost){this._dragGhost.objs.forEach(o=>o.destroy());this._dragGhost=null;}}

  _isValidDrop(x,y){
    return y>CONFIG.CENTER_Y+12 && y<CONFIG.FIELD_BOTTOM-8
      && x>CONFIG.FIELD_LEFT+4 && x<CONFIG.FIELD_RIGHT-4;
  }

  // ─── Cards ──────────────────────────────────────────────────────────────────

  _renderCards(){
    this.cardObjects.forEach(g=>g.forEach(o=>o.destroy())); this.cardObjects=[];
    const W=CONFIG.WIDTH, cw=88, ch=104, gap=5;
    const startX=(W-(4*cw+3*gap))/2;
    const cardTopY=CONFIG.FIELD_BOTTOM+44;

    for(let i=0;i<4;i++){
      const card=this.playerHand[i];
      const cx=startX+i*(cw+gap)+cw/2, cy=cardTopY+ch/2;
      const canAfford=this.energy>=card.cost;
      const group=[];

      const bg=this.add.rectangle(cx,cy,cw,ch,0x1a1a3e)
        .setStrokeStyle(2,canAfford?0x3355BB:0x282840)
        .setDepth(15).setInteractive({useHandCursor:true});
      bg.on('pointerdown',(ptr)=>{
        ptr.event.stopPropagation();
        if(this.gameOver) return;
        if(!canAfford){this._toast('Pas assez d\'énergie !',0xFF4444);return;}
        if(this.playerUnits.filter(u=>!u.isDead).length>=CONFIG.MAX_UNITS_PER_TEAM){
          this._toast('Terrain plein !',0xFF8800);return;}
        this._dragCardIndex=i; this._dragCard=card;
        this._createDragGhost(card,ptr.x,ptr.y);
        this.instrText.setText('Relâchez sur votre camp');
      });
      group.push(bg);
      group.push(this.add.rectangle(cx,cy-ch/2+8,cw,16,parseInt(this.playerTeam.jerseyColor.slice(1),16)).setDepth(16).setAlpha(canAfford?1:0.4));
      group.push(this.add.text(cx,cy-ch/2+8,card.position,{fontSize:'9px',color:'#FFD700',fontFamily:'Arial',fontStyle:'bold'}).setOrigin(0.5).setDepth(17).setAlpha(canAfford?1:0.5));

      const sz=ROLE_SIZE[card.position]??{bw:16,bh:14,hr:8}, sc=0.75;
      const jc=parseInt(this.playerTeam.jerseyColor.slice(1),16);
      group.push(
        this.add.rectangle(cx,cy-16,sz.bw*sc,sz.bh*sc,jc).setStrokeStyle(1,0x000000).setDepth(17).setAlpha(canAfford?1:0.5),
        this.add.circle(cx,cy-16-sz.bh*sc/2-sz.hr*sc,sz.hr*sc,0xFFCCAA).setStrokeStyle(1,0x000000).setDepth(18).setAlpha(canAfford?1:0.5),
      );
      group.push(this.add.text(cx,cy+12,card.name,{fontSize:'8px',color:canAfford?'#FFFFFF':'#555577',fontFamily:'Arial',fontStyle:'bold',wordWrap:{width:cw-6},align:'center'}).setOrigin(0.5).setDepth(17));
      group.push(this.add.text(cx,cy+28,card.abDesc,{fontSize:'7px',color:canAfford?'#88AAFF':'#333355',fontFamily:'Arial',align:'center',wordWrap:{width:cw-6}}).setOrigin(0.5).setDepth(17));
      group.push(
        this.add.circle(cx+cw/2-11,cy+ch/2-11,12,0x7700CC).setStrokeStyle(1,0xFFFFFF).setDepth(17).setAlpha(canAfford?1:0.5),
        this.add.text(cx+cw/2-11,cy+ch/2-11,card.cost.toString(),{fontSize:'11px',color:'#FFFFFF',fontFamily:'Arial',fontStyle:'bold'}).setOrigin(0.5).setDepth(18).setAlpha(canAfford?1:0.5),
      );
      this.cardObjects.push(group);
    }
  }

  // ─── Input ──────────────────────────────────────────────────────────────────

  _setupInput(){
    this.input.on('pointermove',ptr=>{
      if(this._dragCardIndex<0||!this._dragGhost) return;
      this._moveDragGhost(ptr.x,ptr.y);
    });
    this.input.on('pointerup',ptr=>{
      if(this._dragCardIndex<0) return;
      const card=this._dragCard;
      if(this._isValidDrop(ptr.x,ptr.y)&&!this.gameOver){
        const x=Phaser.Math.Clamp(ptr.x,CONFIG.FIELD_LEFT+10,CONFIG.FIELD_RIGHT-10);
        const y=Phaser.Math.Clamp(ptr.y-(this._dragGhost?._offY??0),CONFIG.CENTER_Y+20,CONFIG.FIELD_BOTTOM-20);
        this._deployUnit(card,x,y,true);
        this.energy-=card.cost;
        this.playerHand.splice(this._dragCardIndex,1);
        this._drawCard();
        this._renderCards();
      }
      this._destroyDragGhost();
      this._dragCardIndex=-1; this._dragCard=null;
      this.instrText.setText('Glissez une carte sur le terrain');
    });
  }

  // ─── Deploy ─────────────────────────────────────────────────────────────────

  _deployUnit(cardData,x,y,isPlayer){
    const teamData=isPlayer?this.playerTeam:this.aiTeam;
    const unit=new Unit(this,x,y,cardData,isPlayer,teamData);
    (isPlayer?this.playerUnits:this.aiUnits).push(unit);
    if(isPlayer&&cardData.ability==='energizer') this._energyBoostUntil=Date.now()+5000;
    this._spawnFx(x,y,isPlayer);
  }

  _spawnFx(x,y,isPlayer){
    const ring=this.add.circle(x,y,5,0,0).setDepth(7).setStrokeStyle(3,isPlayer?0x44AAFF:0xFF4444);
    this.tweens.add({targets:ring,scaleX:4,scaleY:4,alpha:0,duration:450,onComplete:()=>ring.destroy()});
  }

  _aiDeploy(){
    if(this.aiUnits.filter(u=>!u.isDead).length>=CONFIG.MAX_UNITS_PER_TEAM) return;
    if(!this.aiDeck.length){this.aiDeck=[...this.aiTeam.players];this._shuffle(this.aiDeck);}
    const card=this.aiDeck.shift();
    const x=Phaser.Math.Between(CONFIG.FIELD_LEFT+20,CONFIG.FIELD_RIGHT-20);
    const y=Phaser.Math.Between(CONFIG.OPP_SPAWN_MIN_Y,CONFIG.OPP_SPAWN_MAX_Y);
    this._deployUnit(card,x,y,false);
  }

  // ─── Game Loop ──────────────────────────────────────────────────────────────

  update(_,delta){
    if(this.gameOver) return;
    this.matchTime+=delta; this._updateTimer();

    const rate=(this._energyBoostUntil&&Date.now()<this._energyBoostUntil)?CONFIG.ENERGY_RECHARGE_MS/2:CONFIG.ENERGY_RECHARGE_MS;
    if(this.energy<CONFIG.ENERGY_MAX) this.energy=Math.min(CONFIG.ENERGY_MAX,this.energy+delta/rate);
    this._updateEnergyUI();

    this.aiTimer+=delta;
    if(this.aiTimer>=this.aiInterval){this.aiTimer=0;this.aiInterval=Phaser.Math.Between(3500,6500);this._aiDeploy();}

    const alivePlr=this.playerUnits.filter(u=>!u.isDead);
    const aliveAI =this.aiUnits.filter(u=>!u.isDead);
    const oppFlags=[this.oppFlagL,this.oppFlagR];
    const plrFlags=[this.playerFlagL,this.playerFlagR];

    for(const u of alivePlr) u.update(delta,aliveAI,oppFlags,this.oppGoal);
    for(const u of aliveAI)  u.update(delta,alivePlr,plrFlags,this.playerGoal);

    this.playerGK.update(delta,aliveAI);
    this.oppGK.update(delta,alivePlr);
    for(const b of this.gkBalls) b.update(delta);
    this.gkBalls=this.gkBalls.filter(b=>!b.isDone);

    this.playerUnits=this.playerUnits.filter(u=>!u.isDead);
    this.aiUnits=this.aiUnits.filter(u=>!u.isDead);

    if(this.oppGoal.hp<=0)         this._endGame(true);
    else if(this.playerGoal.hp<=0) this._endGame(false);
  }

  _updateTimer(){
    const s=Math.floor(this.matchTime/1000);
    this.matchTimerText.setText(`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`);
  }

  _updateEnergyUI(){
    const pct=this.energy/CONFIG.ENERGY_MAX;
    this._energyFill.width=Math.max(0,pct*this._energyFullW);
    const r=Math.round(Phaser.Math.Linear(0x22,0x00,pct));
    const gv=Math.round(Phaser.Math.Linear(0x66,0xAA,pct));
    this._energyFill.fillColor=(r<<16)|(gv<<8)|0xFF;
    this._energyText.setText(Math.floor(this.energy).toString());
    const nf=Math.floor(this.energy);
    if(nf!==this._lastEnergyFloor){this._lastEnergyFloor=nf;this._renderCards();}
  }

  _toast(msg,color=0xFFFFFF){
    const t=this.add.text(CONFIG.WIDTH/2,CONFIG.CENTER_Y+55,msg,{fontSize:'17px',color:'#'+color.toString(16).padStart(6,'0'),fontFamily:'Arial',fontStyle:'bold',stroke:'#000000',strokeThickness:3}).setOrigin(0.5).setDepth(30);
    this.tweens.add({targets:t,alpha:0,y:t.y-50,duration:1600,onComplete:()=>t.destroy()});
  }

  _endGame(playerWon){
    if(this.gameOver) return;
    this.gameOver=true; this._destroyDragGhost();
    const col=playerWon?'#FFD700':'#FF4444';
    const banner=this.add.text(CONFIG.WIDTH/2,CONFIG.HEIGHT/2-40,playerWon?'VICTOIRE !':'DÉFAITE !',{fontSize:'64px',color:col,fontFamily:'Arial Black, Arial',fontStyle:'bold',stroke:'#000000',strokeThickness:8}).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({targets:banner,alpha:1,scaleX:1.2,scaleY:1.2,duration:600,yoyo:true,hold:400});
    this.time.delayedCall(2200,()=>this.scene.start('GameOverScene',{won:playerWon,playerTeam:this.playerTeamKey,aiTeam:this.aiTeamKey,duration:Math.floor(this.matchTime/1000)}));
  }
}
