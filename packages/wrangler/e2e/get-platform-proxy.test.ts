import shellac from "shellac";
import dedent from "ts-dedent";
import { beforeEach, describe, expect, it } from "vitest";
import { CLOUDFLARE_ACCOUNT_ID } from "./helpers/account-id";
import { makeRoot, seed } from "./helpers/setup";
import { WRANGLER_IMPORT } from "./helpers/wrangler";

describe("getPlatformProxy()", () => {
	let run: typeof shellac;
	beforeEach(async () => {
		const root = await makeRoot();

		run = shellac.in(root).env(process.env);
		await seed(root, {
			"wrangler.toml": dedent`
					name = "ai-app"
					account_id = "${CLOUDFLARE_ACCOUNT_ID}"
					compatibility_date = "2023-01-01"
					compatibility_flags = ["nodejs_compat"]

					[ai]
					binding = "AI"
			`,
			"index.mjs": dedent/*javascript*/ `
					import { getPlatformProxy } from "${WRANGLER_IMPORT}"
					const platform = await getPlatformProxy()

					const { env } = await getPlatformProxy();
					const messages = [
						{
							role: "user",
							// Doing snapshot testing against AI responses can be flaky, but this prompt generates the same output relatively reliably
							content: "Respond with the exact text 'This is a response from Workers AI.'. Do not include any other text",
						},
					];

					const content = await env.AI.run("@hf/thebloke/zephyr-7b-beta-awq", {
						messages,
					});

					console.log(content.response);

					process.exit(0);
					`,
			"package.json": dedent`
					{
						"name": "ai-app",
						"version": "0.0.0",
						"private": true
					}
					`,
		});
	});
	it("can run ai inference", async () => {
		const { stdout } = await run`$ node index.mjs`;
		expect(stdout).toContain("Workers AI");
	});
});
