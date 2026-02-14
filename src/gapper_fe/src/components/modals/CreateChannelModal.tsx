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

interface CreateChannelModalProps {
  triggerLabel?: string;
}

export function CreateChannelModal({ triggerLabel = "Channel" }: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId);
  const createChannel = useWorkspaceStore((state) => state.createChannel);

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
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>Channels keep message history independently.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="strategy-room"
          value={name}
          onChange={(event) => setName(event.target.value.replace(/\s+/g, "-").toLowerCase())}
          autoFocus
        />
        <DialogFooter>
          <Button
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed || !selectedWorkspaceId) {
                return;
              }

              createChannel(selectedWorkspaceId, trimmed);
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
