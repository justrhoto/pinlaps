import { useRef } from "react";
import { parseBackup, serializeBackup } from "../utils/backup";
import { useData } from "../store/dataContext";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

export function DataBackup() {
  const { arcades, laps, importBackup } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasData = arcades.length > 0 || laps.length > 0;

  const handleExport = () => {
    const json = serializeBackup(arcades, laps);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pinlaps-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so the same file can be re-selected
    if (!file) return;

    try {
      importBackup(parseBackup(await file.text()));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not import backup",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup &amp; Restore</CardTitle>
        <CardDescription>
          Export your arcades and laps to a file, or import a previous backup.
          Importing merges with your existing data.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="outline" onClick={handleExport} disabled={!hasData}>
          <Download className="mr-2 h-4 w-4" />
          Export data
        </Button>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import data
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}
