"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Command as CommandIcon, Hash, Layers, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { COMMAND_REGISTRY } from "@/lib/commands/registry";
import { useAlertsStore } from "@/stores/useAlertsStore";
import { useWatchlistStore } from "@/stores/useWatchlistStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaletteItem = {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  run: () => void;
};

function emitComposerText(text: string) {
  window.dispatchEvent(new CustomEvent("gapper:composer-fill", { detail: { text } }));
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const channels = useWorkspaceStore((state) => state.channels);
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace);
  const selectChannel = useWorkspaceStore((state) => state.selectChannel);
  const tickers = useWatchlistStore((state) => state.tickers);
  const createAlert = useAlertsStore((state) => state.createAlert);

  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open]);

  const items = useMemo(() => {
    const value = query.trim().toLowerCase();
    const list: PaletteItem[] = [];

    for (const command of COMMAND_REGISTRY) {
      if (!value || command.name.includes(value) || command.description.toLowerCase().includes(value)) {
        list.push({
          id: `command-${command.name}`,
          label: `/${command.name}`,
          hint: command.description,
          icon: <CommandIcon className="h-4 w-4" />,
          run: () => {
            emitComposerText(`/${command.name} `);
            onOpenChange(false);
          }
        });
      }
    }

    for (const workspace of workspaces) {
      if (!value || workspace.name.toLowerCase().includes(value)) {
        list.push({
          id: `workspace-${workspace.id}`,
          label: workspace.name,
          hint: "Switch workspace",
          icon: <Layers className="h-4 w-4" />,
          run: () => {
            selectWorkspace(workspace.id);
            onOpenChange(false);
          }
        });
      }
    }

    for (const channel of channels) {
      if (!value || channel.name.toLowerCase().includes(value)) {
        list.push({
          id: `channel-${channel.id}`,
          label: `# ${channel.name}`,
          hint: "Jump to channel",
          icon: <Hash className="h-4 w-4" />,
          run: () => {
            selectChannel(channel.id);
            onOpenChange(false);
          }
        });
      }
    }

    for (const ticker of tickers) {
      if (!value || ticker.toLowerCase().includes(value)) {
        list.push({
          id: `ticker-${ticker}`,
          label: ticker,
          hint: "Insert ticker",
          icon: <Search className="h-4 w-4" />,
          run: () => {
            emitComposerText(`/gap ${ticker}`);
            onOpenChange(false);
          }
        });
      }
    }

    const queryTicker = query.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (queryTicker.length >= 2 && queryTicker.length <= 6) {
      list.unshift({
        id: `alert-${queryTicker}`,
        label: `Create alert for ${queryTicker}`,
        hint: "Add local alert",
        icon: <AlertCircle className="h-4 w-4" />,
        run: () => {
          createAlert({
            ticker: queryTicker,
            condition: "Breaks opening range",
            notes: "Created from command palette",
            enabled: true
          });
          onOpenChange(false);
        }
      });
    }

    return list.slice(0, 14);
  }, [channels, createAlert, onOpenChange, query, selectChannel, selectWorkspace, tickers, workspaces]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && items[0]) {
        event.preventDefault();
        items[0].run();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border/80 bg-panel-strong/95">
        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.16 }}
              className="space-y-3"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CommandIcon className="h-4 w-4" />
                  Command Palette
                </DialogTitle>
                <DialogDescription>Jump channels, switch workspaces, run commands, and create alerts.</DialogDescription>
              </DialogHeader>

              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" autoFocus />

              <div className="terminal-scroll max-h-[50vh] space-y-1 overflow-y-auto pr-1">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-transparent bg-panel-soft/35 px-3 py-2 text-left hover:border-border/70 hover:bg-panel-soft/70"
                    onClick={item.run}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      {item.icon}
                      {item.label}
                    </span>
                    <span className="text-xs text-muted">{item.hint}</span>
                  </button>
                ))}
                {items.length === 0 ? (
                  <div className="rounded-md border border-border/70 bg-panel-soft/30 px-3 py-4 text-sm text-muted">
                    No matching command.
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
