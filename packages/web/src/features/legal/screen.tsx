import { useStorage } from "@tensamin/core-storage/context";
import { Button } from "@tensamin/ui/button";
import {
  Checkbox,
  CheckboxLabel,
  CheckboxControl,
} from "@tensamin/ui/checkbox";
import { createEffect, createSignal, type JSX, Show } from "solid-js";
import { z } from "zod";

import ErrorScreen from "@tensamin/ui/screens/error";

import { legalDocsSchema } from "@tensamin/shared/features/legal/schema";
import { log } from "@tensamin/shared/log";
import Link from "@tensamin/ui/link";

export default function Screen(props: { children: JSX.Element }) {
  const { load, save } = useStorage();

  const [error, setError] = createSignal("");
  const [errorDescription, setErrorDescription] = createSignal("");

  const [remoteDocs, setRemoteDocs] =
    createSignal<z.infer<typeof legalDocsSchema>>();

  const [loading, setLoading] = createSignal(true);

  createEffect(() => {
    load("user_id").then(async (id) => {
      // For non-logged in users
      if (id === 0) {
        setPPandToSDone(true);
        setDoneWithAnalytics(true);
        setLoading(false);
        return;
      }

      const current = await fetch("https://legal.tensamin.net/api/current")
        .then((res) => res.json())
        .catch((err) => {
          setError("Failed to load legal documents");
          setErrorDescription(
            "An error occurred while fetching the legal documents from the server. Please try again later.",
          );
          log(0, "Legal", "red", "Failed to fetch legal documents", err);
        });

      const safeCurrent = legalDocsSchema.safeParse(current);
      setRemoteDocs(safeCurrent.data);

      if (!safeCurrent.success) {
        setError("Failed to load legal documents");
        setErrorDescription(
          "The legal documents data received from the server is invalid. Please try again later.",
        );
        log(
          0,
          "Legal",
          "red",
          "Invalid legal documents data",
          safeCurrent.error,
        );
        return;
      }

      const localDocs = await load("legal_docs");

      await Promise.all([
        load("ppandtos_done").then(setPPandToSDone),
        load("accepted_privacy_policy").then(acceptPP),
        load("accepted_terms_of_service").then(acceptTOS),
        load("analytics_done").then(setDoneWithAnalytics),
        load("analytics_crash_reports").then(setCrashReports),
        load("analytics_usage_data").then(setUsageData),
      ]);

      if (localDocs.pp.hash !== safeCurrent.data.pp.hash) {
        acceptPP(false);
        setPPandToSDone(false);
      }

      if (localDocs.tos.hash !== safeCurrent.data.tos.hash) {
        acceptTOS(false);
        setPPandToSDone(false);
      }

      setLoading(false);
    });
  });

  const [PPandToSDone, setPPandToSDone] = createSignal(false);
  const [acceptedPP, acceptPP] = createSignal(false);
  const [acceptedTOS, acceptTOS] = createSignal(false);

  const [doneWithAnalytics, setDoneWithAnalytics] = createSignal(false);
  const [crashReports, setCrashReports] = createSignal(false);
  const [usageData, setUsageData] = createSignal(false);

  return (
    <Show
      when={error() !== "" && errorDescription() !== ""}
      fallback={
        <Show when={!loading()} fallback={null}>
          <Show
            when={!PPandToSDone() || !doneWithAnalytics()}
            fallback={props.children}
          >
            <div class="w-full h-full flex items-center justify-center">
              <div class="h-full flex flex-col gap-15 p-10 md:p-40 w-full lg:w-2/3">
                {!PPandToSDone() ? (
                  <>
                    <h1 class="text-3xl md:text-4xl font-bold">
                      Privacy Policy & ToS
                      <p class="text-muted-foreground text-[20px] font-normal pt-3">
                        {remoteDocs()?.pp.version} / {remoteDocs()?.tos.version}
                      </p>
                    </h1>
                    <div class="w-full h-full flex flex-col items-center justify-center gap-5">
                      <div class="justify-start items-start flex flex-col gap-2">
                        <BigCheckbox
                          checked={acceptedPP()}
                          onChange={acceptPP}
                          label="I agree to the Privacy Policy"
                        />
                        <BigCheckbox
                          checked={acceptedTOS()}
                          onChange={acceptTOS}
                          label="I agree to the Terms of Service"
                        />
                        <div class="w-full border-t-2" />
                        <Link
                          label="Privacy Policy"
                          link={`https://legal.tensamin.net/pp/${remoteDocs()?.pp.version}`}
                        />
                        <Link
                          label="Terms of Service"
                          link={`https://legal.tensamin.net/tos/${remoteDocs()?.tos.version}`}
                        />
                      </div>
                    </div>
                    <ContinueButton
                      disabled={!acceptedPP() || !acceptedTOS()}
                      onClick={() => {
                        const currentDocs = remoteDocs()!;

                        save("accepted_privacy_policy", true).then(() =>
                          save("accepted_terms_of_service", true).then(() =>
                            save("ppandtos_done", true).then(() =>
                              save("legal_docs", currentDocs).then(() =>
                                setPPandToSDone(true),
                              ),
                            ),
                          ),
                        );
                      }}
                    />
                  </>
                ) : !doneWithAnalytics() ? (
                  <>
                    <h1 class="text-3xl md:text-4xl font-bold">Analytics</h1>
                    <div class="w-full h-full flex justify-center items-center">
                      <div class="justify-start flex flex-col gap-2">
                        <BigCheckbox
                          checked={crashReports()}
                          onChange={setCrashReports}
                          label="Send anonymous crash reports"
                        />
                        <BigCheckbox
                          checked={usageData()}
                          onChange={setUsageData}
                          label="Send anonymous usage data"
                        />
                      </div>
                    </div>
                    <ContinueButton
                      onClick={() => {
                        const currentCrashReports = crashReports();
                        const currentUsageData = usageData();

                        save(
                          "analytics_crash_reports",
                          currentCrashReports,
                        ).then(() => {
                          setCrashReports(currentCrashReports);
                        });
                        save("analytics_usage_data", currentUsageData).then(
                          () => {
                            setUsageData(currentUsageData);
                          },
                        );
                        save("analytics_done", true).then(() => {
                          setDoneWithAnalytics(true);
                        });
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </Show>
        </Show>
      }
    >
      <ErrorScreen error={error()} description={errorDescription()} />
    </Show>
  );
}

function ContinueButton(props: { onClick: () => void; disabled?: boolean }) {
  return (
    <div class="w-full flex justify-end">
      <Button
        size="lg"
        class="text-lg w-full md:w-auto"
        onClick={props.onClick}
        disabled={props.disabled}
      >
        Continue
      </Button>
    </div>
  );
}

export function BigCheckbox(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={props.checked}
      onChange={props.onChange}
      class="flex items-center space-x-2"
    >
      <CheckboxControl class="size-5.5 rounded-md flex items-center justify-center" />
      <CheckboxLabel class="text-lg">{props.label}</CheckboxLabel>
    </Checkbox>
  );
}
