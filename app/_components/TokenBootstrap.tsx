// app/_components/TokenBootstrap.tsx
"use client";

import { useEffect } from "react";

export default function TokenBootstrap() {
  useEffect(() => {
    fetch("/api/token/new", { method: "POST", credentials: "include" }).catch(() => {});
  }, []);
  return null;
}
