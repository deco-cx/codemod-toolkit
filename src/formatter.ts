/**
 * format content based on deno fmt
 * @param content the string content
 * @returns the formatted content
 */
export async function format(content: string): Promise<string> {
  const fmt = new Deno.Command(Deno.execPath(), {
    args: ["fmt", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "null",
  });

  const proc = fmt.spawn();

  const raw = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });

  await raw.pipeTo(proc.stdin);
  const out = await proc.output();
  await proc.status;

  return new TextDecoder().decode(out.stdout);
}
