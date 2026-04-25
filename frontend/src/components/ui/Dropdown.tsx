import * as React from "react"
import { Menu, Transition } from "@headlessui/react"
import { cn } from "@/lib/utils"

export function Dropdown({
  trigger,
  children,
  className,
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button as={React.Fragment}>{trigger}</Menu.Button>
      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            "absolute right-0 mt-2 w-56 origin-top-right divide-y divide-border-subtle rounded-[12px] bg-surface-1 shadow-lg border border-border-strong focus:outline-none z-50",
            className
          )}
        >
          {children}
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

export function DropdownItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <Menu.Item>
      {({ active }) => (
        <button
          onClick={onClick}
          className={cn(
            "group flex w-full items-center px-4 py-2 text-sm",
            active ? "bg-bg-hover text-accent-primary" : "text-text-primary",
            className
          )}
        >
          {children}
        </button>
      )}
    </Menu.Item>
  )
}
