const db = wx.cloud.database();
const todos = db.collection('todos');
const { dateFormat } = require('../../../../utils/base');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    todoGroups: {
      overdue: { title: '已逾期', todos: [], expanded: true, count: 0 },
      today: { title: '今天', todos: [], expanded: true, count: 0, dateInfo: '' },
      tomorrow: { title: '明天', todos: [], expanded: true, count: 0, dateInfo: '' },
      // 将单一future改为futureDates对象，支持多个未来日期
      futureDates: {},
      completed: { title: '已完成', todos: [], expanded: true, count: 0 },
    },
    loading: false,
    showForm: false,
    newTodo: {
      title: '',
      dueDate: null,
      dateType: 'today', // 新增：日期类型（today, tomorrow, future）
    },
    showDatePicker: false,
    editMode: false,
    currentTodoId: '',
    emptyTip: '暂无待办事项，点击下方按钮添加',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    this.updateDateInfo();
    this.loadTodos();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.updateDateInfo();
    this.loadTodos();
  },

  /**
   * 加载待办事项列表
   */
  loadTodos: function () {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getTodos',
      data: {},
      success: res => {
        const todos = res.result.data || [];
        // 按日期分组待办事项
        const groupResult = this.groupTodosByDate(todos);
        const { hasFutureTodos, sortedFutureDateKeys, ...todoGroups } = groupResult;

        this.setData(
          {
            todos: todos,
            todoGroups: todoGroups,
            hasFutureTodos: hasFutureTodos,
            sortedFutureDateKeys: sortedFutureDateKeys,
            loading: false,
          },
          () => {
            this.updateTodayUncompletedCount();
          },
        );
      },
      fail: err => {
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 按日期分组待办事项
   */
  groupTodosByDate: function (todos) {
    todos.forEach(todo => {
      if (todo.dueDate) {
        todo.formattedFullDate = this.formatFullDate(todo.dueDate);
      }
    });

    // 获取今天、明天的日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 初始化分组，保留原有的 dateInfo 字段
    const groups = {
      overdue: {
        title: '已逾期',
        todos: [],
        expanded: true,
        count: 0,
      },
      today: {
        title: '今天',
        todos: [],
        expanded: true,
        count: 0,
        dateInfo: this.data.todoGroups.today.dateInfo || '',
      },
      tomorrow: {
        title: '明天',
        todos: [],
        expanded: true,
        count: 0,
        dateInfo: this.data.todoGroups.tomorrow.dateInfo || '',
      },
      // 初始化 futureDates 为空对象，将在处理过程中填充
      futureDates: {},
      completed: { title: '已完成', todos: [], expanded: true, count: 0 },
    };

    // 分组待办事项
    todos.forEach(todo => {
      if (todo.completed) {
        groups.completed.todos.push(todo);
        groups.completed.count++;
        return;
      }

      if (!todo.dueDate) {
        // 没有日期的待办事项归为今天
        groups.today.todos.push(todo);
        groups.today.count++;
        return;
      }

      const dueDate = new Date(todo.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        groups.overdue.todos.push(todo);
        groups.overdue.count++;
        return;
      }

      if (dueDate.getTime() === today.getTime()) {
        groups.today.todos.push(todo);
        groups.today.count++;
      } else if (dueDate.getTime() === tomorrow.getTime()) {
        groups.tomorrow.todos.push(todo);
        groups.tomorrow.count++;
      } else if (dueDate > today) {
        // 处理未来日期 - 为每个不同的未来日期创建一个分组
        const dateStr = this.formatDate(dueDate); // 格式：YYYY-MM-DD

        // 如果这个日期还没有分组，创建一个新的分组
        if (!groups.futureDates[dateStr]) {
          groups.futureDates[dateStr] = {
            title: `${dateFormat(dueDate, 'M.d')} ${this.getWeekDay(dueDate)}`,
            todos: [],
            expanded: true,
            count: 0,
            date: dateStr,
          };
        }

        groups.futureDates[dateStr].todos.push(todo);
        groups.futureDates[dateStr].count++;
      }
    });

    Object.keys(groups).forEach(key => {
      if (key !== 'futureDates') {
        groups[key].todos.sort((a, b) => {
          return new Date(b.createTime) - new Date(a.createTime);
        });
      }
    });

    // 为 futureDates 中的每个日期分组排序
    Object.keys(groups.futureDates).forEach(dateStr => {
      groups.futureDates[dateStr].todos.sort((a, b) => {
        return new Date(b.createTime) - new Date(a.createTime);
      });
    });

    const hasFutureTodos = Object.keys(groups.futureDates).length > 0;

    // 对未来日期进行排序，按日期先后顺序
    const sortedFutureDateKeys = Object.keys(groups.futureDates).sort((a, b) => {
      return new Date(a) - new Date(b);
    });

    // 返回分组结果，由调用方统一处理数据更新
    return { ...groups, hasFutureTodos, sortedFutureDateKeys };
  },

  /**
   * 获取星期几
   */
  getWeekDay: function (date) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekDays[date.getDay()];
  },

  /**
   * 切换分组展开/折叠状态
   */
  toggleGroup: function (e) {
    const { group, date } = e.currentTarget.dataset;

    // 如果是未来日期分组，需要特殊处理
    if (group === 'futureDates' && date) {
      // 安全检查：确保该日期分组存在
      if (!this.data.todoGroups.futureDates || !this.data.todoGroups.futureDates[date]) {
        return;
      }

      const expanded = this.data.todoGroups.futureDates[date].expanded;

      this.setData({
        [`todoGroups.futureDates.${date}.expanded`]: !expanded,
      });
      return;
    }

    // 其他常规分组的处理
    if (!this.data.todoGroups || !this.data.todoGroups[group]) {
      return;
    }

    const expanded = this.data.todoGroups[group].expanded;

    this.setData({
      [`todoGroups.${group}.expanded`]: !expanded,
    });
  },

  /**
   * 切换待办事项状态
   */
  toggleTodoStatus: function (e) {
    const { id, completed } = e.currentTarget.dataset;

    todos.doc(id).update({
      data: {
        completed: !completed,
        updateTime: new Date(),
      },
      success: () => {
        wx.showToast({
          title: completed ? '已设为未完成' : '已完成',
          icon: 'success',
        });

        this.loadTodos();

        this.updateTodayUncompletedCount();
      },
      fail: err => {
        wx.showToast({
          title: '操作失败',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 删除待办事项
   */
  deleteTodo: function (e) {
    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个待办事项吗？',
      success: res => {
        if (res.confirm) {
          todos.doc(id).remove({
            success: () => {
              wx.showToast({
                title: '删除成功',
                icon: 'success',
              });

              this.loadTodos();
            },
            fail: err => {
              wx.showToast({
                title: '删除失败',
                icon: 'none',
              });
            },
          });
        }
      },
    });
  },

  /**
   * 显示添加待办事项表单
   */
  showAddForm: function () {
    // 默认设置为今天
    const today = this.formatDate(new Date());

    // 先设置弹窗可见但在底部
    this.setData({
      showForm: true,
      showDatePicker: false,
      editMode: false,
      currentTodoId: '',
      newTodo: {
        title: '',
        dueDate: today,
        dateType: 'today',
      },
      formAnimation: 'slide-in', // 添加入场动画类
    });
  },

  /**
   * 显示编辑待办事项表单
   */
  showEditForm: function (e) {
    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find(item => item._id === id);

    if (todo) {
      // 确定日期类型
      let dateType = 'future';
      if (todo.dueDate) {
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dueDate.getTime() === today.getTime()) {
          dateType = 'today';
        } else if (dueDate.getTime() === tomorrow.getTime()) {
          dateType = 'tomorrow';
        }
      }

      this.setData({
        showForm: true,
        showDatePicker: dateType === 'future',
        editMode: true,
        currentTodoId: id,
        formAnimation: 'slide-in', // 添加入场动画类
        newTodo: {
          title: todo.title,
          dueDate: todo.dueDate ? this.formatDate(todo.dueDate) : null,
          dateType: dateType,
        },
      });
    }
  },

  /**
   * 关闭表单
   */
  closeForm: function () {
    // 先添加离场动画
    this.setData({ formAnimation: 'slide-out' });

    // 等待动画完成后再隐藏表单
    setTimeout(() => {
      this.setData({ showForm: false });
    }, 300);
  },

  /**
   * 输入标题
   */
  onTitleInput: function (e) {
    this.setData({
      'newTodo.title': e.detail.value,
    });
  },

  /**
   * 选择日期类型
   */
  onDateTypeSelect: function (e) {
    const dateType = e.currentTarget.dataset.type;
    let dueDate = this.data.newTodo.dueDate;

    // 根据选择的日期类型设置日期
    if (dateType === 'today') {
      dueDate = this.formatDate(new Date());
    } else if (dateType === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = this.formatDate(tomorrow);
    }

    this.setData({
      'newTodo.dateType': dateType,
      'newTodo.dueDate': dueDate,
      showDatePicker: dateType === 'future',
    });
  },

  /**
   * 选择具体日期（日期选择器）
   */
  onDateChange: function (e) {
    this.setData({
      'newTodo.dueDate': e.detail.value,
    });
  },

  /**
   * 保存待办事项
   */
  saveTodo: function () {
    // 表单验证
    if (!this.data.newTodo.title.trim()) {
      wx.showToast({
        title: '请填写待办事项内容',
        icon: 'none',
      });
      return;
    }

    // 日期处理
    let dueDate = this.data.newTodo.dueDate;
    const dateType = this.data.newTodo.dateType;

    // 根据日期类型设置最终日期
    if (dateType === 'today') {
      dueDate = this.formatDate(new Date());
    } else if (dateType === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = this.formatDate(tomorrow);
    } else if (dateType === 'future' && !dueDate) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none',
      });
      return;
    }

    const todoData = {
      title: this.data.newTodo.title.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      updateTime: new Date(),
    };

    if (this.data.editMode) {
      todos.doc(this.data.currentTodoId).update({
        data: todoData,
        success: () => {
          wx.showToast({
            title: '更新成功',
            icon: 'success',
          });
          this.setData({ showForm: false });
          this.loadTodos();
        },
        fail: err => {
          wx.showToast({
            title: '更新失败',
            icon: 'none',
          });
        },
      });
    } else {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
        });
        return;
      }

      todos.add({
        data: {
          ...todoData,
          openid,
          completed: false,
          createTime: new Date(),
        },
        success: res => {
          wx.showToast({
            title: '添加成功',
            icon: 'success',
          });
          this.setData({ showForm: false });
          this.loadTodos();
        },
        fail: err => {
          wx.showToast({
            title: '添加失败',
            icon: 'none',
          });
        },
      });
    }
  },

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate: function (date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 格式化显示日期
   */
  formatDisplayDate: function (date) {
    return dateFormat(date, 'M.d');
  },

  /**
   * 格式化完整日期（年.月.日）
   */
  formatFullDate: function (date) {
    return dateFormat(date, 'yyyy.M.d');
  },

  /**
   * 更新日期信息
   */
  updateDateInfo: function () {
    const d = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    const todayInfo = `${dateFormat(d, 'M.d')} ${weekdays[d.getDay()]}`;

    const tomorrow = new Date(d);
    tomorrow.setDate(d.getDate() + 1);
    const tomorrowInfo = `${dateFormat(tomorrow, 'M.d')} ${weekdays[tomorrow.getDay()]}`;

    this.setData({
      'todoGroups.today.dateInfo': todayInfo,
      'todoGroups.tomorrow.dateInfo': tomorrowInfo,
    });
  },

  /**
   * 格式化显示日期和星期几
   */
  formatDateWithWeekday: function (dateType) {
    const d = new Date();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    if (dateType === 'today') {
      // 今天
      return `${dateFormat(d, 'M.d')} ${weekdays[d.getDay()]}`;
    } else if (dateType === 'tomorrow') {
      // 明天
      const tomorrow = new Date(d);
      tomorrow.setDate(d.getDate() + 1);
      return `${dateFormat(tomorrow, 'M.d')} ${weekdays[tomorrow.getDay()]}`;
    }
    return '';
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.loadTodos();
    wx.stopPullDownRefresh();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '待办清单',
      path: '/pages/index/components/todo/index',
    };
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    this.updateTodayUncompletedCount();
  },

  /**
   * 计算并更新今日未完成待办数量
   * 使用云函数更新，确保多设备数据一致性
   */
  updateTodayUncompletedCount: function () {
    // 这里不需要处理返回结果，因为首页会在显示时自动获取最新数量
    wx.cloud.callFunction({
      name: 'getTodos',
      data: {
        action: 'getTodayUncompletedCount',
      },
      success: res => {},
      fail: err => {},
    });
  },
});
