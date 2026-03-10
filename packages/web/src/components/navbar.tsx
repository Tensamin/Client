import { Button } from "@tensamin/ui/button";
import { House } from "lucide-solid";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import { useUser, type User } from "@tensamin/core-user/context";

export default function Navbar() {
  const navigate = useNavigate();
  const { get } = useUser();

  const [user, setUser] = createSignal<User | null>(null);

  createEffect(() => {
    const [searchParams] = useSearchParams();
    const id = Number(searchParams.id);

    if (isNaN(id)) {
      setUser(null);
      return;
    }

    get(id)
      .then(setUser)
      .catch(() => setUser(null));
  });

  return (
    <div class="w-full h-13.5 flex items-center justify-center">
      <Button
        onClick={() => {
          navigate("/");
        }}
        class="w-9 h-9 aspect-square p-0 rounded-lg"
        variant="outline"
      >
        <House size={18} />
      </Button>
      <p class="font-medium pl-3 text-md">{user()?.display}</p>
      <div class="w-full" />
    </div>
  );
}
