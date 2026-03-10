import Form from "@/components/screens/login/form";
import { Button } from "@tensamin/ui/button";
import { A } from "@solidjs/router";

export default function Page() {
  return (
    <div class="w-full h-full flex flex-col gap-10 items-center justify-center">
      <Form />
      <div class="flex">
        <A href="/signup">
          <Button variant="outline">Sign up</Button>
        </A>
      </div>
    </div>
  );
}
