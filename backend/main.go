package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var db *sql.DB

func healthCheck(w http.ResponseWriter, r *http.Request) {
	if err := db.Ping(); err != nil {
		http.Error(w, "db unreachable", http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func initDB() {
	var err error

	if err = godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}
	jwtKey = []byte(secret)

	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")

	if dbUser == "" || dbPassword == "" || dbName == "" || dbHost == "" || dbPort == "" {
		log.Fatal("DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME environment variables are required")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", dbHost, dbPort, dbUser, dbPassword, dbName)
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal(err)
	}

	fmt.Println("Connected to PostgreSQL database")
}

func main() {
	initDB()
	defer db.Close()

	router := mux.NewRouter()

	// Public routes
	router.HandleFunc("/api/health", healthCheck).Methods("GET")
	router.HandleFunc("/api/register", registerUser).Methods("POST")
	router.HandleFunc("/api/login", loginUser).Methods("POST")
	router.HandleFunc("/api/logout", logoutUser).Methods("POST")

	// Protected routes
	protected := router.PathPrefix("/api").Subrouter()
	protected.Use(authMiddleware)

	protected.HandleFunc("/me", meHandler).Methods("GET")
	protected.HandleFunc("/users", getUsers).Methods("GET")
	protected.HandleFunc("/dashboard", dashboardHandler).Methods("GET")

	protected.HandleFunc("/projects", getProjects).Methods("GET")
	protected.HandleFunc("/projects/{id}", getSingleProject).Methods("GET")
	protected.HandleFunc("/projects/create", createProject).Methods("POST")
	protected.HandleFunc("/projects/{id}/team", addTeamMembers).Methods("POST")
	protected.HandleFunc("/projects/{id}/delete", deleteProject).Methods("DELETE")
	protected.HandleFunc("/projects/{id}/update", updateProject).Methods("PUT")

	protected.HandleFunc("/tasks/{id}", getTasks).Methods("GET")
	protected.HandleFunc("/tasks/create", createTask).Methods("POST")
	protected.HandleFunc("/tasks/{id}/update", updateTask).Methods("PUT")
	protected.HandleFunc("/tasks/{id}/delete", deleteTask).Methods("DELETE")

	protected.HandleFunc("/tasks/{id}/comments", listComments).Methods("GET")
	protected.HandleFunc("/tasks/{id}/comments", createComment).Methods("POST")
	protected.HandleFunc("/comments/{id}", deleteComment).Methods("DELETE")

	protected.HandleFunc("/projects/{id}/events", listProjectEvents).Methods("GET")

	allowedOrigin := os.Getenv("CORS_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:3000"
	}
	corsHeaders := handlers.AllowedHeaders([]string{"Content-Type"})
	corsOrigins := handlers.AllowedOrigins([]string{allowedOrigin})
	corsMethods := handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	corsCredentials := handlers.AllowCredentials()

	corsRouter := handlers.CORS(corsHeaders, corsOrigins, corsMethods, corsCredentials)(router)

	fmt.Println("HTTP server started on :8080")
	log.Fatal(http.ListenAndServe(":8080", corsRouter))
}
