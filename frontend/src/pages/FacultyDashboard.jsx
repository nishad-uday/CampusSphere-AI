import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  UserRound,
  Users,
  Bell,
  BookOpen,
  MessagesSquare,
  MessageCircle,
  Send,
  Search,
  RefreshCw,
  Bot,
  LogOut,
  Menu,
  ChevronRight,
  Clock3,
  Building2,
  ShieldCheck,
  Pencil,
  Trash2,
  Plus,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Github,
  Linkedin,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AssistantChat from "../components/AssistantChat";

const facultyNavigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "students", label: "My Students", icon: Users },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "notices", label: "Notices & Announcements", icon: Bell },
  { id: "materials", label: "Learning Materials", icon: BookOpen },
  { id: "qa", label: "Academic Q&A", icon: MessagesSquare },
  { id: "assistant", label: "AI Campus Assistant", icon: Bot, tag: "AI" },
];

const sectionInfo = {
  overview: ["Faculty Dashboard", "Your teaching workspace at a glance."],
  profile: ["My Profile", "Your faculty and professional information."],
  students: ["My Students", "Students associated with your department."],
  messages: ["Messages", "Private conversations with students in your college."],
  notices: ["Notices & Announcements", "Createand review official academic updates."],
  materials: ["Learning Materials", "Share notes, documents and study resources."],
  qa: ["Academic Q&A", "Help students with their academic questions."],
  assistant: ["AI Campus Assistant", "Ask anything — college information, coding, learning and general questions."],
};

const pendingModules = {
  notices: {
    title: "Campus Notices",
    description: "Notice creation, publishing and audience targeting will be enabled after the notices API is implemented.",
    icon: Bell,
  },
  materials: {
    title: "Learning Materials",
    description: "Faculty will be able to upload PDFs and learning resources for their students after the materials service is connected.",
    icon: BookOpen,
  },
};

function getApiErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const location = Array.isArray(item.loc)
            ? item.loc.join(" → ")
            : "";

          return location
            ? `${location}: ${item.msg || "Invalid value"}`
            : item.msg || "Validation error";
        }

        return String(item);
      })
      .join(" | ");
  }

  if (typeof detail === "string") return detail;

  return fallback;
}

