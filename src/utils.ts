/**
 * Returns the jsr specifier for the latest version of a package.
 * @param packageName the package name
 * @param defaultsTo the default version if the request fails
 * @returns the JSR specifier e.g jsr:@deco/deco@^1.0.0
 */
export const jsrLatest = async (packageName: string, defaultsTo = "1") => {
    const versions: { latest: string } = await fetch(
        `https://jsr.io/${packageName}/meta.json`,
    ).then(
        (resp) => resp.json(),
    ).catch(() => {
        return {
            latest: defaultsTo,
        };
    });
    return `jsr:${packageName}@^${versions.latest}`;
};
