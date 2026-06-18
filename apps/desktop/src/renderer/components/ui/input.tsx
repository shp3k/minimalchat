import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-12 w-full rounded-2xl border border-borderSoft bg-panel2 px-4 text-sm text-primaryText outline-none transition placeholder:text-secondaryText/70 focus:border-accent/70 focus:ring-4 focus:ring-accent/10",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
