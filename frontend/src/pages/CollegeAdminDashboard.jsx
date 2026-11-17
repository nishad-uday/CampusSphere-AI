import { useCallback, useEffect, useRef, useState } from "react";



import { useNavigate } from "react-router-dom";



import {



  GraduationCap,



  LayoutDashboard,



  Users,



  UserRound,



  FileText,



  Upload,



  RefreshCw,



  LogOut,



  Menu,



  X,



  Plus,



  Trash2,



  Building2,



  CheckCircle2,



  Clock3,



  AlertCircle,



  Bell,
  BookOpen,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,

} from "lucide-react";



import api from "../services/api";



import { useAuth } from "../context/AuthContext";



const navigation = [

  { id: "overview", label: "Overview", icon: LayoutDashboard },

  { id: "faculty", label: "Faculty", icon: Users },

  { id: "students", label: "Students", icon: UserRound },

  { id: "departments", label: "Departments", icon: Building2 },

  { id: "documents", label: "AI Knowledge Base", icon: FileText },

  { id: "notices", label: "Notices & Announcements", icon: Bell },
  { id: "learning", label: "Learning Materials", icon: BookOpen },

];



const styles = `



.ca-layout{min-height:100vh;background:#080d19;color:#edf2ff;font-family:'DM Sans',sans-serif}



.ca-sidebar{position:fixed;inset:0 auto 0 0;width:250px;height:100vh;min-height:0;overflow-y:auto;overflow-x:hidden;background:#0d1525;border-right:1px solid #1d2a40;display:flex;flex-direction:column;padding:22px 15px;z-index:30;scrollbar-width:thin;scrollbar-color:#34445d #0d1525}



.ca-brand{display:flex;align-items:center;gap:11px;padding:5px 8px 27px;color:#fff;text-decoration:none;font-size:17px;font-weight:700}



.ca-brand-mark{width:38px;height:38px;border-radius:12px;background:#6650d9;display:grid;place-items:center}



.ca-brand b{color:#a997ff}



.ca-side-label{font-size:9px;letter-spacing:1.5px;color:#65758f;font-weight:700;padding:12px 12px}



.ca-nav{display:grid;gap:6px}



.ca-nav button,.ca-bottom button{width:100%;display:flex;align-items:center;gap:12px;padding:12px;border:0;border-radius:9px;background:transparent;color:#9cabc1;font:500 12px 'DM Sans',sans-serif;text-align:left;cursor:pointer}



.ca-nav button.active{background:#272344;color:#c4b5fd}



.ca-nav button:hover,.ca-bottom button:hover{background:#19253a;color:#fff}



.ca-bottom button:disabled{opacity:.6;cursor:not-allowed}



.ca-nav button:focus-visible,.ca-bottom button:focus-visible,.ca-icon-btn:focus-visible{outline:2px solid #a997ff;outline-offset:2px}



.ca-bottom{margin-top:auto;flex-shrink:0;border-top:1px solid #202c40;padding-top:15px;padding-bottom:8px;background:#0d1525}



.ca-user{display:flex;align-items:center;gap:10px;padding:15px 8px;color:#fff;min-width:0}



.ca-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#34415d;color:#fff;font-size:12px;font-weight:700}



.ca-user div{min-width:0}.ca-user strong{display:block;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ca-user small{display:block;color:#8190a8;font-size:9px;overflow:hidden;text-overflow:ellipsis}



.ca-main{margin-left:250px;min-height:100vh}



.ca-topbar{height:76px;border-bottom:1px solid #1d2a40;display:flex;align-items:center;justify-content:space-between;padding:0 34px;background:#0b1322}



.ca-topbar h1{font-size:17px;margin:0 0 4px}.ca-topbar p{font-size:10px;color:#8190a8;margin:0}



.ca-top-actions{display:flex;align-items:center;gap:9px}



.ca-top-logout{min-height:36px;white-space:nowrap}



@media(max-width:700px){.ca-top-logout{padding:9px 10px;font-size:10px}}



.ca-icon-btn{border:1px solid #293850;background:#121e31;color:#bdc9dc;border-radius:9px;padding:9px;display:grid;place-items:center;cursor:pointer}



.ca-mobile-btn{display:none}



.ca-content{max-width:1450px;margin:auto;padding:30px 34px 50px}



.ca-welcome{padding:25px 28px;border:1px solid #34305f;border-radius:17px;background:linear-gradient(115deg,#211d43,#17243b);display:flex;align-items:center;justify-content:space-between;gap:20px}



.ca-eyebrow{font-size:9px;letter-spacing:1.5px;color:#a99aff;font-weight:700;margin:0 0 10px}



.ca-welcome h2{font-size:23px;margin:0 0 8px}.ca-welcome p:not(.ca-eyebrow){font-size:11px;color:#b0bad0;margin:0}



.ca-welcome-icon{width:58px;height:58px;border-radius:17px;background:#403773;display:grid;place-items:center;color:#d5caff}



.ca-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:20px 0}



.ca-stat{background:#111c2e;border:1px solid #23334b;border-radius:13px;padding:18px}



.ca-stat-top{display:flex;justify-content:space-between;align-items:center;color:#a6b4ca;font-size:10px}



.ca-stat-icon{width:35px;height:35px;border-radius:10px;display:grid;place-items:center;background:#29254b;color:#bcaaff}



.ca-stat strong{display:block;font-size:26px;margin-top:14px}.ca-stat small{color:#8494ad;font-size:9px}



.ca-panel{background:#111c2e;border:1px solid #23334b;border-radius:14px;padding:21px;margin-top:17px}



.ca-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}



.ca-panel h3{font-size:14px;margin:0}.ca-muted{font-size:10px;color:#8c9bb2}



.ca-btn{border:0;border-radius:8px;background:#7058df;color:#fff;padding:10px 14px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;text-decoration:none}



.ca-btn:disabled{opacity:.55;cursor:not-allowed}



.ca-btn.secondary{background:#202e44;border:1px solid #34445d;color:#d3dceb}



.ca-btn.danger{background:#492533;color:#ffb5c0}



.ca-table-wrap{overflow-x:auto}



.ca-table{width:100%;border-collapse:collapse;min-width:600px}



.ca-table th{text-align:left;color:#8393aa;font-size:9px;text-transform:uppercase;letter-spacing:.7px;padding:12px;border-bottom:1px solid #2a3950}



.ca-table td{padding:13px 12px;border-bottom:1px solid #202e43;font-size:10px;color:#d5deed}



.ca-table tr:last-child td{border-bottom:0}



.ca-status{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:20px;background:#17392f;color:#8be0b9;font-size:9px}



.ca-status.pending{background:#41351e;color:#f2ce83}



.ca-empty{text-align:center;padding:35px 15px;color:#8595ad;font-size:11px}



.ca-error{padding:12px;border:1px solid #713747;background:#321e2a;color:#ffb5c0;border-radius:9px;font-size:11px;margin:12px 0}



.ca-success{padding:12px;border:1px solid #285d4b;background:#16362d;color:#9de4c1;border-radius:9px;font-size:11px;margin:12px 0}



.ca-upload{border:1px dashed #485675;background:#141f33;border-radius:12px;padding:25px;text-align:center}



.ca-upload input{display:block;max-width:100%;margin:15px auto;color:#aebbd0;font-size:10px}



.ca-mobile-overlay{display:none}



@media(max-width:1000px){.ca-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ca-content{padding:24px}}



@media(max-width:700px){.ca-sidebar{transform:translateX(-100%);transition:transform .2s;width:270px}.ca-sidebar.open{transform:translateX(0)}.ca-main{margin-left:0}.ca-mobile-btn{display:grid}.ca-topbar{height:65px;padding:0 14px}.ca-topbar h1{font-size:14px}.ca-topbar p{font-size:9px}.ca-content{padding:17px 13px 35px}.ca-welcome{padding:20px}.ca-welcome h2{font-size:19px}.ca-welcome-icon{display:none}.ca-stat-grid{gap:9px;margin:13px 0}.ca-stat{padding:13px}.ca-stat strong{font-size:22px}.ca-panel{padding:15px}.ca-mobile-overlay.show{display:block;position:fixed;inset:0;background:#050914b5;z-index:25}}





.ca-notice-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}

.ca-notice-field{display:flex;flex-direction:column;gap:7px}

.ca-notice-field.full{grid-column:1/-1}

.ca-notice-field label{font-size:10px;color:#9cabc1}

.ca-notice-field input,.ca-notice-field textarea,.ca-notice-field select{width:100%;box-sizing:border-box;border:1px solid #34445d;border-radius:8px;background:#0d1728;color:#edf2ff;padding:11px 12px;font:12px 'DM Sans',sans-serif;outline:none}

.ca-notice-field textarea{min-height:120px;resize:vertical}

.ca-notice-field input:focus,.ca-notice-field textarea:focus,.ca-notice-field select:focus{border-color:#8874ef}

.ca-notice-actions{display:flex;gap:8px;flex-wrap:wrap}

@media(max-width:700px){.ca-notice-form{grid-template-columns:1fr}}

.ca-learning-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.ca-learning-field{display:flex;flex-direction:column;gap:7px}
.ca-learning-field.full{grid-column:1/-1}
.ca-learning-field label{font-size:10px;color:#9cabc1}
.ca-learning-field input,.ca-learning-field textarea,.ca-learning-field select{width:100%;box-sizing:border-box;border:1px solid #34445d;border-radius:8px;background:#0d1728;color:#edf2ff;padding:11px 12px;font:12px 'DM Sans',sans-serif;outline:none}
.ca-learning-field textarea{min-height:85px;resize:vertical}
.ca-learning-field input:focus,.ca-learning-field textarea:focus,.ca-learning-field select:focus{border-color:#8874ef}
.ca-learning-list{display:grid;gap:10px}
.ca-learning-item{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:15px;border:1px solid #2a3950;border-radius:11px;background:#0d1728}
.ca-learning-meta{display:flex;align-items:center;gap:12px;min-width:0}
.ca-learning-icon{width:40px;height:40px;flex-shrink:0;border-radius:10px;background:#29254b;color:#bcaaff;display:grid;place-items:center}
.ca-learning-actions{display:flex;gap:8px;flex-wrap:wrap}
@media(max-width:700px){.ca-notice-form,.ca-learning-grid{grid-template-columns:1fr}.ca-learning-field.full{grid-column:auto}.ca-learning-item{align-items:flex-start;flex-direction:column}}


`;



