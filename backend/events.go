package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

const (
	EventProjectCreated  = "project.created"
	EventProjectUpdated  = "project.updated"
	EventTaskCreated     = "task.created"
	EventTaskStatusMoved = "task.status_changed"
	EventTaskDeleted     = "task.deleted"
	EventMembersAdded    = "members.added"
	EventCommentCreated  = "comment.created"
)

type Event struct {
	ID        int64                  `json:"id"`
	ProjectID *int                   `json:"project_id,omitempty"`
	ActorID   *int                   `json:"actor_id,omitempty"`
	ActorName string                 `json:"actor_name,omitempty"`
	Kind      string                 `json:"kind"`
	Payload   map[string]interface{} `json:"payload"`
	CreatedAt time.Time              `json:"created_at"`
}

// recordEvent inserts an audit row. Failures are logged, not returned —
// the caller's primary write should not be undone if the audit insert fails.
func recordEvent(projectID *int, actorID int, kind string, payload map[string]interface{}) {
	if payload == nil {
		payload = map[string]interface{}{}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("recordEvent: marshal failed: %v", err)
		return
	}
	if _, err := db.Exec(
		"INSERT INTO events (project_id, actor_id, kind, payload) VALUES ($1, $2, $3, $4)",
		projectID, actorID, kind, body,
	); err != nil {
		log.Printf("recordEvent: insert failed: %v", err)
	}
}

func listProjectEvents(w http.ResponseWriter, r *http.Request) {
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

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}

	rows, err := db.Query(
		`SELECT e.id, e.project_id, e.actor_id, COALESCE(u.name, ''), e.kind, e.payload, e.created_at
		 FROM events e
		 LEFT JOIN users u ON u.id = e.actor_id
		 WHERE e.project_id = $1
		 ORDER BY e.created_at DESC
		 LIMIT $2`,
		projectID, limit,
	)
	if err != nil {
		http.Error(w, "failed to load events", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	events := make([]Event, 0)
	for rows.Next() {
		var e Event
		var pid sql.NullInt64
		var aid sql.NullInt64
		var payloadJSON []byte
		if err := rows.Scan(&e.ID, &pid, &aid, &e.ActorName, &e.Kind, &payloadJSON, &e.CreatedAt); err != nil {
			http.Error(w, "failed to read events", http.StatusInternalServerError)
			return
		}
		if pid.Valid {
			v := int(pid.Int64)
			e.ProjectID = &v
		}
		if aid.Valid {
			v := int(aid.Int64)
			e.ActorID = &v
		}
		if len(payloadJSON) > 0 {
			_ = json.Unmarshal(payloadJSON, &e.Payload)
		}
		if e.Payload == nil {
			e.Payload = map[string]interface{}{}
		}
		events = append(events, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"events": events})
}
