import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import { getProjects } from "../api";
import "./Form.css";

const Projects = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem("name")) {
      window.location.href = "/login";
    }
    const fetchProjects = async () => {
      const response = await getProjects();
      setProjects(response.projects || []);
      console.log(response.projects);
    };
    fetchProjects();
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ padding: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{display: "flex", flexDirection: "row", gap: "20px"}}>
          <h2 style={{ marginBottom: "20px" }}>Projects</h2>
          <Link to="/create-project" className="create-project-button">
            Create Project
          </Link>
        </div>
        <div className="container projects-container">
          {projects.map((project) => (
            <div key={project.id} className="project-card">
              <h3>
                <Link
                  to={`/projects/${project.id}`}
                  style={{ textDecoration: "none" }}
                >
                  {project.name}
                </Link>
              </h3>
              <ul>
                <h4>Team</h4>
                {(project.team_members || []).map((member) => (
                  <li key={member.id}>
                    {member.name} ({member.role})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Projects;
