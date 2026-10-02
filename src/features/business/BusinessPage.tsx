import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Save } from 'lucide-react'
import { db, defaultBusiness, type BusinessRecord } from '../../db/dexie'
import { Button, Card, Field, Input, Textarea } from '../../components/ui'
import { saveWorkspaceProfile } from '../../lib/workspace/receiptFolder'
import { readLogoFile } from '../../lib/security/images'

export function BusinessPage() {
  const saved = useLiveQuery(() => db.business.get('default'))
  const [business, setBusiness] = useState<BusinessRecord>(defaultBusiness)
  const [message, setMessage] = useState('')
  useEffect(() => { if (saved) setBusiness(saved) }, [saved])
  const field = (key: keyof BusinessRecord, label: string, placeholder = '') => <Field label={label}><Input value={business[key]} placeholder={placeholder} onChange={e => setBusiness({ ...business, [key]: e.target.value })}/></Field>
  return <div className="max-w-3xl space-y-6"><div><h1 className="text-3xl font-bold">Business profile</h1><p className="mt-1 text-slate-500">New receipts automatically use these details.</p></div><Card className="space-y-5 p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2">{field('businessName', 'Business name', 'Your business')}{field('phone', 'Phone')}{field('email', 'Email')}{field('website', 'Website')}{field('taxNumber', 'Tax number')}{field('registrationNumber', 'Registration number')}</div><Field label="Address"><Textarea value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })}/></Field><Field label="Default footer"><Input value={business.defaultFooter} onChange={e => setBusiness({ ...business, defaultFooter: e.target.value })}/></Field><Field label="Payment methods" hint="Separate methods with commas"><Input value={business.paymentMethods} onChange={e => setBusiness({ ...business, paymentMethods: e.target.value })}/></Field><Field label="Logo"><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { const logo = await readLogoFile(file); setBusiness(current => ({ ...current, logo })); setMessage('') } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load logo') } }}/></Field>{business.logo && <div className="flex items-center gap-4"><img src={business.logo} alt="Current business logo" className="h-16 w-24 object-contain"/><Button variant="ghost" onClick={() => setBusiness({ ...business, logo: '' })}>Remove logo</Button></div>}<div className="flex items-center gap-3"><Button onClick={async () => { await db.business.put(business); void saveWorkspaceProfile(); setMessage('Business profile saved locally') }}><Save size={16}/> Save profile</Button><span className="text-sm text-slate-500" role="status">{message}</span></div></Card></div>
}
