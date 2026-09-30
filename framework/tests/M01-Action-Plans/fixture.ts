import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type Lookup = { query: string; optionText: string; displayValue: string };
export type Participant = Lookup & { role: string };
export type ActionPlanData = {
  caseId: 'M01-TC-001'; approvedForUat: boolean; creatorRole: string;
  titlePrefix: string; description: string; updatedDescription: string;
  hierarchyOfControl: string; dueInDays: number; orgHierarchy: Lookup; entity: Lookup;
  responsible: Participant; l1: Participant; l2: Participant; l3: Participant;
  completionEvidenceRequired: boolean; completionComments: string; evidenceFiles: string[];
  actions: { responsible: string; l1: string; l2: string; l3: string };
  searchPageLimit: number; retention: 'retain-test-record';
};
type RoleMapping = { username?: string; usernameEnv?: string; passwordEnv: string };
export type RoleMappings = { roles: Record<string, RoleMapping> };

function requiredText(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} must be non-empty text.`);
}

export function validateData(value: unknown): ActionPlanData {
  if (!value || typeof value !== 'object') throw new Error('Action Plan case data is missing.');
  const data = value as ActionPlanData;
  if (data.caseId !== 'M01-TC-001') throw new Error('Expected caseId M01-TC-001.');
  if (data.approvedForUat !== true) throw new Error('Review the local fixture and set approvedForUat=true before running.');
  for (const key of ['creatorRole', 'titlePrefix', 'description', 'updatedDescription', 'hierarchyOfControl', 'completionComments'] as const) requiredText(data[key], key);
  if (data.titlePrefix.length > 170) throw new Error('titlePrefix must be at most 170 characters to leave room for a unique run suffix.');
  if (data.description === data.updatedDescription) throw new Error('updatedDescription must differ so edit persistence is actually tested.');
  if (!Number.isInteger(data.dueInDays) || data.dueInDays < 1 || data.dueInDays > 3650) throw new Error('dueInDays must be an integer between 1 and 3650.');
  if (!Number.isInteger(data.searchPageLimit) || data.searchPageLimit < 1 || data.searchPageLimit > 100) throw new Error('searchPageLimit must be between 1 and 100.');
  for (const key of ['orgHierarchy', 'entity', 'responsible', 'l1', 'l2', 'l3'] as const) {
    for (const field of ['query', 'optionText', 'displayValue'] as const) requiredText(data[key]?.[field], `${key}.${field}`);
    if (data[key].query.trim().length < 3) throw new Error(`${key}.query must contain at least three characters.`);
  }
  const roles = [data.creatorRole];
  for (const key of ['responsible', 'l1', 'l2', 'l3'] as const) {
    requiredText(data[key].role, `${key}.role`);
    requiredText(data.actions?.[key], `actions.${key}`);
    if (!/^(Complete|Approve|Validate|Submit for Verification)$/i.test(data.actions[key])) throw new Error(`actions.${key} must be a positive completion/approval action, not an administrative status override.`);
    roles.push(data[key].role);
  }
  if (new Set(roles.map(role => role.toLowerCase())).size !== 5) throw new Error('Creator, responsible person and all three reviewers must use distinct role logins.');
  if (typeof data.completionEvidenceRequired !== 'boolean') throw new Error('completionEvidenceRequired must be true or false.');
  if (!Array.isArray(data.evidenceFiles) || data.evidenceFiles.some(file => typeof file !== 'string' || !file.trim())) throw new Error('evidenceFiles must be an array of file paths.');
  if (data.completionEvidenceRequired && data.evidenceFiles.length === 0) throw new Error('Evidence is required: supply an approved UAT evidence file.');
  if (data.retention !== 'retain-test-record') throw new Error('This scenario retains its test record; automatic deletion is not implemented.');
  return data;
}

/** Validate all five identities/password variables before the first record is created. */
export function validateRoles(data: ActionPlanData, mapping: RoleMappings, env: Record<string, string | undefined>): void {
  const usernames: string[] = [];
  for (const role of [data.creatorRole, data.responsible.role, data.l1.role, data.l2.role, data.l3.role]) {
    const item = mapping.roles?.[role];
    if (!item) throw new Error(`Role '${role}' is missing from the roles file.`);
    const username = item.username ?? (item.usernameEnv ? env[item.usernameEnv] : undefined);
    requiredText(username, `Username for role '${role}'`);
    requiredText(item.passwordEnv, `passwordEnv for role '${role}'`);
    if (!env[item.passwordEnv]) throw new Error(`Set ${item.passwordEnv} for role '${role}'. Password values are not logged.`);
    usernames.push(username.toLowerCase().trim());
  }
  if (new Set(usernames).size !== 5) throw new Error('Different role keys resolve to the same username; isolated approval users are required.');
}

export function readFixture(file: string, rolesFile: string, env: Record<string, string | undefined> = process.env): ActionPlanData {
  const input = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as { cases?: unknown[] };
  const matching = input.cases?.filter(item => (item as { caseId?: string })?.caseId === 'M01-TC-001') ?? [];
  if (matching.length !== 1) throw new Error('The data file must contain exactly one M01-TC-001 case.');
  const data = validateData(matching[0]);
  const mapping = JSON.parse(readFileSync(rolesFile, 'utf8').replace(/^\uFEFF/, '')) as RoleMappings;
  validateRoles(data, mapping, env);
  const evidenceFiles = data.evidenceFiles.map(fileName => resolve(dirname(file), fileName));
  for (const fileName of evidenceFiles) if (!statSync(fileName).isFile()) throw new Error(`Evidence is not a regular file: ${fileName}`);
  return { ...data, evidenceFiles };
}

/** Business dates are independent of the test runner's local timezone. */
export function planDates(dueInDays: number, now = new Date()): { start: string; due: string } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Australia/Perth', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => Number(parts.find(value => value.type === type)!.value);
  const start = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
  const due = new Date(start);
  due.setUTCDate(due.getUTCDate() + dueInDays);
  const format = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
  return { start: format(start), due: format(due) };
}
