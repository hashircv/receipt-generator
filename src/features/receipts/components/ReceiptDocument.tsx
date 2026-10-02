import type { Receipt } from "../types";
import { formatMoney } from "../../../lib/calculations/money";

const widths = {
  a4: "794px",
  a5: "560px",
  thermal: "350px",
  custom: undefined,
};
export function ReceiptDocument({
  receipt: r,
  currency = "USD",
  dateFormat = "short",
}: {
  receipt: Receipt;
  currency?: string;
  dateFormat?: "short" | "long";
}) {
  const a = r.appearance;
  const thermal = a.size === "thermal" || r.templateId === "compact";
  const documentWidth = a.size === "custom" ? Math.max(80, a.customWidth) * 3.78 : Number.parseFloat(widths[a.size] || "794");
  const narrow = thermal || documentWidth < 500;
  const showHeader = a.showBusinessSection !== false || a.showReceiptTitle !== false || a.showReceiptDetails !== false;
  const accent = a.primaryColor || "#4f46e5";
  const fittedMoneySize = (value: number, regularSize = 12) => {
    const length = formatMoney(value, currency).length;
    if (narrow) return length > 17 ? 6.5 : length > 14 ? 7 : length > 11 ? 8 : 9;
    return length > 22 ? 9 : length > 18 ? 10 : length > 15 ? 11 : regularSize;
  };
  const formatUnitPrice = (value: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  const font =
    a.font === "serif"
      ? "Georgia, serif"
      : a.font === "mono"
        ? "ui-monospace, monospace"
        : "Inter, Arial, sans-serif";
  const border =
    r.templateId === "classic"
      ? "2px solid #1e293b"
      : r.templateId === "professional"
        ? `1px solid ${accent}`
        : "1px solid #e2e8f0";
  return (
    <article
      className="receipt-paper"
      style={{
        width:
          a.size === "custom"
            ? `${Math.max(80, a.customWidth) * 3.78}px`
            : widths[a.size],
        maxWidth: "100%",
        minHeight:
          a.size === "a4" ? "1123px" : a.size === "a5" ? "792px" : a.size === "custom" ? `${Math.max(80, a.customHeight) * 3.78}px` : undefined,
        padding: thermal ? "24px" : "48px",
        background: "#fff",
        color: "#1e293b",
        fontFamily: font,
        fontSize: thermal ? 12 : 14,
        lineHeight: 1.5,
        boxShadow: "0 16px 50px rgba(15,23,42,.1)",
      }}
    >
      <div
        style={{
          height: r.templateId === "modern" ? 7 : 0,
          background: accent,
          margin: r.templateId === "modern" ? "-48px -48px 34px" : 0,
        }}
      />
      {showHeader && <header
        style={{
          display: "flex",
          flexDirection: thermal ? "column" : "row",
          justifyContent: a.showBusinessSection === false ? "flex-start" : "space-between",
          gap: 24,
          paddingBottom: 26,
          borderBottom: border,
          textAlign: thermal ? "center" : undefined,
        }}
      >
        {a.showBusinessSection !== false && <div style={{ minWidth: 0 }}>
          {r.business.logo && (
            <img
              src={r.business.logo}
              alt="Business logo"
              style={{
                maxWidth: 110,
                maxHeight: 76,
                objectFit: "contain",
                marginBottom: 12,
              }}
            />
          )}
          <h2
            style={{
              margin: 0,
              fontSize: thermal ? 19 : 24,
              fontWeight: 800,
              color: r.templateId === "classic" ? "#1e293b" : accent,
              wordBreak: "break-word",
            }}
          >
            {r.business.businessName || "Your business"}
          </h2>
          <div
            style={{ whiteSpace: "pre-line", color: "#64748b", marginTop: 6 }}
          >
            {r.business.address}
          </div>
          {[r.business.phone, r.business.email, r.business.website].some(Boolean) && (
            <div style={{ color: "#64748b" }}>
              {[r.business.phone, r.business.email, r.business.website]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
          {r.business.taxNumber && (
            <div style={{ color: "#64748b" }}>
              Tax ID: {r.business.taxNumber}
            </div>
          )}
          {r.business.registrationNumber && (
            <div style={{ color: "#64748b" }}>
              Reg. No: {r.business.registrationNumber}
            </div>
          )}
        </div>}
        <div style={{ textAlign: a.showBusinessSection === false ? "left" : thermal ? "center" : "right", flexShrink: 0 }}>
          {a.showReceiptTitle !== false && <h1
            style={{
              margin: "0 0 8px",
              fontSize: thermal ? 22 : 34,
              letterSpacing: ".06em",
              color: r.templateId === "minimal" ? "#1e293b" : accent,
            }}
          >
            {a.title || "RECEIPT"}
          </h1>}
          {a.showReceiptDetails !== false && <>
          <div style={{ fontWeight: 700 }}>{r.receiptNumber}</div>
          <div style={{ color: "#64748b" }}>
            {dateFormat === "long" && r.date ? new Date(`${r.date}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : r.date} {r.time}
          </div>
          <div
            style={{
              marginTop: 8,
              display: "inline-block",
              borderRadius: 100,
              padding: "3px 10px",
              background:
                r.status === "paid"
                  ? "#dcfce7"
                  : r.status === "draft"
                    ? "#f1f5f9"
                    : "#fef3c7",
              color:
                r.status === "paid"
                  ? "#166534"
                  : r.status === "draft"
                    ? "#475569"
                    : "#92400e",
              textTransform: "capitalize",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {r.status}
          </div>
          </>}
        </div>
      </header>}
      {a.showBillingSection !== false && <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          padding: "24px 0",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: accent,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Bill to
          </div>
          <strong style={{ fontSize: thermal ? 13 : 16 }}>
            {r.customer.name || "Walk-in customer"}
          </strong>
          <div style={{ whiteSpace: "pre-line", color: "#64748b" }}>
            {r.customer.address}
          </div>
          {a.showCustomerContact && (
            <div style={{ color: "#64748b" }}>
              {[r.customer.phone, r.customer.email].filter(Boolean).join(" · ")}
            </div>
          )}
          {r.customer.taxNumber && (
            <div style={{ color: "#64748b" }}>
              Tax ID: {r.customer.taxNumber}
            </div>
          )}
        </div>
        <div style={{ textAlign: thermal ? "left" : "right" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: accent,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Payment
          </div>
          <strong>{r.paymentMethod || "—"}</strong>
        </div>
      </div>}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          border: "1px solid #cbd5e1",
          fontSize: narrow ? 9 : 12,
          lineHeight: narrow ? 1.25 : 1.5,
        }}
      >
        <thead>
          <tr
            style={{
              background:
                r.templateId === "classic"
                  ? "#1e293b"
                  : r.templateId === "modern" || r.templateId === "professional"
                    ? accent
                    : "#f1f5f9",
              color: ["classic", "modern", "professional"].includes(
                r.templateId,
              )
                ? "#fff"
                : "#334155",
              fontSize: narrow ? 8 : 12,
            }}
          >
            <th
              style={{
                padding: narrow ? "8px 2px" : "12px 8px",
                textAlign: "left",
                width: narrow ? "25%" : "30%",
                border: "1px solid #cbd5e1",
              }}
            >
              Description
            </th>
            <th
              style={{
                padding: narrow ? "8px 1px" : "12px 8px",
                textAlign: "left",
                width: narrow ? "12%" : "15%",
                border: "1px solid #cbd5e1",
              }}
            >
              Flavour
            </th>
            <th
              style={{
                padding: narrow ? "8px 1px" : "12px 8px",
                textAlign: "left",
                width: narrow ? "18%" : "17%",
                border: "1px solid #cbd5e1",
              }}
            >
              Expiry date
            </th>
            <th
              style={{
                padding: narrow ? "8px 1px" : "12px 8px",
                textAlign: "right",
                width: narrow ? "8%" : "9%",
                border: "1px solid #cbd5e1",
              }}
            >
              Qty
            </th>
            <th
              style={{
                padding: narrow ? "8px 1px" : "12px 8px",
                textAlign: "right",
                width: narrow ? "17%" : "14%",
                border: "1px solid #cbd5e1",
              }}
            >
              Price
            </th>
            <th
              style={{
                padding: narrow ? "8px 1px" : "12px 8px",
                textAlign: "right",
                width: narrow ? "20%" : "15%",
                border: "1px solid #cbd5e1",
              }}
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((item, index) => (
            <tr
              key={item.id}
              style={{
                borderBottom: "1px solid #e2e8f0",
                breakInside: "avoid",
                background: index % 2 === 0 ? "#ffffff" : "#f1f5f9",
              }}
            >
              <td
                style={{
                  padding: narrow ? "9px 2px" : "13px 8px",
                  overflowWrap: "anywhere",
                  border: "1px solid #dbe3ee",
                }}
              >
                <strong>{item.name || "Item"}</strong>
                {a.showItemDescription && item.description && (
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    {item.description}
                  </div>
                )}
              </td>
              <td
                style={{
                  padding: narrow ? "9px 1px" : "13px 8px",
                  overflowWrap: "anywhere",
                  border: "1px solid #dbe3ee",
                }}
              >
                {item.flavour || "—"}
              </td>
              <td
                style={{
                  padding: narrow ? "9px 1px" : "13px 8px",
                  overflowWrap: "anywhere",
                  fontSize: narrow ? 8 : 12,
                  border: "1px solid #dbe3ee",
                }}
              >
                {item.expiryDate || "—"}
              </td>
              <td
                style={{
                  padding: narrow ? "9px 1px" : "13px 8px",
                  textAlign: "right",
                  overflowWrap: "anywhere",
                  border: "1px solid #dbe3ee",
                }}
              >
                {item.quantity}
              </td>
              <td
                style={{
                  padding: narrow ? "9px 1px" : "13px 8px",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                  letterSpacing: narrow ? "-.04em" : undefined,
                  fontSize: fittedMoneySize(item.price),
                  border: "1px solid #dbe3ee",
                }}
              >
                {formatUnitPrice(item.price)}
              </td>
              <td
                style={{
                  padding: narrow ? "9px 1px" : "13px 8px",
                  textAlign: "right",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  letterSpacing: narrow ? "-.04em" : undefined,
                  fontSize: fittedMoneySize(item.total),
                  border: "1px solid #dbe3ee",
                }}
              >
                {formatMoney(item.total, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}
      >
        <div style={{ width: thermal ? "100%" : "min(100%, 300px)" }}>
          {(
            [
              ["Subtotal", r.subtotal],
              ["Additional charges", r.additionalCharges],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                padding: "5px 0",
                color: "#64748b",
              }}
            >
              <span style={{ flexShrink: 0 }}>{label}</span>
              <span style={{ minWidth: 0, maxWidth: "68%", textAlign: "right", overflowWrap: "anywhere", fontSize: fittedMoneySize(value, thermal ? 12 : 14) }}>{formatMoney(value, currency)}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              borderTop: border,
              padding: "13px 0",
              fontSize: narrow ? 16 : 21,
              fontWeight: 800,
              color: accent,
            }}
          >
            <span style={{ flexShrink: 0 }}>Total</span>
            <span style={{ minWidth: 0, textAlign: "right", whiteSpace: "nowrap", letterSpacing: narrow ? "-.03em" : undefined, fontSize: fittedMoneySize(r.total, narrow ? 16 : 21) }}>{formatMoney(r.total, currency)}</span>
          </div>
          {a.showPaymentSummary && <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "5px 0",
              }}
            >
              <span style={{ flexShrink: 0 }}>Amount paid</span>
              <span style={{ minWidth: 0, textAlign: "right", overflowWrap: "anywhere", fontSize: fittedMoneySize(r.amountPaid) }}>{formatMoney(r.amountPaid, currency)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "5px 0",
                fontWeight: 700,
              }}
            >
              <span style={{ flexShrink: 0 }}>{r.balance < 0 ? "Change" : "Balance due"}</span>
              <span style={{ minWidth: 0, textAlign: "right", overflowWrap: "anywhere", fontSize: fittedMoneySize(Math.abs(r.balance)) }}>{formatMoney(Math.abs(r.balance), currency)}</span>
            </div>
          </>}
        </div>
      </div>
      {(r.notes || (a.showTerms && r.terms)) && (
        <div
          style={{
            borderTop: border,
            marginTop: 28,
            paddingTop: 18,
            color: "#475569",
            whiteSpace: "pre-wrap",
          }}
        >
          {r.notes && (
            <p style={{ margin: "0 0 12px" }}>
              <strong>Notes</strong>
              <br />
              {r.notes}
            </p>
          )}
          {a.showTerms && r.terms && (
            <p style={{ margin: 0 }}>
              <strong>Terms</strong>
              <br />
              {r.terms}
            </p>
          )}
        </div>
      )}
      {a.footer && (
        <footer
          style={{
            borderTop: border,
            marginTop: 30,
            paddingTop: 18,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 12,
          }}
        >
          {a.footer}
        </footer>
      )}
    </article>
  );
}
