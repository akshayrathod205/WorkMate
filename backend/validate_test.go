package main

import "testing"

func TestValidateRegister(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		creds   Credentials
		wantErr bool
	}{
		{"valid manager", Credentials{Name: "Alice", Email: "alice@example.com", Password: "longenough", Role: RoleManager}, false},
		{"valid team member", Credentials{Name: "Bob", Email: "bob@example.com", Password: "longenough", Role: RoleTeamMember}, false},
		{"empty name", Credentials{Name: "", Email: "a@b.com", Password: "longenough", Role: RoleManager}, true},
		{"bad email", Credentials{Name: "A", Email: "not-an-email", Password: "longenough", Role: RoleManager}, true},
		{"short password", Credentials{Name: "A", Email: "a@b.com", Password: "short", Role: RoleManager}, true},
		{"unknown role", Credentials{Name: "A", Email: "a@b.com", Password: "longenough", Role: "Admin"}, true},
		{"empty role", Credentials{Name: "A", Email: "a@b.com", Password: "longenough", Role: ""}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.creds
			err := validateRegister(&c)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateRegister() err = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateRegisterNormalizesEmail(t *testing.T) {
	t.Parallel()
	c := Credentials{Name: "  Alice  ", Email: "  Alice@Example.COM  ", Password: "longenough", Role: RoleManager}
	if err := validateRegister(&c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if c.Email != "alice@example.com" {
		t.Errorf("email not normalized: got %q", c.Email)
	}
	if c.Name != "Alice" {
		t.Errorf("name not trimmed: got %q", c.Name)
	}
}

func TestValidateLogin(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		creds   Credentials
		wantErr bool
	}{
		{"valid", Credentials{Email: "a@b.com", Password: "x"}, false},
		{"missing email", Credentials{Email: "", Password: "x"}, true},
		{"missing password", Credentials{Email: "a@b.com", Password: ""}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := tt.creds
			err := validateLogin(&c)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateLogin() err = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateProject(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		project Project
		wantErr bool
	}{
		{"valid", Project{Name: "Phoenix"}, false},
		{"empty", Project{Name: ""}, true},
		{"whitespace", Project{Name: "   "}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := tt.project
			err := validateProject(&p)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateProject() err = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTask(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		task    Task
		wantErr bool
	}{
		{"valid", Task{Title: "T", ProjectID: 1, Status: StatusInProgress}, false},
		{"defaults status when empty", Task{Title: "T", ProjectID: 1, Status: ""}, false},
		{"empty title", Task{Title: "", ProjectID: 1, Status: StatusNotStarted}, true},
		{"missing project_id", Task{Title: "T", ProjectID: 0, Status: StatusNotStarted}, true},
		{"unknown status", Task{Title: "T", ProjectID: 1, Status: "Done"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tk := tt.task
			err := validateTask(&tk)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateTask() err = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateTaskDefaultsStatus(t *testing.T) {
	t.Parallel()
	tk := Task{Title: "T", ProjectID: 1, Status: ""}
	if err := validateTask(&tk); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if tk.Status != StatusNotStarted {
		t.Errorf("status not defaulted: got %q", tk.Status)
	}
}
