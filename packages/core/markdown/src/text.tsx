import { createMemo } from "solid-js";

import {
  ensureMarkdownStyles,
  parseMarkdownBlocks,
  renderBlocks,
} from "./markdown";

export type TextProps = {
  value: string;
};

export default function Text(props: TextProps) {
  ensureMarkdownStyles();

  const blocks = createMemo(() => parseMarkdownBlocks(props.value));

  return <div class="tm-md-root">{renderBlocks(blocks())}</div>;
}
