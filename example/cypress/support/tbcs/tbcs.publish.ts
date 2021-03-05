const axios = require('axios');
import moment = require('moment');
import { TestBenchOptions, TestStepResult, TestBenchSession, TestBenchTestCase, Status, TestBenchTestSession, TestBenchTestSessionExecution, TestBenchTestSessionExecutions } from './interfaces/tbcs.interfaces';

export class TestBenchAutomation {
  private base: String;
  private session: TestBenchSession = undefined;
  private testSession: TestBenchTestSession = undefined;

  constructor(private options: TestBenchOptions) {
    this.base = `${options.serverUrl}/api`;
  }

  public async Login() {
    console.log('TestBenchAutomation.login()');
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
    console.log(`TestBenchAutomation.logout()`);
    let sessionData = {
      status: 'Completed'
    }
    await this.patchTestSession(sessionData);
    return axios({
      method: 'delete',
      url: `${this.base}/tenants/${this.session.tenantId}/login/session`,
      headers: this.automationHeaders(),
    })
      .then(response => (this.session = undefined))
      .catch(error => this.logError(error));
  }

  private logError(error: any) {
    if (error.response === undefined) {
      console.error('Unexpected error occurred:');
      console.error(error);
    } else if (error.response.data === undefined) {
      console.error('Unexpected response error occurred:');
      console.error(error.response);
    } else {
      console.error('Error occurred:');
      console.error(error.response.data);
    }
  }

  private automationUrl(suffix: string) {
    return `${this.base}/tenants/${this.session.tenantId}/products/${this.session.productId}/automation/testCase${suffix}`;
  }

  private testSessionUrl(suffix: string) {
    return `${this.base}/tenants/${this.session.tenantId}/products/${this.session.productId}/planning/sessions${suffix}`;
  }

  private automationHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.session.accessToken}` };
  }

  private createNewTestSession() {
    console.log(`TestBenchAutomation.createNewTestSession()`);
    return axios({
      method: 'post',
      url: this.testSessionUrl('/v1'),
      headers: this.automationHeaders(),
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
          headers: this.automationHeaders(),
          data: { active: true },
        }).catch(error => {
          if (error.response && error.response.status !== 200) {
            console.warn(`Warning: Join test session failed.`);
          } else {
            this.logError(error);
          }
        });
      })
      .catch(error => {
        if (error.response && error.response.status !== 201) {
          console.warn(`Warning: Create new test session failed.`);
        } else {
          this.logError(error);
        }
      });
  }

  private updateTestSession(testCaseId, executionId: number) {
    console.log(`TestBenchAutomation.updateTestSession(${JSON.stringify(testCaseId)}, ${JSON.stringify(executionId)})`);
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
      headers: this.automationHeaders(),
      data: executions,
    })
      .then(response => {
        //console.log(response.data.testSessionId);
      })
      .catch(error => {
        if (error.response && error.response.status !== 201) {
          console.warn(`Warning: Adding execution to test session failed.`);
        } else {
          this.logError(error);
        }
      });
  }

  private patchTestSession(sessionData: any) {
    console.log(`TestBenchAutomation.patchTestSession(${JSON.stringify(sessionData)})`);
    return axios({
      method: 'patch',
      url: this.testSessionUrl('/' + this.testSession.id + '/v1'),
      headers: this.automationHeaders(),
      data: sessionData,
    })
      .then(response => {
        //console.log(response.data.testSessionId);
      })
      .catch(error => {
        if (error.response && error.response.status !== 201) {
          console.warn(`Failed to patch test session.`);
        } else {
          this.logError(error);
        }
      });
  }

  public async RunAutomatedTest(testCase: TestBenchTestCase, status?: Status) {
    console.log(`TestBenchAutomation.runAutomatedTest(${JSON.stringify(testCase.externalId)})`);
    return axios({
      method: 'post',
      url: this.automationUrl(''),
      headers: this.automationHeaders(),
      data: testCase,
    })
      .then(async response => {
        // update matching test steps
        var testSteps: TestStepResult[] = [];
        var count = 0;
        for (let step of response.data.testSteps) {
          count++;
          let match = testCase.testSteps.find(s => step.description === s);
          if (match) {
            testSteps.push({
              testStepId: step.id,
              result: Status.Passed,
            });
          }
        }
        if (status === Status.Failed) {
          testSteps[testSteps.length - 1].result = Status.Failed;
        }
        await this.publishTestStepResults(testSteps);
        await this.terminateAutomation(status);
        await this.updateTestSession(response.data.testCaseId, response.data.executionId);
      })
      .catch(error => {
        if (error.response && error.response.status === 409 && this.options.closeAlreadyRunningAutomation) {
          console.warn(`Warning: Terminating old automation of ${error.response.data.details.externalId} and starting automation of ${testCase.externalId}.`);
          this.terminateAutomation(Status.Calculated);
          this.RunAutomatedTest(testCase);
        } else {
          this.logError(error);
        }
      });
  }

  private terminateAutomation(status?: Status) {
    console.log(`TestBenchAutomation.terminateAutomation(${status})`);
    return axios({
      method: 'patch',
      url: this.automationUrl(''),
      headers: this.automationHeaders(),
      data: {
        executionResult: status,
      },
    }).catch(error => this.logError(error));
  }

  public async publishTestStepResults(testSteps: TestStepResult[]) {
    console.log(`TestBenchAutomation.publishTestStepResults(${JSON.stringify(testSteps.length)})`);
    for (let testStep of testSteps) {
      await axios({
        method: 'put',
        url: this.automationUrl(`/testSteps/${testStep.testStepId}/result`),
        headers: this.automationHeaders(),
        data: `"${testStep.result}"`,
      }).catch(error => this.logError(error));
    }
  }
}
