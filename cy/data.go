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
	UserStroyID  int    `json:"userStoryId"`
	Name         string `json:"name"`
	TestCaseType string `json:"testCaseType"`
	TestSteps    []*TestStep
}

type testCaseCreatedResponse struct {
	EventID    int `json:"eventId"`
	TestCaseID int `json:"testCaseId"`
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
