package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

type Comment struct {
	ID        int       `json:"id"`
	TaskID    int       `json:"task_id"`
	UserID    int       `json:"user_id"`
	UserName  string    `json:"user_name"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func taskAccessProjectID(claims *Claims, taskID int) (int, bool, error) {
	var projectID int
	err := db.QueryRow("SELECT project_id FROM tasks WHERE id = $1", taskID).Scan(&projectID)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	allowed, err := userCanAccessProject(claims, projectID)
	return projectID, allowed, err
}

func listComments(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	taskID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid task id", http.StatusBadRequest)
		return
	}

	_, allowed, err := taskAccessProjectID(claims, taskID)
	if err != nil {
		http.Error(w, "failed to verify access", http.StatusInternalServerError)
		return
	}
	if !allowed {
		http.Error(w, "You do not have access to this task", http.StatusForbidden)
		return
	}

	rows, err := db.Query(
		`SELECT c.id, c.task_id, c.user_id, COALESCE(u.name, ''), c.body, c.created_at, c.updated_at
		 FROM comments c
		 LEFT JOIN users u ON u.id = c.user_id
		 WHERE c.task_id = $1
		 ORDER BY c.created_at ASC`,
		taskID,
	)
	if err != nil {
		http.Error(w, "failed to load comments", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := make([]Comment, 0)
	for rows.Next() {
		var c Comment
		if err := rows.Scan(&c.ID, &c.TaskID, &c.UserID, &c.UserName, &c.Body, &c.CreatedAt, &c.UpdatedAt); err != nil {
			http.Error(w, "failed to read comments", http.StatusInternalServerError)
			return
		}
		out = append(out, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"comments": out})
}

func createComment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	taskID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid task id", http.StatusBadRequest)
		return
	}

	projectID, allowed, err := taskAccessProjectID(claims, taskID)
	if err != nil {
		http.Error(w, "failed to verify access", http.StatusInternalServerError)
		return
	}
	if !allowed {
		http.Error(w, "You do not have access to this task", http.StatusForbidden)
		return
	}

	var body struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	body.Body = strings.TrimSpace(body.Body)
	if body.Body == "" {
		http.Error(w, "comment body is required", http.StatusBadRequest)
		return
	}
	if len(body.Body) > 5000 {
		http.Error(w, "comment too long", http.StatusBadRequest)
		return
	}

	var c Comment
	err = db.QueryRow(
		`INSERT INTO comments (task_id, user_id, body) VALUES ($1, $2, $3)
		 RETURNING id, task_id, user_id, body, created_at, updated_at`,
		taskID, claims.ID, body.Body,
	).Scan(&c.ID, &c.TaskID, &c.UserID, &c.Body, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		http.Error(w, "failed to create comment", http.StatusInternalServerError)
		return
	}
	c.UserName = claims.Name

	snippet := c.Body
	if len(snippet) > 80 {
		snippet = snippet[:80] + "…"
	}
	recordEvent(&projectID, claims.ID, EventCommentCreated, map[string]interface{}{
		"task_id":    taskID,
		"comment_id": c.ID,
		"snippet":    snippet,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(c)
}

func deleteComment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	commentID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
		return
	}

	var ownerID, taskID int
	err = db.QueryRow("SELECT user_id, task_id FROM comments WHERE id = $1", commentID).Scan(&ownerID, &taskID)
	if err == sql.ErrNoRows {
		http.Error(w, "comment not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to fetch comment", http.StatusInternalServerError)
		return
	}

	allowed := ownerID == claims.ID
	if !allowed && claims.Role == RoleManager {
		_, owns, err := taskAccessProjectID(claims, taskID)
		if err != nil {
			http.Error(w, "failed to verify access", http.StatusInternalServerError)
			return
		}
		allowed = owns
	}
	if !allowed {
		http.Error(w, "You are not authorized to delete this comment", http.StatusForbidden)
		return
	}

	if _, err := db.Exec("DELETE FROM comments WHERE id = $1", commentID); err != nil {
		http.Error(w, "failed to delete comment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
