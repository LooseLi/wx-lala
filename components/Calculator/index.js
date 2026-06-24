// 按键定义：5 列 × 4 行，与 demo/calculator 保持一致
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

function calculate(a, op, b) {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  let result;
  switch (op) {
    case '+': result = numA + numB; break;
    case '-': result = numA - numB; break;
    case '*': result = numA * numB; break;
    case '/':
      if (numB === 0) return '错误';
      result = numA / numB;
      break;
    default: return b;
  }
  const resultStr = result.toPrecision(12);
  return String(parseFloat(resultStr));
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

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    buttons: BUTTONS,
    display: '0',
    displayStr: '0',
    expression: '',
    prevValue: null,
    operator: null,
    waiting: false,
    justCalculated: false,
    fontSize: 60,
    copied: false,
  },

  methods: {
    onOverlayTap() {
      this.triggerEvent('close');
    },

    onKeyTap(e) {
      const value = e.currentTarget.dataset.value;
      const {
        display,
        expression,
        prevValue,
        operator,
        waiting,
        justCalculated,
      } = this.data;

      if (value === 'clear') {
        this._reset();
        return;
      }

      if (value === 'delete') {
        if (display.length > 1) {
          this._setDisplay(display.slice(0, -1));
        } else {
          this._setDisplay('0');
        }
        return;
      }

      if (value === '.') {
        if (waiting) {
          this._setDisplay('0.');
          this.setData({ waiting: false });
          return;
        }
        if (!display.includes('.')) {
          this._setDisplay(display + '.');
        }
        return;
      }

      // 数字
      if (['0','1','2','3','4','5','6','7','8','9'].includes(value)) {
        if (waiting || justCalculated) {
          this._setDisplay(value);
          this.setData({ waiting: false, justCalculated: false });
        } else if (display === '0') {
          this._setDisplay(value);
        } else {
          this._setDisplay(display + value);
        }
        return;
      }

      // 运算符
      if (['+', '-', '*', '/'].includes(value)) {
        let newDisplay = display;
        if (operator && !waiting && prevValue !== null) {
          newDisplay = calculate(prevValue, operator, display);
          this._setDisplay(newDisplay);
        }
        const opLabel = { '+': '+', '-': '−', '*': '×', '/': '÷' }[value];
        this.setData({
          prevValue: newDisplay,
          operator: value,
          waiting: true,
          justCalculated: false,
          expression: newDisplay + ' ' + opLabel,
        });
        return;
      }

      // 等号
      if (value === '=') {
        if (!operator || prevValue === null) return;
        const result = calculate(prevValue, operator, display);
        const opLabel = { '+': '+', '-': '−', '*': '×', '/': '÷' }[operator];
        this._setDisplay(result);
        this.setData({
          expression: prevValue + ' ' + opLabel + ' ' + display + ' =',
          prevValue: null,
          operator: null,
          waiting: false,
          justCalculated: true,
        });
      }
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
        prevValue: null,
        operator: null,
        waiting: false,
        justCalculated: false,
        fontSize: 60,
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
