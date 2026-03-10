import { z } from "zod";

export const conversation = z.object({
  user_id: z.number(),
  calls: z.array(z.uuidv4()).optional(),
  last_message_at: z.number(),
});

export const community = z.object({
  community_address: z.string(),
  community_title: z.string(),
  position: z.string(),
});

export type Conversation = z.infer<typeof conversation>;
export type Community = z.infer<typeof community>;
