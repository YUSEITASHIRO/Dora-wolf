// ===== ROLE DEFINITIONS =====
const SIDES = { WOLF: 'wolf', VILLAGE: 'village', THIRD: 'third' };

const ROLES = {
  gian: {
    id: 'gian', name: 'ジャイアン', side: SIDES.WOLF, emoji: '👊',
    desc: '人狼。村人に紛れて悪さをする。',
    hasActiveAbility: true, abilityLabel: '殴る対象を選ぶ',
  },
  mecha_gian: {
    id: 'mecha_gian', name: 'メカジャイアン', side: SIDES.WOLF, emoji: '🤖',
    desc: 'ジャイアンを倒すために作られたロボットだったが、意気投合。村人に紛れて悪さをする。',
    hasActiveAbility: true, abilityLabel: '行動を選ぶ',
  },
  suneo: {
    id: 'suneo', name: 'スネ夫', side: SIDES.WOLF, emoji: '💎',
    desc: '村人。人狼側についており、裏で暗躍する。しかし人狼はそれを知ることはない。不憫。',
    hasActiveAbility: false, abilityLabel: '',
  },
  doraemon: {
    id: 'doraemon', name: 'ドラえもん', side: SIDES.VILLAGE, emoji: '🔔',
    desc: '村人。町の平和を守るため、することレンズでその人を見通す。人狼なら黒が、それ以外なら白が出る。スネ夫も白が表示される。',
    hasActiveAbility: true, abilityLabel: '占う対象を選ぶ',
  },
  shizuka: {
    id: 'shizuka', name: 'しずか', side: SIDES.VILLAGE, emoji: '🎀',
    desc: '村人。町の平和を守るため、人狼に襲撃されたけが人を治す。連続で守ることや自身を守ることは不可能。',
    hasActiveAbility: true, abilityLabel: '守る対象を選ぶ',
  },
  dorami: {
    id: 'dorami', name: 'ドラミ', side: SIDES.VILLAGE, emoji: '🌸',
    desc: '村人。町の平和を守るため、テレバしいで今までに気絶してしまった人の役職を知る。余談だが、兄より正確な役職が知れるのは、ひとえにあなたが兄より優秀だから。',
    hasActiveAbility: true, abilityLabel: '霊視する対象を選ぶ',
  },
  jaiko: {
    id: 'jaiko', name: 'ジャイ子', side: SIDES.VILLAGE, emoji: '📚',
    desc: '村人。能力ターンにする行動はない。人狼が殴ってきたとき、あなたは気絶してしまうが、ママが発見することで人狼は返り討ちにあう。',
    hasActiveAbility: false, abilityLabel: '',
  },
  sewashi: {
    id: 'sewashi', name: 'セワシ', side: SIDES.VILLAGE, emoji: '⏰',
    desc: '村人。町の平和を守るため、前の日にどんな行動をしていたのかタイムマシンで確認する。中古品のため画質が悪く、その人の役職までは知ることができない。',
    hasActiveAbility: true, abilityLabel: '追跡する対象を選ぶ',
  },
  sensei: {
    id: 'sensei', name: '先生', side: SIDES.VILLAGE, emoji: '👓',
    desc: '村人。家庭訪問のため、人狼村人問わず対象者をその日の行動を足止めする。連続で足止めすることや自身を選択することは不可能。',
    hasActiveAbility: true, abilityLabel: '妨害する対象を選ぶ',
  },
  nobita: {
    id: 'nobita', name: 'のび太', side: SIDES.VILLAGE, emoji: '😴',
    desc: '村人。自分が何かしらの役職を持っていると思いこんでいるが、能力の使用結果はでたらめ。自分を「しずか」「先生」だと思いこんでいる場合、ゴルゴンの首の襲撃から守ったり、行動を妨害したりすることができる。なぜならゴルゴンの首を倒したのはあなただから。',
    hasActiveAbility: true, abilityLabel: '',
  },
  dekisugi: {
    id: 'dekisugi', name: '出木杉', side: SIDES.THIRD, emoji: '🎓',
    desc: '第三者。対象者の役職を予想して推理することができる。推理が当たっていれば独自の方法で対象者を気絶させるが、間違っていればショックで自身が気絶する。',
    hasActiveAbility: true, abilityLabel: '推理する',
    winCondition: '推理を当てて対象を気絶させる',
  },
  gorgon: {
    id: 'gorgon', name: 'ゴルゴンの首', side: SIDES.THIRD, emoji: '🐍',
    desc: '第三者。自由に動き、人一人を石化する。しずかの守護は貫通するが、しずかや先生だと思いこんでいるのび太の守護や妨害には阻まれる。',
    hasActiveAbility: true, abilityLabel: '石化する対象を選ぶ',
    winCondition: '生存者が自分だけになる（または第三者勝利条件）',
  },
  copy_robot: {
    id: 'copy_robot', name: 'コピーロボット', side: SIDES.THIRD, emoji: '🤡',
    desc: '第三者。一度だけ対象者を気絶させ、役職をコピーする。コピーした後はその役職の勝利条件に従う。のび太をコピーしてものび太が勘違いした役職までコピーするため、あなたはそれに気づかない。',
    hasActiveAbility: true, abilityLabel: 'コピーする対象を選ぶ',
    winCondition: 'コピーした役職の勝利条件に従う',
  },
  haruo: {
    id: 'haruo', name: 'はる夫', side: SIDES.THIRD, emoji: '🧢',
    desc: '第三者。誰か一人を「安雄」に登録する。この登録は変更できない。自身の生死にかかわらず、安雄がゲーム終了時まで生きていれば勝利となる。',
    hasActiveAbility: true, abilityLabel: '安雄を登録する',
    winCondition: '登録した安雄がゲーム終了時に生存',
  },
  kaminari: {
    id: 'kaminari', name: '神成さん', side: SIDES.THIRD, emoji: '😡',
    desc: '第三者。能力ターンにする行動はない。ランダムで生存している自分以外のプレイヤーを1人ずつ叱りつけて気絶させる。とばっちりもいいところであるため、会話ターンではひそかに「この中に神成さんがいる」との噂が流れている。',
    hasActiveAbility: false, abilityLabel: '',
    winCondition: '生存者が自分だけになる（または第三者勝利条件）',
  },
};

const WOLF_ROLES = ['gian', 'mecha_gian', 'suneo'];
const VILLAGE_ROLES = ['doraemon', 'shizuka', 'dorami', 'jaiko', 'sewashi', 'sensei', 'nobita'];
const THIRD_ROLES = ['dekisugi', 'gorgon', 'copy_robot', 'haruo', 'kaminari'];
const NOBITA_COPYABLE = ['doraemon', 'shizuka', 'dorami', 'jaiko', 'sewashi', 'sensei'];

function getRoleSide(roleId) {
  if (!roleId) return SIDES.VILLAGE;
  return ROLES[roleId]?.side || SIDES.VILLAGE;
}

function getRoleName(roleId) {
  return ROLES[roleId]?.name || roleId;
}

function getRoleBadgeClass(roleId) {
  const side = getRoleSide(roleId);
  if (side === SIDES.WOLF) return 'wolf';
  if (side === SIDES.THIRD) return 'third';
  return 'village';
}

function getSideLabel(side) {
  if (side === SIDES.WOLF) return '人狼';
  if (side === SIDES.THIRD) return '第三者';
  return '村人';
}
