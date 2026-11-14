"use client";

import { useState } from "react";
import { Check, FileText, Loader2, Pencil, Trash2, X } from "lucide-react";
import type { WorkspaceData } from "@/lib/bharosa";
import { Button, cn } from "@/components/ui";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The request failed.");
  return payload;
}

export function ManageDocuments({
  data,
  onDone,
}: {
  data: WorkspaceData;
  onDone: (workspace: WorkspaceData, message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const close = () => {
    if (busy) return;
    setOpen(false);
    setEditing(null);
    setConfirming(null);
    setError("");
  };

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const save = (documentId: string) =>
    run(`rename-${documentId}`, async () => {
      const next = await api<WorkspaceData>("/api/documents", {
        method: "PATCH",
        body: JSON.stringify({ documentId, name }),
      });
      setEditing(null);
      onDone(next, "Document renamed.");
    });

  const remove = (documentId: string) =>
    run(`delete-${documentId}`, async () => {
      const next = await api<WorkspaceData>("/api/documents", {
        method: "DELETE",
        body: JSON.stringify({ documentId }),
      });
      setConfirming(null);
      onDone(next, "Document and its citations removed.");
    });

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <FileText />
        Manage
      </Button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/45 p-3 backdrop-blur-sm sm:items-center">
          <div className="rc-pop flex max-h-[86vh] w-full max-w-[540px] flex-col rounded-2xl border border-line bg-card p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-navy">Your document library</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-2">
                  Rename or remove documents. Removing one deletes its citations, chat and
                  calculations from this workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-3 hover:bg-page hover:text-navy"
                aria-label="Close library"
              >
                <X className="size-4" />
              </button>
            </div>

            <ul className="mt-3 min-h-0 flex-1 divide-y divide-line/70 overflow-y-auto rounded-xl border border-line">
              {data.documents.map((doc) => {
                const isEditing = editing === doc.id;
                const isConfirming = confirming === doc.id;
                return (
                  <li key={doc.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-lg",
                          doc.id === data.activeDocId
                            ? "bg-sky text-white"
                            : "bg-page text-ink-3",
                        )}
                      >
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              if (name.trim().length >= 2) void save(doc.id);
                            }}
                          >
                            <input
                              autoFocus
                              value={name}
                              maxLength={90}
                              onChange={(event) => setName(event.target.value)}
                              className="h-7 w-full rounded-md border border-sky/40 bg-page px-2 text-[11px] font-semibold text-navy outline-none focus:border-sky"
                              aria-label="Document name"
                            />
                          </form>
                        ) : (
                          <p className="truncate text-[11px] font-semibold text-navy">{doc.name}</p>
                        )}
                        <p className="text-[9px] text-ink-3">
                          {doc.type === "loan" ? "Loan" : doc.type === "credit_card" ? "Card" : "Health"}
                          {" · "}
                          {doc.pages} pages · {doc.flags} flags
                          {doc.id === data.activeDocId ? " · Active" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-3 hover:bg-page"
                              aria-label="Cancel rename"
                            >
                              <X className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void save(doc.id)}
                              disabled={busy !== null || name.trim().length < 2}
                              className="grid size-7 cursor-pointer place-items-center rounded-md bg-sky text-white disabled:opacity-50"
                              aria-label="Save name"
                            >
                              {busy === `rename-${doc.id}` ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(doc.id);
                                setName(doc.name);
                                setConfirming(null);
                              }}
                              disabled={busy !== null}
                              className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-3 hover:bg-page hover:text-navy"
                              aria-label={`Rename ${doc.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirming(doc.id);
                                setEditing(null);
                              }}
                              disabled={busy !== null || data.documents.length <= 1}
                              className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-3 hover:bg-bad-soft hover:text-[#b42318] disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label={`Delete ${doc.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-bad-soft/70 px-2.5 py-1.5">
                        <p className="text-[9.5px] font-medium text-[#b42318]">
                          Remove this document and its derived checks?
                        </p>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="cursor-pointer rounded-md bg-card px-2 py-1 text-[9px] font-semibold text-ink-2"
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(doc.id)}
                            disabled={busy !== null}
                            className="flex cursor-pointer items-center gap-1 rounded-md bg-[#b42318] px-2 py-1 text-[9px] font-semibold text-white disabled:opacity-60"
                          >
                            {busy === `delete-${doc.id}` && (
                              <Loader2 className="size-2.5 animate-spin" />
                            )}
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {error && (
              <p className="mt-2 rounded-lg bg-bad-soft px-2.5 py-1.5 text-[10px] font-medium text-[#b42318]">
                {error}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[9px] text-ink-3">
                At least one document must stay in the workspace.
              </p>
              <Button variant="secondary" size="sm" onClick={close} disabled={busy !== null}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
