"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { channelDisplayName, defaultSortOrderForChannel, normalizeChannelName } from "@/lib/channels";
import type { Channel, Workspace } from "@/types/workspace";

type BackendChannelInput = {
  name: string;
  displayName?: string;
  sortOrder?: number;
  isPremium?: boolean;
};

interface WorkspaceState {
  workspaces: Workspace[];
  selectedWorkspaceId: string;
  channels: Channel[];
  selectedChannelId: string;
  lastChannelByWorkspace: Record<string, string>;
  channelsLoading: boolean;
  channelsHydrated: boolean;
  channelsError: string | null;
  createWorkspace: (_name: string) => void;
  renameWorkspace: (_workspaceId: string, _name: string) => void;
  selectWorkspace: (workspaceId: string) => void;
  createChannel: (_workspaceId: string, _name: string) => void;
  renameChannel: (_channelId: string, _name: string) => void;
  deleteChannel: (_channelId: string) => void;
  selectChannel: (channelId: string) => void;
  setChannelsLoading: (loading: boolean) => void;
  setChannelsError: (error: string | null) => void;
  setBackendChannels: (channels: BackendChannelInput[]) => void;
  ensureChannel: (channelName: string, displayName?: string) => string;
}

const DEFAULT_WORKSPACE_ID = "ws-universe";
const SEED_CREATED_AT = "2026-01-01T00:00:00.000Z";
const WORKSPACE: Workspace = {
  id: DEFAULT_WORKSPACE_ID,
  name: "Universe Layers",
  slug: "universe-layers",
  createdAt: SEED_CREATED_AT
};

function initialState() {
  return {
    workspaces: [WORKSPACE],
    selectedWorkspaceId: DEFAULT_WORKSPACE_ID,
    channels: [],
    selectedChannelId: "",
    lastChannelByWorkspace: {
      [DEFAULT_WORKSPACE_ID]: ""
    },
    channelsLoading: false,
    channelsHydrated: false,
    channelsError: null
  };
}

function toChannel(input: BackendChannelInput): Channel | null {
  const name = normalizeChannelName(input.name);
  if (!name) {
    return null;
  }
  const displayName = channelDisplayName(name, input.displayName);
  const sortOrder = Number.isFinite(input.sortOrder)
    ? Math.trunc(input.sortOrder ?? 0)
    : defaultSortOrderForChannel(name);
  return {
    id: name,
    slug: name,
    workspaceId: DEFAULT_WORKSPACE_ID,
    name: displayName,
    topic: `Channel for ${displayName.toLowerCase()}`,
    createdAt: new Date().toISOString(),
    sortOrder,
    isPremium: Boolean(input.isPremium)
  };
}

function sortChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    const orderA = Number.isFinite(a.sortOrder) ? Number(a.sortOrder) : 1000;
    const orderB = Number.isFinite(b.sortOrder) ? Number(b.sortOrder) : 1000;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.id.localeCompare(b.id);
  });
}

function resolveDefaultChannel(channels: Channel[], currentSelectedId: string): string {
  if (currentSelectedId && channels.some((channel) => channel.id === currentSelectedId)) {
    return currentSelectedId;
  }
  if (channels.some((channel) => channel.id === "live_gappers")) {
    return "live_gappers";
  }
  return channels[0]?.id ?? "";
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      createWorkspace: () => {},
      renameWorkspace: () => {},
      selectWorkspace: (workspaceId) => {
        if (workspaceId !== DEFAULT_WORKSPACE_ID) {
          return;
        }
        const remembered = get().lastChannelByWorkspace[DEFAULT_WORKSPACE_ID] ?? "";
        const fallback = get().channels[0]?.id ?? "";
        set({
          selectedWorkspaceId: DEFAULT_WORKSPACE_ID,
          selectedChannelId: remembered || fallback
        });
      },
      createChannel: () => {},
      renameChannel: () => {},
      deleteChannel: () => {},
      selectChannel: (channelId) => {
        if (!get().channels.some((channel) => channel.id === channelId)) {
          return;
        }
        set((state) => ({
          selectedChannelId: channelId,
          selectedWorkspaceId: DEFAULT_WORKSPACE_ID,
          lastChannelByWorkspace: {
            ...state.lastChannelByWorkspace,
            [DEFAULT_WORKSPACE_ID]: channelId
          }
        }));
      },
      setChannelsLoading: (loading) => {
        set({
          channelsLoading: loading
        });
      },
      setChannelsError: (error) => {
        set({
          channelsError: error,
          channelsLoading: false
        });
      },
      setBackendChannels: (inputs) => {
        const deduped = new Map<string, Channel>();
        for (const input of inputs) {
          const channel = toChannel(input);
          if (!channel) {
            continue;
          }
          deduped.set(channel.id, channel);
        }
        const nextChannels = sortChannels(Array.from(deduped.values()));
        const currentSelectedId = get().channelsHydrated ? get().selectedChannelId : "";
        const selectedChannelId = resolveDefaultChannel(nextChannels, currentSelectedId);
        set((state) => ({
          workspaces: [WORKSPACE],
          selectedWorkspaceId: DEFAULT_WORKSPACE_ID,
          channels: nextChannels,
          selectedChannelId,
          lastChannelByWorkspace: {
            ...state.lastChannelByWorkspace,
            [DEFAULT_WORKSPACE_ID]: selectedChannelId
          },
          channelsLoading: false,
          channelsHydrated: true,
          channelsError: null
        }));
      },
      ensureChannel: (channelName, displayName) => {
        const normalized = normalizeChannelName(channelName);
        if (!normalized) {
          return "";
        }

        const existing = get().channels.find((channel) => channel.id === normalized);
        if (existing) {
          return existing.id;
        }

        const newChannel: Channel = {
          id: normalized,
          slug: normalized,
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: channelDisplayName(normalized, displayName),
          topic: `Channel for ${channelDisplayName(normalized, displayName).toLowerCase()}`,
          createdAt: new Date().toISOString(),
          sortOrder: defaultSortOrderForChannel(normalized),
          isPremium: false
        };

        set((state) => {
          const channels = sortChannels([...state.channels, newChannel]);
          const selectedChannelId = state.selectedChannelId || resolveDefaultChannel(channels, "");
          return {
            channels,
            selectedChannelId,
            lastChannelByWorkspace: {
              ...state.lastChannelByWorkspace,
              [DEFAULT_WORKSPACE_ID]: selectedChannelId
            },
            channelsHydrated: true
          };
        });
        return normalized;
      }
    }),
    {
      name: "gapper-workspace",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (_persistedState, _version) => ({
        ...initialState()
      }),
      partialize: (state) => ({
        workspaces: state.workspaces,
        selectedWorkspaceId: state.selectedWorkspaceId,
        channels: state.channels,
        selectedChannelId: state.selectedChannelId,
        lastChannelByWorkspace: state.lastChannelByWorkspace
      })
    }
  )
);
