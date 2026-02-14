"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface CreateWorkspaceModalProps {
  triggerLabel?: string;
}

export function CreateWorkspaceModal({ triggerLabel = "Workspace" }: CreateWorkspaceModalProps) {
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>Group channels by strategy or market.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="US Small Caps"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) {
                return;
              }

              createWorkspace(trimmed);
              setName("");
              setOpen(false);
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
