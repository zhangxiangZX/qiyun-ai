import { Global, Module } from "@nestjs/common";

import { getRuntime, type ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "./runtime.tokens";

@Global()
@Module({
  providers: [
    {
      provide: API_RUNTIME,
      useFactory: async (): Promise<ApiRuntime> => getRuntime(),
    },
  ],
  exports: [API_RUNTIME],
})
export class RuntimeModule {}
