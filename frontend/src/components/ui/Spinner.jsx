import { Loader2 } from "lucide-react";
import clsx from "clsx";

export function Spinner({ className }) {
  return <Loader2 className={clsx("h-5 w-5 animate-spin text-brand-600", className)} aria-label="Loading" />;
}
