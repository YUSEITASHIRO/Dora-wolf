// ===== GAME ENGINE - State & Processing =====
class GameEngine {
    constructor() {
        this.reset();
        this.stats = JSON.parse(localStorage.getItem('dorawolf_stats') || '{}');
    }

    reset() {
        this.config = {
            players: [],
            roleCounts: {},
            randomCounts: { wolf: 0, village: 0, third: 0 },
            randomExclude: { wolf: [], village: [], third: [] },
            firstDayVoting: false,
            discussionMinutes: 5,
        };
        this.turn = 0;
        this.phase = 'config';
        this.players = [];
        this.turnActions = [];
        this.turnResults = [];
        this.history = [];
        this.currentIdx = 0;
        this.eliminated = [];
        this.rolesInGame = [];
        this.kaminariExists = false;
        this.dekisugiDelayed = [];
        this.gameOver = false;
        this.winner = null;
        this.thirdWinners = [];
    }

    // ===== ROLE ASSIGNMENT =====
    assignRoles() {
        const assigned = [];
        // Add specific role counts
        for (const [roleId, count] of Object.entries(this.config.roleCounts)) {
            for (let i = 0; i < count; i++) assigned.push(roleId);
        }
        // Add random roles
        for (const side of ['wolf', 'village', 'third']) {
            const count = this.config.randomCounts[side] || 0;
            const excluded = this.config.randomExclude[side] || [];
            const pool = (side === 'wolf' ? WOLF_ROLES : side === 'village' ? VILLAGE_ROLES : THIRD_ROLES)
                .filter(r => !excluded.includes(r));
            for (let i = 0; i < count; i++) {
                if (pool.length > 0) assigned.push(pool[Math.floor(Math.random() * pool.length)]);
            }
        }
        // Shuffle
        for (let i = assigned.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [assigned[i], assigned[j]] = [assigned[j], assigned[i]];
        }
        // Assign to players
        this.players = this.config.players.map((p, idx) => ({
            id: idx, name: p.name, role: assigned[idx] || 'suneo',
            displayRole: null, alive: true, knockedOutTurn: -1, knockedOutBy: null,
            abilityHistory: [], protectedLast: null, blockedLast: null,
            haruoTarget: null, hasCopied: false, copiedFrom: null,
            copiedOriginalRole: null, mechaVillageRole: null, isBlocked: false,
            nobitaFakeRole: null,
        }));
        // Setup のび太 fake roles
        const villageRolesInGame = this.players.map(p => p.role).filter(r => NOBITA_COPYABLE.includes(r));
        this.players.forEach(p => {
            if (p.role === 'nobita') {
                if (villageRolesInGame.length > 0) {
                    p.nobitaFakeRole = villageRolesInGame[Math.floor(Math.random() * villageRolesInGame.length)];
                    p.displayRole = p.nobitaFakeRole;
                } else {
                    p.nobitaFakeRole = 'doraemon';
                    p.displayRole = 'doraemon';
                }
            }
        });
        // Setup メカジャイアン village ability
        this.players.forEach(p => {
            if (p.role === 'mecha_gian') {
                if (villageRolesInGame.length > 0) {
                    p.mechaVillageRole = villageRolesInGame[Math.floor(Math.random() * villageRolesInGame.length)];
                }
            }
        });
        // Track roles in game
        this.rolesInGame = [...new Set(this.players.map(p => p.role))];
        if (this.config.randomCounts.wolf > 0 || this.config.randomCounts.village > 0 || this.config.randomCounts.third > 0) {
            this.rolesInGame.push('_random');
        }
        this.kaminariExists = this.players.some(p => p.role === 'kaminari');
        // Setup wolf partners
        this.wolfPartners = this.players.filter(p => p.role === 'gian' || p.role === 'mecha_gian');
    }

    getEffectiveRole(player) {
        if (player.role === 'nobita') return player.displayRole || player.nobitaFakeRole;
        if (player.role === 'copy_robot' && player.hasCopied) {
            if (player.copiedOriginalRole === 'nobita') return player.displayRole;
            return player.copiedOriginalRole;
        }
        return player.role;
    }

    getAbilityRole(player) {
        if (player.role === 'mecha_gian') return player._currentChoice || 'gian';
        if (player.role === 'nobita') return player.nobitaFakeRole;
        if (player.role === 'copy_robot' && player.hasCopied) return player.copiedOriginalRole;
        return player.role;
    }

    getAlivePlayers() { return this.players.filter(p => p.alive); }
    getAlivePlayersExcept(id) { return this.players.filter(p => p.alive && p.id !== id); }
    getDeadPlayers() { return this.players.filter(p => !p.alive); }

    getWolfPartners(playerId) {
        return this.wolfPartners.filter(p => p.id !== playerId);
    }

