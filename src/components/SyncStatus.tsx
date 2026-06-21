import { useState } from "react";
import { useSync } from "../sync/syncContext";
import type { SyncState } from "../sync/syncContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  AlertCircle,
  Check,
  Cloud,
  CloudOff,
  LogOut,
  RefreshCw,
} from "lucide-react";

const relativeTime = (iso: string | null): string => {
  if (!iso) return "never";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const statusLabel = (state: SyncState, lastSyncedAt: string | null): string => {
  switch (state) {
    case "syncing":
      return "Syncing…";
    case "offline":
      return "Offline — changes saved locally";
    case "error":
      return "Sync error — will retry";
    case "idle":
      return `Synced ${relativeTime(lastSyncedAt)}`;
    default:
      return "";
  }
};

const StatusIcon = ({ state }: { state: SyncState }) => {
  switch (state) {
    case "syncing":
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    case "offline":
      return <CloudOff className="h-4 w-4" />;
    case "error":
      return <AlertCircle className="text-destructive h-4 w-4" />;
    case "idle":
      return <Check className="h-4 w-4 text-green-600" />;
    default:
      return <Cloud className="h-4 w-4" />;
  }
};

/**
 * Compact sync status + auth control. Renders nothing when sync isn't
 * configured, a sign-in row when signed out, and a status + sign-out row once
 * signed in.
 */
export function SyncStatus() {
  const sync = useSync();
  const [email, setEmail] = useState("");

  if (sync.state === "disabled") return null;

  if (sync.state === "signedOut") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Cloud className="h-4 w-4" />
          <span>Sign in to sync across your devices</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim()) {
                void sync.signInWithEmail(email.trim());
              }
            }}
            className="sm:w-56"
          />
          <Button
            variant="outline"
            disabled={!email.trim()}
            onClick={() => void sync.signInWithEmail(email.trim())}
          >
            Email link
          </Button>
          <Button variant="outline" onClick={() => void sync.signInWithGoogle()}>
            Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex items-center justify-between rounded-lg border p-3 text-sm">
      <button
        type="button"
        className="flex items-center gap-2"
        onClick={sync.syncNow}
        title="Sync now"
      >
        <StatusIcon state={sync.state} />
        <span>{statusLabel(sync.state, sync.lastSyncedAt)}</span>
        {sync.email && <span className="hidden sm:inline">· {sync.email}</span>}
      </button>
      <Button variant="ghost" size="sm" onClick={() => void sync.signOut()}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
