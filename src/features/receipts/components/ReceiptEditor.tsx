import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Image,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { db, defaultSettings } from "../../../db/dexie";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "../../../components/ui";
import { calculateReceipt, formatMoney } from "../../../lib/calculations/money";
import {
  exportReceiptAsImage,
  exportReceiptAsPdf,
} from "../../../lib/export/receiptExport";
import { useUI } from "../../../stores/ui";
import { receiptSchema, storedReceiptSchema } from "../schemas/receiptSchema";
import { makeItem, saveReceipt } from "../services/receiptService";
import type { Receipt, TemplateId } from "../types";
import { ReceiptDocument } from "./ReceiptDocument";
import { readLogoFile } from "../../../lib/security/images";

const templates: TemplateId[] = [
  "minimal",
  "classic",
  "modern",
  "compact",
  "professional",
];
const inputNumber = { valueAsNumber: true };
export function ReceiptEditor({ id }: { id: string }) {
  const source = useLiveQuery(() => db.receipts.get(id), [id]);
  const settings =
    useLiveQuery(() => db.settings.get("settings")) || defaultSettings;
  const { setPage, notify } = useUI();
  const {
    register,
    control,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<Receipt>({ defaultValues: source });
  const { fields, append, remove, move, insert } = useFieldArray({
    control,
    name: "items",
  });
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [collapsedItemIds, setCollapsedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const loaded = useRef<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const previewPane = useRef<HTMLDivElement | null>(null);
  const previewDocument = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(0.75);
  const [previewHeight, setPreviewHeight] = useState(0);
  const values = watch();
  // React Hook Form may mutate nested watched values without changing their
  // parent reference. Recalculate on every render so appearance checkboxes
  // always update the preview immediately.
  const receipt = values.id ? calculateReceipt(values) : null;
  const previewWidth =
    receipt?.appearance.size === "thermal"
      ? 350
      : receipt?.appearance.size === "a5"
        ? 560
        : receipt?.appearance.size === "custom"
          ? Math.max(80, receipt.appearance.customWidth) * 3.78
          : 794;
  useLayoutEffect(() => {
    if (!receipt || !previewPane.current || !previewDocument.current) return;
    const updatePreviewSize = () => {
      const available = Math.max(280, previewPane.current!.clientWidth - 40);
      const scale = Math.min(1, available / previewWidth);
      setPreviewScale(scale);
      setPreviewHeight(previewDocument.current!.scrollHeight * scale);
    };
    const observer = new ResizeObserver(updatePreviewSize);
    observer.observe(previewPane.current);
    observer.observe(previewDocument.current);
    updatePreviewSize();
    return () => observer.disconnect();
  }, [
    !!receipt,
    previewWidth,
    receipt?.items.length,
    receipt?.appearance.showPaymentSummary,
  ]);
  useEffect(() => {
    if (source && loaded.current !== source.id) {
      let restored = calculateReceipt(source);
      const pending = localStorage.getItem(`receipt-pending-${source.id}`);
      try {
        if (pending) {
          const parsed = storedReceiptSchema.safeParse(JSON.parse(pending));
          if (parsed.success && parsed.data.id === source.id)
            restored = calculateReceipt(parsed.data);
        }
      } catch {
        /* Ignore damaged recovery cache. */
      }
      reset(restored);
      loaded.current = source.id;
      const appearanceWasNormalized =
        source.appearance.showBillingSection === undefined ||
        source.appearance.showBusinessSection === undefined ||
        source.appearance.showReceiptTitle === undefined ||
        source.appearance.showReceiptDetails === undefined ||
        source.appearance.showPaymentSummary === undefined;
      if (pending || appearanceWasNormalized)
        saveReceipt(restored).then(() => {
          if (localStorage.getItem(`receipt-pending-${source.id}`) === pending)
            localStorage.removeItem(`receipt-pending-${source.id}`);
        });
    }
  }, [source, reset]);
  useEffect(() => {
    const subscription = watch((value) => {
      if (!value.id || loaded.current !== id) return;
      setSaveState("saving");
      const snapshot = JSON.stringify(value);
      localStorage.setItem(`receipt-pending-${id}`, snapshot);
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveReceipt(calculateReceipt(value as Receipt))
          .then(() => {
            if (localStorage.getItem(`receipt-pending-${id}`) === snapshot)
              localStorage.removeItem(`receipt-pending-${id}`);
            setSaveState("saved");
          })
          .catch(() => setSaveState("error"));
      }, 500);
    });
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(saveTimer.current);
    };
  }, [watch, id]);
  if (!source || !receipt)
    return <div className="p-8 text-slate-500">Loading receipt…</div>;
  const persistNow = async () => {
    window.clearTimeout(saveTimer.current);
    setSaveState("saving");
    await saveReceipt(calculateReceipt(getValues()));
    localStorage.removeItem(`receipt-pending-${id}`);
    setSaveState("saved");
  };
  const saveDraft = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await persistNow();
      notify("Draft saved successfully");
    } catch (error) {
      setSaveState("error");
      notify(
        error instanceof Error ? error.message : "Could not save the draft",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  };
  const finalize = async () => {
    if (actionBusy) return;
    const result = receiptSchema.safeParse(getValues());
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues)
        next[issue.path.join(".")] = issue.message;
      setCollapsedItemIds(new Set());
      setValidation(next);
      notify("Please complete the required receipt fields", "error");
      return;
    }
    setActionBusy(true);
    setValidation({});
    try {
      const updated = calculateReceipt({ ...getValues(), status: "unpaid" });
      setValue("status", updated.status);
      window.clearTimeout(saveTimer.current);
      await saveReceipt(updated);
      localStorage.removeItem(`receipt-pending-${id}`);
      notify(
        source.status === "draft"
          ? `${updated.receiptNumber} saved successfully`
          : `${updated.receiptNumber} updated successfully`,
      );
      setPage("receipts");
    } catch (error) {
      setSaveState("error");
      notify(
        error instanceof Error ? error.message : "Could not save the receipt",
        "error",
      );
    } finally {
      setActionBusy(false);
    }
  };
  const exportFile = async (format: "png" | "jpg" | "pdf") => {
    if (exporting || actionBusy) return;
    setExporting(true);
    try {
      await persistNow();
      if (format === "pdf")
        await exportReceiptAsPdf(
          receipt,
          settings.currency,
          settings.exportScale,
          settings.dateFormat,
        );
      else
        await exportReceiptAsImage(
          receipt,
          settings.currency,
          format,
          settings.exportScale,
          settings.dateFormat,
        );
      notify(`${format.toUpperCase()} download started`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Export failed", "error");
    } finally {
      setExporting(false);
    }
  };
  const field = (
    label: string,
    path: Parameters<typeof register>[0],
    placeholder = "",
    type = "text",
    error?: string,
  ) => (
    <Field label={label} error={error}>
      <Input
        type={type}
        placeholder={placeholder}
        {...register(path, type === "number" ? inputNumber : undefined)}
      />
    </Field>
  );
  const checkbox = (label: string, path: Parameters<typeof register>[0]) => (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        className="h-4 w-4 accent-indigo-600"
        {...register(path)}
      />
      {label}
    </label>
  );
  const section = (title: string, children: React.ReactNode) => (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-bold text-slate-900">{title}</h3>
      {children}
    </Card>
  );
  const editor = (
    <div className="space-y-4 pb-24 lg:pb-8">
      {section(
        "Receipt details",
        <div className="grid grid-cols-2 gap-3">
          {field(
            "Receipt number",
            "receiptNumber",
            "REC-0001",
            "text",
            validation.receiptNumber,
          )}
          {field("Date", "date", "", "date")}
          {field("Time", "time", "", "time")}
          <Field
            label="Payment method"
            hint="Select a suggestion or type any payment type"
          >
            <Input
              list="payment-method-options"
              placeholder="Cash, card, transfer…"
              {...register("paymentMethod")}
            />
            <datalist id="payment-method-options">
              {Array.from(
                new Set(
                  [
                    "Cash",
                    "Card",
                    "Bank transfer",
                    "UPI",
                    "Cheque",
                    "Credit",
                    ...receipt.business.paymentMethods
                      .split(",")
                      .map((s) => s.trim()),
                  ].filter(Boolean),
                ),
              ).map((method) => (
                <option key={method} value={method} />
              ))}
            </datalist>
          </Field>
        </div>,
      )}
      {section(
        "Business",
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field(
              "Business name",
              "business.businessName",
              "Your business",
              "text",
              validation["business.businessName"],
            )}
            {field("Phone", "business.phone", "+1 555 000 0000")}
            {field("Email", "business.email", "hello@example.com", "email")}
            {field("Website", "business.website", "example.com")}
            {field("Tax number", "business.taxNumber")}
            {field("Registration number", "business.registrationNumber")}
          </div>
          <Field label="Address">
            <Textarea {...register("business.address")} />
          </Field>
          <Field label="Logo">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setValue("business.logo", await readLogoFile(file), {
                    shouldDirty: true,
                  });
                } catch (error) {
                  notify(
                    error instanceof Error
                      ? error.message
                      : "Could not load logo",
                    "error",
                  );
                }
              }}
            />
          </Field>
          {receipt.business.logo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValue("business.logo", "")}
            >
              Remove logo
            </Button>
          )}
        </div>,
      )}
      {section(
        "Customer",
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {field("Customer name", "customer.name", "Walk-in customer")}
          {field("Phone", "customer.phone")}
          {field("Email", "customer.email", "", "email")}
          {field("Tax number", "customer.taxNumber")}
          <div className="sm:col-span-2">
            <Field label="Address">
              <Textarea {...register("customer.address")} />
            </Field>
          </div>
        </div>,
      )}
      {section(
        "Items",
        <div className="space-y-3">
          {fields.map((row, index) => {
            const collapsed = collapsedItemIds.has(row.id);
            const item = receipt.items[index];
            const toggle = () =>
              setCollapsedItemIds((current) => {
                const next = new Set(current);
                if (next.has(row.id)) next.delete(row.id);
                else next.add(row.id);
                return next;
              });
            return (
              <div
                key={row.id}
                className={`overflow-hidden rounded-xl border-2 shadow-sm transition-colors ${collapsed ? "border-slate-400 bg-white" : "border-indigo-500 bg-slate-50"}`}
              >
                <div className="flex flex-wrap items-center gap-1 p-2 sm:flex-nowrap sm:gap-2">
                  <button
                    type="button"
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? "Expand" : "Collapse"} item ${index + 1}`}
                    onClick={toggle}
                    className="flex min-h-10 min-w-0 basis-full items-center gap-2 rounded-lg px-2 text-left hover:bg-white sm:flex-1 sm:basis-auto"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-extrabold text-indigo-700">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                      {item?.name || `Item ${index + 1}`}
                    </span>
                    <span className="hidden shrink-0 text-xs font-bold text-indigo-700 xl:inline">
                      {formatMoney(item?.total || 0, settings.currency)}
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Move item up"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Move item down"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Duplicate item"
                      onClick={() =>
                        insert(index + 1, {
                          ...getValues(`items.${index}`),
                          id: crypto.randomUUID(),
                        })
                      }
                    >
                      <Copy size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      aria-label="Delete item"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                  <button
                    type="button"
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? "Expand" : "Collapse"} item ${index + 1}`}
                    title={collapsed ? "Expand item" : "Collapse item"}
                    onClick={toggle}
                    className={`ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm ${collapsed ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700" : "border-slate-400 bg-white text-slate-700 hover:bg-slate-100"}`}
                  >
                    {collapsed ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronUp size={18} />
                    )}
                  </button>
                </div>
                {!collapsed && (
                  <div className="grid grid-cols-2 gap-3 border-t border-indigo-100 p-3 sm:grid-cols-4">
                    <div className="col-span-2 sm:col-span-4">
                      {field(
                        "Description",
                        `items.${index}.name`,
                        "Product description",
                        "text",
                        validation[`items.${index}.name`],
                      )}
                    </div>
                    <div className="col-span-2">
                      {field(
                        "Flavour",
                        `items.${index}.flavour`,
                        "Optional flavour",
                      )}
                    </div>
                    <div className="col-span-2">
                      {field(
                        "Expiry date",
                        `items.${index}.expiryDate`,
                        "",
                        "date",
                      )}
                    </div>
                    {field(
                      "Qty",
                      `items.${index}.quantity`,
                      "",
                      "number",
                      validation[`items.${index}.quantity`],
                    )}
                    {field(
                      "Price",
                      `items.${index}.price`,
                      "",
                      "number",
                      validation[`items.${index}.price`],
                    )}
                    <div className="col-span-2 flex items-end justify-end pb-2 text-sm font-bold text-slate-700">
                      Amount: {formatMoney(item?.total || 0, settings.currency)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Button
            type="button"
            className="min-h-12 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-base shadow-lg shadow-indigo-200 ring-1 ring-indigo-500 hover:from-indigo-700 hover:to-violet-700"
            onClick={() => append(makeItem())}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Plus size={18} />
            </span>{" "}
            Add another item
          </Button>
        </div>,
      )}
      {section(
        "Totals & notes",
        <div className="space-y-3">
          <div
            className={`grid gap-3 ${receipt.appearance.showPaymentSummary ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {field(
              "Additional charges",
              "additionalCharges",
              "",
              "number",
              validation.additionalCharges,
            )}
            {receipt.appearance.showPaymentSummary &&
              field(
                "Amount paid",
                "amountPaid",
                "",
                "number",
                validation.amountPaid,
              )}
          </div>
          <div className="rounded-xl bg-indigo-50 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span>Subtotal</span>
              <strong className="min-w-0 break-words text-right">
                {formatMoney(receipt.subtotal, settings.currency)}
              </strong>
            </div>
            <div className="mt-2 flex justify-between gap-3 text-base font-bold">
              <span>Total</span>
              <span className="min-w-0 break-words text-right">
                {formatMoney(receipt.total, settings.currency)}
              </span>
            </div>
          </div>
          <Field label="Notes">
            <Textarea {...register("notes")} />
          </Field>
          <Field label="Terms and conditions">
            <Textarea {...register("terms")} />
          </Field>
        </div>,
      )}
      {section(
        "Template & appearance",
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Template">
              <Select {...register("templateId")}>
                {templates.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Document size">
              <Select {...register("appearance.size")}>
                <option value="a4">A4</option>
                <option value="a5">A5</option>
                <option value="thermal">Thermal</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <Field label="Accent color">
              <Input
                type="color"
                {...register("appearance.primaryColor")}
                className="h-10 p-1"
              />
            </Field>
            <Field label="Font">
              <Select {...register("appearance.font")}>
                <option value="sans">Sans serif</option>
                <option value="serif">Serif</option>
                <option value="mono">Monospace</option>
              </Select>
            </Field>
            {receipt.appearance.showReceiptTitle !== false &&
              field("Receipt title", "appearance.title")}
            {field("Footer text", "appearance.footer")}
            {receipt.appearance.size === "custom" && (
              <>
                {field("Width (mm)", "appearance.customWidth", "", "number")}
                {field("Height (mm)", "appearance.customHeight", "", "number")}
              </>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checkbox("Show receipt title", "appearance.showReceiptTitle")}
            {checkbox(
              "Show receipt number and date",
              "appearance.showReceiptDetails",
            )}
            {checkbox(
              "Show business section",
              "appearance.showBusinessSection",
            )}
            {checkbox(
              "Show billing and payment section",
              "appearance.showBillingSection",
            )}
            {checkbox(
              "Show customer contact",
              "appearance.showCustomerContact",
            )}
            {checkbox(
              "Show item descriptions",
              "appearance.showItemDescription",
            )}
            {checkbox(
              "Show amount paid and balance",
              "appearance.showPaymentSummary",
            )}
            {checkbox("Show terms", "appearance.showTerms")}
          </div>
        </div>,
      )}
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            className="mb-1 text-sm text-indigo-600 hover:underline"
            onClick={() => setPage("receipts")}
          >
            ← Back to receipts
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {receipt.receiptNumber}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span
              className={`h-2 w-2 rounded-full ${saveState === "error" ? "bg-red-500" : saveState === "saving" ? "bg-amber-400" : "bg-emerald-500"}`}
            />
            {saveState === "saving"
              ? "Saving…"
              : saveState === "error"
                ? "Save failed"
                : "Saved locally"}
            {!navigator.onLine && " · Offline"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={actionBusy || exporting}
            onClick={saveDraft}
          >
            <Save size={16} /> {actionBusy ? "Saving…" : "Save draft"}
          </Button>
          <Button disabled={actionBusy || exporting} onClick={finalize}>
            <Check size={16} /> {actionBusy ? "Saving…" : "Save receipt"}
          </Button>
        </div>
      </div>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-sm text-red-600">
          Please check the highlighted fields.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={exporting || actionBusy}
          onClick={() => exportFile("png")}
        >
          <Image size={16} /> PNG
        </Button>
        <Button
          variant="secondary"
          disabled={exporting || actionBusy}
          onClick={() => exportFile("jpg")}
        >
          <Image size={16} /> JPG
        </Button>
        <Button
          variant="secondary"
          disabled={exporting || actionBusy}
          onClick={() => exportFile("pdf")}
        >
          <Download size={16} /> PDF
        </Button>
      </div>
      <div
        className="grid grid-cols-2 rounded-xl bg-slate-200 p-1 lg:hidden"
        role="tablist"
        aria-label="Receipt workspace"
      >
        <button
          role="tab"
          aria-selected={mobileTab === "edit"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${mobileTab === "edit" ? "bg-white shadow" : ""}`}
          onClick={() => setMobileTab("edit")}
        >
          Editor
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === "preview"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${mobileTab === "preview" ? "bg-white shadow" : ""}`}
          onClick={() => setMobileTab("preview")}
        >
          Preview
        </button>
      </div>
      <div className="items-start gap-6 lg:grid lg:grid-cols-2">
        <div
          className={`min-w-0 ${mobileTab === "edit" ? "" : "hidden lg:block"}`}
        >
          {editor}
        </div>
        <div
          ref={previewPane}
          className={`${mobileTab === "preview" ? "" : "hidden lg:block"} sticky top-5 min-w-0 max-h-[calc(100vh-40px)] overflow-auto rounded-2xl bg-slate-100 p-3 scrollbar-thin lg:p-5`}
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Live preview
          </div>
          <div
            className="mx-auto"
            style={{
              width: previewWidth * previewScale,
              height: previewHeight || undefined,
            }}
          >
            <div
              ref={previewDocument}
              style={{
                width: previewWidth,
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
              <ReceiptDocument
                receipt={receipt}
                currency={settings.currency}
                dateFormat={settings.dateFormat}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-20 flex gap-2 border-t bg-white p-3 lg:hidden">
        <Button
          className="flex-1"
          disabled={actionBusy || exporting}
          onClick={finalize}
        >
          <Check size={16} /> {actionBusy ? "Saving…" : "Save receipt"}
        </Button>
        <Button
          variant="secondary"
          disabled={actionBusy || exporting}
          onClick={() => exportFile("png")}
        >
          <Download size={16} /> Export
        </Button>
      </div>
    </div>
  );
}
