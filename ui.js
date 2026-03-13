// ===== UI RENDERER =====
class GameUI {
  constructor(engine) {
    this.engine = engine;
    this.main = document.getElementById('main-content');
    this.timer = null;
    this.timerSeconds = 0;
    this.alarmPlaying = false;
    this.audioCtx = null;
    this.currentOsc = null;
    this.voteState = {};
    this.abilitySelection = {};
    this.configOpen = { wolf: false, village: false, third: false };
  }

  render(html) { this.main.innerHTML = `<div class="screen">${html}</div>`; }

  // ===== CONFIG SCREEN =====
  renderConfig() {
    const e = this.engine;
    const cfg = e.config;
    let playersHtml = cfg.players.map((p, i) => `
      <div class="player-item alive">
        <span class="player-name">${this.esc(p.name)}</span>
        <button class="delete-btn" onclick="game.removePlayer(${i})" title="削除">✕</button>
      </div>`).join('');

    let totalRoles = 0;
    let wolfCount = 0, villageCount = 0, thirdCount = 0;
    Object.entries(cfg.roleCounts).forEach(([r, c]) => {
      totalRoles += c;
      const side = getRoleSide(r);
      if (side === SIDES.WOLF) wolfCount += c;
      else if (side === SIDES.VILLAGE) villageCount += c;
      else thirdCount += c;
    });
    wolfCount += cfg.randomCounts.wolf || 0;
    villageCount += cfg.randomCounts.village || 0;
    thirdCount += cfg.randomCounts.third || 0;
    totalRoles += (cfg.randomCounts.wolf || 0) + (cfg.randomCounts.village || 0) + (cfg.randomCounts.third || 0);

    const makeRoleRows = (roles, sideKey) => roles.map(rId => {
      const r = ROLES[rId]; const c = cfg.roleCounts[rId] || 0;
      return `<div class="role-row">
        <div class="role-info"><div class="role-name">${r.emoji} ${r.name}</div>
        <div class="role-desc-short">${r.desc}</div></div>
        <div class="role-counter">
          <button onclick="game.adjustRole('${rId}', -1)">−</button>
          <span>${c}</span>
          <button onclick="game.adjustRole('${rId}', 1)">＋</button>
        </div></div>`;
    }).join('') + `
      <div class="random-config">
        <h4>🎲 ランダム枠</h4>
        <div class="role-counter" style="justify-content:center;margin-bottom:8px">
          <button onclick="game.adjustRandom('${sideKey}', -1)">−</button>
          <span>${cfg.randomCounts[sideKey] || 0}</span>
          <button onclick="game.adjustRandom('${sideKey}', 1)">＋</button>
        </div>
        <div class="random-exclude-list">
          ${roles.filter(r => r !== 'nobita').map(rId => {
      const excl = (cfg.randomExclude[sideKey] || []).includes(rId);
      return `<span class="random-exclude-chip ${excl ? 'excluded' : ''}" onclick="game.toggleRandomExclude('${sideKey}','${rId}')">${ROLES[rId].name}</span>`;
    }).join('')}
        </div>
      </div>`;

    this.render(`
      <div class="card"><div class="card-header"><span class="icon">👥</span><h2>プレイヤー登録</h2></div>
        <div id="player-list">${playersHtml}</div>
        <div class="player-add-row">
          <input class="form-input" id="new-player-name" placeholder="名前を入力" maxlength="10"
            onkeydown="if(event.key==='Enter')game.addPlayer()">
          <button class="btn btn-primary btn-sm" onclick="game.addPlayer()">追加</button>
        </div>
      </div>

      <div class="card"><div class="card-header"><span class="icon">🎭</span><h2>役職設定</h2></div>
        <div class="role-section">
          <div class="role-section-header wolf" onclick="game.toggleConfigSection('wolf')">
            <span>👊 人狼陣営</span><span>▼</span>
          </div>
          <div class="role-section-body ${this.configOpen.wolf ? 'open' : ''}">${makeRoleRows(WOLF_ROLES, 'wolf')}</div>
        </div>
        <div class="role-section">
          <div class="role-section-header village" onclick="game.toggleConfigSection('village')">
            <span>🔔 村人陣営</span><span>▼</span>
          </div>
          <div class="role-section-body ${this.configOpen.village ? 'open' : ''}">${makeRoleRows(VILLAGE_ROLES, 'village')}</div>
        </div>
        <div class="role-section">
          <div class="role-section-header third" onclick="game.toggleConfigSection('third')">
            <span>🎓 第三者陣営</span><span>▼</span>
          </div>
          <div class="role-section-body ${this.configOpen.third ? 'open' : ''}">${makeRoleRows(THIRD_ROLES, 'third')}</div>
        </div>
        <div class="config-summary">
          <div class="config-summary-item wolf"><div class="count">${wolfCount}</div><div class="label">人狼</div></div>
          <div class="config-summary-item village"><div class="count">${villageCount}</div><div class="label">村人</div></div>
          <div class="config-summary-item third"><div class="count">${thirdCount}</div><div class="label">第三者</div></div>
          <div class="config-summary-item"><div class="count">${cfg.players.length}</div><div class="label">参加者</div></div>
        </div>
        ${totalRoles !== cfg.players.length ? `<div class="config-error">⚠ 役職数(${totalRoles})と参加者数(${cfg.players.length})が一致しません</div>` : ''}
      </div>

      <div class="card"><div class="card-header"><span class="icon">⚙️</span><h2>ゲーム設定</h2></div>
        <div class="checkbox-group">
          <label class="toggle"><input type="checkbox" ${cfg.firstDayVoting ? 'checked' : ''} onchange="game.toggleFirstDayVoting(this.checked)"><span class="toggle-slider"></span></label>
          <span>初日の投票をアリにする</span>
        </div>
        <div class="form-group">
          <label class="form-label">会話ターンの時間（分）</label>
          <input class="form-input" type="number" min="1" max="30" value="${cfg.discussionMinutes}" onchange="game.setDiscussionTime(this.value)" style="width:100px">
        </div>
      </div>

      <button class="btn btn-primary btn-lg btn-block" onclick="game.startGame()"
        ${totalRoles !== cfg.players.length || cfg.players.length < 3 ? 'disabled' : ''}>
        🎮 Game Start
      </button>
    `);
  }

