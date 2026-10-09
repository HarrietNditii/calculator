const HISTORY_KEY = "calculated.history.v1";
const THEME_KEY = "calculated.theme.v1";
const MAX_HISTORY_ITEMS = 30;

/**
 * Turn a user-entered expression into a number without executing JavaScript.
 * This small recursive-descent parser supports +, -, *, /, parentheses, and %.
 */
export function evaluateExpression(source) {
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Enter an expression first.");
  }

  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function parseExpression() {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (peek() === "*" || peek() === "/") {
      const operator = take();
      const right = parseUnary();
      if (operator === "/" && right === 0) {
        throw new Error("Cannot divide by zero.");
      }
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseUnary() {
    if (peek() === "+") {
      take();
      return parseUnary();
    }
    if (peek() === "-") {
      take();
      return -parseUnary();
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let value = parsePrimary();
    while (peek() === "%") {
      take();
      value /= 100;
    }
    return value;
  }

  function parsePrimary() {
    const token = take();
    if (token === "(") {
      const value = parseExpression();
      if (take() !== ")") {
        throw new Error("Add a closing parenthesis.");
      }
      return value;
    }
    if (typeof token === "number") return token;
    throw new Error("That expression is incomplete or invalid.");
  }

  const value = parseExpression();
  if (position !== tokens.length) {
    throw new Error("Check the expression and try again.");
  }
  if (!Number.isFinite(value)) {
    throw new Error("The result is too large to display.");
  }
  return cleanNumber(value);
}

/** Tokenize only supported math characters; anything else is rejected. */
function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1;
      continue;
    }
    const rest = source.slice(index);
    const numberMatch = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (numberMatch) {
      const number = Number(numberMatch[0]);
      if (!Number.isFinite(number)) throw new Error("That number is too large.");
      tokens.push(number);
      index += numberMatch[0].length;
      continue;
    }
    const character = source[index];
    if ("+-*/()%".includes(character)) {
      tokens.push(character);
      index += 1;
      continue;
    }
    throw new Error("Only numbers and basic math operators are supported.");
  }
  return tokens;
}

/** Remove floating-point noise and normalize negative zero for display. */
export function cleanNumber(value) {
  const cleaned = Number(value.toPrecision(14));
  return Object.is(cleaned, -0) ? 0 : cleaned;
}

/** Map a physical key to the same actions used by the on-screen buttons. */
export function getKeyboardAction(key, shiftKey = false) {
  if (shiftKey && key === "8") return { type: "input", value: "*" };
  if (shiftKey && key === "9") return { type: "input", value: "(" };
  if (shiftKey && key === "0") return { type: "input", value: ")" };
  if (/^\d$/.test(key) || [".", "+", "-", "*", "/", "%", "(", ")"].includes(key)) {
    return { type: "input", value: key };
  }
  if (key === "Enter" || key === "=") return { type: "equals" };
  if (key === "Backspace") return { type: "backspace" };
  if (key === "Escape") return { type: "clear" };
  return null;
}

/** Safe localStorage wrapper; pass a Storage-like object to test without a browser. */
export function createHistoryStore(storage, key = HISTORY_KEY) {
  function read() {
    try {
      const stored = JSON.parse(storage.getItem(key) || "[]");
      return Array.isArray(stored)
        ? stored.filter((item) => item && typeof item.expression === "string" && Number.isFinite(item.result)).slice(0, MAX_HISTORY_ITEMS)
        : [];
    } catch {
      return [];
    }
  }

  return {
    read,
    add(expression, result) {
      const next = [{ expression, result, id: `${Date.now()}-${Math.random()}` }, ...read()].slice(0, MAX_HISTORY_ITEMS);
      try { storage.setItem(key, JSON.stringify(next)); } catch { /* Storage can be unavailable in private browsing. */ }
      return next;
    },
    clear() {
      try { storage.removeItem(key); } catch { /* Clearing history must never interrupt calculation. */ }
    },
  };
}

