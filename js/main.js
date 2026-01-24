// js/main.js
import { GameState, Player } from './gameState.js';
import { ROLES } from './roles.js';
import { UIManager } from './uiManager.js';

// ゲームの初期化と開始
export function startGame(configInputs, playerNames) {
  GameState.turn = 1;
  GameState.nightActionsQueue = [];
  GameState.config.talkTimeLimit = configInputs.talkTimeLimit;
  GameState.config.isFirstDayVote = configInputs.isFirstDayVote;

  // 1. 役職プールの作成 (Configの設定に基づく)
  let rolePool = createRolePool(configInputs);
  rolePool = shuffleArray(rolePool);

  // 2. プレイヤーインスタンスの生成と役職の割り当て
  GameState.players = playerNames.map((name, index) => {
    const roleId = rolePool[index];
    const player = new Player(`p${index + 1}`, name, roleId, roleId);
    return player;
  });

  // 3. のび太の偽役職（displayRole）のランダム設定
  GameState.players.filter(p => p.realRole === "NOBITA").forEach(nobita => {
    const availableFakeRoles = GameState.players
      .filter(p => ROLES[p.realRole].camp === "VILLAGER" && p.realRole !== "NOBITA")
      .map(p => p.realRole);
    // 場に村人がいない場合のフェイルセーフ
    nobita.displayRole = availableFakeRoles.length > 0 
      ? availableFakeRoles[Math.floor(Math.random() * availableFakeRoles.length)]
      : "SHIZUKA"; 
  });

  // 4. ゲーム開始 (能力確認フェーズへ)
  changePhase("ROLE_CONFIRM");
}

// フェーズ移行管理
export function changePhase(newPhase) {
  GameState.phase = newPhase;
  console.log(`Phase changed to: ${newPhase}`);

  switch (newPhase) {
    case "CONFIG":
      UIManager.renderConfigPhase(); // ★これを追加
      break;
    case "ROLE_CONFIRM":
      UIManager.renderRoleConfirmPhase();
      break;
    case "TALK":
      // 神成さんがいる場合のアナウンスチェック
      const hasKaminari = GameState.players.some(p => p.realRole === "KAMINARI" && p.isAlive);
      UIManager.renderTalkPhase(hasKaminari);
      break;
    case "VOTE":
      UIManager.renderVotePhase();
      break;
    case "NIGHT_ACTION":
      UIManager.renderNightActionPhase();
      break;
    case "NIGHT_RESULT":
      resolveNightActions(); // 夜の処理を実行
      UIManager.renderNightResultPhase();
      break;
    case "JUDGE":
      const winner = checkWinConditions();
      UIManager.renderJudgeScreen(winner);
      break;
  }
}

// 夜の行動の解決
function resolveNightActions() {
  const queue = GameState.nightActionsQueue;

  // 0. 神成さんのオート行動 (優先度0)
  GameState.players.filter(p => p.realRole === "KAMINARI" && p.isAlive).forEach(kaminari => {
    const aliveOthers = GameState.players.filter(p => p.isAlive && p.id !== kaminari.id);
    if (aliveOthers.length > 0) ROLES.KAMINARI.action(kaminari, aliveOthers);
  });

  // 1. 先生の足止め (優先度10)
  queue.filter(q => q.roleId === "SENSEI").forEach(q => {
    const actor = GameState.getPlayerById(q.actorId);
    const target = GameState.getPlayerById(q.targetId);
    if (actor.isAlive) ROLES.SENSEI.action(actor, target);
  });

  // 2. 優先度順にアクション実行 (先生に足止めされた者は除外)
  const sortedActions = queue
    .filter(q => {
      const actor = GameState.getPlayerById(q.actorId);
      // のび太は足止めされていてもUI上は行動したように見せるため除外しない
      return actor.isAlive && (!actor.isBlocked || actor.displayRole === "NOBITA");
    })
    .sort((a, b) => ROLES[a.roleId].priority - ROLES[b.roleId].priority);

  sortedActions.forEach(q => {
    const actor = GameState.getPlayerById(q.actorId);
    const target = GameState.getPlayerById(q.targetId);
    const role = ROLES[q.roleId];

    // 本物の能力を実行 (のび太の場合は空撃ちになる)
    const result = role.action(actor, target, GameState, q.extraParams);
    
    actor.actionHistory.push({
      turn: GameState.turn,
      targetId: target.id,
      result: result.message
    });
  });

  // キューのリセットと状態フラグのリセット(守護や足止めなど)
  GameState.nightActionsQueue = [];
  GameState.players.forEach(p => { p.isProtected = false; p.isBlocked = false; });
}

// 判定フェーズ (Judge)
function checkWinConditions() {
  const alives = GameState.players.filter(p => p.isAlive);
  const wolfCount = alives.filter(p => ROLES[p.realRole].camp === "WOLF" && p.realRole !== "SUNEO").length;
  const villagerCount = alives.length - wolfCount;

  // 第三者の特殊勝利判定 (はる夫)
  const haruo = GameState.players.find(p => p.realRole === "HARUO");
  if (haruo) {
    const yasuo = GameState.getPlayerById(haruo.haruoTargetId);
    if (yasuo && yasuo.isAlive) return "THIRD_HARUO"; // 安雄が生存していれば勝利
  }

  // 人狼の勝利条件: 人狼の人数 >= 村人の人数
  if (wolfCount >= villagerCount) return "WOLF";

  // 村人の勝利条件: 人狼生存0
  if (wolfCount === 0) return "VILLAGER";

  return null; // ゲーム続行
}

// 配列シャッフル・役職プール生成用のユーティリティ関数は省略(適宜実装)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function createRolePool(config) { 
  // Config画面の入力から役職IDの配列を作成（まずは仮で4人分の役職を入れる）
  return ["GIAN", "SHIZUKA", "DORAEMON", "NOBITA"]; 
}
