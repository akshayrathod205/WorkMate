package main

import (
	"encoding/json"
	"net/http"
)

type DashboardTotals struct {
	Projects    int `json:"projects"`
	Tasks       int `json:"tasks"`
	NotStarted  int `json:"not_started"`
	InProgress  int `json:"in_progress"`
	Completed   int `json:"completed"`
}

type ProjectRollup struct {
	ProjectID   int    `json:"project_id"`
	ProjectName string `json:"project_name"`
	Total       int    `json:"total"`
	NotStarted  int    `json:"not_started"`
	InProgress  int    `json:"in_progress"`
	Completed   int    `json:"completed"`
}

type DashboardResponse struct {
	Totals          DashboardTotals `json:"totals"`
	TasksByProject  []ProjectRollup `json:"tasks_by_project"`
}

// projectScopeCTE returns a CTE that resolves the set of project IDs visible
// to the current user, given their role.
const projectScopeManager = `
WITH scoped_projects AS (
    SELECT id, name FROM projects WHERE manager_id = $1
)`

const projectScopeMember = `
WITH scoped_projects AS (
    SELECT p.id, p.name FROM projects p
    JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = $1
)`

func dashboardHandler(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	scope := projectScopeMember
	if claims.Role == RoleManager {
		scope = projectScopeManager
	}

	rollupQuery := scope + `
        SELECT
            sp.id,
            sp.name,
            COUNT(t.id) AS total,
            COUNT(t.id) FILTER (WHERE t.status = 'Not Started') AS not_started,
            COUNT(t.id) FILTER (WHERE t.status = 'In Progress') AS in_progress,
            COUNT(t.id) FILTER (WHERE t.status = 'Completed')   AS completed
        FROM scoped_projects sp
        LEFT JOIN tasks t ON t.project_id = sp.id
        GROUP BY sp.id, sp.name
        ORDER BY sp.id`

	rows, err := db.Query(rollupQuery, claims.ID)
	if err != nil {
		http.Error(w, "failed to load dashboard", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	resp := DashboardResponse{TasksByProject: []ProjectRollup{}}
	for rows.Next() {
		var r ProjectRollup
		if err := rows.Scan(&r.ProjectID, &r.ProjectName, &r.Total, &r.NotStarted, &r.InProgress, &r.Completed); err != nil {
			http.Error(w, "failed to read dashboard", http.StatusInternalServerError)
			return
		}
		resp.TasksByProject = append(resp.TasksByProject, r)
		resp.Totals.Projects++
		resp.Totals.Tasks += r.Total
		resp.Totals.NotStarted += r.NotStarted
		resp.Totals.InProgress += r.InProgress
		resp.Totals.Completed += r.Completed
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
