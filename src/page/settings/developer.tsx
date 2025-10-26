import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useEffectEvent,
} from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStorageContext, Value } from "@/context/storage";

function FitJson({
  sensitive,
  value,
  min = 9, // px
  max = 12, // px
  step = 0.5,
  className = "",
}: {
  sensitive: boolean;
  value: Value;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(max);

  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  const recompute = useEffectEvent(() => {
    const container = containerRef.current;
    const pre = preRef.current;
    if (!container || !pre) return;

    let size = max;
    pre.style.fontSize = `${size}px`;
    pre.style.lineHeight = "1.2";

    const fits = () =>
      pre.scrollWidth <= container.clientWidth &&
      pre.scrollHeight <= container.clientHeight;

    if (!fits()) {
      while (size > min && !fits()) {
        size -= step;
        pre.style.fontSize = `${size}px`;
      }
    }
    setFontSize(size);
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      recompute();
    });
    return () => cancelAnimationFrame(frame);
  }, [recompute, text, min, max, step]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      recompute();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    if (preRef.current) ro.observe(preRef.current);
    return () => ro.disconnect();
  }, [recompute]);

  return (
    <div
      ref={containerRef}
      className={[
        "relative w-full min-w-0 min-h-10 max-h-48 overflow-hidden max-w-[35vw] flex items-center",
        className,
      ].join(" ")}
    >
      <pre
        ref={preRef}
        style={{ fontSize, lineHeight: 1.2 }}
        className="whitespace-pre-wrap break-all font-mono text-foreground"
      >
        {sensitive ? '"*************************"' : text}
      </pre>
    </div>
  );
}

