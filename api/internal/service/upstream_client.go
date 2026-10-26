package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrUpstreamUnreachable = errors.New("crush server unreachable")
	ErrUpstreamBadResponse = errors.New("unexpected response from crush server")
)

// CrushClient makes the server-side calls the registry needs — listing
// workspaces to find the one matching a project path, creating it when it
// is missing, and health probes. It is deliberately separate from the
// proxy's streaming Upstream: these calls are short JSON requests and get
// a timeout, where the proxy must never time out an SSE stream.
type CrushClient struct {
	client   *http.Client
	clientID string
}

type Workspace struct {
	ID   string `json:"id"`
	Path string `json:"path"`
}

type AgentInfo struct {
	IsReady bool `json:"is_ready"`
}

func NewCrushClient() *CrushClient {
	return &CrushClient{
		client:   &http.Client{Timeout: 10 * time.Second},
		clientID: uuid.NewString(),
	}
}

// EnsureWorkspace returns the id of the workspace rooted at path. Managed
// projects own their crush server, so a missing workspace is created; external
// servers are route-only, so vishnu reuses an existing workspace instead of
// creating one behind the user's back.
func (c *CrushClient) EnsureWorkspace(ctx context.Context, upstream, path string, create bool) (string, error) {
	workspaces, err := c.listWorkspaces(ctx, upstream)
	if err != nil {
		return "", err
	}
	for _, workspace := range workspaces {
		if path != "" && workspace.Path == path {
			return workspace.ID, nil
		}
	}
	if create {
		return c.createWorkspace(ctx, upstream, path)
	}
	if len(workspaces) == 0 {
		return "", fmt.Errorf("%w: %s has no workspaces", ErrUpstreamBadResponse, upstream)
	}
	return workspaces[0].ID, nil
}

// EnsureAgent initializes the workspace's agent coordinator when crush
// hasn't yet — the TUI does this on workspace open; without it the agent
// endpoint answers "agent coordinator not initialized".
func (c *CrushClient) EnsureAgent(ctx context.Context, upstream, workspaceID string) error {
	var info AgentInfo
	if err := c.call(ctx, upstream, http.MethodGet, "/v1/workspaces/"+workspaceID+"/agent", nil, &info); err != nil {
		return err
	}
	if info.IsReady {
		return nil
	}
	path := fmt.Sprintf("/v1/workspaces/%s/agent/init?client_id=%s", workspaceID, c.clientID)
	return c.call(ctx, upstream, http.MethodPost, path, nil, nil)
}

func (c *CrushClient) listWorkspaces(ctx context.Context, upstream string) ([]Workspace, error) {
	var workspaces []Workspace
	if err := c.call(ctx, upstream, http.MethodGet, "/v1/workspaces", nil, &workspaces); err != nil {
		return nil, err
	}
	return workspaces, nil
}

func (c *CrushClient) createWorkspace(ctx context.Context, upstream, path string) (string, error) {
	body := map[string]string{"path": path, "client_id": c.clientID}

	var workspace Workspace
	if err := c.call(ctx, upstream, http.MethodPost, "/v1/workspaces", body, &workspace); err != nil {
		return "", err
	}
	if workspace.ID == "" {
		return "", fmt.Errorf("%w: workspace created without an id", ErrUpstreamBadResponse)
	}
	return workspace.ID, nil
}

func (c *CrushClient) call(ctx context.Context, upstream, method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("encode request body: %w", err)
		}
		reader = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, upstream+path, reader)
	if err != nil {
		return fmt.Errorf("build upstream request: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("%w: %s", ErrUpstreamUnreachable, upstream)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Crush's error body carries the actionable detail (e.g. "model
		// provider not configured") — keep a bounded snippet in the error.
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
		if msg := strings.TrimSpace(string(detail)); msg != "" {
			return fmt.Errorf("%w: %s %s returned %d: %s", ErrUpstreamBadResponse, method, path, resp.StatusCode, msg)
		}
		return fmt.Errorf("%w: %s %s returned %d", ErrUpstreamBadResponse, method, path, resp.StatusCode)
	}
	if out == nil {
		return nil
	}

	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(out); err != nil {
		return fmt.Errorf("%w: decode %s %s: %v", ErrUpstreamBadResponse, method, path, err)
	}
	return nil
}
