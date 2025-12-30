import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { startTransition, ViewTransition } from "react";

export default function CategorySwitcher({
  category,
  setCategory,
}: {
  category: "CONVERSATIONS" | "COMMUNITIES";
  setCategory: (cat: "CONVERSATIONS" | "COMMUNITIES") => void;
}) {
  return (
    <div className="relative inline-flex rounded-full bg-input/30 border border-input overflow-hidden mt-3 mx-1 p-1 min-h-11.5">
      <div className="relative grid grid-cols-2 w-full gap-1">
        <ViewTransition>
          {["COMMUNITIES", "CONVERSATIONS"].map((cat: string) => (
            <Button
              key={cat}
              variant="ghost"
              type="button"
              className={`select-none relative isolate rounded-full py-1.5 transition-colors dark:hover:bg-input/20 hover:bg-input/20 ${
                category !== cat ? "hover:border hover:border-input/30" : ""
              }`}
              onClick={() =>
                startTransition(() =>
                  setCategory(cat as "COMMUNITIES" | "CONVERSATIONS")
                )
              }
              aria-pressed={category === cat}
              aria-label={cat}
              style={{
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {category === cat && (
                <motion.span
                  layoutId="bubble"
                  className="absolute inset-0 z-10 bg-input/75 rounded-full border border-ring/13 mix-blend-difference"
                  transition={{
                    type: "spring",
                    bounce: 0.2,
                    duration: 0.4,
                  }}
                />
              )}
              <span className="relative z-10 text-sm flex">
                {cat === "COMMUNITIES" ? "Communities" : "Conversations"}
              </span>
            </Button>
          ))}
        </ViewTransition>
      </div>
    </div>
  );
}
