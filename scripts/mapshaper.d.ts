declare module "mapshaper" {
  export function applyCommands(
    commands: string,
    input?: Record<string, string | Buffer>,
  ): Promise<Record<string, string | Buffer>>;
}
