import type { BoundSendFn } from "@tensamin/ttp/core";
import type { Socket } from "@tensamin/shared/data";
import type { RawMessages } from "../values";

export async function getMessages(
  send: BoundSendFn<Socket>,
  amount: number,
  offset: number,
  user_id: number,
): Promise<RawMessages> {
  const messages = await send("messages_get", {
    amount: amount,
    offset: offset,
    user_id: user_id,
  });

  if (messages.type.startsWith("error")) {
    throw new Error(messages.type);
  }

  return messages.data.messages;
}
