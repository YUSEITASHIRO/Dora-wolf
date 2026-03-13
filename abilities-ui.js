// ===== ABILITY UI & RESULTS =====

// Extend GameUI with ability-related rendering
GameUI.prototype.renderAbilityUse = function (player) {
  const e = this.engine;
  const role = player.role;
  const abilityRole = e.getAbilityRole(player);
  const displayRole = (role === 'nobita') ? player.nobitaFakeRole : (role === 'copy_robot' && player.hasCopied ? player.copiedOriginalRole : role);
  const displayInfo = ROLES[displayRole] || ROLES[role];
  const isNobita = role === 'nobita' || (role === 'copy_robot' && player.copiedOriginalRole === 'nobita');

  // Wolf partner info
  let partnerHtml = '';
  if (role === 'gian' || role === 'mecha_gian') {
    const partners = e.getWolfPartners(player.id);
    if (partners.length > 0) {
      partnerHtml = `<div class="partner-info"><h4>🤝 相方</h4>
        ${partners.map(p => `<div>${p.name}（${getRoleName(p.role)}）${p.alive ? '' : ' 💀'}</div>`).join('')}</div>`;
    }
  }

  // Ability history
  let historyHtml = '';
  if (player.abilityHistory.length > 0) {
    historyHtml = `<div class="ability-history"><h4>📜 過去の行動履歴</h4>
      ${player.abilityHistory.map(h => `<div class="history-entry">ターン${h.turn}: ${h.summary}</div>`).join('')}
    </div>`;
  }

  let abilityContent = '';
  this.abilitySelection = { targetId: null, guessedRole: null, action: null };

  switch (abilityRole) {
    case 'gian': {
      // Attack target selection
      const targets = e.getAlivePlayers().filter(p => p.id !== player.id);
      abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">殴って気絶させる相手を選んでください</p>
        <ul class="ability-target-list">${targets.map(t =>
        `<li class="ability-target" onclick="game.selectAbilityTarget(${t.id})" id="atgt-${t.id}">
            <span class="player-name">${this.esc(t.name)}</span></li>`).join('')}</ul>`;
      break;
    }
    case 'doraemon': {
      const targets = e.getAlivePlayersExcept(player.id);
      abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">占う対象を選んでください</p>
        <ul class="ability-target-list">${targets.map(t => {
        const prev = player.abilityHistory.find(h => h.targetId === t.id);
        const badge = prev ? ` <span class="role-badge ${prev.result === '黒' ? 'wolf' : 'village'}">${prev.result}</span>` : '';
        return `<li class="ability-target" onclick="game.selectAbilityTarget(${t.id})" id="atgt-${t.id}">
            <span class="player-name">${this.esc(t.name)}${badge}</span></li>`;
      }).join('')}</ul>`;
      break;
    }
    case 'shizuka': {
      const targets = e.getAlivePlayersExcept(player.id).filter(t => t.id !== player.protectedLast);
      const cantGuard = player.protectedLast != null ? e.players[player.protectedLast] : null;
      abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">守る対象を選んでください${cantGuard ? `（${cantGuard.name}は連続不可）` : ''}。自身も不可。</p>
        <ul class="ability-target-list">${e.getAlivePlayersExcept(player.id).map(t => {
        const disabled = t.id === player.protectedLast;
        const prev = player.abilityHistory.filter(h => h.targetId === t.id);
        const badges = prev.map(h => `<span style="font-size:0.7rem;color:var(--text-muted)">T${h.turn}:${h.result}</span>`).join(' ');
        return `<li class="ability-target ${disabled ? 'disabled' : ''}" ${disabled ? '' : `onclick="game.selectAbilityTarget(${t.id})"`} id="atgt-${t.id}">
            <span class="player-name">${this.esc(t.name)} ${badges}</span></li>`;
      }).join('')}</ul>`;
      break;
    }
    case 'dorami': {
      const dead = e.getDeadPlayers();
      if (dead.length === 0) {
        abilityContent = `<p style="color:var(--text-secondary)">まだ気絶した人はいません。</p>
        <button class="btn btn-secondary btn-sm btn-block mt-12" onclick="game.selectAbilitySkip()">次へ進む</button>`;
      } else {
        abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">霊視する対象を選んでください</p>
          <ul class="ability-target-list">${dead.map(t => {
          const prev = player.abilityHistory.find(h => h.targetId === t.id);
          const badge = prev ? ` <span class="role-badge village">${prev.result}</span>` : '';
          return `<li class="ability-target" onclick="game.selectAbilityTarget(${t.id})" id="atgt-${t.id}">
              <span class="player-name">${this.esc(t.name)}${badge}</span></li>`;
        }).join('')}</ul>`;
      }
      break;
    }
    case 'sewashi': {
      const targets = e.getAlivePlayers();
      abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">行動を追跡する対象を選んでください</p>
        <ul class="ability-target-list">${targets.map(t => {
        return `<li class="ability-target" onclick="game.selectAbilityTarget(${t.id})" id="atgt-${t.id}">
            <span class="player-name">${this.esc(t.name)}</span></li>`;
      }).join('')}</ul>`;
      // Show past tracking results
      if (player.abilityHistory.length > 0) {
        const trackHist = player.abilityHistory.map(h =>
          `<div class="history-entry">ターン${h.turn}: ${h.summary}</div>`).join('');
        historyHtml = `<div class="ability-history"><h4>📜 追跡履歴</h4>${trackHist}</div>`;
      }
      break;
    }
    case 'sensei': {
      const targets = e.getAlivePlayersExcept(player.id).filter(t => t.id !== player.blockedLast);
      const cantBlock = player.blockedLast != null ? e.players[player.blockedLast] : null;
      abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">妨害する対象を選んでください${cantBlock ? `（${cantBlock.name}は連続不可）` : ''}。自身も不可。</p>
        <ul class="ability-target-list">${e.getAlivePlayersExcept(player.id).map(t => {
        const disabled = t.id === player.blockedLast;
        return `<li class="ability-target ${disabled ? 'disabled' : ''}" ${disabled ? '' : `onclick="game.selectAbilityTarget(${t.id})"`} id="atgt-${t.id}">
            <span class="player-name">${this.esc(t.name)}</span></li>`;
      }).join('')}</ul>`;
      break;
    }
    case 'jaiko': {
      abilityContent = `<div class="text-center" style="padding:20px;color:var(--text-secondary)">
        <p>能力ターンにすることはありません。</p><p class="mt-8">人狼があなたを殴ってきたとき、ママが返り討ちにします。</p></div>`;
      break;
    }
    default: {
      abilityContent = `<div class="text-center" style="padding:20px;color:var(--text-secondary)">
        <p>能力ターンにすることはありません。</p></div>`;
    }
  }

  // Special: mecha_gian choice
  let mechaChoiceHtml = '';
  if (role === 'mecha_gian') {
    mechaChoiceHtml = `<div class="mecha-choice mb-16">
      <button class="btn btn-wolf btn-sm ${player._currentChoice !== player.mechaVillageRole ? 'active' : ''}"
        onclick="game.mechaChoose('gian')">👊 ジャイアン能力</button>
      ${player.mechaVillageRole ? `<button class="btn btn-village btn-sm ${player._currentChoice === player.mechaVillageRole ? 'active' : ''}"
        onclick="game.mechaChoose('${player.mechaVillageRole}')">${ROLES[player.mechaVillageRole].emoji} ${getRoleName(player.mechaVillageRole)}能力</button>` : ''}
    </div>`;
    if (!player._currentChoice) player._currentChoice = 'gian';
  }

  // Special: dekisugi
  let dekisugiHtml = '';
  if (role === 'dekisugi' || abilityRole === 'dekisugi') {
    const targets = e.getAlivePlayersExcept(player.id);
    const allRoles = Object.values(ROLES).map(r => r.id);
    dekisugiHtml = `<p class="mb-8" style="color:var(--text-secondary)">対象者と役職を推理してください</p>
      <ul class="ability-target-list">${targets.map(t =>
      `<li class="ability-target" onclick="game.selectAbilityTarget(${t.id})" id="atgt-${t.id}">
          <span class="player-name">${this.esc(t.name)}</span></li>`).join('')}</ul>
      <div class="mt-12"><label class="form-label">推理する役職</label>
        <div class="role-select-grid" id="role-guess-grid">
          ${allRoles.map(r => `<div class="role-select-option" onclick="game.selectGuessRole('${r}')" id="rguess-${r}">
            ${ROLES[r].emoji} ${ROLES[r].name}</div>`).join('')}
        </div>
      </div>
      <button class="btn btn-secondary btn-sm btn-block mt-12" onclick="game.selectAbilitySkip()">推理しない</button>`;
    abilityContent = dekisugiHtml;
  }

  // Special: gorgon
  if (role === 'gorgon' || abilityRole === 'gorgon') {
    const targets = e.getAlivePlayersExcept(player.id);
    abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">石化する対象を選んでください</p>
      <ul class="ability-target-list">${targets.map(t =>
      `<li class="ability-target" onclick="game.selectAbilityTarget(${t.id})" id="atgt-${t.id}">
          <span class="player-name">${this.esc(t.name)}</span></li>`).join('')}</ul>`;
  }

  // Special: copy_robot (before copy)
  if (role === 'copy_robot' && !player.hasCopied) {
    const targets = e.getAlivePlayersExcept(player.id);
    abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">コピーする対象を選んでください（一度だけ）</p>
      <ul class="ability-target-list">${targets.map(t =>
      `<li class="ability-target" onclick="game.selectAbilityTarget(${t.id})" id="atgt-${t.id}">
          <span class="player-name">${this.esc(t.name)}</span></li>`).join('')}</ul>
      <button class="btn btn-secondary btn-sm btn-block mt-12" onclick="game.selectAbilitySkip()">何もしない</button>`;
  }

  // Special: haruo (before registration)
  if ((role === 'haruo' || abilityRole === 'haruo') && !player.haruoTarget) {
    const targets = e.getAlivePlayersExcept(player.id);
    abilityContent = `<p class="mb-8" style="color:var(--text-secondary)">「安雄」として登録する対象を選んでください（一度だけ）</p>
      <ul class="ability-target-list">${targets.map(t =>
      `<li class="ability-target" onclick="game.selectAbilityTarget(${t.id})" id="atgt-${t.id}">
          <span class="player-name">${this.esc(t.name)}</span></li>`).join('')}</ul>
      <button class="btn btn-secondary btn-sm btn-block mt-12" onclick="game.selectAbilitySkip()">まだ登録しない</button>`;
  } else if ((role === 'haruo' || abilityRole === 'haruo') && player.haruoTarget != null) {
    abilityContent = `<div class="text-center" style="padding:20px;color:var(--text-secondary)">
      <p>安雄として${e.players[player.haruoTarget].name}を登録済みです。</p></div>`;
  }

  // Determine if submit needed
  const doramiNeedsTarget = abilityRole === 'dorami' && e.getDeadPlayers().length > 0;
  const needsTarget = abilityRole === 'gian' || abilityRole === 'doraemon' || abilityRole === 'shizuka' ||
    doramiNeedsTarget || abilityRole === 'sewashi' || abilityRole === 'sensei' ||
    abilityRole === 'gorgon' || abilityRole === 'dekisugi' ||
    (role === 'copy_robot' && !player.hasCopied) ||
    ((role === 'haruo' || abilityRole === 'haruo') && !player.haruoTarget);
  const noAction = abilityRole === 'jaiko' || abilityRole === 'suneo' || abilityRole === 'kaminari' ||
    ((role === 'haruo' || abilityRole === 'haruo') && player.haruoTarget != null);

  this.render(`
    <div class="ability-header"><span class="turn-badge">ターン ${e.turn}</span>
      <h2>${this.esc(player.name)}の能力ターン</h2></div>
    <div class="ability-role-display">
      <span class="role-badge ${getRoleBadgeClass(displayRole)}">${getSideLabel(getRoleSide(displayRole))}</span>
      <span>${displayInfo.emoji} ${displayInfo.name}</span>
    </div>
    ${partnerHtml}${mechaChoiceHtml}
    <div class="card">${abilityContent}</div>
    ${historyHtml}
    ${needsTarget ? `<button class="btn btn-primary btn-block btn-lg mt-16" id="ability-submit" disabled onclick="game.submitAbility()">決定</button>` : ''}
    ${noAction ? `<button class="btn btn-primary btn-block btn-lg mt-16" onclick="game.submitAbility()">次へ</button>` : ''}
  `);
};

