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

- An account in TestBench CS with at least "Test Analyst" rights. To create one, see here. <https://testbench.com>
- If you want to build the parser, golang installation >= 1.14.
- If you want to execute the example tests provided, npm >= 6.13.4.

### Required TestBench CS data for the import

- Your workspace name, user name and password
- Your product ID

  ```script
  This one can be read out from the URL (the number after the string '/products/') after you have opened a product in your workspace. For example:
  https://https://cloud01-eu.testbench.com/en/products/5/home
  ```

## Build

Ensure that the GOPATH is set correctly so that go can find the cloned sources within it. See <https://golang.org/doc/gopath_code.html>.

```bash
# Run the following command from the repository root folder.
go build cy-parser.go
```

## Usage

The following example calls are all written for the Unix bash.

```bash
# list all possible parameter
./cy-parser -h
```

The following example recursively parses all cypress scpecification files under the folder, given by *-cy-specs* parameter. It scans for specification files that end with `*.func.spec.ts` which is the default value for parameter *-cy-suffix*. After all files have been parsed the import of the results to the given TestBench CS instance is started.

```bash
./cy-parser -cy-specs example/tests -cy-suffix .js -product-id <your product id> -tbcs-host https://cloud01-eu.testbench.com -workspace-name <workspace name> -user <user> -password <password>
```

To check the test cases that will be generated before importing them you can use the -dry-run parameter like the following example shows.

```bash
./cy-parser -v -dryrun -cy-specs example/tests -cy-suffix .js
```

## Example

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
