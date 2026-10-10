import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({
  className,
  variant = "default",
  size = "default",
  fullWidth = false,
  isLoading = false,
  icon,
  iconPosition = "left",
  children,
  disabled,
  ...props
}, ref) => {
  const variants = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:glow transition-all duration-300",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    glass: "glass text-foreground hover:bg-white/10 hover:border-white/20 transition-all duration-300",
    gradient: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-950/40 transition-colors border-0 font-medium",
    surface: "border border-white/10 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-900 hover:border-white/20 transition-all duration-200",
    light: "bg-white text-black shadow-lg shadow-white/10 hover:bg-zinc-200 transition-colors",
  }

  const sizes = {
    default: "h-9 px-3.5 py-1.5 text-xs rounded-xl sm:h-10 sm:px-4 sm:py-2 sm:text-sm",
    sm: "h-8 rounded-lg px-2.5 text-xs sm:h-8.5 sm:px-3 sm:rounded-md",
    xs: "h-7 rounded-md px-2 text-[11px] sm:h-7.5 sm:px-2.5",
    lg: "h-10.5 rounded-xl px-5 text-sm sm:h-12 sm:rounded-xl sm:px-8 sm:text-base",
    icon: "h-8.5 w-8.5 rounded-lg sm:h-10 sm:w-10 sm:rounded-xl",
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        fullWidth && "w-full",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {!isLoading && icon && iconPosition === "left" && (
        <span className="mr-2 inline-flex items-center">{icon}</span>
      )}
      <span className={cn("inline-flex items-center whitespace-nowrap", isLoading && "opacity-90")}>{children}</span>
      {!isLoading && icon && iconPosition === "right" && (
        <span className="ml-2 inline-flex items-center">{icon}</span>
      )}
    </button>
  )
})
Button.displayName = "Button"

export { Button }
