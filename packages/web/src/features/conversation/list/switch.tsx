import { createEffect, createSignal, onMount } from "solid-js";

type Category = "conversations" | "communities";

export default function Switch(props: {
  category: Category;
  setCategory: (category: Category) => void;
}) {
  let conversationsRef: HTMLButtonElement | undefined;
  let communitiesRef: HTMLButtonElement | undefined;

  const [indicator, setIndicator] = createSignal({ left: 0, width: 0 });

  function updateIndicator() {
    const active =
      props.category === "conversations" ? conversationsRef : communitiesRef;
    if (!active) return;

    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
    });
  }

  onMount(updateIndicator);
  createEffect(updateIndicator);

  function toggleCategory() {
    props.setCategory(
      props.category === "conversations" ? "communities" : "conversations",
    );
  }

  return (
    <div
      role="tablist"
      class="border relative inline-flex rounded-full bg-card p-1 select-none"
    >
      <div
        class="absolute top-1 bottom-1 rounded-full bg-input shadow-sm transition-all duration-300 ease-in-out"
        style={{
          left: `${indicator().left}px`,
          width: `${indicator().width}px`,
        }}
      />
      <button
        ref={(el) => (conversationsRef = el)}
        role="tab"
        aria-selected={props.category === "conversations"}
        class={`relative z-10 cursor-pointer px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-300 ${
          props.category === "conversations"
            ? "text-foreground"
            : "text-ring/50 hover:text-ring"
        }`}
        onClick={toggleCategory}
      >
        Conversations
      </button>
      <button
        ref={(el) => (communitiesRef = el)}
        role="tab"
        aria-selected={props.category === "communities"}
        class={`relative z-10 cursor-pointer px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-300 ${
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
