import * as React from "react";

type Category = "conversations" | "communities";

/**
 * Executes Switch.
 * @param props Parameter props.
 * @returns unknown.
 */
export default function Switch(props: {
  category: Category;
  setCategory: (category: Category) => void;
}) {
  const conversationsRef = React.useRef<HTMLButtonElement | null>(null);
  const communitiesRef = React.useRef<HTMLButtonElement | null>(null);

  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 });

  const updateIndicator = React.useCallback(() => {
    const active =
      props.category === "conversations"
        ? conversationsRef.current
        : communitiesRef.current;
    if (!active) return;

    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
    });
  }, [props.category]);

  React.useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  /**
   * Executes toggleCategory.
   * @param none This function has no parameters.
   * @returns unknown.
   */
  function toggleCategory() {
    props.setCategory(
      props.category === "conversations" ? "communities" : "conversations",
    );
  }

  return (
    <div
      role="tablist"
      className="border relative inline-flex rounded-full bg-card p-1 select-none"
    >
      <div
        className="absolute top-1 bottom-1 rounded-full bg-input shadow-sm transition-all duration-300 ease-in-out"
        style={{
          left: `${indicator.left}px`,
          width: `${indicator.width}px`,
        }}
      />
      <button
        ref={conversationsRef}
        role="tab"
        aria-selected={props.category === "conversations"}
        className={`relative z-10 cursor-pointer px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-300 ${
          props.category === "conversations"
            ? "text-foreground"
            : "text-ring/50 hover:text-ring"
        }`}
        onClick={toggleCategory}
      >
        Conversations
      </button>
      <button
        ref={communitiesRef}
        role="tab"
        aria-selected={props.category === "communities"}
        className={`relative z-10 cursor-pointer px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-300 ${
          props.category === "communities"
            ? "text-foreground"
            : "text-ring/50 hover:text-ring"
        }`}
        onClick={toggleCategory}
      >
        Communities
      </button>
    </div>
  );
}
