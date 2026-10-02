import { useLiveQuery } from "dexie-react-hooks";
import { Check } from "lucide-react";
import { db, defaultSettings } from "../../db/dexie";
import { Button, Card } from "../../components/ui";
import type { TemplateId } from "../receipts/types";
import { saveWorkspaceProfile } from "../../lib/workspace/receiptFolder";

const templates: { id: TemplateId; detail: string; swatch: string }[] = [
  {
    id: "minimal",
    detail: "Simple, quiet and content focused",
    swatch: "bg-slate-100",
  },
  {
    id: "classic",
    detail: "Traditional business layout",
    swatch: "bg-slate-800",
  },
  {
    id: "modern",
    detail: "Bold accent and clean structure",
    swatch: "bg-indigo-600",
  },
  {
    id: "compact",
    detail: "Space saving receipt format",
    swatch: "bg-emerald-600",
  },
  {
    id: "professional",
    detail: "Refined lines and strong hierarchy",
    swatch: "bg-violet-700",
  },
];
export function TemplatesPage() {
  const settings =
    useLiveQuery(() => db.settings.get("settings")) || defaultSettings;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Templates</h1>
        <p className="mt-1 text-slate-500">
          Choose a default. You can switch any receipt in its editor.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <div className={`h-36 p-5 ${t.swatch}`}>
              <div className="mx-auto h-full max-w-[110px] rounded bg-white p-3 shadow-lg">
                <div className="mb-3 h-2 w-2/3 rounded bg-slate-300" />
                <div className="mb-1 h-1 w-full rounded bg-slate-200" />
                <div className="mb-5 h-1 w-4/5 rounded bg-slate-200" />
                <div className="mb-1 h-1 w-full rounded bg-slate-200" />
                <div className="h-1 w-full rounded bg-slate-200" />
              </div>
            </div>
            <div className="p-5">
              <h2 className="text-lg font-bold capitalize">{t.id}</h2>
              <p className="mb-4 text-sm text-slate-500">{t.detail}</p>
              <Button
                variant={
                  settings.defaultTemplate === t.id ? "primary" : "secondary"
                }
                className="w-full"
                onClick={async () => {
                  await db.settings.put({ ...settings, defaultTemplate: t.id });
                  void saveWorkspaceProfile();
                }}
              >
                {settings.defaultTemplate === t.id && <Check size={16} />}{" "}
                {settings.defaultTemplate === t.id
                  ? "Default template"
                  : "Set as default"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
