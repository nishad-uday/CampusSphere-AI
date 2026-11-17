import { useCallback, useEffect, useState } from "react";

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

} from "lucide-react";

import api from "../services/api";

import { useAuth } from "../context/AuthContext";

const navigation = [

  { id: "overview", label: "Overview", icon: LayoutDashboard },

  { id: "faculty", label: "Faculty", icon: Users },

  { id: "students", label: "Students", icon: UserRound },

  { id: "departments", label: "Departments", icon: Building2 },

  { id: "documents", label: "AI Knowledge Base", icon: FileText },

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

      }

    } catch (err) {

      setError(

        err.response?.data?.detail ||

        "Unable to load College Admin data. Please try again."

      );

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

  };

  return (

    <div className="ca-layout">

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

        </section>

      </main>

    </div>

  );

}
