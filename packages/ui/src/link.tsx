import { ExternalLink } from "lucide-solid";

export default function Link(props: { link: string; label: string }) {
  return (
    <a
      target="_blank"
      href={props.link}
      class="flex gap-1.5 items-center justify-center text-primary border-b hover:border-primary border-transparent"
    >
      <ExternalLink size={17} /> {props.label}
    </a>
  );
}
