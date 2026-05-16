const SPEED_DIV = 2800;

const POS_SPD = { GK:0.45, CB:0.50, RB:0.68, LB:0.68, CDM:0.74, CM:0.90, CAM:0.97, RW:1.28, LW:1.28, ST:1.18 };
const POS_HP  = { GK:1.60, CB:1.50, RB:1.22, LB:1.22, CDM:1.12, CM:1.00, CAM:0.88, RW:0.70, LW:0.70, ST:0.78 };

const ROLE_SIZE = {
  GK: {bw:24,bh:18,hr:11}, CB: {bw:23,bh:18,hr:11},
  RB: {bw:20,bh:16,hr: 9}, LB: {bw:20,bh:16,hr: 9},
  CDM:{bw:19,bh:15,hr: 9}, CM: {bw:17,bh:14,hr: 8},
  CAM:{bw:16,bh:13,hr: 8}, RW: {bw:14,bh:13,hr: 7},
  LW: {bw:14,bh:13,hr: 7}, ST: {bw:15,bh:14,hr: 8},
};

const ABILITY_COLOR = {
  fast:0xFFFF00, tank:0xAAAAAA, aoe:0xFF6600,
  striker:0xFF2244, energizer:0x00FFCC, balanced:0x44FF44,
};

class Unit {
  constructor(scene, x, y, data, isPlayer, teamData) {
    this.scene    = scene;
    this.x        = x;
    this.y        = y;
    this.data     = data;
    this.isPlayer = isPlayer;
    this.teamData = teamData;
    this.isDead   = false;
    this.state    = 'moving';

    const posMod     = POS_SPD[data.position] ?? 1.0;
    const hpMod      = POS_HP [data.position] ?? 1.0;
    const abilitySpd = data.ability === 'fast' ? 1.4 : 1.0;
    const abilityHp  = data.ability === 'tank' ? 1.5 : 1.0;

    this.maxHp          = Math.round(data.hp * hpMod * abilityHp);
    this.currentHp      = this.maxHp;
    this.atk            = data.atk;
    this.speed          = (data.spd * posMod * abilitySpd) / SPEED_DIV;
    this.ability        = data.ability;
    this.attackCooldown = 1000;
    this.attackTimer    = 0;
    this.attackRange    = 52;
    // A unit can engage a target up to 2.5× attack range before releasing it
    this.chaseRange     = this.attackRange * 2.5;

    // Single locked target — one target at a time
    this._lockedTarget  = null;   // Unit or Structure
    this._targetIsUnit  = false;

    this._jerseyColor = parseInt(teamData.jerseyColor.slice(1), 16);
    this._sz = ROLE_SIZE[data.position] ?? {bw:16,bh:14,hr:8};
    this._createVisuals();
  }

  // ── Visuals ──────────────────────────────────────────────────────────────────

  _createVisuals() {
    const {x, y, scene:s, _sz:sz, _jerseyColor:jc} = this;
    const skin=0xFFCCAA, hair=0x2A1800, sc=this.teamData.secondaryColor;

    this._shadow = s.add.ellipse(x,y+sz.bh/2+sz.hr/2+2,sz.bw+6,7,0x000000,0.28).setDepth(5);
    this._legL   = s.add.rectangle(x-sz.bw*0.22,y+sz.bh/2+5,sz.bw*0.22,10,0x222222).setStrokeStyle(1,0x000000,0.6).setDepth(6);
    this._legR   = s.add.rectangle(x+sz.bw*0.22,y+sz.bh/2+5,sz.bw*0.22,10,0x222222).setStrokeStyle(1,0x000000,0.6).setDepth(6);
    this._body   = s.add.rectangle(x,y,sz.bw,sz.bh,jc).setStrokeStyle(1.5,0x000000,0.9).setDepth(7);
    this._stripe = s.add.rectangle(x,y-sz.bh*0.1,sz.bw,Math.max(3,Math.round(sz.bh*0.26)),sc).setAlpha(0.55).setDepth(8);
    const headY  = y-sz.bh/2-sz.hr;
    this._head   = s.add.circle(x,headY,sz.hr,skin).setStrokeStyle(1,0x000000,0.8).setDepth(9);
    this._hair   = s.add.arc(x,headY,sz.hr*0.95,200,340,false,hair).setDepth(10);
    const barW   = sz.bw+14, barY=headY-sz.hr-8;
    this._barW   = barW;
    this._hpBg   = s.add.rectangle(x,barY,barW,5,0x000000,0.85).setDepth(10);
    this._hpFill = s.add.rectangle(x-barW/2,barY,barW,5,0x00CC00).setOrigin(0,0.5).setDepth(11);
    this._dot    = s.add.circle(x+sz.bw/2,y+sz.bh/2,4,ABILITY_COLOR[this.ability]??0xFFFFFF).setDepth(12);
  }

  // ── Update ───────────────────────────────────────────────────────────────────