    // ===== ABILITY PROCESSING =====
    processAbilities() {
        const actions = [...this.turnActions];
        const results = {};
        this.players.forEach(p => { results[p.id] = { messages: [], data: {} }; });
        const newlyDead = [];

        // 1. 先生の妨害
        const senseiActions = actions.filter(a => a.abilityRole === 'sensei' && !a.isNobita && a.targetId != null);
        const blockedIds = new Set();
        senseiActions.forEach(a => {
            const target = this.players[a.targetId];
            if (target && target.role !== 'kaminari') {
                blockedIds.add(a.targetId);
                target.isBlocked = true;
            }
        });

        // Also process のび太-先生 (fake block - no actual effect, except for Gorgon)
        const nobitaSenseiActions = actions.filter(a => a.abilityRole === 'sensei' && a.isNobita && a.targetId != null);
        const nobitaSenseiBlockedIds = new Set();
        nobitaSenseiActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            nobitaSenseiBlockedIds.add(a.targetId);
        });

        // 2. コピーロボット
        const copyActions = actions.filter(a => a.role === 'copy_robot' && !a.player.hasCopied && a.targetId != null && a.action !== 'skip');
        copyActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            const target = this.players[a.targetId];
            if (target && target.alive) {
                a.player.hasCopied = true;
                a.player.copiedFrom = target.id;
                a.player.copiedOriginalRole = target.role;
                if (target.role === 'nobita') {
                    a.player.displayRole = target.displayRole || target.nobitaFakeRole;
                    a.player.nobitaFakeRole = target.nobitaFakeRole;
                }
                // Copy win condition side
                if (target.role === 'nobita') a.player._copiedSide = SIDES.VILLAGE;
                else a.player._copiedSide = getRoleSide(target.role);
                target.alive = false;
                target.knockedOutTurn = this.turn;
                target.knockedOutBy = 'copy_robot';
                newlyDead.push(target.id);
                results[a.player.id].messages.push(`${target.name}の役職をコピーしました。`);
            }
        });

        // 3. はる夫の登録
        const haruoActions = actions.filter(a => a.role === 'haruo' && a.targetId != null && a.action !== 'skip');
        haruoActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            if (!a.player.haruoTarget) {
                a.player.haruoTarget = a.targetId;
                results[a.player.id].messages.push(`${this.players[a.targetId].name}を安雄として登録しました。`);
            }
        });

        // 4. しずかの守護設定
        const protectedIds = new Set();
        const shizukaActions = actions.filter(a => a.abilityRole === 'shizuka' && !a.isNobita && a.targetId != null);
        shizukaActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            protectedIds.add(a.targetId);
            a.player.protectedLast = a.targetId;
        });
        // のび太(しずか) - doesn't actually protect against wolves, but protects against gorgon
        const nobitaShizukaProtected = new Set();
        const nobitaShizukaActions = actions.filter(a => a.abilityRole === 'shizuka' && a.isNobita && a.targetId != null);
        nobitaShizukaActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            nobitaShizukaProtected.add(a.targetId);
            a.player.protectedLast = a.targetId;
        });

        // 5. ジャイアン/メカジャイアン(wolf mode) attacks
        const wolfAttacks = actions.filter(a =>
            (a.role === 'gian' || (a.role === 'mecha_gian' && a.abilityRole === 'gian')) && a.targetId != null
        );
        wolfAttacks.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            const target = this.players[a.targetId];
            if (!target || !target.alive || newlyDead.includes(target.id)) return;
            if (protectedIds.has(a.targetId)) {
                results[a.player.id].data.attackBlocked = true;
                // しずか結果: 守れた
                shizukaActions.forEach(sa => {
                    if (sa.targetId === a.targetId) results[sa.player.id].data.protectResult = 'protected';
                });
                return;
            }
            if (target.role === 'jaiko') {
                target.alive = false; target.knockedOutTurn = this.turn; target.knockedOutBy = 'werewolf';
                a.player.alive = false; a.player.knockedOutTurn = this.turn; a.player.knockedOutBy = 'jaiko_counter';
                newlyDead.push(target.id, a.player.id);
                return;
            }
            target.alive = false; target.knockedOutTurn = this.turn; target.knockedOutBy = 'werewolf';
            newlyDead.push(target.id);
        });

        // 6. ゴルゴンの首 attack
        const gorgonActions = actions.filter(a => a.role === 'gorgon' && a.targetId != null);
        gorgonActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            if (nobitaSenseiBlockedIds.has(a.player.id)) return; // のび太(先生) blocks gorgon
            const target = this.players[a.targetId];
            if (!target || !target.alive || newlyDead.includes(target.id)) return;
            if (nobitaShizukaProtected.has(a.targetId)) {
                // のび太(しずか) blocks gorgon
                nobitaShizukaActions.forEach(sa => {
                    if (sa.targetId === a.targetId) results[sa.player.id].data.protectResult = 'protected';
                });
                return;
            }
            // しずか cannot protect against gorgon
            target.alive = false; target.knockedOutTurn = this.turn; target.knockedOutBy = 'gorgon';
            newlyDead.push(target.id);
        });

        // 7. 出木杉の推理
        const dekisugiActions = actions.filter(a => a.role === 'dekisugi' && a.targetId != null && a.action !== 'skip');
        dekisugiActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            const target = this.players[a.targetId];
            if (!target) return;
            const guessedRole = a.guessedRole;
            const actualRole = target.role;
            if (guessedRole === actualRole) {
                this.dekisugiDelayed.push({ targetId: a.targetId, turn: this.turn });
                results[a.player.id].messages.push(`推理が的中しました！${target.name}は翌日気絶します。`);
            } else {
                a.player.alive = false; a.player.knockedOutTurn = this.turn; a.player.knockedOutBy = 'dekisugi_fail';
                newlyDead.push(a.player.id);
                results[a.player.id].messages.push(`推理が外れました…ショックで気絶します。`);
            }
        });

        // 8. 神成さん random kill (NOT blockable)
        this.players.filter(p => p.role === 'kaminari' && p.alive && !newlyDead.includes(p.id)).forEach(p => {
            const candidates = this.players.filter(t => t.alive && t.id !== p.id && !newlyDead.includes(t.id));
            if (candidates.length > 0) {
                const victim = candidates[Math.floor(Math.random() * candidates.length)];
                victim.alive = false; victim.knockedOutTurn = this.turn; victim.knockedOutBy = 'kaminari';
                newlyDead.push(victim.id);
            }
        });

        // 9. ドラえもん占い結果
        const doraemonActions = actions.filter(a => a.abilityRole === 'doraemon' && a.targetId != null);
        doraemonActions.forEach(a => {
            if (blockedIds.has(a.player.id)) {
                results[a.player.id].data.divineResult = 'blocked';
                return;
            }
            const target = this.players[a.targetId];
            if (a.isNobita) {
                // Random result for のび太
                results[a.player.id].data.divineResult = Math.random() < 0.5 ? '黒' : '白';
            } else {
                const isWolf = target.role === 'gian' || target.role === 'mecha_gian';
                results[a.player.id].data.divineResult = isWolf ? '黒' : '白';
            }
            results[a.player.id].data.divineTarget = a.targetId;
        });

        // 10. ドラミ霊媒結果
        const doramiActions = actions.filter(a => a.abilityRole === 'dorami' && a.targetId != null);
        doramiActions.forEach(a => {
            if (blockedIds.has(a.player.id)) {
                results[a.player.id].data.mediumResult = 'blocked';
                return;
            }
            const target = this.players[a.targetId];
            if (a.isNobita) {
                // Random role for のび太
                const allRoleIds = Object.keys(ROLES);
                results[a.player.id].data.mediumResult = allRoleIds[Math.floor(Math.random() * allRoleIds.length)];
            } else {
                if (target.knockedOutBy === 'gorgon') {
                    results[a.player.id].data.mediumResult = '不明';
                } else {
                    results[a.player.id].data.mediumResult = target.role;
                }
            }
            results[a.player.id].data.mediumTarget = a.targetId;
        });

        // 11. セワシ追跡結果
        const sewashiActions = actions.filter(a => a.abilityRole === 'sewashi' && a.targetId != null);
        sewashiActions.forEach(a => {
            if (blockedIds.has(a.player.id)) {
                results[a.player.id].data.trackResult = 'blocked';
                return;
            }
            if (a.isNobita) {
                const r = Math.random();
                if (r < 0.3) {
                    results[a.player.id].data.trackResult = 'none';
                } else {
                    const alive = this.getAlivePlayers();
                    const randomTarget = alive[Math.floor(Math.random() * alive.length)];
                    results[a.player.id].data.trackResult = randomTarget ? randomTarget.id : 'none';
                }
            } else {
                // Find what the target did this turn
                const targetAction = actions.find(act => act.player.id === a.targetId);
                if (!targetAction || targetAction.targetId == null || targetAction.action === 'skip') {
                    results[a.player.id].data.trackResult = 'none';
                } else if (this.players[a.targetId]?.isBlocked) {
                    results[a.player.id].data.trackResult = 'blocked_target';
                } else {
                    results[a.player.id].data.trackResult = targetAction.targetId;
                }
            }
            results[a.player.id].data.trackTarget = a.targetId;
        });

        // しずか results for those not already set
        shizukaActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            if (!results[a.player.id].data.protectResult) {
                const target = this.players[a.targetId];
                if (newlyDead.includes(a.targetId)) {
                    results[a.player.id].data.protectResult = 'failed';
                } else {
                    results[a.player.id].data.protectResult = 'not_attacked';
                }
            }
        });
        // のび太(しずか) random results
        nobitaShizukaActions.forEach(a => {
            if (blockedIds.has(a.player.id)) return;
            if (!results[a.player.id].data.protectResult) {
                const opts = ['protected', 'failed', 'not_attacked'];
                results[a.player.id].data.protectResult = opts[Math.floor(Math.random() * opts.length)];
            }
        });

        // ジャイ子 results (check players who were alive at start of ability phase)
        this.players.filter(p => (p.role === 'jaiko' || (p.role === 'nobita' && p.nobitaFakeRole === 'jaiko'))).forEach(p => {
            if (p.knockedOutTurn >= 0 && p.knockedOutTurn < this.turn) return; // already dead before this turn
            if (newlyDead.includes(p.id)) {
                results[p.id].messages.push('人狼の攻撃をうけました。');
            } else {
                results[p.id].messages.push('人狼の攻撃をうけませんでした。');
            }
        });

        // Blocked player results
        blockedIds.forEach(id => {
            results[id].messages.push('家庭訪問のため、あなたは行動できませんでした。');
            results[id].data.wasBlocked = true;
        });

        // Store results
        this.turnResults = results;
        this.history.push({ turn: this.turn, actions: [...actions], results: { ...results }, newlyDead: [...newlyDead] });
        // Clear blocked status
        this.players.forEach(p => { p.isBlocked = false; });
        return newlyDead;
    }

    // ===== WIN CONDITION =====
    checkWinCondition() {
        const alive = this.getAlivePlayers();
        const wolves = alive.filter(p => p.role === 'gian' || p.role === 'mecha_gian');
        const villagers = alive.filter(p => p.role !== 'gian' && p.role !== 'mecha_gian');

        // Check third party wins first
        this.thirdWinners = [];
        // はる夫 check
        this.players.filter(p => p.role === 'haruo' || (p.role === 'copy_robot' && p.copiedOriginalRole === 'haruo')).forEach(p => {
            if (p.haruoTarget != null) {
                const target = this.players[p.haruoTarget];
                if (target && target.alive) this.thirdWinners.push(p);
            }
        });

        // Wolf win: wolves >= villagers
        if (wolves.length > 0 && wolves.length >= villagers.length) {
            this.winner = SIDES.WOLF;
            this.gameOver = true;
            return true;
        }
        // Village win: all wolves eliminated
        if (wolves.length === 0) {
            this.winner = SIDES.VILLAGE;
            this.gameOver = true;
            return true;
        }
        return false;
    }

    applyDelayedEffects() {
        const toApply = this.dekisugiDelayed.filter(d => d.turn === this.turn - 1);
        toApply.forEach(d => {
            const target = this.players[d.targetId];
            if (target && target.alive) {
                target.alive = false;
                target.knockedOutTurn = this.turn;
                target.knockedOutBy = 'dekisugi';
            }
        });
        this.dekisugiDelayed = this.dekisugiDelayed.filter(d => d.turn !== this.turn - 1);
        return toApply.map(d => d.targetId);
    }

    processVotes(votes) {
        const counts = {};
        votes.forEach(v => { counts[v.targetId] = (counts[v.targetId] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return { eliminated: null, counts, tied: [] };
        const maxVotes = sorted[0][1];
        const tied = sorted.filter(s => s[1] === maxVotes).map(s => parseInt(s[0]));
        if (tied.length === 1) {
            const eliminatedId = tied[0];
            const p = this.players[eliminatedId];
            p.alive = false; p.knockedOutTurn = this.turn; p.knockedOutBy = 'vote';
            return { eliminated: eliminatedId, counts, tied: [] };
        }
        return { eliminated: null, counts, tied };
    }

    saveStats() {
        this.players.forEach(p => {
            if (!this.stats[p.name]) this.stats[p.name] = { wins: 0, total: 0 };
            this.stats[p.name].total++;
            // Determine if player won
            let won = false;
            if (p.role === 'haruo' || (p.role === 'copy_robot' && p.copiedOriginalRole === 'haruo')) {
                won = this.thirdWinners.some(w => w.id === p.id);
            } else if (getRoleSide(p.role) === SIDES.THIRD || (p.role === 'copy_robot' && p.hasCopied)) {
                won = this.thirdWinners.some(w => w.id === p.id);
            } else if (p.role === 'suneo') {
                won = this.winner === SIDES.WOLF;
            } else {
                won = this.winner === getRoleSide(p.role);
            }
            if (won) this.stats[p.name].wins++;
        });
        localStorage.setItem('dorawolf_stats', JSON.stringify(this.stats));
    }

    getWinRate(name) {
        const s = this.stats[name];
        if (!s || s.total === 0) return '---';
        return Math.round((s.wins / s.total) * 100) + '%';
    }
}
