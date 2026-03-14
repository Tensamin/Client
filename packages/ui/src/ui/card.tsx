import { cn } from "../libs/cn";
import * as React from "react";

export const Card = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.ComponentProps<"h1">) => (
  <h1
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
);

export const CardDescription = ({
  className,
  ...props
}: React.ComponentProps<"h3">) => (
  <h3 className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
