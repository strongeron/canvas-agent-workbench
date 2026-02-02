type ToastPayload = {
  title?: string
  description?: string
}

export function useToast() {
  const notify = (_payload?: ToastPayload) => {}
  return {
    success: notify,
    error: notify,
    info: notify,
    warning: notify,
  }
}

