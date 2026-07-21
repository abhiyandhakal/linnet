import type { ProposedOperation } from "@linnet/domain";
import { z } from "zod";

export const interpretationSchema = z.object({
  summary: z.string().min(1),
  goalReference: z.string().optional(),
  operations: z.array(z.object({
    kind: z.enum(["create_goal_with_plan", "create_action", "complete_action", "block_action", "record_decision", "record_update", "revise_plan", "schedule_action", "delete_context", "abandon_goal", "external_calendar_change", "send_external_message"]),
    targetId: z.string().optional(),
    payload: z.record(z.unknown()),
    rationale: z.string().min(1)
  }))
});

export type Interpretation = z.infer<typeof interpretationSchema>;

export interface ModelProvider {
  readonly provider: string;
  readonly routineModel: string;
  readonly reasoningModel: string;
  interpret(input: { message: string; goalContext?: string }): Promise<Interpretation>;
  reason(input: { message: string; goalContext?: string }): Promise<Interpretation>;
  explain(input: { message: string; context?: string }): AsyncIterable<string>;
}

export class DeterministicProvider implements ModelProvider {
  readonly provider = "deterministic";
  readonly routineModel = "local-fixture";
  readonly reasoningModel = "local-fixture";

  async interpret(input: { message: string }): Promise<Interpretation> {
    return {
      summary: input.message,
      operations: [{ kind: "record_decision", payload: { title: input.message }, rationale: "Captured from the user's update." }]
    };
  }

  async reason(input: { message: string; goalContext?: string }) { return this.interpret(input); }

  async *explain(input: { message: string }) { yield `I captured: ${input.message}`; }
}

export class GroqProvider implements ModelProvider {
  readonly provider = "groq";
  constructor(readonly apiKey: string, readonly routineModel: string, readonly reasoningModel: string) {}

  async interpret(input: { message: string; goalContext?: string }): Promise<Interpretation> {
    return this.interpretWithModel(this.routineModel, input, "routine update interpreter");
  }

  async reason(input: { message: string; goalContext?: string }): Promise<Interpretation> {
    return this.interpretWithModel(this.reasoningModel, input, "deliberate planning and reconciliation reasoner");
  }

  private async interpretWithModel(model: string, input: { message: string; goalContext?: string }, role: string): Promise<Interpretation> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `You are Linnet's ${role}. Return only a JSON object with summary, optional goalReference, and operations. For a new outcome use create_goal_with_plan with title, why, optional targetDate, summary, and 3-7 milestones. For a goal update use record_update plus the smallest necessary action or plan revision. Use only concrete operations and never claim they were applied.` },
          { role: "user", content: `Context: ${input.goalContext ?? "none"}\nUpdate: ${input.message}` }
        ]
      })
    });
    if (!response.ok) throw new Error(`Groq request failed: ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq returned no message content.");
    return interpretationSchema.parse(JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")));
  }

  async *explain(input: { message: string; context?: string }) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.reasoningModel, temperature: 0.3, messages: [{ role: "system", content: "Explain Linnet's recommendation concisely and plainly." }, { role: "user", content: `${input.message}\nContext: ${input.context ?? "none"}` }] })
    });
    if (!response.ok) throw new Error(`Groq request failed: ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    yield payload.choices?.[0]?.message?.content ?? "I could not produce an explanation.";
  }
}

export function toOperations(interpretation: Interpretation): ProposedOperation[] {
  return interpretation.operations;
}
