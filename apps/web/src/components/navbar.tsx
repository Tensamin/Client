import { Button } from "@tensamin/ui/cmp/button";
import { House } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import * as React from "react";
import { useUser, type User } from "@tensamin/user/context";

/**
 * Navigates to the home route when the navbar home button is clicked.
 * @param navigate Router navigate function from TanStack Router.
 * @returns Void.
 */
function handleHomeButtonClick(navigate: ReturnType<typeof useNavigate>): void {
  void navigate({ to: "/" });
}

/**
 * Renders the top navigation bar and currently selected conversation user.
 * @returns Navbar JSX element.
 */
export default function Navbar() {
  const navigate = useNavigate();
  const { get } = useUser();
  const search = useRouterState({ select: (state) => state.location.search });

  /**
   * Delegates navbar home button click to navigation helper.
   * @returns Void.
   */
  const onHomeButtonClick = React.useCallback(() => {
    handleHomeButtonClick(navigate);
  }, [navigate]);

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
        onClick={onHomeButtonClick}
        className="w-9 h-9 aspect-square rounded-lg"
        variant="outline"
      >
        <House className="size-4.5" />
      </Button>
      <p className="font-medium pl-3 text-md">{user?.display}</p>
      <div className="w-full" />
    </div>
  );
}
