import { useCallback, useEffect, useRef, useState } from 'react'
import InvoiceSheet from './components/InvoiceSheet.jsx'
import { fmtDate, fmtNum, idr, totals } from './lib/format.js'
import { processLogo } from './lib/logo.js'
import SendDialog from './components/SendDialog.jsx'
import { blankInvoice, hydrate, isoLocal, loadDraft, loadInvoices, newItem, saveDraft, saveInvoices } from './lib/store.js'

const MAX_ITEMS = 60
const SHEET_PX = 794 // 210 mm pada 96 dpi
const digits = (v) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12)
const decimal = (v) => v.replace(/[^\d.,]/g, '').slice(0, 6)

// Skala pratinjau mengikuti lebar panel; saat dicetak skala selalu 100%.
function useFit() {
  const ro = useRef(null)
  return useCallback((node) => {
    ro.current?.disconnect()
    if (!node) return
    ro.current = new ResizeObserver(([entry]) => {
      node.style.setProperty('--fit', String(Math.min(1, entry.contentRect.width / SHEET_PX)))
    })
    ro.current.observe(node)
  }, [])
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function App() {
  const [list, setList] = useState(() => loadInvoices())
  const [inv, setInv] = useState(() => hydrate(loadDraft()))
  const [view, setView] = useState('edit')
  const [note, setNote] = useState('')
  const [logoError, setLogoError] = useState('')
  const [hard, setHard] = useState(false)
  const [sending, setSending] = useState(false)
  const logoFile = useRef(null)
  const fitRef = useFit()

  useEffect(() => {
    const t = setTimeout(() => saveDraft(inv), 400)
    return () => clearTimeout(t)
  }, [inv])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(''), 2500)
    return () => clearTimeout(t)
  }, [note])

  const set = (k, v) => setInv((p) => ({ ...p, [k]: v }))
  const setIn = (g, k, v) => setInv((p) => ({ ...p, [g]: { ...p[g], [k]: v } }))
  const setItem = (id, k, v) =>
    setInv((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, [k]: v } : i)) }))
  const addItem = () =>
    setInv((p) => (p.items.length >= MAX_ITEMS ? p : { ...p, items: [...p.items, newItem()] }))
  const removeItem = (id) =>
    setInv((p) => ({ ...p, items: p.items.length > 1 ? p.items.filter((i) => i.id !== id) : p.items }))

  async function applyLogo(file, hardMode) {
    try {
      setLogoError('')
      set('logo', await processLogo(file, hardMode))
    } catch (err) {
      setLogoError(err.message)
    }
  }
  function onLogo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    logoFile.current = file
    applyLogo(file, hard)
  }
  function onHard(e) {
    const v = e.target.checked
    setHard(v)
    if (logoFile.current) applyLogo(logoFile.current, v)
  }

  function persist(item) {
    const exists = list.some((i) => i.id === item.id)
    const next = exists ? list.map((i) => (i.id === item.id ? item : i)) : [item, ...list]
    if (!saveInvoices(next)) return false
    setList(next)
    return true
  }
  function save() {
    setNote(persist(inv) ? 'Nota tersimpan' : 'Gagal menyimpan: penyimpanan browser penuh')
  }
  // Dipanggil setelah PDF selesai dikirim: tanggal lunas = tanggal kirim.
  function markSent(date) {
    const next = { ...inv, paid: true, paidDate: date }
    setInv(next)
    setNote(persist(next) ? `Terkirim, ditandai lunas ${fmtDate(date)}` : 'Terkirim, tetapi gagal menyimpan penanda lunas')
  }
  function create() {
    setInv(blankInvoice(list))
    setView('edit')
  }
  function open(i) {
    setInv(hydrate(i))
    setView('edit')
  }
  function remove(i) {
    if (!window.confirm(`Hapus nota ${i.number || '(tanpa nomor)'}? Tindakan ini tidak bisa dibatalkan.`)) return
    const next = list.filter((x) => x.id !== i.id)
    if (saveInvoices(next)) setList(next)
  }
  function togglePaid(i) {
    const paid = !i.paid
    const paidDate = paid ? i.paidDate || isoLocal(new Date()) : ''
    const next = list.map((x) => (x.id === i.id ? { ...x, paid, paidDate } : x))
    if (saveInvoices(next)) setList(next)
    if (inv.id === i.id) setInv((p) => ({ ...p, paid, paidDate }))
  }

  return (
    <div className="app">
      <header className="topbar">
        <p className="wordmark">Nota Digital</p>
        <nav className="tabs" aria-label="Halaman">
          <button className="tab" aria-current={view === 'edit' ? 'page' : undefined} onClick={() => setView('edit')}>
            Buat nota
          </button>
          <button className="tab" aria-current={view === 'history' ? 'page' : undefined} onClick={() => setView('history')}>
            Riwayat ({list.length})
          </button>
        </nav>
        <div className="actions">
          <span className="status" role="status">{note}</span>
          <button className="btn" onClick={create}>Nota baru</button>
          {view === 'edit' && (
            <>
              <button className="btn" onClick={save}>Simpan</button>
              <button className="btn" onClick={() => setSending(true)}>Kirim WA</button>
              <button className="btn solid" onClick={() => window.print()}>Cetak</button>
            </>
          )}
        </div>
      </header>

      {view === 'edit' ? (
        <main className="workspace">
          <form className="panel" onSubmit={(e) => e.preventDefault()}>
            <fieldset>
              <legend>Usaha Anda</legend>
              <div className="logo-row">
                <div className="logo-box">{inv.logo ? <img src={inv.logo} alt="Logo terpilih" /> : <span>Logo</span>}</div>
                <div>
                  <Field label="Unggah logo (PNG, JPG, WebP, maks. 2 MB)">
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} />
                  </Field>
                  <label className="check">
                    <input type="checkbox" checked={hard} onChange={onHard} /> Hitam-putih tegas
                  </label>
                  {inv.logo && (
                    <button type="button" className="link" onClick={() => { logoFile.current = null; set('logo', null) }}>
                      Hapus logo
                    </button>
                  )}
                  {inv.logo && <p className="hint">Saat logo dipakai, nama usaha dan keterangan singkat tidak dicetak.</p>}
                  {logoError && <p className="error" role="alert">{logoError}</p>}
                </div>
              </div>
              <Field label="Nama usaha">
                <input value={inv.company.name} maxLength={80} onChange={(e) => setIn('company', 'name', e.target.value)} />
              </Field>
              <Field label="Keterangan singkat (opsional)">
                <input value={inv.company.tagline} maxLength={80} onChange={(e) => setIn('company', 'tagline', e.target.value)} />
              </Field>
              <Field label="Alamat">
                <textarea rows={2} value={inv.company.address} maxLength={200} onChange={(e) => setIn('company', 'address', e.target.value)} />
              </Field>
              <Field label="Telepon, email, situs">
                <input value={inv.company.contact} maxLength={120} onChange={(e) => setIn('company', 'contact', e.target.value)} />
              </Field>
            </fieldset>

            <fieldset>
              <legend>Nota</legend>
              <Field label="Nomor">
                <input value={inv.number} maxLength={40} onChange={(e) => set('number', e.target.value)} />
              </Field>
              <div className="row">
                <Field label="Tanggal">
                  <input type="date" value={inv.date} onChange={(e) => set('date', e.target.value)} />
                </Field>
                <Field label="Jatuh tempo">
                  <input type="date" value={inv.due} onChange={(e) => set('due', e.target.value)} />
                </Field>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={inv.paid}
                  onChange={(e) =>
                    setInv((p) => ({ ...p, paid: e.target.checked, paidDate: e.target.checked ? p.paidDate || isoLocal(new Date()) : '' }))
                  }
                />{' '}
                Sudah lunas
              </label>
              {inv.paid && (
                <Field label="Tanggal lunas">
                  <input type="date" value={inv.paidDate} onChange={(e) => set('paidDate', e.target.value)} />
                </Field>
              )}
            </fieldset>

            <fieldset>
              <legend>Pelanggan</legend>
              <Field label="Nama">
                <input value={inv.client.name} maxLength={80} onChange={(e) => setIn('client', 'name', e.target.value)} />
              </Field>
              <Field label="Alamat">
                <textarea rows={2} value={inv.client.address} maxLength={200} onChange={(e) => setIn('client', 'address', e.target.value)} />
              </Field>
              <Field label="Telepon">
                <input value={inv.client.phone} maxLength={30} inputMode="tel" onChange={(e) => setIn('client', 'phone', e.target.value)} />
              </Field>
            </fieldset>

            <fieldset>
              <legend>Barang atau jasa</legend>
              {inv.items.map((i, n) => (
                <div className="item" key={i.id}>
                  <Field label={`Nama item ${n + 1}`}>
                    <input value={i.name} maxLength={120} onChange={(e) => setItem(i.id, 'name', e.target.value)} />
                  </Field>
                  <Field label="Keterangan (opsional)">
                    <input value={i.desc} maxLength={200} onChange={(e) => setItem(i.id, 'desc', e.target.value)} />
                  </Field>
                  <div className="row">
                    <Field label="Harga satuan (Rp)">
                      <input inputMode="numeric" value={fmtNum(i.price)} onChange={(e) => setItem(i.id, 'price', digits(e.target.value))} />
                    </Field>
                    <Field label="Qty">
                      <input inputMode="decimal" value={i.qty} onChange={(e) => setItem(i.id, 'qty', decimal(e.target.value))} />
                    </Field>
                  </div>
                  {inv.items.length > 1 && (
                    <button type="button" className="link" onClick={() => removeItem(i.id)}>Hapus item {n + 1}</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn dark" onClick={addItem} disabled={inv.items.length >= MAX_ITEMS}>
                Tambah item
              </button>
            </fieldset>

            <fieldset>
              <legend>Diskon dan pajak</legend>
              <div className="row">
                <Field label="Diskon (%)">
                  <input inputMode="decimal" value={inv.discountRate} onChange={(e) => set('discountRate', decimal(e.target.value))} />
                </Field>
                <Field label="Pajak (%)">
                  <input inputMode="decimal" value={inv.taxRate} onChange={(e) => set('taxRate', decimal(e.target.value))} />
                </Field>
              </div>
              <p className="hint">Total saat ini {idr(totals(inv).total)}. Diskon dipotong dari subtotal, lalu pajak dihitung dari sisanya.</p>
            </fieldset>

            <fieldset>
              <legend>Pembayaran dan penutup</legend>
              <Field label="Metode pembayaran">
                <textarea rows={3} value={inv.payment} maxLength={500} onChange={(e) => set('payment', e.target.value)} />
              </Field>
              <div className="row">
                <Field label="Nama penandatangan">
                  <input value={inv.signer.name} maxLength={60} onChange={(e) => setIn('signer', 'name', e.target.value)} />
                </Field>
                <Field label="Jabatan">
                  <input value={inv.signer.title} maxLength={60} onChange={(e) => setIn('signer', 'title', e.target.value)} />
                </Field>
              </div>
              <Field label="Syarat dan ketentuan">
                <textarea rows={3} value={inv.terms} maxLength={800} onChange={(e) => set('terms', e.target.value)} />
              </Field>
            </fieldset>

            <p className="hint">
              Di jendela cetak pilih kertas A4, skala 100%, dan mode hitam-putih atau grayscale. Untuk PDF, pilih
              "Simpan sebagai PDF" sebagai printer.
            </p>
          </form>

          <section className="preview" ref={fitRef} aria-label="Pratinjau">
            <div className="fit">
              <InvoiceSheet inv={inv} />
            </div>
          </section>
        </main>
      ) : (
        <main className="history">
          {list.length === 0 ? (
            <div className="empty">
              <p>Belum ada nota tersimpan.</p>
              <p>Isi nota di halaman Buat nota, lalu tekan Simpan.</p>
              <button className="btn dark" onClick={() => setView('edit')}>Buat nota</button>
            </div>
          ) : (
            <table className="hist">
              <thead>
                <tr>
                  <th scope="col">Nomor</th>
                  <th scope="col">Pelanggan</th>
                  <th scope="col">Tanggal</th>
                  <th scope="col" className="r">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => (
                  <tr key={i.id}>
                    <td>{i.number || '-'}</td>
                    <td>{i.client.name || '-'}</td>
                    <td>{fmtDate(i.date)}</td>
                    <td className="r">{idr(totals(i).total)}</td>
                    <td>{i.paid ? 'Lunas' : 'Belum lunas'}</td>
                    <td className="acts">
                      <button className="link" onClick={() => open(i)}>Buka</button>
                      <button className="link" onClick={() => togglePaid(i)}>{i.paid ? 'Tandai belum lunas' : 'Tandai lunas'}</button>
                      <button className="link" onClick={() => remove(i)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      )}
      {sending && <SendDialog inv={inv} onClose={() => setSending(false)} onSent={markSent} />}
    </div>
  )
}
