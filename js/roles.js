// js/roles.js
import { GameState } from './gameState.js';

export const ROLES = {

  // ==========================
  // 人狼陣営
  // ==========================
  GIAN: {
    id: "GIAN",
    camp: "WOLF",
    name: "ジャイアン",
    description: "人狼。村人に紛れて悪さをする。", [cite: 27]
    priority: 30, // 襲撃フェーズ
    action: (actor, target) => {
      // ジャイ子の返り討ち判定 [cite: 45]
      if (target.realRole === "JAIKO") {
        actor.isAlive = false; 
        return { success: true, message: "人狼の攻撃をうけました" };
      }
      if (!target.isProtected) {
        target.isAlive = false;
        return { success: true, message: "襲撃成功" };
      }
      return { success: false, message: "守られていた" };
    }
  },

  MECHA_GIAN: {
    id: "MECHA_GIAN",
    camp: "WOLF",
    name: "メカジャイアン",
    description: "人狼。ジャイアンを倒すために作られたロボットだったが、意気投合。", [cite: 30]
    priority: 30, // 選択した能力に応じてmain.jsで動的に変動させる想定
    action: (actor, target, gameState, extraParams) => {
      // extraParams.actionType: "ATTACK" or "VILLAGE_SKILL" 
      if (extraParams.actionType === "ATTACK") {
        return ROLES.GIAN.action(actor, target); // ジャイアンと同じ襲撃処理
      } else if (extraParams.actionType === "VILLAGE_SKILL") {
        // 現在のゲームに存在する本物の村人能力を行使 
        const villageRole = ROLES[extraParams.selectedVillageRoleId];
        return villageRole.action(actor, target, gameState);
      }
    }
  },

  SUNEO: {
    id: "SUNEO",
    camp: "WOLF",
    name: "スネ夫",
    description: "村人。人狼側についており、裏で暗躍する。しかし人狼はそれを知ることはない。不憫。", [cite: 33]
    priority: 90, // 能力ターンにやることはない [cite: 32]
    action: () => { return { success: true, message: "行動なし" }; }
  },

  // ==========================
  // 村人陣営
  // ==========================
  DORAEMON: {
    id: "DORAEMON",
    camp: "VILLAGER",
    name: "ドラえもん",
    description: "村人。町の平和を守るため、することレンズでその人を見通す。", [cite: 37]
    priority: 60, // 襲撃判定後に行う
    action: (actor, target) => {
      // 人狼陣営かつスネ夫以外なら「黒」[cite: 36]
      const isWolf = (ROLES[target.realRole].camp === "WOLF" && target.realRole !== "SUNEO");
      return { success: true, message: isWolf ? "黒" : "白" };
    }
  },

  SHIZUKA: {
    id: "SHIZUKA",
    camp: "VILLAGER",
    name: "しずか",
    description: "村人。町の平和を守るため、人狼に襲撃されたけが人を治す。", [cite: 40]
    priority: 20, // 襲撃より先
    action: (actor, target) => {
      target.isProtected = true;
      return { success: true, message: "守護セット完了" }; 
    }
  },

  DORAMI: {
    id: "DORAMI",
    camp: "VILLAGER",
    name: "ドラミ",
    description: "村人。町の平和を守るため、テレバしいで今までに気絶してしまった人の役職を知る。", [cite: 43]
    priority: 60, // 占いと同じタイミング
    action: (actor, target) => {
      // ゴルゴンの首による気絶者は「不明」
      if (target.isStone) return { success: true, message: "不明" };
      return { success: true, message: target.realRole }; // 正確な役職が判明 [cite: 42]
    }
  },

  JAIKO: {
    id: "JAIKO",
    camp: "VILLAGER",
    name: "ジャイ子",
    description: "村人。能力ターンにする行動はない。", [cite: 46]
    priority: 90, // パッシブ能力なので行動順は最後 [cite: 45]
    action: () => { return { success: true, message: "行動なし" }; }
  },

  SEWASHI: {
    id: "SEWASHI",
    camp: "VILLAGER",
    name: "セワシ",
    description: "村人。町の平和を守るため、前の日にどんな行動をしていたのかタイムマシンで確認する。", [cite: 62]
    priority: 70, // 全員の行動が確定した後に参照する
    action: (actor, target, gameState) => {
      // ターゲットがこのターンに誰に行動したかを取得 
      const targetAction = target.actionHistory.find(h => h.turn === gameState.turn);
      if (target.isBlocked) {
        return { success: true, message: "×" }; // 先生の妨害を受けた場合 [cite: 61]
      }
      return { success: true, message: targetAction ? targetAction.targetId : "行動なし" };
    }
  },

  SENSEI: {
    id: "SENSEI",
    camp: "VILLAGER",
    name: "先生",
    description: "村人。家庭訪問のため、人狼村人問わず対象者をその日の行動を足止めする。", [cite: 65]
    priority: 10, // 最速発動 
    action: (actor, target) => {
      target.isBlocked = true;
      return { success: true, message: "家庭訪問成功" };
    }
  },

  NOBITA: {
    id: "NOBITA",
    camp: "VILLAGER",
    name: "のび太",
    description: "村人。自分が何かしらの役職を持っていると思いこんでいるが、能力の使用結果はでたらめ。", [cite: 76]
    priority: 99, 
    action: (actor, target) => {
      // 実際の効果はなし。結果表示UI側でランダムな値を返す処理を行う [cite: 67]
      return { success: true, message: "ランダムな偽の結果" };
    }
  },

  // ==========================
  // 第三者陣営
  // ==========================
  DEKISUGI: {
    id: "DEKISUGI",
    camp: "THIRD",
    name: "出木杉",
    description: "第三者。対象者の役職を予想して推理することができる。", [cite: 80]
    priority: 40, // 襲撃フェーズの後
    action: (actor, target, gameState, extraParams) => {
      // extraParams.guessedRole: プレイヤーが推理した役職ID
      if (!extraParams || !extraParams.guessedRole) return { success: true, message: "推理しない" }; [cite: 79]

      if (target.realRole === extraParams.guessedRole) {
        target.isAlive = false; // 推理的中、相手気絶 
        return { success: true, message: "推理的中" };
      } else {
        actor.isAlive = false; // 推理失敗、自身気絶 
        return { success: true, message: "推理失敗(自身気絶)" };
      }
    }
  },

  GORGON: {
    id: "GORGON",
    camp: "THIRD",
    name: "ゴルゴンの首",
    description: "第三者。自由に動き、人一人を石化する。", [cite: 83]
    priority: 30, // 襲撃フェーズと同等
    action: (actor, target) => {
      // しずかだと思い込んでいるのび太だけ防げる特殊処理 
      if (target.realRole === "NOBITA" && target.displayRole === "SHIZUKA") {
        return { success: false, message: "のび太に防がれた" };
      }
      target.isAlive = false;
      target.isStone = true; // ドラミの霊媒妨害用フラグ 
      return { success: true, message: "石化成功" };
    }
  },

  COPY_ROBOT: {
    id: "COPY_ROBOT",
    camp: "THIRD",
    name: "コピーロボット",
    description: "第三者。一度だけ対象者を気絶させ、役職をコピーする。", [cite: 86]
    priority: 25, // 襲撃より先
    action: (actor, target) => {
      if (!target.isProtected) {
        target.isAlive = false;
        // 役職、陣営、のび太の勘違いも全てコピー 
        actor.realRole = target.realRole;
        actor.displayRole = target.displayRole;
        actor.camp = ROLES[target.realRole].camp;
        return { success: true, message: "コピー成功" };
      }
      return { success: false, message: "コピー失敗(守護)" };
    }
  },

  HARUO: {
    id: "HARUO",
    camp: "THIRD",
    name: "はる夫",
    description: "第三者。誰か一人を「安雄」に登録する。", [cite: 89]
    priority: 50, 
    action: (actor, target) => {
      actor.haruoTargetId = target.id; // ターゲットを安雄として登録 [cite: 88]
      return { success: true, message: "安雄登録完了" };
    }
  },

  KAMINARI: {
    id: "KAMINARI",
    camp: "THIRD",
    name: "神成さん",
    description: "第三者。ランダムで生存している自分以外のプレイヤーを1人ずつ叱りつけて気絶させる。", [cite: 92]
    priority: 0, // 最速のオート能力
    action: (actor, targets) => {
      // targets: 生存者リスト(自身を除く)。main.js側でランダムな1人を渡す想定 
      const victim = targets[Math.floor(Math.random() * targets.length)];
      victim.isAlive = false; // 先生の妨害無効 
      return { success: true, message: `${victim.name}を気絶させた` };
    }
  }
};