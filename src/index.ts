import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  isValidSeverityLevel,
  isValidTokenLimit,
  isValidExcludePatterns,
  isValidCommitLimit,
  isValidOpenAIApiKey,
} from "./validators.js";
import { ReviewService } from "./reviewer.js";
import { GitHubService } from "./githubService.js";
import { AzureOpenAIService } from "./azureOpenAIService.js";

export async function run(): Promise<void> {
  try {
    // 1. Validate Inputs
    const excludePatternsInput = core.getInput("exclude") || "";
    if (!isValidExcludePatterns(excludePatternsInput)) {
      core.setFailed(`Invalid exclude patterns: ${excludePatternsInput}`);
      return;
    }
    const excludePatterns = excludePatternsInput
      ? excludePatternsInput.split(",").map((p) => p.trim())
      : [];

    const changesThreshold = core.getInput("severity") || "error";
    if (!isValidSeverityLevel(changesThreshold)) {
      core.setFailed(`Invalid severity: ${changesThreshold}`);
      return;
    }

    const tokenLimitInput = core.getInput("tokenLimit") || "50000";
    if (!isValidTokenLimit(tokenLimitInput)) {
      core.setFailed(`Invalid token limit: ${tokenLimitInput}`);
      return;
    }
    const tokenLimit = parseInt(tokenLimitInput, 10);

    const commitLimitInput = core.getInput("commitLimit") || "100";
    if (!isValidCommitLimit(commitLimitInput)) {
      core.setFailed(`Invalid commit limit: ${commitLimitInput}`);
      return;
    }
    const commitLimit = parseInt(commitLimitInput, 10);

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      core.setFailed("Missing GITHUB_TOKEN in environment.");
      return;
    }

    // Validate Azure-related inputs
    const openAIKey = core.getInput("openAIKey");
    if (!isValidOpenAIApiKey(openAIKey)) {
      core.setFailed("Invalid OpenAI API key");
      return;
    }
    core.setSecret(openAIKey); // Treat the API key as a secret

    // Check the pull_request event in the payload
    const action = github.context.payload.action;
    let base = core.getInput("base"); // possibly empty
    let head = core.getInput("head"); // possibly empty

    // If user hasn't explicitly given base/head, override from the event:
    if (!base && !head) {
      if (action === "opened") {
        base = github.context.payload.pull_request?.base?.sha;
        head = github.context.payload.pull_request?.head?.sha;
      } else if (action === "synchronize") {
        base = github.context.payload.before;
        head = github.context.payload.after;
      }
    }

    if (!base || !head) {
      core.setFailed("Missing base or head sha to review.");
      return;
    }

    const { owner, repo, number: pullNumber } = github.context.issue;
    const githubService = new GitHubService({
      token: githubToken,
      owner,
      repo,
      pullNumber,
    });

    const azureService = new AzureOpenAIService({
      apiKey: openAIKey,
    });

    // 2. Run Reviewer
    const reviewerService = new ReviewService(githubService, azureService);
    await reviewerService.review({
      base,
      head,
      tokenLimit,
      changesThreshold,
      commitLimit,
      excludePatterns,
    });

    // 3. Done
    core.info("Review completed.");
  } catch (err) {
    if (err instanceof Error) {
      core.setFailed(err.message);
    } else {
      core.setFailed("An unknown error occurred.");
    }
  }
}

// Only call run if we are not in a test environment
if (require.main) {
  run();
}
