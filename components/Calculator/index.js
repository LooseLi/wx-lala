// 按键定义：5 列 × 4 行
const BUTTONS = [
  { label: '7', value: '7', type: 'number' },
  { label: '8', value: '8', type: 'number' },
  { label: '9', value: '9', type: 'number' },
  { label: '÷', value: '/', type: 'operator' },
  { label: '×', value: '*', type: 'operator' },
  { label: '4', value: '4', type: 'number' },
  { label: '5', value: '5', type: 'number' },
  { label: '6', value: '6', type: 'number' },
  { label: '−', value: '-', type: 'operator' },
  { label: '+', value: '+', type: 'operator' },
  { label: '1', value: '1', type: 'number' },
  { label: '2', value: '2', type: 'number' },
  { label: '3', value: '3', type: 'number' },
  { label: '0', value: '0', type: 'number' },
  { label: '.', value: '.', type: 'decimal' },
  { label: 'AC', value: 'clear', type: 'clear', wide: true },
  { label: '⌫', value: 'delete', type: 'delete' },
  { label: '=', value: '=', type: 'equals', wide: true },
];

// 运算符优先级
const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2 };

// 运算符显示标签
const OP_LABEL = { '+': '+', '-': '−', '*': '×', '/': '÷' };

// 调度场算法（Shunting-yard）求值，支持数学优先级
function evaluate(tokens) {
  const output = [];   // 输出队列（逆波兰表达式）
  const opStack = [];  // 运算符栈

  tokens.forEach(token => {
    if (typeof token === 'number') {
      output.push(token);
    } else {
      // 运算符：弹出优先级 >= 当前运算符的栈顶
      while (
        opStack.length > 0 &&
        PRECEDENCE[opStack[opStack.length - 1]] >= PRECEDENCE[token]
      ) {
        output.push(opStack.pop());
      }
      opStack.push(token);
    }
  });

  while (opStack.length > 0) output.push(opStack.pop());

  // 计算逆波兰表达式
  const calcStack = [];
  for (const token of output) {
    if (typeof token === 'number') {
      calcStack.push(token);
    } else {
      const b = calcStack.pop();
      const a = calcStack.pop();
      switch (token) {
        case '+': calcStack.push(a + b); break;
        case '-': calcStack.push(a - b); break;
        case '*': calcStack.push(a * b); break;
        case '/':
          if (b === 0) return null; // 除以零
          calcStack.push(a / b);
          break;
      }
    }
  }
  return calcStack[0];
}

// 浮点精度处理
function cleanNumber(n) {
  const str = n.toPrecision(12);
  return parseFloat(str);
}

function formatDisplay(display) {
  if (display === '错误') return display;
  if (display.endsWith('.')) return display;
  const num = parseFloat(display);
  if (isNaN(num)) return display;
  if (Math.abs(num) >= 1e9 || (Math.abs(num) < 1e-6 && num !== 0)) {
    return num.toExponential(4);
  }
  return display;
}

function getFontSize(len) {
  if (len <= 6) return 60;
  if (len <= 9) return 48;
  if (len <= 12) return 40;
  return 34;
}

