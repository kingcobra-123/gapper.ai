"use client";

import { Plus } from "lucide-react";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

function initials(name: string): string {
  return name
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ServerStrip() {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId);
  const selectWorkspace = useWorkspaceStore((state) => state.selectWorkspace);
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);

  return (
    <aside className="glass-panel hidden w-[68px] flex-col items-center gap-3 p-2 md:flex">
      <p className="section-title">WS</p>

      <div className="terminal-scroll flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto pb-1">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            title={workspace.name}
            onClick={() => selectWorkspace(workspace.id)}
            className={`h-11 w-11 rounded-full border text-[11px] font-semibold transition ${
              workspace.id === selectedWorkspaceId
                ? "border-ai bg-ai/20 text-foreground"
                : "border-border/80 bg-panel-soft/55 text-muted hover:text-foreground"
            }`}
          >
            {initials(workspace.name)}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-border/80 text-muted hover:text-foreground"
        onClick={() => createWorkspace(`Workspace ${workspaces.length + 1}`)}
        title="Create workspace"
      >
        <Plus className="h-4 w-4" />
      </button>
    </aside>
  );
}
