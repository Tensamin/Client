import { Button } from "@tensamin/ui/button";
import { House } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import * as React from "react";
import { useUser, type User } from "@tensamin/user/context";

export default function Navbar() {
  const navigate = useNavigate();
  const { get } = useUser();
  const search = useRouterState({ select: (state) => state.location.search });

  const [user, setUser] = React.useState<User | null>(null);

  const currentId = React.useMemo(
    () => Number((search as Record<string, unknown>).id ?? Number.NaN),
    [search],
  );

  React.useEffect(() => {
    if (Number.isNaN(currentId)) {
      setUser(null);
      return;
    }

    get(currentId)
      .then(setUser)
      .catch(() => setUser(null));
  }, [currentId, get]);

  return (
    <div className="w-full h-13.5 flex items-center justify-center">
      <Button
        onClick={() => {
          void navigate({ to: "/" });
        }}
        className="w-9 h-9 aspect-square p-0 rounded-lg"
        variant="outline"
      >
        <House size={18} />
      </Button>
      <p className="font-medium pl-3 text-md">{user?.display}</p>
      <div className="w-full" />
    </div>
  );
}