// 根据 tokens 数组拼出表达式字符串（用于显示）
function buildExpressionStr(tokens) {
  return tokens
    .map(t => (typeof t === 'number' ? String(t) : OP_LABEL[t]))
    .join(' ');
}

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    buttons: BUTTONS,
    // 显示
    display: '0',
    displayStr: '0',
    expression: '',
    fontSize: 60,
    copied: false,
    // 表达式队列
    tokens: [],         // 完整操作序列，数字（Number）和运算符（string）交替
    pendingOp: '',      // 已选但尚未 push 进 tokens 的运算符
    justCalculated: false,  // 刚按过 =
  },

  methods: {
    onOverlayTap() {
      this.triggerEvent('close');
    },

    onKeyTap(e) {
      const value = e.currentTarget.dataset.value;

      if (value === 'clear') {
        this._reset();
        return;
      }

      if (value === 'delete') {
        this._handleDelete();
        return;
      }

      if (value === '.') {
        this._handleDecimal();
        return;
      }

      if (['0','1','2','3','4','5','6','7','8','9'].includes(value)) {
        this._handleDigit(value);
        return;
      }

      if (['+', '-', '*', '/'].includes(value)) {
        this._handleOperator(value);
        return;
      }

      if (value === '=') {
        this._handleEquals();
      }
    },

    _handleDigit(digit) {
      const { display, justCalculated, pendingOp } = this.data;

      if (justCalculated && !pendingOp) {
        // = 后直接输数字 → 从头开始，丢弃旧结果
        this._setDisplay(digit === '0' ? '0' : digit);
        this.setData({ tokens: [], pendingOp: '', justCalculated: false, expression: '' });
        return;
      }

      if (pendingOp) {
        // 刚选了运算符，开始输入下一个操作数
        this._setDisplay(digit === '0' ? '0' : digit);
        this.setData({ pendingOp: '' });
        return;
      }

      // 普通追加
      if (display === '0') {
        this._setDisplay(digit === '0' ? '0' : digit);
      } else {
        this._setDisplay(display + digit);
      }
      this.setData({ justCalculated: false });
    },

    _handleDecimal() {
      const { display, pendingOp, justCalculated } = this.data;

      if (pendingOp || (justCalculated && !this.data.tokens.length)) {
        this._setDisplay('0.');
        this.setData({ pendingOp: '', justCalculated: false });
        return;
      }

      if (!display.includes('.')) {
        this._setDisplay(display + '.');
      }
    },

    _handleDelete() {
      const { display } = this.data;
      if (display.length > 1) {
        this._setDisplay(display.slice(0, -1));
      } else {
        this._setDisplay('0');
      }
      // ⌫ 不影响 tokens 和 expression
    },

    _handleOperator(op) {
      const { display, tokens, justCalculated, pendingOp } = this.data;

      let newTokens;
      if (pendingOp) {
        // 连按运算符：替换最后那个运算符
        newTokens = [...tokens.slice(0, -1), op];
      } else {
        // 将当前显示的数字压入 tokens，再压运算符
        const num = parseFloat(display);
        if (justCalculated) {
          // = 之后按运算符：以结果为起点
          newTokens = [num, op];
        } else {
          newTokens = [...tokens, num, op];
        }
      }

      const exprStr = buildExpressionStr(newTokens);
      this._setDisplay(display);
      this.setData({
        tokens: newTokens,
        pendingOp: op,
        justCalculated: false,
        expression: exprStr,
      });
    },

    _handleEquals() {
      const { display, tokens, pendingOp } = this.data;
      if (!tokens.length) return;

      // 将当前 display 数字作为最后一个操作数
      const lastNum = parseFloat(display);
      const fullTokens = pendingOp
        ? [...tokens.slice(0, -1), lastNum]  // 末尾是运算符时，丢掉悬空运算符
        : [...tokens, lastNum];

      const rawResult = evaluate(fullTokens);

      if (rawResult === null) {
        // 除以零
        const exprStr = buildExpressionStr(fullTokens) + ' =';
        this.setData({ expression: exprStr });
        this._setDisplay('错误');
        this.setData({ tokens: [], pendingOp: '', justCalculated: true });
        return;
      }

      const result = cleanNumber(rawResult);
      const resultStr = String(result);
      const exprStr = buildExpressionStr(fullTokens) + ' =';

      this._setDisplay(resultStr);
      this.setData({
        tokens: [],
        pendingOp: '',
        justCalculated: true,
        expression: exprStr,
      });
    },

    onCopy() {
      const { display, justCalculated } = this.data;
      if (display === '0' && !justCalculated) return;
      const text = display === '错误' ? '' : display;
      wx.setClipboardData({
        data: text,
        success: () => {
          this.setData({ copied: true });
          setTimeout(() => this.setData({ copied: false }), 1500);
        },
      });
    },

    _reset() {
      this.setData({
        display: '0',
        displayStr: '0',
        expression: '',
        fontSize: 60,
        tokens: [],
        pendingOp: '',
        justCalculated: false,
        copied: false,
      });
    },

    _setDisplay(val) {
      const str = formatDisplay(val);
      this.setData({
        display: val,
        displayStr: str,
        fontSize: getFontSize(str.length),
      });
    },
  },
});
