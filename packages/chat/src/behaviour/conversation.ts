import { useSocket } from "@tensamin/ttp/context";
import type { RawMessages } from "../values";

export async function getMessages(
  amount: number,
  offset: number,
  user_id: number,
): Promise<RawMessages> {
  const { send } = useSocket();

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
