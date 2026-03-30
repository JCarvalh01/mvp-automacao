"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DASPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard-empresa");
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        background: "#f8fafc",
        color: "#334155",
        padding: "24px",
      }}
    >
      Redirecionando...
    </main>
  );
}