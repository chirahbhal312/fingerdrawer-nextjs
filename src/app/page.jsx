"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Welcome</h1>
      <button onClick={() => router.push("/DrawInAR")}>Draw In AR</button>
      <button onClick={() => router.push("/PaintViewInAR")} style={{ marginLeft: "1rem" }}>
        PaperAR
      </button>
       <button onClick={() => router.push("/PaperToAR")} style={{ marginLeft: "1rem" }}>
        PaperToAR
      </button>
    </div>
  );
}