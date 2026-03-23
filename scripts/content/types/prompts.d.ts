declare module "prompts" {
  export interface PromptChoice<TValue = string> {
    title: string;
    value: TValue;
  }

  export interface PromptAnswers {
    [key: string]: unknown;
  }

  export interface PromptObject<
    TAnswers extends PromptAnswers = PromptAnswers,
  > {
    type: string | null;
    name: keyof TAnswers & string;
    message: string;
    choices?: Array<PromptChoice>;
    validate?: (value: string) => true | string;
    initial?: (previous: unknown, answers: TAnswers) => string;
  }

  export interface PromptOptions {
    onCancel?: () => void;
  }

  export default function prompts<
    TAnswers extends PromptAnswers = PromptAnswers,
  >(
    questions: Array<PromptObject<TAnswers>> | PromptObject<TAnswers>,
    options?: PromptOptions,
  ): Promise<TAnswers>;
}
