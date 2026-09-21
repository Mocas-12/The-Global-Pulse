// humanize.js — 会话净增数的人类尺度换算
export function scaleAnalogy(n, t) {
  if (n < 30) return null
  const rungs = [
    [1e6, t.cityMillion],
    [5e4, t.stadium],
    [5e3, t.cruise],
    [800, t.school],
    [30, t.classroom],
  ]
  for (const [min, word] of rungs) {
    if (n >= min) return word
  }
  return null
}
