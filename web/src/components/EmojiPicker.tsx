import { Button } from "@/components/ui/button";
import { EmojiPicker } from "frimousse";
import { useState } from "react";
import { Input } from "./ui/input";

export default function StyledEmojiPicker({
  onInsert,
}: {
  onInsert: (emoji: string) => void;
}) {
  const [search, setSearch] = useState("");
  return (
    <div>
      <EmojiPicker.Root className="isolate flex h-92 w-fit flex-col bg-popover text-popover-foreground">
        <EmojiPicker.Search value={search} hidden />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <EmojiPicker.Viewport className="relative flex-1 outline-hidden">
          <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Loading...
          </EmojiPicker.Loading>
          <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 text-sm">
            No emoji found.
          </EmojiPicker.Empty>
          <EmojiPicker.List
            className="select-none pb-1.5"
            components={{
              CategoryHeader: ({ category, ...props }) => (
                <div
                  className="pt-3 pb-1.5 text-xs font-medium text-muted-foreground bg-popover"
                  {...props}
                >
                  {category.label}
                </div>
              ),
              Row: ({ children, ...props }) => (
                <div className="grid grid-cols-8 gap-1.5" {...props}>
                  {children}
                </div>
              ),
              Emoji: ({ emoji, ...props }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 text-lg"
                  {...props}
                  onClick={(e) => {
                    if (typeof props.onClick === "function") props.onClick(e);
                    onInsert(emoji.emoji);
                  }}
                >
                  {emoji.emoji}
                </Button>
              ),
            }}
          />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
    </div>
  );
}
