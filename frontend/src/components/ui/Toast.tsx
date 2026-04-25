import toast from "react-hot-toast"

export const Toast = {
  success: (message: string) =>
    toast.success(message, {
      iconTheme: {
        primary: "var(--success)",
        secondary: "var(--bg-primary)",
      },
    }),
  error: (message: string) =>
    toast.error(message, {
      iconTheme: {
        primary: "var(--error)",
        secondary: "var(--bg-primary)",
      },
    }),
  loading: (message: string) => toast.loading(message),
  dismiss: toast.dismiss,
}