  // ===== HANDOFF SCREEN =====
  renderHandoff(playerName, message, buttonLabel, callback) {
    this.render(`
      <div class="handoff-container">
        <div class="handoff-icon">📱</div>
        <div class="handoff-name">${this.esc(playerName)}</div>
        <div class="handoff-message">${message}</div>
        <button class="btn btn-primary btn-lg" onclick="${callback}">${buttonLabel}</button>
      </div>`);
  }

  // ===== ROLE REVEAL =====
  renderRoleReveal(player) {
    const role = player.role;
    const displayRole = (role === 'nobita') ? player.nobitaFakeRole : role;
    const displayInfo = ROLES[displayRole] || ROLES[role];
    const sideClass = getRoleBadgeClass(displayRole);
    const isWolf = role === 'gian' || role === 'mecha_gian';
    let partnerHtml = '';
    if (isWolf) {
      const partners = this.engine.getWolfPartners(player.id);
      if (partners.length > 0) {
        partnerHtml = `<div class="partner-info"><h4>🤝 相方</h4>
          ${partners.map(p => `<div>${p.name}（${getRoleName(p.role)}）</div>`).join('')}</div>`;
      }
    }
    let mechaHtml = '';
    if (role === 'mecha_gian' && player.mechaVillageRole) {
      mechaHtml = `<div class="partner-info" style="border-color:rgba(0,200,83,0.3);background:rgba(0,200,83,0.1)">
        <h4>🔧 村人能力</h4><div>${getRoleName(player.mechaVillageRole)}の能力を持っています</div></div>`;
    }

    this.render(`
      <div class="role-reveal-container">
        <div class="role-reveal-card ${sideClass}-role">
          <span class="role-badge ${sideClass}">${getSideLabel(getRoleSide(displayRole))}</span>
          <div class="role-reveal-name">${displayInfo.emoji} ${displayInfo.name}</div>
          <p class="role-reveal-desc">${displayInfo.desc}</p>
          ${partnerHtml}${mechaHtml}
        </div>
        <button class="btn btn-secondary btn-lg mt-24" onclick="game.nextRoleReveal()">確認しました</button>
      </div>`);
  }

