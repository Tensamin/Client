import * as React from "react";
import { cn } from "../libs/cn";

type CheckboxContextValue = {
  checked: boolean;
  disabled?: boolean;
};

const CheckboxContext = React.createContext<CheckboxContextValue | null>(null);

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function Checkbox({
  checked,
  onChange,
  disabled,
  className,
  children,
}: CheckboxProps) {
  return (
    <CheckboxContext.Provider value={{ checked, disabled }}>
      <label className={cn("inline-flex items-center", className)}>
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        {children}
      </label>
    </CheckboxContext.Provider>
  );
}

export function CheckboxControl({
  className,
}: {
  className?: string;
}): React.ReactElement {
  const context = React.useContext(CheckboxContext);

  return (
    <span
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border border-primary shadow transition-shadow peer-focus-visible:ring-[1.5px] peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed",
        context?.checked && "bg-primary text-primary-foreground",
        context?.disabled && "opacity-50",
        className,
      )}
    >
      {context?.checked ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-4 w-4"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m5 12l5 5L20 7"
          />
        </svg>
      ) : null}
    </span>
  );
}

export function CheckboxLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-sm leading-none font-medium", className)}
      {...props}
    />
  );
}

export function CheckboxErrorMessage({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-destructive", className)} {...props} />;
}

export function CheckboxDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}