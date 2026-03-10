import { createEffect, createSignal, type JSX } from "solid-js";
import { useUser, type User } from "./context";

export default function Wrapper(props: {
  userId: number;
  component: (user: User) => JSX.Element;
}) {
  const { get } = useUser();
  const [user, setUser] = createSignal<User | null>(null);

  createEffect(() => {
    get(props.userId).then(setUser);
  });

  return <>{user() ? props.component(user() as User) : null}</>;
}
