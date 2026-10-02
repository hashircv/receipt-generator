import type { Receipt, ReceiptItem } from '../../features/receipts/types'
const numeric = (value: number) => Number(value) || 0
const cents = (value: number) => Math.round(numeric(value) * 100)
const amount = (value: number) => Math.round(value) / 100
export function calculateItem(item: ReceiptItem) {
  const base = Math.round(cents(item.price) * numeric(item.quantity))
  return { base: amount(base), total: amount(base) }
}
export function calculateReceipt(receipt: Receipt): Receipt {
  const items = receipt.items.map(item => ({ ...item, quantity: numeric(item.quantity), price: amount(cents(item.price)), discount: 0, tax: 0, total: calculateItem(item).total }))
  const subtotal = amount(items.reduce((sum, item) => sum + calculateItem(item).base * 100, 0))
  const additionalCharges = amount(cents(receipt.additionalCharges))
  const amountPaid = amount(cents(receipt.amountPaid))
  const total = amount(cents(subtotal) + cents(additionalCharges))
  const balance = amount(cents(total) - cents(amountPaid))
  return { ...receipt, appearance: { ...receipt.appearance, showReceiptTitle: receipt.appearance.showReceiptTitle ?? true, showReceiptDetails: receipt.appearance.showReceiptDetails ?? true, showBusinessSection: receipt.appearance.showBusinessSection ?? true, showBillingSection: receipt.appearance.showBillingSection ?? true, showPaymentSummary: receipt.appearance.showPaymentSummary ?? false }, items, subtotal, discount: 0, tax: 0, additionalCharges, amountPaid, total, balance, status: receipt.status === 'draft' ? 'draft' : balance <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid' }
}
export const formatMoney = (value: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(value || 0)
