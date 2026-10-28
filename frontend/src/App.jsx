import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";
import Interview from "./Interview";

function App() {
  const userRole = localStorage.getItem("userRole");
  // =========================================================
  // RECRUITER LOGIN
  // =========================================================

const [isLoggedIn, setIsLoggedIn] = useState(() => {
  return localStorage.getItem("accessToken") !== null;
});
const [loginEmail, setLoginEmail] = useState("");
const [loginPassword, setLoginPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [loginError, setLoginError] = useState("");
const [showSignup, setShowSignup] = useState(false);
const [signupName, setSignupName] = useState("");
const [signupEmail, setSignupEmail] = useState("");
const [signupPassword, setSignupPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [signupRole, setSignupRole] = useState("candidate");
const [showForgotPassword, setShowForgotPassword] = useState(false);
const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
const [resetToken, setResetToken] = useState("");
const [newPassword, setNewPassword] = useState("");
const [resetConfirmPassword, setResetConfirmPassword] = useState("");
const GOOGLE_CLIENT_ID =
  "545768782793-m34ctmi4a6ogkbpgho31ttj1mbm1kcim.apps.googleusercontent.com";

  // =========================================================
  // CURRENT VIEW
  // =========================================================

  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem("currentView") || "dashboard";
  });
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [applications, setApplications] = useState([]);
const [applicationsLoading, setApplicationsLoading] = useState(false);

const [candidateProfile, setCandidateProfile] = useState(null);
const [editingProfile, setEditingProfile] = useState(false);

const [profileForm, setProfileForm] = useState({
  phone: "",
  education: "",
  experience: "",
  skills: "",
});
  useEffect(() => {
    localStorage.setItem("currentView", currentView);
  }, [currentView]);
  useEffect(() => {
  const loadJobs = async () => {
    setJobsLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/jobs"
      );

      if (!response.ok) {
        throw new Error("Unable to load jobs.");
      }

      const data = await response.json();
      console.log("LOGIN DATA:", data);

      setJobs(data);
    } catch (err) {
      console.error("Jobs loading error:", err);
    } finally {
      setJobsLoading(false);
    }
  };

    if (currentView === "dashboard") {
    loadJobs();
  }
}, [currentView]);

  useEffect(() => {
  const loadApplications = async () => {
    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");

    if (!token) {
      return;
    }

    setApplicationsLoading(true);

    try {
      const endpoint =
        role === "recruiter"
          ? "http://127.0.0.1:8000/recruiter/applications"
          : "http://127.0.0.1:8000/applications/my";

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load applications.");
      }

      const data = await response.json();

      setApplications(data);
    } catch (err) {
      console.error("Applications loading error:", err);
    } finally {
      setApplicationsLoading(false);
    }
  };

  if (
    currentView === "applications" ||
    currentView === "dashboard"
  ) {
    loadApplications();
  }
}, [currentView]);


const applyForJob = async (jobId) => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    alert("Please login again.");
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/jobs/${jobId}/apply`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || "Unable to apply for this job."
      );
    }

    alert("Application submitted successfully!");

    setApplications((prev) => [
      ...prev,
      {
        application_id: data.application_id,
        job_id: data.job_id,
        candidate_id: data.candidate_id,
        status: data.status,
      },
    ]);
  } catch (err) {
    alert(err.message);
  }
};

const updateApplicationStatus = async (applicationId, status) => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    alert("Please login again.");
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/applications/${applicationId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: status,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || "Unable to update application status."
      );
    }

    setApplications((previous) =>
      previous.map((application) =>
        application.application_id === applicationId
          ? {
              ...application,
              status: data.status,
            }
          : application
      )
    );

    alert("Application status updated successfully!");
  } catch (err) {
    alert(err.message);
  }
};

const loadCandidateProfile = async () => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return;
  }

  setProfileLoading(true);

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/candidate/profile",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 404) {
      setCandidateProfile(null);

      setProfileForm({
        phone: "",
        education: "",
        experience: "",
        skills: "",
      });

      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load profile.");
    }

    const data = await response.json();

    setCandidateProfile(data);

    setProfileForm({
      phone: data.phone || "",
      education: data.education || "",
      experience: data.experience || "",
      skills: data.skills || "",
    });
  } catch (err) {
    console.error("Profile loading error:", err);
  } finally {
    setProfileLoading(false);
  }
};


const saveCandidateProfile = async () => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    alert("Please login again.");
    return;
  }

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/candidate/profile",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || "Unable to save profile."
      );
    }

    setCandidateProfile(data);
    setEditingProfile(false);

    alert("Profile updated successfully!");
  } catch (err) {
    alert(err.message);
  }
};


useEffect(() => {
  if (currentView === "profile") {
    loadCandidateProfile();
  }
}, [currentView]);

  useEffect(() => {
    console.log("CURRENT VIEW:", currentView);
  }, [currentView]);

  // =========================================================
  // BASIC STATES
  // =========================================================

  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [interviewScorecard, setInterviewScorecard] = useState(null);

  // =========================================================
  // SEARCH + SORT + FILTER
  // =========================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("high");
  const [statusFilter, setStatusFilter] = useState("all");

  // =========================================================
  // PAGINATION
  // =========================================================

  const [currentPage, setCurrentPage] = useState(1);
  const candidatesPerPage = 5;

  // =========================================================
  // LOADING + ERRORS
  // =========================================================

  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState(false);

  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // =========================================================
  // DELETE CONFIRMATION
  // =========================================================

  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState("");

  // =========================================================
  // CONVERT SKILLS TO ARRAY
  // =========================================================

  const getSkillsArray = (skills) => {
    if (!skills) {
      return [];
    }

    if (Array.isArray(skills)) {
      return skills
        .filter(Boolean)
        .map((skill) => String(skill).trim())
        .filter(Boolean);
    }

    if (typeof skills === "string") {
      return skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
    }

    return [];
  };

  // =========================================================
  // CONVERT ANY VALUE TO ARRAY
  // =========================================================

  const getArrayValue = (value) => {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .filter(Boolean)
        .map((item) => String(item).trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  // =========================================================
  // RECRUITER LOGIN
  // =========================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginError("");

    const email = loginEmail.trim();

    if (!email || !loginPassword) {
      setLoginError("Please enter email and password.");
      return;
  }

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: loginPassword,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || "Invalid email or password."
      );
    }

    localStorage.setItem("recruiterLoggedIn", "true");
    localStorage.setItem(
      "accessToken",
      data.access_token
    );
    localStorage.setItem("userRole", data.role);
    localStorage.setItem("userId", String(data.user_id));
    localStorage.setItem("userEmail", data.email);
    console.log("AUTH RESPONSE:", data);

    setIsLoggedIn(true);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
  } catch (err) {
    setLoginError(
      err.message || "Unable to login."
    );
  }
};

const handleForgotPassword = async (e) => {
  e.preventDefault();

  setLoginError("");

  const email = forgotPasswordEmail.trim();

  if (!email) {
    setLoginError("Please enter your email.");
    return;
  }

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/auth/forgot-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || "Unable to reset password."
      );
    }

    if (data?.reset_token) {
  setResetToken(data.reset_token);
  setLoginError(
    "Reset token generated. Enter your new password below."
  );
} else {
  setLoginError(
    "Unable to generate a reset token."
  );
}
  } catch (err) {
    setLoginError(
      err.message || "Unable to reset password."
    );
  }
};

const handleResetPassword = async (e) => {
  e.preventDefault();

  setLoginError("");

  if (!resetToken) {
    setLoginError("Reset token is missing.");
    return;
  }

  if (!newPassword || !resetConfirmPassword) {
    setLoginError("Please enter and confirm your new password.");
    return;
  }

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/auth/reset-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: newPassword,
          confirm_password: resetConfirmPassword,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || "Unable to reset password."
      );
    }

    setLoginEmail(forgotPasswordEmail);
    setForgotPasswordEmail("");
    setResetToken("");
    setNewPassword("");
    setResetConfirmPassword("");
    setShowForgotPassword(false);

    setLoginError(
      "Password reset successfully. Please login with your new password."
    );
  } catch (err) {
    setLoginError(
      err.message || "Unable to reset password."
    );
  }
};

const handleGoogleLogin = async (response) => {
  setLoginError("");

  if (!response?.credential) {
    setLoginError("Google login failed. Please try again.");
    return;
  }

  try {
    const backendResponse = await fetch(
      "http://127.0.0.1:8000/auth/google",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      }
    );

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      throw new Error(
        data?.detail || "Google login failed."
      );
    }

    localStorage.setItem("recruiterLoggedIn", "true");
    localStorage.setItem(
      "accessToken",
      data.access_token
    );
    localStorage.setItem("userRole", data.role);
    localStorage.setItem("userId", String(data.user_id));
    localStorage.setItem("userEmail", data.email);

    setIsLoggedIn(true);
    setLoginError("");
  } catch (err) {
    setLoginError(
      err.message || "Unable to login with Google."
    );
  }
};

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoginError("");

    const name = signupName.trim();
    const email = signupEmail.trim();
    const password = signupPassword;
    const confirmPasswordValue = confirmPassword;

    if (!name || !email || !password || !confirmPasswordValue) {
      setLoginError("Please fill in all signup fields.");
      return;
    }

    if (password.length < 8) {
      setLoginError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setLoginError(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      setLoginError(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      setLoginError(
        "Password must contain at least one number."
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setLoginError(
        "Password must contain at least one special character."
      );
      return;
    }

    if (password !== confirmPasswordValue) {
      setLoginError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role: signupRole,
          }),
        }
      );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || "Unable to create account."
      );
    }

    setLoginEmail(email);
    setLoginPassword(password);
    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setConfirmPassword("");
    setShowSignup(false);
    setLoginError(
      "Account created successfully. Please login."
    );
  } catch (err) {
    setLoginError(
      err.message || "Unable to create account."
    );
  }
};
  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("recruiterLoggedIn");
    localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
    setCandidates([]);
    setSelectedCandidate(null);
    setCandidateToDelete(null);
    setResult(null);
    setFile(null);
    setJobDescription("");
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    setCurrentView("dashboard");
    setError("");
  };

  // =========================================================
  // LOAD ALL CANDIDATES
  // =========================================================

  const fetchCandidates = async () => {
    if (!isLoggedIn) {
      return;
    }

    setDashboardLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/candidates"
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.candidates)) {
        throw new Error(
          "Invalid response received from server."
        );
      }

      setCandidates(data.candidates);

      setError("");
    } catch (err) {
      console.error("Dashboard error:", err);

      setCandidates([]);

      setError(
        "Unable to connect to the recruitment server. Please make sure FastAPI is running and try again."
      );
    } finally {
      setDashboardLoading(false);
    }
  };

  // =========================================================
  // LOAD CANDIDATES WHEN LOGIN IS SUCCESSFUL
  // =========================================================

  useEffect(() => {
    if (isLoggedIn) {
      fetchCandidates();
    }
  }, [isLoggedIn]);

  useEffect(() => {
  if (isLoggedIn || showSignup) {
    return;
  }

  const initializeGoogleSignIn = () => {
    if (!window.google) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleLogin,
    });

    const googleButton = document.getElementById(
      "googleSignInButton"
    );

    if (googleButton) {
      googleButton.innerHTML = "";

      window.google.accounts.id.renderButton(
        googleButton,
        {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "rectangular",
        }
      );
    }
  };

  if (window.google) {
    initializeGoogleSignIn();
  } else {
    const timer = setInterval(() => {
      if (window.google) {
        clearInterval(timer);
        initializeGoogleSignIn();
      }
    }, 100);

    return () => clearInterval(timer);
  }
}, [isLoggedIn, showSignup]);

  // =========================================================
  // RESET PAGE WHEN SEARCH / FILTER / SORT CHANGES
  // =========================================================

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortOrder]);

  // =========================================================
  // RECRUITMENT STATUS HELPER
  // =========================================================

  function getRecruitmentStatus(score) {
    const value = Number(score || 0);

    if (value >= 75) {
      return "Shortlisted";
    }

    if (value >= 50) {
      return "Under Review";
    }

    return "Not Recommended";
  }

  // =========================================================
  // STATUS CSS CLASS
  // =========================================================

  const getStatusClass = (score, status = "") => {
    const currentStatus =
      status || getRecruitmentStatus(score);

    if (currentStatus === "Shortlisted") {
      return "status-shortlisted";
    }

    if (currentStatus === "Under Review") {
      return "status-review";
    }

    return "status-rejected";
  };

  // =========================================================
  // OPEN COMPLETE CANDIDATE PROFILE
  // =========================================================

  const openCandidateProfile = async (candidate) => {
    setSelectedCandidate(candidate);
    setProfileLoading(true);
    setProfileError("");
    setStatusMessage("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/candidates/${candidate.id}`
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const data = await response.json();
// Load AI interview scorecard for THIS candidate only
try {
  setInterviewScorecard(null);

  /*
    First try the candidate-specific scorecard.
    Example:
    latestInterviewScorecard_1
    latestInterviewScorecard_3
  */
  const candidateScorecardKey =
    `latestInterviewScorecard_${candidate.id}`;

  const candidateScorecard =
    localStorage.getItem(candidateScorecardKey);

  if (candidateScorecard) {
    const scorecardData =
      JSON.parse(candidateScorecard);

    if (
      scorecardData &&
      scorecardData.candidate_id !== null &&
      Number(scorecardData.candidate_id) ===
        Number(candidate.id)
    ) {
      setInterviewScorecard(scorecardData);
    }
    
  } else {
    /*
      Backward compatibility with the old key.
      Only use it if the stored candidate_id matches
      the profile currently being opened.
    */
    const legacyScorecard =
      localStorage.getItem(
        "latestInterviewScorecard"
      );

    if (legacyScorecard) {
      const scorecardData =
        JSON.parse(legacyScorecard);

      if (
        scorecardData &&
        scorecardData.candidate_id !== null &&
        Number(scorecardData.candidate_id) ===
          Number(candidate.id)
      ) {
        setInterviewScorecard(scorecardData);
      }
    }
  }
} catch (scorecardError) {
  console.error(
    "Interview scorecard error:",
    scorecardError
  );

  setInterviewScorecard(null);
}

