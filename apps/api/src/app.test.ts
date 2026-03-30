import { describe, expect, it } from "bun:test";
import { app } from "./app";

async function request(path: string, init?: RequestInit) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      headers: { "content-type": "application/json" },
      ...init,
    }),
  );
}

const validTemplate = {
  translations: {
    base_language: "en",
    languages: [
      {
        language_code: "es",
        mode: "machine_assist",
        selected_fields: ["title", "description"],
      },
    ],
  },
  facilitator_translations: {
    group_1: ["es", "fr"],
    group_2: ["de"],
  },
};

describe("question-types template translation validation", () => {
  it("Create with template translations succeeds", async () => {
    const response = await request("/question-types", {
      method: "POST",
      body: JSON.stringify({
        name: "intake_form",
        template: validTemplate,
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.template.translations.base_language).toBe("en");
    expect(data.template.facilitator_translations.group_1).toEqual(["es", "fr"]);

    const readResponse = await request(`/question-types/${data.id}`);
    expect(readResponse.status).toBe(200);
    const readData = await readResponse.json();
    expect(readData.template).toEqual(validTemplate);
  });

  it("Update with template translations succeeds", async () => {
    const createResponse = await request("/question-types", {
      method: "POST",
      body: JSON.stringify({
        name: "baseline",
        template: validTemplate,
      }),
    });

    const created = await createResponse.json();

    const updateResponse = await request(`/question-types/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        template: {
          ...validTemplate,
          translations: {
            ...validTemplate.translations,
            languages: [
              ...validTemplate.translations.languages,
              {
                language_code: "it",
                mode: "human_review",
                selected_fields: ["title"],
              },
            ],
          },
        },
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updated = await updateResponse.json();
    expect(updated.template.translations.languages).toHaveLength(2);
    expect(updated.template.translations.languages[1].language_code).toBe("it");
  });

  it("Invalid translation payloads fail with clear messages", async () => {
    const response = await request("/question-types", {
      method: "POST",
      body: JSON.stringify({
        name: "broken",
        template: {
          translations: {
            languages: [
              {
                language_code: "es",
                selected_fields: ["title"],
              },
            ],
          },
          facilitator_translations: {
            group_1: ["es"],
            group_2: "de",
          },
        },
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toBe("Validation failed");
    expect(Array.isArray(data.errors)).toBe(true);
    expect(data.errors.join(" ")).toContain("base_language");
    expect(data.errors.join(" ")).toContain("mode");
    expect(data.errors.join(" ")).toContain("group_2");
  });
});
