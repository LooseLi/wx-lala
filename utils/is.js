const isString = value => {
  return Object.prototype.toString.call(value) === '[object String]';
};

const isNumber = value => {
  return Object.prototype.toString.call(value) === '[object Number]';
};

const isDate = date => {
  return Object.prototype.toString.call(date) === '[object Date]';
};

module.exports = {
  isDate,
  isString,
  isNumber,
}