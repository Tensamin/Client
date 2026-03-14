import type { ReactNode } from "react";

import Storage from "@tensamin/storage/context";
import Crypto from "@tensamin/crypto/context";

import LegalWrapper from "@/features/legal/screen";

import { Toaster } from "@tensamin/ui/sonner";

export default function Layout(props: { children: ReactNode }) {
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
