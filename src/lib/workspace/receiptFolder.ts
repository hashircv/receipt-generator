import { db, defaultBusiness, defaultSettings, type ReceiptFolderConfig } from '../../db/dexie'
import type { AppSettings, Receipt } from '../../features/receipts/types'
import { appSettingsSchema, businessRecordSchema, storedReceiptSchema } from '../../features/receipts/schemas/receiptSchema'
import { calculateReceipt } from '../calculations/money'

const CONFIG_ID = 'receipt-folder' as const
const WORKSPACE_FILE = 'Receipt Studio Workspace.json'
const RECEIPT_SUFFIX = '.receipt.json'
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024

interface WorkspaceFile {
  format: 'receipt-studio-workspace'
  version: 1
  savedAt: string
  business: typeof defaultBusiness
  settings: AppSettings
}

const safeName = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().slice(0, 80) || 'Receipt'
const receiptFileName = (receipt: Receipt) => `${safeName(receipt.receiptNumber)}--${receipt.id}${RECEIPT_SUFFIX}`

export const supportsReceiptFolder = () => typeof window.showDirectoryPicker === 'function' && window.isSecureContext

async function permissionGranted(handle: FileSystemDirectoryHandle) {
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted'
}

async function writeJson(handle: FileSystemDirectoryHandle, name: string, value: unknown) {
  const file = await handle.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(JSON.stringify(value, null, 2))
  await writable.close()
}

async function readJsonFile(handle: FileSystemFileHandle) {
  const file = await handle.getFile()
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error(`${file.name} is too large`)
  return JSON.parse(await file.text()) as unknown
}

async function updateStatus(config: ReceiptFolderConfig, error?: unknown) {
  await db.localMeta.put({ ...config, lastSyncedAt: error ? config.lastSyncedAt : new Date().toISOString(), lastError: error ? error instanceof Error ? error.message : 'Folder sync failed' : undefined })
}

async function receiptFiles(handle: FileSystemDirectoryHandle) {
  const files: FileSystemFileHandle[] = []
  for await (const entry of handle.values()) if (entry.kind === 'file' && entry.name.endsWith(RECEIPT_SUFFIX)) files.push(entry)
  return files
}

async function importWorkspaceFolder(config: ReceiptFolderConfig) {
  let workspace: WorkspaceFile | undefined
  try {
    const file = await config.directoryHandle.getFileHandle(WORKSPACE_FILE)
    const candidate = await readJsonFile(file) as Partial<WorkspaceFile>
    if (candidate.format === 'receipt-studio-workspace' && candidate.version === 1) {
      workspace = {
        format: candidate.format,
        version: candidate.version,
        savedAt: typeof candidate.savedAt === 'string' ? candidate.savedAt : new Date().toISOString(),
        business: businessRecordSchema.parse(candidate.business),
        settings: appSettingsSchema.parse(candidate.settings),
      }
    }
  } catch { /* A new workspace has no profile file yet. */ }
  if (workspace?.format === 'receipt-studio-workspace' && workspace.version === 1) {
    await db.transaction('rw', db.business, db.settings, async () => {
      await db.business.put(workspace!.business)
      await db.settings.put(workspace!.settings)
    })
  }
  for (const handle of await receiptFiles(config.directoryHandle)) {
    try {
      const receipt = calculateReceipt(storedReceiptSchema.parse(await readJsonFile(handle)))
      const local = await db.receipts.get(receipt.id)
      if (!local || receipt.updatedAt >= local.updatedAt) await db.receipts.put(receipt)
    } catch { /* Leave unrelated or damaged files untouched. */ }
  }
}

export async function saveWorkspaceProfile() {
  const config = await db.localMeta.get(CONFIG_ID)
  if (!config?.enabled) return false
  try {
    if (!await permissionGranted(config.directoryHandle)) throw new Error('Reconnect the receipt folder in Settings')
    const [business, settings] = await Promise.all([db.business.get('default'), db.settings.get('settings')])
    await writeJson(config.directoryHandle, WORKSPACE_FILE, { format: 'receipt-studio-workspace', version: 1, savedAt: new Date().toISOString(), business: business || defaultBusiness, settings: settings || defaultSettings } satisfies WorkspaceFile)
    await updateStatus(config)
    return true
  } catch (error) { await updateStatus(config, error); return false }
}

export async function saveReceiptDocument(receipt: Receipt) {
  const config = await db.localMeta.get(CONFIG_ID)
  if (!config?.enabled) return false
  try {
    if (!await permissionGranted(config.directoryHandle)) throw new Error('Reconnect the receipt folder in Settings')
    const targetName = receiptFileName(receipt)
    for (const file of await receiptFiles(config.directoryHandle)) {
      if (file.name.endsWith(`--${receipt.id}${RECEIPT_SUFFIX}`) && file.name !== targetName) await config.directoryHandle.removeEntry(file.name)
    }
    await writeJson(config.directoryHandle, targetName, receipt)
    await updateStatus(config)
    return true
  } catch (error) { await updateStatus(config, error); return false }
}

export async function deleteReceiptDocument(receiptId: string) {
  const config = await db.localMeta.get(CONFIG_ID)
  if (!config?.enabled) return false
  try {
    if (!await permissionGranted(config.directoryHandle)) throw new Error('Reconnect the receipt folder in Settings')
    for (const file of await receiptFiles(config.directoryHandle)) if (file.name.endsWith(`--${receiptId}${RECEIPT_SUFFIX}`)) await config.directoryHandle.removeEntry(file.name)
    await updateStatus(config)
    return true
  } catch (error) { await updateStatus(config, error); return false }
}

export async function syncAllToReceiptFolder() {
  const config = await db.localMeta.get(CONFIG_ID)
  if (!config?.enabled) throw new Error('Choose a receipt folder first')
  if (!await permissionGranted(config.directoryHandle)) throw new Error('Reconnect the receipt folder in Settings')
  await saveWorkspaceProfile()
  for (const receipt of await db.receipts.toArray()) await saveReceiptDocument(receipt)
  return true
}

export async function connectReceiptFolder() {
  if (!supportsReceiptFolder()) throw new Error('Receipt folders require Chrome or Edge on HTTPS or localhost')
  const directoryHandle = await window.showDirectoryPicker!({ mode: 'readwrite', id: 'receipt-studio-workspace' })
  const permission = await directoryHandle.requestPermission({ mode: 'readwrite' })
  if (permission !== 'granted') throw new Error('Write access to the selected folder was not granted')
  const config: ReceiptFolderConfig = { id: CONFIG_ID, enabled: true, directoryHandle, directoryName: directoryHandle.name }
  await db.localMeta.put(config)
  await importWorkspaceFolder(config)
  await syncAllToReceiptFolder()
  return config
}

export async function reconnectReceiptFolder() {
  const config = await db.localMeta.get(CONFIG_ID)
  if (!config) throw new Error('Choose a receipt folder first')
  const permission = await config.directoryHandle.requestPermission({ mode: 'readwrite' })
  if (permission !== 'granted') throw new Error('Write access to the selected folder was not granted')
  await db.localMeta.put({ ...config, enabled: true, lastError: undefined })
  await importWorkspaceFolder(config)
  await syncAllToReceiptFolder()
}

export async function refreshReceiptFolder() {
  const config = await db.localMeta.get(CONFIG_ID)
  if (!config?.enabled || !await permissionGranted(config.directoryHandle)) return false
  await importWorkspaceFolder(config)
  await syncAllToReceiptFolder()
  return true
}

export async function disconnectReceiptFolder() {
  await db.localMeta.delete(CONFIG_ID)
}
