// ===== MAIN GAME CONTROLLER =====
class DoraemonWerewolf {
    constructor() {
        this.engine = new GameEngine();
        this.ui = new GameUI(this.engine);
        this.abilityPhaseOrder = [];
        this.resultPhaseOrder = [];
    }

    init() { this.ui.renderConfig(); }

    // ===== CONFIG ACTIONS =====
    addPlayer() {
        const input = document.getElementById('new-player-name');
        const name = (input?.value || '').trim();
        if (!name) return;
        this.engine.config.players.push({ name });
        input.value = '';
        this.ui.renderConfig();
        setTimeout(() => document.getElementById('new-player-name')?.focus(), 100);
    }

    removePlayer(idx) {
        this.engine.config.players.splice(idx, 1);
        this.ui.renderConfig();
    }

    toggleConfigSection(side) {
        this.ui.configOpen[side] = !this.ui.configOpen[side];
        this.ui.renderConfig();
    }

    adjustRole(roleId, delta) {
        const cfg = this.engine.config;
        cfg.roleCounts[roleId] = Math.max(0, (cfg.roleCounts[roleId] || 0) + delta);
        if (cfg.roleCounts[roleId] === 0) delete cfg.roleCounts[roleId];
        this.ui.renderConfig();
    }

    adjustRandom(side, delta) {
        this.engine.config.randomCounts[side] = Math.max(0, (this.engine.config.randomCounts[side] || 0) + delta);
        this.ui.renderConfig();
    }

    toggleRandomExclude(side, roleId) {
        const arr = this.engine.config.randomExclude[side];
        const idx = arr.indexOf(roleId);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(roleId);
        this.ui.renderConfig();
    }

    toggleFirstDayVoting(val) { this.engine.config.firstDayVoting = val; }
    setDiscussionTime(val) { this.engine.config.discussionMinutes = Math.max(1, parseInt(val) || 5); }

    // ===== GAME START =====
    startGame() {
        const cfg = this.engine.config;
        let totalRoles = Object.values(cfg.roleCounts).reduce((a, b) => a + b, 0);
        totalRoles += (cfg.randomCounts.wolf || 0) + (cfg.randomCounts.village || 0) + (cfg.randomCounts.third || 0);
        if (totalRoles !== cfg.players.length || cfg.players.length < 3) return;

        this.engine.assignRoles();
        this.engine.turn = 1;
        this.engine.phase = 'roleReveal';
        this.engine.currentIdx = 0;

        // Show first handoff
        const firstPlayer = this.engine.players[0];
        this.ui.renderHandoff(firstPlayer.name, 'あなたですか？今から役職を示します。', '自分です', 'game.showRoleReveal()');
    }

    showRoleReveal() {
        const player = this.engine.players[this.engine.currentIdx];
        this.ui.renderRoleReveal(player);
    }

    nextRoleReveal() {
        this.engine.currentIdx++;
        if (this.engine.currentIdx >= this.engine.players.length) {
            // All players have seen their roles - go to discussion
            this.engine.phase = 'discussion';
            this.ui.renderDiscussion();
            return;
        }
        const nextPlayer = this.engine.players[this.engine.currentIdx];
        this.ui.renderHandoff(nextPlayer.name, 'あなたですか？今から役職を示します。', '自分です', 'game.showRoleReveal()');
    }

    // ===== DISCUSSION =====
    addTimerMinute() {
        this.ui.timerSeconds += 60;
        const el = document.getElementById('timer-display');
        if (el) { el.textContent = this.ui.formatTime(this.ui.timerSeconds); el.className = 'timer-display'; }
    }

    pauseTimer() {
        this.ui.timerPaused = !this.ui.timerPaused;
        const btn = document.getElementById('pause-btn');
        if (btn) btn.textContent = this.ui.timerPaused ? '▶ 再開' : '⏸ 一時停止';
    }

    stopAlarm() { this.ui.stopAlarm(); }

    // ===== VOTING =====
    startVoting() {
        this.ui.stopTimer();
        const alive = this.engine.getAlivePlayers();
        const voterIds = alive.map(p => p.id);
        const candidateIds = alive.map(p => p.id);
        this.ui.renderVoting(voterIds, candidateIds, false);
    }

