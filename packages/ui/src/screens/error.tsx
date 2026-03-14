import Link from "../link";

export default function Screen(props: { error: string; description: string }) {
  return (
    <div className="bg-background w-full h-screen flex flex-col justify-center items-center">
      <p className="text-3xl font-bold">{props.error}</p>
      <p className="pt-4 text-lg w-1/2 text-center text-muted-foreground pb-8">
        {props.description}
      </p>
      <Link label="status.tensamin.net" link="https://status.tensamin.net" />
    </div>
  );
}
