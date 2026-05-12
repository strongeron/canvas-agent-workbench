type AnyFunction = (...args: any[]) => any

export function fn<T extends AnyFunction = AnyFunction>(implementation?: T): T {
  const calls: unknown[][] = []

  const mockFn = ((...args: unknown[]) => {
    calls.push(args)
    return implementation?.(...(args as Parameters<T>))
  }) as T & { mock?: { calls: unknown[][] } }

  mockFn.mock = { calls }
  return mockFn as T
}

