import { SettingsPageTitle } from "./layout";

export default function Page() {
  return null;
}

export function Top({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
}) {
  return (
    <>
      <SettingsPageTitle key={text} text={text} />
      <div className="flex w-full h-full overflow-auto">{children}</div>
    </>
  );
}
