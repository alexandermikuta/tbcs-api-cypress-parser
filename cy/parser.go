package cy

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// ParseSpecs parses cypress specs and generates elements for import.
func ParseSpecs(path string, suffix string, epicName string, verbose bool) (epics []*Epic) {
	epic := &Epic{
		Name: epicName,
	}

	epics = append(epics, epic)

	files := filesInFolder(path, suffix)

	for _, v := range files {
		if verbose {
			fmt.Println("Scanning: ", v)
		}
		us := readFile(v)
		if us != nil {
			epic.UserStories = append(epic.UserStories, us)
		}
	}

	return
}

// PrintResults outputs generated elements.
func PrintResults(epics []*Epic) {
	for _, v := range epics {
		fmt.Println("Epic: ", v.Name)
		for _, v := range v.UserStories {
			fmt.Println("  User Story: ", v.Name)
			for _, v := range v.TestCases {
				fmt.Println("    Test Case: ", v.Name)
				for _, v := range v.TestSteps {
					fmt.Println("      Test Step: ", v.Description)
				}
			}
		}
	}
}

func readFile(fileName string) (userStory *UserStory) {
	file, err := os.Open(fileName)
	if err != nil {
		fmt.Printf("Error opening file: %v\n", err)
		os.Exit(1)
	}
	defer file.Close()

	var tc *TestCase
	var ts *TestStep

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		line = strings.TrimLeft(line, " ")
		if strings.HasPrefix(line, "describe(") {
			userStory = &UserStory{
				Name: getEffectiveName(line),
			}
		}
		if strings.HasPrefix(line, "it(") {
			patchData := &TestCasePatch{
				Description:  &TestCaseDescription{Text: ""},
				IsAutomated:  true,
				ToBeReviewed: true,
				ExternalID:   &ExternalID{Value: ""},
			}
			tc = &TestCase{
				Name:            userStory.Name + " " + getEffectiveName(line),
				TestCaseDetails: patchData,
			}
			userStory.TestCases = append(userStory.TestCases, tc)
		}
		// handle special meta keywords
		if strings.HasPrefix(line, "TBCS_AUTID") {
			if tc != nil {
				tc.TestCaseDetails.ExternalID.Value = getEffectiveMeta("TBCS_AUTID", line)
			}
		} else if strings.HasPrefix(line, "TBCS_DESCRIPTION") {
			if tc != nil {
				tc.TestCaseDetails.Description.Text = getEffectiveMeta("TBCS_DESCRIPTION", line)
			}
		} else if strings.HasPrefix(line, "TBCS_CATEGORY") {
			if tc != nil {
				// not handled yet
			}
		} else { // normal log entries
			if strings.HasPrefix(line, "cy.log(") {
				logString := getEffectiveName(line)
				ts = &TestStep{
					Description: logString,
				}
				if tc != nil {
					tc.TestSteps = append(tc.TestSteps, ts)
				}
			}
		}
	}

	return
}

func getEffectiveMeta(metaKey, line string) (metaValue string) {
	re := regexp.MustCompile("(" + metaKey + "\\(')(.*)('\\))")
	match := re.FindStringSubmatch(line)

	if len(match) > 1 {
		metaValue = match[2]
	} else {
		metaValue = ""
	}
	return
}

func getEffectiveName(line string) (name string) {
	re := regexp.MustCompile(".*\\('(.*?)'.*")
	match := re.FindStringSubmatch(line)
	if len(match) > 0 {
		name = match[1]
	} else {
		name = line
	}
	return
}

func filesInFolder(folder string, suffix string) (files []string) {
	err := filepath.Walk(folder, func(path string, info os.FileInfo, err error) error {
		if strings.HasSuffix(path, suffix) {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		panic(err)
	}

	return
}
