/**
 * CLI argument parsing and help display
 */

import type { ThinkingLevel } from "@earendil-works/pi-agent-core";
import chalk from "chalk";
import { APP_NAME, CONFIG_DIR_NAME, ENV_AGENT_DIR, ENV_SESSION_DIR } from "../config.ts";
import type { ExtensionFlag } from "../core/extensions/types.ts";
import type { TuiMode } from "../core/settings-manager.ts";
import {
	CLI_COMMANDS,
	CLI_OPTIONS,
	type CliOptionId,
	COMPLETION_SHELLS,
	type CompletionShell,
	VALID_MODES,
	VALID_THINKING_LEVELS,
	VALID_TUI_MODES,
} from "./options.ts";

export type Mode = (typeof VALID_MODES)[number];

export interface Args {
	provider?: string;
	model?: string;
	apiKey?: string;
	systemPrompt?: string;
	appendSystemPrompt?: string[];
	thinking?: ThinkingLevel;
	continue?: boolean;
	resume?: boolean;
	help?: boolean;
	version?: boolean;
	completions?: CompletionShell;
	mode?: Mode;
	name?: string;
	noSession?: boolean;
	session?: string;
	sessionId?: string;
	fork?: string;
	sessionDir?: string;
	models?: string[];
	tools?: string[];
	excludeTools?: string[];
	noTools?: boolean;
	noBuiltinTools?: boolean;
	extensions?: string[];
	noExtensions?: boolean;
	print?: boolean;
	export?: string;
	noSkills?: boolean;
	skills?: string[];
	promptTemplates?: string[];
	noPromptTemplates?: boolean;
	themes?: string[];
	useTheme?: string;
	noThemes?: boolean;
	noContextFiles?: boolean;
	listModels?: string | true;
	offline?: boolean;
	tuiMode?: TuiMode;
	verbose?: boolean;
	projectTrustOverride?: boolean;
	messages: string[];
	fileArgs: string[];
	/** Unknown flags (potentially extension flags) - map of flag name to value */
	unknownFlags: Map<string, boolean | string>;
	diagnostics: Array<{ type: "warning" | "error"; message: string }>;
}

/** Returns the index of the last argument consumed, or undefined to fall back to generic handling. */
type OptionHandler = (args: string[], i: number, result: Args) => number | undefined;

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
	return (values as readonly string[]).includes(value);
}

export function isValidThinkingLevel(level: string): level is ThinkingLevel {
	return isOneOf(VALID_THINKING_LEVELS, level);
}

export function normalizeSessionName(value: string): string | undefined {
	const name = value.trim();
	return name.length > 0 ? name : undefined;
}

function flagHandler(apply: (result: Args) => void): OptionHandler {
	return (_args, i, result) => {
		apply(result);
		return i;
	};
}

/** Consumes the next argument unconditionally. Without one, the flag is handled as unknown. */
function valueHandler(apply: (result: Args, value: string) => void): OptionHandler {
	return (args, i, result) => {
		if (i + 1 >= args.length) return undefined;
		apply(result, args[i + 1]);
		return i + 1;
	};
}

function splitList(value: string): string[] {
	return value
		.split(",")
		.map((s) => s.trim())
		.filter((name) => name.length > 0);
}

