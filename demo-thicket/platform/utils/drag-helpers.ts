import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core"

export function arrayMove<T>(array: T[], from: number, to: number) {
  const next = array.slice()
  const item = next.splice(from, 1)[0]
  next.splice(to, 0, item)
  return next
}

export function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )
}

