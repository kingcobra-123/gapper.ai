import { cn } from "@/lib/utils";
import type { MissingDataBlock } from "@/types/missing";

export function hasPendingField(
  missing: MissingDataBlock | undefined,
  fieldKey: string,
  pending: boolean
): boolean {
  if (!pending || !missing?.fields?.length) {
    return false;
  }

  return missing.fields.some(
    (field) => field.reason === "missing_ticker_data" && field.key === fieldKey
  );
}

export function hasPendingFieldPrefix(
  missing: MissingDataBlock | undefined,
  fieldKeyPrefix: string,
  pending: boolean
): boolean {
  if (!pending || !missing?.fields?.length) {
    return false;
  }

  return missing.fields.some(
    (field) =>
      field.reason === "missing_ticker_data" &&
      (field.key === fieldKeyPrefix || field.key.startsWith(`${fieldKeyPrefix}.`))
  );
}

interface PendingShimmerProps {
  className?: string;
}

export function PendingShimmer({ className }: PendingShimmerProps) {
  return <span aria-hidden className={cn("data-pending-shimmer inline-flex rounded-sm", className)} />;
}
