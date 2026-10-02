import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { X } from "lucide-react";
import { clsx } from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export const cn = (...values: Parameters<typeof clsx>) => clsx(...values);
export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50",
        size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-11 px-4 text-sm",
        variant === "primary" && "bg-indigo-600 text-white hover:bg-indigo-700",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        className,
      )}
      {...props}
    />
  );
}
export const Card = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "rounded-2xl border border-slate-200 bg-white shadow-sm",
      className,
    )}
  >
    {children}
  </section>
);
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400",
        props.className,
      )}
    />
  );
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400",
        props.className,
      )}
    />
  );
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800",
        props.className,
      )}
    />
  );
}
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Close">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export { Tabs };
