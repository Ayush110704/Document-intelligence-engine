import React, { useState, useEffect } from 'react';
import {
  Workflow as WorkflowIcon,
  GitBranch,
  Loader2,
  Database,
  Activity
} from 'lucide-react';

const Workflow = () => {
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);

  //  Active Doc IDs
  const [workspaceId] = useState('aa9efc3f-baec-4cc3-bfa3-324bf3c855c');
  const [activeDocId, setActiveDocId] = useState(null);
 
  const readApproved = () => {
    const stored = localStorage.getItem('lastApprovedFile');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };
 
  useEffect(() => {
    const syncActiveDoc = () => {
      const doc = readApproved();
      if (doc?.documentId) {
        setActiveDocId(doc.documentId);
      } else {
        setActiveDocId(null);
      }
    };

    syncActiveDoc();

    const handler = () => {
      syncActiveDoc();
      fetchWorkflows();
    };
    window.addEventListener('approvedFileUpdated', handler);
    return () => window.removeEventListener('approvedFileUpdated', handler);
  }, []);
 
  const createWorkflow = () => {
    setLoading(true);
    setOutput(null);

    setTimeout(() => {
      const doc = readApproved();

      if (!doc) {
        setOutput({
          error: 'No approved document available',
          hint: 'Approve a document in the Workbench before creating a workflow.',
        });
        setLoading(false);
        return;
      }

      setOutput({
        id: 'wf_' + Math.random().toString(36).substring(2, 10),
        name: 'ON_DOCUMENT_APPROVED',
        status: 'registered',
        createdAt: new Date().toISOString(),
        trigger: 'document.approved',
        sourceDocument: {
          id: doc.documentId,
          fileName: doc.name,
          docType: doc.docType,
          approvedAt: doc.approvedAt,
        },
        actions: [
          { type: 'notify', target: 'erp@company.com' },
          { type: 'webhook', url: 'https://erp.example.com/hook' },
          {
            type: 'erp.sync',
            system: 'Tally / SAP / Zoho',
            payload: doc.erpData,
          },
        ],
      });
      setLoading(false);
    }, 900);
  };

  //  Fetch registered workflows 
  const fetchWorkflows = () => {
    setLoading(true);
    setOutput(null);

    setTimeout(() => {
      const doc = readApproved();

      if (!doc) {
        setOutput({
          error: 'No registered workflows',
          hint: 'Approve a document in the Workbench, then create a workflow.',
        });
        setLoading(false);
        return;
      }

      setOutput({
        total: 1,
        workflows: [
          {
            id: 'wf_registered_001',
            name: 'ON_DOCUMENT_APPROVED',
            status: 'active',
            trigger: 'document.approved',
            lastTriggeredBy: {
              documentId: doc.documentId,
              fileName: doc.name,
              docType: doc.docType,
              approvedAt: doc.approvedAt,
            },
            payload: doc.erpData,
            actions: [
              { type: 'notify', target: 'erp@company.com' },
              { type: 'webhook', url: 'https://erp.example.com/hook' },
            ],
          },
        ],
      });
      setLoading(false);
    }, 900);
  };

  return (
    <div className="space-y-6">

      {/* TOP HEADER: Workspace ID, Active Doc ID */}
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

      {/* WORKFLOW CARD */}
      <div className="bg-card border border-border-default rounded-xl p-6">

        {/* Card Header */}
        <div className="flex items-center gap-2 mb-6">
          <WorkflowIcon className="h-5 w-5 text-brand-text" />
          <h2 className="text-lg font-bold text-secondary">
            Active Workflows & Trigger Rules
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={createWorkflow}
            disabled={loading}
            className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-primary text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-brand/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Create ON_DOCUMENT_APPROVED Workflow
          </button>

          <button
            onClick={fetchWorkflows}
            disabled={loading}
            className="flex items-center gap-2 bg-main border border-border-light text-secondary text-xs font-semibold px-4 py-2.5 rounded-lg hover:border-brand/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 text-brand-text animate-spin" />
            ) : (
              <WorkflowIcon className="h-3.5 w-3.5 text-brand-text" />
            )}
            Fetch Registered Workflows
          </button>
        </div>

        {/* Output Panel */}
        <div className="bg-terminal border border-border-default rounded-lg p-5 min-h-[400px] font-mono text-sm overflow-y-auto">
          {!output && !loading && (
            <p className="text-dim">
              Click a button above to create or fetch workflows...
            </p>
          )}

          {loading && (
            <p className="text-brand-text animate-pulse">
              ⟳ Communicating with backend...
            </p>
          )}

          {output && (
            <pre className="text-secondary whitespace-pre-wrap">
{JSON.stringify(output, null, 2)}
            </pre>
          )}
        </div>

      </div>
    </div>
  );
};

export default Workflow;