import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  LayoutDashboard,
  Send,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  BarChart3,
  PieChart,
  History,
  Calendar,
  Edit,
  Trash2,
  Inbox,
  Loader2,
  DownloadCloud,
} from "lucide-react";

// --- Deklarasi Variabel Global untuk TypeScript ---
declare let __firebase_config: any;
declare let __app_id: any;
declare let __initial_auth_token: any;

// --- Konfigurasi Firebase Anda ---
const myFirebaseConfig = {
  apiKey: "AIzaSyDVjbk6Ro-memRwz0ZVS-uhG-sqfNgyNBo",
  authDomain: "klaimpro-a26e8.firebaseapp.com",
  projectId: "klaimpro-a26e8",
  storageBucket: "klaimpro-a26e8.firebasestorage.app",
  messagingSenderId: "1050014716941",
  appId: "1:1050014716941:web:85e447f05d404ccb40f144",
};

const firebaseConfig =
  typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config)
    : myFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = typeof __app_id !== "undefined" ? __app_id : "rs-klaim-app";

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [filterPeriod, setFilterPeriod] = useState<string>("Semua Waktu");

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [filterMonth, setFilterMonth] = useState<string>(
    months[new Date().getMonth()]
  );
  const [filterYear, setFilterYear] = useState<number | string>(currentYear);

  // --- State Data Real-time (dari DB) ---
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // --- State Form ---
  const [newSubmission, setNewSubmission] = useState<any>({
    month: months[new Date().getMonth()],
    year: currentYear,
    type: "Rawat Jalan",
    submittedCases: "",
    submittedAmount: "",
  });
  const [verificationForm, setVerificationForm] = useState<any>(null);
  const [newCorrection, setNewCorrection] = useState<any>({
    month: months[new Date().getMonth()],
    year: currentYear,
    type: "Rawat Jalan",
    amount: "",
    reason: "",
  });
  const [editingLog, setEditingLog] = useState<any>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const claimTypes = [
    "Rawat Jalan",
    "Rawat Inap",
    "Ambulance",
    "Obat Kronis",
    "Kantong Darah",
    "Alat Kesehatan",
    "Pending",
    "Susulan",
  ];

  // --- Efek Inisialisasi Auth ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Gagal Autentikasi:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u: any) => setUser(u));
    return () => unsubscribe();
  }, []);

  // --- Efek Sinkronisasi Database Firestore ---
  useEffect(() => {
    if (!user) return;

    const submissionsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "submissions"
    );
    const correctionsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "corrections"
    );
    const historyLogsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "historyLogs"
    );

    const unsubSubmissions = onSnapshot(
      submissionsRef,
      (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setSubmissions(data);
        setLoadingDb(false);
      },
      (err: any) => console.error("Error fetching submissions:", err)
    );

    const unsubCorrections = onSnapshot(
      correctionsRef,
      (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setCorrections(data);
      },
      (err: any) => console.error("Error fetching corrections:", err)
    );

    const unsubHistory = onSnapshot(
      historyLogsRef,
      (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort(
          (a: any, b: any) =>
            new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        setHistoryLogs(data);
      },
      (err: any) => console.error("Error fetching history:", err)
    );

    return () => {
      unsubSubmissions();
      unsubCorrections();
      unsubHistory();
    };
  }, [user]);

  // --- Helpers ---
  const logAction = async (action: string, details: string) => {
    if (!user) return;
    const newId = Date.now().toString();
    const logRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "historyLogs",
      newId
    );
    await setDoc(logRef, { action, details, time: new Date().toISOString() });
  };

  const handleDeleteLog = async (id: string) => {
    if (!user) return;
    await deleteDoc(
      doc(db, "artifacts", appId, "public", "data", "historyLogs", id)
    );
  };

  const handleUpdateLog = async (e: any) => {
    e.preventDefault();
    if (!user || !editingLog) return;
    const { id, ...updateData } = editingLog;
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "historyLogs", id),
      updateData
    );
    setEditingLog(null);
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- Analitik Manajerial ---
  const analytics = useMemo(() => {
    let totalDiajukan = 0,
      totalTerverifikasi = 0,
      totalPending = 0,
      totalTidakLayak = 0;
    let kasusDiajukan = 0,
      kasusTerverifikasi = 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);
    const currentSemester = Math.floor(currentMonth / 6);

    const isMatch = (item: any) => {
      if (filterPeriod === "Semua Waktu") return true;
      if (!item.period) return true;

      const [mStr, yStr] = item.period.split(" ");
      const mIndex = months.indexOf(mStr);
      const yNum = parseInt(yStr, 10);

      if (filterPeriod === "Tahun Ini") return yNum === currentYear;
      if (filterPeriod === "Semester Ini")
        return (
          yNum === currentYear && Math.floor(mIndex / 6) === currentSemester
        );
      if (filterPeriod === "Triwulan Ini")
        return (
          yNum === currentYear && Math.floor(mIndex / 3) === currentQuarter
        );

      if (filterPeriod === "Bulanan")
        return (
          mStr === filterMonth && yNum === parseInt(filterYear.toString(), 10)
        );

      return true;
    };

    const filteredSubmissions = submissions.filter((s) => isMatch(s));
    const filteredCorrections = corrections.filter((c) => isMatch(c));

    filteredSubmissions.forEach((s) => {
      totalDiajukan += Number(s.submittedAmount);
      kasusDiajukan += Number(s.submittedCases);
      if (s.isVerified) {
        totalTerverifikasi += Number(s.verifiedAmount);
        totalPending += Number(s.pendingAmount);
        totalTidakLayak += Number(s.rejectedAmount);
        kasusTerverifikasi += Number(s.verifiedCases);
      }
    });

    const totalKoreksi = filteredCorrections.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );
    const nettPendapatan = totalTerverifikasi + totalKoreksi;

    const totalVerifiedBase =
      totalTerverifikasi + totalPending + totalTidakLayak;
    const pctTerverifikasi = totalVerifiedBase
      ? ((totalTerverifikasi / totalVerifiedBase) * 100).toFixed(1)
      : 0;
    const pctPending = totalVerifiedBase
      ? ((totalPending / totalVerifiedBase) * 100).toFixed(1)
      : 0;
    const pctTidakLayak = totalVerifiedBase
      ? ((totalTidakLayak / totalVerifiedBase) * 100).toFixed(1)
      : 0;

    return {
      totalDiajukan,
      totalTerverifikasi,
      totalPending,
      totalTidakLayak,
      totalKoreksi,
      nettPendapatan,
      kasusDiajukan,
      kasusTerverifikasi,
      pctTerverifikasi,
      pctPending,
      pctTidakLayak,
      totalVerifiedBase,
      filteredSubmissions,
    };
  }, [submissions, corrections, filterPeriod, filterMonth, filterYear]);

  // --- Handlers Interaksi DB ---
  const handleAddSubmission = async (e: any) => {
    e.preventDefault();
    if (!user) return;

    const periodStr = `${newSubmission.month} ${newSubmission.year}`;
    const newId = Date.now().toString();
    const subRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "submissions",
      newId
    );

    await setDoc(subRef, {
      period: periodStr,
      type: newSubmission.type,
      date: new Date().toISOString(),
      submittedCases: Number(newSubmission.submittedCases),
      submittedAmount: Number(newSubmission.submittedAmount),
      isVerified: false,
      verifiedCases: 0,
      verifiedAmount: 0,
      pendingCases: 0,
      pendingAmount: 0,
      rejectedCases: 0,
      rejectedAmount: 0,
    });

    logAction("Pengajuan Baru", `Klaim ${newSubmission.type} - ${periodStr}`);
    setNewSubmission({
      month: months[new Date().getMonth()],
      year: currentYear,
      type: "Rawat Jalan",
      submittedCases: "",
      submittedAmount: "",
    });
  };

  const handleSaveVerification = async (e: any) => {
    e.preventDefault();
    if (!user || !verificationForm) return;

    const { id, ...updateData } = verificationForm;
    const subRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "submissions",
      id.toString()
    );

    await updateDoc(subRef, { ...updateData, isVerified: true });

    logAction(
      "Verifikasi BPJS",
      `Hasil untuk ${verificationForm.type} - ${verificationForm.period}`
    );
    setVerificationForm(null);
  };

  const handleAddCorrection = async (e: any) => {
    e.preventDefault();
    if (!user) return;

    const periodStr = `${newCorrection.month} ${newCorrection.year}`;
    const newId = Date.now().toString();
    const corrRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "corrections",
      newId
    );

    const amountVal = -Math.abs(Number(newCorrection.amount));
    await setDoc(corrRef, {
      period: periodStr,
      type: newCorrection.type,
      reason: newCorrection.reason,
      amount: amountVal,
      date: new Date().toISOString(),
    });

    logAction(
      "Input Koreksi",
      `Koreksi ${newCorrection.type} (${formatRp(amountVal)})`
    );
    setNewCorrection({
      month: months[new Date().getMonth()],
      year: currentYear,
      type: "Rawat Jalan",
      amount: "",
      reason: "",
    });
  };

  const handleImportScreenshotData = async () => {
    if (!user) return;
    setIsImporting(true);

    const dataToImport = [
      {
        period: "Januari 2026",
        type: "Susulan",
        submittedCases: 8,
        submittedAmount: 71472700,
        isVerified: true,
        verifiedCases: 8,
        verifiedAmount: 71472700,
        pendingCases: 0,
        pendingAmount: 0,
        rejectedCases: 0,
        rejectedAmount: 0,
      },
      {
        period: "Maret 2026",
        type: "Pending",
        submittedCases: 35,
        submittedAmount: 192098600,
        isVerified: true,
        verifiedCases: 35,
        verifiedAmount: 192098600,
        pendingCases: 0,
        pendingAmount: 0,
        rejectedCases: 0,
        rejectedAmount: 0,
      },
      {
        period: "Januari 2026",
        type: "Alat Kesehatan",
        submittedCases: 2,
        submittedAmount: 770000,
        isVerified: true,
        verifiedCases: 2,
        verifiedAmount: 770000,
        pendingCases: 0,
        pendingAmount: 0,
        rejectedCases: 0,
        rejectedAmount: 0,
      },
      {
        period: "Januari 2026",
        type: "Kantong Darah",
        submittedCases: 20,
        submittedAmount: 13703360,
        isVerified: true,
        verifiedCases: 20,
        verifiedAmount: 13703360,
        pendingCases: 0,
        pendingAmount: 0,
        rejectedCases: 0,
        rejectedAmount: 0,
      },
      {
        period: "Januari 2026",
        type: "Obat Kronis",
        submittedCases: 1699,
        submittedAmount: 224070497,
        isVerified: true,
        verifiedCases: 1699,
        verifiedAmount: 224070497,
        pendingCases: 0,
        pendingAmount: 0,
        rejectedCases: 0,
        rejectedAmount: 0,
      },
      {
        period: "Januari 2026",
        type: "Ambulance",
        submittedCases: 20,
        submittedAmount: 13703360,
        isVerified: true,
        verifiedCases: 20,
        verifiedAmount: 13703360,
        pendingCases: 0,
        pendingAmount: 0,
        rejectedCases: 0,
        rejectedAmount: 0,
      },
      {
        period: "Januari 2026",
        type: "Rawat Inap",
        submittedCases: 626,
        submittedAmount: 3168352000,
        isVerified: true,
        verifiedCases: 626,
        verifiedAmount: 2824957694,
        pendingCases: 0,
        pendingAmount: 297771700,
        rejectedCases: 0,
        rejectedAmount: 0,
      },
      {
        period: "Januari 2026",
        type: "Rawat Jalan",
        submittedCases: 7627,
        submittedAmount: 3470109100,
        isVerified: true,
        verifiedCases: 7627,
        verifiedAmount: 3459693400,
        pendingCases: 0,
        pendingAmount: 1957300,
        rejectedCases: 0,
        rejectedAmount: 8458400,
      },
    ];

    try {
      await logAction(
        "Migrasi Data",
        "Import data otomatis dari sistem versi sebelumnya"
      );

      for (const item of dataToImport) {
        const idStr = `import-${item.type
          .replace(/ /g, "-")
          .toLowerCase()}-${item.period.replace(/ /g, "-").toLowerCase()}`;
        const subRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "submissions",
          idStr
        );

        await setDoc(subRef, {
          ...item,
          date: new Date().toISOString(),
        });
      }
      setTimeout(() => setIsImporting(false), 800);
    } catch (error) {
      console.error("Gagal import:", error);
      setIsImporting(false);
    }
  };

  const formatRp = (num: any) =>
    `Rp ${Math.abs(Number(num) || 0).toLocaleString("id-ID")}`;

  // --- Tampilan Render (UI) ---
  if (!user || loadingDb) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700">
          Menghubungkan ke Database...
        </h2>
        <p className="text-slate-500 mt-2">
          Menyiapkan koneksi cloud untuk multi-user
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 z-20 shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-indigo-500 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="font-bold text-xl text-white tracking-tight">
            Klaim<span className="text-indigo-400">Pro</span>
          </h1>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">
            Menu Manajerial
          </p>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-md"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <BarChart3 size={20} /> Dashboard Analitik
          </button>

          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8">
            Operasional Verifikator
          </p>
          <button
            onClick={() => setActiveTab("pengajuan")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "pengajuan"
                ? "bg-indigo-600 text-white shadow-md"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Send size={20} /> Input Pengajuan
          </button>
          <button
            onClick={() => setActiveTab("verifikasi")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "verifikasi"
                ? "bg-indigo-600 text-white shadow-md"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <ClipboardCheck size={20} /> Input Hasil BPJS
          </button>
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "riwayat"
                ? "bg-indigo-600 text-white shadow-md"
                : "hover:bg-slate-800 hover:text-white"
            }`}
          >
            <History size={20} /> Riwayat Input
          </button>
        </nav>
      </aside>

      {/* Main Area */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50">
        <header className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeTab === "dashboard"
                ? "Dashboard Analitik Manajerial"
                : activeTab === "pengajuan"
                ? "Data Pengajuan Klaim Reguler"
                : activeTab === "verifikasi"
                ? "Data Hasil Verifikasi & Koreksi BPJS"
                : "Riwayat Aktivitas & Input"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === "dashboard"
                ? "Ringkasan performa klaim dan pendapatan RS"
                : activeTab === "riwayat"
                ? "Kelola dan pantau riwayat penginputan data"
                : "Kelola data operasional klaim rumah sakit (Tersinkronisasi Cloud)"}
            </p>
          </div>

          {activeTab === "dashboard" && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleImportScreenshotData}
                disabled={isImporting}
                className="flex items-center gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                title="Pulihkan data dari screenshot yang dikirimkan"
              >
                {isImporting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <DownloadCloud size={16} />
                )}
                {isImporting ? "Mengimpor..." : "Pulihkan Data Lama"}
              </button>

              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                <Calendar size={18} className="text-indigo-500 ml-2" />
                <select
                  className="bg-transparent text-sm font-semibold text-slate-700 outline-none pr-4 py-1 cursor-pointer"
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                >
                  <option value="Semua Waktu">Semua Waktu</option>
                  <option value="Bulanan">Bulanan</option>
                  <option value="Triwulan Ini">Triwulan Ini</option>
                  <option value="Semester Ini">Semester Ini</option>
                  <option value="Tahun Ini">Tahun Ini</option>
                </select>

                {filterPeriod === "Bulanan" && (
                  <div className="flex gap-2 ml-2 border-l border-slate-300 pl-3">
                    <select
                      className="bg-transparent text-sm font-semibold text-indigo-700 outline-none cursor-pointer"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      className="bg-transparent text-sm font-semibold text-indigo-700 outline-none cursor-pointer"
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <div className="p-8">
          {/* ================= DASHBOARD MANAJERIAL ================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Financial Highlight */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute -right-6 -top-6 bg-blue-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                        <Send size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">
                      Total Diajukan
                    </p>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                      {formatRp(analytics.totalDiajukan)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                      <FileText size={12} />{" "}
                      {analytics.kasusDiajukan.toLocaleString("id-ID")} Berkas
                      Kasus
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute -right-6 -top-6 bg-emerald-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
                        <CheckCircle size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">
                      Total Disetujui
                    </p>
                    <h3 className="text-2xl font-black text-emerald-600 tracking-tight">
                      {formatRp(analytics.totalTerverifikasi)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                      <TrendingUp size={12} className="text-emerald-500" />{" "}
                      {analytics.pctTerverifikasi}% Approval Rate
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute -right-6 -top-6 bg-amber-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
                        <Clock size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">
                      Total Tertunda (Pending)
                    </p>
                    <h3 className="text-2xl font-black text-amber-600 tracking-tight">
                      {formatRp(analytics.totalPending)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> Perlu perbaikan berkas
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                  <div className="absolute -right-6 -top-6 bg-rose-50 w-24 h-24 rounded-full group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-rose-100 p-2.5 rounded-xl text-rose-600">
                        <TrendingDown size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">
                      Potongan & Tidak Layak
                    </p>
                    <h3 className="text-2xl font-black text-rose-600 tracking-tight">
                      {formatRp(
                        Math.abs(analytics.totalKoreksi) +
                          analytics.totalTidakLayak
                      )}
                    </h3>
                    <p className="text-xs text-rose-400 mt-2 font-medium flex items-center gap-1">
                      <TrendingDown size={12} /> Loss Pendapatan
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Proporsi Status Verifikasi */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm col-span-1 flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 shrink-0">
                    <div className="bg-indigo-100 p-1.5 rounded-lg">
                      <PieChart size={18} className="text-indigo-600" />
                    </div>
                    Proporsi Hasil Verifikasi
                  </h3>

                  {analytics.totalVerifiedBase > 0 ? (
                    <div className="space-y-6 flex-1 flex flex-col justify-center">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
                            Terverifikasi
                          </span>
                          <span className="font-bold text-emerald-600">
                            {analytics.pctTerverifikasi}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full"
                            style={{ width: `${analytics.pctTerverifikasi}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>{" "}
                            Pending
                          </span>
                          <span className="font-bold text-amber-500">
                            {analytics.pctPending}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-amber-300 to-amber-500 h-full rounded-full"
                            style={{ width: `${analytics.pctPending}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-slate-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>{" "}
                            Tidak Layak
                          </span>
                          <span className="font-bold text-rose-500">
                            {analytics.pctTidakLayak}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-rose-400 to-rose-600 h-full rounded-full"
                            style={{ width: `${analytics.pctTidakLayak}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
                      <Inbox
                        size={48}
                        strokeWidth={1}
                        className="mb-4 text-slate-300"
                      />
                      <p className="text-sm font-medium">
                        Belum ada data verifikasi
                      </p>
                      <p className="text-xs mt-1 text-slate-400 text-center">
                        Data akan muncul setelah BPJS memberikan hasil
                        verifikasi klaim.
                      </p>
                    </div>
                  )}
                </div>

                {/* Perbandingan Pengajuan vs Disetujui per Tipe */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm col-span-1 lg:col-span-2 flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 shrink-0">
                    <div className="bg-indigo-100 p-1.5 rounded-lg">
                      <BarChart3 size={18} className="text-indigo-600" />
                    </div>
                    Capaian per Tipe Klaim (Terverifikasi vs Diajukan)
                  </h3>

                  <div className="flex-1 flex flex-col justify-center space-y-6">
                    {claimTypes.map((type) => {
                      const typedSubmissions =
                        analytics.filteredSubmissions.filter(
                          (s) => s.type === type
                        );
                      if (typedSubmissions.length === 0) return null;

                      const typeDiajukan = typedSubmissions.reduce(
                        (acc, curr) => acc + curr.submittedAmount,
                        0
                      );
                      const typeDisetujui = typedSubmissions.reduce(
                        (acc, curr) => acc + curr.verifiedAmount,
                        0
                      );
                      const pct =
                        typeDiajukan > 0
                          ? (typeDisetujui / typeDiajukan) * 100
                          : 0;

                      return (
                        <div key={type} className="relative group">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-bold text-slate-700">
                              {type}
                            </span>
                            <span className="text-slate-500 font-medium">
                              <span className="text-indigo-600 font-bold">
                                {formatRp(typeDisetujui)}
                              </span>{" "}
                              / {formatRp(typeDiajukan)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden flex shadow-inner">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out relative"
                              style={{ width: `${pct}%` }}
                            >
                              <span className="absolute right-2 top-0.5 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {analytics.filteredSubmissions.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400">
                        <FileText
                          size={48}
                          strokeWidth={1}
                          className="mb-4 text-slate-300"
                        />
                        <p className="text-sm font-medium">
                          Belum ada pengajuan klaim
                        </p>
                        <p className="text-xs mt-1 text-slate-400">
                          Silakan input pengajuan klaim reguler pada menu
                          terkait.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= INPUT PENGAJUAN KLAIM ================= */}
          {activeTab === "pengajuan" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <PlusCircle size={20} className="text-indigo-600" /> Form
                  Pengajuan Klaim Reguler
                </h3>
                <form
                  onSubmit={handleAddSubmission}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
                >
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-600">
                      Periode
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newSubmission.month}
                        onChange={(e) =>
                          setNewSubmission({
                            ...newSubmission,
                            month: e.target.value,
                          })
                        }
                      >
                        {months.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newSubmission.year}
                        onChange={(e) =>
                          setNewSubmission({
                            ...newSubmission,
                            year: e.target.value,
                          })
                        }
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-600">
                      Tipe Klaim
                    </label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newSubmission.type}
                      onChange={(e) =>
                        setNewSubmission({
                          ...newSubmission,
                          type: e.target.value,
                        })
                      }
                    >
                      {claimTypes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-600">
                      Jumlah Berkas
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="0"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newSubmission.submittedCases}
                      onChange={(e) =>
                        setNewSubmission({
                          ...newSubmission,
                          submittedCases: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-600">
                      Total Nominal (Rp)
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="0"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newSubmission.submittedAmount}
                      onChange={(e) =>
                        setNewSubmission({
                          ...newSubmission,
                          submittedAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <Send size={18} /> Ajukan
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h4 className="font-bold text-slate-700">
                    Riwayat Pengajuan Terakhir
                  </h4>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Periode</th>
                      <th className="px-6 py-4 font-semibold">Tipe Klaim</th>
                      <th className="px-6 py-4 font-semibold">
                        Jml Berkas Diajukan
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Nominal Diajukan
                      </th>
                      <th className="px-6 py-4 font-semibold text-center">
                        Status Verifikasi BPJS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {sub.period}
                        </td>
                        <td className="px-6 py-4">{sub.type}</td>
                        <td className="px-6 py-4">
                          {Number(sub.submittedCases).toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {formatRp(sub.submittedAmount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {sub.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200">
                              <CheckCircle size={14} /> Selesai Diverifikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200">
                              <Clock size={14} /> Menunggu Balasan
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {submissions.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-6 text-slate-400"
                        >
                          Belum ada pengajuan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= INPUT HASIL VERIFIKASI ================= */}
          {activeTab === "verifikasi" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">
                      Verifikasi Klaim Reguler
                    </h3>
                    <p className="text-sm text-slate-500">
                      Pilih pengajuan yang belum diverifikasi untuk memasukkan
                      hasil dari BPJS.
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {submissions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 ${
                          sub.isVerified
                            ? "bg-slate-50 border-slate-200"
                            : "bg-white border-indigo-200 shadow-sm"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">
                              {sub.period}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">
                              {sub.type}
                            </span>
                            {sub.isVerified && (
                              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle size={14} /> Diverifikasi
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            Diajukan: {sub.submittedCases} berkas | Nominal:{" "}
                            <span className="font-bold text-slate-700">
                              {formatRp(sub.submittedAmount)}
                            </span>
                          </p>
                        </div>

                        {!sub.isVerified ? (
                          <button
                            onClick={() => setVerificationForm({ ...sub })}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
                          >
                            Input Hasil Verifikasi
                          </button>
                        ) : (
                          <div className="flex gap-4 text-sm text-right">
                            <div>
                              <p className="text-emerald-600 font-bold">
                                Terverifikasi
                              </p>
                              <p className="font-semibold">
                                {formatRp(sub.verifiedAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-amber-600 font-bold">
                                Pending
                              </p>
                              <p className="font-semibold">
                                {formatRp(sub.pendingAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-rose-600 font-bold">
                                Tidak Layak
                              </p>
                              <p className="font-semibold">
                                {formatRp(sub.rejectedAmount)}
                              </p>
                            </div>
                            <button
                              onClick={() => setVerificationForm({ ...sub })}
                              className="text-indigo-600 font-bold hover:underline self-center ml-2"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {submissions.length === 0 && (
                      <p className="text-slate-500 text-sm text-center py-4">
                        Belum ada pengajuan klaim.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <TrendingDown className="text-rose-500" /> Data Koreksi
                      Klaim BPJS
                    </h3>
                    <p className="text-sm text-slate-500">
                      Input potongan atau koreksi untuk klaim periode sebelumnya
                      yang sudah terbayar.
                    </p>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 border-b border-slate-200">
                  <form
                    onSubmit={handleAddCorrection}
                    className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">
                        Periode Asal
                      </label>
                      <div className="flex gap-2">
                        <select
                          className="w-full px-2 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm"
                          value={newCorrection.month}
                          onChange={(e) =>
                            setNewCorrection({
                              ...newCorrection,
                              month: e.target.value,
                            })
                          }
                        >
                          {months.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          className="w-full px-2 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm"
                          value={newCorrection.year}
                          onChange={(e) =>
                            setNewCorrection({
                              ...newCorrection,
                              year: e.target.value,
                            })
                          }
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">
                        Tipe Klaim
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm"
                        value={newCorrection.type}
                        onChange={(e) =>
                          setNewCorrection({
                            ...newCorrection,
                            type: e.target.value,
                          })
                        }
                      >
                        {claimTypes.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">
                        Nominal Potongan
                      </label>
                      <input
                        required
                        type="number"
                        placeholder="Nominal"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm"
                        value={newCorrection.amount}
                        onChange={(e) =>
                          setNewCorrection({
                            ...newCorrection,
                            amount: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">
                        Alasan Koreksi
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Audit / Administrasi"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm"
                        value={newCorrection.reason}
                        onChange={(e) =>
                          setNewCorrection({
                            ...newCorrection,
                            reason: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-rose-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-rose-700 text-sm"
                    >
                      Simpan
                    </button>
                  </form>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold">
                        Waktu Pencatatan
                      </th>
                      <th className="px-6 py-3 font-semibold">Periode Asal</th>
                      <th className="px-6 py-3 font-semibold">Tipe Klaim</th>
                      <th className="px-6 py-3 font-semibold">Alasan</th>
                      <th className="px-6 py-3 font-semibold text-right">
                        Nominal Koreksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {corrections.map((corr: any) => (
                      <tr
                        key={corr.id}
                        className="hover:bg-slate-50 text-slate-700"
                      >
                        <td className="px-6 py-3 text-slate-500">
                          {formatTime(corr.date)}
                        </td>
                        <td className="px-6 py-3 font-bold">{corr.period}</td>
                        <td className="px-6 py-3">{corr.type}</td>
                        <td className="px-6 py-3 italic">{corr.reason}</td>
                        <td className="px-6 py-3 text-right font-bold text-rose-600">
                          {formatRp(corr.amount)}
                        </td>
                      </tr>
                    ))}
                    {corrections.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-6 text-slate-400"
                        >
                          Belum ada data koreksi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= RIWAYAT INPUT ================= */}
          {activeTab === "riwayat" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <History size={20} className="text-indigo-600" /> Riwayat
                  Penginputan Data
                </h3>
                <p className="text-sm text-slate-500">
                  Daftar aktivitas penginputan data yang telah dilakukan. Anda
                  dapat mengedit keterangan atau menghapus log yang salah.
                </p>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Waktu</th>
                    <th className="px-6 py-4 font-semibold">
                      Aksi / Jenis Input
                    </th>
                    <th className="px-6 py-4 font-semibold">Detail</th>
                    <th className="px-6 py-4 font-semibold text-center">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {formatTime(log.time)}
                      </td>
                      <td className="px-6 py-4 font-medium text-indigo-700">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {log.details}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setEditingLog({ ...log })}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {historyLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-10 text-slate-500"
                      >
                        Belum ada riwayat aktivitas tersimpan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Input Hasil Verifikasi (Breakdown) */}
      {verificationForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">
                  Input Hasil Verifikasi BPJS
                </h3>
                <p className="text-indigo-200 text-sm">
                  Pengajuan: {verificationForm?.type} -{" "}
                  {verificationForm?.period}
                </p>
              </div>
              <button
                onClick={() => setVerificationForm(null)}
                className="text-indigo-200 hover:text-white"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between text-sm">
              <div>
                <p className="text-slate-500">Total Berkas Diajukan</p>
                <p className="font-bold text-lg text-slate-800">
                  {verificationForm?.submittedCases}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">Total Nominal Diajukan</p>
                <p className="font-bold text-lg text-indigo-700">
                  {formatRp(verificationForm?.submittedAmount)}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveVerification} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <h4 className="font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle size={16} /> Terverifikasi
                  </h4>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">
                      Jml Berkas
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:border-emerald-500"
                      value={verificationForm?.verifiedCases ?? ""}
                      onChange={(e) =>
                        setVerificationForm({
                          ...verificationForm,
                          verifiedCases: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">
                      Nominal (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:border-emerald-500"
                      value={verificationForm?.verifiedAmount ?? ""}
                      onChange={(e) =>
                        setVerificationForm({
                          ...verificationForm,
                          verifiedAmount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <h4 className="font-bold text-amber-700 flex items-center gap-2">
                    <Clock size={16} /> Pending
                  </h4>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">
                      Jml Berkas
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:border-amber-500"
                      value={verificationForm?.pendingCases ?? ""}
                      onChange={(e) =>
                        setVerificationForm({
                          ...verificationForm,
                          pendingCases: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">
                      Nominal (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:border-amber-500"
                      value={verificationForm?.pendingAmount ?? ""}
                      onChange={(e) =>
                        setVerificationForm({
                          ...verificationForm,
                          pendingAmount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                  <h4 className="font-bold text-rose-700 flex items-center gap-2">
                    <XCircle size={16} /> Tidak Layak
                  </h4>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">
                      Jml Berkas
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:border-rose-500"
                      value={verificationForm?.rejectedCases ?? ""}
                      onChange={(e) =>
                        setVerificationForm({
                          ...verificationForm,
                          rejectedCases: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">
                      Nominal (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:border-rose-500"
                      value={verificationForm?.rejectedAmount ?? ""}
                      onChange={(e) =>
                        setVerificationForm({
                          ...verificationForm,
                          rejectedAmount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 p-3 rounded-lg text-xs text-slate-600 flex justify-between items-center">
                <span>
                  Total Cek Nominal:{" "}
                  {formatRp(
                    Number(verificationForm?.verifiedAmount || 0) +
                      Number(verificationForm?.pendingAmount || 0) +
                      Number(verificationForm?.rejectedAmount || 0)
                  )}
                </span>
                <span>
                  (Bandingkan dengan Pengajuan:{" "}
                  {formatRp(verificationForm?.submittedAmount || 0)})
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVerificationForm(null)}
                  className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                >
                  Simpan Hasil BPJS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Riwayat */}
      {editingLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Edit Riwayat</h3>
              <button
                onClick={() => setEditingLog(null)}
                className="text-indigo-200 hover:text-white"
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateLog} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">
                  Aksi / Jenis Input
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editingLog?.action ?? ""}
                  onChange={(e) =>
                    setEditingLog({ ...editingLog, action: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-600">
                  Detail Keterangan
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editingLog?.details ?? ""}
                  onChange={(e) =>
                    setEditingLog({ ...editingLog, details: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
