import { useStorageContext } from "@/context/storage";

export default function Page() {
  const { translate } = useStorageContext();
  return <div>{translate("SETTINGS_SOUNDBOARD_PLACEHOLDER")}</div>;
}
