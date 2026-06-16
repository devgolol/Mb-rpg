/* 메인: 게임 루프 + 상태 머신 + 입력 */
(function () {
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");

  var STATE = { TITLE: "title", FIELD: "field", BATTLE: "battle", DIALOGUE: "dialogue", GAMEOVER: "gameover", ENDING: "ending" };
  var gameState = STATE.TITLE;

  var frame = 0;
  var dialogue = null; // { lines, index, label }

  // ── 입력 매핑 ─────────────────────────────────────────────
  var KEY = {
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    Space: "confirm", Enter: "confirm",
    KeyX: "cancel", Escape: "cancel",
  };

  document.addEventListener("keydown", function (e) {
    var action = KEY[e.code];
    if (!action) return;
    e.preventDefault();
    if (e.repeat && action === "confirm") return; // 메시지 연타로 건너뛰기 방지
    handleInput(action);
  });

  // ── 터치/마우스 컨트롤 (D패드는 누르고 있으면 반복 이동) ──
  function bindTouchControls() {
    var DIRS = { up: 1, down: 1, left: 1, right: 1 };
    var buttons = document.querySelectorAll("#touch-controls button[data-act]");
    Array.prototype.forEach.call(buttons, function (btn) {
      var act = btn.getAttribute("data-act");
      var repeatTimer = null;

      function press(e) {
        if (e) e.preventDefault();
        handleInput(act);
        if (DIRS[act]) {
          clearInterval(repeatTimer);
          repeatTimer = setInterval(function () { handleInput(act); }, 160);
        }
      }
      function release() { clearInterval(repeatTimer); repeatTimer = null; }

      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("touchend", function (e) { e.preventDefault(); release(); }, { passive: false });
      btn.addEventListener("touchcancel", release);
      btn.addEventListener("mousedown", press);
      btn.addEventListener("mouseup", release);
      btn.addEventListener("mouseleave", release);
      btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    });
  }
  bindTouchControls();

  // ── 입력 라우팅 ───────────────────────────────────────────
  function handleInput(action) {
    switch (gameState) {
      case STATE.TITLE:
        if (action === "confirm") startNewGame();
        break;
      case STATE.FIELD:
        handleFieldInput(action);
        break;
      case STATE.BATTLE:
        handleBattleInput(action);
        break;
      case STATE.DIALOGUE:
        if (action === "confirm") advanceDialogue();
        break;
      case STATE.GAMEOVER:
        if (action === "confirm") gameState = STATE.TITLE;
        break;
      case STATE.ENDING:
        if (action === "confirm") gameState = STATE.TITLE;
        break;
    }
  }

  // ── 게임 시작 ─────────────────────────────────────────────
  function startNewGame() {
    Player.create();
    gameState = STATE.FIELD;
  }

  // ── 필드 ─────────────────────────────────────────────────
  function handleFieldInput(action) {
    var p = Player.get();
    var dx = 0, dy = 0;
    if (action === "up") dy = -1;
    else if (action === "down") dy = 1;
    else if (action === "left") dx = -1;
    else if (action === "right") dx = 1;
    else return;

    var nx = p.tx + dx, ny = p.ty + dy;
    var inter = GameMap.interactionAt(nx, ny);
    if (inter) {
      if (inter.type === "boss") startBoss();
      else if (inter.type === "npc") openDialogue(inter.npc);
      return; // NPC/성문 칸으로는 이동하지 않음
    }
    if (GameMap.isWalkable(nx, ny)) {
      p.tx = nx;
      p.ty = ny;
      // 풀숲 조우 체크
      if (GameMap.isEncounterTile(nx, ny) && Math.random() < 0.28) {
        startRandomBattle();
      }
    }
  }

  function startRandomBattle() {
    var pool = GameData.fieldEncounters;
    var id = pool[Math.floor(Math.random() * pool.length)];
    Battle.start(id);
    gameState = STATE.BATTLE;
  }

  function startBoss() {
    var p = Player.get();
    if (p.bossDefeated) {
      openDialogueLines(["성문 너머는 고요하다. 군주는 이미 쓰러졌다."], "");
      return;
    }
    openDialogueLines([
      "거대한 성문이 열린다...",
      "어둠의 군주: 감히 나에게 도전하다니, 어리석은 인간이여!",
    ], "보스", function () {
      Battle.start("darklord");
      gameState = STATE.BATTLE;
    });
  }

  // ── 대화 ─────────────────────────────────────────────────
  function openDialogue(npcKey) {
    var p = Player.get();
    var lines = GameData.npcDialogues[npcKey].slice();
    var label = npcKey === "elder" ? "촌장" : npcKey === "healer" ? "치유사" : "상인";

    // 특수 효과
    if (npcKey === "healer") {
      Player.fullHeal();
    } else if (npcKey === "merchant") {
      p.inventory.potion = (p.inventory.potion || 0) + 2;
      p.inventory.ether = (p.inventory.ether || 0) + 1;
    }
    openDialogueLines(lines, label);
  }

  function openDialogueLines(lines, label, onClose) {
    dialogue = { lines: lines, index: 0, label: label, onClose: onClose || null };
    gameState = STATE.DIALOGUE;
  }

  function advanceDialogue() {
    dialogue.index++;
    if (dialogue.index >= dialogue.lines.length) {
      var cb = dialogue.onClose;
      dialogue = null;
      gameState = STATE.FIELD;
      if (cb) cb();
    }
  }

  // ── 전투 입력 ─────────────────────────────────────────────
  function handleBattleInput(action) {
    var b = Battle.getState();
    if (action === "up") Battle.onUp();
    else if (action === "down") Battle.onDown();
    else if (action === "left") Battle.onUp();
    else if (action === "right") Battle.onDown();
    else if (action === "confirm") Battle.onConfirm();
    else if (action === "cancel") Battle.onCancel();

    if (b.done) resolveBattle(b);
  }

  function resolveBattle(b) {
    if (b.outcome === "lose") {
      gameState = STATE.GAMEOVER;
    } else if (b.outcome === "win" && b.enemy.boss) {
      gameState = STATE.ENDING;
    } else {
      gameState = STATE.FIELD; // 승리(일반) 또는 도망
    }
  }

  // ── 렌더 루프 ─────────────────────────────────────────────
  function loop() {
    frame++;
    var blink = Math.floor(frame / 30) % 2 === 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (gameState) {
      case STATE.TITLE:
        UI.drawTitle(ctx, blink, frame);
        break;
      case STATE.FIELD:
        GameMap.draw(ctx, Player.get(), frame);
        UI.drawHUD(ctx, Player.get());
        break;
      case STATE.BATTLE:
        Battle.tick();
        UI.drawBattle(ctx, Battle.getState(), Player.get(), frame);
        break;
      case STATE.DIALOGUE:
        GameMap.draw(ctx, Player.get(), frame);
        UI.drawHUD(ctx, Player.get());
        UI.drawDialogue(ctx, dialogue.lines[dialogue.index], dialogue.label);
        break;
      case STATE.GAMEOVER:
        UI.drawGameOver(ctx, blink);
        break;
      case STATE.ENDING:
        UI.drawEnding(ctx, Player.get(), blink, frame);
        break;
    }
    requestAnimationFrame(loop);
  }

  // 첫 프레임을 위해 플레이어 임시 생성 (타이틀에서는 미사용)
  Player.create();
  loop();
})();
