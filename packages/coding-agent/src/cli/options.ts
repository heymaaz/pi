/**
 * Declarative table of built-in CLI options and commands.
 *
 * `parseArgs` resolves flags through this table and `printHelp` renders the Commands and
 * Options sections from it, and `--completions` generates shell completion scripts from it,
 * so adding an option here is the only place its name, aliases, value, and description are
 * written down.
 */

export const VALID_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
export const VALID_MODES = ["text", "json", "rpc"] as const;
export const VALID_TUI_MODES = ["regular", "fullscreen"] as const;
export const COMPLETION_SHELLS = ["bash", "zsh", "fish"] as const;

export type CompletionShell = (typeof COMPLETION_SHELLS)[number];

export interface CliOptionValue {
	/** Placeholder shown in help, including brackets, e.g. `<name>` or `[search]`. */
	readonly placeholder: string;
	/** Accepted values, when the option only takes a fixed set. */
	readonly choices?: readonly string[];
	/** Completes the value as a filesystem path. */
	readonly path?: "file" | "directory";
}

export interface CliOption {
	/** Stable identifier used to dispatch to the parser handler. */
	readonly id: string;
	/** Long flag, e.g. `--provider`. */
	readonly flag: string;
	/** Short aliases, e.g. `-p`. */
	readonly aliases: readonly string[];
	readonly value?: CliOptionValue;
	/** Whether the option may be passed more than once. */
	readonly repeatable?: boolean;
	/** Help description. Each entry is rendered on its own line. */
	readonly description: readonly string[];
}

