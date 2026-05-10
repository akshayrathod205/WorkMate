import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { createProject } from "../api";
import "./Form.css";

const CreateProject = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await createProject({ name, description });
      navigate("/projects");
    } catch (err) {
      alert("Failed to create project!");
    }
  };

  return (
    <div>
      <Navbar />
      <br />
      <br />
      <div className="container form-container">
        <h2>Create Project</h2>
        <form onSubmit={handleCreateProject}>
          <div>
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Description:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <button type="submit">Create Project</button>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;
