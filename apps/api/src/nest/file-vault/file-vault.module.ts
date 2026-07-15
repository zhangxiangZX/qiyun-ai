import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { FileVaultRouteService } from "./file-vault-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [FileVaultRouteService],
  exports: [FileVaultRouteService],
})
export class FileVaultModule {}
