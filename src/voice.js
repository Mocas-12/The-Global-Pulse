// voice.js — 页面的"声音": 轮换的诗 / 静默时刻 / 会话里程碑低语
// 原则: 只给真实数据一个被说出来的时刻, 不虚构任何事实。

// 副标题轮换句(第 1 句与开场标题一致, 作为回声)
export const LINES = {
  zh: [
    '万物皆逝，万物皆始。',
    '没有人见过时间，人们只见过出生与告别。',
    '每一秒，有人第一次睁开眼，有人最后一次合上眼。',
    '亿万次心跳，汇成这颗星球唯一的脉搏。',
    '时间从不流逝，它只是不断地出生。',
    '你此刻的呼吸，也在这些数字之内。',
    '同一秒里，海岸线响起初啼，群山之间送别故人。',
    '每一次开始，都是告别留下的答案。',
  ],
  en: [
    'All things fade; all things begin.',
    'No one has ever seen time — only arrivals and farewells.',
    'Every second, someone opens their eyes for the first time, someone for the last.',
    'Billions of heartbeats make the single pulse of this planet.',
    'Time never flows away; it is born, again and again.',
    'The breath you just took is inside these numbers.',
    'In the same second: a first cry on some shore, a last farewell in some hills.',
    'Every beginning is the answer left behind by every farewell.',
  ],
  ja: [
    '万物は逝き、万物は始まる。',
    '時間を見た人はいない。見えるのは誕生と別れだけ。',
    '毎秒、誰かが初めて目を開き、誰かが最後に閉じる。',
    '幾億もの鼓動が、この星のただ一つの脈動になる。',
    '時間は流れない。ただ、何度も生まれ続ける。',
    '今あなたが吸った息も、この数字の中にある。',
    '同じ秒に、海岸では最初の産声が、山あいでは最後の別れが。',
    'すべての始まりは、すべての別れが残した答え。',
  ],
}

// 静默时刻(空格): line 为主句, sub 为恢复提示
export const PAUSE = {
  zh: {
    line: '此刻，世界仍在你停下的这一秒里继续。',
    sub: '再按一次空格，回到流动',
  },
  en: {
    line: 'The world goes on, inside the second you held still.',
    sub: 'Press space again to rejoin it',
  },
  ja: {
    line: '今、世界はあなたの止めた一秒の中で、続いています。',
    sub: 'もう一度スペースキーで、流れに戻る',
  },
}

// 会话里程碑低语: {b}/{d} 由真实会话计数填充
export const MILESTONES = [
  {
    at: 60,
    text: {
      zh: '这一分钟里，世界出生了 {b} 人，也送别了 {d} 人。一切如常，而一切继续。',
      en: 'In this minute, {b} lives began and {d} ended. All as ever — and all going on.',
      ja: 'この1分で、世界は{b}人の誕生と{d}人の別れを見送りました。いつも通りに、そして続いていく。',
    },
  },
  {
    at: 300,
    text: {
      zh: '五分钟。你几乎没动，世界却已完成 {b} 次开始与 {d} 次告别。',
      en: 'Five minutes. You barely moved; the world has already begun {b} lives and parted with {d}.',
      ja: '5分。あなたはほとんど動いていないのに、世界はもう{b}回の始まりと{d}回の別れを済ませました。',
    },
  },
  {
    at: 900,
    text: {
      zh: '十五分钟。你数得清的是 {b} 与 {d}；世界从不数，它只是继续。',
      en: 'Fifteen minutes. You could count {b} and {d}. The world never counts — it simply goes on.',
      ja: '15分。あなたに数えられたのは{b}と{d}。世界は数えない——ただ続いていく。',
    },
  },
]

export const fill = (tpl, b, d) => tpl.replaceAll('{b}', String(b)).replaceAll('{d}', String(d))