const OPTION_HANDLERS: Record<CliOptionId, OptionHandler> = {
	"end-of-options": (args, i, result) => {
		for (const positionalArg of args.slice(i + 1)) {
			if (positionalArg.startsWith("@")) {
				result.fileArgs.push(positionalArg.slice(1));
			} else {
				result.messages.push(positionalArg);
			}
		}
		return args.length;
	},
	help: flagHandler((result) => {
		result.help = true;
	}),
	version: flagHandler((result) => {
		result.version = true;
	}),
	completions: (args, i, result) => {
		const shell = args[i + 1];
		if (shell === undefined || shell.startsWith("-")) {
			result.diagnostics.push({
				type: "error",
				message: `--completions requires ${COMPLETION_SHELLS.join(", ")}`,
			});
			return i;
		}
		if (!isOneOf(COMPLETION_SHELLS, shell)) {
			result.diagnostics.push({
				type: "error",
				message: `Invalid shell "${shell}". Valid values: ${COMPLETION_SHELLS.join(", ")}`,
			});
			return i + 1;
		}
		result.completions = shell;
		return i + 1;
	},
	mode: (args, i, result) => {
		const mode = args[i + 1];
		if (mode === undefined || mode.startsWith("-")) {
			result.diagnostics.push({ type: "error", message: "--mode requires text, json, or rpc" });
			return i;
		}
		if (!isOneOf(VALID_MODES, mode)) {
			result.diagnostics.push({
				type: "error",
				message: `Invalid mode "${mode}". Valid values: ${VALID_MODES.join(", ")}`,
			});
			return i + 1;
		}
		result.mode = mode;
		return i + 1;
	},
	continue: flagHandler((result) => {
		result.continue = true;
	}),
	resume: flagHandler((result) => {
		result.resume = true;
	}),
	provider: valueHandler((result, value) => {
		result.provider = value;
	}),
	model: valueHandler((result, value) => {
		result.model = value;
	}),
	"api-key": valueHandler((result, value) => {
		result.apiKey = value;
	}),
	"system-prompt": valueHandler((result, value) => {
		result.systemPrompt = value;
	}),
	"append-system-prompt": valueHandler((result, value) => {
		result.appendSystemPrompt = result.appendSystemPrompt ?? [];
		result.appendSystemPrompt.push(value);
	}),
	name: (args, i, result) => {
		if (i + 1 < args.length) {
			result.name = args[i + 1];
			return i + 1;
		}
		result.diagnostics.push({ type: "error", message: "--name requires a value" });
		return i;
	},
	"no-session": flagHandler((result) => {
		result.noSession = true;
	}),
	session: valueHandler((result, value) => {
		result.session = value;
	}),
	"session-id": valueHandler((result, value) => {
		result.sessionId = value;
	}),
	fork: valueHandler((result, value) => {
		result.fork = value;
	}),
	"session-dir": valueHandler((result, value) => {
		result.sessionDir = value;
	}),
	models: valueHandler((result, value) => {
		result.models = value.split(",").map((s) => s.trim());
	}),
	"no-tools": flagHandler((result) => {
		result.noTools = true;
	}),
	"no-builtin-tools": flagHandler((result) => {
		result.noBuiltinTools = true;
	}),
	tools: valueHandler((result, value) => {
		result.tools = splitList(value);
	}),
	"exclude-tools": valueHandler((result, value) => {
		result.excludeTools = splitList(value);
	}),
	thinking: valueHandler((result, level) => {
		if (isValidThinkingLevel(level)) {
			result.thinking = level;
		} else {
			result.diagnostics.push({
				type: "warning",
				message: `Invalid thinking level "${level}". Valid values: ${VALID_THINKING_LEVELS.join(", ")}`,
			});
		}
	}),
	print: (args, i, result) => {
		result.print = true;
		const next = args[i + 1];
		if (next !== undefined && !next.startsWith("@") && (!next.startsWith("-") || next.startsWith("---"))) {
			result.messages.push(next);
			return i + 1;
		}
		return i;
	},
	export: valueHandler((result, value) => {
		result.export = value;
	}),
	extension: valueHandler((result, value) => {
		result.extensions = result.extensions ?? [];
		result.extensions.push(value);
	}),
	"no-extensions": flagHandler((result) => {
		result.noExtensions = true;
	}),
	skill: valueHandler((result, value) => {
		result.skills = result.skills ?? [];
		result.skills.push(value);
	}),
	"prompt-template": valueHandler((result, value) => {
		result.promptTemplates = result.promptTemplates ?? [];
		result.promptTemplates.push(value);
	}),
	theme: valueHandler((result, value) => {
		result.themes = result.themes ?? [];
		result.themes.push(value);
	}),
	"use-theme": (args, i, result) => {
		const themeName = args[i + 1];
		if (themeName === undefined || themeName.startsWith("-")) {
			result.diagnostics.push({ type: "error", message: "--use-theme requires a theme name" });
			return i;
		}
		result.useTheme = themeName;
		return i + 1;
	},
	"no-skills": flagHandler((result) => {
		result.noSkills = true;
	}),
	"no-prompt-templates": flagHandler((result) => {
		result.noPromptTemplates = true;
	}),
	"no-themes": flagHandler((result) => {
		result.noThemes = true;
	}),
	"no-context-files": flagHandler((result) => {
		result.noContextFiles = true;
	}),
	"list-models": (args, i, result) => {
		// Check if next arg is a search pattern (not a flag or file arg)
		if (i + 1 < args.length && !args[i + 1].startsWith("-") && !args[i + 1].startsWith("@")) {
			result.listModels = args[i + 1];
			return i + 1;
		}
		result.listModels = true;
		return i;
	},
	"tui-mode": (args, i, result) => {
		const mode = args[i + 1];
		if (mode !== undefined && isOneOf(VALID_TUI_MODES, mode)) {
			result.tuiMode = mode;
			return i + 1;
		}
		if (mode === undefined || mode.startsWith("-")) {
			result.diagnostics.push({ type: "error", message: "--tui-mode requires regular or fullscreen" });
			return i;
		}
		result.diagnostics.push({
			type: "error",
			message: `Invalid TUI mode "${mode}". Valid values: ${VALID_TUI_MODES.join(", ")}`,
		});
		return i + 1;
	},
	verbose: flagHandler((result) => {
		result.verbose = true;
	}),
	approve: flagHandler((result) => {
		result.projectTrustOverride = true;
	}),
	"no-approve": flagHandler((result) => {
		result.projectTrustOverride = false;
	}),
	offline: flagHandler((result) => {
		result.offline = true;
	}),
};

