/* 게임 데이터: 스킬, 아이템, 몬스터, NPC 대사 (전역 네임스페이스) */
var GameData = (function () {
  // ── 스킬 정의 ─────────────────────────────────────────────
  // type: 'physical' | 'magic' | 'heal'
  var skills = {
    bash: { id: "bash", name: "강타", mp: 3, type: "physical", power: 1.6, desc: "강하게 내려친다." },
    fireball: { id: "fireball", name: "화염구", mp: 6, type: "magic", power: 2.2, desc: "불덩이를 날린다." },
    heal: { id: "heal", name: "회복", mp: 5, type: "heal", power: 28, desc: "HP를 회복한다." },
  };

  // ── 아이템 정의 ───────────────────────────────────────────
  var items = {
    potion: { id: "potion", name: "포션", kind: "hp", amount: 40, desc: "HP를 40 회복한다." },
    ether: { id: "ether", name: "에테르", kind: "mp", amount: 20, desc: "MP를 20 회복한다." },
  };

  // ── 몬스터 정의 ───────────────────────────────────────────
  // color는 캔버스 도형 색상. boss=true면 보스.
  var monsters = {
    slime: {
      id: "slime", name: "슬라임", color: "#56c46a",
      maxHp: 26, atk: 8, def: 3, spd: 6, exp: 8, gold: 5,
      skills: [],
    },
    bat: {
      id: "bat", name: "동굴박쥐", color: "#8a6bd1",
      maxHp: 32, atk: 11, def: 4, spd: 12, exp: 12, gold: 8,
      skills: [],
    },
    wolf: {
      id: "wolf", name: "들개늑대", color: "#b06a3a",
      maxHp: 48, atk: 15, def: 7, spd: 10, exp: 20, gold: 14,
      skills: ["bash"],
    },
    golem: {
      id: "golem", name: "돌골렘", color: "#7a7a86",
      maxHp: 74, atk: 16, def: 11, spd: 4, exp: 35, gold: 25,
      skills: ["bash"],
    },
    // 보스
    darklord: {
      id: "darklord", name: "어둠의 군주", color: "#d23a6a",
      maxHp: 180, atk: 22, def: 10, spd: 11, exp: 0, gold: 0, boss: true,
      skills: ["fireball", "bash"],
    },
  };

  // 필드(풀숲)에서 랜덤 조우하는 일반 몬스터 풀 (약한 몬스터 비중 높음)
  var fieldEncounters = ["slime", "slime", "slime", "bat", "bat", "wolf", "wolf", "golem"];

  // ── NPC 대사 ──────────────────────────────────────────────
  var npcDialogues = {
    elder: [
      "촌장: 모험가여, 잘 왔네.",
      "촌장: 북쪽 성에 '어둠의 군주'가 깃든 뒤로 숲이 마수로 가득 찼다네.",
      "촌장: 풀숲(진한 초록)을 밟으면 마수가 나타나니 조심하게.",
      "촌장: 충분히 강해지면 북쪽 붉은 성문으로 가게. 행운을 비네!",
    ],
    healer: [
      "치유사: 다친 곳을 보여주게.",
      "치유사: ……다 나았네! HP와 MP를 모두 회복했어.",
      "치유사: 언제든 다시 들르게나.",
    ],
    merchant: [
      "상인: 어서 오게! 오늘은 특별히 그냥 나눠주지.",
      "상인: 포션과 에테르를 챙겨가게. 보스전에 꼭 필요할 거야!",
    ],
  };

  return {
    skills: skills,
    items: items,
    monsters: monsters,
    fieldEncounters: fieldEncounters,
    npcDialogues: npcDialogues,
  };
})();
