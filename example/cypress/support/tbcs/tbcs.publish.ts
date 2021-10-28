const axios = require('axios');
import moment = require('moment');
import { Status, TestBenchOptions, TestBenchSession, TestBenchTestCase, TestBenchTestSession, TestBenchTestSessionExecution, TestBenchTestSessionExecutions, TestStep, TestStepResult } from './interfaces/tbcs.interfaces';
import { ReportLogger } from './report.logger';


export class TestBenchAutomation {
  private base: String;
  private session: TestBenchSession = undefined;
  private testSession: TestBenchTestSession = undefined;

  constructor(private options: TestBenchOptions) {
    this.base = `${options.serverUrl}/api`;
  }

  public async Login() {
    ReportLogger.info('TestBenchAutomation.login()');
    return axios({
      method: 'post',
      url: `${this.base}/tenants/login/session`,
      headers: { 'Content-Type': 'application/json' },
      data: {
        tenantName: this.options.workspace,
        force: true,
        login: this.options.username,
        password: this.options.password,
      },
    })
      .then(async response => {
        this.session = {
          accessToken: response.data.sessionToken,
          tenantId: response.data.tenantId,
          productId: this.options.productId,
          userId: response.data.userId,
        };
        this.testSession = {
          name: 'CYPRESS ' + moment().toISOString(),
        }
        await this.createNewTestSession();
        let sessionData = {
          status: 'InProgress'
        }
        await this.patchTestSession(sessionData);
      })
      .catch(error => this.logError(error));
  }

  public async Logout() {
    let sessionData = {
      status: 'Completed'
    }
    await this.patchTestSession(sessionData);
    ReportLogger.info(`TestBenchAutomation.logout()`);
    return axios({
      method: 'delete',
      url: `${this.base}/tenants/${this.session.tenantId}/login/session`,
      headers: this.requestHeaders(),
    })
      .then(() => (this.session = undefined))
      .catch(error => this.logError(error));
  }

  private logError(error: any) {
    if (error.response === undefined) {
      ReportLogger.error('Unexpected error occurred:');
      ReportLogger.error(error);
    } else if (error.response.data === undefined) {
      ReportLogger.error('Unexpected response error occurred:');
      ReportLogger.error(error.response);
    } else {
      ReportLogger.error('Error occurred:');
      ReportLogger.error(JSON.stringify(error));
    }
  }

  private productUrl(suffix: string) {
    return `${this.base}/tenants/${this.session.tenantId}/products/${this.session.productId}/${suffix}`;
  }

  private testSessionUrl(suffix: string) {
    return `${this.base}/tenants/${this.session.tenantId}/products/${this.session.productId}/planning/sessions${suffix}`;
  }

