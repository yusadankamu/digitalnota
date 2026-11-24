const A4 = { w: 210, h: 297 }

// Lembar nota dirender ke kanvas lalu dibungkus jadi PDF A4. Library dimuat saat dibutuhkan saja.
export async function sheetToPdf(node) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  await document.fonts.ready
  const canvas = await html2canvas(node, { scale: 2.5, backgroundColor: '#ffffff', logging: false })

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const pageH = Math.floor((canvas.width * A4.h) / A4.w)
  const pages = Math.max(1, Math.ceil(canvas.height / pageH))
  for (let p = 0; p < pages; p++) {
    const h = Math.min(pageH, canvas.height - p * pageH)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = h
    const ctx = slice.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, slice.width, h)
    ctx.drawImage(canvas, 0, p * pageH, canvas.width, h, 0, 0, canvas.width, h)
    if (p > 0) pdf.addPage()
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, A4.w, (h * A4.w) / canvas.width, undefined, 'FAST')
  }
  return pdf.output('blob')
}

export const pdfName = (inv) => `${(inv.number || 'nota').replace(/[^\w.-]+/g, '-')}.pdf`

export function download(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// Nomor Indonesia: 0812... atau 812... menjadi 62812...; selain itu dianggap sudah berkode negara.
export function waNumber(raw) {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  else if (d.startsWith('0')) d = `62${d.slice(1)}`
  else if (d.startsWith('8')) d = `62${d}`
  return d.length >= 9 && d.length <= 15 ? d : ''
}
