import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-none rounded-2xl border border-borderSoft bg-panel2 px-4 py-3 text-sm leading-6 text-primaryText outline-none transition placeholder:text-secondaryText/70 focus:border-accent/70 focus:ring-4 focus:ring-accent/10",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
