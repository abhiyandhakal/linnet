import { Elysia, t } from "elysia";

const translationLanguageSchema = t.Object(
  {
    language_code: t.String({ minLength: 2 }),
    mode: t.String({ minLength: 1 }),
    selected_fields: t.Array(t.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const templateTranslationsSchema = t.Object(
  {
    base_language: t.String({ minLength: 2 }),
    languages: t.Array(translationLanguageSchema),
  },
  { additionalProperties: false },
);

const facilitatorTranslationsSchema = t.Object(
  {
    group_1: t.Array(t.String({ minLength: 2 })),
    group_2: t.Array(t.String({ minLength: 2 })),
  },
  { additionalProperties: false },
);

const templateSchema = t.Object(
  {
    translations: templateTranslationsSchema,
    facilitator_translations: facilitatorTranslationsSchema,
  },
  { additionalProperties: false },
);

const createQuestionTypeBodySchema = t.Object(
  {
    name: t.String({ minLength: 1 }),
    template: templateSchema,
  },
  { additionalProperties: false },
);

const updateQuestionTypeBodySchema = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1 })),
    template: t.Optional(templateSchema),
  },
  { additionalProperties: false },
);

const questionTypeResponseSchema = t.Object({
  id: t.String(),
  name: t.String(),
  template: templateSchema,
});

type QuestionType = typeof questionTypeResponseSchema.static;

const questionTypes = new Map<string, QuestionType>();
let nextId = 1;

export const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        message: "Validation failed",
        errors:
          error.all?.map((issue) => `${issue.path || "body"}: ${issue.message}`) ?? [error.message],
      };
    }
  })
  .get("/health", () => ({ status: "ok" }))
  .get("/question-types", () => [...questionTypes.values()])
  .get(
    "/question-types/:id",
    ({ params, set }) => {
      const found = questionTypes.get(params.id);
      if (!found) {
        set.status = 404;
        return { message: "Question type not found" };
      }
      return found;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .post(
    "/question-types",
    ({ body, set }) => {
      const id = String(nextId++);
      const created: QuestionType = {
        id,
        name: body.name,
        template: body.template,
      };

      questionTypes.set(id, created);
      set.status = 201;
      return created;
    },
    {
      body: createQuestionTypeBodySchema,
      response: {
        201: questionTypeResponseSchema,
      },
    },
  )
  .patch(
    "/question-types/:id",
    ({ params, body, set }) => {
      const found = questionTypes.get(params.id);
      if (!found) {
        set.status = 404;
        return { message: "Question type not found" };
      }

      const updated: QuestionType = {
        ...found,
        ...body,
        template: body.template ?? found.template,
      };

      questionTypes.set(params.id, updated);
      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: updateQuestionTypeBodySchema,
      response: questionTypeResponseSchema,
    },
  )
  .put(
    "/question-types/:id",
    ({ params, body, set }) => {
      const found = questionTypes.get(params.id);
      if (!found) {
        set.status = 404;
        return { message: "Question type not found" };
      }

      const updated: QuestionType = {
        ...found,
        ...body,
        template: body.template ?? found.template,
      };

      questionTypes.set(params.id, updated);
      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: updateQuestionTypeBodySchema,
      response: questionTypeResponseSchema,
    },
  );

export type App = typeof app;
