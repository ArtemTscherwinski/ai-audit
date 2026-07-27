import fg from "fast-glob";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { parse as parseTOML } from "smol-toml";
import { parse as parseYAML } from "yaml";

const ROOT = process.argv[2] || process.cwd();

type MaturityLevel = "missing" | "minimal" | "adequate" | "good" | "excellent";

interface FileFinding {
  path: string;
  lines?: number;
  detail?: string;
}

interface CategoryResult {
  level: MaturityLevel | null;
  findings: Record<string, unknown>;
  needsJudgment: boolean;
}

interface AuditResult {
  root: string;
  stacks: string[];
  monorepo: { isMonorepo: boolean; boundaries: string[] };
  categories: Record<string, CategoryResult>;
}

function fileExists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

function readFile(rel: string): string | null {
  try {
    return readFileSync(join(ROOT, rel), "utf-8");
  } catch {
    return null;
  }
}

function countLines(rel: string): number {
  const content = readFile(rel);
  return content ? content.split("\n").length : 0;
}

function globSync(pattern: string, opts?: { ignore?: string[] }): string[] {
  return fg.sync(pattern, {
    cwd: ROOT,
    ignore: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      ".next/**",
      "vendor/**",
      "__pycache__/**",
      ".venv/**",
      "target/**",
      ".build/**",
      "DerivedData/**",
      ...(opts?.ignore || []),
    ],
    dot: true,
  });
}

function detectStacks(): string[] {
  const stacks: string[] = [];
  if (fileExists("package.json")) stacks.push("typescript");
  if (fileExists("go.mod")) stacks.push("go");
  if (fileExists("Cargo.toml")) stacks.push("rust");
  if (fileExists("pyproject.toml") || fileExists("setup.py") || fileExists("requirements.txt")) stacks.push("python");
  if (fileExists("Package.swift") || globSync("*.xcodeproj").length > 0 || globSync("*.xcworkspace").length > 0) stacks.push("swift");
  return stacks;
}

function detectMonorepo(): { isMonorepo: boolean; boundaries: string[] } {
  const boundaries: string[] = [];

  const workspaceYaml = fileExists("pnpm-workspace.yaml");
  const rootPkg = readFile("package.json");
  let hasWorkspaces = false;
  if (rootPkg) {
    try {
      const pkg = JSON.parse(rootPkg);
      hasWorkspaces = !!pkg.workspaces;
    } catch {}
  }

  if (workspaceYaml || hasWorkspaces) {
    const pkgFiles = globSync("packages/*/package.json");
    const pkgFiles2 = globSync("apps/*/package.json");
    boundaries.push(...pkgFiles.map((f) => dirname(f)));
    boundaries.push(...pkgFiles2.map((f) => dirname(f)));
  }

  const goMods = globSync("*/go.mod");
  boundaries.push(...goMods.map((f) => dirname(f)));

  const cargoToml = readFile("Cargo.toml");
  if (cargoToml) {
    try {
      const parsed = parseTOML(cargoToml);
      if (parsed.workspace && (parsed.workspace as any).members) {
        const members = (parsed.workspace as any).members as string[];
        for (const m of members) {
          const memberDirs = globSync(`${m}/Cargo.toml`);
          boundaries.push(...memberDirs.map((f) => dirname(f)));
        }
      }
    } catch {}
  }

  const swiftPackages = globSync("*/Package.swift");
  boundaries.push(...swiftPackages.map((f) => dirname(f)));

  const unique = [...new Set(boundaries)];
  return { isMonorepo: unique.length > 1, boundaries: unique };
}

