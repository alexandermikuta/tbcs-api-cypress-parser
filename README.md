# Cypress Specification and Result Import for TestBench CS

## Content

- [Prerequisites](#prerequisites)
- [Cypress Specification Import](#cypress-specification-import)
- [Cypress Result Import](#cypress-result-import)

See also:

- [cypress](https://www.cypress.io/)
- [TestBench CS](https://www.testbench.com/)

## Prerequisites

- An account in TestBench CS with at least "Test Analyst" rights. To create one, see here. <https://testbench.com>. For test result imports ate least "Tester" rights are required too.
- If you want to build the parser, golang installation >= 1.14.
- If you want to execute the example tests provided, npm >= 6.13.4.

### Required TestBench CS data for imports

- Your workspace name, user name and password
- Your product ID

  ```script
  This one can be read out from the URL (the number after the string '/products/') after you have opened a product in your workspace. For example:
  https://https://cloud01-eu.testbench.com/en/products/5/home
  ```

## Cypress Specification Import

Parse cypress specification files and import generated test cases into TestBench CS.

The parser generates test cases out of cypress specifications. Given the following example the parser will create one user story and two test cases. The user story is imported to TestBench CS within a general Epic. The Epic name can be given as parameter (see [Usage](#Usage)).

```ts
describe("Login", () => {
  it("is not possible after password reset.", () => {
    cy.log("Enter valid user name.");
    // ...
    cy.log('Click the "Forgot Password" button.');
    // ...
    cy.log('Click the "Reset" button.');
    // ...
    cy.log("Enter the old password.");
    // ...
    cy.log('Click the "Login" button.');
    // ...
    cy.log('Check the error message: "Please enter ...".');
    // ...
  });
  //...
  it("should be possible after changing my password at first login.", () => {
    //...
  });
  //...
});
```

Result:

- Epic (default name):
  - User Story: Login
    - Test Case 1: Login is not possible after password reset.
      - Test Steps:
        - Enter valid user name.
        - Click the "Forgot Password" button.
        - Click the "Reset" button.
        - Enter the old password.
        - Click the "Login" button.
        - Check the error message: "Please enter ...".
    - Test Case 2: Login should be possible after changing my password at first login.

### Build

Ensure that the GOPATH is set correctly so that go can find the cloned sources within it. See <https://golang.org/doc/gopath_code.html>.

```bash
# Run the following command from the repository root folder.
go build cy-parser.go
```

### Usage

The following example calls are all written for the Unix bash.

```bash
# list all possible parameter
./cy-parser -h
```

The following example recursively parses all cypress scpecification files under the folder, given by _-cy-specs_ parameter. It scans for specification files that end with `*.func.spec.ts` which is the default value for parameter _-cy-suffix_. After all files have been parsed the import of the results to the given TestBench CS instance is started.

```bash
./cy-parser -cy-specs /mnt/e/work/repos/git/tbcs-b/systemtest/cypress/integration/ -product-id  -tbcs-host https://cloud01-eu.testbench.com -workspace-name TBCS-Testing -user fa-tbcs-aut -password 'zVjsbPxh;_IR'


./cy-parser -cy-specs example/tests -cy-suffix .js -product-id 4 -tbcs-host https://172.21.3.2 -workspace-name imbus -user manager -password testbench
```

To check the test cases that will be generated before importing them you can use the -dry-run parameter like the following example shows.

```bash
./cy-parser -v -dryrun -cy-specs example/tests -cy-suffix .js
```

### Example

You can find an example test in the `example` folder. To run it see [Prerequisites](#Prerequisites)

Before the test can succeed you need to edit the test file under `example/tests/login-spec.js` regarding the comments and enter your VSR II credentials.

```bash
cd example
npm install
# run cypress interactively
npm run cy-open
# or run cypress directly
npm run cy-run
```

## Cypress Result Import

Run within a regular cypress test execution and import test results to TestBench CS.

Before you activate the cypress result imports you are suggested to import your test cases with the cy-parser before. This will ensure a correct import structure but is not required. However if no test cases are found in TestBench CS matching an cypress test they will be created during the execution result import.

### Activation

Because the result import integration run within each cypress test run you will only have to setup your TestBench CS connection information and activate a flag that enables it like in the following example.

Configuration is done in file examples/cypress.json

```json
{
  ...
  "reporterOptions": {
    "serverUrl": "https://cloud01-eu.testbench.com",
    "workspace": "imbus",
    "username": "manager",
    "password": "testbench",
    "productId": "4",
    "closeAlreadyRunningAutomation": true,
    "skipResultImport": false
  },
  ...
}
```

The line `"skipResultImport": false` finally activates the result import.

Now you can run your tests as usual and your test results then can be found in TestBench CS. See also [Example](#Example)

### Integration in your own Cypress installation

Simply copy the content of the example/cypress folder from this repository into your equivialent cypress installation folder and extend your cypress.json file with the `reporterOptions`. Finally check that the file example/cypress/tsconfig.json matches you settings too.

Thats it.
