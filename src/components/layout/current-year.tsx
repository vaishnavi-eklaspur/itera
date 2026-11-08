"use client";

import { useState } from "react";

export function CurrentYear() {
  const [year] = useState(() => new Date().getFullYear());
  return <>{year}</>;
}
