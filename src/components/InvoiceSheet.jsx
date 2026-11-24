import { fmtDate, fmtQty, fmtRate, idr, lineTotal, toInt, toRate, totals } from '../lib/format.js'

const MIN_ROWS = 6

export default function InvoiceSheet({ inv }) {
  const t = totals(inv)
  const { company, client, signer } = inv
  const filler = Math.max(0, MIN_ROWS - inv.items.length)
  const contact = [company.address, company.contact].filter(Boolean).join('\n')

  return (
    <article className="sheet" aria-label="Pratinjau invoice">
      {inv.paid && (
        <div className="stamp" role="img" aria-label={`Lunas ${fmtDate(inv.paidDate)}`.trim()}>
          <span>Lunas</span>
          {fmtDate(inv.paidDate) && <small>{fmtDate(inv.paidDate)}</small>}
        </div>
      )}
      <header className="sh-head">
        <div className="brand">
          {inv.logo ? (
            <img src={inv.logo} alt={company.name ? `Logo ${company.name}` : 'Logo'} />
          ) : (
            <>
              <b className="sh-name">{company.name || 'Nama usaha'}</b>
              {company.tagline && <span>{company.tagline}</span>}
            </>
          )}
        </div>
        <div className="sh-title">
          <h1>Invoice</h1>
          <dl className="meta">
            <dt>Nomor</dt>
            <dd>{inv.number || '-'}</dd>
            <dt>Tanggal</dt>
            <dd>{fmtDate(inv.date)}</dd>
            {inv.due && (
              <>
                <dt>Jatuh tempo</dt>
                <dd>{fmtDate(inv.due)}</dd>
              </>
            )}
          </dl>
        </div>
      </header>

      <section className="sh-bill">
        <div>
          <small>Tagihan kepada</small>
          <b>{client.name || 'Nama pelanggan'}</b>
          <p className="pre">{client.address}</p>
          <p>{client.phone}</p>
        </div>
        <div>
          <small>Total tagihan</small>
          <strong>{idr(t.total)}</strong>
        </div>
      </section>

      <table className="items">
        <colgroup>
          <col />
          <col className="c-price" />
          <col className="c-qty" />
          <col className="c-total" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Deskripsi</th>
            <th scope="col">Harga</th>
            <th scope="col">Qty</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((i) => (
            <tr key={i.id}>
              <td>
                <b>{i.name || '-'}</b>
                {i.desc && <span className="pre">{i.desc}</span>}
              </td>
              <td>{idr(toInt(i.price))}</td>
              <td>{fmtQty(i.qty)}</td>
              <td>{idr(lineTotal(i))}</td>
            </tr>
          ))}
          {Array.from({ length: filler }, (_, n) => (
            <tr key={`f${n}`} className="blank" aria-hidden="true">
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <section className="sh-sum">
        <div>
          {inv.payment && (
            <>
              <h2>Metode pembayaran</h2>
              <p className="pre">{inv.payment}</p>
            </>
          )}
        </div>
        <dl className="sum">
          <div>
            <dt>Subtotal</dt>
            <dd>{idr(t.sub)}</dd>
          </div>
          {toRate(inv.discountRate) > 0 && (
            <div>
              <dt>Diskon {fmtRate(inv.discountRate)}%</dt>
              <dd>- {idr(t.disc)}</dd>
            </div>
          )}
          {toRate(inv.taxRate) > 0 && (
            <div>
              <dt>Pajak {fmtRate(inv.taxRate)}%</dt>
              <dd>{idr(t.tax)}</dd>
            </div>
          )}
          <div className="grand">
            <dt>Total</dt>
            <dd>{idr(t.total)}</dd>
          </div>
        </dl>
      </section>

      <footer className="sh-tail">
        <div className="sh-cols">
          <div>
            {contact && (
              <>
                <h2>Kontak</h2>
                <p className="pre">{contact}</p>
              </>
            )}
          </div>
          <div className="sign">
            <div className="sign-space" />
            <b>{signer.name}</b>
            <span>{signer.title}</span>
          </div>
        </div>
        {inv.terms && (
          <div className="terms">
            <h2>Syarat &amp; ketentuan</h2>
            <p className="pre">{inv.terms}</p>
          </div>
        )}
      </footer>
    </article>
  )
}
