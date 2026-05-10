package main

import (
	"errors"
	"regexp"
	"strings"
)

const (
	StatusNotStarted = "Not Started"
	StatusInProgress = "In Progress"
	StatusCompleted  = "Completed"

	minPasswordLength = 8
	maxNameLength     = 100
	maxEmailLength    = 150
	maxTitleLength    = 200
)

var (
	emailRegex     = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	validRoles     = map[string]bool{RoleManager: true, RoleTeamMember: true}
	validStatuses  = map[string]bool{StatusNotStarted: true, StatusInProgress: true, StatusCompleted: true}
	errEmptyName   = errors.New("name is required")
	errInvalidRole = errors.New("role must be 'Manager' or 'Team Member'")
	errBadEmail    = errors.New("invalid email")
	errShortPwd    = errors.New("password must be at least 8 characters")
)

func validateRegister(c *Credentials) error {
	c.Name = strings.TrimSpace(c.Name)
	c.Email = strings.TrimSpace(strings.ToLower(c.Email))

	if c.Name == "" || len(c.Name) > maxNameLength {
		return errEmptyName
	}
	if c.Email == "" || len(c.Email) > maxEmailLength || !emailRegex.MatchString(c.Email) {
		return errBadEmail
	}
	if len(c.Password) < minPasswordLength {
		return errShortPwd
	}
	if !validRoles[c.Role] {
		return errInvalidRole
	}
	return nil
}

func validateLogin(c *Credentials) error {
	c.Email = strings.TrimSpace(strings.ToLower(c.Email))
	if c.Email == "" || c.Password == "" {
		return errors.New("email and password are required")
	}
	return nil
}

func validateProject(p *Project) error {
	p.Name = strings.TrimSpace(p.Name)
	if p.Name == "" {
		return errors.New("project name is required")
	}
	if len(p.Name) > 150 {
		return errors.New("project name too long")
	}
	return nil
}

func validateTask(t *Task) error {
	t.Title = strings.TrimSpace(t.Title)
	if t.Title == "" || len(t.Title) > maxTitleLength {
		return errors.New("task title is required (max 200 chars)")
	}
	if t.ProjectID <= 0 {
		return errors.New("project_id is required")
	}
	if t.Status == "" {
		t.Status = StatusNotStarted
	}
	if !validStatuses[t.Status] {
		return errors.New("status must be 'Not Started', 'In Progress', or 'Completed'")
	}
	return nil
}