const OPTIONS_BY_FLAG = new Map<string, CliOptionId>(
	CLI_OPTIONS.flatMap((option) => [option.flag, ...option.aliases].map((flag) => [flag, option.id] as const)),
);

export function parseArgs(args: string[]): Args {
	const result: Args = {
		messages: [],
		fileArgs: [],
		unknownFlags: new Map(),
		diagnostics: [],
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		const optionId = OPTIONS_BY_FLAG.get(arg);
		if (optionId !== undefined) {
			const lastConsumed = OPTION_HANDLERS[optionId](args, i, result);
			if (lastConsumed !== undefined) {
				i = lastConsumed;
				continue;
			}
		}

		if (arg.startsWith("@")) {
			result.fileArgs.push(arg.slice(1)); // Remove @ prefix
		} else if (arg.startsWith("--")) {
			const eqIndex = arg.indexOf("=");
			if (eqIndex !== -1) {
				result.unknownFlags.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
			} else {
				const flagName = arg.slice(2);
				const next = args[i + 1];
				if (next !== undefined && !next.startsWith("-") && !next.startsWith("@")) {
					result.unknownFlags.set(flagName, next);
					i++;
				} else {
					result.unknownFlags.set(flagName, true);
				}
			}
		} else if (arg.startsWith("-") && !arg.startsWith("--")) {
			result.diagnostics.push({ type: "error", message: `Unknown option: ${arg}` });
		} else if (!arg.startsWith("-")) {
			result.messages.push(arg);
		}
	}

	return result;
}

const HELP_OPTION_COLUMN = 33;
const HELP_COMMAND_COLUMN = 29;

function formatOptionsHelp(): string {
	return CLI_OPTIONS.map((option) => {
		const names = [option.flag, ...option.aliases].join(", ");
		const value = "value" in option ? ` ${option.value.placeholder}` : "";
		const [first, ...rest] = option.description;
		const lines = [`  ${names}${value}`.padEnd(HELP_OPTION_COLUMN) + first];
		for (const line of rest) {
			lines.push(" ".repeat(HELP_OPTION_COLUMN) + line);
		}
		return lines.join("\n");
	}).join("\n");
}

