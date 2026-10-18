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
}

type CreateProjectResponse struct {
	Project ProjectResponse `json:"project"`
}

type WorkspaceResponse struct {
	WorkspaceID string `json:"workspace_id"`
	Upstream    string `json:"upstream"`
	Status      string `json:"status"`
}
