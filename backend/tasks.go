package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

func createTask(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims.Role != RoleManager {
		http.Error(w, "You are not authorized to create a task", http.StatusForbidden)
		return
	}

	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := validateTask(&task); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	owns, err := userOwnsProject(claims.ID, task.ProjectID)
	if err != nil {
		http.Error(w, "failed to verify project ownership", http.StatusInternalServerError)
		return
	}
	if !owns {
		http.Error(w, "You do not own this project", http.StatusForbidden)
		return
	}

	if task.AssignedTo != 0 {
		isMember, err := userIsProjectMember(task.AssignedTo, task.ProjectID)
		if err != nil {
			http.Error(w, "failed to verify assignee", http.StatusInternalServerError)
			return
		}
		if !isMember {
			http.Error(w, "Assignee is not a member of this project", http.StatusBadRequest)
			return
		}
	}

	err = db.QueryRow(
		`INSERT INTO tasks (title, description, project_id, assigned_to, status, due_date)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at, updated_at`,
		task.Title, task.Description, task.ProjectID, task.AssignedTo, task.Status, task.DueDate,
	).Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		http.Error(w, "failed to create task", http.StatusInternalServerError)
		return
	}

	recordEvent(&task.ProjectID, claims.ID, EventTaskCreated, map[string]interface{}{
		"task_id":     task.ID,
		"title":       task.Title,
		"assigned_to": task.AssignedTo,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

func getTasks(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	projectID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid project id", http.StatusBadRequest)
		return
	}

	allowed, err := userCanAccessProject(claims, projectID)
	if err != nil {
		http.Error(w, "failed to verify access", http.StatusInternalServerError)
		return
	}
	if !allowed {
		http.Error(w, "You do not have access to this project", http.StatusForbidden)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))

	var rows *sql.Rows
	if q == "" {
		rows, err = db.Query(
			`SELECT id, title, description, project_id, assigned_to, status, due_date, created_at, updated_at
			 FROM tasks WHERE project_id = $1 ORDER BY id`,
			projectID,
		)
	} else {
		pattern := "%" + q + "%"
		rows, err = db.Query(
			`SELECT id, title, description, project_id, assigned_to, status, due_date, created_at, updated_at
			 FROM tasks
			 WHERE project_id = $1 AND (title ILIKE $2 OR description ILIKE $2)
			 ORDER BY id`,
			projectID, pattern,
		)
	}
	if err != nil {
		http.Error(w, "failed to fetch tasks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	tasks := make([]Task, 0)
	for rows.Next() {
		var task Task
		var assignedTo sql.NullInt64
		if err := rows.Scan(&task.ID, &task.Title, &task.Description, &task.ProjectID, &assignedTo, &task.Status, &task.DueDate, &task.CreatedAt, &task.UpdatedAt); err != nil {
			http.Error(w, "failed to read tasks", http.StatusInternalServerError)
			return
		}
		if assignedTo.Valid {
			task.AssignedTo = int(assignedTo.Int64)
		}
		tasks = append(tasks, task)
	}

	type Response struct {
		Tasks  []Task `json:"tasks"`
		UserID int    `json:"userId"`
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(Response{Tasks: tasks, UserID: claims.ID}); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
	}
}

func updateTask(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	taskID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid task id", http.StatusBadRequest)
		return
	}

	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := validateTask(&task); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var assignedTo int
	var projectID int
	var prevStatus string
	err = db.QueryRow(
		"SELECT COALESCE(assigned_to, 0), project_id, status FROM tasks WHERE id = $1",
		taskID,
	).Scan(&assignedTo, &projectID, &prevStatus)
	if err == sql.ErrNoRows {
		http.Error(w, "task not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to fetch task", http.StatusInternalServerError)
		return
	}

	allowed := assignedTo == claims.ID
	if !allowed && claims.Role == RoleManager {
		owns, err := userOwnsProject(claims.ID, projectID)
		if err != nil {
			http.Error(w, "failed to verify project ownership", http.StatusInternalServerError)
			return
		}
		allowed = owns
	}
	if !allowed {
		http.Error(w, "You are not authorized to update this task", http.StatusForbidden)
		return
	}

	if _, err := db.Exec(
		`UPDATE tasks SET title = $1, description = $2, assigned_to = $3, status = $4, due_date = $5
		 WHERE id = $6`,
		task.Title, task.Description, task.AssignedTo, task.Status, task.DueDate, taskID,
	); err != nil {
		http.Error(w, "failed to update task", http.StatusInternalServerError)
		return
	}

	if prevStatus != task.Status {
		recordEvent(&projectID, claims.ID, EventTaskStatusMoved, map[string]interface{}{
			"task_id": taskID,
			"title":   task.Title,
			"from":    prevStatus,
			"to":      task.Status,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Task updated successfully!"})
}

func deleteTask(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims.Role != RoleManager {
		http.Error(w, "You are not authorized to delete a task", http.StatusForbidden)
		return
	}

	taskID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid task id", http.StatusBadRequest)
		return
	}

	var projectID int
	err = db.QueryRow("SELECT project_id FROM tasks WHERE id = $1", taskID).Scan(&projectID)
	if err == sql.ErrNoRows {
		http.Error(w, "task not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to fetch task", http.StatusInternalServerError)
		return
	}

	owns, err := userOwnsProject(claims.ID, projectID)
	if err != nil {
		http.Error(w, "failed to verify project ownership", http.StatusInternalServerError)
		return
	}
	if !owns {
		http.Error(w, "You do not own this project", http.StatusForbidden)
		return
	}

	var title string
	_ = db.QueryRow("SELECT title FROM tasks WHERE id = $1", taskID).Scan(&title)

	if _, err := db.Exec("DELETE FROM tasks WHERE id = $1", taskID); err != nil {
		http.Error(w, "failed to delete task", http.StatusInternalServerError)
		return
	}

	recordEvent(&projectID, claims.ID, EventTaskDeleted, map[string]interface{}{
		"task_id": taskID,
		"title":   title,
	})

	w.WriteHeader(http.StatusNoContent)
}
