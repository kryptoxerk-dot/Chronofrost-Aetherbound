export interface LaunchNavigationFlags {
  pvpEnabled: boolean;
}

export function townDestinationLabels(flags: LaunchNavigationFlags): string[] {
  const labels = ['DUNGEON', 'SHOP'];
  if (flags.pvpEnabled) labels.push('ARENA');
  return labels;
}

export function pvpUnavailableMessage(): string {
  return 'Arena opens after launch as a no-prize beta.';
}
