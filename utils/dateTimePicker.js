function withData(param) {
  return param < 10 ? '0' + param : '' + param;
}

function getLoopArray(start, end) {
  var start = start || 0;
  var end = end || 1;
  var array = [];
  for (var i = start; i <= end; i++) {
    array.push(withData(i));
  }
  return array;
}

function getMonthDay(year, month) {
  var flag = year % 400 == 0 || (year % 4 == 0 && year % 100 != 0),
    array = null;
  switch (month) {
    case '01':
    case '03':
    case '05':
    case '07':
    case '08':
    case '10':
    case '12':
      array = getLoopArray(1, 31)
      break;
    case '04':
    case '06':
    case '09':
    case '11':
      array = getLoopArray(1, 30)
      break;
    case '02':
      array = flag ? getLoopArray(1, 29) : getLoopArray(1, 28)
      break;
    default:
      array = '月份格式不正确，请重新输入！'
  }
  return array;
}

function getNewDateArry() { //如果dateTimePicker的date不可能为空，此处可以省略
  // 当前时间的处理
  var newDate = new Date();
  var year = withData(newDate.getFullYear()),
    mont = withData(newDate.getMonth() + 1),
    date = withData(newDate.getDate()),
    hour = withData(newDate.getHours()),
    minu = withData(newDate.getMinutes()),
    seco = withData(newDate.getSeconds());

  // return [year, '年', mont, '月', date, '日', hour, ':', minu, ':', seco];
  return [year, '年', mont, '月', date, '日', hour, '时'];
}

function getcurrent(date) {
  const defaultTime = date.replace(/-/g, '/') + ':00:00';
  var d = new Date(defaultTime);
  var year = withData(d.getFullYear()),
    month = withData(d.getMonth() + 1),
    dat = withData(d.getDate()),
    hour = withData(d.getHours()),
    minu = withData(d.getMinutes()),
    seco = withData(d.getSeconds());
  // return [year, '年', month, '月', dat, '日', hour, ':', minu, ':', seco]
  return [year, '年', month, '月', dat, '日', hour, '时']
}

function dateTimePicker(startYear, endYear, date) {
  var datearr = [];
  if (date) {
    datearr = getcurrent(date);
  }
  // 返回默认显示的数组和联动数组的声明
  var dateTime = [],
    dateTimeArray = [
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      []
    ];
  var start = startYear || 1978;
  var end = endYear || 2100;
  // 默认开始显示数据
  var defaultDate = date ? datearr : getNewDateArry();
  // 处理联动列表数据
  /*年月日 时分*/
  dateTimeArray[0] = getLoopArray(start, end);
  dateTimeArray[1] = ['年'];
  dateTimeArray[2] = getLoopArray(1, 12);
  dateTimeArray[3] = ['月'];
  dateTimeArray[4] = getMonthDay(defaultDate[0], defaultDate[2]);
  dateTimeArray[5] = ['日'];
  dateTimeArray[6] = getLoopArray(0, 23);
  dateTimeArray[7] = ['时'];
  // dateTimeArray[7] = [':'];
  // dateTimeArray[8] = getLoopArray(0, 59);
  // dateTimeArray[9] = [':'];
  // dateTimeArray[10] = getLoopArray(0, 59);

  dateTimeArray.forEach((current, index) => {
    dateTime.push(current.indexOf(defaultDate[index]));
  });

  return {
    dateTimeArray: dateTimeArray,
    dateTime: dateTime
  }
}
module.exports = {
  dateTimePicker: dateTimePicker,
  getMonthDay: getMonthDay
}