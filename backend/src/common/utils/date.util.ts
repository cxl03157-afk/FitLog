/**
 * JST (UTC+9) の今日の日付を YYYY-MM-DD 形式で返す。
 * new Date('YYYY-MM-DD') による UTC 解釈を介さず UTC+9 オフセットを直接計算する。
 */
export function getJstToday(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