function auditAgentInstructions(): CategoryResult {
  const findings: Record<string, unknown> = {};

  const claudeMd = fileExists("CLAUDE.md");
  const agentsMd = fileExists("AGENTS.md");
  findings.claudeMd = claudeMd;
  findings.agentsMd = agentsMd;

  if (claudeMd) {
    findings.claudeMdLines = countLines("CLAUDE.md");
    const content = readFile("CLAUDE.md") || "";
    findings.claudeMdHasDoNot = /do not|don't|never|avoid|forbidden/i.test(content);
    findings.claudeMdHasCommands = /```|npm |yarn |pnpm |make |cargo |go |pytest|swift /i.test(content);
    findings.claudeMdHasArchitecture = /architect|structure|overview|layout/i.test(content);
    findings.claudeMdHasConventions = /convention|style|pattern|naming/i.test(content);
  }

  const nestedClaudeMds = globSync("**/CLAUDE.md").filter((f) => f !== "CLAUDE.md");
  findings.nestedClaudeMds = nestedClaudeMds;

  if (!claudeMd && !agentsMd) {
    return { level: "missing", findings, needsJudgment: false };
  }

  return { level: null, findings, needsJudgment: true };
}

function auditDocumentationCoverage(): CategoryResult {
  const findings: Record<string, unknown> = {};

  const readme = fileExists("README.md") || fileExists("README.rst") || fileExists("README");
  findings.readme = readme;
  if (readme) findings.readmeLines = countLines("README.md") || countLines("README.rst") || countLines("README");

  const docsDir = existsSync(join(ROOT, "docs")) || existsSync(join(ROOT, "doc"));
  findings.docsDir = docsDir;

  const archDocs = globSync("**/{architecture,ARCHITECTURE,arch,design,DESIGN}*.md");
  findings.architectureDocs = archDocs;

  const apiDocs = globSync("**/{api,API,openapi,swagger}*.{md,yaml,yml,json}");
  findings.apiDocs = apiDocs;

  const contributingGuide = fileExists("CONTRIBUTING.md") || fileExists(".github/CONTRIBUTING.md");
  findings.contributingGuide = contributingGuide;

  const changelog = fileExists("CHANGELOG.md") || fileExists("CHANGES.md");
  findings.changelog = changelog;

  const glossary = fileExists("CONTEXT.md") || fileExists("GLOSSARY.md") || fileExists("docs/glossary.md");
  findings.glossary = glossary;

  const gettingStarted = globSync("**/{getting-started,GETTING_STARTED,quickstart,setup,SETUP}*.md");
  findings.gettingStarted = gettingStarted;

  const totalDocSignals = [readme, docsDir, archDocs.length > 0, apiDocs.length > 0, contributingGuide, glossary].filter(Boolean).length;

  if (totalDocSignals === 0) {
    return { level: "missing", findings, needsJudgment: false };
  }
  if (totalDocSignals <= 2) {
    return { level: "minimal", findings, needsJudgment: false };
  }

  return { level: null, findings, needsJudgment: true };
}

function auditNestedContext(boundaries: string[]): CategoryResult {
  const findings: Record<string, unknown> = {};

  if (boundaries.length <= 1) {
    findings.applicable = false;
    return { level: "adequate", findings, needsJudgment: false };
  }

  findings.applicable = true;
  const packagesNeedingClaudeMd: FileFinding[] = [];
  const packagesWithClaudeMd: string[] = [];

  for (const boundary of boundaries) {
    const hasClaudeMd = fileExists(join(boundary, "CLAUDE.md"));
    const sourceFiles = globSync(`${boundary}/**/*.{ts,tsx,js,jsx,py,go,rs,swift}`);
    const fileCount = sourceFiles.length;

    if (hasClaudeMd) {
      packagesWithClaudeMd.push(boundary);
    } else if (fileCount > 20) {
      packagesNeedingClaudeMd.push({ path: boundary, lines: fileCount, detail: `${fileCount} source files` });
    }
  }

  findings.packagesWithClaudeMd = packagesWithClaudeMd;
  findings.packagesNeedingClaudeMd = packagesNeedingClaudeMd;
  findings.totalBoundaries = boundaries.length;

  if (packagesNeedingClaudeMd.length === 0) {
    return { level: packagesWithClaudeMd.length === boundaries.length ? "excellent" : "good", findings, needsJudgment: false };
  }

  const ratio = packagesWithClaudeMd.length / boundaries.length;
  if (ratio === 0) return { level: "minimal", findings, needsJudgment: false };
  return { level: null, findings, needsJudgment: true };
}

function auditCodeNavigability(stacks: string[]): CategoryResult {
  const findings: Record<string, unknown> = {};

  const sourceFiles = globSync("**/*.{ts,tsx,js,jsx,py,go,rs,swift}");
  findings.totalSourceFiles = sourceFiles.length;

  const indexFiles = globSync("**/index.{ts,tsx,js,jsx}");
  findings.indexFiles = indexFiles.length;

  const modFiles = globSync("**/mod.rs");
  findings.modFiles = modFiles.length;

  const initFiles = globSync("**/__init__.py");
  findings.initFiles = initFiles.length;

  const srcDir = existsSync(join(ROOT, "src")) || existsSync(join(ROOT, "lib")) || existsSync(join(ROOT, "pkg"));
  findings.hasSrcStructure = srcDir;

  if (stacks.includes("typescript")) {
    const tsconfig = readFile("tsconfig.json");
    if (tsconfig) {
      try {
        const parsed = JSON.parse(tsconfig.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""));
        findings.tsconfigPaths = !!(parsed.compilerOptions?.paths || parsed.compilerOptions?.baseUrl);
      } catch {}
    }
  }

  if (stacks.includes("go")) {
    const goMod = readFile("go.mod");
    findings.goModExists = !!goMod;
  }

  if (sourceFiles.length === 0) {
    return { level: "missing", findings, needsJudgment: false };
  }

  return { level: null, findings, needsJudgment: true };
}

function auditTokenEfficiency(stacks: string[]): CategoryResult {
  const findings: Record<string, unknown> = {};

  const sourceFiles = globSync("**/*.{ts,tsx,js,jsx,py,go,rs,swift}");
  const godFiles: FileFinding[] = [];

  for (const file of sourceFiles) {
    const lines = countLines(file);
    if (lines > 500) {
      godFiles.push({ path: file, lines });
    }
  }
  godFiles.sort((a, b) => (b.lines || 0) - (a.lines || 0));
  findings.godFiles = godFiles.slice(0, 20);
  findings.godFileCount = godFiles.length;

  const trackedWasteful: string[] = [];
  const wastefulPatterns = [
    "**/package-lock.json",
    "**/yarn.lock",
    "**/pnpm-lock.yaml",
    "**/*.snap",
    "**/__snapshots__/**",
    "**/Cargo.lock",
    "**/poetry.lock",
    "**/Package.resolved",
  ];
  for (const pattern of wastefulPatterns) {
    const matches = globSync(pattern);
    trackedWasteful.push(...matches);
  }
  findings.trackedWastefulFiles = trackedWasteful;

  if (stacks.includes("typescript")) {
    const tsconfig = readFile("tsconfig.json");
    if (tsconfig) {
      try {
        const cleaned = tsconfig.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
        const parsed = JSON.parse(cleaned);
        const strict = parsed.compilerOptions?.strict;
        const strictNullChecks = parsed.compilerOptions?.strictNullChecks;
        findings.typeStrictness = strict ? "strict" : strictNullChecks ? "partial" : "none";
      } catch {
        findings.typeStrictness = "unknown";
      }
    } else {
      findings.typeStrictness = "none";
    }
  }

  if (stacks.includes("python")) {
    const pyproject = readFile("pyproject.toml");
    const hasMyPy = fileExists("mypy.ini") || fileExists(".mypy.ini") || (pyproject?.includes("[tool.mypy]") ?? false);
    const hasPyright = fileExists("pyrightconfig.json") || (pyproject?.includes("[tool.pyright]") ?? false);
    findings.pythonTypeChecking = hasMyPy ? "mypy" : hasPyright ? "pyright" : "none";
  }

  if (stacks.includes("rust")) {
    const clippyToml = fileExists("clippy.toml") || fileExists(".clippy.toml");
    findings.clippyConfig = clippyToml;
  }

  if (stacks.includes("swift")) {
    const hasDocComments = sourceFiles.some((f) => {
      if (!f.endsWith(".swift")) return false;
      const content = readFile(f);
      return content ? content.includes("///") : false;
    });
    findings.swiftDocComments = hasDocComments;

    const packageSwift = readFile("Package.swift");
    findings.swiftStrictConcurrency = packageSwift?.includes("StrictConcurrency") || packageSwift?.includes("swiftLanguageMode");
  }

  const gitignore = readFile(".gitignore");
  findings.hasGitignore = !!gitignore;
  const aiignore = fileExists(".aiignore");
  findings.hasAiignore = aiignore;

  const claudeMd = readFile("CLAUDE.md");
  findings.claudeMdHasIgnoreDirectives = claudeMd ? /ignore|don't read|skip|exclude/i.test(claudeMd) : false;

  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const skillsDir = join(homeDir, ".qoder", "skills");
  const recommendedSkills = [
    { name: "graphify", dirs: ["graphify"], repo: "Graphify-Labs/graphify" },
    { name: "caveman", dirs: ["caveman"], repo: "JuliusBrussee/caveman" },
    { name: "ponytail", dirs: ["ponytail"], repo: "DietrichGebert/ponytail" },
    { name: "mattpocock-skills", dirs: ["grilling", "tdd", "code-review", "diagnosing-bugs"], repo: "mattpocock/skills" },
  ];
  const installedSkills: string[] = [];
  const missingSkills: { name: string; repo: string }[] = [];
  for (const skill of recommendedSkills) {
    const found = skill.dirs.some((d) => existsSync(join(skillsDir, d)));
    if (found) installedSkills.push(skill.name);
    else missingSkills.push({ name: skill.name, repo: skill.repo });
  }
  findings.recommendedSkillsInstalled = installedSkills;
  findings.recommendedSkillsMissing = missingSkills;

  if (godFiles.length === 0 && trackedWasteful.length === 0) {
    return { level: null, findings, needsJudgment: true };
  }

  return { level: null, findings, needsJudgment: true };
}

function auditToolingAutomation(stacks: string[]): CategoryResult {
  const findings: Record<string, unknown> = {};

  const testSignals: string[] = [];
  if (globSync("**/*.{test,spec}.{ts,tsx,js,jsx}").length > 0) testSignals.push("js-tests");
  if (globSync("**/*_test.go").length > 0) testSignals.push("go-tests");
  if (globSync("**/*_test.py").length > 0 || globSync("**/test_*.py").length > 0) testSignals.push("python-tests");
  if (globSync("**/tests/**/*.rs").length > 0 || globSync("**/*_test.rs").length > 0) testSignals.push("rust-tests");
  if (globSync("**/*Tests.swift").length > 0 || globSync("**/*Spec.swift").length > 0) testSignals.push("swift-tests");
  findings.testSignals = testSignals;

  const pkg = readFile("package.json");
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg);
      const scripts = parsed.scripts || {};
      findings.hasTestScript = !!scripts.test;
      findings.hasLintScript = !!scripts.lint || !!scripts["lint:fix"];
      findings.hasTypecheckScript = !!scripts.typecheck || !!scripts["type-check"] || !!scripts.tsc;
      findings.hasBuildScript = !!scripts.build;
    } catch {}
  }

  const lintConfigs = [
    ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml",
    "eslint.config.js", "eslint.config.mjs", "eslint.config.ts",
    ".pylintrc", "pylintrc", ".flake8", "ruff.toml", ".ruff.toml",
    ".golangci.yml", ".golangci.yaml",
    "rustfmt.toml", ".rustfmt.toml",
    ".swiftlint.yml",
  ];
  findings.lintConfig = lintConfigs.filter((f) => fileExists(f));

  const ciConfigs = globSync(".github/workflows/*.{yml,yaml}");
  const hasMakefile = fileExists("Makefile") || fileExists("makefile");
  const hasJustfile = fileExists("justfile") || fileExists("Justfile");
  const hasTaskfile = fileExists("Taskfile.yml") || fileExists("Taskfile.yaml");
  findings.ciWorkflows = ciConfigs;
  findings.hasMakefile = hasMakefile;
  findings.hasJustfile = hasJustfile;
  findings.hasTaskfile = hasTaskfile;

  const claudeMd = readFile("CLAUDE.md") || "";
  findings.claudeMdDocumentsCommands = /```|npm |yarn |pnpm |make |cargo |go |pytest|swift build|swift test/i.test(claudeMd);

  if (testSignals.length === 0) {
    return { level: "missing", findings, needsJudgment: false };
  }

  return { level: null, findings, needsJudgment: true };
}

function auditGuardrails(): CategoryResult {
  const findings: Record<string, unknown> = {};

  const husky = existsSync(join(ROOT, ".husky"));
  const lefthook = fileExists("lefthook.yml") || fileExists(".lefthook.yml");
  const preCommit = fileExists(".pre-commit-config.yaml");
  const gitHooks = existsSync(join(ROOT, ".git/hooks")) && globSync(".git/hooks/pre-commit").length > 0;
  findings.preCommitHooks = { husky, lefthook, preCommit, gitHooks };
  findings.hasPreCommitHooks = husky || lefthook || preCommit || gitHooks;

  const claudeMd = readFile("CLAUDE.md") || "";
  const agentsMd = readFile("AGENTS.md") || "";
  const instructionContent = claudeMd + agentsMd;
  findings.hasDoNotZones = /do not|don't|never|avoid|forbidden|off.limits|restricted/i.test(instructionContent);
  findings.hasProtectedPaths = /don't (touch|modify|edit|change)|do not (touch|modify|edit|change)|never (touch|modify|edit|change)/i.test(instructionContent);

  const claudeSettings = readFile(".claude/settings.json") || readFile(".claude/settings.local.json");
  findings.hasClaudeSettings = !!claudeSettings;
  if (claudeSettings) {
    try {
      const parsed = JSON.parse(claudeSettings);
      findings.hasDeniedPermissions = !!(parsed.deny || parsed.disallowedTools);
    } catch {}
  }

  const branchProtection = globSync(".github/CODEOWNERS").length > 0 || fileExists("CODEOWNERS") || fileExists(".github/CODEOWNERS");
  findings.hasCodeowners = branchProtection;

  const layers = [findings.hasPreCommitHooks, findings.hasDoNotZones, findings.hasClaudeSettings].filter(Boolean).length;

  if (layers === 0) {
    return { level: "missing", findings, needsJudgment: false };
  }
  if (layers === 1) {
    return { level: "minimal", findings, needsJudgment: false };
  }

  return { level: null, findings, needsJudgment: true };
}

function main() {
  const stacks = detectStacks();
  const monorepo = detectMonorepo();

  const result: AuditResult = {
    root: ROOT,
    stacks,
    monorepo,
    categories: {
      agentInstructions: auditAgentInstructions(),
      documentationCoverage: auditDocumentationCoverage(),
      nestedContext: auditNestedContext(monorepo.boundaries),
      codeNavigability: auditCodeNavigability(stacks),
      tokenEfficiency: auditTokenEfficiency(stacks),
      toolingAutomation: auditToolingAutomation(stacks),
      guardrails: auditGuardrails(),
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
