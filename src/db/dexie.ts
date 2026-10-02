import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, Business, Receipt } from '../features/receipts/types'
import { appSettingsSchema, businessRecordSchema, storedReceiptSchema } from '../features/receipts/schemas/receiptSchema'
import { calculateReceipt } from '../lib/calculations/money'

export interface BusinessRecord extends Business { id: 'default' }
export interface Backup { version: 1; exportedAt: string; receipts: Receipt[]; business: BusinessRecord[]; settings: AppSettings[] }
export interface ReceiptFolderConfig {
  id: 'receipt-folder'
  enabled: boolean
  directoryHandle: FileSystemDirectoryHandle
  directoryName: string
  lastSyncedAt?: string
  lastError?: string
}
export const db = new Dexie('receipt-studio') as Dexie & {
  receipts: EntityTable<Receipt, 'id'>
  business: EntityTable<BusinessRecord, 'id'>
  settings: EntityTable<AppSettings, 'id'>
  localMeta: EntityTable<ReceiptFolderConfig, 'id'>
}
db.version(1).stores({ receipts: 'id, receiptNumber, date, status, updatedAt, createdAt', business: 'id', settings: 'id' })
db.version(2).stores({ receipts: 'id, receiptNumber, date, status, updatedAt, createdAt', business: 'id', settings: 'id', localMeta: 'id' })
db.version(3).stores({ receipts: 'id, receiptNumber, date, status, updatedAt, createdAt', business: 'id', settings: 'id', localMeta: 'id' }).upgrade(transaction => transaction.table<Receipt>('receipts').toCollection().modify(receipt => { Object.assign(receipt, calculateReceipt(receipt)) }))
db.version(4).stores({ receipts: 'id, receiptNumber, date, status, updatedAt, createdAt', business: 'id', settings: 'id', localMeta: 'id' }).upgrade(transaction => transaction.table<Receipt>('receipts').toCollection().modify(receipt => { Object.assign(receipt, calculateReceipt(receipt)) }))
db.version(5).stores({ receipts: 'id, receiptNumber, date, status, updatedAt, createdAt', business: 'id', settings: 'id', localMeta: 'id' }).upgrade(transaction => transaction.table<Receipt>('receipts').toCollection().modify(receipt => { Object.assign(receipt, calculateReceipt(receipt)) }))
db.version(6).stores({ receipts: 'id, receiptNumber, date, status, updatedAt, createdAt', business: 'id', settings: 'id', localMeta: 'id' }).upgrade(transaction => transaction.table<Receipt>('receipts').toCollection().modify(receipt => { Object.assign(receipt, calculateReceipt(receipt)) }))
db.version(7).stores({ receipts: 'id, receiptNumber, date, status, updatedAt, createdAt', business: 'id', settings: 'id', localMeta: 'id' }).upgrade(transaction => transaction.table<Receipt>('receipts').toCollection().modify(receipt => { Object.assign(receipt, calculateReceipt(receipt)) }))
db.version(8).stores({ receipts: 'id, receiptNumber, date, status, updatedAt, createdAt', business: 'id', settings: 'id', localMeta: 'id' }).upgrade(transaction => transaction.table<Receipt>('receipts').toCollection().modify(receipt => { Object.assign(receipt, calculateReceipt(receipt)) }))

export const defaultBusiness: BusinessRecord = { id: 'default', businessName: '', logo: '', address: '', phone: '', email: '', website: '', taxNumber: '', registrationNumber: '', defaultFooter: 'Thank you for your business!', paymentMethods: 'Cash, Card, Bank transfer' }
export const defaultSettings: AppSettings = { id: 'settings', currency: 'USD', dateFormat: 'short', prefix: 'REC-', startingNumber: 1, digits: 4, nextNumber: 1, defaultTemplate: 'modern', defaultPaymentMethod: 'Cash', defaultTax: 0, theme: 'light', exportScale: 2 }
export async function ensureDefaults() {
  if (!await db.business.get('default')) await db.business.put(defaultBusiness)
  if (!await db.settings.get('settings')) await db.settings.put(defaultSettings)
}
export async function nextReceiptNumber() {
  return db.transaction('rw', db.settings, db.receipts, async () => {
    const settings = await db.settings.get('settings') || defaultSettings
    let nextNumber = settings.nextNumber
    let number = `${settings.prefix}${String(nextNumber).padStart(settings.digits, '0')}`
    while (await db.receipts.where('receiptNumber').equals(number).first()) {
      nextNumber += 1
      number = `${settings.prefix}${String(nextNumber).padStart(settings.digits, '0')}`
    }
    await db.settings.put({ ...settings, nextNumber: nextNumber + 1 })
    return number
  })
}
export async function exportBackup(): Promise<Backup> {
  return { version: 1, exportedAt: new Date().toISOString(), receipts: await db.receipts.toArray(), business: await db.business.toArray(), settings: await db.settings.toArray() }
}
export async function importBackup(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid backup file')
  const data = value as Partial<Backup>
  if (data.version !== 1 || !Array.isArray(data.receipts) || !Array.isArray(data.business) || !Array.isArray(data.settings)) throw new Error('Unsupported backup format')
  if (data.receipts.length > 100_000 || data.business.length > 10 || data.settings.length > 10) throw new Error('Backup contains too many records')
  const receipts = data.receipts.map(receipt => calculateReceipt(storedReceiptSchema.parse(receipt)))
  const business = data.business.map(record => businessRecordSchema.parse(record))
  const settings = data.settings.map(record => appSettingsSchema.parse(record))
  await db.transaction('rw', db.receipts, db.business, db.settings, async () => {
    await Promise.all([db.receipts.clear(), db.business.clear(), db.settings.clear()])
    await db.receipts.bulkPut(receipts)
    await db.business.bulkPut(business)
    await db.settings.bulkPut(settings)
  })
  await ensureDefaults()
}
