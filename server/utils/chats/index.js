const { v4: uuidv4 } = require("uuid");
const { ThreadChats } = require("../../models/threadChats");
const { resetMemory } = require("./commands/reset");
const moment = require("moment");
const { getVectorDbClass, getLLMProvider } = require("../helpers");

function convertToChatHistory(history = []) {
  const formattedHistory = [];
  history.forEach((history) => {
    const { id, rating, prompt, response, created_at } = history;
    const data = JSON.parse(response);
    formattedHistory.push([
      {
        role: "user",
        content: prompt,
        sentAt: moment(created_at).unix(),
      },
      {
        id,
        rating,
        role: "assistant",
        content: data.text,
        sources: data.sources || [],
        sentAt: moment(created_at).unix(),
      },
    ]);
  });

  return formattedHistory.flat();
}

function convertToPromptHistory(history = []) {
  const formattedHistory = [];
  history.forEach((history) => {
    const { prompt, response } = history;
    const data = JSON.parse(response);
    formattedHistory.push([
      { role: "user", content: prompt },
      { role: "assistant", content: data.text },
    ]);
  });
  return formattedHistory.flat();
}

const VALID_COMMANDS = {
  "/reset": resetMemory,
};

function grepCommand(message) {
  const availableCommands = Object.keys(VALID_COMMANDS);

  for (let i = 0; i < availableCommands.length; i++) {
    const cmd = availableCommands[i];
    const re = new RegExp(`^(${cmd})`, "i");
    if (re.test(message)) {
      return cmd;
    }
  }

  return null;
}

async function chatWithWorkspace(
  workspace,
  thread,
  message,
  chatMode = "chat",
  user = null
) {
  const uuid = uuidv4();
  const command = grepCommand(message);

  if (!!command && Object.keys(VALID_COMMANDS).includes(command)) {
    return await VALID_COMMANDS[command](workspace, thread, message, uuid, user);
  }

  const LLMConnector = getLLMProvider();
  const VectorDb = getVectorDbClass();
  const { safe, reasons = [] } = await LLMConnector.isSafe(message);
  if (!safe) {
    return {
      uuid,
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: `This message was moderated and will not be allowed. Violations for ${reasons.join(
        ", "
      )} found.`,
    };
  }

  const messageLimit = workspace?.openAiHistory || 20;
  const hasVectorizedSpace = await VectorDb.hasNamespace(workspace.slug);
  const embeddingsCount = await VectorDb.namespaceCount(workspace.slug);
  if (!hasVectorizedSpace || embeddingsCount === 0) {
    // If there are no embeddings - chat like a normal LLM chat interface.
    return await emptyEmbeddingChat({
      uuid,
      message,
      workspace,
      thread,
      messageLimit,
      LLMConnector,
    });
  }

  const { rawHistory, chatHistory } = await recentChatHistory(
    workspace,
    thread,
    messageLimit,
    chatMode
  );
  const {
    contextTexts = [],
    sources = [],
    message: error,
  } = await VectorDb.performSimilaritySearch({
    namespace: workspace.slug,
    input: message,
    LLMConnector,
    similarityThreshold: workspace?.similarityThreshold,
  });

  // Failed similarity search.
  if (!!error) {
    return {
      uuid,
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error,
    };
  }

  // Compress message to ensure prompt passes token limit with room for response
  // and build system messages based on inputs and history.
  const messages = await LLMConnector.compressMessages(
    {
      systemPrompt: chatPrompt(workspace),
      userPrompt: message,
      contextTexts,
      chatHistory,
    },
    rawHistory
  );

  // Send the text completion.
  const textResponse = await LLMConnector.getChatCompletion(messages, {
    temperature: workspace?.openAiTemp ?? 0.7,
  });

  if (!textResponse) {
    return {
      uuid,
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: "No text completion could be completed with this input.",
    };
  }

  const {chat} = await ThreadChats.new({
    workspaceId: workspace.id,
    threadId: thread.id,
    prompt: message,
    response: { text: textResponse, sources, type: chatMode },
    user,
  });
  return {
    id: chat.id,
    uuid,
    type: "textResponse",
    close: true,
    textResponse,
    sources,
    error,
  };
}

// On query we dont return message history. All other chat modes and when chatting
// with no embeddings we return history.
async function recentChatHistory(
  workspace,
  thread,
  messageLimit = 20,
  chatMode = null
) {
  if (chatMode === "query") return [];
  const rawHistory = (
    await ThreadChats.forWorkspaceByThread(
      workspace.id,
      thread.id,
      messageLimit,
      { id: "desc" }
    )
  ).reverse();
  return { rawHistory, chatHistory: convertToPromptHistory(rawHistory) };
}

async function emptyEmbeddingChat({
  uuid,
  message,
  workspace,
  thread,
  messageLimit,
  LLMConnector,
}) {
  const { rawHistory, chatHistory } = await recentChatHistory(
    workspace,
    thread,
    messageLimit
  );
  const textResponse = await LLMConnector.sendChat(
    chatHistory,
    message,
    workspace,
    rawHistory
  );
  const {chat} = await ThreadChats.new({
    workspaceId: workspace.id,
    threadId: thread.id,
    prompt: message,
    response: { text: textResponse, sources: [], type: "chat" },
  });
  return {
    uuid,
    id: chat.id,
    type: "textResponse",
    sources: [],
    close: true,
    error: null,
    textResponse,
  };
}

function chatPrompt(workspace) {
  return (
    workspace?.openAiPrompt ??
    "Given the following conversation, relevant context, and a follow up question, reply with an answer to the current question the user is asking. Return only your response to the question given the above information following the users instructions as needed."
  );
}

module.exports = {
  recentChatHistory,
  convertToPromptHistory,
  convertToChatHistory,
  chatWithWorkspace,
  chatPrompt,
  grepCommand,
  VALID_COMMANDS,
};
