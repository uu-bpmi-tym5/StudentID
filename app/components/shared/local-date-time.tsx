"use client";

import { format } from "date-fns";

interface Props {
  iso: string;
  fmt?: string;
}

export function LocalDateTime({ iso, fmt = "dd MMM yyyy · HH:mm" }: Props) {
  return <>{format(new Date(iso), fmt)}</>;
}
