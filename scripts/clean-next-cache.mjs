import { rmSync } from "node:fs";
import { resolve } from "node:path";

const nextCachePath = resolve(".next");

rmSync(nextCachePath, { force: true, recursive: true });
