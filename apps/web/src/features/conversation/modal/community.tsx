import type { Community } from "@tensamin/shared/features/conversation/schema";

/**
 * Executes CommunityModal.
 * @param props Parameter props.
 * @returns unknown.
 */
export default function CommunityModal(props: { community: Community }) {
  return <div>{props.community.community_title}</div>;
}
