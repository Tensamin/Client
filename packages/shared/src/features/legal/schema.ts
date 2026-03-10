import { z } from "zod";

const legalDocSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/),
  hash: z.string().regex(/^[a-f0-9]{12}$/),
  unix: z.number().int().positive(),
});

export const legalDocsSchema = z.object({
  eula: legalDocSchema,
  tos: legalDocSchema,
  pp: legalDocSchema,
});
