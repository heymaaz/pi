import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { generateCompletionScript } from "../src/cli/completions.ts";
import { CLI_COMMANDS, CLI_OPTIONS, COMPLETION_SHELLS } from "../src/cli/options.ts";

function hasShell(shell: string): boolean {
	return spawnSync(shell, ["-c", "exit 0"]).status === 0;
}

describe("generateCompletionScript", () => {
	for (const shell of COMPLETION_SHELLS) {
		test(`${shell} script covers every option and command`, () => {
			const script = generateCompletionScript(shell);
			for (const option of CLI_OPTIONS) {
				if (option.flag === "--") continue;
				// fish drops the leading dashes: `-l provider`, `-s p`, `-o nt`.
				const names = shell === "fish" ? [option.flag.slice(2)] : [option.flag, ...option.aliases];
				for (const name of names) {
					expect(script, `${shell} ${name}`).toContain(name);
				}
			}
			for (const command of CLI_COMMANDS) {
				expect(script, `${shell} ${command.name}`).toContain(command.name);
			}
		});

		test.skipIf(!hasShell(shell))(`${shell} script parses`, () => {
			const result = spawnSync(shell, ["-n"], { input: generateCompletionScript(shell), encoding: "utf8" });
			expect(result.stderr).toBe("");
			expect(result.status).toBe(0);
		});
	}

	describe.skipIf(!hasShell("bash"))("bash completion results", () => {
		const root = mkdtempSync(join(tmpdir(), "pi-completions-"));
		mkdirSync(join(root, "src"));
		writeFileSync(join(root, "notes.md"), "");
		writeFileSync(join(root, "script.bash"), generateCompletionScript("bash"));

		afterAll(() => {
			rmSync(root, { recursive: true, force: true });
		});

		function complete(...words: string[]): string[] {
			const script = [
				"source ./script.bash",
				`COMP_WORDS=(${words.map((word) => `'${word}'`).join(" ")})`,
				`COMP_CWORD=${words.length - 1}`,
				"_pi_completion",
				`printf '%s\\n' "\${COMPREPLY[@]}"`,
			].join("\n");
			const result = spawnSync("bash", ["-c", script], { cwd: root, encoding: "utf8" });
			expect(result.stderr).toBe("");
			return result.stdout.split("\n").filter((line) => line.length > 0);
		}

		test("completes commands in the first position", () => {
			expect(complete("pi", "")).toEqual(CLI_COMMANDS.map((command) => command.name));
		});

		test("completes flags", () => {
			expect(complete("pi", "--thi")).toEqual(["--thinking"]);
		});

		test("completes option choices", () => {
			expect(complete("pi", "--thinking", "")).toEqual(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
		});

		test("completes directories for directory options", () => {
			expect(complete("pi", "--session-dir", "")).toEqual(["src"]);
		});

		test("completes files after @", () => {
			expect(complete("pi", "hello", "@no")).toEqual(["@notes.md"]);
		});

		test("does not complete plain message arguments", () => {
			expect(complete("pi", "hello", "")).toEqual([]);
		});
	});
});
