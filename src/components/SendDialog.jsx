import { useEffect, useMemo, useRef, useState } from 'react'
import InvoiceSheet from './InvoiceSheet.jsx'
import { fmtDate, idr, totals } from '../lib/format.js'
import { download, pdfName, sheetToPdf, waNumber } from '../lib/pdf.js'
import { isoLocal } from '../lib/store.js'

// Alur dua langkah: PDF disiapkan dulu, baru tombol kirim ditekan. Browser (terutama Safari)
// hanya mengizinkan Web Share tepat setelah klik, jadi PDF tidak boleh dibuat di dalam klik itu.
export default function SendDialog({ inv, onClose, onSent }) {
  const dlg = useRef(null)
  const stage = useRef(null)
  const [state, setState] = useState({ status: 'busy', file: null })
  const [fallback, setFallback] = useState(false)

  const date = useMemo(() => (inv.paid && inv.paidDate ? inv.paidDate : isoLocal(new Date())), [inv])
  const stamped = useMemo(() => ({ ...inv, paid: true, paidDate: date }), [inv, date])
  const phone = waNumber(inv.client.phone)
  const text = `Halo ${inv.client.name || 'Bapak/Ibu'}, berikut nota ${inv.number || ''} sebesar ${idr(totals(inv).total)}. Terima kasih.`

  useEffect(() => {
    dlg.current.showModal()
  }, [])

  useEffect(() => {
    let stale = false
    ;(async () => {
      try {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
        const blob = await sheetToPdf(stage.current.querySelector('.sheet'))
        if (!stale) setState({ status: 'ready', file: new File([blob], pdfName(inv), { type: 'application/pdf' }) })
      } catch {
        if (!stale) setState({ status: 'error', file: null })
      }
    })()
    return () => {
      stale = true
    }
  }, [stamped, inv])

  const finish = () => {
    onSent(date)
    dlg.current.close()
  }

  function openWhatsApp(file) {
    download(file)
    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
    window.open(`${base}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    setFallback(true)
  }

  async function send() {
    const { file } = state
    if (!navigator.canShare?.({ files: [file] })) return openWhatsApp(file)
    try {
      await navigator.share({ files: [file], text })
      finish()
    } catch (err) {
      if (err?.name !== 'AbortError') openWhatsApp(file) // AbortError = pengguna membatalkan, tidak ada yang ditandai
    }
  }

  return (
    <>
      <dialog ref={dlg} className="dlg" onClose={onClose} aria-labelledby="dlg-title">
        <h2 id="dlg-title">Kirim nota ke WhatsApp</h2>
        <p>
          PDF diberi stempel <b>LUNAS</b> bertanggal {fmtDate(date)}. Penanda lunas baru tersimpan di nota setelah
          pengiriman selesai.
        </p>
        {state.status === 'busy' && <p role="status">Menyiapkan PDF…</p>}
        {state.status === 'error' && <p className="error" role="alert">PDF gagal dibuat. Tutup dialog lalu coba lagi.</p>}
        {state.status === 'ready' && !fallback && (
          <p className="hint">
            {phone ? `Tujuan: +${phone}` : 'Nomor pelanggan kosong atau tidak valid. Pilih kontak sendiri di WhatsApp.'}
          </p>
        )}
        {fallback && (
          <p role="status">
            PDF sudah diunduh dan WhatsApp dibuka. Lampirkan PDF dari folder Unduhan, kirim, lalu tekan tombol di bawah.
          </p>
        )}
        <div className="dlg-actions">
          {state.status === 'ready' && !fallback && (
            <button className="btn fill" onClick={send}>Kirim ke WhatsApp</button>
          )}
          {fallback && <button className="btn fill" onClick={finish}>Sudah terkirim, tandai lunas</button>}
          <button className="btn dark" onClick={() => dlg.current.close()}>Batal</button>
        </div>
      </dialog>
      <div className="pdf-stage" ref={stage} aria-hidden="true">
        <InvoiceSheet inv={stamped} />
      </div>
    </>
  )
}
