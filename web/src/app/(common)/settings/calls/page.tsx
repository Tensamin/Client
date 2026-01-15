// Pages
import { Top } from "../page";
import AudioPage from "./audio";
import Soundboard from "./soundboard";

// Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Main
export default function Page() {
  return (
    <Top text="Calls">
      <Tabs defaultValue="audio">
        <TabsList>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="soundboard">Soundboard</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-3" value="audio">
          <AudioPage />
        </TabsContent>
        <TabsContent className="pt-3" value="soundboard">
          <Soundboard />
        </TabsContent>
      </Tabs>
    </Top>
  );
}
