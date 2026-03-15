import Link from "../link";

/**
 * Executes Screen.
 * @param props Parameter props.
 * @returns unknown.
 */
export default function Screen(props: { error: string; description: string }) {
  return (
    <div className="bg-background w-full h-screen flex flex-col justify-center items-center">
      <p className="text-base font-semibold">{props.error}</p>
      <p className="pt-4 text-sm w-1/2 text-center text-muted-foreground pb-8">
        {props.description}
      </p>
      <Link label="status.tensamin.net" link="https://status.tensamin.net" />
    </div>
  );
}
