# Cypress Specification Parser

Parse cypress specification files and import generated test cases into TestBench CS.

See:

- [cypress](https://www.cypress.io/)
- [TestBench CS](https://www.testbench.com/)

The parser generates test cases out of cypress specifications. Given the following example the parser will create one user story and two test cases. The user story is imported to TestBench CS within a general Epic. The Epic name can be given as parameter (see [Usage](#Usage)).

```ts
describe('Login', () => {
  it('is not possible after password reset.', () => {
    cy.log('Enter valid user name.');
    // ...
    cy.log('Click the "Forgot Password" button.');
    // ...
    cy.log('Click the "Reset" button.');
    // ...
    cy.log('Enter the old password.');
    // ...
    cy.log('Click the "Login" button.');
    // ...
    cy.log('Check the error message: "Please enter ...".');
    // ...
  });
  //...
  it('should be possible after changing my password at first login.', () => {
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

## Prerequisites

- An account in TestBench CS with at least "Test Analyst" rights.
- If you want to build the parser, golang installation >= 1.14.

## Build

```bash
go build cy-parser.go
```

## Usage

```bash
# list all possible parameter
./cy-parser -h

```

## TODO: ??? How can a test analyst get his workspace ID

The following example recursively parses all cypress scpecification files under the folder, given by *-cy-specs* parameter. It scans for specification files that end with (default value for parameter *-cy-suffix*) `*.func.spec.ts`. After all files have been parsed the import of the results to the given TestBench CS instance is started.

```bash
./cy-parser -cy-specs <cypress installation folder>/cypress/integration/ -epic Cypress-Import -password <password> -product-id <your product id> -tbcs-host https://cloud01-eu.testbench.com -workspace-id <ID of your workspace> -workspace-name <workspace name> -user <user>
```
