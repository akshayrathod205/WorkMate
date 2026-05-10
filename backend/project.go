package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/lib/pq"
)

func createProject(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims.Role != RoleManager {
		http.Error(w, "You are not authorized to create a project", http.StatusForbidden)
		return
	}

	var project Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := validateProject(&project); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var projectID int
	err := db.QueryRow(
		"INSERT INTO projects (name, description, manager_id) VALUES ($1, $2, $3) RETURNING id",
		project.Name, project.Description, claims.ID,
	).Scan(&projectID)
	if err != nil {
		http.Error(w, "failed to create project", http.StatusInternalServerError)
		return
	}

	project.ID = projectID
	project.ManagerID = claims.ID

	recordEvent(&project.ID, claims.ID, claims.Name, EventProjectCreated, map[string]interface{}{
		"name": project.Name,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(project)
}

func addTeamMembers(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims.Role != RoleManager {
		http.Error(w, "You are not authorized to add team members to this project", http.StatusForbidden)
		return
	}

	projectID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid project id", http.StatusBadRequest)
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

	var teamMembers []User
	if err := json.NewDecoder(r.Body).Decode(&teamMembers); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if len(teamMembers) == 0 {
		http.Error(w, "no team members provided", http.StatusBadRequest)
		return
	}

	addedIDs := make([]int, 0, len(teamMembers))
	for _, user := range teamMembers {
		if user.ID <= 0 {
			http.Error(w, "invalid user id in payload", http.StatusBadRequest)
			return
		}
		res, err := db.Exec("INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", projectID, user.ID)
		if err != nil {
			http.Error(w, "failed to add team members", http.StatusInternalServerError)
			return
		}
		if n, _ := res.RowsAffected(); n > 0 {
			addedIDs = append(addedIDs, user.ID)
		}
	}

	if len(addedIDs) > 0 {
		recordEvent(&projectID, claims.ID, claims.Name, EventMembersAdded, map[string]interface{}{
			"user_ids": addedIDs,
			"count":    len(addedIDs),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Team members added successfully"})
}

func getTeamMembers(projectID int) ([]User, error) {
	rows, err := db.Query("SELECT u.id, u.name, u.email, u.role FROM project_members pt JOIN users u ON pt.user_id = u.id WHERE pt.project_id = $1", projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	teamMembers := make([]User, 0)
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role); err != nil {
			return nil, err
		}
		teamMembers = append(teamMembers, user)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return teamMembers, nil
}

func getProjects(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	query := "SELECT id, name, description, manager_id FROM projects"
	if claims.Role == RoleManager {
		query += " WHERE manager_id = $1"
	} else {
		query += " WHERE id IN (SELECT project_id FROM project_members WHERE user_id = $1)"
	}
	query += " ORDER BY id"

	rows, err := db.Query(query, claims.ID)
	if err != nil {
		http.Error(w, "failed to fetch projects", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	projects := make([]Project, 0)
	projectIDs := make([]int64, 0)
	indexByID := make(map[int]int)
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.ManagerID); err != nil {
			http.Error(w, "failed to read projects", http.StatusInternalServerError)
			return
		}
		p.TeamMembers = []User{}
		indexByID[p.ID] = len(projects)
		projects = append(projects, p)
		projectIDs = append(projectIDs, int64(p.ID))
	}

	if len(projectIDs) > 0 {
		memberRows, err := db.Query(
			`SELECT pm.project_id, u.id, u.name, u.email, u.role
			 FROM project_members pm
			 JOIN users u ON u.id = pm.user_id
			 WHERE pm.project_id = ANY($1)`,
			pq.Array(projectIDs),
		)
		if err != nil {
			http.Error(w, "failed to load team members", http.StatusInternalServerError)
			return
		}
		defer memberRows.Close()

		for memberRows.Next() {
			var projectID int
			var u User
			if err := memberRows.Scan(&projectID, &u.ID, &u.Name, &u.Email, &u.Role); err != nil {
				http.Error(w, "failed to read team members", http.StatusInternalServerError)
				return
			}
			if idx, ok := indexByID[projectID]; ok {
				projects[idx].TeamMembers = append(projects[idx].TeamMembers, u)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"projects": projects})
}

func getSingleProject(w http.ResponseWriter, r *http.Request) {
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

	var project Project
	err = db.QueryRow("SELECT id, name, description, manager_id FROM projects WHERE id = $1", projectID).
		Scan(&project.ID, &project.Name, &project.Description, &project.ManagerID)
	if err == sql.ErrNoRows {
		http.Error(w, "project not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to fetch project", http.StatusInternalServerError)
		return
	}

	teamMembers, err := getTeamMembers(project.ID)
	if err != nil {
		http.Error(w, "failed to load team members", http.StatusInternalServerError)
		return
	}
	project.TeamMembers = teamMembers

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(project)
}

func updateProject(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims.Role != RoleManager {
		http.Error(w, "You are not authorized to update this project", http.StatusForbidden)
		return
	}

	projectID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid project id", http.StatusBadRequest)
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

	var project Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := validateProject(&project); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if _, err := db.Exec("UPDATE projects SET name = $1, description = $2 WHERE id = $3", project.Name, project.Description, projectID); err != nil {
		http.Error(w, "failed to update project", http.StatusInternalServerError)
		return
	}

	recordEvent(&projectID, claims.ID, claims.Name, EventProjectUpdated, map[string]interface{}{
		"name": project.Name,
	})

	w.WriteHeader(http.StatusOK)
}

func deleteProject(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	if claims.Role != RoleManager {
		http.Error(w, "You are not authorized to delete this project", http.StatusForbidden)
		return
	}

	projectID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid project id", http.StatusBadRequest)
		return
	}

	res, err := db.Exec("DELETE FROM projects WHERE id = $1 AND manager_id = $2", projectID, claims.ID)
	if err != nil {
		http.Error(w, "failed to delete project", http.StatusInternalServerError)
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		http.Error(w, "project not found or not owned by you", http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusOK)
}
