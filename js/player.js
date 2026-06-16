/* 플레이어 상태: 스탯, 레벨업, 인벤토리 */
var Player = (function () {
  var state;

  function create() {
    state = {
      name: "용사",
      level: 1,
      exp: 0,
      nextExp: 18,
      maxHp: 72,
      hp: 72,
      maxMp: 24,
      mp: 24,
      atk: 16,
      def: 8,
      spd: 10,
      gold: 0,
      skills: ["bash", "fireball", "heal"],
      inventory: { potion: 5, ether: 2 },
      // 맵 위치 (타일 좌표)
      tx: 4,
      ty: 8,
      bossDefeated: false,
    };
    return state;
  }

  function get() {
    return state;
  }

  // 경험치 획득 → 레벨업 처리. 레벨업 메시지 배열 반환.
  function gainExp(amount) {
    var messages = [];
    state.exp += amount;
    while (state.exp >= state.nextExp) {
      state.exp -= state.nextExp;
      state.level += 1;
      state.nextExp = Math.floor(state.nextExp * 1.5 + 10);
      // 스탯 상승
      state.maxHp += 12;
      state.maxMp += 4;
      state.atk += 3;
      state.def += 2;
      state.spd += 1;
      // 레벨업 시 풀 회복
      state.hp = state.maxHp;
      state.mp = state.maxMp;
      messages.push("레벨 업! 이제 레벨 " + state.level + " 이다! (HP·MP 완전 회복)");
    }
    return messages;
  }

  function fullHeal() {
    state.hp = state.maxHp;
    state.mp = state.maxMp;
  }

  // 아이템 사용. 성공 메시지 또는 null 반환.
  function useItem(itemId) {
    var count = state.inventory[itemId] || 0;
    if (count <= 0) return null;
    var item = GameData.items[itemId];
    if (item.kind === "hp") {
      if (state.hp >= state.maxHp) return null;
      state.hp = Math.min(state.maxHp, state.hp + item.amount);
    } else if (item.kind === "mp") {
      if (state.mp >= state.maxMp) return null;
      state.mp = Math.min(state.maxMp, state.mp + item.amount);
    }
    state.inventory[itemId] = count - 1;
    return state.name + "은(는) " + item.name + "을(를) 사용했다!";
  }

  return {
    create: create,
    get: get,
    gainExp: gainExp,
    fullHeal: fullHeal,
    useItem: useItem,
  };
})();
