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
			tc = &TestCase{
				Name: userStory.Name + " " + getEffectiveName(line),
			}
			userStory.TestCases = append(userStory.TestCases, tc)
		}
		if strings.HasPrefix(line, "cy.log(") {
			ts = &TestStep{
				Description: getEffectiveName(line),
			}
			if tc != nil {
				tc.TestSteps = append(tc.TestSteps, ts)
			}
		}
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
