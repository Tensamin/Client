import { Avatar as ArkAvatar } from "@ark-ui/solid/avatar";

export default function Avatar(props: { img?: string; fallback: string }) {
  return (
    <ArkAvatar.Root class="m-0 bg-card rounded-full border border-input/75 size-9 aspect-square flex items-center justify-center select-none">
      <ArkAvatar.Fallback>{props.fallback}</ArkAvatar.Fallback>
      <ArkAvatar.Image class="rounded-full" src={props.img} />
    </ArkAvatar.Root>
  );
}
