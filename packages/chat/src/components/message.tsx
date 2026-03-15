import { useCrypto } from "@tensamin/crypto/context";
import * as React from "react";
import { useChat } from "../context";
import type { RawMessage } from "../values";
import { log } from "@tensamin/shared/log";
import Text from "@tensamin/markdown/text";

/**
 * Executes Message.
 * @param props Parameter props.
 * @returns unknown.
 */
export default function Message(props: {
  message: RawMessage;
  notEncrypted?: boolean;
}) {
  const { sharedSecret } = useChat();
  const { decrypt } = useCrypto();

  const [decodedContent, setDecodedContent] = React.useState("");
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (props.notEncrypted) {
      setDecodedContent(props.message.content);
      setIsReady(true);
      return;
    }

    const content = props.message.content;
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

    return () => {
      active = false;
    };
  }, [decrypt, props.message.content, props.notEncrypted, sharedSecret]);

  return (
    <div className="w-full flex justify-start">
      <div
        className={`animate-in fade-in duration-200 max-w-[80%] rounded-xl px-2 py-1 whitespace-pre-wrap wrap-break-word ${
          props.message.sent_by_self
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {isReady ? <Text value={decodedContent} /> : null}
      </div>
    </div>
  );
}
