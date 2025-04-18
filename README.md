# AI Pull Request Reviewer

This GitHub Action uses Azure OpenAI to automatically review pull request diffs and post comments.  

## How It Works

1. **Generates a Git diff** (either for the entire PR or just the last commit).
2. **Sends the diff and the last commit message** to Azure OpenAI, asking for a structured JSON response.
3. **Posts AI-generated review comments** on your pull request.

## Usage

**Create a workflow file** (e.g. `.github/workflows/ai-review.yml` in your target repo):

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize] # triggers on new PR and each commit

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:

      - name: Run AI Reviewer
        uses: propstreet/reviewer@v2
        with:
          openAIKey: ${{ secrets.OPENAI_API_KEY }}
        env:
          # Make sure GITHUB_TOKEN has write permissions to create reviews
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### **Options**

#### Required

- openAIKey: Your OpenAI API key.

#### Optional

- base: The base commit SHA to compare against. Defaults to the base branch of the PR for "opened" events and the "before" commit for "synchronize" events.
- head: The head commit SHA to compare against. Defaults to the head branch of the PR for "opened" events and the "after" commit for "synchronize" events.
- severity: The minimum severity level for requesting changes, "info", "warning", or "error" (default). Lower severity levels will be posted as review comments.
- tokenLimit: The maximum number of tokens to send to Azure OpenAI. The default is 50 000, o1 supports up to 200 000 but the REST API seems to only support ~190 000.
- commitLimit: The maximum number of commits to load for reviewing. The default is 100.
- exclude: Comma-separated glob patterns to exclude files from review (e.g., "*.test.ts,dist/**/*"). Default is no excluded files.

## Development & Contributing

1. Clone this repo.
2. Run npm install.
3. Update code in src/.
4. Run npm run build to compile TypeScript.
5. (Optional) npm run package if you want to bundle with ncc.
6. Push changes, tag a release, and reference it with @v1 or similar in your client repos.
