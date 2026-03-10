import Link from "../link";

export default function Screen(props: { error: string; description: string }) {
  return (
    <div class="bg-background w-full h-screen flex flex-col justify-center items-center">
      <p class="text-3xl font-bold">{props.error}</p>
      <p class="pt-4 text-lg w-1/2 text-center text-muted-foreground pb-8">
        {props.description}
      </p>
      <Link label="status.tensamin.net" link="https://status.tensamin.net" />
    </div>
  );
}
