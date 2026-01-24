// js/uiManager.js
import { GameState } from './gameState.js';
import { changePhase, registerNightAction } from './main.js';
import { ROLES } from './roles.js';

// HTMLのルート要素を取得 (例: <div id="app"></div>)
const appRoot = document.getElementById('app');

export const UIManager = {

  // --- 1. 能力確認フェーズ (手渡しUI) ---
  renderRoleConfirmPhase() {
    let currentPlayerIndex = 0;

    const renderConfirmScreen = () => {
      const p = GameState.players[currentPlayerIndex];
      [cite_start]// 役職表示前の確認画面 [cite: 8]
      appRoot.innerHTML = `
        <div class="confirm-screen">
          <h2>${p.name} さんですか？</h2>
          <p>今から役職を示します。周りに見えないようにしてください。</p>
          <button id="show-role-btn">確認する</button>
        </div>
      `;

      document.getElementById('show-role-btn').addEventListener('click', () => {
        const displayRoleInfo = ROLES[p.displayRole];
        appRoot.innerHTML = `
          <div class="role-screen">
            <h3>あなたの役職は「${displayRoleInfo.name}」です</h3>
            <p>${displayRoleInfo.description}</p>
            ${currentPlayerIndex < GameState.players.length - 1 
              ? `<button id="next-player-btn">次の人に代わってください</button>`
              : `<button id="start-talk-btn">全員の確認終了(会話ターンへ)</button>`}
          </div>
        `;

        document.getElementById('next-player-btn')?.addEventListener('click', () => {
          currentPlayerIndex++;
          renderConfirmScreen();
        });
        document.getElementById('start-talk-btn')?.addEventListener('click', () => {
          changePhase("TALK");
        });
      });
    };
    renderConfirmScreen();
  },

  // --- 2. 会話ターンフェーズ (タイマーと生存者一覧) ---
  renderTalkPhase(hasKaminari) {
    let timeLeft = GameState.config.talkTimeLimit;
    
    const kaminariWarning = hasKaminari ? `<p class="alert">⚠️ この中に神成さんがいる...</p>` : ""; [cite_start]// [cite: 91]

    appRoot.innerHTML = `
      <div class="talk-screen">
        <h2>会話ターン (Day ${GameState.turn})</h2>
        ${kaminariWarning}
        <div id="timer" style="font-size: 2em;">${formatTime(timeLeft)}</div>
        <button id="add-min-btn">+1分</button>
        
        <h3>生存者</h3>
        <ul id="alive-list">
          ${GameState.players.filter(p => p.isAlive).map(p => `<li>${p.name}</li>`).join('')}
        </ul>
        <h3>気絶者</h3>
        <ul id="dead-list">
          ${GameState.players.filter(p => !p.isAlive).map(p => `<li>${p.name}</li>`).join('')}
        </ul>

        <button id="end-talk-btn">投票/能力ターンへ</button>
      </div>
    `;

    // タイマー処理
    const timerInterval = setInterval(() => {
      timeLeft--;
      document.getElementById('timer').innerText = formatTime(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        [cite_start]playAlarmSound(); // [cite: 11] アラーム音再生
      }
    }, 1000);

    document.getElementById('add-min-btn').addEventListener('click', () => { timeLeft += 60; });
    document.getElementById('end-talk-btn').addEventListener('click', () => {
      clearInterval(timerInterval);
      if (GameState.turn === 1 && !GameState.config.isFirstDayVote) {
        [cite_start]changePhase("NIGHT_ACTION"); // 初日投票なしなら能力ターンへ [cite: 11]
      } else {
        changePhase("VOTE");
      }
    });
  },

  // --- 3. 能力ターン (一人ずつアクション入力) ---
  renderNightActionPhase() {
    const alivePlayers = GameState.players.filter(p => p.isAlive);
    let currentIndex = 0;

    const renderActionScreen = () => {
      const p = alivePlayers[currentIndex];
      const roleData = ROLES[p.displayRole];

      appRoot.innerHTML = `
        <div class="action-screen">
          <h2>${p.name} の能力ターン</h2>
          <p>あなたの役職: ${roleData.name}</p>
          <p>能力の対象を選んでください:</p>
          <select id="target-select">
            ${GameState.players.map(target => `<option value="${target.id}">${target.name}</option>`).join('')}
          </select>
          <button id="action-btn">決定</button>
        </div>
      `;

      document.getElementById('action-btn').addEventListener('click', () => {
        const targetId = document.getElementById('target-select').value;
        // アクションをキューに追加
        GameState.nightActionsQueue.push({ actorId: p.id, targetId: targetId, roleId: p.realRole });

        currentIndex++;
        if (currentIndex < alivePlayers.length) {
          renderActionScreen(); // 次の人の画面へ
        } else {
          changePhase("NIGHT_RESULT"); // 全員終わったら結果表示へ
        }
      });
    };
    renderActionScreen();
  },

  // --- 4. 判定フェーズ (リザルト表示) ---
  renderJudgeScreen(winner) {
    let resultMessage = "ゲーム続行";
    if (winner === "WOLF") resultMessage = "人狼 WIN";
    if (winner === "VILLAGER") resultMessage = "村人 WIN";
    if (winner === "THIRD_HARUO") resultMessage = "第三者(はる夫) WIN";

    appRoot.innerHTML = `
      <div class="judge-screen">
        <h1>${resultMessage}</h1>
        <h3>全プレイヤーの正体</h3>
        <ul>
          ${GameState.players.map(p => {
            [cite_start]// のび太やコピーロボットの履歴表示 [cite: 21]
            let roleText = ROLES[p.realRole].name;
            if (p.realRole !== p.displayRole) roleText += ` (表示: ${ROLES[p.displayRole].name})`;
            return `<li>${p.name}: ${roleText} - ${p.isAlive ? "生存" : "気絶"}</li>`;
          }).join('')}
        </ul>
        <button id="retry-btn">リトライ</button>
      </div>
    `;

    document.getElementById('retry-btn').addEventListener('click', () => changePhase("CONFIG"));
  }
};

// ヘルパー関数
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
function playAlarmSound() { /* Web Audio API等で音を鳴らす */ }