  // ===== DISCUSSION SCREEN =====
  renderDiscussion() {
    const e = this.engine;
    const alive = e.getAlivePlayers();
    const isFirstTurn = e.turn === 1;
    const canVote = isFirstTurn ? e.config.firstDayVoting : true;

    let announcements = '';
    // Apply delayed effects (dekisugi from previous turn)
    const delayedKOs = e.applyDelayedEffects();
    // Get newly dead from ability phase
    const lastHistory = e.history.length > 0 ? e.history[e.history.length - 1] : null;
    const newlyDead = lastHistory ? lastHistory.newlyDead : [];
    const allNewlyDead = [...new Set([...newlyDead, ...delayedKOs])];

    if (allNewlyDead.length > 0 && e.turn > 1) {
      const names = allNewlyDead.map(id => e.players[id].name).join('、');
      announcements += `<div class="announcement-box"><div class="announcement-title">💀 前のターンで気絶した人</div>
        <div class="announcement-text">${names}</div></div>`;
    }
    if (e.kaminariExists) {
      const kaminariAlive = e.players.some(p => p.role === 'kaminari' && p.alive);
      if (kaminariAlive) {
        announcements += `<div class="announcement-box warning"><div class="announcement-title">👀 噂</div>
        <div class="announcement-text">この中に神成さんがいる…</div></div>`;
      } else {
        announcements += `<div class="announcement-box info"><div class="announcement-title">👀 噂</div>
        <div class="announcement-text">神成さんはいなくなった…</div></div>`;
      }
    }
    if (isFirstTurn) {
      announcements += `<div class="announcement-box info"><div class="announcement-title">📢 初日</div>
        <div class="announcement-text">${canVote ? '投票ありルールです。' : '初日は議論のみ、投票はありません。'}</div></div>`;
    }

    const rolesList = [];
    Object.entries(e.config.roleCounts).forEach(([rId, count]) => {
      const role = ROLES[rId];
      const countStr = count > 1 ? ` ×${count}` : '';
      rolesList.push(`<span class="role-chip ${getRoleBadgeClass(rId)}">${role.emoji} ${role.name}${countStr}</span>`);
    });
    const randomTotal = (e.config.randomCounts.wolf || 0) + (e.config.randomCounts.village || 0) + (e.config.randomCounts.third || 0);
    if (randomTotal > 0) {
      const countStr = randomTotal > 1 ? ` ×${randomTotal}` : '';
      rolesList.push(`<span class="role-chip village">🎲 ランダム${countStr}</span>`);
    }
    const rolesHtml = rolesList.join('');

    const playerListHtml = e.players.map(p => {
      const statusClass = p.alive ? 'alive' : (p.knockedOutBy === 'vote' ? 'voted-out' : 'dead');
      const statusLabel = p.alive ? '生存' : (p.knockedOutBy === 'vote' ? '追放' : '気絶');
      const statusBadge = p.alive ? 'status-alive' : (p.knockedOutBy === 'vote' ? 'status-voted' : 'status-dead');
      return `<div class="player-item ${statusClass}">
        <span class="player-name">${this.esc(p.name)}</span>
        <span class="player-status ${statusBadge}">${statusLabel}</span></div>`;
    }).join('');

    const totalSeconds = e.config.discussionMinutes * 60;
    this.timerSeconds = totalSeconds;

    this.render(`
      <div class="discussion-header">
        <span class="turn-badge">ターン ${e.turn}</span>
        <h2>${isFirstTurn ? '初日・議論タイム' : '議論タイム'}</h2>
        <div class="timer-display" id="timer-display">${this.formatTime(totalSeconds)}</div>
        <div class="timer-controls">
          <button class="btn btn-secondary btn-sm" onclick="game.addTimerMinute()">+1分</button>
          <button class="btn btn-secondary btn-sm" onclick="game.pauseTimer()" id="pause-btn">⏸ 一時停止</button>
        </div>
      </div>
      ${announcements}
      <div class="card"><div class="card-header"><span class="icon">👥</span><h2>プレイヤー一覧</h2></div>
        ${playerListHtml}</div>
      <div class="card"><div class="card-header"><span class="icon">🎭</span><h2>存在する役職</h2></div>
        <div class="roles-in-game">${rolesHtml}</div></div>
      <div class="flex flex-col gap-8 mt-16">
        ${canVote ? `<button class="btn btn-danger btn-block btn-lg" onclick="game.startVoting()">🗳️ 投票に進む</button>` : ''}
        <button class="btn btn-primary btn-block btn-lg" onclick="game.startAbilityPhase()">🌙 能力ターンへ</button>
      </div>`);
    this.startTimer();
  }