const candidateEmail =
  data.candidate?.email ||
  candidate.email ||
  candidate.candidate_email;

if (candidateEmail) {
  try {
    const response = await fetch(
      "http://127.0.0.1:8000/ai/video-scorecard?candidate_email=" +
        encodeURIComponent(candidateEmail)
    );

    if (response.ok) {
      const scorecardData = await response.json();
      setInterviewScorecard(scorecardData);
    } else if (response.status !== 404) {
      console.error(
        "Could not fetch saved video scorecard:",
        await response.text()
      );
    }
  } catch (error) {
    console.error("Backend scorecard fetch error:", error);
  }
}
      if (data.error) {
        throw new Error(data.error);
      }

      const completeCandidate = {
        ...candidate,
        ...(data.candidate || {}),
        ...(data.resume_details || {}),
        recruitment_status:
          data.recruitment_status ||
          data.candidate?.recruitment_status ||
          candidate.recruitment_status ||
          getRecruitmentStatus(candidate.overall_score),
      };

      setSelectedCandidate(completeCandidate);
    } catch (err) {
      console.error("Profile error:", err);

      setProfileError(
        "Could not load complete candidate details."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // =========================================================
  // UPDATE RECRUITMENT STATUS
  // =========================================================

  const updateRecruitmentStatus = async (newStatus) => {
    if (!selectedCandidate) {
      return;
    }

    setStatusUpdating(true);
    setStatusMessage("");
    setProfileError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/candidates/${selectedCandidate.id}/status?recruitment_status=${encodeURIComponent(
          newStatus
        )}`,
        {
          method: "PUT",
          headers: {
            accept: "application/json",
          },
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            `Server returned ${response.status}`
        );
      }

      if (!data || !data.recruitment_status) {
        throw new Error(
          "Invalid response received from server."
        );
      }

      setSelectedCandidate((previous) => ({
        ...previous,
        recruitment_status:
          data.recruitment_status,
      }));

      setCandidates((previousCandidates) =>
        previousCandidates.map((candidate) =>
          candidate.id === selectedCandidate.id
            ? {
                ...candidate,
                recruitment_status:
                  data.recruitment_status,
              }
            : candidate
        )
      );

      setStatusMessage(
        "Recruitment status updated successfully."
      );
    } catch (err) {
      console.error("Status update error:", err);

      setProfileError(
        err.message ||
          "Could not update recruitment status. Please try again."
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  // =========================================================
  // OPEN DELETE CONFIRMATION
  // =========================================================

  const openDeleteConfirmation = (candidate) => {
    setCandidateToDelete(candidate);
  };

  // =========================================================
  // CANCEL DELETE
  // =========================================================

  const cancelDelete = () => {
    if (deletingCandidate) {
      return;
    }

    setCandidateToDelete(null);
  };

  // =========================================================
  // CONFIRM DELETE CANDIDATE
  // =========================================================

  const deleteCandidate = async () => {
    if (!candidateToDelete) {
      return;
    }

    const candidateId = candidateToDelete.id;

    setDeletingCandidate(true);
    setDeleteMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/candidates/${candidateId}`,
        {
          method: "DELETE",
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.error ||
            `Server returned ${response.status}`
        );
      }

      setCandidates((previousCandidates) =>
        previousCandidates.filter(
          (candidate) => candidate.id !== candidateId
        )
      );

      if (selectedCandidate?.id === candidateId) {
        setSelectedCandidate(null);
      }

      setCandidateToDelete(null);

      setDeleteMessage(
        "Candidate deleted successfully."
      );

      setTimeout(() => {
        setDeleteMessage("");
      }, 3000);
    } catch (err) {
      console.error("Delete error:", err);

      setDeleteMessage(
        err.message ||
          "Failed to delete candidate. Please try again."
      );

      setTimeout(() => {
        setDeleteMessage("");
      }, 4000);
    } finally {
      setDeletingCandidate(false);
    }
  };

  // =========================================================
  // NORMALIZE ANALYSIS RESULT
  // =========================================================

  const normalizeAnalysisResult = (data) => {
    const analysisData =
      data?.analysis || {};

    const candidateData =
      data?.candidate || {};

    const resumeDetails =
      data?.resume_details || {};

    const skillMatching =
      data?.skill_matching ||
      analysisData?.skill_matching ||
      {};

    const qualificationMatching =
      data?.qualification_matching ||
      analysisData?.qualification_matching ||
      {};

    const experienceMatching =
      data?.experience_matching ||
      analysisData?.experience_matching ||
      {};

    const explanation =
      data?.explanation ||
      analysisData?.explanation ||
      {};

    const overallScore =
      data?.overall_score ??
      candidateData?.overall_score ??
      analysisData?.overall_score ??
      0;

    const matchedSkills =
      skillMatching?.matched ??
      data?.matched_skills ??
      analysisData?.matched_skills ??
      [];

    const missingSkills =
      skillMatching?.missing ??
      data?.missing_skills ??
      analysisData?.missing_skills ??
      [];

    const skillScore =
      skillMatching?.score ??
      data?.skill_score ??
      candidateData?.skill_score ??
      analysisData?.skill_score ??
      0;

    const qualificationStatus =
      qualificationMatching?.status ??
      qualificationMatching?.result ??
      data?.qualification_status ??
      candidateData?.qualification_status ??
      analysisData?.qualification_status ??
      "Not available";

    const experienceScore =
      experienceMatching?.score ??
      data?.experience_score ??
      candidateData?.experience_score ??
      analysisData?.experience_score ??
      0;

    const experienceStatus =
      experienceMatching?.status ??
      data?.experience_status ??
      candidateData?.experience_status ??
      analysisData?.experience_status ??
      "Not available";

    let recommendation =
      explanation?.recommendation ??
      data?.recommendation ??
      analysisData?.recommendation;

    if (!recommendation) {
      recommendation =
        getRecruitmentStatus(overallScore);
    }

    const strengths =
      explanation?.strengths ??
      data?.strengths ??
      analysisData?.strengths ??
      [];

    const gaps =
      explanation?.gaps ??
      data?.gaps ??
      analysisData?.gaps ??
      [];

    return {
      ...data,

      overall_score: Number(overallScore),

      candidate: {
        ...candidateData,
        ...resumeDetails,

        name:
          candidateData?.name ||
          resumeDetails?.name ||
          data?.name ||
          "Not available",

        email:
          candidateData?.email ||
          resumeDetails?.email ||
          data?.email ||
          "Not available",

        phone:
          candidateData?.phone ||
          resumeDetails?.phone ||
          data?.phone ||
          "Not available",
      },

      skill_matching: {
        score: Number(skillScore || 0),
        matched: getArrayValue(matchedSkills),
        missing: getArrayValue(missingSkills),
      },

      qualification_matching: {
        status: qualificationStatus,
      },

      experience_matching: {
        score: Number(experienceScore || 0),
        status: experienceStatus,
      },

      explanation: {
        recommendation,
        strengths: getArrayValue(strengths),
        gaps: getArrayValue(gaps),
      },
    };
  };

  // =========================================================
  // ANALYZE RESUME
  // =========================================================

  const analyzeResume = async () => {
    if (!file) {
      setError("Please select a resume PDF.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF resume files are allowed.");
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setError(
        "Resume file size must be less than 5 MB."
      );
      return;
    }

    const trimmedJobDescription =
      jobDescription.trim();

    if (!trimmedJobDescription) {
      setError("Please enter a job description.");
      return;
    }

    if (trimmedJobDescription.length < 20) {
      setError(
        "Job description must contain at least 20 characters."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();

    formData.append("file", file);
    formData.append(
      "job_description",
      trimmedJobDescription
    );

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/upload-resume",
        {
          method: "POST",
          body: formData,
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(
            data?.detail ||
              "Invalid resume or job description."
          );
        }

        if (response.status === 422) {
          throw new Error(
            data?.detail ||
              "Please check the information provided."
          );
        }

        if (response.status === 500) {
          throw new Error(
            "Server error occurred while analyzing the resume."
          );
        }

        throw new Error(
          data?.detail ||
            `Analysis failed. Server returned ${response.status}.`
        );
      }

      if (!data) {
        throw new Error(
          "No valid response received from the server."
        );
      }

      if (
        data?.message ===
        "This candidate has already been analyzed for this job description."
      ) {
        setError(
          "This candidate has already been analyzed for this job description."
        );
        return;
      }

      const normalizedResult =
        normalizeAnalysisResult(data);

      setResult(normalizedResult);

      await fetchCandidates();
    } catch (err) {
      console.error(
        "Resume analysis error:",
        err
      );

      setError(
        err.message ||
          "Unable to analyze the resume. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // DASHBOARD STATISTICS
  // =========================================================

  const totalCandidates =
    candidates.length;

  const averageScore =
    totalCandidates > 0
      ? (
          candidates.reduce(
            (sum, candidate) =>
              sum +
              Number(
                candidate.overall_score || 0
              ),
            0
          ) / totalCandidates
        ).toFixed(2)
      : "0.00";

  const highestScore =
    totalCandidates > 0
      ? Math.max(
          ...candidates.map(
            (candidate) =>
              Number(
                candidate.overall_score || 0
              )
          )
        ).toFixed(2)
      : "0.00";

  const topCandidate =
    totalCandidates > 0
      ? candidates.reduce(
          (top, candidate) => {
            return Number(
              candidate.overall_score || 0
            ) >
              Number(
                top.overall_score || 0
              )
              ? candidate
              : top;
          },
          candidates[0]
        )
      : null;

  // =========================================================
  // RECRUITMENT COUNTS
  // =========================================================

  const shortlistedCount =
    candidates.filter((candidate) => {
      const status =
        candidate.recruitment_status;

      if (status) {
        return status === "Shortlisted";
      }

      return (
        Number(
          candidate.overall_score || 0
        ) >= 75
      );
    }).length;

  const reviewCount =
    candidates.filter((candidate) => {
      const status =
        candidate.recruitment_status;

      if (status) {
        return status === "Under Review";
      }

      const score = Number(
        candidate.overall_score || 0
      );

      return score >= 50 && score < 75;
    }).length;

  const notRecommendedCount =
    candidates.filter((candidate) => {
      const status =
        candidate.recruitment_status;

      if (status) {
        return status === "Not Recommended";
      }

      return (
        Number(
          candidate.overall_score || 0
        ) < 50
      );
    }).length;

  // =========================================================
  // CHART DATA
  // =========================================================

  const recruitmentChartData = [
    {
      name: "Shortlisted",
      candidates: shortlistedCount,
    },
    {
      name: "Under Review",
      candidates: reviewCount,
    },
    {
      name: "Not Recommended",
      candidates: notRecommendedCount,
    },
  ];

  // =========================================================
  // SEARCH + STATUS FILTER + SORT
  // =========================================================

  const filteredCandidates =
    candidates
      .filter((candidate) => {
        const name =
          candidate.name || "";

        const email =
          candidate.email || "";

        const currentStatus =
          candidate.recruitment_status ||
          getRecruitmentStatus(
            candidate.overall_score
          );

        const matchesSearch =
          name
            .toLowerCase()
            .includes(
              searchTerm.toLowerCase()
            ) ||
          email
            .toLowerCase()
            .includes(
              searchTerm.toLowerCase()
            );

        const matchesStatus =
          statusFilter === "all" ||
          currentStatus === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      })
      .sort((a, b) => {
        const scoreA = Number(
          a.overall_score || 0
        );

        const scoreB = Number(
          b.overall_score || 0
        );

        return sortOrder === "high"
          ? scoreB - scoreA
          : scoreA - scoreB;
      });

  // =========================================================
  // PAGINATION CALCULATION
  // =========================================================

  const totalPages = Math.ceil(
    filteredCandidates.length /
      candidatesPerPage
  );

  const startIndex =
    (currentPage - 1) *
    candidatesPerPage;

  const endIndex =
    startIndex + candidatesPerPage;

  const paginatedCandidates =
    filteredCandidates.slice(
      startIndex,
      endIndex
    );

  // =========================================================
  // AI RECOMMENDATION HELPER
  // =========================================================

  const getRecommendation = (score) => {
    const value = Number(score || 0);

    if (value >= 75) {
      return {
        title: "Strong Candidate",
        message:
          "This candidate is a strong match for the job requirements and is recommended for further consideration.",
        className:
          "recommendation-strong",
      };
    }

    if (value >= 50) {
      return {
        title:
          "Candidate Under Review",
        message:
          "This candidate partially matches the job requirements and should be reviewed by the recruiter.",
        className:
          "recommendation-review",
        icon: "   ",
      };
    }

    return {
      title: "Low Match",
      message:
        "This candidate has a relatively low match with the current job requirements.",
      className:
        "recommendation-low",
      icon: "   ",
    };
  };

  // =========================================================
  // SCORE CLASS
  // =========================================================

  const getScoreClass = (score) => {
    const value = Number(score || 0);

    if (value >= 75) {
      return "score-high";
    }

    if (value >= 50) {
      return "score-medium";
    }

    return "score-low";
  };

  // =========================================================
  // DISPLAY ARRAY / OBJECT / STRING
  // =========================================================

  const displayArray = (items) => {
    if (!items && items !== 0) {
      return (
        <span className="empty-text">
          Not available
        </span>
      );
    }

    if (
      !Array.isArray(items) &&
      typeof items === "object"
    ) {
      return (
        <div className="profile-object-list">
          {Object.entries(items).map(
            ([key, value]) => (
              <div
                className="profile-object-item"
                key={key}
              >
                <span>
                  {key
                    .replace(
                      /_/g,
                      " "
                    )
                    .replace(
                      /\b\w/g,
                      (letter) =>
                        letter.toUpperCase()
                    )}
                </span>

                <strong>
                  {typeof value ===
                  "boolean"
                    ? value
                      ? "Yes"
                      : "No"
                    : value ||
                      "Not available"}
                </strong>
              </div>
            )
          )}
        </div>
      );
    }

    if (Array.isArray(items)) {
      if (items.length === 0) {
        return (
          <span className="empty-text">
            Not available
          </span>
        );
      }

      return (
        <ul className="profile-detail-list">
          {items.map(
            (item, index) => (
              <li key={index}>
                {typeof item ===
                "string"
                  ? item
                  : JSON.stringify(
                      item
                    )}
              </li>
            )
          )}
        </ul>
      );
    }

    if (
      typeof items === "string" &&
      items.includes(",")
    ) {
      const values =
        items
          .split(",")
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);

      if (values.length > 1) {
        return (
          <ul className="profile-detail-list">
            {values.map(
              (item, index) => (
                <li key={index}>
                  {item}
                </li>
              )
            )}
          </ul>
        );
      }
    }

    return (
      <span>
        {String(items)}
      </span>
    );
  };

  // =========================================================
  // LOGIN SCREEN
  // =========================================================

  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #e0e7ff 100%)",
          padding: "20px",
          fontFamily:
            "Inter, Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "40px",
            boxShadow:
              "0 20px 50px rgba(15, 23, 42, 0.12)",
            border:
              "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                margin:
                  "0 auto 16px",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                background:
                  "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#ffffff",
                fontSize: "22px",
                fontWeight: "800",
                boxShadow:
                  "0 10px 25px rgba(79, 70, 229, 0.25)",
              }}
            >
              AI
            </div>

            <h1
              style={{
                margin: "0",
                fontSize: "28px",
                fontWeight: "800",
                color: "#111827",
              }}
            >
              RecruitAI
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Recruitment Platform
            </p>
          </div>

          <div
            style={{
              marginBottom: "24px",
            }}
          >

            
