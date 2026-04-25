"use client"

import * as React from "react"
import { Command } from "cmdk"
import { Dialog as HeadlessDialog, Transition } from "@headlessui/react"
import { Search } from "lucide-react"

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <Transition.Root show={isOpen} as={React.Fragment}>
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
          <div className="fixed inset-0 bg-glass-bg backdrop-blur-[20px] transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <HeadlessDialog.Panel className="mx-auto max-w-xl transform divide-y divide-border-subtle overflow-hidden rounded-[12px] bg-surface-1 shadow-2xl ring-1 ring-border-strong transition-all">
              <Command className="flex h-full w-full flex-col bg-transparent">
                <div className="flex items-center border-b border-border-subtle px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 text-text-tertiary" />
                  <Command.Input
                    className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-text-tertiary text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Search Synapse or type a command..."
                  />
                </div>
                <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                  <Command.Empty className="py-6 text-center text-sm text-text-secondary">
                    No results found.
                  </Command.Empty>
                  <Command.Group heading="Navigation" className="text-xs font-semibold text-text-tertiary px-2 py-1">
                    <Command.Item onSelect={onClose} className="flex cursor-pointer select-none items-center rounded-[6px] px-2 py-2 text-sm text-text-primary hover:bg-bg-hover aria-selected:bg-bg-hover aria-selected:text-accent-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                      Go to Chat
                    </Command.Item>
                    <Command.Item onSelect={onClose} className="flex cursor-pointer select-none items-center rounded-[6px] px-2 py-2 text-sm text-text-primary hover:bg-bg-hover aria-selected:bg-bg-hover aria-selected:text-accent-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                      Go to Admin Dashboard
                    </Command.Item>
                    <Command.Item onSelect={onClose} className="flex cursor-pointer select-none items-center rounded-[6px] px-2 py-2 text-sm text-text-primary hover:bg-bg-hover aria-selected:bg-bg-hover aria-selected:text-accent-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                      Go to Knowledge Graph
                    </Command.Item>
                  </Command.Group>
                </Command.List>
              </Command>
            </HeadlessDialog.Panel>
          </Transition.Child>
        </div>
      </HeadlessDialog>
    </Transition.Root>
  )
}
