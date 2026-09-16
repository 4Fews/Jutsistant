# Semesta

Ruang kuliah pribadi: mata kuliah, tugas, dan deadline dalam satu tempat.
Data selalu tersimpan lokal di browser dulu (tetap jalan offline), dan
kalau `.env` diisi, ikut tersinkron ke akun Supabase pribadi supaya sama
di HP dan laptop.

Status: **Tahap 0–4 selesai** (mata kuliah, tugas, catatan, lampiran file,
backup) **+ integrasi Supabase** (login, sinkronisasi, migrasi data lokal).
Dashboard "Hari Ini", agenda mingguan, dan focus timer belum dibuat.

> **File lampiran tidak ikut dalam backup JSON.** Isi biner akan membuat berkas
> backup membengkak, jadi yang disimpan hanya mata kuliah, tugas, dan catatan.
> Untuk mengamankan lampiran, unduh filenya dari tiap catatan dan salin sendiri.

## Sinkronisasi cloud (opsional)

Tanpa `.env`, Semesta berjalan persis seperti versi lokal murni — tidak ada
halaman login, tidak ada data yang dikirim ke mana pun.

Untuk mengaktifkan sinkronisasi:
1. Buat project di [supabase.com](https://supabase.com) (gratis)
2. Jalankan seluruh isi [supabase/migrations/20260915000000_semesta_init.sql](supabase/migrations/20260915000000_semesta_init.sql) di SQL Editor
3. Buat akun login sendiri lewat Authentication → Users (centang Auto Confirm User), lalu matikan Allow new users to sign up
4. Salin `.env.example` jadi `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari tombol Connect

Detail lengkap tiap langkah ada di riwayat percakapan pembangunan fitur ini.

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

**Sinkronisasi cloud** (hanya kalau `.env` sudah diisi)
- [ ] Pengaturan menampilkan kartu "Akun & Sinkronisasi" dengan tombol Masuk
- [ ] Login dengan akun yang dibuat di Supabase Dashboard → berhasil, redirect ke Pengaturan
- [ ] Email/password salah → pesan error jelas, tidak nyasar ke halaman lain
- [ ] Setelah login, muncul dialog "Pindahkan data lokal ke cloud?" dengan jumlah yang benar
- [ ] Klik "Pindahkan ke cloud" → status berubah "Menyinkronkan…" lalu "Tersimpan"
- [ ] Refresh halaman → tetap dalam keadaan login (sesi tersimpan)
- [ ] Buka Supabase Dashboard → Table Editor → data yang tadi lokal sudah muncul di tabel
- [ ] Login dari browser/perangkat KEDUA dengan akun yang sama → data yang sama muncul
- [ ] Ubah satu tugas di perangkat A → tunggu ~3 detik → muncul juga di perangkat B setelah dibuka
- [ ] Hapus tugas di satu perangkat → ikut hilang di perangkat lain setelah sync
- [ ] Matikan Wi-Fi → status berubah "Offline"; app tetap bisa dipakai penuh dari cache lokal
- [ ] Nyalakan lagi Wi-Fi → status kembali "Tersimpan" tanpa perlu refresh manual
- [ ] Lampirkan file di perangkat A → di perangkat B muncul dengan label "Dari perangkat lain", terunduh otomatis saat dibuka
- [ ] Keluar (logout) di Pengaturan → kembali ke tampilan "Belum masuk", data lokal tidak terhapus
- [ ] "Hapus semua data" saat login → data ikut hilang dari cloud (cek di Table Editor)

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
│  ├─ data/                 Dialog import
│  └─ auth/                 Dialog "Pindahkan data lokal ke cloud"
├─ lib/
│  ├─ db.ts                 Skema Dexie / IndexedDB (v3: + tabel bantu sync)
│  ├─ repo.ts               Operasi tulis (create/update/delete + undo + tombstone)
│  ├─ queries.ts            Hook baca reaktif (useLiveQuery)
│  ├─ backup.ts             Export, validasi, import (catatan ikut, lampiran tidak)
│  ├─ markdown.ts           Konversi dua arah TipTap ↔ Markdown/teks
│  ├─ attachments.ts        Batas ukuran, jenis berkas, unduh Blob
│  ├─ urgency.ts            Satu sumber kebenaran aturan deadline
│  ├─ date.ts               Format tanggal Bahasa Indonesia
│  ├─ seed.ts               Data contoh (id berawalan "demo-", tidak pernah disinkron)
│  ├─ supabaseClient.ts     Klien Supabase — null kalau .env kosong
│  ├─ authStore.ts          Status login (useSyncExternalStore, non-React lewat initAuth)
│  ├─ cloudTypes.ts         Mapper baris cloud (snake_case) ↔ tipe lokal (camelCase)
│  ├─ syncEngine.ts         Pull+push dua arah, tombstone, status sync
│  ├─ migration.ts          Hitung & pindahkan data lokal ke cloud pertama kali
│  ├─ colors.ts, theme.ts, settings.ts, id.ts, cn.ts
├─ pages/                   Tugas, Catatan, Editor, Mata Kuliah, Detail, Pengaturan, Login
├─ styles/theme.css         Token warna, dark mode, color-scheme, animasi, gaya editor
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
- **Sync: pull dulu baru push, per siklus.** Pull menarik baris yang berubah di
  server (cursor = server_updated_at terbesar yang pernah diterima, bukan jam
  perangkat sendiri — supaya tidak meleset kalau jam HP/laptop tidak presisi),
  menang lewat updated_at kalau lebih baru dari lokal. Push lalu mengunggah
  ulang seluruh data lokal aktif tanpa syarat — aman karena konflik sudah
  selesai di tahap pull. Dipicu oleh hook Dexie (nyaris tiap tulis), event
  online, dan login — di-debounce ~2,5 detik, bukan polling terus-menerus.
- **Penghapusan lewat tombstone**, bukan soft-delete di tabel lokal. Baris yang
  dihapus lokal meninggalkan jejak kecil di tabel `syncTombstones`; jejak itu
  yang memberitahu server untuk menandai `deleted_at`. Undo (dalam ~6,5 detik)
  menghapus jejaknya lagi sebelum sempat terkirim.
- **Lampiran: metadata sync seperti tabel lain, isi file terpisah.** Blob
  diunggah sekali ke Supabase Storage (path `<user_id>/<attachment_id>`).
  Di perangkat lain, baris metadata muncul lebih dulu dengan blob placeholder
  kosong — isinya baru diunduh saat pengguna membuka lampiran itu.
- **`color-scheme` dideklarasikan eksplisit** di `:root`/`.dark` — tanpa ini,
  beberapa browser bisa merender chrome native field password/email memakai
  preferensi OS, bukan tema halaman (ditemukan saat menguji halaman Login).
