-- =============================================================================
--  Semesta — skema cloud di Supabase
-- =============================================================================
--  Cara menjalankan:
--    Supabase Dashboard → SQL Editor → New query → tempel SELURUH file ini → Run.
--    Aman dijalankan ulang dan tidak menghapus data yang sudah ada.
--    Hasil akhirnya berupa tabel ringkasan keamanan (lihat bagian 6).
--
--  Keamanan:
--    • Setiap tabel punya user_id yang terhubung ke auth.users(id).
--    • Row Level Security aktif di semua tabel: pengguna hanya bisa membaca,
--      menambah, mengubah, dan menghapus barisnya sendiri.
--    • Role anon (pengunjung yang belum login) dicabut seluruh haknya.
--    • Bucket "attachments" privat; file hanya bisa diakses pemiliknya.
--
--  Catatan sinkronisasi:
--    • id bertipe text dengan primary key (user_id, id). Id lama dari IndexedDB
--      dipakai apa adanya (tidak semuanya uuid, mis. data contoh "demo-c1"),
--      sehingga migrasi yang diulang hanya menimpa baris yang sama — tanpa duplikat.
--    • updated_at        : kapan data diubah di perangkat; versi terbaru yang menang.
--    • server_updated_at : diisi server; perangkat lain menarik perubahan sejak nilai ini.
--    • deleted_at        : tanda hapus, agar penghapusan ikut sampai ke perangkat lain.
--    • course_id, task_id, dan note_id sengaja tanpa foreign key: perangkat yang
--      baru kembali online bisa mengirim data dalam urutan acak, dan satu referensi
--      yang belum sampai tidak boleh membuat seluruh sinkronisasi macet.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Stempel waktu server
-- -----------------------------------------------------------------------------
create or replace function public.semesta_touch_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

