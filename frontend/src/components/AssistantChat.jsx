
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Bot,
  Plus,
  Send,
  Sparkles,
  MessageSquare,
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import api from "../services/api";

function getErrorMessage(error) {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (detail) return JSON.stringify(detail);

  if (error.code === "ERR_NETWORK") {
    return "Cannot connect to the backend. Please check that FastAPI is running.";
  }

  return "Something went wrong. Please try again.";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssistantChat() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [historyLoading, setHistoryLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [chatToDelete, setChatToDelete] = useState(null);
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const loadChats = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const { data } = await api.get("/assistant/chats");
      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryError(getErrorMessage(err));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function openChat(chatId) {
    if (sending || messagesLoading) return;

    setActiveChatId(chatId);
    setMessages([]);
    setError("");
    setMessagesLoading(true);

    try {
      const { data } = await api.get(
        `/assistant/chats/${chatId}/messages`
      );

      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMessagesLoading(false);
    }
  }

  async function deleteChat(chatId) {
    if (!chatId || deletingChatId) return;

    setDeletingChatId(chatId);
    setDeleteError("");

    try {
      await api.delete(`/assistant/chats/${chatId}`);

      setChats((current) => current.filter((chat) => chat.id !== chatId));

      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
        setInput("");
        setError("");
      }

      setChatToDelete(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeletingChatId(null);
    }
  }

  function startNewChat() {
    if (sending) return;

    setActiveChatId(null);
    setMessages([]);
    setInput("");
    setError("");
    textareaRef.current?.focus();
  }

  async function sendMessage(event) {
    event.preventDefault();

    const question = input.trim();

    if (!question || sending) return;

    setError("");
    setInput("");
    setSending(true);

    const temporaryId = `temp-${Date.now()}`;

    setMessages((current) => [
      ...current,
      {
        id: temporaryId,
        role: "user",
        content: question,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const payload = { question };

      if (activeChatId) {
        payload.chat_id = activeChatId;
      }

      const { data } = await api.post("/assistant/ask", payload);

      setActiveChatId(data.chat_id);

      setMessages((current) => [
        ...current.filter((message) => message.id !== temporaryId),
        {
          id: data.question_message_id,
          role: "user",
          content: data.question,
          created_at: data.created_at,
        },
        {
          id: data.answer_message_id,
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          created_at: data.created_at,
        },
      ]);

      await loadChats();
    } catch (err) {
      setMessages((current) =>
        current.filter((message) => message.id !== temporaryId)
      );
      setInput(question);
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className="ai-chat-layout">
      <aside className="ai-chat-sidebar">
        <button
          type="button"
          className="ai-new-chat"
          onClick={startNewChat}
          disabled={sending}
        >
          <Plus size={17} />
          New Chat
        </button>

        <div className="ai-history-heading">
          <MessageSquare size={15} />
          <span>Recent Conversations</span>
        </div>

        <div className="ai-history-list">
          {historyLoading ? (
            <p className="ai-muted">Loading conversations...</p>
          ) : historyError ? (
            <div className="ai-history-error">
              <p>{historyError}</p>
              <button type="button" onClick={loadChats}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : chats.length === 0 ? (
            <p className="ai-muted">
              Your previous conversations will appear here.
            </p>
          ) : (
            chats.map((chat) => (
              <div
                className={`ai-history-item-wrap ${
                  activeChatId === chat.id ? "active" : ""
                }`}
                key={chat.id}
              >
                <button
                  type="button"
                  className={`ai-history-item ${
                    activeChatId === chat.id ? "active" : ""
                  }`}
                  onClick={() => openChat(chat.id)}
                  disabled={sending || messagesLoading || deletingChatId === chat.id}
                  title={chat.title}
                >
                  <MessageSquare size={15} />
                  <span>{chat.title || "New Chat"}</span>
                </button>
                <button
                  type="button"
                  className="ai-history-delete"
                  onClick={() => {
                    setDeleteError("");
                    setChatToDelete(chat);
                  }}
                  disabled={sending || messagesLoading || deletingChatId === chat.id}
                  aria-label={`Delete conversation ${chat.title || "New Chat"}`}
                  title="Delete conversation"
                >
                  {deletingChatId === chat.id
                    ? <LoaderCircle className="ai-spin" size={15} />
                    : <Trash2 size={15} />}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="ai-sidebar-footer">
          <Sparkles size={15} />
          <span>Powered by CampusSphere AI</span>
        </div>
      </aside>

      <div className="ai-chat-main">
        <div className="ai-chat-top">
          <div className="ai-chat-title-icon">
            <Bot size={21} />
          </div>
          <div>
            <h2>CampusSphere AI</h2>
            <p>College knowledge + general AI assistant</p>
          </div>
          <span className="ai-online-indicator">AI Assistant</span>
        </div>

        <div className="ai-chat-messages">
          {messagesLoading ? (
            <div className="ai-loading-state">
              <LoaderCircle className="ai-spin" size={25} />
              <p>Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="ai-empty-state">
              <div className="ai-empty-icon">
                <Sparkles size={31} />
              </div>
              <p className="ai-empty-eyebrow">YOUR CAMPUS AI ASSISTANT</p>
              <h2>How can I help you today?</h2>
              <p>
                Ask anything — college information, programming, technology,
                study topics, writing help or everyday general questions.
              </p>

              <div className="ai-suggestions">
                {[
                  "Explain my semester syllabus.",
                  "What is the difference between AI and Machine Learning?",
                  "Write a Python program to check prime numbers.",
                  "Explain how the Internet works.",
                ].map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    disabled={sending}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="ai-message-list">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`ai-message-row ${
                    message.role === "user" ? "user" : "assistant"
                  }`}
                >
                  {message.role !== "user" && (
                    <span className="ai-message-avatar">
                      <Bot size={18} />
                    </span>
                  )}

                  <div className="ai-message-content">
                    <div className="ai-message-label">
                      {message.role === "user" ? "You" : "CampusSphere AI"}
                    </div>

                    <div className="ai-message-bubble">
                      {message.content}
                    </div>

                    {message.role === "assistant" &&
                      message.sources?.length > 0 && (
                        <div className="ai-sources">
                          <div className="ai-sources-heading">
                            <FileText size={15} />
                            <strong>Sources</strong>
                          </div>

                          {message.sources.map((source, index) => (
                            <div
                              className="ai-source-item"
                              key={source.chunk_id || `${source.document_id}-${index}`}
                            >
                              <FileText size={15} />
                              <span>
                                {source.file_name || "College document"}
                                {source.page_number != null &&
                                  ` · Page ${source.page_number}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    <small className="ai-message-time">
                      {formatDate(message.created_at)}
                    </small>
                  </div>
                </article>
              ))}

              {sending && (
                <div className="ai-message-row assistant">
                  <span className="ai-message-avatar">
                    <Bot size={18} />
                  </span>
                  <div className="ai-message-content">
                    <div className="ai-message-label">CampusSphere AI</div>
                    <div className="ai-typing">
                      <span />
                      <span />
                      <span />
                      <small>Thinking...</small>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="ai-composer-area">
          {error && (
            <div className="ai-error-message">
              {error}
            </div>
          )}

          <form className="ai-composer" onSubmit={sendMessage}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — college, coding, study or general questions..."
              rows={2}
              maxLength={5000}
              disabled={sending}
              aria-label="Ask CampusSphere AI"
            />

            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Send message"
              title="Send message"
            >
              {sending ? (
                <LoaderCircle className="ai-spin" size={19} />
              ) : (
                <Send size={19} />
              )}
            </button>
          </form>

          <p className="ai-composer-note">
            College-specific answers may use your college's authorized documents.
            General questions are handled by the AI model. Verify important
            institutional information with your college administration.
          </p>
        </div>
      </div>

      {chatToDelete && (
        <div className="ai-delete-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deletingChatId) {
            setChatToDelete(null);
            setDeleteError("");
          }
        }}>
          <section
            className="ai-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-delete-title"
          >
            <button
              type="button"
              className="ai-delete-close"
              onClick={() => {
                setChatToDelete(null);
                setDeleteError("");
              }}
              disabled={Boolean(deletingChatId)}
              aria-label="Close confirmation"
            >
              <X size={18} />
            </button>
            <span className="ai-delete-icon"><Trash2 size={21} /></span>
            <h3 id="ai-delete-title">Delete this conversation?</h3>
            <p>
              “{chatToDelete.title || "New Chat"}” and its messages will be
              permanently deleted. This action cannot be undone.
            </p>
            {deleteError && <div className="ai-error-message">{deleteError}</div>}
            <div className="ai-delete-actions">
              <button
                type="button"
                className="ai-delete-cancel"
                onClick={() => {
                  setChatToDelete(null);
                  setDeleteError("");
                }}
                disabled={Boolean(deletingChatId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ai-delete-confirm"
                onClick={() => deleteChat(chatToDelete.id)}
                disabled={Boolean(deletingChatId)}
              >
                {deletingChatId ? "Deleting..." : "Delete conversation"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
