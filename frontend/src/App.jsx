


import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  Bot,
  BookOpen,
  MessagesSquare,
  ShieldCheck,
  Users,
  GraduationCap,
  LogOut,
  UserPlus,
  LockKeyhole,
  Mail,
  ArrowRight,
  Copy,
  UserCog,
  LayoutDashboard,
  UserRound,
  Bell,
  MessageCircle,
  FileText,
  Menu,
  X,
  Search,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Send,
  Paperclip,
  Plus,
  Clock3,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";

import api from "./services/api";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AssistantChat from "./components/AssistantChat";
import CollegeAdminDashboard from "./pages/CollegeAdminDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";

const modules = [
  {
    icon: Users,
    title: "Student Community",
    text: "Connect with classmates, departments and campus groups.",
  },
  {
    icon: Bot,
    title: "AI Campus Assistant",
    text: "Get academic help from verified college information.",
  },
  {
    icon: BookOpen,
    title: "Learning Resources",
    text: "Organize notes, study materials and useful resources.",
  },
  {
    icon: MessagesSquare,
    title: "Academic Q&A",
    text: "Ask questions and learn with help from peers and faculty.",
  },
];

function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="auth-page">
      <Link className="brand" to="/">
        <span className="brand-mark">
          <GraduationCap size={21} />
        </span>
        CampusSphere <b>AI</b>
      </Link>

      <section className="auth-card">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
      </section>

      <footer>CampusSphere AI · One Campus. Every Connection.</footer>
    </main>
  );
}

// --------------------------------------------------
// STUDENT REGISTRATION
// --------------------------------------------------