export const CLI_OPTIONS = [
	{
		id: "provider",
		flag: "--provider",
		aliases: [],
		value: { placeholder: "<name>" },
		description: ["Provider name (default: google)"],
	},
	{
		id: "model",
		flag: "--model",
		aliases: [],
		value: { placeholder: "<pattern>" },
		description: ['Model pattern or ID (supports "provider/id" and optional ":<thinking>")'],
	},
	{
		id: "api-key",
		flag: "--api-key",
		aliases: [],
		value: { placeholder: "<key>" },
		description: ["API key (defaults to env vars)"],
	},
	{
		id: "system-prompt",
		flag: "--system-prompt",
		aliases: [],
		value: { placeholder: "<text>" },
		description: ["System prompt (default: coding assistant prompt)"],
	},
	{
		id: "append-system-prompt",
		flag: "--append-system-prompt",
		aliases: [],
		value: { placeholder: "<text>" },
		repeatable: true,
		description: ["Append text or file contents to the system prompt (can be used multiple times)"],
	},
	{
		id: "mode",
		flag: "--mode",
		aliases: [],
		value: { placeholder: "<mode>", choices: VALID_MODES },
		description: ["Output mode: text (default), json, or rpc"],
	},
	{
		id: "print",
		flag: "--print",
		aliases: ["-p"],
		description: ["Non-interactive mode: process prompt and exit"],
	},
	{
		id: "continue",
		flag: "--continue",
		aliases: ["-c"],
		description: ["Continue previous session"],
	},
	{
		id: "resume",
		flag: "--resume",
		aliases: ["-r"],
		description: ["Select a session to resume"],
	},
	{
		id: "session",
		flag: "--session",
		aliases: [],
		value: { placeholder: "<path|id>", path: "file" },
		description: ["Use specific session file or partial UUID"],
	},
	{
		id: "session-id",
		flag: "--session-id",
		aliases: [],
		value: { placeholder: "<id>" },
		description: ["Use exact project session ID, creating it if missing"],
	},
	{
		id: "fork",
		flag: "--fork",
		aliases: [],
		value: { placeholder: "<path|id>", path: "file" },
		description: ["Fork specific session file or partial UUID into a new session"],
	},
	{
		id: "session-dir",
		flag: "--session-dir",
		aliases: [],
		value: { placeholder: "<dir>", path: "directory" },
		description: ["Directory for session storage and lookup"],
	},
	{
		id: "no-session",
		flag: "--no-session",
		aliases: [],
		description: ["Don't save session (ephemeral)"],
	},
	{
		id: "name",
		flag: "--name",
		aliases: ["-n"],
		value: { placeholder: "<name>" },
		description: ["Set session display name"],
	},
	{
		id: "models",
		flag: "--models",
		aliases: [],
		value: { placeholder: "<patterns>" },
		description: [
			"Comma-separated model patterns for Ctrl+P cycling",
			"Supports globs (anthropic/*, *sonnet*) and fuzzy matching",
		],
	},
	{
		id: "no-tools",
		flag: "--no-tools",
		aliases: ["-nt"],
		description: ["Disable all tools by default (built-in and extension)"],
	},
	{
		id: "no-builtin-tools",
		flag: "--no-builtin-tools",
		aliases: ["-nbt"],
		description: ["Disable built-in tools by default but keep extension/custom tools enabled"],
	},
	{
		id: "tools",
		flag: "--tools",
		aliases: ["-t"],
		value: { placeholder: "<tools>" },
		description: [
			"Comma-separated allowlist of tool names to enable",
			"Applies to built-in, extension, and custom tools",
		],
	},
	{
		id: "exclude-tools",
		flag: "--exclude-tools",
		aliases: ["-xt"],
		value: { placeholder: "<tools>" },
		description: [
			"Comma-separated denylist of tool names to disable",
			"Applies to built-in, extension, and custom tools",
		],
	},
	{
		id: "thinking",
		flag: "--thinking",
		aliases: [],
		value: { placeholder: "<level>", choices: VALID_THINKING_LEVELS },
		description: [`Set thinking level: ${VALID_THINKING_LEVELS.join(", ")}`],
	},
	{
		id: "extension",
		flag: "--extension",
		aliases: ["-e"],
		value: { placeholder: "<path>", path: "file" },
		repeatable: true,
		description: ["Load an extension file (can be used multiple times)"],
	},
	{
		id: "no-extensions",
		flag: "--no-extensions",
		aliases: ["-ne"],
		description: ["Disable extension discovery (explicit -e paths still work)"],
	},
	{
		id: "skill",
		flag: "--skill",
		aliases: [],
		value: { placeholder: "<path>", path: "file" },
		repeatable: true,
		description: ["Load a skill file or directory (can be used multiple times)"],
	},
	{
		id: "no-skills",
		flag: "--no-skills",
		aliases: ["-ns"],
		description: ["Disable skills discovery and loading"],
	},
	{
		id: "prompt-template",
		flag: "--prompt-template",
		aliases: [],
		value: { placeholder: "<path>", path: "file" },
		repeatable: true,
		description: ["Load a prompt template file or directory (can be used multiple times)"],
	},
	{
		id: "no-prompt-templates",
		flag: "--no-prompt-templates",
		aliases: ["-np"],
		description: ["Disable prompt template discovery and loading"],
	},
	{
		id: "theme",
		flag: "--theme",
		aliases: [],
		value: { placeholder: "<path>", path: "file" },
		repeatable: true,
		description: ["Load a theme file or directory (can be used multiple times)"],
	},
	{
		id: "use-theme",
		flag: "--use-theme",
		aliases: [],
		value: { placeholder: "<name[/name]>" },
		description: ["Set the initial interactive theme for this run"],
	},
	{
		id: "no-themes",
		flag: "--no-themes",
		aliases: [],
		description: ["Disable theme discovery and loading"],
	},
	{
		id: "no-context-files",
		flag: "--no-context-files",
		aliases: ["-nc"],
		description: ["Disable AGENTS.md and CLAUDE.md discovery and loading"],
	},
	{
		id: "export",
		flag: "--export",
		aliases: [],
		value: { placeholder: "<file>", path: "file" },
		description: ["Export session file to HTML and exit"],
	},
	{
		id: "list-models",
		flag: "--list-models",
		aliases: [],
		value: { placeholder: "[search]" },
		description: ["List available models (with optional fuzzy search)"],
	},
	{
		id: "verbose",
		flag: "--verbose",
		aliases: [],
		description: ["Force verbose startup (overrides quietStartup setting)"],
	},
	{
		id: "tui-mode",
		flag: "--tui-mode",
		aliases: [],
		value: { placeholder: "<mode>", choices: VALID_TUI_MODES },
		description: ["TUI mode: regular (default) or fullscreen"],
	},
	{
		id: "approve",
		flag: "--approve",
		aliases: ["-a"],
		description: ["Trust project-local files for this run"],
	},
	{
		id: "no-approve",
		flag: "--no-approve",
		aliases: ["-na"],
		description: ["Ignore project-local files for this run"],
	},
	{
		id: "offline",
		flag: "--offline",
		aliases: [],
		description: ["Disable startup network operations (same as PI_OFFLINE=1)"],
	},
	{
		id: "completions",
		flag: "--completions",
		aliases: [],
		value: { placeholder: "<shell>", choices: COMPLETION_SHELLS },
		description: [`Print a shell completion script: ${COMPLETION_SHELLS.join(", ")}`],
	},
	{
		id: "end-of-options",
		flag: "--",
		aliases: [],
		description: ["End option parsing; treat remaining arguments as messages/files"],
	},
	{
		id: "help",
		flag: "--help",
		aliases: ["-h"],
		description: ["Show this help"],
	},
	{
		id: "version",
		flag: "--version",
		aliases: ["-v"],
		description: ["Show version number"],
	},
] as const satisfies readonly CliOption[];

export type CliOptionId = (typeof CLI_OPTIONS)[number]["id"];

export interface CliCommand {
	readonly name: string;
	/** Arguments shown after the command name in help, e.g. `<source> [-l]`. */
	readonly usage: string;
	readonly description: string;
}

export const CLI_COMMANDS: readonly CliCommand[] = [
	{ name: "install", usage: "<source> [-l]", description: "Install extension source and add to settings" },
	{ name: "remove", usage: "<source> [-l]", description: "Remove extension source from settings" },
	{ name: "uninstall", usage: "<source> [-l]", description: "Alias for remove" },
	{ name: "update", usage: "[source|self|pi]", description: "Update pi, extensions, or model catalogs" },
	{ name: "list", usage: "", description: "List installed extensions from settings" },
	{
		name: "config",
		usage: "[-l]",
		description: "Open TUI to enable/disable package resources (Tab switches scope)",
	},
	{ name: "auth", usage: "<command>", description: "Print credentials or check provider readiness" },
];
