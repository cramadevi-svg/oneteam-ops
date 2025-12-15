export type TicketStatus = 'active' | 'completed' | 'archived';

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type Department = 'OSI' | 'ABC' | 'GFS' | 'Manager' | 'NewHolder' | 'MD' | 'System';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  department: Department;
  status: StepStatus;
  type: 'manual' | 'email_draft' | 'input' | 'approval';
  emailType?: EmailTemplateType;
  requiresInput?: boolean;
  inputLabel?: string;
  inputValue?: string;
  completedAt?: string;
}

export interface HistoryEvent {
  id: string;
  timestamp: string;
  type: 'ticket_created' | 'step_completed' | 'email_sent' | 'input_logged' | 'status_change';
  title: string;
  description?: string;
  actor: string; // e.g. 'Manager', 'OSI', or the specific user
  metadata?: {
    emailTo?: string;
    emailCc?: string;
    emailBody?: string; // Snapshot of the email sent
    inputValue?: string;
    stepId?: string;
  };
}

export interface Ticket {
  id: string;
  employeeName: string;
  managerName: string;
  snowTicketId: string;
  role: string;
  createdAt: string;
  dueDate: string;
  status: TicketStatus;
  currentStepIndex: number;
  steps: WorkflowStep[];
  history: HistoryEvent[];
  replacementName?: string;
  cateringConfirmed?: boolean;
}

export type EmailTemplateType = 
  | 'manager_notify_osi'
  | 'gfs_retire' 
  | 'manager_replacement_req' 
  | 'verification_catering' 
  | 'abc_mgr_delegates' 
  | 'md_approval' 
  | 'gfs_config' 
  | 'training_confirmation'
  | 'delegate_training_confirmation';

export interface EmailDraftRequest {
  templateType: EmailTemplateType;
  employeeName: string;
  managerName: string;
  replacementName?: string;
  ticketId: string;
}