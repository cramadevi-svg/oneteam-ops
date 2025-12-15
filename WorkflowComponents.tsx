import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, Mail, AlertCircle, ArrowRight, UserCheck, ShieldAlert, AtSign, Send, FileText, Edit3, Activity, ChevronDown, ChevronUp, Type } from 'lucide-react';
import { WorkflowStep, StepStatus, Department, HistoryEvent } from '../types.ts';

// --- Icons ---
export const StatusIcon = ({ status }: { status: StepStatus }) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-6 h-6 text-green-500" />;
    case 'in_progress': return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
    case 'skipped': return <AlertCircle className="w-6 h-6 text-gray-400" />;
    default: return <Circle className="w-6 h-6 text-gray-300" />;
  }
};

// --- Department Badge ---
const DepartmentBadge = ({ dept }: { dept: Department }) => {
  const colors: Record<Department, string> = {
    OSI: 'bg-blue-100 text-blue-800 border-blue-200',
    ABC: 'bg-orange-100 text-orange-800 border-orange-200',
    GFS: 'bg-green-100 text-green-800 border-green-200',
    Manager: 'bg-purple-100 text-purple-800 border-purple-200',
    NewHolder: 'bg-teal-100 text-teal-800 border-teal-200',
    MD: 'bg-red-100 text-red-800 border-red-200',
    System: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colors[dept] || colors.System} uppercase tracking-wide`}>
      {dept}
    </span>
  );
};

// --- Step Card ---
interface StepCardProps {
  step: WorkflowStep;
  isActive: boolean;
  isLast: boolean;
  onAction: () => void;
  onInputChange?: (value: string) => void;
  viewRole: Department | 'Admin';
}

export const StepCard: React.FC<StepCardProps> = ({ step, isActive, isLast, onAction, onInputChange, viewRole }) => {
  const isMe = viewRole === 'Admin' || step.department === viewRole;
  const isCurrentGlobalStep = isActive; // This step is the active one in the ticket flow
  
  // Logic:
  // 1. Show details if it belongs to me OR it is the currently active step (so I have context on what's stuck).
  // 2. Interact if it belongs to me AND it is the currently active step.
  const showDetails = isMe || isCurrentGlobalStep;
  const canInteract = isMe && isCurrentGlobalStep;

  return (
    <div className={`relative flex gap-4 transition-all duration-300 ${!isMe && !isCurrentGlobalStep ? 'opacity-50' : 'opacity-100'}`}>
      {/* Connector Line */}
      {!isLast && (
        <div className={`absolute left-[11px] top-8 bottom-[-16px] w-0.5 ${step.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'}`} />
      )}

      <div className="flex-shrink-0 mt-1">
        <StatusIcon status={step.status} />
      </div>

      <div className={`flex-grow border-b border-gray-100 ${showDetails ? 'pb-6' : 'pb-4'}`}>
        <div className={`flex justify-between items-center mb-1 ${!showDetails ? 'py-1' : ''}`}>
          <div className="flex items-center gap-3">
             <h3 className={`font-semibold ${showDetails ? 'text-lg' : 'text-sm'} ${canInteract ? 'text-blue-900' : 'text-gray-600'}`}>
               {step.title}
             </h3>
             {/* Show badge next to title if collapsed */}
             {!showDetails && <DepartmentBadge dept={step.department} />}
          </div>
          {/* Show badge on right if expanded */}
          {showDetails && <DepartmentBadge dept={step.department} />}
        </div>
        
        {showDetails && (
            <div className={`mt-2 ${isCurrentGlobalStep ? 'bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm' : ''}`}>
                <p className="text-sm text-gray-600 mb-3">{step.description}</p>

                {/* Interactive Area */}
                {isCurrentGlobalStep && (
                  <div className="mt-4 space-y-3">
                    {step.requiresInput && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {step.inputLabel || "Required Information"}
                        </label>
                        {canInteract ? (
                            <input
                              type="text"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="Enter details..."
                              value={step.inputValue || ''}
                              onChange={(e) => onInputChange && onInputChange(e.target.value)}
                            />
                        ) : (
                            <div className="text-sm text-gray-500 italic bg-white/50 p-2 rounded border border-gray-200">
                                {step.inputValue || "Waiting for input..."}
                            </div>
                        )}
                      </div>
                    )}

                    {canInteract ? (
                        <button
                          onClick={onAction}
                          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm
                            ${step.type === 'email_draft' 
                              ? 'bg-purple-600 text-white hover:bg-purple-700' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {step.type === 'email_draft' && <Mail className="w-4 h-4" />}
                          {step.type === 'approval' && <ShieldAlert className="w-4 h-4" />}
                          {step.type === 'input' && <ArrowRight className="w-4 h-4" />}
                          {step.type === 'manual' && <CheckCircle className="w-4 h-4" />}
                          
                          {step.type === 'email_draft' ? "Draft Email with AI" : "Complete Step"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">Waiting for {step.department} to complete this step...</span>
                        </div>
                    )}
                  </div>
                )}

                {/* Display input value for completed steps */}
                {!isCurrentGlobalStep && step.status === 'completed' && step.inputValue && (
                  <div className="mt-2 text-sm bg-gray-50 border border-gray-200 p-2 rounded text-gray-700 flex items-center gap-2">
                    <span className="font-semibold text-gray-500">{step.inputLabel || "Value"}:</span>
                    <span>{step.inputValue}</span>
                  </div>
                )}
                
                {step.completedAt && (
                    <div className="text-xs text-gray-400 mt-2">Completed: {new Date(step.completedAt).toLocaleString()}</div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

// --- Email Preview Modal ---
interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (content: string, to: string, cc: string) => void;
  isLoading: boolean;
  initialContent: string;
}

export const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, onSend, isLoading, initialContent }) => {
  const [content, setContent] = useState(initialContent);
  const [subject, setSubject] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [ccAddress, setCcAddress] = useState('');

  useEffect(() => {
    // Attempt to extract subject from AI generated draft if present
    const subjectMatch = initialContent.match(/Subject: (.*)/);
    if (subjectMatch) {
      setSubject(subjectMatch[1].trim());
      // Remove the subject line from the body for cleaner editing
      setContent(initialContent.replace(/Subject: .*\n?/, '').trim());
    } else {
      setSubject("One Team Personnel Change");
      setContent(initialContent);
    }
    
    setToAddress('');
    setCcAddress('');
  }, [initialContent, isOpen]);

  if (!isOpen) return null;

  const handleSendAndComplete = () => {
    // 1. Trigger the mailto link to open default email client
    const body = encodeURIComponent(content);
    const subjectEnc = encodeURIComponent(subject);
    
    // Construct the mailto link
    const mailtoLink = `mailto:${toAddress}?cc=${ccAddress}&subject=${subjectEnc}&body=${body}`;
    
    // Open the email client
    window.location.href = mailtoLink;

    // 2. Complete the step in the application
    // Recombine subject and content for the history log
    const fullLogContent = `Subject: ${subject}\n\n${content}`;
    onSend(fullLogContent, toAddress, ccAddress);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            Review Email Draft
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
               <p className="text-gray-500 animate-pulse">Consulting Gemini for best phrasing...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                 <div className="relative">
                    <AtSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="To: (e.g., support@osi.com)"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                    />
                 </div>
                 <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">CC</span>
                    <input 
                      type="text" 
                      placeholder="CC: (e.g., manager@company.com)"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      value={ccAddress}
                      onChange={(e) => setCcAddress(e.target.value)}
                    />
                 </div>
                 <div className="relative">
                    <Type className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Subject"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                 </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email Body</label>
                <textarea 
                  className="w-full h-56 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm leading-relaxed resize-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end items-center bg-gray-50 rounded-b-xl gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSendAndComplete}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            Send Email & Complete Step
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Activity Log Component ---
interface ActivityLogProps {
  history: HistoryEvent[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ history }) => {
  // Sort history newest first
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});

  const toggleEmail = (id: string) => {
    setExpandedEmails(prev => ({...prev, [id]: !prev[id]}));
  };

  return (
    <div className="space-y-6">
      {sortedHistory.length === 0 && (
        <div className="text-center text-gray-400 py-8">No activity recorded yet.</div>
      )}
      
      {sortedHistory.map((event) => {
        const date = new Date(event.timestamp);
        
        let Icon = Activity;
        let colorClass = "bg-gray-100 text-gray-600";
        
        switch(event.type) {
          case 'email_sent':
            Icon = Mail;
            colorClass = "bg-purple-100 text-purple-600";
            break;
          case 'step_completed':
            Icon = CheckCircle;
            colorClass = "bg-green-100 text-green-600";
            break;
          case 'input_logged':
            Icon = Edit3;
            colorClass = "bg-blue-100 text-blue-600";
            break;
          case 'ticket_created':
            Icon = FileText;
            colorClass = "bg-orange-100 text-orange-600";
            break;
        }

        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex-shrink-0 relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass} shadow-sm z-10 relative`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-100 -z-0 last:hidden" />
            </div>
            
            <div className="flex-grow pb-4">
               <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <span className="text-xs text-gray-400">{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                  </div>
                  
                  {event.description && <p className="text-sm text-gray-600 mb-2">{event.description}</p>}
                  
                  {/* Metadata Display */}
                  {event.type === 'email_sent' && event.metadata && (
                    <div className="mt-2 bg-gray-50 rounded border border-gray-200 text-sm overflow-hidden">
                       <div className="p-2 border-b border-gray-200 flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500">To: <span className="text-gray-800">{event.metadata.emailTo || 'N/A'}</span></div>
                            <div className="text-xs text-gray-500">CC: <span className="text-gray-800">{event.metadata.emailCc || 'N/A'}</span></div>
                          </div>
                          <button onClick={() => toggleEmail(event.id)} className="text-gray-400 hover:text-gray-600">
                             {expandedEmails[event.id] ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                          </button>
                       </div>
                       {expandedEmails[event.id] && (
                         <div className="p-3 bg-white font-mono text-xs text-gray-600 whitespace-pre-wrap">
                           {event.metadata.emailBody}
                         </div>
                       )}
                    </div>
                  )}

                  {event.type === 'input_logged' && event.metadata && (
                    <div className="mt-2 text-sm bg-blue-50 text-blue-800 p-2 rounded border border-blue-100 inline-block">
                       Value: <span className="font-medium">{event.metadata.inputValue}</span>
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center gap-2">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Actor:</span>
                     <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">{event.actor}</span>
                  </div>
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};