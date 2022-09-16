// 日期格式化
const dateFormat = (date) => {
  const y = date.getFullYear();
  let m = date.getMonth() + 1;
  m = m <= 9 ? '0' + m : m;
  let d = date.getDate();
  d = d <= 9 ? '0' + d : d;
  let h = date.getHours();
  h = h <= 9 ? '0' + h : h;
  let min = date.getMinutes();
  min = min <= 9 ? '0' + min : min;
  let s = date.getSeconds();
  s = s <= 9 ? '0' + s : s;
  return {
    y,
    m,
    d,
    h,
    min,
    s,
  };
}

module.exports = {
  dateFormat
}