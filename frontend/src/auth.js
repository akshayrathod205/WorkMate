// Shared role constants — keep in sync with backend RoleManager / RoleTeamMember.
export const ROLE_MANAGER = "Manager";
export const ROLE_TEAM_MEMBER = "Team Member";

export const TASK_STATUSES = ["Not Started", "In Progress", "Completed"];

export const clearSession = () => {
  localStorage.removeItem("name");
  localStorage.removeItem("role");
};
