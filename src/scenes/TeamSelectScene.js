class TeamSelectScene extends Phaser.Scene {
  constructor() { super('TeamSelectScene'); }

  create() {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    this._step      = 'pick_player';  // 'pick_player' | 'pick_ai'
    this._playerKey = null;

    this.add.rectangle(W/2,H/2,W,H,0x080818);
    // Subtle grid bg
    const bg = this.add.graphics();
    bg.lineStyle(1,0x1a1a3a,1);
    for(let x=0;x<W;x+=40) bg.lineBetween(x,0,x,H);
    for(let y=0;y<H;y+=40) bg.lineBetween(0,y,W,y);

    this._buildHeader();
    this._buildGrid();
    this._buildBackBtn();
  }

  _buildHeader() {
    const W = CONFIG.WIDTH;
    this.add.rectangle(W/2,42,W,84,0x111133);
    this._titleLine1 = this.add.text(W/2,20,'CHOISISSEZ', {
      fontSize:'22px',color:'#FFFFFF',fontFamily:'Arial Black, Arial',fontStyle:'bold',
      stroke:'#000000',strokeThickness:4,
    }).setOrigin(0.5,0);
    this._titleLine2 = this.add.text(W/2,48,'VOTRE ÉQUIPE', {
      fontSize:'22px',color:'#FFD700',fontFamily:'Arial Black, Arial',fontStyle:'bold',
      stroke:'#000000',strokeThickness:4,
    }).setOrigin(0.5,0);
  }

  _buildGrid() {
    // Destroy old grid objects
    if(this._gridObjs) this._gridObjs.forEach(o=>o.destroy());
    this._gridObjs = [];

    const teams = Object.keys(TEAMS_DATA);
    const cols   = 3;
    const cw     = 140, ch = 80, gap = 8;
    const totalW = cols*cw + (cols-1)*gap;
    const startX = (CONFIG.WIDTH - totalW)/2 + cw/2;
    const startY = 96;

    teams.forEach((key, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx  = startX + col*(cw+gap);
      const cy  = startY + row*(ch+gap) + ch/2;

      const team = TEAMS_DATA[key];
      const jc   = parseInt(team.jerseyColor.slice(1),16);

      // Is this team disabled (already picked as player)?
      const disabled = this._step==='pick_ai' && key===this._playerKey;

      const shadow = this.add.rectangle(cx+3,cy+3,cw,ch,0x000000,0.4);
      const card   = this.add.rectangle(cx,cy,cw,ch,jc)
        .setStrokeStyle(2,disabled?0x333333:0x444466,1)
        .setAlpha(disabled?0.35:1);

      // Colour accent strip
      const accent = this.add.rectangle(cx,cy-ch/2+8,cw,16,team.secondaryColor).setAlpha(disabled?0.2:0.55);

      const shortText = this.add.text(cx,cy-2,team.shortName,{
        fontSize:'18px',color:disabled?'#444444':'#FFFFFF',
        fontFamily:'Arial Black, Arial',fontStyle:'bold',
        stroke:'#000000',strokeThickness:3,
      }).setOrigin(0.5);

      const leagueText = this.add.text(cx,cy+24,team.league,{
        fontSize:'8px',color:disabled?'#333333':'#DDDDDD',fontFamily:'Arial',
      }).setOrigin(0.5);

      if(!disabled){
        card.setInteractive({useHandCursor:true});
        card.on('pointerover',()=>{
          card.setStrokeStyle(3,0xFFD700,1);
          shortText.setColor('#FFD700');
        });
        card.on('pointerout',()=>{
          card.setStrokeStyle(2,0x444466,1);
          shortText.setColor('#FFFFFF');
        });
        card.on('pointerdown',()=>this._onTeamPick(key));
      }

      this._gridObjs.push(shadow,card,accent,shortText,leagueText);
    });
  }

  _onTeamPick(key) {
    if(this._step==='pick_player'){
      this._playerKey = key;
      this._step      = 'pick_ai';
      this._titleLine1.setText('MAINTENANT');
      this._titleLine2.setText('CHOISISSEZ L\'ADVERSAIRE');
      this._buildGrid();
    } else {
      // Launch game
      this.scene.start('GameScene',{playerTeam:this._playerKey, aiTeam:key});
    }
  }

  _buildBackBtn() {
    const W=CONFIG.WIDTH, H=CONFIG.HEIGHT;
    const btn = this.add.text(W/2,H-22,'← Retour',{
      fontSize:'15px',color:'#666688',fontFamily:'Arial',
    }).setOrigin(0.5,1).setInteractive({useHandCursor:true});
    btn.on('pointerdown',()=>{
      if(this._step==='pick_ai'){
        this._step==='pick_player';
        this._playerKey=null;
        this._step='pick_player';
        this._titleLine1.setText('CHOISISSEZ');
        this._titleLine2.setText('VOTRE ÉQUIPE');
        this._buildGrid();
      } else {
        this.scene.start('MenuScene');
      }
    });
    btn.on('pointerover',()=>btn.setColor('#FFFFFF'));
    btn.on('pointerout',()=>btn.setColor('#666688'));
  }
}
