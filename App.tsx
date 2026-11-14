import React, { useEffect, useState, useRef } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "./App.css";

const API = "http://localhost:5000/api";

export type Claim = {
  id: string;
  name: string;
  vehicle: string;
  policyNumber?: string;
  description: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "UNDER_INVESTIGATION" | string;
  createdAt?: string;
  reviewedAt?: string;
  riskFlags?: string[];
  officerNotes?: string;
};

export type ScanReport = {
  damageSummary: string;
  affectedAreas: string[];
  severity: "LOW" | "MEDIUM" | "HIGH";
  severityScore: number;
  drivable: boolean;
  estimatedRepairCostRange: string;
  detectedIssues: string[];
  structuralHazard?: boolean;
  recommendedAction: string;
};

export type ChatMessage = {
  id: string;
  sender: "user" | "nova";
  text: string;
  timestamp: string;
  isError?: boolean;
};

// FUTURISTIC ROBOT COMPONENT
function Robot({ isThinking = false }: { isThinking?: boolean }) {
  return (
    <div className={`robot ${isThinking ? "robot-thinking" : ""}`}>
      <div className="robot-antenna">
        <div className="antenna-tip"></div>
      </div>
      <div className="robot-head">
        <div className="robot-ear left"></div>
        <div className="robot-faceplate">
          <div className="robot-eyes-row">
            <div className="robot-eye left"></div>
            <div className="robot-eye right"></div>
          </div>
          <div className="robot-mouth"></div>
        </div>
        <div className="robot-ear right"></div>
      </div>
      <div className="robot-neck"></div>
      <div className="robot-body">
        <div className="robot-chest-plate">
          <div className="robot-core">
            <span>NOVA</span>
          </div>
          <div className="robot-status-lights">
            <span className="light blue"></span>
            <span className="light purple"></span>
            <span className="light cyan"></span>
          </div>
        </div>
      </div>
      <div className="robot-arm left"></div>
      <div className="robot-arm right"></div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<
    | "Overview"
    | "New FNOL Claim"
    | "Claim Tracking"
    | "Vehicle Scanner"
    | "Risk Intelligence"
    | "Officer Console"
    | "NOVA Assistant"
  >("Overview");

  const [claims, setClaims] = useState<Claim[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<{
    configured: boolean;
    provider: string | null;
    message: string;
  }>({
    configured: false,
    provider: null,
    message: "Checking AI engine...",
  });

  // Claim Form State
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Claim Tracking Search
  const [searchId, setSearchId] = useState("");
  const [searchedClaim, setSearchedClaim] = useState<Claim | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Officer Console filter
  const [officerFilter, setOfficerFilter] = useState<string>("ALL");

  // Vehicle Scanner State
  const [scannerImage, setScannerImage] = useState<string | null>(null);
  const [scannerFile, setScannerFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanProvider, setScanProvider] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NOVA Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "nova",
      text: "Greetings! I am NOVA, your First Notice of Loss intelligence copilot. I can guide you through incident reporting, explain coverage questions, assess risk parameters, or query active claims. How may I assist your triage today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load claims and AI status on mount
  async function loadClaims() {
    try {
      const response = await fetch(`${API}/claims`);
      if (!response.ok) throw new Error("Could not fetch claims");
      const data: Claim[] = await response.json();
      setClaims(data);
      setIsConnected(true);
    } catch (err) {
      console.error("Backend connection error:", err);
      setIsConnected(false);
    }
  }

  async function checkAiStatus() {
    try {
      const response = await fetch(`${API}/ai/status`);
      if (response.ok) {
        const data = await response.json();
        setAiStatus(data);
      }
    } catch (err) {
      console.warn("AI status check warning:", err);
    }
  }

  useEffect(() => {
    loadClaims();
    checkAiStatus();
    const interval = setInterval(loadClaims, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Submit Claim Handler
  async function submitClaim(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setReferenceNumber("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          vehicle: vehicle.trim() || undefined,
          policyNumber: policyNumber.trim() || undefined,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Claim submission failed");
      }

      setClaims((prev) => [...prev, data.claim]);
      setReferenceNumber(data.claim.id);
      setMessage("Claim registered successfully into the automated triage queue!");
      setName("");
      setVehicle("");
      setPolicyNumber("");
      setDescription("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong during submission");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Update Status Handler
  async function updateStatus(id: string, status: string) {
    try {
      const response = await fetch(`${API}/claims/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Status update failed");
      }

      await loadClaims();
      setMessage(`Claim #${id} status updated to ${status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update status");
    }
  }

  // Search Claim Handler
  function searchClaim() {
    setHasSearched(true);
    const target = searchId.trim().toLowerCase();
    if (!target) {
      setSearchedClaim(null);
      return;
    }
    const found = claims.find(
      (claim) =>
        claim.id.toLowerCase() === target ||
        (claim.policyNumber && claim.policyNumber.toLowerCase() === target) ||
        claim.name.toLowerCase().includes(target)
    );
    setSearchedClaim(found || null);
  }

  // Image Selection Handler for Vehicle Scanner
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setScanReport(null);
    setScanError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setScannerFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setScannerImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // Run Real Vision AI Scan
  async function runVehicleScan() {
    if (!scannerImage) {
      setScanError("Please select or upload a vehicle accident image first.");
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScanReport(null);

    try {
      let response: Response;

      if (scannerFile) {
        const formData = new FormData();
        formData.append("image", scannerFile);
        response = await fetch(`${API}/scan-vehicle`, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(`${API}/scan-vehicle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: scannerImage }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Vision analysis failed on server.");
      }

      setScanReport(data.report);
      setScanProvider(data.provider || "AI Vision Core");
    } catch (err) {
      setScanError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while communicating with the Vision AI endpoint."
      );
    } finally {
      setIsScanning(false);
    }
  }

  // Transfer scan results to New Claim Form
  function transferScanToClaim() {
    if (!scanReport) return;
    const areas = scanReport.affectedAreas?.join(", ") || "Body panel damage";
    const issues = scanReport.detectedIssues?.join(". ") || "";
    setDescription(
      `[AI Damage Scan Findings]\nSummary: ${scanReport.damageSummary}\nAffected Areas: ${areas}\nSeverity: ${scanReport.severity} (${scanReport.severityScore}/100)\nEstimated Cost: ${scanReport.estimatedRepairCostRange}\nIssues Identified: ${issues}\nRecommended Action: ${scanReport.recommendedAction}`
    );
    setPage("New FNOL Claim");
  }

  // Send Message to NOVA Chat
  async function sendChatMessage(presetText?: string) {
    const textToSend = presetText || chatInput.trim();
    if (!textToSend || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: chatMessages.slice(-8), // Send recent context
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "NOVA chat service encountered an error.");
      }

      const novaMsg: ChatMessage = {
        id: `nova-${Date.now()}`,
        sender: "nova",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, novaMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "nova",
        text:
          err instanceof Error
            ? `⚠️ System Notice: ${err.message}`
            : "⚠️ Unable to establish communication with NOVA core intelligence.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  }

  // Risk statistics calculations
  const highRisk = claims.filter((c) => c.risk === "HIGH").length;
  const mediumRisk = claims.filter((c) => c.risk === "MEDIUM").length;
  const lowRisk = claims.filter((c) => c.risk === "LOW").length;

  const riskPieData = [
    { name: "High Risk", value: highRisk, color: "#ff3366" },
    { name: "Medium Risk", value: mediumRisk, color: "#ffb703" },
    { name: "Low Risk", value: lowRisk, color: "#00f5ff" },
  ].filter((item) => item.value > 0);

  // Status breakdown for Bar Chart
  const statusCounts = {
    PENDING_REVIEW: claims.filter((c) => c.status === "PENDING_REVIEW" || !c.status).length,
    APPROVED: claims.filter((c) => c.status === "APPROVED").length,
    UNDER_INVESTIGATION: claims.filter((c) => c.status === "UNDER_INVESTIGATION").length,
    REJECTED: claims.filter((c) => c.status === "REJECTED").length,
  };

  const statusChartData = [
    { name: "Pending", count: statusCounts.PENDING_REVIEW, fill: "#00d4ff" },
    { name: "Approved", count: statusCounts.APPROVED, fill: "#10b981" },
    { name: "Investigate", count: statusCounts.UNDER_INVESTIGATION, fill: "#a855f7" },
    { name: "Rejected", count: statusCounts.REJECTED, fill: "#f43f5e" },
  ];

  // Filtered claims for Officer Console
  const filteredClaims = claims.filter((c) => {
    if (officerFilter === "ALL") return true;
    return c.status === officerFilter;
  });

  return (
    <div className="app">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="logo" onClick={() => setPage("Overview")}>
          <div className="logo-icon">✦</div>
          <div className="logo-text">
            <span>FNOL</span>
            <small>AI COMMAND CENTER</small>
          </div>
        </div>

        <div className="nav-title">INTELLIGENCE SUITE</div>

        {[
          { label: "Overview", icon: "📊" },
          { label: "New FNOL Claim", icon: "📝" },
          { label: "Claim Tracking", icon: "🔎" },
          { label: "Vehicle Scanner", icon: "🚗" },
          { label: "Risk Intelligence", icon: "⚡" },
          { label: "Officer Console", icon: "🛡️" },
          { label: "NOVA Assistant", icon: "🤖" },
        ].map((item) => (
          <button
            key={item.label}
            className={`nav-item ${page === item.label ? "active" : ""}`}
            onClick={() => {
              setPage(
                item.label as
                  | "Overview"
                  | "New FNOL Claim"
                  | "Claim Tracking"
                  | "Vehicle Scanner"
                  | "Risk Intelligence"
                  | "Officer Console"
                  | "NOVA Assistant"
              );
              setMessage("");
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.label === "Officer Console" && claims.length > 0 && (
              <span className="nav-badge">{claims.length}</span>
            )}
          </button>
        ))}

        {/* CONNECTION & AI STATUS WIDGET */}
        <div className="system-health-card">
          <div className="health-row">
            <span className={`status-dot ${isConnected ? "online" : "offline"}`}></span>
            <span className="health-label">API SERVER</span>
            <span className="health-val">{isConnected ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <div className="health-row">
            <span className={`status-dot ${aiStatus.configured ? "online" : "warning"}`}></span>
            <span className="health-label">AI ENGINE</span>
            <span className="health-val">
              {aiStatus.configured ? aiStatus.provider?.toUpperCase() : "NO KEY"}
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main">
        {/* HEADER TOP BAR */}
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              <span className="eyebrow">FIRST NOTICE OF LOSS PLATFORM</span>
              <span className="divider">/</span>
              <span className="current-crumb">{page}</span>
            </div>
            <h2>FNOL Claims Triage Intelligence</h2>
          </div>
          <div className="top-status-pills">
            <div className={`status-pill ${isConnected ? "pill-active" : "pill-inactive"}`}>
              <span className="dot"></span>
              <span>{isConnected ? "BACKEND CONNECTED" : "RECONNECTING..."}</span>
            </div>
            <div
              className={`status-pill ${aiStatus.configured ? "pill-ai-active" : "pill-ai-warning"}`}
              title={aiStatus.message}
            >
              <span className="dot"></span>
              <span>
                {aiStatus.configured
                  ? `AI CORE (${aiStatus.provider?.toUpperCase()})`
                  : "AI ENGINE UNCONFIGURED"}
              </span>
            </div>
          </div>
        </header>

        {/* NOTIFICATION BANNER */}
        {message && (
          <div className="notice slide-down">
            <div className="notice-icon">✓</div>
            <div className="notice-content">
              <span>{message}</span>
              {referenceNumber && (
                <div className="reference-tag">
                  Official Reference ID: <strong>#{referenceNumber}</strong>
                </div>
              )}
            </div>
            <button className="notice-close" onClick={() => setMessage("")}>
              ✕
            </button>
          </div>
        )}

        {/* ================= PAGE: OVERVIEW ================= */}
        {page === "Overview" && (
          <section className="page-section">
            <div className="hero">
              <div className="hero-content">
                <span className="hero-tag">NEXT-GEN ACCIDENT TRIAGE</span>
                <h1>
                  Autonomous Claims Intake. <br />
                  <span className="gradient-text">Instant Decision Support.</span>
                </h1>
                <p>
                  Accelerate insurance resolution with deep computer vision vehicle damage inspection,
                  automated risk categorization, and live conversational claims triage.
                </p>
                <div className="hero-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => setPage("New FNOL Claim")}
                  >
                    <span>+</span> INITIATE NEW FNOL CLAIM
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setPage("Vehicle Scanner")}
                  >
                    <span>📷</span> SCAN VEHICLE DAMAGE
                  </button>
                  <button
                    className="btn btn-tertiary"
                    onClick={() => setPage("NOVA Assistant")}
                  >
                    <span>🤖</span> TALK WITH NOVA
                  </button>
                </div>
              </div>
              <div className="hero-robot-wrapper">
                <Robot />
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="stats-grid">
              <div className="stat-card total-card">
                <div className="stat-icon">📁</div>
                <div className="stat-info">
                  <span className="stat-title">TOTAL CLAIMS</span>
                  <div className="stat-number">{claims.length}</div>
                  <div className="stat-caption">Recorded in system database</div>
                </div>
              </div>

              <div className="stat-card high-card">
                <div className="stat-icon">⚠️</div>
                <div className="stat-info">
                  <span className="stat-title">HIGH RISK</span>
                  <div className="stat-number danger-text">{highRisk}</div>
                  <div className="stat-caption">Requires immediate manual review</div>
                </div>
              </div>

              <div className="stat-card medium-card">
                <div className="stat-icon">⚖️</div>
                <div className="stat-info">
                  <span className="stat-title">MEDIUM RISK</span>
                  <div className="stat-number warning-text">{mediumRisk}</div>
                  <div className="stat-caption">Standard verification pipeline</div>
                </div>
              </div>

              <div className="stat-card low-card">
                <div className="stat-icon">🛡️</div>
                <div className="stat-info">
                  <span className="stat-title">LOW RISK</span>
                  <div className="stat-number success-text">{lowRisk}</div>
                  <div className="stat-caption">Eligible for fast-track approval</div>
                </div>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="charts-row">
              <div className="panel chart-panel">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">CLAIMS STATUS DISPOSITION</span>
                    <h3>Processing Pipeline</h3>
                  </div>
                  <button
                    className="btn-refresh"
                    onClick={loadClaims}
                    title="Refresh Data"
                  >
                    🔄
                  </button>
                </div>

                {claims.length === 0 ? (
                  <div className="empty-chart-state">
                    <div className="empty-icon">📭</div>
                    <h4>No claims registered yet</h4>
                    <p>Submit an initial FNOL claim to populate the real-time activity metrics.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setPage("New FNOL Claim")}
                    >
                      Create First Claim
                    </button>
                  </div>
                ) : (
                  <div className="chart-container" style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                        <XAxis dataKey="name" stroke="#8ca3c7" tick={{ fill: "#8ca3c7", fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke="#8ca3c7" tick={{ fill: "#8ca3c7", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(10, 18, 45, 0.95)",
                            borderColor: "rgba(0, 229, 255, 0.3)",
                            borderRadius: "10px",
                            boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="panel chart-panel">
                <div className="panel-header">
                  <div>
                    <span className="eyebrow">EXPLAINABLE RISK METRICS</span>
                    <h3>Risk Distribution</h3>
                  </div>
                </div>

                {claims.length === 0 ? (
                  <div className="empty-chart-state">
                    <div className="empty-icon">⚡</div>
                    <h4>No risk evaluations</h4>
                    <p>Triage heuristics will automatically populate when claims are submitted.</p>
                  </div>
                ) : (
                  <div className="chart-container" style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {riskPieData.map((entry, index) => (
                            <Cell key={`pie-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(10, 18, 45, 0.95)",
                            borderColor: "rgba(0, 229, 255, 0.3)",
                            borderRadius: "10px",
                            color: "#fff",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ color: "#a5b9d8", fontSize: "12px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* RECENT INTAKE PREVIEW */}
            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">LIVE CLAIMS STREAM</span>
                  <h3>Recent First Notices of Loss</h3>
                </div>
                <button className="btn btn-outline" onClick={() => setPage("Officer Console")}>
                  VIEW ALL IN CONSOLE →
                </button>
              </div>

              {claims.length === 0 ? (
                <div className="empty-card-prompt">
                  <p>No claims currently filed. File your First Notice of Loss to begin triage.</p>
                </div>
              ) : (
                <div className="claims-grid">
                  {claims.slice(-3).reverse().map((claim) => (
                    <div className="claim-card-modern" key={claim.id}>
                      <div className="claim-card-header">
                        <span className="claim-id-badge">#{claim.id}</span>
                        <span className={`risk-tag risk-${claim.risk.toLowerCase()}`}>
                          {claim.risk} RISK
                        </span>
                      </div>
                      <h4>{claim.name}</h4>
                      <div className="claim-detail-row">
                        <span>Vehicle:</span>
                        <strong>{claim.vehicle}</strong>
                      </div>
                      <div className="claim-detail-row">
                        <span>Status:</span>
                        <span className={`status-badge status-${claim.status.toLowerCase()}`}>
                          {claim.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="claim-desc-preview">{claim.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= PAGE: NEW FNOL CLAIM ================= */}
        {page === "New FNOL Claim" && (
          <section className="page-section">
            <div className="panel form-panel">
              <div className="form-header">
                <span className="eyebrow">DIGITAL INTAKE WORKFLOW</span>
                <h1>Submit First Notice of Loss (FNOL)</h1>
                <p>
                  Please submit accurate policyholder information and a detailed narrative of the accident.
                  Our triage system will evaluate risk indicators, vehicle impact, and initiate officer workflow.
                </p>
              </div>

              <form onSubmit={submitClaim} className="vertical-form">
                <div className="form-group">
                  <label htmlFor="fnol-name">
                    Policyholder Full Name <span className="required">*</span>
                  </label>
                  <input
                    id="fnol-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    required
                  />
                  <small className="field-hint">Enter the insured primary policyholder's legal name.</small>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="fnol-vehicle">Vehicle Details (Make / Model / Year)</label>
                    <input
                      id="fnol-vehicle"
                      type="text"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      placeholder="e.g. 2023 Tesla Model 3 or Honda Civic"
                    />
                    <small className="field-hint">Specify vehicle make, model and manufacturing year.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fnol-policy">Insurance Policy Number</label>
                    <input
                      id="fnol-policy"
                      type="text"
                      value={policyNumber}
                      onChange={(e) => setPolicyNumber(e.target.value)}
                      placeholder="e.g. POL-89341270"
                    />
                    <small className="field-hint">Optional: auto-generated if left blank.</small>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="fnol-desc">
                    Accident Narrative & Circumstances <span className="required">*</span>
                  </label>
                  <textarea
                    id="fnol-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a chronological description: location, weather conditions, collision details, other parties involved, bodily injuries if any, airbag deployment, and visible vehicle damage..."
                    required
                    rows={5}
                  />
                  <div className="textarea-footer">
                    <small className="field-hint">
                      Include keywords like airbag, multiple vehicles, hospital, or hit-and-run for automated risk scoring.
                    </small>
                    <button
                      type="button"
                      className="btn-text-action"
                      onClick={() => setPage("Vehicle Scanner")}
                    >
                      📷 Attach findings from Vehicle Scanner
                    </button>
                  </div>
                </div>

                <div className="form-actions-bar">
                  <button
                    type="submit"
                    className="btn btn-primary btn-large"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="btn-loading-content">
                        <span className="spinner"></span> SUBMITTING FNOL CLAIM...
                      </span>
                    ) : (
                      "🚀 SUBMIT & INITIATE AI TRIAGE"
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setName("");
                      setVehicle("");
                      setPolicyNumber("");
                      setDescription("");
                    }}
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* ================= PAGE: CLAIM TRACKING ================= */}
        {page === "Claim Tracking" && (
          <section className="page-section">
            <div className="panel">
              <span className="eyebrow">VERIFIED STATUS LOOKUP</span>
              <h1>Claim Tracking Monitor</h1>
              <p>Query live claims by their unique 6-digit reference number, policy number, or policyholder name.</p>

              <div className="search-box-wrapper">
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchClaim()}
                  placeholder="Enter Reference Number (e.g. 641283) or Policyholder name..."
                  className="search-input-field"
                />
                <button className="btn btn-primary" onClick={searchClaim}>
                  🔍 SEARCH CLAIM
                </button>
              </div>

              {hasSearched && (
                <div className="search-results-area">
                  {searchedClaim ? (
                    <div className="claim-card-modern searched-highlight">
                      <div className="claim-card-header">
                        <div>
                          <span className="claim-id-badge large">Claim #{searchedClaim.id}</span>
                          <span className="policy-badge">
                            Policy: {searchedClaim.policyNumber || "Not recorded"}
                          </span>
                        </div>
                        <div className="badges-group">
                          <span className={`risk-tag risk-${searchedClaim.risk.toLowerCase()}`}>
                            {searchedClaim.risk} RISK
                          </span>
                          <span className={`status-badge status-${searchedClaim.status.toLowerCase()}`}>
                            {searchedClaim.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="claim-metadata-grid">
                        <div>
                          <label>Policyholder</label>
                          <p>{searchedClaim.name}</p>
                        </div>
                        <div>
                          <label>Vehicle</label>
                          <p>{searchedClaim.vehicle}</p>
                        </div>
                        <div>
                          <label>Intake Date</label>
                          <p>
                            {searchedClaim.createdAt
                              ? new Date(searchedClaim.createdAt).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <label>Last Officer Review</label>
                          <p>
                            {searchedClaim.reviewedAt
                              ? new Date(searchedClaim.reviewedAt).toLocaleString()
                              : "Pending initial assessment"}
                          </p>
                        </div>
                      </div>

                      <div className="claim-narrative-box">
                        <label>Incident Description</label>
                        <p>{searchedClaim.description}</p>
                      </div>

                      {searchedClaim.riskFlags && searchedClaim.riskFlags.length > 0 && (
                        <div className="risk-flags-box">
                          <label>Triggered Risk Flags</label>
                          <ul>
                            {searchedClaim.riskFlags.map((flag, idx) => (
                              <li key={idx}>⚠️ {flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-search-state">
                      <div className="empty-icon">❌</div>
                      <h4>No matching claim found</h4>
                      <p>
                        No claim records matched query "<strong>{searchId}</strong>". Please verify the 6-digit reference ID.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="recent-claims-list-section">
                <div className="panel-header">
                  <h3>All Registered Claims ({claims.length})</h3>
                  <button className="btn-refresh" onClick={loadClaims}>
                    🔄 Refresh
                  </button>
                </div>

                {claims.length === 0 ? (
                  <p className="no-claims-text">No claims logged in the database yet.</p>
                ) : (
                  <div className="claims-table-wrapper">
                    <table className="claims-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Policyholder</th>
                          <th>Vehicle</th>
                          <th>Risk</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claims.map((claim) => (
                          <tr key={claim.id}>
                            <td>
                              <span className="table-id">#{claim.id}</span>
                            </td>
                            <td>{claim.name}</td>
                            <td>{claim.vehicle}</td>
                            <td>
                              <span className={`risk-tag risk-${claim.risk.toLowerCase()}`}>
                                {claim.risk}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge status-${claim.status.toLowerCase()}`}>
                                {claim.status.replace("_", " ")}
                              </span>
                            </td>
                            <td>
                              {claim.createdAt
                                ? new Date(claim.createdAt).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td>
                              <button
                                className="btn-table-view"
                                onClick={() => {
                                  setSearchId(claim.id);
                                  setSearchedClaim(claim);
                                  setHasSearched(true);
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE: VEHICLE SCANNER (VISION AI) ================= */}
        {page === "Vehicle Scanner" && (
          <section className="page-section">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">COMPUTER VISION DAMAGE RECOGNITION</span>
                  <h1>AI Vehicle Damage Scanner</h1>
                  <p>
                    Upload accident photographs to generate a detailed computer vision inspection report,
                    including affected body panels, severity scoring, and estimated repair scopes.
                  </p>
                </div>
                {scanProvider && (
                  <div className="provider-badge">
                    <span>Model Engine:</span> {scanProvider}
                  </div>
                )}
              </div>

              {/* UNCONFIGURED NOTICE IF APPLICABLE */}
              {!aiStatus.configured && (
                <div className="warning-banner">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-text">
                    <strong>AI Model Key Not Configured</strong>
                    <p>
                      To enable live Computer Vision analysis with Google Gemini or OpenAI, add your API key to{" "}
                      <code>backend/.env</code> (e.g. <code>GEMINI_API_KEY=your_key</code> or <code>OPENAI_API_KEY=your_key</code>) and restart the backend.
                    </p>
                  </div>
                </div>
              )}

              {/* SCANNER WORKSPACE */}
              <div className="scanner-workspace">
                {/* UPLOAD & PREVIEW AREA */}
                <div className="scanner-upload-card">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                  />

                  {scannerImage ? (
                    <div className="image-preview-wrapper">
                      <div className="image-container">
                        <img src={scannerImage} alt="Vehicle Accident Preview" className="preview-img" />
                        {isScanning && (
                          <div className="scanning-overlay">
                            <div className="laser-beam"></div>
                            <div className="scanner-grid"></div>
                            <div className="scanner-tag">AI VISION ANALYZING COMPONENT GEOMETRY...</div>
                          </div>
                        )}
                      </div>
                      <div className="image-controls">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isScanning}
                        >
                          Change Photo
                        </button>
                        <button
                          className="btn btn-secondary btn-small danger-hover"
                          onClick={() => {
                            setScannerImage(null);
                            setScannerFile(null);
                            setScanReport(null);
                            setScanError(null);
                          }}
                          disabled={isScanning}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="dropzone-area"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          const file = e.dataTransfer.files[0];
                          setScannerFile(file);
                          const reader = new FileReader();
                          reader.onload = (ev) => setScannerImage(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    >
                      <div className="dropzone-icon">📷</div>
                      <h3>Upload Vehicle Accident Image</h3>
                      <p>Drag and drop a photo here, or click to browse files (JPG, PNG, WebP)</p>
                      <button type="button" className="btn btn-secondary btn-small">
                        Browse Files
                      </button>
                    </div>
                  )}

                  <div className="scan-button-bar">
                    <button
                      className="btn btn-primary btn-large scan-btn"
                      onClick={runVehicleScan}
                      disabled={!scannerImage || isScanning}
                    >
                      {isScanning ? (
                        <span className="btn-loading-content">
                          <span className="spinner"></span> ANALYZING VEHICLE PHOTOGRAPH...
                        </span>
                      ) : (
                        "⚡ SCAN VEHICLE WITH AI"
                      )}
                    </button>
                  </div>
                </div>

                {/* RESULTS OR ERROR DISPLAY */}
                <div className="scanner-results-card">
                  {scanError && (
                    <div className="error-card">
                      <div className="error-icon">⚠️</div>
                      <h4>Scan Error</h4>
                      <p>{scanError}</p>
                      {!aiStatus.configured && (
                        <div className="key-guide">
                          <h5>Setup Instructions:</h5>
                          <ol>
                            <li>Open <code>backend/.env</code> in your editor.</li>
                            <li>Add <code>GEMINI_API_KEY=your_gemini_api_key</code> (get one at aistudio.google.com).</li>
                            <li>Save the file and run <code>npm start</code> in the backend terminal.</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {!scanReport && !scanError && !isScanning && (
                    <div className="scanner-placeholder">
                      <div className="placeholder-icon">🔍</div>
                      <h4>No Scan Report Generated</h4>
                      <p>
                        Upload a photo of the accident vehicle and click "Scan Vehicle with AI" to view damage classifications, affected panels, and repair estimates.
                      </p>
                    </div>
                  )}

                  {isScanning && (
                    <div className="scanner-placeholder scanning-active-state">
                      <div className="pulsing-radar"></div>
                      <h4>Vision Model Active</h4>
                      <p>Performing deep convolutional feature extraction on body panels, crumple zones, and paint abrasions...</p>
                    </div>
                  )}

                  {scanReport && (
                    <div className="inspection-report-card">
                      <div className="report-header">
                        <div>
                          <span className="eyebrow">AUTOMATED INSPECTION DOSSIER</span>
                          <h3>Damage Assessment Report</h3>
                        </div>
                        <div className="report-severity-badge">
                          <span className={`risk-tag risk-${scanReport.severity.toLowerCase()}`}>
                            {scanReport.severity} SEVERITY ({scanReport.severityScore}/100)
                          </span>
                        </div>
                      </div>

                      <div className="report-summary-box">
                        <label>Technical Damage Summary</label>
                        <p>{scanReport.damageSummary}</p>
                      </div>

                      <div className="report-metrics-grid">
                        <div className="metric-box">
                          <label>Estimated Repair Cost</label>
                          <div className="metric-val">{scanReport.estimatedRepairCostRange}</div>
                        </div>
                        <div className="metric-box">
                          <label>Drivable Status</label>
                          <div className={`metric-val ${scanReport.drivable ? "success-text" : "danger-text"}`}>
                            {scanReport.drivable ? "✓ Yes (Safe to operate)" : "✕ No (Requires towing)"}
                          </div>
                        </div>
                        <div className="metric-box">
                          <label>Structural Hazard</label>
                          <div className={`metric-val ${scanReport.structuralHazard ? "danger-text" : "success-text"}`}>
                            {scanReport.structuralHazard ? "⚠️ Critical Impact" : "✓ Non-structural"}
                          </div>
                        </div>
                      </div>

                      {scanReport.affectedAreas && scanReport.affectedAreas.length > 0 && (
                        <div className="affected-areas-section">
                          <label>Identified Affected Areas & Panels</label>
                          <div className="tags-flex">
                            {scanReport.affectedAreas.map((area, idx) => (
                              <span className="tag-pill" key={idx}>
                                🔧 {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {scanReport.detectedIssues && scanReport.detectedIssues.length > 0 && (
                        <div className="detected-issues-section">
                          <label>Component-Level Observations</label>
                          <ul className="issues-checklist">
                            {scanReport.detectedIssues.map((issue, idx) => (
                              <li key={idx}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="recommended-action-box">
                        <label>Recommended Claim Triage Action</label>
                        <p>{scanReport.recommendedAction}</p>
                      </div>

                      <div className="disclaimer-banner">
                        <span className="disclaimer-icon">ℹ️</span>
                        <span>
                          <strong>Disclaimer:</strong> This visual inspection is an AI-generated preliminary estimate.
                          Final claim approval requires a certified physical inspection by an authorized insurance adjuster.
                        </span>
                      </div>

                      <div className="report-actions">
                        <button className="btn btn-primary" onClick={transferScanToClaim}>
                          📝 Use Findings to Create Claim
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE: RISK INTELLIGENCE ================= */}
        {page === "Risk Intelligence" && (
          <section className="page-section">
            <div className="panel">
              <span className="eyebrow">EXPLAINABLE AI CLASSIFICATION</span>
              <h1>Risk Intelligence & Fraud Analytics</h1>
              <p>
                Our explainable decision rules evaluate First Notice of Loss submissions across bodily injury severity,
                structural vehicle damage, multi-vehicle liability complexity, and anomaly flags.
              </p>

              <div className="stats-grid">
                <div className="stat-card high-card">
                  <span className="stat-title">HIGH RISK CATEGORY</span>
                  <div className="stat-number danger-text">{highRisk}</div>
                  <div className="stat-caption">Severe trauma, major pileups, or anomaly alerts</div>
                </div>

                <div className="stat-card medium-card">
                  <span className="stat-title">MEDIUM RISK CATEGORY</span>
                  <div className="stat-number warning-text">{mediumRisk}</div>
                  <div className="stat-caption">Moderate body repairs, multi-party disputes</div>
                </div>

                <div className="stat-card low-card">
                  <span className="stat-title">LOW RISK CATEGORY</span>
                  <div className="stat-number success-text">{lowRisk}</div>
                  <div className="stat-caption">Cosmetic dents, parking scrapes, zero injuries</div>
                </div>
              </div>

              <div className="panel-sub-header">
                <h3>System Risk Evaluation Rules</h3>
              </div>

              <div className="risk-rules-grid">
                <div className="rule-card">
                  <div className="rule-badge high">HIGH RISK CRITERIA</div>
                  <ul>
                    <li>Hospitalization, ambulance call, or severe bodily injury</li>
                    <li>Airbag deployment or passenger cabin intrusion</li>
                    <li>Multiple vehicle collisions / pileups</li>
                    <li>Fire, flood submersion, or vehicle rollover</li>
                    <li>Theft, suspicious inconsistencies, or hit-and-run scenarios</li>
                  </ul>
                </div>

                <div className="rule-card">
                  <div className="rule-badge medium">MEDIUM RISK CRITERIA</div>
                  <ul>
                    <li>Moderate exterior impact requiring body shop work</li>
                    <li>Disputed liability with another driver</li>
                    <li>No reported injuries but non-drivable vehicle</li>
                    <li>Claims with incomplete initial documentation</li>
                  </ul>
                </div>

                <div className="rule-card">
                  <div className="rule-badge low">LOW RISK CRITERIA</div>
                  <ul>
                    <li>Minor cosmetic scrapes, scratches, or parking lot dents</li>
                    <li>Single vehicle low-speed contact (e.g. bollard or curb)</li>
                    <li>Both vehicle drivable and zero injuries reported</li>
                    <li>Clear verifiable photographic evidence attached</li>
                  </ul>
                </div>
              </div>

              <div className="panel-sub-header">
                <h3>Live Claim Risk Records</h3>
              </div>

              {claims.length === 0 ? (
                <p className="no-claims-text">No claims available for risk scoring yet.</p>
              ) : (
                <div className="risk-records-list">
                  {claims.map((claim) => (
                    <div className="risk-record-card" key={claim.id}>
                      <div className="record-header">
                        <div>
                          <strong>Claim #{claim.id}</strong> — {claim.name} ({claim.vehicle})
                        </div>
                        <span className={`risk-tag risk-${claim.risk.toLowerCase()}`}>
                          {claim.risk} RISK
                        </span>
                      </div>
                      <p className="record-desc">{claim.description}</p>
                      <div className="record-flags">
                        <strong>Explainable Flags:</strong>
                        {claim.riskFlags && claim.riskFlags.length > 0 ? (
                          claim.riskFlags.map((flag, idx) => (
                            <span className="flag-pill" key={idx}>
                              🚩 {flag}
                            </span>
                          ))
                        ) : (
                          <span className="flag-pill clean">✓ No elevated risk indicators identified</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= PAGE: OFFICER CONSOLE ================= */}
        {page === "Officer Console" && (
          <section className="page-section">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">CLAIMS ADJUDICATION & AUDIT</span>
                  <h1>Claims Officer Management Console</h1>
                  <p>
                    Inspect incoming FNOL submissions, review triage flags, update claim statuses,
                    and order adjuster dispatches.
                  </p>
                </div>
                <div className="filter-pill-group">
                  {["ALL", "PENDING_REVIEW", "APPROVED", "UNDER_INVESTIGATION", "REJECTED"].map(
                    (status) => (
                      <button
                        key={status}
                        className={`filter-pill ${officerFilter === status ? "active" : ""}`}
                        onClick={() => setOfficerFilter(status)}
                      >
                        {status.replace("_", " ")}
                      </button>
                    )
                  )}
                </div>
              </div>

              {filteredClaims.length === 0 ? (
                <div className="empty-officer-state">
                  <div className="empty-icon">📂</div>
                  <h4>No claims in this category</h4>
                  <p>No claims currently match the filter "{officerFilter.replace("_", " ")}".</p>
                </div>
              ) : (
                <div className="officer-claims-grid">
                  {filteredClaims.map((claim) => (
                    <div className="officer-card" key={claim.id}>
                      <div className="officer-card-top">
                        <div>
                          <span className="claim-id-badge large">#{claim.id}</span>
                          <h3>{claim.name}</h3>
                          <span className="vehicle-subtitle">{claim.vehicle}</span>
                        </div>
                        <div className="status-cluster">
                          <span className={`risk-tag risk-${claim.risk.toLowerCase()}`}>
                            {claim.risk} RISK
                          </span>
                          <span className={`status-badge status-${claim.status.toLowerCase()}`}>
                            {claim.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="officer-meta-row">
                        <div>
                          <span className="meta-label">Policy Number:</span>
                          <span className="meta-val">{claim.policyNumber || "Not recorded"}</span>
                        </div>
                        <div>
                          <span className="meta-label">Filed On:</span>
                          <span className="meta-val">
                            {claim.createdAt
                              ? new Date(claim.createdAt).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="officer-narrative">
                        <label>Accident Details:</label>
                        <p>{claim.description}</p>
                      </div>

                      {claim.riskFlags && claim.riskFlags.length > 0 && (
                        <div className="officer-flags">
                          <label>Automated Triage Flags:</label>
                          <div className="flags-wrap">
                            {claim.riskFlags.map((flag, idx) => (
                              <span className="flag-pill small" key={idx}>
                                ⚠️ {flag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="officer-decision-bar">
                        <span className="decision-title">Adjudication Action:</span>
                        <div className="decision-btn-group">
                          <button
                            className="btn-action approve"
                            onClick={() => updateStatus(claim.id, "APPROVED")}
                            disabled={claim.status === "APPROVED"}
                          >
                            ✓ APPROVE
                          </button>
                          <button
                            className="btn-action investigate"
                            onClick={() => updateStatus(claim.id, "UNDER_INVESTIGATION")}
                            disabled={claim.status === "UNDER_INVESTIGATION"}
                          >
                            🔍 INVESTIGATE
                          </button>
                          <button
                            className="btn-action reject"
                            onClick={() => updateStatus(claim.id, "REJECTED")}
                            disabled={claim.status === "REJECTED"}
                          >
                            ✕ REJECT
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= PAGE: NOVA ASSISTANT (CONVERSATIONAL AI) ================= */}
        {page === "NOVA Assistant" && (
          <section className="page-section">
            <div className="panel nova-chat-panel">
              <div className="nova-header">
                <div className="nova-avatar-section">
                  <Robot isThinking={isChatLoading} />
                </div>
                <div className="nova-title-section">
                  <span className="eyebrow">REAL-TIME CONVERSATIONAL INTELLIGENCE</span>
                  <h1>NOVA AI Assistant</h1>
                  <p>
                    Autonomous insurance claims copilot. Ask NOVA about accident protocol, documentation
                    checklist, risk triage scoring, or query active claims in real-time.
                  </p>
                </div>
                <div className="nova-engine-badge">
                  <span className={`status-dot ${aiStatus.configured ? "online" : "warning"}`}></span>
                  <span>
                    {aiStatus.configured
                      ? `Active: ${aiStatus.provider?.toUpperCase()} Model`
                      : "API Key Not Configured"}
                  </span>
                </div>
              </div>

              {/* UNCONFIGURED BANNER */}
              {!aiStatus.configured && (
                <div className="warning-banner">
                  <div className="warning-icon">🤖</div>
                  <div className="warning-text">
                    <strong>AI Conversational Engine Requires API Key</strong>
                    <p>
                      Set <code>GEMINI_API_KEY</code> or <code>OPENAI_API_KEY</code> in <code>backend/.env</code> to enable live dynamic responses.
                    </p>
                  </div>
                </div>
              )}

              {/* CHAT MESSAGES LOG */}
              <div className="nova-chat-box" ref={chatScrollRef}>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble-row ${msg.sender === "user" ? "user-row" : "nova-row"}`}
                  >
                    {msg.sender === "nova" && (
                      <div className="chat-avatar nova-mini-avatar">🤖</div>
                    )}
                    <div className={`chat-bubble ${msg.sender} ${msg.isError ? "chat-error" : ""}`}>
                      <div className="bubble-sender-name">
                        {msg.sender === "nova" ? "NOVA Intelligence" : "You"}
                        <span className="bubble-time">{msg.timestamp}</span>
                      </div>
                      <div className="bubble-text">{msg.text}</div>
                    </div>
                    {msg.sender === "user" && (
                      <div className="chat-avatar user-mini-avatar">👤</div>
                    )}
                  </div>
                ))}

                {isChatLoading && (
                  <div className="chat-bubble-row nova-row">
                    <div className="chat-avatar nova-mini-avatar">🤖</div>
                    <div className="chat-bubble nova typing-indicator">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="typing-label">NOVA is thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* QUICK PROMPT CHIPS */}
              <div className="quick-chips-wrapper">
                <span className="chips-label">Suggested Inquiries:</span>
                <button
                  className="prompt-chip"
                  onClick={() => sendChatMessage("What immediate steps should I take right after an accident?")}
                >
                  🚗 Steps after accident
                </button>
                <button
                  className="prompt-chip"
                  onClick={() => sendChatMessage("How do you evaluate High vs Low risk claims?")}
                >
                  ⚡ Explain risk scoring
                </button>
                <button
                  className="prompt-chip"
                  onClick={() => sendChatMessage("What documents and evidence are required for FNOL intake?")}
                >
                  📋 Required documents
                </button>
                {claims.length > 0 && (
                  <button
                    className="prompt-chip"
                    onClick={() => sendChatMessage(`What is the current status of claim #${claims[claims.length - 1].id}?`)}
                  >
                    🔍 Check latest claim #{claims[claims.length - 1].id}
                  </button>
                )}
              </div>

              {/* CHAT INPUT FORM */}
              <form
                className="chat-input-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChatMessage();
                }}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask NOVA anything about insurance claims, triage, or policy procedures..."
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  className="btn btn-primary chat-send-btn"
                  disabled={!chatInput.trim() || isChatLoading}
                >
                  {isChatLoading ? "SENDING..." : "SEND ➤"}
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
