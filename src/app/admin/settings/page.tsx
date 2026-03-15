import { getConfig } from "@/actions/config";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const config = await getConfig();
  return <SettingsClient config={JSON.parse(JSON.stringify(config))} />;
}
