import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
 
const toLocalDateKey = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
 
const CustomTick = ({ x, y, payload, index, data, todayDay }) => {
  const isToday = data[index]?.day === todayDay;

  return (
    <text
      x={x}
      y={y + 14}
      textAnchor="middle"
      fill={isToday ? '#3b82f6' : '#94a3b8'}
      fontSize={isToday ? 12 : 11}
      fontWeight={isToday ? 700 : 500}
    >
      {payload.value}
    </text>
  );
};

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [processingTimes, setProcessingTimes] = useState([]);
  const [today, setToday] = useState(() => new Date());
 
  const loadData = () => {
    try {
      const storedDocs = localStorage.getItem('docflow_documents');
      setDocuments(storedDocs ? JSON.parse(storedDocs) : []);
    } catch {
      setDocuments([]);
    }

    try {
      const times = localStorage.getItem('processingTimes');
      setProcessingTimes(times ? JSON.parse(times) : []);
    } catch {
      setProcessingTimes([]);
    }
  };

  useEffect(() => {
    loadData();

    const handleCustom = () => loadData();
    const handleStorage = (e) => {
      if (
        e.key === 'docflow_documents' ||
        e.key === 'processingTimes' ||
        e.key === 'lastApprovedFile' ||
        e.key === 'approvedFilesHistory'
      ) {
        loadData();
      }
    };

    window.addEventListener('documentsUpdated', handleCustom);
    window.addEventListener('approvedFileUpdated', handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('documentsUpdated', handleCustom);
      window.removeEventListener('approvedFileUpdated', handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
 
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    const timer = setTimeout(() => setToday(new Date()), msUntilMidnight);
    return () => clearTimeout(timer);
  }, [today]);

  // ---------- Subsets ----------
  const approvedDocs = useMemo(
    () => documents.filter((d) => d.status === 'Approved'),
    [documents]
  );
  const rejectedDocs = useMemo(
    () => documents.filter((d) => d.status === 'Rejected'),
    [documents]
  );
  const pendingDocs = useMemo(
    () => documents.filter((d) => d.status === 'Pending'),
    [documents]
  );
 
  const stats = useMemo(() => {
    const approved = approvedDocs.length;
    const rejected = rejectedDocs.length;
    const pending = pendingDocs.length;

    const decided = approved + rejected;
    const successRate = decided > 0 ? (approved / decided) * 100 : 0;

    let avgTime = 0;
    if (processingTimes.length > 0) {
      avgTime =
        processingTimes.reduce((s, t) => s + Number(t || 0), 0) /
        processingTimes.length;
    } else if (approved > 0) {
      avgTime = 2.0;
    }

    return { approved, rejected, pending, successRate, avgTime };
  }, [approvedDocs, rejectedDocs, pendingDocs, processingTimes]);
 
  const rangeLabel = useMemo(() => {
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(end.getDate() - 6);
    const fmt = (d) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [today]);
 
  const areaData = useMemo(() => {
    const buckets = [];
    const endDate = new Date(today);
    endDate.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);

      const key = toLocalDateKey(d);
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      buckets.push({
        key,
        name: label,
        day: d.getDate(),
        approved: 0,
        rejected: 0,
      });
    }

    const byKey = {};
    buckets.forEach((b) => {
      byKey[b.key] = b;
    });

    approvedDocs.forEach((d) => {
      const dateStr = d.updatedAt || d.createdAt || d.uploadedAt;
      const key = toLocalDateKey(dateStr);
      if (key && byKey[key]) byKey[key].approved += 1;
    });

    rejectedDocs.forEach((d) => {
      const dateStr = d.updatedAt || d.createdAt || d.uploadedAt;
      const key = toLocalDateKey(dateStr);
      if (key && byKey[key]) byKey[key].rejected += 1;
    });

    return buckets;
  }, [approvedDocs, rejectedDocs, today]);

  // Pie chart 
  const pieData = useMemo(() => {
    const colors = ['#3b82f6', '#0ea5e9', '#6366f1', '#94a3b8'];

    const counts = {};
    approvedDocs.forEach((d) => {
      const key = d.docType || 'Other';
      counts[key] = (counts[key] || 0) + 1;
    });

    const total = Object.values(counts).reduce((s, v) => s + v, 0);

    if (total === 0) {
      return [
        { name: 'Invoice', value: 0, color: colors[0] },
        { name: 'Forms', value: 0, color: colors[1] },
        { name: 'Purchase Order', value: 0, color: colors[2] },
        { name: 'Others', value: 0, color: colors[3] },
      ];
    }

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 3);
    const rest = entries.slice(3).reduce((s, [, v]) => s + v, 0);

    const result = top.map(([name, value], i) => ({
      name,
      value: Math.round((value / total) * 100),
      color: colors[i],
    }));

    if (rest > 0) {
      result.push({
        name: 'Others',
        value: Math.round((rest / total) * 100),
        color: colors[3],
      });
    } else if (result.length < 4) {
      result.push({ name: 'Others', value: 0, color: colors[3] });
    }

    return result;
  }, [approvedDocs]);

  const pieTotal = stats.approved;

  // Recent documents 
  const recentDocs = useMemo(() => {
    return documents
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const tb = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 5)
      .map((d) => {
        let displayStatus = 'Processing';
        if (d.status === 'Approved') displayStatus = 'Completed';
        else if (d.status === 'Rejected') displayStatus = 'Review Required';
        else if (d.status === 'Pending') displayStatus = 'Processing';

        return {
          id: d.fileName || d.id || 'document',
          type: d.docType || 'Unknown',
          status: displayStatus,
          date: d.createdAt || d.updatedAt
            ? new Date(d.createdAt || d.updatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—',
        };
      });
  }, [documents]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Processed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
            ● {status}
          </span>
        );
      case 'Review Required':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            ● {status}
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            ● {status}
          </span>
        );
      case 'Processing':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            ● {status}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Good morning, Ayush
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Here's what's happening with your documents today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Pending Review"
          value={String(stats.pending)}
          icon={AlertCircle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <StatCard
          title="Approved"
          value={String(stats.approved)}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Rejected"
          value={String(stats.rejected)}
          icon={XCircle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Avg. Processing Time"
          value={`${stats.avgTime.toFixed(1)} sec`}
          icon={Clock}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-bold text-slate-800">
                Processing Overview
              </h2>
              <span className="text-sm font-medium text-slate-400">
                {rangeLabel}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div> Approved
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div> Rejected
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={areaData}
                margin={{ top: 10, right: 24, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRequired" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  interval={0}
                  tick={(props) => (
                    <CustomTick
                      {...props}
                      data={areaData}
                      todayDay={today.getDate()}
                    />
                  )}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="approved"
                  name="Approved"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProcessed)"
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  name="Rejected"
                  stroke="#f87171"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRequired)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-6">
            Document Types
          </h2>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center mt-[-24px]">
              <p className="text-2xl font-bold text-slate-800">{pieTotal}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {pieData.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-800">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            Recent Documents
          </h2>
          <Link
            to="/documents"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Processed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentDocs.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-8 text-center text-slate-400 text-xs font-mono"
                  >
                    No documents yet. Upload a document in the Workbench to see it here.
                  </td>
                </tr>
              ) : (
                recentDocs.map((doc, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {doc.id}
                    </td>
                    <td className="px-6 py-4">{doc.type}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {doc.date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// StatCard 
const StatCard = ({ title, value, icon: Icon, iconColor, iconBg }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-lg ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
    </div>
    <div>
      <h3 className="text-2xl font-bold text-slate-800 mb-1">{value}</h3>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
    </div>
  </div>
);

export default Dashboard;