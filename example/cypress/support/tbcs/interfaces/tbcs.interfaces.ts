
export interface TestBenchOptions {
  serverUrl: string;
  workspace: string;
  username: string;
  password: string;
  productId: number;
  closeAlreadyRunningAutomation: boolean;
  skipResultImport: boolean;
}

export interface TestBenchSession {
  accessToken: string;
  tenantId: number;
  productId: number;
  userId: number;
}
export interface TestBenchTestSession {
  name?: string;
  id?: number;
}

export interface TestBenchTestSessionExecutions {
  addExecutions: Array<TestBenchTestSessionExecution>;
}

export interface TestBenchTestSessionExecution {
  testCaseIds: any;
  executionId: number;
}

export enum Status {
  Failed = 'Failed',
  Passed = 'Passed',
  Pending = 'Pending',
  Calculated = 'Calculated',
}

export interface TestStepResult {
  testStepId: string;
  result: Status;
}

export interface TestStep {
  id: string;
  name: string;
}

export interface TestBenchTestCase {
  externalId: string;
  name?: string;
  description?: string;
  testSteps?: string[];
  overwrite?: boolean;
  markForReview?: boolean;
}
