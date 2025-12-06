import React from "react";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PageDiv({
  children,
  className,
  scroll,
}: {
  children: React.ReactNode;
  className: string;
  scroll?: boolean;
}) {
  return scroll ? (
    <ScrollArea
      className={cn(
        "rounded-lg border p-2 bg-card/46 flex flex-col",
        className,
      )}
    >
      {children}
    </ScrollArea>
  ) : (
    <div
      className={cn(
        "rounded-lg border p-2 bg-card/46 overflow-y-auto overflow-x-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageInput({
  children,
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input className={cn("dark:bg-card/46 bg-card/46", className)} {...props}>
      {children}
    </Input>
  );
}

export function PageTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      className={cn(
        "dark:bg-card/46 bg-card/46 dark:border-border border-border border resize-none rounded-lg focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  );
}
