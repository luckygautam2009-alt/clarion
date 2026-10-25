import { getAdminSession } from '../auth/adminSession';
import { useState } from 'react';
import { X, ShieldCheck, FileDown, CheckCircle2 } from 'lucide-react';

function buildReportText(caseData, verifyInfo) {
  const { customerId, complaintText, analysis, rootCause, decision, handoff } = caseData;
  const now = new Date().toLocaleString();

  return `CLARION — CASE VERIFICATION REPORT
Generated: ${now}
================================================

CASE
Customer ID: ${customerId}
Complaint: ${complaintText}

ANALYSIS
Intent: ${analysis?.intent || 'N/A'}${analysis?.subIntent ? ' / ' + analysis.subIntent : ''}
Sentiment: ${analysis?.sentiment || 'N/A'}
Urgency: ${analysis?.urgency || 'N/A'}

ROOT CAUSE
${rootCause?.rootCause || 'N/A'}
Matched Policy: ${rootCause?.matchedPolicy || 'None'}
Confidence: ${rootCause?.confidence ?? 'N/A'}%

SYSTEM DECISION
${decision?.decision || 'N/A'}
Reasoning: ${decision?.reasoning || 'N/A'}

RECOMMENDED ACTION
${handoff?.agentSummary?.recommendedAction || handoff?.suggestedAction || handoff?.actionTaken || 'N/A'}

------------------------------------------------
MANUAL VERIFICATION
------------------------------------------------
Verified By: ${verifyInfo.adminName}
Admin ID / Employee ID: ${verifyInfo.employeeId}
Status: MANUALLY VERIFIED
Verified At: ${now}

================================================
This report was generated automatically by CLARION RootCause AI.
`;
}

function downloadReport(text, customerId) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CLARION-Report-${customerId}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function VerifyModal({ data, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'report'
  const [adminName, setAdminName] = useState(() => (getAdminSession() || {}).name || '');
  const [employeeId, setEmployeeId] = useState('');
  const [formError, setFormError] = useState(null);
  const [reportText, setReportText] = useState('');

  function handleConfirm(e) {
    e.preventDefault();
    setFormError(null);
    if (!adminName.trim() || !employeeId.trim()) {
      setFormError('Admin Name and Admin ID / Employee ID are required.');
      return;
    }
    const text = buildReportText(data, {
      adminName: adminName.trim(),
      employeeId: employeeId.trim(),
    });
    setReportText(text);
    setStep('report');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-ink-light border border-border-strong rounded-2xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-paper cursor-pointer p-1 rounded-lg hover:bg-ink-lighter transition-colors" aria-label="Close dialog">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl font-extrabold text-paper tracking-tight">Manual Verification</h3>
            <p className="text-xs font-medium text-muted">Generate certified case audit report</p>
          </div>
        </div>

        {step === 'form' && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-paper/90 mb-1.5">Admin Name</label>
              <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g. Yash Gautam"
                className="w-full bg-ink-inset border border-border-strong rounded-xl px-3.5 py-2.5 text-sm font-semibold text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-paper/90 mb-1.5">Admin ID / Employee ID</label>
              <input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-2026-001"
                className="w-full bg-ink-inset border border-border-strong rounded-xl px-3.5 py-2.5 text-sm font-semibold text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            {formError && (
              <p className="text-xs text-alert bg-alert-dim border border-alert/30 rounded-xl px-3.5 py-2.5 font-bold">{formError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-primary hover:bg-[#265B55] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-xs active:scale-[0.98] neon-glow-teal"
            >
              Confirm Manual Verification
            </button>
          </form>
        )}

        {step === 'report' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-verified">
              <CheckCircle2 className="w-5 h-5" />
              Case Report Ready
            </div>
            <pre className="text-sm text-paper bg-ink-inset border border-border-strong rounded-xl p-5 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto font-sans font-medium">
              {reportText}
            </pre>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadReport(reportText, data.customerId)}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-[#265B55] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-xs active:scale-[0.98] neon-glow-teal"
              >
                <FileDown className="w-4 h-4" /> Download Report
              </button>
              <button
                type="button"
                onClick={onClose}
                className="sm:w-32 bg-ink-lighter border border-border-strong text-paper font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-ink-light transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
