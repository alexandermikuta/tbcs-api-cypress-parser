package cy

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
)

// Import starts the import into TestBench CS.
func Import(host, tenantName string, productID int, user, password string, epics []*Epic, verbose bool) {
	// disable certificate checks
	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}

	token, tenantID := login(host, tenantName, user, password)

	createTestCases(tenantID, productID, epics, host, token, verbose)

	return
}

func login(host, tenantName, user, password string) (token string, tenantID int) {
	data := &loginData{
		Force:    true,
		Tenant:   tenantName,
		User:     user,
		Password: password,
	}
	jsonValue, _ := json.Marshal(data)
	fmt.Println("Login with: ", data.User)

	request, err := http.NewRequest(http.MethodPost, host+"/api/tenants/login/session", bytes.NewBuffer(jsonValue))
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	response, err := http.DefaultClient.Do(request)

	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
		return
	}

	result, _ := ioutil.ReadAll(response.Body)
	if response.StatusCode != 201 {
		fmt.Fprintln(os.Stderr, "Login failed with: ", response.Status, " Response: ", string(result))
	}

	var responseData loginResponse
	err = json.Unmarshal(result, &responseData)
	token = responseData.SessionToken
	tenantID = responseData.TenantID

	return
}

func createTestCases(tenantID, productID int, epics []*Epic, host, sessionToken string, verbose bool) {
	for _, v := range epics {
		if verbose {
			fmt.Println("Creating Epic: ", v.Name)
		}
		epicID := createEpic(tenantID, productID, v, host, sessionToken)
		for _, v := range v.UserStories {
			if verbose {
				fmt.Println("  Creating User Story: ", v.Name)
			}
			userStoryID := createUserStory(tenantID, productID, epicID, v, host, sessionToken)
			for _, v := range v.TestCases {
				if verbose {
					fmt.Println("    Creating Test Case: ", v.Name)
				}
				testCaseID := createTestCase(tenantID, productID, userStoryID, v, host, sessionToken)
				for _, v := range v.TestSteps {
					if verbose {
						fmt.Println("      Creating Test Step: ", v.Description)
					}
					createTestStep(tenantID, productID, testCaseID, v, host, sessionToken)
				}
				patchTestCase(tenantID, productID, testCaseID, v, host, sessionToken)
			}
		}
	}
}

func createEpic(tenantID, productID int, epic *Epic, host, token string) (epicID int) {
	jsonValue, _ := json.Marshal(epic)

	apiURL := host + "/api/tenants/" + strconv.Itoa(tenantID) + "/products/" + strconv.Itoa(productID) + "/requirements/epics"
	request, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(jsonValue))
	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request creation failed with error ", err)
		return
	}
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	request.Header.Add("Authorization", token)
	response, err := http.DefaultClient.Do(request)

	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
		return
	}

	result, _ := ioutil.ReadAll(response.Body)
	if response.StatusCode != 201 {
		fmt.Fprintln(os.Stderr, "Request failed with: ", response.Status, " Response: ", string(result))
	}

	var responseData epicCreatedResponse
	err = json.Unmarshal(result, &responseData)
	epicID = responseData.EpicID
	return

}

func createUserStory(tenantID, productID, epicID int, userStory *UserStory, host, token string) (userStoryID int) {
	userStory.EpicID = epicID
	jsonValue, _ := json.Marshal(userStory)

	apiURL := host + "/api/tenants/" + strconv.Itoa(tenantID) + "/products/" + strconv.Itoa(productID) + "/requirements/userStories"
	request, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(jsonValue))
	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request creation failed with error ", err)
		return
	}
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	request.Header.Add("Authorization", token)
	response, err := http.DefaultClient.Do(request)

	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
		return
	}

	result, _ := ioutil.ReadAll(response.Body)
	if response.StatusCode != 201 {
		fmt.Fprintln(os.Stderr, "Request failed with: ", response.Status, " Response: ", string(result))
	}

	var responseData userStoryCreatedResponse
	err = json.Unmarshal(result, &responseData)
	userStoryID = responseData.UserStoryID
	return
}

func createTestCase(tenantID, productID, userStoryID int, testCase *TestCase, host, token string) (testCaseID int) {
	// check if testcase already exists by external ID, if so update it and return
	if testCase.TestCaseDetails.ExternalID.Value != "" {
		//INFO: check in existing test case if there are any changes before (review flag must not be updated then)
		// https://172.21.3.2/api/tenants/1/products/4/elements?fieldValue=externalId%3Aequals%3ACY-SAMPLE-LOGIN-01&types=TestCase
		apiURL := host + "/api/tenants/" + strconv.Itoa(tenantID) + "/products/" + strconv.Itoa(productID)
		apiURL += "/elements?fieldValue=externalId%3Aequals%3A" + testCase.TestCaseDetails.ExternalID.Value + "&types=TestCase"
		request, err := http.NewRequest(http.MethodGet, apiURL, bytes.NewBuffer(make([]byte, 0)))
		if err != nil {
			fmt.Fprintln(os.Stderr, "The HTTP request creation failed with error ", err)
			return
		}
		request.Header.Set("Content-Type", "application/json; charset=utf-8")
		request.Header.Add("Authorization", token)
		response, err := http.DefaultClient.Do(request)

		if err != nil {
			fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
			return
		}

		result, _ := ioutil.ReadAll(response.Body)
		if response.StatusCode != 200 {
			fmt.Fprintln(os.Stderr, "Request failed with: ", response.Status, " Response: ", string(result))
		}

		var responseData elements
		err = json.Unmarshal(result, &responseData)

		if err != nil {
			fmt.Fprintln(os.Stderr, "Failed to read response with error ", err)
			return
		}
		if len(responseData.Elements) > 0 && responseData.Elements[0].TestCaseSummary.Tbid != "" {
			testCaseID = responseData.Elements[0].TestCaseSummary.ID
			// test case found, now delete all steps of the existing test case, they will be created new
			deleteAllTestSteps(tenantID, productID, testCaseID, host, token)

			return
		}
	}

	// create new (not yet existing test case by external id) as usal
	testCase.UserStroyID = userStoryID
	testCase.TestCaseType = "StructuredTestCase"
	jsonValue, _ := json.Marshal(testCase)

	apiURL := host + "/api/tenants/" + strconv.Itoa(tenantID) + "/products/" + strconv.Itoa(productID) + "/specifications/testCases"
	request, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(jsonValue))
	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request creation failed with error ", err)
		return
	}
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	request.Header.Add("Authorization", token)
	response, err := http.DefaultClient.Do(request)

	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
		return
	}

	result, _ := ioutil.ReadAll(response.Body)
	if response.StatusCode != 201 {
		fmt.Fprintln(os.Stderr, "Request failed with: ", response.Status, " Response: ", string(result))
	}

	var responseData testCaseCreatedResponse
	err = json.Unmarshal(result, &responseData)
	testCaseID = responseData.TestCaseID
	return
}

