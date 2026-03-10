import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

export default defineConfig({
  plugins: [solid(), tsconfigPaths(), tailwindcss(), lucidePreprocess()],
  worker: {
    format: "es",
  },
});
