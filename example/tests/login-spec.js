// edit the following two variables to enter your login for the vsr.testbench.com website according to your workspace name in TestBench CS
var user = '<user name>';
var password = '<password>';

var baseUrl = 'https://vsr.testbench.com';

describe('Login', function () {
    beforeEach(() => {
        cy.visit(baseUrl);
    })

    it('page contains specified elements.', () => {
        cy.log('Go to the login page.'); // log entry for the cy.visit in the beforeEach

        cy.log('Check that the login field for "Username" is displayed.');
        cy.get('[id=input_username]').should('be.visible');
        cy.log('Check that the login field for "Password" is displayed.');
        cy.get('[id=input_password]').should('be.visible');
        cy.log('Check that the "Login" button is displayed.');
        cy.get('[id=button_login]').should('be.visible');
    });

    it('page can be switched to german language.', () => {
        cy.log('Go to the login page.'); // log entry for the cy.visit in the beforeEach

        cy.log('Click the "german flag button" to switch to the german language.');
        cy.get('[id=german]').should('be.visible').click();

        cy.log('Check that the "access data" button is labeled with "Zugangsdaten" correctly.');
        cy.get('[id=accessData]').should('be.visible').should('have.text', 'Zugangsdaten');
    });

    it('on the page is successful.', () => {
        cy.log('Go to the login page.'); // log entry for the cy.visit in the beforeEach

        cy.log('Enter the user name.');
        cy.get('[id=input_username]').should('be.visible').type(user);
        cy.log('Enter the password.');
        cy.get('[id=input_password]').should('be.visible').type(password);

        cy.log('Click the login button.');
        cy.get('[id=button_login]').should('be.visible').click();

        cy.log('Check that the customer list is available.');
        cy.get('[id=navigationbar_customer_list]').should('be.visible');
    });
})
