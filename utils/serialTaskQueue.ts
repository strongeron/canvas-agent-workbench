export class SerialTaskQueue {
  private tail: Promise<void> = Promise.resolve()

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const scheduled = this.tail.then(task, task)
    this.tail = scheduled.then(
      () => undefined,
      () => undefined
    )
    return scheduled
  }
}
