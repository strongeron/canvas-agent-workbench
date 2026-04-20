import { describe, expect, it } from "vitest"

import { SerialTaskQueue } from "../utils/serialTaskQueue"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe("SerialTaskQueue", () => {
  it("runs queued tasks sequentially", async () => {
    const queue = new SerialTaskQueue()
    const order: string[] = []
    let activeCount = 0
    let peakActiveCount = 0

    const runTask = (label: string, waitMs: number) =>
      queue.enqueue(async () => {
        activeCount += 1
        peakActiveCount = Math.max(peakActiveCount, activeCount)
        order.push(`start:${label}`)
        await sleep(waitMs)
        order.push(`end:${label}`)
        activeCount -= 1
        return label
      })

    const [first, second, third] = await Promise.all([
      runTask("first", 10),
      runTask("second", 0),
      runTask("third", 0),
    ])

    expect(first).toBe("first")
    expect(second).toBe("second")
    expect(third).toBe("third")
    expect(peakActiveCount).toBe(1)
    expect(order).toEqual([
      "start:first",
      "end:first",
      "start:second",
      "end:second",
      "start:third",
      "end:third",
    ])
  })

  it("continues after a queued task fails", async () => {
    const queue = new SerialTaskQueue()
    const order: string[] = []

    const failedTask = queue.enqueue(async () => {
      order.push("start:failed")
      await sleep(0)
      order.push("end:failed")
      throw new Error("boom")
    })

    const successfulTask = queue.enqueue(async () => {
      order.push("start:success")
      await sleep(0)
      order.push("end:success")
      return "ok"
    })

    await expect(failedTask).rejects.toThrow("boom")
    await expect(successfulTask).resolves.toBe("ok")
    expect(order).toEqual([
      "start:failed",
      "end:failed",
      "start:success",
      "end:success",
    ])
  })
})
