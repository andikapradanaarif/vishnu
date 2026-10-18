package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
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

func NewCrushClient() *CrushClient {
	return &CrushClient{
		client:   &http.Client{Timeout: 10 * time.Second},
		clientID: uuid.NewString(),
	}
}

func (c *CrushClient) EnsureWorkspace(ctx context.Context, upstream, path string) (string, error) {
	workspaces, err := c.listWorkspaces(ctx, upstream)
	if err != nil {
		return "", err
	}
	for _, workspace := range workspaces {
		if workspace.Path == path {
			return workspace.ID, nil
		}
	}
	return c.createWorkspace(ctx, upstream, path)
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
