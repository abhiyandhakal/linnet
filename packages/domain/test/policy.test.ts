import { expect, test } from "bun:test";
import { assessRisk, evaluateSecretaryPolicy } from "../src";

test("blocked work is at risk", () => {
  expect(assessRisk({ incompleteMilestones: 1, blockedActions: 1 })).toBe("at_risk");
});

test("goal abandonment requires confirmation", () => {
  expect(evaluateSecretaryPolicy({ kind: "abandon_goal", payload: {}, rationale: "No longer relevant" }).confirmationRequired).toBe(true);
});

test("a structured goal plan can be applied automatically", () => {
  const result = evaluateSecretaryPolicy({ kind: "create_goal_with_plan", payload: { title: "Ship Linnet" }, rationale: "The user described a concrete outcome." });
  expect(result.allowed).toBe(true);
  expect(result.confirmationRequired).toBe(false);
});
