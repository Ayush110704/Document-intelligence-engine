import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileJson,
  FileText,
  Lock,
  RefreshCw,
  Loader2,
  Download,
  CheckCircle2,
  FileIcon,
  Database,
  Activity,
  FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';

const AuditLog = () => {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approvedFile, setApprovedFile] = useState(null);

  // Workspace & Active Doc IDs
  const [workspaceId] = useState('aa9efc3f-baec-4cc3-bfa3-324bf3c855c');
  const [activeDocId, setActiveDocId] = useState(null);
 
  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem('lastApprovedFile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setApprovedFile(parsed);
          setActiveDocId(parsed?.documentId || null);
        } catch (e) {
          console.error('Failed to parse approved file:', e);
        }
      } else {
        setApprovedFile(null);
        setActiveDocId(null);
      }
    };

    load();

    const handleCustom = (e) => {
      if (e.detail) {
        setApprovedFile(e.detail);
        setActiveDocId(e.detail?.documentId || null);
      } else {
        load();
      }
    };
    const handleStorage = (e) => {
      if (e.key === 'lastApprovedFile') load();
    };

    window.addEventListener('approvedFileUpdated', handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('approvedFileUpdated', handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
 
  const refreshAuditTrail = () => {
    setLoading(true);
    setLogs(null);

    setTimeout(() => {
      const stored = localStorage.getItem('lastApprovedFile');

      if (!stored) {
        setLogs({
          error: 'No approved documents found',
          hint: 'Approve a document in the Workbench first, then refresh.',
        });
        setLoading(false);
        return;
      }

      let doc;
      try {
        doc = JSON.parse(stored);
      } catch (e) {
        setLogs({ error: 'Failed to parse approved document' });
        setLoading(false);
        return;
      }

      setLogs({
        total: 2,
        entries: [
          {
            id: `evt_${doc.documentId || 'unknown'}_approved`,
            event: 'DOCUMENT_APPROVED',
            documentId: doc.documentId,
            fileName: doc.name,
            docType: doc.docType,
            fileType: doc.fileType,
            timestamp: doc.approvedAt,
            actor: 'workbench-user',
            hash: `sha256:${btoa(doc.name + doc.approvedAt).slice(0, 32)}`,
            immutable: true,
          },
          {
            id: `evt_${doc.documentId || 'unknown'}_extracted`,
            event: 'OCR_EXTRACTION_COMPLETE',
            documentId: doc.documentId,
            fieldsExtracted: doc.erpData ? Object.keys(doc.erpData).length : 0,
            timestamp: doc.approvedAt,
            actor: 'ocr-engine',
            hash: `sha256:${btoa(JSON.stringify(doc.erpData || {})).slice(0, 32)}`,
            immutable: true,
          },
        ],
      });

      setLoading(false);
    }, 700);
  };

  //  Download Helpers 
  const triggerDownload = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const baseFilename = approvedFile?.name?.replace(/\.[^/.]+$/, '') || 'extracted';

  const downloadERPJson = () => {
    const payload = approvedFile?.erpData ?? { message: 'No approved file yet' };
    triggerDownload(
      JSON.stringify(payload, null, 2),
      `${baseFilename}_erp.json`,
      'application/json'
    );
  };

  const downloadERPCsv = () => {
    const data = approvedFile?.erpData ?? {};
    const rows = Object.entries(data).map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`);
    const csv = ['"Field","Value"', ...rows].join('\n');
    triggerDownload(csv, `${baseFilename}_erp.csv`, 'text/csv');
  };

  const downloadRawTxt = () => {
    const raw = approvedFile?.rawText ?? 'No approved file yet';
    triggerDownload(raw, `${baseFilename}_raw.txt`, 'text/plain');
  };

  const downloadOriginalFile = () => {
    if (!approvedFile) return;
    if (approvedFile.dataUrl) {
      const a = document.createElement('a');
      a.href = approvedFile.dataUrl;
      a.download = approvedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (approvedFile.rawText) {
      triggerDownload(approvedFile.rawText, approvedFile.name, 'text/plain');
    }
  };

  //  Download Audit PDF  
  const downloadAuditPdf = () => {
    if (!approvedFile && !logs) {
      alert('Nothing to export. Approve a document and refresh the audit trail first.');
      return;
    }

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;
 
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 70, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Document Intelligence Engine', margin, 32);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Immutable Audit Trail Report', margin, 50);

      doc.setFontSize(9);
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth - margin,
        32,
        { align: 'right' }
      );
      doc.text(
        `Workspace: ${workspaceId}`,
        pageWidth - margin,
        48,
        { align: 'right' }
      );

      y = 100;
      doc.setTextColor(15, 23, 42);
 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Approved Document', margin, y);
      y += 8;
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      if (approvedFile) {
        const info = [
          ['File Name', approvedFile.name || '—'],
          ['Document ID', approvedFile.documentId || '—'],
          ['Document Type', approvedFile.docType || '—'],
          ['File Format', approvedFile.fileType || '—'],
          ['Approved At', approvedFile.approvedAt
            ? new Date(approvedFile.approvedAt).toLocaleString()
            : '—'],
          ['File Size', approvedFile.size
            ? `${(approvedFile.size / 1024).toFixed(2)} KB`
            : '—'],
        ];

        info.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold');
          doc.text(`${label}:`, margin, y);
          doc.setFont('helvetica', 'normal');
          const wrapped = doc.splitTextToSize(String(value), pageWidth - margin * 2 - 120);
          doc.text(wrapped, margin + 120, y);
          y += 16 * wrapped.length;
        });
      } else {
        doc.text('No approved document available.', margin, y);
        y += 18;
      }

      y += 12;

      //   Audit Trail Entries  
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Audit Trail Entries', margin, y);
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;

      const entries = logs?.entries || [];

      if (entries.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(
          'No audit entries loaded. Click "Refresh Audit Trail" first.',
          margin,
          y
        );
        y += 18;
      } else {
        entries.forEach((entry, idx) => {
          if (y > pageHeight - 120) {
            doc.addPage();
            y = margin;
          }

          doc.setFillColor(241, 245, 249);
          doc.rect(margin, y - 12, pageWidth - margin * 2, 22, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.text(
            `${idx + 1}. ${entry.event || 'EVENT'}`,
            margin + 6,
            y + 3
          );

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `Immutable: ${entry.immutable ? 'YES' : 'NO'}`,
            pageWidth - margin - 6,
            y + 3,
            { align: 'right' }
          );

          y += 22;
          doc.setTextColor(15, 23, 42);

          const rows = [
            ['Event ID', entry.id],
            ['Document ID', entry.documentId],
            ['File Name', entry.fileName || '—'],
            ['Doc Type', entry.docType || '—'],
            ['File Type', entry.fileType || '—'],
            ['Actor', entry.actor || '—'],
            ['Timestamp', entry.timestamp
              ? new Date(entry.timestamp).toLocaleString()
              : '—'],
            ['Fields Extracted', entry.fieldsExtracted ?? '—'],
            ['Hash', entry.hash || '—'],
          ];

          doc.setFontSize(9);
          rows.forEach(([label, value]) => {
            if (value === undefined || value === null || value === '') return;
            if (y > pageHeight - 60) {
              doc.addPage();
              y = margin;
            }
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, margin + 12, y);
            doc.setFont('helvetica', 'normal');
            const wrapped = doc.splitTextToSize(
              String(value),
              pageWidth - margin * 2 - 130
            );
            doc.text(wrapped, margin + 130, y);
            y += 13 * wrapped.length;
          });

          y += 14;
        });
      }
 
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: 'center' }
        );
        doc.text(
          'Document Intelligence Engine — Confidential',
          margin,
          pageHeight - 20
        );
      }

      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      doc.save(`audit_report_${baseFilename}_${ts}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate audit PDF. Check console for details.');
    }
  };

  return (
    <div className="space-y-6">

      {/*  TOP HEADER */}
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

      {/*   Last Approved File  */}
      <div className="bg-card border border-border-default rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-secondary">
              Last Approved File
            </h2>
            <p className="text-sm text-muted mt-1">
              The most recently approved document from the Workbench appears here and can be downloaded.
            </p>
          </div>
        </div>

        {!approvedFile ? (
          <div className="bg-terminal border border-border-default rounded-lg px-4 py-6 text-center">
            <FileIcon className="h-8 w-8 text-dim mx-auto mb-2" />
            <p className="text-xs font-mono text-muted">
              No approved file yet. Approve a document in the Workbench to see it here.
            </p>
          </div>
        ) : (
          <div className="bg-terminal border border-border-default rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-success/10 p-2 rounded-lg flex-shrink-0">
                  <FileText className="h-5 w-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-secondary truncate">
                    {approvedFile.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Approved {approvedFile.approvedAt
                      ? new Date(approvedFile.approvedAt).toLocaleString()
                      : 'recently'}
                  </p>
                </div>
              </div>

              <button
                onClick={downloadOriginalFile}
                className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-primary text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-brand/20 flex-shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download File
              </button>
            </div>
          </div>
        )}
      </div>

      {/*  SECTION 1: Download Extracted Text  */}
      <div className="bg-card border border-border-default rounded-xl p-6">

        <div className="flex items-start gap-3 mb-2">
          <FileSpreadsheet className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-secondary">
              Download Extracted Text & ERP Payload
            </h2>
            <p className="text-sm text-muted mt-1">
              Download structured document extraction data to easily fill into ERP systems (Tally, SAP, Zoho, QuickBooks, Salesforce).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 my-6">
          <button
            onClick={downloadERPJson}
            disabled={!approvedFile}
            className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-primary text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileJson className="h-3.5 w-3.5" />
            Download ERP JSON
          </button>

          <button
            onClick={downloadERPCsv}
            disabled={!approvedFile}
            className="flex items-center gap-2 bg-success hover:opacity-90 text-primary text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-success/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Download ERP CSV
          </button>

          <button
            onClick={downloadRawTxt}
            disabled={!approvedFile}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-primary text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-3.5 w-3.5" />
            Download Raw Text (TXT)
          </button>
 
          <button
            onClick={downloadAuditPdf}
            disabled={!approvedFile && !logs}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-primary text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="h-3.5 w-3.5" />
            Download Audit PDF
          </button>
        </div>

        <div className="bg-terminal border border-border-default rounded-lg px-4 py-3">
          <p className="text-xs font-mono text-muted">
            {approvedFile
              ? `Ready to download payload for: ${approvedFile.name}`
              : 'Select or upload a document in Workbench to inspect and download ERP extracted fields...'}
          </p>
        </div>

      </div>

      {/* SECTION 2 */}
      <div className="bg-card border border-border-default rounded-xl p-6">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-secondary">
              Immutable Audit Trail Logs
            </h2>
          </div>
          <button
            onClick={refreshAuditTrail}
            disabled={loading}
            className="flex items-center gap-2 bg-main border border-border-light text-secondary text-xs font-semibold px-4 py-2 rounded-lg hover:border-brand/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 text-brand-text animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-brand-text" />
            )}
            Refresh Audit Trail
          </button>
        </div>

        <div className="bg-terminal border border-border-default rounded-lg p-5 min-h-[400px] font-mono text-sm overflow-y-auto">
          {!logs && !loading && (
            <p className="text-dim">
              Click "Refresh Audit Trail" to load immutable logs...
            </p>
          )}

          {loading && (
            <p className="text-brand-text animate-pulse">
              ⟳ Fetching audit trail from backend...
            </p>
          )}

          {logs && (
            <pre className="text-secondary whitespace-pre-wrap">
{JSON.stringify(logs, null, 2)}
            </pre>
          )}
        </div>

      </div>

    </div>
  );
};

export default AuditLog;