import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Gauge,
  Layers,
  RefreshCw,
  TrendingUp,
  Database,
  Activity,
} from 'lucide-react';

const Analytics = () => {
  const [documents, setDocuments] = useState([]);
  const [processingTimes, setProcessingTimes] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Workspace & Active Doc IDs
  const [workspaceId] = useState('aa9efc3f-baec-4cc3-bfa3-324bf3c855c');
  const [activeDocId, setActiveDocId] = useState(null);

  // Read the last approved file  
  const readApproved = () => {
    const stored = localStorage.getItem('lastApprovedFile');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  const loadData = () => {
    try {
      const stored = localStorage.getItem('docflow_documents');
      setDocuments(stored ? JSON.parse(stored) : []);
    } catch {
      setDocuments([]);
    }

    try {
      const times = localStorage.getItem('processingTimes');
      setProcessingTimes(times ? JSON.parse(times) : []);
    } catch {
      setProcessingTimes([]);
    }
 
    const doc = readApproved();
    setActiveDocId(doc?.documentId || null);

    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();

    const handleCustom = () => loadData();
    const handleStorage = (e) => {
      if (
        e.key === 'docflow_documents' ||
        e.key === 'processingTimes' ||
        e.key === 'lastApprovedFile'
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

  const stats = useMemo(() => {
    const approved = documents.filter((d) => d.status === 'Approved').length;
    const rejected = documents.filter((d) => d.status === 'Rejected').length;
    const pending = documents.filter((d) => d.status === 'Pending').length;

    const decided = approved + rejected;
    const passRate = decided > 0 ? (approved / decided) * 100 : 0;

    let avgTime = 0;
    if (processingTimes.length > 0) {
      avgTime =
        processingTimes.reduce((s, t) => s + Number(t || 0), 0) /
        processingTimes.length;
    } else if (approved > 0) {
      avgTime = 2.0;
    }

    const totalFields = documents
      .filter((d) => d.status === 'Approved' && d.fields)
      .reduce((sum, d) => sum + Object.keys(d.fields).length, 0);

    const byType = {};
    documents
      .filter((d) => d.status === 'Approved')
      .forEach((d) => {
        const key = d.docType || 'Unknown';
        byType[key] = (byType[key] || 0) + 1;
      });

    return { approved, rejected, pending, passRate, avgTime, totalFields, byType };
  }, [documents, processingTimes]);

  const cards = [
    {
      label: 'Approved Documents',
      value: String(stats.approved),
      valueClass: 'text-emerald-600',
      icon: CheckCircle2,
      iconClass: 'text-emerald-600',
      sub: 'Ready for ERP sync',
    },
    {
      label: 'Rejected Documents',
      value: String(stats.rejected),
      valueClass: 'text-red-500',
      icon: XCircle,
      iconClass: 'text-red-500',
      sub: 'Needs re-review',
    },
    {
      label: 'Pending Review',
      value: String(stats.pending),
      valueClass: 'text-amber-600',
      icon: Clock,
      iconClass: 'text-amber-600',
      sub: 'Awaiting decision',
    },
    {
      label: 'Accuracy Pass Rate',
      value: `${stats.passRate.toFixed(1)}%`,
      valueClass: 'text-emerald-600',
      icon: Gauge,
      iconClass: 'text-emerald-600',
      sub: 'Approved / decided docs',
    },
    {
      label: 'Avg Processing Time',
      value: `${stats.avgTime.toFixed(2)}s`,
      valueClass: 'text-indigo-600',
      icon: Clock,
      iconClass: 'text-indigo-600',
      sub: 'From upload → approval',
    },
    {
      label: 'Fields Extracted',
      value: String(stats.totalFields),
      valueClass: 'text-blue-600',
      icon: Layers,
      iconClass: 'text-blue-600',
      sub: 'Across approved docs',
    },
  ];

  return (
    <div className="space-y-6">

      {/*  Workspace ID, Active Doc ID */}
      <div className="bg-card border border-border-default rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-brand-text" />
            <span className="text-muted font-medium">Workspace ID:</span>
            <span className="bg-main px-2 py-1 rounded border border-border-light text-secondary font-mono">
              {workspaceId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-text" />
            <span className="text-muted font-medium">Active Doc ID:</span>
            <span className={`px-2 py-1 rounded border font-mono ${
              activeDocId
                ? 'bg-brand/10 border-brand/30 text-brand-text'
                : 'bg-main border-border-light text-dim italic'
            }`}>
              {activeDocId || 'Upload or test to set...'}
            </span>
          </div>
        </div>
      </div>

      {/* HEADER ROW */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-900">
            Processing Analytics
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400 font-mono">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg hover:border-slate-300 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white border border-slate-200 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                <Icon className={`h-4 w-4 ${stat.iconClass}`} />
              </div>
              <p className={`text-3xl font-bold ${stat.valueClass}`}>
                {stat.value}
              </p>
              <p className="text-xs text-slate-400 mt-2">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Approved Documents by Type
          </h3>
        </div>

        {Object.keys(stats.byType).length === 0 ? (
          <p className="text-xs font-mono text-slate-400">
            No approved documents yet. Approve a document in the Workbench to see
            breakdowns here.
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(stats.byType).map(([type, count]) => {
              const pct = Math.round((count / stats.approved) * 100);
              return (
                <div key={type} className="flex items-center gap-4">
                  <span className="text-xs text-slate-600 w-40 flex-shrink-0">
                    {type}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-mono w-16 text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;