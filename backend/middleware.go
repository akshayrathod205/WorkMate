package main

import (
	"context"
	"net/http"
)

type contextKey string

const claimsContextKey contextKey = "claims"

const (
	RoleManager    = "Manager"
	RoleTeamMember = "Team Member"
)

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := validateToken(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), claimsContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func claimsFromContext(r *http.Request) *Claims {
	claims, _ := r.Context().Value(claimsContextKey).(*Claims)
	return claims
}

func userOwnsProject(userID, projectID int) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM projects WHERE id = $1 AND manager_id = $2", projectID, userID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func userIsProjectMember(userID, projectID int) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM project_members WHERE project_id = $1 AND user_id = $2", projectID, userID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func userCanAccessProject(claims *Claims, projectID int) (bool, error) {
	if claims.Role == RoleManager {
		return userOwnsProject(claims.ID, projectID)
	}
	return userIsProjectMember(claims.ID, projectID)
}
