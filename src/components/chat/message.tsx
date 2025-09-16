export type Message = {
  id: string;
  text: string;
};

export type Messages = {
  messages: Message[];
  total: number;
};

export function MessageGroup({ data }: { data: Message }) {
  return <div>{data.text} {data.id}</div>;
}

function FinalMessage() {
  return <div>Final Message</div>;
}
