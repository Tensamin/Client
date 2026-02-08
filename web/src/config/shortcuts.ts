/**
 * Keyboard shortcut actions registry
 * Defines all available shortcut actions in the app
 */

export type ShortcutAction = {
  id: string;
  label: string;
  description: string;
  category: string;
};

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  {
    id: "test",
    label: "Test Action",
    description: "Triggers a test notification to verify shortcuts are working",
    category: "General",
  },
];

// Default shortcut mappings (accelerator -> action)
export const defaultShortcuts: Record<string, string> = {
  "CmdOrCtrl+K": "test",
};

/**
 * Get action definition by ID
 */
export function getActionById(id: string): ShortcutAction | undefined {
  return SHORTCUT_ACTIONS.find((action) => action.id === id);
}

/**
 * Convert shortcuts object (accelerator -> action) to action -> accelerator mapping
 */
export function shortcutsToActionMap(
  shortcuts: Record<string, string>,
): Record<string, string> {
  const actionMap: Record<string, string> = {};
  for (const [accelerator, action] of Object.entries(shortcuts)) {
    actionMap[action] = accelerator;
  }
  return actionMap;
}

/**
 * Convert action -> accelerator mapping back to accelerator -> action
 */
export function actionMapToShortcuts(
  actionMap: Record<string, string>,
): Record<string, string> {
  const shortcuts: Record<string, string> = {};
  for (const [action, accelerator] of Object.entries(actionMap)) {
    if (accelerator) {
      shortcuts[accelerator] = action;
    }
  }
  return shortcuts;
}
