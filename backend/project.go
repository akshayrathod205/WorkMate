package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// func createProject(w http.ResponseWriter, r *http.Request) {
// 	claims, err := validateToken(r)
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusUnauthorized)
// 		return
// 	}

// 	var project Project
// 	err = json.NewDecoder(r.Body).Decode(&project)
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusBadRequest)
// 		return
// 	}

// 	res, err := db.Exec("INSERT INTO projects (name, description, manager_id) VALUES (?, ?, ?)", project.Name, project.Description, claims.Id)
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	projectID, err := res.LastInsertId()
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	project.ID = int(projectID)

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(project)
// }

func createProject(w http.ResponseWriter, r *http.Request) {
	claims, err := validateToken(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// print the claims
	fmt.Println(claims.ID)

	var project Project
	err = json.NewDecoder(r.Body).Decode(&project)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if claims.Role != "Manager" {
		http.Error(w, "You are not authorized to create a project", http.StatusUnauthorized)
		return
	}

	var projectID int
	err = db.QueryRow("INSERT INTO projects (name, description, manager_id) VALUES ($1, $2, $3) RETURNING id", project.Name, project.Description, claims.ID).Scan(&projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	project.ID = projectID

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(project)
}

func addTeamMembers(w http.ResponseWriter, r *http.Request) {
	claims, err := validateToken(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if claims.Role != "Manager" {
		http.Error(w, "You are not authorized to add team members to this project", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	projectID := vars["id"]

	var teamMembers []User
	err = json.NewDecoder(r.Body).Decode(&teamMembers)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	for _, user := range teamMembers {
		_, err = db.Exec("INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)", projectID, user.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
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
		err = rows.Scan(&user.ID, &user.Name, &user.Email, &user.Role)
		if err != nil {
			return nil, err
		}
		teamMembers = append(teamMembers, user)
	}

	// Check for errors from iterating over rows.
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return teamMembers, nil
}

func getProjects(w http.ResponseWriter, r *http.Request) {
	claims, err := validateToken(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	fmt.Println("User Role:", claims.Role)
	fmt.Println("User ID:", claims.ID)

	query := "SELECT id, name, description, manager_id FROM projects"
	if claims.Role == "Manager" {
		query += " WHERE manager_id = $1"
	} else {
		query += " WHERE id IN (SELECT project_id FROM project_members WHERE user_id = $1)"
	}

	rows, err := db.Query(query, claims.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	projects := make([]Project, 0)
	for rows.Next() {
		var project Project
		err = rows.Scan(&project.ID, &project.Name, &project.Description, &project.ManagerID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Print project details for debugging
		fmt.Printf("Project: %+v\n", project)

		teamMembers, err := getTeamMembers(project.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		project.TeamMembers = teamMembers

		projects = append(projects, project)
	}

	// Print projects for debugging
	fmt.Printf("Projects: %+v\n", projects)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"projects": projects})
}

func getSingleProject(w http.ResponseWriter, r *http.Request) {
	_, err := validateToken(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	projectID := vars["id"]

	var project Project
	err = db.QueryRow("SELECT id, name, description, manager_id FROM projects WHERE id = $1", projectID).Scan(&project.ID, &project.Name, &project.Description, &project.ManagerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	teamMembers, err := getTeamMembers(project.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	project.TeamMembers = teamMembers

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(project)
}

func updateProject(w http.ResponseWriter, r *http.Request) {
	claims, err := validateToken(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if claims.Role != "Manager" {
		http.Error(w, "You are not authorized to update this project", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	projectID := vars["id"]

	var project Project
	err = json.NewDecoder(r.Body).Decode(&project)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err = db.Exec("UPDATE projects SET name = $1, description = $2 WHERE id = $3", project.Name, project.Description, projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func deleteProject(w http.ResponseWriter, r *http.Request) {
	claims, err := validateToken(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if claims.Role != "Manager" {
		http.Error(w, "You are not authorized to delete this project", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	projectID := vars["id"]

	_, err = db.Exec("DELETE FROM projects WHERE id = $1", projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
