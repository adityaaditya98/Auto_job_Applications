function emptyReasoningContent() {
  return {
    type: "text",
    text: ""
  };
}

function extractTextFromContentArray(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item?.type && ["reasoning", "thinking", "reasoning_content"].includes(item.type)) {
        return "";
      }

      if (item?.text) {
        return item.text;
      }

      if (item?.content) {
        return item.content;
      }

      return "";
    })
    .filter(Boolean)
    .join("");
}

function extractReasoningFromContentArray(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (item?.type && ["reasoning", "thinking", "reasoning_content"].includes(item.type)) {
        return item.text || item.content || "";
      }

      if (item?.reasoning_content) {
        return item.reasoning_content;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function splitThinkTags(raw) {
  if (typeof raw !== "string" || !raw.includes("<think>")) {
    return {
      text: typeof raw === "string" ? raw : "",
      reasoning: ""
    };
  }

  const reasoningParts = Array.from(raw.matchAll(/<think>([\s\S]*?)<\/think>/g))
    .map((match) => match[1]?.trim() || "")
    .filter(Boolean);

  return {
    text: raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim(),
    reasoning: reasoningParts.join("\n\n").trim()
  };
}

function mergeNormalizedResponses(items) {
  const text = items.map((item) => item.text).filter(Boolean).join("");
  const reasoning = items.map((item) => item.reasoning_content?.text || "").filter(Boolean).join("\n").trim();

  return {
    text,
    reasoning_content: {
      type: "text",
      text: reasoning
    }
  };
}

function extractStreamingResponse(raw) {
  if (typeof raw !== "string" || !raw.includes("data:")) {
    return null;
  }

  const chunks = [];
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(payload);
      chunks.push(normalizeLLMResponse(parsed));
    } catch {
      // ignore malformed stream chunks and keep extracting the valid ones
    }
  }

  return mergeNormalizedResponses(chunks);
}

export function normalizeLLMResponse(data) {
  if (data === null || data === undefined) {
    return {
      text: "",
      reasoning_content: emptyReasoningContent()
    };
  }

  if (typeof data === "string") {
    const streamed = extractStreamingResponse(data);
    if (streamed) {
      return streamed;
    }

    const split = splitThinkTags(data);
    return {
      text: split.text,
      reasoning_content: {
        type: "text",
        text: split.reasoning
      }
    };
  }

  if (Array.isArray(data)) {
    return mergeNormalizedResponses(data.map((item) => normalizeLLMResponse(item)));
  }

  const textCandidates = [
    data.response,
    data.content,
    data.text,
    data.output_text,
    data.message?.content,
    data.responses?.[0]?.content,
    data.responses?.[0]?.text,
    data.choices?.[0]?.message?.content,
    data.choices?.[0]?.delta?.content,
    data.choices?.[0]?.text
  ];

  const reasoningCandidates = [
    data.reasoning_content,
    data.reasoning,
    data.message?.reasoning_content,
    data.message?.reasoning,
    data.responses?.[0]?.reasoning_content,
    data.choices?.[0]?.message?.reasoning_content,
    data.choices?.[0]?.message?.reasoning,
    data.choices?.[0]?.delta?.reasoning_content
  ];

  let text = "";
  for (const candidate of textCandidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const split = splitThinkTags(candidate);
      text = split.text || candidate;
      if (!reasoningCandidates.includes(split.reasoning) && split.reasoning) {
        reasoningCandidates.unshift(split.reasoning);
      }
      break;
    }

    const arrayText = extractTextFromContentArray(candidate);
    if (arrayText) {
      text = arrayText;
      break;
    }
  }

  let reasoning = "";
  for (const candidate of reasoningCandidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      reasoning = candidate.trim();
      break;
    }

    const arrayReasoning = extractReasoningFromContentArray(candidate);
    if (arrayReasoning) {
      reasoning = arrayReasoning;
      break;
    }
  }

  if (!text) {
    text = JSON.stringify(data);
  }

  return {
    text,
    reasoning_content: {
      type: "text",
      text: reasoning
    }
  };
}

export function normalizeLLMTextResponse(data) {
  return normalizeLLMResponse(data).text;
}
