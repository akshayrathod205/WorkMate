import React, { useState } from "react";
import { loginUser } from "../api";
import { useNavigate } from "react-router-dom";
import "./Form.css"; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser({ email, password });
      localStorage.setItem("name", response.name);
      localStorage.setItem("role", response.role);
      alert("Login successful!");
      navigate("/projects");
    } catch (err) {
      alert("Login failed!");
    }
  };

  return (
    <div className="form-container">
      <h2>WorkMate</h2>
      <p style={{textAlign: "center"}}>Welcome back! Please log in to access your projects and tasks.</p>
      <br />
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label style={{fontWeight: "bold"}}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email address"
          />
        </div>
        <div className="form-group">
          <label style={{fontWeight: "bold"}}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" className="btn-primary">
          Login
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        Don't have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
};

export default Login;
