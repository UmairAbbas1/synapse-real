"use client"

import * as React from "react"
import ReactMarkdown, { Components } from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import { Copy, Check } from "lucide-react"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table"
import { cn } from "@/lib/utils"
// import "highlight.js/styles/github-dark.css" // Usually needed for styling code blocks

export function MarkdownRenderer({ content }: { content: string }) {
  const components: Components = {
    h1: ({ children }) => <h1 className="mt-6 mb-4 text-2xl font-bold text-text-primary">{children}</h1>,
    h2: ({ children }) => <h2 className="mt-5 mb-3 text-xl font-bold text-text-primary">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-4 mb-2 text-lg font-semibold text-text-primary">{children}</h3>,
    p: ({ children }) => <p className="mb-4 text-sm leading-relaxed text-text-primary">{children}</p>,
    ul: ({ children }) => <ul className="mb-4 ml-6 list-disc text-sm text-text-primary space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal text-sm text-text-primary space-y-1">{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:text-accent-hover hover:underline transition-colors">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-accent-primary bg-surface-1 py-2 px-4 mb-4 rounded-r-[6px] italic text-text-secondary">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="mb-4 w-full overflow-hidden">
        <Table>{children}</Table>
      </div>
    ),
    thead: ({ children }) => <TableHeader>{children}</TableHeader>,
    tbody: ({ children }) => <TableBody>{children}</TableBody>,
    tr: ({ children }) => <TableRow>{children}</TableRow>,
    th: ({ children }) => <TableHead>{children}</TableHead>,
    td: ({ children }) => <TableCell>{children}</TableCell>,
    code(props) {
      const { children, className, node, ...rest } = props
      const match = /language-(\w+)/.exec(className || '')
      const isInline = !match && !className?.includes('language-')
      
      if (isInline) {
        return (
          <code className="bg-surface-2 text-accent-primary font-mono text-[13px] px-1.5 py-0.5 rounded-[4px]" {...rest}>
            {children}
          </code>
        )
      }
      
      const codeString = String(children).replace(/\n$/, '')
      return <CodeBlock language={match?.[1]} code={codeString} className={className} {...rest} />
    }
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function CodeBlock({ code, language, className, ...rest }: { code: string; language?: string | undefined; className?: string | undefined }) {
  const [isCopied, setIsCopied] = React.useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="relative group mb-4 mt-2 overflow-hidden rounded-[8px] bg-surface-3 border border-border-strong font-mono text-sm">
      <div className="flex items-center justify-between bg-bg-primary px-4 py-1.5 border-b border-border-strong">
        <span className="text-xs font-semibold text-text-tertiary uppercase">{language || "text"}</span>
        <button
          onClick={copyToClipboard}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-text-secondary hover:text-text-primary rounded-[4px] hover:bg-surface-2 focus:outline-none"
          title="Copy code"
        >
          {isCopied ? <Check className="h-4 w-4 text-status-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-text-primary">
        <code className={className} {...rest}>
          {code}
        </code>
      </div>
    </div>
  )
}