    showVoteScreen() { this.ui.renderVoteScreen(); }

    selectVote(targetId) {
        this.ui.voteState.selectedTarget = targetId;
        document.querySelectorAll('.vote-option').forEach(el => el.classList.remove('selected'));
        document.getElementById(`vote-${targetId}`)?.classList.add('selected');
        const btn = document.getElementById('vote-submit-btn');
        if (btn) btn.disabled = false;
    }

    submitVote() {
        const vs = this.ui.voteState;
        if (vs.selectedTarget == null) return;
        vs.votes.push({ voterId: vs.voters[vs.currentVoterIdx], targetId: vs.selectedTarget });
        vs.selectedTarget = null;
        vs.currentVoterIdx++;
        this.ui.renderVoteHandoff();
    }

    startRunoff(tiedIds, voterIds) {
        // Reset vote processing state for runoff - re-make alive players alive
        this.ui.renderVoting(voterIds, tiedIds, true);
    }

    afterVoting() {
        // Check win condition after vote
        if (this.engine.checkWinCondition()) {
            this.engine.saveStats();
            this.ui.renderGameOver();
            return;
        }
        this.startAbilityPhase();
    }

    // ===== ABILITY PHASE =====
    startAbilityPhase() {
        this.ui.stopTimer();
        this.engine.phase = 'ability';
        this.engine.turnActions = [];
        // Order: all alive players in registration order
        this.abilityPhaseOrder = this.engine.getAlivePlayers().map(p => p.id);
        this.engine.currentIdx = 0;

        if (this.abilityPhaseOrder.length === 0) {
            this.processAndShowResults();
            return;
        }
        const firstPlayer = this.engine.players[this.abilityPhaseOrder[0]];
        this.ui.renderHandoff(firstPlayer.name, '能力ターンです。', '自分です', 'game.showAbilityUse()');
    }

    showAbilityUse() {
        const player = this.engine.players[this.abilityPhaseOrder[this.engine.currentIdx]];
        this.ui.renderAbilityUse(player);
    }

    selectAbilityTarget(targetId) {
        this.ui.abilitySelection.targetId = targetId;
        document.querySelectorAll('.ability-target').forEach(el => el.classList.remove('selected'));
        document.getElementById(`atgt-${targetId}`)?.classList.add('selected');
        const btn = document.getElementById('ability-submit');
        if (btn) {
            const player = this.engine.players[this.abilityPhaseOrder[this.engine.currentIdx]];
            const abilityRole = this.engine.getAbilityRole(player);
            // For dekisugi, also need a role guess
            if (abilityRole === 'dekisugi') {
                btn.disabled = !this.ui.abilitySelection.guessedRole;
            } else {
                btn.disabled = false;
            }
        }
    }

    selectGuessRole(roleId) {
        this.ui.abilitySelection.guessedRole = roleId;
        document.querySelectorAll('.role-select-option').forEach(el => el.classList.remove('selected'));
        document.getElementById(`rguess-${roleId}`)?.classList.add('selected');
        const btn = document.getElementById('ability-submit');
        if (btn) btn.disabled = !this.ui.abilitySelection.targetId;
    }

    selectAbilitySkip() {
        this.ui.abilitySelection.action = 'skip';
        this.submitAbility();
    }

    mechaChoose(choice) {
        const player = this.engine.players[this.abilityPhaseOrder[this.engine.currentIdx]];
        player._currentChoice = choice;
        this.showAbilityUse();
    }

