import { db, defaultBusiness, defaultSettings, nextReceiptNumber } from '../../../db/dexie'
import { calculateReceipt } from '../../../lib/calculations/money'
import { saveReceiptDocument } from '../../../lib/workspace/receiptFolder'
import type { Appearance, Receipt, ReceiptItem } from '../types'

export const makeItem = (): ReceiptItem => ({ id: crypto.randomUUID(), name: '', description: '', flavour: '', expiryDate: '', quantity: 1, unit: 'each', price: 0, discount: 0, tax: 0, total: 0 })
export const defaultAppearance: Appearance = { primaryColor: '#4f46e5', font: 'sans', title: 'RECEIPT', footer: 'Thank you for your business!', showReceiptTitle: true, showReceiptDetails: true, showBusinessSection: true, showBillingSection: true, showBusinessContact: true, showCustomerContact: true, showItemDescription: true, showTerms: true, showPaymentSummary: false, size: 'a4', customWidth: 210, customHeight: 297 }
export async function createReceipt(): Promise<Receipt> {
  const [number, business, settings] = await Promise.all([nextReceiptNumber(), db.business.get('default'), db.settings.get('settings')])
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const receipt = calculateReceipt({ id: crypto.randomUUID(), receiptNumber: number, date, time: now.toTimeString().slice(0, 5), business: business || defaultBusiness, customer: { name: '', phone: '', email: '', address: '', taxNumber: '' }, items: [makeItem()], subtotal: 0, discount: 0, tax: 0, additionalCharges: 0, total: 0, amountPaid: 0, balance: 0, paymentMethod: settings?.defaultPaymentMethod || defaultSettings.defaultPaymentMethod, notes: '', terms: '', templateId: settings?.defaultTemplate || defaultSettings.defaultTemplate, appearance: { ...defaultAppearance, footer: business?.defaultFooter || defaultAppearance.footer }, status: 'draft', createdAt: now.toISOString(), updatedAt: now.toISOString() })
  await db.receipts.put(receipt)
  void saveReceiptDocument(receipt)
  return receipt
}
export async function duplicateReceipt(source: Receipt) {
  const number = await nextReceiptNumber()
  const now = new Date().toISOString()
  const receipt: Receipt = { ...source, id: crypto.randomUUID(), receiptNumber: number, items: source.items.map(item => ({ ...item, id: crypto.randomUUID() })), status: 'draft', createdAt: now, updatedAt: now }
  await db.receipts.put(receipt)
  void saveReceiptDocument(receipt)
  return receipt
}
export async function saveReceipt(receipt: Receipt) {
  const result = calculateReceipt({ ...receipt, updatedAt: new Date().toISOString() })
  await db.receipts.put(result)
  const folder = await db.localMeta.get('receipt-folder')
  const fileSaved = await saveReceiptDocument(result)
  if (folder?.enabled && !fileSaved) throw new Error('Saved in the app cache, but the receipt folder needs to be reconnected')
  return result
}