/** Persist a user's theme choice while falling back cleanly if storage is blocked. */
export function createThemeStore(storage, key = THEME_KEY) {
  return {
    read() {
      try { return storage.getItem(key) === "dark" ? "dark" : "light"; }
      catch { return "light"; }
    },
    write(theme) {
      try { storage.setItem(key, theme); } catch { /* The theme still changes for this visit. */ }
    },
  };
}

function initializeCalculator() {
  const expressionDisplay = document.querySelector("#expression-display");
  if (!expressionDisplay) return;

  const previousDisplay = document.querySelector("#previous-operation");
  const previewDisplay = document.querySelector("#result-preview");
  const statusMessage = document.querySelector("#status-message");
  const historyList = document.querySelector("#history-list");
  const emptyHistory = document.querySelector("#empty-history");
  const clearHistoryButton = document.querySelector("#clear-history");
  const themeButton = document.querySelector("#theme-toggle");
  const copyButton = document.querySelector("#copy-result");
  // Storage access itself can throw in browser privacy modes, so guard the getter too.
  let storage;
  try { storage = window.localStorage; }
  catch {
    const fallback = new Map();
    storage = {
      getItem: (key) => fallback.get(key) ?? null,
      setItem: (key, value) => fallback.set(key, String(value)),
      removeItem: (key) => fallback.delete(key),
    };
  }
  const history = createHistoryStore(storage);
  const theme = createThemeStore(storage);
  let expression = "";
  let justCalculated = false;

  function updateDisplay() {
    expressionDisplay.textContent = expression || "0";
    previewDisplay.textContent = "";
    if (!expression) return;
    try {
      previewDisplay.textContent = `= ${formatNumber(evaluateExpression(expression))}`;
    } catch {
      // Incomplete input is normal while typing, so keep the preview blank.
    }
  }

  function setMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", isError);
  }

  function formatNumber(number) {
    return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 14 }).format(number);
  }

  function renderHistory() {
    const items = history.read();
    historyList.replaceChildren();
    emptyHistory.hidden = items.length > 0;
    clearHistoryButton.disabled = items.length === 0;
    items.forEach((item) => {
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";
      button.dataset.result = String(item.result);
      button.setAttribute("aria-label", `Reuse result ${formatNumber(item.result)} from ${item.expression}`);
      const calculation = document.createElement("span");
      calculation.className = "history-expression";
      calculation.textContent = item.expression;
      const answer = document.createElement("span");
      answer.className = "history-result";
      answer.textContent = `= ${formatNumber(item.result)}`;
      button.append(calculation, answer);
      row.append(button);
      historyList.append(row);
    });
  }

  function appendInput(value) {
    setMessage("Tip: use your keyboard, too.");
    if (justCalculated && (/^\d$/.test(value) || value === "." || value === "(")) expression = "";
    justCalculated = false;

    const last = expression.at(-1) || "";
    const isDigit = /^\d$/.test(value);
    if (isDigit || value === ".") {
      if ((last === ")" || last === "%") && isDigit) expression += "*";
      if (value === ".") {
        const trailingNumber = expression.match(/(?:^|[+\-*/(])(-?(?:\d+\.?\d*|\.\d+))$/)?.[1] || "";
        if (trailingNumber.includes(".")) return;
        if (!trailingNumber) expression += "0";
      }
      expression += value;
      updateDisplay();
      return;
    }

    if (value === "(") {
      if (/\d|\)|%/.test(last)) expression += "*";
      expression += value;
    } else if (value === ")") {
      const opens = (expression.match(/\(/g) || []).length;
      const closes = (expression.match(/\)/g) || []).length;
      if (opens <= closes || !(/[\d)%]$/.test(expression))) return;
      expression += value;
    } else if (value === "%") {
      if (!/[\d)]$/.test(expression)) return;
      expression += value;
    } else if (["+", "-", "*", "/"].includes(value)) {
      if (!expression && value !== "-") return;
      if (/[+\-*/]$/.test(expression)) {
        const previous = expression.at(-1);
        const isUnaryMinus = previous === "-" && (expression.length === 1 || /[+\-*/(]$/.test(expression.slice(0, -1)));
        if (value === "-" && !isUnaryMinus) expression += value;
        else if (isUnaryMinus) {
          if (expression.length === 1) return;
          expression = expression.slice(0, -2) + value;
        } else {
          expression = expression.slice(0, -1) + value;
        }
      } else {
        expression += value;
      }
    }
    updateDisplay();
  }

  function toggleSign() {
    setMessage("Tip: use your keyboard, too.");
    const match = expression.match(/-?(?:\d+\.?\d*|\.\d+)$/);
    if (!match) {
      if (!expression || /[+\-*/(]$/.test(expression)) expression += "-";
      updateDisplay();
      return;
    }
    const start = match.index;
    const hasLeadingMinus = match[0].startsWith("-");
    const before = expression.slice(0, start);
    const unaryMinus = hasLeadingMinus && (!before || /[+\-*/(]$/.test(before));
    expression = unaryMinus
      ? before + match[0].slice(1)
      : before + (/[+\-*/(]$/.test(before) || !before ? "-" : "(-") + match[0] + (/[+\-*/(]$/.test(before) || !before ? "" : ")");
    updateDisplay();
  }

  function calculate() {
    if (!expression) return;
    try {
      const original = expression;
      const result = evaluateExpression(expression);
      previousDisplay.textContent = `${original} =`;
      expression = String(result);
      justCalculated = true;
      history.add(original, result);
      renderHistory();
      updateDisplay();
      setMessage("Result calculated.");
    } catch (error) {
      setMessage(error.message || "That expression could not be calculated.", true);
    }
  }

  function clearAll() {
    expression = "";
    justCalculated = false;
    previousDisplay.textContent = "Ready when you are";
    updateDisplay();
    setMessage("Cleared. Start a new calculation.");
  }

  function backspace() {
    expression = expression.slice(0, -1);
    justCalculated = false;
    updateDisplay();
    setMessage("Deleted the last character.");
  }

  function applyTheme(nextTheme) {
    document.documentElement.dataset.theme = nextTheme;
    const dark = nextTheme === "dark";
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} theme`);
    themeButton.querySelector(".theme-icon").textContent = dark ? "☀" : "☾";
    themeButton.querySelector(".theme-label").textContent = dark ? "Light mode" : "Dark mode";
    theme.write(nextTheme);
  }

  async function copyResult() {
    let text = expression;
    try { text = formatNumber(evaluateExpression(expression)); } catch { /* Copy the current input if it is not yet a result. */ }
    if (!text) {
      setMessage("There is nothing to copy yet.", true);
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement("textarea");
        field.value = text;
        field.setAttribute("readonly", "");
        field.className = "clipboard-fallback";
        document.body.append(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Copy is not available in this browser.");
      }
      setMessage(`Copied ${text} to clipboard.`);
    } catch {
      setMessage("Copy is not available. Select the result to copy it.", true);
    }
  }

  document.querySelector(".keypad").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.action === "equals") calculate();
    else if (button.dataset.action === "backspace") backspace();
    else if (button.dataset.action === "clear") clearAll();
    else if (button.dataset.action === "sign") toggleSign();
    else if (button.dataset.key) appendInput(button.dataset.key);
  });

  document.addEventListener("keydown", (event) => {
    const action = getKeyboardAction(event.key, event.shiftKey);
    if (!action) return;
    event.preventDefault();
    if (action.type === "input") appendInput(action.value);
    else if (action.type === "equals") calculate();
    else if (action.type === "backspace") backspace();
    else if (action.type === "clear") clearAll();
  });

  historyList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-result]");
    if (!button) return;
    expression = button.dataset.result;
    justCalculated = true;
    updateDisplay();
    setMessage("Previous result ready to use.");
  });
  clearHistoryButton.addEventListener("click", () => {
    history.clear();
    renderHistory();
    setMessage("Calculation history cleared.");
  });
  themeButton.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  copyButton.addEventListener("click", copyResult);

  applyTheme(theme.read());
  renderHistory();
  updateDisplay();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCalculator, { once: true });
  } else {
    initializeCalculator();
  }
}
