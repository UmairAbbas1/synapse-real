"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/lib/hooks/useAuth"
import { ApiError } from "@/lib/api-client"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const [banner, setBanner] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/chat")
    }
  }, [authLoading, isAuthenticated, router])

  React.useEffect(() => {
    if (!banner) return
    const t = window.setTimeout(() => setBanner(null), 5000)
    return () => window.clearTimeout(t)
  }, [banner])

  const onSubmit = async (data: LoginForm) => {
    setBanner(null)
    try {
      await login(data.email, data.password)
      router.push("/chat")
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setBanner("Invalid credentials. Please verify your access tokens.")
      } else {
        setBanner("Quantum synchronization failed. Server unreachable.")
      }
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
          <div className="h-12 w-12 border-2 border-primary border-t-transparent rounded-full animate-spin relative" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 overflow-hidden">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-12 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="inline-block relative">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
             <h1 className="relative font-headline-lg text-6xl tracking-tighter text-on-background uppercase font-semibold">
               SYNAPSE
             </h1>
          </div>
          <p className="font-label-sm tracking-[0.3em] text-secondary uppercase">
            Grounded Intelligence Framework
          </p>
        </div>

        <div className="bg-surface/60 rounded-3xl border border-outline-variant/30 shadow-xl p-10 backdrop-blur-3xl">
          {banner ? (
            <div
              className="mb-8 rounded-xl border border-error/20 bg-error/5 px-4 py-4 font-label-sm text-[11px] text-error uppercase tracking-widest text-center animate-shake"
              role="alert"
            >
              {banner}
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-10">
            <div className="space-y-8">
               <div className="group space-y-2">
                 <label className="font-label-sm text-[11px] text-secondary uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">Identity Token</label>
                 <input
                   type="email"
                   autoComplete="email"
                   placeholder="operator@synapse.ai"
                   disabled={isSubmitting}
                   {...register("email")}
                   className="w-full bg-transparent border-b border-outline-variant py-3 px-1 font-body-md text-[14px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all duration-300"
                 />
                 {errors.email?.message && <p className="font-label-sm text-[10px] text-error mt-1 uppercase tracking-wider">{errors.email.message}</p>}
               </div>

               <div className="group space-y-2">
                 <label className="font-label-sm text-[11px] text-secondary uppercase tracking-widest ml-1 transition-colors group-focus-within:text-primary">Access Key</label>
                 <input
                   type="password"
                   autoComplete="current-password"
                   placeholder="••••••••••••"
                   disabled={isSubmitting}
                   {...register("password")}
                   className="w-full bg-transparent border-b border-outline-variant py-3 px-1 font-body-md text-[14px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all duration-300"
                 />
                 {errors.password?.message && <p className="font-label-sm text-[10px] text-error mt-1 uppercase tracking-wider">{errors.password.message}</p>}
               </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="group relative w-full overflow-hidden rounded-xl bg-primary py-4 text-sm font-semibold text-on-primary transition-all duration-500 hover:brightness-110 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-95 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                   <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   <span>Initializing...</span>
                </div>
              ) : (
                "Establish Neural Link"
              )}
            </button>
          </form>
        </div>

        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-4 font-label-sm text-[11px] text-secondary uppercase tracking-[0.2em]">
            <div className="h-px w-8 bg-outline-variant/30" />
            Authorized Demo Access
            <div className="h-px w-8 bg-outline-variant/30" />
          </div>
          <p className="font-mono-md text-[12px] text-secondary bg-surface/50 backdrop-blur-md rounded-full px-6 py-2 border border-outline-variant/30 shadow-sm inline-block">
            UID: <span className="text-on-surface">admin@company.com</span> · KEY: <span className="text-on-surface">Admin123!</span>
          </p>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="font-label-sm text-[10px] text-secondary uppercase tracking-[0.4em]">
          © 2024 Synapse Deepmind · Quantum-Ready Interface
        </p>
      </div>
    </div>
  )
}
