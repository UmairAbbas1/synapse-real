"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
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
      <div className="flex min-h-screen items-center justify-center bg-bg-primary overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-accent-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
          <div className="h-12 w-12 border-2 border-accent-primary border-t-transparent rounded-full animate-spin relative" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 py-12 overflow-hidden">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-primary/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-primary/5 blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-12 animate-slide-up">
        <div className="text-center space-y-4">
          <div className="inline-block relative">
             <div className="absolute inset-0 bg-accent-primary/20 blur-xl rounded-full" />
             <h1 className="relative font-sans text-6xl font-black tracking-tighter text-text-primary uppercase">
               SYNAPSE
             </h1>
          </div>
          <p className="text-sm font-mono tracking-[0.3em] text-text-tertiary uppercase">
            Grounded Intelligence Framework
          </p>
        </div>

        <div className="glass-effect rounded-[32px] border border-white/20 shadow-2xl p-10 backdrop-blur-3xl bg-white/40">
          {banner ? (
            <div
              className="mb-8 rounded-[12px] border border-error/20 bg-error/5 px-4 py-4 text-xs font-bold text-error uppercase tracking-widest text-center animate-shake"
              role="alert"
            >
              {banner}
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-10">
            <div className="space-y-8">
               <div className="group space-y-2">
                 <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1 transition-colors group-focus-within:text-accent-primary">Identity Token</label>
                 <input
                   type="email"
                   autoComplete="email"
                   placeholder="operator@synapse.ai"
                   disabled={isSubmitting}
                   {...register("email")}
                   className="w-full bg-transparent border-b border-border-strong py-3 px-1 text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-all duration-300"
                 />
                 {errors.email?.message && <p className="text-[10px] text-error font-bold mt-1 uppercase tracking-wider">{errors.email.message}</p>}
               </div>

               <div className="group space-y-2">
                 <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1 transition-colors group-focus-within:text-accent-primary">Access Key</label>
                 <input
                   type="password"
                   autoComplete="current-password"
                   placeholder="••••••••••••"
                   disabled={isSubmitting}
                   {...register("password")}
                   className="w-full bg-transparent border-b border-border-strong py-3 px-1 text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-all duration-300"
                 />
                 {errors.password?.message && <p className="text-[10px] text-error font-bold mt-1 uppercase tracking-wider">{errors.password.message}</p>}
               </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="group relative w-full overflow-hidden rounded-[16px] bg-text-primary py-4 text-sm font-bold text-white transition-all duration-500 hover:bg-accent-primary hover:shadow-[0_0_30px_rgba(0,229,204,0.4)] active:scale-95 disabled:opacity-50"
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
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
            <div className="h-px w-8 bg-border-medium" />
            Authorized Demo Access
            <div className="h-px w-8 bg-border-medium" />
          </div>
          <p className="text-[11px] font-mono text-text-tertiary bg-white/40 backdrop-blur-md rounded-full px-6 py-2 border border-white/20 shadow-sm inline-block">
            UID: <span className="text-text-primary">admin@company.com</span> · KEY: <span className="text-text-primary">Admin123!</span>
          </p>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-[0.4em]">
          © 2024 Synapse Deepmind · Quantum-Ready Interface
        </p>
      </div>
    </div>
  )
}
