import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UploadCloud, FileText, Image as ImageIcon, FileJson, FileSpreadsheet,
  File, RotateCw, CheckCircle, XCircle, Download, ScanLine, RefreshCw, Trash2,
  Database, Activity
} from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';

const Upload = () => {
  const [activeFileType, setActiveFileType] = useState('PDF');
  const [activeDocType, setActiveDocType] = useState('Invoice');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [logs, setLogs] = useState([
    { type: 'info', message: 'Ready. Select or drop a file to begin.' }
  ]);
  const [status, setStatus] = useState('idle');
  const [extractedFields, setExtractedFields] = useState(null);
  const [savedDocId, setSavedDocId] = useState(null);

  const [workspaceId] = useState('aa9efc3f-baec-4cc3-bfa3-324bf3c855c');
  const [activeDocId, setActiveDocId] = useState(null);

  const fileInputRef = useRef(null);
  const processingStartRef = useRef(null);
  const { addDocument, updateDocument } = useDocuments();
  const [searchParams, setSearchParams] = useSearchParams();

  const fileTypes = [
    { id: 'PDF', icon: FileText, label: 'PDF', accept: '.pdf' },
    { id: 'Image', icon: ImageIcon, label: 'Image', accept: 'image/*' },
    { id: 'JSON', icon: FileJson, label: 'JSON', accept: '.json' },
    { id: 'CSV', icon: FileSpreadsheet, label: 'CSV', accept: '.csv' },
    { id: 'Word', icon: File, label: 'Word', accept: '.doc,.docx' },
    { id: 'Excel', icon: FileSpreadsheet, label: 'Excel', accept: '.xls,.xlsx' },
    { id: 'Other Format', icon: File, label: 'Other Format', accept: '*' },
  ];

  const activeType = fileTypes.find((t) => t.id === activeFileType);

  const docTypes = [
    {
      id: 'Invoice',
      fields: {
        Vendor: 'Acme Corp Ltd.',
        'Invoice number': 'INV-2026-1042',
        'Invoice date': '2026-08-15',
        'Due date': '2026-09-15',
        Currency: 'USD',
        'Line items': '3 items',
        Quantity: '12 units',
        'Unit price': '$1,040.00',
        Tax: '$2,246.40',
        Discount: '$150.00',
        Subtotal: '$12,480.00',
        Total: '$14,576.40',
      },
    },
    {
      id: 'Forms',
      fields: {
        Name: 'John Smith',
        Email: 'john.smith@example.com',
        Phone: '+1 (555) 123-4567',
        Address: '123 Main St, Springfield, IL',
        'Form ID': 'FRM-2026-0058',
        Date: '2026-08-15',
        'Selected options': 'Option A, Option C',
        'Custom fields': '2 custom fields',
      },
    },
    {
      id: 'Purchase Orders',
      fields: {
        'PO number': 'PO-884',
        Vendor: 'Acme Corp Ltd.',
        Buyer: 'Springfield Industrial Inc.',
        Date: '2026-08-12',
        Items: '5 items',
        Quantities: '48 units total',
        Prices: '$8,320.00 total',
        'Delivery information': 'Warehouse B, Dock 4',
        Total: '$8,320.00',
      },
    },
    {
      id: 'Contracts',
      fields: {
        Parties: 'Acme Corp Ltd. & Springfield Industrial Inc.',
        'Effective date': '2026-01-01',
        'Expiry date': '2027-12-31',
        'Renewal date': '2027-11-01',
        'Contract value': '$240,000.00',
        'Payment terms': 'Net 30',
        'Governing jurisdiction': 'State of Illinois',
        'Key clauses': '5 clauses identified',
      },
    },
    {
      id: 'Receipts',
      fields: {
        Merchant: 'Office Depot',
        Date: '2026-08-15',
        Items: '4 items',
        Tax: '$12.48',
        Total: '$124.80',
        'Payment method': 'Visa •••• 4242',
      },
    },
  ];

  const activeDoc = docTypes.find((d) => d.id === activeDocType);

  const addLog = (message, type = 'info') => {
    setLogs((prev) => [
      ...prev,
      { type, message, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  const readFileAsDataUrl = (f) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(f);
    });

  const resumePendingDocument = (doc) => {
    if (!doc || doc.status !== 'Pending') {
      addLog(
        `Cannot resume "${doc?.fileName || 'unknown'}" — only Pending documents can be re-opened.`,
        'error'
      );
      return;
    }

    const fakeFile = {
      name: doc.fileName,
      size: doc.fileSize,
      type: doc.fileType,
      _resumedFromId: doc.id,
    };

    setFile(fakeFile);
    setExtractedFields(doc.fields || null);
    setSavedDocId(doc.id);
    setActiveDocType(doc.docType || 'Invoice');
    setActiveFileType(doc.fileType || 'PDF');
    setStatus(doc.fields ? 'extracted' : 'idle');
    setActiveDocId(doc.id);

    addLog(
      `Resumed Pending document: ${doc.fileName} (ID: ${doc.id}) — ready for re-processing.`,
      'success'
    );
  };

  useEffect(() => {
    const resumeId = searchParams.get('resume');
    let docToResume = null;

    if (resumeId) {
      try {
        const stored = localStorage.getItem('docflow_documents');
        const all = stored ? JSON.parse(stored) : [];
        docToResume = all.find((d) => d.id === resumeId) || null;
      } catch {}
    }

    if (!docToResume) {
      try {
        const queued = sessionStorage.getItem('pendingResumeDoc');
        if (queued) {
          docToResume = JSON.parse(queued);
          sessionStorage.removeItem('pendingResumeDoc');
        }
      } catch {}
    }

    if (docToResume) {
      resumePendingDocument(docToResume);
      if (resumeId) setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    const isResumed = !!(selectedFile._resumedFromId);

    setFile(selectedFile);
    setExtractedFields(null);
    setStatus('idle');

    let dataUrl = null;
    if (!isResumed && selectedFile instanceof Blob) {
      try {
        dataUrl = await readFileAsDataUrl(selectedFile);
      } catch (err) {
        console.warn('Failed to read file as data URL:', err);
      }
    }

    const saved = addDocument({
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: activeFileType,
      docType: activeDocType,
      status: 'Pending',
      fields: null,
      confidence: null,
      dataUrl,
    });
    setSavedDocId(saved.id);
    setActiveDocId(saved.id);

    addLog(
      `File selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`,
      'success'
    );
    addLog(`Saved to Documents (ID: ${saved.id}) — Status: Pending.`, 'success');
  };

  const handleInputChange = (e) => handleFileSelect(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearFile = () => {
    setFile(null);
    setExtractedFields(null);
    setSavedDocId(null);
    setActiveDocId(null);
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
    addLog('File cleared.', 'info');
  };

  const simulateUploadAndExtract = () => {
    if (!file || !savedDocId) {
      addLog('No file selected. Please choose a file first.', 'error');
      return;
    }

    processingStartRef.current = Date.now();
    setStatus('processing');
    addLog(`Uploading ${file.name}...`, 'info');

    setTimeout(() => {
      addLog(`Running OCR extraction as "${activeDocType}"...`, 'info');
    }, 800);

    setTimeout(() => {
      const fields = activeDoc.fields;
      setExtractedFields(fields);
      setStatus('extracted');

      updateDocument(savedDocId, {
        fields,
        confidence: Math.floor(85 + Math.random() * 14),
      });

      addLog(
        `OCR complete. ${Object.keys(fields).length} fields extracted.`,
        'success'
      );
    }, 2000);
  };

  const triggerOCR = () => {
    if (!file) {
      addLog('No file to process.', 'error');
      return;
    }
    setStatus('processing');
    addLog('Triggering OCR (incremental)...', 'info');
    setTimeout(() => {
      setExtractedFields(activeDoc.fields);
      setStatus('extracted');
      if (savedDocId) {
        updateDocument(savedDocId, {
          fields: activeDoc.fields,
          confidence: Math.floor(85 + Math.random() * 14),
        });
      }
      addLog('OCR complete.', 'success');
    }, 1500);
  };

  const forceOCR = () => {
    if (!file) {
      addLog('No file to process.', 'error');
      return;
    }
    setStatus('processing');
    addLog('Forcing OCR (full re-scan)...', 'info');
    setTimeout(() => {
      setExtractedFields(activeDoc.fields);
      setStatus('extracted');
      if (savedDocId) {
        updateDocument(savedDocId, {
          fields: activeDoc.fields,
          confidence: Math.floor(85 + Math.random() * 14),
        });
      }
      addLog('Forced OCR complete.', 'success');
    }, 1800);
  };

  const approve = async () => {
    if (!savedDocId) {
      addLog('No pending document to approve.', 'error');
      return;
    }
    if (!extractedFields) {
      addLog('No extracted fields to approve.', 'error');
      return;
    }

    setStatus('approved');
    updateDocument(savedDocId, { status: 'Approved' });

    let dataUrl = null;
    if (file && !file._resumedFromId && file instanceof Blob) {
      dataUrl = await readFileAsDataUrl(file);
    } else if (file && file._resumedFromId) {
      try {
        const docs = JSON.parse(localStorage.getItem('docflow_documents') || '[]');
        const match = docs.find((d) => d.id === file._resumedFromId);
        dataUrl = match?.dataUrl || null;
      } catch {}
    }

    const approvedFile = {
      name: file?.name || 'document',
      size: file?.size || 0,
      fileType: activeFileType,
      docType: activeDocType,
      dataUrl,
      rawText: JSON.stringify(extractedFields, null, 2),
      erpData: extractedFields,
      approvedAt: new Date().toISOString(),
      documentId: savedDocId,
    };

    try {
      localStorage.setItem('lastApprovedFile', JSON.stringify(approvedFile));

      const history = JSON.parse(
        localStorage.getItem('approvedFilesHistory') || '[]'
      );
      if (!history.some((h) => h.documentId === approvedFile.documentId)) {
        history.push(approvedFile);
        localStorage.setItem(
          'approvedFilesHistory',
          JSON.stringify(history.slice(-200))
        );
      }

      if (processingStartRef.current) {
        const elapsed = (Date.now() - processingStartRef.current) / 1000;
        const times = JSON.parse(
          localStorage.getItem('processingTimes') || '[]'
        );
        times.push(Number(elapsed.toFixed(2)));
        localStorage.setItem(
          'processingTimes',
          JSON.stringify(times.slice(-100))
        );
        processingStartRef.current = null;
      }

      window.dispatchEvent(
        new CustomEvent('approvedFileUpdated', { detail: approvedFile })
      );
      addLog('Document APPROVED. Saved to Audit Log for download.', 'success');
    } catch (err) {
      console.error('Failed to persist approved file:', err);
      addLog(
        'Approved, but failed to persist for Audit Log (file too large?).',
        'error'
      );
    }
  };

  const reject = () => {
    if (!savedDocId) {
      addLog('No pending document to reject.', 'error');
      return;
    }
    setStatus('rejected');
    setExtractedFields(null);
    updateDocument(savedDocId, { status: 'Rejected' });
    addLog('Document REJECTED. Status synced to Documents.', 'error');
  };

  const refreshFields = () => {
    if (!extractedFields) {
      addLog('No fields to refresh.', 'error');
      return;
    }
    addLog('Refreshing extracted fields...', 'info');
    setTimeout(() => {
      setExtractedFields(activeDoc.fields);
      addLog('Fields refreshed.', 'success');
    }, 600);
  };

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

  const exportData = (format) => {
    if (!extractedFields) {
      addLog('No data to export.', 'error');
      return;
    }

    const base = (file?.name || 'extracted').replace(/\.[^/.]+$/, '');

    if (format === 'JSON') {
      triggerDownload(
        JSON.stringify(extractedFields, null, 2),
        `${base}_erp.json`,
        'application/json'
      );
    } else if (format === 'CSV') {
      const rows = Object.entries(extractedFields).map(
        ([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`
      );
      triggerDownload(
        ['"Field","Value"', ...rows].join('\n'),
        `${base}_erp.csv`,
        'text/csv'
      );
    } else {
      triggerDownload(
        JSON.stringify(extractedFields, null, 2),
        `${base}_raw.txt`,
        'text/plain'
      );
    }

    addLog(`${format} export downloaded.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
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
            <span
              className={`px-2 py-1 rounded border font-mono ${
                activeDocId
                  ? 'bg-brand/10 border-brand/30 text-brand-text'
                  : 'bg-main border-border-light text-dim italic'
              }`}
            >
              {activeDocId || 'Upload or select from Documents...'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Upload */}
        <div className="bg-card border border-border-default rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <UploadCloud className="h-5 w-5 text-brand-text" />
            <h2 className="text-lg font-bold text-secondary">
              Document Upload & Multi-Format Processing
            </h2>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-dim mb-2 block">
              Document Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {docTypes.map((doc) => {
                const isActive = activeDocType === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setActiveDocType(doc.id);
                      setExtractedFields(null);
                      setStatus('idle');
                      addLog(`Document type set to "${doc.id}".`, 'info');
                    }}
                    className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? 'bg-success/20 text-success border border-success/40'
                        : 'bg-main border border-border-light text-muted hover:text-secondary hover:border-success/30'
                    }`}
                  >
                    {doc.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-bold uppercase tracking-wider text-dim mb-2 block">
              File Format
            </label>
            <div className="grid grid-cols-4 gap-2">
              {fileTypes.map((type) => {
                const Icon = type.icon;
                const isActive = activeFileType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setActiveFileType(type.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-brand text-primary shadow-lg shadow-brand/20'
                        : 'bg-main border border-border-light text-muted hover:text-secondary hover:border-brand/50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={activeType.accept}
            onChange={handleInputChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center mb-6 transition-colors cursor-pointer ${
              isDragging
                ? 'border-brand bg-brand/5'
                : 'border-border-light hover:border-brand/50'
            }`}
          >
            <div className="bg-main p-4 rounded-xl mb-4">
              <FileText className="h-10 w-10 text-brand-text" />
            </div>
            <p className="text-sm font-semibold text-secondary mb-1">
              {isDragging ? 'Drop file here' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs text-dim">{activeFileType} up to 25MB</p>
          </div>

          <div className="bg-main border border-border-light rounded-lg p-3 flex items-center justify-between mb-6 gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {file ? (
                <>
                  <FileText className="h-4 w-4 text-brand-text flex-shrink-0" />
                  <span className="text-xs text-secondary truncate">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-dim flex-shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted">No file selected</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {file && (
                <button
                  onClick={clearFile}
                  className="text-muted hover:text-error transition-colors p-1"
                  title="Remove file"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={simulateUploadAndExtract}
                disabled={!file || status === 'processing'}
                className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                  !file || status === 'processing'
                    ? 'bg-border-default text-muted cursor-not-allowed'
                    : 'bg-brand hover:bg-brand-hover text-primary'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                {status === 'processing' ? 'Processing...' : 'Upload & Extract'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={triggerOCR}
              disabled={!file}
              className="flex items-center justify-center gap-2 bg-main border border-border-light text-secondary text-xs font-semibold px-4 py-2.5 rounded-lg hover:border-brand/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ScanLine className="h-3.5 w-3.5 text-brand-text" /> Trigger OCR
            </button>

            <button
              onClick={forceOCR}
              disabled={!file}
              className="flex items-center justify-center gap-2 bg-main border border-border-light text-secondary text-xs font-semibold px-4 py-2.5 rounded-lg hover:border-brand/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCw className="h-3.5 w-3.5 text-brand-text" /> Force OCR
            </button>

            {/* ✅ Approve — only enabled after OCR extraction completes */}
            <button
              onClick={approve}
              disabled={status !== 'extracted' || !extractedFields || !savedDocId}
              className={`flex items-center justify-center gap-2 text-primary text-xs font-semibold px-4 py-2.5 rounded-lg transition-all ${
                status !== 'extracted' || !extractedFields || !savedDocId
                  ? 'bg-border-default cursor-not-allowed'
                  : 'bg-success hover:opacity-90'
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve
            </button>

            {/* ✅ Reject — only enabled after OCR extraction completes */}
            <button
              onClick={reject}
              disabled={status !== 'extracted' || !savedDocId}
              className={`flex items-center justify-center gap-2 text-primary text-xs font-semibold px-4 py-2.5 rounded-lg transition-all ${
                status !== 'extracted' || !savedDocId
                  ? 'bg-border-default cursor-not-allowed'
                  : 'bg-error hover:opacity-90'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          </div>

          <div className="flex items-center justify-between bg-main border border-border-light rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              <Download className="h-3.5 w-3.5 text-brand-text" /> ERP Data Export:
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportData('JSON')}
                disabled={!extractedFields}
                className="flex items-center gap-1.5 bg-brand/20 text-brand-text border border-brand-border text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded hover:bg-brand/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileJson className="h-3 w-3" /> JSON
              </button>
              <button
                onClick={() => exportData('CSV')}
                disabled={!extractedFields}
                className="flex items-center gap-1.5 bg-success/20 text-success border border-success/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded hover:bg-success/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="h-3 w-3" /> CSV
              </button>
              <button
                onClick={() => exportData('TXT')}
                disabled={!extractedFields}
                className="flex items-center gap-1.5 bg-brand/20 text-brand-text border border-brand-border text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded hover:bg-brand/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <File className="h-3 w-3" /> TXT
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Extracted Fields */}
        <div className="bg-card border border-border-default rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-success" />
              <h2 className="text-lg font-bold text-secondary">
                {activeDocType} Extract
              </h2>
            </div>
            <button
              onClick={refreshFields}
              disabled={!extractedFields}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-text hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Fields
            </button>
          </div>

          <div className="flex-1 bg-terminal border border-border-default rounded-lg p-5 min-h-[400px] font-mono text-sm overflow-y-auto">
            {!extractedFields && status !== 'processing' && (
              <p className="text-dim">
                Select or upload a document to view OCR field extraction
                details...
              </p>
            )}
            {status === 'processing' && (
              <p className="text-brand-text animate-pulse">
                ⟳ Processing document as "{activeDocType}"...
              </p>
            )}
            {extractedFields && (
              <div className="space-y-2">
                <div className="text-success mb-4">
                  // {activeDocType} Extract —{' '}
                  {Object.keys(extractedFields).length} fields
                </div>
                {Object.entries(extractedFields).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start gap-4 border-b border-border-default pb-2"
                  >
                    <span className="text-brand-text w-40 flex-shrink-0">
                      {key}:
                    </span>
                    <span className="text-secondary">{value}</span>
                  </div>
                ))}
              </div>
            )}
            {status === 'approved' && (
              <div className="mt-4 text-success font-bold">
                ✓ Document approved and exported.
              </div>
            )}
            {status === 'rejected' && (
              <div className="mt-4 text-error font-bold">
                ✗ Document rejected.
              </div>
            )}
          </div>

          <div className="mt-4 bg-main border border-border-light rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`${
                  log.type === 'error'
                    ? 'text-error'
                    : log.type === 'success'
                    ? 'text-success'
                    : 'text-dim'
                }`}
              >
                <span className="text-muted">[{log.timestamp || ''}]</span>{' '}
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;