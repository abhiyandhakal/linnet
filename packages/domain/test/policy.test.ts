import { expect, test } from "bun:test";
import { assessRisk, evaluateSecretaryPolicy } from "../src";

test("blocked work is at risk", () => {
  expect(assessRisk({ incompleteMilestones: 1, blockedActions: 1 })).toBe("at_risk");
});

test("goal abandonment requires confirmation", () => {
  expect(evaluateSecretaryPolicy({ kind: "abandon_goal", payload: {}, rationale: "No longer relevant" }).confirmationRequired).toBe(true);
});
