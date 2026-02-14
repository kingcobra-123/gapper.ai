"use client";

import { PenSquare, Plus, Trash2 } from "lucide-react";
import { CreateChannelModal } from "@/components/modals/CreateChannelModal";
import { CreateWorkspaceModal } from "@/components/modals/CreateWorkspaceModal";
import { Input } from "@/components/ui/input";
import { useWatchlistStore } from "@/stores/useWatchlistStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function Sidebar() {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const selectedWorkspaceId = useWorkspaceStore((state) => state.selectedWorkspaceId);
  const channels = useWorkspaceStore((state) => state.channels);
  const channelsLoading = useWorkspaceStore((state) => state.channelsLoading);
  const channelsError = useWorkspaceStore((state) => state.channelsError);
  const selectedChannelId = useWorkspaceStore((state) => state.selectedChannelId);
  const selectChannel = useWorkspaceStore((state) => state.selectChannel);

  const tickers = useWatchlistStore((state) => state.tickers);
  const addTicker = useWatchlistStore((state) => state.addTicker);
  const removeTicker = useWatchlistStore((state) => state.removeTicker);

  const workspace = workspaces.find((item) => item.id === selectedWorkspaceId);
  const visibleChannels = channels.filter((channel) => channel.workspaceId === selectedWorkspaceId);

  return (
    <aside className="glass-panel hidden min-h-0 w-72 flex-col gap-4 p-3 lg:flex">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="section-title">Workspace</p>
          <h2 className="mt-1 text-sm font-semibold">{workspace?.name ?? "No workspace"}</h2>
        </div>
        <CreateWorkspaceModal triggerLabel="New" />
      </header>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="section-title">Channels</p>
          <CreateChannelModal triggerLabel="New" />
        </div>

        {channelsLoading ? <p className="mb-2 text-xs text-muted">Loading channels...</p> : null}
        {channelsError ? (
          <p className="mb-2 rounded-md border border-bearish/60 bg-bearish/10 px-2 py-1 text-xs text-bearish">
            {channelsError}
          </p>
        ) : null}

        <ul className="space-y-1">
          {visibleChannels.map((channel) => (
            <li key={channel.id}>
              <div
                className={`flex items-center justify-between rounded-md border px-2 py-1 text-sm ${
                  selectedChannelId === channel.id
                    ? "border-ai/70 bg-ai/10"
                    : "border-transparent bg-panel-soft/35 hover:border-border/80"
                }`}
              >
                <button
                  type="button"
                  className="flex-1 truncate text-left"
                  onClick={() => selectChannel(channel.id)}
                >
                  # {channel.name}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded p-1 text-muted opacity-45"
                    disabled
                    title="Managed by backend"
                    aria-label="Rename channel"
                  >
                    <PenSquare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-muted opacity-45"
                    disabled
                    title="Managed by backend"
                    aria-label="Delete channel"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="min-h-0 space-y-2">
        <p className="section-title">Watchlist</p>
        <form
          className="flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const ticker = `${formData.get("ticker") ?? ""}`;
            addTicker(ticker);
            event.currentTarget.reset();
          }}
        >
          <Input name="ticker" placeholder="Add ticker" className="h-8 text-xs" />
          <button
            type="submit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-panel-soft/40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </form>

        <ul className="terminal-scroll max-h-56 space-y-1 overflow-y-auto pr-1">
          {tickers.map((ticker) => (
            <li key={ticker} className="flex items-center justify-between rounded-md bg-panel-soft/35 px-2 py-1 text-xs">
              <button
                type="button"
                className="font-semibold hover:text-ai"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("gapper:composer-fill", { detail: { text: `/gap ${ticker}` } }));
                }}
              >
                {ticker}
              </button>
              <button type="button" className="text-muted hover:text-bearish" onClick={() => removeTicker(ticker)}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
