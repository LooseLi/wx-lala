const IS = require('./is');

// 返回年月日时分秒
const timeFormat = date => {
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
};

/**
 * @param {*} time 时间戳|日期|字符串
 * @param {*} str yyyy-MM-dd --> 2022-07-25
 * @returns
 */
const dateFormat = (time, str) => {
  let t = time;
  if (!IS.isDate(time)) {
    if (IS.isNumber(time) || IS.isString(time)) {
      t = new Date(time);
    }
  }
  const obj = {
    yyyy: t.getFullYear(),
    yy: ('' + t.getFullYear()).slice(-2),
    M: t.getMonth() + 1,
    MM: ('0' + (t.getMonth() + 1)).slice(-2),
    d: t.getDate(),
    dd: ('0' + t.getDate()).slice(-2),
    H: t.getHours(),
    HH: ('0' + t.getHours()).slice(-2),
    h: t.getHours() % 12,
    hh: ('0' + (t.getHours() % 12)).slice(-2),
    m: t.getMinutes(),
    mm: ('0' + t.getMinutes()).slice(-2),
    s: t.getSeconds(),
    ss: ('0' + t.getSeconds()).slice(-2),
    w: ['日', '一', '二', '三', '四', '五', '六'][t.getDay()],
  };
  return str.replace(/([a-z]+)/gi, function ($1) {
    return obj[$1];
  });
};

/**
 * @param {*} time 时间差
 * @param {*} str
 * @returns
 */
const dateDiff = date => {
  // 将-转化为/，使用new Date
  const dateBegin = new Date(date.replace(/-/g, '/'));
  const currentDate = new Date();
  let dateDiff = currentDate.getTime() - dateBegin.getTime();
  let dayDiff = Math.floor(dateDiff / (24 * 3600 * 1000));
  return dayDiff;
  // var leave1 = dateDiff % (24 * 3600 * 1000) //计算天数后剩余的毫秒数
  // var hours = Math.floor(leave1 / (3600 * 1000)) //计算出小时数
  // //计算相差分钟数
  // var leave2 = leave1 % (3600 * 1000) //计算小时数后剩余的毫秒数
  // var minutes = Math.floor(leave2 / (60 * 1000)) //计算相差分钟数
  // //计算相差秒数
  // var leave3 = leave2 % (60 * 1000) //计算分钟数后剩余的毫秒数
  // var seconds = Math.round(leave3 / 1000)
};

module.exports = {
  dateFormat,
  dateDiff,
};
