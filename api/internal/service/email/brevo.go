package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/andikapradanaarif/vishnu/internal/config"
)

const brevoSendEmailPath = "/v3/smtp/email"

// brevoService implements the EmailService interface using Brevo's
// transactional REST API (https://developers.brevo.com/reference/sendtransacemail).
type brevoService struct {
	config  *config.Brevo
	env     string
	timeout time.Duration
	client  *http.Client
}

// NewBrevoService creates a Brevo-backed EmailService. Returns an error
// when required configuration is missing — callers should treat that as
// "email disabled" rather than fatal.
func NewBrevoService(cfg *config.Config) (*brevoService, error) {
	if cfg.Brevo.APIKey == "" {
		return nil, fmt.Errorf("brevo API key is required")
	}
	if cfg.Brevo.FromEmail == "" {
		return nil, fmt.Errorf("brevo from email is required")
	}
	timeout, err := time.ParseDuration(cfg.Brevo.RequestTimeout)
	if err != nil {
		return nil, fmt.Errorf("invalid brevo request timeout: %w", err)
	}
	return &brevoService{
		config:  &cfg.Brevo,
		env:     cfg.Environment,
		timeout: timeout,
		client:  &http.Client{},
	}, nil
}

// brevoEmailRequest is the JSON body sent to Brevo's /smtp/email endpoint.
type brevoEmailRequest struct {
	Sender      brevoContact   `json:"sender"`
	To          []brevoContact `json:"to"`
	Subject     string         `json:"subject"`
	HTMLContent string         `json:"htmlContent,omitempty"`
	TextContent string         `json:"textContent,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
}

type brevoContact struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

// SendEmail sends an email using Brevo's transactional email API.
func (s *brevoService) SendEmail(ctx context.Context, payload *EmailPayload) error {
	if payload == nil {
		return fmt.Errorf("email payload cannot be nil")
	}

	// Add environment prefix to subject in non-production environments.
	subject := payload.Subject
	if s.env != "production" && s.env != "prod" {
		subject = fmt.Sprintf("[%s] %s", s.env, subject)
	}

	body := brevoEmailRequest{
		Sender: brevoContact{
			Name:  s.config.FromName,
			Email: s.config.FromEmail,
		},
		To: []brevoContact{
			{
				Name:  payload.ToName,
				Email: payload.To,
			},
		},
		Subject:     subject,
		HTMLContent: payload.HTMLContent,
		TextContent: payload.Body,
		Tags:        payload.Categories,
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal brevo email request: %w", err)
	}

	// Set default timeout if not set in context.
	if _, ok := ctx.Deadline(); !ok {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, s.timeout)
		defer cancel()
	}

	endpoint := s.config.APIURL + brevoSendEmailPath
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create brevo request: %w", err)
	}

	req.Header.Set("api-key", s.config.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		slog.Error("Brevo API request failed", "endpoint", endpoint, "err", err)
		return fmt.Errorf("failed to send brevo email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		slog.Error("Brevo API error",
			"endpoint", endpoint,
			"status", resp.StatusCode,
			"response", string(respBody),
		)
		return fmt.Errorf("brevo API error: status %d", resp.StatusCode)
	}

	return nil
}

// Compile-time interface check.
var _ EmailService = (*brevoService)(nil)
