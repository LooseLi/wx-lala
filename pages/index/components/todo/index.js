const db = wx.cloud.database();
const todos = db.collection('todos');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    todos: [],
    loading: false,
    showForm: false,
    newTodo: {
      title: '',
      description: '',
      priority: 2, // 默认中优先级
      category: '默认',
      dueDate: null,
    },
    categories: ['默认', '工作', '生活', '学习', '其他'],
    categoryIndex: 0,
    priorities: ['高', '中', '低'],
    priorityIndex: 1, // 默认中优先级
    statusOptions: ['全部', '未完成', '已完成'],
    statusIndex: 0,
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

    // 构建查询条件
    const queryData = {};

    // 根据状态筛选
    if (this.data.statusIndex > 0) {
      queryData.status = this.data.statusIndex === 1 ? false : true;
    }

    // 根据分类筛选
    if (this.data.categoryIndex > 0) {
      queryData.category = this.data.categories[this.data.categoryIndex];
    }

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getTodos',
      data: queryData,
      success: res => {
        this.setData({
          todos: res.result.data || [],
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
  toggleTodoStatus: function (e) {
    const { id, completed } = e.currentTarget.dataset;

    todos.doc(id).update({
      data: {
        completed: !completed,
        updateTime: new Date(),
      },
      success: () => {
        // 更新本地数据
        const todoList = this.data.todos.map(todo => {
          if (todo._id === id) {
            return { ...todo, completed: !completed };
          }
          return todo;
        });

        this.setData({ todos: todoList });

        wx.showToast({
          title: completed ? '已设为未完成' : '已完成',
          icon: 'success',
        });
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
              // 更新本地数据
              const todoList = this.data.todos.filter(todo => todo._id !== id);
              this.setData({ todos: todoList });

              wx.showToast({
                title: '删除成功',
                icon: 'success',
              });
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
    this.setData({
      showForm: true,
      editMode: false,
      currentTodoId: '',
      newTodo: {
        title: '',
        description: '',
        priority: 2,
        category: '默认',
        dueDate: null,
      },
      categoryIndex: 0,
      priorityIndex: 1,
    });
  },

  /**
   * 显示编辑待办事项表单
   */
  showEditForm: function (e) {
    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find(item => item._id === id);

    if (todo) {
      // 找到分类索引
      const categoryIndex = this.data.categories.findIndex(cat => cat === todo.category);

      // 找到优先级索引
      const priorityIndex = todo.priority - 1;

      this.setData({
        showForm: true,
        editMode: true,
        currentTodoId: id,
        newTodo: {
          title: todo.title,
          description: todo.description || '',
          priority: todo.priority,
          category: todo.category,
          dueDate: todo.dueDate ? this.formatDate(todo.dueDate) : null,
        },
        categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
        priorityIndex: priorityIndex >= 0 ? priorityIndex : 1,
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
   * 输入描述
   */
  onDescriptionInput: function (e) {
    this.setData({
      'newTodo.description': e.detail.value,
    });
  },

  /**
   * 选择分类
   */
  onCategoryChange: function (e) {
    const index = parseInt(e.detail.value);
    this.setData({
      categoryIndex: index,
      'newTodo.category': this.data.categories[index],
    });
  },

  /**
   * 选择优先级
   */
  onPriorityChange: function (e) {
    const index = parseInt(e.detail.value);
    this.setData({
      priorityIndex: index,
      'newTodo.priority': index + 1, // 优先级从1开始
    });
  },

  /**
   * 选择截止日期
   */
  onDateChange: function (e) {
    this.setData({
      'newTodo.dueDate': e.detail.value,
    });
  },

  /**
   * 选择状态筛选
   */
  onStatusFilterChange: function (e) {
    this.setData(
      {
        statusIndex: parseInt(e.detail.value),
      },
      this.loadTodos,
    );
  },

  /**
   * 选择分类筛选
   */
  onCategoryFilterChange: function (e) {
    this.setData(
      {
        categoryIndex: parseInt(e.detail.value),
      },
      this.loadTodos,
    );
  },

  /**
   * 保存待办事项
   */
  saveTodo: function () {
    // 表单验证
    if (!this.data.newTodo.title.trim()) {
      wx.showToast({
        title: '请填写待办事项标题',
        icon: 'none',
      });
      return;
    }

    const todoData = {
      title: this.data.newTodo.title.trim(),
      description: this.data.newTodo.description.trim(),
      priority: this.data.newTodo.priority,
      category: this.data.newTodo.category,
      dueDate: this.data.newTodo.dueDate ? new Date(this.data.newTodo.dueDate) : null,
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