    submitAbility() {
        const player = this.engine.players[this.abilityPhaseOrder[this.engine.currentIdx]];
        const role = player.role;
        const abilityRole = this.engine.getAbilityRole(player);
        const isNobita = role === 'nobita' || (role === 'copy_robot' && player.copiedOriginalRole === 'nobita');
        const sel = this.ui.abilitySelection;

        const action = {
            player, role, abilityRole, isNobita,
            targetId: sel.targetId, guessedRole: sel.guessedRole,
            action: sel.action || 'use',
        };
        this.engine.turnActions.push(action);

        // Save ability history for display
        if (sel.targetId != null && sel.action !== 'skip') {
            const target = this.engine.players[sel.targetId];
            let summary = target ? target.name : '不明';
            player.abilityHistory.push({
                turn: this.engine.turn, targetId: sel.targetId, targetName: target?.name,
                result: '', summary,
            });
        }

        // Update sensei/shizuka blockedLast/protectedLast tracking
        if (abilityRole === 'sensei' && sel.targetId != null) player.blockedLast = sel.targetId;
        if (abilityRole === 'shizuka' && sel.targetId != null) player.protectedLast = sel.targetId;

        // Next player
        this.engine.currentIdx++;
        if (this.engine.currentIdx >= this.abilityPhaseOrder.length) {
            this.processAndShowResults();
            return;
        }
        const nextPlayer = this.engine.players[this.abilityPhaseOrder[this.engine.currentIdx]];
        this.ui.renderHandoff(nextPlayer.name, '能力ターンです。', '自分です', 'game.showAbilityUse()');
    }

    processAndShowResults() {
        // Process abilities
        const newlyDead = this.engine.processAbilities();

        // Update ability history results
        this.engine.turnActions.forEach(a => {
            const p = a.player;
            const results = this.engine.turnResults[p.id];
            const lastHist = p.abilityHistory[p.abilityHistory.length - 1];
            if (!lastHist || lastHist.turn !== this.engine.turn) return;
            if (results.data.divineResult && results.data.divineResult !== 'blocked') {
                lastHist.result = results.data.divineResult;
                lastHist.summary += `→${results.data.divineResult}`;
            }
            if (results.data.mediumResult && results.data.mediumResult !== 'blocked') {
                lastHist.result = results.data.mediumResult;
                lastHist.summary += `→${results.data.mediumResult === '不明' ? '不明' : getRoleName(results.data.mediumResult)}`;
            }
            if (results.data.protectResult) {
                lastHist.result = results.data.protectResult;
                const label = results.data.protectResult === 'protected' ? '守れた' :
                    results.data.protectResult === 'failed' ? '守れなかった' : '襲撃されなかった';
                lastHist.summary += `→${label}`;
            }
            if (results.data.trackResult != null && results.data.trackResult !== 'blocked') {
                if (results.data.trackResult === 'none') { lastHist.result = '✕'; lastHist.summary += '→✕'; }
                else if (results.data.trackResult === 'blocked_target') { lastHist.result = '✕'; lastHist.summary += '→✕(妨害)'; }
                else { const t = this.engine.players[results.data.trackResult]; lastHist.result = t?.name; lastHist.summary += `→${t?.name}`; }
            }
            if (results.data.wasBlocked) { lastHist.result = '不明'; lastHist.summary = '妨害された'; }
        });

        // Check win condition
        if (this.engine.checkWinCondition()) {
            this.engine.saveStats();
            this.ui.renderGameOver();
            return;
        }

        // Show results to each player
        this.resultPhaseOrder = [...this.abilityPhaseOrder]; // All players who were alive at start of ability phase
        this.engine.currentIdx = 0;
        this.engine.phase = 'results';
        const firstPlayer = this.engine.players[this.resultPhaseOrder[0]];
        this.ui.renderHandoff(firstPlayer.name, '結果を確認してください。', '自分です', 'game.showResult()');
    }

    showResult() {
        const player = this.engine.players[this.resultPhaseOrder[this.engine.currentIdx]];
        this.ui.renderAbilityResult(player);
    }

    nextResult() {
        this.engine.currentIdx++;
        if (this.engine.currentIdx >= this.resultPhaseOrder.length) {
            // All results shown - next turn
            this.engine.turn++;
            this.engine.phase = 'discussion';
            this.ui.renderDiscussion();
            return;
        }
        const nextPlayer = this.engine.players[this.resultPhaseOrder[this.engine.currentIdx]];
        this.ui.renderHandoff(nextPlayer.name, '結果を確認してください。', '自分です', 'game.showResult()');
    }

    // ===== RETRY =====
    retry() {
        const savedConfig = JSON.parse(JSON.stringify(this.engine.config));
        this.engine.reset();
        this.engine.config = savedConfig;
        this.ui.renderConfig();
    }
}

// ===== INITIALIZATION =====
const game = new DoraemonWerewolf();
document.addEventListener('DOMContentLoaded', () => game.init());
