import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateData, validateRoles, readFixture, planDates } from './fixture.ts';

const example = JSON.parse(readFileSync(new URL('./data.example.json', import.meta.url), 'utf8')).cases[0];
const fixture = () => ({ ...structuredClone(example), approvedForUat: true });
function credentials(data) {
  const roles = [data.creatorRole, data.responsible.role, data.l1.role, data.l2.role, data.l3.role];
  const mapping = { roles: Object.fromEntries(roles.map((role, i) => [role, { username: role, passwordEnv: `TEST_PASSWORD_${i}` }])) };
  const env = Object.fromEntries(roles.map((_, i) => [`TEST_PASSWORD_${i}`, 'unit-test-only-not-a-real-password']));
  return { mapping, env };
}

test('reviewed example is valid', () => assert.equal(validateData(fixture()).caseId, 'M01-TC-001'));
test('unreviewed example cannot create a record', () => assert.throws(() => validateData(example), /approvedForUat=true/));
test('edit must change the description', () => {
  const data = fixture(); data.updatedDescription = data.description;
  assert.throws(() => validateData(data), /must differ/);
});
test('responsible person cannot also be a reviewer login', () => {
  const data = fixture(); data.l1.role = data.responsible.role.toUpperCase();
  assert.throws(() => validateData(data), /distinct role logins/);
});
test('evidence-required scenario must supply evidence', () => {
  const data = fixture(); data.completionEvidenceRequired = true;
  assert.throws(() => validateData(data), /Evidence is required/);
});
test('due date offset and page limit are bounded integers', () => {
  for (const dueInDays of [0, -1, 1.5, 3651]) assert.throws(() => validateData({ ...fixture(), dueInDays }), /dueInDays/);
  for (const searchPageLimit of [0, 1.5, 101]) assert.throws(() => validateData({ ...fixture(), searchPageLimit }), /searchPageLimit/);
});
test('lookup requires the full unambiguous option text', () => {
  const data = fixture(); data.entity.optionText = '';
  assert.throws(() => validateData(data), /entity.optionText/);
});
test('delete and manual workflow override actions are rejected', () => {
  for (const action of ['Delete', 'Set', 'Cancel', 'Reject']) {
    const data = fixture(); data.actions.l3 = action;
    assert.throws(() => validateData(data), /positive completion\/approval action/);
  }
});
test('all five credentials pass preflight without exposing secrets', () => {
  const data = fixture(); const { mapping, env } = credentials(data);
  assert.doesNotThrow(() => validateRoles(data, mapping, env));
});
test('missing L3 password fails before creating the draft', () => {
  const data = fixture(); const { mapping, env } = credentials(data);
  delete env.TEST_PASSWORD_4;
  assert.throws(() => validateRoles(data, mapping, env), /TEST_PASSWORD_4/);
});
test('different role keys cannot resolve to the same username', () => {
  const data = fixture(); const { mapping, env } = credentials(data);
  mapping.roles[data.l3.role].username = data.l1.role.toUpperCase();
  assert.throws(() => validateRoles(data, mapping, env), /same username/);
});
test('business dates use Perth midnight, not the runner timezone', () => {
  assert.deepEqual(planDates(1, new Date('2026-12-31T16:30:00Z')), { start: '01/01/2027', due: '02/01/2027' });
  assert.deepEqual(planDates(1, new Date('2028-02-28T02:00:00Z')), { start: '28/02/2028', due: '29/02/2028' });
});
test('file loader resolves evidence relative to the local fixture and rejects duplicate cases', () => {
  const directory = mkdtempSync(join(tmpdir(), 'action-plan-fixture-test-'));
  try {
    const data = fixture(); data.completionEvidenceRequired = true; data.evidenceFiles = ['evidence.txt'];
    const { mapping, env } = credentials(data);
    const dataPath = join(directory, 'data.json'); const rolesPath = join(directory, 'roles.json');
    writeFileSync(dataPath, '\uFEFF' + JSON.stringify({ cases: [data] }));
    writeFileSync(rolesPath, JSON.stringify(mapping));
    writeFileSync(join(directory, 'evidence.txt'), 'Unit test fixture only');
    assert.deepEqual(readFixture(dataPath, rolesPath, env).evidenceFiles, [join(directory, 'evidence.txt')]);
    writeFileSync(dataPath, JSON.stringify({ cases: [data, data] }));
    assert.throws(() => readFixture(dataPath, rolesPath, env), /exactly one/);
  } finally {
    // Delete only the unique temporary directory created by this test, never a project directory.
    rmSync(directory, { recursive: true, force: true });
  }
});
