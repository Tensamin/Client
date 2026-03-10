import Input from "@tensamin/markdown/input";
import { Card, CardHeader } from "@tensamin/ui/card";
import { useStorage } from "@tensamin/core-storage/context";
import { createEffect, createSignal } from "solid-js";
import { Button } from "@tensamin/ui/button";

import { Plus, Laugh, Clapperboard } from "lucide-solid";
import { useChat } from "../context";
import { useSocket } from "@tensamin/ttp/context";
import { useCrypto } from "@tensamin/core-crypto/context";
import { log, toast } from "@tensamin/shared/log";

export default function InputComponent() {
  const [value, setValue] = createSignal("");
  const [invertEnterBehavior, setInvertEnterBehavior] = createSignal(false);

  const { encrypt } = useCrypto();
  const { send } = useSocket();
  const { addLiveMessage, sharedSecret, userId } = useChat();
  const { load } = useStorage();

  createEffect(() => {
    void load("chat_invert_enter_behaviour").then((shouldInvert) => {
      setInvertEnterBehavior(shouldInvert);
    });
  });

  async function handleSubmit() {
    if (value().trim() === "") return;

    const time = Date.now();
    const currentValue = value();
    const currentUserId = userId();

    addLiveMessage({
      height: 0,
      not_encrypted: true,
      timestamp: time,
      content: currentValue,
      sent_by_self: true,
    });

    const encryptedContext = await encrypt(sharedSecret(), currentValue);

    send("message_send", {
      height: 0,
      content: encryptedContext,
      receiver_id: currentUserId,
      send_time: time,
    }).catch((e) => {
      log(0, "Chat", "red", "Failed to send message", e, {
        content: currentValue,
        encryptedContext,
        receiver_id: currentUserId,
        send_time: time,
      });
      toast("error", "Failed to send message");
    });

    setValue("");
  }

  return (
    <Card class="rounded-none rounded-t-xl border border-input/50 border-b-0">
      <CardHeader class="p-0 flex flex-col">
        <Input
          placeholder="Send a message..."
          value={value()}
          setValue={setValue}
          onSubmit={handleSubmit}
          invertEnterBehavior={invertEnterBehavior()}
        />
        <div class="w-full flex justify-between gap-2 p-2 pt-0">
          <div class="flex gap-2">
            <Button
              class="w-9 h-9 p-0 border border-ring/10"
              variant="secondary"
            >
              <Plus size={20} />
            </Button>
            <div class="w-auto flex">
              <p>Files list</p>
            </div>
          </div>
          <div class="flex gap-2">
            <Button
              class="w-9 h-9 p-0 border border-ring/10"
              variant="secondary"
            >
              <Laugh size={20} />
            </Button>
            <Button
              class="w-9 h-9 p-0 border border-ring/10"
              variant="secondary"
            >
              <Clapperboard size={20} />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
