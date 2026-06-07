export type ScrubContext = {
  projectNames?: string[];
};

const WIN_PATH =
  /(?:[A-Za-z]:\\|\\\\)[^\s"'<>|*?[\]{}(),;]+/g;
const UNIX_PATH =
  /(?:~\/|\/(?:Users|home|var|tmp|opt|usr|mnt|private|Volumes))[^\s"'<>|*?[\]{}(),;]*/g;
const FILE_URL = /file:\/\/[^\s"'<>]+/gi;

/** Remove project names and filesystem paths before crash reports leave the device. */
export function scrubSensitiveText(
  text: string,
  context: ScrubContext = {}
): string {
  let out = text;
  for (const name of context.projectNames ?? []) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    out = out.split(trimmed).join('[project-name]');
  }
  out = out.replace(WIN_PATH, '[path]');
  out = out.replace(UNIX_PATH, '[path]');
  out = out.replace(FILE_URL, '[file-url]');
  return out;
}
