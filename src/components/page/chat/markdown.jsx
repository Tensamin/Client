// Package Imports
import React from "react";

// Components
import { CodeBlock } from "@/components/ui/code-block";

// Main

// --- Headings ---
let H1 = ({ children }) => (
  <h1 className="text-4xl font-extrabold mb-4 text-foreground leading-tight border-b-2 border-border pb-2">
    {children}
  </h1>
);
let H2 = ({ children }) => (
  <h2 className="text-3xl font-bold mb-3 text-foreground leading-tight border-b border-border pb-1">
    {children}
  </h2>
);
let H3 = ({ children }) => (
  <h3 className="text-2xl font-semibold mb-2  leading-snug">{children}</h3>
);
let H4 = ({ children }) => (
  <h4 className="text-xl font-medium mb-1  leading-normal">{children}</h4>
);
let H5 = ({ children }) => <h5 className="text-lg font-medium ">{children}</h5>;
let H6 = ({ children }) => (
  <h6 className="text-base font-medium ">{children}</h6>
);

export let Heading = ({ level, children }) => {
  switch (level) {
    case 1:
      return <H1>{children}</H1>;
    case 2:
      return <H2>{children}</H2>;
    case 3:
      return <H3>{children}</H3>;
    case 4:
      return <H4>{children}</H4>;
    case 5:
      return <H5>{children}</H5>;
    case 6:
      return <H6>{children}</H6>;
    default:
      return <H1>{children}</H1>;
  }
};

// --- Paragraph ---
export let Paragraph = ({ children }) => (
  <div className="leading-relaxed">{children}</div>
);

// --- Link ---
export let Link = ({ href, title, children }) => (
  <a
    href={href}
    title={title}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:text-foreground underline transition-colors duration-200"
  >
    {children}
  </a>
);

// --- Image ---
export let Image = ({ src, alt }) => (
  <img
    src={src}
    alt={alt}
    className="max-w-full h-auto rounded-lg shadow-md my-4 block mx-auto"
    loading="lazy"
    decoding="async"
  />
);

// --- Emphasis (Italic) ---
export let Emphasis = ({ children }) => (
  <em className="italic text-foreground">{children}</em>
);

// --- Strong (Bold) ---
export let Strong = ({ children }) => (
  <strong className="font-bold text-foreground">{children}</strong>
);

// --- Inline Code ---
export let InlineCode = ({ children }) => (
  <code className="bg-muted text-primary px-1 py-0.5 rounded text-sm font-mono break-words">
    {children}
  </code>
);

// --- Code Block ---
export let MDCodeBlock = ({ language, children }) => (
  <CodeBlock language={language} code={children} />
);

// --- Blockquote ---
export let Blockquote = ({ children }) => (
  <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 italic  bg-muted bg-opacity-50 rounded-r-md">
    {children}
  </blockquote>
);

// --- Horizontal Rule ---
export let HorizontalRule = () => (
  <hr className="border-t-2 border-border my-8 w-full mx-auto" />
);

// --- List Items ---
export let ListItem = ({ children }) => <li className="mb-2 ">{children}</li>;

// --- Unordered List ---
export let UnorderedList = ({ children }) => (
  <ul className="list-disc ml-5 mb-4 pl-4 space-y-2">{children}</ul>
);

// --- Ordered List ---
export let OrderedList = ({ start, children }) => (
  <ol start={start} className="list-decimal ml-5 mb-4 pl-4 space-y-2">
    {children}
  </ol>
);

// --- Table Components ---
export let Table = ({ children }) => (
  <table className="w-full border-collapse my-6  shadow-sm rounded-lg overflow-hidden">
    {children}
  </table>
);

export let TableHeaderGroup = ({ children }) => (
  <thead className="bg-muted">{children}</thead>
);

export let TableBodyGroup = ({ children }) => <tbody>{children}</tbody>;

export let TableRow = ({ children }) => (
  <tr className="border-b border-border last:border-b-0 even:bg-muted">
    {children}
  </tr>
);

export let TableHeaderCell = ({ children }) => (
  <th className="px-4 py-3 text-left font-semibold text-foreground uppercase text-sm tracking-wider border border-border">
    {children}
  </th>
);

export let TableDataCell = ({ children }) => (
  <td className="px-4 py-3 border border-border">{children}</td>
);

export let MarkdownToReactComponents = {
  h1: ({ node, ...props }) => <H1 {...props} />,
  h2: ({ node, ...props }) => <H2 {...props} />,
  h3: ({ node, ...props }) => <H3 {...props} />,
  h4: ({ node, ...props }) => <H4 {...props} />,
  h5: ({ node, ...props }) => <H5 {...props} />,
  h6: ({ node, ...props }) => <H6 {...props} />,
  p: Paragraph,
  a: Link,
  img: Image,
  code: ({ node, inline, className, children, ...props }) => {
    let match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <MDCodeBlock language={match[1]}>
        {String(children).replace(/\n$/, "")}
      </MDCodeBlock>
    ) : (
      <InlineCode>{children}</InlineCode>
    );
  },
  blockquote: Blockquote,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  em: Emphasis,
  strong: Strong,
  hr: HorizontalRule,
  table: Table,
  thead: TableHeaderGroup,
  tbody: TableBodyGroup,
  tr: TableRow,
  th: TableHeaderCell,
  td: TableDataCell,
};
