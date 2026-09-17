// Runtime targets served by the same installer. A target describes where the
// payload lives in this package, where it is installed, which placeholder is
// rendered into files, and which native discovery rules apply.

export const TARGETS = Object.freeze({
  codex: Object.freeze({
    id: 'codex',
    runtimeLabel: 'Codex',
    packageName: 'codex-workforce',
    binName: 'codex-workforce',
    payloadDir: 'codex',
    placeholder: '{{CODEX_HOME}}',
    homeLabel: 'codex home',
    homeOption: '--codex-home',
    homeEnv: 'CODEX_HOME',
    defaultHome: ['.codex'],
    agentExtension: '.toml',
    configProfiles: true,
    instructionsFile: 'AGENTS.md',
    instructionsOverride: 'AGENTS.override.md',
    skillLinks: true,
    defaultSkillsDir: ['.agents', 'skills'],
  }),
  claude: Object.freeze({
    id: 'claude',
    runtimeLabel: 'Claude Code',
    packageName: 'claude-workforce',
    binName: 'claude-workforce',
    payloadDir: 'claude',
    placeholder: '{{CLAUDE_HOME}}',
    homeLabel: 'claude home',
    homeOption: '--claude-home',
    homeEnv: 'CLAUDE_CONFIG_DIR',
    defaultHome: ['.claude'],
    agentExtension: '.md',
    configProfiles: false,
    instructionsFile: 'CLAUDE.md',
    instructionsOverride: null,
    skillLinks: false,
    defaultSkillsDir: null,
  }),
});

export function managedMarkers(target) {
  return {
    begin: `<!-- ${target.packageName}:begin -->`,
    end: `<!-- ${target.packageName}:end -->`,
  };
}

export function resolveTarget(target) {
  if (!target) {
    return TARGETS.codex;
  }
  if (typeof target === 'string') {
    const found = TARGETS[target];
    if (!found) {
      throw new Error(`Unknown target: ${target}`);
    }
    return found;
  }
  return target;
}
