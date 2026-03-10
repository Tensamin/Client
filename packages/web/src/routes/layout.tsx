import type { RouteSectionProps } from "@solidjs/router";

import Storage from "@tensamin/core-storage/context";
import Crypto from "@tensamin/core-crypto/context";

import LegalWrapper from "@/features/legal/screen";

import { Toaster } from "@tensamin/ui/sonner";

export default function Layout(props: RouteSectionProps) {
  return (
    <>
      <Toaster />
      <Storage>
        <LegalWrapper>
          <Crypto>{props.children}</Crypto>
        </LegalWrapper>
      </Storage>
    </>
  );
}