export default function Page() {
  const { data, set, translate } = useStorageContext();

  const entries = useMemo(
    () => Object.entries(data || {}).map(([key, value]) => ({ key, value })),
    [data]
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.key.toLowerCase().includes(q));
  }, [entries, search]);

  const handleDelete = useCallback((key: string) => {
    setKeyToDelete(key);
    setShowDeleteDialog(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setKeyToDelete(null);
  }, []);

  const handleEdit = useCallback((key: string, value: Value) => {
    setEditingKey(key);
    setEditError(null);
    try {
      setEditValue(JSON.stringify(value, null, 2));
    } catch {
      setEditValue(String(value));
    }
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingKey) return;
    if (!editValue.trim()) {
      setEditError("Value cannot be empty.");
      return;
    }
    try {
      const parsed = JSON.parse(editValue);
      set(editingKey, parsed);
      setEditingKey(null);
      setEditValue("");
      setEditError(null);
    } catch {
      setEditError("Invalid JSON. Please correct and try again.");
    }
  }, [editValue, editingKey, set]);

  const handleCancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditValue("");
    setEditError(null);
  }, []);

  const openAddDialog = useCallback(() => {
    setIsAddOpen(true);
    setNewKey("");
    setNewValue("");
    setAddError(null);
  }, []);

  const closeAddDialog = useCallback(() => {
    setIsAddOpen(false);
    setAddError(null);
  }, []);

  const handleCreateEntry = useCallback(() => {
    const key = newKey.trim();
    if (!key) {
      setAddError("Key is required.");
      return;
    }
    const existingKeys = new Set(Object.keys(data || {}));
    if (existingKeys.has(key)) {
      setAddError("A key with this name already exists.");
      return;
    }
    if (!newValue.trim()) {
      setAddError("Value is required.");
      return;
    }
    try {
      const parsed = JSON.parse(newValue);
      set(key, parsed);
      setIsAddOpen(false);
      setNewKey("");
      setNewValue("");
      setAddError(null);
    } catch {
      setAddError("Invalid JSON for value. Please provide valid JSON.");
    }
  }, [data, newKey, newValue, set]);

  return (
    <>
      <div className="flex flex-col w-full min-w-0 gap-2">
        <div className="flex gap-2 flex-row items-center justify-between">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={translate("DEVELOPER_PAGE_SEARCH_PLACEHOLDER")}
              className="min-w-0 flex-1 h-9 text-sm"
            />
            <Button size="sm" className="shrink-0" onClick={openAddDialog}>
              {translate("DEVELOPER_PAGE_NEW_ENTREY_DIALOG_LABEL")}
            </Button>
          </div>
        </div>
        <div>
          {filteredEntries.length ? (
            <div className="w-full overflow-hidden rounded-lg border">
              <table className="w-full table-auto bg-card text-xs">
                <thead className="bg-muted">
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left font-medium align-middle">
                      {translate("DEVELOPER_PAGE_TABLE_KEY")}
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium align-middle">
                      {translate("DEVELOPER_PAGE_TABLE_VALUE")}
                    </th>
                    <th className="px-2 py-1.5 text-right font-medium align-middle w-0">
                      {translate("DEVELOPER_PAGE_TABLE_ACTION")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.key} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-2 py-1.5 font-medium text-foreground align-middle w-25">
                        {entry.key}
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        {editingKey === entry.key ? (
                          <div className="flex w-full flex-col gap-2">
                            <Textarea
                              value={editValue}
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                setEditError(null);
                              }}
                              className="min-h-10 h-auto w-full max-w-[35vw] max-h-[50vh] overflow-x-auto font-mono text-xs leading-tight"
                              placeholder='Enter JSON value (e.g. {"foo": "bar"})'
                            />
                            {editError && (
                              <span className="text-xs text-destructive">
                                {editError}
                              </span>
                            )}
                          </div>
                        ) : (
                          <FitJson
                            value={entry.value}
                            sensitive={entry.key === "privateKey"}
                          />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-medium align-middle">
                        {editingKey === entry.key ? (
                          <div className="flex w-20 justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              className="w-full"
                            >
                              {translate("SAVE")}
                            </Button>
                            <Button
                              className="w-full"
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                            >
                              {translate("CANCEL")}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex w-20 justify-end gap-2">
                            <Button
                              className="w-full"
                              size="sm"
                              onClick={() => handleEdit(entry.key, entry.value)}
                            >
                              {translate("EDIT")}
                            </Button>
                            <Button
                              className="w-full"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(entry.key)}
                            >
                              {translate("DELETE")}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border p-4 text-center bg-card">
              <div className="text-sm font-medium">
                {translate("DEVELOPER_PAGE_NO_ENTRIES")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Entry Dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => !open && closeAddDialog()}
      >
        <DialogContent className="sm:max-w-md p-4">
          <DialogHeader>
            <DialogTitle>
              {translate("DEVELOPER_PAGE_NEW_ENTREY_DIALOG_LABEL")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {translate("DEVELOPER_PAGE_NEW_ENTREY_DIALOG_DESCRIPTION")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newKey">
                {translate("DEVELOPER_PAGE_NEW_ENTREY_DIALOG_KEY_LABEL")}
              </Label>
              <Input
                id="newKey"
                value={newKey}
                onChange={(e) => {
                  setNewKey(e.target.value);
                  setAddError(null);
                }}
                placeholder={translate(
                  "DEVELOPER_PAGE_NEW_ENTREY_DIALOG_KEY_EXAMPLE"
                )}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newValue">
                {translate("DEVELOPER_PAGE_NEW_ENTREY_DIALOG_VALUE_LABEL")}
              </Label>
              <Textarea
                id="newValue"
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  setAddError(null);
                }}
                className="h-44 max-h-[50vh] w-full resize-none overflow-auto font-mono text-xs leading-tight"
                placeholder={translate(
                  "DEVELOPER_PAGE_NEW_ENTREY_DIALOG_VALUE_EXAMPLE"
                )}
              />
              {addError && (
                <span className="text-xs text-destructive">{addError}</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog}>
              {translate("CANCEL")}
            </Button>
            <Button onClick={handleCreateEntry}>{translate("CREATE")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={(open) => !open && handleCancelDelete()}
      >
        <AlertDialogContent className="sm:max-w-md p-4">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {translate("DEVELOPER_PAGE_DELETE_ENTRY_LABEL")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {translate("DEVELOPER_PAGE_DELETE_ENTRY_DESCRIPTION")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              {translate("CANCEL")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (keyToDelete) {
                  set(keyToDelete, false);
                  setEditingKey(null);
                }
                handleCancelDelete();
              }}
            >
              {translate("DEVELOPER_PAGE_DELETE_ENTRY_LABEL")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
