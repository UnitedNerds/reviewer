import { OpenAI } from "openai"
import { zodResponseFormat } from "openai/helpers/zod";
import { CodeReviewCommentArray } from "./schemas.js";

export interface OpenAIConfig {
  apiKey: string;
}

export type ReasoningEffort = "low" | "medium" | "high";

export interface ReviewPromptConfig {
  reasoningEffort: ReasoningEffort;
}

export class AzureOpenAIService {
  private client: OpenAI;

  constructor(config: OpenAIConfig) {
    // Create a configuration using the official OpenAI library
    this.client = new OpenAI({apiKey: config.apiKey});
  }

  async runReviewPrompt(prompt: string) {
   
    const completion = await this.client.chat.completions.create({
      model: "o1", // The model name you requested
      messages: [
        {
          role: "developer",
          content: `You are a helpful code reviewer. Review this pull request and provide any suggestions.
Each comment must include the associated commit sha, file, line, side, and severity: 'info', 'warning', or 'error'.
Only comment on lines that need improvement. Comments may be formatted as markdown.
If you have no comments, return an empty comments array. Respond in JSON format.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: zodResponseFormat(CodeReviewCommentArray, "review_comments")
    });

    const choice = completion.choices[0];
    if (choice.finish_reason !== "stop") {
      throw new Error(
        `Review request did not finish, got ${choice.finish_reason}`
      );
    }

    const rawContent = completion.choices[0].message?.content || "";

    const obj = JSON.parse(rawContent);
   
    return obj
  }
}