  private requestHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.session.accessToken}` };
  }

  private createNewTestSession() {
    ReportLogger.info(`TestBenchAutomation.createNewTestSession()`);
    return axios({
      method: 'post',
      url: this.testSessionUrl('/v1'),
      headers: this.requestHeaders(),
      data: this.testSession,
    })
      .then(async response => {
        this.testSession = {
          id: response.data.testSessionId,
        };
        // join the test session as participant
        await axios({
          method: 'patch',
          url: this.testSessionUrl('/' + this.testSession.id + '/participant/self/v1'),
          headers: this.requestHeaders(),
          data: { active: true },
        }).catch(error => {
          if (error.response && error.response.status !== 200) {
            ReportLogger.warn(`Warning: Join test session failed.`);
          } else {
            this.logError(error);
          }
        });
      })
      .catch(error => {
        if (error.response && error.response.status !== 201) {
          ReportLogger.warn(`Warning: Create new test session failed.`);
        } else {
          this.logError(error);
        }
      });
  }

  private updateTestSession(testCaseId, executionId) {
    ReportLogger.info(`TestBenchAutomation.updateTestSession(testCaseId: ${JSON.stringify(testCaseId)}, executionId: ${JSON.stringify(executionId)})`);
    let execution: TestBenchTestSessionExecution = {
      testCaseIds: { testCaseId: testCaseId },
      executionId: executionId,
    }
    let executions: TestBenchTestSessionExecutions = {
      addExecutions: [execution],
    }
    return axios({
      method: 'patch',
      url: this.testSessionUrl('/' + this.testSession.id + '/assign/executions/v1'),
      headers: this.requestHeaders(),
      data: executions,
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response.data));
      })
      .catch(error => {
        if (error.response && error.response.status !== 201) {
          ReportLogger.warn(`Warning: Adding execution to test session failed.`);
        } else {
          this.logError(error);
        }
      });
  }

  private patchTestSession(sessionData: any) {
    ReportLogger.info(`TestBenchAutomation.patchTestSession(${JSON.stringify(sessionData)})`);
    return axios({
      method: 'patch',
      url: this.testSessionUrl('/' + this.testSession.id + '/v1'),
      headers: this.requestHeaders(),
      data: sessionData,
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response.data));
      })
      .catch(error => {
        if (error.response && error.response.status !== 201) {
          ReportLogger.warn(`Failed to patch test session.`);
        } else {
          this.logError(error);
        }
      });
  }

  private getTestCaseByExternalId(testCase: TestBenchTestCase): string {
    ReportLogger.info(`TestBenchAutomation.getTestCaseByExternalId(testCase.externalId: ${JSON.stringify(testCase.externalId)})`);
    if (testCase.externalId === undefined) return undefined;
    return axios({
      method: 'get',
      url: this.productUrl('elements?fieldValue=externalId%3Aequals%3A' + testCase.externalId + '&types=TestCase'),
      headers: this.requestHeaders(),
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
        if (response.data.elements.length !== 1) return undefined;
        return response.data.elements[0].TestCaseSummary.id;
      })
      .catch(error => this.logError(error));
  }

  private getTestCaseById(testCaseId: string) {
    ReportLogger.info(`TestBenchAutomation.getTestCaseById(testCaseId: ${testCaseId})`);
    return axios({
      method: 'get',
      url: this.productUrl('specifications/testCases/' + testCaseId),
      headers: this.requestHeaders(),
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response.data));
        return response.data;
      })
      .catch(error => this.logError(error));
  }

  private deleteTestStep(testCaseId: string, testStepId: string) {
    ReportLogger.info(`TestBenchAutomation.deleteTestStep(testCaseId: ${testCaseId}, testStepId: ${testStepId})`);
    return axios({
      method: 'delete',
      url: this.productUrl('specifications/testCases/' + testCaseId + '/testSteps/' + testStepId),
      headers: this.requestHeaders(),
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
      })
      .catch(error => this.logError(error));
  }

  private createTestCase(testCaseName: string, type: string): string {
    ReportLogger.info(`TestBenchAutomation.createTestCase(testCaseName: ${testCaseName})`);
    return axios({
      method: 'post',
      url: this.productUrl('specifications/testCases'),
      headers: this.requestHeaders(),
      data: {
        name: testCaseName,
        testCaseType: type
      },
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
        return response.data.testCaseId;
      })
      .catch(error => this.logError(error));
  }

  private patchTestCase(testCaseId: string, patchData: any): string {
    ReportLogger.info(`TestBenchAutomation.patchTestCase(testCaseId: ${testCaseId}), data: ${JSON.stringify(patchData)}`);
    return axios({
      method: 'patch',
      url: this.productUrl('specifications/testCases/' + testCaseId),
      headers: this.requestHeaders(),
      data: patchData,
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
        return response.data.testCaseId;
      })
      .catch(error => this.logError(error));
  }

  private createTestStep(testCaseId: string, testStepName: string): string {
    ReportLogger.info(`TestBenchAutomation.createTestStep(testCaseId: ${testCaseId}, testStepName: ${testStepName})`);
    return axios({
      method: 'post',
      url: this.productUrl('specifications/testCases/' + testCaseId + '/testSteps'),
      headers: this.requestHeaders(),
      data: {
        testStepBlock: 'Test',
        description: testStepName
      },
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
        return response.data.testStepId;
      })
      .catch(error => this.logError(error));
  }

  private putPreconditionMarker(testCaseId: string, empty: boolean) {
    ReportLogger.info(`TestBenchAutomation.putPreconditionMarker(testCaseId: ${testCaseId}, empty: ${empty})`);
    return axios({
      method: 'put',
      url: this.productUrl('specifications/testCases/' + testCaseId + '/preconditions/emptyMarker'),
      headers: this.requestHeaders(),
      data: empty,
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
      })
      .catch(error => this.logError(error));
  }

  private createTestCaseExecution(testCaseId: string): string {
    ReportLogger.info(`TestBenchAutomation.createTestCaseExecution(testCaseId: ${testCaseId})`);
    return axios({
      method: 'post',
      url: this.productUrl('executions/testCases/' + testCaseId),
      headers: this.requestHeaders(),
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
        return response.data.executionId;
      })
      .catch(error => this.logError(error));
  }

  // status: Valid values are: "New", "InProgress", "Blocked", "Paused", "Finished", "Closed"
  private updateExecutionStatus(testCaseId: string, executionId: string, status: string) {
    ReportLogger.info(`TestBenchAutomation.updateExecutionStatus(testCaseId: ${testCaseId}, executionId: ${executionId}, status: ${status})`);
    return axios({
      method: 'put',
      url: this.productUrl('executions/testCases/' + testCaseId + '/executions/' + executionId + '/status'),
      headers: this.requestHeaders(),
      data: status,
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
      })
      .catch(error => this.logError(error));
  }

  private assignTestStepExecutionResult(testCaseId: string, executionId: string, testStepId: string, result: string) {
    ReportLogger.info(`TestBenchAutomation.assignTestStepExecutionResult(testCaseId: ${testCaseId}, executionId: ${executionId}, testStepId: ${testStepId}, result: ${result})`);
    return axios({
      method: 'put',
      url: this.productUrl('executions/testCases/' + testCaseId + '/executions/' + executionId + '/testSteps/' + testStepId + '/result'),
      headers: this.requestHeaders(),
      data: result,
    })
      .then(response => {
        ReportLogger.debug(JSON.stringify(response));
      })
      .catch(error => this.logError(error));
  }

  public async RunAutomatedTest(testCase: TestBenchTestCase, status?: Status) {
    ReportLogger.info(`TestBenchAutomation.runAutomatedTest(testCase: ${JSON.stringify(testCase)})`);

    // if test case already exists with the externalId, update test steps
    var testStepsCurrent: Array<TestStep> = []; // remember test steps with id's for later execution results
    let testCaseId = await this.getTestCaseByExternalId(testCase);
    if (testCaseId !== undefined) {
      ReportLogger.debug(testCaseId);
      let testCaseResponse = await this.getTestCaseById(testCaseId);
      try {
        // TODO: check for changed test steps, if so, update them and set review flag on tst case
        // delete all existing steps and create them new, only from test step block 'Test' expecting an structured test case
        for (let block of testCaseResponse.testSequence.testStepBlocks) {
          if (block.name === 'Test') {
            for (let step of block.steps) {
              await this.deleteTestStep(testCaseId, step.id);
            }
          }
        }
        // create test steps and remember id's
        for (let step of testCase.testSteps) {
          let stepId = await this.createTestStep(testCaseId, step);
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
      testCaseId = await this.createTestCase(testCase.name, 'StructuredTestCase');
      // update for automation
      let patchData = {
        description: { text: testCase.description ? testCase.description : null },
        responsibles: [this.session.userId],
        isAutomated: true,
        toBeReviewed: true,
        externalId: { value: testCase.externalId ? testCase.externalId : null }
      };

      await this.patchTestCase(testCaseId, patchData);
      await this.putPreconditionMarker(testCaseId, true);

      // test steps
      for (let step of testCase.testSteps) {
        let stepId = await this.createTestStep(testCaseId, step);
        testStepsCurrent.push({
          id: stepId,
          name: step
        });
      }
    }

    // add execution
    let executionId = await this.createTestCaseExecution(testCaseId);
    await this.updateTestSession(testCaseId, executionId);
    await this.updateExecutionStatus(testCaseId, executionId, 'InProgress');

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
      await this.assignTestStepExecutionResult(testCaseId, executionId, step.testStepId, step.result);
    }
    await this.updateExecutionStatus(testCaseId, executionId, 'Finished');
  }
}
