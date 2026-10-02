import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ReceiptDocument } from '../../features/receipts/components/ReceiptDocument'
import type { Receipt } from '../../features/receipts/types'

const download = (href: string, name: string) => { const a = document.createElement('a'); a.href = href; a.download = name; document.body.append(a); a.click(); a.remove() }
async function render(receipt: Receipt, currency: string, dateFormat: 'short' | 'long') {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;width:max-content;background:white'
  document.body.append(host)
  const root = createRoot(host)
  flushSync(() => root.render(<ReceiptDocument receipt={receipt} currency={currency} dateFormat={dateFormat} />))
  await document.fonts.ready
  await Promise.all(Array.from(host.querySelectorAll('img')).map(img => img.decode().catch(() => {})))
  return { element: host.firstElementChild as HTMLElement, cleanup: () => { root.unmount(); host.remove() } }
}
export async function exportReceiptAsImage(receipt: Receipt, currency: string, type: 'png' | 'jpg', scale = 2, dateFormat: 'short' | 'long' = 'short') {
  const { toJpeg, toPng } = await import('html-to-image')
  const { element, cleanup } = await render(receipt, currency, dateFormat)
  try { const url = type === 'png' ? await toPng(element, { pixelRatio: scale, backgroundColor: '#ffffff', cacheBust: true }) : await toJpeg(element, { pixelRatio: scale, backgroundColor: '#ffffff', quality: .95, cacheBust: true }); download(url, `${receipt.receiptNumber}.${type}`) } finally { cleanup() }
}
export async function exportReceiptAsPdf(receipt: Receipt, currency: string, scale = 2, dateFormat: 'short' | 'long' = 'short') {
  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
  const { element, cleanup } = await render(receipt, currency, dateFormat)
  try {
    const data = await toPng(element, { pixelRatio: scale, backgroundColor: '#ffffff', cacheBust: true })
    const img = new Image(); img.src = data; await img.decode()
    const width = receipt.appearance.size === 'thermal' ? 80 : receipt.appearance.size === 'a5' ? 148 : receipt.appearance.size === 'custom' ? receipt.appearance.customWidth : 210
    const height = receipt.appearance.size === 'thermal' ? 200 : receipt.appearance.size === 'a5' ? 210 : receipt.appearance.size === 'custom' ? receipt.appearance.customHeight : 297
    const pdf = new jsPDF({ unit: 'mm', format: [width, height], orientation: width > height ? 'landscape' : 'portrait' })
    const contentHeight = img.height / img.width * width
    let y = 0
    while (y < contentHeight) { if (y > 0) pdf.addPage([width, height]); pdf.addImage(data, 'PNG', 0, -y, width, contentHeight); y += height }
    pdf.save(`${receipt.receiptNumber}.pdf`)
  } finally { cleanup() }
}
