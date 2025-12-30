import { cn } from "@/lib/utils";
import React from "react";

import { Input } from "@/components/ui/input";
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
        "flex flex-col",
        className,
      )}
    >
      {children}
    </ScrollArea>
  ) : (
    <div
      className={cn(
        "overflow-y-auto overflow-x-hidden",
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
    <Input
      className={cn("dark:bg-sidebar/46 bg-sidebar/46", className)}
      {...props}
    >
      {children}
    </Input>
  );
}

