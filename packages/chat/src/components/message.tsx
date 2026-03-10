import { useCrypto } from "@tensamin/core-crypto/context";
import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { useChat } from "../context";
import type { RawMessage } from "../values";
import { log } from "@tensamin/shared/log";
import Text from "@tensamin/markdown/text";

export default function Message(props: {
  message: RawMessage;
  notEncrypted?: boolean;
}) {
  const { sharedSecret } = useChat();
  const { decrypt } = useCrypto();

  const message = () => props.message;
  const [decodedContent, setDecodedContent] = createSignal("");
  const [isReady, setIsReady] = createSignal(false);

  createEffect(() => {
    if (props.notEncrypted) {
      setDecodedContent(message().content);
      setIsReady(true);
      return;
    }

    const content = message().content;
    const secret = sharedSecret();
    let active = true;

    if (!secret) {
      setIsReady(false);
      return;
    }

    setIsReady(false);

    decrypt(secret, content)
      .then((value) => {
        if (!active) {
          return;
        }

        setDecodedContent(value);
        setIsReady(true);
      })
      .catch((e) => {
        if (!active) {
          return;
        }

        log(0, "Chat", "red", "Failed to decrypt message", e, {
          content,
          secret,
        });

        setDecodedContent("Failed to decrypt");
        setIsReady(true);
      });

    onCleanup(() => {
      active = false;
    });
  });

  return (
    <div class="w-full flex justify-start">
      <div
        class={`animate-in fade-in duration-200 max-w-[80%] rounded-xl px-2 py-1 whitespace-pre-wrap wrap-break-word ${
          message().sent_by_self
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        <Show when={isReady()}>
          <Text value={decodedContent()} />
        </Show>
      </div>
    </div>
  );
}
