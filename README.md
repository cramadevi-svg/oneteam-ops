import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Layout,
  Users,
  AlertTriangle,
  History,
  RotateCcw,
  Eye,
  Activity,
  Filter
} from 'lucide-react';
import { Ticket, WorkflowStep, EmailTemplateType, Department, HistoryEvent } from './types';
import { StepCard, EmailModal, ActivityLog } from './components/WorkflowComponents';
import { generateEmailDraft } from './services/geminiService';

// --- Initial Data based on Workflow Diagrams ---
const INITIAL_STEPS: WorkflowStep[] = [
  {
    id: '1',
    title: 'Notify OSI & PayIt',
    description: 'Manager notifies OSI/PayIt support of personnel change and XPo configuration needs.',
    status: 'pending',
    type: 'email_draft',
    emailType: 'manager_notify_osi',
    department: 'Manager'
  },
  {
    id: '2',
    title: 'Flag Member & Delegates',
    description: 'OSI receives notification (SNow) and flags member for removal. Auto-flag ABC delegates.',
    status: 'pending',
    type: 'manual',
    department: 'OSI'
  },
  {
    id: '3',
    title: 'Confirm ABC Transactions',
    description: 'ABC confirms pending transactions and delegate training status.',
    status: 'pending',
    type: 'manual',
    department: 'ABC'
  },
  {
    id: '3b',
    title: 'Delegate Training Confirmation',
    description: 'Send confirmation email to delegates regarding their completed training.',
    status: 'pending',
    type: 'email_draft',
    emailType: 'delegate_training_confirmation',
    department: 'ABC'
  },
  {
    id: '4',
    title: 'Retire Delegate & Configure XPo',
    description: 'Request GFS to retire the delegate relationship.',
    status: 'pending',
    type: 'email_draft',
    emailType: 'gfs_retire',
    department: 'OSI' // OSI triggers this request to GFS
  },
  {
    id: '5',
    title: 'Manager Replacement Inquiry',
    description: 'Auto-draft email to manager asking for replacement name.',
    status: 'pending',
    type: 'email_draft',
    emailType: 'manager_replacement_req',
    department: 'OSI'
  },
  {
    id: '6',
    title: 'Input Replacement Name',
    description: 'Record the new P-Card holder name provided by the manager.',
    status: 'pending',
    type: 'input',
    inputLabel: 'Replacement Name',
    requiresInput: true,
    department: 'Manager'
  },
  {
    id: '7',
    title: 'Confirm Catering Role',
    description: 'New Holder confirms catering duties and role fit.',
    status: 'pending',
    type: 'email_draft', // Sending the verification email
    emailType: 'verification_catering',
    department: 'NewHolder' // Technically OSI sends, but it's a NewHolder interaction step
  },
  {
    id: '8',
    title: 'Establish Delegates',
    description: 'Request ABC Manager to provide list of delegates.',
    status: 'pending',
    type: 'email_draft',
    emailType: 'abc_mgr_delegates',
    department: 'ABC'
  },
  {
    id: '9',
    title: 'MD Approval',
    description: 'Request MD approval for new delegate relationship.',
    status: 'pending',
    type: 'email_draft',
    emailType: 'md_approval',
    department: 'MD'
  },
  {
    id: '10',
    title: 'Final XPo Configuration',
    description: 'Forward approval to GFS for final configuration.',
    status: 'pending',
    type: 'email_draft',
    emailType: 'gfs_config',
    department: 'GFS'
  },
  {
    id: '11',
    title: 'Training & Closure',
    description: 'Provide POS training and close the request.',
    status: 'pending',
    type: 'email_draft',
    emailType: 'training_confirmation',
    department: 'OSI'
  }
];

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'T-1024',
    employeeName: 'Sarah Jenkins',
    managerName: 'Mike Ross',
    snowTicketId: 'INC-882391',
    role: 'One Team Coordinator',
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'active',
    currentStepIndex: 0,
    steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),
    history: [
      {
        id: 'h-1',
        timestamp: new Date().toISOString(),
        type: 'ticket_created',
        title: 'Ticket Created',
        description: 'Ticket initialized for Sarah Jenkins personnel change.',
        actor: 'System'
      }
    ]
  }
];

