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
  // =========================================================
  // RECRUITER LOGIN
  // =========================================================

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("recruiterLoggedIn") === "true";
  });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // =========================================================
  // CURRENT VIEW
  // =========================================================

  const [currentView, setCurrentView] = useState("dashboard");

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

  const handleLogin = (e) => {
    e.preventDefault();

    setLoginError("");

    const email = loginEmail.trim();

    if (!email || !loginPassword) {
      setLoginError("Please enter email and password.");
      return;
    }

    const validEmail = "recruiter@recruitai.com";
    const validPassword = "RecruitAI@123";

    if (email === validEmail && loginPassword === validPassword) {
      localStorage.setItem("recruiterLoggedIn", "true");

      setIsLoggedIn(true);
      setLoginEmail("");
      setLoginPassword("");
      setLoginError("");
    } else {
      setLoginError("Invalid email or password.");
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("recruiterLoggedIn");

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
      // Load AI interview scorecard
if (candidate.id === 1) {
  try {
    const scorecardResponse = await fetch(
      "http://127.0.0.1:8000/interviews/2/scorecard"
    );

    if (scorecardResponse.ok) {
      const scorecardData = await scorecardResponse.json();
      setInterviewScorecard(scorecardData);
    } else {
      setInterviewScorecard(null);
    }
  } catch (scorecardError) {
    console.error(
      "Interview scorecard error:",
      scorecardError
    );
    setInterviewScorecard(null);
  }
} else {
  setInterviewScorecard(null);
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
        icon: "⭐",
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
        icon: "⚡",
      };
    }

    return {
      title: "Low Match",
      message:
        "This candidate has a relatively low match with the current job requirements.",
      className:
        "recommendation-low",
      icon: "⚠",
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
              Recruiter Login
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Sign in to access
              your recruitment
              dashboard.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
          >
            <div
              style={{
                marginBottom:
                  "20px",
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
                Email Address
              </label>

              <input
                type="email"
                placeholder="Enter recruiter email"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(
                    e.target.value
                  );
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
                    loginPassword
                  }
                  onChange={(e) => {
                    setLoginPassword(
                      e.target.value
                    );
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
                ⚠ {loginError}
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
              Login to Dashboard
            </button>
          </form>

          <div
            style={{
              marginTop:
                "24px",
              padding: "14px",
              borderRadius:
                "10px",
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0",
            }}
          >
            <p
              style={{
                margin:
                  "0 0 8px",
                fontSize: "12px",
                fontWeight: "700",
                color: "#475569",
              }}
            >
              Demo Recruiter
              Credentials
            </p>

            <p
              style={{
                margin: "4px 0",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Email:
              recruiter@recruitai.com
            </p>

            <p
              style={{
                margin: "4px 0",
                fontSize: "12px",
                color: "#64748b",
              }}
            >
              Password:
              RecruitAI@123
            </p>
          </div>
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
            ← Back to Dashboard
          </button>

          <strong
            style={{
              fontSize: "18px",
              color: "#111827",
            }}
          >
            RecruitAI — AI Interview
          </strong>
        </div>

        <Interview />
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
            className="nav-item active"
            onClick={() =>
              setCurrentView("dashboard")
            }
          >
            <span>▦</span>
            Dashboard
          </a>

          <a
            href="#candidates"
            className="nav-item"
            onClick={() =>
              setCurrentView("dashboard")
            }
          >
            <span>♙</span>
            Candidates
          </a>

          <a
            href="#analysis"
            className="nav-item"
            onClick={() =>
              setCurrentView("dashboard")
            }
          >
            <span>▤</span>
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
            <span>🎤</span>
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
            🚪 Logout
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
              : "↻ Refresh"}
          </button>

        </div>

        {/* DELETE SUCCESS */}

        {deleteMessage && (
          <div className="delete-success-message">
            ✓ {deleteMessage}
          </div>
        )}

        {error && (
          <div className="error">
            ⚠ {error}
          </div>
        )}

        {/* STATISTICS */}

        <div className="stats-grid">

          <div className="stat-card">

            <div className="stat-top">

              <span className="stat-icon blue">
                👥
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
                ↑
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
                ★
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
                ✓
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
                ×
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
                  ⌕
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
                👥
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
                                  ? "🥇 #1"
                                  : actualRank ===
                                    1
                                  ? "🥈 #2"
                                  : actualRank ===
                                    2
                                  ? "🥉 #3"
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
                                🗑️ Delete
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
                    ← Previous
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
                    Next →
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
                    📄 View Resume
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
                    🗑️ Delete
                  </button>

                  <button
                    className="close-profile"
                    onClick={() =>
                      setSelectedCandidate(
                        null
                      )
                    }
                  >
                    ×
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
                        📧 Email
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
                        📱 Phone
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
                        🛠 Skills Score
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
                        🎓 Qualification
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
                        💼 Experience
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
                        🧠 Semantic Match
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
                      🛠 Skills
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
                              ✓{" "}
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
                      🎓 Education
                    </h3>

                    {displayArray(
                      selectedCandidate.education
                    )}

                  </div>

                  {/* EXPERIENCE */}

                  <div className="profile-section">

                    <h3>
                      💼 Experience
                    </h3>

                    {displayArray(
                      selectedCandidate.experience
                    )}

                  </div>
                                    {/* AI INTERVIEW SCORECARD */}

                  {interviewScorecard && (
                    <div className="profile-section">

                      <h3>🎥 AI Interview Scorecard</h3>

                      <div className="candidate-info-grid">

                        <div>
                          <span>Overall Interview Score</span>
                          <strong>
                            {interviewScorecard.overall_score}/10
                          </strong>
                        </div>

                        <div>
                          <span>Questions Evaluated</span>
                          <strong>
                            {interviewScorecard.evaluated_questions || 0}
                          </strong>
                        </div>

                        <div>
                          <span>Total Questions</span>
                          <strong>
                            {interviewScorecard.total_questions || 0}
                          </strong>
                        </div>

                      </div>

                      <div style={{ marginTop: "20px" }}>

                        {interviewScorecard.answers?.map(
                          (answer, index) => (
                            <div
                              key={answer.answer_id || index}
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
                                  {answer.score}/10
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
                      ⭐ Extracurricular Activities
                    </h3>

                    {displayArray(
                      selectedCandidate.extracurricular
                    )}

                  </div>

                  {/* AI RECOMMENDATION */}

                  <div className="profile-section">

                    <h3>
                      🤖 AI Recommendation
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
                          🧠 Semantic Match
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
                          🛠 Skills Match
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
                          💼 Experience
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
                        ✓{" "}
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
                🗑️
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
                  ↑
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
                          ✓{" "}
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
                    ✓
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

                <span>
                  ⭐
                </span>

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
                    ✓ Strengths
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
                    ⚠ Gaps
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

      </main>

    </div>
  );
}

export default App;