  // ===== VOTING =====
  renderVoting(voters, candidates, isRunoff = false) {
    this.voteState = { voters, candidates, votes: [], currentVoterIdx: 0, isRunoff };
    this.renderVoteHandoff();
  }

  renderVoteHandoff() {
    const vs = this.voteState;
    if (vs.currentVoterIdx >= vs.voters.length) {
      this.processVoteResults();
      return;
    }
    const voter = this.engine.players[vs.voters[vs.currentVoterIdx]];
    this.renderHandoff(voter.name, `${vs.isRunoff ? '決選' : ''}投票の番です。`, '投票する', 'game.showVoteScreen()');
  }

  renderVoteScreen() {
    const vs = this.voteState;
    const voter = this.engine.players[vs.voters[vs.currentVoterIdx]];
    const candidatesHtml = vs.candidates.filter(id => id !== voter.id).map(id => {
      const p = this.engine.players[id];
      return `<div class="vote-option" onclick="game.selectVote(${id})" id="vote-${id}">
        <div class="radio"></div><span class="player-name">${this.esc(p.name)}</span></div>`;
    }).join('');

    this.render(`
      <div class="card"><div class="card-header"><span class="icon">🗳️</span>
        <h2>${this.esc(voter.name)}の投票${vs.isRunoff ? '（決選）' : ''}</h2></div>
        <p class="mb-16" style="color:var(--text-secondary)">追放したい人を選んでください</p>
        ${candidatesHtml}
        <button class="btn btn-danger btn-block mt-16" id="vote-submit-btn" disabled onclick="game.submitVote()">投票する</button>
      </div>`);
  }

  processVoteResults() {
    const vs = this.voteState;
    const result = this.engine.processVotes(vs.votes);
    if (result.tied.length > 1 && !vs.isRunoff) {
      // Runoff
      const aliveTied = result.tied.filter(id => this.engine.players[id].alive);
      const aliveVoters = this.engine.getAlivePlayers().map(p => p.id);
      this.renderVoteResultThenRunoff(result, aliveTied, aliveVoters);
      return;
    }
    this.renderVoteResult(result);
  }

