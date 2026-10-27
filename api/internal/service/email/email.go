// Package email provides transactional email delivery for vishnu
// (auth OTP codes today; other notifications later).
package email

import "context"

// EmailPayload defines the structure for sending emails.
type EmailPayload struct {
	To          string   `json:"to"`
	ToName      string   `json:"to_name,omitempty"`
	Subject     string   `json:"subject"`
	Body        string   `json:"body"`
	HTMLContent string   `json:"html_content"`
	Categories  []string `json:"categories,omitempty"`
}

// EmailService defines the interface for email operations.
type EmailService interface {
	SendEmail(ctx context.Context, payload *EmailPayload) error
}
