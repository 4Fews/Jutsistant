import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { toast } from '@/components/ui/Toast'
import { ColorPicker, IconPicker } from './CoursePickers'
import { ScheduleEditor } from './ScheduleEditor'
import { createCourse, updateCourse } from '@/lib/repo'
import type { ClassSlot, ColorKey, Course } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  /** diisi = mode ubah, kosong = mode tambah */
  course?: Course | null
}

export function CourseForm({ open, onClose, course }: Props) {
  const [name, setName] = useState('')
  const [lecturer, setLecturer] = useState('')
  const [color, setColor] = useState<ColorKey>('coral')
  const [icon, setIcon] = useState('📚')
  const [schedule, setSchedule] = useState<ClassSlot[]>([])
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  // isi ulang setiap kali sheet dibuka
  useEffect(() => {
    if (!open) return
    setName(course?.name ?? '')
    setLecturer(course?.lecturer ?? '')
    setColor(course?.color ?? 'coral')
    setIcon(course?.icon ?? '📚')
    setSchedule(course?.schedule ? course.schedule.map((s) => ({ ...s })) : [])
    setError(undefined)
  }, [open, course])

  async function save() {
    if (!name.trim()) {
      setError('Nama mata kuliah belum diisi.')
      return
    }
    const bad = schedule.find((s) => s.end <= s.start)
    if (bad) {
      setError('Jam selesai harus lebih akhir dari jam mulai.')
      return
    }

    setSaving(true)
    try {
      const clean = schedule.map((s) => ({ ...s, room: s.room?.trim() || undefined }))
      if (course) {
        await updateCourse(course.id, {
          name: name.trim(),
          lecturer: lecturer.trim() || undefined,
          color,
          icon,
          schedule: clean,
        })
        toast('Mata kuliah diperbarui')
      } else {
        await createCourse({ name, lecturer, color, icon, schedule: clean })
        toast('Mata kuliah ditambahkan')
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={course ? 'Ubah mata kuliah' : 'Mata kuliah baru'}
      footer={
        <div className="flex gap-2.5">
          <Button block onClick={onClose}>
            Batal
          </Button>
          <Button block variant="primary" onClick={save} disabled={saving}>
            {course ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      }
    >
      <div className="pb-2">
        <Field label="Nama mata kuliah" error={error}>
          {(id) => (
            <TextInput
              id={id}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(undefined)
              }}
              placeholder="mis. Kalkulus II"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Dosen / guru" hint="Boleh dikosongkan">
          {(id) => (
            <TextInput
              id={id}
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              placeholder="mis. Dr. Wulandari"
              autoComplete="off"
            />
          )}
        </Field>

        <div className="py-2">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Warna</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="py-2">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Ikon</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        <div className="py-2">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Jadwal kelas</span>
          <ScheduleEditor slots={schedule} onChange={setSchedule} />
        </div>
      </div>
    </Sheet>
  )
}
