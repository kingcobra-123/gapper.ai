import dynamic from "next/dynamic";

const SettingsView = dynamic(
  () => import("@/components/settings/SettingsView").then((mod) => mod.SettingsView),
  { ssr: false }
);

export default function SettingsPage() {
  return <SettingsView />;
}
