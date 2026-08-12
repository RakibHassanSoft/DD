export type Template = { id: string; groupId: string; approach: string; subject: string; body: string; variables: string[]; selected: boolean };
export type ContactOption = { id: string; email: string; firstName: string; lastName: string; company: string; status: string };
export type Preview = { contact: { id: string; email: string; name: string }; subject: string; body: string; missingVariables: string[] };
