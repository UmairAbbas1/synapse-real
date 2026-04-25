import * as React from "react"
import { Dialog as HeadlessDialog, Transition } from "@headlessui/react"
import { cn } from "@/lib/utils"

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ isOpen, onClose, title, description, children, className }: DialogProps) {
  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-glass-bg backdrop-blur-[20px] border-glass-border" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <HeadlessDialog.Panel
                className={cn(
                  "w-full max-w-md transform overflow-hidden rounded-[12px] bg-surface-1 p-6 text-left align-middle shadow-xl transition-all border border-border-strong",
                  className
                )}
              >
                {title && (
                  <HeadlessDialog.Title as="h3" className="text-lg font-bold leading-6 text-text-primary">
                    {title}
                  </HeadlessDialog.Title>
                )}
                {description && (
                  <div className="mt-2">
                    <p className="text-sm text-text-secondary">{description}</p>
                  </div>
                )}
                <div className="mt-4">{children}</div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  )
}