// ===== ABILITY RESULT SCREEN =====
GameUI.prototype.renderAbilityResult = function (player) {
  const e = this.engine;
  const results = e.turnResults[player.id];
  const role = player.role;
  const displayRole = (role === 'nobita') ? player.nobitaFakeRole : role;
  const displayInfo = ROLES[displayRole] || ROLES[role];

  if (!player.alive && (player.knockedOutTurn === e.turn)) {
    // Player was knocked out this turn
    let allPlayersInfo = e.players.map(p => {
      const r = ROLES[p.role];
      let roleStr = r.name;
      if (p.role === 'nobita') roleStr += `（勘違い: ${getRoleName(p.nobitaFakeRole)}）`;
      return `<div class="all-roles-item">
        <span class="player">${this.esc(p.name)}</span>
        <span class="role role-badge ${getRoleBadgeClass(p.role)}">${roleStr}</span>
        <span style="font-size:0.8rem">${p.alive ? '生存' : '気絶'}</span></div>`;
    }).join('');

    this.render(`
      <div class="result-container">
        <div class="announcement-box"><div class="announcement-title">💀 あなたは${player.knockedOutBy === 'werewolf' ? '人狼にやられました' :
        player.knockedOutBy === 'gorgon' ? 'ゴルゴンの首に石化されました' :
          player.knockedOutBy === 'kaminari' ? '神成さんに叱りつけられました' :
            player.knockedOutBy === 'copy_robot' ? 'コピーロボットにコピーされました' :
              player.knockedOutBy === 'dekisugi' ? '出木杉に推理されました' :
                player.knockedOutBy === 'dekisugi_fail' ? '推理に失敗しました' :
                  player.knockedOutBy === 'jaiko_counter' ? 'ジャイ子に返り討ちにあいました' : '気絶しました'
      }</div>
        <div class="announcement-text">次のターン以降は会話に参加することができません。</div></div>
        <div class="card mt-16"><div class="card-header"><span class="icon">🎭</span><h2>全プレイヤーの役職</h2></div>
          ${allPlayersInfo}</div>
        <button class="btn btn-primary btn-block btn-lg mt-16" onclick="game.nextResult()">確認しました</button>
      </div>`);
    return;
  }

  // Show results for alive players
  let resultMessages = [];
  if (results.data.wasBlocked) {
    resultMessages.push(`<p class="result-blocked">🚫 家庭訪問のため、あなたは行動できませんでした。</p>`);
  } else {
    // Divine result
    if (results.data.divineResult && results.data.divineResult !== 'blocked') {
      const tgt = e.players[results.data.divineTarget];
      const isBlack = results.data.divineResult === '黒';
      resultMessages.push(`<p>${tgt.name}は <span class="role-badge ${isBlack ? 'wolf' : 'village'}">${results.data.divineResult}</span> でした。</p>`);
    }
    // Medium result
    if (results.data.mediumResult && results.data.mediumResult !== 'blocked') {
      const tgt = e.players[results.data.mediumTarget];
      const roleName = results.data.mediumResult === '不明' ? '不明' : getRoleName(results.data.mediumResult);
      resultMessages.push(`<p>${tgt.name}の役職は <strong>${roleName}</strong> でした。</p>`);
    }
    // Protect result
    if (results.data.protectResult) {
      const msg = results.data.protectResult === 'protected' ? '守れた ✅' :
        results.data.protectResult === 'failed' ? '守れなかった ❌' : '襲撃されなかった ⚪';
      resultMessages.push(`<p>守護結果: <strong>${msg}</strong></p>`);
    }
    // Track result
    if (results.data.trackResult != null && results.data.trackResult !== 'blocked') {
      const tgt = e.players[results.data.trackTarget];
      let trackMsg;
      if (results.data.trackResult === 'none') {
        trackMsg = `${tgt.name}は行動なし（✕）`;
      } else if (results.data.trackResult === 'blocked_target') {
        trackMsg = `${tgt.name}は家庭訪問で行動できず（✕）`;
      } else {
        const actionTarget = e.players[results.data.trackResult];
        trackMsg = `${tgt.name}→${actionTarget ? actionTarget.name : '?'}`;
      }
      resultMessages.push(`<p>追跡結果: ${trackMsg}</p>`);
    }
    // Attack blocked
    if (results.data.attackBlocked) {
      resultMessages.push(`<p class="result-fail">攻撃が防がれました。</p>`);
    }
    // Other messages
    results.messages.forEach(m => resultMessages.push(`<p>${m}</p>`));
  }

  if (resultMessages.length === 0) {
    resultMessages.push(`<p style="color:var(--text-secondary)">このターンの結果はありません。</p>`);
  }

  this.render(`
    <div class="result-container">
      <div class="ability-role-display">
        <span class="role-badge ${getRoleBadgeClass(displayRole)}">${getSideLabel(getRoleSide(displayRole))}</span>
        <span>${displayInfo.emoji} ${displayInfo.name}</span>
      </div>
      <div class="card mt-16"><div class="card-header"><span class="icon">📋</span><h2>結果</h2></div>
        <div class="result-message">${resultMessages.join('')}</div></div>
      <button class="btn btn-primary btn-block btn-lg mt-16" onclick="game.nextResult()">確認しました</button>
    </div>`);
};