export default function App() {
  // Load from LocalStorage or use Mock
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem('oneteam_tickets');
      return saved ? JSON.parse(saved) : MOCK_TICKETS;
    } catch (e) {
      return MOCK_TICKETS;
    }
  });
  
  const [activeTicketId, setActiveTicketId] = useState<string>(() => {
      const savedTickets = localStorage.getItem('oneteam_tickets');
      if (savedTickets) {
          const parsed = JSON.parse(savedTickets);
          return parsed.length > 0 ? parsed[0].id : '';
      }
      return MOCK_TICKETS[0].id;
  });

  const [viewRole, setViewRole] = useState<Department | 'Admin'>('Admin');
  const [activeTab, setActiveTab] = useState<'timeline' | 'history'>('timeline');
  const [showMyStepsOnly, setShowMyStepsOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [currentEmailDraft, setCurrentEmailDraft] = useState('');
  
  useEffect(() => {
    localStorage.setItem('oneteam_tickets', JSON.stringify(tickets));
  }, [tickets]);

  const activeTicket = tickets.find(t => t.id === activeTicketId);

  const resetData = () => {
    if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      localStorage.removeItem('oneteam_tickets');
      setTickets(MOCK_TICKETS);
      setActiveTicketId(MOCK_TICKETS[0].id);
      window.location.reload(); 
    }
  };

  const addHistoryEvent = (ticketId: string, event: Omit<HistoryEvent, 'id' | 'timestamp'>) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const newEvent: HistoryEvent = {
        id: `h-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...event
      };
      return { ...t, history: [...t.history, newEvent] };
    }));
  };

  const handleStepAction = async (ticket: Ticket, step: WorkflowStep) => {
    if (step.type === 'email_draft') {
      setIsModalOpen(true);
      setEmailLoading(true);
      const draft = await generateEmailDraft({
        templateType: step.emailType!,
        employeeName: ticket.employeeName,
        managerName: ticket.managerName,
        replacementName: ticket.replacementName,
        ticketId: ticket.id
      });
      setCurrentEmailDraft(draft);
      setEmailLoading(false);
    } else if (step.type === 'input') {
       if (!step.inputValue) {
         alert("Please provide the required information.");
         return;
       }
       
       // Validation: Ensure replacement name is different from current holder
       if (step.id === '6' && step.inputValue.trim().toLowerCase() === ticket.employeeName.trim().toLowerCase()) {
         alert("Validation Error: The replacement P-Card holder cannot be the same as the current holder being removed.");
         return;
       }

       // Log Input
       addHistoryEvent(ticket.id, {
         type: 'input_logged',
         title: `Input Provided: ${step.title}`,
         description: `User provided input for ${step.inputLabel}`,
         actor: viewRole === 'Admin' ? 'User' : viewRole,
         metadata: { inputValue: step.inputValue, stepId: step.id }
       });

       updateTicketData(ticket.id, { replacementName: step.inputValue });
       completeStep(ticket.id, step.department);
    } else {
      completeStep(ticket.id, step.department);
    }
  };

  const handleEmailConfirmed = (finalContent: string, to: string, cc: string) => {
    setIsModalOpen(false);
    if (activeTicket) {
      const currentStep = activeTicket.steps[activeTicket.currentStepIndex];
      
      // Log Email Sent
      addHistoryEvent(activeTicket.id, {
        type: 'email_sent',
        title: `Email Sent: ${currentStep.title}`,
        description: `Drafted email sent to external client.`,
        actor: viewRole === 'Admin' ? 'System' : viewRole,
        metadata: {
          emailTo: to,
          emailCc: cc,
          emailBody: finalContent,
          stepId: currentStep.id
        }
      });

      completeStep(activeTicket.id, currentStep.department);
    }
  };

  const completeStep = (ticketId: string, actorDept: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      
      const newSteps = [...t.steps];
      const currentIndex = t.currentStepIndex;
      
      const completedStep = newSteps[currentIndex];
      newSteps[currentIndex] = {
        ...completedStep,
        status: 'completed',
        completedAt: new Date().toISOString()
      };

      let nextIndex = currentIndex + 1;
      let isComplete = false;
      if (nextIndex < newSteps.length) {
        newSteps[nextIndex].status = 'in_progress';
      } else {
        isComplete = true;
      }
      
      const historyUpdate: HistoryEvent = {
        id: `h-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'step_completed',
        title: `Step Completed: ${completedStep.title}`,
        description: `Step marked as complete. Moving to next stage.`,
        actor: actorDept
      };

      const newHistory = [...t.history, historyUpdate];

      if (isComplete) {
         newHistory.push({
           id: `h-end-${Date.now()}`,
           timestamp: new Date().toISOString(),
           type: 'status_change',
           title: 'Workflow Completed',
           description: 'All steps in the workflow have been finished.',
           actor: 'System'
         });
      }

      return {
        ...t,
        steps: newSteps,
        currentStepIndex: nextIndex,
        status: isComplete ? 'completed' : 'active',
        history: newHistory
      };
    }));
  };

  const updateTicketData = (ticketId: string, data: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      return { ...t, ...data };
    }));
  };

  const handleInputChange = (value: string) => {
    if (!activeTicket) return;
    const newSteps = [...activeTicket.steps];
    newSteps[activeTicket.currentStepIndex].inputValue = value;
    
    setTickets(prev => prev.map(t => {
      if (t.id !== activeTicket.id) return t;
      return { ...t, steps: newSteps };
    }));
  };

  const createNewTicket = () => {
    const id = `T-${Math.floor(Math.random() * 10000)}`;
    const newTicket: Ticket = {
      id,
      employeeName: 'New Employee',
      managerName: 'Manager Name',
      snowTicketId: `INC-${Math.floor(Math.random() * 100000)}`,
      role: 'One Team Associate',
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'active',
      currentStepIndex: 0,
      steps: JSON.parse(JSON.stringify(INITIAL_STEPS)),
      history: [
        {
          id: `h-init-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'ticket_created',
          title: 'Ticket Created',
          description: 'New personnel change request initialized.',
          actor: viewRole
        }
      ]
    };
    newTicket.steps[0].status = 'in_progress';
    setTickets([...tickets, newTicket]);
    setActiveTicketId(id);
    setActiveTab('timeline'); 
  };

  // Helper to determine if the currently active step of the TICKET is the one being rendered
  const isTicketActiveStep = (ticket: Ticket, stepId: string) => {
    if (!ticket) return false;
    const currentStep = ticket.steps[ticket.currentStepIndex];
    return currentStep && currentStep.id === stepId;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">One Team Ops</h1>
          </div>
          
          <button 
            onClick={createNewTicket}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm text-sm font-medium mb-4"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>

          {/* Role View Switcher */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3">
             <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block flex items-center gap-1">
               <Eye className="w-3 h-3" /> Dashboard View
             </label>
             <select 
               value={viewRole}
               onChange={(e) => setViewRole(e.target.value as any)}
               className="w-full text-sm border-gray-300 rounded-md p-1.5 border focus:ring-2 focus:ring-blue-500 outline-none"
             >
               <option value="Admin">Admin (All Views)</option>
               <option value="OSI">OSI Operations</option>
               <option value="ABC">ABC Support</option>
               <option value="GFS">GFS Finance</option>
               <option value="Manager">People Manager</option>
             </select>

             {/* Focus Toggle */}
             {viewRole !== 'Admin' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={showMyStepsOnly}
                        onChange={(e) => setShowMyStepsOnly(e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-2 text-xs font-medium text-gray-600">Only my tasks</span>
                    </label>
                </div>
             )}
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-grow space-y-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Work Queue</div>
          {tickets.map(ticket => (
            <div 
              key={ticket.id}
              onClick={() => setActiveTicketId(ticket.id)}
              className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 group
                ${activeTicketId === ticket.id 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-gray-800 group-hover:text-blue-700 truncate">{ticket.employeeName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap
                  ${ticket.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {ticket.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <Users className="w-3 h-3" /> {ticket.role}
              </div>
              <div className="text-xs text-gray-400">
                {ticket.snowTicketId}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-100">
           <button 
             onClick={resetData}
             className="w-full text-gray-400 hover:text-red-600 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-medium"
           >
             <RotateCcw className="w-3 h-3" />
             Reset System
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow ml-72 p-8 max-w-5xl">
        {activeTicket ? (
          <div className="animate-fade-in">
            {/* Header */}
            <header className="flex justify-between items-start mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{activeTicket.employeeName}</h2>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                    {activeTicket.role}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Manager: <span className="text-gray-900">{activeTicket.managerName}</span></p>
                  <p>Due Date: <span className="text-red-600 font-medium">{new Date(activeTicket.dueDate).toLocaleDateString()}</span></p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">Progress</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((activeTicket.currentStepIndex / activeTicket.steps.length) * 100)}%
                  </div>
                </div>
              </div>
            </header>

            {/* Content Tabs */}
            <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
               <button 
                 onClick={() => setActiveTab('timeline')}
                 className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 
                   ${activeTab === 'timeline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
               >
                 <div className="flex items-center gap-2"><Layout className="w-4 h-4"/> Process Timeline</div>
               </button>
               <button 
                 onClick={() => setActiveTab('history')}
                 className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 
                   ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
               >
                 <div className="flex items-center gap-2"><Activity className="w-4 h-4"/> Activity History</div>
               </button>
            </div>

            {/* Workflow Timeline */}
            {activeTab === 'timeline' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Current Workflow
                  </h3>
                  <div className="flex items-center gap-2">
                    {showMyStepsOnly && viewRole !== 'Admin' && (
                      <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Filtered View
                      </span>
                    )}
                    {viewRole !== 'Admin' && (
                      <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                        Viewing as: {viewRole}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-0">
                  {activeTicket.steps
                    .filter(step => {
                      if (viewRole === 'Admin') return true;
                      if (!showMyStepsOnly) return true;
                      
                      // In "My Steps" mode, show my steps OR the current active step (context)
                      const isContextuallyRelevant = isTicketActiveStep(activeTicket, step.id);
                      return step.department === viewRole || isContextuallyRelevant;
                    })
                    .map((step, index, filteredArray) => {
                      const isActiveStep = isTicketActiveStep(activeTicket, step.id);
                      
                      // Permission Logic
                      const canEdit = viewRole === 'Admin' || step.department === viewRole;

                      return (
                        <StepCard 
                          key={step.id}
                          step={step}
                          isActive={isActiveStep}
                          isLast={index === filteredArray.length - 1}
                          canEdit={canEdit}
                          onAction={() => handleStepAction(activeTicket, step)}
                          onInputChange={handleInputChange}
                        />
                      );
                    })
                  }
                  
                  {activeTicket.steps.length > 0 && 
                   showMyStepsOnly && 
                   activeTicket.steps.filter(s => s.department === viewRole).length === 0 && (
                     <div className="text-center py-8 text-gray-400 italic">
                       No tasks currently assigned to your department.
                     </div>
                  )}
                </div>

                {activeTicket.status === 'completed' && (
                  <div className="mt-8 p-6 bg-green-50 rounded-xl border border-green-100 flex items-center gap-4 text-green-800">
                    <div className="p-2 bg-green-100 rounded-full">
                      <History className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold">Process Completed</h4>
                      <p className="text-sm opacity-90">All personnel changes and delegate configurations have been finalized.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History Log */}
            {activeTab === 'history' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-fade-in">
                 <h3 className="text-lg font-bold text-gray-900 mb-6">Activity Log</h3>
                 <ActivityLog history={activeTicket.history} />
              </div>
            )}

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Search className="w-16 h-16 mb-4 opacity-20" />
            <p>Select a ticket to view details or create a new one.</p>
          </div>
        )}
      </main>

      {/* Email Modal */}
      <EmailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSend={handleEmailConfirmed}
        isLoading={emailLoading}
        initialContent={currentEmailDraft}
      />
    </div>
  );
}
