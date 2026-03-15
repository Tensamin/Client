import Form from "@/components/screens/login/form";
import { Button } from "@tensamin/ui/cmp/button";
import { Link } from "@tanstack/react-router";

/**
 * Executes Page.
 * @param none This function has no parameters.
 * @returns unknown.
 */
export default function Page() {
  return (
    <div className="w-full h-full flex flex-col gap-10 items-center justify-center">
      <Form />
      <div className="flex">
        <Link to="/signup">
          <Button variant="outline">Sign up</Button>
        </Link>
      </div>
    </div>
  );
}
