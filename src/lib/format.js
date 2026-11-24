const NUM = new Intl.NumberFormat('id-ID')
const DATE = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const s = (v) => String(v ?? '')

export const toInt = (v) => {
  const n = parseInt(s(v).replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}
export const toQty = (v) => {
  const n = parseFloat(s(v).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.min(n, 99999) : 0
}
export const toRate = (v) => {
  const n = parseFloat(s(v).replace(',', '.'))
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : 0
}

export const fmtNum = (v) => (s(v) === '' ? '' : NUM.format(toInt(v)))
export const fmtQty = (v) => NUM.format(toQty(v))
export const fmtRate = (v) => NUM.format(toRate(v))
export const idr = (n) => `Rp ${NUM.format(n)}`
export const fmtDate = (iso) => {
  const d = new Date(`${s(iso)}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d)
}

export const lineTotal = (item) => Math.round(toInt(item.price) * toQty(item.qty))

// Semua hitungan dalam rupiah bulat. Diskon dihitung dari subtotal, pajak dari nilai setelah diskon.
export function totals(inv) {
  const sub = inv.items.reduce((sum, i) => sum + lineTotal(i), 0)
  const disc = Math.round((sub * toRate(inv.discountRate)) / 100)
  const tax = Math.round(((sub - disc) * toRate(inv.taxRate)) / 100)
  return { sub, disc, tax, total: sub - disc + tax }
}
