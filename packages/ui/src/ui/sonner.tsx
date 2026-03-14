import { Toaster as Sonner } from "sonner";

export const Toaster = (props: Parameters<typeof Sonner>[0]) => {
  return <Sonner className="toaster group" {...props} />;
};
