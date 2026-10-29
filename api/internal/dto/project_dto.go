package dto

type CreateProjectRequest struct {
	Name     string `json:"name"`
	RepoURL  string `json:"repo_url"`
	Path     string `json:"path"`
	Upstream string `json:"upstream"`
}

type ProjectResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Mode     string `json:"mode"`
	Path     string `json:"path,omitempty"`
	RepoURL  string `json:"repo_url,omitempty"`
	Upstream string `json:"upstream,omitempty"`
	Port     int    `json:"port,omitempty"`
	Status   string `json:"status"`
	Error    string `json:"error,omitempty"`
	// PermissionSkip is the workspace-wide auto-approve default. Sessions
	// may still carry their own override on top of it.
	PermissionSkip bool `json:"permission_skip"`
	// Agent is the project's main agent, replayed onto the workspace
	// whenever vishnu ensures it.
	Agent string `json:"agent"`
}

// SetPermissionSkipRequest updates a project's workspace-level
// auto-approve default.
type SetPermissionSkipRequest struct {
	Skip bool `json:"skip"`
}

// SetAgentRequest updates a project's main agent (coder/plan/task).
type SetAgentRequest struct {
	Agent string `json:"agent"`
}

type CreateProjectResponse struct {
	Project ProjectResponse `json:"project"`
}

type WorkspaceResponse struct {
	WorkspaceID string `json:"workspace_id"`
	Upstream    string `json:"upstream"`
	Status      string `json:"status"`
}
