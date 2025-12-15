import { GoogleGenAI } from "@google/genai";
import { EmailDraftRequest } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateEmailDraft = async (request: EmailDraftRequest): Promise<string> => {
  const { templateType, employeeName, managerName, replacementName, ticketId } = request;

  let prompt = "";

  switch (templateType) {
    case 'manager_notify_osi':
      prompt = `Draft a notification email from ${managerName} to the OSI/PayIt Support Team.
      Subject: Personnel Change Notification: ${employeeName}
      Context: ${employeeName} is leaving their One Team role (Ticket: ${ticketId}).
      Action: Please initiate the offboarding process, flag ABC delegates for removal, and perform necessary XPo (GFS) configuration changes.
      Tone: Professional and informative.`;
      break;

    case 'gfs_retire':
      prompt = `Draft a formal request email to the GFS (Global Financial Services) team.
      Subject: Retire Delegate Relationship for ${employeeName}
      Context: ${employeeName} has left the One Team role (Ref Ticket: ${ticketId}).
      Action: Please retire their delegate relationships and update XPo configuration immediately.
      Tone: Professional and concise.`;
      break;

    case 'manager_replacement_req':
      prompt = `Draft an email to ${managerName}.
      Subject: P-Card Holder Replacement for ${employeeName}
      Context: We are processing the departure of ${employeeName}.
      Action: Please provide the name of the replacement P-Card holder if applicable. If no replacement is needed, please confirm.
      Tone: Helpful and direct.`;
      break;

    case 'verification_catering':
      prompt = `Draft a verification email to the new P-Card holder nominee (${replacementName}).
      Subject: Urgent: Confirmation of Catering Duties required for P-Card Issuance
      Context: You have been nominated to replace ${employeeName}.
      Action: Please confirm explicitly that you do charge catering on your card and that your role is NOT solely focused on facilities or other One Team roles that do not handle catering. This is required before we can proceed with delegate setup.
      Tone: Urgent but polite.`;
      break;

    case 'abc_mgr_delegates':
      prompt = `Draft an email to the ABC Manager.
      Subject: Delegate Assignment for ${replacementName}
      Context: ${replacementName} is the new P-Card holder.
      Action: Please provide the list of ABC delegates who require access to support this card holder.
      Tone: Professional.`;
      break;

    case 'md_approval':
      prompt = `Draft an email to the Expense MD Leader.
      Subject: Approval Required: Establish Delegate Relationship for ${replacementName}
      Context: We are setting up ${replacementName} as a new P-Card holder.
      Action: Please approve the establishment of the delegate relationship in XPo.
      Tone: Formal request.`;
      break;

    case 'gfs_config':
      prompt = `Draft an email to GFS.
      Subject: XPo Configuration Request for ${replacementName}
      Context: MD approval has been received for ${replacementName}.
      Action: Please configure the new delegate relationships in XPo.
      Tone: Technical and brief.`;
      break;
      
    case 'training_confirmation':
      prompt = `Draft a training confirmation email to ${replacementName}.
      Subject: P-Card POS Support Process Training
      Context: Your P-Card setup is complete.
      Action: Please attend the mandatory training on the POS support process. Confirm receipt of this invite.
      Tone: Welcoming and informative.`;
      break;

    case 'delegate_training_confirmation':
      prompt = `Draft a training completion email to the ABC Delegate.
      Subject: Delegate Training Confirmation for P-Card Support
      Context: The delegate has successfully completed the required training to support the P-Card holder (Ticket Ref: ${ticketId}).
      Action: Confirm their authorized status and provide links to support documentation.
      Tone: Professional and encouraging.`;
      break;
      
    default:
      prompt = "Write a generic professional email.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Failed to generate draft.";
  } catch (error) {
    console.error("Error generating email:", error);
    return "Error: Could not generate email draft. Please check API Key.";
  }
};