function formatCommandsHelp(): string {
	const commandLine = (usage: string, description: string) =>
		`  ${`${APP_NAME} ${usage}`.padEnd(HELP_COMMAND_COLUMN)}${description}`;
	const lines = CLI_COMMANDS.map((command) =>
		commandLine(command.usage ? `${command.name} ${command.usage}` : command.name, command.description),
	);
	const helpable = CLI_COMMANDS.map((command) => command.name).join("/");
	lines.push(commandLine("<command> --help", `Show help for ${helpable}`));
	return lines.join("\n");
}

export function printHelp(extensionFlags?: ExtensionFlag[]): void {
	const extensionFlagsText =
		extensionFlags && extensionFlags.length > 0
			? `\n${chalk.bold("Extension CLI Flags:")}\n${extensionFlags
					.map((flag) => {
						const value = flag.type === "string" ? " <value>" : "";
						const description = flag.description ?? `Registered by ${flag.extensionPath}`;
						return `  --${flag.name}${value}`.padEnd(30) + description;
					})
					.join("\n")}\n`
			: "";
	console.log(`${chalk.bold(APP_NAME)} - AI coding assistant with read, bash, edit, write tools

${chalk.bold("Usage:")}
  ${APP_NAME} [options] [--] [@files...] [messages...]

${chalk.bold("Commands:")}
${formatCommandsHelp()}

${chalk.bold("Options:")}
${formatOptionsHelp()}

Extensions can register additional flags (e.g., --plan from plan-mode extension).${extensionFlagsText}

${chalk.bold("Examples:")}
  # Print a provider API key for an external client
  ${APP_NAME} auth print-api-key --provider openai

  # Print an OAuth bearer token for an external client (refreshes if expired)
  ${APP_NAME} auth print-bearer-token --provider openai-codex

  # Interactive mode
  ${APP_NAME}

  # Interactive mode with initial prompt
  ${APP_NAME} "List all .ts files in src/"

  # Include files in initial message
  ${APP_NAME} @prompt.md @image.png "What color is the sky?"

  # Non-interactive mode (process and exit)
  ${APP_NAME} -p "List all .ts files in src/"

  # Prompt beginning with a dash
  ${APP_NAME} -p -- "- Summarize these points"

  # Multiple messages (interactive)
  ${APP_NAME} "Read package.json" "What dependencies do we have?"

  # Continue previous session
  ${APP_NAME} --continue "What did we discuss?"

  # Start a named session
  ${APP_NAME} --name "Refactor auth module"

  # Use different model
  ${APP_NAME} --provider openai --model gpt-4o-mini "Help me refactor this code"

  # Use model with provider prefix (no --provider needed)
  ${APP_NAME} --model openai/gpt-4o "Help me refactor this code"

  # Use model with thinking level shorthand
  ${APP_NAME} --model sonnet:high "Solve this complex problem"

  # Limit model cycling to specific models
  ${APP_NAME} --models claude-sonnet,claude-haiku,gpt-4o

  # Limit to a specific provider with glob pattern
  ${APP_NAME} --models "github-copilot/*"

  # Cycle models with fixed thinking levels
  ${APP_NAME} --models sonnet:high,haiku:low

  # Start with a specific thinking level
  ${APP_NAME} --thinking high "Solve this complex problem"

  # Read-only mode (no file modifications possible)
  ${APP_NAME} --tools read,grep,find,ls -p "Review the code in src/"

  # Disable one tool while keeping the rest available
  ${APP_NAME} --exclude-tools ask_question

  # Export a session file to HTML
  ${APP_NAME} --export ~/${CONFIG_DIR_NAME}/agent/sessions/--path--/session.jsonl
  ${APP_NAME} --export session.jsonl output.html

${chalk.bold("Environment Variables:")}
  ANTHROPIC_AUTH_TOKEN             - Anthropic bearer auth token
  ANTHROPIC_API_KEY                - Anthropic Claude API key
  ANTHROPIC_OAUTH_TOKEN            - Anthropic OAuth token (alternative to API key)
  ANT_LING_API_KEY                 - Ant Ling API key
  OPENAI_API_KEY                   - OpenAI GPT API key
  AZURE_OPENAI_API_KEY             - Azure OpenAI API key
  AZURE_OPENAI_BASE_URL            - Azure OpenAI/Cognitive Services base URL (e.g. https://{resource}.openai.azure.com)
  AZURE_OPENAI_RESOURCE_NAME       - Azure OpenAI resource name (alternative to base URL)
  AZURE_OPENAI_API_VERSION         - Azure OpenAI API version (default: v1)
  AZURE_OPENAI_DEPLOYMENT_NAME_MAP - Azure OpenAI model=deployment map (comma-separated)
  DEEPSEEK_API_KEY                 - DeepSeek API key
  NVIDIA_API_KEY                   - NVIDIA NIM API key
  GEMINI_API_KEY                   - Google Gemini API key
  GROQ_API_KEY                     - Groq API key
  CEREBRAS_API_KEY                 - Cerebras API key
  XAI_API_KEY                      - xAI Grok API key
  FIREWORKS_API_KEY                - Fireworks API key
  TOGETHER_API_KEY                 - Together AI API key
  BASETEN_API_KEY                  - Baseten API key
  OPENROUTER_API_KEY               - OpenRouter API key
  AI_GATEWAY_API_KEY               - Vercel AI Gateway API key
  ZAI_API_KEY                      - ZAI Coding Plan API key (Global)
  ZAI_CODING_CN_API_KEY            - ZAI Coding Plan API key (China)
  MISTRAL_API_KEY                  - Mistral API key
  MINIMAX_API_KEY                  - MiniMax API key
  MOONSHOT_API_KEY                 - Moonshot AI API key
  OPENCODE_API_KEY                 - OpenCode Zen/OpenCode Go API key
  KIMI_API_KEY                     - Kimi For Coding API key
  META_API_KEY                     - Meta Model API key
  CLOUDFLARE_API_KEY               - Cloudflare API token (Workers AI and AI Gateway)
  CLOUDFLARE_ACCOUNT_ID            - Cloudflare account id (required for both)
  CLOUDFLARE_GATEWAY_ID            - Cloudflare AI Gateway slug (required for AI Gateway)
  QWEN_TOKEN_PLAN_API_KEY          - Qwen Token Plan API key (international region)
  QWEN_TOKEN_PLAN_CN_API_KEY       - Qwen Token Plan API key (China region)
  XIAOMI_API_KEY                   - Xiaomi MiMo API key (api.xiaomimimo.com billing)
  XIAOMI_TOKEN_PLAN_CN_API_KEY     - Xiaomi MiMo Token Plan API key (China region)
  XIAOMI_TOKEN_PLAN_AMS_API_KEY    - Xiaomi MiMo Token Plan API key (Amsterdam region)
  XIAOMI_TOKEN_PLAN_SGP_API_KEY    - Xiaomi MiMo Token Plan API key (Singapore region)
  AWS_PROFILE                      - AWS profile for Amazon Bedrock
  AWS_ACCESS_KEY_ID                - AWS access key for Amazon Bedrock
  AWS_SECRET_ACCESS_KEY            - AWS secret key for Amazon Bedrock
  AWS_BEARER_TOKEN_BEDROCK         - Bedrock API key (bearer token)
  AWS_REGION                       - AWS region for Amazon Bedrock (e.g., us-east-1)
  ${ENV_AGENT_DIR.padEnd(32)} - Config directory (default: ~/${CONFIG_DIR_NAME}/agent)
  ${ENV_SESSION_DIR.padEnd(32)} - Session storage directory (overridden by --session-dir)
  PI_PACKAGE_DIR                   - Override package directory (for Nix/Guix store paths)
  PI_OFFLINE                       - Disable startup network operations when set to 1/true/yes
  PI_TELEMETRY                     - Override install telemetry when set to 1/true/yes or 0/false/no
  PI_SHARE_VIEWER_URL              - Base URL for /share command (default: https://pi.dev/session/)

${chalk.bold("Built-in Tool Names:")}
  read       - Read file contents
  bash       - Execute bash commands
  powershell - Execute PowerShell commands on Windows
  edit       - Edit files with find/replace
  write      - Write files (creates/overwrites)
  grep       - Search file contents (read-only, off by default)
  find       - Find files by glob pattern (read-only, off by default)
  ls         - List directory contents (read-only, off by default)
`);
}
