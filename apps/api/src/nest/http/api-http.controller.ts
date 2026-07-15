import { All, Controller, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { handleApiRequest } from "../../http/handle-api-request";
import { incomingMessageToRequest } from "../../http/express-bridge";

@Controller()
export class ApiHttpController {
  @All("*")
  async handle(@Req() request: Request, @Res() response: Response) {
    const webRequest = await incomingMessageToRequest(request);
    const webResponse = await handleApiRequest(webRequest);
    response.status(webResponse.status);
    webResponse.headers.forEach((value, key) => {
      response.setHeader(key, value);
    });

    if (!webResponse.body) {
      response.end();
      return;
    }

    const reader = webResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        response.write(Buffer.from(value));
      }
    }
    response.end();
  }
}
