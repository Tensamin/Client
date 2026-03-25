import { Input } from "@tensamin/ui/cmp/input";
import { Button } from "@tensamin/ui/cmp/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@tensamin/ui/cmp/dialog";
import z from "zod";
import { toast } from "@tensamin/shared/log";
import { useSocket } from "@tensamin/ttp/context";

/**
 * Executes Page.
 * @param none This function has no parameters.
 * @returns unknown.
 */
export default function Page() {
  const { send } = useSocket();

  function submit(username: string | null) {
    const schema = z
      .string()
      .min(1, "Username is too short")
      .max(15, "Username is too long");

    const result = schema.safeParse(username?.toLowerCase().trim());

    if (!result.success) {
      toast("error", result.error.issues[0].message);
      return;
    }

    send("add_conversation", {
      chat_partner_name: result.data,
    })
      .then(() => toast("success", "Conversation added"))
      .catch(() => toast("error", "Failed to add conversation"));
  }

  return (
    <div className="p-3 flex gap-2">
      <Dialog>
        <DialogTrigger render={<Button>Add Conversation</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Add a new conversation. Just enter the username of the person you
            want to add as a conversation.
          </DialogDescription>
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const username = form.get("username") as string | null;
              submit(username);
            }}
          >
            <Input
              type="text"
              id="username"
              name="username"
              placeholder="Enter username..."
            />
            <div className="flex w-full justify-end gap-1">
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button type="submit">Continue</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Button disabled>Add Community</Button>
    </div>
  );
}
