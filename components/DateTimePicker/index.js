var dateTimePicker = require('../../utils/dateTimePicker.js') //引入外部的js工具类
const mydate = new Date();
const app = getApp();

Component({
  properties: {
    // time: {
    //   type: String,
    //   value: '',
    //   observer(value) {
    //     if (value) {
    //       this.setData({
    //         currentTime: value
    //       });
    //     } else {
    //       this.setData({
    //         currentTime: mydate.toLocaleDateString() + ' ' + mydate.getHours() + ':' + mydate.getMinutes()
    //       });
    //     }
    //   }
    // }
  },
  data: {
    dateTimeArray: null,
    dateTime: null,
    startYear: 2016,
    endYear: 2040,
    //  + ':' + mydate.getSeconds()
    currentTime: mydate.toLocaleDateString() + ' ' + mydate.getHours() + ':' + mydate.getMinutes()
  },
  methods: {
    pickerTap: function (e) {
      var obj = dateTimePicker.dateTimePicker(this.data.startYear, this.data.endYear, this.data.currentTime);
      console.log(obj.dateTimeArray)
      this.setData({
        dateTimeArray: obj.dateTimeArray,
        dateTime: obj.dateTime
      });
    },
    changeDateTime(e) {
      console.log(e);
      var dateTimeArray = this.data.dateTimeArray,
        dateTime = e.detail.value;
      this.setData({
        // dateTime: e.detail.value,
        // currentTime: dateTimeArray[0][dateTime[0]] + '-' + dateTimeArray[2][dateTime[2]] + '-' + dateTimeArray[4][dateTime[4]] + ' ' + dateTimeArray[6][dateTime[6]] + ':' + dateTimeArray[8][dateTime[8]] + ':' + dateTimeArray[10][dateTime[10]]
        currentTime: dateTimeArray[0][dateTime[0]] + '-' + dateTimeArray[2][dateTime[2]] + '-' + dateTimeArray[4][dateTime[4]] + ' ' + dateTimeArray[6][dateTime[6]] + ':' + dateTimeArray[8][dateTime[8]]
      });
      // this.triggerEvent('changeTime', {
      //   remindTime: this.data.currentTime
      // });
      app.getTopPages().setData({
        todoTime: this.data.currentTime
      });
    },
    changeDateTimeColumn(e) {
      var arr = this.data.dateTime,
        dateArr = this.data.dateTimeArray;
      arr[e.detail.column] = e.detail.value;
      dateArr[4] = dateTimePicker.getMonthDay(dateArr[0][arr[0]], dateArr[2][arr[2]]);
      this.setData({
        dateTimeArray: dateArr,
        dateTime: arr
      });
    }
  },
})