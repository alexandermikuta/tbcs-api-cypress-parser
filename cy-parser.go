package main

import (
	"cypress-parser/cy"
	"flag"
	"fmt"
	"os"
)

func main() {
	// flags
	verbose := flag.Bool("v", false, "Verbose mode.")
	dryrun := flag.Bool("dryrun", false, "Only parses the cypress specs and shows result. No import is done.")
	cypressspecs := flag.String("cy-specs", "./", "Cypress scpec folder.")
	cypresssuffix := flag.String("cy-suffix", "func.spec.ts", "Cypress scpec suffix to search for.")
	tbcshost := flag.String("tbcs-host", "https://localhost", "TestBench CS host name to import test cases to.")
	tenantName := flag.String("workspace-name", "imbus", "TestBench CS workspace name to import test cases to.")
	tenantID := flag.Int("workspace-id", 1, "TestBench CS workspace id to import test cases to.")
	productID := flag.Int("product-id", 1, "TestBench CS product id to import test cases to.")
	user := flag.String("user", "admin", "TestBench CS tenant admin name.")
	password := flag.String("password", "password", "TestBench CS tenant admin password.")
	epic := flag.String("epic", "Cypress-Tests", "TestBench CS epic name to import test cases to.")

	flag.Usage = printUsage
	flag.Parse()

	fmt.Print("\nRunning with:\n")
	flag.VisitAll(func(f *flag.Flag) {
		fmt.Print(f.Name, ": ", f.Value, "\n")
	})
	fmt.Println()

	fmt.Println("Starting scan ...")
	epics := cy.ParseSpecs(*cypressspecs, *cypresssuffix, *epic, *verbose)
	if *dryrun {
		cy.PrintResults(epics)
		os.Exit(0)
	}

	fmt.Println("Starting import ...")
	cy.Import(*tbcshost, *tenantName, *tenantID, *productID, *user, *password, epics, *verbose)
	fmt.Println("Done.")
}

func printUsage() {
	header := "Usage:\n" +
		"  " + os.Args[0] + " <flags>\n\n" +
		"Flags:\n"
	fmt.Fprint(os.Stderr, header)
	flag.PrintDefaults()
}
