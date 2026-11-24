# Nota Digital

Pembuat invoice A4 hitam-putih. React + Vite, tanpa backend.

## Jalankan
    npm install
    npm run dev

## Deploy ke Vercel
Push ke Git lalu impor proyek di Vercel (preset Vite terdeteksi otomatis), atau `npx vercel --prod`.
Header keamanan (CSP, HSTS, dst.) sudah diatur di `vercel.json`.

## Cetak
Pilih kertas A4, skala 100%, dan mode grayscale. Margin diatur oleh tata letak lembar (`@page { margin: 0 }`).

## Kirim WhatsApp
Tombol "Kirim WA" membuat PDF A4 berstempel LUNAS (tanggal = tanggal kirim), lalu membuka lembar bagikan perangkat
(Web Share). Di perangkat tanpa fitur itu, PDF diunduh dan chat WhatsApp dibuka untuk dilampirkan manual.
Browser tidak bisa memastikan pesan benar-benar terkirim; penanda lunas disimpan setelah lembar bagikan selesai
atau setelah Anda menekan "Sudah terkirim". Pengiriman otomatis butuh WhatsApp Business API + backend.

## Catatan
- Data nota disimpan di localStorage browser ini saja. Hapus data situs = nota hilang; belum ada sinkronisasi antar perangkat.
- Logo diproses ulang lewat canvas (PNG/JPG/WebP, maks. 2 MB, SVG ditolak) dan diubah ke skala abu-abu.
