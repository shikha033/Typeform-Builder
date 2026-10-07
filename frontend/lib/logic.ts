// Logic jump evaluator — pure function so builder preview + public form share logic
import { Question, LogicJump } from "./types";

export function compareValues(op: LogicJump["operator"], actual: any, expected: any): boolean {
  if (actual === undefined || actual === null) return false;
  switch (op) {
    case "equals":
      // eslint-disable-next-line eqeqeq
      return actual == expected;
    case "not_equals":
      // eslint-disable-next-line eqeqeq
      return actual != expected;
    case "greater_than":
      return Number(actual) > Number(expected);
    case "less_than":
      return Number(actual) < Number(expected);
  }
}

/**
 * Given the current question + its answer, return the index of the next question
 * (relative to the ordered questions list) or -1 for "end".
 * Returns null when no logic rule matched (fallback to default next).
 */
export function evaluateJump(
  questions: Question[],
  currentIdx: number,
  value: any
): number | null | -1 {
  const q = questions[currentIdx];
  const rules = (q?.logic_jumps || []) as LogicJump[];
  for (const rule of rules) {
    if (compareValues(rule.operator, value, rule.value)) {
      if (rule.target === "end") return -1;
      const idx = questions.findIndex((x) => x.id === rule.target);
      if (idx >= 0) return idx;
    }
  }
  return null;
}

export function nextIndex(questions: Question[], currentIdx: number, value: any): number | -1 {
  const jump = evaluateJump(questions, currentIdx, value);
  if (jump !== null) return jump; // honored jump (incl. -1 end)
  if (currentIdx >= questions.length - 1) return -1;
  return currentIdx + 1;
}
