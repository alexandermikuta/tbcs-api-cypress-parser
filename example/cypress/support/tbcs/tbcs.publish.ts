import moment = require('moment');
import { Status, TestBenchApiSession, TestBenchOptions, TestBenchTestCase, TestStep, TestStepResult } from './interfaces/tbcs.interfaces';
import { ReportLogger } from './report.logger';
import { TestBenchApi } from './tbcs.api';

export class TestBenchAutomation {
  private apiSession: TestBenchApiSession = undefined;
  private testSessionId: string = undefined;
  private tbcsApi: TestBenchApi = undefined;

  constructor(private options: TestBenchOptions) {
    this.tbcsApi = new TestBenchApi(options);
  }

  public async Start() {
    ReportLogger.info('TestBenchAutomation.Start()');
    this.apiSession = await this.tbcsApi.login();
    let sessionName = this.options.testSessionPrefix + '_' + moment().toISOString();
    this.testSessionId = await this.tbcsApi.createTestSession(sessionName);
    await this.tbcsApi.joinTestSessionSelf(this.testSessionId);
    let sessionData = {
      status: 'InProgress'
    }
    await this.tbcsApi.patchTestSession(this.testSessionId, sessionData);
  }

  public async End() {
    ReportLogger.info('TestBenchAutomation.End()');
    let sessionData = {
      status: 'Completed'
    }
    await this.tbcsApi.patchTestSession(this.testSessionId, sessionData);
    await this.tbcsApi.logout();
  }

  public async PublishAutomatedTest(testCase: TestBenchTestCase, status?: Status) {
    ReportLogger.info(`TestBenchAutomation.runAutomatedTest(testCase: ${JSON.stringify(testCase)})`);

    // if test case already exists with the externalId, update test steps
    var testStepsCurrent: Array<TestStep> = []; // remember test steps with id's for later execution results
    let testCaseId = await this.tbcsApi.getTestCaseByExternalId(testCase.externalId);
    if (testCaseId !== undefined) {
      let testCaseResponse = await this.tbcsApi.getTestCaseById(testCaseId);
      try {
        // TODO: check for changed test steps, if so, update them and set review flag on test case
        // delete all existing steps and create them new, only from test step block 'Test' expecting an structured test case
        for (let block of testCaseResponse.testSequence.testStepBlocks) {
          if (block.name === 'Test') {
            for (let step of block.steps) {
              await this.tbcsApi.deleteTestStep(testCaseId, step.id);
            }
          }
        }
        // create test steps and remember id's
        for (let step of testCase.testSteps) {
          let stepId = await this.tbcsApi.createTestStep(testCaseId, step);
          testStepsCurrent.push({
            id: stepId,
            name: step
          });
        }
      } catch (error) {
        ReportLogger.warn('Failed to update test case: ' + error);
      }
    } else {
      // create it as a free structured test case
      testCaseId = await this.tbcsApi.createTestCase(testCase.name, 'StructuredTestCase');
      // update for automation
      let patchData = {
        description: { text: testCase.description ? testCase.description : null },
        responsibles: [this.apiSession.userId],
        isAutomated: true,
        toBeReviewed: true,
        externalId: { value: testCase.externalId ? testCase.externalId : null }
      };

      await this.tbcsApi.patchTestCase(testCaseId, patchData);
      await this.tbcsApi.putPreconditionMarker(testCaseId, true);

      // test steps
      for (let step of testCase.testSteps) {
        let stepId = await this.tbcsApi.createTestStep(testCaseId, step);
        testStepsCurrent.push({
          id: stepId,
          name: step
        });
      }
    }

    // add execution
    let executionId = await this.tbcsApi.createTestCaseExecution(testCaseId);
    await this.tbcsApi.updateTestSession(testCaseId, executionId, this.testSessionId);
    await this.tbcsApi.updateExecutionStatus(testCaseId, executionId, 'InProgress');

    var testStepResults: TestStepResult[] = [];
    for (let step of testStepsCurrent) {
      testStepResults.push({
        testStepId: step.id,
        result: Status.Passed,
      });
    }
    if (status === Status.Failed) {
      testStepResults[testStepResults.length - 1].result = Status.Failed;
    }
    for (let step of testStepResults) {
      await this.tbcsApi.assignTestStepExecutionResult(testCaseId, executionId, step.testStepId, step.result);
    }
    await this.tbcsApi.updateExecutionStatus(testCaseId, executionId, 'Finished');
  }
}
