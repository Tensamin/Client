"use client";

// Lib Imports
import { tos, pp } from "@/lib/endpoints";

// Context Imports
import { usePageContext } from "@/context/page";

// Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FixedWindowControls } from "@/components/windowControls";

// Main
export default function Page() {
  const { setPage } = usePageContext();

  return (
    <>
      <FixedWindowControls />
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex flex-col gap-5 w-full">
          <div className="flex flex-col md:flex-row w-full gap-3 px-10 justify-center">
            <Card className="w-full md:w-90 gap-3">
              <CardHeader>
                <CardTitle className="select-none">
                  Independant login not available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Please use the Iota to create an account, independant is
                  coming soon.
                  <br />
                  <a
                    href="https://docs.tensamin.net/installation/#iota"
                    className="underline"
                    target="_blank"
                  >
                    https://docs.tensamin.net/installation/#iota
                  </a>
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          <div className="text-xs text-muted-foreground/75 w-full flex flex-col text-center">
            <p>By signing up you agree to our</p>
            <p>
              <a
                className="underline"
                href={tos}
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>
              {" and "}
              <a
                className="underline"
                href={pp}
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </div>
          <div className="flex justify-center items-center pt-15">
            <Button
              variant="outline"
              onClick={() => {
                setPage("login");
              }}
            >
              Login
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
