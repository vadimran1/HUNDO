// Кнопка по образцу shadcn/ui (MIT), цвета — из токенов HUNDO.
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,filter] duration-200 outline-none active:scale-[.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-on-accent hover:brightness-110",
        outline: "border border-line-2 bg-bg text-fg hover:border-fg",
        secondary: "bg-bg-2 text-fg hover:bg-bg-3",
        ghost: "text-fg-2 hover:bg-bg-2 hover:text-fg",
        link: "text-fg underline decoration-accent decoration-2 underline-offset-4",
      },
      size: {
        default: "h-12 px-5 text-[14.5px]",
        sm: "h-9 gap-1.5 px-3 text-[13px]",
        lg: "h-14 px-6 text-[15.5px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
