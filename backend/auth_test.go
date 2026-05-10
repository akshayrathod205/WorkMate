package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"golang.org/x/crypto/bcrypt"
)

func setupTest(t *testing.T) sqlmock.Sqlmock {
	t.Helper()
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { mockDB.Close() })
	db = mockDB
	jwtKey = []byte("test-secret-do-not-use-in-prod")
	return mock
}

func TestLogin_BadCredentials(t *testing.T) {
	mock := setupTest(t)

	mock.ExpectQuery("SELECT id, name, email, password, role FROM users WHERE email").
		WithArgs("nope@example.com").
		WillReturnError(sql.ErrNoRows)

	body, _ := json.Marshal(map[string]string{"email": "nope@example.com", "password": "longenough"})
	req := httptest.NewRequest(http.MethodPost, "/api/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	loginUser(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("mock expectations: %v", err)
	}
}

func TestLogin_SuccessSetsCookie(t *testing.T) {
	mock := setupTest(t)

	hashed, _ := bcrypt.GenerateFromPassword([]byte("longenough"), bcrypt.MinCost)
	rows := sqlmock.NewRows([]string{"id", "name", "email", "password", "role"}).
		AddRow(42, "Alice", "alice@example.com", string(hashed), RoleManager)
	mock.ExpectQuery("SELECT id, name, email, password, role FROM users WHERE email").
		WithArgs("alice@example.com").
		WillReturnRows(rows)

	body, _ := json.Marshal(map[string]string{"email": "alice@example.com", "password": "longenough"})
	req := httptest.NewRequest(http.MethodPost, "/api/login", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	loginUser(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", rec.Code, rec.Body.String())
	}
	cookies := rec.Result().Cookies()
	var auth *http.Cookie
	for _, c := range cookies {
		if c.Name == authCookieName {
			auth = c
		}
	}
	if auth == nil {
		t.Fatal("expected auth_token cookie not set")
	}
	if !auth.HttpOnly {
		t.Error("cookie should be HttpOnly")
	}
	if auth.SameSite != http.SameSiteStrictMode {
		t.Errorf("SameSite = %v, want Strict", auth.SameSite)
	}
}

func TestAuthMiddleware_RejectsMissingCookie(t *testing.T) {
	setupTest(t)

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })
	handler := authMiddleware(next)

	req := httptest.NewRequest(http.MethodGet, "/api/projects", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
	if called {
		t.Error("next handler should not be called when token missing")
	}
}

func TestAuthMiddleware_AcceptsValidCookie(t *testing.T) {
	mock := setupTest(t)

	hashed, _ := bcrypt.GenerateFromPassword([]byte("longenough"), bcrypt.MinCost)
	rows := sqlmock.NewRows([]string{"id", "name", "email", "password", "role"}).
		AddRow(7, "Bob", "bob@example.com", string(hashed), RoleManager)
	mock.ExpectQuery("SELECT id, name, email, password, role FROM users WHERE email").
		WithArgs("bob@example.com").
		WillReturnRows(rows)

	body, _ := json.Marshal(map[string]string{"email": "bob@example.com", "password": "longenough"})
	loginRec := httptest.NewRecorder()
	loginUser(loginRec, httptest.NewRequest(http.MethodPost, "/api/login", bytes.NewReader(body)))
	if loginRec.Code != http.StatusOK {
		t.Fatalf("login failed: %d %s", loginRec.Code, loginRec.Body.String())
	}

	var authCookie *http.Cookie
	for _, c := range loginRec.Result().Cookies() {
		if c.Name == authCookieName {
			authCookie = c
		}
	}
	if authCookie == nil {
		t.Fatal("no auth cookie issued")
	}

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		claims := claimsFromContext(r)
		if claims == nil || claims.ID != 7 || claims.Role != RoleManager {
			t.Errorf("unexpected claims: %+v", claims)
		}
	})
	handler := authMiddleware(next)

	req := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	req.AddCookie(authCookie)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Errorf("next handler was not called; status = %d", rec.Code)
	}
}

