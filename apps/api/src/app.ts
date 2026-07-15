import { createServer } from "node:http";

import { incomingMessageToRequest, writeWebResponseToServer } from "./http/express-bridge";
import { handleApiRequest } from "./http/handle-api-request";

export { handleApiRequest } from "./http/handle-api-request";

export function createApiServer() {
  return createServer(async (request, response) => {
    const webRequest = await incomingMessageToRequest(request);
    const webResponse = await handleApiRequest(webRequest);
    await writeWebResponseToServer(webResponse, response);
  });
}