function initialsFromName(name = "Faculty") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "FC";
}

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dashboardRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dashboardZoom, setDashboardZoom] = useState(100);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === dashboardRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleDashboardFullscreen() {
    const dashboardElement = dashboardRef.current;
    if (!dashboardElement) return;

    try {
      if (document.fullscreenElement === dashboardElement) {
        await document.exitFullscreen();
      } else {
        if (document.fullscreenElement) await document.exitFullscreen();
        await dashboardElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Dashboard fullscreen error:", error);
    }
  }
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    employee_id: "",
    designation: "",
    specialization: "",
    qualification: "",
    experience_years: "",
    office_location: "",
    bio: "",
  });

  const [students, setStudents] = useState([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [studentProfileLoading, setStudentProfileLoading] = useState(false);
  const [studentProfileError, setStudentProfileError] = useState("");

  // Learning Materials
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState("");
  const [resourcesSuccess, setResourcesSuccess] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceCategory, setResourceCategory] = useState("");
  const [uploadingResource, setUploadingResource] = useState(false);
  const [deletingResourceId, setDeletingResourceId] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    description: "",
    subject: "",
    category: "notes",
    semester: "",
    file: null,
  });

  // Notices & Announcements
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeError, setNoticeError] = useState("");
  const [noticeSuccess, setNoticeSuccess] = useState("");
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    category: "General",
    priority: "Normal",
    expires_at: "",
  });

  // Direct Messages
  const [messageContacts, setMessageContacts] = useState([]);
  const [messageConversations, setMessageConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messagesSuccess, setMessagesSuccess] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageContactSearch, setMessageContactSearch] = useState("");


  // Academic Q&A
  const [qaQuestions, setQaQuestions] = useState([]);
  const [qaAnswers, setQaAnswers] = useState([]);
  const [qaSelectedQuestion, setQaSelectedQuestion] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaAnswersLoading, setQaAnswersLoading] = useState(false);
  const [qaError, setQaError] = useState("");
  const [qaSuccess, setQaSuccess] = useState("");
  const [qaStatusFilter, setQaStatusFilter] = useState("all");
  const [qaSearch, setQaSearch] = useState("");
  const [qaAnswerDraft, setQaAnswerDraft] = useState("");
  const [qaPosting, setQaPosting] = useState(false);
  const [qaEditingAnswerId, setQaEditingAnswerId] = useState(null);
  const [qaUpdatingAnswer, setQaUpdatingAnswer] = useState(false);
  const [qaActionId, setQaActionId] = useState(null);

  useEffect(() => {
    if (activeSection === "qa") {
      loadAcademicQuestions();
    }
  }, [activeSection, qaStatusFilter]);

  async function loadAcademicQuestions() {
    setQaLoading(true);
    setQaError("");
    try {
      const params = { skip: 0, limit: 100 };
      if (qaStatusFilter === "resolved") params.resolved = true;
      if (qaStatusFilter === "open") params.resolved = false;
      const { data } = await api.get("/academic-qa/questions", { params });
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setQaQuestions(items);
      if (qaSelectedQuestion?.id) {
        const refreshed = items.find((item) => item.id === qaSelectedQuestion.id);
        if (refreshed) setQaSelectedQuestion(refreshed);
        else {
          setQaSelectedQuestion(null);
          setQaAnswers([]);
        }
      }
    } catch (error) {
      console.error("Load Academic Q&A Questions Error:", error);
      setQaQuestions([]);
      setQaError(getApiErrorMessage(error, "Unable to load academic questions."));
    } finally {
      setQaLoading(false);
    }
  }

  async function openAcademicQuestion(question) {
    setQaSelectedQuestion(question);
    setQaAnswers([]);
    setQaAnswerDraft("");
    setQaEditingAnswerId(null);
    setQaError("");
    setQaSuccess("");
    setQaAnswersLoading(true);
    try {
      const { data } = await api.get(
        `/academic-qa/questions/${question.id}/answers`
      );
      setQaAnswers(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      console.error("Load Academic Q&A Answers Error:", error);
      setQaError(getApiErrorMessage(error, "Unable to load answers."));
    } finally {
      setQaAnswersLoading(false);
    }
  }

  async function submitAcademicAnswer(event) {
    event.preventDefault();
    const content = qaAnswerDraft.trim();
    if (!content || !qaSelectedQuestion?.id || qaPosting) return;
    setQaPosting(true);
    setQaError("");
    setQaSuccess("");
    try {
      await api.post(
        `/academic-qa/questions/${qaSelectedQuestion.id}/answers`,
        { content }
      );
      setQaAnswerDraft("");
      setQaSuccess("Your answer has been posted.");
      await openAcademicQuestion(qaSelectedQuestion);
      await loadAcademicQuestions();
    } catch (error) {
      console.error("Post Academic Answer Error:", error);
      setQaError(getApiErrorMessage(error, "Unable to post your answer."));
    } finally {
      setQaPosting(false);
    }
  }

  function beginEditAcademicAnswer(answer) {
    setQaEditingAnswerId(answer.id);
    setQaAnswerDraft(answer.content || "");
    setQaError("");
    setQaSuccess("");
  }

  async function saveAcademicAnswer(event) {
    event.preventDefault();
    const content = qaAnswerDraft.trim();
    if (!content || !qaEditingAnswerId || qaUpdatingAnswer) return;
    setQaUpdatingAnswer(true);
    setQaError("");
    setQaSuccess("");
    try {
      await api.put(`/academic-qa/answers/${qaEditingAnswerId}`, { content });
      setQaEditingAnswerId(null);
      setQaAnswerDraft("");
      setQaSuccess("Your answer has been updated.");
      await openAcademicQuestion(qaSelectedQuestion);
    } catch (error) {
      console.error("Update Academic Answer Error:", error);
      setQaError(getApiErrorMessage(error, "Unable to update your answer."));
    } finally {
      setQaUpdatingAnswer(false);
    }
  }

  async function toggleAcademicAnswerLike(answer) {
    setQaActionId(answer.id);
    setQaError("");
    try {
      const { data } = await api.post(`/academic-qa/answers/${answer.id}/like`);
      setQaAnswers((current) =>
        current.map((item) =>
          item.id === answer.id
            ? { ...item, has_liked: data.liked, like_count: data.like_count }
            : item
        )
      );
    } catch (error) {
      setQaError(getApiErrorMessage(error, "Unable to update answer reaction."));
    } finally {
      setQaActionId(null);
    }
  }

  async function deleteAcademicAnswer(answer) {
    if (!window.confirm("Delete your answer? This action cannot be undone.")) return;
    setQaActionId(answer.id);
    setQaError("");
    setQaSuccess("");
    try {
      await api.delete(`/academic-qa/answers/${answer.id}`);
      setQaAnswers((current) => current.filter((item) => item.id !== answer.id));
      setQaSuccess("Answer deleted successfully.");
      await loadAcademicQuestions();
    } catch (error) {
      setQaError(getApiErrorMessage(error, "Unable to delete this answer."));
    } finally {
      setQaActionId(null);
    }
  }

  async function changeAcademicQuestionStatus(question) {
    const action = question.is_resolved ? "reopen" : "resolve";
    setQaActionId(question.id);
    setQaError("");
    setQaSuccess("");
    try {
      await api.patch(`/academic-qa/questions/${question.id}/${action}`);
      setQaSuccess(
        action === "resolve"
          ? "Question marked as resolved."
          : "Question reopened successfully."
      );
      await loadAcademicQuestions();
      const refreshed = { ...question, is_resolved: action === "resolve" };
      setQaSelectedQuestion(refreshed);
    } catch (error) {
      setQaError(
        getApiErrorMessage(
          error,
          action === "resolve"
            ? "Unable to resolve this question."
            : "Unable to reopen this question."
        )
      );
    } finally {
      setQaActionId(null);
    }
  }

  function renderAcademicQA() {
    const visibleQuestions = qaQuestions.filter((question) =>
      `${question.title || ""} ${question.content || ""} ${question.author_name || ""}`
        .toLowerCase()
        .includes(qaSearch.trim().toLowerCase())
    );

    return (
      <section className="fd-qa">
        <section className="fd-panel">
          <div className="fd-panel-heading fd-students-heading">
            <div>
              <p className="fd-eyebrow">ACADEMIC DISCUSSIONS</p>
              <h3>Student Questions</h3>
              <p>Review questions from students in your college and provide guidance.</p>
            </div>
            <button
              type="button"
              className="fd-edit-button"
              onClick={loadAcademicQuestions}
              disabled={qaLoading}
            >
              <RefreshCw size={14} /> {qaLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="fd-qa-toolbar">
            <label className="fd-qa-search">
              <Search size={15} />
              <input
                type="search"
                value={qaSearch}
                onChange={(event) => setQaSearch(event.target.value)}
                placeholder="Search questions or student name..."
                aria-label="Search academic questions"
              />
            </label>
            <select
              value={qaStatusFilter}
              onChange={(event) => setQaStatusFilter(event.target.value)}
              aria-label="Filter questions by status"
            >
              <option value="all">All questions</option>
              <option value="open">Open questions</option>
              <option value="resolved">Resolved questions</option>
            </select>
          </div>

          {qaError && <p className="fd-feedback fd-error" role="alert">{qaError}</p>}
          {qaSuccess && <p className="fd-feedback fd-success" role="status">{qaSuccess}</p>}

          {qaLoading ? (
            <p className="fd-feedback">Loading student questions...</p>
          ) : visibleQuestions.length === 0 ? (
            <div className="fd-students-empty">
              <MessagesSquare size={30} />
              <strong>No academic questions found</strong>
              <span>
                {qaSearch
                  ? "Try another search term."
                  : "Student questions will appear here when students post them."}
              </span>
            </div>
          ) : (
            <div className="fd-qa-question-list">
              {visibleQuestions.map((question) => (
                <button
                  type="button"
                  key={question.id}
                  className={`fd-qa-question ${qaSelectedQuestion?.id === question.id ? "active" : ""}`}
                  onClick={() => openAcademicQuestion(question)}
                >
                  <span className="fd-qa-question-main">
                    <strong>{question.title}</strong>
                    <small>
                      {question.author_name || "Student"}
                      {question.department_name ? ` · ${question.department_name}` : ""}
                      {question.created_at ? ` · ${new Date(question.created_at).toLocaleDateString()}` : ""}
                    </small>
                    <span>{question.content}</span>
                  </span>
                  <span className="fd-qa-question-side">
                    <em className={question.is_resolved ? "resolved" : "open"}>
                      {question.is_resolved ? "Resolved" : "Open"}
                    </em>
                    <small>{question.answer_count || 0} answers</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {qaSelectedQuestion && (
          <section className="fd-panel fd-qa-detail">
            <div className="fd-panel-heading">
              <div>
                <p className="fd-eyebrow">QUESTION DETAILS</p>
                <h3>{qaSelectedQuestion.title}</h3>
                <p>
                  Asked by {qaSelectedQuestion.author_name || "Student"}
                  {qaSelectedQuestion.created_at
                    ? ` · ${new Date(qaSelectedQuestion.created_at).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <span className={`fd-qa-status ${qaSelectedQuestion.is_resolved ? "resolved" : "open"}`}>
                {qaSelectedQuestion.is_resolved ? "Resolved" : "Open"}
              </span>
            </div>
            <p className="fd-qa-question-content">{qaSelectedQuestion.content}</p>

            <div className="fd-qa-answer-heading">
              <h4>Answers ({qaAnswers.length})</h4>
              <button
                type="button"
                className={qaSelectedQuestion.is_resolved ? "fd-cancel-button" : "fd-qa-resolve"}
                onClick={() => changeAcademicQuestionStatus(qaSelectedQuestion)}
                disabled={qaActionId === qaSelectedQuestion.id}
              >
                {qaSelectedQuestion.is_resolved ? "Reopen Question" : "Mark Resolved"}
              </button>
            </div>

            {qaAnswersLoading ? (
              <p className="fd-feedback">Loading answers...</p>
            ) : qaAnswers.length === 0 ? (
              <div className="fd-qa-empty">No answers yet. Share your guidance below.</div>
            ) : (
              <div className="fd-qa-answer-list">
                {qaAnswers.map((answer) => {
                  const isOwnAnswer = answer.user_id === user?.id;
                  return (
                    <article className="fd-qa-answer" key={answer.id}>
                      <div className="fd-qa-answer-top">
                        <div>
                          <strong>{answer.author_name || "Faculty"}</strong>
                          <small>
                            {answer.author_role || "FACULTY"}
                            {answer.created_at
                              ? ` · ${new Date(answer.created_at).toLocaleString()}`
                              : ""}
                          </small>
                        </div>
                        {answer.is_accepted && <em className="fd-qa-accepted">Accepted answer</em>}
                      </div>
                      <p>{answer.content}</p>
                      <div className="fd-qa-answer-actions">
                        <button
                          type="button"
                          className={answer.has_liked ? "liked" : ""}
                          onClick={() => toggleAcademicAnswerLike(answer)}
                          disabled={qaActionId === answer.id}
                        >
                          <span>♥</span> {answer.like_count || 0}
                        </button>
                        {isOwnAnswer && (
                          <>
                            <button type="button" onClick={() => beginEditAcademicAnswer(answer)}>
                              <Pencil size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => deleteAcademicAnswer(answer)}
                              disabled={qaActionId === answer.id}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {(!qaSelectedQuestion.is_resolved || qaEditingAnswerId) && (
              <form
                className="fd-qa-answer-form"
                onSubmit={qaEditingAnswerId ? saveAcademicAnswer : submitAcademicAnswer}
              >
                <label htmlFor="fd-qa-answer">
                  {qaEditingAnswerId ? "Edit your answer" : "Write an answer"}
                </label>
                <textarea
                  id="fd-qa-answer"
                  rows={4}
                  value={qaAnswerDraft}
                  onChange={(event) => setQaAnswerDraft(event.target.value)}
                  placeholder="Provide a clear and helpful academic answer..."
                  minLength={2}
                  maxLength={10000}
                  required
                />
                <div className="fd-qa-form-actions">
                  <button
                    type="submit"
                    className="fd-save-button"
                    disabled={!qaAnswerDraft.trim() || qaPosting || qaUpdatingAnswer}
                  >
                    {qaPosting
                      ? "Posting..."
                      : qaUpdatingAnswer
                        ? "Updating..."
                        : qaEditingAnswerId
                          ? "Save Answer"
                          : "Post Answer"}
                  </button>
                  {qaEditingAnswerId && (
                    <button
                      type="button"
                      className="fd-cancel-button"
                      onClick={() => {
                        setQaEditingAnswerId(null);
                        setQaAnswerDraft("");
                      }}
                      disabled={qaUpdatingAnswer}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>
        )}
      </section>
    );
  }


  useEffect(() => {
    loadFacultyProfile();
  }, []);

  useEffect(() => {
    if (activeSection === "students") {
      loadFacultyStudents(studentSearch);
    }
  }, [activeSection, studentSearch]);

  useEffect(() => {
    if (activeSection === "materials") {
      loadLearningResources();
    }
  }, [activeSection, resourceCategory, resourceSearch]);

  useEffect(() => {
    if (activeSection === "notices") {
      loadFacultyNotices();
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "messages") return undefined;
    setMessagesError("");
    loadMessageContacts();
    loadMessageConversations();
    const timer = window.setInterval(() => {
      loadMessageConversations();
      if (selectedConversation?.id) {
        loadConversationMessages(selectedConversation.id, true);
      }
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeSection, selectedConversation?.id]);

  async function loadLearningResources() {
    setResourcesLoading(true);
    setResourcesError("");

    try {
      const params = {};

      if (resourceCategory) {
        params.category = resourceCategory;
      }

      if (resourceSearch.trim()) {
        params.search = resourceSearch.trim();
      }

      const response = await api.get("/learning-resources", { params });
      const data = response.data;

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.resources)
            ? data.resources
            : [];

      setResources(items);
    } catch (error) {
      console.error("Load Learning Resources Error:", error);
      setResources([]);
      setResourcesError(
        getApiErrorMessage(error, "Unable to load learning materials.")
      );
    } finally {
      setResourcesLoading(false);
    }
  }

  function handleResourceFormChange(event) {
    const { name, value, files } = event.target;
    setResourceForm((current) => ({
      ...current,
      [name]: name === "file" ? (files?.[0] || null) : value,
    }));
  }

  async function handleResourceUpload(event) {
    event.preventDefault();

    if (!resourceForm.title.trim()) {
      setResourcesError("Please enter a resource title.");
      return;
    }

    if (!resourceForm.semester) {
      setResourcesError("Please select a semester.");
      return;
    }

    if (!resourceForm.file) {
      setResourcesError("Please choose a file to upload.");
      return;
    }

    const allowedExtensions = [
      ".pdf", ".doc", ".docx", ".ppt", ".pptx",
      ".txt", ".xls", ".xlsx",
    ];
    const fileName = resourceForm.file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some((extension) =>
      fileName.endsWith(extension)
    );

    if (!hasValidExtension) {
      setResourcesError(
        "Unsupported file type. Please select PDF, DOC, DOCX, PPT, PPTX, TXT, XLS or XLSX."
      );
      return;
    }

    const maxFileSize = 20 * 1024 * 1024;
    if (resourceForm.file.size > maxFileSize) {
      setResourcesError("File size must not exceed 20 MB.");
      return;
    }

    setUploadingResource(true);
    setResourcesError("");
    setResourcesSuccess("");

    try {
      const formData = new FormData();
      formData.append("title", resourceForm.title.trim());
      formData.append("description", resourceForm.description.trim());
      formData.append("subject", resourceForm.subject.trim());
      formData.append("category", resourceForm.category);
      formData.append("semester", String(Number(resourceForm.semester)));
      formData.append("file", resourceForm.file);

      // Axios will add the multipart boundary for the browser request.
      const response = await api.post(
        "/learning-resources/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResourceForm({
        title: "",
        description: "",
        subject: "",
        category: "notes",
        semester: "",
        file: null,
      });

      const fileInput = document.getElementById("fd-resource-file");
      if (fileInput) {
        fileInput.value = "";
      }

      setResourcesSuccess(
        response.data?.message || "Learning material uploaded successfully."
      );

      await loadLearningResources();
    } catch (error) {
      console.error("Upload Learning Material Error:", error);
      setResourcesError(
        getApiErrorMessage(
          error,
          "Unable to upload this learning material. Check the form and try again."
        )
      );
    } finally {
      setUploadingResource(false);
    }
  }

  async function handleResourceDelete(resource) {
    if (!window.confirm(`Delete "${resource.title}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingResourceId(resource.id);
    setResourcesError("");
    setResourcesSuccess("");
    try {
      await api.delete(`/learning-resources/${resource.id}`);
      setResourcesSuccess("Learning material deleted successfully.");
      await loadLearningResources();
    } catch (error) {
      console.error("Delete Learning Material Error:", error);
      setResourcesError(
        getApiErrorMessage(error, "Unable to delete this learning material.")
      );
    } finally {
      setDeletingResourceId(null);
    }
  }

  async function handleResourceDownload(resource) {
    try {
      const response = await api.get(
        `/learning-resources/${resource.id}/download`,
        { responseType: "blob" }
      );
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: resource.mime_type || "application/octet-stream" })
      );
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = resource.file_name || resource.title || "learning-resource";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download Learning Material Error:", error);
      setResourcesError(
        getApiErrorMessage(error, "Unable to download this learning material.")
      );
    }
  }

  async function loadFacultyProfile() {
    setProfileLoading(true);
    setProfileError("");
    try {
      const response = await api.get("/faculty/me");
      const data = response.data;
      setProfile(data);
      setProfileForm({
        full_name: data.full_name || "",
        employee_id: data.employee_id || "",
        designation: data.designation || "",
        specialization: data.specialization ||"",
        qualification: data.qualification || "",
        experience_years: data.experience_years ?? "",
        office_location: data.office_location || "",
        bio: data.bio || "",
      });
    } catch (error) {
      console.error("Load Faculty Profile Error:", error);
      setProfileError(
        getApiErrorMessage(error, "Unable to load your faculty profile.")
      );
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadFacultyStudents(search = "") {
    setStudentsLoading(true);
    setStudentsError("");
    try {
      const response = await api.get("/faculty/students", {
        params: { skip: 0, limit: 100, ...(search.trim() ? { search: search.trim() } : {}) },
      });
      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      setStudents(items);
      setStudentsTotal(response.data?.total ?? items.length);
    } catch (error) {
      setStudents([]);
      setStudentsTotal(0);
      console.error("Load Faculty Students Error:", error);
      setStudentsError(
        getApiErrorMessage(error, "Unable to load students from your department.")
      );
    } finally {
      setStudentsLoading(false);
    }
  }

  async function openStudentProfile(student) {
    if (!student?.id) return;

    setSelectedStudentProfile(null);
    setStudentProfileError("");
    setStudentProfileLoading(true);

    try {
      const response = await api.get(`/faculty/students/${student.id}`);
      setSelectedStudentProfile(response.data);
    } catch (error) {
      console.error("Load Student Profile Error:", error);
      setStudentProfileError(
        getApiErrorMessage(error, "Unable to load this student's profile.")
      );
    } finally {
      setStudentProfileLoading(false);
    }
  }

  function closeStudentProfile() {
    setSelectedStudentProfile(null);
    setStudentProfileError("");
    setStudentProfileLoading(false);
  }

  function safeProfileUrl(value) {
    if (!value || typeof value !== "string") return null;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function handleStudentSearch(event) {
    event.preventDefault();
    setStudentSearch(studentSearchInput);
  }

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current,[name]: value }));
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    const payload = {
      ...profileForm,
      experience_years:
        profileForm.experience_years === ""
          ? null
          : Number(profileForm.experience_years),
    };

    try {
      const response = await api.put("/faculty/me/profile", payload);
      setProfile(response.data);
      setProfileForm({
        full_name: response.data.full_name || "",
        employee_id: response.data.employee_id|| "",
        designation: response.data.designation|| "",
        specialization: response.data.specialization || "",
        qualification: response.data.qualification || "",
        experience_years: response.data.experience_years ?? "",
        office_location: response.data.office_location || "",
        bio: response.data.bio || "",
      });
      setEditingProfile(false);
      setProfileSuccess("Your profile has beenupdated successfully.");
    } catch (error) {
      console.error("Update Faculty Profile Error:", error);
      setProfileError(
        getApiErrorMessage(error, "Unable to update your profile.")
      );
    } finally {
      setSavingProfile(false);
    }
  }

  const fullName = profile?.full_name || user?.full_name || "Faculty Member";
  const initials = initialsFromName(fullName);
  const departmentName = profile?.department_name || user?.department_name || user?.department?.name || "Not assigned";
  const collegeName = profile?.college_name ||user?.college_name || user?.college?.name || "Your college";

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Logout could not be completed. Please try again.");
      setLoggingOut(false);
    }
  }

  function openSection(section) {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }

  function renderOverview() {
    return (
      <>
        <section className="fd-welcome">
          <div>
            <p className="fd-eyebrow">FACULTY WORKSPACE</p>
            <h2>Welcome, {fullName.split(/\s+/)[0]}!</h2>
            <p>Manage your academic activitiesand stay connected with your campus.</p>
          </div>
          <div className="fd-welcome-icon"><GraduationCap size={39} /></div>
        </section>

        <section className="fd-stat-grid" aria-label="Faculty summary">
          <article className="fd-stat-card">
            <span className="fd-stat-icon purple"><Users size={20} /></span>
            <div><small>Department</small><strong>{departmentName}</strong></div>
          </article>
          <article className="fd-stat-card">
            <span className="fd-stat-icon blue"><Building2 size={20} /></span>
            <div><small>College</small><strong>{collegeName}</strong></div>
          </article>
          <article className="fd-stat-card">
            <span className="fd-stat-icon cyan"><ShieldCheck size={20} /></span>
            <div><small>Account status</small><strong className={user?.is_active ? "fd-active" : ""}>{user?.is_active ? "Active" : "Not verified"}</strong></div>
          </article>
        </section>

        <section className="fd-panel">
          <div className="fd-panel-heading">
            <div><h3>Faculty Quick Access</h3><p>Choose a module to continue your work.</p></div>
          </div>
          <div className="fd-quick-grid">
            {facultyNavigation.filter((item) => item.id !== "overview").map(({ id, label, icon: Icon, tag }) => (
              <button className="fd-quick-item" key={id} onClick={() => openSection(id)}>
                <span><Icon size={19} /></span>
                <strong>{label}{tag && <em> {tag}</em>}</strong>
                <ChevronRight size={17} className="fd-arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="fd-panel fd-account-panel">
          <div className="fd-panel-heading"><div><h3>Account Information</h3><p>Your signed-in faculty account.</p></div></div>
          <div className="fd-account-row"><span>Name</span><strong>{fullName}</strong></div>
          <div className="fd-account-row"><span>Email</span><strong>{profile?.email || user?.email || "Not available"}</strong></div>
          <div className="fd-account-row"><span>Role</span><strong>Faculty</strong></div>
          <div className="fd-account-row"><span>Department</span><strong>{departmentName}</strong></div>
        </section>
      </>
    );
  }

  function renderProfile() {
    const fields = [
      ["Employee ID", "employee_id"],
      ["Designation", "designation"],
      ["Specialization", "specialization"],
      ["Qualification", "qualification"],
      ["Experience (years)", "experience_years"],
      ["Office Location", "office_location"],
    ];

    return (
      <section className="fd-panel fd-profile-panel">
        <div className="fd-profile-heading">
          <span className="fd-avatar fd-avatar-large">{initials}</span>
          <div>
            <h3>{profile?.full_name || fullName}</h3>
            <p>{profile?.designation || "Faculty Member"}</p>
          </div>
          <button
            type="button"
            className="fd-edit-button"
            onClick={() => {
              setProfileError("");
              setProfileSuccess("");
              setEditingProfile((current) => !current);
            }}
            disabled={profileLoading || savingProfile}
          >
            {editingProfile ? "Cancel Editing": "Edit Profile"}
          </button>
        </div>

        {profileLoading && <p className="fd-feedback">Loading faculty profile...</p>}
        {profileError && <p className="fd-feedback fd-error" role="alert">{profileError}</p>}
        {profileSuccess && <p className="fd-feedback fd-success" role="status">{profileSuccess}</p>}

        {!profileLoading && (
          <>
            {editingProfile ? (
              <form className="fd-profile-form" onSubmit={handleProfileSave}>
                <label>
                  Full Name
                  <input name="full_name" value={profileForm.full_name} onChange={handleProfileChange} required minLength={2} maxLength={150} />
                </label>
                <label>
                  Email Address
                  <input value={profile?.email|| user?.email || ""} disabled />
                </label>
                {fields.map(([label, name]) =>(
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      type={name === "experience_years" ? "number" : "text"}
                      min={name === "experience_years" ? 0 : undefined}
                      max={name === "experience_years" ? 60 : undefined}
                      value={profileForm[name]}
                      onChange={handleProfileChange}
                    />
                  </label>
                ))}
                <label className="fd-full-width">
                  Bio
                  <textarea name="bio" rows={4} maxLength={1000} value={profileForm.bio} onChange={handleProfileChange} />
                </label>
                <div className="fd-full-width fd-form-actions">
                  <button className="fd-save-button" type="submit" disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="fd-cancel-button" type="button" onClick={() => setEditingProfile(false)} disabled={savingProfile}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="fd-profile-grid">
                <div className="fd-profile-field"><small>Full name</small><strong>{profile?.full_name || fullName}</strong></div>
                <div className="fd-profile-field"><small>Email address</small><strong>{profile?.email || user?.email || "Not available"}</strong></div>
                <div className="fd-profile-field"><small>College</small><strong>{profile?.college_name || collegeName}</strong></div>
                <div className="fd-profile-field"><small>Department</small><strong>{profile?.department_name || departmentName}</strong></div>
                {fields.map(([label, name]) =>(
                  <div className="fd-profile-field" key={name}>
                    <small>{label}</small>
                    <strong>{profile?.[name] ?? "Not available"}{name === "experience_years" && profile?.[name] != null ? " years" : ""}</strong>
                  </div>
                ))}
                <div className="fd-profile-field fd-full-width"><small>Bio</small><strong>{profile?.bio || "No bio added yet."}</strong></div>
              </div>
            )}
          </>
        )}
      </section>
    );
  }

  function renderStudents() {
    return (
      <section className="fd-panel">
        <div className="fd-panel-heading fd-students-heading">
          <div>
            <h3>Department Student Directory</h3>
            <p>{studentsTotal} student{studentsTotal === 1 ? "" : "s"} in your assigned department</p>
          </div>
          <button
            type="button"
            className="fd-edit-button"
            onClick={() => loadFacultyStudents(studentSearch)}
            disabled={studentsLoading}
          >
            {studentsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <form className="fd-student-search" onSubmit={handleStudentSearch}>
          <input
            type="search"
            value={studentSearchInput}
            autoComplete="off"
            onChange={(event) => setStudentSearchInput(event.target.value)}
            placeholder="Search by student name, email or roll number"
            aria-label="Search students"
          />
          <button type="submit" className="fd-save-button">Search</button>
          {studentSearch && (
            <button
              type="button"
              className="fd-cancel-button"
              onClick={() => {
                setStudentSearchInput("");
                setStudentSearch("");
              }}
            >
              Clear
            </button>
          )}
        </form>

        {studentsError && <p className="fd-feedback fd-error" role="alert">{studentsError}</p>}
        {studentsLoading ? (
          <p className="fd-feedback">Loading department students...</p>
        ) : students.length === 0 ? (
          <div className="fd-students-empty">
            <Users size={30} />
            <strong>No students found</strong>
            <span>
              {studentSearch
                ? "Try another name, email or roll number."
                : "There are currently no registered students in your assigned department."}
            </span>
          </div>
        ) : (
          <div className="fd-table-wrap">
            <table className="fd-students-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Semester</th>
                  <th>Section</th>
                  <th>Email</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.full_name}</strong>
                      <small>{student.department_name || departmentName}</small>
                    </td>
                    <td>{student.roll_number || "—"}</td>
                    <td>{student.current_semester ? `Semester ${student.current_semester}` : "—"}</td>
                    <td>{student.section || "—"}</td>
                    <td><a href={`mailto:${student.email}`}>{student.email}</a></td>
                    <td>
                      <button
                        type="button"
                        className="fd-view-student-button"
                        onClick={() => openStudentProfile(student)}
                        aria-label={`View ${student.full_name}'s profile`}
                      >
                        <UserRound size={14} /> View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderLearningMaterials() {
    const categories = [
      ["notes", "Notes"],
      ["assignment", "Assignments"],
      ["question_paper", "Question Papers"],
      ["syllabus", "Syllabus"],
      ["reference", "Reference"],
      ["other", "Other"],
    ];

    return (
      <>
        <section className="fd-panel">
          <div className="fd-panel-heading">
            <div>
              <h3>Upload Learning Material</h3>
              <p>Share resources with students in your assigned department.</p>
            </div>
          </div>
          <form className="fd-resource-form" onSubmit={handleResourceUpload}>
            <label>
              Resource Title *
              <input name="title" value={resourceForm.title} onChange={handleResourceFormChange}
                placeholder="e.g. Python Unit 1 Notes" required maxLength={180} />
            </label>
            <label>
              Subject
              <input name="subject" value={resourceForm.subject} onChange={handleResourceFormChange}
                placeholder="e.g. Python Programming" maxLength={120} />
            </label>
            <label>
              Category *
              <select name="category" value={resourceForm.category} onChange={handleResourceFormChange} required>
                {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Semester (1–8) *
              <select name="semester" value={resourceForm.semester} onChange={handleResourceFormChange} required>
                <option value="">Select semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) =>
                  <option key={semester} value={semester}>{`Semester ${semester}`}</option>
                )}
              </select>
            </label>
            <label className="fd-resource-description fd-full-width">
              Description
              <textarea name="description" rows={3} value={resourceForm.description}
                onChange={handleResourceFormChange} placeholder="Briefly describe this resource..." maxLength={1000} />
            </label>
            <label className="fd-resource-file fd-full-width">
              Select File * <span>PDF, DOC, DOCX, PPT, PPTX, TXT, XLS or XLSX · Max 20 MB</span>
              <input id="fd-resource-file" name="file" type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xls,.xlsx"
                onChange={handleResourceFormChange} required />
              {resourceForm.file && <small>Selected: {resourceForm.file.name}</small>}
            </label>
            <div className="fd-full-width fd-form-actions">
              <button className="fd-save-button" type="submit" disabled={uploadingResource}>
                {uploadingResource ? "Uploading..." : "Upload Material"}
              </button>
              <button className="fd-cancel-button" type="button" disabled={uploadingResource}
                onClick={() => {
                  setResourceForm({ title: "", description: "", subject: "", category: "notes", semester: "", file: null });
                  const input = document.getElementById("fd-resource-file");
                  if (input) input.value = "";
                }}>
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="fd-panel">
          <div className="fd-panel-heading fd-students-heading">
            <div>
              <h3>Department Learning Materials</h3>
              <p>{resources.length} resource{resources.length === 1 ? "" : "s"} available in your department</p>
            </div>
            <button type="button" className="fd-edit-button" onClick={loadLearningResources} disabled={resourcesLoading}>
              {resourcesLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="fd-resource-filters">
            <input type="search" value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)}
              placeholder="Search title, subject or description..." aria-label="Search learning materials" />
            <select value={resourceCategory} onChange={(event) => setResourceCategory(event.target.value)} aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {resourcesError && <p className="fd-feedback fd-error" role="alert">{resourcesError}</p>}
          {resourcesSuccess && <p className="fd-feedback fd-success" role="status">{resourcesSuccess}</p>}
          {resourcesLoading ? (
            <p className="fd-feedback">Loading learning materials...</p>
          ) : resources.length === 0 ? (
            <div className="fd-students-empty">
              <BookOpen size={30} />
              <strong>No learning materials found</strong>
              <span>Upload a resource above or change your search/filter.</span>
            </div>
          ) : (
            <div className="fd-resource-list">
              {resources.map((resource) => (
                <article className="fd-resource-card" key={resource.id}>
                  <span className="fd-resource-icon"><BookOpen size={20} /></span>
                  <div className="fd-resource-details">
                    <strong>{resource.title}</strong>
                    <p>{resource.description || "No description provided."}</p>
                    <div className="fd-resource-meta">
                      <span>{resource.subject || "General"}</span>
                      <span>{String(resource.category || "other").replaceAll("_", " ")}</span>
                      <span>{resource.semester ? `Semester ${resource.semester}` : "All semesters"}</span>
                      <span>{resource.file_name || "Attached file"}</span>
                    </div>
                  </div>
                  <div className="fd-resource-actions">
                    <button type="button" className="fd-edit-button" onClick={() => handleResourceDownload(resource)}>Download</button>
                    {resource.uploaded_by === user?.id && (
                      <button type="button" className="fd-delete-button" onClick={() => handleResourceDelete(resource)}
                        disabled={deletingResourceId === resource.id}>
                        {deletingResourceId === resource.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </>
    );
  }


  async function loadFacultyNotices() {
    setNoticesLoading(true);
    setNoticeError("");
    try {
      const { data } = await api.get("/notices/admin?skip=0&limit=100");
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.results)
            ? data.results
            : [];
      setNotices(items);
    } catch (error) {
      console.error("Load Faculty Notices Error:", error);
      setNotices([]);
      setNoticeError(getApiErrorMessage(error, "Unable to load campus notices."));
    } finally {
      setNoticesLoading(false);
    }
  }

  function resetNoticeForm() {
    setNoticeForm({
      title: "",
      content: "",
      category: "General",
      priority: "Normal",
      expires_at: "",
    });
    setEditingNoticeId(null);
  }

  function handleNoticeFormChange(event) {
    const { name, value } = event.target;
    setNoticeForm((current) => ({ ...current, [name]: value }));
  }

  function toLocalDateTimeInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  async function handleNoticeSubmit(event) {
    event.preventDefault();
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      setNoticeError("Notice title and content are required.");
      return;
    }

    const payload = {
      title: noticeForm.title.trim(),
      content: noticeForm.content.trim(),
      category: noticeForm.category,
      priority: noticeForm.priority,
      expires_at: noticeForm.expires_at
        ? new Date(noticeForm.expires_at).toISOString()
        : null,
    };

    setNoticeSaving(true);
    setNoticeError("");
    setNoticeSuccess("");
    try {
      if (editingNoticeId) {
        await api.put(`/notices/${editingNoticeId}`, payload);
        setNoticeSuccess("Notice updated successfully.");
      } else {
        await api.post("/notices", payload);
        setNoticeSuccess("Notice created successfully as a draft.");
      }
      resetNoticeForm();
      await loadFacultyNotices();
    } catch (error) {
      console.error("Save Faculty Notice Error:", error);
      setNoticeError(getApiErrorMessage(error, "Unable to save notice. Please try again."));
    } finally {
      setNoticeSaving(false);
    }
  }

  function handleEditNotice(notice) {
    setEditingNoticeId(notice.id);
    setNoticeForm({
      title: notice.title || "",
      content: notice.content || "",
      category: notice.category || "General",
      priority: notice.priority || "Normal",
      expires_at: toLocalDateTimeInput(notice.expires_at),
    });
    setNoticeError("");
    setNoticeSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleToggleNoticePublish(notice) {
    setNoticeError("");
    setNoticeSuccess("");
    try {
      await api.patch(`/notices/${notice.id}/publish`);
      setNoticeSuccess(
        notice.is_published
          ? "Notice unpublished successfully."
          : "Notice published successfully."
      );
      await loadFacultyNotices();
    } catch (error) {
      console.error("Toggle Notice Publish Error:", error);
      setNoticeError(
        getApiErrorMessage(error, "Unable to change notice publication status.")
      );
    }
  }

  async function handleDeleteNotice(noticeId) {
    if (!window.confirm("Are you sure you want to delete this notice?")) return;
    setNoticeError("");
    setNoticeSuccess("");
    try {
      await api.delete(`/notices/${noticeId}`);
      setNotices((current) => current.filter((notice) => notice.id !== noticeId));
      if (editingNoticeId === noticeId) resetNoticeForm();
      setNoticeSuccess("Notice deleted successfully.");
    } catch (error) {
      console.error("Delete Faculty Notice Error:", error);
      setNoticeError(getApiErrorMessage(error, "Unable to delete this notice."));
    }
  }

  function renderNotices() {
    const categories = ["General", "Academic", "Examination", "Event", "Placement", "Holiday"];
    return (
      <section className="fd-notices">
        <section className="fd-panel">
          <div className="fd-panel-heading">
            <div>
              <p className="fd-eyebrow">CAMPUS COMMUNICATION</p>
              <h3>{editingNoticeId ? "Edit Notice" : "Create New Notice"}</h3>
              <p>Share official academic updates with your college community.</p>
            </div>
            {editingNoticeId && (
              <button
                type="button"
                className="fd-cancel-button fd-notice-cancel"
                onClick={() => {
                  resetNoticeForm();
                  setNoticeError("");
                  setNoticeSuccess("");
                }}
              >
                <X size={14} /> Cancel edit
              </button>
            )}
          </div>

          {noticeError && <p className="fd-feedback fd-error" role="alert">{noticeError}</p>}
          {noticeSuccess && <p className="fd-feedback fd-success" role="status">{noticeSuccess}</p>}

          <form className="fd-notice-form" onSubmit={handleNoticeSubmit}>
            <label className="fd-notice-full">
              Notice Title *
              <input
                name="title"
                value={noticeForm.title}
                onChange={handleNoticeFormChange}
                placeholder="Enter notice title"
                maxLength={200}
                required
              />
            </label>
            <label>
              Category
              <select name="category" value={noticeForm.category} onChange={handleNoticeFormChange}>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select name="priority" value={noticeForm.priority} onChange={handleNoticeFormChange}>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>
            <label>
              Expiry Date (optional)
              <input
                type="datetime-local"
                name="expires_at"
                value={noticeForm.expires_at}
                onChange={handleNoticeFormChange}
              />
            </label>
            <label className="fd-notice-full">
              Notice Content *
              <textarea
                name="content"
                rows={5}
                value={noticeForm.content}
                onChange={handleNoticeFormChange}
                placeholder="Write the complete notice..."
                maxLength={10000}
                required
              />
            </label>
            <div className="fd-notice-actions fd-notice-full">
              <button type="submit" className="fd-save-button" disabled={noticeSaving}>
                {noticeSaving ? "Saving..." : editingNoticeId ? "Update Notice" : <><Plus size={15} /> Create Draft</>}
              </button>
              <button
                type="button"
                className="fd-cancel-button"
                disabled={noticeSaving}
                onClick={() => {
                  resetNoticeForm();
                  setNoticeError("");
                  setNoticeSuccess("");
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="fd-panel">
          <div className="fd-panel-heading fd-students-heading">
            <div>
              <h3>Manage Notices</h3>
              <p>{notices.length} notice{notices.length === 1 ? "" : "s"} created by your college</p>
            </div>
            <button
              type="button"
              className="fd-edit-button"
              onClick={loadFacultyNotices}
              disabled={noticesLoading}
            >
              <RefreshCw size={14} /> {noticesLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {noticesLoading ? (
            <p className="fd-feedback">Loading campus notices...</p>
          ) : notices.length === 0 ? (
            <div className="fd-students-empty">
              <Bell size={30} />
              <strong>No notices created yet</strong>
              <span>Create your first notice using the form above.</span>
            </div>
          ) : (
            <div className="fd-notice-list">
              {notices.map((notice) => (
                <article className="fd-notice-card" key={notice.id}>
                  <div className="fd-notice-card-main">
                    <div className="fd-notice-card-heading">
                      <strong>{notice.title}</strong>
                      <span className={notice.is_published ? "fd-notice-status published" : "fd-notice-status draft"}>
                        {notice.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p>{notice.content}</p>
                    <div className="fd-notice-meta">
                      <span>{notice.category || "General"}</span>
                      <span className={`priority-${String(notice.priority || "Normal").toLowerCase()}`}>
                        {notice.priority || "Normal"} priority
                      </span>
                      <span>{notice.expires_at ? `Expires ${new Date(notice.expires_at).toLocaleString()}` : "No expiry"}</span>
                    </div>
                  </div>
                  <div className="fd-notice-card-actions">
                    <button type="button" className="fd-edit-button" onClick={() => handleEditNotice(notice)}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      className="fd-notice-publish"
                      onClick={() => handleToggleNoticePublish(notice)}
                    >
                      {notice.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <button type="button" className="fd-delete-button" onClick={() => handleDeleteNotice(notice.id)}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    );
  }

  async function loadMessageContacts() {
    try {
      const { data } = await api.get("/messages/contacts");
      setMessageContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessagesError(getApiErrorMessage(error, "Unable to load student contacts."));
    }
  }

  async function loadMessageConversations() {
    try {
      const { data } = await api.get("/messages/conversations");
      const items = Array.isArray(data?.items) ? data.items : [];
      setMessageConversations(items);
      if (selectedConversation?.id) {
        const refreshed = items.find((item) => item.id === selectedConversation.id);
        if (refreshed) setSelectedConversation(refreshed);
      }
    } catch (error) {
      setMessagesError(getApiErrorMessage(error, "Unable to load conversations."));
    }
  }

  async function loadConversationMessages(conversationId, quiet = false) {
    if (!conversationId) return;
    if (!quiet) setMessagesLoading(true);
    try {
      const { data } = await api.get(`/messages/conversations/${conversationId}/messages`, {
        params: { skip: 0, limit: 100 },
      });
      setConversationMessages(Array.isArray(data?.items) ? data.items : []);
      await api.patch(`/messages/conversations/${conversationId}/read`);
      await loadMessageConversations();
    } catch (error) {
      setMessagesError(getApiErrorMessage(error, "Unable to load this conversation."));
    } finally {
      if (!quiet) setMessagesLoading(false);
    }
  }

  async function openMessageConversation(contact) {
    setMessagesError("");
    setMessagesSuccess("");
    setMessagesLoading(true);
    try {
      const { data } = await api.post(`/messages/conversations/${contact.id}`);
      setSelectedConversation(data);
      setConversationMessages([]);
      await loadMessageConversations();
      await loadConversationMessages(data.id);
    } catch (error) {
      setMessagesError(getApiErrorMessage(error, "Unable to open this conversation."));
    } finally {
      setMessagesLoading(false);
    }
  }

  async function selectMessageConversation(conversation) {
    setSelectedConversation(conversation);
    setMessagesError("");
    setMessagesSuccess("");
    await loadConversationMessages(conversation.id);
  }

  async function sendDirectMessage(event) {
    event.preventDefault();
    const content = messageDraft.trim();
    if (!content || !selectedConversation?.id || messageSending) return;
    setMessageSending(true);
    setMessagesError("");
    setMessagesSuccess("");
    try {
      await api.post(`/messages/conversations/${selectedConversation.id}/messages`, { content });
      setMessageDraft("");
      await loadConversationMessages(selectedConversation.id, true);
      setMessagesSuccess("Message sent.");
    } catch (error) {
      setMessagesError(getApiErrorMessage(error, "Unable to send your message."));
    } finally {
      setMessageSending(false);
    }
  }

  function renderMessages() {
    const filteredContacts = messageContacts.filter((contact) =>
      `${contact.full_name || ""} ${contact.email || ""} ${contact.department_name || ""}`
        .toLowerCase()
        .includes(messageContactSearch.toLowerCase())
    );

    return (
      <section className="fd-messages">
        <section className="fd-panel">
          <div className="fd-panel-heading">
            <div>
              <p className="fd-eyebrow">PRIVATE CAMPUS CHAT</p>
              <h3>Messages</h3>
              <p>Connect directly with active students in your college.</p>
            </div>
            <button type="button" className="fd-edit-button" onClick={() => {
              loadMessageContacts();
              loadMessageConversations();
              if (selectedConversation?.id) loadConversationMessages(selectedConversation.id);
            }}><RefreshCw size={14}/> Refresh</button>
          </div>
          {messagesError && <p className="fd-feedback fd-error" role="alert">{messagesError}</p>}
          {messagesSuccess && <p className="fd-feedback fd-success" role="status">{messagesSuccess}</p>}
          <div className="fd-message-layout">
            <aside className="fd-message-sidebar">
              <label className="fd-message-search"><Search size={15}/><input value={messageContactSearch} onChange={(event) => setMessageContactSearch(event.target.value)} placeholder="Search students..."/></label>
              <h4>Conversations</h4>
              <div className="fd-message-contact-list">
                {messageConversations.map((conversation) => (
                  <button type="button" key={conversation.id} className={`fd-message-contact ${selectedConversation?.id === conversation.id ? "active" : ""}`} onClick={() => selectMessageConversation(conversation)}>
                    <span className="fd-message-avatar">{(conversation.participant_name || "S").split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <span className="fd-message-contact-copy"><strong>{conversation.participant_name}</strong><small>{conversation.last_message || conversation.participant_role}</small></span>
                    {conversation.unread_count > 0 && <em>{conversation.unread_count}</em>}
                  </button>
                ))}
                {messageConversations.length === 0 && <p className="fd-message-empty-small">No conversations yet. Select a student below.</p>}
              </div>
              <h4 className="fd-message-contacts-title">Student Directory</h4>
              <div className="fd-message-contact-list">
                {filteredContacts.map((contact) => (
                  <button type="button" key={contact.id} className="fd-message-contact" onClick={() => openMessageConversation(contact)}>
                    <span className="fd-message-avatar">{(contact.full_name || "S").split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <span className="fd-message-contact-copy"><strong>{contact.full_name}</strong><small>{contact.department_name || "Student"} · {contact.email}</small></span>
                  </button>
                ))}
                {filteredContacts.length === 0 && <p className="fd-message-empty-small">No matching students found.</p>}
              </div>
            </aside>
            <div className="fd-message-chat">
              {selectedConversation ? (
                <>
                  <header className="fd-message-chat-header">
                    <span className="fd-message-avatar large">{(selectedConversation.participant_name || "S").split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <div><strong>{selectedConversation.participant_name}</strong><small>{selectedConversation.department_name || "Student"} · {selectedConversation.participant_email || ""}</small></div>
                  </header>
                  <div className="fd-message-history">
                    {messagesLoading && conversationMessages.length === 0 ? <p className="fd-message-empty">Loading messages...</p> :
                      conversationMessages.length === 0 ? <p className="fd-message-empty">No messages yet. Start the conversation.</p> :
                      conversationMessages.map((message) => {
                        const own = message.sender_id === user?.id;
                        return <div key={message.id} className={`fd-message-row ${own ? "own" : ""}`}><div className="fd-message-bubble">{!own && <strong>{message.sender_name}</strong>}<p>{message.content}</p><small>{message.created_at ? new Date(message.created_at).toLocaleString() : ""}{own && message.read_at ? " · Read" : ""}</small></div></div>;
                      })}
                  </div>
                  <form className="fd-message-compose" onSubmit={sendDirectMessage}>
                    <input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} maxLength={5000} placeholder="Write a message..." aria-label="Write a message"/>
                    <button type="submit" className="fd-save-button" disabled={messageSending || !messageDraft.trim()}><Send size={15}/>{messageSending ? "Sending..." : "Send"}</button>
                  </form>
                </>
              ) : (
                <div className="fd-message-empty"><MessageCircle size={38}/><h3>Your campus conversations</h3><p>Select an existing conversation or choose a student to start messaging.</p></div>
              )}
            </div>
          </div>
        </section>
      </section>
    );
  }

  function renderPending(section) {
    const item = pendingModules[section];
    const Icon = item.icon;
    return (
      <section className="fd-pending">
        <span className="fd-pending-icon"><Icon size={31} /></span>
        <p className="fd-eyebrow">FACULTY MODULE</p>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
        <span className="fd-pending-badge"><Clock3 size={14} /> UI ready · Backend integration pending</span>
      </section>
    );
  }

  return (
    <main ref={dashboardRef} className="fd-dashboard" style={{ zoom: dashboardZoom / 100 }}>
      <style>{`
        .fd-dashboard{min-height:100vh;background:#0b1020;color:#edf2ff;display:flex;font-family:Inter,system-ui,sans-serif}
        .fd-sidebar{width:264px;flex-shrink:0;background:#101729;border-right:1px solid #26334b;padding:22px 15px;display:flex;flex-direction:column;position:fixed;inset:0 auto 0 0;z-index:30;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#35435f transparent}
        .fd-brand{display:flex;align-items:center;gap:10px;padding:4px 10px 25px;color:#f8faff;text-decoration:none;font-size:19px;font-weight:750}.fd-brand b{color:#a78bfa}.fd-brand-mark{width:39px;height:39px;border-radius:12px;background:#29234e;color:#b9a2ff;display:grid;place-items:center}
        .fd-side-label{font-size:10px;letter-spacing:1.5px;color:#75839d;font-weight:800;padding:12px 12px 9px}.fd-nav-list{display:grid;gap:5px}.fd-nav-item{border:0;background:transparent;color:#aab7ce;padding:11px 12px;border-radius:10px;display:flex;align-items:center;gap:12px;text-align:left;font-size:13px;font-weight:600;cursor:pointer;width:100%}.fd-nav-item:hover{background:#1b2740;color:#fff}.fd-nav-item.active{background:linear-gradient(100deg,rgba(124,88,235,.24),rgba(58,151,210,.12));color:#c4b5fd;box-shadow:inset 3px 0 #9875ff}.fd-nav-item em{margin-left:auto;font-style:normal;font-size:9px;background:#33245d;color:#c4b5fd;padding:3px 6px;border-radius:5px}
        .fd-sidebar-bottom{margin-top:auto;border-top:1px solid #27334a;padding-top:13px}.fd-user-mini{display:flex;align-items:center;gap:10px;padding:10px 8px}.fd-avatar{width:39px;height:39px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#8058e8,#39a9d2);font-weight:800;color:#fff;flex-shrink:0}.fd-user-mini strong,.fd-user-mini small{display:block;max-width:155px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fd-user-mini strong{font-size:12px}.fd-user-mini small{font-size:10px;color:#8796b0;margin-top:3px}
        .fd-main{margin-left:264px;min-width:0;flex:1}.fd-topbar{height:76px;border-bottom:1px solid #26334b;display:flex;align-items:center;justify-content:space-between;padding:0 34px;background:rgba(13,19,35,.96);position:sticky;top:0;z-index:20}.fd-topbar-left{display:flex;align-items:center;gap:13px}.fd-topbar h1{font-size:19px;margin:0}.fd-topbar p{font-size:11px;color:#8f9db5;margin:5px 0 0}.fd-top-actions{display:flex;align-items:center;gap:12px}.fd-icon-button{width:38px;height:38px;border:1px solid #2b3851;border-radius:10px;background:#151f33;color:#b7c4dc;display:grid;place-items:center;cursor:pointer}.fd-logout{min-height:38px;padding:0 13px;border:1px solid #35445f;border-radius:10px;background:#1c2a40;color:#e7edfa;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-size:11px;font-weight:650;white-space:nowrap;cursor:pointer}.fd-logout:hover{background:#273955;border-color:#6c5bb1}.fd-logout:disabled{opacity:.65;cursor:not-allowed}.fd-top-user{display:flex;align-items:center;gap:9px;padding-left:12px;border-left:1px solid #2b3851}.fd-top-user strong,.fd-top-user small{display:block}.fd-top-user strong{font-size:11px}.fd-top-user small{font-size:10px;color:#8492aa;margin-top:3px}.fd-mobile-menu{display:none}
        .fd-content{padding:30px 34px 48px;width:100%;box-sizing:border-box}.fd-welcome{border:1px solid #3a3b72;border-radius:18px;padding:27px 30px;background:radial-gradient(circle at 90% 20%,rgba(62,169,212,.2),transparent 35%),linear-gradient(110deg,#211d43,#17223b);display:flex;align-items:center;justify-content:space-between;gap:20px}.fd-eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:800;color:#a995ff;margin:0 0 10px}.fd-welcome h2{font-size:25px;margin:0 0 8px}.fd-welcome p:last-child{margin:0;color:#aab9d2;font-size:13px;line-height:1.6}.fd-welcome-icon{width:75px;height:75px;border-radius:20px;background:#ffffff12;color:#c1adff;display:grid;place-items:center;flex-shrink:0}
        .fd-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin:20px 0}.fd-stat-card{background:#141e31;border:1px solid #293750;border-radius:14px;padding:17px;display:flex;align-items:center;gap:12px;min-width:0}.fd-stat-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}.fd-stat-icon.purple{background:#302454;color:#bda6ff}.fd-stat-icon.blue{background:#1c3557;color:#7ebaff}.fd-stat-icon.cyan{background:#173d4a;color:#6bd5e8}.fd-stat-card small,.fd-stat-card strong{display:block}.fd-stat-card small{font-size:10px;color:#8796af;margin-bottom:5px}.fd-stat-card strong{font-size:12px;overflow-wrap:anywhere}.fd-active{color:#64d6a3}
        .fd-panel{background:#141e31;border:1px solid #293750;border-radius:15px;padding:21px;margin-top:16px}.fd-panel-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:17px}.fd-panel-heading h3{font-size:15px;margin:0}.fd-panel-heading p{font-size:11px;color:#8998b2;margin:5px 0 0}.fd-quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fd-quick-item{display:flex;align-items:center;gap:10px;min-height:66px;text-align:left;padding:12px;border:1px solid #2b3952;border-radius:11px;background:#101a2c;color:#e5ebf8;cursor:pointer}.fd-quick-item:hover{border-color:#8c6ce9;background:#1b2340}.fd-quick-item>span{width:35px;height:35px;border-radius:9px;background:#29234e;color:#b9a4ff;display:grid;place-items:center;flex-shrink:0}.fd-quick-item strong{font-size:11px;line-height:1.4}.fd-quick-item em{font-size:9px;font-style:normal;color:#b9a4ff}.fd-arrow{margin-left:auto;color:#7888a3;flex-shrink:0}
        .fd-account-row{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-top:1px solid #293750;font-size:11px}.fd-account-row span{color:#8d9bb2}.fd-account-row strong{text-align:right;overflow-wrap:anywhere}.fd-profile-heading{display:flex;align-items:center;gap:14px;padding-bottom:20px;border-bottom:1px solid #2b3952}.fd-avatar-large{width:62px;height:62px;font-size:19px}.fd-profile-heading h3{font-size:18px;margin:0 0 5px}.fd-profile-heading p{font-size:11px;color:#91a0ba;margin:0}.fd-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;padding-top:20px}.fd-profile-field{padding:14px;border:1px solid #2b3952;border-radius:10px;background:#101a2c;min-width:0}.fd-profile-field small,.fd-profile-field strong{display:block}.fd-profile-field small{font-size:10px;color:#8493ad;margin-bottom:7px}.fd-profile-field strong{font-size:12px;overflow-wrap:anywhere}.fd-note{font-size:11px;color:#a995ff;margin:18px 0 0}
        .fd-edit-button{margin-left:auto;border:1px solid #6553a5;border-radius:9px;background:#29234e;color:#d7cbff;padding:9px 13px;font:600 11px Inter,system-ui,sans-serif;cursor:pointer}.fd-edit-button:disabled{opacity:.6;cursor:not-allowed}
        .fd-profile-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding-top:20px}.fd-profile-form label{display:grid;gap:7px;color:#9aa9c2;font-size:11px}.fd-profile-form input,.fd-profile-form textarea{width:100%;box-sizing:border-box;border:1px solid #35445f;border-radius:9px;background:#101a2c;color:#edf2ff;padding:11px;font:12px Inter,system-ui,sans-serif;outline:none}.fd-profile-form input:focus,.fd-profile-form textarea:focus{border-color:#9875ff}.fd-profile-form input:disabled{opacity:.65}.fd-full-width{grid-column:1/-1}.fd-form-actions{display:flex;gap:10px}.fd-save-button,.fd-cancel-button{border:0;border-radius:9px;padding:10px 15px;font-size:11px;font-weight:700;cursor:pointer}.fd-save-button{background:#8060df;color:white}.fd-cancel-button{background:#26334b;color:#dce5f6}.fd-save-button:disabled,.fd-cancel-button:disabled{opacity:.6;cursor:not-allowed}.fd-feedback{font-size:12px;margin:14px 0 0}.fd-error{color:#ff9caa}.fd-success{color:#64d6a3}
        .fd-student-search{display:flex;gap:9px;align-items:center;margin:16px 0}.fd-student-search input{flex:1;min-width:0;border:1px solid #35445f;border-radius:9px;background:#101a2c;color:#edf2ff;padding:11px 13px;font:12px Inter,system-ui,sans-serif;outline:none}.fd-student-search input:focus{border-color:#9875ff}.fd-table-wrap{width:100%;overflow-x:auto;border:1px solid #2b3952;border-radius:11px}.fd-students-table{width:100%;border-collapse:collapse;min-width:690px;text-align:left}.fd-students-table th{background:#101a2c;color:#9eacc5;font-size:10px;letter-spacing:.4px;text-transform:uppercase;padding:13px}.fd-students-table td{padding:13px;border-top:1px solid #293750;color:#dce5f6;font-size:11px}.fd-students-table td strong,.fd-students-table td small{display:block}.fd-students-table td small{margin-top:4px;color:#8493ad;font-size:10px}.fd-students-table a{color:#a995ff;text-decoration:none}.fd-students-table a:hover{text-decoration:underline}.fd-students-empty{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;color:#9aa9c2;text-align:center}.fd-students-empty svg{color:#b9a4ff}.fd-students-empty strong{color:#edf2ff;font-size:13px}.fd-students-empty span{font-size:11px}.fd-students-heading{gap:12px}.fd-pending{min-height:340px;border:1px dashed #465176;border-radius:16px;background:#141e31;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:35px;box-sizing:border-box}.fd-pending-icon{width:68px;height:68px;border-radius:20px;background:#2b2451;color:#bba5ff;display:grid;place-items:center;margin-bottom:20px}.fd-pending h2{font-size:19px;margin:0 0 10px}.fd-pending>p:not(.fd-eyebrow){max-width:540px;color:#9aa9c2;font-size:12px;line-height:1.8;margin:0}.fd-pending-badge{display:flex;align-items:center;gap:7px;margin-top:22px;padding:8px 12px;border-radius:20px;background:#25213e;color:#bcaaff;font-size:10px}.fd-logout-error{margin:0 34px 14px;color:#ff9caa;font-size:12px}
        .fd-resource-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .fd-resource-form label{display:grid;gap:7px;color:#9aa9c2;font-size:11px}
        .fd-resource-form input,.fd-resource-form select,.fd-resource-form textarea,.fd-resource-filters input,.fd-resource-filters select{width:100%;min-width:0;box-sizing:border-box;border:1px solid #35445f;border-radius:9px;background:#101a2c;color:#edf2ff;padding:11px;font:12px Inter,system-ui,sans-serif;outline:none}
        .fd-resource-form input:focus,.fd-resource-form select:focus,.fd-resource-form textarea:focus,.fd-resource-filters input:focus,.fd-resource-filters select:focus{border-color:#9875ff}
        .fd-resource-form select option,.fd-resource-filters select option{background:#101a2c;color:#edf2ff}
        .fd-resource-file span{font-size:10px;color:#8493ad;font-weight:400}
        .fd-resource-file input{padding:9px}
        .fd-resource-file small{color:#64d6a3;overflow-wrap:anywhere}
        .fd-resource-filters{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:10px;margin:14px 0}
        .fd-resource-list{display:grid;gap:10px}
        .fd-resource-card{display:flex;align-items:center;gap:13px;padding:14px;border:1px solid #2b3952;border-radius:11px;background:#101a2c;min-width:0}
        .fd-resource-icon{width:40px;height:40px;border-radius:10px;background:#29234e;color:#b9a4ff;display:grid;place-items:center;flex-shrink:0}
        .fd-resource-details{min-width:0;flex:1}
        .fd-resource-details>strong{font-size:12px;overflow-wrap:anywhere}
        .fd-resource-details>p{font-size:11px;color:#9aa9c2;margin:5px 0 8px;overflow-wrap:anywhere}
        .fd-resource-meta{display:flex;flex-wrap:wrap;gap:6px}
        .fd-resource-meta span{font-size:9px;text-transform:capitalize;color:#b7c4dc;background:#202c43;padding:5px 7px;border-radius:6px;overflow-wrap:anywhere}
        .fd-resource-actions{display:flex;gap:7px;align-items:center;flex-shrink:0}
        .fd-delete-button{border:1px solid #75404d;border-radius:9px;background:#3a202c;color:#ffb4bf;padding:9px 12px;font:600 11px Inter,system-ui,sans-serif;cursor:pointer}
        .fd-delete-button:disabled{opacity:.6;cursor:not-allowed}

        .fd-notice-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .fd-notice-form label{display:grid;gap:7px;color:#9aa9c2;font-size:11px}
        .fd-notice-form input,.fd-notice-form select,.fd-notice-form textarea{width:100%;min-width:0;box-sizing:border-box;border:1px solid #35445f;border-radius:9px;background:#101a2c;color:#edf2ff;padding:11px;font:12px Inter,system-ui,sans-serif;outline:none}
        .fd-notice-form input:focus,.fd-notice-form select:focus,.fd-notice-form textarea:focus{border-color:#9875ff}
        .fd-notice-form select option{background:#101a2c;color:#edf2ff}
        .fd-notice-full{grid-column:1/-1}
        .fd-notice-actions{display:flex;align-items:center;gap:9px}
        .fd-notice-actions .fd-save-button{display:inline-flex;align-items:center;gap:7px}
        .fd-notice-cancel{display:inline-flex;align-items:center;gap:6px;margin-left:auto}
        .fd-notice-list{display:grid;gap:11px}
        .fd-notice-card{display:flex;align-items:flex-start;gap:16px;padding:15px;border:1px solid #2b3952;border-radius:11px;background:#101a2c}
        .fd-notice-card-main{min-width:0;flex:1}
        .fd-notice-card-heading{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .fd-notice-card-heading>strong{font-size:12px;overflow-wrap:anywhere}
        .fd-notice-card-main>p{font-size:11px;line-height:1.65;color:#9aa9c2;white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}
        .fd-notice-status{font-size:9px;padding:4px 8px;border-radius:20px;font-weight:700}
        .fd-notice-status.published{background:#173d34;color:#70ddb0}
        .fd-notice-status.draft{background:#352d20;color:#e9c47c}
        .fd-notice-meta{display:flex;gap:7px;flex-wrap:wrap}
        .fd-notice-meta span{font-size:9px;color:#b7c4dc;background:#202c43;padding:5px 7px;border-radius:6px;text-transform:capitalize}
        .fd-notice-meta .priority-high{color:#ffd18a;background:#46351e}
        .fd-notice-meta .priority-urgent{color:#ffabb6;background:#462630}
        .fd-notice-card-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;flex-shrink:0}
        .fd-notice-card-actions .fd-edit-button{display:inline-flex;align-items:center;gap:5px;margin-left:0}
        .fd-notice-publish{border:1px solid #3c795f;border-radius:9px;background:#173d34;color:#8ce2b9;padding:9px 12px;font:600 11px Inter,system-ui,sans-serif;cursor:pointer}
        .fd-messages{width:100%}.fd-message-layout{display:grid;grid-template-columns:minmax(250px,330px) minmax(0,1fr);min-height:600px;border:1px solid #2b3952;border-radius:13px;overflow:hidden;background:#101a2c;margin-top:15px}
        .fd-message-sidebar{padding:15px;border-right:1px solid #2b3952;min-width:0;display:flex;flex-direction:column;gap:10px}.fd-message-sidebar h4{font-size:11px;color:#aab8ce;margin:8px 0 0}.fd-message-contacts-title{padding-top:12px;border-top:1px solid #2b3952}
        .fd-message-search{height:39px;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid #34435d;border-radius:9px;color:#8998b2;background:#0b1424}.fd-message-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#eef2ff;font:inherit;font-size:11px}
        .fd-message-contact-list{display:grid;gap:5px;max-height:195px;overflow:auto}.fd-message-contact{width:100%;display:flex;align-items:center;gap:9px;padding:9px;border:1px solid transparent;border-radius:9px;background:transparent;color:#eaf0ff;text-align:left;cursor:pointer;min-width:0}.fd-message-contact:hover,.fd-message-contact.active{background:#202b45;border-color:#5b4b91}.fd-message-avatar{width:35px;height:35px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#8058e8,#3299bd);font-size:10px;font-weight:800;color:white}.fd-message-avatar.large{width:42px;height:42px}.fd-message-contact-copy{min-width:0;flex:1}.fd-message-contact-copy strong,.fd-message-contact-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fd-message-contact-copy strong{font-size:10px}.fd-message-contact-copy small{font-size:9px;color:#8998b2;margin-top:4px}.fd-message-contact em{font-style:normal;border-radius:20px;background:#7256d5;color:white;padding:3px 7px;font-size:9px}.fd-message-empty-small{font-size:10px;color:#8291aa;line-height:1.5;margin:5px}
        .fd-message-chat{display:flex;flex-direction:column;min-width:0;min-height:600px}.fd-message-chat-header{display:flex;align-items:center;gap:11px;padding:15px 18px;border-bottom:1px solid #2b3952}.fd-message-chat-header strong,.fd-message-chat-header small{display:block}.fd-message-chat-header strong{font-size:12px}.fd-message-chat-header small{font-size:9px;color:#8998b2;margin-top:4px}.fd-message-history{flex:1;min-height:410px;max-height:550px;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:11px}.fd-message-row{display:flex;justify-content:flex-start}.fd-message-row.own{justify-content:flex-end}.fd-message-bubble{max-width:min(78%,560px);padding:10px 12px;border:1px solid #33425d;border-radius:12px 12px 12px 3px;background:#1b2940}.fd-message-row.own .fd-message-bubble{background:#30265a;border-color:#6651a5;border-radius:12px 12px 3px 12px}.fd-message-bubble strong{font-size:9px;color:#c4b4ff}.fd-message-bubble p{font-size:11px;line-height:1.6;color:#edf2ff;white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0}.fd-message-bubble small{display:block;text-align:right;font-size:8px;color:#9ba9c1}.fd-message-empty{flex:1;min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;color:#a995ff}.fd-message-empty h3{font-size:15px;color:#edf2ff;margin:12px 0 5px}.fd-message-empty p{font-size:10px;color:#8998b2;max-width:350px;line-height:1.7}.fd-message-compose{display:flex;gap:9px;padding:13px;border-top:1px solid #2b3952}.fd-message-compose input{flex:1;min-width:0;border:1px solid #34435d;border-radius:9px;background:#0b1424;color:#eef2ff;padding:11px 12px;font:inherit;font-size:11px;outline:none}.fd-message-compose button{display:flex;align-items:center;gap:7px}

        .fd-qa-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:10px;margin:14px 0}
        .fd-qa-toolbar select,.fd-qa-search{width:100%;min-width:0;box-sizing:border-box;border:1px solid #35445f;border-radius:9px;background:#101a2c;color:#edf2ff;padding:10px 12px;font:12px Inter,system-ui,sans-serif}
        .fd-qa-search{display:flex;align-items:center;gap:8px;color:#8998b2}.fd-qa-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#edf2ff;font:inherit}
        .fd-qa-question-list{display:grid;gap:9px}.fd-qa-question{width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px;border:1px solid #2b3952;border-radius:11px;background:#101a2c;color:#edf2ff;text-align:left;cursor:pointer}.fd-qa-question:hover,.fd-qa-question.active{border-color:#8060df;background:#1a2340}
        .fd-qa-question-main{display:grid;gap:6px;min-width:0;flex:1}.fd-qa-question-main strong{font-size:12px;overflow-wrap:anywhere}.fd-qa-question-main small{font-size:9px;color:#8998b2}.fd-qa-question-main>span{font-size:10px;color:#aab8ce;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .fd-qa-question-side{display:grid;justify-items:end;gap:7px;flex-shrink:0}.fd-qa-question-side em,.fd-qa-status{font-size:9px;font-style:normal;padding:5px 8px;border-radius:20px}.fd-qa-question-side em.open,.fd-qa-status.open{background:#3b3020;color:#edc77f}.fd-qa-question-side em.resolved,.fd-qa-status.resolved{background:#173d34;color:#70ddb0}.fd-qa-question-side small{font-size:9px;color:#8998b2}
        .fd-qa-detail{margin-top:16px}.fd-qa-detail .fd-panel-heading{align-items:flex-start;gap:12px}.fd-qa-detail .fd-panel-heading h3{font-size:16px;line-height:1.5;overflow-wrap:anywhere}.fd-qa-question-content{font-size:12px;line-height:1.8;color:#c1cce0;white-space:pre-wrap;overflow-wrap:anywhere;padding:15px;border:1px solid #2b3952;border-radius:10px;background:#101a2c}
        .fd-qa-answer-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:20px 0 12px}.fd-qa-answer-heading h4{font-size:13px;margin:0}.fd-qa-resolve{border:1px solid #3c795f;border-radius:9px;background:#173d34;color:#8ce2b9;padding:9px 12px;font:600 11px Inter,system-ui,sans-serif;cursor:pointer}.fd-qa-resolve:disabled{opacity:.6;cursor:not-allowed}
        .fd-qa-empty{padding:20px;border:1px dashed #35445f;border-radius:10px;color:#8998b2;text-align:center;font-size:11px}.fd-qa-answer-list{display:grid;gap:10px}.fd-qa-answer{padding:14px;border:1px solid #2b3952;border-radius:11px;background:#101a2c}.fd-qa-answer-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.fd-qa-answer-top strong,.fd-qa-answer-top small{display:block}.fd-qa-answer-top strong{font-size:11px}.fd-qa-answer-top small{font-size:9px;color:#8998b2;margin-top:4px;text-transform:capitalize}.fd-qa-answer-top>em{font-size:9px;font-style:normal;color:#70ddb0;background:#173d34;padding:5px 8px;border-radius:20px}.fd-qa-answer>p{font-size:11px;line-height:1.75;color:#c1cce0;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0}
        .fd-qa-answer-actions{display:flex;gap:7px;flex-wrap:wrap}.fd-qa-answer-actions button{display:inline-flex;align-items:center;gap:5px;border:1px solid #35445f;border-radius:8px;background:#1b2940;color:#b9c6dc;padding:7px 9px;font:600 10px Inter,system-ui,sans-serif;cursor:pointer}.fd-qa-answer-actions button.liked{color:#ff9eaf;border-color:#75404d;background:#3a202c}.fd-qa-answer-actions button.danger{color:#ffb4bf;border-color:#75404d}.fd-qa-answer-actions button:disabled{opacity:.6;cursor:not-allowed}
        .fd-qa-answer-form{display:grid;gap:9px;margin-top:17px;padding-top:17px;border-top:1px solid #2b3952}.fd-qa-answer-form label{font-size:11px;color:#aab8ce;font-weight:650}.fd-qa-answer-form textarea{width:100%;box-sizing:border-box;border:1px solid #35445f;border-radius:9px;background:#101a2c;color:#edf2ff;padding:12px;font:12px/1.6 Inter,system-ui,sans-serif;resize:vertical;outline:none}.fd-qa-answer-form textarea:focus{border-color:#9875ff}.fd-qa-form-actions{display:flex;gap:9px;flex-wrap:wrap}

        @media(max-width:1050px){.fd-sidebar{width:230px}.fd-main{margin-left:230px}.fd-topbar{padding:0 22px}.fd-content{padding:24px 22px 40px}.fd-stat-grid{grid-template-columns:1fr}}
        @media(max-width:720px){.fd-message-layout{grid-template-columns:1fr}.fd-message-sidebar{border-right:0;border-bottom:1px solid #2b3952}.fd-message-contact-list{max-height:145px}.fd-message-chat{min-height:440px}.fd-message-history{min-height:290px}.fd-message-bubble{max-width:90%}.fd-sidebar{transform:translateX(-100%);transition:transform .22s ease;width:275px}.fd-sidebar.open{transform:translateX(0)}.fd-main{margin-left:0}.fd-mobile-overlay.show{display:block;position:fixed;inset:0;background:#050914a8;z-index:25}.fd-mobile-menu{display:grid}.fd-topbar{height:66px;padding:0 14px}.fd-topbar h1{font-size:15px}.fd-topbar p{font-size:9px}.fd-top-actions{gap:7px}.fd-top-user{display:none}.fd-logout{width:38px;min-width:38px;height:38px;padding:0}.fd-logout span{display:none}.fd-content{padding:17px 14px 32px}.fd-welcome{padding:20px}.fd-welcome h2{font-size:20px}.fd-welcome-icon{width:55px;height:55px}.fd-quick-grid,.fd-profile-grid,.fd-profile-form,.fd-resource-form,.fd-notice-form{grid-template-columns:1fr}.fd-qa-toolbar{grid-template-columns:1fr}.fd-qa-question{align-items:flex-start}.fd-qa-question-side{white-space:nowrap}.fd-resource-filters{grid-template-columns:1fr}.fd-notice-card{flex-direction:column}.fd-notice-card-actions{width:100%}.fd-resource-card{align-items:flex-start;flex-wrap:wrap}.fd-resource-details{flex-basis:calc(100% - 55px)}.fd-resource-actions{width:100%;padding-left:53px}.fd-panel{padding:16px}.fd-logout-error{margin:0 14px 12px}}
      `}</style>

      <div className={`fd-mobile-overlay ${mobileMenuOpen ? "show" : ""}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`fd-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <Link className="fd-brand" to="/dashboard">
          <span className="fd-brand-mark"><GraduationCap size={22} /></span>
          <span>CampusSphere <b>AI</b></span>
        </Link>
        <div className="fd-side-label">FACULTYMENU</div>
        <nav className="fd-nav-list">
          {facultyNavigation.map(({ id, label,icon: Icon, tag }) => (
            <button key={id} className={`fd-nav-item ${activeSection === id ? "active" : ""}`} onClick={() => openSection(id)}>
              <Icon size={17} /><span>{label}</span>{tag && <em>{tag}</em>}
            </button>
          ))}
        </nav>
        <div className="fd-sidebar-bottom">
          <button className={`fd-nav-item ${activeSection === "profile" ? "active" : ""}`} onClick={() => openSection("profile")}><UserRound size={17} />Account settings</button>
          <div className="fd-user-mini"><span className="fd-avatar">{initials}</span><div><strong>{fullName}</strong><small>{user?.email || ""}</small></div></div>
          <button className="fd-nav-item" onClick={handleLogout} disabled={loggingOut}><LogOut size={17} />{loggingOut ? "Logging out..." : "Logout"}</button>
        </div>
      </aside>

      <section className="fd-main">
        <header className="fd-topbar">
          <div className="fd-topbar-left">
            <button className="fd-icon-button fd-mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu"><Menu size={19}/></button>
            <div><h1>{sectionInfo[activeSection]?.[0] || "Faculty Dashboard"}</h1><p>{sectionInfo[activeSection]?.[1] || "Your teaching workspace."}</p></div>
          </div>
          <div className="fd-top-actions">
            <div className="dashboard-display-controls" role="group" aria-label="Dashboard display controls">
              <button
                type="button"
                className="dashboard-display-button"
                onClick={() => setDashboardZoom((current) => Math.max(80, current - 10))}
                disabled={dashboardZoom <= 80}
                title="Zoom out"
                aria-label="Zoom out"
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                className="dashboard-display-value"
                onClick={() => setDashboardZoom(100)}
                title="Reset zoom to 100%"
                aria-label={`Reset dashboard zoom, current zoom ${dashboardZoom}%`}
              >
                {dashboardZoom}%
              </button>
              <button
                type="button"
                className="dashboard-display-button"
                onClick={() => setDashboardZoom((current) => Math.min(120, current + 10))}
                disabled={dashboardZoom >= 120}
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                className="dashboard-display-button dashboard-fullscreen-button"
                onClick={toggleDashboardFullscreen}
                title={isFullscreen ? "Exit full screen" : "Enter full screen"}
                aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
            <button className="fd-icon-button" onClick={() => openSection("profile")} aria-label="Open profile" title="My profile"><UserRound size={17} /></button>
            <button className="fd-logout" type="button" onClick={handleLogout} disabled={loggingOut} aria-label="Log out of faculty account" title="Logout"><LogOut size={17} /><span>{loggingOut ? "Logging out..." : "Logout"}</span></button>
            <div className="fd-top-user"><span className="fd-avatar">{initials}</span><div><strong>{fullName}</strong><small>Faculty</small></div></div>
    </div>
     </header>

        {logoutError && <p className="fd-logout-error">{logoutError}</p>}
        <div className="fd-content">
          {activeSection === "overview" && renderOverview()}
          {activeSection === "profile" && renderProfile()}
          {activeSection === "students" && renderStudents()}
          {activeSection === "materials" && renderLearningMaterials()}
          {activeSection === "messages" && renderMessages()}
          {activeSection === "notices" && renderNotices()}
          {activeSection === "qa" && renderAcademicQA()}
          {activeSection === "assistant" && <AssistantChat />}
        </div>

        {(studentProfileLoading || studentProfileError || selectedStudentProfile) && (
          <div
            className="fd-student-profile-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeStudentProfile();
            }}
          >
            <section
              className="fd-student-profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="fd-student-profile-title"
            >
              <div className="fd-student-profile-header">
                <div>
                  <span className="fd-student-profile-eyebrow">STUDENT DETAILS</span>
                  <h2 id="fd-student-profile-title">Student Profile</h2>
                </div>
                <button type="button" className="fd-student-profile-close" onClick={closeStudentProfile} aria-label="Close student profile">
                  <X size={19} />
                </button>
              </div>

              {studentProfileLoading ? (
                <p className="fd-feedback">Loading student profile...</p>
              ) : studentProfileError ? (
                <p className="fd-feedback fd-error" role="alert">{studentProfileError}</p>
              ) : selectedStudentProfile ? (
                <>
                  <div className="fd-student-profile-identity">
                    <span className="fd-student-profile-avatar">{initialsFromName(selectedStudentProfile.full_name)}</span>
                    <div>
                      <h3>{selectedStudentProfile.full_name || "Student"}</h3>
                      <p>{selectedStudentProfile.department_name || "Department not available"}</p>
                      <a href={`mailto:${selectedStudentProfile.email}`}>{selectedStudentProfile.email}</a>
                    </div>
                  </div>

                  <div className="fd-student-profile-section">
                    <h3>Academic Information</h3>
                    <div className="fd-student-profile-grid">
                      {[
                        ["Roll Number", selectedStudentProfile.roll_number],
                        ["Enrollment Number", selectedStudentProfile.enrollment_number],
                        ["Department", selectedStudentProfile.department_name],
                        ["Semester", selectedStudentProfile.current_semester ? `Semester ${selectedStudentProfile.current_semester}` : null],
                        ["Section", selectedStudentProfile.section],
                        ["College", selectedStudentProfile.college_name],
                        ["Admission Year", selectedStudentProfile.admission_year],
                        ["Graduation Year", selectedStudentProfile.graduation_year],
                      ].map(([label, value]) => (
                        <div className="fd-student-profile-field" key={label}>
                          <span>{label}</span>
                          <strong>{value ?? "Not added"}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="fd-student-profile-section">
                    <h3>About & Skills</h3>
                    <p className="fd-student-profile-bio">{selectedStudentProfile.bio || "No bio added yet."}</p>
                    <div className="fd-student-profile-skills">{selectedStudentProfile.skills || "No skills added yet."}</div>
                  </div>

                  <div className="fd-student-profile-section">
                    <h3>Professional Profiles</h3>
                    <div className="fd-student-social-links">
                      {[
                        ["GitHub", selectedStudentProfile.github_url, Github],
                        ["LinkedIn", selectedStudentProfile.linkedin_url, Linkedin],
                        ["Portfolio", selectedStudentProfile.portfolio_url, Globe],
                      ].map(([label, value, Icon]) => {
                        const href = safeProfileUrl(value);
                        return href ? (
                          <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="fd-student-social-link">
                            <Icon size={17} />
                            <span>{label}</span>
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <div key={label} className="fd-student-social-link is-unavailable" aria-disabled="true">
                            <Icon size={17} />
                            <span>{label}</span>
                            <small>Not added</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
