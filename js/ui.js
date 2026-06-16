/* UI 렌더링: HUD, 전투 화면, 대화창, 타이틀/엔딩/게임오버 */
var UI = (function () {
  var W = 640, H = 480;

  function box(ctx, x, y, w, h) {
    ctx.fillStyle = "rgba(10, 12, 28, 0.92)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#e8e8f0";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = "#5a6bd0";
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  }

  function bar(ctx, x, y, w, h, ratio, color, bg) {
    ctx.fillStyle = bg || "#222";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, Math.round(w * ratio)), h);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  // 긴 한국어 텍스트 줄바꿈
  function wrap(ctx, text, x, y, maxW, lineH) {
    var line = "";
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line.length > 0) {
        ctx.fillText(line, x, y);
        line = text[i];
        y += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, y);
    return y;
  }

  // ── 필드 HUD ─────────────────────────────────────────────
  function drawHUD(ctx, p) {
    box(ctx, 8, 8, 180, 92);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(p.name + "  Lv." + p.level, 20, 28);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#ff9a9a";
    ctx.fillText("HP " + p.hp + "/" + p.maxHp, 20, 46);
    bar(ctx, 90, 38, 88, 9, p.hp / p.maxHp, "#e04a4a");
    ctx.fillStyle = "#9ab4ff";
    ctx.fillText("MP " + p.mp + "/" + p.maxMp, 20, 62);
    bar(ctx, 90, 54, 88, 9, p.mp / p.maxMp, "#4a7ae0");
    ctx.fillStyle = "#ffe08a";
    ctx.fillText("EXP " + p.exp + "/" + p.nextExp, 20, 78);
    bar(ctx, 90, 70, 88, 9, p.exp / p.nextExp, "#e0c04a");
    ctx.fillStyle = "#ffd86b";
    ctx.fillText("골드 " + p.gold + " G", 20, 94);
  }

  // ── 전투 화면 ─────────────────────────────────────────────
  function drawBattle(ctx, b, p) {
    // 배경
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#241d33");
    grad.addColorStop(1, "#120f1c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 적 (피격 흔들림 연출)
    var sx = b.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
    var ex = W / 2 + sx, ey = 150;
    var size = b.enemy.boss ? 70 : 46;
    ctx.fillStyle = b.flash > 0 ? "#ffffff" : b.enemy.color;
    if (b.enemy.boss) {
      // 보스: 큰 마름모
      ctx.beginPath();
      ctx.moveTo(ex, ey - size);
      ctx.lineTo(ex + size, ey);
      ctx.lineTo(ex, ey + size);
      ctx.lineTo(ex - size, ey);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffe06b";
      ctx.fillRect(ex - 26, ey - 14, 12, 12);
      ctx.fillRect(ex + 14, ey - 14, 12, 12);
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(ex - 18, ey - 8, 8, 10);
      ctx.fillRect(ex + 10, ey - 8, 8, 10);
    }

    // 적 이름 + HP 바
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.enemy.name, ex, ey - size - 18);
    bar(ctx, ex - 70, ey - size - 12, 140, 8, b.enemy.hp / b.enemy.maxHp, "#e04a4a");

    // 플레이어 정보 (좌하단)
    box(ctx, 8, 300, 220, 96);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(p.name + "  Lv." + p.level, 22, 324);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#ff9a9a";
    ctx.fillText("HP " + p.hp + "/" + p.maxHp, 22, 348);
    bar(ctx, 110, 339, 108, 10, p.hp / p.maxHp, "#e04a4a");
    ctx.fillStyle = "#9ab4ff";
    ctx.fillText("MP " + p.mp + "/" + p.maxMp, 22, 372);
    bar(ctx, 110, 363, 108, 10, p.mp / p.maxMp, "#4a7ae0");

    // 메시지/메뉴 창 (하단)
    box(ctx, 8, 404, W - 16, 68);
    ctx.textAlign = "left";

    if (b.phase === Battle.PHASE.MSG) {
      ctx.fillStyle = "#fff";
      ctx.font = "15px sans-serif";
      wrap(ctx, b.log, 26, 432, W - 60, 20);
      ctx.fillStyle = "#9a9ab5";
      ctx.font = "11px sans-serif";
      ctx.fillText("[스페이스] 계속", W - 110, 462);
    } else {
      // 좌측: 안내 문구
      ctx.fillStyle = "#cfcfe6";
      ctx.font = "14px sans-serif";
      ctx.fillText(b.log || "무엇을 할까?", 26, 432);
      // 우측: 메뉴 목록
      drawBattleMenu(ctx, b, p);
    }
  }

  function drawBattleMenu(ctx, b, p) {
    var items, x = 360, y = 420, getLabel;
    if (b.phase === Battle.PHASE.COMMAND) {
      items = Battle.COMMANDS;
      getLabel = function (it) { return it; };
    } else if (b.phase === Battle.PHASE.SKILL) {
      items = b.skillList;
      getLabel = function (id) {
        var s = GameData.skills[id];
        return s.name + " (MP " + s.mp + ")";
      };
    } else if (b.phase === Battle.PHASE.ITEM) {
      items = b.itemList;
      getLabel = function (id) {
        var it = GameData.items[id];
        return it.name + " x" + (p.inventory[id] || 0);
      };
    } else {
      return;
    }
    ctx.font = "13px sans-serif";
    // 2열 배치
    for (var i = 0; i < items.length; i++) {
      var col = i % 2, row = Math.floor(i / 2);
      var ix = x + col * 130, iy = y + row * 22;
      if (i === b.menuIndex) {
        ctx.fillStyle = "#ffd86b";
        ctx.fillText("▶", ix - 14, iy);
        ctx.fillStyle = "#ffd86b";
      } else {
        ctx.fillStyle = "#e8e8f0";
      }
      ctx.fillText(getLabel(items[i]), ix, iy);
    }
    if (b.phase !== Battle.PHASE.COMMAND) {
      ctx.fillStyle = "#9a9ab5";
      ctx.font = "10px sans-serif";
      ctx.fillText("[X] 뒤로", x, y + 56);
    }
  }

  // ── 대화창 ───────────────────────────────────────────────
  function drawDialogue(ctx, line, npcLabel) {
    box(ctx, 8, 380, W - 16, 92);
    ctx.fillStyle = "#ffd86b";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(npcLabel || "", 26, 404);
    ctx.fillStyle = "#fff";
    ctx.font = "15px sans-serif";
    wrap(ctx, line, 26, 430, W - 60, 22);
    ctx.fillStyle = "#9a9ab5";
    ctx.font = "11px sans-serif";
    ctx.fillText("[스페이스] 계속", W - 110, 462);
  }

  // ── 타이틀 ───────────────────────────────────────────────
  function drawTitle(ctx, blink) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1a2440");
    grad.addColorStop(1, "#0a0e1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd86b";
    ctx.font = "bold 40px serif";
    ctx.fillText("잊혀진 숲의 전설", W / 2, 160);
    ctx.fillStyle = "#9ab4ff";
    ctx.font = "16px sans-serif";
    ctx.fillText("- 턴제 RPG -", W / 2, 196);

    if (blink) {
      ctx.fillStyle = "#fff";
      ctx.font = "20px sans-serif";
      ctx.fillText("스페이스를 눌러 시작", W / 2, 300);
    }

    ctx.fillStyle = "#7a7a95";
    ctx.font = "12px sans-serif";
    ctx.fillText("이동: 방향키 / WASD     확인: 스페이스·Enter     취소: X·Esc", W / 2, 360);
    ctx.fillText("풀숲에서 마수가 나타난다. 강해져서 북쪽 성의 군주를 쓰러뜨려라!", W / 2, 384);
  }

  // ── 게임오버 ─────────────────────────────────────────────
  function drawGameOver(ctx, blink) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e04a4a";
    ctx.font = "bold 44px serif";
    ctx.fillText("GAME OVER", W / 2, 200);
    ctx.fillStyle = "#cfcfe6";
    ctx.font = "16px sans-serif";
    ctx.fillText("용사는 쓰러졌다...", W / 2, 250);
    if (blink) {
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("스페이스를 눌러 다시 시작", W / 2, 320);
    }
  }

  // ── 엔딩 ─────────────────────────────────────────────────
  function drawEnding(ctx, p, blink) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#2a1d33");
    grad.addColorStop(1, "#1a0f1c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd86b";
    ctx.font = "bold 38px serif";
    ctx.fillText("☆ 승리 ☆", W / 2, 140);
    ctx.fillStyle = "#fff";
    ctx.font = "16px sans-serif";
    ctx.fillText("어둠의 군주를 쓰러뜨렸다!", W / 2, 200);
    ctx.fillText("숲에 다시 평화가 찾아왔다.", W / 2, 228);
    ctx.fillStyle = "#9ab4ff";
    ctx.font = "14px sans-serif";
    ctx.fillText("최종 레벨 " + p.level + "  ·  골드 " + p.gold + " G", W / 2, 280);
    ctx.fillStyle = "#cfcfe6";
    ctx.font = "13px sans-serif";
    ctx.fillText("플레이해 주셔서 감사합니다!", W / 2, 320);
    if (blink) {
      ctx.fillStyle = "#fff";
      ctx.font = "15px sans-serif";
      ctx.fillText("스페이스를 눌러 타이틀로", W / 2, 370);
    }
  }

  return {
    drawHUD: drawHUD,
    drawBattle: drawBattle,
    drawDialogue: drawDialogue,
    drawTitle: drawTitle,
    drawGameOver: drawGameOver,
    drawEnding: drawEnding,
  };
})();
