/* 턴제 전투 엔진 (이벤트 구동). main.js가 입력 콜백을 호출한다. */
var Battle = (function () {
  var PHASE = { COMMAND: "command", SKILL: "skill", ITEM: "item", MSG: "msg" };
  var COMMANDS = ["공격", "스킬", "아이템", "도망"];

  var b = null; // 현재 전투 상태

  function start(monsterId) {
    var m = GameData.monsters[monsterId];
    b = {
      enemy: {
        id: m.id, name: m.name, color: m.color,
        maxHp: m.maxHp, hp: m.maxHp,
        atk: m.atk, def: m.def, spd: m.spd,
        exp: m.exp, gold: m.gold, boss: !!m.boss,
        skills: m.skills.slice(),
      },
      phase: PHASE.COMMAND,
      menuIndex: 0,
      skillList: Player.get().skills,
      itemList: ["potion", "ether"],
      msgQueue: [],
      afterMsg: null,
      log: "", // 현재 표시 중인 메시지
      done: false,
      outcome: null, // 'win' | 'lose' | 'flee'
      shake: 0, // 피격 연출용
      flash: 0,
    };
    queue(["야생의 " + b.enemy.name + "이(가) 나타났다!"], toCommand);
    return b;
  }

  function getState() { return b; }

  // ── 메시지 큐 ─────────────────────────────────────────────
  function queue(messages, after) {
    b.msgQueue = b.msgQueue.concat(messages);
    b.afterMsg = after || null;
    advanceMsg();
  }

  function advanceMsg() {
    if (b.msgQueue.length > 0) {
      b.phase = PHASE.MSG;
      b.log = b.msgQueue.shift();
    } else {
      var fn = b.afterMsg;
      b.afterMsg = null;
      if (fn) fn();
    }
  }

  // ── 데미지 계산 ───────────────────────────────────────────
  function computeDamage(atk, def, mult, type) {
    var base = atk * mult - (type === "magic" ? def * 0.5 : def);
    base = Math.max(1, base);
    var variance = 0.85 + Math.random() * 0.15;
    var crit = Math.random() < 0.1 ? 1.5 : 1.0;
    return { dmg: Math.max(1, Math.round(base * variance * crit)), crit: crit > 1 };
  }

  // ── 페이즈 전환 ───────────────────────────────────────────
  function toCommand() {
    b.phase = PHASE.COMMAND;
    b.menuIndex = 0;
    b.log = "무엇을 할까?";
  }

  // ── 플레이어 행동 ─────────────────────────────────────────
  function doAttack() {
    var p = Player.get();
    var r = computeDamage(p.atk, b.enemy.def, 1.0, "physical");
    b.enemy.hp = Math.max(0, b.enemy.hp - r.dmg);
    b.shake = 8; b.flash = 6;
    var msg = p.name + "의 공격! " + b.enemy.name + "에게 " + r.dmg + " 데미지!";
    if (r.crit) msg = "회심의 일격! " + msg;
    queue([msg], afterPlayerAction);
  }

  function doSkill(skillId) {
    var p = Player.get();
    var sk = GameData.skills[skillId];
    if (p.mp < sk.mp) { queue(["MP가 부족하다!"], toCommand); return; }
    p.mp -= sk.mp;
    if (sk.type === "heal") {
      var before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + sk.power);
      queue([p.name + "은(는) " + sk.name + "! HP가 " + (p.hp - before) + " 회복됐다!"], afterPlayerAction);
      return;
    }
    var r = computeDamage(p.atk, b.enemy.def, sk.power, sk.type);
    b.enemy.hp = Math.max(0, b.enemy.hp - r.dmg);
    b.shake = 10; b.flash = 8;
    var msg = p.name + "의 " + sk.name + "! " + b.enemy.name + "에게 " + r.dmg + " 데미지!";
    if (r.crit) msg = "회심의 일격! " + msg;
    queue([msg], afterPlayerAction);
  }

  function doItem(itemId) {
    var msg = Player.useItem(itemId);
    if (!msg) { queue(["지금은 사용할 수 없다!"], toCommand); return; }
    queue([msg], afterPlayerAction);
  }

  function doFlee() {
    var p = Player.get();
    if (b.enemy.boss) { queue(["보스에게서는 도망칠 수 없다!"], enemyTurn); return; }
    var chance = 0.4 + (p.spd - b.enemy.spd) * 0.05;
    if (Math.random() < Math.max(0.15, chance)) {
      b.outcome = "flee";
      queue(["무사히 도망쳤다!"], function () { b.done = true; });
    } else {
      queue(["도망치지 못했다!"], enemyTurn);
    }
  }

  // 플레이어 행동 후 → 적 생존 확인
  function afterPlayerAction() {
    if (b.enemy.hp <= 0) {
      victory();
    } else {
      enemyTurn();
    }
  }

  // ── 적 행동 ──────────────────────────────────────────────
  function enemyTurn() {
    var p = Player.get();
    var useSkill = b.enemy.skills.length > 0 && Math.random() < 0.4;
    var r;
    var msg;
    if (useSkill) {
      var skId = b.enemy.skills[Math.floor(Math.random() * b.enemy.skills.length)];
      var sk = GameData.skills[skId];
      r = computeDamage(b.enemy.atk, p.def, sk.power, sk.type);
      msg = b.enemy.name + "의 " + sk.name + "! " + p.name + "에게 " + r.dmg + " 데미지!";
    } else {
      r = computeDamage(b.enemy.atk, p.def, 1.0, "physical");
      msg = b.enemy.name + "의 공격! " + p.name + "에게 " + r.dmg + " 데미지!";
    }
    p.hp = Math.max(0, p.hp - r.dmg);
    if (r.crit) msg = "아픈 일격! " + msg;
    queue([msg], afterEnemyAction);
  }

  function afterEnemyAction() {
    var p = Player.get();
    if (p.hp <= 0) {
      b.outcome = "lose";
      queue([p.name + "은(는) 쓰러졌다..."], function () { b.done = true; });
    } else {
      toCommand();
    }
  }

  // ── 승리 ─────────────────────────────────────────────────
  function victory() {
    var p = Player.get();
    var msgs = [b.enemy.name + "을(를) 쓰러뜨렸다!"];
    if (b.enemy.boss) {
      p.bossDefeated = true;
      b.outcome = "win";
      queue(msgs, function () { b.done = true; });
      return;
    }
    p.gold += b.enemy.gold;
    msgs.push("경험치 " + b.enemy.exp + ", 골드 " + b.enemy.gold + " 획득!");
    var levelMsgs = Player.gainExp(b.enemy.exp);
    msgs = msgs.concat(levelMsgs);
    b.outcome = "win";
    queue(msgs, function () { b.done = true; });
  }

  // ── 입력 처리 ─────────────────────────────────────────────
  function onUp() {
    if (b.phase === PHASE.COMMAND) b.menuIndex = (b.menuIndex + COMMANDS.length - 1) % COMMANDS.length;
    else if (b.phase === PHASE.SKILL) b.menuIndex = (b.menuIndex + b.skillList.length - 1) % b.skillList.length;
    else if (b.phase === PHASE.ITEM) b.menuIndex = (b.menuIndex + b.itemList.length - 1) % b.itemList.length;
  }
  function onDown() {
    if (b.phase === PHASE.COMMAND) b.menuIndex = (b.menuIndex + 1) % COMMANDS.length;
    else if (b.phase === PHASE.SKILL) b.menuIndex = (b.menuIndex + 1) % b.skillList.length;
    else if (b.phase === PHASE.ITEM) b.menuIndex = (b.menuIndex + 1) % b.itemList.length;
  }

  function onConfirm() {
    if (b.phase === PHASE.MSG) { advanceMsg(); return; }
    if (b.phase === PHASE.COMMAND) {
      var cmd = COMMANDS[b.menuIndex];
      if (cmd === "공격") doAttack();
      else if (cmd === "스킬") { b.phase = PHASE.SKILL; b.menuIndex = 0; }
      else if (cmd === "아이템") { b.phase = PHASE.ITEM; b.menuIndex = 0; }
      else if (cmd === "도망") doFlee();
    } else if (b.phase === PHASE.SKILL) {
      doSkill(b.skillList[b.menuIndex]);
    } else if (b.phase === PHASE.ITEM) {
      doItem(b.itemList[b.menuIndex]);
    }
  }

  function onCancel() {
    if (b.phase === PHASE.SKILL || b.phase === PHASE.ITEM) toCommand();
  }

  // 연출 타이머 감쇠
  function tick() {
    if (b.shake > 0) b.shake--;
    if (b.flash > 0) b.flash--;
  }

  return {
    PHASE: PHASE,
    COMMANDS: COMMANDS,
    start: start,
    getState: getState,
    onUp: onUp,
    onDown: onDown,
    onConfirm: onConfirm,
    onCancel: onCancel,
    tick: tick,
  };
})();
