import { z } from 'zod';

export const exampleSchema = z.object({
  message: z.string(),
});

export type Example = z.infer<typeof exampleSchema>;
