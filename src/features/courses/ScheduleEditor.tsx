import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, TextInput } from '@/components/ui/Field'
import { HARI_PANJANG } from '@/lib/date'
import { newSlot } from '@/lib/repo'
import type { ClassSlot, Day } from '@/types'

interface Props {
  slots: ClassSlot[]
  onChange: (slots: ClassSlot[]) => void
}

export function ScheduleEditor({ slots, onChange }: Props) {
  function patch(id: string, p: Partial<ClassSlot>) {
    onChange(slots.map((s) => (s.id === id ? { ...s, ...p } : s)))
  }

  return (
    <div className="space-y-2.5">
      {slots.length === 0 && (
        <p className="rounded-btn border border-dashed border-line px-3 py-4 text-center text-[13px] text-ink-3">
          Belum ada jadwal. Boleh dikosongkan dulu.
        </p>
      )}

      {slots.map((slot, i) => (
        <div key={slot.id} className="rounded-btn border border-line bg-canvas p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-ink-3">Pertemuan {i + 1}</span>
            <button
              type="button"
              onClick={() => onChange(slots.filter((s) => s.id !== slot.id))}
              aria-label={`Hapus pertemuan ${i + 1}`}
              className="press flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-late-soft hover:text-late"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Select
                aria-label={`Hari pertemuan ${i + 1}`}
                value={slot.day}
                onChange={(e) => patch(slot.id, { day: Number(e.target.value) as Day })}
                className="bg-surface"
              >
                {HARI_PANJANG.map((h, d) => (
                  <option key={h} value={d}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>
            <TextInput
              type="time"
              aria-label={`Jam mulai pertemuan ${i + 1}`}
              value={slot.start}
              onChange={(e) => patch(slot.id, { start: e.target.value })}
              className="bg-surface tnum"
            />
            <TextInput
              type="time"
              aria-label={`Jam selesai pertemuan ${i + 1}`}
              value={slot.end}
              onChange={(e) => patch(slot.id, { end: e.target.value })}
              className="bg-surface tnum"
            />
            <div className="col-span-2">
              <TextInput
                aria-label={`Ruang pertemuan ${i + 1}`}
                placeholder="Ruang (opsional)"
                value={slot.room ?? ''}
                onChange={(e) => patch(slot.id, { room: e.target.value })}
                className="bg-surface"
              />
            </div>
          </div>
        </div>
      ))}

      <Button size="sm" onClick={() => onChange([...slots, newSlot()])}>
        <Plus size={16} aria-hidden="true" />
        Tambah jadwal
      </Button>
    </div>
  )
}
