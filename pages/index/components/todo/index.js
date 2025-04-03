const db = wx.cloud.database();
const todos = db.collection('todos');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    todoGroups: {
      today: { title: '今天', todos: [], expanded: true, count: 0 },
      tomorrow: { title: '明天', todos: [], expanded: true, count: 0 },
      future: { title: '', todos: [], expanded: true, count: 0, date: '' },
      completed: { title: '已完成', todos: [], expanded: true, count: 0 },
    },
    loading: false,
    showForm: false,
    newTodo: {
      title: '',
      dueDate: null,
      dateType: 'today', // 新增：日期类型（today, tomorrow, future）
    },
    showDatePicker: false, // 新增：是否显示日期选择器
    editMode: false,
    currentTodoId: '',
    emptyTip: '暂无待办事项，点击下方按钮添加',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: async function (options) {
    this.loadTodos();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
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
        const todoGroups = this.groupTodosByDate(todos);

        this.setData({
          todos: todos,
          todoGroups: todoGroups,
          loading: false,
        });
      },
      fail: err => {
        console.error('获取待办事项失败:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 切换待办事项状态
   */
  /**
   * 按日期分组待办事项
   */
  groupTodosByDate: function (todos) {
    // 获取今天、明天的日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 初始化分组
    const groups = {
      today: { title: '今天', todos: [], expanded: true, count: 0 },
      tomorrow: { title: '明天', todos: [], expanded: true, count: 0 },
      future: { title: '', todos: [], expanded: true, count: 0, date: '' },
      completed: { title: '已完成', todos: [], expanded: true, count: 0 },
    };

    // 未来日期的待办事项
    let futureDate = null;

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

      if (dueDate.getTime() === today.getTime()) {
        groups.today.todos.push(todo);
        groups.today.count++;
      } else if (dueDate.getTime() === tomorrow.getTime()) {
        groups.tomorrow.todos.push(todo);
        groups.tomorrow.count++;
      } else if (dueDate > today) {
        // 如果有多个未来日期，只显示最近的一个
        if (!futureDate || dueDate < futureDate) {
          futureDate = dueDate;
          groups.future.date = this.formatDate(dueDate);
          groups.future.title = `${dueDate.getMonth() + 1}月${dueDate.getDate()}日 ${this.getWeekDay(dueDate)}`;
        }

        if (dueDate.getTime() === futureDate.getTime()) {
          groups.future.todos.push(todo);
          groups.future.count++;
        }
      }
    });

    // 排序：按创建时间降序
    Object.keys(groups).forEach(key => {
      groups[key].todos.sort((a, b) => {
        return new Date(b.createTime) - new Date(a.createTime);
      });
    });

    // 返回分组结果，由调用方统一处理数据更新
    return groups;
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
    console.log('toggleGroup', e.currentTarget.dataset);
    const { group } = e.currentTarget.dataset;

    // 安全检查：确保组数据存在
    if (!this.data.todoGroups || !this.data.todoGroups[group]) {
      console.warn(`组 ${group} 不存在或未初始化`);
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

        // 重新加载数据以更新分组
        this.loadTodos();
      },
      fail: err => {
        console.error('更新状态失败:', err);
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

              // 重新加载数据
              this.loadTodos();
            },
            fail: err => {
              console.error('删除失败:', err);
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
    this.setData({ showForm: false });
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
      // 更新现有待办事项
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
          console.error('更新失败:', err);
          wx.showToast({
            title: '更新失败',
            icon: 'none',
          });
        },
      });
    } else {
      // 添加新待办事项
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
        });
        return;
      }

      // 添加到数据库
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
          console.error('添加失败:', err);
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
    const d = new Date(date);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
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
});
