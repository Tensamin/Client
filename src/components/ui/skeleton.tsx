import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-input/75 border border-accent animate-pulse rounded-md transition-all duration-200 ease-in-out",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
