/* 타일맵: 정의, 렌더링, 충돌, 조우 */
var GameMap = (function () {
  var TILE = 32; // 타일 픽셀 크기 (640x480 → 20x15 타일)

  // 맵 레이아웃 (각 행 20글자 x 15행)
  //  # 나무/벽(불가)   . 풀밭(이동가능)   , 풀숲(조우)   ~ 물(불가)
  //  B 보스 성문        E 촌장   H 치유사   M 상인
  var layout = [
    "##########B#########",
    "#..................#",
    "#...,,.......,,....#",
    "#...,,.......,,....#",
    "#..................#",
    "#......,,,,,,......#",
    "#......,,,,,,......#",
    "#..................#",
    "#......~~~~~.......#",
    "#......~~~~~.......#",
    "#..................#",
    "#..................#",
    "#..E.....H.....M...#",
    "#..................#",
    "####################",
  ];

  var rows = layout.length;
  var cols = layout[0].length;

  // NPC 위치 추출
  var npcs = {}; // "x,y" -> npc key
  (function () {
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var ch = layout[y][x];
        if (ch === "E") npcs[x + "," + y] = "elder";
        else if (ch === "H") npcs[x + "," + y] = "healer";
        else if (ch === "M") npcs[x + "," + y] = "merchant";
      }
    }
  })();

  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return "#";
    return layout[y][x];
  }

  function isWalkable(x, y) {
    var t = tileAt(x, y);
    return t === "." || t === ",";
  }

  function interactionAt(x, y) {
    var t = tileAt(x, y);
    if (t === "B") return { type: "boss" };
    if (npcs[x + "," + y]) return { type: "npc", npc: npcs[x + "," + y] };
    return null;
  }

  function isEncounterTile(x, y) {
    return tileAt(x, y) === ",";
  }

  // 타일마다 일정한 의사난수 (텍스처 변주용)
  function hash(x, y) {
    var n = (x * 73856093) ^ (y * 19349663);
    n = (n << 13) ^ n;
    return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── 렌더링 ───────────────────────────────────────────────
  function draw(ctx, player, frame) {
    frame = frame || 0;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var ch = layout[y][x];
        var px = x * TILE;
        var py = y * TILE;
        drawGround(ctx, px, py, x, y);

        if (ch === "#") drawTree(ctx, px, py, x, y);
        else if (ch === ",") drawBush(ctx, px, py, x, y, frame);
        else if (ch === "~") drawWater(ctx, px, py, x, y, frame);
        else if (ch === "B") drawGate(ctx, px, py, frame);
        else if (ch === "E" || ch === "H" || ch === "M") drawNpc(ctx, px, py, ch, frame);
      }
    }
    drawPlayer(ctx, player, frame);
  }

  function drawGround(ctx, px, py, x, y) {
    var base = (x + y) % 2 === 0 ? "#4a8a4a" : "#458444";
    ctx.fillStyle = base;
    ctx.fillRect(px, py, TILE, TILE);
    // 잔디 점 텍스처
    var h = hash(x, y);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(px + (h * 22) | 0, py + (hash(y, x) * 22) | 0, 3, 3);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(px + (hash(x + 1, y) * 24) | 0, py + (hash(x, y + 1) * 24) | 0, 2, 2);
  }

  function drawTree(ctx, px, py, x, y) {
    var cx = px + TILE / 2;
    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, py + TILE - 5, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 기둥
    ctx.fillStyle = "#6a431f";
    ctx.fillRect(cx - 3, py + TILE - 13, 6, 9);
    // 잎 (3겹)
    var leaf = ["#1f4a22", "#2e6a30", "#3f8a40"];
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = leaf[i];
      ctx.beginPath();
      ctx.arc(cx, py + 13 - i * 3, 12 - i * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(cx - 4, py + 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBush(ctx, px, py, x, y, frame) {
    var sway = Math.sin((frame / 20) + (x + y)) * 1.5;
    ctx.strokeStyle = "#1f5a24";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (var i = 0; i < 4; i++) {
      var gx = px + 6 + i * 6;
      ctx.beginPath();
      ctx.moveTo(gx, py + TILE - 4);
      ctx.quadraticCurveTo(gx + sway, py + TILE - 14, gx + sway * 1.6, py + TILE - 22);
      ctx.stroke();
    }
    ctx.strokeStyle = "#2f7a30";
    for (i = 0; i < 3; i++) {
      var gx2 = px + 9 + i * 6;
      ctx.beginPath();
      ctx.moveTo(gx2, py + TILE - 4);
      ctx.quadraticCurveTo(gx2 + sway, py + TILE - 12, gx2 + sway * 1.4, py + TILE - 18);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function drawWater(ctx, px, py, x, y, frame) {
    var grad = ctx.createLinearGradient(px, py, px, py + TILE);
    grad.addColorStop(0, "#3a78c8");
    grad.addColorStop(1, "#2554a0");
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, TILE, TILE);
    // 일렁이는 물결
    var t = frame / 16 + x * 0.6 + y * 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    var o1 = Math.sin(t) * 5;
    ctx.fillRect(px + 5 + o1, py + 9, 10, 2);
    var o2 = Math.cos(t * 1.2) * 5;
    ctx.fillRect(px + 13 + o2, py + 20, 10, 2);
  }

  function drawGate(ctx, px, py, frame) {
    // 어두운 입구
    ctx.fillStyle = "#241525";
    ctx.fillRect(px, py, TILE, TILE);
    // 성벽 기둥
    ctx.fillStyle = "#5a4a66";
    ctx.fillRect(px + 1, py + 2, 5, TILE - 2);
    ctx.fillRect(px + TILE - 6, py + 2, 5, TILE - 2);
    // 아치 문
    ctx.fillStyle = "#160c18";
    roundRect(ctx, px + 7, py + 6, TILE - 14, TILE - 6, 7);
    ctx.fill();
    // 맥동하는 사악한 기운
    var pulse = 0.4 + 0.3 * Math.sin(frame / 12);
    ctx.fillStyle = "rgba(220,60,110," + pulse + ")";
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2 + 3, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNpc(ctx, px, py, ch, frame) {
    var cx = px + TILE / 2;
    var bob = Math.sin(frame / 22 + px) * 1.2;
    var color = ch === "E" ? "#e6c84a" : ch === "H" ? "#4ad8c6" : "#e6884a";
    var label = ch === "E" ? "촌장" : ch === "H" ? "치유" : "상인";
    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, py + TILE - 4, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 몸통(로브)
    ctx.fillStyle = color;
    roundRect(ctx, px + 8, py + 12 + bob, 16, 16, 5);
    ctx.fill();
    // 머리
    ctx.fillStyle = "#f3ddb8";
    ctx.beginPath();
    ctx.arc(cx, py + 9 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    // 느낌표 (말 걸 수 있음 표시)
    ctx.fillStyle = "#fff36b";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", cx + 11, py + 8 + bob);
    // 이름표
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRect(ctx, px + 4, py + TILE - 11, TILE - 8, 11, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "9px sans-serif";
    ctx.fillText(label, cx, py + TILE - 2.5);
  }

  function drawPlayer(ctx, player, frame) {
    var px = player.tx * TILE;
    var py = player.ty * TILE;
    var cx = px + TILE / 2;
    var bob = Math.sin(frame / 10) * 1.3;
    // 그림자
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(cx, py + TILE - 4, 10, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 망토/몸통
    ctx.fillStyle = "#2f5fd0";
    roundRect(ctx, px + 7, py + 11 + bob, 18, 17, 5);
    ctx.fill();
    ctx.fillStyle = "#4a7af0";
    ctx.fillRect(px + 7, py + 11 + bob, 18, 5);
    // 머리
    ctx.fillStyle = "#f3ddb8";
    ctx.beginPath();
    ctx.arc(cx, py + 8 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    // 머리카락
    ctx.fillStyle = "#5a3a1a";
    ctx.beginPath();
    ctx.arc(cx, py + 6 + bob, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    // 검
    ctx.strokeStyle = "#dfe6ee";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 26 + bob);
    ctx.lineTo(px + 28, py + 9 + bob);
    ctx.stroke();
    ctx.strokeStyle = "#caa14a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 22, py + 22 + bob);
    ctx.lineTo(px + 26, py + 24 + bob);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  return {
    TILE: TILE,
    cols: cols,
    rows: rows,
    isWalkable: isWalkable,
    interactionAt: interactionAt,
    isEncounterTile: isEncounterTile,
    roundRect: roundRect,
    draw: draw,
  };
})();
