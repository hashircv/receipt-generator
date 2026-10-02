import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Copy, Download, FilePlus2, MoreHorizontal, Search, Trash2 } from 'lucide-react'
import { db, defaultSettings } from '../../db/dexie'
import { Button, Card, Input, Modal, Select } from '../../components/ui'
import { formatMoney } from '../../lib/calculations/money'
import { exportReceiptAsImage, exportReceiptAsPdf } from '../../lib/export/receiptExport'
import { useUI } from '../../stores/ui'
import { createReceipt, duplicateReceipt } from './services/receiptService'
import type { Receipt } from './types'
import { deleteReceiptDocument } from '../../lib/workspace/receiptFolder'

export function ReceiptsPage() {
  const receipts = useLiveQuery(() => db.receipts.toArray()) || []
  const settings = useLiveQuery(() => db.settings.get('settings')) || defaultSettings
  const { openReceipt, notify } = useUI()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(0)
  const [deleting, setDeleting] = useState<Receipt | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const filtered = useMemo(() => receipts.filter(r => `${r.receiptNumber} ${r.customer.name} ${r.business.businessName}`.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || r.status === status) && (!from || r.date >= from) && (!to || r.date <= to)).sort((a, b) => sort === 'oldest' ? a.updatedAt.localeCompare(b.updatedAt) : sort === 'total' ? b.total - a.total : b.updatedAt.localeCompare(a.updatedAt)), [receipts, search, status, from, to, sort])
  const shown = filtered.slice(page * 12, page * 12 + 12)
  const exportOne = async (r: Receipt, type: 'png' | 'jpg' | 'pdf') => { setBusy(r.id); try { if (type === 'pdf') await exportReceiptAsPdf(r, settings.currency, settings.exportScale, settings.dateFormat); else await exportReceiptAsImage(r, settings.currency, type, settings.exportScale, settings.dateFormat) } catch (e) { alert(e instanceof Error ? e.message : 'Export failed') } finally { setBusy(null) } }
  const deleteSelected = async () => {
    if (!deleting || busy) return
    const receipt = deleting
    setBusy(receipt.id)
    try {
      const folder = await db.localMeta.get('receipt-folder')
      if (folder && !await deleteReceiptDocument(receipt.id)) throw new Error('Could not delete the receipt file. Reconnect the folder and try again.')
      await db.receipts.delete(receipt.id)
      setDeleting(null)
      notify(`${receipt.receiptNumber} deleted successfully`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete the receipt', 'error')
    } finally { setBusy(null) }
  }
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Receipts</h1><p className="mt-1 text-slate-500">Search, reopen and export your saved work.</p></div><Button onClick={async () => openReceipt((await createReceipt()).id)}><FilePlus2 size={17}/> New receipt</Button></div><Card className="p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_150px_150px_150px_160px]"><div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><Input className="pl-9" aria-label="Search receipts" placeholder="Search receipts or customers" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}/></div><Select aria-label="Payment status" value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}><option value="all">All statuses</option><option value="draft">Draft</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option></Select><Input type="date" aria-label="From date" value={from} onChange={e => { setFrom(e.target.value); setPage(0) }}/><Input type="date" aria-label="To date" value={to} onChange={e => { setTo(e.target.value); setPage(0) }}/><Select aria-label="Sort receipts" value={sort} onChange={e => setSort(e.target.value)}><option value="updated">Recently updated</option><option value="oldest">Oldest updated</option><option value="total">Highest total</option></Select></div></Card><div className="space-y-3">{shown.map(r => <Card key={r.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><button className="font-bold text-indigo-700 hover:underline" onClick={() => openReceipt(r.id)}>{r.receiptNumber}</button><p className="mt-1 text-sm text-slate-600">{r.customer.name || 'Walk-in customer'} · {r.date}</p><p className="mt-1 text-xs text-slate-400">Updated {new Date(r.updatedAt).toLocaleString()}</p></div><div className="text-right"><div className="text-lg font-bold">{formatMoney(r.total, settings.currency)}</div><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${r.status === 'paid' ? 'bg-green-50 text-green-700' : r.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{r.status}</span></div></div><div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" size="sm" onClick={() => openReceipt(r.id)}>Open / Edit</Button><Button variant="ghost" size="sm" onClick={async () => openReceipt((await duplicateReceipt(r)).id)}><Copy size={15}/> Duplicate</Button><details className="relative"><summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><Download size={15}/> Download <MoreHorizontal size={14}/></summary><div className="absolute left-0 top-full z-10 mt-1 flex min-w-36 flex-col rounded-xl border bg-white p-1 shadow-xl">{(['png', 'jpg', 'pdf'] as const).map(t => <button key={t} disabled={busy === r.id} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => exportOne(r, t)}>{t.toUpperCase()}</button>)}</div></details><Button variant="danger" size="sm" onClick={() => setDeleting(r)}><Trash2 size={15}/> Delete</Button></div></Card>)}{filtered.length === 0 && <Card className="p-12 text-center text-slate-500">No receipts match your filters.</Card>}</div>{filtered.length > 12 && <div className="flex items-center justify-center gap-4"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm text-slate-500">Page {page + 1} of {Math.ceil(filtered.length / 12)}</span><Button variant="secondary" disabled={(page + 1) * 12 >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button></div>}<Modal open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null) }} title="Delete receipt?"><p className="mb-5 text-sm text-slate-600">This permanently removes {deleting?.receiptNumber} from the app and its connected receipt folder.</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" disabled={busy === deleting?.id} onClick={deleteSelected}>{busy === deleting?.id ? 'Deleting…' : 'Delete receipt'}</Button></div></Modal></div>
}
