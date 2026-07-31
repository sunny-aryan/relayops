import { cn } from "@/lib/utils"

interface MonoProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

export function Mono({ className, children, ...props }: MonoProps) {
  return (
    <code
      className={cn(
        "rounded bg-muted px-1 py-0.5 font-mono text-[0.8125em] text-foreground/90",
        className
      )}
      {...props}
    >
      {children}
    </code>
  )
}

export function MonoPlain({ className, children, ...props }: MonoProps) {
  return (
    <span className={cn("font-mono text-[0.8125em]", className)} {...props}>
      {children}
    </span>
  )
}