function Register() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("student");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    college_name: "",
    department_id: "",
    roll_number: "",
    current_semester: "",
  });

  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);

  // Load active colleges when the registration page opens.
  useEffect(() => {
    let cancelled = false;

    async function loadColleges() {
      setCollegesLoading(true);
      try {
        const { data } = await api.get("/auth/colleges");
        if (!cancelled) {
          setColleges(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          const detail = err.response?.data?.detail;
          setError(
            typeof detail === "string"
              ? detail
              : "Unable to load colleges. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) setCollegesLoading(false);
      }
    }

    loadColleges();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load departments whenever the selected college changes.
  useEffect(() => {
    if (!selectedCollegeId) {
      setDepartments([]);
      return undefined;
    }

    let cancelled = false;

    async function loadDepartments() {
      setDepartmentsLoading(true);
      setDepartments([]);
      setForm((previous) => ({ ...previous, department_id: "" }));

      try {
        const { data } = await api.get(
          `/auth/colleges/${selectedCollegeId}/departments`
        );

        if (!cancelled) {
          setDepartments(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          const detail = err.response?.data?.detail;
          setError(
            typeof detail === "string"
              ? detail
              : "Unable to load departments for this college."
          );
        }
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    }

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, [selectedCollegeId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleCollegeChange(e) {
    const collegeId = e.target.value;
    const college = colleges.find((item) => item.id === collegeId);

    setSelectedCollegeId(collegeId);
    setForm((previous) => ({
      ...previous,
      college_name: college?.name || "",
      department_id: "",
    }));
    setDepartments([]);
    setError("");
    setMessage("");
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    // College Admin self-registration.
    // The backend assigns the role; the client never submits a role value.
    if (selectedRole === "college_admin") {
      if (!selectedCollegeId) {
        setError("Please select your college.");
        return;
      }

      setLoading(true);

      try {
        const payload = {
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          college_id: selectedCollegeId,
        };

        await api.post("/auth/register/college-admin", payload);

        setMessage("College Admin account created successfully! You can now login.");
        setTimeout(() => navigate("/login"), 1500);
      } catch (err) {
        const detail = err.response?.data?.detail;

        if (Array.isArray(detail)) {
          setError(detail.map((item) => item.msg).join(", "));
        } else {
          setError(
            typeof detail === "string"
              ? detail
              : "College Admin registration failed. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!selectedCollegeId || !form.college_name) {
      setError("Please select your college.");
      return;
    }

    if (!form.department_id) {
      setError("Please select your department.");
      return;
    }

    if (!form.current_semester) {
      setError("Please select your current semester.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: "student",
        college_name: form.college_name,
        department_id: form.department_id,
        roll_number: form.roll_number.trim(),
        current_semester: Number(form.current_semester),
      };

      await api.post("/auth/register", payload);

      setMessage("Registration successful! You can now login.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail.map((item) => item.msg).join(", "));
      } else {
        setError(
          typeof detail === "string" ? detail : "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Select your account type to continue"
    >
      <div className="registration-roles">
        <button
          type="button"
          className={`role-option ${selectedRole === "student" ? "active" : ""}`}
          onClick={() => {
            setSelectedRole("student");
            setError("");
            setMessage("");
          }}
          aria-pressed={selectedRole === "student"}
          style={{ width: "100%", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}
        >
          <GraduationCap size={24} />
          <div>
            <h3>Student</h3>
            <p>Register using your college, department and roll number.</p>
            <span>Self Registration</span>
          </div>
        </button>

        <button
          type="button"
          className={`role-option ${selectedRole === "faculty" ? "active" : ""}`}
          onClick={() => {
            setSelectedRole("faculty");
            setError("");
            setMessage("");
          }}
          aria-pressed={selectedRole === "faculty"}
          style={{ width: "100%", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}
        >
          <Users size={24} />
          <div>
            <h3>Faculty</h3>
            <p>Contact your College Admin to create your account.</p>
            <span>Admin Created</span>
          </div>
        </button>

        <button
          type="button"
          className={`role-option ${selectedRole === "college_admin" ? "active" : ""}`}
          onClick={() => {
            setSelectedRole("college_admin");
            setError("");
            setMessage("");
          }}
          aria-pressed={selectedRole === "college_admin"}
          style={{ width: "100%", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}
        >
          <ShieldCheck size={24} />
          <div>
            <h3>College Admin</h3>
            <p>Register your college administration account.</p>
            <span>Self Registration</span>
          </div>
        </button>
      </div>

      {selectedRole === "student" ? (
        <>
          <p className="registration-note">
            Student registration is currently open. Enter your details to create your account.
          </p>

          <form onSubmit={handleRegister}>
            <label>Full Name</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />

            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />

            <label>College</label>
            <select
              value={selectedCollegeId}
              onChange={handleCollegeChange}
              required
              disabled={collegesLoading || loading}
            >
              <option value="">
                {collegesLoading ? "Loading colleges..." : "Select your college"}
              </option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>

            <label>Department</label>
            <select
              name="department_id"
              value={form.department_id}
              onChange={handleChange}
              required
              disabled={!selectedCollegeId || departmentsLoading || loading || departments.length === 0}
            >
              <option value="">
                {!selectedCollegeId
                  ? "Select college first"
                  : departmentsLoading
                    ? "Loading departments..."
                    : departments.length === 0
                      ? "No active departments available"
                      : "Select your department"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name} ({department.code})
                </option>
              ))}
            </select>

            <label>Roll Number</label>
            <input
              name="roll_number"
              value={form.roll_number}
              onChange={handleChange}
              placeholder="Enter your college roll number"
              required
            />

            <label>Current Semester</label>
            <select
              name="current_semester"
              value={form.current_semester}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Select your semester</option>
              {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
                <option key={semester} value={semester}>
                  {semester}{semester === 1 ? "st" : semester === 2 ? "nd" : semester === 3 ? "rd" : "th"} Semester
                </option>
              ))}
            </select>

            {error && <p className="error">{error}</p>}
            {message && <p className="success">{message}</p>}

            <button
              className="primary full"
              type="submit"
              disabled={loading || collegesLoading || departmentsLoading}
            >
              <UserPlus size={17} />
              {loading ? "Creating Account..." : "Create Student Account"}
            </button>

            <p className="form-link">
              Already registered? <Link to="/login">Login</Link>
            </p>
          </form>
        </>
      ) : selectedRole === "faculty" ? (
        <div className="registration-note role-message">
          <h3>Faculty Account</h3>
          <p>
            Faculty accounts are created by your College Admin. Please contact
            your college administration and request an account.
          </p>
          <p>Once your account is created, you can log in here.</p>
          <Link className="secondary button-link" to="/login">
            Go to Login
          </Link>
        </div>
      ) : (
        <>
          <p className="registration-note">
            Create your College Admin account and select the college you will manage.
          </p>

          <form onSubmit={handleRegister}>
            <label>Full Name</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
              minLength={2}
              maxLength={150}
              autoComplete="name"
              required
            />

            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              autoComplete="email"
              required
            />

            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />

            <label>Select College</label>
            <select
              value={selectedCollegeId}
              onChange={handleCollegeChange}
              required
              disabled={collegesLoading || loading}
            >
              <option value="">
                {collegesLoading ? "Loading colleges..." : "Select your college"}
              </option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>

            {error && <p className="error" role="alert">{error}</p>}
            {message && <p className="success" role="status">{message}</p>}

            <button
              className="primary full"
              type="submit"
              disabled={loading || collegesLoading || colleges.length === 0}
            >
              <UserPlus size={17} />
              {loading ? "Creating Account..." : "Create Admin Account"}
            </button>

            <p className="form-link">
              Already registered? <Link to="/login">Login</Link>
            </p>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);

      if (data.user.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Login failed. Check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your CampusSphere account"
    >
      <form onSubmit={handleLogin}>
        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />

        <div className="form-link">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="primary full" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
          <ArrowRight size={17} />
        </button>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <p className="form-link center">
          Don't have an account? <Link to="/register">Create New Account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// --------------------------------------------------
// MANDATORY CHANGE PASSWORD
// --------------------------------------------------

function ChangePassword() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setMessage(data.message || "Password changed successfully.");

      await refreshUser();

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to change password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Change Your Password"
      subtitle="Set a new password before accessing your campus workspace"
    >
      <form onSubmit={handleSubmit}>
        <p className="status">
          Signed in as {user?.email}
        </p>

        <label>Current / Temporary Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          required
        />

        <label>New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Create a new password"
          minLength={8}
          maxLength={128}
          required
        />

        <label>Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your new password"
          minLength={8}
          maxLength={128}
          required
        />

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <button className="primary full" type="submit" disabled={loading}>
          <LockKeyhole size={17} />
          {loading ? "Updating..." : "Change Password"}
        </button>

        <button
          type="button"
          className="secondary full"
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          Logout
        </button>
      </form>
    </AuthLayout>
  );
}

// --------------------------------------------------
// FORGOT PASSWORD
// --------------------------------------------------

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setToken("");
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setMessage(data.message);

      // Development mode only.
      if (data.reset_token) {
        setToken(data.reset_token);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Password reset request failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Enter your registered email address"
    >
      <form onSubmit={handleSubmit}>
        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter registered email"
          required
        />

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        {token && (
          <div className="reset-token-box">
            <label>Development Reset Token</label>
            <textarea readOnly value={token} rows={3} />

            <Link
              className="primary button-link full"
              to={`/reset-password?token=${encodeURIComponent(token)}`}
            >
              Continue to Reset Password
            </Link>
          </div>
        )}

        {!token && (
          <button className="primary full" type="submit" disabled={loading}>
            <Mail size={17} />
            {loading ? "Processing..." : "Generate Reset Token"}
          </button>
        )}

        <p className="form-link center">
          Remember your password? <Link to="/login">Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// --------------------------------------------------
// RESET PASSWORD
// --------------------------------------------------

function ResetPassword() {
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });

      setMessage(data.message);
      setToken("");
      setNewPassword("");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Password reset failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a new secure password"
    >
      <form onSubmit={handleSubmit}>
        <label>Reset Token</label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your reset token"
          rows={3}
          required
        />

        <label>New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          minLength={8}
          maxLength={128}
          required
        />

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <button className="primary full" type="submit" disabled={loading}>
          <LockKeyhole size={17} />
          {loading ? "Updating Password..." : "Reset Password"}
        </button>

        <p className="form-link center">
          <Link to="/login">Back to Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// --------------------------------------------------
// FACULTY MANAGEMENT - COLLEGE ADMIN
// --------------------------------------------------

function FacultyManagement() {
  const initialForm = {
    full_name: "",
    email: "",
    department_id: "",
    employee_id: "",
    designation: "",
    specialization: "",
    qualification: "",
    experience_years: "",
    office_location: "",
    bio: "",
  };

  const [form, setForm] = useState(initialForm);
  const [faculty, setFaculty] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentLoadError, setDepartmentLoadError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDepartments() {
      setDepartmentsLoading(true);
      setDepartmentLoadError("");

      try {
        const { data } = await api.get("/admin/departments");
        if (!cancelled) {
          setDepartments((data.items || []).filter((item) => item.is_active));
        }
      } catch (err) {
        if (!cancelled) {
          setDepartmentLoadError(
            err.response?.data?.detail ||
              "Unable to load departments. You can retry by refreshing this page."
          );
        }
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    }

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleCreateFaculty(e) {
    e.preventDefault();
    setError("");
    setFaculty(null);
    setCopied(false);
    setLoading(true);

    try {
      const payload = {
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        department_id: form.department_id.trim() || null,
        employee_id: form.employee_id.trim() || null,
        experience_years:
          form.experience_years === ""
            ? null
            : Number(form.experience_years),
      };

      const { data } = await api.post("/faculty/create", payload);

      setFaculty(data);
      setForm({ ...initialForm });
      e.target.reset();
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join(", ")
            : "Faculty creation failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyPassword() {
    try {
      await navigator.clipboard.writeText(
        faculty?.temporary_password || ""
      );
      setCopied(true);
    } catch {
      setError("Unable to copy password. Please copy it manually.");
    }
  }

  return (
    <main className="faculty-page">
      <style>{`
        .faculty-page {
          min-height: 100vh;
          background: #080d19;
          color: #edf2ff;
          padding-bottom: 55px;
        }

        .faculty-nav {
          min-height: 76px;
          padding: 0 5%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #202e43;
          background: #0d1627;
          gap: 15px;
        }

        .faculty-nav .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          text-decoration: none;
          font-weight: 700;
        }

        .faculty-nav .brand b {
          color: #a995ff;
        }

        .faculty-nav .brand-mark {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          background: #7058df;
          border-radius: 11px;
        }

        .faculty-back {
          padding: 10px 15px;
          border-radius: 9px;
          background: #1c2a40;
          border: 1px solid #34445e;
          color: #d9e2f3;
          text-decoration: none;
          font-size: 12px;
        }

        .faculty-content {
          width: min(100% - 36px, 1050px);
          margin: 42px auto;
        }

        .faculty-eyebrow {
          color: #a995ff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        .faculty-content h1 {
          color: #f4f6ff;
          font-size: clamp(25px, 4vw, 34px);
          margin: 0 0 10px;
        }

        .faculty-lead {
          color: #9cacc5;
          font-size: 13px;
          line-height: 1.7;
          margin-bottom: 28px;
        }

        .faculty-card {
          background: #111c2e;
          border: 1px solid #293a53;
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 22px;
        }

        .faculty-card h2 {
          font-size: 17px;
          margin: 0 0 7px;
        }

        .faculty-card-description {
          color: #8fa0ba;
          font-size: 11px;
          margin-bottom: 25px;
        }

        .faculty-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 19px 22px;
        }

        .faculty-field {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .faculty-field.full-width {
          grid-column: 1 / -1;
        }

        .faculty-field label {
          color: #d6e0f1;
          font-size: 11px;
          font-weight: 600;
        }

        .faculty-field input,
        .faculty-field select,
        .faculty-field textarea {
          width: 100%;
          box-sizing: border-box;
          min-height: 43px;
          padding: 11px 13px;
          border: 1px solid #34455f;
          border-radius: 8px;
          outline: none;
          background: #0b1424;
          color: #edf2ff;
          font-family: inherit;
          font-size: 12px;
          transition: border-color .2s, box-shadow .2s;
        }

        .faculty-field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .faculty-field input::placeholder,
        .faculty-field textarea::placeholder {
          color: #71829c;
        }

        .faculty-field input:focus,
        .faculty-field select:focus,
        .faculty-field textarea:focus {
          border-color: #8872f0;
          box-shadow: 0 0 0 3px #7058df25;
        }

        .faculty-field small {
          color: #7f90aa;
          font-size: 10px;
          line-height: 1.5;
        }

        .faculty-form-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 25px;
        }

        .faculty-submit {
          min-height: 45px;
          padding: 0 23px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 9px;
          background: linear-gradient(100deg, #7058df, #4298d1);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .faculty-submit:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .faculty-error {
          background: #351e2a;
          border: 1px solid #713747;
          border-radius: 9px;
          padding: 12px 14px;
          margin-top: 20px;
          color: #ffb6c2;
          font-size: 11px;
        }

        .faculty-success {
          border-color: #28634d;
        }

        .faculty-success-label {
          color: #8de0b8;
          font-size: 11px;
          margin: 12px 0 20px;
        }

        .faculty-result-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .faculty-result-item {
          padding: 13px;
          background: #0b1424;
          border: 1px solid #273950;
          border-radius: 9px;
          min-width: 0;
        }

        .faculty-result-item small {
          display: block;
          color: #8fa0ba;
          font-size: 10px;
          margin-bottom: 7px;
        }

        .faculty-result-item strong {
          display: block;
          color: #edf2ff;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .faculty-password-row {
          display: flex;
          gap: 9px;
          margin-top: 10px;
        }

        .faculty-password-row input {
          flex: 1;
          min-width: 0;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #34455f;
          background: #0b1424;
          color: #fff;
          font-size: 13px;
        }

        .faculty-copy {
          min-width: 90px;
          border: 0;
          border-radius: 8px;
          background: #7058df;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .faculty-password-note {
          color: #9baac0;
          font-size: 11px;
          line-height: 1.7;
          margin-top: 14px;
        }

        @media(max-width: 650px) {
          .faculty-content {
            width: calc(100% - 26px);
            margin: 27px auto;
          }

          .faculty-card {
            padding: 19px 15px;
          }

          .faculty-form-grid,
          .faculty-result-grid {
            grid-template-columns: 1fr;
          }

          .faculty-field.full-width {
            grid-column: auto;
          }

          .faculty-nav {
            padding: 0 13px;
          }

          .faculty-back {
            font-size: 10px;
            padding: 9px;
          }

          .faculty-form-actions {
            justify-content: stretch;
          }

          .faculty-submit {
            width: 100%;
          }
        }
      `}</style>

      <nav className="faculty-nav">
        <Link className="brand" to="/dashboard">
          <span className="brand-mark">
            <GraduationCap size={21} />
          </span>
          CampusSphere <b>AI</b>
        </Link>

        <Link className="faculty-back" to="/dashboard">
          Back to Dashboard
        </Link>
      </nav>

      <section className="faculty-content">
        <p className="faculty-eyebrow">COLLEGE ADMINISTRATION</p>
        <h1>Create Faculty Account</h1>
        <p className="faculty-lead">
          Add a faculty member to your college. A temporary password
          will be generated automatically.
        </p>

        <div className="faculty-card">
          <h2>Faculty Information</h2>
          <p className="faculty-card-description">
            Enter the faculty member's personal and professional details.
          </p>

          <form onSubmit={handleCreateFaculty}>
            <div className="faculty-form-grid">
              <div className="faculty-field">
                <label htmlFor="faculty-full-name">Full Name *</label>
                <input
                  id="faculty-full-name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  minLength={2}
                  maxLength={150}
                  required
                />
              </div>

              <div className="faculty-field">
                <label htmlFor="faculty-email">Email Address *</label>
                <input
                  id="faculty-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="faculty@college.edu"
                  required
                />
              </div>

              <div className="faculty-field">
                <label htmlFor="faculty-employee">Employee ID</label>
                <input
                  id="faculty-employee"
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  placeholder="e.g. RIT-FAC-003"
                  maxLength={50}
                />
              </div>

              <div className="faculty-field">
                <label htmlFor="faculty-designation">Designation</label>
                <input
                  id="faculty-designation"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="Assistant Professor"
                  maxLength={100}
                />
              </div>

              <div className="faculty-field">
                <label htmlFor="faculty-department">Department (Optional)</label>
                <select
                  id="faculty-department"
                  name="department_id"
                  value={form.department_id}
                  onChange={handleChange}
                  disabled={departmentsLoading || departments.length === 0}
                >
                  <option value="">
                    {departmentsLoading
                      ? "Loading departments..."
                      : departments.length === 0
                        ? "No active departments available"
                        : "Select a department"}
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
                </select>
                {departmentLoadError ? (
                  <small role="alert" style={{ color: "#ffb6c2" }}>
                    {departmentLoadError}
                  </small>
                ) : (
                  <small>
                    Select an active department. The department ID will be
                    submitted automatically. Leave blank if unassigned.
                  </small>
                )}
              </div>

              <div className="faculty-field">
                <label htmlFor="faculty-specialization">Specialization</label>
                <input
                  id="faculty-specialization"
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  placeholder="Artificial Intelligence"
                  maxLength={150}
                />
              </div>

              <div className="faculty-field">
                <label htmlFor="faculty-qualification">Qualification</label>
                <input
                  id="faculty-qualification"
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  placeholder="M.Tech / Ph.D."
                  maxLength={150}
                />
              </div>

              <div className="faculty-field">
                <label htmlFor="faculty-experience">Experience (Years)</label>
                <input
                  id="faculty-experience"
                  type="number"
                  min="0"
                  max="60"
                  name="experience_years"
                  value={form.experience_years}
                  onChange={handleChange}
                  placeholder="Years of experience"
                />
              </div>

              <div className="faculty-field full-width">
                <label htmlFor="faculty-office">Office Location</label>
                <input
                  id="faculty-office"
                  name="office_location"
                  value={form.office_location}
                  onChange={handleChange}
                  placeholder="Block A, Room 101"
                  maxLength={150}
                />
              </div>

              <div className="faculty-field full-width">
                <label htmlFor="faculty-bio">Faculty Bio</label>
                <textarea
                  id="faculty-bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={4}
                  maxLength={1000}
                  placeholder="Write a short professional introduction..."
                />
              </div>
            </div>

            {error && (
              <div className="faculty-error" role="alert">
                {error}
              </div>
            )}

            <div className="faculty-form-actions">
              <button
                className="faculty-submit"
                type="submit"
                disabled={loading}
              >
                <UserPlus size={17} />
                {loading ? "Creating Faculty..." : "Create Faculty Account"}
              </button>
            </div>
          </form>
        </div>

        {faculty && (
          <div className="faculty-card faculty-success">
            <h2>Faculty Account Created Successfully</h2>

            <p className="faculty-success-label">
              Temporary password generated successfully. Save it before
              leaving this page.
            </p>

            <div className="faculty-result-grid">
              <div className="faculty-result-item">
                <small>Full Name</small>
                <strong>{faculty.full_name}</strong>
              </div>

              <div className="faculty-result-item">
                <small>Email Address</small>
                <strong>{faculty.email}</strong>
              </div>

              <div className="faculty-result-item">
                <small>Employee ID</small>
                <strong>{faculty.employee_id || "Not provided"}</strong>
              </div>

              <div className="faculty-result-item">
                <small>Role</small>
                <strong>{faculty.role}</strong>
              </div>
            </div>

            <div className="faculty-field" style={{ marginTop: 22 }}>
              <label>Temporary Password — Show Only Once</label>

              <div className="faculty-password-row">
                <input
                  readOnly
                  value={faculty.temporary_password || ""}
                  aria-label="Temporary password"
                />

                <button
                  type="button"
                  className="faculty-copy"
                  onClick={handleCopyPassword}
                >
                  {copied ? "Copied!" : "Copy Password"}
                </button>
              </div>
            </div>

            <p className="faculty-password-note">
              Share this password securely with the faculty member.
              They must change it after their first login.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}


// --------------------------------------------------
// STUDENT DASHBOARD
// UI foundation first; module APIs will be connected
// in later implementation phases.
// --------------------------------------------------

function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [searchTerm, setSearchTerm] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileForm, setProfileForm] = useState({
    full_name: "", enrollment_number: "", admission_year: "", graduation_year: "",
    current_semester: "", section: "", bio: "", skills: "",
    github_url: "", linkedin_url: "", portfolio_url: "",
  });
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState("");
  const [communitySuccess, setCommunitySuccess] = useState("");
  const [communityDraft, setCommunityDraft] = useState("");
  const [communitySubmitting, setCommunitySubmitting] = useState(false);
  const [communityComments, setCommunityComments] = useState({});
  const [communityCommentDrafts, setCommunityCommentDrafts] = useState({});
  const [communityExpandedPost, setCommunityExpandedPost] = useState(null);
  const [communityCommentLoading, setCommunityCommentLoading] = useState({});

  // Notices state
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticesError, setNoticesError] = useState("");
  const [selectedNotice, setSelectedNotice] = useState(null);

  // Student learning resources state
  const [learningResources, setLearningResources] = useState([]);
  const [learningResourcesLoading, setLearningResourcesLoading] = useState(false);
  const [learningResourcesError, setLearningResourcesError] = useState("");
  const [learningResourcesSearch, setLearningResourcesSearch] = useState("");
  const [learningResourcesCategory, setLearningResourcesCategory] = useState("");
  const [learningResourcesDownloading, setLearningResourcesDownloading] = useState({});

  // Academic Q&A state
  const [qaQuestions, setQaQuestions] = useState([]);
  const [qaDepartments, setQaDepartments] = useState([]);
  const [qaDepartmentFilter, setQaDepartmentFilter] = useState("");
  const [qaResolvedFilter, setQaResolvedFilter] = useState("all");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaDepartmentsLoading, setQaDepartmentsLoading] = useState(false);
  const [qaError, setQaError] = useState("");
  const [qaSuccess, setQaSuccess] = useState("");
  const [qaQuestionTitle, setQaQuestionTitle] = useState("");
  const [qaQuestionContent, setQaQuestionContent] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);
  const [qaExpandedQuestion, setQaExpandedQuestion] = useState(null);
  const [qaAnswers, setQaAnswers] = useState({});
  const [qaAnswersLoading, setQaAnswersLoading] = useState({});
  const [qaAnswerDrafts, setQaAnswerDrafts] = useState({});
  const [qaAnswerSubmitting, setQaAnswerSubmitting] = useState({});

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

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      setLogoutError("Fullscreen mode is not available in this browser.");
    }
  }

  useEffect(() => {
    
    let cancelled = false;
    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");
      try {
        const { data } = await api.get("/auth/me/profile");
        if (!cancelled) {
          setStudentProfile(data);
          setProfileForm({
            full_name: data.full_name || "",
            enrollment_number: data.enrollment_number || "",
            admission_year: data.admission_year ?? "",
            graduation_year: data.graduation_year ?? "",
            current_semester: data.current_semester ?? "",
            section: data.section || "",
            bio: data.bio || "",
            skills: data.skills || "",
            github_url: data.github_url || "",
            linkedin_url: data.linkedin_url || "",
            portfolio_url: data.portfolio_url || "",
          });
        }
      } catch (error) {
        if (!cancelled) setProfileError(error.response?.data?.detail || "Unable to load your profile.");
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, []);

  async function loadCommunityFeed() {
    setCommunityLoading(true);
    setCommunityError("");
    try {
      const { data } = await api.get("/community/posts", { params: { skip: 0, limit: 50 } });
      setCommunityPosts(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setCommunityError(error.response?.data?.detail || "Unable to load the community feed.");
    } finally {
      setCommunityLoading(false);
    }
  }

  async function loadAcademicQuestions() {
    setQaLoading(true);
    setQaError("");
    try {
      const params = { skip: 0, limit: 50 };
      if (qaDepartmentFilter) params.department_id = qaDepartmentFilter;
      if (qaResolvedFilter !== "all") params.is_resolved = qaResolvedFilter === "resolved";
      const { data } = await api.get("/academic-qa/questions", { params });
      setQaQuestions(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to load academic questions.");
    } finally {
      setQaLoading(false);
    }
  }

  async function loadQaDepartments() {
    if (!user?.college_id) return;
    setQaDepartmentsLoading(true);
    try {
      const { data } = await api.get(`/auth/colleges/${user.college_id}/departments`);
      setQaDepartments(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to load departments.");
    } finally {
      setQaDepartmentsLoading(false);
    }
  }

  useEffect(() => {
    if (activeSection !== "qa") return;
    loadAcademicQuestions();
    if (qaDepartments.length === 0) loadQaDepartments();
  }, [activeSection, qaDepartmentFilter, qaResolvedFilter]);

  async function createAcademicQuestion(event) {
    event.preventDefault();
    const title = qaQuestionTitle.trim();
    const content = qaQuestionContent.trim();
    if (!title || !content) return;
    setQaSubmitting(true);
    setQaError("");
    setQaSuccess("");
    try {
      await api.post("/academic-qa/questions", { title, content });
      setQaQuestionTitle("");
      setQaQuestionContent("");
      setQaSuccess("Your question was published.");
      await loadAcademicQuestions();
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to publish your question.");
    } finally {
      setQaSubmitting(false);
    }
  }

  async function loadAcademicAnswers(questionId) {
    setQaAnswersLoading((current) => ({ ...current, [questionId]: true }));
    try {
      const { data } = await api.get(`/academic-qa/questions/${questionId}/answers`);
      setQaAnswers((current) => ({
        ...current,
        [questionId]: Array.isArray(data.items) ? data.items : [],
      }));
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to load answers.");
    } finally {
      setQaAnswersLoading((current) => ({ ...current, [questionId]: false }));
    }
  }

  async function toggleAcademicAnswers(questionId) {
    if (qaExpandedQuestion === questionId) {
      setQaExpandedQuestion(null);
      return;
    }
    setQaExpandedQuestion(questionId);
    await loadAcademicAnswers(questionId);
  }

  async function addAcademicAnswer(event, questionId) {
    event.preventDefault();
    const content = (qaAnswerDrafts[questionId] || "").trim();
    if (!content) return;
    setQaAnswerSubmitting((current) => ({ ...current, [questionId]: true }));
    setQaError("");
    try {
      await api.post(`/academic-qa/questions/${questionId}/answers`, { content });
      setQaAnswerDrafts((current) => ({ ...current, [questionId]: "" }));
      await loadAcademicAnswers(questionId);
      await loadAcademicQuestions();
      setQaSuccess("Your answer was added.");
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to add your answer.");
    } finally {
      setQaAnswerSubmitting((current) => ({ ...current, [questionId]: false }));
    }
  }

  async function toggleAcademicAnswerLike(answerId, questionId) {
    setQaError("");
    try {
      const { data } = await api.post(`/academic-qa/answers/${answerId}/like`);
      setQaAnswers((current) => ({
        ...current,
        [questionId]: (current[questionId] || []).map((answer) =>
          answer.id === answerId
            ? { ...answer, has_liked: data.liked, like_count: data.like_count }
            : answer
        ),
      }));
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to update answer like.");
    }
  }

  async function acceptAcademicAnswer(questionId, answerId) {
    setQaError("");
    setQaSuccess("");
    try {
      await api.post(`/academic-qa/questions/${questionId}/accept/${answerId}`);
      setQaSuccess("Answer accepted. The question is now resolved.");
      await loadAcademicAnswers(questionId);
      await loadAcademicQuestions();
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to accept this answer.");
    }
  }

  async function deleteAcademicQuestion(questionId) {
    if (!window.confirm("Delete this question and all its answers?")) return;
    setQaError("");
    try {
      await api.delete(`/academic-qa/questions/${questionId}`);
      setQaQuestions((current) => current.filter((question) => question.id !== questionId));
      setQaSuccess("Question deleted successfully.");
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to delete this question.");
    }
  }

  async function deleteAcademicAnswer(questionId, answerId) {
    if (!window.confirm("Delete this answer?")) return;
    setQaError("");
    try {
      await api.delete(`/academic-qa/answers/${answerId}`);
      setQaAnswers((current) => ({
        ...current,
        [questionId]: (current[questionId] || []).filter((answer) => answer.id !== answerId),
      }));
      await loadAcademicQuestions();
      setQaSuccess("Answer deleted successfully.");
    } catch (error) {
      setQaError(error.response?.data?.detail || "Unable to delete this answer.");
    }
  }

  async function loadNotices() {
    setNoticesLoading(true);
    setNoticesError("");
    try {
      const { data } = await api.get("/notices", { params: { skip: 0, limit: 50 } });
      setNotices(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setNoticesError(error.response?.data?.detail || "Unable to load campus notices.");
    } finally {
      setNoticesLoading(false);
    }
  }

  async function loadLearningResources() {
    setLearningResourcesLoading(true);
    setLearningResourcesError("");
    try {
      const params = { skip: 0, limit: 100 };
      if (learningResourcesSearch.trim()) params.search = learningResourcesSearch.trim();
      if (learningResourcesCategory) params.category = learningResourcesCategory;

      const { data } = await api.get("/learning-resources", { params });
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.results)
            ? data.results
            : [];
      setLearningResources(items);
    } catch (error) {
      const detail = error.response?.data?.detail;
      setLearningResourcesError(
        Array.isArray(detail)
          ? detail.map((item) => item.msg).join(", ")
          : detail || "Unable to load learning resources. Please try again."
      );
    } finally {
      setLearningResourcesLoading(false);
    }
  }

  async function downloadLearningResource(resource) {
    setLearningResourcesError("");
    setLearningResourcesDownloading((current) => ({
      ...current,
      [resource.id]: true,
    }));

    try {
      const response = await api.get(
        `/learning-resources/${resource.id}/download`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: response.headers?.["content-type"] || resource.mime_type || "application/octet-stream",
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = resource.file_name || "learning-resource";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setLearningResourcesError(
        error.response?.data?.detail || "Unable to download this resource. Please try again."
      );
    } finally {
      setLearningResourcesDownloading((current) => ({
        ...current,
        [resource.id]: false,
      }));
    }
  }

  useEffect(() => {
    if (activeSection === "notices") loadNotices();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "resources") loadLearningResources();
  }, [activeSection, learningResourcesSearch, learningResourcesCategory]);

  useEffect(() => {
    if (activeSection === "community") loadCommunityFeed();
  }, [activeSection]);

  async function createCommunityPost(event) {
    event.preventDefault();
    const content = communityDraft.trim();
    if (!content) return;
    setCommunitySubmitting(true);
    setCommunityError("");
    setCommunitySuccess("");
    try {
      await api.post("/community/posts", { content });
      setCommunityDraft("");
      setCommunitySuccess("Your post was published.");
      await loadCommunityFeed();
    } catch (error) {
      setCommunityError(error.response?.data?.detail || "Unable to publish your post.");
    } finally {
      setCommunitySubmitting(false);
    }
  }

  async function toggleCommunityLike(postId) {
    setCommunityError("");
    try {
      const { data } = await api.post(`/community/posts/${postId}/like`);
      setCommunityPosts((posts) => posts.map((post) => post.id === postId
        ? { ...post, has_liked: data.liked, like_count: data.like_count }
        : post));
    } catch (error) {
      setCommunityError(error.response?.data?.detail || "Unable to update the like.");
    }
  }

  async function loadCommunityComments(postId) {
    setCommunityCommentLoading((current) => ({ ...current, [postId]: true }));
    try {
      const { data } = await api.get(`/community/posts/${postId}/comments`);
      setCommunityComments((current) => ({ ...current, [postId]: Array.isArray(data.items) ? data.items : [] }));
    } catch (error) {
      setCommunityError(error.response?.data?.detail || "Unable to load comments.");
    } finally {
      setCommunityCommentLoading((current) => ({ ...current, [postId]: false }));
    }
  }

  async function toggleCommunityComments(postId) {
    if (communityExpandedPost === postId) {
      setCommunityExpandedPost(null);
      return;
    }
    setCommunityExpandedPost(postId);
    await loadCommunityComments(postId);
  }

  async function addCommunityComment(event, postId) {
    event.preventDefault();
    const content = (communityCommentDrafts[postId] || "").trim();
    if (!content) return;
    setCommunityError("");
    try {
      await api.post(`/community/posts/${postId}/comments`, { content });
      setCommunityCommentDrafts((current) => ({ ...current, [postId]: "" }));
      await loadCommunityComments(postId);
      setCommunityPosts((posts) => posts.map((post) => post.id === postId
        ? { ...post, comment_count: post.comment_count + 1 }
        : post));
    } catch (error) {
      setCommunityError(error.response?.data?.detail || "Unable to add your comment.");
    }
  }

  async function deleteCommunityPost(postId) {
    if (!window.confirm("Delete this post? This will also remove its comments and likes.")) return;
    setCommunityError("");
    try {
      await api.delete(`/community/posts/${postId}`);
      setCommunityPosts((posts) => posts.filter((post) => post.id !== postId));
      setCommunitySuccess("Post deleted successfully.");
    } catch (error) {
      setCommunityError(error.response?.data?.detail || "Unable to delete this post.");
    }
  }

  async function deleteCommunityComment(postId, commentId) {
    setCommunityError("");
    try {
      await api.delete(`/community/comments/${commentId}`);
      setCommunityComments((current) => ({
        ...current,
        [postId]: (current[postId] || []).filter((comment) => comment.id !== commentId),
      }));
      setCommunityPosts((posts) => posts.map((post) => post.id === postId
        ? { ...post, comment_count: Math.max(0, post.comment_count - 1) }
        : post));
    } catch (error) {
      setCommunityError(error.response?.data?.detail || "Unable to delete this comment.");
    }
  }

  function renderCommunity() {
    return (
      <section className="cs-community">
        <div className="cs-panel cs-community-compose">
          <div className="cs-panel-heading">
            <div><h3>Share with your campus</h3><p>Post updates, ideas and questions with your college community.</p></div>
          </div>
          <form onSubmit={createCommunityPost}>
            <textarea value={communityDraft} onChange={(event) => setCommunityDraft(event.target.value)} maxLength={5000} rows={4} placeholder="What's happening on campus?" aria-label="Write a community post" />
            <div className="cs-community-compose-footer"><small>{communityDraft.length}/5000</small><button className="primary" type="submit" disabled={communitySubmitting || !communityDraft.trim()}><Send size={15} />{communitySubmitting ? "Publishing..." : "Publish post"}</button></div>
          </form>
        </div>
        {communityError && <p className="cs-community-alert error" role="alert">{Array.isArray(communityError) ? communityError.map((item) => item.msg).join(", ") : communityError}</p>}
        {communitySuccess && <p className="cs-community-alert success" role="status">{communitySuccess}</p>}
        <div className="cs-community-feed-heading"><div><h3>Campus Feed</h3><p>{communityPosts.length} posts loaded</p></div><button className="cs-outline-button" type="button" onClick={loadCommunityFeed}>Refresh feed</button></div>
        {communityLoading ? <section className="cs-panel"><p>Loading community posts...</p></section> : communityPosts.length === 0 ? (
          <section className="cs-panel cs-community-empty"><Users size={30} /><h3>No posts yet</h3><p>Be the first to share something with your campus.</p></section>
        ) : communityPosts.map((post) => {
          const authorInitials = (post.author_name || "Student").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
          const isOwnPost = post.user_id === user?.id;
          return (
            <article className="cs-panel cs-community-post" key={post.id}>
              <div className="cs-community-post-head"><span className="cs-avatar">{authorInitials}</span><div className="cs-community-author"><strong>{post.author_name || "Campus member"}</strong><small>{post.created_at ? new Date(post.created_at).toLocaleString() : "Just now"}</small></div>{isOwnPost && <button className="cs-community-delete" type="button" onClick={() => deleteCommunityPost(post.id)}>Delete post</button>}</div>
              <p className="cs-community-post-content">{post.content}</p>
              <div className="cs-community-actions"><button type="button" className={post.has_liked ? "liked" : ""} onClick={() => toggleCommunityLike(post.id)}><span aria-hidden="true">{post.has_liked ? "♥" : "♡"}</span> {post.has_liked ? "Liked" : "Like"} · {post.like_count}</button><button type="button" onClick={() => toggleCommunityComments(post.id)}><MessageCircle size={15} /> Comments · {post.comment_count}</button></div>
              {communityExpandedPost === post.id && <div className="cs-community-comments">
                {communityCommentLoading[post.id] ? <p>Loading comments...</p> : (communityComments[post.id] || []).length === 0 ? <p className="cs-community-no-comments">No comments yet. Start the conversation.</p> : (communityComments[post.id] || []).map((comment) => (
                  <div className="cs-community-comment" key={comment.id}><span className="cs-avatar cs-avatar-small">{(comment.author_name || "S").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><strong>{comment.author_name || "Campus member"}</strong><p>{comment.content}</p><small>{comment.created_at ? new Date(comment.created_at).toLocaleString() : ""}</small></div>{comment.user_id === user?.id && <button type="button" onClick={() => deleteCommunityComment(post.id, comment.id)}>Delete</button>}</div>
                ))}
                <form className="cs-community-comment-form" onSubmit={(event) => addCommunityComment(event, post.id)}><input value={communityCommentDrafts[post.id] || ""} onChange={(event) => setCommunityCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={2000} placeholder="Write a comment..." aria-label="Write a comment" /><button className="primary" type="submit" disabled={!(communityCommentDrafts[post.id] || "").trim()}><Send size={14} /> Send</button></form>
              </div>}
            </article>
          );
        })}
      </section>
    );
  }

  function renderAcademicQA() {
    return (
      <section className="cs-community cs-qa">
        <div className="cs-panel cs-community-compose">
          <div className="cs-panel-heading">
            <div>
              <h3>Ask an academic question</h3>
              <p>Get help from students and faculty across your college.</p>
            </div>
          </div>
          <form onSubmit={createAcademicQuestion}>
            <label className="cs-edit-field">
              <span>Question title</span>
              <input
                value={qaQuestionTitle}
                onChange={(event) => setQaQuestionTitle(event.target.value)}
                maxLength={250}
                minLength={5}
                placeholder="e.g. How does inheritance work in Python?"
                required
              />
            </label>
            <label className="cs-edit-field cs-qa-question-content">
              <span>Describe your question</span>
              <textarea
                value={qaQuestionContent}
                onChange={(event) => setQaQuestionContent(event.target.value)}
                maxLength={10000}
                minLength={10}
                rows={4}
                placeholder="Add details so others can give a helpful answer..."
                required
              />
            </label>
            <div className="cs-community-compose-footer">
              <small>{qaQuestionContent.length}/10000</small>
              <button className="primary" type="submit" disabled={qaSubmitting || !qaQuestionTitle.trim() || !qaQuestionContent.trim()}>
                <Send size={15} />{qaSubmitting ? "Posting..." : "Post question"}
              </button>
            </div>
          </form>
        </div>

        {qaError && <p className="cs-community-alert error" role="alert">{Array.isArray(qaError) ? qaError.map((item) => item.msg).join(", ") : qaError}</p>}
        {qaSuccess && <p className="cs-community-alert success" role="status">{qaSuccess}</p>}

        <div className="cs-qa-toolbar">
          <div className="cs-community-feed-heading">
            <div><h3>Academic Discussions</h3><p>{qaQuestions.length} questions loaded</p></div>
            <button className="cs-outline-button" type="button" onClick={loadAcademicQuestions}>Refresh</button>
          </div>
          <div className="cs-qa-filters">
            <label>
              <span>Department</span>
              <select value={qaDepartmentFilter} onChange={(event) => setQaDepartmentFilter(event.target.value)} disabled={qaDepartmentsLoading}>
                <option value="">All departments</option>
                {qaDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={qaResolvedFilter} onChange={(event) => setQaResolvedFilter(event.target.value)}>
                <option value="all">All questions</option>
                <option value="open">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
          </div>
        </div>

        {qaLoading ? (
          <section className="cs-panel"><p>Loading academic questions...</p></section>
        ) : qaQuestions.length === 0 ? (
          <section className="cs-panel cs-community-empty"><MessagesSquare size={30} /><h3>No questions found</h3><p>Be the first to ask an academic question.</p></section>
        ) : qaQuestions.map((question) => {
          const isOwnQuestion = question.user_id === user?.id;
          const answers = qaAnswers[question.id] || [];
          const initialsFor = (name) => (name || "Campus member").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
          return (
            <article className="cs-panel cs-community-post cs-qa-question" key={question.id}>
              <div className="cs-community-post-head">
                <span className="cs-avatar">{initialsFor(question.author_name)}</span>
                <div className="cs-community-author">
                  <strong>{question.author_name || "Campus member"}</strong>
                  <small>{question.department_name || "College-wide"} · {question.created_at ? new Date(question.created_at).toLocaleString() : "Just now"}</small>
                </div>
                <span className={`cs-qa-status ${question.is_resolved ? "resolved" : ""}`}>{question.is_resolved ? "Resolved" : "Open"}</span>
                {isOwnQuestion && <button className="cs-community-delete" type="button" onClick={() => deleteAcademicQuestion(question.id)}>Delete</button>}
              </div>
              <h3 className="cs-qa-title">{question.title}</h3>
              <p className="cs-community-post-content">{question.content}</p>
              <div className="cs-community-actions">
                <button type="button" onClick={() => toggleAcademicAnswers(question.id)}><MessageCircle size={15} /> {qaExpandedQuestion === question.id ? "Hide answers" : "Answers"} · {question.answer_count}</button>
              </div>
              {qaExpandedQuestion === question.id && (
                <div className="cs-community-comments cs-qa-answers">
                  {qaAnswersLoading[question.id] ? <p>Loading answers...</p> : answers.length === 0 ? <p className="cs-community-no-comments">No answers yet. Share what you know.</p> : answers.map((answer) => (
                    <div className={`cs-qa-answer ${answer.is_accepted ? "accepted" : ""}`} key={answer.id}>
                      <div className="cs-community-comment">
                        <span className="cs-avatar cs-avatar-small">{initialsFor(answer.author_name)}</span>
                        <div className="cs-qa-answer-body">
                          <strong>{answer.author_name || "Campus member"}</strong>
                          <small>{answer.author_role || "member"} · {answer.created_at ? new Date(answer.created_at).toLocaleString() : ""}</small>
                          <p>{answer.content}</p>
                          <div className="cs-community-actions cs-qa-answer-actions">
                            <button type="button" className={answer.has_liked ? "liked" : ""} onClick={() => toggleAcademicAnswerLike(answer.id, question.id)}><span aria-hidden="true">{answer.has_liked ? "♥" : "♡"}</span> {answer.has_liked ? "Liked" : "Like"} · {answer.like_count}</button>
                            {isOwnQuestion && !question.is_resolved && <button type="button" onClick={() => acceptAcademicAnswer(question.id, answer.id)}>Accept answer</button>}
                            {answer.is_accepted && <span className="cs-qa-accepted-label">✓ Accepted answer</span>}
                          </div>
                        </div>
                        {answer.user_id === user?.id && <button className="cs-community-delete" type="button" onClick={() => deleteAcademicAnswer(question.id, answer.id)}>Delete</button>}
                      </div>
                    </div>
                  ))}
                  {!question.is_resolved && (
                    <form className="cs-community-comment-form" onSubmit={(event) => addAcademicAnswer(event, question.id)}>
                      <input value={qaAnswerDrafts[question.id] || ""} onChange={(event) => setQaAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={10000} placeholder="Write an answer..." aria-label="Write an answer" />
                      <button className="primary" type="submit" disabled={qaAnswerSubmitting[question.id] || !(qaAnswerDrafts[question.id] || "").trim()}><Send size={14} /> {qaAnswerSubmitting[question.id] ? "Sending..." : "Answer"}</button>
                    </form>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    );
  }

  function updateProfileField(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  async function saveStudentProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");
    const payload = {
      ...profileForm,
      admission_year: profileForm.admission_year === "" ? null : Number(profileForm.admission_year),
      graduation_year: profileForm.graduation_year === "" ? null : Number(profileForm.graduation_year),
      current_semester: profileForm.current_semester === "" ? null : Number(profileForm.current_semester),
      enrollment_number: profileForm.enrollment_number || null,
      section: profileForm.section || null, bio: profileForm.bio || null, skills: profileForm.skills || null,
      github_url: profileForm.github_url || null, linkedin_url: profileForm.linkedin_url || null,
      portfolio_url: profileForm.portfolio_url || null,
    };
    try {
      const { data } = await api.patch("/auth/me/profile", payload);
      setStudentProfile(data);
      setProfileForm({
        full_name: data.full_name || "", enrollment_number: data.enrollment_number || "",
        admission_year: data.admission_year ?? "", graduation_year: data.graduation_year ?? "",
        current_semester: data.current_semester ?? "", section: data.section || "",
        bio: data.bio || "", skills: data.skills || "", github_url: data.github_url || "",
        linkedin_url: data.linkedin_url || "", portfolio_url: data.portfolio_url || "",
      });
      setProfileEditing(false);
      setProfileSuccess("Profile updated successfully.");
    } catch (error) {
      setProfileError(error.response?.data?.detail || "Profile update failed. Please check your entries.");
    } finally {
      setProfileSaving(false);
    }
  }


  async function loadMessageContacts() {
    try {
      const { data } = await api.get("/messages/contacts");
      setMessageContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessagesError(error.response?.data?.detail || "Unable to load message contacts.");
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
      setMessagesError(error.response?.data?.detail || "Unable to load conversations.");
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
      setMessagesError(error.response?.data?.detail || "Unable to load this conversation.");
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
      setMessagesError(error.response?.data?.detail || "Unable to open this conversation.");
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
      await api.post(
        `/messages/conversations/${selectedConversation.id}/messages`,
        { content }
      );
      setMessageDraft("");
      await loadConversationMessages(selectedConversation.id, true);
      setMessagesSuccess("Message sent.");
    } catch (error) {
      setMessagesError(error.response?.data?.detail || "Unable to send your message.");
    } finally {
      setMessageSending(false);
    }
  }

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

  function renderMessages() {
    const filteredContacts = messageContacts.filter((contact) =>
      `${contact.full_name || ""} ${contact.email || ""} ${contact.department_name || ""}`
        .toLowerCase()
        .includes(messageContactSearch.toLowerCase())
    );

    return (
      <section className="cs-messages">
        <div className="cs-panel cs-messages-panel">
          <div className="cs-panel-heading">
            <div>
              <p className="cs-eyebrow">PRIVATE CAMPUS CHAT</p>
              <h2>Messages</h2>
              <p className="cs-muted">Connect directly with active faculty members in your college.</p>
            </div>
            <button className="cs-outline-button" type="button" onClick={() => {
              loadMessageContacts();
              loadMessageConversations();
              if (selectedConversation?.id) loadConversationMessages(selectedConversation.id);
            }}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          {messagesError && <p className="cs-community-alert" role="alert">{messagesError}</p>}
          {messagesSuccess && <p className="cs-community-alert" role="status">{messagesSuccess}</p>}

          <div className="cs-message-layout">
            <aside className="cs-message-sidebar">
              <label className="cs-message-search">
                <Search size={15} />
                <input value={messageContactSearch} onChange={(event) => setMessageContactSearch(event.target.value)} placeholder="Search faculty..." />
              </label>
              <h3>Conversations</h3>
              <div className="cs-message-contact-list">
                {messageConversations.map((conversation) => (
                  <button type="button" key={conversation.id}
                    className={`cs-message-contact ${selectedConversation?.id === conversation.id ? "active" : ""}`}
                    onClick={() => selectMessageConversation(conversation)}>
                    <span className="cs-message-avatar">{(conversation.participant_name || "F").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <span className="cs-message-contact-copy"><strong>{conversation.participant_name}</strong><small>{conversation.last_message || conversation.participant_role}</small></span>
                    {conversation.unread_count > 0 && <em>{conversation.unread_count}</em>}
                  </button>
                ))}
                {messageConversations.length === 0 && <p className="cs-message-empty-small">No conversations yet. Select a faculty member below.</p>}
              </div>
              <h3 className="cs-message-contacts-title">Faculty Directory</h3>
              <div className="cs-message-contact-list">
                {filteredContacts.map((contact) => (
                  <button type="button" key={contact.id} className="cs-message-contact"
                    onClick={() => openMessageConversation(contact)}>
                    <span className="cs-message-avatar">{(contact.full_name || "F").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <span className="cs-message-contact-copy"><strong>{contact.full_name}</strong><small>{contact.department_name || "Faculty"} · {contact.email}</small></span>
                  </button>
                ))}
                {filteredContacts.length === 0 && <p className="cs-message-empty-small">No matching faculty found.</p>}
              </div>
            </aside>

            <div className="cs-message-chat">
              {selectedConversation ? (
                <>
                  <header className="cs-message-chat-header">
                    <span className="cs-message-avatar large">{(selectedConversation.participant_name || "F").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                    <div><strong>{selectedConversation.participant_name}</strong><small>{selectedConversation.department_name || "Faculty"} · {selectedConversation.participant_email || ""}</small></div>
                  </header>
                  <div className="cs-message-history">
                    {messagesLoading && conversationMessages.length === 0 ? <p className="cs-message-empty">Loading messages...</p> :
                      conversationMessages.length === 0 ? <p className="cs-message-empty">No messages yet. Start the conversation.</p> :
                      conversationMessages.map((message) => {
                        const own = message.sender_id === user?.id;
                        return (
                          <div key={message.id} className={`cs-message-row ${own ? "own" : ""}`}>
                            <div className="cs-message-bubble">
                              {!own && <strong>{message.sender_name}</strong>}
                              <p>{message.content}</p>
                              <small>{message.created_at ? new Date(message.created_at).toLocaleString() : ""}{own && message.read_at ? " · Read" : ""}</small>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <form className="cs-message-compose" onSubmit={sendDirectMessage}>
                    <input value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} maxLength={5000} placeholder="Write a message..." aria-label="Write a message" />
                    <button className="primary" type="submit" disabled={messageSending || !messageDraft.trim()}><Send size={16}/>{messageSending ? "Sending..." : "Send"}</button>
                  </form>
                </>
              ) : (
                <div className="cs-message-empty">
                  <MessageCircle size={38}/>
                  <h3>Your campus conversations</h3>
                  <p>Select an existing conversation or choose a faculty member to start messaging.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const navigation = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "profile", label: "My Profile", icon: UserRound },
    { id: "assistant", label: "AI Campus Assistant", icon: Bot, tag: "AI" },
    { id: "community", label: "Student Community", icon: Users },
    { id: "qa", label: "Academic Q&A", icon: MessagesSquare },
    { id: "notices", label: "Notices & Announcements", icon: Bell },
    { id: "resources", label: "Learning Resources", icon: BookOpen },
    { id: "messages", label: "Messages", icon: MessageCircle },
  ];

  const pageTitles = {
    overview: ["Student Dashboard", "Your campus at a glance."],
    profile: ["My Profile", "View your personal and academic information."],
    assistant: ["AI Campus Assistant", "Get help with college-related questions."],
    community: ["Student Community", "Connect with students across your campus."],
    qa: ["Academic Q&A", "Ask questions and learn together."],
    notices: ["Notices & Announcements", "Stay updated with official campus notices."],
    resources: ["Learning Resources", "Find notes, study materials and useful resources."],
    messages: ["Messages", "Your student and faculty conversations."],
  };

  async function handleLogout() {
    if (loggingOut) return;

    setLogoutError("");
    setLoggingOut(true);

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

  const initials = (user?.full_name || "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const filteredNavigation = navigation.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function renderOverview() {
    return (
      <>
        <section className="cs-welcome">
          <div>
            <p className="cs-eyebrow">STUDENT WORKSPACE</p>
            <h2>Welcome back, {user?.full_name?.split(" ")[0] || "Student"} 👋</h2>
            <p>Here's what's happening in your campus today.</p>
          </div>
          <div className="cs-welcome-icon"><GraduationCap size={42} /></div>
        </section>

        <section className="cs-stat-grid">
          <article className="cs-stat-card">
            <span className="cs-stat-icon purple"><BookOpen size={20} /></span>
            <div><strong>Learning Resources</strong><small>Study materials and notes</small></div>
            <span className="cs-stat-value">Explore</span>
          </article>
          <article className="cs-stat-card">
            <span className="cs-stat-icon blue"><Bell size={20} /></span>
            <div><strong>Campus Notices</strong><small>Official announcements</small></div>
            <span className="cs-stat-value">View</span>
          </article>
          <article className="cs-stat-card">
            <span className="cs-stat-icon cyan"><MessagesSquare size={20} /></span>
            <div><strong>Academic Q&A</strong><small>Questions and discussions</small></div>
            <span className="cs-stat-value">Open</span>
          </article>
        </section>

        <section className="cs-content-grid">
          <article className="cs-panel cs-quick-panel">
            <div className="cs-panel-heading">
              <div><h3>Quick Access</h3><p>Jump into your campus tools.</p></div>
            </div>
            <div className="cs-quick-grid">
              {navigation.slice(2).map(({ id, label, icon: Icon, tag }) => (
                <button className="cs-quick-item" key={id} onClick={() => openSection(id)}>
                  <span><Icon size={21} /></span>
                  <strong>{label}</strong>
                  {tag && <em>{tag}</em>}
                  <ChevronRight size={17} className="cs-quick-arrow" />
                </button>
              ))}
            </div>
          </article>

          <article className="cs-panel cs-profile-summary">
            <div className="cs-panel-heading">
              <div><h3>My Profile</h3><p>Your account information.</p></div>
              <button className="cs-text-button" onClick={() => openSection("profile")}>View profile</button>
            </div>
            <div className="cs-profile-person">
              <span className="cs-avatar">{initials}</span>
              <div><strong>{user?.full_name || "Student"}</strong><small>{user?.email || "Email not available"}</small></div>
            </div>
            <div className="cs-profile-line"><span>Account role</span><strong>Student</strong></div>
            <div className="cs-profile-line"><span>Account status</span><strong className="cs-active-status">Active</strong></div>
            <div className="cs-profile-line">
  <span>College</span>
  <strong>
    {studentProfile?.college_name ||
      user?.college_name ||
      "College details not available"}
  </strong>
</div>
          </article>
        </section>

        <section className="cs-panel cs-empty-notice">
          <div className="cs-notice-symbol"><CalendarDays size={22} /></div>
          <div><h3>Campus updates will appear here</h3><p>Official notices and upcoming academic activities will be connected to the college notice system in the next phase.</p></div>
          <button className="cs-outline-button" onClick={() => openSection("notices")}>View notices</button>
        </section>
      </>
    );
  }

  function renderProfile() {
    const profile = studentProfile;
    if (profileLoading && !profile) return <section className="cs-panel"><p>Loading your profile...</p></section>;
    if (profileError && !profile) return <section className="cs-panel"><p className="error">{profileError}</p></section>;

    const details = [
      ["Email address", profile?.email || user?.email || "Not available"],
      ["Account role", profile?.role || "student"],
      ["College", profile?.college_name || "Not assigned"],
      ["Department", profile?.department_name || "Not assigned"],
      ["Roll number", profile?.roll_number || "Not available"],
      ["Enrollment number", profile?.enrollment_number || "Not added"],
      ["Admission year", profile?.admission_year || "Not added"],
      ["Graduation year", profile?.graduation_year || "Not added"],
      ["Current semester", profile?.current_semester || "Not added"],
      ["Section", profile?.section || "Not added"],
      ["Skills", profile?.skills || "Not added"],
      ["GitHub", profile?.github_url || "Not added"],
      ["LinkedIn", profile?.linkedin_url || "Not added"],
      ["Portfolio", profile?.portfolio_url || "Not added"],
    ];
    const field = (label, name, type = "text", props = {}) => (
      <label className="cs-edit-field" key={name}>
        <span>{label}</span>
        <input name={name} type={type} value={profileForm[name]} onChange={updateProfileField} {...props} />
      </label>
    );

    return (
      <section className="cs-panel cs-profile-page">
        <div className="cs-profile-cover">
          <span className="cs-avatar cs-avatar-large">{initials}</span>
          <div><h3>{profile?.full_name || user?.full_name || "Student"}</h3><p>{profile?.email || user?.email}</p></div>
          <button className="cs-outline-button" onClick={() => { setProfileEditing((v) => !v); setProfileError(""); setProfileSuccess(""); }}>
            {profileEditing ? "Cancel editing" : "Edit profile"}
          </button>
        </div>
        {profileError && <p className="error cs-profile-message">{profileError}</p>}
        {profileSuccess && <p className="success cs-profile-message">{profileSuccess}</p>}
        {profileEditing ? (
          <form className="cs-profile-form" onSubmit={saveStudentProfile}>
            <div className="cs-details-grid">
              {field("Full name", "full_name")}
              {field("Enrollment number", "enrollment_number")}
              {field("Admission year", "admission_year", "number", { min: 1950, max: 2200 })}
              {field("Graduation year", "graduation_year", "number", { min: 1950, max: 2200 })}
              {field("Current semester", "current_semester", "number", { min: 1, max: 12 })}
              {field("Section", "section")}
              {field("GitHub URL", "github_url", "url", { placeholder: "https://github.com/username" })}
              {field("LinkedIn URL", "linkedin_url", "url", { placeholder: "https://linkedin.com/in/username" })}
              {field("Portfolio URL", "portfolio_url", "url", { placeholder: "https://your-portfolio.com" })}
              <label className="cs-edit-field cs-edit-full"><span>Skills</span><textarea name="skills" value={profileForm.skills} onChange={updateProfileField} rows="3" placeholder="Python, React, FastAPI..." /></label>
              <label className="cs-edit-field cs-edit-full"><span>Bio</span><textarea name="bio" value={profileForm.bio} onChange={updateProfileField} rows="4" placeholder="Write a short introduction..." /></label>
            </div>
            <p className="cs-info-note">Email, college, department and roll number are read-only and managed by your college.</p>
            <div className="cs-profile-actions">
              <button className="cs-outline-button" type="button" onClick={() => setProfileEditing(false)}>Cancel</button>
              <button className="primary" type="submit" disabled={profileSaving}>{profileSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        ) : (
          <>
            <div className="cs-details-grid">
              {details.map(([label, value]) => <div className="cs-detail-field" key={label}><small>{label}</small><strong>{value}</strong></div>)}
            </div>
            {profile?.bio && <div className="cs-bio-block"><small>About me</small><p>{profile.bio}</p></div>}
            <p className="cs-info-note">Email, college, department and roll number are managed by your college. Contact your College Admin if these details are incorrect.</p>
          </>
        )}
      </section>
    );
  }

  function renderNotices() {
    return (
      <section className="cs-qa-wrap">
        <div className="cs-panel">
          <div className="cs-panel-heading"><div><p className="cs-eyebrow">OFFICIAL CAMPUS UPDATES</p><h2>Notices & Announcements</h2><p className="cs-muted">Published updates from your college administration.</p></div><button className="cs-outline-button" onClick={loadNotices}><RefreshCw size={15}/> Refresh</button></div>
          {noticesError && <p className="cs-error-text">{noticesError}</p>}
          {noticesLoading ? <p className="cs-muted">Loading notices...</p> : notices.length === 0 ? <div className="cs-coming-panel"><Bell size={30}/><h3>No notices yet</h3><p>New college announcements will appear here.</p></div> : (
            <div className="cs-qa-list">{notices.map((notice) => (
              <article className="cs-panel" key={notice.id} style={{marginTop:12}}>
                <div className="cs-community-post-head"><div><span className="cs-qa-status resolved">{String(notice.category || "general").replaceAll("_"," ")}</span> <span className="cs-qa-status">{notice.priority} priority</span></div><small>{notice.published_at ? new Date(notice.published_at).toLocaleString() : ""}</small></div>
                <h3 className="cs-qa-title">{notice.title}</h3>
                <p className="cs-muted" style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{selectedNotice === notice.id ? notice.content : `${notice.content.slice(0, 220)}${notice.content.length > 220 ? "…" : ""}`}</p>
                <div className="cs-qa-answer-actions"><span className="cs-muted">Posted by {notice.author_name || "College Admin"}</span><button className="cs-text-button" onClick={() => setSelectedNotice(selectedNotice === notice.id ? null : notice.id)}>{selectedNotice === notice.id ? "Show less" : "Read full notice"}</button></div>
              </article>
            ))}</div>
          )}
        </div>
      </section>
    );
  }

  function formatLearningResourceSize(bytes) {
    const size = Number(bytes || 0);
    if (!size) return "File size unavailable";
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  function renderLearningResources() {
    const categories = [
      ["", "All categories"],
      ["notes", "Notes"],
      ["assignment", "Assignments"],
      ["question_paper", "Question Papers"],
      ["syllabus", "Syllabus"],
      ["reference", "Reference"],
      ["other", "Other"],
    ];

    return (
      <section className="cs-resources">
        <div className="cs-panel">
          <div className="cs-panel-heading">
            <div>
              <p className="cs-eyebrow">STUDY MATERIALS</p>
              <h2>Learning Resources</h2>
              <p className="cs-muted">
                Notes and academic materials shared by your faculty for your department and semester.
              </p>
            </div>
            <button
              className="cs-outline-button"
              type="button"
              onClick={loadLearningResources}
              disabled={learningResourcesLoading}
            >
              <RefreshCw size={15} />
              {learningResourcesLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {learningResourcesError && (
            <p className="cs-resource-alert error" role="alert">
              {learningResourcesError}
            </p>
          )}

          <div className="cs-resource-toolbar">
            <label className="cs-resource-search">
              <span className="cs-sr-only">Search learning resources</span>
              <Search size={16} />
              <input
                type="search"
                value={learningResourcesSearch}
                onChange={(event) => setLearningResourcesSearch(event.target.value)}
                placeholder="Search title, subject, description or file..."
              />
            </label>
            <label className="cs-resource-category">
              <span className="cs-sr-only">Filter by category</span>
              <select
                value={learningResourcesCategory}
                onChange={(event) => setLearningResourcesCategory(event.target.value)}
              >
                {categories.map(([value, label]) => (
                  <option key={value || "all"} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="cs-resource-count">
            {learningResources.length} {learningResources.length === 1 ? "resource" : "resources"} available
          </div>

          {learningResourcesLoading ? (
            <div className="cs-resource-empty">
              <BookOpen size={28} />
              <p>Loading learning resources...</p>
            </div>
          ) : learningResources.length === 0 ? (
            <div className="cs-resource-empty">
              <BookOpen size={30} />
              <h3>No learning resources found</h3>
              <p>
                {learningResourcesSearch || learningResourcesCategory
                  ? "Try changing your search or category filter."
                  : "Your faculty has not uploaded any materials for your department and semester yet."}
              </p>
            </div>
          ) : (
            <div className="cs-resource-list">
              {learningResources.map((resource) => (
                <article className="cs-resource-card" key={resource.id}>
                  <div className="cs-resource-icon"><BookOpen size={23} /></div>
                  <div className="cs-resource-details">
                    <h3>{resource.title || resource.file_name || "Learning material"}</h3>
                    {resource.description && <p className="cs-resource-description">{resource.description}</p>}
                    <div className="cs-resource-meta">
                      {resource.subject && <span>{resource.subject}</span>}
                      <span>{String(resource.category || "other").replaceAll("_", " ")}</span>
                      {resource.semester ? <span>Semester {resource.semester}</span> : <span>All semesters</span>}
                      {resource.department_name && <span>{resource.department_name}</span>}
                      {resource.file_name && <span className="cs-resource-filename">{resource.file_name}</span>}
                      {resource.file_size != null && <span>{formatLearningResourceSize(resource.file_size)}</span>}
                    </div>
                    <small className="cs-resource-uploader">
                      Uploaded by {resource.uploader_name || "Faculty"}
                      {resource.created_at ? ` · ${new Date(resource.created_at).toLocaleDateString()}` : ""}
                    </small>
                  </div>
                  <div className="cs-resource-actions">
                    <button
                      className="cs-resource-download"
                      type="button"
                      onClick={() => downloadLearningResource(resource)}
                      disabled={Boolean(learningResourcesDownloading[resource.id])}
                    >
                      <FileText size={15} />
                      {learningResourcesDownloading[resource.id] ? "Downloading..." : "Download"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderComingSoon() {
    const info = {
      assistant: { icon: Bot, title: "Your AI campus assistant is being prepared", text: "This module will answer college-related questions using verified campus documents and a retrieval-augmented generation (RAG) system." },
      qa: { icon: MessagesSquare, title: "Academic Q&A is coming soon", text: "Students will be able to post academic questions, reply to discussions and receive faculty guidance." },
      notices: { icon: Bell, title: "Campus notices will appear here", text: "Official college and department announcements will be fetched from the notices API." },
      resources: { icon: BookOpen, title: "Learning resources are coming soon", text: "This module will provide access to approved notes, PDFs, links and study materials." },
      messages: { icon: MessageCircle, title: "Campus messaging is coming soon", text: "Private student-faculty conversations and community messaging will be connected here." },
    };
    const item = info[activeSection] || info.community;
    const Icon = item.icon;
    return (
      <section className="cs-coming-panel">
        <span className="cs-coming-icon"><Icon size={34} /></span>
        <p className="cs-eyebrow">CAMPUSSPHERE MODULE</p>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
        <span className="cs-coming-badge"><Clock3 size={14} /> UI ready · Backend integration pending</span>
      </section>
    );
  }

  return (
    <main className="cs-dashboard">
      <style>{`

        .cs-dashboard{min-height:100vh;background:#0b1020;color:#edf2ff;display:flex;font-family:Inter,system-ui,sans-serif}
        .cs-sidebar{width:264px;flex-shrink:0;background:#101729;border-right:1px solid #26334b;padding:22px 15px;display:flex;flex-direction:column;position:fixed;inset:0 auto 0 0;z-index:30;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#35435f transparent}
        .cs-brand{display:flex;align-items:center;gap:10px;padding:4px 10px 25px;color:#f8faff;text-decoration:none;font-size:19px;font-weight:750}
        .cs-brand b{color:#a78bfa}.cs-brand-mark{width:39px;height:39px;border-radius:12px;background:#29234e;color:#b9a2ff;display:grid;place-items:center}
        .cs-side-label{font-size:10px;letter-spacing:1.5px;color:#75839d;font-weight:800;padding:12px 12px 9px}
        .cs-nav-list{display:grid;gap:5px}.cs-nav-item{border:0;background:transparent;color:#aab7ce;padding:11px 12px;border-radius:10px;display:flex;align-items:center;gap:12px;text-align:left;font-size:13px;font-weight:600;cursor:pointer;width:100%}
        .cs-nav-item:hover{background:#1b2740;color:#fff}.cs-nav-item.active{background:linear-gradient(100deg,rgba(124,88,235,.24),rgba(58,151,210,.12));color:#c4b5fd;box-shadow:inset 3px 0 #9875ff}
        .cs-nav-item em{margin-left:auto;font-style:normal;font-size:9px;background:#33245d;color:#c4b5fd;padding:3px 6px;border-radius:5px}
        .cs-sidebar-bottom{margin-top:auto;border-top:1px solid #27334a;padding-top:13px}.cs-user-mini{display:flex;align-items:center;gap:10px;padding:10px 8px}.cs-avatar{width:39px;height:39px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#8058e8,#39a9d2);font-weight:800;color:#fff;flex-shrink:0}.cs-user-mini strong,.cs-user-mini small{display:block;max-width:155px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs-user-mini strong{font-size:12px}.cs-user-mini small{font-size:10px;color:#8796b0;margin-top:3px}
        .cs-main{margin-left:264px;min-width:0;flex:1}.cs-topbar{height:76px;border-bottom:1px solid #26334b;display:flex;align-items:center;justify-content:space-between;padding:0 34px;background:rgba(13,19,35,.9);position:sticky;top:0;z-index:20}
        .cs-topbar-left{display:flex;align-items:center;gap:13px}.cs-topbar h1{font-size:19px;margin:0}.cs-topbar p{font-size:11px;color:#8f9db5;margin:5px 0 0}.cs-top-actions{display:flex;align-items:center;gap:12px}.cs-top-logout{min-height:37px;padding:0 13px;border:1px solid #35445f;border-radius:10px;background:#1c2a40;color:#e7edfa;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-size:11px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background .2s,border-color .2s}.cs-top-logout:hover{background:#273955;border-color:#6c5bb1}.cs-top-logout:disabled{opacity:.65;cursor:not-allowed}.cs-icon-button{width:37px;height:37px;border:1px solid #2b3851;border-radius:10px;background:#151f33;color:#b7c4dc;display:grid;place-items:center;cursor:pointer}.cs-top-user{display:flex;align-items:center;gap:9px;padding-left:12px;border-left:1px solid #2b3851}.cs-top-user strong,.cs-top-user small{display:block}.cs-top-user strong{font-size:11px}.cs-top-user small{font-size:10px;color:#8492aa;margin-top:3px}
        .cs-mobile-menu{display:none}.cs-page-content{padding:30px 34px 48px;width:100%;max-width:none;margin:0;box-sizing:border-box}.cs-welcome{border:1px solid #3a3b72;border-radius:18px;padding:27px 30px;background:radial-gradient(circle at 90% 20%,rgba(62,169,212,.2),transparent 35%),linear-gradient(110deg,#211d43,#17223b);display:flex;align-items:center;justify-content:space-between;gap:20px}.cs-eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:800;color:#a995ff;margin:0 0 10px}.cs-welcome h2{font-size:25px;margin:0 0 8px}.cs-welcome p:last-child{margin:0;color:#aab9d2;font-size:13px}.cs-welcome-icon{width:75px;height:75px;border-radius:20px;background:#ffffff12;color:#c1adff;display:grid;place-items:center}
        .cs-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin:20px 0}.cs-stat-card{background:#141e31;border:1px solid #293750;border-radius:14px;padding:17px;display:flex;align-items:center;gap:12px;min-width:0}.cs-stat-icon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;flex-shrink:0}.cs-stat-icon.purple{background:#302454;color:#bda6ff}.cs-stat-icon.blue{background:#1c3557;color:#7ebaff}.cs-stat-icon.cyan{background:#173d4a;color:#6bd5e8}.cs-stat-card strong,.cs-stat-card small{display:block}.cs-stat-card strong{font-size:12px}.cs-stat-card small{font-size:10px;color:#8796af;margin-top:5px}.cs-stat-value{margin-left:auto;color:#a995ff;font-size:11px;font-weight:700}
        .cs-content-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:16px}.cs-panel{background:#141e31;border:1px solid #293750;border-radius:15px;padding:21px}.cs-panel-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:17px}.cs-panel-heading h3{font-size:15px;margin:0}.cs-panel-heading p{font-size:11px;color:#8998b2;margin:5px 0 0}.cs-text-button{border:0;background:none;color:#ae98ff;font-size:11px;font-weight:700;cursor:pointer}
        .cs-quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cs-quick-item{display:flex;align-items:center;gap:10px;min-height:66px;text-align:left;padding:12px;border:1px solid #2b3952;border-radius:11px;background:#101a2c;color:#e5ebf8;cursor:pointer}.cs-quick-item:hover{border-color:#8c6ce9;background:#1b2340}.cs-quick-item>span{width:34px;height:34px;border-radius:9px;background:#29234e;color:#b9a4ff;display:grid;place-items:center;flex-shrink:0}.cs-quick-item strong{font-size:10px;line-height:1.4}.cs-quick-item em{font-size:8px;font-style:normal;color:#b9a4ff}.cs-quick-arrow{margin-left:auto;color:#7888a3;flex-shrink:0}
        .cs-profile-person{display:flex;align-items:center;gap:12px;padding:8px 0 17px}.cs-profile-person strong,.cs-profile-person small{display:block}.cs-profile-person strong{font-size:12px}.cs-profile-person small{font-size:10px;color:#8b9ab4;margin-top:4px}.cs-profile-line{display:flex;justify-content:space-between;gap:10px;padding:11px 0;border-top:1px solid #293750;font-size:10px}.cs-profile-line span{color:#8d9bb2}.cs-profile-line strong{font-weight:600;text-align:right;overflow-wrap:anywhere}.cs-active-status{color:#64d6a3}
        .cs-empty-notice{display:flex;align-items:center;gap:15px;margin-top:16px}.cs-notice-symbol{width:43px;height:43px;display:grid;place-items:center;border-radius:12px;background:#1d3554;color:#8fc5ff;flex-shrink:0}.cs-empty-notice h3{font-size:12px;margin:0 0 5px}.cs-empty-notice p{font-size:10px;line-height:1.6;color:#8d9bb2;margin:0}.cs-outline-button{margin-left:auto;white-space:nowrap;border:1px solid #6652a5;border-radius:9px;background:transparent;color:#c2b2ff;padding:9px 12px;font-size:10px;font-weight:700;cursor:pointer}
        .cs-profile-page{max-width:none}.cs-profile-cover{display:flex;align-items:center;gap:16px;padding-bottom:22px;border-bottom:1px solid #2b3952}.cs-avatar-large{width:64px;height:64px;font-size:20px}.cs-profile-cover h3{margin:0 0 5px;font-size:18px}.cs-profile-cover p{margin:0;color:#91a0ba;font-size:12px}.cs-details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding-top:22px}.cs-detail-field{padding:14px;border:1px solid #2b3952;border-radius:10px;background:#101a2c;min-width:0}.cs-detail-field small,.cs-detail-field strong{display:block}.cs-detail-field small{font-size:10px;color:#8493ad;margin-bottom:7px;text-transform:capitalize}.cs-detail-field strong{font-size:12px;overflow-wrap:anywhere}.cs-info-note{font-size:11px;color:#9b8be0;margin-top:18px}
        .cs-edit-field{display:flex;flex-direction:column;gap:7px;color:#9eacc4;font-size:11px;font-weight:650;min-width:0}.cs-edit-field input,.cs-edit-field textarea{width:100%;border:1px solid #34435d;border-radius:9px;background:#0d1728;color:#eef2ff;padding:11px 12px;font:inherit;font-size:12px;outline:none}.cs-edit-field input:focus,.cs-edit-field textarea:focus{border-color:#9474f2;box-shadow:0 0 0 2px #9474f222}.cs-edit-field textarea{resize:vertical;line-height:1.6}.cs-edit-full{grid-column:1/-1}.cs-profile-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.cs-profile-actions .primary{margin:0}.cs-profile-actions button:disabled{opacity:.6;cursor:not-allowed}.cs-profile-message{font-size:12px;margin:15px 0}.cs-bio-block{margin-top:20px;padding:15px;border:1px solid #2b3952;border-radius:10px;background:#101a2c}.cs-bio-block small{font-size:10px;color:#8493ad}.cs-bio-block p{font-size:12px;color:#d5deed;line-height:1.7;white-space:pre-wrap}
        .cs-community{display:grid;gap:15px;max-width:100%;}.cs-community-compose textarea{box-sizing:border-box;width:100%;resize:vertical;min-height:105px;border:1px solid #34435d;border-radius:10px;background:#0d1728;color:#eef2ff;padding:13px;font:inherit;font-size:12px;line-height:1.6;outline:none}.cs-community-compose textarea:focus,.cs-community-comment-form input:focus{border-color:#9474f2;box-shadow:0 0 0 2px #9474f222}.cs-community-compose-footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px}.cs-community-compose-footer small{color:#8493ad;font-size:10px}.cs-community-compose-footer .primary,.cs-community-comment-form .primary{display:inline-flex;align-items:center;gap:7px}.cs-community-alert{font-size:12px;margin:0;padding:11px 14px;border-radius:9px;background:#141e31;border:1px solid #34435d}.cs-community-feed-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.cs-community-feed-heading h3{font-size:15px;margin:0}.cs-community-feed-heading p{font-size:10px;color:#8d9bb2;margin:5px 0 0}.cs-community-feed-heading .cs-outline-button{margin:0}.cs-community-empty{text-align:center;padding:38px 18px;color:#a995ff}.cs-community-empty h3{color:#edf2ff;font-size:15px;margin:12px 0 5px}.cs-community-empty p{color:#8d9bb2;font-size:11px;margin:0}.cs-community-post{padding:19px}.cs-community-post-head{display:flex;align-items:center;gap:11px}.cs-community-author{min-width:0}.cs-community-author strong,.cs-community-author small{display:block}.cs-community-author strong{font-size:12px}.cs-community-author small{font-size:10px;color:#8998b2;margin-top:4px}.cs-community-delete{margin-left:auto;border:0;background:transparent;color:#ff9eaa;font:inherit;font-size:10px;cursor:pointer}.cs-community-post-content{font-size:13px;line-height:1.75;color:#e0e7f5;white-space:pre-wrap;overflow-wrap:anywhere;margin:17px 0}.cs-community-actions{display:flex;gap:18px;border-top:1px solid #2b3952;padding-top:12px}.cs-community-actions button{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:#9cabc3;font:inherit;font-size:11px;cursor:pointer}.cs-community-actions button:hover,.cs-community-actions button.liked{color:#c3aaff}.cs-community-actions button span{font-size:17px}.cs-community-comments{border-top:1px solid #2b3952;margin-top:13px;padding-top:13px}.cs-community-no-comments,.cs-community-comments>p{color:#8998b2;font-size:11px}.cs-community-comment{display:flex;align-items:flex-start;gap:9px;padding:10px 0}.cs-avatar-small{width:29px;height:29px;font-size:10px}.cs-community-comment>div{min-width:0;flex:1}.cs-community-comment strong{font-size:10px}.cs-community-comment p{font-size:11px;color:#d8e0ef;line-height:1.6;margin:4px 0;white-space:pre-wrap}.cs-community-comment small{font-size:9px;color:#7f8da5}.cs-community-comment>button{border:0;background:transparent;color:#ff9eaa;font:inherit;font-size:9px;cursor:pointer}.cs-community-comment-form{display:flex;gap:8px;margin-top:10px}.cs-community-comment-form input{flex:1;min-width:0;border:1px solid #34435d;border-radius:9px;background:#0d1728;color:#eef2ff;padding:10px 12px;font:inherit;font-size:11px;outline:none}.cs-community-comment-form .primary{padding:0 13px}
        .cs-qa-question-content{margin-top:14px}.cs-qa-question-content textarea{box-sizing:border-box;width:100%;border:1px solid #34435d;border-radius:10px;background:#0d1728;color:#eef2ff;padding:13px;font:inherit;font-size:12px;line-height:1.6;resize:vertical;outline:none}.cs-qa-question-content textarea:focus{border-color:#9474f2;box-shadow:0 0 0 2px #9474f222}.cs-qa-toolbar{display:grid;gap:13px}.cs-qa-filters{display:flex;gap:12px;flex-wrap:wrap}.cs-qa-filters label{display:grid;gap:6px;color:#9eacc4;font-size:10px;min-width:170px}.cs-qa-filters select{min-height:37px;padding:8px 10px;border:1px solid #34435d;border-radius:8px;background:#0d1728;color:#eef2ff;font:inherit;font-size:11px}.cs-qa-status{margin-left:auto;padding:5px 9px;border-radius:20px;background:#3a2b1c;color:#f4c78a;font-size:9px;font-weight:700;white-space:nowrap}.cs-qa-status.resolved{background:#173b32;color:#82dfb5}.cs-qa-title{font-size:16px;line-height:1.5;margin:17px 0 0;color:#f0f3ff}.cs-qa-answers{display:grid;gap:10px}.cs-qa-answer{padding:10px;border:1px solid #2b3952;border-radius:10px;background:#101a2c}.cs-qa-answer.accepted{border-color:#34785e;background:#112a27}.cs-qa-answer .cs-community-comment{padding:0}.cs-qa-answer-body{flex:1;min-width:0}.cs-qa-answer-body>small{display:block;color:#8292ad;font-size:9px;margin-top:4px;text-transform:capitalize}.cs-qa-answer-body>p{font-size:11px;line-height:1.7;color:#d8e0ef;white-space:pre-wrap;overflow-wrap:anywhere;margin:9px 0}.cs-qa-answer-actions{align-items:center;flex-wrap:wrap;gap:12px;border:0;padding:0}.cs-qa-answer-actions button{font-size:10px}.cs-qa-accepted-label{font-size:9px;color:#8de0b8;font-weight:700}
.cs-resources{display:grid;gap:15px;max-width:100%}
        .cs-resource-toolbar{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:12px;margin:20px 0 12px}
        .cs-resource-search{display:flex;align-items:center;gap:10px;min-width:0;min-height:43px;padding:0 13px;border:1px solid #34435d;border-radius:9px;background:#0d1728;color:#8798b4}
        .cs-resource-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#eef2ff;font:inherit;font-size:12px}
        .cs-resource-search input::placeholder{color:#71829c}
        .cs-resource-category select{width:100%;min-height:45px;padding:0 12px;border:1px solid #34435d;border-radius:9px;background:#0d1728;color:#eef2ff;font:inherit;font-size:12px}
        .cs-resource-count{font-size:10px;color:#8998b2;margin:12px 0}
        .cs-resource-list{display:grid;gap:12px}
        .cs-resource-card{display:flex;align-items:center;gap:15px;min-width:0;padding:17px;border:1px solid #2b3952;border-radius:12px;background:#101a2c}
        .cs-resource-icon{width:48px;height:48px;flex-shrink:0;border-radius:12px;background:#302454;color:#bda6ff;display:grid;place-items:center}
        .cs-resource-details{flex:1;min-width:0}
        .cs-resource-details h3{font-size:13px;margin:0 0 7px;color:#f0f3ff;overflow-wrap:anywhere}
        .cs-resource-description{font-size:11px;color:#aab8ce;line-height:1.6;margin:0 0 9px;white-space:pre-wrap}
        .cs-resource-meta{display:flex;flex-wrap:wrap;gap:7px}
        .cs-resource-meta span{max-width:100%;padding:6px 9px;border-radius:7px;background:#202d45;color:#c7d3e8;font-size:9px;overflow-wrap:anywhere}
        .cs-resource-uploader{display:block;margin-top:9px;color:#8191ab;font-size:9px}
        .cs-resource-actions{flex-shrink:0}
        .cs-resource-download{min-height:39px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #6652a5;border-radius:9px;background:#29234e;color:#c9baff;font:inherit;font-size:11px;font-weight:700;cursor:pointer}
        .cs-resource-download:hover{background:#372d66}
        .cs-resource-download:disabled{opacity:.6;cursor:not-allowed}
        .cs-resource-empty{min-height:210px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:25px;color:#a995ff}
        .cs-resource-empty h3{font-size:15px;color:#edf2ff;margin:12px 0 6px}
        .cs-resource-empty p{font-size:11px;color:#8998b2;line-height:1.7;margin:5px 0 0}
        .cs-resource-alert{padding:11px 13px;border-radius:9px;font-size:11px;margin:0 0 12px}
        .cs-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

        .cs-messages{max-width:100%}.cs-message-layout{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);min-height:610px;border:1px solid #2b3952;border-radius:13px;overflow:hidden;background:#101a2c;margin-top:16px}
        .cs-message-sidebar{padding:15px;border-right:1px solid #2b3952;min-width:0;display:flex;flex-direction:column;gap:10px}.cs-message-sidebar h3{font-size:11px;color:#aab8ce;margin:8px 0 0}.cs-message-contacts-title{padding-top:12px;border-top:1px solid #2b3952}
        .cs-message-search{height:39px;display:flex;align-items:center;gap:8px;padding:0 10px;border:1px solid #34435d;border-radius:9px;color:#8998b2;background:#0b1424}.cs-message-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#eef2ff;font:inherit;font-size:11px}
        .cs-message-contact-list{display:grid;gap:5px;max-height:205px;overflow:auto}.cs-message-contact{width:100%;display:flex;align-items:center;gap:9px;padding:9px;border:1px solid transparent;border-radius:9px;background:transparent;color:#eaf0ff;text-align:left;cursor:pointer;min-width:0}.cs-message-contact:hover,.cs-message-contact.active{background:#202b45;border-color:#5b4b91}.cs-message-avatar{width:35px;height:35px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#8058e8,#3299bd);font-size:10px;font-weight:800;color:white}.cs-message-avatar.large{width:42px;height:42px}.cs-message-contact-copy{min-width:0;flex:1}.cs-message-contact-copy strong,.cs-message-contact-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs-message-contact-copy strong{font-size:10px}.cs-message-contact-copy small{font-size:9px;color:#8998b2;margin-top:4px}.cs-message-contact em{font-style:normal;border-radius:20px;background:#7256d5;color:white;padding:3px 7px;font-size:9px}.cs-message-empty-small{font-size:10px;color:#8291aa;line-height:1.5;margin:5px}
        .cs-message-chat{display:flex;flex-direction:column;min-width:0;min-height:610px}.cs-message-chat-header{display:flex;align-items:center;gap:11px;padding:15px 18px;border-bottom:1px solid #2b3952}.cs-message-chat-header strong,.cs-message-chat-header small{display:block}.cs-message-chat-header strong{font-size:12px}.cs-message-chat-header small{font-size:9px;color:#8998b2;margin-top:4px}.cs-message-history{flex:1;min-height:420px;max-height:560px;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:11px}.cs-message-row{display:flex;justify-content:flex-start}.cs-message-row.own{justify-content:flex-end}.cs-message-bubble{max-width:min(78%,560px);padding:10px 12px;border:1px solid #33425d;border-radius:12px 12px 12px 3px;background:#1b2940}.cs-message-row.own .cs-message-bubble{background:#30265a;border-color:#6651a5;border-radius:12px 12px 3px 12px}.cs-message-bubble strong{font-size:9px;color:#c4b4ff}.cs-message-bubble p{font-size:11px;line-height:1.6;color:#edf2ff;white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0}.cs-message-bubble small{display:block;text-align:right;font-size:8px;color:#9ba9c1}.cs-message-empty{flex:1;min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;color:#a995ff}.cs-message-empty h3{font-size:15px;color:#edf2ff;margin:12px 0 5px}.cs-message-empty p{font-size:10px;color:#8998b2;max-width:350px;line-height:1.7}.cs-message-compose{display:flex;gap:9px;padding:13px;border-top:1px solid #2b3952}.cs-message-compose input{flex:1;min-width:0;border:1px solid #34435d;border-radius:9px;background:#0b1424;color:#eef2ff;padding:11px 12px;font:inherit;font-size:11px;outline:none}.cs-message-compose .primary{display:flex;align-items:center;gap:7px}
        .cs-coming-panel{min-height:340px;border:1px dashed #465176;border-radius:16px;background:#141e31;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:35px;max-width:850px;margin:0 auto}.cs-coming-icon{width:68px;height:68px;border-radius:20px;background:#2b2451;color:#bba5ff;display:grid;place-items:center;margin-bottom:20px}.cs-coming-panel h3{font-size:19px;margin:0 0 10px}.cs-coming-panel>p:not(.cs-eyebrow){max-width:520px;color:#9aa9c2;font-size:12px;line-height:1.8;margin:0}.cs-coming-badge{display:flex;align-items:center;gap:7px;margin-top:22px;padding:8px 12px;border-radius:20px;background:#25213e;color:#bcaaff;font-size:10px}
        .cs-mobile-overlay{display:none}.cs-logout-error{margin:0 34px;color:#ff9caa;font-size:12px}
        .cs-page-content:has(.ai-chat-layout){padding:16px 20px 28px}.cs-page-content:has(.ai-chat-layout) .ai-chat-layout{width:100%;max-width:none;min-height:calc(100vh - 112px);height:calc(100vh - 112px)}\n        @media(max-width:1050px){.cs-sidebar{width:230px}.cs-main{margin-left:230px}.cs-content-grid{grid-template-columns:1fr}.cs-stat-card{padding:13px}.cs-topbar{padding:0 22px}.cs-page-content{padding:24px 22px 40px}}
        @media(max-width:720px){.cs-message-layout{grid-template-columns:1fr}.cs-message-sidebar{border-right:0;border-bottom:1px solid #2b3952}.cs-message-contact-list{max-height:150px}.cs-message-chat{min-height:450px}.cs-message-history{min-height:300px}.cs-message-bubble{max-width:90%}.cs-top-actions{gap:7px}.cs-top-logout{width:37px;min-width:37px;height:37px;padding:0}.cs-top-logout span{display:none}.cs-top-user{display:none}.cs-sidebar{transform:translateX(-100%);transition:transform .22s ease;width:275px}.cs-sidebar.open{transform:translateX(0)}.cs-main{margin-left:0}.cs-mobile-menu{display:grid}.cs-topbar{height:66px;padding:0 14px}.cs-topbar h1{font-size:15px}.cs-topbar p{font-size:9px}.cs-top-user>div:last-child{display:none}.cs-top-actions{gap:7px}.cs-page-content{padding:17px 14px 32px}.cs-welcome{padding:20px}.cs-welcome h2{font-size:20px}.cs-welcome-icon{width:55px;height:55px}.cs-stat-grid{grid-template-columns:1fr;gap:9px;margin:14px 0}.cs-stat-card{padding:13px}.cs-quick-grid{grid-template-columns:1fr}.cs-panel{padding:16px}.cs-empty-notice{align-items:flex-start;flex-wrap:wrap}.cs-outline-button{margin-left:58px}.cs-details-grid{grid-template-columns:1fr}.cs-resource-toolbar{grid-template-columns:1fr}.cs-resource-card{align-items:flex-start;flex-wrap:wrap}.cs-resource-details{width:calc(100% - 65px);flex:1}.cs-resource-actions{width:100%;padding-left:63px}.cs-resource-download{width:100%}.cs-mobile-overlay.show{display:block;position:fixed;inset:0;background:#050914a8;z-index:25}.cs-logout-error{margin:0 14px}}

      `}</style>

      <div className={`cs-mobile-overlay ${mobileMenuOpen ? "show" : ""}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`cs-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <Link className="cs-brand" to="/dashboard">
          <span className="cs-brand-mark"><GraduationCap size={22} /></span>
          <span>CampusSphere <b>AI</b></span>
        </Link>
        <div className="cs-side-label">STUDENT MENU</div>
        <nav className="cs-nav-list">
          {navigation.map(({ id, label, icon: Icon, tag }) => (
            <button key={id} className={`cs-nav-item ${activeSection === id ? "active" : ""}`} onClick={() => openSection(id)}>
              <Icon size={17} /><span>{label}</span>{tag && <em>{tag}</em>}
            </button>
          ))}
        </nav>
        <div className="cs-sidebar-bottom">
          <button className={`cs-nav-item ${activeSection === "profile" ? "active" : ""}`} onClick={() => openSection("profile")}><Settings size={17} />Account settings</button>
          <div className="cs-user-mini"><span className="cs-avatar">{initials}</span><div><strong>{user?.full_name || "Student"}</strong><small>{user?.email || ""}</small></div></div>
          <button className="cs-nav-item" onClick={handleLogout} disabled={loggingOut} aria-label="Log out of student account"><LogOut size={17} />{loggingOut ? "Logging out..." : "Logout"}</button>
        </div>
      </aside>

      <section className="cs-main">
        <header className="cs-topbar">
          <div className="cs-topbar-left">
            <button className="cs-icon-button cs-mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
            <div><h1>{pageTitles[activeSection]?.[0] || "Student Dashboard"}</h1><p>{pageTitles[activeSection]?.[1] || ""}</p></div>
          </div>
          <div className="cs-top-actions">
            <button className="cs-icon-button" aria-label="Search" onClick={() => openSection("resources")}><Search size={17} /></button>
            <button className="cs-icon-button" aria-label="Notifications" onClick={() => openSection("notices")}><Bell size={17} /></button>
            <button
              className="cs-icon-button cs-fullscreen-button"
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
            <button
              className="cs-top-logout"
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Log out of student account"
              title="Logout"
            >
              <LogOut size={17} />
              <span>{loggingOut ? "Logging out..." : "Logout"}</span>
            </button>
            <div className="cs-top-user"><span className="cs-avatar">{initials}</span><div><strong>{user?.full_name || "Student"}</strong><small>Student</small></div></div>
          </div>
        </header>

        {logoutError && <p className="cs-logout-error">{logoutError}</p>}

        <div className="cs-page-content">
          {activeSection === "overview" && renderOverview()}
          {activeSection === "profile" && renderProfile()}
         {activeSection === "assistant" && <AssistantChat />}
          {activeSection === "community" && renderCommunity()}
          {activeSection === "qa" && renderAcademicQA()}
          {activeSection === "notices" && renderNotices()}
          {activeSection === "resources" && renderLearningResources()}
          {activeSection === "messages" && renderMessages()}
          {!["overview", "profile", "assistant", "community", "qa", "notices", "resources", "messages"].includes(activeSection) && renderComingSoon()}
        </div>
      </section>
    </main>
  );
}

// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [error, setError] = useState("");

  const dashboardNames = {
    student: "Student Dashboard",
    faculty: "Faculty Dashboard",
    college_admin: "College Admin Dashboard",
    super_admin: "Super Admin Dashboard",
  };

  async function handleLogout() {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Logout could not be completed. Please try again.");
    }
  }

  if (!user) {
    return <div className="loading-screen">Loading Dashboard...</div>;
  }

  if (user.role === "student") {
    return <StudentDashboard />;
  }

  if (user.role === "faculty") {
    return <FacultyDashboard />;
  }

  if (user.role === "college_admin") {
  return <CollegeAdminDashboard />;
}

  return (
    <main className="dashboard-page">
      <nav className="nav page">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <GraduationCap size={21} />
          </span>
          CampusSphere <b>AI</b>
        </Link>

        <button className="secondary" onClick={handleLogout}>
          <LogOut size={17} /> Logout
        </button>
      </nav>

      <section className="dashboard-content">
        <p className="eyebrow">CAMPUSSPHERE WORKSPACE</p>

        <h1>{dashboardNames[user.role] || "Campus Dashboard"}</h1>
        <h3>Welcome, {user.full_name}!</h3>

        <div className="dashboard-card">
          <p><b>Name:</b> {user.full_name}</p>
          <p><b>Email:</b> {user.email}</p>
          <p><b>Role:</b> {user.role}</p>
          <p><b>Account Status:</b> {user.is_active ? "Active" : "Inactive"}</p>
          <p><b>College ID:</b> {user.college_id || "Not assigned"}</p>
        </div>

        {user.role === "college_admin" && (
          <div className="dashboard-card">
            <h2>Faculty Management</h2>
            <p>Create and manage faculty accounts for your college.</p>
            <button
              className="primary"
              onClick={() => navigate("/admin/faculty")}
            >
              <UserCog size={17} /> Create Faculty Account
            </button>
          </div>
        )}

        {user.role === "faculty" && (
          <div className="dashboard-card">
            <h2>Faculty Workspace</h2>
            <p>Welcome to your faculty workspace.</p>
            <p>Academic tools and faculty services will be added here.</p>
          </div>
        )}

        {user.role === "student" && (
          <div className="dashboard-card">
            <h2>Student Workspace</h2>
            <p>Access campus resources, academic support and community features.</p>
          </div>
        )}

        {user.role === "super_admin" && (
          <div className="dashboard-card">
            <h2>Platform Administration</h2>
            <p>Manage colleges and platform-wide settings.</p>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

// --------------------------------------------------
// HOME
// --------------------------------------------------


// --------------------------------------------------
// HOME
// --------------------------------------------------

function Home() {
  return (
    <main className="home-page">
      <div className="home-glow home-glow-one" />
      <div className="home-glow home-glow-two" />

      <div className="page home-container">
        <nav className="nav home-nav">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <GraduationCap size={21} />
            </span>
            CampusSphere <b>AI</b>
          </Link>

          <div className="home-nav-links">
            <a href="#home-features">Features</a>
            <a href="#home-about">About</a>
          </div>

          <div className="nav-actions">
            <Link to="/login" className="home-login-link">
              Login
            </Link>
            <Link to="/register" className="primary button-link home-nav-cta">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </nav>

        <section className="home-hero" id="home-about">
          <div className="home-hero-copy">
            <div className="home-eyebrow">
              <span className="home-live-dot" />
              THE SMARTER WAY TO CAMPUS LIFE
            </div>

            <h1>
              Your campus.
              <br />
              Your community.
              <br />
              <span className="home-gradient-text">
                <span className="home-rotating-word">Connected.</span>
              </span>
            </h1>

            <p className="home-lead">
              One intelligent platform for students, faculty and colleges.
              Connect with your campus, discover learning resources and get
              academic support with AI.
            </p>

            <div className="home-actions">
              <Link to="/register" className="home-primary-button">
                Explore CampusSphere <ArrowRight size={18} />
              </Link>

              <Link to="/login" className="home-secondary-button">
                Sign in to your account
              </Link>
            </div>

            <div className="home-trust-note">
              <ShieldCheck size={17} />
              A connected digital experience for your college community
            </div>
          </div>

          <div className="home-visual">
            <div className="home-orbit home-orbit-one" />
            <div className="home-orbit home-orbit-two" />

            <div className="home-dashboard-preview">
              <div className="home-preview-topbar">
                <div className="home-preview-brand">
                  <span className="home-preview-brand-icon">
                    <GraduationCap size={17} />
                  </span>
                  <span>CampusSphere <b>AI</b></span>
                </div>
                <span className="home-preview-status">
                  <span /> Campus online
                </span>
              </div>

              <div className="home-preview-content">
                <div className="home-preview-welcome">
                  <div>
                    <span>YOUR DIGITAL CAMPUS</span>
                    <h3>Welcome to your space.</h3>
                    <p>Everything you need, all in one place.</p>
                  </div>
                  <div className="home-preview-avatar">
                    <UserRound size={20} />
                  </div>
                </div>

                <div className="home-preview-stats">
                  <div>
                    <span className="home-stat-icon purple">
                      <Users size={17} />
                    </span>
                    <small>Community</small>
                    <strong>Connected</strong>
                  </div>
                  <div>
                    <span className="home-stat-icon cyan">
                      <BookOpen size={17} />
                    </span>
                    <small>Learning</small>
                    <strong>Resources</strong>
                  </div>
                </div>

                <div className="home-preview-assistant">
                  <div className="home-assistant-icon">
                    <Bot size={20} />
                  </div>
                  <div className="home-assistant-copy">
                    <strong>AI Campus Assistant</strong>
                    <p>How can I help you today?</p>
                  </div>
                  <Sparkles size={18} className="home-assistant-sparkle" />
                </div>

                <div className="home-preview-activity">
                  <div className="home-activity-heading">
                    <strong>Your campus at a glance</strong>
                    <span>Explore</span>
                  </div>
                  <div className="home-activity-row">
                    <span><MessagesSquare size={15} /></span>
                    <div>
                      <strong>Academic Q&A</strong>
                      <small>Learn together, grow together</small>
                    </div>
                    <ArrowRight size={15} />
                  </div>
                  <div className="home-activity-row">
                    <span><CalendarDays size={15} /></span>
                    <div>
                      <strong>Campus Updates</strong>
                      <small>Stay informed and up to date</small>
                    </div>
                    <ArrowRight size={15} />
                  </div>
                </div>
              </div>
            </div>

            <div className="home-floating-card home-floating-ai">
              <span><Sparkles size={16} /></span>
              <div>
                <strong>AI-powered support</strong>
                <small>Smarter academic assistance</small>
              </div>
            </div>

            <div className="home-floating-card home-floating-community">
              <span><Users size={16} /></span>
              <div>
                <strong>One community</strong>
                <small>Students · Faculty · Colleges</small>
              </div>
            </div>
          </div>
        </section>

        <section className="home-features" id="home-features">
          <div className="home-section-heading">
            <span className="home-section-label">BUILT FOR CAMPUS LIFE</span>
            <h2>Everything your campus needs.</h2>
            <p>
              Bring your academic journey and campus community together
              through one connected experience.
            </p>
          </div>

          <div className="home-feature-grid">
            {modules.map(({ icon: Icon, title, text }, index) => (
              <article className="home-feature-card" key={title}>
                <div className="home-feature-top">
                  <span className={`home-feature-icon feature-${index + 1}`}>
                    <Icon size={22} />
                  </span>
                  <span className="home-feature-number">
                    0{index + 1}
                  </span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="home-feature-line" />
              </article>
            ))}
          </div>
        </section>

        <section className="home-bottom-cta">
          <div>
            <span className="home-section-label">YOUR CAMPUS STARTS HERE</span>
            <h2>Make every campus connection count.</h2>
            <p>Join your digital campus community with CampusSphere AI.</p>
          </div>
          <Link to="/register" className="home-primary-button">
            Create your account <ArrowRight size={18} />
          </Link>
        </section>

        <footer className="home-footer">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <GraduationCap size={19} />
            </span>
            CampusSphere <b>AI</b>
          </Link>
          <span>One Campus. Every Connection.</span>
          <span>© {new Date().getFullYear()} CampusSphere AI</span>
        </footer>
      </div>
    </main>
  );
}


// --------------------------------------------------
// APP ROUTER
// --------------------------------------------------

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/faculty"
        element={
          <ProtectedRoute allowedRoles={["college_admin"]}>
            <FacultyManagement />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
