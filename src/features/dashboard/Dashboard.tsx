import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  FilePlus2,
  FileText,
  FolderOpen,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { db, defaultSettings } from "../../db/dexie";
import { Button, Card } from "../../components/ui";
import { formatMoney } from "../../lib/calculations/money";
import { useUI } from "../../stores/ui";
import { createReceipt } from "../receipts/services/receiptService";

export function Dashboard() {
  const receipts =
    useLiveQuery(() => db.receipts.orderBy("updatedAt").reverse().toArray()) ||
    [];
  const settings =
    useLiveQuery(() => db.settings.get("settings")) || defaultSettings;
  const folder = useLiveQuery(() => db.localMeta.get("receipt-folder"));
  const { openReceipt, setPage } = useUI();
  const today = new Date().toISOString().slice(0, 10);
  const stats = [
    {
      icon: ReceiptText,
      label: "Total receipts",
      value: receipts.length.toString(),
    },
    {
      icon: FileText,
      label: "Today's receipts",
      value: receipts.filter((r) => r.date === today).length.toString(),
    },
    {
      icon: TrendingUp,
      label: "Total sales",
      value: formatMoney(
        receipts.reduce((sum, r) => sum + r.total, 0),
        settings.currency,
      ),
    },
  ];
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Welcome Back
          </h1>
          <p className="mt-2 text-slate-500">
            Your receipts, all in one place and ready offline.
          </p>
        </div>
        <Button onClick={async () => openReceipt((await createReceipt()).id)}>
          <FilePlus2 size={18} /> Create receipt
        </Button>
      </div>
      {!folder && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-start gap-3">
            <FolderOpen className="mt-0.5 text-indigo-600" size={22} />
            <div>
              <h2 className="font-bold text-indigo-950">
                Choose a local receipt folder
              </h2>
              <p className="mt-1 text-sm text-indigo-800">
                Save each receipt as an editable file on this computer, similar
                to saving Excel workbooks.
              </p>
            </div>
          </div>
          <Button onClick={() => setPage("settings")}>Choose folder</Button>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <s.icon size={20} />
            </div>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{s.value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="font-bold">Recent receipts</h2>
            <p className="text-sm text-slate-500">Pick up where you left off</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPage("receipts")}>
            View all <ArrowRight size={16} />
          </Button>
        </div>
        {receipts.length ? (
          <div className="divide-y divide-slate-100">
            {receipts.slice(0, 6).map((r) => (
              <button
                key={r.id}
                onClick={() => openReceipt(r.id)}
                className="flex w-full items-center justify-between gap-3 p-5 text-left hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold">{r.receiptNumber}</div>
                  <div className="text-sm text-slate-500">
                    {r.customer.name || "Walk-in customer"} · {r.date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatMoney(r.total, settings.currency)}
                  </div>
                  <div className="text-xs capitalize text-slate-500">
                    {r.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <ReceiptText className="mx-auto mb-3 text-slate-300" size={42} />
            <p className="font-semibold">No receipts yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first receipt to get started.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
