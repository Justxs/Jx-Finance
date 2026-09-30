import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createJxApi } from "./jx-api.js";
import { createJxServer } from "./tools.js";

const url = process.env["JX_URL"];
const token = process.env["JX_TOKEN"];

if (!url || !token) {
  console.error(
    "Set JX_URL to the address of your Jx Finance installation and JX_TOKEN to a personal API token.",
  );
  process.exit(1);
}

const server = createJxServer(createJxApi(url, token));
await server.connect(new StdioServerTransport());
