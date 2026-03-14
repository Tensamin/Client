import Input from "@tensamin/markdown/input";
import { Card, CardHeader } from "@tensamin/ui/card";
import { useStorage } from "@tensamin/storage/context";
import * as React from "react";
import { Button } from "@tensamin/ui/button";

import { Plus, Laugh, Clapperboard } from "lucide-react";
import { useChat } from "../context";
import { useSocket } from "@tensamin/ttp/context";
import { useCrypto } from "@tensamin/crypto/context";
import { log, toast } from "@tensamin/shared/log";

export default function InputComponent() {
  const [value, setValue] = React.useState("");
  const [invertEnterBehavior, setInvertEnterBehavior] = React.useState(false);

  const { encrypt } = useCrypto();
  const { send } = useSocket();
  const { addLiveMessage, sharedSecret, userId } = useChat();
  const { load } = useStorage();

  React.useEffect(() => {
    void load("chat_invert_enter_behaviour").then((shouldInvert) => {
      setInvertEnterBehavior(shouldInvert);
    });
  }, [load]);

  async function handleSubmit() {
    if (value.trim() === "") return;

    const time = Date.now();
    const currentValue = value;
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
    <Card className="rounded-none rounded-t-xl border border-input/50 border-b-0">
      <CardHeader className="p-0 flex flex-col">
        <Input
          placeholder="Send a message..."
          value={value}
          setValue={setValue}
          onSubmit={handleSubmit}
          invertEnterBehavior={invertEnterBehavior}
        />
        <div className="w-full flex justify-between gap-2 p-2 pt-0">
          <div className="flex gap-2">
            <Button
              className="w-9 h-9 p-0 border border-ring/10"
              variant="secondary"
            >
              <Plus size={20} />
            </Button>
            <div className="w-auto flex">
              <p>Files list</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="w-9 h-9 p-0 border border-ring/10"
              variant="secondary"
            >
              <Laugh size={20} />
            </Button>
            <Button
              className="w-9 h-9 p-0 border border-ring/10"
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
