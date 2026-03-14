import * as React from "react";
import { useUser, type User } from "./context";

export default function Wrapper(props: {
  userId: number;
  component: (user: User) => React.ReactNode;
}) {
  const { get } = useUser();
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    let active = true;

    void get(props.userId)
      .then((value) => {
        if (active) {
          setUser(value);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, [get, props.userId]);

  return <>{user ? props.component(user) : null}</>;
}
