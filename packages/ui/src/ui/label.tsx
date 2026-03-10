import { cn } from "../libs/cn";
import type { Component, JSX } from "solid-js";
import { splitProps } from "solid-js";

const Label: Component<JSX.LabelHTMLAttributes<HTMLLabelElement>> = (props) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <label
      data-slot="label"
      class={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 transition-all duration-200 ease-in-out",
        local.class,
      )}
      {...others}
    />
  );
};

export { Label };
