"use client";

import { useStorageContext } from "@/context/StorageContext";
import { Top } from "../page";
import { toast } from "sonner";
import { useEffect, useCallback, useMemo } from "react";
import {
  SHORTCUT_ACTIONS,
  shortcutsToActionMap,
  actionMapToShortcuts,
} from "@/config/shortcuts";
import {
  ShortcutRecorder,
  ShortcutCliDisplay,
} from "@/components/ShortcutRecorder";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Terminal } from "lucide-react";

export default function Page() {
  const { onShortcut, isElectron, isLinux, shortcuts, updateShortcuts } =
    useStorageContext();

  // Convert shortcuts (accelerator -> action) to action -> accelerator for easy lookup
  const actionMap = useMemo(() => shortcutsToActionMap(shortcuts), [shortcuts]);

  // Handle shortcut change for an action
  const handleShortcutChange = useCallback(
    (actionId: string, newAccelerator: string) => {
      const newActionMap = { ...actionMap };

      if (newAccelerator) {
        // Check if this accelerator is already used by another action
        for (const [existingAction, existingAccelerator] of Object.entries(
          actionMap,
        )) {
          if (
            existingAccelerator === newAccelerator &&
            existingAction !== actionId
          ) {
            toast.error(
              `This shortcut is already used by "${SHORTCUT_ACTIONS.find((a) => a.id === existingAction)?.label || existingAction}"`,
            );
            return;
          }
        }
        newActionMap[actionId] = newAccelerator;
      } else {
        // Clear the shortcut
        delete newActionMap[actionId];
      }

      // Convert back to accelerator -> action format and update
      const newShortcuts = actionMapToShortcuts(newActionMap);
      updateShortcuts(newShortcuts);
      toast.success("Shortcut updated");
    },
    [actionMap, updateShortcuts],
  );

  // Register shortcut listeners
  useEffect(() => {
    if (!isElectron) return;

    const cleanups: (() => void)[] = [];

    for (const action of SHORTCUT_ACTIONS) {
      const cleanup = onShortcut(action.id, () => {
        toast.info(`${action.label} triggered!`);
      });
      cleanups.push(cleanup);
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [onShortcut, isElectron]);

  return (
    <Top text="Shortcuts">
      <div className="flex flex-col gap-6 p-1 w-full max-w-2xl">
        {/* Linux guide */}
        {isLinux && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Linux Shortcut Guide</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">
                On Linux, global shortcuts need to be configured through your
                window manager or desktop environment. Tensamin provides a CLI
                flag to trigger actions:
              </p>
              <code className="block bg-muted px-3 py-2 rounded text-sm font-mono mb-3">
                tensamin --shortcut {"<action>"}
              </code>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Window Manager Examples:</strong>
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 ml-4 list-disc">
                <li>
                  <strong>Hyprland:</strong>{" "}
                  <code className="bg-muted px-1 rounded">
                    bind = SUPER, K, exec, tensamin --shortcut test
                  </code>
                </li>
                <li>
                  <strong>Sway:</strong>{" "}
                  <code className="bg-muted px-1 rounded">
                    bindsym Mod4+k exec tensamin --shortcut test
                  </code>
                </li>
                <li>
                  <strong>i3:</strong>{" "}
                  <code className="bg-muted px-1 rounded">
                    bindsym $mod+k exec tensamin --shortcut test
                  </code>
                </li>
                <li>
                  <strong>KDE/GNOME:</strong> Use the keyboard shortcuts
                  settings to add a custom shortcut running the command
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* macOS/Windows info */}
        {!isLinux && isElectron && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Global Shortcuts</AlertTitle>
            <AlertDescription>
              Click on a shortcut field and press your desired key combination
              to set a global shortcut. These shortcuts work even when the app
              is not focused.
            </AlertDescription>
          </Alert>
        )}

        {/* Shortcuts list */}
        <div className="flex flex-col gap-4">
          {SHORTCUT_ACTIONS.map((action) => (
            <Card key={action.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{action.label}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLinux ? (
                  <ShortcutCliDisplay action={action.id} />
                ) : (
                  <ShortcutRecorder
                    value={actionMap[action.id] || ""}
                    onChange={(accelerator) =>
                      handleShortcutChange(action.id, accelerator)
                    }
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {SHORTCUT_ACTIONS.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No shortcut actions available.
          </div>
        )}
      </div>
    </Top>
  );
}
