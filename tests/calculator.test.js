import test from "node:test";
import assert from "node:assert/strict";
import {
  createHistoryStore,
  createThemeStore,
  evaluateExpression,
  getKeyboardAction,
} from "../js/calculator.js";

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

test("basic arithmetic operations", () => {
  assert.equal(evaluateExpression("2 + 3"), 5);
  assert.equal(evaluateExpression("10 - 4"), 6);
  assert.equal(evaluateExpression("6 * 7"), 42);
  assert.equal(evaluateExpression("20 / 5"), 4);
});

test("decimal math avoids familiar floating-point display artifacts", () => {
  assert.equal(evaluateExpression("0.1 + 0.2"), 0.3);
  assert.equal(evaluateExpression("1 / 3"), Number((1 / 3).toPrecision(14)));
});

test("negative values and unary signs are supported", () => {
  assert.equal(evaluateExpression("-5"), -5);
  assert.equal(evaluateExpression("-(2 + 3)"), -5);
  assert.equal(evaluateExpression("1--2"), 3);
});

test("percent is a postfix percentage", () => {
  assert.equal(evaluateExpression("50%"), 0.5);
  assert.equal(evaluateExpression("200 * 10%"), 20);
  assert.equal(evaluateExpression("(80 + 20)%"), 1);
});

test("parentheses and standard operator precedence are respected", () => {
  assert.equal(evaluateExpression("2 + 3 * 4"), 14);
  assert.equal(evaluateExpression("(2 + 3) * 4"), 20);
  assert.equal(evaluateExpression("8 / 2 * (2 + 2)"), 16);
});

test("scientific functions use degrees by default and support radians", () => {
  assert.equal(evaluateExpression("sin(30)"), 0.5);
  assert.equal(evaluateExpression("cos(60)"), 0.5);
  assert.equal(evaluateExpression("tan(45)"), 1);
  assert.equal(evaluateExpression("sin(180)"), 0);
  assert.equal(evaluateExpression("cos(90)"), 0);
  assert.equal(evaluateExpression("sin(pi / 2)", { angleMode: "RAD" }), 1);
  assert.equal(evaluateExpression("asin(1)"), 90);
  assert.equal(evaluateExpression("atan(1)", { angleMode: "RAD" }), Number((Math.PI / 4).toPrecision(14)));
});

test("scientific logarithms, roots, absolute values, and reciprocals work", () => {
  assert.equal(evaluateExpression("sqrt(81)"), 9);
  assert.equal(evaluateExpression("ln(e)"), 1);
  assert.equal(evaluateExpression("log(1000)"), 3);
  assert.equal(evaluateExpression("abs(-12)"), 12);
  assert.equal(evaluateExpression("inv(4)"), 0.25);
});

test("scientific constants, implicit multiplication, powers, and factorial work", () => {
  assert.equal(evaluateExpression("2pi"), Number((2 * Math.PI).toPrecision(14)));
  assert.equal(evaluateExpression("2(3 + 4)"), 14);
  assert.equal(evaluateExpression("2^3^2"), 512);
  assert.equal(evaluateExpression("-2^2"), -4);
  assert.equal(evaluateExpression("(-2)^2"), 4);
  assert.equal(evaluateExpression("3! + 2^3"), 14);
  assert.equal(evaluateExpression("π"), Number(Math.PI.toPrecision(14)));
});

test("scientific functions report domain and factorial errors", () => {
  assert.throws(() => evaluateExpression("sqrt(-1)"), /real-number range/i);
  assert.throws(() => evaluateExpression("log(0)"), /real-number range/i);
  assert.throws(() => evaluateExpression("asin(2)"), /real-number range/i);
  assert.throws(() => evaluateExpression("tan(90)"), /tangent is undefined/i);
  assert.throws(() => evaluateExpression("inv(0)"), /real-number range/i);
  assert.throws(() => evaluateExpression("3.5!"), /factorial requires/i);
  assert.throws(() => evaluateExpression("sin 30"), /needs a value/i);
});

test("division by zero and malformed or unsafe expressions show errors", () => {
  assert.throws(() => evaluateExpression("1 / 0"), /divide by zero/i);
  assert.throws(() => evaluateExpression("2 +"), /incomplete|invalid/i);
  assert.throws(() => evaluateExpression("(2 + 3"), /closing parenthesis/i);
  assert.throws(() => evaluateExpression("2 ** 3"), /incomplete|invalid|check/i);
  assert.throws(() => evaluateExpression("globalThis.process.exit()"), /only numbers/i);
  assert.throws(() => evaluateExpression(""), /enter an expression/i);
});

test("keyboard keys map to calculator actions", () => {
  assert.deepEqual(getKeyboardAction("7"), { type: "input", value: "7" });
  assert.deepEqual(getKeyboardAction("+"), { type: "input", value: "+" });
  assert.deepEqual(getKeyboardAction("^"), { type: "input", value: "^" });
  assert.deepEqual(getKeyboardAction("!"), { type: "input", value: "!" });
  assert.deepEqual(getKeyboardAction("Enter"), { type: "equals" });
  assert.deepEqual(getKeyboardAction("="), { type: "equals" });
  assert.deepEqual(getKeyboardAction("Backspace"), { type: "backspace" });
  assert.deepEqual(getKeyboardAction("Escape"), { type: "clear" });
  assert.equal(getKeyboardAction("a"), null);
  assert.deepEqual(getKeyboardAction("8", true), { type: "input", value: "*" });
});

test("history persists, restores, reuses data and clears", () => {
  const storage = createMemoryStorage();
  const history = createHistoryStore(storage, "test-history");
  assert.deepEqual(history.read(), []);
  const first = history.add("2 + 3", 5);
  assert.equal(first[0].expression, "2 + 3");
  const restored = createHistoryStore(storage, "test-history");
  assert.equal(restored.read()[0].result, 5);
  restored.add("6 * 7", 42);
  assert.equal(restored.read().length, 2);
  restored.clear();
  assert.deepEqual(restored.read(), []);
});

test("malformed stored history is safely ignored", () => {
  const storage = createMemoryStorage();
  storage.setItem("bad", "not-json");
  assert.deepEqual(createHistoryStore(storage, "bad").read(), []);
});

test("theme preference persists and restores", () => {
  const storage = createMemoryStorage();
  const theme = createThemeStore(storage, "test-theme");
  assert.equal(theme.read(), "light");
  theme.write("dark");
  assert.equal(createThemeStore(storage, "test-theme").read(), "dark");
  theme.write("light");
  assert.equal(theme.read(), "light");
});