// ===== GAME OVER SCREEN =====
GameUI.prototype.renderGameOver = function () {
  const e = this.engine;
  const winClass = e.winner === SIDES.WOLF ? 'wolf-win' : e.winner === SIDES.VILLAGE ? 'village-win' : 'third-win';
  const winLabel = e.winner === SIDES.WOLF ? '🐺 人狼WIN' : e.winner === SIDES.VILLAGE ? '🏘️ 村人WIN' : '🎭 第三者WIN';
  const thirdWinners = e.thirdWinners;
  let thirdWinHtml = '';
  if (thirdWinners.length > 0) {
    thirdWinHtml = `<div class="announcement-box" style="border-color:rgba(170,102,204,0.3);background:rgba(170,102,204,0.1)">
      <div class="announcement-title">🎉 第三者勝利</div>
      <div class="announcement-text">${thirdWinners.map(p => `${p.name}（${getRoleName(p.role)}）`).join('、')}</div></div>`;
  }

  const allPlayersHtml = e.players.map(p => {
    const r = ROLES[p.role];
    let roleStr = `${r.emoji} ${r.name}`;
    if (p.role === 'nobita') roleStr += `（勘違い: ${getRoleName(p.nobitaFakeRole)}）`;
    if (p.copiedFrom != null) roleStr += `（元コピーロボット）`;
    const winRate = e.getWinRate(p.name);
    return `<div class="all-roles-item">
      <span class="player">${this.esc(p.name)}</span>
      <div style="text-align:right">
        <span class="role role-badge ${getRoleBadgeClass(p.role)}">${roleStr}</span>
        <div class="win-rate">勝率: ${winRate}</div>
      </div></div>`;
  }).join('');

  this.render(`
    <div class="gameover-container">
      <div class="winner-banner ${winClass}">
        <div class="winner-title">${winLabel}</div>
        <div class="winner-subtitle">ゲーム終了</div>
      </div>
      ${thirdWinHtml}
      <div class="card"><div class="card-header"><span class="icon">🎭</span><h2>全プレイヤーの役職</h2></div>
        <div class="all-roles-list">${allPlayersHtml}</div></div>
      <button class="btn btn-primary btn-block btn-lg mt-24" onclick="game.retry()">🔄 もう一度プレイ</button>
    </div>`);
};
