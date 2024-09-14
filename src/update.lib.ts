import { parse } from "@std/flags";
import * as colors from "@std/fmt/colors";
import { exists } from "@std/fs/exists";
import { join } from "@std/path";
import * as semver from "@std/semver";
import type { DenoJSON } from "./denoJSON.ts";
import { pkgInfo } from "./pkg.ts";
import { lookup, REGISTRIES } from "./registry.ts";

// map of `packageAlias` to `packageRepo`
const PACKAGES_TO_CHECK =
  /(@deco\/.*)|(apps)|(deco)|(\$live)|(deco-sites\/.*\/$)|(partytown)/;

const requiredMinVersion: Record<string, string> = {
  // "std/": "0.208.0",
};

const flags = parse(Deno.args, {
  boolean: ["allow-pre"],
});
const denoJSONFileNames = ["deno.json", "deno.jsonc"];
const getDenoJSONPath = async (cwd = Deno.cwd()) => {
  for (const importFileName of denoJSONFileNames) {
    const importMapPath = join(cwd, importFileName);
    if (await exists(importMapPath, { isFile: true })) {
      return importMapPath;
    }
  }
  return undefined;
};
async function* getImportMaps(
  dir: string,
): AsyncIterableIterator<[DenoJSON, string]> {
  const denoJSONPath = await getDenoJSONPath(dir);
  if (!denoJSONPath) {
    throw new Error(`could not find deno.json definition in ${dir}`);
  }
  const denoJSON = await Deno.readTextFile(denoJSONPath).then(JSON.parse);
  // inlined import_map inside deno.json
  if (denoJSON.imports) {
    yield [denoJSON, denoJSONPath];
  } else {
    const importMapFile = denoJSON?.importMap ?? "./import_map.json";
    const importMapPath = join(dir, importMapFile.replace("./", ""));
    if (await (exists(importMapPath))) {
      yield [
        await Deno.readTextFile(importMapPath).then(JSON.parse).catch(
          () => ({
            imports: {},
          }),
        ),
        importMapPath,
      ];
    }
  }

  if (Array.isArray(denoJSON.workspace)) {
    for (const workspace of denoJSON.workspace as string[]) {
      yield* getImportMaps(join(dir, workspace));
    }
  }
}

/**
 * Upgrade dependencies in the import map (in place)
 * @param importMap the importmap (or deno.json) to upgrade
 * @param logs whether to log the upgrade process
 * @param packages a regex to filter which packages to upgrade
 * @returns a boolean indicating if any upgrades were made
 */
export async function upgradeDeps(
  importMap: DenoJSON,
  logs = true,
  deps = PACKAGES_TO_CHECK,
  logger = console.info,
): Promise<boolean> {
  let upgradeFound = false;
  logs && logger("looking up latest versions");

  importMap.imports ??= {};
  const imports = importMap.imports;
  await Promise.all(
    Object.keys(imports)
      .filter((pkg) => deps.test(pkg))
      .map(async (pkg) => {
        const info = await pkgInfo(
          imports[pkg],
          flags["allow-pre"],
        );

        if (!info?.versions?.latest) return;

        const {
          url,
          versions: {
            latest: latestVersion,
            current: currentVersion,
          },
        } = info;

        if (
          !semver.canParse(currentVersion) &&
          !Deno.args.includes("force")
        ) {
          logs && logger(
            colors.yellow(
              `skipping ${pkg} ${currentVersion} -> ${latestVersion}. Use --force to upgrade.`,
            ),
          );
          return;
        }

        if (currentVersion !== latestVersion) {
          logs && logger(
            `upgrading ${pkg} ${currentVersion} -> ${latestVersion}.`,
          );

          upgradeFound = true;
          imports[pkg] = url.at(latestVersion).url;
        }
      }),
  );

  for (const [pkg, minVer] of Object.entries(requiredMinVersion)) {
    if (imports[pkg]) {
      const url = lookup(imports[pkg], REGISTRIES);
      const currentVersion = url?.version();
      if (
        !currentVersion ||
        semver.lessThan(
          semver.parse(currentVersion),
          semver.parse(minVer),
        )
      ) {
        logs && logger(
          `upgrading ${pkg} ${currentVersion} -> ${minVer}.`,
        );

        upgradeFound = true;
        imports[pkg] = url?.at(minVer).url ??
          imports[pkg];
      }
    }
  }

  if (!upgradeFound) {
    logs &&
      logger(
        "dependencies are on the most recent releases of your dependencies!",
      );
  }
  return upgradeFound;
}

export async function* updatedImportMap(
  logs: boolean = true,
  cwd: string = Deno.cwd(),
): AsyncIterableIterator<[DenoJSON, string]> {
  for await (const [importMap, importMapPath] of getImportMaps(cwd)) {
    const logger = (...msg: unknown[]) =>
      console.info(
        colors.gray(`${importMapPath.replaceAll(Deno.cwd(), ".")}:`),
        ...msg,
      );
    const upgradeFound = await upgradeDeps(
      importMap,
      logs,
      PACKAGES_TO_CHECK,
      logger,
    );
    if (upgradeFound) {
      yield [importMap, importMapPath];
      logger(colors.green(`upgraded successfully`));
    }
  }
}

export async function update(
  cwd: string = Deno.cwd(),
) {
  for await (
    const [importMap, importMapPath] of updatedImportMap(true, cwd)
  ) {
    await Deno.writeTextFile(
      importMapPath,
      `${JSON.stringify(importMap, null, 2)}\n`,
    );
  }
}