  renderVoteResult(result) {
    const counts = result.counts;
    const maxVotes = Math.max(...Object.values(counts), 1);
    let barsHtml = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, cnt]) => {
      const p = this.engine.players[parseInt(id)];
      const pct = (cnt / maxVotes) * 100;
      return `<div class="vote-result-bar">
        <span class="vote-result-name">${this.esc(p.name)}</span>
        <div class="vote-result-fill"><div class="vote-result-fill-inner" style="width:${pct}%">${cnt}票</div></div>
      </div>`;
    }).join('');

    let eliminatedHtml = '';
    if (result.eliminated != null) {
      const p = this.engine.players[result.eliminated];
      eliminatedHtml = `<div class="announcement-box">
        <div class="announcement-title">🚫 追放: ${this.esc(p.name)}</div></div>`;
    } else if (result.tied.length > 1) {
      eliminatedHtml = `<div class="announcement-box warning">
        <div class="announcement-title">⚖️ 同票</div>
        <div class="announcement-text">追放者なし</div></div>`;
    }

    this.render(`
      <div class="card"><div class="card-header"><span class="icon">📊</span><h2>投票結果</h2></div>
        ${barsHtml}</div>
      ${eliminatedHtml}
      <button class="btn btn-primary btn-block btn-lg mt-16" onclick="game.afterVoting()">次へ進む</button>`);
  }

  renderVoteResultThenRunoff(result, tiedIds, voterIds) {
    const counts = result.counts;
    const maxVotes = Math.max(...Object.values(counts), 1);
    let barsHtml = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, cnt]) => {
      const p = this.engine.players[parseInt(id)];
      const pct = (cnt / maxVotes) * 100;
      return `<div class="vote-result-bar">
        <span class="vote-result-name">${this.esc(p.name)}</span>
        <div class="vote-result-fill"><div class="vote-result-fill-inner" style="width:${pct}%">${cnt}票</div></div>
      </div>`;
    }).join('');

    this.render(`
      <div class="card"><div class="card-header"><span class="icon">📊</span><h2>投票結果</h2></div>
        ${barsHtml}</div>
      <div class="announcement-box warning"><div class="announcement-title">⚖️ 同票のため決選投票へ</div>
        <div class="announcement-text">${tiedIds.map(id => this.engine.players[id].name).join('、')}</div></div>
      <button class="btn btn-danger btn-block btn-lg mt-16"
        onclick="game.startRunoff([${tiedIds}],[${voterIds}])">決選投票へ</button>`);
  }

  // ===== TIMER =====
  startTimer() {
    this.stopTimer();
    this.timerPaused = false;
    this.timer = setInterval(() => {
      if (this.timerPaused) return;
      this.timerSeconds--;
      const el = document.getElementById('timer-display');
      if (el) {
        el.textContent = this.formatTime(Math.max(0, this.timerSeconds));
        if (this.timerSeconds <= 60 && this.timerSeconds > 10) el.className = 'timer-display warning';
        else if (this.timerSeconds <= 10) el.className = 'timer-display danger';
      }
      if (this.timerSeconds <= 0) { this.stopTimer(); this.playAlarm(); }
    }, 1000);
  }

  stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  formatTime(s) {
    const m = Math.floor(Math.abs(s) / 60);
    const sec = Math.abs(s) % 60;
    return `${s < 0 ? '-' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  playAlarm() {
    this.alarmPlaying = true;
    document.getElementById('alarm-overlay').classList.remove('hidden');
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.playBeep();
    } catch (err) { /* no audio support */ }
  }

  playBeep() {
    if (!this.alarmPlaying || !this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain); gain.connect(this.audioCtx.destination);
    osc.frequency.value = 880; gain.gain.value = 0.4;
    osc.start(); osc.stop(this.audioCtx.currentTime + 0.3);
    this.alarmTimeout = setTimeout(() => this.playBeep(), 600);
  }

  stopAlarm() {
    this.alarmPlaying = false;
    document.getElementById('alarm-overlay').classList.add('hidden');
    if (this.alarmTimeout) clearTimeout(this.alarmTimeout);
    if (this.audioCtx) { try { this.audioCtx.close(); } catch (e) { } this.audioCtx = null; }
  }

  // ===== HELPERS =====
  esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
}