const departmentInputStyle = {



  display: "block",



  width: "100%",



  boxSizing: "border-box",



  marginTop: 8,



  padding: "12px 13px",



  border: "1px solid #34445d",



  borderRadius: 8,



  background: "#0d1728",



  color: "#edf2ff",



  outline: "none",



  fontSize: 12,



};



export default function CollegeAdminDashboard() {



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



  const [dashboard, setDashboard] = useState(null);



  const [faculty, setFaculty] = useState([]);



  const [students, setStudents] = useState([]);



  const [documents, setDocuments] = useState([]);



  const [loading, setLoading] = useState(false);



  const [uploading, setUploading] = useState(false);



  const [error, setError] = useState("");



  const [success, setSuccess] = useState("");



  const [selectedFile, setSelectedFile] = useState(null);



  const [departments, setDepartments] = useState([]);



  const [departmentName, setDepartmentName] = useState("");



  const [departmentCode, setDepartmentCode] = useState("");



  const [editingDepartmentId, setEditingDepartmentId] = useState(null);



  const [savingDepartment, setSavingDepartment] = useState(false);



  const [studentSearch, setStudentSearch] = useState("");



  const [savingStudentId, setSavingStudentId] = useState(null);



  const [loggingOut, setLoggingOut] = useState(false);

  const [notices, setNotices] = useState([]);

  const [noticeTitle, setNoticeTitle] = useState("");

  const [noticeContent, setNoticeContent] = useState("");

  const [noticeCategory, setNoticeCategory] = useState("General");

  const [noticePriority, setNoticePriority] = useState("Normal");

  const [noticeExpiresAt, setNoticeExpiresAt] = useState("");

  const [editingNoticeId, setEditingNoticeId] = useState(null);

  const [savingNotice, setSavingNotice] = useState(false);

  const [learningResources, setLearningResources] = useState([]);
  const [learningTitle, setLearningTitle] = useState("");
  const [learningDescription, setLearningDescription] = useState("");
  const [learningSubject, setLearningSubject] = useState("");
  const [learningCategory, setLearningCategory] = useState("notes");
  const [learningDepartmentId, setLearningDepartmentId] = useState("");
  const [learningSemester, setLearningSemester] = useState("");
  const [learningFile, setLearningFile] = useState(null);
  const [learningSearch, setLearningSearch] = useState("");
  const [learningFilterDepartment, setLearningFilterDepartment] = useState("");
  const [learningFilterCategory, setLearningFilterCategory] = useState("");
  const [learningFilterSemester, setLearningFilterSemester] = useState("");
  const [learningUploading, setLearningUploading] = useState(false);
  const [learningBusyId, setLearningBusyId] = useState(null);




  const loadDashboard = useCallback(async () => {



    const { data } = await api.get("/admin/dashboard");



    setDashboard(data);



  }, []);



  const loadFaculty = useCallback(async () => {



    const { data } = await api.get("/admin/faculty?page=1&limit=100");



    setFaculty(data.items || []);



  }, []);



  const loadStudents = useCallback(async () => {



    const { data } = await api.get("/admin/students?page=1&limit=100");



    setStudents(data.items || []);



  }, []);



  const loadDocuments = useCallback(async () => {



    const { data } = await api.get("/admin/documents?page=1&limit=100");



    setDocuments(data.items || []);



  }, []);



  const loadDepartments = useCallback(async () => {



    const { data } = await api.get("/admin/departments");



    setDepartments(data.items || []);



  }, []);



  const loadNotices = useCallback(async () => {

    const { data } = await api.get("/notices/admin?skip=0&limit=100");

    setNotices(data.items || data.results || (Array.isArray(data) ? data : []));

  }, []);

  const loadLearningResources = useCallback(async () => {
    const { data } = await api.get("/learning-resources");
    setLearningResources(
      data.items || data.results || (Array.isArray(data) ? data : [])
    );
  }, []);



  function resetNoticeForm() {

    setNoticeTitle("");

    setNoticeContent("");

    setNoticeCategory("General");

    setNoticePriority("Normal");

    setNoticeExpiresAt("");

    setEditingNoticeId(null);

  }



  async function handleNoticeSubmit(event) {

    event.preventDefault();

    if (!noticeTitle.trim() || !noticeContent.trim()) {

      setError("Notice title and content are required.");

      return;

    }

    const payload = {

      title: noticeTitle.trim(),

      content: noticeContent.trim(),

      category: noticeCategory,

      priority: noticePriority,

      expires_at: noticeExpiresAt ? new Date(noticeExpiresAt).toISOString() : null,

    };

    setSavingNotice(true);

    setError("");

    setSuccess("");

    try {

      if (editingNoticeId) {

        await api.put(`/notices/${editingNoticeId}`, payload);

        setSuccess("Notice updated successfully.");

      } else {

        await api.post("/notices", payload);

        setSuccess("Notice created successfully as a draft.");

      }

      resetNoticeForm();

      await loadNotices();

    } catch (err) {

      setError(err.response?.data?.detail || "Unable to save notice. Please try again.");

    } finally {

      setSavingNotice(false);

    }

  }



  function handleEditNotice(notice) {

    setEditingNoticeId(notice.id);

    setNoticeTitle(notice.title || "");

    setNoticeContent(notice.content || "");

    setNoticeCategory(notice.category || "General");

    setNoticePriority(notice.priority || "Normal");

    setNoticeExpiresAt(notice.expires_at ? (() => {

      const date = new Date(notice.expires_at);

      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

      return localDate.toISOString().slice(0, 16);

    })() : "");

    setError("");

    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });

  }



  async function handleToggleNoticePublish(notice) {

    setError("");

    setSuccess("");

    try {

      await api.patch(`/notices/${notice.id}/publish`);

      setSuccess(notice.is_published ? "Notice unpublished." : "Notice published successfully.");

      await loadNotices();

    } catch (err) {

      setError(err.response?.data?.detail || "Unable to change notice publication status.");

    }

  }



  async function handleDeleteNotice(noticeId) {

    if (!window.confirm("Are you sure you want to delete this notice?")) return;

    setError("");

    setSuccess("");

    try {

      await api.delete(`/notices/${noticeId}`);

      setNotices((current) => current.filter((notice) => notice.id !== noticeId));

      if (editingNoticeId === noticeId) resetNoticeForm();

      setSuccess("Notice deleted successfully.");

    } catch (err) {

      setError(err.response?.data?.detail || "Unable to delete notice.");

    }

  }



  async function handleAssignStudentDepartment(student) {



    const departmentId = student.department_id;



    if (!departmentId) {



      setError("Please select a department first.");



      return;



    }



    setSavingStudentId(student.id);



    setError("");



    setSuccess("");



    try {



      await api.patch(`/admin/students/${student.id}/department`, {



        department_id: departmentId,



      });



      setSuccess(`Department assigned successfully to ${student.full_name}.`);



      await loadStudents();



    } catch (err) {



      setError(



        err.response?.data?.detail ||



        `Unable to assign department to ${student.full_name}.`



      );



    } finally {



      setSavingStudentId(null);



    }



  }



    async function handleDepartmentSubmit(event) {



    event.preventDefault();



    if (!departmentName.trim() || !departmentCode.trim()) {



      setError("Department name and code are required.");



      return;



    }



    setSavingDepartment(true);



    setError("");



    setSuccess("");



    const payload = {



      name: departmentName.trim(),



      code: departmentCode.trim().toUpperCase(),



    };



    try {



      if (editingDepartmentId) {



        await api.put(`/admin/departments/${editingDepartmentId}`, payload);



        setSuccess("Department updated successfully.");



      } else {



        await api.post("/admin/departments", payload);



        setSuccess("Department created successfully.");



      }



      resetDepartmentForm();



      await Promise.all([loadDepartments(), loadDashboard()]);



    } catch (err) {



      setError(err.response?.data?.detail || "Unable to save department. Please try again.");



    } finally {



      setSavingDepartment(false);



    }



  }



  function handleEditDepartment(department) {



    setEditingDepartmentId(department.id);



    setDepartmentName(department.name);



    setDepartmentCode(department.code);



    setError("");



    setSuccess("");



  }



  async function handleDeactivateDepartment(departmentId) {



    const confirmed = window.confirm("Are you sure you want to deactivate this department?");



    if (!confirmed) return;



    setError("");



    setSuccess("");



    try {



      await api.patch(`/admin/departments/${departmentId}/deactivate`);



      setSuccess("Department deactivated successfully.");



      await Promise.all([loadDepartments(), loadDashboard()]);



    } catch (err) {



      setError(err.response?.data?.detail || "Unable to deactivate department.");



    }



  }



  function resetDepartmentForm() {



    setDepartmentName("");



    setDepartmentCode("");



    setEditingDepartmentId(null);



  }



  const refreshCurrentSection = useCallback(async () => {



    setLoading(true);



    setError("");



    try {



      if (activeSection === "overview") {



        await Promise.all([loadDashboard(), loadFaculty(), loadDocuments()]);



      } else if (activeSection === "faculty") {



        await loadFaculty();



      } else if (activeSection === "students") {



        await Promise.all([loadStudents(), loadDepartments()]);



      } else if (activeSection === "departments") {



        await loadDepartments();



      } else if (activeSection === "documents") {



        await loadDocuments();



      } else if (activeSection === "notices") {



        await loadNotices();



      } else if (activeSection === "learning") {



        await Promise.all([loadLearningResources(), loadDepartments()]);



      }



    } catch (err) {



      setError(learningErrorMessage(err, "Unable to load College Admin data. Please try again."));



    } finally {



      setLoading(false);



    }



  }, [



    activeSection,



    loadDashboard,



    loadFaculty,



    loadStudents,



    loadDocuments,



    loadDepartments,

    loadNotices,

    loadLearningResources,



  ]);



  useEffect(() => {



    refreshCurrentSection();



  }, [refreshCurrentSection]);



  function openSection(section) {



    setActiveSection(section);



    setMobileMenuOpen(false);



    setError("");



    setSuccess("");



  }



  async function handleLogout() {



    if (loggingOut) return;



    setLoggingOut(true);



    setError("");



    try {



      await logout();



      navigate("/login", { replace: true });



    } catch {



      setError("Logout failed. Please try again.");



      setLoggingOut(false);



    }



  }



  async function handleUpload(event) {



    event.preventDefault();



    if (!selectedFile) {



      setError("Please select a document first.");



      return;



    }



    const formData = new FormData();



    formData.append("file", selectedFile);



    setUploading(true);



    setError("");



    setSuccess("");



    try {



      await api.post("/documents/upload", formData, {



        headers: { "Content-Type": "multipart/form-data" },



      });



      setSelectedFile(null);



      event.target.reset();



      setSuccess("Document uploaded and processed successfully.");



      await Promise.all([loadDocuments(), loadDashboard()]);



    } catch (err) {



      setError(



        err.response?.data?.detail ||



        "Document upload failed. Check the file and try again."



      );



    } finally {



      setUploading(false);



    }



  }



  async function handleDeleteDocument(documentId) {



    const confirmed = window.confirm(



      "Are you sure you want to delete this document and its AI knowledge chunks?"



    );



    if (!confirmed) return;



    setError("");



    setSuccess("");



    try {



      await api.delete(`/admin/documents/${documentId}`);



      setDocuments((current) =>



        current.filter((document) => document.id !== documentId)



      );



      setSuccess("Document deleted successfully.");



      await loadDashboard();



    } catch (err) {



      setError(



        err.response?.data?.detail ||



        "Unable to delete this document."



      );



    }



  }




  function learningErrorMessage(err, fallback) {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const field = Array.isArray(item.loc) ? item.loc.join(" → ") : "";
          return field ? `${field}: ${item.msg || "Invalid value"}` : (item.msg || "Validation error");
        }
        return String(item);
      }).join(" | ");
    }
    return typeof detail === "string" ? detail : fallback;
  }

  async function handleLearningUpload(event) {
    event.preventDefault();
    if (!learningTitle.trim() || !learningSemester || !learningFile) {
      setError("Resource title, semester and file are required.");
      return;
    }
    const allowed = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".xls", ".xlsx"];
    const extension = `.${learningFile.name.split(".").pop().toLowerCase()}`;
    if (!allowed.includes(extension)) {
      setError("Unsupported file type. Please select PDF, DOC, DOCX, PPT, PPTX, TXT, XLS or XLSX.");
      return;
    }
    if (learningFile.size > 20 * 1024 * 1024) {
      setError("File size must not exceed 20 MB.");
      return;
    }
    const formData = new FormData();
    formData.append("title", learningTitle.trim());
    formData.append("description", learningDescription.trim());
    formData.append("subject", learningSubject.trim());
    formData.append("category", learningCategory);
    formData.append("semester", learningSemester);
    if (learningDepartmentId) formData.append("department_id", learningDepartmentId);
    formData.append("file", learningFile);

    setLearningUploading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/learning-resources/upload", formData, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});
      setLearningTitle("");
      setLearningDescription("");
      setLearningSubject("");
      setLearningCategory("notes");
      setLearningDepartmentId("");
      setLearningSemester("");
      setLearningFile(null);
      event.target.reset();
      setSuccess("Learning material uploaded successfully.");
      await loadLearningResources();
    } catch (err) {
      console.error("Learning resource upload failed:", err);
      setError(learningErrorMessage(err, "Unable to upload learning material."));
    } finally {
      setLearningUploading(false);
    }
  }

  async function handleLearningDownload(resource) {
    setLearningBusyId(resource.id);
    setError("");
    try {
      const response = await api.get(`/learning-resources/${resource.id}/download`, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], {
        type: response.headers?.["content-type"] || resource.mime_type || "application/octet-stream",
      }));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = resource.file_name || resource.title || "learning-resource";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Learning resource download failed:", err);
      setError("Unable to download this learning material.");
    } finally {
      setLearningBusyId(null);
    }
  }

  async function handleLearningDelete(resource) {
    if (!window.confirm(`Delete "${resource.title}"?`)) return;
    setLearningBusyId(resource.id);
    setError("");
    setSuccess("");
    try {
      await api.delete(`/learning-resources/${resource.id}`);
      setLearningResources((current) => current.filter((item) => item.id !== resource.id));
      setSuccess("Learning material deleted successfully.");
    } catch (err) {
      console.error("Learning resource delete failed:", err);
      setError(learningErrorMessage(err, "Unable to delete this learning material."));
    } finally {
      setLearningBusyId(null);
    }
  }

  const normalizedLearningSearch = learningSearch.trim().toLowerCase();
  const filteredLearningResources = learningResources.filter((item) => {
    const matchesSearch =
      !normalizedLearningSearch ||
      [item.title, item.subject, item.description, item.file_name, item.department_name]
        .some((value) => String(value || "").toLowerCase().includes(normalizedLearningSearch));
    const matchesDepartment =
      !learningFilterDepartment || item.department_id === learningFilterDepartment;
    const matchesCategory =
      !learningFilterCategory || item.category === learningFilterCategory;
    const matchesSemester =
      !learningFilterSemester || String(item.semester || "") === learningFilterSemester;

    return matchesSearch && matchesDepartment && matchesCategory && matchesSemester;
  });

  const normalizedStudentSearch = studentSearch.trim().toLowerCase();



  const filteredStudents = students.filter((student) => {



    if (!normalizedStudentSearch) return true;



    return [



      student.full_name,



      student.email,



      student.roll_number,



    ].some((value) =>



      String(value || "").toLowerCase().includes(normalizedStudentSearch)



    );



  });



  const stats = dashboard?.statistics || {};



  const initials = (user?.full_name || "Admin")



    .split(" ")



    .map((part) => part[0])



    .slice(0, 2)



    .join("")



    .toUpperCase();



  const titles = {



    overview: ["College Overview", "Your college at a glance"],



    faculty: ["Faculty Management", "Faculty members in your college"],



    students: ["Student Management", "Registered students in your college"],



    departments: ["Department Management", "Create and manage college departments"],



    documents: ["AI Knowledge Base", "Manage college documents used by the AI assistant"],

    notices: ["Notices & Announcements", "Create, publish and manage college announcements"],
    learning: ["Learning Materials", "Upload and manage resources across college departments"],



  };



  return (



    <div ref={dashboardRef} className="ca-layout" style={{ zoom: dashboardZoom / 100 }}>



      <style>{styles}</style>



      <div



        className={`ca-mobile-overlay ${mobileMenuOpen ? "show" : ""}`}



        onClick={() => setMobileMenuOpen(false)}



      />



      <aside className={`ca-sidebar ${mobileMenuOpen ? "open" : ""}`}>



        <div className="ca-brand">



          <span className="ca-brand-mark"><GraduationCap size={22} /></span>



          <span>CampusSphere <b>AI</b></span>



        </div>



        <div className="ca-side-label">COLLEGE ADMIN MENU</div>



        <nav className="ca-nav">



          {navigation.map(({ id, label, icon: Icon }) => (



            <button



              key={id}



              className={activeSection === id ? "active" : ""}



              onClick={() => openSection(id)}



            >



              <Icon size={17} />



              {label}



            </button>



          ))}



        </nav>



        <div className="ca-bottom">



          <div className="ca-user">



            <span className="ca-avatar">{initials}</span>



            <div>



              <strong>{user?.full_name}</strong>



              <small>{user?.email}</small>



            </div>



          </div>



          <button onClick={handleLogout} disabled={loggingOut} aria-label="Log out of CampusSphere">



            <LogOut size={17} /> {loggingOut ? "Logging out..." : "Logout"}



          </button>



        </div>



      </aside>



      <main className="ca-main">



        <header className="ca-topbar">



          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>



            <button



              className="ca-icon-btn ca-mobile-btn"



              onClick={() => setMobileMenuOpen(true)}



              aria-label="Open navigation"



            >



              <Menu size={18} />



            </button>



            <div>



              <h1>{titles[activeSection][0]}</h1>



              <p>{titles[activeSection][1]}</p>



            </div>



          </div>



          <div className="ca-top-actions">

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

            <button



              className="ca-icon-btn"



              onClick={refreshCurrentSection}



              title="Refresh"



            >



              <RefreshCw size={16} />



            </button>



            <button



              className="ca-btn secondary ca-top-logout"



              onClick={handleLogout}



              disabled={loggingOut}



              title="Log out"



              aria-label="Log out of CampusSphere"



            >



              <LogOut size={15} />



              {loggingOut ? "Logging out..." : "Logout"}



            </button>



          </div>



        </header>



        <section className="ca-content">



          {error && <div className="ca-error"><AlertCircle size={15} /> {error}</div>}



          {success && <div className="ca-success"><CheckCircle2 size={15} /> {success}</div>}



          {activeSection === "overview" && (



            <>



              <div className="ca-welcome">



                <div>



                  <p className="ca-eyebrow">COLLEGE ADMINISTRATION</p>



                  <h2>Welcome, {user?.full_name



  ?.replace(/^(mr|mrs|ms|dr)\.?\s+/i, "")



  .trim()



  .split(/\s+/)[0] || "Admin"}!</h2>



                  <p>



                    {dashboard?.college?.name || "Your College"} · Manage your



                    campus from one workspace.



                  </p>



                </div>



                <div className="ca-welcome-icon"><Building2 size={28} /></div>



              </div>



              <div className="ca-stat-grid">



                {[



                  { label: "Total Students", value: stats.total_students, icon: UserRound },



                  { label: "Total Faculty", value: stats.total_faculty, icon: Users },



                  { label: "Departments", value: stats.total_departments, icon: Building2 },



                  { label: "Knowledge Documents", value: stats.total_documents, icon: FileText },



                ].map(({ label, value, icon: Icon }) => (



                  <article className="ca-stat" key={label}>



                    <div className="ca-stat-top">



                      {label}



                      <span className="ca-stat-icon"><Icon size={17} /></span>



                    </div>



                    <strong>{loading && value === undefined ? "…" : value ?? 0}</strong>



                    <small>{label === "Knowledge Documents"



                      ? `${stats.completed_documents ?? 0} processed`



                      : "Current college records"}</small>



                  </article>



                ))}



              </div>



              <div className="ca-panel">



                <div className="ca-panel-head">



                  <h3>College Information</h3>



                  <span className="ca-muted">{dashboard?.college?.code || ""}</span>



                </div>



                <p className="ca-muted">



                  {dashboard?.college?.name || "Loading college information..."}



                </p>



                <p className="ca-muted">College ID: {dashboard?.college?.id || "—"}</p>



              </div>



              <div className="ca-panel">



                <div className="ca-panel-head">



                  <h3>Quick Actions</h3>



                </div>



                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>



                  <button className="ca-btn" onClick={() => navigate("/admin/faculty")}>



                    <Plus size={15} /> Create Faculty Account



                  </button>



                  <button className="ca-btn secondary" onClick={() => openSection("faculty")}>



                    <Users size={15} /> View Faculty



                  </button>



                  <button className="ca-btn secondary" onClick={() => openSection("students")}>



                    <UserRound size={15} /> View Students



                  </button>



                  <button className="ca-btn secondary" onClick={() => openSection("documents")}>



                    <Upload size={15} /> Manage Documents



                  </button>



                </div>



              </div>



            </>



          )}



          {activeSection === "faculty" && (



            <div className="ca-panel">



              <div className="ca-panel-head">



                <div>



                  <h3>Faculty Members</h3>



                  <p className="ca-muted">{faculty.length} records on this page</p>



                </div>



                <button className="ca-btn" onClick={() => navigate("/admin/faculty")}>



                  <Plus size={15} /> Create Faculty



                </button>



              </div>



              {loading ? <p className="ca-empty">Loading faculty...</p> :



                faculty.length === 0 ? <p className="ca-empty">No faculty records found.</p> :



                <div className="ca-table-wrap">



                  <table className="ca-table">



                    <thead><tr><th>Name</th><th>Email</th><th>Employee ID</th><th>Department</th><th>Status</th></tr></thead>



                    <tbody>



                      {faculty.map((item) => (



                        <tr key={item.id}>



                          <td>{item.full_name}</td>



                          <td>{item.email}</td>



                          <td>{item.employee_id || "—"}</td>



                          <td>{item.department || "Not assigned"}</td>



                          <td><span className="ca-status">{item.is_active ? "Active" : "Inactive"}</span></td>



                        </tr>



                      ))}



                    </tbody>



                  </table>



                </div>



              }



            </div>



          )}



          {activeSection === "students" && (



            <div className="ca-panel">



              <div className="ca-panel-head">



                <div>



                  <h3>Registered Students</h3>



                  <p className="ca-muted">



                    {students.length} students · Assign or change their department



                  </p>



                </div>



                <button



                  className="ca-btn secondary"



                  type="button"



                  onClick={refreshCurrentSection}



                  disabled={loading}



                >



                  <RefreshCw size={14} /> Refresh



                </button>



              </div>



              <input



                type="search"



                value={studentSearch}



                onChange={(event) => setStudentSearch(event.target.value)}



                placeholder="Search by student name, email or roll number"



                aria-label="Search students"



                style={departmentInputStyle}



              />



              {loading ? (



                <p className="ca-empty">Loading students...</p>



              ) : filteredStudents.length === 0 ? (



                <p className="ca-empty">



                  {students.length === 0



                    ? "No student records found."



                    : "No students match your search."}



                </p>



              ) : (



                <div className="ca-table-wrap" style={{ marginTop: 16 }}>



                  <table className="ca-table" style={{ minWidth: 900 }}>



                    <thead>



                      <tr>



                        <th>Name</th>



                        <th>Email</th>



                        <th>Roll Number</th>



                        <th>Semester</th>



                        <th>Current Department</th>



                        <th>Assign / Change Department</th>



                        <th>Action</th>



                      </tr>



                    </thead>



                    <tbody>



                      {filteredStudents.map((item) => (



                        <tr key={item.id}>



                          <td>{item.full_name}</td>



                          <td>{item.email}</td>



                          <td>{item.roll_number || "—"}</td>



                          <td>{item.current_semester || "—"}</td>



                          <td>{item.department || "Not assigned"}</td>



                          <td>



                            <select



                              value={item.department_id || ""}



                              onChange={(event) => {



                                const departmentId = event.target.value;



                                setStudents((current) =>



                                  current.map((student) =>



                                    student.id === item.id



                                      ? { ...student, department_id: departmentId }



                                      : student



                                  )



                                );



                              }}



                              aria-label={`Department for ${item.full_name}`}



                              style={{ ...departmentInputStyle, minWidth: 210, marginTop: 0 }}



                            >



                              <option value="">Select department</option>



                              {departments



                                .filter((department) => department.is_active)



                                .map((department) => (



                                  <option key={department.id} value={department.id}>



                                    {department.name}



                                  </option>



                                ))}



                            </select>



                          </td>



                          <td>



                            <button



                              className="ca-btn"



                              type="button"



                              onClick={() => handleAssignStudentDepartment(item)}



                              disabled={



                                !item.department_id ||



                                savingStudentId === item.id



                              }



                            >



                              {savingStudentId === item.id ? "Saving..." : "Save"}



                            </button>



                          </td>



                        </tr>



                      ))}



                    </tbody>



                  </table>



                </div>



              )}



            </div>



          )}



          {activeSection === "departments" && (



            <>



              <div className="ca-panel">



                <div className="ca-panel-head">



                  <div>



                    <h3>{editingDepartmentId ? "Update Department" : "Create New Department"}</h3>



                    <p className="ca-muted">Add and manage departments in your college</p>



                  </div>



                </div>



                <form onSubmit={handleDepartmentSubmit}>



                  <div



                    style={{



                      display: "grid",



                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",



                      gap: 15,



                    }}



                  >



                    <div>



                      <label className="ca-muted" htmlFor="department-name">Department Name</label>



                      <input



                        id="department-name"



                        value={departmentName}



                        onChange={(event) => setDepartmentName(event.target.value)}



                        placeholder="e.g. Computer Science and Engineering"



                        minLength={2}



                        maxLength={150}



                        required



                        style={departmentInputStyle}



                      />



                    </div>



                    <div>



                      <label className="ca-muted" htmlFor="department-code">Department Code</label>



                      <input



                        id="department-code"



                        value={departmentCode}



                        onChange={(event) => setDepartmentCode(event.target.value.toUpperCase())}



                        placeholder="e.g. CSE"



                        minLength={2}



                        maxLength={50}



                        required



                        style={departmentInputStyle}



                      />



                    </div>



                  </div>



                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>



                    <button className="ca-btn" type="submit" disabled={savingDepartment}>



                      <Plus size={15} />



                      {savingDepartment



                        ? "Saving..."



                        : editingDepartmentId



                          ? "Update Department"



                          : "Create Department"}



                    </button>



                    {editingDepartmentId && (



                      <button



                        className="ca-btn secondary"



                        type="button"



                        onClick={resetDepartmentForm}



                        disabled={savingDepartment}



                      >



                        Cancel



                      </button>



                    )}



                  </div>



                </form>



              </div>



              <div className="ca-panel">



                <div className="ca-panel-head">



                  <div>



                    <h3>College Departments</h3>



                    <p className="ca-muted">{departments.length} departments found</p>



                  </div>



                  <button



                    className="ca-btn secondary"



                    type="button"



                    onClick={loadDepartments}



                  >



                    <RefreshCw size={14} /> Refresh



                  </button>



                </div>



                {loading ? (



                  <p className="ca-empty">Loading departments...</p>



                ) : departments.length === 0 ? (



                  <p className="ca-empty">No departments found. Create your first department above.</p>



                ) : (



                  <div className="ca-table-wrap">



                    <table className="ca-table">



                      <thead>



                        <tr>



                          <th>Department Name</th>



                          <th>Code</th>



                          <th>Status</th>



                          <th>Actions</th>



                        </tr>



                      </thead>



                      <tbody>



                        {departments.map((department) => (



                          <tr key={department.id}>



                            <td>{department.name}</td>



                            <td>{department.code}</td>



                            <td>



                              <span className={department.is_active ? "ca-status" : "ca-status pending"}>



                                {department.is_active ? "Active" : "Inactive"}



                              </span>



                            </td>



                            <td>



                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>



                                <button



                                  className="ca-btn secondary"



                                  type="button"



                                  onClick={() => handleEditDepartment(department)}



                                  disabled={!department.is_active}



                                >



                                  Edit



                                </button>



                                {department.is_active && (



                                  <button



                                    className="ca-btn danger"



                                    type="button"



                                    onClick={() => handleDeactivateDepartment(department.id)}



                                  >



                                    Deactivate



                                  </button>



                                )}



                              </div>



                            </td>



                          </tr>



                        ))}



                      </tbody>



                    </table>



                  </div>



                )}



              </div>



            </>



          )}



          {activeSection === "documents" && (



            <>



              <div className="ca-panel">



                <div className="ca-panel-head">



                  <div>



                    <h3>Upload College Knowledge</h3>



                    <p className="ca-muted">PDF, DOCX or TXT · Maximum 10 MB</p>



                  </div>



                </div>



                <form className="ca-upload" onSubmit={handleUpload}>



                  <Upload size={27} />



                  <p className="ca-muted">Choose a syllabus, notice or college document</p>



                  <input



                    type="file"



                    accept=".pdf,.docx,.txt"



                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}



                  />



                  {selectedFile && <p className="ca-muted">{selectedFile.name}</p>}



                  <button className="ca-btn" type="submit" disabled={uploading}>



                    <Upload size={15} />



                    {uploading ? "Uploading and processing..." : "Upload Document"}



                  </button>



                </form>



              </div>



              <div className="ca-panel">



                <div className="ca-panel-head">



                  <h3>Uploaded Documents</h3>



                  <span className="ca-muted">{documents.length} records on this page</span>



                </div>



                {loading ? <p className="ca-empty">Loading documents...</p> :



                  documents.length === 0 ? <p className="ca-empty">No documents uploaded yet.</p> :



                  <div className="ca-table-wrap">



                    <table className="ca-table">



                      <thead><tr><th>File Name</th><th>Type</th><th>Size</th><th>Chunks</th><th>Status</th><th>Action</th></tr></thead>



                      <tbody>



                        {documents.map((item) => (



                          <tr key={item.id}>



                            <td>{item.file_name}</td>



                            <td>{item.file_type?.toUpperCase()}</td>



                            <td>{(item.file_size / 1024 / 1024).toFixed(2)} MB</td>



                            <td>{item.chunk_count}</td>



                            <td>



                              <span className={`ca-status ${item.status === "completed" ? "" : "pending"}`}>



                                {item.status === "completed" ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}



                                {item.status}



                              </span>



                            </td>



                            <td>



                              <button



                                className="ca-btn danger"



                                onClick={() => handleDeleteDocument(item.id)}



                                title="Delete document"



                              >



                                <Trash2 size={14} /> Delete



                              </button>



                            </td>



                          </tr>



                        ))}



                      </tbody>



                    </table>



                  </div>



                }



              </div>



            </>



          )}




          {activeSection === "learning" && (
            <>
              <div className="ca-panel">
                <div className="ca-panel-head">
                  <div>
                    <h3>Upload Learning Material</h3>
                    <p className="ca-muted">Share notes, assignments, question papers and other resources with students.</p>
                  </div>
                </div>
                <form onSubmit={handleLearningUpload}>
                  <div className="ca-learning-grid">
                    <div className="ca-learning-field">
                      <label htmlFor="learning-title">Resource Title *</label>
                      <input id="learning-title" value={learningTitle} onChange={(event) => setLearningTitle(event.target.value)} placeholder="e.g. Python Unit 1 Notes" maxLength={200} required />
                    </div>
                    <div className="ca-learning-field">
                      <label htmlFor="learning-subject">Subject</label>
                      <input id="learning-subject" value={learningSubject} onChange={(event) => setLearningSubject(event.target.value)} placeholder="e.g. Python Programming" maxLength={120} />
                    </div>
                    <div className="ca-learning-field">
                      <label htmlFor="learning-category">Category *</label>
                      <select id="learning-category" value={learningCategory} onChange={(event) => setLearningCategory(event.target.value)} required>
                        <option value="notes">Notes</option><option value="assignment">Assignment</option>
                        <option value="question_paper">Question Paper</option><option value="syllabus">Syllabus</option>
                        <option value="reference">Reference</option><option value="other">Other</option>
                      </select>
                    </div>
                    <div className="ca-learning-field">
                      <label htmlFor="learning-department">Department (optional)</label>
                      <select id="learning-department" value={learningDepartmentId} onChange={(event) => setLearningDepartmentId(event.target.value)}>
                        <option value="">All departments / College-wide</option>
                        {departments.filter((department) => department.is_active).map((department) => (
                          <option key={department.id} value={department.id}>{department.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="ca-learning-field">
                      <label htmlFor="learning-semester">Semester (1–8) *</label>
                      <select id="learning-semester" value={learningSemester} onChange={(event) => setLearningSemester(event.target.value)} required>
                        <option value="">Select semester</option>
                        {[1,2,3,4,5,6,7,8].map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
                      </select>
                    </div>
                    <div className="ca-learning-field full">
                      <label htmlFor="learning-description">Description</label>
                      <textarea id="learning-description" value={learningDescription} onChange={(event) => setLearningDescription(event.target.value)} placeholder="Briefly describe this resource..." maxLength={2000} />
                    </div>
                    <div className="ca-learning-field full">
                      <label htmlFor="learning-file">Select File * (PDF, DOC, DOCX, PPT, PPTX, TXT, XLS, XLSX · Max 20 MB)</label>
                      <input id="learning-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xls,.xlsx" onChange={(event) => setLearningFile(event.target.files?.[0] || null)} required />
                      {learningFile && <span className="ca-muted">{learningFile.name} · {(learningFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                    </div>
                  </div>
                  <div className="ca-notice-actions" style={{ marginTop: 16 }}>
                    <button className="ca-btn" type="submit" disabled={learningUploading}><Upload size={15} /> {learningUploading ? "Uploading..." : "Upload Material"}</button>
                    <button className="ca-btn secondary" type="button" onClick={() => {
                      setLearningTitle(""); setLearningDescription(""); setLearningSubject("");
                      setLearningCategory("notes"); setLearningDepartmentId(""); setLearningSemester("");
                      setLearningFile(null);
                    }}>Reset</button>
                  </div>
                </form>
              </div>
              <div className="ca-panel">
                <div className="ca-panel-head">
                  <div><h3>College Learning Materials</h3><p className="ca-muted">{filteredLearningResources.length} resources found</p></div>
                  <button className="ca-btn secondary" type="button" onClick={loadLearningResources}><RefreshCw size={14} /> Refresh</button>
                </div>
                <div className="ca-learning-grid" style={{ marginBottom: 16 }}>
                  <div className="ca-learning-field">
                    <label htmlFor="learning-search">Search</label>
                    <input id="learning-search" type="search" value={learningSearch} onChange={(event) => setLearningSearch(event.target.value)} placeholder="Search title, subject, file or department..." />
                  </div>
                  <div className="ca-learning-field">
                    <label htmlFor="learning-filter-department">Department</label>
                    <select id="learning-filter-department" value={learningFilterDepartment} onChange={(event) => setLearningFilterDepartment(event.target.value)}>
                      <option value="">All departments</option>
                      {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                  </div>
                  <div className="ca-learning-field">
                    <label htmlFor="learning-filter-category">Category</label>
                    <select id="learning-filter-category" value={learningFilterCategory} onChange={(event) => setLearningFilterCategory(event.target.value)}>
                      <option value="">All categories</option><option value="notes">Notes</option>
                      <option value="assignment">Assignment</option><option value="question_paper">Question Paper</option>
                      <option value="syllabus">Syllabus</option><option value="reference">Reference</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div className="ca-learning-field">
                    <label htmlFor="learning-filter-semester">Semester</label>
                    <select id="learning-filter-semester" value={learningFilterSemester} onChange={(event) => setLearningFilterSemester(event.target.value)}>
                      <option value="">All semesters</option>
                      {[1,2,3,4,5,6,7,8].map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
                    </select>
                  </div>
                </div>
                {loading ? <p className="ca-empty">Loading learning materials...</p> :
                  filteredLearningResources.length === 0 ? <p className="ca-empty">No learning materials found. Upload a resource or change your filters.</p> : (
                    <div className="ca-learning-list">
                      {filteredLearningResources.map((resource) => (
                        <article className="ca-learning-item" key={resource.id}>
                          <div className="ca-learning-meta">
                            <span className="ca-learning-icon"><BookOpen size={21} /></span>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: "block", fontSize: 12 }}>{resource.title}</strong>
                              <p className="ca-muted" style={{ margin: "5px 0" }}>
                                {[resource.subject, resource.department_name || "College-wide", `Semester ${resource.semester || "All"}`].filter(Boolean).join(" · ")}
                              </p>
                              <p className="ca-muted" style={{ margin: 0 }}>{resource.file_name} · {resource.category} · {resource.file_size ? `${(resource.file_size / 1024 / 1024).toFixed(2)} MB` : ""}</p>
                              {resource.uploader_name && <p className="ca-muted" style={{ margin: "5px 0 0" }}>Uploaded by {resource.uploader_name}</p>}
                            </div>
                          </div>
                          <div className="ca-learning-actions">
                            <button className="ca-btn secondary" type="button" onClick={() => handleLearningDownload(resource)} disabled={learningBusyId === resource.id}><Download size={14} /> Download</button>
                            <button className="ca-btn danger" type="button" onClick={() => handleLearningDelete(resource)} disabled={learningBusyId === resource.id}><Trash2 size={14} /> Delete</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
              </div>
            </>
          )}

          {activeSection === "notices" && (

            <>

              <div className="ca-panel">

                <div className="ca-panel-head">

                  <div>

                    <h3>{editingNoticeId ? "Edit Notice" : "Create New Notice"}</h3>

                    <p className="ca-muted">Published notices are visible to students and faculty in your college.</p>

                  </div>

                </div>

                <form onSubmit={handleNoticeSubmit}>

                  <div className="ca-notice-form">

                    <div className="ca-notice-field full">

                      <label htmlFor="notice-title">Notice Title</label>

                      <input id="notice-title" value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} placeholder="Enter notice title" maxLength={200} required />

                    </div>

                    <div className="ca-notice-field">

                      <label htmlFor="notice-category">Category</label>

                      <select id="notice-category" value={noticeCategory} onChange={(event) => setNoticeCategory(event.target.value)}>

                        <option value="General">General</option>

                        <option value="Academic">Academic</option>

                        <option value="Examination">Examination</option>

                        <option value="Event">Event</option>

                        <option value="Placement">Placement</option>

                        <option value="Holiday">Holiday</option>

                      </select>

                    </div>

                    <div className="ca-notice-field">

                      <label htmlFor="notice-priority">Priority</label>

                      <select id="notice-priority" value={noticePriority} onChange={(event) => setNoticePriority(event.target.value)}>

                        <option value="Normal">Normal</option>

                        <option value="High">High</option>

                        <option value="Urgent">Urgent</option>

                      </select>

                    </div>

                    <div className="ca-notice-field">

                      <label htmlFor="notice-expiry">Expiry Date (optional)</label>

                      <input id="notice-expiry" type="datetime-local" value={noticeExpiresAt} onChange={(event) => setNoticeExpiresAt(event.target.value)} />

                    </div>

                    <div className="ca-notice-field full">

                      <label htmlFor="notice-content">Notice Content</label>

                      <textarea id="notice-content" value={noticeContent} onChange={(event) => setNoticeContent(event.target.value)} placeholder="Write complete notice details..." required />

                    </div>

                  </div>

                  <div className="ca-notice-actions" style={{ marginTop: 16 }}>

                    <button className="ca-btn" type="submit" disabled={savingNotice}>

                      <Plus size={15} /> {savingNotice ? "Saving..." : editingNoticeId ? "Update Notice" : "Create Notice"}

                    </button>

                    {editingNoticeId && <button className="ca-btn secondary" type="button" onClick={resetNoticeForm} disabled={savingNotice}>Cancel Edit</button>}

                  </div>

                </form>

              </div>



              <div className="ca-panel">

                <div className="ca-panel-head">

                  <div>

                    <h3>All Notices</h3>

                    <p className="ca-muted">{notices.length} notices found</p>

                  </div>

                  <button className="ca-btn secondary" type="button" onClick={loadNotices} disabled={loading}>

                    <RefreshCw size={14} /> Refresh

                  </button>

                </div>

                {loading ? <p className="ca-empty">Loading notices...</p> : notices.length === 0 ? (

                  <p className="ca-empty">No notices created yet. Create your first notice above.</p>

                ) : (

                  <div className="ca-table-wrap">

                    <table className="ca-table" style={{ minWidth: 850 }}>

                      <thead><tr><th>Title</th><th>Category</th><th>Priority</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>

                      <tbody>

                        {notices.map((notice) => (

                          <tr key={notice.id}>

                            <td><strong>{notice.title}</strong><div className="ca-muted" style={{ marginTop: 5, maxWidth: 260 }}>{notice.content}</div></td>

                            <td>{notice.category || "General"}</td>

                            <td>{notice.priority || "Normal"}</td>

                            <td>{notice.expires_at ? new Date(notice.expires_at).toLocaleString() : "No expiry"}</td>

                            <td><span className={notice.is_published ? "ca-status" : "ca-status pending"}>{notice.is_published ? "Published" : "Draft"}</span></td>

                            <td>

                              <div className="ca-notice-actions">

                                <button className="ca-btn secondary" type="button" onClick={() => handleEditNotice(notice)}>Edit</button>

                                <button className="ca-btn" type="button" onClick={() => handleToggleNoticePublish(notice)}>{notice.is_published ? "Unpublish" : "Publish"}</button>

                                <button className="ca-btn danger" type="button" onClick={() => handleDeleteNotice(notice.id)} title="Delete notice"><Trash2 size={13} /> Delete</button>

                              </div>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </>

          )}



        </section>



      </main>



    </div>



  );



}
