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
import { useStorageContext } from "@/context/storage";
import { Value } from "@/lib/types";

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
  }, [text, min, max, step]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      recompute();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    if (preRef.current) ro.observe(preRef.current);
    return () => ro.disconnect();
  }, []);

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
  const { data, set } = useStorageContext();

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
      setEditError("Value is required.");
      return;
    }
    try {
      const parsed = JSON.parse(editValue);
      set(editingKey, parsed);
      setEditingKey(null);
      setEditValue("");
      setEditError(null);
    } catch {
      setEditError("Value must be valid JSON (wrap strings in quotes).");
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
      setAddError("Key already exists.");
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
      setAddError("Value must be valid JSON (wrap strings in quotes).");
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
              placeholder={"Search by key..."}
              className="min-w-0 flex-1 h-9 text-sm"
            />
            <Button size="sm" className="shrink-0" onClick={openAddDialog}>
              {"New Entry"}
            </Button>
          </div>
        </div>
        <div>
          {filteredEntries.length ? (
            <div className="w-full max-w-full overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] table-auto bg-card text-xs">
                <thead className="bg-muted">
                  <tr className="border-b border-border">
                    <th className="px-2 py-1.5 text-left font-medium align-middle">
                      {"Key"}
                    </th>
                    <th className="px-2 py-1.5 text-left font-medium align-middle">
                      {"Value"}
                    </th>
                    <th className="min-w-36 px-2 py-1.5 text-right font-medium align-middle">
                      {"Action"}
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
                              placeholder={'{"enabled": true}'}
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
                          <div className="flex min-w-36 flex-wrap justify-end gap-2 sm:flex-nowrap">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              className="w-full sm:w-auto"
                            >
                              {"Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={handleCancelEdit}
                            >
                              {"Cancel"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex min-w-36 flex-wrap justify-end gap-2 sm:flex-nowrap">
                            <Button
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => handleEdit(entry.key, entry.value)}
                            >
                              {"Edit"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-full sm:w-auto"
                              onClick={() => handleDelete(entry.key)}
                            >
                              {"Delete"}
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
              <div className="text-sm font-medium">{"No entries found."}</div>
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
            <DialogTitle>{"New Entry"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {"Add a new entry to the database."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newKey">{"Key"}</Label>
              <Input
                id="newKey"
                value={newKey}
                onChange={(e) => {
                  setNewKey(e.target.value);
                  setAddError(null);
                }}
                placeholder={"someKey"}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newValue">
                {"Value (Strings need to be in quotes)"}
              </Label>
              <Textarea
                id="newValue"
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  setAddError(null);
                }}
                className="h-44 max-h-[50vh] w-full resize-none overflow-auto font-mono text-xs leading-tight"
                placeholder={'e.g. {"enabled": true} or 42 or "hello"'}
              />
              {addError && (
                <span className="text-xs text-destructive">{addError}</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog}>
              {"Cancel"}
            </Button>
            <Button onClick={handleCreateEntry}>{"Create"}</Button>
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
            <AlertDialogTitle>{"Delete Entry"}</AlertDialogTitle>
            <AlertDialogDescription>
              {"Are you sure you want to delete this entry?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              {"Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (keyToDelete) {
                  set(keyToDelete, null);
                  setEditingKey(null);
                }
                handleCancelDelete();
              }}
            >
              {"Delete Entry"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
