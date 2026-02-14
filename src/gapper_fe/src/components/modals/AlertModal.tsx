"use client";

import { useEffect, useState } from "react";
import { BellRing, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAlertsStore } from "@/stores/useAlertsStore";

interface AlertModalProps {
  triggerLabel?: string;
}

type OpenAlertEvent = CustomEvent<{ ticker?: string }>;

export function AlertModal({ triggerLabel = "Alert" }: AlertModalProps) {
  const alerts = useAlertsStore((state) => state.alerts);
  const createAlert = useAlertsStore((state) => state.createAlert);
  const deleteAlert = useAlertsStore((state) => state.deleteAlert);
  const toggleAlert = useAlertsStore((state) => state.toggleAlert);

  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("TSLA");
  const [condition, setCondition] = useState("Breaks opening range high");
  const [notes, setNotes] = useState("Momentum confirmation alert");

  useEffect(() => {
    const onOpenAlert = (event: Event) => {
      const detail = (event as OpenAlertEvent).detail;
      if (detail?.ticker) {
        setTicker(detail.ticker);
      }
      setOpen(true);
    };

    window.addEventListener("gapper:open-alert-modal", onOpenAlert as EventListener);
    return () => window.removeEventListener("gapper:open-alert-modal", onOpenAlert as EventListener);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <BellRing className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alerts</DialogTitle>
          <DialogDescription>Create and manage local alert rules.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 md:grid-cols-3">
          <Input value={ticker} onChange={(event) => setTicker(event.target.value.toUpperCase())} placeholder="TSLA" />
          <Input value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Condition" />
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              if (!ticker.trim()) {
                return;
              }

              createAlert({
                ticker: ticker.trim(),
                condition: condition.trim() || "Price action trigger",
                notes: notes.trim(),
                enabled: true
              });
            }}
          >
            Save Alert
          </Button>
        </DialogFooter>

        <div className="terminal-scroll max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border/70 bg-panel-soft/30 p-2">
          {alerts.length ? (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-md border border-border/70 bg-panel-soft/40 px-2 py-1.5"
              >
                <div className="text-xs">
                  <p className="font-semibold">{alert.ticker}</p>
                  <p className="text-muted">{alert.condition}</p>
                  {alert.notes ? <p className="text-muted">{alert.notes}</p> : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleAlert(alert.id)}>
                    {alert.enabled ? "On" : "Off"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => deleteAlert(alert.id)}
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="p-2 text-xs text-muted">No alerts yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
