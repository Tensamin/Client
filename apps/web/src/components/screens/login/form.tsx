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

/**
 * Parses a .tu file payload into credentials.
 * @param rawFileContent UTF-8 file content from an uploaded .tu file.
 * @returns Parsed user id and private key credentials.
 */
function parseTuFileContent(rawFileContent: string): {
  userId: number;
  privateKey: string;
} {
  if (rawFileContent.length !== 92 || !rawFileContent.includes("::")) {
    throw new Error("Invalid file");
  }

  const [userIdString, privateKey] = rawFileContent.split("::");
  const userId = Number(userIdString);
  if (!userId || !privateKey) {
    throw new Error("Invalid file");
  }

  return { userId, privateKey };
}

/**
 * Renders the login form for file upload and manual credential login.
 * @returns Login form JSX.
 */
export default function Form() {
  const uploadRef = React.useRef<HTMLInputElement | null>(null);
  const { save } = useStorage();
  const navigate = useNavigate();

  /**
   * Opens the hidden file input when the upload tile is clicked.
   * @returns Void.
   */
  const handleUploadTileClick = React.useCallback((): void => {
    uploadRef.current?.click();
  }, []);

  /**
   * Handles uploaded .tu files and stores resolved credentials.
   * @param event Change event from the hidden file input.
   * @returns Promise that resolves when processing has finished.
   */
  const handleFileInputChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      try {
        const file = event.currentTarget.files?.[0];
        if (!file) {
          throw new Error("No file selected");
        }

        const raw = await file.text();
        const parsed = parseTuFileContent(raw);

        await save("user_id", parsed.userId);
        await save("private_key", parsed.privateKey);

        void navigate({ to: "/" });
      } catch (error) {
        log(0, "Login", "red", error);
        toast("error", "Failed to load file");
      }
    },
    [navigate, save],
  );

  /**
   * Handles username and private key login submission.
   * @param event Form submit event.
   * @returns Promise that resolves after login processing.
   */
  const handleCredentialsSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      const rawData = Object.fromEntries(formData);
      const inputParse = formSchema.safeParse(rawData);

      if (!inputParse.success) {
        toast("error", "Please enter valid data");
        return;
      }

      try {
        const response = await fetch(
          `https://omega.tensamin.net/api/get/id/${inputParse.data.username}`,
        );
        const data = await response.json();
        const parse = fetchedUser.safeParse(data);

        if (!parse.success) {
          log(0, "Login", "red", "Invalid response from server");
          toast("error", "Invalid response from server");
          return;
        }

        const user = parse.data;

        await save("user_id", user.data.user_id);
        await save("private_key", inputParse.data.private_key);

        void navigate({ to: "/" });
      } catch (error) {
        log(0, "Login", "red", error);
        toast("error", "Failed to fetch user data");
      }
    },
    [navigate, save],
  );

  return (
    <div className="flex gap-5">
      <Card className="w-75 h-80">
        <CardHeader>
          <CardTitle>Use .tu file</CardTitle>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center">
          <div
            onClick={handleUploadTileClick}
            className="cursor-pointer w-60 aspect-square mb-17 bg-input/13 hover:bg-input/30 transition-all duration-300 ease-in-out border-dotted border-input/75 border-3 flex items-center justify-center rounded-lg"
          >
            <Upload className="text-input/75" size={34} />
          </div>
          <input
            onChange={handleFileInputChange}
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
            onSubmit={handleCredentialsSubmit}
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
