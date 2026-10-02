import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FolderOpen, RefreshCw, Trash2, Unplug } from 'lucide-react'
import { db, defaultSettings, ensureDefaults } from '../../db/dexie'
import { Button, Card, Field, Input, Modal, Select } from '../../components/ui'
import { connectReceiptFolder, disconnectReceiptFolder, reconnectReceiptFolder, saveWorkspaceProfile, supportsReceiptFolder, syncAllToReceiptFolder } from '../../lib/workspace/receiptFolder'
import type { AppSettings } from '../receipts/types'

export function SettingsPage() {
  const saved = useLiveQuery(() => db.settings.get('settings'))
  const folder = useLiveQuery(() => db.localMeta.get('receipt-folder'))
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [message, setMessage] = useState('')
  const [folderBusy, setFolderBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  useEffect(() => { if (saved) setSettings(saved) }, [saved])
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setSettings(current => ({ ...current, [key]: value }))
  const runFolderAction = async (action: () => Promise<unknown>, success: string) => {
    setFolderBusy(true)
    try { await action(); setMessage(success) } catch (error) { setMessage(error instanceof Error ? error.message : 'Folder action failed') } finally { setFolderBusy(false) }
  }

  return <div className="max-w-3xl space-y-6">
    <div><h1 className="text-3xl font-bold">Settings</h1><p className="mt-1 text-slate-500">Preferences and local document storage.</p></div>
    <Card className="space-y-5 p-5 sm:p-7">
      <div><h2 className="font-bold">Receipt workspace folder</h2><p className="mt-1 text-sm text-slate-500">Save every receipt as an editable document in a folder on this computer. Choose the same folder after installing the app elsewhere to reopen its receipts.</p></div>
      {!supportsReceiptFolder() && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Folder documents require the installed PWA or Chrome/Edge, served over HTTPS or localhost.</div>}
      {folder ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 font-semibold"><FolderOpen size={18} className="text-indigo-600"/>{folder.directoryName}</div><p className="mt-1 text-xs text-slate-500">{folder.lastSyncedAt ? `Last saved ${new Date(folder.lastSyncedAt).toLocaleString()}` : 'Waiting for first save'}</p>{folder.lastError && <p className="mt-2 text-sm text-amber-700">{folder.lastError}</p>}</div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${folder.lastError ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{folder.lastError ? 'Needs attention' : 'Connected'}</span></div></div> : <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No folder selected. Receipts are currently stored only inside this browser.</div>}
      <div className="flex flex-wrap gap-2">{!folder && <Button disabled={folderBusy || !supportsReceiptFolder()} onClick={() => runFolderAction(connectReceiptFolder, 'Receipt folder connected and synchronized')}><FolderOpen size={16}/> Choose receipt folder</Button>}{folder && <><Button disabled={folderBusy} onClick={() => runFolderAction(reconnectReceiptFolder, 'Folder reconnected and synchronized')}><FolderOpen size={16}/> Reconnect</Button><Button variant="secondary" disabled={folderBusy} onClick={() => runFolderAction(syncAllToReceiptFolder, 'All receipt documents synchronized')}><RefreshCw size={16}/> Sync now</Button><Button variant="ghost" disabled={folderBusy} onClick={() => setConfirmDisconnect(true)}><Unplug size={16}/> Disconnect</Button></>}</div>
      <p className="text-xs text-slate-500">The folder contains one <code>.receipt.json</code> file per receipt. These are the durable receipt documents; the app opens, edits, duplicates, and deletes them. A Documents folder works well.</p>
    </Card>
    <Card className="space-y-5 p-5 sm:p-7">
      <h2 className="font-bold">Receipt defaults</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Currency code"><Input value={settings.currency} maxLength={3} onChange={event => update('currency', event.target.value.toUpperCase())} placeholder="USD"/></Field>
        <Field label="Date format"><Select value={settings.dateFormat} onChange={event => update('dateFormat', event.target.value as AppSettings['dateFormat'])}><option value="short">Short</option><option value="long">Long</option></Select></Field>
        <Field label="Number prefix"><Input value={settings.prefix} onChange={event => update('prefix', event.target.value)}/></Field>
        <Field label="Starting number"><Input type="number" min="1" value={settings.startingNumber} onChange={event => { const number = Math.max(1, Number(event.target.value)); setSettings(current => ({ ...current, startingNumber: number, nextNumber: number })) }}/></Field>
        <Field label="Number of digits"><Input type="number" min="1" max="12" value={settings.digits} onChange={event => update('digits', Math.min(12, Math.max(1, Number(event.target.value))))}/></Field>
        <Field label="Next number" hint="Used for the next new receipt"><Input type="number" min="1" value={settings.nextNumber} onChange={event => update('nextNumber', Math.max(1, Number(event.target.value)))}/></Field>
        <Field label="Default payment method"><Input value={settings.defaultPaymentMethod} onChange={event => update('defaultPaymentMethod', event.target.value)}/></Field>
        <Field label="Theme"><Select value={settings.theme} onChange={event => update('theme', event.target.value as AppSettings['theme'])}><option value="light">Light</option><option value="dark">Dark</option></Select></Field>
        <Field label="Export image scale"><Select value={settings.exportScale} onChange={event => update('exportScale', Number(event.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={3}>3×</option></Select></Field>
      </div>
      <div className="flex items-center gap-3"><Button onClick={async () => { if (!/^[A-Z]{3}$/.test(settings.currency)) { setMessage('Enter a three letter currency code'); return } await db.settings.put(settings); void saveWorkspaceProfile(); setMessage('Settings saved') }}>Save settings</Button><span role="status" className="text-sm text-slate-500">{message}</span></div>
    </Card>
    <Card className="space-y-4 p-5 sm:p-7"><h2 className="font-bold">App cache</h2><p className="text-sm text-slate-500">Receipt files remain in the selected computer folder. Resetting the app cache does not delete those files.</p><Button variant="danger" onClick={() => setConfirmClear(true)}><Trash2 size={16}/> Reset app cache</Button></Card>
    <Modal open={confirmDisconnect} onOpenChange={setConfirmDisconnect} title="Disconnect receipt folder?"><p className="mb-5 text-sm text-slate-600">The files remain in the folder. This app stops updating them until you connect a folder again.</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmDisconnect(false)}>Cancel</Button><Button onClick={async () => { await disconnectReceiptFolder(); setConfirmDisconnect(false); setMessage('Receipt folder disconnected') }}>Disconnect</Button></div></Modal>
    <Modal open={confirmClear} onOpenChange={setConfirmClear} title="Reset app cache?"><p className="mb-5 text-sm text-slate-600">This resets the app's working cache. Receipt files in the selected computer folder are kept and can be reopened by choosing that folder again.</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmClear(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await db.transaction('rw', db.receipts, db.business, db.settings, db.localMeta, async () => { await db.receipts.clear(); await db.business.clear(); await db.settings.clear(); await db.localMeta.clear() }); await ensureDefaults(); setConfirmClear(false); setMessage('App cache reset; receipt files were kept') }}>Reset app cache</Button></div></Modal>
  </div>
}
