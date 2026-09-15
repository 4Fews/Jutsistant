# Semesta

Ruang kuliah pribadi: mata kuliah, tugas, dan deadline dalam satu tempat.
Seluruh data disimpan di browser perangkat ini — tidak ada server, akun, atau
data yang dikirim ke mana pun.

Status: **Tahap 0–4 selesai** — mata kuliah, tugas, catatan, lampiran file,
dan backup. Dashboard "Hari Ini", agenda mingguan, dan focus timer belum dibuat.

> **File lampiran tidak ikut dalam backup JSON.** Isi biner akan membuat berkas
> backup membengkak, jadi yang disimpan hanya mata kuliah, tugas, dan catatan.
> Untuk mengamankan lampiran, unduh filenya dari tiap catatan dan salin sendiri.

---

## Menjalankan

```bash
npm install
```

```bash
npm run dev
```

Buka http://localhost:5173

Perintah lain:

| Perintah | Fungsi |
| --- | --- |
| `npm run build` | Build produksi ke `dist/` (termasuk service worker) |
| `npm run preview` | Menjalankan hasil build di http://localhost:4173 |
| `npm run icons` | Membuat ulang ikon PWA di `public/` |

---

## Mencoba di HP

**Cara cepat — lihat tampilannya saja (tanpa PWA):**

```bash
npm run dev -- --host
```

Terminal akan menampilkan alamat jaringan seperti `http://192.168.1.7:5173`.
Buka alamat itu di browser HP selama HP dan laptop berada di Wi-Fi yang sama.

Catatan penting: lewat `http://` di alamat IP lokal, browser **tidak** menganggapnya
secure context, jadi **install ke layar utama dan mode offline tidak akan aktif**.
Antarmukanya bisa dicoba sepenuhnya, tapi bagian PWA-nya belum.

**Untuk menguji PWA sungguhan** (install + offline) dibutuhkan HTTPS. Itu datang
bersama deployment ke Cloudflare Pages / GitHub Pages di tahap berikutnya.
Alternatif sekarang: Chrome DevTools → Remote devices → port forwarding lewat kabel USB,
supaya HP membuka `http://localhost:5173` dan dihitung sebagai secure context.

---

## Daftar uji manual

Data contoh sudah terisi otomatis saat pertama dibuka, jadi semuanya bisa langsung dicoba.

**Tugas**
- [ ] Urutan benar: Terlambat → Hari ini → 3 hari ke depan → Nanti → Tanpa deadline → Selesai
- [ ] Garis warna di sisi kiri kartu sesuai tingkat urgensi
- [ ] Centang tugas → hilang dari filter "Aktif", muncul toast "Urungkan" yang berfungsi
- [ ] Filter status / prioritas / mata kuliah bisa digabung
- [ ] Tombol + menambah tugas; menekan kartu membuka form ubah
- [ ] Tugas tanpa deadline masuk kelompok "Tanpa deadline", bukan "Terlambat"
- [ ] Deadline tanpa jam baru dianggap terlambat setelah lewat tengah malam

**Mata kuliah**
- [ ] Tambah mata kuliah lengkap dengan warna, ikon, dan beberapa jadwal
- [ ] Jam selesai lebih awal dari jam mulai ditolak dengan pesan jelas
- [ ] Halaman detail menampilkan jadwal terurut dan tugas terkait
- [ ] Hapus mata kuliah → tugasnya jadi tugas umum, bukan ikut terhapus
- [ ] "Urungkan" mengembalikan mata kuliah beserta kaitan tugasnya

**Catatan**
- [ ] Tombol + menulis catatan baru; autosave berubah "Menyimpan…" lalu "Tersimpan"
- [ ] Tutup dan buka lagi catatan → isi dan judul tetap ada
- [ ] Toolbar: judul, tebal, miring, coret, daftar poin, bernomor, checklist, kutipan, tautan
- [ ] Checklist bisa dicentang langsung di dalam catatan
- [ ] Pencarian menemukan catatan lewat judul maupun kata di dalam isinya
- [ ] Sematkan catatan → naik ke urutan paling atas
- [ ] Pilih mata kuliah di catatan → catatan muncul di halaman detail mata kuliah
- [ ] Buka sebuah tugas → "Buat catatan dari tugas ini" → judul dan mata kuliah terisi
- [ ] Menekan tombol itu lagi membuka catatan yang sama, bukan membuat duplikat

