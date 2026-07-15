import { Module } from "@nestjs/common";
import { RuntimeModule } from "../runtime/runtime.module";
import { PublicRouteService } from "./public-route.service";
@Module({ imports: [RuntimeModule], providers: [PublicRouteService], exports: [PublicRouteService] })
export class PublicModule {}
