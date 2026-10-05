import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Trash2, Eye, Search, Filter, Upload,
  CheckCircle2, Clock, XCircle, AlertCircle, X, Download, FileIcon
} from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';

const Documents = () => {
  const navigate = useNavigate();
  const { documents, removeDocument } = useDocuments();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [viewDoc, setViewDoc] = useState(null);
  const [viewFileData, setViewFileData] = useState(null);
 
  useEffect(() => {
    if (!viewDoc) {
      setViewFileData(null);
      return;
    }
    if (viewDoc.dataUrl) {
      setViewFileData({ dataUrl: viewDoc.dataUrl });
      return;
    }
    try {
      const history = JSON.parse(
        localStorage.getItem('approvedFilesHistory') || '[]'
      );
      const match = history.find((h) => h.documentId === viewDoc.id);
      if (match) {
        setViewFileData(match);
        return;
      }
    } catch {}
    try {
      const last = JSON.parse(
        localStorage.getItem('lastApprovedFile') || 'null'
      );
      if (last && last.documentId === viewDoc.id) {
        setViewFileData(last);
        return;
      }
    } catch {}
    setViewFileData(null);
  }, [viewDoc]);

  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.fileName.toLowerCase().includes(search.toLowerCase()) ||
      doc.docType.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || doc.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const base =
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border';
    switch (status) {
      case 'Approved':
        return (
          <span className={`${base} bg-success/20 text-success border-success/40`}>
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case 'Pending':
        return (
          <span className={`${base} bg-brand/20 text-brand-text border-brand-border`}>
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      case 'Rejected':
        return (
          <span className={`${base} bg-error/20 text-error border-error/40`}>
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className={`${base} bg-border-default text-muted border-border-light`}>
            <AlertCircle className="h-3 w-3" /> {status}
          </span>
        );
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isImageFile = (doc) => {
    const ft = (doc.fileType || '').toLowerCase();
    const fn = (doc.fileName || '').toLowerCase();
    return ft.includes('image') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fn);
  };
  const isPdfFile = (doc) => {
    const ft = (doc.fileType || '').toLowerCase();
    const fn = (doc.fileName || '').toLowerCase();
    return ft.includes('pdf') || /\.pdf$/i.test(fn);
  };
 
  const sendToUpload = (doc) => {
    if (!doc || doc.status !== 'Pending') return;
    try {
      sessionStorage.setItem('pendingResumeDoc', JSON.stringify(doc));
    } catch (err) {
      console.error('Failed to stash doc for Upload:', err);
    }
    // Close the modal if open, then navigate
    setViewDoc(null);
    navigate('/upload');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Documents</h1>
          <p className="text-xs text-muted mt-1">
            Click <span className="text-brand-text font-semibold">Send to Upload</span>{' '}
            on a Pending document to resume work on it.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border-default rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by file name or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-main border border-border-light rounded-lg pl-10 pr-3 py-2 text-sm text-secondary placeholder-placeholder focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          {['All', 'Pending', 'Approved', 'Rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-brand text-primary'
                  : 'bg-main border border-border-light text-muted hover:text-secondary hover:border-brand/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="bg-card border border-border-default rounded-xl p-12 text-center">
          <div className="bg-main w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-brand-text" />
          </div>
          <h3 className="text-lg font-bold text-secondary mb-1">
            {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
          </h3>
          <p className="text-sm text-muted">
            {documents.length === 0
              ? 'Upload a document to see it appear here.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const isPending = doc.status === 'Pending';

            return (
              <div
                key={doc.id}
                className="bg-card border border-border-default rounded-xl p-5 hover:border-border-light transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-main p-2.5 rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5 text-brand-text" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold text-secondary truncate"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </p>
                      <p className="text-[10px] text-dim">
                        {(doc.fileSize / 1024).toFixed(1)} KB · {doc.fileType}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>

                <div className="space-y-1.5 mb-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Type:</span>
                    <span className="text-secondary font-medium">
                      {doc.docType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Confidence:</span>
                    <span
                      className={`font-medium ${
                        doc.confidence >= 90 ? 'text-success' : 'text-brand-text'
                      }`}
                    >
                      {doc.confidence}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Uploaded:</span>
                    <span className="text-secondary">
                      {formatDate(doc.uploadedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Fields:</span>
                    <span className="text-secondary">
                      {doc.fields ? Object.keys(doc.fields).length : 0}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border-default">
                  <button
                    onClick={() => setViewDoc(doc)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-main border border-border-light text-secondary text-xs font-semibold px-3 py-2 rounded-lg hover:border-brand/50 transition-all"
                    title="View details"
                  >
                    <Eye className="h-3.5 w-3.5 text-brand-text" /> View
                  </button>

                  {isPending && (
                    <button
                      onClick={() => sendToUpload(doc)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover text-primary text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                      title="Resume this document in Upload"
                    >
                      <Upload className="h-3.5 w-3.5" /> Send
                    </button>
                  )}

                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="flex items-center justify-center gap-1.5 bg-error/20 text-error border border-error/40 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-error/30 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODAL */}
      {viewDoc && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setViewDoc(null)}
        >
          <div
            className="bg-card border border-border-default rounded-xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border-default">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-main p-2.5 rounded-lg flex-shrink-0">
                  <FileText className="h-5 w-5 text-brand-text" />
                </div>
                <div className="min-w-0">
                  <h2
                    className="text-base font-bold text-secondary truncate"
                    title={viewDoc.fileName}
                  >
                    {viewDoc.fileName}
                  </h2>
                  <p className="text-[11px] text-dim font-mono mt-0.5">
                    ID: {viewDoc.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDoc(null)}
                className="text-muted hover:text-error transition-colors p-1 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-dim">
                    Uploaded Document
                  </h3>
                </div>

                <div className="relative rounded-lg border-2 border-border-default overflow-hidden">
                  {(() => {
                    const dataUrl = viewFileData?.dataUrl;
                    if (dataUrl && isImageFile(viewDoc)) {
                      return (
                        <img
                          src={dataUrl}
                          alt={viewDoc.fileName}
                          className="w-full max-h-80 object-contain bg-terminal"
                          draggable={false}
                        />
                      );
                    }
                    if (dataUrl && isPdfFile(viewDoc)) {
                      return (
                        <iframe
                          src={dataUrl}
                          title={viewDoc.fileName}
                          className="w-full h-80 bg-white"
                        />
                      );
                    }
                    return (
                      <div className="bg-terminal flex flex-col items-center justify-center py-12 gap-3">
                        <FileIcon className="h-14 w-14 text-brand-text opacity-60" />
                        <p className="text-xs font-mono text-muted">
                          {dataUrl
                            ? `Preview not available for ${viewDoc.fileType}`
                            : 'No preview available'}
                        </p>
                        {dataUrl && (
                          <a
                            href={dataUrl}
                            download={viewDoc.fileName}
                            className="text-xs text-brand-text underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Download original
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-dim">
                  Status
                </span>
                {getStatusBadge(viewDoc.status)}
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-dim mb-2">
                  Metadata
                </h3>
                <div className="bg-main border border-border-light rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted">Document Type</span>
                    <span className="text-secondary font-medium">
                      {viewDoc.docType}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted">File Format</span>
                    <span className="text-secondary font-medium">
                      {viewDoc.fileType}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted">File Size</span>
                    <span className="text-secondary font-medium">
                      {(viewDoc.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted">Uploaded At</span>
                    <span className="text-secondary font-medium">
                      {formatDate(viewDoc.uploadedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted">Confidence</span>
                    <span
                      className={`font-medium ${
                        viewDoc.confidence >= 90
                          ? 'text-success'
                          : 'text-brand-text'
                      }`}
                    >
                      {viewDoc.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-dim mb-2">
                  Extracted Fields (
                  {viewDoc.fields ? Object.keys(viewDoc.fields).length : 0})
                </h3>
                {viewDoc.fields && Object.keys(viewDoc.fields).length > 0 ? (
                  <div className="bg-terminal border border-border-default rounded-lg p-4 font-mono text-xs space-y-1.5 max-h-64 overflow-y-auto">
                    {Object.entries(viewDoc.fields).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start gap-3 border-b border-border-default pb-1.5 last:border-b-0"
                      >
                        <span className="text-brand-text w-32 flex-shrink-0">
                          {key}:
                        </span>
                        <span className="text-secondary break-all">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-terminal border border-border-default rounded-lg p-4 text-center">
                    <p className="text-xs font-mono text-muted">
                      No fields extracted yet. Run OCR in the Workbench.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 p-4 border-t border-border-default">
              <div className="flex items-center gap-2">
                {viewFileData?.dataUrl && (
                  <a
                    href={viewFileData.dataUrl}
                    download={viewDoc.fileName}
                    className="flex items-center gap-1.5 bg-main border border-border-light text-secondary text-xs font-semibold px-4 py-2 rounded-lg hover:border-brand/50 transition-all"
                  >
                    <Download className="h-3.5 w-3.5 text-brand-text" /> Download
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewDoc(null)}
                  className="bg-main border border-border-light text-secondary text-xs font-semibold px-4 py-2 rounded-lg hover:border-brand/50 transition-all"
                >
                  Close
                </button>

                {viewDoc.status === 'Pending' && (
                  <button
                    onClick={() => sendToUpload(viewDoc)}
                    className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-primary text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                  >
                    <Upload className="h-3.5 w-3.5" /> Send to Upload
                  </button>
                )}

                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${viewDoc.fileName}"?`)) {
                      removeDocument(viewDoc.id);
                      setViewDoc(null);
                    }
                  }}
                  className="flex items-center gap-1.5 bg-error/20 text-error border border-error/40 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-error/30 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;