**Impor & file**
- [ ] Impor `.md` → heading pertama jadi judul, daftar dan checklist ikut terbawa
- [ ] Impor `.txt` → nama berkas jadi judul, seluruh isi dipertahankan
- [ ] Lampirkan gambar → thumbnail muncul, pratinjau terbuka saat disentuh
- [ ] Lampirkan PDF → pratinjau muncul (atau tombol Unduh kalau di iPhone)
- [ ] Lampirkan DOCX → tampil sebagai berkas dengan tombol unduh, tanpa pratinjau
- [ ] File lebih dari 10 MB ditolak dengan pesan yang jelas
- [ ] Ganti nama tampilan file, lalu unduh dan hapus
- [ ] Hapus catatan yang punya lampiran → muncul pilihan ikut menghapus filenya
- [ ] Kalau file tidak ikut dihapus, Pengaturan menampilkan "File tanpa catatan"

**Data**
- [ ] Export menghasilkan satu file JSON yang memuat catatan, tanpa lampiran
- [ ] "Export catatan" menghasilkan .md dan .txt yang bisa dibaca di aplikasi lain
- [ ] Import file yang sama → "0 baru, 0 diperbarui, N dilewati" (tidak menggandakan)
- [ ] Import file rusak atau file asing ditolak dengan pesan yang jelas
- [ ] Mode "Ganti semua" terkunci sampai mengetik `GANTI`
- [ ] "Hapus semua data" terkunci sampai mengetik `HAPUS`
- [ ] Hapus data contoh tidak menyentuh data buatan sendiri

**Tampilan**
- [ ] Tema terang / gelap / ikut sistem, tanpa kedip putih saat memuat
- [ ] Di layar HP muncul bottom nav; di layar lebar muncul sidebar
- [ ] Tab dan Enter bisa menjangkau semua kontrol, cincin fokus terlihat
- [ ] Tombol Esc menutup bottom sheet

---

## Struktur

```
src/
├─ app/router.tsx           Rute (HashRouter)
├─ components/
│  ├─ layout/               AppShell, BottomNav, SidebarNav, PageHeader
│  └─ ui/                   Button, Sheet, Toast, Confirm, Field, Segmented, Fab
├─ features/
│  ├─ courses/              Kartu, form, pemilih warna/ikon, editor jadwal
│  ├─ tasks/                Baris tugas, form, filter, pengelompokan
│  ├─ notes/                Editor TipTap, kartu, bagian File, pratinjau lampiran
│  └─ data/                 Dialog import
├─ lib/
│  ├─ db.ts                 Skema Dexie / IndexedDB
│  ├─ repo.ts               Operasi tulis (create/update/delete + undo)
│  ├─ queries.ts            Hook baca reaktif (useLiveQuery)
│  ├─ backup.ts             Export, validasi, import (catatan ikut, lampiran tidak)
│  ├─ markdown.ts           Konversi dua arah TipTap ↔ Markdown/teks
│  ├─ attachments.ts        Batas ukuran, jenis berkas, unduh Blob
│  ├─ urgency.ts            Satu sumber kebenaran aturan deadline
│  ├─ date.ts               Format tanggal Bahasa Indonesia
│  ├─ seed.ts               Data contoh (id berawalan "demo-")
│  ├─ colors.ts, theme.ts, settings.ts, id.ts, cn.ts
├─ pages/                   Tugas, Catatan, Editor, Mata Kuliah, Detail, Pengaturan
├─ styles/theme.css         Token warna, dark mode, animasi, gaya editor
└─ types.ts                 Course, Task, ClassSlot, Note, Attachment
```

## Keputusan teknis

- **HashRouter** supaya build yang sama jalan di Cloudflare Pages maupun
  GitHub Pages tanpa konfigurasi fallback SPA di server.
- **`base: './'`** dan seluruh path precache relatif, sehingga build tidak perlu
  diubah saat dipasang di sub-folder.
- **Font di-host sendiri** (`@fontsource-variable`), bukan Google Fonts CDN,
  supaya tetap tampil benar saat offline.
- **Tema disimpan di localStorage** dan diterapkan lewat skrip inline di `<head>`
  sebelum React mount, agar tidak ada kedip putih.
- **Data contoh memakai id berawalan `demo-`** supaya bisa dihapus tanpa
  menyentuh data asli.
- **Progress dan status saling dijaga**: selesai selalu 100%, dan 100% menandai
  selesai — diatur di satu tempat (`lib/repo.ts`).
- **Lampiran disimpan sebagai Blob** langsung di IndexedDB — tetap lokal, tetap
  tersedia offline, tidak pernah diunggah ke mana pun. Batas 10 MB per file dan
  50 MB total, supaya browser tidak mulai membuang data.
- **Editor catatan di-lazy-load.** TipTap hanya diunduh saat sebuah catatan
  dibuka, jadi halaman Tugas tetap ringan.
- **Konversi Markdown ditulis sendiri**, bukan memakai library, karena cakupannya
  persis sama dengan yang didukung editor. Sintaks di luar itu tetap masuk
  sebagai teks biasa, jadi tidak ada isi yang hilang saat impor.
