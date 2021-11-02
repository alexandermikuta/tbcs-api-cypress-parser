package cy

// TestStep importable test step.
type TestStep struct {
	TestStepBlock string `json:"testStepBlock"`
	Description   string `json:"description"`
}

type testStepCreatedResponse struct {
	EventID    int `json:"eventId"`
	TestStepID int `json:"testStepId"`
}

// TestCase importable test case.
type TestCase struct {
	UserStroyID     int    `json:"userStoryId"`
	Name            string `json:"name"`
	TestCaseType    string `json:"testCaseType"`
	TestSteps       []*TestStep
	TestCaseDetails *TestCasePatch
}

// TestCasePatch extened test case data
type TestCasePatch struct {
	Name         string               `json:"name"`
	Description  *TestCaseDescription `json:"description"`
	IsAutomated  bool                 `json:"isAutomated"`
	ToBeReviewed bool                 `json:"toBeReviewed"`
	ExternalID   *ExternalID          `json:"externalId"`
}

// TestCaseDescription test case description
type TestCaseDescription struct {
	Text string `json:"text"`
}

// ExternalID test case external id
type ExternalID struct {
	Value string `json:"value"`
}

type testCaseCreatedResponse struct {
	EventID    int `json:"eventId"`
	TestCaseID int `json:"testCaseId"`
}

type testCaseUpdateErrorResponse struct {
	FailureType string `json:"failureType"`
	Message     string `json:"message"`
}

// UserStory importable user story.
type UserStory struct {
	EpicID    int    `json:"epicId"`
	Name      string `json:"name"`
	TestCases []*TestCase
}

type userStoryCreatedResponse struct {
	EventID     int `json:"eventId"`
	UserStoryID int `json:"userStoryId"`
}

// Epic importable epic.
type Epic struct {
	Name        string `json:"name"`
	UserStories []*UserStory
}

type epicCreatedResponse struct {
	EventID int `json:"eventId"`
	EpicID  int `json:"epicId"`
}

type elements struct {
	Elements []*elementResponses `json:"elements"`
}
type elementResponses struct {
	TestCaseSummary *testCaseSummary `json:"TestCaseSummary"`
}

type testCaseSummary struct {
	Name string `json:"name"`
	Tbid string `json:"tbid"`
	ID   int    `json:"id"`
}

type getTestCaseResponse struct {
	ProductID    int           `json:"productId"`
	EpicID       int           `json:"epicId"`
	UserStoryID  int           `json:"userStoryId"`
	ID           int           `json:"id"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	TestSequence *testSequence `json:"testSequence"`
}

type testSequence struct {
	TestStepBlocks []*testStepBlock `json:"testStepBlocks"`
}

type testStepBlock struct {
	ID    int     `json:"id"`
	Name  string  `json:"name"`
	Steps []*step `json:"steps"`
}

type step struct {
	ID          int    `json:"id"`
	Description string `json:"description"`
}

type loginData struct {
	Force    bool   `json:"force"`
	Tenant   string `json:"tenantName"`
	User     string `json:"login"`
	Password string `json:"password"`
}

type loginResponse struct {
	GlobalRoles     []string `json:"globalRoles"`
	SessionToken    string   `json:"sessionToken"`
	TenantID        int      `json:"tenantId"`
	UserID          int      `json:"userId"`
	VideoLinkServer string   `json:"videoLinkServer"`
}
