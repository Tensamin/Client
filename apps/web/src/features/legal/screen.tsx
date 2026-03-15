import * as React from "react";
import { useStorage } from "@tensamin/storage/context";
import { Button } from "@tensamin/ui/cmp/button";
import { Checkbox } from "@tensamin/ui/cmp/checkbox";
import { z } from "zod";

import ErrorScreen from "@tensamin/ui/screens/error";

import { legalDocsSchema } from "@tensamin/shared/features/legal/schema";
import { log } from "@tensamin/shared/log";
import Link from "@tensamin/ui/link";
import { Label } from "@tensamin/ui/cmp/label";

type SaveFn = ReturnType<typeof useStorage>["save"];

/**
 * Persists accepted legal documents and marks the first onboarding step complete.
 * @param save Storage save function.
 * @param currentDocs Current legal documents fetched from the server.
 * @param setPPandToSDone State setter for legal acceptance completion.
 * @returns Promise that resolves when persistence is complete.
 */
async function persistAcceptedDocs(
  save: SaveFn,
  currentDocs: z.infer<typeof legalDocsSchema>,
  setPPandToSDone: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<void> {
  await save("accepted_privacy_policy", true);
  await save("accepted_terms_of_service", true);
  await save("ppandtos_done", true);
  await save("legal_docs", currentDocs);
  setPPandToSDone(true);
}

/**
 * Persists analytics preference toggles and marks analytics onboarding complete.
 * @param save Storage save function.
 * @param crashReports Whether crash reports are enabled.
 * @param usageData Whether usage data is enabled.
 * @param setCrashReports State setter for crash reports.
 * @param setUsageData State setter for usage data.
 * @param setDoneWithAnalytics State setter for analytics completion.
 * @returns Promise that resolves when persistence is complete.
 */
async function persistAnalyticsPreferences(
  save: SaveFn,
  crashReports: boolean,
  usageData: boolean,
  setCrashReports: React.Dispatch<React.SetStateAction<boolean>>,
  setUsageData: React.Dispatch<React.SetStateAction<boolean>>,
  setDoneWithAnalytics: React.Dispatch<React.SetStateAction<boolean>>,
): Promise<void> {
  await save("analytics_crash_reports", crashReports);
  setCrashReports(crashReports);

  await save("analytics_usage_data", usageData);
  setUsageData(usageData);

  await save("analytics_done", true);
  setDoneWithAnalytics(true);
}

/**
 * Gates the application behind legal and analytics consent checks.
 * @param props Component props containing children to render after consent.
 * @returns Legal onboarding or wrapped children JSX.
 */
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

  /**
   * Handles continue action for privacy policy and terms acceptance.
   * @returns Void.
   */
  const handleContinueLegal = React.useCallback((): void => {
    const currentDocs = remoteDocs;
    if (!currentDocs) {
      return;
    }

    void persistAcceptedDocs(save, currentDocs, setPPandToSDone);
  }, [remoteDocs, save]);

  /**
   * Handles continue action for analytics preferences.
   * @returns Void.
   */
  const handleContinueAnalytics = React.useCallback((): void => {
    const currentCrashReports = crashReports;
    const currentUsageData = usageData;

    void persistAnalyticsPreferences(
      save,
      currentCrashReports,
      currentUsageData,
      setCrashReports,
      setUsageData,
      setDoneWithAnalytics,
    );
  }, [crashReports, save, usageData]);

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
        log(
          0,
          "Legal",
          "red",
          "Invalid legal documents data",
          safeCurrent.error,
        );
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
              onClick={handleContinueLegal}
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
            <ContinueButton onClick={handleContinueAnalytics} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Renders a large continue button used by legal and analytics steps.
 * @param props Button props with click callback and disabled state.
 * @returns Continue button JSX.
 */
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

/**
 * Renders a larger checkbox row for onboarding preferences.
 * @param props Checkbox label, current value, and change callback.
 * @returns Checkbox row JSX.
 */
export function BigCheckbox(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        checked={props.checked}
        onCheckedChange={props.onChange}
        className="size-5.5 rounded-md flex items-center justify-center"
      />
      <Label className="text-lg">{props.label}</Label>
    </div>
  );
}
