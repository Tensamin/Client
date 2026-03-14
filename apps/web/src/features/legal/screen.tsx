import * as React from "react";
import { useStorage } from "@tensamin/storage/context";
import { Button } from "@tensamin/ui/button";
import {
  Checkbox,
  CheckboxLabel,
  CheckboxControl,
} from "@tensamin/ui/checkbox";
import { z } from "zod";

import ErrorScreen from "@tensamin/ui/screens/error";

import { legalDocsSchema } from "@tensamin/shared/features/legal/schema";
import { log } from "@tensamin/shared/log";
import Link from "@tensamin/ui/link";

export default function Screen(props: { children: React.ReactNode }) {
  const { load, save } = useStorage();

  const [error, setError] = React.useState("");
  const [errorDescription, setErrorDescription] = React.useState("");

  const [remoteDocs, setRemoteDocs] = React.useState<
    z.infer<typeof legalDocsSchema> | undefined
  >(undefined);

  const [loading, setLoading] = React.useState(true);

  const [PPandToSDone, setPPandToSDone] = React.useState(false);
  const [acceptedPP, acceptPP] = React.useState(false);
  const [acceptedTOS, acceptTOS] = React.useState(false);

  const [doneWithAnalytics, setDoneWithAnalytics] = React.useState(false);
  const [crashReports, setCrashReports] = React.useState(false);
  const [usageData, setUsageData] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    void load("user_id").then(async (id) => {
      if (!active) {
        return;
      }

      if (id === 0) {
        setPPandToSDone(true);
        setDoneWithAnalytics(true);
        setLoading(false);
        return;
      }

      const current = await fetch("https://legal.tensamin.net/api/current")
        .then((res) => res.json())
        .catch((err) => {
          if (!active) {
            return undefined;
          }

          setError("Failed to load legal documents");
          setErrorDescription(
            "An error occurred while fetching the legal documents from the server. Please try again later.",
          );
          log(0, "Legal", "red", "Failed to fetch legal documents", err);
          return undefined;
        });

      if (!active || current === undefined) {
        return;
      }

      const safeCurrent = legalDocsSchema.safeParse(current);
      if (!safeCurrent.success) {
        setError("Failed to load legal documents");
        setErrorDescription(
          "The legal documents data received from the server is invalid. Please try again later.",
        );
        log(0, "Legal", "red", "Invalid legal documents data", safeCurrent.error);
        return;
      }

      setRemoteDocs(safeCurrent.data);

      const localDocs = await load("legal_docs");

      const [
        loadedPPAndTOS,
        loadedAcceptedPP,
        loadedAcceptedTOS,
        loadedAnalyticsDone,
        loadedCrashReports,
        loadedUsageData,
      ] = await Promise.all([
        load("ppandtos_done"),
        load("accepted_privacy_policy"),
        load("accepted_terms_of_service"),
        load("analytics_done"),
        load("analytics_crash_reports"),
        load("analytics_usage_data"),
      ]);

      if (!active) {
        return;
      }

      setPPandToSDone(loadedPPAndTOS);
      acceptPP(loadedAcceptedPP);
      acceptTOS(loadedAcceptedTOS);
      setDoneWithAnalytics(loadedAnalyticsDone);
      setCrashReports(loadedCrashReports);
      setUsageData(loadedUsageData);

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

    return () => {
      active = false;
    };
  }, [load]);

  if (error !== "" && errorDescription !== "") {
    return <ErrorScreen error={error} description={errorDescription} />;
  }

  if (loading) {
    return null;
  }

  if (PPandToSDone && doneWithAnalytics) {
    return <>{props.children}</>;
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="h-full flex flex-col gap-15 p-10 md:p-40 w-full lg:w-2/3">
        {!PPandToSDone ? (
          <>
            <h1 className="text-3xl md:text-4xl font-bold">
              Privacy Policy & ToS
              <p className="text-muted-foreground text-[20px] font-normal pt-3">
                {remoteDocs?.pp.version} / {remoteDocs?.tos.version}
              </p>
            </h1>
            <div className="w-full h-full flex flex-col items-center justify-center gap-5">
              <div className="justify-start items-start flex flex-col gap-2">
                <BigCheckbox
                  checked={acceptedPP}
                  onChange={acceptPP}
                  label="I agree to the Privacy Policy"
                />
                <BigCheckbox
                  checked={acceptedTOS}
                  onChange={acceptTOS}
                  label="I agree to the Terms of Service"
                />
                <div className="w-full border-t-2" />
                <Link
                  label="Privacy Policy"
                  link={`https://legal.tensamin.net/pp/${remoteDocs?.pp.version}`}
                />
                <Link
                  label="Terms of Service"
                  link={`https://legal.tensamin.net/tos/${remoteDocs?.tos.version}`}
                />
              </div>
            </div>
            <ContinueButton
              disabled={!acceptedPP || !acceptedTOS}
              onClick={() => {
                const currentDocs = remoteDocs;
                if (!currentDocs) {
                  return;
                }

                void (async () => {
                  await save("accepted_privacy_policy", true);
                  await save("accepted_terms_of_service", true);
                  await save("ppandtos_done", true);
                  await save("legal_docs", currentDocs);
                  setPPandToSDone(true);
                })();
              }}
            />
          </>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-bold">Analytics</h1>
            <div className="w-full h-full flex justify-center items-center">
              <div className="justify-start flex flex-col gap-2">
                <BigCheckbox
                  checked={crashReports}
                  onChange={setCrashReports}
                  label="Send anonymous crash reports"
                />
                <BigCheckbox
                  checked={usageData}
                  onChange={setUsageData}
                  label="Send anonymous usage data"
                />
              </div>
            </div>
            <ContinueButton
              onClick={() => {
                const currentCrashReports = crashReports;
                const currentUsageData = usageData;

                void save("analytics_crash_reports", currentCrashReports).then(() => {
                  setCrashReports(currentCrashReports);
                });
                void save("analytics_usage_data", currentUsageData).then(() => {
                  setUsageData(currentUsageData);
                });
                void save("analytics_done", true).then(() => {
                  setDoneWithAnalytics(true);
                });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ContinueButton(props: { onClick: () => void; disabled?: boolean }) {
  return (
    <div className="w-full flex justify-end">
      <Button
        size="lg"
        className="text-lg w-full md:w-auto"
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
      className="flex items-center space-x-2"
    >
      <CheckboxControl className="size-5.5 rounded-md flex items-center justify-center" />
      <CheckboxLabel className="text-lg">{props.label}</CheckboxLabel>
    </Checkbox>
  );
}