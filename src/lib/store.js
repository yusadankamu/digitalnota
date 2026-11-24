const KEY = { list: 'nd:invoices', draft: 'nd:draft' }
const PNG = 'data:image/png;base64,'
const MAX_ITEMS = 60

const pad = (n) => String(n).padStart(2, '0')
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const plusDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoLocal(d)
}
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')

export const newItem = () => ({ id: crypto.randomUUID(), name: '', desc: '', price: '', qty: '1' })

const defaults = () => ({
  id: crypto.randomUUID(),
  number: '',
  date: isoLocal(new Date()),
  due: plusDays(14),
  paid: false,
  logo: null,
  company: { name: '', tagline: '', address: '', contact: '' },
  client: { name: '', address: '', phone: '' },
  items: [newItem()],
  discountRate: '0',
  taxRate: '0',
  payment: '',
  terms: '',
  signer: { name: '', title: '' },
})

// Data dari localStorage tidak dipercaya begitu saja: bentuk, tipe, dan panjang dipaksa ulang.
export function hydrate(raw) {
  const d = defaults()
  if (!raw || typeof raw !== 'object') return d
  const group = (g, keys) => Object.fromEntries(keys.map((k) => [k, str(raw[g]?.[k], 300)]))
  const items = Array.isArray(raw.items)
    ? raw.items.slice(0, MAX_ITEMS).map((i) => ({
        id: str(i?.id, 64) || crypto.randomUUID(),
        name: str(i?.name, 120),
        desc: str(i?.desc, 200),
        price: str(i?.price, 12),
        qty: str(i?.qty, 6),
      }))
    : []
  return {
    id: str(raw.id, 64) || d.id,
    number: str(raw.number, 40),
    date: str(raw.date, 10),
    due: str(raw.due, 10),
    paid: raw.paid === true,
    logo: typeof raw.logo === 'string' && raw.logo.startsWith(PNG) ? raw.logo : null,
    company: group('company', ['name', 'tagline', 'address', 'contact']),
    client: group('client', ['name', 'address', 'phone']),
    items: items.length ? items : d.items,
    discountRate: str(raw.discountRate, 6) || '0',
    taxRate: str(raw.taxRate, 6) || '0',
    payment: str(raw.payment, 500),
    terms: str(raw.terms, 800),
    signer: group('signer', ['name', 'title']),
  }
}

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const loadInvoices = () => {
  const raw = read(KEY.list, [])
  return Array.isArray(raw) ? raw.map(hydrate) : []
}
export const loadDraft = () => read(KEY.draft, null)
export const saveInvoices = (list) => write(KEY.list, list)
export const saveDraft = (inv) => write(KEY.draft, inv)

export function suggestNumber(list) {
  const year = new Date().getFullYear()
  const re = new RegExp(`^INV-${year}-(\\d+)$`)
  const max = list.reduce((m, i) => {
    const hit = re.exec(i.number)
    return hit ? Math.max(m, Number(hit[1])) : m
  }, 0)
  return `INV-${year}-${pad(max + 1).padStart(4, '0')}`
}

// Nota baru mewarisi identitas usaha dan logo dari nota terakhir.
export function blankInvoice(list) {
  const prev = list[0]
  return {
    ...defaults(),
    number: suggestNumber(list),
    logo: prev?.logo ?? null,
    company: prev ? { ...prev.company } : defaults().company,
    payment: prev?.payment ?? '',
    terms: prev?.terms ?? '',
    signer: prev ? { ...prev.signer } : defaults().signer,
  }
}
