import { Button } from "@tensamin/ui/cmp/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@tensamin/ui/cmp/card";
import { Input } from "@tensamin/ui/cmp/input";
import { Label } from "@tensamin/ui/cmp/label";
import { useStorage } from "@tensamin/storage/context";
import { log, toast } from "@tensamin/shared/log";
import { useNavigate } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import * as React from "react";
import { z } from "zod";

const fetchedUser = z.object({
  id: z.uuidv4(),
  type: z.string(),
  data: z.object({
    iota_id: z.number(),
    username: z.string(),
    sub_level: z.number(),
    public_key: z.base64(),
    user_id: z.number(),
    sub_end: z.number(),
  }),
});

const formSchema = z.object({
  username: z.string().min(1).max(15),
  private_key: z.string().min(1).max(92),
});

export default function Form() {
  const uploadRef = React.useRef<HTMLInputElement | null>(null);
  const { save } = useStorage();
  const navigate = useNavigate();

  return (
    <div className="flex gap-5">
      <Card className="w-75 h-80">
        <CardHeader>
          <CardTitle>Use .tu file</CardTitle>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center">
          <div
            onClick={() => uploadRef.current?.click()}
            className="cursor-pointer w-60 aspect-square mb-17 bg-input/13 hover:bg-input/30 transition-all duration-300 ease-in-out border-dotted border-input/75 border-3 flex items-center justify-center rounded-lg"
          >
            <Upload className="text-input/75" size={34} />
          </div>
          <input
            onChange={async (e) => {
              try {
                const file = e.currentTarget.files?.[0];
                if (file) {
                  const raw = await file.text();
                  if (raw.length !== 92) throw new Error("Invalid file");
                  if (!raw.includes("::")) throw new Error("Invalid file");
                  const [userIdString, privateKey] = raw.split("::");
                  const userId = Number(userIdString);
                  if (!userId || !privateKey) throw new Error("Invalid file");

                  save("user_id", userId);
                  save("private_key", privateKey);

                  void navigate({ to: "/" });
                } else {
                  throw new Error("No file selected");
                }
              } catch (err) {
                log(0, "Login", "red", err);
                toast("error", "Failed to load file");
              }
            }}
            type="file"
            ref={uploadRef}
            className="hidden"
          />
        </CardContent>
      </Card>
      <Card className="w-75 h-auto">
        <CardHeader>
          <CardTitle>Use credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5 h-full"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const rawData = Object.fromEntries(formData);
              const inputParse = formSchema.safeParse(rawData);

              if (!inputParse.success) {
                toast("error", "Please enter valid data");
                return;
              }

              const response = await fetch(
                "https://omega.tensamin.net/api/get/id/" +
                  inputParse.data.username,
              );

              response
                .json()
                .then((data) => {
                  const parse = fetchedUser.safeParse(data);

                  if (parse.success) {
                    const user = parse.data;

                    save("user_id", user.data.user_id);
                    save("private_key", inputParse.data.private_key);

                    void navigate({ to: "/" });
                  } else {
                    log(0, "Login", "red", "Invalid response from server");
                    toast("error", "Invalid response from server");
                  }
                })
                .catch((err) => {
                  log(0, "Login", "red", err);
                  toast("error", "Failed to fetch user data");
                });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input type="text" id="username" name="username" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="private_key">Private Key</Label>
              <Input type="password" id="private_key" name="private_key" />
            </div>
            <Button type="submit">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
