import * as React from "react";

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

  const blocks = React.useMemo(() => parseMarkdownBlocks(props.value), [props.value]);

  return <div className="tm-md-root">{renderBlocks(blocks)}</div>;
}