  update(delta, enemies, flags, goal) {
    if (this.isDead) return;

    const step = this.speed * delta;

    // ── Validate & possibly release locked target ────────────────────────────
    if (this._lockedTarget) {
      const t = this._lockedTarget;
      const dead = this._targetIsUnit ? t.isDead : t.destroyed;
      const dist = Math.hypot(this.x-t.x, this.y-t.y);
      // Release if dead, or if unit target drifted beyond chase range
      if (dead || (this._targetIsUnit && dist > this.chaseRange)) {
        this._lockedTarget = null;
      }
    }

    // ── Pick a new locked target if none ────────────────────────────────────
    if (!this._lockedTarget) {
      // Prefer nearest living enemy unit
      let nearestEnemy=null, nearestDist=Infinity;
      for (const e of enemies) {
        if (e.isDead) continue;
        const d = Math.hypot(this.x-e.x, this.y-e.y);
        if (d < nearestDist) { nearestEnemy=e; nearestDist=d; }
      }

      if (nearestEnemy) {
        this._lockedTarget = nearestEnemy;
        this._targetIsUnit = true;
      } else {
        // No enemies — target nearest alive flag, then goal
        const aliveFlags = (flags||[]).filter(f=>!f.destroyed);
        let bestFlag=null, bestD=Infinity;
        for (const f of aliveFlags) {
          const d=Math.hypot(this.x-f.x, this.y-f.y);
          if (d<bestD) { bestFlag=f; bestD=d; }
        }
        const structTarget = bestFlag ?? (goal&&!goal.destroyed?goal:null);
        if (structTarget) { this._lockedTarget=structTarget; this._targetIsUnit=false; }
      }
    }

    if (!this._lockedTarget) { this._updateVisuals(); return; }

    // ── Act on locked target ─────────────────────────────────────────────────
    const t    = this._lockedTarget;
    const dist = Math.hypot(this.x-t.x, this.y-t.y);

    if (dist <= this.attackRange) {
      // In range — attack (do not move)
      this.state = this._targetIsUnit ? 'fighting' : 'attacking_structure';
      this.attackTimer += delta;
      if (this.attackTimer >= this.attackCooldown) {
        this.attackTimer -= this.attackCooldown;
        const dmg = (!this._targetIsUnit && this.ability==='striker')
          ? Math.round(this.atk * 1.5) : this.atk;
        t.takeDamage(dmg);
        // AoE: splash to nearby enemies (not the locked target, and only when fighting units)
        if (this._targetIsUnit && this.ability==='aoe') {
          for (const e of enemies) {
            if (e!==t && !e.isDead && Math.hypot(this.x-e.x,this.y-e.y)<90)
              e.takeDamage(Math.round(this.atk*0.4));
          }
        }
      }
    } else {
      // Out of range — move toward locked target
      this.state = 'moving';
      this.attackTimer = 0;
      this._moveToward(t.x, t.y, step);
    }

    this.x = Phaser.Math.Clamp(this.x, CONFIG.FIELD_LEFT+4, CONFIG.FIELD_RIGHT-4);
    this.y = Phaser.Math.Clamp(this.y, 20, CONFIG.FIELD_BOTTOM-20);
    this._updateVisuals();
  }

  _moveToward(tx, ty, step) {
    const dx=tx-this.x, dy=ty-this.y, dist=Math.hypot(dx,dy);
    if (dist<1) return;
    const r=Math.min(step,dist)/dist;
    this.x+=dx*r; this.y+=dy*r;
  }

  // ── Damage & Death ───────────────────────────────────────────────────────────

  takeDamage(amount) {
    if (this.isDead) return;
    this.currentHp=Math.max(0, this.currentHp-Math.round(amount));
    this._body.setFillStyle(0xFF3333);
    this._head.setFillStyle(0xFF3333);
    this.scene.time.delayedCall(130,()=>{
      if(!this.isDead){this._body.setFillStyle(this._jerseyColor);this._head.setFillStyle(0xFFCCAA);}
    });
    if (this.currentHp<=0) this._die();
  }

  _die() {
    this.isDead=true;
    const objs=[this._shadow,this._legL,this._legR,this._body,
                this._stripe,this._head,this._hair,this._hpBg,this._hpFill,this._dot];
    this.scene.tweens.add({
      targets:objs,alpha:0,scaleX:1.6,scaleY:1.6,duration:380,
      onComplete:()=>objs.forEach(o=>o.destroy()),
    });
  }

  // ── Visuals update ───────────────────────────────────────────────────────────

  _updateVisuals() {
    const x=Math.round(this.x), y=Math.round(this.y), sz=this._sz;
    const headY=y-sz.bh/2-sz.hr, legLX=x-sz.bw*0.22, legRX=x+sz.bw*0.22;
    const legY=y+sz.bh/2+5, barY=headY-sz.hr-8;

    this._shadow.setPosition(x,y+sz.bh/2+sz.hr/2+2);
    this._body.setPosition(x,y); this._stripe.setPosition(x,y-sz.bh*0.1);
    this._head.setPosition(x,headY); this._hair.setPosition(x,headY);
    this._hpBg.setPosition(x,barY); this._hpFill.setPosition(x-this._barW/2,barY);
    this._dot.setPosition(x+sz.bw/2,y+sz.bh/2);

    const pct=this.currentHp/this.maxHp;
    this._hpFill.width=Math.max(0,this._barW*pct);
    this._hpFill.fillColor=pct>0.5?0x00CC00:pct>0.25?0xFFAA00:0xFF2200;

    const wobble=this.state==='moving'?Math.sin(Date.now()*0.013)*3:0;
    this._legL.setPosition(legLX,legY+wobble);
    this._legR.setPosition(legRX,legY-wobble);
  }
}
