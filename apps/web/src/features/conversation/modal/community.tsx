import type { Community } from "@tensamin/shared/features/conversation/schema";

export default function CommunityModal(props: { community: Community }) {
  return <div>{props.community.community_title}</div>;
}
