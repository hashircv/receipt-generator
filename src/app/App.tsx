import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FilePlus2,
  Info,
  LayoutDashboard,
  Menu,
  PanelsTopLeft,
  ReceiptText,
  Settings,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "../components/ui";
import { db, defaultSettings, ensureDefaults } from "../db/dexie";
import { BusinessPage } from "../features/business/BusinessPage";
import { Dashboard } from "../features/dashboard/Dashboard";
import { ReceiptEditor } from "../features/receipts/components/ReceiptEditor";
import { ReceiptsPage } from "../features/receipts/ReceiptsPage";
import { createReceipt } from "../features/receipts/services/receiptService";
import { SettingsPage } from "../features/settings/SettingsPage";
import { TemplatesPage } from "../features/templates/TemplatesPage";
import { useUI, type Page } from "../stores/ui";
import { refreshReceiptFolder } from "../lib/workspace/receiptFolder";

const nav: {
  page: Page | "new";
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "new", label: "New receipt", icon: FilePlus2 },
  { page: "receipts", label: "Receipts", icon: ReceiptText },
  { page: "templates", label: "Templates", icon: PanelsTopLeft },
  { page: "business", label: "Business profile", icon: Building2 },
  { page: "settings", label: "Settings", icon: Settings },
];

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function App() {
  const {
    page,
    activeReceiptId,
    mobileMenu,
    toast,
    setPage,
    setMobileMenu,
    openReceipt,
    notify,
    clearToast,
  } = useUI();
  const [online, setOnline] = useState(navigator.onLine);
  const [ready, setReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("receipt-sidebar-collapsed") === "true",
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches,
  );
  const theme =
    useLiveQuery(() => db.settings.get("settings"))?.theme ||
    defaultSettings.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("receipt-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    ensureDefaults()
      .then(() => refreshReceiptFolder())
      .catch(() => false)
      .finally(() => setReady(true));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
      notify("Receipt Studio installed successfully");
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [notify]);

  const navigate = async (target: Page | "new") => {
    if (target === "new") openReceipt((await createReceipt()).id);
    else setPage(target);
  };
  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "dismissed")
        notify("Installation was cancelled", "info");
      setInstallPrompt(null);
    } else
      notify(
        "Use Chrome or Edge over HTTPS, then choose Install app from the address bar",
        "info",
      );
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <header className="app-chrome sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2 font-extrabold tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ReceiptText size={19} />
          </div>
          Receipt Studio
        </div>
        <Button
          variant="ghost"
          aria-label="Toggle menu"
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          {mobileMenu ? <X size={22} /> : <Menu size={22} />}
        </Button>
      </header>

      <aside
        className={`app-chrome fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white p-4 transition-[width,transform] duration-200 lg:translate-x-0 ${sidebarCollapsed ? "lg:w-20" : "lg:w-64"} ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className={`mb-10 flex items-center pt-3 ${sidebarCollapsed ? "lg:justify-center lg:px-0" : "gap-3 px-3"}`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ReceiptText size={22} />
          </div>
          <div className={sidebarCollapsed ? "lg:hidden" : ""}>
            <div className="font-extrabold tracking-tight">Receipt Studio</div>
            <div className="text-xs text-slate-400">Your local workspace</div>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-4 top-6 hidden h-8 min-h-8 w-8 rounded-full bg-white p-0 shadow-sm lg:inline-flex"
          onClick={() => setSidebarCollapsed((value) => !value)}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </Button>
        <nav aria-label="Main navigation" className="space-y-1">
          {nav.map((item) => (
            <button
              key={item.page}
              title={sidebarCollapsed ? item.label : undefined}
              aria-label={item.label}
              onClick={() => navigate(item.page)}
              className={`flex min-h-11 w-full items-center rounded-xl text-sm font-semibold transition-colors ${sidebarCollapsed ? "lg:justify-center lg:px-0" : "gap-3 px-4 text-left"} ${page === item.page ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <item.icon size={19} />
              <span className={sidebarCollapsed ? "lg:hidden" : ""}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
        <div
          className={`absolute bottom-5 rounded-xl border border-slate-200 bg-slate-50 p-3 ${sidebarCollapsed ? "lg:left-3 lg:right-3 lg:p-2" : "left-5 right-5"}`}
        >
          <div
            className={`flex items-center text-sm font-semibold ${sidebarCollapsed ? "lg:justify-center" : "gap-2"}`}
          >
            {online ? (
              <Wifi size={16} className="text-emerald-600" />
            ) : (
              <WifiOff size={16} className="text-amber-600" />
            )}
            <span className={sidebarCollapsed ? "lg:hidden" : ""}>
              {online ? "Online" : "Offline ready"}
            </span>
          </div>
          <p
            className={`mt-1 text-xs text-slate-500 ${sidebarCollapsed ? "lg:hidden" : ""}`}
          >
            Receipts can save to your folder.
          </p>
          <Button
            className={`mt-3 w-full ${sidebarCollapsed ? "lg:px-0" : ""}`}
            size="sm"
            variant={installed ? "secondary" : "primary"}
            disabled={installed}
            title={installed ? "App installed" : "Install app"}
            onClick={install}
          >
            <Download size={15} />
            <span className={sidebarCollapsed ? "lg:hidden" : ""}>
              {installed ? "App installed" : "Install app"}
            </span>
          </Button>
        </div>
      </aside>

      {mobileMenu && (
        <button
          aria-label="Close menu"
          className="app-chrome fixed inset-0 z-30 bg-slate-950/35 lg:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <main
        className={`mx-auto max-w-[1800px] px-4 py-6 transition-[margin] duration-200 sm:px-6 lg:px-8 lg:py-9 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        {ready ? (
          page === "dashboard" ? (
            <Dashboard />
          ) : page === "receipts" ? (
            <ReceiptsPage />
          ) : page === "editor" && activeReceiptId ? (
            <ReceiptEditor key={activeReceiptId} id={activeReceiptId} />
          ) : page === "templates" ? (
            <TemplatesPage />
          ) : page === "business" ? (
            <BusinessPage />
          ) : (
            <SettingsPage />
          )
        ) : (
          <p className="text-slate-500">Opening your local workspace…</p>
        )}
      </main>

      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          className={`fixed bottom-20 right-4 z-[70] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-xl lg:bottom-5 ${toast.tone === "error" ? "border-red-200 text-red-700" : toast.tone === "info" ? "border-indigo-200 text-indigo-700" : "border-emerald-200 text-emerald-700"}`}
        >
          {toast.tone === "error" ? (
            <AlertCircle size={20} />
          ) : toast.tone === "info" ? (
            <Info size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            className="ml-2 rounded p-1 hover:bg-slate-100"
            onClick={clearToast}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
