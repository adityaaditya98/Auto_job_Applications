export class LLMProvider {
  async generate(_payload) {
    throw new Error("LLMProvider.generate must be implemented by subclasses");
  }
}
