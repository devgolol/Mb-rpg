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

  // 이동 가능 여부 (벽/물/나무/NPC/성문은 막힘 → 별도 상호작용 처리)
  function isWalkable(x, y) {
    var t = tileAt(x, y);
    return t === "." || t === ",";
  }

  // 해당 좌표에서 발생하는 상호작용 종류 반환
  function interactionAt(x, y) {
    var t = tileAt(x, y);
    if (t === "B") return { type: "boss" };
    if (npcs[x + "," + y]) return { type: "npc", npc: npcs[x + "," + y] };
    return null;
  }

  function isEncounterTile(x, y) {
    return tileAt(x, y) === ",";
  }

  // ── 렌더링 ───────────────────────────────────────────────
  function draw(ctx, player) {
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var ch = layout[y][x];
        var px = x * TILE;
        var py = y * TILE;
        // 바닥 기본
        ctx.fillStyle = "#3a6b3a";
        ctx.fillRect(px, py, TILE, TILE);

        if (ch === "#") {
          // 나무
          ctx.fillStyle = "#1f3a1f";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "#2e5d2e";
          ctx.beginPath();
          ctx.arc(px + TILE / 2, py + TILE / 2 - 2, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#5a3a1a";
          ctx.fillRect(px + TILE / 2 - 2, py + TILE - 10, 4, 8);
        } else if (ch === ",") {
          // 풀숲
          ctx.fillStyle = "#2c552c";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = "#1f3f1f";
          ctx.lineWidth = 2;
          for (var i = 0; i < 3; i++) {
            var gx = px + 8 + i * 8;
            ctx.beginPath();
            ctx.moveTo(gx, py + TILE - 4);
            ctx.lineTo(gx, py + TILE - 16);
            ctx.stroke();
          }
        } else if (ch === "~") {
          // 물
          ctx.fillStyle = "#2a5fb0";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(px + 4, py + 8, 12, 3);
          ctx.fillRect(px + 14, py + 20, 12, 3);
        } else if (ch === "B") {
          // 보스 성문
          ctx.fillStyle = "#3a2530";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "#c0303a";
          ctx.fillRect(px + 6, py + 4, TILE - 12, TILE - 6);
          ctx.fillStyle = "#7a1820";
          ctx.fillRect(px + TILE / 2 - 2, py + 8, 4, TILE - 12);
        } else if (ch === "E" || ch === "H" || ch === "M") {
          drawNpc(ctx, px, py, ch);
        }
      }
    }
    drawPlayer(ctx, player);
  }

  function drawNpc(ctx, px, py, ch) {
    var color = ch === "E" ? "#d8c64a" : ch === "H" ? "#4ad8c6" : "#d87a4a";
    // 몸통
    ctx.fillStyle = color;
    ctx.fillRect(px + 8, py + 12, 16, 16);
    // 머리
    ctx.fillStyle = "#f0d8b0";
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + 9, 6, 0, Math.PI * 2);
    ctx.fill();
    // 라벨
    ctx.fillStyle = "#fff";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    var label = ch === "E" ? "촌장" : ch === "H" ? "치유" : "상인";
    ctx.fillText(label, px + TILE / 2, py + TILE - 1);
  }

  function drawPlayer(ctx, player) {
    var px = player.tx * TILE;
    var py = player.ty * TILE;
    // 몸통
    ctx.fillStyle = "#3a6bd8";
    ctx.fillRect(px + 7, py + 11, 18, 17);
    // 머리
    ctx.fillStyle = "#f0d8b0";
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + 8, 6, 0, Math.PI * 2);
    ctx.fill();
    // 칼
    ctx.fillStyle = "#dddddd";
    ctx.fillRect(px + 24, py + 8, 3, 16);
  }

  return {
    TILE: TILE,
    cols: cols,
    rows: rows,
    isWalkable: isWalkable,
    interactionAt: interactionAt,
    isEncounterTile: isEncounterTile,
    draw: draw,
  };
})();