<h2
  style={{
    margin:
      "0 0 8px",
    fontSize: "22px",
    color: "#111827",
}}
>
  {showSignup
    ? "Create Recruiter Account"
    : "Recruiter Login"}
</h2>

            <p
  style={{
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  }}
>
  {showSignup
    ? "Create your recruiter account to get started."
    : "Sign in to access your recruitment dashboard."}
</p>
          </div>

          <form
  onSubmit={
    showForgotPassword
      ? resetToken
        ? handleResetPassword
        : handleForgotPassword
      : showSignup
        ? handleSignup
        : handleLogin
  }
>
{showForgotPassword ? (
  <div>
    <label
      style={{
        display: "block",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
      }}
    >
      Registered Email
    </label>

    <input
      type="email"
      placeholder="Enter your registered email"
      value={forgotPasswordEmail}
      onChange={(e) => {
        setForgotPasswordEmail(e.target.value);
        setLoginError("");
      }}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "13px 14px",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        background: "#ffffff",
      }}
    />

    <button
      type="button"
      onClick={handleForgotPassword}
      style={{
        width: "100%",
        marginTop: "16px",
        padding: "14px",
        border: "none",
        borderRadius: "10px",
        background:
          "linear-gradient(135deg, #4f46e5, #7c3aed)",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "700",
        cursor: "pointer",
      }}
    >
      Generate Reset Token
    </button>
    {resetToken && (
  <div style={{ marginTop: "18px" }}>
    <label
      style={{
        display: "block",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
      }}
    >
      New Password
    </label>

    <input
      type="password"
      placeholder="Enter new password"
      value={newPassword}
      onChange={(e) => {
        setNewPassword(e.target.value);
        setLoginError("");
      }}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "13px 14px",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        background: "#ffffff",
      }}
    />

    <label
      style={{
        display: "block",
        marginTop: "14px",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
      }}
    >
      Confirm New Password
    </label>

    <input
      type="password"
      placeholder="Confirm new password"
      value={resetConfirmPassword}
      onChange={(e) => {
        setResetConfirmPassword(e.target.value);
        setLoginError("");
      }}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "13px 14px",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        background: "#ffffff",
      }}
    />

    <button
      type="submit"
      style={{
        width: "100%",
        marginTop: "16px",
        padding: "14px",
        border: "none",
        borderRadius: "10px",
        background:
          "linear-gradient(135deg, #4f46e5, #7c3aed)",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "700",
        cursor: "pointer",
      }}
    >
      Reset Password
    </button>
  </div>
)}
  </div>
) : (
  <div>
  {showSignup && (
    <div
      style={{
        marginBottom: "20px",
      }}
    >
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "600",
          color: "#374151",
        }}
      >
        Full Name
      </label>

      <input
        type="text"
        placeholder="Enter recruiter name"
        value={signupName}
        onChange={(e) => {
          setSignupName(e.target.value);
          setLoginError("");
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "13px 14px",
          border: "1px solid #d1d5db",
          borderRadius: "10px",
          fontSize: "14px",
          outline: "none",
          background: "#ffffff",
        }}
      />
    </div>
  )}

  <div
    style={{
      marginBottom: "20px",
    }}
  >
    <label
      style={{
        display: "block",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
      }}
    >
      Email Address
    </label>

              <input
                type="email"
                placeholder="Enter recruiter email"
                value={showSignup ? signupEmail : loginEmail}
                onChange={(e) => {
  if (showSignup) {
    setSignupEmail(e.target.value);
  } else {
    setLoginEmail(e.target.value);
  }

  setLoginError("");
}}
                style={{
                  width: "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "13px 14px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius:
                    "10px",
                  fontSize: "14px",
                  outline: "none",
                  background:
                    "#ffffff",
                }}
              />
            </div>

            <div
              style={{
                marginBottom:
                  "18px",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom:
                    "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Password
              </label>

              <div
                style={{
                  position:
                    "relative",
                }}
              >
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter password"
                  value={
                    showSignup
                    ? signupPassword
                    : loginPassword
                  }
                  onChange={(e) => {
  if (showSignup) {
    setSignupPassword(e.target.value);
  } else {
    setLoginPassword(e.target.value);
  }

  setLoginError("");
}}
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "13px 70px 13px 14px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      "10px",
                    fontSize: "14px",
                    outline: "none",
                    background:
                      "#ffffff",
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  style={{
                    position:
                      "absolute",
                    right: "10px",
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    border: "none",
                    background:
                      "transparent",
                    color: "#4f46e5",
                    cursor:
                      "pointer",
                    fontSize: "13px",
                    fontWeight:
                      "600",
                  }}
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </div>

            {showSignup && (
  <div
    style={{
      marginBottom: "18px",
    }}
  >
    <label
      style={{
        display: "block",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
      }}
    >
      Register As
    </label>

    <select
      value={signupRole}
      onChange={(e) => {
        setSignupRole(e.target.value);
        setLoginError("");
      }}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "13px 14px",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        background: "#ffffff",
      }}
    >
      <option value="candidate">Candidate</option>
      <option value="recruiter">Recruiter</option>
    </select>
  </div>
)}

            {showSignup && (
  <div
    style={{
      marginBottom: "18px",
    }}
  >
    <label
      style={{
        display: "block",
        marginBottom: "8px",
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
      }}
    >
      Confirm Password
    </label>

    <input
      type="password"
      placeholder="Confirm your password"
      value={confirmPassword}
      onChange={(e) => {
        setConfirmPassword(e.target.value);
        setLoginError("");
      }}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "13px 14px",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        background: "#ffffff",
      }}
    />
  </div>
)}

            {loginError && (
              <div
                style={{
                  padding:
                    "11px 13px",
                  marginBottom:
                    "18px",
                  borderRadius:
                    "8px",
                  background:
                    "#fef2f2",
                  border:
                    "1px solid #fecaca",
                  color: "#dc2626",
                  fontSize:
                    "13px",
                }}
              >
                    {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius:
                  "10px",
                background:
                  "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "700",
                cursor:
                  "pointer",
                boxShadow:
                  "0 8px 20px rgba(79, 70, 229, 0.22)",
              }}
            >

  
              {showSignup
              ? "Create Account"
              : "Login to Dashboard"}
            </button>
            {!showSignup && (
              <div
                id="googleSignInButton"
                style={{
                  marginTop: "14px",
                  display: "flex",
                  justifyContent: "center",
                }}
              ></div>
            )}

            {!showSignup && (
  <div
    style={{
      marginTop: "14px",
      textAlign: "right",
    }}
  >
    <button
      type="button"
      onClick={() => {
        setShowForgotPassword(true);
        setLoginError("");
      }}
      style={{
        border: "none",
        background: "transparent",
        color: "#4f46e5",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        padding: 0,
      }}
    >
      Forgot Password?
    </button>
  </div>
)}

            <div
  style={{
    marginTop: "18px",
    textAlign: "center",
    fontSize: "14px",
    color: "#64748b",
  }}
>
  {showSignup
    ? "Already have an account? "
    : "Don't have an account? "}

  <button
    type="button"
    onClick={() => {
      setShowSignup(!showSignup);
      setLoginError("");
    }}
    style={{
      border: "none",
      background: "transparent",
      color: "#4f46e5",
      fontWeight: "700",
      cursor: "pointer",
      padding: 0,
    }}
  >
    {showSignup ? "Login" : "Create Account"}
  </button>
</div>
</div>
)}
</form>
        </div>
      </div>
    );
  }

  // =========================================================
  // AI INTERVIEW VIEW
  // =========================================================

  if (currentView === "interview") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
        }}
      >
        <div
          style={{
            padding: "20px 40px",
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <button
            onClick={() =>
              setCurrentView("dashboard")
            }
            style={{
              padding: "10px 18px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#374151",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
                Back to Dashboard
          </button>

          <strong
            style={{
              fontSize: "18px",
              color: "#111827",
            }}
          >
            RecruitAI     AI Interview
          </strong>
        </div>

        <Interview 
        userRole={userRole}
        userId={localStorage.getItem("userId")}
        />
      </div>
    );
  }

  <Interview userRole={userRole} />

  if (currentView === "jobs") {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <button
        onClick={() => setCurrentView("dashboard")}
        style={{
          padding: "10px 18px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          background: "#ffffff",
          cursor: "pointer",
          fontWeight: "600",
        }}
      >
        ← Back to Dashboard
      </button>

      <h1
        style={{
          marginTop: "30px",
          color: "#111827",
        }}
      >
        Available Jobs
      </h1>
      {jobsLoading ? (
  <p style={{ color: "#64748b" }}>
    Loading jobs...
  </p>
) : jobs.length === 0 ? (
  <p style={{ color: "#64748b" }}>
    No jobs available right now.
  </p>
) : (
  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "20px",
      marginTop: "25px",
    }}
  >
    {jobs.map((job) => (
      <div
        key={job.job_id}
        style={{
          background: "#ffffff",
          padding: "22px",
          borderRadius: "14px",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            color: "#111827",
          }}
        >
          {job.title}
        </h2>

        <p style={{ color: "#64748b" }}>
          {job.description || "No job description available."}
        </p>

        <button
        onClick={() => applyForJob(job.job_id)}
          style={{
            marginTop: "10px",
            padding: "10px 18px",
            border: "none",
            borderRadius: "8px",
            background: "#4f46e5",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Apply Now
        </button>
      </div>
    ))}
  </div>
)}
    </div>
  );
}

if (userRole === "candidate") {
  if (currentView === "profile") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          fontFamily: "Inter, Arial, sans-serif",
          padding: "40px",
        }}
      >
        <button
          onClick={() => setCurrentView("dashboard")}
          style={{
            padding: "10px 18px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            maxWidth: "800px",
            margin: "30px auto",
            background: "#ffffff",
            padding: "30px",
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h1 style={{ color: "#111827" }}>
            My Profile
          </h1>

          {profileLoading ? (
            <p style={{ color: "#64748b" }}>
              Loading profile...
            </p>
          ) : (
            <>
              {[
                ["Phone", "phone"],
                ["Education", "education"],
                ["Experience", "experience"],
                ["Skills", "skills"],
              ].map(([label, field]) => (
                <div
                  key={field}
                  style={{ marginTop: "18px" }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {label}
                  </label>

                  {editingProfile ? (
                    <textarea
                      value={profileForm[field]}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          [field]: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        minHeight:
                          field === "skills"
                            ? "80px"
                            : "45px",
                        fontFamily: "inherit",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        padding: "12px",
                        background: "#f8fafc",
                        borderRadius: "8px",
                        color: "#475569",
                      }}
                    >
                      {candidateProfile?.[field] ||
                        "Not provided"}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ marginTop: "25px" }}>
                {editingProfile ? (
                  <>
                    <button
                      onClick={saveCandidateProfile}
                      style={{
                        padding: "10px 18px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#4f46e5",
                        color: "#ffffff",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Save Profile
                    </button>

                    <button
                      onClick={() => {
                        setEditingProfile(false);
                        loadCandidateProfile();
                      }}
                      style={{
                        marginLeft: "10px",
                        padding: "10px 18px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        background: "#ffffff",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditingProfile(true)}
                    style={{
                      padding: "10px 18px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#4f46e5",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }


  if (currentView === "applications") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          fontFamily: "Inter, Arial, sans-serif",
          padding: "40px",
        }}
      >
        <button
          onClick={() => setCurrentView("dashboard")}
          style={{
            padding: "10px 18px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          ← Back to Dashboard
        </button>

        <h1
          style={{
            marginTop: "30px",
            color: "#111827",
          }}
        >
          My Applications
        </h1>

        {applicationsLoading ? (
          <p style={{ color: "#64748b" }}>
            Loading applications...
          </p>
        ) : applications.length === 0 ? (
          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              background: "#ffffff",
              borderRadius: "12px",
              color: "#64748b",
            }}
          >
            You have not applied for any jobs yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "18px",
              marginTop: "20px",
            }}
          >
            {applications.map((application) => {
              const job = jobs.find(
                (item) => item.job_id === application.job_id
              );

              return (
                <div
                  key={application.application_id}
                  style={{
                    background: "#ffffff",
                    padding: "22px",
                    borderRadius: "14px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      color: "#111827",
                    }}
                  >
                    {job?.title ||
                      `Job #${application.job_id}`}
                  </h2>

                  <p style={{ color: "#64748b" }}>
                    Application ID:{" "}
                    {application.application_id}
                  </p>

                  <strong>
                    Status:{" "}
                    {application.status}
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }


  if (currentView === "jobs") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          padding: "40px",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <button
          onClick={() => setCurrentView("dashboard")}
          style={{
            padding: "10px 18px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          ← Back to Dashboard
        </button>

        <h1
          style={{
            marginTop: "30px",
            color: "#111827",
          }}
        >
          Available Jobs
        </h1>

        {jobsLoading ? (
          <p style={{ color: "#64748b" }}>
            Loading jobs...
          </p>
        ) : jobs.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No jobs available right now.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginTop: "25px",
            }}
          >
            {jobs.map((job) => {
              const alreadyApplied = applications.some(
                (application) =>
                  application.job_id === job.id
              );

              return (
                <div
                  key={job.job_id}
                  style={{
                    background: "#ffffff",
                    padding: "22px",
                    borderRadius: "14px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                      color: "#111827",
                    }}
                  >
                    {job.title}
                  </h2>

                  <p style={{ color: "#64748b" }}>
                    {job.description ||
                      "No job description available."}
                  </p>

                  <button
                    onClick={() =>
                      applyForJob(job.id)
                    }
                    disabled={alreadyApplied}
                    style={{
                      marginTop: "10px",
                      padding: "10px 18px",
                      border: "none",
                      borderRadius: "8px",
                      background: alreadyApplied
                        ? "#94a3b8"
                        : "#4f46e5",
                      color: "#ffffff",
                      cursor: alreadyApplied
                        ? "not-allowed"
                        : "pointer",
                      fontWeight: "600",
                    }}
                  >
                    {alreadyApplied
                      ? "Already Applied"
                      : "Apply Now"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }


  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "18px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: "#111827",
              fontSize: "24px",
            }}
          >
            RecruitAI
          </h1>

          <p
            style={{
              margin: "4px 0 0",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Candidate Dashboard
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px 18px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            background: "#ffffff",
            color: "#374151",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Logout
        </button>
      </header>

      <main
        style={{
          padding: "35px 40px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h2
            style={{
              margin: 0,
              color: "#111827",
              fontSize: "28px",
            }}
          >
            Welcome, Candidate 👋
          </h2>

          <p
            style={{
              color: "#64748b",
              marginTop: "8px",
            }}
          >
            Manage your profile, applications and AI interview.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3>👤 My Profile</h3>

            <p style={{ color: "#64748b" }}>
              View and manage your candidate profile.
            </p>

            <button
              onClick={() => setCurrentView("profile")}
              style={{
                padding: "9px 16px",
                border: "none",
                borderRadius: "8px",
                background: "#4f46e5",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              View Profile
            </button>
          </div>

          <div
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3>💼 Available Jobs</h3>

            <p style={{ color: "#64748b" }}>
              Explore jobs and apply for suitable positions.
            </p>

            <button
              onClick={() => setCurrentView("jobs")}
              style={{
                padding: "9px 16px",
                border: "none",
                borderRadius: "8px",
                background: "#4f46e5",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Browse Jobs
            </button>
          </div>

          <div
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3>📋 My Applications</h3>

            <p style={{ color: "#64748b" }}>
              Track your job applications and their status.
            </p>

            <button
              onClick={() =>
                setCurrentView("applications")
              }
              style={{
                padding: "9px 16px",
                border: "none",
                borderRadius: "8px",
                background: "#4f46e5",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              View Applications
            </button>
          </div>

          <div
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3>🎤 AI Interview</h3>

            <p style={{ color: "#64748b" }}>
              Take your technical AI-powered interview.
            </p>

            <button
              onClick={() =>
                setCurrentView("interview")
              }
              style={{
                padding: "9px 16px",
                border: "none",
                borderRadius: "8px",
                background: "#4f46e5",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Start Interview
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: "28px",
            background: "#ffffff",
            padding: "24px",
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#111827",
            }}
          >
            Application Status
          </h2>

          <p style={{ color: "#64748b" }}>
            Your recent applications and interview status
            will appear here.
          </p>

          {applications.length === 0 ? (
            <div
              style={{
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "10px",
                color: "#64748b",
              }}
            >
              No applications yet.
            </div>
          ) : (
            applications.slice(0, 3).map((application) => {
              const job = jobs.find(
                (item) => item.id === application.job_id
              );

              return (
                <div
                  key={application.application_id}
                  style={{
                    padding: "14px",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    marginTop: "10px",
                  }}
                >
                  <strong>
                    {job?.title ||
                      `Job #${application.job_id}`}
                  </strong>

                  <div
                    style={{
                      marginTop: "5px",
                      color: "#64748b",
                    }}
                  >
                    Status: {application.status}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

  // =========================================================
  // DASHBOARD UI
  // =========================================================

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            AI
          </div>

          <div>
            <h2>
              RecruitAI
            </h2>

            <span>
              Recruitment Platform
            </span>
          </div>

        </div>

        <nav className="sidebar-nav">

          <a
            href="#dashboard"
className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}            onClick={() =>
              setCurrentView("dashboard")
            }
          >
            <span>   </span>
            Dashboard
          </a>

          <button
  type="button"
  className={`nav-item ${currentView === "candidates" ? "active" : ""}`}
  onClick={() => setCurrentView("candidates")}
  style={{
    width: "100%",
    border: "none",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
  }}
>
  <span></span>
  Candidates
</button>
            

          <a
            href="#analysis"
            className="nav-item"
            onClick={() =>
              setCurrentView("dashboard")
            }
          >
            <span>   </span>
            Resume Analysis
          </a>

          {/* AI INTERVIEW */}

          <button
            type="button"
            className="nav-item"
            onClick={() =>
              setCurrentView("interview")
            }
            style={{
              width: "100%",
              border: "none",
              textAlign: "left",
              fontFamily: "inherit",
            }}
          >
            <span>    </span>
            AI Interview
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="ai-status">

            <span className="status-dot"></span>

            <div>

              <strong>
                AI System Online
              </strong>

              <small>
                FastAPI Connected
              </small>

            </div>

          </div>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "10px 12px",
              borderRadius: "8px",
              border:
                "1px solid rgba(255,255,255,0.15)",
              background:
                "rgba(255,255,255,0.08)",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
                 Logout
          </button>

        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        {/* TOP BAR */}

        <div
          className="topbar"
          id="dashboard"
        >

          <div>

            <h1>
              Recruiter Dashboard
            </h1>

            <p>
              Overview of candidates analyzed by the AI recruitment system.
            </p>

          </div>

          <button
            className="refresh-button"
            onClick={fetchCandidates}
            disabled={
              dashboardLoading
            }
          >
            {dashboardLoading
              ? "Refreshing..."
              : "    Refresh"}
          </button>

        </div>

        {/* DELETE SUCCESS */}

        {deleteMessage && (
          <div className="delete-success-message">
                {deleteMessage}
          </div>
        )}

        {error && (
          <div className="error">
                {error}
          </div>
        )}
        {currentView !== "candidates" && (
  <>

        {/* STATISTICS */}

        <div className="stats-grid">

          <div className="stat-card">

            <div className="stat-top">

              <span className="stat-icon blue">
                    
              </span>

              <span className="stat-label">
                Total Candidates
              </span>

            </div>

            <h2>
              {totalCandidates}
            </h2>

            <p>
              Candidates analyzed
            </p>

          </div>

          <div className="stat-card">

            <div className="stat-top">

              <span className="stat-icon purple">
                %
              </span>

              <span className="stat-label">
                Average Match
              </span>

            </div>

            <h2>
              {averageScore}%
            </h2>

            <p>
              Average candidate score
            </p>

          </div>

          <div className="stat-card">

            <div className="stat-top">

              <span className="stat-icon green">
                   
              </span>

              <span className="stat-label">
                Highest Score
              </span>

            </div>

            <h2>
              {highestScore}%
            </h2>

            <p>
              Best candidate match
            </p>

          </div>

          <div className="stat-card">

            <div className="stat-top">

              <span className="stat-icon orange">
                   
              </span>

              <span className="stat-label">
                Top Candidate
              </span>

            </div>

            <h2 className="top-candidate-name">
              {topCandidate
                ? topCandidate.name
                : "No candidates"}
            </h2>

            <p>
              Highest ranked candidate
            </p>

          </div>

        </div>

        {/* RECRUITMENT OVERVIEW */}

        <section className="recruitment-overview">

          <div className="overview-heading">

            <div>

              <h2>
                Recruitment Overview
              </h2>

              <p>
                Candidate distribution based on AI recruitment status.
              </p>

            </div>

          </div>

          <div className="overview-grid">

            <div className="overview-card">

              <div className="overview-icon shortlisted-icon">
                   
              </div>

              <div className="overview-content">

                <span>
                  Shortlisted
                </span>

                <strong>
                  {shortlistedCount}
                </strong>

                <small>
                  Score 75% and above
                </small>

              </div>

            </div>

            <div className="overview-card">

              <div className="overview-icon review-icon">
                !
              </div>

              <div className="overview-content">

                <span>
                  Under Review
                </span>

                <strong>
                  {reviewCount}
                </strong>

                <small>
                  Score between 50% and 74.99%
                </small>

              </div>

            </div>

            <div className="overview-card">

              <div className="overview-icon rejected-icon">
                  
              </div>

              <div className="overview-content">

                <span>
                  Not Recommended
                </span>

                <strong>
                  {notRecommendedCount}
                </strong>

                <small>
                  Score below 50%
                </small>

              </div>

            </div>

          </div>

        </section>

        {/* ANALYTICS */}

        <section className="analytics-section">

          <div className="analytics-card">

            <div className="analytics-header">

              <div>

                <span className="section-kicker">
                  RECRUITMENT ANALYTICS
                </span>

                <h2>
                  Candidate Distribution
                </h2>

                <p>
                  Overview of candidates based on their AI recruitment status.
                </p>

              </div>

              <div className="analytics-total">

                <span>
                  Total
                </span>

                <strong>
                  {totalCandidates}
                </strong>

              </div>

            </div>

            <div className="recharts-container">

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart
                  data={
                    recruitmentChartData
                  }
                  margin={{
                    top: 20,
                    right: 20,
                    left: 0,
                    bottom: 20,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="candidates"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

        </section>
          </>
)}

        {/* CANDIDATE RANKING */}

        <section
          className="dashboard-card"
          id="candidates"
        >

          <div className="card-header">

            <div>

              <h2>
                Candidate Ranking
              </h2>

              <p>
                Candidates ranked according to their overall AI match score.
              </p>

            </div>

            <div className="candidate-tools">

              <div className="search-box">

                <span>
                     
                </span>

                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={
                    searchTerm
                  }
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                />

              </div>

              <select
                className="sort-select"
                value={
                  sortOrder
                }
                onChange={(e) =>
                  setSortOrder(
                    e.target.value
                  )
                }
              >

                <option value="high">
                  Highest Score
                </option>

                <option value="low">
                  Lowest Score
                </option>

              </select>

              <select
                className="sort-select"
                value={
                  statusFilter
                }
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >

                <option value="all">
                  All Statuses
                </option>

                <option value="Shortlisted">
                  Shortlisted
                </option>

                <option value="Under Review">
                  Under Review
                </option>

                <option value="Not Recommended">
                  Not Recommended
                </option>

              </select>

            </div>

          </div>

          {dashboardLoading ? (

            <div className="dashboard-message">
              Loading candidates...
            </div>

          ) : candidates.length === 0 ? (

            <div className="empty-candidates-state">

              <div className="empty-candidates-icon">
                    
              </div>

              <h3>
                No Candidates Yet
              </h3>

              <p>
                There are no candidates in the recruitment database.
                Upload and analyze a resume to add the first candidate.
              </p>

              <button
                className="empty-state-button"
                onClick={() => {
                  document
                    .getElementById(
                      "analysis"
                    )
                    ?.scrollIntoView({
                      behavior:
                        "smooth",
                    });
                }}
              >
                Analyze a Resume
              </button>

            </div>

          ) : filteredCandidates.length === 0 ? (

            <div className="dashboard-message">
              No candidates match your search or status filter.
            </div>

          ) : (

            <>

              <div className="table-wrapper">

                <table className="candidate-table">

                  <thead>

                    <tr>

                      <th>
                        Rank
                      </th>

                      <th>
                        Candidate
                      </th>

                      <th>
                        Email
                      </th>

                      <th>
                        Overall Score
                      </th>

                      <th>
                        Skills
                      </th>

                      <th>
                        Qualification
                      </th>

                      <th>
                        Experience
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {paginatedCandidates.map(
                      (
                        candidate,
                        index
                      ) => {

                        const actualRank =
                          startIndex +
                          index;

                        return (

                          <tr
                            key={
                              candidate.id ||
                              actualRank
                            }
                          >

                            <td>

                              <span className="rank-badge">

                                {actualRank ===
                                0
                                  ? "     #1"
                                  : actualRank ===
                                    1
                                  ? "     #2"
                                  : actualRank ===
                                    2
                                  ? "     #3"
                                  : `#${
                                      actualRank +
                                      1
                                    }`}

                              </span>

                            </td>

                            <td>

                              <button
                                className="candidate-name-button"
                                onClick={() =>
                                  openCandidateProfile(
                                    candidate
                                  )
                                }
                              >

                                <span className="avatar">

                                  {candidate.name
                                    ?.charAt(
                                      0
                                    )
                                    .toUpperCase()}

                                </span>

                                <strong>
                                  {
                                    candidate.name
                                  }
                                </strong>

                              </button>

                            </td>

                            <td className="email-cell">
                              {
                                candidate.email
                              }
                            </td>

                            <td>

                              <span
                                className={`match-score ${getScoreClass(
                                  candidate.overall_score
                                )}`}
                              >

                                {Number(
                                  candidate.overall_score ||
                                    0
                                ).toFixed(
                                  2
                                )}
                                %

                              </span>

                            </td>

                            <td>

                              {Number(
                                candidate.skill_score ||
                                  0
                              ).toFixed(0)}
                              %

                            </td>

                            <td>

                              <span className="status-badge success">

                                {candidate.qualification_status ||
                                  "Not available"}

                              </span>

                            </td>

                            <td className="experience-cell">

                              {candidate.experience_status ||
                                "Not available"}

                            </td>

                            <td>

                              <span
                                className={`recruitment-status ${getStatusClass(
                                  candidate.overall_score,
                                  candidate.recruitment_status
                                )}`}
                              >

                                {candidate.recruitment_status ||
                                  getRecruitmentStatus(
                                    candidate.overall_score
                                  )}

                              </span>

                            </td>

                            <td>

                              <button
                                className="delete-candidate-button"
                                onClick={() =>
                                  openDeleteConfirmation(
                                    candidate
                                  )
                                }
                                disabled={
                                  deletingCandidate
                                }
                              >
                                        Delete
                              </button>

                            </td>

                          </tr>

                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

              {totalPages > 1 && (

                <div className="pagination">

                  <button
                    className="pagination-button"
                    onClick={() =>
                      setCurrentPage(
                        (previous) =>
                          Math.max(
                            previous - 1,
                            1
                          )
                      )
                    }
                    disabled={
                      currentPage ===
                      1
                    }
                  >
                   
                  </button>

                  <div className="pagination-pages">

                    {Array.from(
                      {
                        length:
                          totalPages,
                      },
                      (
                        _,
                        index
                      ) => (
                        <button
                          key={
                            index
                          }
                          className={`pagination-page ${
                            currentPage ===
                            index + 1
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            setCurrentPage(
                              index +
                                1
                            )
                          }
                        >
                          {index +
                            1}
                        </button>
                      )
                    )}

                  </div>

                  <button
                    className="pagination-button"
                    onClick={() =>
                      setCurrentPage(
                        (previous) =>
                          Math.min(
                            previous + 1,
                            totalPages
                          )
                      )
                    }
                    disabled={
                      currentPage ===
                      totalPages
                    }
                  >
                    Next    
                  </button>

                </div>

              )}

              <div className="pagination-info">

                Showing{" "}
                {filteredCandidates.length ===
                0
                  ? 0
                  : startIndex + 1}
                -
                {Math.min(
                  endIndex,
                  filteredCandidates.length
                )}{" "}
                of{" "}
                {
                  filteredCandidates.length
                }{" "}
                candidates

              </div>

            </>

          )}

        </section>

        {/* CANDIDATE PROFILE MODAL */}

        {selectedCandidate && (

          <div
            className="profile-overlay"
            onClick={() =>
              setSelectedCandidate(
                null
              )
            }
          >

            <div
              className="profile-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="profile-header">

                <div className="profile-person">

                  <div className="profile-avatar">

                    {selectedCandidate.name
                      ?.charAt(
                        0
                      )
                      .toUpperCase()}

                  </div>

                  <div>

                    <h2>
                      {
                        selectedCandidate.name
                      }
                    </h2>

                    <p>
                      {
                        selectedCandidate.email
                      }
                    </p>

                  </div>

                </div>

                <div className="profile-header-actions">

                  <button
                    className="view-resume-button"
                    onClick={() =>
                      window.open(
                        `http://127.0.0.1:8000/candidates/${selectedCandidate.id}/resume`,
                        "_blank"
                      )
                    }
                  >
                         View Resume
                         </button>
                 

                  <button
                    className="delete-profile-button"
                    onClick={() =>
                      openDeleteConfirmation(
                        selectedCandidate
                      )
                    }
                    disabled={
                      deletingCandidate
                    }
                  >
                            Delete
                  </button>

                  <button
                    className="close-profile"
                    onClick={() =>
                      setSelectedCandidate(
                        null
                      )
                    }
                  >
                    
                  </button>

                </div>

              </div>

              <div className="profile-score">

                <div>

                  <span>
                    Overall Match
                  </span>

                  <strong>

                    {Number(
                      selectedCandidate.overall_score ||
                        0
                    ).toFixed(2)}

                    %

                  </strong>

                </div>

                <div className="profile-score-bar">

                  <div
                    style={{
                      width: `${Math.min(
                        Number(
                          selectedCandidate.overall_score ||
                            0
                        ),
                        100
                      )}%`,
                    }}
                  />

                </div>

              </div>

              {profileLoading ? (

                <div className="dashboard-message">
                  Loading complete candidate profile...
                </div>

              ) : profileError ? (

                <div className="error">
                  {profileError}
                </div>

              ) : (

                <>

                  <div className="profile-grid">

                    <div className="profile-info">

                      <span>
                             Email
                      </span>

                      <strong>
                        {
                          selectedCandidate.email ||
                          "Not available"
                        }
                      </strong>

                    </div>

                    <div className="profile-info">

                      <span>
                             Phone
                      </span>

                      <strong>
                        {
                          selectedCandidate.phone ||
                          "Not available"
                        }
                      </strong>

                    </div>

                    <div className="profile-info">

                      <span>
                        Skills Score
                      </span>

                      <strong>

                        {Number(
                          selectedCandidate.skill_score ||
                            0
                        ).toFixed(0)}

                        %

                      </strong>

                    </div>

                    <div className="profile-info">

                      <span>
                        Qualification
                      </span>

                      <strong>
                        {
                          selectedCandidate.qualification_status ||
                          "Not available"
                        }
                      </strong>

                    </div>

                    <div className="profile-info">

                      <span>
                        Experience
                      </span>

                      <strong>
                        {
                          selectedCandidate.experience_status ||
                          "Not available"
                        }
                      </strong>

                    </div>

                    <div className="profile-info">

                      <span>
                        Semantic Match
                      </span>

                      <strong>

                        {Number(
                          selectedCandidate.semantic_score ||
                            0
                        ).toFixed(2)}

                        %

                      </strong>

                    </div>

                  </div>

                  {/* SKILLS */}

                  <div className="profile-section">

                    <h3>
                      Skills
                    </h3>

                    <div className="skill-list">

                      {getSkillsArray(
                        selectedCandidate.skills
                      ).length > 0 ? (

                        getSkillsArray(
                          selectedCandidate.skills
                        ).map(
                          (
                            skill,
                            index
                          ) => (

                            <span
                              className="skill-chip matched"
                              key={
                                index
                              }
                            >
                              {" "}
                              {skill}
                            </span>

                          )
                        )

                      ) : (

                        <span className="empty-text">
                          No skills found
                        </span>

                      )}

                    </div>

                  </div>

                  {/* EDUCATION */}

                  <div className="profile-section">

                    <h3>
                      Education
                    </h3>

                    {displayArray(
                      selectedCandidate.education
                    )}

                  </div>

                  {/* EXPERIENCE */}

                  <div className="profile-section">

                    <h3>
                           Experience
                    </h3>

                    {displayArray(
                      selectedCandidate.experience
                    )}

                  </div>
                  {/* AI INTERVIEW SCORECARD */}

                  {interviewScorecard && (
                    <div className="profile-section">

                      <h3>AI Interview Scorecard</h3>

                      <p
                        style={{
                          marginTop: "6px",
                          marginBottom: "18px",
                          color: "#6b7280"
                        }}
                      >
                        AI-generated score based on the candidate's
                        technical video interview.
                      </p>

                      <div className="candidate-info-grid">

                        <div>
                          <span>Overall Interview Score</span>

                          <strong style={{ fontSize: "28px" }}>
                            {Number(
                              interviewScorecard.overall_score || 0
                            ).toFixed(1)}
                            /10
                          </strong>
                        </div>

                        <div>
                          <span>Questions Evaluated</span>

                          <strong>
                            {interviewScorecard.evaluated_questions || interviewScorecard.total_questions || 0}
                          </strong>
                        </div>

                        <div>
                          <span>Total Questions</span>

                          <strong>
                            {interviewScorecard.total_questions || 0}
                          </strong>
                        </div>

                      </div>

                      <div
                        style={{
                          marginTop: "18px",
                          padding: "12px 14px",
                          background: "#f8fafc",
                          borderRadius: "10px",
                          fontSize: "14px",
                          color: "#475569"
                        }}
                      >
                        <strong>Important:</strong>{" "}
                        This interview score is separate from the
                        resume/job matching score shown above.
                      </div>

                      <div style={{ marginTop: "20px" }}>

                        {Array.isArray(interviewScorecard.answers) &&
                          interviewScorecard.answers.map(
                            (answer, index) => (
                              <div
                                key={
                                  answer.answer_id || index
                                }
                                style={{
                                  padding: "14px",
                                  marginBottom: "12px",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "10px"
                                }}
                              >

                                <strong>
                                  Question {index + 1}
                                </strong>

                                <p style={{ margin: "8px 0" }}>
                                  Score:{" "}
                                  <strong>
                                    {Number(
                                      answer.score || 0
                                    ).toFixed(1)}
                                    /10
                                  </strong>
                                </p>

                                <p style={{ margin: 0 }}>
                                  {answer.feedback ||
                                    "No feedback available."}
                                </p>

                              </div>
                            )
                          )}

                      </div>

                    </div>
                  )}

                  {/* EXTRACURRICULAR */}

                  <div className="profile-section">

                    <h3>
                          Extracurricular Activities
                    </h3>

                    {displayArray(
                      selectedCandidate.extracurricular
                    )}

                  </div>

                  {/* AI RECOMMENDATION */}

                  <div className="profile-section">

                    <h3>
                      AI Recommendation
                    </h3>

                    {(() => {

                      const recommendation =
                        getRecommendation(
                          selectedCandidate.overall_score
                        );

                      return (

                        <div
                          className={`profile-recommendation ${recommendation.className}`}
                        >

                          <div className="recommendation-icon">
                            {
                              recommendation.icon
                            }
                          </div>

                          <div className="recommendation-content">

                            <strong>
                              {
                                recommendation.title
                              }
                            </strong>

                            <p>
                              {
                                recommendation.message
                              }
                            </p>

                          </div>

                        </div>

                      );

                    })()}

                  </div>

                  {/* SCORE BREAKDOWN */}

                  <div className="profile-score-breakdown">

                    <div className="breakdown-header">

                      <div>

                        <span className="section-kicker">
                          AI EVALUATION
                        </span>

                        <h3>
                          Score Breakdown
                        </h3>

                      </div>

                      <span className="breakdown-total">

                        {Number(
                          selectedCandidate.overall_score ||
                            0
                        ).toFixed(2)}
                        %

                      </span>

                    </div>

                    <div className="breakdown-item">

                      <div className="breakdown-label">

                        <span>
                          Semantic Match
                        </span>

                        <strong>

                          {Number(
                            selectedCandidate.semantic_score ||
                              0
                          ).toFixed(2)}
                          %

                        </strong>

                      </div>

                      <div className="breakdown-bar">

                        <div
                          style={{
                            width: `${Math.min(
                              Number(
                                selectedCandidate.semantic_score ||
                                  0
                              ),
                              100
                            )}%`,
                          }}
                        />

                      </div>

                    </div>

                    <div className="breakdown-item">

                      <div className="breakdown-label">

                        <span>
                          Skills Match
                        </span>

                        <strong>

                          {Number(
                            selectedCandidate.skill_score ||
                              0
                          ).toFixed(0)}
                          %

                        </strong>

                      </div>

                      <div className="breakdown-bar">

                        <div
                          style={{
                            width: `${Math.min(
                              Number(
                                selectedCandidate.skill_score ||
                                  0
                              ),
                              100
                            )}%`,
                          }}
                        />

                      </div>

                    </div>

                    <div className="breakdown-item">

                      <div className="breakdown-label">

                        <span>
                          Experience
                        </span>

                        <strong>

                          {Number(
                            selectedCandidate.experience_score ||
                              0
                          ).toFixed(0)}
                          %

                        </strong>

                      </div>

                      <div className="breakdown-bar">

                        <div
                          style={{
                            width: `${Math.min(
                              Number(
                                selectedCandidate.experience_score ||
                                  0
                              ),
                              100
                            )}%`,
                          }}
                        />

                      </div>

                    </div>

                  </div>

                  {/* RECRUITMENT STATUS */}

                  <div className="profile-section">

                    <h3>
                      Recruitment Status
                    </h3>

                    <div className="status-control">

                      <select
                        className={`recruitment-status-select ${getStatusClass(
                          selectedCandidate.overall_score,
                          selectedCandidate.recruitment_status
                        )}`}
                        value={
                          selectedCandidate.recruitment_status ||
                          getRecruitmentStatus(
                            selectedCandidate.overall_score
                          )
                        }
                        onChange={(e) =>
                          updateRecruitmentStatus(
                            e.target.value
                          )
                        }
                        disabled={
                          statusUpdating
                        }
                      >

                        <option value="Shortlisted">
                          Shortlisted
                        </option>

                        <option value="Under Review">
                          Under Review
                        </option>

                        <option value="Not Recommended">
                          Not Recommended
                        </option>

                      </select>

                      {statusUpdating && (

                        <span className="status-updating">
                          Updating...
                        </span>

                      )}

                    </div>

                    {statusMessage && (

                      <p className="status-success-message">
                        {" "}
                        {
                          statusMessage
                        }
                      </p>

                    )}

                  </div>

                </>

              )}

              <div className="profile-footer">

                <button
                  onClick={() =>
                    setSelectedCandidate(
                      null
                    )
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

        {/* DELETE CONFIRMATION MODAL */}

        {candidateToDelete && (

          <div
            className="delete-overlay"
            onClick={
              cancelDelete
            }
          >

            <div
              className="delete-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="delete-modal-icon">
              </div>

              <h2>
                Delete Candidate?
              </h2>

              <p>
                Are you sure you want to delete{" "}
                <strong>
                  {
                    candidateToDelete.name
                  }
                </strong>
                ?
              </p>

              <span className="delete-warning">
                This action cannot be undone.
              </span>

              <div className="delete-modal-actions">

                <button
                  className="cancel-delete-button"
                  onClick={
                    cancelDelete
                  }
                  disabled={
                    deletingCandidate
                  }
                >
                  Cancel
                </button>

                <button
                  className="confirm-delete-button"
                  onClick={
                    deleteCandidate
                  }
                  disabled={
                    deletingCandidate
                  }
                >
                  {deletingCandidate
                    ? "Deleting..."
                    : "Yes, Delete"}
                </button>

              </div>

            </div>

          </div>

        )}

        {/* RESUME ANALYSIS */}

        <section
          className="analysis-section"
          id="analysis"
        >

          <div className="section-heading">

            <span className="section-kicker">
              AI SCREENING
            </span>

            <h2>
              Resume Analysis
            </h2>

            <p>
              Upload a resume and compare it with the job description.
            </p>

          </div>

          <div className="analysis-grid">

            <div className="dashboard-card analysis-input-card">

              <h3>
                Analyze New Candidate
              </h3>

              <label>
                Upload Resume
              </label>

              <div className="professional-upload">

                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {

                    const selectedFile =
                      e.target.files?.[0] ||
                      null;

                    setFile(
                      selectedFile
                    );

                    setError("");

                  }}
                />

                <div className="upload-icon">
                     
                </div>

                <strong>

                  {file
                    ? file.name
                    : "Upload PDF Resume"}

                </strong>

                <span>
                  Click to browse or drag and drop
                </span>

              </div>

              <label>
                Job Description
              </label>

              <textarea
                rows="7"
                placeholder="Enter the job description here..."
                value={
                  jobDescription
                }
                onChange={(e) => {

                  setJobDescription(
                    e.target.value
                  );

                  setError("");

                }}
              />

              <button
                className="analyze-button"
                onClick={
                  analyzeResume
                }
                disabled={
                  loading
                }
              >

                {loading
                  ? "Analyzing Resume..."
                  : "Analyze Resume"}

              </button>

              {error && (

                <p className="error">
                  {error}
                </p>

              )}

            </div>

            <div className="dashboard-card process-card">

              <h3>
                How AI Screening Works
              </h3>

              <p>
                The system evaluates the candidate using multiple recruitment factors.
              </p>

              <div className="process-list">

                <div className="process-item">

                  <span>
                    01
                  </span>

                  <div>

                    <strong>
                      Resume Parsing
                    </strong>

                    <p>
                      Extracts candidate information and skills from the PDF.
                    </p>

                  </div>

                </div>

                <div className="process-item">

                  <span>
                    02
                  </span>

                  <div>

                    <strong>
                      Skill Matching
                    </strong>

                    <p>
                      Compares candidate skills with job requirements.
                    </p>

                  </div>

                </div>

                <div className="process-item">

                  <span>
                    03
                  </span>

                  <div>

                    <strong>
                      Semantic Matching
                    </strong>

                    <p>
                      Uses AI to understand resume and job description similarity.
                    </p>

                  </div>

                </div>

                <div className="process-item">

                  <span>
                    04
                  </span>

                  <div>

                    <strong>
                      Final Evaluation
                    </strong>

                    <p>
                      Generates an overall score and recruitment recommendation.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ANALYSIS RESULTS */}

        {result && (

          <section className="results-section">

            <div className="section-heading">

              <span className="section-kicker">
                ANALYSIS COMPLETE
              </span>

              <h2>
                Candidate Analysis Result
              </h2>

              <p>
                Resume evaluation based on the provided job description.
              </p>

            </div>

            <div className="result-score-card">

              <div>

                <span className="section-kicker">
                  OVERALL MATCH SCORE
                </span>

                <h2>
                  Candidate Match
                </h2>

                <p>
                  Based on skills, qualification, experience and semantic similarity.
                </p>

              </div>

              <div className="large-score-circle">

                <span>

                  {Number(
                    result.overall_score ||
                      0
                  ).toFixed(2)}

                </span>

                <small>
                  %
                </small>

              </div>

            </div>

            <div className="dashboard-card">

              <div className="card-header simple">

                <div>

                  <h2>
                    Candidate Information
                  </h2>

                  <p>
                    Basic information extracted from the resume.
                  </p>

                </div>

              </div>

              <div className="candidate-info-grid">

                <div>

                  <span>
                    Name
                  </span>

                  <strong>
                    {
                      result.candidate
                        ?.name ||
                      "Not available"
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    Email
                  </span>

                  <strong>
                    {
                      result.candidate
                        ?.email ||
                      "Not available"
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    Phone
                  </span>

                  <strong>
                    {
                      result.candidate
                        ?.phone ||
                      "Not available"
                    }
                  </strong>

                </div>

              </div>

            </div>

            <div className="evaluation-grid">

              {/* SKILLS */}

              <div className="dashboard-card">

                <div className="evaluation-title">

                  <h3>
                    Skills
                  </h3>

                  <span className="evaluation-score">
                    {Number(
                      result.skill_matching
                        ?.score ||
                        0
                    ).toFixed(0)}
                    %
                  </span>

                </div>

                <span className="mini-label">
                  Matched Skills
                </span>

                <div className="skill-list">

                  {getArrayValue(
                    result
                      .skill_matching
                      ?.matched
                  ).length >
                  0 ? (

                    getArrayValue(
                      result
                        .skill_matching
                        ?.matched
                    ).map(
                      (
                        skill,
                        index
                      ) => (

                        <span
                          className="skill-chip matched"
                          key={
                            index
                          }
                        >
                             {" "}
                          {skill}
                        </span>

                      )

                    )

                  ) : (

                    <span className="empty-text">
                      None
                    </span>

                  )}

                </div>

                <span className="mini-label missing-title">
                  Missing Skills
                </span>

                <div className="skill-list">

                  {getArrayValue(
                    result
                      .skill_matching
                      ?.missing
                  ).length >
                  0 ? (

                    getArrayValue(
                      result
                        .skill_matching
                        ?.missing
                    ).map(
                      (
                        skill,
                        index
                      ) => (

                        <span
                          className="skill-chip missing"
                          key={
                            index
                          }
                        >
                          {skill}
                        </span>

                      )

                    )

                  ) : (

                    <span className="empty-text">
                      None
                    </span>

                  )}

                </div>

              </div>

              {/* QUALIFICATION */}

              <div className="dashboard-card">

                <div className="evaluation-title">

                  <h3>
                    Qualification
                  </h3>

                  <span className="success-icon">
                       
                  </span>

                </div>

                <span className="mini-label">
                  Status
                </span>

                <div className="qualification-box">

                  {
                    result
                      .qualification_matching
                      ?.status ||
                    "Not available"
                  }

                </div>

                <p className="evaluation-note">
                  Qualification evaluated against the requirements in the job description.
                </p>

              </div>

              {/* EXPERIENCE */}

              <div className="dashboard-card">

                <div className="evaluation-title">

                  <h3>
                    Experience
                  </h3>

                  <span className="evaluation-score">

                    {Number(
                      result
                        .experience_matching
                        ?.score ||
                        0
                    ).toFixed(0)}
                    %

                  </span>

                </div>

                <span className="mini-label">
                  Status
                </span>

                <div className="qualification-box">

                  {
                    result
                      .experience_matching
                      ?.status ||
                    "Not available"
                  }

                </div>

                <span className="mini-label missing-title">
                  Experience Score
                </span>

                <strong className="experience-number">

                  {Number(
                    result
                      .experience_matching
                      ?.score ||
                      0
                  ).toFixed(0)}
                  %

                </strong>

              </div>

            </div>

            {/* RECOMMENDATION */}

            <div className="dashboard-card recommendation-card">

              <div className="card-header simple">

                <div>

                  <h2>
                    Recruitment Recommendation
                  </h2>

                  <p>
                    AI-generated evaluation of the candidate.
                  </p>

                </div>

              </div>

              <div className="recommendation-banner">

            

                <strong>
                  {
                    result
                      .explanation
                      ?.recommendation ||
                    "Evaluation completed"
                  }
                </strong>

              </div>

              <div className="strength-gap-grid">

                <div className="strength-box">

                  <h3>
                    Strengths
                  </h3>

                  <ul>

                    {getArrayValue(
                      result
                        .explanation
                        ?.strengths
                    ).length >
                    0 ? (

                      getArrayValue(
                        result
                          .explanation
                          ?.strengths
                      ).map(
                        (
                          strength,
                          index
                        ) => (

                          <li
                            key={
                              index
                            }
                          >
                            {
                              strength
                            }
                          </li>

                        )

                      )

                    ) : (

                      <li>
                        Candidate information evaluated successfully.
                      </li>

                    )}

                  </ul>

                </div>

                <div className="gap-box">

                  <h3>
                    Gaps
                  </h3>

                  <ul>

                    {getArrayValue(
                      result
                        .explanation
                        ?.gaps
                    ).length >
                    0 ? (

                      getArrayValue(
                        result
                          .explanation
                          ?.gaps
                      ).map(
                        (
                          gap,
                          index
                        ) => (

                          <li
                            key={
                              index
                            }
                          >
                            {gap}
                          </li>

                        )

                      )

                    ) : (

                      <li>
                        No major gaps reported.
                      </li>

                    )}

                  </ul>

                </div>

              </div>

            </div>

          </section>

        )}

                {/* JOB APPLICATIONS */}

        {userRole === "recruiter" && (
          <section
            className="recruitment-overview"
            style={{ marginTop: "24px" }}
          >
            <div className="section-header">
              <div>
                <h2>Job Applications</h2>
                <p>
                  Review applications submitted by candidates for your jobs.
                </p>
              </div>

              <button
                className="refresh-button"
                onClick={() => window.location.reload()}
                disabled={applicationsLoading}
              >
                {applicationsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {applicationsLoading ? (
              <div className="dashboard-message">
                Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div className="dashboard-message">
                No applications received yet.
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  marginTop: "20px",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                        }}
                      >
                        Application ID
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                        }}
                      >
                        Candidate ID
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                        }}
                      >
                        Job ID
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                        }}
                      >
                        Status
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {applications.map((application) => (
                      <tr key={application.application_id}>
                        <td style={{ padding: "12px" }}>
                          #{application.application_id}
                        </td>

                        <td style={{ padding: "12px" }}>
                          #{application.candidate_id}
                        </td>

                        <td style={{ padding: "12px" }}>
                          #{application.job_id}
                        </td>

                        <td style={{ padding: "12px" }}>
                          <span
                            className="status-badge success"
                          >
                            {application.status}
                          </span>
                        </td>

                        <td style={{ padding: "12px" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              onClick={() =>
                                updateApplicationStatus(
                                  application.application_id,
                                  "shortlisted"
                                )
                              }
                              style={{
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                background: "#e0f2fe",
                                color: "#0369a1",
                              }}
                            >
                              Shortlist
                            </button>

                            <button
                              onClick={() =>
                                updateApplicationStatus(
                                  application.application_id,
                                  "rejected"
                                )
                              }
                              style={{
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                background: "#fee2e2",
                                color: "#b91c1c",
                              }}
                            >
                              Reject
                            </button>

                            <button
                              onClick={() =>
                                updateApplicationStatus(
                                  application.application_id,
                                  "selected"
                                )
                              }
                              style={{
                                padding: "8px 12px",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                background: "#dcfce7",
                                color: "#15803d",
                              }}
                            >
                              Select
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </main>

    </div>
  );
}

export default App;
