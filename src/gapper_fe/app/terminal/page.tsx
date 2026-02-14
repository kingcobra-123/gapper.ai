import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("@/components/shell/AppShell").then((mod) => mod.AppShell), {
  ssr: false
});

export default function TerminalPage() {
  return <AppShell />;
}
