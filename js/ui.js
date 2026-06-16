/* UI 렌더링: HUD, 전투 화면, 대화창, 타이틀/엔딩/게임오버 */
var UI = (function () {
  var W = 640, H = 480;
  var rr = GameMap.roundRect;

  // 게임풍 패널 (그라데이션 + 이중 테두리 + 글로우)
  function panel(ctx, x, y, w, h) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    var g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "rgba(28, 34, 64, 0.96)");
    g.addColorStop(1, "rgba(14, 18, 38, 0.96)");
    ctx.fillStyle = g;
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(140, 165, 255, 0.85)";
    ctx.lineWidth = 2;
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 9);
    ctx.stroke();
    ctx.strokeStyle = "rgba(140, 165, 255, 0.22)";
    rr(ctx, x + 4.5, y + 4.5, w - 9, h - 9, 6);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function bar(ctx, x, y, w, h, ratio, c1, c2) {
    ratio = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    if (ratio > 0) {
      var g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      rr(ctx, x, y, Math.max(h, w * ratio), h, h / 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      rr(ctx, x + 1, y + 1, Math.max(h, w * ratio) - 2, h / 2 - 1, 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, h / 2);
    ctx.stroke();
  }

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
    panel(ctx, 8, 8, 186, 96);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("⚔ " + p.name, 18, 27);
    ctx.fillStyle = "#ffd86b";
    ctx.textAlign = "right";
    ctx.fillText("Lv." + p.level, 184, 27);
    ctx.textAlign = "left";

    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#ffb0b0";
    ctx.fillText("HP", 18, 46);
    bar(ctx, 40, 38, 120, 9, p.hp / p.maxHp, "#ff7a7a", "#c83a3a");
    ctx.fillStyle = "#cfcfe0";
    ctx.textAlign = "right";
    ctx.fillText(p.hp + "/" + p.maxHp, 184, 46);
    ctx.textAlign = "left";

    ctx.fillStyle = "#a8c0ff";
    ctx.fillText("MP", 18, 62);
    bar(ctx, 40, 54, 120, 9, p.mp / p.maxMp, "#7aa8ff", "#3a5ac8");
    ctx.fillStyle = "#cfcfe0";
    ctx.textAlign = "right";
    ctx.fillText(p.mp + "/" + p.maxMp, 184, 62);
    ctx.textAlign = "left";

    ctx.fillStyle = "#ffe08a";
    ctx.fillText("EXP", 18, 78);
    bar(ctx, 40, 70, 120, 9, p.exp / p.nextExp, "#ffe08a", "#c8a83a");

    ctx.fillStyle = "#ffd86b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("💰 " + p.gold + " G", 18, 95);
  }

  // ── 전투 화면 ─────────────────────────────────────────────
  function drawBattle(ctx, b, p, frame) {
    frame = frame || 0;
    // 하늘 배경
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, b.enemy.boss ? "#3a1530" : "#2a2348");
    grad.addColorStop(0.6, "#1a1530");
    grad.addColorStop(1, "#0e0a1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // 바닥 무대
    ctx.fillStyle = "rgba(80,60,110,0.35)";
    ctx.beginPath();
    ctx.ellipse(W / 2, 230, 230, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 적 (피격 흔들림 + 둥실)
    var sx = b.shake > 0 ? (Math.random() - 0.5) * 9 : 0;
    var float = Math.sin(frame / 18) * 5;
    var ex = W / 2 + sx, ey = 150 + float;
    var size = b.enemy.boss ? 64 : 44;
    // 적 그림자
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(W / 2 + sx, 226, size * 0.8, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    if (b.flash > 0) { ctx.shadowColor = "#fff"; ctx.shadowBlur = 25; }
    ctx.fillStyle = b.flash > 0 ? "#ffffff" : b.enemy.color;
    if (b.enemy.boss) {
      ctx.beginPath();
      ctx.moveTo(ex, ey - size);
      ctx.lineTo(ex + size, ey);
      ctx.lineTo(ex, ey + size);
      ctx.lineTo(ex - size, ey);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = b.flash > 0 ? "#fff" : "#ffe06b";
      ctx.beginPath(); ctx.arc(ex - 18, ey - 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 18, ey - 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7a1020";
      ctx.fillRect(ex - 12, ey + 12, 24, 4);
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, size, 0, Math.PI * 2);
      ctx.fill();
      // 하이라이트
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath(); ctx.arc(ex - size * 0.35, ey - size * 0.35, size * 0.4, 0, Math.PI * 2); ctx.fill();
      // 눈
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath(); ctx.arc(ex - 13, ey - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 13, ey - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex - 12, ey - 5, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 14, ey - 5, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 적 이름 + HP 바 패널
    panel(ctx, W / 2 - 96, 28, 192, 44);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((b.enemy.boss ? "👑 " : "") + b.enemy.name, W / 2, 47);
    bar(ctx, W / 2 - 78, 54, 156, 9, b.enemy.hp / b.enemy.maxHp, "#ff7a7a", "#c83a3a");

    // 플레이어 정보
    panel(ctx, 8, 300, 232, 96);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("⚔ " + p.name, 22, 324);
    ctx.fillStyle = "#ffd86b";
    ctx.textAlign = "right";
    ctx.fillText("Lv." + p.level, 228, 324);
    ctx.textAlign = "left";
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#ffb0b0";
    ctx.fillText("HP", 22, 348);
    bar(ctx, 46, 340, 150, 10, p.hp / p.maxHp, "#ff7a7a", "#c83a3a");
    ctx.fillStyle = "#cfcfe0"; ctx.textAlign = "right";
    ctx.fillText(p.hp + "/" + p.maxHp, 228, 348);
    ctx.textAlign = "left";
    ctx.fillStyle = "#a8c0ff";
    ctx.fillText("MP", 22, 372);
    bar(ctx, 46, 364, 150, 10, p.mp / p.maxMp, "#7aa8ff", "#3a5ac8");
    ctx.fillStyle = "#cfcfe0"; ctx.textAlign = "right";
    ctx.fillText(p.mp + "/" + p.maxMp, 228, 372);
    ctx.textAlign = "left";

    // 메시지/메뉴 창
    panel(ctx, 8, 404, W - 16, 68);
    if (b.phase === Battle.PHASE.MSG) {
      ctx.fillStyle = "#fff";
      ctx.font = "15px sans-serif";
      ctx.textAlign = "left";
      wrap(ctx, b.log, 26, 432, W - 60, 20);
      if (Math.floor(frame / 18) % 2 === 0) {
        ctx.fillStyle = "#ffd86b";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("[A] 계속 ▸", W - 24, 462);
      }
    } else {
      ctx.fillStyle = "#cfcfe6";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(b.log || "무엇을 할까?", 26, 434);
      drawBattleMenu(ctx, b, p, frame);
    }
  }

  function drawBattleMenu(ctx, b, p, frame) {
    var items, getLabel;
    if (b.phase === Battle.PHASE.COMMAND) {
      items = Battle.COMMANDS;
      getLabel = function (it) { return it; };
    } else if (b.phase === Battle.PHASE.SKILL) {
      items = b.skillList;
      getLabel = function (id) { var s = GameData.skills[id]; return s.name + " (MP" + s.mp + ")"; };
    } else if (b.phase === Battle.PHASE.ITEM) {
      items = b.itemList;
      getLabel = function (id) { var it = GameData.items[id]; return it.name + " ×" + (p.inventory[id] || 0); };
    } else { return; }

    var x = 348, y = 414, colW = 134, rowH = 26;
    ctx.font = "13px sans-serif";
    for (var i = 0; i < items.length; i++) {
      var col = i % 2, row = Math.floor(i / 2);
      var ix = x + col * colW, iy = y + row * rowH;
      if (i === b.menuIndex) {
        var pulse = 0.5 + 0.3 * Math.sin(frame / 8);
        ctx.fillStyle = "rgba(255, 216, 107, " + (0.15 + pulse * 0.15) + ")";
        rr(ctx, ix - 4, iy - 2, colW - 8, rowH - 6, 5);
        ctx.fill();
        ctx.fillStyle = "#ffd86b";
        ctx.fillText("▸", ix, iy + 13);
        ctx.fillStyle = "#fff36b";
      } else {
        ctx.fillStyle = "#dfe2f0";
      }
      ctx.fillText(getLabel(items[i]), ix + 14, iy + 13);
    }
    if (b.phase !== Battle.PHASE.COMMAND) {
      ctx.fillStyle = "#9aa0c0";
      ctx.font = "10px sans-serif";
      ctx.fillText("[B] 뒤로", x, y + 56);
    }
  }

  // ── 대화창 ───────────────────────────────────────────────
  function drawDialogue(ctx, line, npcLabel) {
    panel(ctx, 8, 372, W - 16, 100);
    if (npcLabel) {
      panel(ctx, 20, 358, 86, 28);
      ctx.fillStyle = "#ffd86b";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(npcLabel, 63, 377);
    }
    ctx.fillStyle = "#fff";
    ctx.font = "15px sans-serif";
    ctx.textAlign = "left";
    wrap(ctx, line, 28, 404, W - 64, 24);
    ctx.fillStyle = "#ffd86b";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("[A] 계속 ▸", W - 26, 460);
  }

  // ── 타이틀 ───────────────────────────────────────────────
  var stars = null;
  function drawTitle(ctx, blink, frame) {
    frame = frame || 0;
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1a1340");
    grad.addColorStop(0.5, "#231a4a");
    grad.addColorStop(1, "#0a0e1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (!stars) {
      stars = [];
      for (var i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: Math.random() * 300, r: Math.random() * 1.6 + 0.4, s: Math.random() * 0.05 + 0.01 });
    }
    for (var j = 0; j < stars.length; j++) {
      var st = stars[j];
      var tw = 0.4 + 0.6 * Math.abs(Math.sin(frame * st.s + j));
      ctx.fillStyle = "rgba(255,255,255," + tw + ")";
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
    }
    // 달
    ctx.fillStyle = "#f3edc8";
    ctx.beginPath(); ctx.arc(520, 80, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#231a4a";
    ctx.beginPath(); ctx.arc(534, 70, 30, 0, Math.PI * 2); ctx.fill();

    // 숲 실루엣
    ctx.fillStyle = "#0d1322";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 40) {
      ctx.lineTo(x, 360 - 18 * Math.sin(x * 0.05));
      ctx.lineTo(x + 20, 360);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // 제목
    ctx.textAlign = "center";
    ctx.save();
    ctx.shadowColor = "rgba(255, 200, 80, 0.7)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#ffd86b";
    ctx.font = "bold 44px serif";
    ctx.fillText("잊혀진 숲의 전설", W / 2, 150);
    ctx.restore();
    ctx.strokeStyle = "rgba(90,60,10,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeText("잊혀진 숲의 전설", W / 2, 150);
    ctx.fillStyle = "#9ab4ff";
    ctx.font = "15px sans-serif";
    ctx.fillText("◆  턴 제  R P G  ◆", W / 2, 182);

    if (blink) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 19px sans-serif";
      ctx.fillText("A 버튼 / 스페이스로 시작", W / 2, 270);
    }
    ctx.fillStyle = "#8a90b5";
    ctx.font = "11px sans-serif";
    ctx.fillText("풀숲에서 마수가 나타난다 — 강해져 북쪽 성의 군주를 쓰러뜨려라!", W / 2, 312);
  }

  // ── 게임오버 ─────────────────────────────────────────────
  function drawGameOver(ctx, blink) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a0808"); g.addColorStop(1, "#000");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.save();
    ctx.shadowColor = "rgba(220,40,40,0.7)"; ctx.shadowBlur = 22;
    ctx.fillStyle = "#e04a4a";
    ctx.font = "bold 50px serif";
    ctx.fillText("GAME OVER", W / 2, 210);
    ctx.restore();
    ctx.fillStyle = "#cfcfe6";
    ctx.font = "16px sans-serif";
    ctx.fillText("용사는 쓰러졌다...", W / 2, 256);
    if (blink) {
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.fillText("A 버튼 / 스페이스로 다시 시작", W / 2, 326);
    }
  }

  // ── 엔딩 ─────────────────────────────────────────────────
  function drawEnding(ctx, p, blink, frame) {
    frame = frame || 0;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1d45"); g.addColorStop(1, "#140d22");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 반짝이는 빛 입자
    for (var i = 0; i < 30; i++) {
      var px = (i * 97 + frame * 0.6) % W;
      var py = (i * 53) % H;
      var a = 0.3 + 0.5 * Math.abs(Math.sin(frame * 0.04 + i));
      ctx.fillStyle = "rgba(255,230,150," + a + ")";
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.textAlign = "center";
    ctx.save();
    ctx.shadowColor = "rgba(255,210,90,0.8)"; ctx.shadowBlur = 26;
    ctx.fillStyle = "#ffd86b";
    ctx.font = "bold 42px serif";
    ctx.fillText("☆  승  리  ☆", W / 2, 130);
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.font = "16px sans-serif";
    ctx.fillText("어둠의 군주를 쓰러뜨렸다!", W / 2, 196);
    ctx.fillText("숲에 다시 평화가 찾아왔다.", W / 2, 224);
    ctx.fillStyle = "#9ab4ff";
    ctx.font = "14px sans-serif";
    ctx.fillText("최종 레벨 " + p.level + "  ·  골드 " + p.gold + " G", W / 2, 276);
    ctx.fillStyle = "#cfcfe6";
    ctx.font = "13px sans-serif";
    ctx.fillText("플레이해 주셔서 감사합니다!", W / 2, 314);
    if (blink) {
      ctx.fillStyle = "#fff";
      ctx.font = "15px sans-serif";
      ctx.fillText("A 버튼 / 스페이스로 타이틀로", W / 2, 366);
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
