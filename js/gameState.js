// js/gameState.js

/**
 * プレイヤー情報のクラス
 */
export class Player {
  constructor(id, name, realRole, displayRole) {
    this.id = id;
    this.name = name; // [cite: 3] 名前設定
    
    // 役職管理
    this.realRole = realRole;       // 実際の役職ID
    this.displayRole = displayRole; // プレイヤー自身が認識している役職ID（のび太用）[cite: 11]

    // 生存・状態フラグ
    this.isAlive = true;            // 生存フラグ [cite: 10]
    this.isProtected = false;       // しずかに守られているか
    this.isBlocked = false;         // 先生に足止めされているか 
    this.isStone = false;           // ゴルゴンの首に石化されたか [cite: 82]
    
    // 第三者陣営用の特殊変数
    this.haruoTargetId = null;      // 自分が「はる夫」の場合の安雄役のID [cite: 88]
    
    // 行動履歴 (セワシの能力・UI表示用)
    this.actionHistory = [];        // 例: [{turn: 1, targetId: "player_3", action: "protect"}] [cite: 50]
  }
}

/**
 * ゲーム全体のステート管理オブジェクト
 */
export const GameState = {
  phase: "CONFIG",   // 現在のフェーズ: CONFIG, ROLE_CONFIRM, TALK, VOTE, NIGHT_ACTION, NIGHT_RESULT, JUDGE
  turn: 1,           // 現在のターン数
  players: [],       // Playerオブジェクトの配列
  
  // 今夜の行動予約キュー（全員が選択し終えてから一斉処理するため）
  nightActionsQueue: [], // 例: [{actorId: "p1", targetId: "p2", roleId: "GIAN"}]

  config: {
    talkTimeLimit: 300, // デフォルト5分(300秒) [cite: 5]
    isFirstDayVote: false // 初日投票の有無 [cite: 5]
  },

  // IDからプレイヤーオブジェクトを取得するヘルパー関数
  getPlayerById(id) {
    return this.players.find(p => p.id === id);
  }
};