-- hanya untuk trigger, tidak boleh dipanggil langsung lewat API
revoke execute on function public.semesta_touch_server_updated_at() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. Tabel
-- -----------------------------------------------------------------------------
create table if not exists public.courses (
  user_id            uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id                 text        not null,
  name               text        not null,
  lecturer           text,
  color              text        not null default 'coral'
                       check (color in ('coral', 'amber', 'lemon', 'mint', 'sage', 'sky', 'lilac', 'rose')),
  icon               text        not null default '📚',
  schedule           jsonb       not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array'),
  archived           boolean     not null default false,
  sort_order         integer     not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  server_updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.tasks (
  user_id            uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id                 text        not null,
  course_id          text,
  title              text        not null,
  note               text,
  due_at             timestamptz,
  has_time           boolean     not null default false,
  priority           text        not null default 'sedang' check (priority in ('rendah', 'sedang', 'tinggi')),
  status             text        not null default 'belum'  check (status in ('belum', 'jalan', 'selesai')),
  progress           smallint    not null default 0        check (progress between 0 and 100),
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  server_updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.notes (
  user_id            uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id                 text        not null,
  course_id          text,
  task_id            text,
  title              text        not null default '',
  content            jsonb       not null default '{"type": "doc", "content": [{"type": "paragraph"}]}'::jsonb
                       check (jsonb_typeof(content) = 'object'),
  plain_text         text        not null default '',
  pinned             boolean     not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  server_updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- Metadata lampiran. Isi file-nya ada di Storage, bucket "attachments",
-- pada path "<user_id>/<id>".
create table if not exists public.attachments (
  user_id            uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id                 text        not null,
  note_id            text        not null,
  name               text        not null,
  mime               text        not null default 'application/octet-stream',
  size               bigint      not null check (size between 0 and 10485760),
  storage_path       text        not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  server_updated_at  timestamptz not null default now(),
  primary key (user_id, id),
  -- metadata hanya boleh menunjuk ke folder milik pengguna itu sendiri
  constraint attachments_path_milik_sendiri check (split_part(storage_path, '/', 1) = user_id::text)
);

-- Disiapkan untuk fitur Fokus (Pomodoro). Belum dipakai aplikasi.
create table if not exists public.focus_sessions (
  user_id            uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id                 text        not null,
  course_id          text,
  task_id            text,
  mode               text        not null default 'fokus' check (mode in ('fokus', 'istirahat', 'istirahat-panjang')),
  started_at         timestamptz not null,
  ended_at           timestamptz,
  planned_sec        integer     not null check (planned_sec >= 0),
  focused_sec        integer     not null default 0 check (focused_sec >= 0),
  completed          boolean     not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  server_updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- Satu baris pengaturan per akun.
create table if not exists public.user_settings (
  user_id            uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  data               jsonb       not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at         timestamptz not null default now(),
  server_updated_at  timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 3. Indeks
-- -----------------------------------------------------------------------------
-- Dipakai setiap kali perangkat menarik perubahan: "milik saya, sejak waktu X".
create index if not exists courses_sync_idx        on public.courses        (user_id, server_updated_at, id);
create index if not exists tasks_sync_idx          on public.tasks          (user_id, server_updated_at, id);
create index if not exists notes_sync_idx          on public.notes          (user_id, server_updated_at, id);
create index if not exists attachments_sync_idx    on public.attachments    (user_id, server_updated_at, id);
create index if not exists focus_sessions_sync_idx on public.focus_sessions (user_id, server_updated_at, id);

-- Relasi yang sering dicari.
create index if not exists tasks_course_idx      on public.tasks       (user_id, course_id);
create index if not exists notes_course_idx      on public.notes       (user_id, course_id);
create index if not exists attachments_note_idx  on public.attachments (user_id, note_id);


-- -----------------------------------------------------------------------------
-- 4. Trigger, Row Level Security, hak akses, dan policy
--
--    Dibuat lewat satu perulangan supaya aturannya identik di setiap tabel —
--    tidak mungkin ada satu tabel yang terlewat atau salah ketik.
--    Untuk tabel courses, hasilnya setara dengan:
--
--      alter table public.courses enable row level security;
--      revoke all on table public.courses from anon;
--      grant select, insert, update, delete on table public.courses to authenticated;
--      create policy "baca milik sendiri"   on public.courses for select to authenticated
--        using ((select auth.uid()) = user_id);
--      create policy "tambah milik sendiri" on public.courses for insert to authenticated
--        with check ((select auth.uid()) = user_id);
--      create policy "ubah milik sendiri"   on public.courses for update to authenticated
--        using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
--      create policy "hapus milik sendiri"  on public.courses for delete to authenticated
--        using ((select auth.uid()) = user_id);
-- -----------------------------------------------------------------------------
do $$
declare
  t   text;
  own constant text := '((select auth.uid()) = user_id)';
begin
  foreach t in array array['courses', 'tasks', 'notes', 'attachments', 'focus_sessions', 'user_settings']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.semesta_touch_server_updated_at()',
      t || '_touch', t);

    execute format('alter table public.%I enable row level security', t);
    -- grant eksplisit: Supabase sedang mengubah default agar tabel baru tidak
    -- otomatis bisa diakses, jadi hak authenticated tidak boleh diasumsikan
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    execute format('drop policy if exists "baca milik sendiri" on public.%I', t);
    execute format('drop policy if exists "tambah milik sendiri" on public.%I', t);
    execute format('drop policy if exists "ubah milik sendiri" on public.%I', t);
    execute format('drop policy if exists "hapus milik sendiri" on public.%I', t);

    execute format('create policy "baca milik sendiri" on public.%I
                      for select to authenticated using %s', t, own);
    execute format('create policy "tambah milik sendiri" on public.%I
                      for insert to authenticated with check %s', t, own);
    execute format('create policy "ubah milik sendiri" on public.%I
                      for update to authenticated using %s with check %s', t, own, own);
    execute format('create policy "hapus milik sendiri" on public.%I
                      for delete to authenticated using %s', t, own);
  end loop;
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. Storage: bucket privat untuk lampiran
--
--    Tabel storage.objects milik Supabase, jadi di sini TIDAK ada "alter table"
--    (itu akan gagal: RLS di storage.objects memang sudah aktif bawaan).
--    Policy hanya dibuat kalau belum ada, sehingga aman dijalankan ulang.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and policyname = 'attachments: baca file sendiri') then
    create policy "attachments: baca file sendiri" on storage.objects
      for select to authenticated
      using (bucket_id = 'attachments'
             and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and policyname = 'attachments: unggah file sendiri') then
    create policy "attachments: unggah file sendiri" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'attachments'
                  and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;

  -- dibutuhkan saat file yang sama diunggah ulang (upsert)
  if not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and policyname = 'attachments: timpa file sendiri') then
    create policy "attachments: timpa file sendiri" on storage.objects
      for update to authenticated
      using (bucket_id = 'attachments'
             and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = 'attachments'
                  and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname = 'storage' and tablename = 'objects'
                   and policyname = 'attachments: hapus file sendiri') then
    create policy "attachments: hapus file sendiri" on storage.objects
      for delete to authenticated
      using (bucket_id = 'attachments'
             and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- 6. Ringkasan keamanan
--
--    Yang diharapkan untuk SETIAP baris:
--      terkunci = true · jumlah_policy = 4 · anon_punya_akses = false
-- -----------------------------------------------------------------------------
select 'tabel ' || c.relname                                  as objek,
       c.relrowsecurity                                       as terkunci,
       (select count(*)::int from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as jumlah_policy,
       has_table_privilege('anon', c.oid, 'select, insert, update, delete') as anon_punya_akses
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('courses', 'tasks', 'notes', 'attachments', 'focus_sessions', 'user_settings')
union all
select 'bucket ' || b.id,
       not b.public,
       (select count(*)::int from pg_policies p
         where p.schemaname = 'storage' and p.tablename = 'objects'
           and p.policyname like 'attachments:%'),
       b.public
  from storage.buckets b
 where b.id = 'attachments'
 order by 1;
