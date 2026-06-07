/** Read a Vite `import.meta.env` string without unsafe `any` assignment. */
export function viteEnvString(key: string): string | undefined {
  const raw: unknown = import.meta.env[key as keyof ImportMetaEnv];
  return typeof raw === 'string' ? raw : undefined;
}
