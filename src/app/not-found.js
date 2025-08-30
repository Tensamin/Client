import { Loading } from "@/components/loading/content";

export default function NotFound() {
  return <Loading message="This page does not exist" error={true} />;
}