func patchTestCase(tenantID, productID, testCaseID int, testCase *TestCase, host, token string) {
	jsonValue, _ := json.Marshal(testCase.TestCaseDetails) //TODO: ensure existing description

	apiURL := host + "/api/tenants/" + strconv.Itoa(tenantID) + "/products/" + strconv.Itoa(productID) + "/specifications/testCases/" + strconv.Itoa(testCaseID)
	request, err := http.NewRequest(http.MethodPatch, apiURL, bytes.NewBuffer(jsonValue))
	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request creation failed with error ", err)
		return
	}
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	request.Header.Add("Authorization", token)
	response, err := http.DefaultClient.Do(request)

	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
		return
	}

	result, _ := ioutil.ReadAll(response.Body)
	if response.StatusCode != 200 {
		if response.StatusCode == 409 {
			var responseData testCaseUpdateErrorResponse
			err = json.Unmarshal(result, &responseData)
			fmt.Fprintln(os.Stderr, response.Status, "-", responseData.Message, "Test case:", testCase.Name)
		} else {
			fmt.Fprintln(os.Stderr, "Request failed with: ", response.Status, " Response: ", string(result))
		}
	}

	return
}

func createTestStep(tenantID, productID, testCaseID int, testStep *TestStep, host, token string) (testStepID int) {
	testStep.TestStepBlock = "Test"
	jsonValue, _ := json.Marshal(testStep)

	apiURL := host + "/api/tenants/" + strconv.Itoa(tenantID) + "/products/" + strconv.Itoa(productID) + "/specifications/testCases/" + strconv.Itoa(testCaseID) + "/testSteps"
	request, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(jsonValue))
	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request creation failed with error ", err)
		return
	}
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	request.Header.Add("Authorization", token)
	response, err := http.DefaultClient.Do(request)

	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
		return
	}

	result, _ := ioutil.ReadAll(response.Body)
	if response.StatusCode != 201 {
		fmt.Fprintln(os.Stderr, "Request failed with: ", response.Status, " Response: ", string(result))
	}

	var responseData testStepCreatedResponse
	err = json.Unmarshal(result, &responseData)
	testCaseID = responseData.TestStepID
	return
}

func deleteAllTestSteps(tenantID, productID, testCaseID int, host, token string) {
	apiURL := host + "/api/tenants/" + strconv.Itoa(tenantID) + "/products/" + strconv.Itoa(productID) + "/specifications/testCases/" + strconv.Itoa(testCaseID)
	//request, err := http.NewRequest("DELETE", apiURL, bytes.NewBuffer(make([]byte, 0)))
	request, err := http.NewRequest(http.MethodGet, apiURL, bytes.NewBuffer(make([]byte, 0)))
	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request creation failed with error ", err)
		return
	}
	request.Header.Set("Content-Type", "application/json; charset=utf-8")
	request.Header.Add("Authorization", token)
	response, err := http.DefaultClient.Do(request)

	if err != nil {
		fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
		return
	}

	result, _ := ioutil.ReadAll(response.Body)
	if response.StatusCode != 200 {
		fmt.Fprintln(os.Stderr, "Request failed with: ", response.Status, " Response: ", string(result))
	}

	var responseData getTestCaseResponse
	err = json.Unmarshal(result, &responseData)

	// delete each step in test step block named "Test"
	for _, block := range responseData.TestSequence.TestStepBlocks {
		if block.Name == "Test" {
			for _, step := range block.Steps {
				apiURL := host + "/api/tenants/" + strconv.Itoa(tenantID) + "/products/" + strconv.Itoa(productID)
				apiURL += "/specifications/testCases/" + strconv.Itoa(testCaseID) + "/testSteps/" + strconv.Itoa(step.ID)
				request, err := http.NewRequest("DELETE", apiURL, bytes.NewBuffer(make([]byte, 0)))
				if err != nil {
					fmt.Fprintln(os.Stderr, "The HTTP request creation failed with error ", err)
					return
				}
				request.Header.Set("Content-Type", "application/json; charset=utf-8")
				request.Header.Add("Authorization", token)
				response, err := http.DefaultClient.Do(request)

				if err != nil {
					fmt.Fprintln(os.Stderr, "The HTTP request failed with error ", err)
					return
				}

				result, _ := ioutil.ReadAll(response.Body)
				if response.StatusCode != 200 {
					fmt.Fprintln(os.Stderr, "Request failed with: ", response.Status, " Response: ", string(result))
				}
			}
		}
	}
	return
}
