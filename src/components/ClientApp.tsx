"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => <div className="flex flex-1 items-center justify-center text-stone-500">Udyam Saathi…</div>,
});

export default function ClientApp() {
  return <App />;
}
